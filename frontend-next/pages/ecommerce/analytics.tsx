import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import apiClient from '../../lib/apiClient';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  CubeIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  revenue: { total: number; change: number; data: number[] };
  orders: { total: number; change: number; data: number[] };
  customers: { total: number; change: number; newCustomers: number };
  avgOrderValue: { total: number; change: number };
  conversionRate: { total: number; change: number };
  pageViews: { total: number; change: number };
  topProducts: { name: string; name_ar: string; sales: number; revenue: number }[];
  topCategories: { name: string; name_ar: string; sales: number; pct: number }[];
  recentOrders: { id: string; customer: string; amount: number; status: string; date: string }[];
  trafficSources: { source: string; visits: number; pct: number }[];
  deviceBreakdown: { device: string; pct: number }[];
}

const defaultData: AnalyticsData = {
  revenue: { total: 0, change: 0, data: [] },
  orders: { total: 0, change: 0, data: [] },
  customers: { total: 0, change: 0, newCustomers: 0 },
  avgOrderValue: { total: 0, change: 0 },
  conversionRate: { total: 0, change: 0 },
  pageViews: { total: 0, change: 0 },
  topProducts: [],
  topCategories: [],
  recentOrders: [],
  trafficSources: [],
  deviceBreakdown: [],
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === 'ar';

  const [data, setData] = useState<AnalyticsData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.request<any>(`/api/ecommerce/analytics?period=${period}`);
      if (res) setData({ ...defaultData, ...res });
    } catch {
      // Keep defaults
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const periods = [
    { key: '7d', label: isAr ? '7 أيام' : '7 Days' },
    { key: '30d', label: isAr ? '30 يوم' : '30 Days' },
    { key: '90d', label: isAr ? '90 يوم' : '90 Days' },
    { key: '1y', label: isAr ? 'سنة' : '1 Year' },
  ];

  const TrendBadge = ({ change }: { change: number }) => (
    <span className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-bold ${
      change >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    }`}>
      {change >= 0 ? <ArrowTrendingUpIcon className="h-3.5 w-3.5" /> : <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
      {Math.abs(change)}%
    </span>
  );

  const MiniChart = ({ data: chartData, color }: { data: number[]; color: string }) => {
    if (!chartData || chartData.length === 0) return null;
    const max = Math.max(...chartData, 1);
    const h = 40;
    const w = 120;
    const points = chartData.map((v, i) => `${(i / (chartData.length - 1)) * w},${h - (v / max) * h}`).join(' ');
    return (
      <svg width={w} height={h} className="opacity-60">
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    );
  };

  const mainStats = [
    {
      label: isAr ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: `${data.revenue.total.toLocaleString()} SAR`,
      change: data.revenue.change,
      icon: CurrencyDollarIcon,
      gradient: 'from-emerald-500 to-teal-500',
      bgGlow: 'bg-emerald-500/10',
      chartColor: '#10b981',
      chartData: data.revenue.data,
    },
    {
      label: isAr ? 'إجمالي الطلبات' : 'Total Orders',
      value: data.orders.total.toLocaleString(),
      change: data.orders.change,
      icon: ShoppingBagIcon,
      gradient: 'from-blue-500 to-indigo-500',
      bgGlow: 'bg-blue-500/10',
      chartColor: '#3b82f6',
      chartData: data.orders.data,
    },
    {
      label: isAr ? 'العملاء' : 'Customers',
      value: data.customers.total.toLocaleString(),
      change: data.customers.change,
      icon: UserGroupIcon,
      gradient: 'from-purple-500 to-violet-500',
      bgGlow: 'bg-purple-500/10',
      chartColor: '#8b5cf6',
      chartData: [],
    },
    {
      label: isAr ? 'متوسط قيمة الطلب' : 'Avg Order Value',
      value: `${data.avgOrderValue.total.toFixed(0)} SAR`,
      change: data.avgOrderValue.change,
      icon: ChartBarIcon,
      gradient: 'from-amber-500 to-orange-500',
      bgGlow: 'bg-amber-500/10',
      chartColor: '#f59e0b',
      chartData: [],
    },
  ];

  const secondaryStats = [
    {
      label: isAr ? 'معدل التحويل' : 'Conversion Rate',
      value: `${data.conversionRate.total.toFixed(1)}%`,
      change: data.conversionRate.change,
      icon: ArrowTrendingUpIcon,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: isAr ? 'مشاهدات الصفحة' : 'Page Views',
      value: data.pageViews.total.toLocaleString(),
      change: data.pageViews.change,
      icon: EyeIcon,
      color: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      label: isAr ? 'عملاء جدد' : 'New Customers',
      value: data.customers.newCustomers.toLocaleString(),
      change: 0,
      icon: UserGroupIcon,
      color: 'text-violet-600 dark:text-violet-400',
    },
  ];

  const orderStatusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-gray-500 animate-pulse">{isAr ? 'جارٍ تحميل التحليلات...' : 'Loading analytics...'}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{isAr ? 'تحليلات المتجر' : 'Store Analytics'} - SLMS</title></Head>
      <div className="space-y-6 p-1">
        <PageHeader
          title="Store Analytics"
          title_ar="تحليلات المتجر"
          description="Monitor your store performance and key metrics"
          description_ar="متابعة أداء متجرك والمؤشرات الرئيسية"
          icon={ChartBarIcon}
          breadcrumbs={[
            { label: 'E-Commerce', label_ar: 'المتجر الإلكتروني', href: '/ecommerce/settings' },
            { label: 'Analytics', label_ar: 'التحليلات' },
          ]}
          actions={[
            {
              id: 'refresh',
              label: 'Refresh',
              label_ar: 'تحديث',
              icon: ArrowPathIcon,
              onClick: fetchAnalytics,
              variant: 'secondary',
            },
          ]}
        />

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                period === p.key
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Main Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mainStats.map((stat, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
              <div className={`absolute inset-0 ${stat.bgGlow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`rounded-2xl bg-gradient-to-br ${stat.gradient} p-2.5 shadow-lg`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <TrendBadge change={stat.change} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  {stat.chartData.length > 0 && <MiniChart data={stat.chartData} color={stat.chartColor} />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {secondaryStats.map((stat, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div className="flex-1">
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              {stat.change !== 0 && <TrendBadge change={stat.change} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Top Products */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CubeIcon className="h-5 w-5 text-indigo-500" />
              {isAr ? 'أفضل المنتجات' : 'Top Products'}
            </h3>
            {data.topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{isAr ? 'لا توجد بيانات' : 'No data available'}</p>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((product, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all duration-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-700/30">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-md ${
                      i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                      i === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                      i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                      'bg-gradient-to-br from-gray-300 to-gray-400'
                    }`}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{isAr ? product.name_ar : product.name}</p>
                      <p className="text-xs text-gray-500">{product.sales} {isAr ? 'مبيعات' : 'sales'}</p>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">{product.revenue.toLocaleString()} <span className="text-xs font-normal text-gray-500">SAR</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Traffic & Device */}
          <div className="space-y-6">
            {/* Traffic Sources */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <GlobeAltIcon className="h-5 w-5 text-blue-500" />
                {isAr ? 'مصادر الزيارات' : 'Traffic Sources'}
              </h3>
              {data.trafficSources.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">{isAr ? 'لا توجد بيانات' : 'No data'}</p>
              ) : (
                <div className="space-y-3">
                  {data.trafficSources.map((source, i) => {
                    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500'];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{source.source}</span>
                          <span className="text-xs font-bold text-gray-500">{source.pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                          <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-700`} style={{ width: `${source.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Device Breakdown */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DevicePhoneMobileIcon className="h-5 w-5 text-purple-500" />
                {isAr ? 'الأجهزة' : 'Devices'}
              </h3>
              {data.deviceBreakdown.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">{isAr ? 'لا توجد بيانات' : 'No data'}</p>
              ) : (
                <div className="flex items-center justify-center gap-6">
                  {data.deviceBreakdown.map((d, i) => {
                    const icons = [ComputerDesktopIcon, DevicePhoneMobileIcon, GlobeAltIcon];
                    const colors = ['text-blue-500', 'text-purple-500', 'text-emerald-500'];
                    const Icon = icons[i % icons.length];
                    return (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className="relative h-16 w-16">
                          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200 dark:text-gray-600" />
                            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${d.pct} ${100 - d.pct}`} className={colors[i % colors.length]} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon className={`h-5 w-5 ${colors[i % colors.length]}`} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{d.device}</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{d.pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{isAr ? 'أفضل الفئات' : 'Top Categories'}</h3>
          {data.topCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{isAr ? 'لا توجد بيانات متاحة' : 'No data available yet'}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.topCategories.map((cat, i) => {
                const gradients = [
                  'from-blue-500 to-indigo-500',
                  'from-emerald-500 to-teal-500',
                  'from-purple-500 to-pink-500',
                  'from-amber-500 to-orange-500',
                ];
                return (
                  <div key={i} className="group relative overflow-hidden rounded-2xl p-5 text-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]}`} />
                    <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/10" />
                    <div className="relative">
                      <p className="text-sm font-medium text-white/80">{isAr ? cat.name_ar : cat.name}</p>
                      <p className="mt-1 text-2xl font-bold">{cat.sales}</p>
                      <p className="text-xs text-white/70">{isAr ? 'مبيعات' : 'sales'} · {cat.pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{isAr ? 'آخر الطلبات' : 'Recent Orders'}</h3>
          {data.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{isAr ? 'لا توجد طلبات حديثة' : 'No recent orders'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">{isAr ? 'الطلب' : 'Order'}</th>
                    <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="pb-3 text-left font-semibold text-gray-500 text-xs uppercase">{isAr ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {data.recentOrders.map((order, i) => (
                    <tr key={i} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">#{order.id}</td>
                      <td className="py-3 font-medium text-gray-900 dark:text-white">{order.customer}</td>
                      <td className="py-3 font-bold text-gray-900 dark:text-white">{order.amount.toLocaleString()} SAR</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${orderStatusColors[order.status] || orderStatusColors.pending}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">{new Date(order.date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
