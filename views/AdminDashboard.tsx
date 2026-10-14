import React, { useEffect, useState, useMemo } from 'react';
import { ViewMode, ActivityLog, CandidateStatus } from '../types';
import { authService } from '../services/authService';
import { activityLogService } from '../services/activityLogService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import {
  Logo,
  Button,
  IconButton,
  Card,
  CardHeader,
  Badge,
  Avatar,
  Tabs,
  Sidebar,
  PageHeader,
  Icon
} from '../components/ui';

interface Props {
  onNavigate: (view: ViewMode) => void;
}

type AdminSection = 'DASHBOARD' | 'REPORTS';

interface DailyMetric {
  date: string;
  total_candidates: number;
  new_candidates_today: number;
  candidates_by_status: Record<string, number>;
  active_partners_count: number;
  total_system_activities: number;
  enriched_profiles_count: number;
}

interface PartnerStats {
  id: string;
  name: string;
  totalCandidates: number;
  hiredCount: number;
  lastActive?: string;
}

const PALETTE = ['#75FA00', '#2F6BFF', '#FFB224', '#0E0E0D', '#F0412F'];

const AdminDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('DASHBOARD');
  const [metricsHistory, setMetricsHistory] = useState<DailyMetric[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<DailyMetric | null>(null);
  const [leaderboard, setLeaderboard] = useState<PartnerStats[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [currentUserEmail, setCurrentUserEmail] = useState('admin@workoast.com');

  useEffect(() => {
    authService.getCurrentSession().then((session) => {
      if (session?.user?.email) setCurrentUserEmail(session.user.email);
    });

    if (activeSection === 'DASHBOARD') {
      fetchDashboardData();
    } else {
      fetchLogs();
    }
  }, [activeSection]);

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    const supabase = authService.supabase;

    if (supabase) {
      try {
        await supabase.rpc('calculate_daily_metrics');
      } catch (e) {
        console.warn('RPC Calc failed:', e);
      }

      try {
        const { data: historyData } = await supabase
          .from('daily_metrics')
          .select('*')
          .order('date', { ascending: true })
          .limit(30);

        if (historyData && historyData.length > 0) {
          setMetricsHistory(historyData);
          setCurrentMetrics(historyData[historyData.length - 1]);
        } else {
          mockDashboardData();
        }
      } catch (e) {
        console.warn('Failed to fetch daily_metrics history');
        mockDashboardData();
      }

      try {
        const { data: candidates } = await supabase
          .from('candidates')
          .select('id, created_by, status, candidate_owner');

        if (candidates) {
          processLeaderboard(candidates);
        }
      } catch (e) {
        console.warn('Leaderboard fetch failed', e);
      }
    } else {
      mockDashboardData();
    }

    setIsRefreshing(false);
  };

  const processLeaderboard = (candidates: any[]) => {
    const statsMap: Record<string, PartnerStats> = {};

    candidates.forEach((c) => {
      const ownerId = c.created_by || 'unknown';
      const ownerName = c.candidate_owner || 'Partner ' + ownerId.slice(0, 4);

      if (!statsMap[ownerId]) {
        statsMap[ownerId] = {
          id: ownerId,
          name: ownerName,
          totalCandidates: 0,
          hiredCount: 0
        };
      }

      statsMap[ownerId].totalCandidates++;
      if (c.status === CandidateStatus.HIRED) {
        statsMap[ownerId].hiredCount++;
      }
    });

    const sorted = Object.values(statsMap)
      .sort((a, b) => b.totalCandidates - a.totalCandidates)
      .slice(0, 6);
    setLeaderboard(sorted);
  };

  const mockDashboardData = () => {
    const days: DailyMetric[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      days.push({
        date: d.toISOString().split('T')[0],
        total_candidates: 120 + i * 3,
        new_candidates_today: Math.floor(Math.random() * 8) + 1,
        candidates_by_status: { Available: 95, Interviewing: 28, Hired: 12, Offer: 6 },
        active_partners_count: 5,
        total_system_activities: Math.floor(Math.random() * 40) + 10,
        enriched_profiles_count: 70 + i * 2
      });
    }
    setMetricsHistory(days);
    setCurrentMetrics(days[days.length - 1]);

    setLeaderboard([
      { id: '1', name: 'Andes Talent Partners', totalCandidates: 48, hiredCount: 14 },
      { id: '2', name: 'Medellín Tech Guild', totalCandidates: 36, hiredCount: 9 },
      { id: '3', name: 'Southern Cone Devs', totalCandidates: 28, hiredCount: 6 },
      { id: '4', name: 'Bogotá Dev Collective', totalCandidates: 19, hiredCount: 4 }
    ]);
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    setLogsError(null);
    const { data, error } = await activityLogService.getAllLogs();
    if (error) {
      setLogsError(error);
    } else {
      setLogs(data);
    }
    setLoadingLogs(false);
  };

  const handleLogout = async () => {
    await authService.signOut();
  };

  const pipelineData = useMemo(() => {
    if (!currentMetrics?.candidates_by_status) return [];
    return Object.entries(currentMetrics.candidates_by_status)
      .map(([name, value]) => ({
        name,
        value: Number(value)
      }))
      .filter((i) => i.value > 0);
  }, [currentMetrics]);

  const sidebarNavItems = [
    { value: 'DASHBOARD', label: 'Executive Dashboard', icon: 'layout-dashboard' },
    { value: 'CANDIDATES', label: 'Talent Pool Portal', icon: 'users' },
    { value: 'REPORTS', label: 'Activity & Audit Logs', icon: 'file-text' }
  ];

  const handleSidebarSelect = (val: string) => {
    if (val === 'CANDIDATES') {
      onNavigate('PARTNER');
      return;
    }
    if (val === 'refresh') {
      fetchDashboardData();
      return;
    }
    if (val === 'logout') {
      handleLogout();
      return;
    }
    setActiveSection(val as AdminSection);
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
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Workoast Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            variant="secondary"
            size="sm"
            iconLeft="users"
            onClick={() => onNavigate('PARTNER')}
          >
            Portal
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
                value={activeSection}
                onChange={(val) => {
                  setMobileMenuOpen(false);
                  handleSidebarSelect(val);
                }}
                items={sidebarNavItems}
                bottomItems={[
                  { value: 'refresh', label: 'Refresh data', icon: 'refresh-cw' },
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
                        Administrator
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

      {/* Desktop Sidebar Navigation */}
      <Sidebar
        className="desktop-sidebar"
        value={activeSection}
        onChange={handleSidebarSelect}
        header={<Logo variant="horizontal" tone="ink-green" height={22} />}
        items={sidebarNavItems}
        bottomItems={[
          { value: 'refresh', label: 'Refresh data', icon: 'refresh-cw' },
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
                Administrator
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
            eyebrow="Workoast Platform · Admin Intelligence"
            title={activeSection === 'DASHBOARD' ? 'Executive Dashboard' : 'Activity & Audit Reports'}
            description={
              activeSection === 'DASHBOARD'
                ? 'High-level metrics across partner pipelines, candidate velocity, and placement outcomes.'
                : 'Complete audit trail of system events, candidate creation, status mutations, and enrichment actions.'
            }
            actions={
              <>
                <Tabs
                  variant="segmented"
                  size="md"
                  items={[
                    { value: 'DASHBOARD', label: 'Overview' },
                    { value: 'REPORTS', label: 'Audit Logs' }
                  ]}
                  value={activeSection}
                  onChange={(v) => setActiveSection(v as AdminSection)}
                />
                <Button
                  variant="secondary"
                  size="md"
                  iconLeft="refresh-cw"
                  loading={isRefreshing}
                  onClick={fetchDashboardData}
                >
                  Sync
                </Button>
                <Button
                  variant="brand"
                  size="md"
                  iconLeft="users"
                  onClick={() => onNavigate('PARTNER')}
                >
                  Candidate portal
                </Button>
              </>
            }
          />

          {activeSection === 'DASHBOARD' ? (
            <>
              {/* Top 4 KPI Metrics */}
              <div className="stats-grid">
                <Card padding="md" style={{ display: 'grid', gap: 6 }}>
                  <span className="v-label" style={{ color: 'var(--text-tertiary)' }}>Total candidates</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 34,
                        fontWeight: 400,
                        color: 'var(--text-primary)'
                      }}
                    >
                      {currentMetrics?.total_candidates ?? 0}
                    </span>
                    <span className="v-caption">active</span>
                  </div>
                </Card>

                <Card padding="md" style={{ display: 'grid', gap: 6 }}>
                  <span className="v-label" style={{ color: 'var(--text-tertiary)' }}>Added today</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 34,
                        fontWeight: 400,
                        color: 'var(--text-primary)'
                      }}
                    >
                      +{currentMetrics?.new_candidates_today ?? 0}
                    </span>
                    <Badge tone="brand" size="sm">New</Badge>
                  </div>
                </Card>

                <Card padding="md" style={{ display: 'grid', gap: 6 }}>
                  <span className="v-label" style={{ color: 'var(--text-tertiary)' }}>Active partners</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 34,
                        fontWeight: 400,
                        color: 'var(--text-primary)'
                      }}
                    >
                      {currentMetrics?.active_partners_count ?? leaderboard.length}
                    </span>
                    <Badge tone="info" size="sm">Verified</Badge>
                  </div>
                </Card>

                <Card padding="md" style={{ display: 'grid', gap: 6 }}>
                  <span className="v-label" style={{ color: 'var(--text-tertiary)' }}>Enriched contacts</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 34,
                        fontWeight: 400,
                        color: 'var(--text-primary)'
                      }}
                    >
                      {currentMetrics?.enriched_profiles_count ?? 0}
                    </span>
                    <Badge tone="success" size="sm">Verified</Badge>
                  </div>
                </Card>
              </div>

              {/* Charts Section */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 20,
                  marginBottom: 24
                }}
              >
                {/* 30-day candidate growth */}
                <Card style={{ gridColumn: 'span 2' }}>
                  <CardHeader
                    eyebrow="Velocity trend"
                    title="Candidate pool growth (30 days)"
                    description="Daily progression of registered engineers across all partner organizations."
                  />
                  <div style={{ height: 260, width: '100%', marginTop: 12 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metricsHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                        <XAxis
                          dataKey="date"
                          stroke="var(--text-tertiary)"
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis
                          stroke="var(--text-tertiary)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface-raised)',
                            borderColor: 'var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-md)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total_candidates"
                          name="Total Talent"
                          stroke="#75FA00"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, fill: '#75FA00' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Pipeline breakdown pie */}
                <Card>
                  <CardHeader
                    eyebrow="Status distribution"
                    title="Active pipeline"
                    description="Current status breakdown across all candidates."
                  />
                  <div style={{ height: 200, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pipelineData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {pipelineData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface-raised)',
                            borderColor: 'var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                    {pipelineData.map((item, idx) => (
                      <div
                        key={item.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 13
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: PALETTE[idx % PALETTE.length]
                            }}
                          />
                          <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                        </span>
                        <span className="v-data" style={{ fontWeight: 600 }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Partner Leaderboard */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <h2 className="v-h3" style={{ margin: 0 }}>Partner agency leaderboard</h2>
                  <span className="v-caption">Top talent partners ranked by candidate contribution and placements</span>
                </div>

                <Card padding="none">
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 2fr) 140px 140px 120px',
                      gap: 16,
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    {['Partner agency', 'Candidates', 'Placements', 'Success rate'].map((h) => (
                      <span key={h} className="v-label" style={{ color: 'var(--text-tertiary)' }}>
                        {h}
                      </span>
                    ))}
                  </div>

                  {leaderboard.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                      No partner metrics recorded yet.
                    </div>
                  ) : (
                    leaderboard.map((partner, i) => {
                      const rate = partner.totalCandidates > 0
                        ? Math.round((partner.hiredCount / partner.totalCandidates) * 100)
                        : 0;

                      return (
                        <div
                          key={partner.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 2fr) 140px 140px 120px',
                            gap: 16,
                            alignItems: 'center',
                            padding: '14px 20px',
                            borderTop: i ? '1px solid var(--border-subtle)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar name={partner.name} size="sm" />
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {partner.name}
                            </span>
                          </div>

                          <span className="v-data" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {partner.totalCandidates} registered
                          </span>

                          <span>
                            <Badge tone="success" size="sm">
                              {partner.hiredCount} hired
                            </Badge>
                          </span>

                          <span className="v-data" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                            {rate}%
                          </span>
                        </div>
                      );
                    })
                  )}
                </Card>
              </div>
            </>
          ) : (
            /* Reports / Logs Section */
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <h2 className="v-h3" style={{ margin: 0 }}>System audit logs</h2>
                <span className="v-caption">Real-time log of security, talent mutations, and partner activity</span>
              </div>

              <Card padding="none">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '170px 160px minmax(0, 1fr)',
                    gap: 16,
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  {['Timestamp', 'User', 'Action description'].map((h) => (
                    <span key={h} className="v-label" style={{ color: 'var(--text-tertiary)' }}>
                      {h}
                    </span>
                  ))}
                </div>

                {loadingLogs ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                    <Icon name="loader-circle" size={24} style={{ animation: 'v-spin 0.9s linear infinite' }} />
                  </div>
                ) : logsError ? (
                  <div style={{ padding: '24px 20px', color: 'var(--status-danger-fg)', fontSize: 13 }}>
                    {logsError}
                  </div>
                ) : logs.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                    No audit records logged yet.
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={log.id || i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '170px 160px minmax(0, 1fr)',
                        gap: 16,
                        alignItems: 'center',
                        padding: '13px 20px',
                        borderTop: i ? '1px solid var(--border-subtle)' : 'none'
                      }}
                    >
                      <span className="v-data" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {new Date(log.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={log.user_name} size="xs" />
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {log.user_name}
                        </span>
                      </div>

                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {log.action_description}
                      </span>
                    </div>
                  ))
                )}
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;