import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ChartBarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  TruckIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import MainLayout from '@/components/layout/MainLayout';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/components/ui/Toast.enhanced';

// Types
interface PlatformStats {
  tenants: {
    total: number;
    active: number;
    suspended: number;
  };
  users: {
    total: number;
    activeToday: number;
  };
  shipments: {
    total: number;
    thisMonth: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  recentLogins: Array<{
    id: string;
    user_email: string;
    tenant_name: string;
    login_time: string;
    ip_address: string;
  }>;
  criticalAlerts: Array<{
    id: string;
    type: 'security' | 'system' | 'billing';
    message: string;
    tenant_name?: string;
    created_at: string;
  }>;
}

interface ChartData {
  dailyShipments: Array<{
    date: string;
    shipments: number;
  }>;
  planDistribution: Array<{
    plan: 'Starter' | 'Pro' | 'Enterprise';
    count: number;
    percentage: number;
  }>;
}

export default function PlatformAdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { locale, t } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check platform admin permission
  useEffect(() => {
    if (!hasPermission('platform:admin:access')) {
      router.replace('/unauthorized');
      return;
    }
  }, [hasPermission, router]);

  // Load platform statistics
  const loadPlatformStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const [statsResponse, chartResponse] = await Promise.all([
        fetch('http://localhost:4000/api/admin/platform/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:4000/api/admin/platform/charts', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!statsResponse.ok || !chartResponse.ok) {
        throw new Error(isRTL ? 'فشل في تحميل إحصائيات المنصة' : 'Failed to load platform statistics');
      }

      const [statsData, chartData] = await Promise.all([
        statsResponse.json(),
        chartResponse.json()
      ]);

      setStats(statsData);
      setChartData(chartData);
    } catch (error) {
      console.error('Error loading platform stats:', error);
      const message = error instanceof Error ? error.message : 
        (isRTL ? 'خطأ غير معروف' : 'Unknown error');
      setError(message);
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformStats();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get alert type color
  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'security': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'system': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'billing': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  if (!hasPermission('platform:admin:access')) {
    return null;
  }

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'لوحة تحكم المنصة - SLMS' : 'Platform Dashboard - SLMS'}</title>
      </Head>

      <div className="space-y-6">
        <PageHeader
          title={isRTL ? 'لوحة تحكم المنصة' : 'Platform Dashboard'}
          description={isRTL ? 
            'نظرة شاملة على جميع العمليات والإحصائيات عبر المنصة' : 
            'Comprehensive overview of all operations and statistics across the platform'
          }
          breadcrumbs={[
            { label: isRTL ? 'الإدارة' : 'Admin', href: '/admin' },
            { label: isRTL ? 'لوحة التحكم' : 'Dashboard' }
          ]}
          actions={[
            {
              id: 'refresh',
              label: isRTL ? 'إعادة تحميل' : 'Refresh',
              onClick: loadPlatformStats,
              variant: 'secondary',
              permission: 'platform:admin:access'
            }
          ]}
        />

        {/* Platform Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title={isRTL ? 'إجمالي المستأجرين' : 'Total Tenants'}
            value={stats?.tenants.total || 0}
            subtitle={isRTL ? 
              `نشط: ${stats?.tenants.active || 0} • موقوف: ${stats?.tenants.suspended || 0}` :
              `Active: ${stats?.tenants.active || 0} • Suspended: ${stats?.tenants.suspended || 0}`
            }
            icon={<BuildingOfficeIcon className="w-6 h-6" />}
            color="blue"
            loading={loading}
            onClick={() => router.push('/admin/tenants')}
          />

          <StatCard
            title={isRTL ? 'إجمالي المستخدمين' : 'Total Users'}
            value={stats?.users.total || 0}
            subtitle={isRTL ? 
              `نشط اليوم: ${stats?.users.activeToday || 0}` :
              `Active Today: ${stats?.users.activeToday || 0}`
            }
            icon={<UserGroupIcon className="w-6 h-6" />}
            color="green"
            loading={loading}
          />

          <StatCard
            title={isRTL ? 'إجمالي الشحنات' : 'Total Shipments'}
            value={stats?.shipments.total || 0}
            subtitle={isRTL ? 
              `هذا الشهر: ${stats?.shipments.thisMonth || 0}` :
              `This Month: ${stats?.shipments.thisMonth || 0}`
            }
            icon={<TruckIcon className="w-6 h-6" />}
            color="purple"
            loading={loading}
          />

          <StatCard
            title={isRTL ? 'الإيرادات الشهرية' : 'Monthly Revenue'}
            value={formatCurrency(stats?.revenue.thisMonth || 0)}
            subtitle={stats?.revenue.growth ? 
              (stats.revenue.growth > 0 ? 
                (isRTL ? `نمو: +${stats.revenue.growth}%` : `Growth: +${stats.revenue.growth}%`) :
                (isRTL ? `انخفاض: ${stats.revenue.growth}%` : `Decrease: ${stats.revenue.growth}%`)
              ) : ''
            }
            icon={<BanknotesIcon className="w-6 h-6" />}
            color="yellow"
            trend={stats?.revenue.growth ? (stats.revenue.growth > 0 ? 'up' : 'down') : undefined}
            trendValue={stats?.revenue.growth ? Math.abs(stats.revenue.growth) : undefined}
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Logins */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isRTL ? 'آخر عمليات تسجيل الدخول' : 'Recent Logins'}
              </h3>
              <ClockIcon className="w-5 h-5 text-gray-400" />
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="animate-pulse flex space-x-3 rtl:space-x-reverse">
                    <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-8 w-8"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recentLogins.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {isRTL ? 'لا توجد عمليات دخول حديثة' : 'No recent logins'}
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {stats?.recentLogins.map((login) => (
                  <div key={login.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {login.user_email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {login.tenant_name} • {formatDate(login.login_time)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {login.ip_address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Critical Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isRTL ? 'التنبيهات الحرجة' : 'Critical Alerts'}
              </h3>
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : stats?.criticalAlerts.length === 0 ? (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">
                  {isRTL ? 'لا توجد تنبيهات حرجة' : 'No critical alerts'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {stats?.criticalAlerts.map((alert) => (
                  <div key={alert.id} className="border-l-4 border-red-500 rtl:border-l-0 rtl:border-r-4 pl-4 rtl:pl-0 rtl:pr-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getAlertTypeColor(alert.type)}`}>
                        {alert.type === 'security' ? (isRTL ? 'أمان' : 'Security') :
                         alert.type === 'system' ? (isRTL ? 'نظام' : 'System') :
                         alert.type === 'billing' ? (isRTL ? 'فواتير' : 'Billing') : alert.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(alert.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {alert.message}
                    </p>
                    {alert.tenant_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        {isRTL ? 'الشركة: ' : 'Company: '}{alert.tenant_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Shipments Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {isRTL ? 'الشحنات اليومية' : 'Daily Shipments'}
            </h3>
            
            {loading ? (
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <ChartBarIcon className="w-16 h-16 mb-2" />
                <p>{isRTL ? 'مخطط الشحنات اليومية' : 'Daily Shipments Chart'}</p>
                {/* TODO: Implement actual chart component */}
              </div>
            )}
          </div>

          {/* Plan Distribution Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {isRTL ? 'توزيع الخطط' : 'Plan Distribution'}
            </h3>
            
            {loading ? (
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ) : chartData?.planDistribution ? (
              <div className="space-y-4">
                {chartData.planDistribution.map((plan) => (
                  <div key={plan.plan} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className={`w-4 h-4 rounded-full ${
                        plan.plan === 'Starter' ? 'bg-blue-500' :
                        plan.plan === 'Pro' ? 'bg-green-500' :
                        'bg-purple-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {plan.plan}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                        {plan.count}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({plan.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>{isRTL ? 'لا توجد بيانات' : 'No data available'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}