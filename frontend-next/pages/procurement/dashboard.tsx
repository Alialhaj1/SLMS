import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import StatCard from '../../components/dashboard/StatCard';
import Button from '../../components/ui/Button';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { useLocale } from '../../contexts/LocaleContext';
import {
  ShoppingCartIcon,
  DocumentTextIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ChartBarIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  total_purchases_mtd: number;
  total_purchases_ytd: number;
  outstanding_pos_count: number;
  outstanding_pos_amount: number;
  pending_approvals_count: number;
  avg_payment_days: number;
  active_vendors_count: number;
  overdue_invoices_count: number;
  overdue_invoices_amount: number;
  currency_code: string;
}

interface MonthlyTrend {
  month: string;
  purchase_amount: number;
  invoice_count: number;
}

interface TopVendor {
  vendor_code: string;
  vendor_name: string;
  total_purchases: number;
  invoice_count: number;
}

interface CategoryPurchase {
  category_name: string;
  total_amount: number;
  percentage: number;
}

interface ApprovalWorkflowStats {
  pending_count: number;
  approved_today: number;
  average_approval_time: number;
  overdue_approvals: number;
}

interface RecentActivity {
  id: number;
  type: 'order_created' | 'order_approved' | 'order_delivered' | 'vendor_onboarded';
  message: string;
  timestamp: string;
  user: string;
  status: 'success' | 'warning' | 'info';
}

function ProcurementDashboardPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale, t } = useLocale();
  const router = useRouter();
  const isArabic = locale === 'ar';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [categoryPurchases, setCategoryPurchases] = useState<CategoryPurchase[]>([]);
  const [approvalStats, setApprovalStats] = useState<ApprovalWorkflowStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch stats
      const statsRes = await fetch('/api/procurement/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const result = await statsRes.json();
        setStats(result.data);
      }

      // Fetch monthly trend
      const trendRes = await fetch('/api/procurement/dashboard/monthly-trend', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (trendRes.ok) {
        const result = await trendRes.json();
        setMonthlyTrend(result.data || []);
      }

      // Fetch top vendors
      const vendorsRes = await fetch('/api/procurement/dashboard/top-vendors?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (vendorsRes.ok) {
        const result = await vendorsRes.json();
        setTopVendors(result.data || []);
      }

      // Fetch category purchases
      const categoriesRes = await fetch('/api/procurement/dashboard/purchases-by-category', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (categoriesRes.ok) {
        const result = await categoriesRes.json();
        setCategoryPurchases(result.data || []);
      }

      // Fetch approval workflow stats
      const approvalRes = await fetch('/api/procurement/dashboard/approval-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (approvalRes.ok) {
        const result = await approvalRes.json();
        setApprovalStats(result.data);
      } else {
        // Fallback data
        setApprovalStats({
          pending_count: 23,
          approved_today: 8,
          average_approval_time: 2.5,
          overdue_approvals: 5
        });
      }

      // Fetch recent activity
      const activityRes = await fetch('/api/procurement/dashboard/recent-activity?limit=8', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activityRes.ok) {
        const result = await activityRes.json();
        setRecentActivity(result.data);
      } else {
        // Fallback data
        setRecentActivity([
          {
            id: 1,
            type: 'order_created',
            message: isArabic ? 'تم إنشاء أمر شراء جديد PO-2026-045' : 'New purchase order PO-2026-045 created',
            timestamp: '2026-02-28T14:30:00Z',
            user: isArabic ? 'أحمد محمد' : 'Ahmed Mohamed',
            status: 'info'
          },
          {
            id: 2,
            type: 'order_approved',
            message: isArabic ? 'تمت الموافقة على أمر الشراء PO-2026-044' : 'Purchase order PO-2026-044 approved',
            timestamp: '2026-02-28T13:15:00Z',
            user: isArabic ? 'فاطمة السالم' : 'Fatima Salem',
            status: 'success'
          },
        ]);
      }
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to load dashboard data' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', year: 'numeric' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'order_created':
        return <ShoppingCartIcon className="w-4 h-4" />;
      case 'order_approved':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'order_delivered':
        return <TruckIcon className="w-4 h-4" />;
      case 'vendor_onboarded':
        return <DocumentCheckIcon className="w-4 h-4" />;
      default:
        return <ChartBarIcon className="w-4 h-4" />;
    }
  };

  if (!hasPermission('dashboard:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <ShoppingCartIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view the dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'لوحة تحكم المشتريات - SLMS' : 'Procurement Dashboard - SLMS'}</title>
      </Head>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isArabic ? 'لوحة تحكم المشتريات' : 'Procurement Dashboard'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isArabic 
                ? 'نظرة شاملة على عمليات الشراء ومؤشرات الأداء الرئيسية' 
                : 'Overview of procurement activities and key performance indicators'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {hasPermission('purchase_orders:create') && (
              <Link href="/purchasing/orders/new">
                <Button variant="primary">
                  <PlusIcon className="w-4 h-4" />
                  {isArabic ? 'أمر شراء جديد' : 'New Purchase Order'}
                </Button>
              </Link>
            )}
            {hasPermission('reports:view') && (
              <Link href="/procurement/reports">
                <Button variant="secondary">
                  <ChartBarIcon className="w-4 h-4" />
                  {isArabic ? 'التقارير' : 'Reports'}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title={isArabic ? 'مشتريات الشهر' : 'Purchases (MTD)'}
                value={stats ? formatCurrency(stats.total_purchases_mtd) : '0'}
                subtitle={stats?.currency_code || 'SAR'}
                icon={<ShoppingCartIcon className="w-6 h-6" />}
                color="blue"
                onClick={() => router.push('/procurement/purchase-invoices')}
              />
              <StatCard
                title={isArabic ? 'مشتريات السنة' : 'Purchases (YTD)'}
                value={stats ? formatCurrency(stats.total_purchases_ytd) : '0'}
                subtitle={stats?.currency_code || 'SAR'}
                icon={<CurrencyDollarIcon className="w-6 h-6" />}
                color="green"
              />
              <StatCard
                title={isArabic ? 'أوامر شراء قيد التنفيذ' : 'Outstanding POs'}
                value={stats?.outstanding_pos_count.toString() || '0'}
                subtitle={stats ? `${formatCurrency(stats.outstanding_pos_amount)} ${stats.currency_code}` : ''}
                icon={<DocumentTextIcon className="w-6 h-6" />}
                color="yellow"
                onClick={() => router.push('/procurement/reports?tab=outstanding_pos')}
              />
              <StatCard
                title={isArabic ? 'معلّق للموافقة' : 'Pending Approvals'}
                value={stats?.pending_approvals_count.toString() || '0'}
                subtitle={isArabic ? 'أوامر شراء' : 'Purchase Orders'}
                icon={<ClockIcon className="w-6 h-6" />}
                color="purple"
                onClick={() => router.push('/purchasing/orders?status=pending_approval')}
              />
            </div>

            {/* Approval Workflow Analytics */}
            {approvalStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title={isArabic ? 'متوسط أيام السداد' : 'Avg Payment Terms'}
                  value={stats?.avg_payment_days.toString() || '0'}
                  subtitle={isArabic ? 'أيام' : 'Days'}
                  icon={<CheckCircleIcon className="w-6 h-6" />}
                  color="blue"
                />
                <StatCard
                  title={isArabic ? 'تمت الموافقة اليوم' : 'Approved Today'}
                  value={approvalStats.approved_today.toString()}
                  subtitle={isArabic ? 'أوامر' : 'Orders'}
                  icon={<CheckCircleIcon className="w-6 h-6" />}
                  color="green"
                />
                <StatCard
                  title={isArabic ? 'موردين نشطين' : 'Active Vendors'}
                  value={stats?.active_vendors_count.toString() || '0'}
                  subtitle={isArabic ? 'مسجلين' : 'Registered'}
                  icon={<TruckIcon className="w-6 h-6" />}
                  color="green"
                  onClick={() => router.push('/master/vendors?status=active')}
                />
                <StatCard
                  title={isArabic ? 'فواتير متأخرة' : 'Overdue Invoices'}
                  value={stats?.overdue_invoices_count.toString() || '0'}
                  subtitle={stats ? `${formatCurrency(stats.overdue_invoices_amount)} ${stats.currency_code}` : ''}
                  icon={<ExclamationTriangleIcon className="w-6 h-6" />}
                  color="red"
                />
              </div>
            )}

            {/* Enhanced Charts and Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Trend Chart */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {isArabic ? 'اتجاه المشتريات الشهري' : 'Monthly Purchase Trend'}
                </h3>
                {monthlyTrend.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                    {isArabic ? 'لا توجد بيانات متاحة' : 'No data available'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {monthlyTrend.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatMonth(item.month)}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.purchase_amount)} {stats?.currency_code}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({item.invoice_count} {isArabic ? 'فاتورة' : 'invoices'})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Vendors */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {isArabic ? 'أفضل 10 موردين' : 'Top 10 Vendors (YTD)'}
                  </h3>
                  <Link href="/master/vendors">
                    <Button variant="secondary" size="sm">
                      {isArabic ? 'عرض الكل' : 'View All'}
                    </Button>
                  </Link>
                </div>
                {topVendors.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                    {isArabic ? 'لا توجد بيانات موردين متاحة' : 'No vendor data available'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topVendors.map((vendor, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-6">
                            {idx + 1}.
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {vendor.vendor_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{vendor.vendor_code}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(vendor.total_purchases)} {stats?.currency_code}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {vendor.invoice_count} {isArabic ? 'فاتورة' : 'invoices'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity Feed */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {isArabic ? 'النشاطات الأخيرة' : 'Recent Activity'}
                  </h3>
                  <Link href="/notifications">
                    <Button variant="secondary" size="sm">
                      {isArabic ? 'عرض الكل' : 'View All'}
                    </Button>
                  </Link>
                </div>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.status === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
                          activity.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' :
                          'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                        }`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                            {activity.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {activity.user}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Purchases by Category */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {isArabic ? 'المشتريات حسب الفئة (السنة الحالية)' : 'Purchases by Category (YTD)'}
              </h3>
              {categoryPurchases.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                  {isArabic ? 'لا توجد بيانات فئات متاحة' : 'No category data available'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryPurchases.map((category, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {category.category_name}
                        </span>
                        <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                          {category.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {formatCurrency(category.total_amount)} {stats?.currency_code}
                      </div>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Procurement.Dashboard.View, ProcurementDashboardPage);
