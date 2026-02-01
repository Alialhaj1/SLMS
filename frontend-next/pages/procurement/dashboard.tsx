import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import StatCard from '../../components/dashboard/StatCard';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  ShoppingCartIcon,
  DocumentTextIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CheckCircleIcon,
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

function ProcurementDashboardPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [categoryPurchases, setCategoryPurchases] = useState<CategoryPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch stats
      const statsRes = await fetch('http://localhost:4000/api/procurement/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const result = await statsRes.json();
        setStats(result.data);
      }

      // Fetch monthly trend
      const trendRes = await fetch('http://localhost:4000/api/procurement/dashboard/monthly-trend', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (trendRes.ok) {
        const result = await trendRes.json();
        setMonthlyTrend(result.data || []);
      }

      // Fetch top vendors
      const vendorsRes = await fetch('http://localhost:4000/api/procurement/dashboard/top-vendors?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (vendorsRes.ok) {
        const result = await vendorsRes.json();
        setTopVendors(result.data || []);
      }

      // Fetch category purchases
      const categoriesRes = await fetch('http://localhost:4000/api/procurement/dashboard/purchases-by-category', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (categoriesRes.ok) {
        const result = await categoriesRes.json();
        setCategoryPurchases(result.data || []);
      }
    } catch (error) {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
        <title>Procurement Dashboard - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Procurement Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of procurement activities and key performance indicators
          </p>
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
                title="Purchases (MTD)"
                value={stats ? formatCurrency(stats.total_purchases_mtd) : '0'}
                subtitle={stats?.currency_code || 'SAR'}
                icon={<ShoppingCartIcon className="w-6 h-6" />}
                color="blue"
                onClick={() => router.push('/procurement/purchase-invoices')}
              />
              <StatCard
                title="Purchases (YTD)"
                value={stats ? formatCurrency(stats.total_purchases_ytd) : '0'}
                subtitle={stats?.currency_code || 'SAR'}
                icon={<CurrencyDollarIcon className="w-6 h-6" />}
                color="green"
              />
              <StatCard
                title="Outstanding POs"
                value={stats?.outstanding_pos_count.toString() || '0'}
                subtitle={stats ? `${formatCurrency(stats.outstanding_pos_amount)} ${stats.currency_code}` : ''}
                icon={<DocumentTextIcon className="w-6 h-6" />}
                color="yellow"
                onClick={() => router.push('/procurement/reports?tab=outstanding_pos')}
              />
              <StatCard
                title="Pending Approvals"
                value={stats?.pending_approvals_count.toString() || '0'}
                subtitle="Purchase Orders"
                icon={<ClockIcon className="w-6 h-6" />}
                color="purple"
                onClick={() => router.push('/procurement/purchase-orders?status=pending_approval')}
              />
              <StatCard
                title="Avg Payment Terms"
                value={stats?.avg_payment_days.toString() || '0'}
                subtitle="Days"
                icon={<CheckCircleIcon className="w-6 h-6" />}
                color="blue"
              />
              <StatCard
                title="Active Vendors"
                value={stats?.active_vendors_count.toString() || '0'}
                subtitle="Registered"
                icon={<TruckIcon className="w-6 h-6" />}
                color="green"
                onClick={() => router.push('/master/vendors?status=active')}
              />
              <StatCard
                title="Overdue Invoices"
                value={stats?.overdue_invoices_count.toString() || '0'}
                subtitle={stats ? `${formatCurrency(stats.overdue_invoices_amount)} ${stats.currency_code}` : ''}
                icon={<DocumentTextIcon className="w-6 h-6" />}
                color="red"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend Chart (Placeholder) */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Purchase Trend</h3>
                {monthlyTrend.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                    No data available
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
                            ({item.invoice_count} invoices)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
                  Chart visualization coming soon (Recharts/Chart.js integration)
                </p>
              </div>

              {/* Top Vendors */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top 10 Vendors (YTD)</h3>
                {topVendors.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                    No vendor data available
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
                            {vendor.invoice_count} invoices
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
                  Bar chart visualization coming soon
                </p>
              </div>
            </div>

            {/* Purchases by Category */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Purchases by Category (YTD)</h3>
              {categoryPurchases.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                  No category data available
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
                Pie/Donut chart visualization coming soon
              </p>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Procurement.Dashboard.View, ProcurementDashboardPage);
