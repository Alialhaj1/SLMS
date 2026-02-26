/**
 * ============================================================================
 * SUPER ADMIN DASHBOARD - Platform Control Center
 * ============================================================================
 * Main dashboard for system owner to manage all tenants.
 * Landing page for platform/super_admin users after login.
 *
 * @module pages/admin/platform
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline';

// Types
interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  suspended_tenants: number;
  total_users: number;
  active_users: number;
  total_storage_mb: number;
  new_tenants_30d: number;
}

interface TenantSummary {
  id: number;
  name: string;
  tenant_code: string;
  primary_email: string;
  status: string;
  created_at: string;
  users_count: number;
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  trendValue,
  subtitle,
  onClick,
  loading = false,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-24" />
          <div className="h-10 w-10 bg-gray-200 dark:bg-slate-600 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-slate-600 rounded w-16 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-20" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <div className={`p-2.5 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {trend && trendValue && (
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'} {trendValue}
          </span>
        )}
        {subtitle && <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>}
      </div>
    </div>
  );
}

export default function PlatformDashboard() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats>({
    total_tenants: 0,
    active_tenants: 0,
    trial_tenants: 0,
    suspended_tenants: 0,
    total_users: 0,
    active_users: 0,
    total_storage_mb: 0,
    new_tenants_30d: 0,
  });
  const [recentTenants, setRecentTenants] = useState<TenantSummary[]>([]);

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const fetchPlatformData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Fetch platform stats
      const [statsRes, tenantsRes] = await Promise.allSettled([
        fetch('/api/tenants/stats', { headers }),
        fetch('/api/tenants?limit=5&sort=created_at&order=desc', { headers }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json();
        if (data) setStats(prev => ({ ...prev, ...data }));
      }

      if (tenantsRes.status === 'fulfilled' && tenantsRes.value.ok) {
        const data = await tenantsRes.value.json();
        if (data?.data) setRecentTenants(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      trial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    };
    return badges[status] || badges.inactive;
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('platformDashboard') || 'Platform Dashboard'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('platformDashboard') || 'Platform Control Center'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('platformDashboardDesc') || 'Monitor and manage all tenants, users, and system health'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/tenants"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              {t('newTenant') || 'New Tenant'}
            </Link>
            <Link
              href="/admin/platform/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              <CogIcon className="h-4 w-4" />
              {t('settings') || 'Settings'}
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('totalTenants') || 'Total Tenants'}
            value={stats.total_tenants}
            icon={BuildingOffice2Icon}
            color="blue"
            trend="up"
            trendValue={`+${stats.new_tenants_30d} this month`}
            onClick={() => router.push('/admin/tenants')}
            loading={loading}
          />
          <StatCard
            title={t('activeTenants') || 'Active Tenants'}
            value={stats.active_tenants}
            icon={CheckCircleIcon}
            color="green"
            subtitle={`${stats.trial_tenants} on trial`}
            onClick={() => router.push('/admin/tenants')}
            loading={loading}
          />
          <StatCard
            title={t('totalUsers') || 'Total Users'}
            value={stats.total_users}
            icon={UsersIcon}
            color="purple"
            subtitle={`${stats.active_users} active`}
            onClick={() => router.push('/admin/platform/users')}
            loading={loading}
          />
          <StatCard
            title={t('suspendedTenants') || 'Suspended'}
            value={stats.suspended_tenants}
            icon={ExclamationTriangleIcon}
            color={stats.suspended_tenants > 0 ? 'red' : 'green'}
            loading={loading}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tenants */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('recentTenants') || 'Recent Tenants'}
              </h2>
              <Link href="/admin/tenants" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                {t('viewAll') || 'View All'} →
              </Link>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-32 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-48" />
                      </div>
                      <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-16" />
                    </div>
                  </div>
                ))
              ) : recentTenants.length > 0 ? (
                recentTenants.map((tenant) => (
                  <div key={tenant.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{tenant.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {tenant.tenant_code} • {tenant.primary_email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(tenant.status)}`}>
                          {tenant.status}
                        </span>
                        <Link href={`/admin/tenants/${tenant.id}`} className="text-gray-400 hover:text-blue-600">
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  <BuildingOffice2Icon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>{t('noTenantsYet') || 'No tenants yet'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('quickActions') || 'Quick Actions'}
              </h2>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: t('manageTenants') || 'Manage Tenants', href: '/admin/tenants', icon: BuildingOffice2Icon, color: 'text-blue-600' },
                { label: t('platformUsers') || 'Platform Users', href: '/admin/platform/users', icon: UsersIcon, color: 'text-purple-600' },
                { label: t('auditLogs') || 'Audit Logs', href: '/admin/platform/audit-logs', icon: ShieldCheckIcon, color: 'text-green-600' },
                { label: t('subscriptionPlans') || 'Subscription Plans', href: '/admin/subscription-plans', icon: CurrencyDollarIcon, color: 'text-yellow-600' },
                { label: t('systemMonitoring') || 'System Monitoring', href: '/admin/monitoring', icon: ServerStackIcon, color: 'text-indigo-600' },
                { label: t('platformSettings') || 'Platform Settings', href: '/admin/platform/settings', icon: CogIcon, color: 'text-gray-600' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('systemHealth') || 'System Health'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-400">{t('apiServer') || 'API Server'}</p>
                <p className="text-sm text-green-600 dark:text-green-500">{t('operational') || 'Operational'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-400">{t('database') || 'Database'}</p>
                <p className="text-sm text-green-600 dark:text-green-500">{t('operational') || 'Operational'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-400">{t('storage') || 'Storage'}</p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  {(stats.total_storage_mb / 1024).toFixed(1)} GB {t('used') || 'used'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
