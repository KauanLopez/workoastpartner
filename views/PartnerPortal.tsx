import React, { useEffect, useState, useRef } from 'react';
import { Candidate, CandidateStatus, ViewMode } from '../types';
import { candidateService } from '../services/candidateService';
import { authService } from '../services/authService';
import { manatalService, DuplicateCheckResult } from '../services/manatalService';
import { activityLogService } from '../services/activityLogService';
import { generateCandidateSummary } from '../services/geminiService';
import { rocketReachService } from '../services/rocketReachService';

import {
  Logo,
  Button,
  IconButton,
  Card,
  Badge,
  Tag,
  ProgressBar,
  Avatar,
  Input,
  Select,
  Dialog,
  Tabs,
  Sidebar,
  PageHeader,
  Icon
} from '../components/ui';
import CandidateStatusBadge from '../components/CandidateStatusBadge';

const FILTER_TABS = [
  { value: 'All Candidates', label: 'All Candidates' },
  { value: 'My Candidates', label: 'My Candidates' },
  { value: 'Hired', label: 'Hired' },
  { value: 'Pinned', label: 'Pinned' }
];

interface Props {
  onNavigate: (view: ViewMode) => void;
  isAdmin: boolean;
}

type ModalMode = 'CREATE' | 'VIEW' | 'EDIT';
type SearchMode = 'CANDIDATE' | 'JOB';

interface BatchLog {
  id: string;
  candidateName: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
}

