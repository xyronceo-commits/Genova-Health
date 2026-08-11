import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, LogOut, Users, Activity, Brain, Radio, 
  ScanLine, AlertTriangle, CheckCircle2, Lock, ShieldAlert,
  Search, RefreshCw, BarChart3, Clock, AlertCircle, UserX, UserCheck
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

interface Props {
  adminToken: string;
  onLogout: () => void;
  isDarkMode: boolean;
}

interface StatsData {
  userOverview: {
    totalUsers: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    verifiedAccounts: number;
    unverifiedAccounts: number;
  };
  platformOverview: {
    activeUsers: number;
    usersTrackingHealth: number;
    usersOnboarded: number;
    aiInteractionsTotal: number;
    healthLogsRecorded: number;
    scannerUsageTotal: number;
    connectedDevicesTotal: number;
  };
  aiUsage: {
    totalRequests: number;
    requestsToday: number;
    requestsThisWeek: number;
    averageUsagePerUser: number;
    failedRequests: number;
    rateLimitedRequests: number;
  };
  featureUsage: {
    healthTracking: number;
    smartScan: number;
    aiAssistants: number;
    emergencyLocator: number;
    wearablesIntegration: number;
  };
  securitySummary: {
    failedLoginAttempts: number;
    rateLimitedEvents: number;
    activeAdminSessions: number;
  };
}

interface UserItem {
  id: string;
  displayName: string;
  emailMasked: string;
  createdAt: string;
  isVerified: boolean;
  status: 'active' | 'disabled';
}

interface SecurityLogItem {
  id: string;
  timestamp: string;
  type: string;
  ip: string;
  details: string;
}

