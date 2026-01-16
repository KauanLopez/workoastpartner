import React, { useEffect, useState, useMemo } from 'react';
import { ViewMode, ActivityLog, CandidateStatus, Candidate } from '../types';
import { authService } from '../services/authService';
import { activityLogService } from '../services/activityLogService';
import { candidateService } from '../services/candidateService';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

interface Props {
    onNavigate: (view: ViewMode) => void;
}

// Sub-view Modes for Admin Dashboard
type AdminSection = 'DASHBOARD' | 'REPORTS';

// Matches the database table 'daily_metrics'
interface DailyMetric {
    date: string;
    total_candidates: number;
    new_candidates_today: number;
    candidates_by_status: Record<string, number>;
    active_partners_count: number;
    total_system_activities: number;
    enriched_profiles_count: number;
}

// Leaderboard Stats
interface PartnerStats {
    id: string;
    name: string; // Or email if name not avail
    totalCandidates: number;
    hiredCount: number;
    lastActive?: string;
}

const AdminDashboard: React.FC<Props> = ({ onNavigate }) => {
    const [activeSection, setActiveSection] = useState<AdminSection>('DASHBOARD');

    // Dashboard Data State
    const [metricsHistory, setMetricsHistory] = useState<DailyMetric[]>([]);
    const [currentMetrics, setCurrentMetrics] = useState<DailyMetric | null>(null);
    const [leaderboard, setLeaderboard] = useState<PartnerStats[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Logs State
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [logsError, setLogsError] = useState<string | null>(null);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const [currentUserEmail, setCurrentUserEmail] = useState('Admin User');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- INITIALIZATION & FETCHING ---

    useEffect(() => {
        authService.getCurrentSession().then(session => {
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

        // 1. Trigger Fresh Calculation via RPC
        if (supabase) {
            try {
                await supabase.rpc('calculate_daily_metrics');
            } catch (e) {
                console.error("RPC Calc failed (Table likely missing or permission error):", e);
            }

            // 2. Fetch Historical Data (Last 30 Days)
            try {
                const { data: historyData } = await supabase
                    .from('daily_metrics')
                    .select('*')
                    .order('date', { ascending: true })
                    .limit(30);

                if (historyData) {
                    setMetricsHistory(historyData);
                    // Set current metrics to the latest entry
                    if (historyData.length > 0) {
                        setCurrentMetrics(historyData[historyData.length - 1]);
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch daily_metrics history");
            }

            // 3. Fetch Candidates for Leaderboard (Lightweight)
            // We do this client-side for flexibility, though a View would be better for scale.
            try {
                const { data: candidates } = await supabase
                    .from('candidates')
                    .select('id, created_by, status, candidate_owner');

                if (candidates) {
                    processLeaderboard(candidates);
                }
            } catch (e) { console.warn("Leaderboard fetch failed", e); }
        } else {
            // Mock Mode Fallback
            mockDashboardData();
        }

        setIsRefreshing(false);
    };

    const processLeaderboard = (candidates: any[]) => {
        const statsMap: Record<string, PartnerStats> = {};

        candidates.forEach(c => {
            const ownerId = c.created_by || 'unknown';
            // Use candidate_owner field as name fallback or ID
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

        // Sort by Total Candidates
        const sorted = Object.values(statsMap).sort((a, b) => b.totalCandidates - a.totalCandidates).slice(0, 5);
        setLeaderboard(sorted);
    };

    const mockDashboardData = () => {
        // Generate some fake history
        const days = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            days.push({
                date: d.toISOString().split('T')[0],
                total_candidates: 100 + (i * 2),
                new_candidates_today: Math.floor(Math.random() * 10),
                candidates_by_status: { 'Available': 80, 'Interviewing': 15, 'Hired': 5 },
                active_partners_count: Math.floor(Math.random() * 5) + 1,
                total_system_activities: Math.floor(Math.random() * 50),
                enriched_profiles_count: 50 + i
            });
        }
        setMetricsHistory(days);
        setCurrentMetrics(days[days.length - 1]);

        setLeaderboard([
            { id: '1', name: 'Acme Recruiting', totalCandidates: 45, hiredCount: 12 },
            { id: '2', name: 'Global Talent', totalCandidates: 32, hiredCount: 8 },
            { id: '3', name: 'HR Solutions', totalCandidates: 28, hiredCount: 4 },
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

    // --- CHART PREPARATION ---
    const pipelineData = useMemo(() => {
        if (!currentMetrics?.candidates_by_status) return [];
        // Convert {"Available": 10} to [{name: "Available", value: 10}]
        return Object.entries(currentMetrics.candidates_by_status).map(([name, value]) => ({
            name, value: Number(value)
        })).filter(i => i.value > 0);
    }, [currentMetrics]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark overflow-hidden font-sans">

            {/* MOBILE MENU OVERLAY */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    ></div>
                    <div className="relative flex flex-col w-72 h-full bg-surface-light dark:bg-surface-dark shadow-2xl animate-fade-in p-6 border-r border-border-light dark:border-border-dark">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <img
                                    src="https://media.licdn.com/dms/image/v2/D4D0BAQEOfFvQZ5wlhw/company-logo_200_200/company-logo_200_200/0/1698861766133/workoast_logo?e=2147483647&v=beta&t=7VZcCV5p6RHzOvBROOi3P5nIDBcSEql14HswDk4fDLQ"
                                    alt="Logo"
                                    className="size-8 rounded-btn"
                                />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display">Menu</h2>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-surface-highlight text-gray-500"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        {/* Mobile Nav Links */}
                        <nav className="flex-1 space-y-1">
                            <button
                                onClick={() => { setActiveSection('DASHBOARD'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-btn transition-all duration-200 font-semibold ${activeSection === 'DASHBOARD' ? 'bg-primary text-white' : 'text-neutral-medium hover:bg-gray-100 dark:hover:bg-surface-highlight'}`}
                            >
                                <span className="material-symbols-outlined text-lg">dashboard</span>
                                <span>Dashboard</span>
                            </button>
                            <button
                                onClick={() => { onNavigate('PARTNER'); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-btn transition-all duration-200 text-neutral-medium hover:bg-gray-100 dark:hover:bg-surface-highlight font-semibold"
                            >
                                <span className="material-symbols-outlined text-lg">group</span>
                                <span>Candidates</span>
                            </button>
                            <button
                                onClick={() => { setActiveSection('REPORTS'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-btn transition-all duration-200 font-semibold ${activeSection === 'REPORTS' ? 'bg-primary text-white' : 'text-neutral-medium hover:bg-gray-100 dark:hover:bg-surface-highlight'}`}
                            >
                                <span className="material-symbols-outlined text-lg">bar_chart</span>
                                <span>Reports</span>
                            </button>
                        </nav>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="w-72 hidden md:flex flex-col bg-white dark:bg-surface-dark border-r border-border-light dark:border-border-dark p-6 z-10">
                <div className="flex items-center gap-3 mb-10 pl-2">
                    <img
                        src="https://media.licdn.com/dms/image/v2/D4D0BAQEOfFvQZ5wlhw/company-logo_200_200/company-logo_200_200/0/1698861766133/workoast_logo?e=2147483647&v=beta&t=7VZcCV5p6RHzOvBROOi3P5nIDBcSEql14HswDk4fDLQ"
                        alt="WorkoastPartner Logo"
                        className="size-8 rounded-lg"
                    />
                    <h1 className="text-lg font-bold tracking-tight text-neutral-darkest dark:text-white">WorkoastPartner</h1>
                </div>

                <nav className="flex-1 space-y-1">
                    <button
                        onClick={() => { setActiveSection('DASHBOARD'); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-btn transition-all duration-200 font-semibold ${activeSection === 'DASHBOARD' ? 'bg-primary text-white' : 'text-neutral-medium hover:bg-gray-100 dark:hover:bg-surface-highlight'}`}
                    >
                        <span className="material-symbols-outlined text-lg">dashboard</span>
                        <span>Dashboard</span>
                    </button>

                    <button
                        onClick={() => onNavigate('PARTNER')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-btn transition-all duration-200 text-neutral-medium hover:bg-gray-100 dark:hover:bg-surface-highlight font-semibold"
                    >
                        <span className="material-symbols-outlined text-lg">group</span>
                        <span>Candidates</span>
                    </button>

                    <button
                        onClick={() => { setActiveSection('REPORTS'); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-btn transition-all duration-200 font-semibold ${activeSection === 'REPORTS' ? 'bg-primary text-white' : 'text-neutral-medium hover:bg-gray-100 dark:hover:bg-surface-highlight'}`}
                    >
                        <span className="material-symbols-outlined text-lg">bar_chart</span>
                        <span>Reports</span>
                    </button>
                </nav>

                <div className="mt-auto pt-6 border-t border-border-light dark:border-border-dark">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-btn text-neutral-medium hover:bg-gray-100 dark:hover:bg-surface-highlight hover:text-red-500 transition-colors cursor-pointer mb-4">
                        <span className="material-symbols-outlined text-lg">logout</span>
                        <span className="font-semibold">Logout</span>
                    </button>
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-card dark:bg-surface-highlight rounded-card">
                        <div className="size-9 rounded-btn bg-primary flex items-center justify-center text-white font-bold text-sm">A</div>
                        <div className="flex flex-col overflow-hidden">
                            <p className="text-sm font-bold text-neutral-darkest dark:text-white">Admin</p>
                            <p className="text-xs text-neutral-medium dark:text-gray-400 truncate max-w-[140px]" title={currentUserEmail}>{currentUserEmail}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
                <div className="max-w-7xl mx-auto h-full">

                    {/* Mobile Toggle */}
                    <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-border-light dark:border-border-dark">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-surface-highlight text-gray-800 dark:text-white">
                            <span className="material-symbols-outlined text-3xl">menu</span>
                        </button>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display">WorkoastPartner</h2>
                    </div>

                    <header className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white font-display">
                                {activeSection === 'REPORTS' ? 'Activity Reports' : 'Executive Dashboard'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                {activeSection === 'DASHBOARD' ? 'Real-time platform insights and performance metrics.' : 'Audit logs and system activity.'}
                            </p>
                        </div>
                        {activeSection === 'DASHBOARD' && (
                            <button
                                onClick={fetchDashboardData}
                                disabled={isRefreshing}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-btn hover:bg-gray-50 dark:hover:bg-surface-highlight text-neutral-medium dark:text-gray-200 font-semibold transition-all"
                            >
                                <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
                                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                            </button>
                        )}
                    </header>

                    {/* === DASHBOARD VIEW === */}
                    {activeSection === 'DASHBOARD' && (
                        <div className="space-y-8 animate-fade-in">

                            {/* 1. KPI CARDS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Total Candidates */}
                                <div className="p-6 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400">
                                            <span className="material-symbols-outlined">group</span>
                                        </div>
                                        <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                            +{currentMetrics?.new_candidates_today || 0} Today
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Candidates</p>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white font-display mt-1">
                                        {currentMetrics?.total_candidates || 0}
                                    </h3>
                                </div>

                                {/* Hired Candidates */}
                                <div className="p-6 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400">
                                            <span className="material-symbols-outlined">handshake</span>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Hired Candidates</p>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white font-display mt-1">
                                        {currentMetrics?.candidates_by_status?.['Hired'] || 0}
                                    </h3>
                                </div>

                                {/* Active Partners */}
                                <div className="p-6 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400">
                                            <span className="material-symbols-outlined">business_center</span>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Active Partners (Today)</p>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white font-display mt-1">
                                        {currentMetrics?.active_partners_count || 0}
                                    </h3>
                                </div>

                                {/* Enrichment Rate */}
                                <div className="p-6 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-900/10 text-teal-600 dark:text-teal-400">
                                            <span className="material-symbols-outlined">contact_phone</span>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Enrichment Rate</p>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white font-display mt-1">
                                        {currentMetrics && currentMetrics.total_candidates > 0
                                            ? Math.round((currentMetrics.enriched_profiles_count / currentMetrics.total_candidates) * 100)
                                            : 0}%
                                    </h3>
                                </div>
                            </div>

                            {/* 2. CHARTS */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Growth Chart */}
                                <div className="lg:col-span-2 p-6 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Growth Trends (Last 30 Days)</h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={metricsHistory}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                                    labelStyle={{ color: '#9CA3AF' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="new_candidates_today"
                                                    name="New Candidates"
                                                    stroke="#3B82F6"
                                                    strokeWidth={3}
                                                    dot={{ r: 4, strokeWidth: 2 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Pipeline Health */}
                                <div className="p-6 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Pipeline Health</h4>
                                    <div className="h-[300px] w-full relative">
                                        {pipelineData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pipelineData}
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {pipelineData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: 'none' }} itemStyle={{ color: '#fff' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                                No data available
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{currentMetrics?.total_candidates || 0}</span>
                                            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                                        {pipelineData.map((entry, index) => (
                                            <div key={entry.name} className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                                {entry.name}: {entry.value}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 3. LEADERBOARD TABLE */}
                            <div className="rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Top Partners Leaderboard</h4>
                                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-surface-highlight rounded text-gray-500">
                                        Based on contribution
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-black/20 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                                                <th className="px-6 py-4 font-bold">Partner Name</th>
                                                <th className="px-6 py-4 font-bold text-center">Candidates Added</th>
                                                <th className="px-6 py-4 font-bold text-center">Hired Count</th>
                                                <th className="px-6 py-4 font-bold text-right">Conversion Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-border-dark">
                                            {leaderboard.length === 0 ? (
                                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No partner activity recorded yet.</td></tr>
                                            ) : (
                                                leaderboard.map((partner, idx) => (
                                                    <tr key={partner.id} className="hover:bg-gray-50/50 dark:hover:bg-surface-highlight/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                                            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                                idx === 1 ? 'bg-gray-200 text-gray-600' :
                                                                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                                        'bg-blue-50 text-blue-600'
                                                                }`}>
                                                                {idx + 1}
                                                            </div>
                                                            {partner.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-bold">{partner.totalCandidates}</td>
                                                        <td className="px-6 py-4 text-center text-green-600 font-bold">{partner.hiredCount}</td>
                                                        <td className="px-6 py-4 text-right text-gray-500">
                                                            {partner.totalCandidates > 0
                                                                ? Math.round((partner.hiredCount / partner.totalCandidates) * 100) + '%'
                                                                : '0%'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === REPORTS VIEW (Previous Implementation) === */}
                    {activeSection === 'REPORTS' && (
                        <section className="animate-fade-in">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">User Activity Logs</h3>
                                <button onClick={fetchLogs} className="p-2 rounded-btn hover:bg-gray-100 dark:hover:bg-surface-highlight text-neutral-medium" title="Refresh Logs">
                                    <span className="material-symbols-outlined">refresh</span>
                                </button>
                            </div>

                            {logsError ? (
                                <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-card border border-red-100 dark:border-red-900/30 text-center">
                                    <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">Error Loading Logs</h3>
                                    <p className="text-red-600 dark:text-red-400 mb-4">{logsError}</p>
                                </div>
                            ) : (
                                <div className="bg-surface-light dark:bg-surface-dark rounded-card shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
                                    {loadingLogs ? (
                                        <div className="flex justify-center p-12">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                        </div>
                                    ) : logs.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <p>No activity recorded yet.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-surface-highlight/30 border-b border-gray-200 dark:border-border-dark">
                                                        <th className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">User name</th>
                                                        <th className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">Access type</th>
                                                        <th className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">Action performed</th>
                                                        <th className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-border-dark">
                                                    {logs.map(log => {
                                                        const date = new Date(log.created_at);
                                                        return (
                                                            <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-surface-highlight/50 transition-colors">
                                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                                            {log.user_name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        {log.user_name}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${log.user_role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/10 dark:text-purple-300 dark:border-purple-900/30' : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/10 dark:text-blue-300 dark:border-blue-900/30'}`}>
                                                                        {log.user_role}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{log.action_description}</td>
                                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{date.toLocaleString()}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;