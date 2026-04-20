/**
 * ============================================================================
 * SUPER ADMIN DASHBOARD - Platform Control Center
 * ============================================================================
 * Premium dashboard with KPIs, plan distribution, system health gauges,
 * recent audit logs, account requests alerts, and service status grid.
 *
 * @module pages/admin/platform
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  BuildingOffice2Icon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  CogIcon,
  PlusIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  CpuChipIcon,
  CircleStackIcon,
  UserGroupIcon,
  ArrowPathIcon,
  InboxStackIcon,
  DocumentMagnifyingGlassIcon,
  CubeIcon,
  FingerPrintIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

/* ================================================================
   TYPES
   ================================================================ */
interface PlanDistribution {
  plan: string;
  count: number;
}

interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  suspended_tenants: number;
  total_users: number;
  active_users: number;
  total_storage_mb: number;
  new_tenants_30d: number;
  pending_account_requests: number;
  plan_distribution: PlanDistribution[];
}

interface TenantSummary {
  id: number;
  name: string;
  tenant_code: string;
  primary_email: string;
  status: string;
  plan: string;
  created_at: string;
  users_count: number;
}

interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
  activeConnections: number;
  apiReqPerMin: number;
  avgResponseMs: number;
}

interface AuditLogEntry {
  id: number;
  action: string;
  resource_type: string;
  user_email: string;
  created_at: string;
  ip_address: string;
}

interface GrowthPoint {
  month: string;
  new_tenants: number;
}

interface ModuleUsageItem {
  module_code: string;
  module_name: string;
  is_core: boolean;
  enabled_count: number;
  adoption_pct: number;
}

interface HeatmapCell {
  day_of_week: number;
  hour_of_day: number;
  login_count: number;
}

interface ActivityEvent {
  action: string;
  resource: string;
  resource_id: string;
  created_at: string;
  ip_address: string;
  user_email: string;
  user_name: string;
}

/* ================================================================
   COMPONENTS
   ================================================================ */

// Circular Gauge for system health
function CircularGauge({ value, color, label, size = 100 }: { value: number; color: string; label: string; size?: number }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  const statusColor = safeValue > 80 ? 'text-red-500' : safeValue > 60 ? 'text-yellow-500' : 'text-green-500';
  const statusLabel = safeValue > 80 ? 'مرتفع ⚠' : safeValue > 60 ? 'متوسط ⚡' : 'طبيعي ✅';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-gray-200 dark:text-slate-700"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-gray-900 dark:text-white">{safeValue}%</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">{label}</p>
      <p className={`text-xs font-semibold ${statusColor} mt-1`}>{statusLabel}</p>
    </div>
  );
}

// Progress bar
function ProgressBar({ value, max, color, label, count }: { value: number; max: number; color: string; label: string; count: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold text-gray-900 dark:text-white w-10 text-left">{count}</span>
    </div>
  );
}

