
import React, { useEffect, useState, useRef } from 'react';
import { Candidate, CandidateStatus, ViewMode } from '../types';
import { candidateService } from '../services/candidateService';
import { authService } from '../services/authService';
import { manatalService, DuplicateCheckResult } from '../services/manatalService';
import { activityLogService } from '../services/activityLogService';
import { generateCandidateSummary } from '../services/geminiService';
import { rocketReachService } from '../services/rocketReachService';


const FILTER_TABS = ['All Candidates', 'My Candidates', 'Hired', 'Pinned'];

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

    const [loadingAiId, setLoadingAiId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean, candidate: Candidate | null }>({ show: false, candidate: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('CREATE');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);

    const [availableJobs, setAvailableJobs] = useState<any[]>([]);

    const [isRocketReaching, setIsRocketReaching] = useState(false);
    const [rrFeedback, setRrFeedback] = useState<{ type: 'success' | 'error' | 'warning' | 'idle', message: string }>({ type: 'idle', message: '' });

    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [batchLogs, setBatchLogs] = useState<BatchLog[]>([]);
    const batchLogsEndRef = useRef<HTMLDivElement>(null);

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
                }
                if (userId) {
                    const allData = await candidateService.getAll(userId);
                    if (mounted) setLocalCandidates(allData);
                }
                const jobs = await manatalService.getJobs();
                if (mounted) setAvailableJobs(jobs);
            } catch (e) {
                console.error("Init failed:", e);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        init();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (showBatchModal && batchLogsEndRef.current) {
            batchLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [batchLogs, showBatchModal]);

    useEffect(() => {
        if (searchMode === 'JOB') return;
        const MIN_SEARCH_CHARS = 3;
        if (searchQuery.trim().length < MIN_SEARCH_CHARS) {
            setIsSearching(false);
            let filtered = localCandidates;
            if (activeFilter === 'Pinned') {
                filtered = filtered.filter(c => c.isPinned);
            } else if (activeFilter === 'All Candidates') {
                filtered = filtered.filter(c => !c.isPinned);
                if (!isAdmin) {
                    filtered = filtered.filter(c => c.visibility || c.createdBy === currentUserId);
                }
            } else if (activeFilter === 'Hired') {
                filtered = filtered.filter(c => c.status === CandidateStatus.HIRED);
            } else if (activeFilter === 'My Candidates') {
                filtered = filtered.filter(c => c.createdBy === currentUserId);
            }
            setDisplayedCandidates(filtered);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                activityLogService.logAction(`Searched candidates: "${searchQuery}"`);
                const manatalResults = await manatalService.searchCandidates(searchQuery);
                const mergedResults = manatalResults.map(mResult => {
                    const existingLocal = localCandidates.find(local =>
                        (mResult.manatalId && local.manatalId === mResult.manatalId) ||
                        (local.name.toLowerCase() === (mResult.name || '').toLowerCase())
                    );
                    if (existingLocal) return existingLocal;
                    const idToCheck = mResult.manatalId || '';
                    const isPinned = idToCheck ? candidateService.isCandidatePinned(idToCheck, currentUserId) : false;
                    return {
                        id: mResult.manatalId || crypto.randomUUID(),
                        name: mResult.name || 'Unknown',
                        role: mResult.role || 'Candidate',
                        location: mResult.location || '',
                        status: CandidateStatus.AVAILABLE,
                        visibility: true,
                        addedAt: mResult.addedAt || new Date().toISOString(),
                        avatarUrl: mResult.avatarUrl || '',
                        interestedCount: 0,
                        reference: mResult.reference,
                        currentCompany: mResult.currentCompany,
                        linkedinUrl: mResult.linkedinUrl,
                        email: mResult.email,
                        phone: mResult.phone,
                        manatalId: mResult.manatalId,
                        isPinned: isPinned
                    } as Candidate;
                });
                if (activeFilter === 'Pinned') {
                    setDisplayedCandidates(mergedResults.filter(c => c.isPinned) as Candidate[]);
                } else if (activeFilter === 'All Candidates') {
                    setDisplayedCandidates(mergedResults.filter(c => !c.isPinned) as Candidate[]);
                } else {
                    setDisplayedCandidates(mergedResults as Candidate[]);
                }
            } catch (err) {
                console.error("Manatal search failed:", err);
                setDisplayedCandidates([]);
            } finally {
                setIsSearching(false);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [searchQuery, localCandidates, activeFilter, currentUserId, isAdmin, searchMode]);

    const handleJobUrlBlur = async () => {
        if (!jobUrl) return;
        const jobId = manatalService.extractJobIdFromUrl(jobUrl);
        if (!jobId) {
            setJobError("Invalid Manatal Job URL. Please check the link.");
            setFetchedJob(null);
            setPipelineStages([]);
            return;
        }
        setIsFetchingJob(true);
        setJobError(null);
        setFetchedJob(null);
        setPipelineStages([]);
        setSelectedStage('');
        try {
            const { stages, job } = await manatalService.getStagesForJob(jobId);
            setFetchedJob(job);
            if (stages && stages.length > 0) {
                setPipelineStages(stages);
            } else {
                setJobError("No pipeline is assigned to this job, or the pipeline is empty.");
            }
        } catch (e: any) {
            setJobError(e.message || "Failed to fetch job details.");
        } finally {
            setIsFetchingJob(false);
        }
    };

    const handleStageSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const stageId = e.target.value;
        setSelectedStage(stageId);
        if (!stageId || !fetchedJob) return;
        setIsFetchingCandidates(true);
        setDisplayedCandidates([]);
        try {
            const candidates = await manatalService.getCandidatesByJobStage(fetchedJob.id, stageId);
            const merged = candidates.map(c => {
                const idToCheck = c.manatalId || '';
                const isPinned = idToCheck ? candidateService.isCandidatePinned(idToCheck, currentUserId) : false;
                return { ...c, isPinned } as Candidate;
            });
            setDisplayedCandidates(merged);
        } catch (e: any) {
            alert("Error loading candidates for this stage.");
        } finally {
            setIsFetchingCandidates(false);
        }
    };

    useEffect(() => {
        if (modalMode === 'VIEW') return;
        if (editingId && modalMode === 'EDIT') return;
        const parts = regForm.full_name.trim().split(' ');
        if (parts.length > 0) {
            const first = parts[0];
            const last = parts.slice(1).join(' ');
            setRegForm(prev => ({ ...prev, first_name: first, last_name: last }));
        } else {
            setRegForm(prev => ({ ...prev, first_name: '', last_name: '' }));
        }
    }, [regForm.full_name, editingId, modalMode]);

    const handleLogout = async () => {
        await authService.signOut();
    };

    const handlePinToggle = (candidate: Candidate) => {
        if (!currentUserId) {
            alert("You must be logged in to pin candidates.");
            return;
        }
        const isNowPinned = candidateService.togglePin(candidate, currentUserId);
        const idToPin = candidate.manatalId || candidate.id;
        const updateFn = (c: Candidate) => {
            if ((c.manatalId && c.manatalId === idToPin) || (c.id === idToPin)) {
                return { ...c, isPinned: isNowPinned };
            }
            return c;
        };
        if (searchMode === 'CANDIDATE') {
            if (activeFilter === 'All Candidates' && isNowPinned) {
                setDisplayedCandidates(prev => prev.filter(c =>
                    !((c.manatalId && c.manatalId === idToPin) || (c.id === idToPin))
                ));
            } else if (activeFilter === 'Pinned' && !isNowPinned) {
                setDisplayedCandidates(prev => prev.filter(c =>
                    !((c.manatalId && c.manatalId === idToPin) || (c.id === idToPin))
                ));
            } else {
                setDisplayedCandidates(prev => prev.map(updateFn));
            }
        } else {
            setDisplayedCandidates(prev => prev.map(updateFn));
        }
        setLocalCandidates(prev => {
            const exists = prev.some(c => (c.manatalId && c.manatalId === idToPin) || (c.id === idToPin));
            if (!exists && isNowPinned) {
                return [{ ...candidate, isPinned: true }, ...prev];
            }
            return prev.map(updateFn);
        });
        activityLogService.logAction(`${isNowPinned ? 'Pinned' : 'Unpinned'} candidate: ${candidate.name}`);
    };

    const updateCandidateState = (candidateId: string, updates: Partial<Candidate>) => {
        const updateFn = (c: Candidate) => {
            if (c.id === candidateId || (c.manatalId && c.manatalId === candidateId)) {
                return { ...c, ...updates };
            }
            return c;
        };
        setLocalCandidates(prev => prev.map(updateFn));
        setDisplayedCandidates(prev => prev.map(updateFn));
    };

    const handleBatchSearchContacts = async () => {
        const targets = [...displayedCandidates];
        if (targets.length === 0) return;
        setIsBatchProcessing(true);
        setShowBatchModal(true);
        setBatchProgress({ current: 0, total: targets.length });
        setBatchLogs([]);
        const addLog = (name: string, msg: string, type: BatchLog['type']) => {
            setBatchLogs(prev => [...prev, {
                id: crypto.randomUUID(), candidateName: name, message: msg, type, timestamp: new Date().toLocaleTimeString()
            }]);
        };
        try {
            for (let i = 0; i < targets.length; i++) {
                const candidate = targets[i];
                setBatchProgress({ current: i + 1, total: targets.length });
                if (!candidate.linkedinUrl) {
                    addLog(candidate.name, "Skipped - No LinkedIn URL.", 'warning');
                    continue;
                }
                await new Promise(r => setTimeout(r, 500));
                try {
                    const result = await rocketReachService.lookupContactInfo(candidate.linkedinUrl);
                    if (result.error) {
                        addLog(candidate.name, `Failed: ${result.error}`, 'error');
                    } else {
                        const { email, phone } = result;
                        if (email || phone) {
                            addLog(candidate.name, `Success: Found Contact.`, 'success');
                            const updates: Partial<Candidate> = {};
                            if (email) updates.email = email;
                            if (phone) updates.phone = phone;
                            updateCandidateState(candidate.id, updates);
                            if (candidate.manatalId) {
                                await manatalService.updateCandidate(candidate.manatalId, { email, phone_number: phone }).catch(() => { });
                            }
                        } else {
                            addLog(candidate.name, "No contact info found.", 'warning');
                        }
                    }
                } catch (e: any) {
                    addLog(candidate.name, "Lookup error.", 'error');
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
            full_name: '', first_name: '', last_name: '', reference: '', diploma: '', university: '', current_company: '', current_position: '', location: '', address: '', email: '', phone_number: '', source: '', linkedin_url: '', selected_job_id: ''
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
                setRegForm(prev => ({
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
                setDetailsError("Note: Full Manatal details could not be synced.");
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
                setRrFeedback({ type: 'success', message: 'Enriched successfully!' });
                setRegForm(prev => ({ ...prev, email: result.email || prev.email, phone_number: result.phone || prev.phone_number }));
            } else {
                setRrFeedback({ type: 'warning', message: result.error || 'No info found.' });
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
                const duplicateResult = await manatalService.checkDuplicateCandidate({
                    email: regForm.email,
                    full_name: regForm.full_name,
                    linkedin_url: regForm.linkedin_url,
                    phone_number: regForm.phone_number
                });

                if (duplicateResult.isDuplicate) {
                    setDuplicateModal({ show: true, result: duplicateResult });
                    setIsCheckingDuplicate(false);
                    return;
                }
            } catch (error) {
                console.error('Duplicate check failed:', error);

            } finally {
                setIsCheckingDuplicate(false);
            }
        }

        setRegistering(true);
        try {
            if (editingId) {
                const updatedCandidate = await manatalService.updateCandidate(editingId, regForm);
                setLocalCandidates(prev => prev.map(c =>
                    (c.manatalId === editingId || c.id === editingId) ? { ...c, ...updatedCandidate } as Candidate : c
                ));
                setDisplayedCandidates(prev => prev.map(c =>
                    (c.manatalId === editingId || c.id === editingId) ? { ...c, ...updatedCandidate } as Candidate : c
                ));
                handleCloseModal();
            } else {
                const newCandidate = await manatalService.createCandidate(regForm);
                const dbCandidate = await candidateService.createLocalCandidate(newCandidate, currentUserId!);
                if (regForm.selected_job_id && newCandidate.manatalId) {
                    await manatalService.createMatch(newCandidate.manatalId, regForm.selected_job_id);
                }
                setLocalCandidates(prev => [dbCandidate, ...prev]);
                setDisplayedCandidates(prev => [dbCandidate, ...prev]);
                handleCloseModal();
            }
        } catch (error: any) {
            alert(`Operation Failed: ${error.message}`);
        } finally {
            setRegistering(false);
        }
    };

    const promptDeleteCandidate = (candidate: Candidate, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setDeleteConfirmation({ show: true, candidate });
    };

    const executeDeleteCandidate = async () => {
        const candidate = deleteConfirmation.candidate;
        if (!candidate) return;

        setIsDeleting(true);
        const manatalId = candidate.manatalId;
        const localId = candidate.id;
        const isStoredLocally = localCandidates.some(c => c.id === localId);

        try {
            const syncTasks: Promise<any>[] = [];

            if (manatalId) {
                syncTasks.push(manatalService.deleteCandidate(manatalId));
            }

            if (isStoredLocally && localId) {
                syncTasks.push(candidateService.deleteCandidates([localId]));
            }


            const results = await Promise.allSettled(syncTasks);

            const dbTaskIdx = manatalId ? 1 : 0;
            const dbResult = results[dbTaskIdx];

            if (dbResult && dbResult.status === 'rejected') {
                throw new Error(`Database synchronization failed: ${dbResult.reason?.message || 'Unknown Error'}`);
            }

            setLocalCandidates(prev => prev.filter(c => c.id !== localId));
            setDisplayedCandidates(prev => prev.filter(c => c.id !== localId));

            setDeleteConfirmation({ show: false, candidate: null });
            if (editingId === manatalId || editingId === localId) handleCloseModal();

            activityLogService.logAction(`Successfully deleted/archived candidate: ${candidate.name}`);

        } catch (error: any) {
            console.error("Critical Deletion Error:", error);
            alert(`Could not delete candidate. ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen items-center w-full bg-white dark:bg-background-dark font-sans text-neutral-medium">
            <header className="w-full flex items-center justify-between px-8 py-4 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl sticky top-0 z-40 border-b border-border-light dark:border-border-dark shadow-sm transition-all">
                <div className="flex items-center gap-3">
                    <img src="https://media.licdn.com/dms/image/v2/D4D0BAQEOfFvQZ5wlhw/company-logo_200_200/company-logo_200_200/0/1698861766133/workoast_logo?e=2147483647&v=beta&t=7VZcCV5p6RHzOvBROOi3P5nIDBcSEql14HswDk4fDLQ" alt="Logo" className="size-8 rounded-btn" />
                    <h2 className="text-lg font-bold text-neutral-darkest dark:text-white hidden sm:block font-display">WorkoastPartner</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleLogout} className="size-9 rounded-btn bg-gray-100 dark:bg-neutral-darkest flex items-center justify-center text-neutral-medium hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-800 transition-colors" title="Sair"><span className="material-symbols-outlined text-lg">logout</span></button>
                    <div className="bg-center bg-no-repeat bg-cover rounded-btn size-9 border border-border-light dark:border-border-dark" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCfFoALXyw9J7U0AFz2SETv0LtQxkz_BjA11Ys7vOh1Cw40kJluEIvDBRJd1CjvY4OiIVn79ih07Lk9h0S7iRVOgaEX6bJU-Xp3UkEb1HZ7E2jIWkqAbEunEZZ_LC9Chxsiyn77nsTWmGlnMj_yJdmqKU6NETuFM2g9MipjkMj5bTTgyup21ZOn8BUDrztRGLygkiNseTx7To-FtkUnKzVqfEMkkMC50r6xcKK1PuwnODWc_xOqyv1qd6zdyb049xVuqtOD_6UEeHd-")' }}></div>
                </div>
            </header>

            <main className="w-full max-w-7xl flex-1 flex flex-col px-6 md:px-8 py-12">
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 font-display">Candidate Feed</h1>
                        <p className="text-gray-500 dark:text-text-secondary-dark text-lg font-light">Review and connect with top talent.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <div className="flex bg-gray-100 dark:bg-surface-highlight p-1 rounded-btn border border-gray-200">
                                <button onClick={() => { setSearchMode('CANDIDATE'); setDisplayedCandidates([]); setSearchQuery(''); }} className={`px-4 py-2 rounded-btn text-sm font-semibold transition-all ${searchMode === 'CANDIDATE' ? 'bg-white dark:bg-gray-700 shadow-sm text-neutral-darkest dark:text-white' : 'text-neutral-medium'}`}>Candidate</button>
                                <button onClick={() => { setSearchMode('JOB'); setDisplayedCandidates([]); setJobUrl(''); }} className={`px-4 py-2 rounded-btn text-sm font-semibold transition-all ${searchMode === 'JOB' ? 'bg-white dark:bg-gray-700 shadow-sm text-neutral-darkest dark:text-white' : 'text-neutral-medium'}`}>Job</button>
                            </div>
                        )}
                        <button onClick={handleBatchSearchContacts} disabled={isBatchProcessing || displayedCandidates.length === 0} className="size-10 rounded-btn bg-white dark:bg-surface-dark text-neutral-medium dark:text-white flex items-center justify-center border border-border-light dark:border-border-dark disabled:opacity-50 hover:border-primary hover:text-primary transition-colors"><span className="material-symbols-outlined text-xl">person_search</span></button>
                        <button onClick={handleOpenCreate} className="size-10 rounded-btn bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors"><span className="material-symbols-outlined text-xl">add</span></button>
                    </div>
                </div>

                <div className="relative w-full max-w-2xl mb-10">
                    {searchMode === 'CANDIDATE' ? (
                        <>
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className={`material-symbols-outlined text-2xl ${searchQuery.length >= 3 ? 'text-primary' : 'text-gray-400'}`}>search</span></div>
                            <input type="text" placeholder="Search Manatal Database..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-12 py-4 rounded-input bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none shadow-sm transition-all" />
                            {isSearching && <div className="absolute inset-y-0 right-12 flex items-center"><div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>}
                        </>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="material-symbols-outlined text-2xl text-primary">work</span></div>
                                <input type="text" placeholder="Paste Manatal Job URL..." value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} onBlur={handleJobUrlBlur} className="w-full pl-12 pr-12 py-4 rounded-input bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none shadow-sm transition-all" />
                                {isFetchingJob && <div className="absolute inset-y-0 right-4 flex items-center"><div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>}
                            </div>
                            {jobError && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{jobError}</div>}
                            {fetchedJob && (
                                <div className="animate-fade-in p-4 rounded-card bg-gray-50 dark:bg-surface-highlight/30 border border-gray-200 dark:border-border-dark flex items-center gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{fetchedJob.title || 'Untitled Job'}</h4>
                                        <p className="text-xs text-gray-500">{fetchedJob.organization_name} • {pipelineStages.length} Columns</p>
                                    </div>
                                    <select value={selectedStage} onChange={handleStageSelect} className="px-4 py-2 rounded-btn bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary"><option value="" disabled>Select Job Stage</option>{pipelineStages.map(stage => (<option key={stage.id} value={stage.id}>{stage.name}</option>))}</select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-6">
                    {loading || isFetchingCandidates ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
                    ) : displayedCandidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 rounded-card border border-dashed border-gray-200 dark:border-border-dark text-center bg-surface-card dark:bg-surface-dark animate-fade-in-down"><div className={`size-20 rounded-btn flex items-center justify-center mb-6 bg-gray-100 dark:bg-surface-highlight text-gray-400`}><span className="material-symbols-outlined text-5xl">person_off</span></div><h3 className="text-2xl font-bold text-neutral-darkest dark:text-white mb-2">No candidates found</h3><p className="text-neutral-medium dark:text-gray-400 max-w-md">Try adjusting your filters or search terms.</p></div>
                    ) : (
                        <>
                            {displayedCandidates.map((candidate) => {
                                const isPureExternal = !localCandidates.find(c => c.manatalId === candidate.manatalId || c.id === candidate.id);
                                const isOwner = candidate.createdBy === currentUserId;
                                const canEdit = isAdmin || isOwner;
                                return (
                                    <div key={candidate.id} className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-card p-6 shadow-sm hover:shadow-xl transition-all duration-300 border animate-fade-in-down ${isPureExternal ? 'bg-blue-50/50 dark:bg-blue-900/5 border-blue-200' : 'bg-surface-card dark:bg-surface-dark border-transparent shadow-none hover:shadow-sm'}`}>
                                        <div className="flex items-center gap-6 w-full">
                                            <div className="relative shrink-0"><div className="bg-center bg-no-repeat bg-cover rounded-full size-20 ring-4 ring-gray-50" style={{ backgroundImage: `url("${candidate.avatarUrl}")` }}></div></div>
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex flex-wrap items-start justify-between gap-2 w-full">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">{candidate.name}{isPureExternal ? (<span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold uppercase tracking-wider">Manatal</span>) : (<span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold uppercase tracking-wider">Platform</span>)}</h3>
                                                        <p className="text-gray-500 dark:text-text-secondary-dark font-medium">{candidate.role} • {candidate.location}</p>
                                                    </div>
                                                    {candidate.createdByName && (
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100"><div className="size-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold">{candidate.createdByName.charAt(0).toUpperCase()}</div><div className="flex flex-col"><span className="text-[9px] uppercase tracking-wider font-bold text-orange-400 leading-none">Registered By</span><span className="text-xs font-bold text-orange-800 leading-tight">{candidate.createdByName}</span></div></div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <button onClick={(e) => { e.stopPropagation(); handlePinToggle(candidate); }} className={`size-8 rounded-btn flex items-center justify-center transition-all ${candidate.isPinned ? 'bg-primary text-white' : 'bg-gray-100 text-neutral-medium hover:bg-gray-200'}`} title="Pin Candidate"><span className={`material-symbols-outlined text-base ${candidate.isPinned ? 'rotate-45' : ''}`}>{candidate.isPinned ? 'push_pin' : 'keep'}</span></button>
                                                    {(canEdit || (isAdmin && candidate.manatalId)) && (<button onClick={() => handleOpenView(candidate)} className="size-8 rounded-btn bg-gray-100 flex items-center justify-center text-neutral-medium hover:bg-gray-200 hover:text-primary transition-colors" title="View Details"><span className="material-symbols-outlined text-base">visibility</span></button>)}
                                                    {canEdit && (<button onClick={(e) => promptDeleteCandidate(candidate, e)} className="size-8 rounded-btn bg-gray-100 flex items-center justify-center text-neutral-medium hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete Candidate"><span className="material-symbols-outlined text-base">delete</span></button>)}
                                                    <div className="w-px h-5 bg-gray-200 mx-1"></div>
                                                    <div className={`size-8 rounded-btn flex items-center justify-center ${candidate.email ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`} title="Email"><span className="material-symbols-outlined text-base">{candidate.email ? 'mail' : 'mail_off'}</span></div>
                                                    <div className={`size-8 rounded-btn flex items-center justify-center ${candidate.phone ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`} title="Phone"><span className="material-symbols-outlined text-base">{candidate.phone ? 'call' : 'phone_disabled'}</span></div>
                                                    {candidate.linkedinUrl && (<a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="size-8 rounded-btn bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors" title="LinkedIn"><svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </>
                    )}
                </div>
            </main>


            {
                deleteConfirmation.show && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-surface-light dark:bg-surface-dark rounded-card p-8 shadow-2xl w-full max-w-md border border-border-light dark:border-border-dark animate-scale-in text-center">
                            <div className="mx-auto size-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                                <span className="material-symbols-outlined text-3xl">warning</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Candidate?</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Are you sure you want to delete <strong>{deleteConfirmation.candidate?.name}</strong>?
                                <br /><span className="text-xs opacity-75">This action will remove them from the database and archive them in Manatal.</span>
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setDeleteConfirmation({ show: false, candidate: null })}
                                    disabled={isDeleting}
                                    className="px-6 py-2.5 rounded-btn font-semibold bg-gray-100 dark:bg-surface-highlight text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-black/40 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeDeleteCandidate}
                                    disabled={isDeleting}
                                    className="px-6 py-2.5 rounded-btn font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
                                >
                                    {isDeleting && <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {
                duplicateModal.show && duplicateModal.result && (
                    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-surface-light dark:bg-surface-dark rounded-card p-8 shadow-2xl w-full max-w-lg border border-border-light dark:border-border-dark animate-scale-in">
                            <div className="text-center mb-6">
                                <div className="mx-auto size-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                                    <span className="material-symbols-outlined text-3xl">person_alert</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Candidate Already Registered</h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    A candidate with the same <strong className="text-amber-600">{duplicateModal.result.matchedByLabel}</strong> already exists in Manatal.
                                </p>
                            </div>


                            <div className="bg-gray-50 dark:bg-black/20 rounded-input p-4 mb-6 border border-gray-200 dark:border-border-dark">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="size-14 rounded-full bg-center bg-cover bg-no-repeat ring-2 ring-amber-200 dark:ring-amber-900/50"
                                        style={{ backgroundImage: `url("${duplicateModal.result.existingCandidate?.avatarUrl}")` }}
                                    ></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                                            {duplicateModal.result.existingCandidate?.name}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            {duplicateModal.result.existingCandidate?.role}
                                            {duplicateModal.result.existingCandidate?.currentCompany &&
                                                ` • ${duplicateModal.result.existingCandidate.currentCompany}`}
                                        </p>
                                        {duplicateModal.result.existingCandidate?.email && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                <span className="material-symbols-outlined text-sm align-middle mr-1">mail</span>
                                                {duplicateModal.result.existingCandidate.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                                Please check the entered data or edit the existing candidate.
                            </p>

                            <div className="flex justify-center">
                                <button
                                    onClick={() => setDuplicateModal({ show: false, result: null })}
                                    className="px-8 py-3 rounded-btn font-bold bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg"
                                >
                                    Understood
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                        <div className="bg-surface-light dark:bg-surface-dark rounded-card p-6 md:p-8 shadow-2xl w-full max-w-2xl border animate-scale-in my-8">
                            <div className="flex items-center justify-between mb-6 border-b pb-4">
                                <div><h3 className="text-xl font-bold text-gray-900 dark:text-white font-display">{modalMode === 'CREATE' ? 'Register New Candidate' : modalMode === 'EDIT' ? 'Edit Candidate' : 'Candidate Profile'}</h3></div>
                                <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            {loadingDetails ? (<div className="flex flex-col items-center justify-center py-20"><div className="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div><p className="text-gray-500">Syncing Manatal details...</p></div>) : (
                                <form onSubmit={handleRegisterSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-primary">person</span>
                                            Personal Information
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Full Name *</label>
                                                <input required disabled={modalMode === 'VIEW'} type="text" value={regForm.full_name} onChange={e => setRegForm({ ...regForm, full_name: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all font-semibold text-lg disabled:opacity-60" placeholder="Jane Doe" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Email</label>
                                                <input disabled={modalMode === 'VIEW'} type="email" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60" placeholder="jane@example.com" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Phone</label>
                                                <input disabled={modalMode === 'VIEW'} type="tel" value={regForm.phone_number} onChange={e => setRegForm({ ...regForm, phone_number: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60" placeholder="+55 11 99999-9999" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">LinkedIn URL</label>
                                                <div className="flex gap-2">
                                                    <input disabled={modalMode === 'VIEW'} type="url" value={regForm.linkedin_url} onChange={e => setRegForm({ ...regForm, linkedin_url: e.target.value })} className="flex-1 px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60" placeholder="https://linkedin.com/in/username" />
                                                    {modalMode !== 'VIEW' && (
                                                        <button type="button" onClick={handleRocketReachLookup} disabled={isRocketReaching || !regForm.linkedin_url} className="px-4 py-3 rounded-input bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold flex items-center gap-2 hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20">
                                                            {isRocketReaching ? (
                                                                <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Searching...</>
                                                            ) : (
                                                                <><span className="material-symbols-outlined text-lg">auto_fix_high</span>Enrich</>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                {rrFeedback.type !== 'idle' && (
                                                    <div className={`mt-2 p-2 rounded-lg text-sm ${rrFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : rrFeedback.type === 'warning' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                                                        {rrFeedback.message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Information */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-primary">work</span>
                                            Professional Information
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Current Position</label>
                                                <input disabled={modalMode === 'VIEW'} type="text" value={regForm.current_position} onChange={e => setRegForm({ ...regForm, current_position: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60" placeholder="Software Engineer" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Current Company</label>
                                                <input disabled={modalMode === 'VIEW'} type="text" value={regForm.current_company} onChange={e => setRegForm({ ...regForm, current_company: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60" placeholder="Company Name" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-primary">location_on</span>
                                            Location
                                        </h4>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">City, Country</label>
                                            <input disabled={modalMode === 'VIEW'} type="text" value={regForm.location} onChange={e => setRegForm({ ...regForm, location: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60" placeholder="São Paulo, Brazil" />
                                        </div>
                                    </div>

                                    {/* Education */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-primary">school</span>
                                            Education
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">University</label>
                                                <input disabled={modalMode === 'VIEW'} type="text" value={regForm.university} onChange={e => setRegForm({ ...regForm, university: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60" placeholder="University Name" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Diploma / Degree</label>
                                                <input disabled={modalMode === 'VIEW'} type="text" value={regForm.diploma} onChange={e => setRegForm({ ...regForm, diploma: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60" placeholder="Bachelor's in Computer Science" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Source & Reference */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-primary">source</span>
                                            Source & Reference
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Source</label>
                                                <input disabled={modalMode === 'VIEW'} type="text" value={regForm.source} onChange={e => setRegForm({ ...regForm, source: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60" placeholder="LinkedIn, Referral, etc." />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Reference ID</label>
                                                <div className="relative">
                                                    <input disabled type="text" value={regForm.reference || (editingId ? `Manatal ID: ${editingId}` : 'Auto-generated after save')} className="w-full px-4 py-3 rounded-input bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-border-dark outline-none text-gray-500 cursor-not-allowed" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">lock</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">Synced automatically from Manatal</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Job Linking */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-primary">link</span>
                                            Link to Job (Optional)
                                        </h4>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Select a Job from Manatal</label>
                                            <select disabled={modalMode === 'VIEW'} value={regForm.selected_job_id} onChange={e => setRegForm({ ...regForm, selected_job_id: e.target.value })} className="w-full px-4 py-3 rounded-input bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark outline-none transition-all disabled:opacity-60 cursor-pointer">
                                                <option value="">-- No job selected --</option>
                                                {availableJobs.map((job: any) => (
                                                    <option key={job.id} value={job.id}>{job.position_name} {job.organization_name ? `• ${job.organization_name}` : ''}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-400 mt-1">Link this candidate to an open position in Manatal</p>
                                        </div>
                                    </div>

                                    {detailsError && <div className="p-3 rounded-lg bg-yellow-50 text-yellow-700 text-sm">{detailsError}</div>}

                                    <div className="flex justify-end gap-3 pt-4 border-t mt-2 sticky bottom-0 bg-surface-light dark:bg-surface-dark pb-2">
                                        {modalMode === 'VIEW' ? (
                                            <button type="button" onClick={handleSwitchToEdit} className="px-6 py-3 rounded-btn bg-primary hover:bg-primary-hover text-white font-bold transition-all flex items-center gap-2">
                                                <span className="material-symbols-outlined text-lg">edit</span>Edit Candidate
                                            </button>
                                        ) : (
                                            <>
                                                <button type="button" onClick={handleCloseModal} className="px-6 py-3 rounded-btn text-gray-600 font-bold hover:bg-gray-100 transition-all">Cancel</button>
                                                <button
                                                    type="submit"
                                                    disabled={registering || isCheckingDuplicate}
                                                    className="px-6 py-3 rounded-btn bg-primary hover:bg-primary-hover text-white font-bold transition-all disabled:opacity-70 flex items-center gap-2"
                                                >
                                                    {(registering || isCheckingDuplicate) && <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                                    {isCheckingDuplicate ? 'Verificando...' : registering ? 'Salvando...' : modalMode === 'CREATE' ? 'Registrar Candidato' : 'Salvar Alterações'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )
            }
            {isAdmin && (<div className="fixed bottom-6 right-6 z-50"><button onClick={() => onNavigate('ADMIN')} className="flex items-center gap-2 px-5 py-3 rounded-btn bg-primary hover:bg-primary-hover text-white font-semibold shadow-sm transition-all"><span className="material-symbols-outlined text-lg">admin_panel_settings</span>Go to Admin</button></div>)}
        </div >
    );
};


export default PartnerPortal;