const PartnerPortal: React.FC<Props> = ({ onNavigate, isAdmin }) => {
  const [localCandidates, setLocalCandidates] = useState<Candidate[]>([]);
  const [displayedCandidates, setDisplayedCandidates] = useState<Candidate[]>([]);
  const [activeFilter, setActiveFilter] = useState('All Candidates');

  const [searchMode, setSearchMode] = useState<SearchMode>('CANDIDATE');
  const [searchQuery, setSearchQuery] = useState('');

  const [jobUrl, setJobUrl] = useState('');
  const [fetchedJob, setFetchedJob] = useState<any>(null);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isFetchingJob, setIsFetchingJob] = useState(false);
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('Partner User');

  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    candidate: Candidate | null;
  }>({ show: false, candidate: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const [isModalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('CREATE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [availableJobs, setAvailableJobs] = useState<any[]>([]);

  const [isRocketReaching, setIsRocketReaching] = useState(false);
  const [rrFeedback, setRrFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | 'idle';
    message: string;
  }>({ type: 'idle', message: '' });

  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchLogs, setBatchLogs] = useState<BatchLog[]>([]);
  const batchLogsEndRef = useRef<HTMLDivElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [regForm, setRegForm] = useState({
    full_name: '',
    first_name: '',
    last_name: '',
    reference: '',
    diploma: '',
    university: '',
    current_company: '',
    current_position: '',
    location: '',
    address: '',
    email: '',
    phone_number: '',
    source: '',
    linkedin_url: '',
    selected_job_id: ''
  });
  const [registering, setRegistering] = useState(false);

  const [duplicateModal, setDuplicateModal] = useState<{
    show: boolean;
    result: DuplicateCheckResult | null;
  }>({ show: false, result: null });
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const session = await authService.getCurrentSession();
        let userId = null;
        if (mounted && session?.user) {
          userId = session.user.id;
          setCurrentUserId(userId);
          if (session.user.email) setCurrentUserEmail(session.user.email);
        }
        if (userId) {
          const allData = await candidateService.getAll(userId);
          if (mounted) setLocalCandidates(allData);
        }
        const jobs = await manatalService.getJobs();
        if (mounted) setAvailableJobs(jobs);
      } catch (e) {
        console.error('Init failed:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (showBatchModal && batchLogsEndRef.current) {
      batchLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [batchLogs, showBatchModal]);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeMenuId]);

  useEffect(() => {
    if (searchMode === 'JOB') return;
    const MIN_SEARCH_CHARS = 3;
    if (searchQuery.trim().length < MIN_SEARCH_CHARS) {
      setIsSearching(false);
      let filtered = localCandidates;
      if (activeFilter === 'Pinned') {
        filtered = filtered.filter((c) => c.isPinned);
      } else if (activeFilter === 'All Candidates') {
        filtered = filtered.filter((c) => !c.isPinned);
        if (!isAdmin) {
          filtered = filtered.filter((c) => c.visibility || c.createdBy === currentUserId);
        }
      } else if (activeFilter === 'Hired') {
        filtered = filtered.filter((c) => c.status === CandidateStatus.HIRED);
      } else if (activeFilter === 'My Candidates') {
        filtered = filtered.filter((c) => c.createdBy === currentUserId);
      }
      setDisplayedCandidates(filtered);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = searchQuery.toLowerCase().trim();
        const results = localCandidates.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.role && c.role.toLowerCase().includes(q)) ||
            (c.location && c.location.toLowerCase().includes(q)) ||
            (c.currentCompany && c.currentCompany.toLowerCase().includes(q))
        );
        setDisplayedCandidates(results);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, localCandidates, activeFilter, searchMode, isAdmin, currentUserId]);

  const handleJobUrlFetch = async () => {
    if (!jobUrl.trim()) return;
    setIsFetchingJob(true);
    setJobError(null);
    setFetchedJob(null);
    setPipelineStages([]);
    setSelectedStage('');

    try {
      const match = jobUrl.match(/\/jobs\/(\d+)/);
      if (!match || !match[1]) {
        throw new Error('Invalid Manatal Job URL. Format: https://app.manatal.com/.../jobs/{id}/...');
      }
      const jobId = match[1];
      const jobData = await manatalService.getJobDetails(jobId);
      setFetchedJob(jobData);

      const stages = await manatalService.getJobStages(jobId);
      setPipelineStages(stages);
    } catch (e: any) {
      setJobError(e.message || 'Failed to fetch job data.');
    } finally {
      setIsFetchingJob(false);
    }
  };

  const handleStageSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stageId = e.target.value;
    setSelectedStage(stageId);
    if (!stageId || !fetchedJob) return;

    setIsFetchingCandidates(true);
    try {
      const candidates = await manatalService.getCandidatesByStage(fetchedJob.id, stageId);
      setDisplayedCandidates(candidates);
    } catch (e) {
      console.error('Stage candidates fetch failed:', e);
    } finally {
      setIsFetchingCandidates(false);
    }
  };

  const handlePinToggle = async (candidate: Candidate) => {
    const isNowPinned = !candidate.isPinned;
    setLocalCandidates((prev) =>
      prev.map((c) => (c.id === candidate.id ? { ...c, isPinned: isNowPinned } : c))
    );
    setDisplayedCandidates((prev) =>
      prev.map((c) => (c.id === candidate.id ? { ...c, isPinned: isNowPinned } : c))
    );
    await candidateService.togglePin(candidate.id, isNowPinned);
    activityLogService.logAction(`${isNowPinned ? 'Pinned' : 'Unpinned'} candidate: ${candidate.name}`);
  };

  const updateCandidateState = (candidateId: string, updates: Partial<Candidate>) => {
    const updateFn = (c: Candidate) => {
      if (c.id === candidateId || (c.manatalId && c.manatalId === candidateId)) {
        return { ...c, ...updates };
      }
      return c;
    };
    setLocalCandidates((prev) => prev.map(updateFn));
    setDisplayedCandidates((prev) => prev.map(updateFn));
  };

  const handleBatchSearchContacts = async () => {
    const targets = [...displayedCandidates];
    if (targets.length === 0) return;
    setIsBatchProcessing(true);
    setShowBatchModal(true);
    setBatchProgress({ current: 0, total: targets.length });
    setBatchLogs([]);

    const addLog = (name: string, msg: string, type: BatchLog['type']) => {
      setBatchLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          candidateName: name,
          message: msg,
          type,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    };

    try {
      for (let i = 0; i < targets.length; i++) {
        const candidate = targets[i];
        setBatchProgress({ current: i + 1, total: targets.length });
        if (!candidate.linkedinUrl) {
          addLog(candidate.name, 'Skipped — No LinkedIn URL.', 'warning');
          continue;
        }
        await new Promise((r) => setTimeout(r, 400));
        try {
          const result = await rocketReachService.lookupContactInfo(candidate.linkedinUrl);
          if (result.error) {
            addLog(candidate.name, `Failed: ${result.error}`, 'error');
          } else {
            const { email, phone } = result;
            if (email || phone) {
              addLog(candidate.name, 'Success: Contact info found.', 'success');
              const updates: Partial<Candidate> = {};
              if (email) updates.email = email;
              if (phone) updates.phone = phone;
              updateCandidateState(candidate.id, updates);
              if (candidate.manatalId) {
                await manatalService.updateCandidate(candidate.manatalId, { email, phone_number: phone }).catch(() => {});
              }
            } else {
              addLog(candidate.name, 'No contact info found.', 'warning');
            }
          }
        } catch (e: any) {
          addLog(candidate.name, 'Lookup error.', 'error');
        }
      }
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('CREATE');
    setEditingId(null);
    setDetailsError(null);
    setRegForm({
      full_name: '',
      first_name: '',
      last_name: '',
      reference: '',
      diploma: '',
      university: '',
      current_company: '',
      current_position: '',
      location: '',
      address: '',
      email: '',
      phone_number: '',
      source: '',
      linkedin_url: '',
      selected_job_id: ''
    });
    setModalOpen(true);
  };

  const handleOpenView = async (candidate: Candidate) => {
    setModalMode('VIEW');
    setEditingId(candidate.manatalId || candidate.id);
    setDetailsError(null);
    setLoadingDetails(true);
    setRrFeedback({ type: 'idle', message: '' });

    const parts = candidate.name.split(' ');
    setRegForm({
      full_name: candidate.name,
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' ') || '',
      reference: candidate.reference || '',
      current_position: candidate.role || '',
      current_company: candidate.currentCompany || '',
      location: candidate.location || '',
      diploma: candidate.diploma || '',
      university: candidate.university || '',
      address: '',
      email: candidate.email || '',
      phone_number: candidate.phone || '',
      source: candidate.source || '',
      linkedin_url: candidate.linkedinUrl || '',
      selected_job_id: ''
    });
    setModalOpen(true);

    if (candidate.manatalId) {
      try {
        const details = await manatalService.getCandidateDetails(candidate.manatalId, { name: candidate.name });
        setRegForm((prev) => ({
          ...prev,
          full_name: details.full_name || prev.full_name,
          email: details.email || prev.email,
          phone_number: details.phone_number || prev.phone_number,
          address: details.address || prev.address,
          current_company: details.current_company || prev.current_company,
          current_position: details.current_position || prev.current_position,
          linkedin_url: details.linkedin_url || prev.linkedin_url,
          reference: details.id ? String(details.id) : prev.reference
        }));
      } catch (error: any) {
        setDetailsError('Note: Full Manatal details could not be synced.');
      }
    }
    setLoadingDetails(false);
  };

  const handleSwitchToEdit = () => {
    setModalMode('EDIT');
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setLoadingDetails(false);
  };

  const handleRocketReachLookup = async () => {
    const url = regForm.linkedin_url;
    if (!url) return;
    setIsRocketReaching(true);
    try {
      const result = await rocketReachService.lookupContactInfo(url);
      if (result.email || result.phone) {
        setRrFeedback({ type: 'success', message: 'Profile enriched successfully!' });
        setRegForm((prev) => ({
          ...prev,
          email: result.email || prev.email,
          phone_number: result.phone || prev.phone_number
        }));
      } else {
        setRrFeedback({ type: 'warning', message: result.error || 'No contact found.' });
      }
    } finally {
      setIsRocketReaching(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) {
      setIsCheckingDuplicate(true);
      try {
        const duplicateResult = await manatalService.checkDuplicate({
          email: regForm.email,
          phone_number: regForm.phone_number,
          linkedin_url: regForm.linkedin_url
        });

        if (duplicateResult.isDuplicate) {
          setIsCheckingDuplicate(false);
          setDuplicateModal({
            show: true,
            result: duplicateResult
          });
          return;
        }
      } catch (error) {
        console.error('Error checking duplicate:', error);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }

    setRegistering(true);
    try {
      if (modalMode === 'EDIT' && editingId) {
        const parts = regForm.full_name.trim().split(' ');
        const fName = parts[0] || '';
        const lName = parts.slice(1).join(' ') || '.';

        await manatalService.updateCandidate(editingId, {
          first_name: fName,
          last_name: lName,
          email: regForm.email,
          phone_number: regForm.phone_number,
          address: regForm.address,
          current_company: regForm.current_company,
          current_position: regForm.current_position,
          linkedin_url: regForm.linkedin_url
        });

        const updates: Partial<Candidate> = {
          name: regForm.full_name,
          role: regForm.current_position,
          currentCompany: regForm.current_company,
          location: regForm.location,
          email: regForm.email,
          phone: regForm.phone_number,
          linkedinUrl: regForm.linkedin_url
        };
        updateCandidateState(editingId, updates);
        activityLogService.logAction(`Updated candidate details: ${regForm.full_name}`);
        handleCloseModal();
      } else {
        const parts = regForm.full_name.trim().split(' ');
        const fName = parts[0] || '';
        const lName = parts.slice(1).join(' ') || '.';

        const session = await authService.getCurrentSession();
        const callerName = session?.user?.user_metadata?.display_name || session?.user?.email || 'Partner';

        const newCand = await manatalService.createCandidate({
          first_name: fName,
          last_name: lName,
          email: regForm.email,
          phone_number: regForm.phone_number,
          address: regForm.location || regForm.address,
          current_company: regForm.current_company,
          current_position: regForm.current_position,
          linkedin_url: regForm.linkedin_url,
          source: regForm.source || 'Workoast Partner',
          selected_job_id: regForm.selected_job_id || undefined,
          candidate_owner: callerName
        });

        if (newCand) {
          setLocalCandidates((prev) => [newCand, ...prev]);
          activityLogService.logAction(`Registered new candidate: ${newCand.name}`);
        }
        handleCloseModal();
      }
    } catch (e: any) {
      console.error('Registration failed:', e);
      setDetailsError(e.message || 'Operation failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const promptDeleteCandidate = (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({ show: true, candidate });
  };

  const executeDeleteCandidate = async () => {
    if (!deleteConfirmation.candidate) return;
    setIsDeleting(true);
    const candidate = deleteConfirmation.candidate;
    try {
      if (candidate.manatalId) {
        await manatalService.deleteCandidate(candidate.manatalId).catch(() => {});
      }
      await candidateService.delete(candidate.id);
      setLocalCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      setDisplayedCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      activityLogService.logAction(`Deleted candidate: ${candidate.name}`);
      setDeleteConfirmation({ show: false, candidate: null });
    } catch (e) {
      console.error('Delete candidate failed:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateAiSummary = async (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingAiId(candidate.id);
    try {
      const summary = await generateCandidateSummary(candidate);
      setAiSummaries((prev) => ({ ...prev, [candidate.id]: summary }));
    } catch (e) {
      console.error('AI summary error:', e);
    } finally {
      setLoadingAiId(null);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
  };

  const availableCount = localCandidates.filter((c) => c.status === CandidateStatus.AVAILABLE).length;
  const interviewingCount = localCandidates.filter((c) => c.status === CandidateStatus.INTERVIEWING).length;
  const hiredCount = localCandidates.filter((c) => c.status === CandidateStatus.HIRED).length;
  const pinnedCount = localCandidates.filter((c) => c.isPinned).length;

  const sidebarNavItems = [
    { value: 'All Candidates', label: 'All Candidates', icon: 'users', count: localCandidates.length },
    { value: 'Available', label: 'Available', icon: 'circle-check', count: availableCount },
    { value: 'Interviewing', label: 'Interviewing', icon: 'clock', count: interviewingCount },
    { value: 'Hired', label: 'Hired', icon: 'trophy', count: hiredCount },
    { value: 'Pinned', label: 'Pinned', icon: 'pin', count: pinnedCount }
  ];

  const handleSidebarSelect = (val: string) => {
    if (val === 'admin') {
      onNavigate('ADMIN');
      return;
    }
    if (val === 'logout') {
      handleLogout();
      return;
    }
    if (val === 'Available') {
      setActiveFilter('All Candidates');
    } else {
      setActiveFilter(val);
    }
  };

  return (
    <div className="app-shell">
      {/* Mobile Top Navigation Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconButton
            icon="menu"
            label="Open navigation menu"
            variant="ghost"
            size="md"
            onClick={() => setMobileMenuOpen(true)}
          />
          <Logo variant="mark" tone="ink-green" height={26} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Workoast</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            variant="brand"
            size="sm"
            iconLeft="user-plus"
            onClick={handleOpenCreate}
          >
            Register
          </Button>
          <Avatar name={currentUserEmail} size="sm" />
        </div>
      </header>

      {/* Mobile Off-canvas Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-drawer-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="mobile-drawer">
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
              <Logo variant="horizontal" tone="ink-green" height={22} />
              <IconButton
                icon="x"
                label="Close menu"
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Sidebar
                value={activeFilter}
                onChange={(val) => {
                  setMobileMenuOpen(false);
                  handleSidebarSelect(val);
                }}
                items={sidebarNavItems}
                bottomItems={[
                  ...(isAdmin ? [{ value: 'admin', label: 'Admin Dashboard', icon: 'layout-dashboard' }] : []),
                  { value: 'logout', label: 'Sign out', icon: 'log-out' }
                ]}
                footer={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={currentUserEmail} size="sm" />
                    <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 1 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {currentUserEmail.split('@')[0]}
                      </span>
                      <span className="v-caption" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isAdmin ? 'Admin workspace' : 'Partner workspace'}
                      </span>
                    </div>
                  </div>
                }
                style={{ height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </>
      )}

      {/* Sidebar for Desktop */}
      <Sidebar
        className="desktop-sidebar"
        value={activeFilter}
        onChange={handleSidebarSelect}
        header={<Logo variant="horizontal" tone="ink-green" height={22} />}
        items={sidebarNavItems}
        bottomItems={[
          ...(isAdmin ? [{ value: 'admin', label: 'Admin Dashboard', icon: 'layout-dashboard' }] : []),
          { value: 'logout', label: 'Sign out', icon: 'log-out' }
        ]}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={currentUserEmail} size="sm" />
            <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 1 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-primary)'
                }}
              >
                {currentUserEmail.split('@')[0]}
              </span>
              <span className="v-caption" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isAdmin ? 'Admin workspace' : 'Partner workspace'}
              </span>
            </div>
          </div>
        }
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          alignSelf: 'start',
          display: 'flex'
        }}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          <PageHeader
            eyebrow="Workoast · Partner Talent Workspace"
            title="Talent Pool & Candidates"
            description="Review candidate pipelines, check compensation and status, and register candidates directly into active mandates."
            actions={
              <>
                <Button
                  variant="secondary"
                  size="md"
                  iconLeft="sparkles"
                  onClick={handleBatchSearchContacts}
                  disabled={displayedCandidates.length === 0 || isBatchProcessing}
                >
                  Batch enrich
                </Button>
                <Button
                  variant="brand"
                  size="md"
                  iconLeft="user-plus"
                  onClick={handleOpenCreate}
                >
                  Register candidate
                </Button>
              </>
            }
          />

          {/* Quick Stats Grid */}
          <div className="stats-grid">
            <Card padding="md" style={{ display: 'grid', gap: 6 }}>
              <span className="v-label" style={{ color: 'var(--text-tertiary)' }}>Total candidates</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--text-primary)' }}>
                  {localCandidates.length}
                </span>
                <span className="v-caption">in pipeline</span>
              </div>
            </Card>

            <Card padding="md" style={{ display: 'grid', gap: 6 }}>
              <span className="v-label" style={{ color: 'var(--text-tertiary)' }}>Available</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--text-primary)' }}>
                  {availableCount}
                </span>
                <Badge tone="success" size="sm">Ready now</Badge>
              </div>
            </Card>

            <Card padding="md" style={{ display: 'grid', gap: 6 }}>
              <span className="v-label" style={{ color: 'var(--text-tertiary)' }}>Interviewing</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--text-primary)' }}>
                  {interviewingCount}
                </span>
                <Badge tone="info" size="sm">Active</Badge>
              </div>
            </Card>

            <Card padding="md" style={{ display: 'grid', gap: 6 }}>
              <span className="v-label" style={{ color: 'var(--text-tertiary)' }}>Hired</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--text-primary)' }}>
                  {hiredCount}
                </span>
                <Badge tone="brand" size="sm">Placed</Badge>
              </div>
            </Card>
          </div>

          {/* Filter Bar & Search */}
          <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <Tabs
                variant="segmented"
                size="md"
                items={FILTER_TABS}
                value={activeFilter}
                onChange={setActiveFilter}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tabs
                  variant="segmented"
                  size="sm"
                  items={[
                    { value: 'CANDIDATE', label: 'Search talent' },
                    { value: 'JOB', label: 'Manatal Job URL' }
                  ]}
                  value={searchMode}
                  onChange={(v) => setSearchMode(v as SearchMode)}
                />
              </div>
            </div>

            {searchMode === 'CANDIDATE' ? (
              <Input
                iconLeft="search"
                placeholder="Search candidates by name, position, location, or past company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                suffix={isSearching ? <Icon name="loader-circle" size={16} style={{ animation: 'v-spin 0.9s linear infinite' }} /> : null}
              />
            ) : (
              <Card variant="outline" padding="sm" style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      iconLeft="link"
                      placeholder="Paste Manatal Job URL (e.g. https://app.manatal.com/.../jobs/12345/pipeline)"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                    />
                  </div>
                  <Button variant="primary" loading={isFetchingJob} onClick={handleJobUrlFetch}>
                    Load stages
                  </Button>
                </div>
                {jobError && (
                  <div style={{ fontSize: 13, color: 'var(--status-danger-fg)' }}>{jobError}</div>
                )}
                {fetchedJob && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{fetchedJob.title || 'Untitled Job'}</div>
                      <div className="v-caption">{fetchedJob.organization_name} · {pipelineStages.length} stages</div>
                    </div>
                    <div style={{ minWidth: 200 }}>
                      <Select
                        size="sm"
                        placeholder="Filter by stage"
                        aria-label="Filter candidates by pipeline stage"
                        value={selectedStage}
                        onChange={handleStageSelect}
                        options={pipelineStages.map((s) => ({
                          value: String(s.id),
                          label: s.name
                        }))}
                      />
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Candidates List */}
          <div style={{ display: 'grid', gap: 12 }}>
            {loading || isFetchingCandidates ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
                <Icon name="loader-circle" size={32} style={{ animation: 'v-spin 0.9s linear infinite', color: 'var(--green-700)' }} />
                <span className="v-caption">Loading candidates...</span>
              </div>
            ) : displayedCandidates.length === 0 ? (
              <Card
                variant="outline"
                style={{
                  padding: '64px 24px',
                  textAlign: 'center',
                  display: 'grid',
                  gap: 8,
                  justifyItems: 'center'
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--surface-sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-tertiary)'
                  }}
                >
                  <Icon name="user" size={24} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>No candidates found</div>
                <div className="v-body-sm v-muted" style={{ maxWidth: 400 }}>
                  {searchQuery
                    ? 'Try searching with different terms or reset your filters.'
                    : 'Register your first candidate to start tracking talent and interviews.'}
                </div>
                <Button variant="brand" size="sm" iconLeft="user-plus" onClick={handleOpenCreate} style={{ marginTop: 8 }}>
                  Register candidate
                </Button>
              </Card>
            ) : (
              displayedCandidates.map((candidate) => {
                const isPureExternal = !localCandidates.find(
                  (c) => c.manatalId === candidate.manatalId || c.id === candidate.id
                );
                const isOwner = candidate.createdBy === currentUserId;
                const canEdit = isAdmin || isOwner;
                const aiSummary = aiSummaries[candidate.id];

                return (
                  <Card
                    key={candidate.id}
                    variant="default"
                    padding="md"
                    interactive
                    onClick={() => handleOpenView(candidate)}
                    style={{
                      display: 'grid',
                      gap: 14,
                      border: candidate.isPinned ? '1px solid var(--border-strong)' : '1px solid var(--border-subtle)',
                      boxShadow: candidate.isPinned ? 'var(--shadow-xs)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <Avatar name={candidate.name} src={candidate.avatarUrl} size="lg" />

                      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {candidate.name}
                          </span>

                          <CandidateStatusBadge status={candidate.status} />

                          {isPureExternal ? (
                            <Tag size="sm" variant="outline">Manatal</Tag>
                          ) : (
                            <Tag size="sm" variant="soft">Workoast</Tag>
                          )}

                          {candidate.createdByName && (
                            <span className="v-caption" style={{ color: 'var(--text-tertiary)' }}>
                              by {candidate.createdByName}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                          {candidate.role || 'Talent'} {candidate.location ? `· ${candidate.location}` : ''}
                          {candidate.currentCompany ? ` · ${candidate.currentCompany}` : ''}
                        </div>

                        {/* Contacts & Metadata */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                          {candidate.email ? (
                            <span className="v-data" style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Icon name="mail" size={14} color="var(--green-700)" />
                              {candidate.email}
                            </span>
                          ) : (
                            <span className="v-data" style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Icon name="mail" size={14} color="var(--text-tertiary)" />
                              No email
                            </span>
                          )}

                          {candidate.phone && (
                            <span className="v-data" style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Icon name="phone" size={14} color="var(--green-700)" />
                              {candidate.phone}
                            </span>
                          )}

                          {candidate.expectedSalary && (
                            <span className="v-data" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                              Salary: {candidate.expectedSalary}
                            </span>
                          )}

                          {candidate.noticePeriod && (
                            <span className="v-data" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                              Notice: {candidate.noticePeriod}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Actions - Consolidated for Ergonomics & A11y */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconButton
                          icon="pin"
                          label={candidate.isPinned ? 'Unpin candidate' : 'Pin candidate'}
                          size="sm"
                          active={candidate.isPinned}
                          style={candidate.isPinned ? { color: 'var(--green-700)', background: 'var(--green-100)' } : undefined}
                          onClick={() => handlePinToggle(candidate)}
                        />

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenView(candidate)}
                        >
                          Details
                        </Button>

                        <div style={{ position: 'relative' }}>
                          <IconButton
                            icon="ellipsis"
                            label="More actions"
                            size="sm"
                            variant="ghost"
                            active={activeMenuId === candidate.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId((prev) => (prev === candidate.id ? null : candidate.id));
                            }}
                          />

                          {activeMenuId === candidate.id && (
                            <div
                              role="menu"
                              aria-label="Candidate actions"
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 'calc(100% + 6px)',
                                width: 190,
                                background: 'var(--surface-raised)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-md)',
                                padding: 6,
                                zIndex: 200,
                                display: 'grid',
                                gap: 2,
                                animation: 'v-fade var(--dur-fast) var(--ease-out)'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  width: '100%',
                                  padding: '8px 10px',
                                  border: 'none',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'transparent',
                                  color: 'var(--text-primary)',
                                  fontSize: 13,
                                  fontFamily: 'var(--font-sans)',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                onClick={(e) => {
                                  setActiveMenuId(null);
                                  handleGenerateAiSummary(candidate, e);
                                }}
                              >
                                <Icon name="sparkles" size={15} color="var(--green-700)" />
                                <span>{loadingAiId === candidate.id ? 'Generating...' : 'AI Summary'}</span>
                              </button>

                              {candidate.linkedinUrl && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'transparent',
                                    color: 'var(--text-primary)',
                                    fontSize: 13,
                                    fontFamily: 'var(--font-sans)',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    window.open(candidate.linkedinUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                >
                                  <Icon name="external-link" size={15} />
                                  <span>LinkedIn profile</span>
                                </button>
                              )}

                              {canEdit && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'transparent',
                                    color: 'var(--status-danger-fg)',
                                    fontSize: 13,
                                    fontFamily: 'var(--font-sans)',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--red-100)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  onClick={(e) => {
                                    setActiveMenuId(null);
                                    promptDeleteCandidate(candidate, e);
                                  }}
                                >
                                  <Icon name="trash-2" size={15} />
                                  <span>Delete candidate</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI Summary expansion if generated */}
                    {aiSummary && (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--surface-brand-soft)',
                          border: '1px solid var(--green-200)',
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: 'var(--green-900)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
                          <Icon name="sparkles" size={14} color="var(--green-700)" />
                          AI Profile Summary
                        </div>
                        {aiSummary}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Candidate Register / View / Edit Dialog */}
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        size="lg"
        eyebrow={modalMode === 'CREATE' ? 'New registration' : 'Candidate dossier'}
        title={
          modalMode === 'CREATE'
            ? 'Register candidate'
            : modalMode === 'EDIT'
            ? `Edit ${regForm.full_name}`
            : regForm.full_name
        }
        description={
          modalMode === 'CREATE'
            ? "Register an engineer for active mandates. Candidate lock is held for 6 months."
            : modalMode === 'EDIT'
            ? 'Update verified details and contact channels.'
            : 'Candidate qualifications, contact channels, and background.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseModal}>
              Cancel
            </Button>
            {modalMode === 'VIEW' ? (
              <Button variant="brand" iconLeft="pencil" onClick={handleSwitchToEdit}>
                Edit details
              </Button>
            ) : (
              <Button
                variant="brand"
                loading={registering || isCheckingDuplicate}
                onClick={handleRegisterSubmit}
              >
                {modalMode === 'CREATE' ? 'Register candidate' : 'Save changes'}
              </Button>
            )}
          </>
        }
      >
        {loadingDetails ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <Icon name="loader-circle" size={28} style={{ animation: 'v-spin 0.9s linear infinite' }} />
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'grid', gap: 16 }}>
            {detailsError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--status-warning-bg)', color: 'var(--status-warning-fg)', fontSize: 13 }}>
                {detailsError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input
                label="Full name"
                required
                disabled={modalMode === 'VIEW'}
                placeholder="e.g. Camila Restrepo"
                value={regForm.full_name}
                onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
              />

              <Input
                label="Work email"
                type="email"
                iconLeft="mail"
                disabled={modalMode === 'VIEW'}
                placeholder="candidate@domain.com"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input
                label="Phone number"
                iconLeft="phone"
                disabled={modalMode === 'VIEW'}
                placeholder="+1 (555) 000-0000"
                value={regForm.phone_number}
                onChange={(e) => setRegForm({ ...regForm, phone_number: e.target.value })}
              />

              <Input
                label="Location / Country"
                iconLeft="map-pin"
                disabled={modalMode === 'VIEW'}
                placeholder="e.g. Bogotá, Colombia"
                value={regForm.location}
                onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input
                label="Current position / Title"
                iconLeft="briefcase"
                disabled={modalMode === 'VIEW'}
                placeholder="Senior Backend Engineer"
                value={regForm.current_position}
                onChange={(e) => setRegForm({ ...regForm, current_position: e.target.value })}
              />

              <Input
                label="Current company"
                iconLeft="building-2"
                disabled={modalMode === 'VIEW'}
                placeholder="e.g. Rappi"
                value={regForm.current_company}
                onChange={(e) => setRegForm({ ...regForm, current_company: e.target.value })}
              />
            </div>

            {/* LinkedIn & Enrichment */}
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="LinkedIn URL"
                    iconLeft="link"
                    disabled={modalMode === 'VIEW'}
                    placeholder="https://linkedin.com/in/username"
                    value={regForm.linkedin_url}
                    onChange={(e) => setRegForm({ ...regForm, linkedin_url: e.target.value })}
                  />
                </div>
                {modalMode !== 'VIEW' && (
                  <Button
                    size="md"
                    variant="secondary"
                    iconLeft="sparkles"
                    loading={isRocketReaching}
                    disabled={!regForm.linkedin_url.trim()}
                    onClick={handleRocketReachLookup}
                  >
                    Enrich
                  </Button>
                )}
              </div>
              {rrFeedback.message && (
                <div
                  style={{
                    fontSize: 12,
                    color: rrFeedback.type === 'success' ? 'var(--status-success-fg)' : 'var(--status-warning-fg)'
                  }}
                >
                  {rrFeedback.message}
                </div>
              )}
            </div>

            {modalMode === 'CREATE' && availableJobs.length > 0 && (
              <Select
                label="Assign to open position mandate"
                optional
                placeholder="Choose position (optional)"
                value={regForm.selected_job_id}
                onChange={(e) => setRegForm({ ...regForm, selected_job_id: e.target.value })}
                options={availableJobs.map((j) => ({
                  value: String(j.id),
                  label: `${j.position_name || j.name || 'Role'} · ${j.organization_name || 'Mandate'}`
                }))}
              />
            )}
          </form>
        )}
      </Dialog>

      {/* Batch Processing Dialog */}
      <Dialog
        open={showBatchModal}
        onClose={() => !isBatchProcessing && setShowBatchModal(false)}
        size="md"
        eyebrow="RocketReach Enrichment"
        title="Batch contact lookup"
        description="Searching verified emails and phone numbers across talent profiles."
        footer={
          <Button
            variant="primary"
            disabled={isBatchProcessing}
            onClick={() => setShowBatchModal(false)}
          >
            {isBatchProcessing ? 'Processing in background...' : 'Done'}
          </Button>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <ProgressBar
            value={batchProgress.current}
            max={batchProgress.total || 1}
            size="md"
            showValue
            valueLabel={`${batchProgress.current} of ${batchProgress.total}`}
            label="Enrichment progress"
          />

          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              background: 'var(--surface-sunken)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              display: 'grid',
              gap: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12
            }}
          >
            {batchLogs.length === 0 ? (
              <span className="v-caption">Starting batch lookup...</span>
            ) : (
              batchLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    color:
                      log.type === 'success'
                        ? 'var(--status-success-fg)'
                        : log.type === 'warning'
                        ? 'var(--status-warning-fg)'
                        : log.type === 'error'
                        ? 'var(--status-danger-fg)'
                        : 'var(--text-secondary)'
                  }}
                >
                  <span style={{ color: 'var(--text-tertiary)' }}>{log.timestamp}</span>
                  <strong>{log.candidateName}:</strong>
                  <span>{log.message}</span>
                </div>
              ))
            )}
            <div ref={batchLogsEndRef} />
          </div>
        </div>
      </Dialog>

      {/* Duplicate Detected Dialog */}
      <Dialog
        open={duplicateModal.show && !!duplicateModal.result}
        onClose={() => setDuplicateModal({ show: false, result: null })}
        size="sm"
        eyebrow="Duplicate detected"
        title="Candidate already registered"
        description={`A candidate with matching ${duplicateModal.result?.matchedByLabel} already exists in the system.`}
        footer={
          <Button
            variant="primary"
            onClick={() => setDuplicateModal({ show: false, result: null })}
          >
            Understood
          </Button>
        }
      >
        {duplicateModal.result?.existingCandidate && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              background: 'var(--surface-sunken)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <Avatar name={duplicateModal.result.existingCandidate.name} size="md" />
            <div style={{ display: 'grid', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {duplicateModal.result.existingCandidate.name}
              </span>
              <span className="v-caption">
                {duplicateModal.result.existingCandidate.role}
                {duplicateModal.result.existingCandidate.currentCompany
                  ? ` · ${duplicateModal.result.existingCandidate.currentCompany}`
                  : ''}
              </span>
              {duplicateModal.result.existingCandidate.email && (
                <span className="v-data" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {duplicateModal.result.existingCandidate.email}
                </span>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.show}
        onClose={() => !isDeleting && setDeleteConfirmation({ show: false, candidate: null })}
        size="sm"
        eyebrow="Confirm deletion"
        title="Remove candidate?"
        description={`Are you sure you want to delete ${deleteConfirmation.candidate?.name}? This action removes them from the database and archives them in Manatal.`}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={isDeleting}
              onClick={() => setDeleteConfirmation({ show: false, candidate: null })}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isDeleting}
              onClick={executeDeleteCandidate}
            >
              Confirm delete
            </Button>
          </>
        }
      />
    </div>
  );
};

export default PartnerPortal;