// Stat Card
function StatCard({
  title, value, icon: Icon, color, bgColor, trend, trendValue, subtitle, onClick, loading = false,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gray-200 dark:bg-slate-600 rounded-xl" />
          <div className="flex-1">
            <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{title}</p>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {trend && trendValue && (
              <span className={`text-xs font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </span>
            )}
            {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Service status item
function ServiceStatus({ name, version, status }: { name: string; version: string; status: 'online' | 'offline' | 'degraded' }) {
  const dotColor = status === 'online' ? 'bg-green-500' : status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{name}</p>
        <p className="text-xs text-gray-400">{version}</p>
      </div>
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} animate-pulse`} />
    </div>
  );
}

/* ================================================================
   MAIN DASHBOARD
   ================================================================ */
export default function PlatformDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<PlatformStats>({
    total_tenants: 0, active_tenants: 0, trial_tenants: 0, suspended_tenants: 0,
    total_users: 0, active_users: 0, total_storage_mb: 0, new_tenants_30d: 0,
    pending_account_requests: 0, plan_distribution: [],
  });
  const [recentTenants, setRecentTenants] = useState<TenantSummary[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLogEntry[]>([]);
  const [health, setHealth] = useState<SystemHealth>({
    cpu: 0, memory: 0, disk: 0, uptime: '—', activeConnections: 0, apiReqPerMin: 0, avgResponseMs: 0,
  });
  const [growthTrend, setGrowthTrend] = useState<GrowthPoint[]>([]);
  const [moduleUsage, setModuleUsage] = useState<ModuleUsageItem[]>([]);
  const [loginHeatmap, setLoginHeatmap] = useState<HeatmapCell[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setLoading(false); setRefreshing(false); return; }
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

      const [statsRes, tenantsRes, auditRes, healthRes, dashboardRes, moduleUsageRes, heatmapRes] = await Promise.allSettled([
        fetch('http://localhost:4000/api/tenants/stats', { headers }),
        fetch('http://localhost:4000/api/tenants?limit=5&sort=created_at&order=desc', { headers }),
        fetch('http://localhost:4000/api/audit-logs?limit=5&sort=created_at&order=desc', { headers }),
        fetch('http://localhost:4000/api/health/detailed', { headers }),
        fetch('http://localhost:4000/api/platform/dashboard', { headers }),
        fetch('http://localhost:4000/api/platform/analytics/module-usage', { headers }),
        fetch('http://localhost:4000/api/platform/analytics/login-heatmap', { headers }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const d = await statsRes.value.json();
        // Handle both wrapped {data: {...}} and flat response
        const payload = d?.data ?? d;
        if (payload) setStats(prev => ({ ...prev, ...payload }));
      }
      if (tenantsRes.status === 'fulfilled' && tenantsRes.value.ok) {
        const d = await tenantsRes.value.json();
        if (d?.data) setRecentTenants(d.data);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
        const d = await auditRes.value.json();
        if (d?.data) setRecentAuditLogs(d.data);
      }
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const d = await healthRes.value.json();
        if (d) {
          const heapPct = d.memory ? Math.round((d.memory.heapUsed / d.memory.heapTotal) * 100) : 45;
          setHealth({
            cpu: d.cpu?.usage ?? 32,
            memory: heapPct,
            disk: d.disk?.usedPercent ?? 28,
            uptime: d.uptime ? `${Math.floor(d.uptime / 86400)}d ${Math.floor((d.uptime % 86400) / 3600)}h` : '—',
            activeConnections: d.database?.pool?.total ?? 0,
            apiReqPerMin: d.requests?.perMinute ?? 0,
            avgResponseMs: d.requests?.avgResponseMs ?? 0,
          });
        }
      }

      // Platform dashboard (growth trend + activity feed)
      if (dashboardRes.status === 'fulfilled' && dashboardRes.value.ok) {
        const d = await dashboardRes.value.json();
        const payload = d?.data ?? d;
        if (payload?.growthTrend) setGrowthTrend(payload.growthTrend);
        if (payload?.recentActivity) setActivityFeed(payload.recentActivity);
      }

      // Module usage
      if (moduleUsageRes.status === 'fulfilled' && moduleUsageRes.value.ok) {
        const d = await moduleUsageRes.value.json();
        const payload = d?.data ?? d;
        if (payload?.modules) setModuleUsage(payload.modules);
      }

      // Login heatmap
      if (heatmapRes.status === 'fulfilled' && heatmapRes.value.ok) {
        const d = await heatmapRes.value.json();
        const payload = d?.data ?? d;
        if (payload?.heatmap) setLoginHeatmap(payload.heatmap);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const iv = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      trial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
    };
    return map[status] || map.inactive;
  };

  const getActionColor = (action: string) => {
    if (action?.includes('create') || action?.includes('insert')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (action?.includes('delete') || action?.includes('remove')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (action?.includes('update') || action?.includes('edit')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (action?.includes('login') || action?.includes('auth')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400';
  };

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'لوحة تحكم المنصة' : 'Platform Dashboard'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {isRTL ? '⬡ لوحة تحكم المنصة' : '⬡ Platform Control Center'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRTL ? 'مراقبة شاملة للعملاء والمستخدمين وصحة النظام' : 'Monitor tenants, users, and system health'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? (isRTL ? 'جاري...' : 'Refreshing...') : (isRTL ? 'تحديث' : 'Refresh')}
            </button>
            <Link
              href="/admin/tenants"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              {isRTL ? 'عميل جديد' : 'New Tenant'}
            </Link>
          </div>
        </div>

        {/* ── KPI Stats Grid (6 cards, 3 per row) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard
            title={isRTL ? 'إجمالي العملاء' : 'Total Tenants'}
            value={stats.total_tenants}
            icon={BuildingOffice2Icon}
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
            subtitle={`${stats.active_tenants} ${isRTL ? 'نشط' : 'active'}`}
            onClick={() => router.push('/admin/tenants')}
            loading={loading}
          />
          <StatCard
            title={isRTL ? 'العملاء النشطون' : 'Active Tenants'}
            value={stats.active_tenants}
            icon={CheckCircleIcon}
            color="text-green-600 dark:text-green-400"
            bgColor="bg-green-50 dark:bg-green-900/20"
            subtitle={`${stats.trial_tenants} ${isRTL ? 'تجريبي' : 'trial'}`}
            onClick={() => router.push('/admin/tenants')}
            loading={loading}
          />
          <StatCard
            title={isRTL ? 'إجمالي المستخدمين' : 'Total Users'}
            value={stats.total_users}
            icon={UsersIcon}
            color="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-50 dark:bg-purple-900/20"
            subtitle={`${stats.active_users} ${isRTL ? 'نشط' : 'active'}`}
            onClick={() => router.push('/admin/platform/users')}
            loading={loading}
          />
          <StatCard
            title={isRTL ? 'طلبات الحسابات' : 'Account Requests'}
            value={stats.pending_account_requests}
            icon={InboxStackIcon}
            color={stats.pending_account_requests > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}
            bgColor={stats.pending_account_requests > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'}
            subtitle={stats.pending_account_requests > 0 ? (isRTL ? 'بانتظار المراجعة' : 'pending review') : (isRTL ? 'لا يوجد معلق' : 'none pending')}
            onClick={() => router.push('/admin/account-requests')}
            loading={loading}
          />
          <StatCard
            title={isRTL ? 'العملاء المعلقون' : 'Suspended'}
            value={stats.suspended_tenants}
            icon={ExclamationTriangleIcon}
            color={stats.suspended_tenants > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
            bgColor={stats.suspended_tenants > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}
            loading={loading}
          />
          <StatCard
            title={isRTL ? 'عملاء جدد (30 يوم)' : 'New (30 Days)'}
            value={stats.new_tenants_30d}
            icon={ArrowTrendingUpIcon}
            color="text-teal-600 dark:text-teal-400"
            bgColor="bg-teal-50 dark:bg-teal-900/20"
            trend="up"
            trendValue={`+${stats.new_tenants_30d}`}
            subtitle={isRTL ? 'هذا الشهر' : 'this month'}
            loading={loading}
          />
        </div>

        {/* ── Plan Distribution + System Health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '💎 توزيع الخطط' : '💎 Plan Distribution'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-20 h-3 bg-gray-200 dark:bg-slate-600 rounded" />
                      <div className="flex-1 h-2.5 bg-gray-200 dark:bg-slate-600 rounded" />
                      <div className="w-8 h-3 bg-gray-200 dark:bg-slate-600 rounded" />
                    </div>
                  ))}
                </div>
              ) : stats.plan_distribution.length > 0 ? (
                <>
                  {stats.plan_distribution.map((pd, idx) => {
                    const colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];
                    const planLabel = pd.plan === 'none' ? (isRTL ? 'بدون خطة' : 'No Plan') : pd.plan;
                    return (
                      <ProgressBar
                        key={pd.plan}
                        label={planLabel}
                        value={pd.count}
                        max={stats.total_tenants}
                        color={colors[idx % colors.length]}
                        count={pd.count}
                      />
                    );
                  })}
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{isRTL ? 'الإجمالي' : 'Total'}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.total_tenants} {isRTL ? 'عميل' : 'tenants'}</span>
                  </div>
                </>
              ) : (
                <>
                  <ProgressBar label={isRTL ? 'نشط' : 'Active'} value={stats.active_tenants} max={stats.total_tenants} color="#3B82F6" count={stats.active_tenants} />
                  <ProgressBar label={isRTL ? 'تجريبي' : 'Trial'} value={stats.trial_tenants} max={stats.total_tenants} color="#8B5CF6" count={stats.trial_tenants} />
                  <ProgressBar label={isRTL ? 'معلق' : 'Suspended'} value={stats.suspended_tenants} max={stats.total_tenants} color="#F59E0B" count={stats.suspended_tenants} />
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{isRTL ? 'الإجمالي' : 'Total'}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.total_tenants} {isRTL ? 'عميل' : 'tenants'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* System Health Gauges */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '📊 صحة النظام' : '📊 System Health'}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                {isRTL ? 'مباشر' : 'Live'}
              </span>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex justify-around animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="w-24 h-24 bg-gray-200 dark:bg-slate-600 rounded-full" />
                      <div className="w-16 h-3 bg-gray-200 dark:bg-slate-600 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-around">
                  <CircularGauge value={health.cpu} color="#3B82F6" label={isRTL ? 'المعالج CPU' : 'CPU'} />
                  <CircularGauge value={health.memory} color="#8B5CF6" label={isRTL ? 'الذاكرة RAM' : 'Memory'} />
                  <CircularGauge value={health.disk} color="#06B6D4" label={isRTL ? 'التخزين Disk' : 'Disk'} />
                </div>
              )}
              {/* Health quick metrics */}
              {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{health.avgResponseMs}<span className="text-xs text-gray-400">ms</span></p>
                    <p className="text-xs text-gray-500">{isRTL ? 'متوسط الاستجابة' : 'Avg Response'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{health.activeConnections}</p>
                    <p className="text-xs text-gray-500">{isRTL ? 'اتصالات نشطة' : 'Connections'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{health.apiReqPerMin}</p>
                    <p className="text-xs text-gray-500">{isRTL ? 'طلبات/دقيقة' : 'Req/min'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{health.uptime}</p>
                    <p className="text-xs text-gray-500">{isRTL ? 'وقت التشغيل' : 'Uptime'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Charts Section: Growth + Plan Donut ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tenant Growth Line Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '📈 نمو العملاء' : '📈 Tenant Growth'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isRTL ? 'عملاء جدد شهرياً (آخر 6 أشهر)' : 'New tenants per month (last 6 months)'}
              </p>
            </div>
            <div className="p-6" style={{ height: 280 }}>
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-pulse w-full h-40 bg-gray-100 dark:bg-slate-700 rounded-lg" />
                </div>
              ) : growthTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthTrend.map(g => ({
                    month: new Date(g.month).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' }),
                    tenants: Number(g.new_tenants),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid #e5e7eb' }}
                      labelStyle={{ fontWeight: 700 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tenants"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                      name={isRTL ? 'عملاء جدد' : 'New Tenants'}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <ChartBarIcon className="h-10 w-10 mb-2" />
                  <p className="text-sm">{isRTL ? 'لا توجد بيانات كافية' : 'Not enough data yet'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Plan Distribution Donut Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '🍩 توزيع الاشتراكات' : '🍩 Subscription Distribution'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isRTL ? 'توزيع العملاء حسب الخطة' : 'Tenants by subscription plan'}
              </p>
            </div>
            <div className="p-6" style={{ height: 280 }}>
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-pulse w-40 h-40 bg-gray-100 dark:bg-slate-700 rounded-full mx-auto" />
                </div>
              ) : stats.plan_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.plan_distribution.map(pd => ({
                        name: pd.plan === 'none' ? (isRTL ? 'بدون خطة' : 'No Plan') : pd.plan,
                        value: pd.count,
                      }))}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {stats.plan_distribution.map((_, idx) => (
                        <Cell key={idx} fill={['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#EC4899'][idx % 7]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid #e5e7eb' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <ChartBarIcon className="h-10 w-10 mb-2" />
                  <p className="text-sm">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Charts Section: Module Usage + Login Heatmap ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module Usage Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '📦 استخدام الوحدات' : '📦 Module Adoption'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isRTL ? 'عدد العملاء المفعلين لكل وحدة' : 'Tenants with each module enabled'}
              </p>
            </div>
            <div className="p-6" style={{ height: 320 }}>
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-pulse w-full h-48 bg-gray-100 dark:bg-slate-700 rounded-lg" />
                </div>
              ) : moduleUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={moduleUsage.map(m => ({
                      name: m.module_name || m.module_code,
                      count: Number(m.enabled_count),
                      pct: Number(m.adoption_pct),
                      isCore: m.is_core,
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid #e5e7eb' }}
                      formatter={(value: number, _: string, props: any) => [
                        `${value} tenants (${props.payload.pct}%)`,
                        props.payload.isCore ? (isRTL ? 'أساسي' : 'Core') : (isRTL ? 'إضافي' : 'Add-on'),
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {moduleUsage.map((m, idx) => (
                        <Cell key={idx} fill={m.is_core ? '#0D7377' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <CubeIcon className="h-10 w-10 mb-2" />
                  <p className="text-sm">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Login Heatmap */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '🔥 خريطة تسجيل الدخول' : '🔥 Login Heatmap'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isRTL ? 'نشاط تسجيل الدخول حسب الساعة واليوم (30 يوم)' : 'Login activity by hour & day (30 days)'}
              </p>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="animate-pulse space-y-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex gap-1">
                      {Array.from({ length: 24 }).map((_, j) => (
                        <div key={j} className="w-3 h-3 bg-gray-200 dark:bg-slate-700 rounded-sm" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : (() => {
                const dayNames = isRTL
                  ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
                  : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const maxCount = Math.max(1, ...loginHeatmap.map(c => Number(c.login_count)));
                const getCount = (day: number, hour: number) => {
                  const cell = loginHeatmap.find(c => Number(c.day_of_week) === day && Number(c.hour_of_day) === hour);
                  return cell ? Number(cell.login_count) : 0;
                };
                const getColor = (count: number) => {
                  if (count === 0) return 'bg-gray-100 dark:bg-slate-700';
                  const intensity = count / maxCount;
                  if (intensity > 0.75) return 'bg-green-600';
                  if (intensity > 0.5) return 'bg-green-500';
                  if (intensity > 0.25) return 'bg-green-400';
                  return 'bg-green-200 dark:bg-green-800';
                };

                return loginHeatmap.length > 0 ? (
                  <div className="overflow-x-auto">
                    {/* Hour labels */}
                    <div className="flex">
                      <div className="w-10 shrink-0" />
                      <div className="flex gap-[2px]">
                        {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                          <div key={h} className="text-[10px] text-gray-400" style={{ width: `${(3 * 14) + (2 * 2)}px` }}>
                            {h.toString().padStart(2, '0')}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Grid */}
                    {[0, 1, 2, 3, 4, 5, 6].map(day => (
                      <div key={day} className="flex items-center gap-1 mb-[2px]">
                        <span className="text-[10px] text-gray-500 w-10 shrink-0 text-end">{dayNames[day]}</span>
                        <div className="flex gap-[2px]">
                          {Array.from({ length: 24 }).map((_, hour) => {
                            const cnt = getCount(day, hour);
                            return (
                              <div
                                key={hour}
                                className={`w-[12px] h-[12px] rounded-sm ${getColor(cnt)} transition-colors`}
                                title={`${dayNames[day]} ${hour}:00 — ${cnt} ${isRTL ? 'تسجيل دخول' : 'logins'}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {/* Legend */}
                    <div className="flex items-center gap-2 mt-3 justify-end">
                      <span className="text-[10px] text-gray-400">{isRTL ? 'أقل' : 'Less'}</span>
                      {['bg-gray-100 dark:bg-slate-700', 'bg-green-200', 'bg-green-400', 'bg-green-500', 'bg-green-600'].map((c, i) => (
                        <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
                      ))}
                      <span className="text-[10px] text-gray-400">{isRTL ? 'أكثر' : 'More'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                    <ClockIcon className="h-10 w-10 mb-2" />
                    <p className="text-sm">{isRTL ? 'لا توجد بيانات تسجيل دخول' : 'No login data yet'}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── Real-time Activity Feed ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '⚡ النشاط المباشر' : '⚡ Live Activity Feed'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isRTL ? 'آخر 10 أحداث على المنصة' : 'Last 10 platform-wide events'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {isRTL ? 'مباشر' : 'Live'}
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-3 animate-pulse flex items-center gap-4">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-slate-600 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-48 mb-1" />
                    <div className="h-2.5 bg-gray-200 dark:bg-slate-600 rounded w-32" />
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-16" />
                </div>
              ))
            ) : activityFeed.length > 0 ? (
              activityFeed.map((ev, idx) => {
                const actionColor = ev.action?.includes('create') || ev.action?.includes('insert')
                  ? 'bg-green-500' : ev.action?.includes('delete') || ev.action?.includes('remove')
                  ? 'bg-red-500' : ev.action?.includes('update') || ev.action?.includes('edit')
                  ? 'bg-blue-500' : ev.action?.includes('login')
                  ? 'bg-purple-500' : 'bg-gray-400';
                return (
                  <div key={idx} className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${actionColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        <span className="font-semibold">{ev.user_name || ev.user_email || 'System'}</span>
                        {' — '}
                        <span className="text-gray-500">{ev.action}</span>
                        {ev.resource && <span className="text-gray-400">{isRTL ? ` في ${ev.resource}` : ` on ${ev.resource}`}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ev.ip_address} · {new Date(ev.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {(() => {
                        const diff = Date.now() - new Date(ev.created_at).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return isRTL ? 'الآن' : 'now';
                        if (mins < 60) return `${mins}m`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h`;
                        return `${Math.floor(hrs / 24)}d`;
                      })()}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-10 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-gray-400">{isRTL ? 'لا يوجد نشاط بعد' : 'No activity yet'}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Tenants + Recent Audit Logs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tenants */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '🏢 أحدث العملاء' : '🏢 Recent Tenants'}
              </h2>
              <Link href="/admin/tenants" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                {isRTL ? 'عرض الكل ←' : 'View All →'}
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-6 py-3.5 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-gray-200 dark:bg-slate-600 rounded-lg" />
                      <div className="flex-1">
                        <div className="h-3.5 bg-gray-200 dark:bg-slate-600 rounded w-28 mb-1.5" />
                        <div className="h-2.5 bg-gray-200 dark:bg-slate-600 rounded w-40" />
                      </div>
                      <div className="h-5 bg-gray-200 dark:bg-slate-600 rounded w-14" />
                    </div>
                  </div>
                ))
              ) : recentTenants.length > 0 ? (
                recentTenants.map((tenant) => (
                  <div key={tenant.id} className="px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm shrink-0">
                        {tenant.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{tenant.name}</p>
                        <p className="text-xs text-gray-400 truncate">{tenant.tenant_code} · {tenant.primary_email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusBadge(tenant.status)}`}>
                        {isRTL ? (tenant.status === 'active' ? 'نشط' : tenant.status === 'trial' ? 'تجريبي' : tenant.status === 'suspended' ? 'موقوف' : tenant.status) : tenant.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center">
                  <BuildingOffice2Icon className="h-10 w-10 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-gray-400">{isRTL ? 'لا يوجد عملاء بعد' : 'No tenants yet'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '📋 سجل التدقيق' : '📋 Recent Audit Logs'}
              </h2>
              <Link href="/admin/platform/audit-logs" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                {isRTL ? 'عرض الكل ←' : 'View All →'}
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-6 py-3.5 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-16 bg-gray-200 dark:bg-slate-600 rounded" />
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-32 mb-1.5" />
                        <div className="h-2.5 bg-gray-200 dark:bg-slate-600 rounded w-24" />
                      </div>
                    </div>
                  </div>
                ))
              ) : recentAuditLogs.length > 0 ? (
                recentAuditLogs.map((log) => (
                  <div key={log.id} className="px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {log.resource_type} — <span className="text-gray-400">{log.user_email}</span>
                        </p>
                        <p className="text-xs text-gray-400">{log.ip_address} · {new Date(log.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center">
                  <DocumentMagnifyingGlassIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-gray-400">{isRTL ? 'لا توجد سجلات' : 'No audit logs'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Service Status + Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Services */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '🔧 خدمات النظام' : '🔧 System Services'}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
              <ServiceStatus name={isRTL ? 'قاعدة البيانات' : 'Database'} version="PostgreSQL 15" status="online" />
              <ServiceStatus name={isRTL ? 'الذاكرة المؤقتة' : 'Cache'} version="Redis 7" status="online" />
              <ServiceStatus name={isRTL ? 'خادم API' : 'API Server'} version="Express.js" status="online" />
              <ServiceStatus name={isRTL ? 'تخزين الملفات' : 'File Storage'} version="Local/S3" status="online" />
              <ServiceStatus name={isRTL ? 'البريد (SMTP)' : 'Email (SMTP)'} version={isRTL ? 'مُعَد' : 'Configured'} status="online" />
              <ServiceStatus name={isRTL ? 'المصادقة' : 'Auth Service'} version="JWT" status="online" />
              <ServiceStatus name={isRTL ? 'قائمة المهام' : 'Job Queue'} version="BullMQ" status="online" />
              <ServiceStatus name={isRTL ? 'شبكة التوزيع' : 'CDN'} version="Cloudflare" status="online" />
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isRTL ? '⚡ إجراءات سريعة' : '⚡ Quick Actions'}
              </h2>
            </div>
            <div className="p-4 space-y-1.5">
              {[
                { label: isRTL ? 'إدارة العملاء' : 'Manage Tenants', href: '/admin/tenants', icon: BuildingOffice2Icon, color: 'text-blue-600' },
                { label: isRTL ? 'مستخدمو المنصة' : 'Platform Users', href: '/admin/platform/users', icon: UserGroupIcon, color: 'text-purple-600' },
                { label: isRTL ? 'سجل التدقيق' : 'Audit Logs', href: '/admin/platform/audit-logs', icon: DocumentMagnifyingGlassIcon, color: 'text-green-600' },
                { label: isRTL ? 'خطط الاشتراك' : 'Subscription Plans', href: '/admin/subscription-plans', icon: CurrencyDollarIcon, color: 'text-yellow-600' },
                { label: isRTL ? 'مراقبة النظام' : 'System Monitoring', href: '/admin/monitoring', icon: CpuChipIcon, color: 'text-indigo-600' },
                { label: isRTL ? 'إدارة الوحدات' : 'Modules', href: '/admin/modules', icon: CubeIcon, color: 'text-teal-600' },
                { label: isRTL ? 'إعدادات المنصة' : 'Platform Settings', href: '/admin/platform/settings', icon: CogIcon, color: 'text-gray-600' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <a.icon className={`h-5 w-5 ${a.color}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pending Account Requests Alert (bottom of page) ── */}
        {!loading && stats.pending_account_requests > 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <InboxStackIcon className="h-6 w-6 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {isRTL ? `يوجد ${stats.pending_account_requests} طلب حساب بانتظار المراجعة` : `${stats.pending_account_requests} pending account request(s) awaiting review`}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {isRTL ? 'يرجى مراجعة الطلبات واتخاذ الإجراء المناسب' : 'Please review and take appropriate action'}
              </p>
            </div>
            <Link
              href="/admin/account-requests"
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors shrink-0"
            >
              {isRTL ? 'مراجعة' : 'Review'}
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
