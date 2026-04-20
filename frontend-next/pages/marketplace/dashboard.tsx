import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import EnhancedTable from '../../components/ui/EnhancedTable';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/apiClient';
import {
  BuildingStorefrontIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface DashboardData {
  vendors: { total: number; active: number; pending: number };
  listings: { total: number; approved: number; pending_review: number };
  orders: { total: number; delivered: number; total_amount: number; total_commission: number };
  payouts: { total_payouts: number; pending_payouts: number };
}

const defaultData: DashboardData = {
  vendors: { total: 0, active: 0, pending: 0 },
  listings: { total: 0, approved: 0, pending_review: 0 },
  orders: { total: 0, delivered: 0, total_amount: 0, total_commission: 0 },
  payouts: { total_payouts: 0, pending_payouts: 0 },
};

export default function MarketplaceDashboard() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [data, setData] = useState<DashboardData>(defaultData);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.request<any>('/api/marketplace/admin/dashboard');
      if (res) setData({ ...defaultData, ...res });
    } catch {
      // Keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const statCards = [
    {
      label: isAr ? 'إجمالي البائعين' : 'Total Vendors',
      value: data.vendors.total,
      sub: isAr ? `${data.vendors.active} نشط · ${data.vendors.pending} معلق` : `${data.vendors.active} active · ${data.vendors.pending} pending`,
      icon: BuildingStorefrontIcon,
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      label: isAr ? 'المنتجات المعروضة' : 'Marketplace Listings',
      value: data.listings.total,
      sub: isAr ? `${data.listings.approved} مقبول · ${data.listings.pending_review} قيد المراجعة` : `${data.listings.approved} approved · ${data.listings.pending_review} pending`,
      icon: CubeIcon,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      label: isAr ? 'الإيرادات (30 يوم)' : 'Revenue (30d)',
      value: `$${Number(data.orders.total_amount || 0).toLocaleString()}`,
      sub: isAr ? `عمولة: $${Number(data.orders.total_commission || 0).toLocaleString()}` : `Commission: $${Number(data.orders.total_commission || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      label: isAr ? 'الطلبات (30 يوم)' : 'Orders (30d)',
      value: data.orders.total,
      sub: isAr ? `${data.orders.delivered} تم التوصيل` : `${data.orders.delivered} delivered`,
      icon: ShoppingBagIcon,
      gradient: 'from-rose-500 to-pink-500',
    },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'لوحة تحكم السوق' : 'Marketplace Dashboard'}</title></Head>
      <PageHeader
        title="Marketplace Dashboard"
        title_ar="لوحة تحكم السوق"
        description="Overview of marketplace performance and metrics."
        description_ar="نظرة عامة على أداء ومقاييس السوق."
        icon={ChartBarIcon}
        breadcrumbs={[
          { label: 'Marketplace', label_ar: 'السوق' },
          { label: 'Dashboard', label_ar: 'لوحة التحكم' },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.gradient} flex items-center justify-center`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : card.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {isAr ? 'إجراءات سريعة' : 'Quick Actions'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: isAr ? 'مراجعة البائعين' : 'Review Vendors', href: '/marketplace/vendors', icon: UserGroupIcon, count: data.vendors.pending },
              { label: isAr ? 'مراجعة المنتجات' : 'Review Listings', href: '/marketplace/listings', icon: CubeIcon, count: data.listings.pending_review },
              { label: isAr ? 'معالجة المدفوعات' : 'Process Payouts', href: '/marketplace/payouts', icon: BanknotesIcon, count: data.payouts.pending_payouts },
              { label: isAr ? 'إعدادات المنصة' : 'Platform Settings', href: '/marketplace/settings', icon: Cog6ToothIcon, count: 0 },
            ].map((action, i) => (
              <a key={i} href={action.href} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all">
                <action.icon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
                {action.count > 0 && (
                  <span className="ml-auto inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/20 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                    {action.count}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {isAr ? 'ملخص مالي' : 'Financial Summary'}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{isAr ? 'إجمالي المبيعات' : 'Total Sales'}</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">${Number(data.orders.total_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{isAr ? 'عمولة المنصة' : 'Platform Commission'}</span>
              <span className="text-lg font-bold text-emerald-600">${Number(data.orders.total_commission || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{isAr ? 'المدفوعات المعلقة' : 'Pending Payouts'}</span>
              <span className="text-lg font-bold text-amber-600">{data.payouts.pending_payouts}</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