export const AdminDashboard: React.FC<Props> = ({ adminToken, onLogout, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'ai' | 'security'>('overview');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [logs, setLogs] = useState<SecurityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Confirmation Modal for Disabling/Enabling Account
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; user: UserItem | null; targetStatus: 'active' | 'disabled' }>({
    isOpen: false,
    user: null,
    targetStatus: 'disabled'
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      const [statsRes, usersRes, logsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/security-logs', { headers })
      ]);

      if (!statsRes.ok || !usersRes.ok || !logsRes.ok) {
        if (statsRes.status === 401 || usersRes.status === 401 || logsRes.status === 401) {
          onLogout();
          return;
        }
        throw new Error('Failed to fetch admin data.');
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const logsData = await logsRes.json();

      setStats(statsData);
      setUsers(usersData.users || []);
      setLogs(logsData.logs || []);
    } catch (err) {
      setError('We couldn\'t load administrative metrics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [adminToken]);

  const handleToggleUserStatus = async () => {
    if (!confirmModal.user) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          userId: confirmModal.user.id,
          status: confirmModal.targetStatus
        })
      });

      if (!res.ok) {
        throw new Error('Action failed.');
      }

      // Update local state
      setUsers(prev => prev.map(u => u.id === confirmModal.user?.id ? { ...u, status: confirmModal.targetStatus } : u));
      setConfirmModal({ isOpen: false, user: null, targetStatus: 'disabled' });
      fetchData(); // refresh metrics
    } catch (err) {
      alert('We couldn\'t complete that action. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    } catch (err) {
      // ignore error on logout
    }
    onLogout();
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.emailMasked.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock sample charts data for growth analytics
  const growthData = [
    { name: 'Mon', signups: 12, active: 82, aiRequests: 210 },
    { name: 'Tue', signups: 18, active: 94, aiRequests: 280 },
    { name: 'Wed', signups: 15, active: 88, aiRequests: 260 },
    { name: 'Thu', signups: 22, active: 102, aiRequests: 340 },
    { name: 'Fri', signups: 28, active: 115, aiRequests: 410 },
    { name: 'Sat', signups: 20, active: 108, aiRequests: 310 },
    { name: 'Sun', signups: 27, active: 125, aiRequests: 430 },
  ];

  const featureChartData = stats ? [
    { name: 'Health Tracking', count: stats.featureUsage.healthTracking },
    { name: 'Smart Scan', count: stats.featureUsage.smartScan },
    { name: 'AI Assistants', count: stats.featureUsage.aiAssistants },
    { name: 'Emergency Locator', count: stats.featureUsage.emergencyLocator },
    { name: 'Wearables', count: stats.featureUsage.wearablesIntegration },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Admin Top Header */}
      <header className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">Genova Health</h1>
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
                Secure Admin
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
              Internal operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
            title="Refresh statistics"
            aria-label="Refresh statistics"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold text-xs rounded-xl transition-all flex items-center gap-2 active:scale-95"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Least Privilege Data Protection Info Banner */}
      <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 flex items-start gap-3">
        <Lock size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed font-medium">
          <strong className="font-bold">Least-Privilege Health Data Protection Active:</strong> Genova Health strictly protects individual health records. Blood group, genotype, weight, blood pressure logs, private medical notes, and AI conversations are anonymized and excluded from administrative views.
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-1 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Activity size={16} />
          <span>Platform Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Users size={16} />
          <span>User Management</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Brain size={16} />
          <span>AI & Feature Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <ShieldAlert size={16} />
          <span>Security Audit</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* User Overview Aggregate Cards */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              User Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total Users" value={stats.userOverview.totalUsers} sub="All registered" icon={<Users size={18} className="text-blue-600" />} />
              <StatCard label="New Today" value={stats.userOverview.newToday} sub="Past 24 hours" icon={<Activity size={18} className="text-emerald-600" />} />
              <StatCard label="New This Week" value={stats.userOverview.newThisWeek} sub="Past 7 days" icon={<BarChart3 size={18} className="text-indigo-600" />} />
              <StatCard label="New This Month" value={stats.userOverview.newThisMonth} sub="Past 30 days" icon={<Clock size={18} className="text-purple-600" />} />
              <StatCard label="Verified Accounts" value={stats.userOverview.verifiedAccounts} sub="Authenticated" icon={<CheckCircle2 size={18} className="text-emerald-600" />} />
              <StatCard label="Unverified" value={stats.userOverview.unverifiedAccounts} sub="Pending email" icon={<AlertTriangle size={18} className="text-amber-600" />} />
            </div>
          </section>

          {/* Health Platform Overview */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Health Platform Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <BigMetric label="Active Users" value={stats.platformOverview.activeUsers} sub="30-day active sessions" color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
              <BigMetric label="Health Trackers" value={stats.platformOverview.usersTrackingHealth} sub="Users logging biometrics" color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
              <BigMetric label="Onboarded Users" value={stats.platformOverview.usersOnboarded} sub="Completed setup" color="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600" />
              <BigMetric label="AI Interactions" value={stats.platformOverview.aiInteractionsTotal} sub="Nurse & Assistant queries" color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
            </div>
          </section>

          {/* Growth Analytics Chart */}
          <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">User Growth Analytics</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Recent user signups and active user engagement trends</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f3f4f6'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      fontSize: '12px',
                      color: isDarkMode ? '#ffffff' : '#111827'
                    }}
                  />
                  <Line type="monotone" dataKey="signups" name="New Signups" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="active" name="Active Users" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">User Management</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Masked user accounts for privacy-compliant operational review</p>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search masked accounts..."
                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase font-extrabold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Display Name</th>
                    <th className="px-4 py-3">Masked Email</th>
                    <th className="px-4 py-3">Creation Date</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                        {u.displayName}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">
                        {u.emailMasked}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {u.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50">
                            <CheckCircle2 size={11} /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/50">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.status === 'active' ? (
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, user: u, targetStatus: 'disabled' })}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ml-auto"
                          >
                            <UserX size={12} />
                            <span>Disable</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, user: u, targetStatus: 'active' })}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ml-auto"
                          >
                            <UserCheck size={12} />
                            <span>Enable</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI & FEATURE ANALYTICS */}
      {activeTab === 'ai' && stats && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              AI Operational Usage
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total Requests" value={stats.aiUsage.totalRequests} sub="All time queries" icon={<Brain size={18} className="text-purple-600" />} />
              <StatCard label="Requests Today" value={stats.aiUsage.requestsToday} sub="Past 24 hours" icon={<Activity size={18} className="text-blue-600" />} />
              <StatCard label="Requests This Week" value={stats.aiUsage.requestsThisWeek} sub="Past 7 days" icon={<BarChart3 size={18} className="text-emerald-600" />} />
              <StatCard label="Avg Per User" value={stats.aiUsage.averageUsagePerUser} sub="Queries per user" icon={<Users size={18} className="text-indigo-600" />} />
              <StatCard label="Failed Requests" value={stats.aiUsage.failedRequests} sub="API errors" icon={<AlertTriangle size={18} className="text-amber-600" />} />
              <StatCard label="Rate Limited" value={stats.aiUsage.rateLimitedRequests} sub="Throttled queries" icon={<Radio size={18} className="text-red-600" />} />
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Health Feature Usage Breakdown</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Aggregated user activity across primary Genova application modules</p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f3f4f6'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      fontSize: '12px',
                      color: isDarkMode ? '#ffffff' : '#111827'
                    }}
                  />
                  <Bar dataKey="count" name="Active Users" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: SECURITY AUDIT */}
      {activeTab === 'security' && stats && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Security Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BigMetric label="Failed Login Attempts" value={stats.securitySummary.failedLoginAttempts} sub="Blocked password attempts" color="bg-red-50 dark:bg-red-950/40 text-red-600" />
              <BigMetric label="Rate-Limited Requests" value={stats.securitySummary.rateLimitedEvents} sub="Excessive rate triggers" color="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
              <BigMetric label="Active Admin Sessions" value={stats.securitySummary.activeAdminSessions} sub="Authenticated sessions" color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Security Audit Logs</h3>
            
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">No security events recorded in current server cycle.</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        log.type.includes('SUCCESS') ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                        log.type.includes('FAILED') || log.type.includes('LIMITED') ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' :
                        'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                      }`}>
                        {log.type}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">{log.details}</span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-gray-400 font-mono">
                      <span>IP: {log.ip}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* Confirmation Modal for Admin Actions */}
      {confirmModal.isOpen && confirmModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 dark:bg-red-950/50 text-red-600 rounded-xl">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Confirm Administrative Action
                </h3>
                <p className="text-xs text-gray-500">Admin Actions Verification</p>
              </div>
            </div>

            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
              Are you sure you want to {confirmModal.targetStatus === 'disabled' ? 'disable' : 'enable'} the account for <strong className="font-bold">{confirmModal.user.displayName}</strong> ({confirmModal.user.emailMasked})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, user: null, targetStatus: 'disabled' })}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleUserStatus}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number | string; sub: string; icon: React.ReactNode }> = ({ label, value, sub, icon }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-1.5">
    <div className="flex justify-between items-start">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <div className="p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">{icon}</div>
    </div>
    <p className="text-lg font-black text-gray-900 dark:text-white">{value}</p>
    <p className="text-[10px] text-gray-400 font-medium">{sub}</p>
  </div>
);

const BigMetric: React.FC<{ label: string; value: number | string; sub: string; color: string }> = ({ label, value, sub, color }) => (
  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`px-2 py-0.5 rounded-md text-xs font-black ${color}`}>{value}</span>
    </div>
    <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{sub}</p>
  </div>
);
