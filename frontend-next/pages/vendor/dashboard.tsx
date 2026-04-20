import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import { vendorApi, isVendorAccessError, getVendorErrorMessage } from '../../lib/marketplaceApi';
import {
  ChartBarIcon,
  CubeIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface VendorStats {
  profile: any;
  stats: {
    totalListings: number; activeListings: number; pendingListings: number;
    totalOrders: number; pendingOrders: number; processingOrders: number;
    shippedOrders: number; deliveredOrders: number;
    revenue30d: number; revenue7d: number;
    availableBalance: number; pendingBalance: number;
  };
  recentOrders: any[];
}

const defaultStats: VendorStats = {
  profile: null,
  stats: {
    totalListings: 0, activeListings: 0, pendingListings: 0,
    totalOrders: 0, pendingOrders: 0, processingOrders: 0,
    shippedOrders: 0, deliveredOrders: 0,
    revenue30d: 0, revenue7d: 0,
    availableBalance: 0, pendingBalance: 0,
  },
  recentOrders: [],
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [data, setData] = useState<VendorStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [vendorError, setVendorError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setVendorError(null);
      const [profileRes, statsRes] = await Promise.all([
        vendorApi.getProfile(),
        vendorApi.getStats(),
      ]);
      setData({
        profile: profileRes,
        stats: statsRes?.stats || defaultStats.stats,
        recentOrders: statsRes?.recentOrders || [],
      });
    } catch (err: any) {
      if (isVendorAccessError(err)) {
        setVendorError(getVendorErrorMessage(err, isAr));
      } else {
        setVendorError(isAr ? 'فشل تحميل بيانات البائع' : 'Failed to load vendor data');
      }
    } finally {
      setLoading(false);
    }
  }, [isAr, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data.stats;

  const statCards = [
    { title: isAr ? 'إجمالي المنتجات' : 'Total Listings', value: s.totalListings, sub: `${s.activeListings} ${isAr ? 'نشط' : 'active'} · ${s.pendingListings} ${isAr ? 'معلق' : 'pending'}`, icon: CubeIcon, gradient: 'from-blue-500 to-cyan-500' },
    { title: isAr ? 'إجمالي الطلبات' : 'Total Orders', value: s.totalOrders, sub: `${s.deliveredOrders} ${isAr ? 'تم التوصيل' : 'delivered'}`, icon: ShoppingBagIcon, gradient: 'from-purple-500 to-indigo-500' },
    { title: isAr ? 'الإيرادات (30 يوم)' : 'Revenue (30d)', value: `${s.revenue30d?.toLocaleString()} SAR`, sub: `7d: ${s.revenue7d?.toLocaleString()} SAR`, icon: ArrowTrendingUpIcon, gradient: 'from-green-500 to-teal-500' },
    { title: isAr ? 'الرصيد المتاح' : 'Available Balance', value: `${s.availableBalance?.toLocaleString()} SAR`, sub: `${isAr ? 'معلق' : 'Pending'}: ${s.pendingBalance?.toLocaleString()} SAR`, icon: BanknotesIcon, gradient: 'from-amber-500 to-orange-500' },
  ];

  const quickLinks = [
    { label: isAr ? 'إدارة المنتجات' : 'Manage Listings', href: '/vendor/products', icon: CubeIcon, count: s.pendingListings },
    { label: isAr ? 'الطلبات الجديدة' : 'New Orders', href: '/vendor/orders', icon: ShoppingBagIcon, count: s.pendingOrders },
    { label: isAr ? 'المحفظة والمعاملات' : 'Wallet & Payouts', href: '/vendor/wallet', icon: CurrencyDollarIcon, count: null },
    { label: isAr ? 'الإعدادات' : 'Settings', href: '/vendor/settings', icon: ChartBarIcon, count: null },
  ];

  const orderStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  if (vendorError) {
    return (
      <MainLayout>
        <Head><title>{isAr ? 'لوحة تحكم البائع' : 'Vendor Dashboard'}</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{isAr ? 'غير مسموح' : 'Access Denied'}</h2>
            <p className="text-gray-600">{vendorError}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{isAr ? 'لوحة تحكم البائع' : 'Vendor Dashboard'}</title></Head>
      <PageHeader
        title="Vendor Dashboard"
        title_ar="لوحة تحكم البائع"
        description={data.profile ? data.profile.vendor_name : ''}
        description_ar={data.profile ? (data.profile.vendor_name_ar || data.profile.vendor_name) : ''}
        icon={ChartBarIcon}
        breadcrumbs={[
          { label: 'Vendor', label_ar: 'البائع' },
          { label: 'Dashboard', label_ar: 'لوحة التحكم' },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{loading ? '...' : card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{loading ? '' : card.sub}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient}`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions + Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">{isAr ? 'إجراءات سريعة' : 'Quick Actions'}</h3>
            <div className="space-y-3">
              {quickLinks.map((link, i) => (
                <a key={i} href={link.href}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <link.icon className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </div>
                  {link.count !== null && link.count > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{link.count}</span>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">{isAr ? 'أحدث الطلبات' : 'Recent Orders'}</h3>
            {data.recentOrders.length === 0 ? (
              <p className="text-gray-400 text-center py-8">{isAr ? 'لا توجد طلبات بعد' : 'No orders yet'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b">
                      <th className="text-start pb-2">{isAr ? 'الطلب' : 'Order'}</th>
                      <th className="text-start pb-2">{isAr ? 'العميل' : 'Customer'}</th>
                      <th className="text-start pb-2">{isAr ? 'المبلغ' : 'Amount'}</th>
                      <th className="text-start pb-2">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="text-start pb-2">{isAr ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.slice(0, 5).map((order: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 font-mono text-indigo-600">#{order.sub_order_number || order.order_number}</td>
                        <td className="py-2">{order.customer_name || '—'}</td>
                        <td className="py-2 font-mono">{parseFloat(order.total || 0).toLocaleString()} SAR</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${orderStatusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleDateString(locale) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">{isAr ? 'ملخص حالة الطلبات' : 'Order Status Summary'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: isAr ? 'معلق' : 'Pending', value: s.pendingOrders, icon: ClockIcon, color: 'text-yellow-600' },
              { label: isAr ? 'قيد التجهيز' : 'Processing', value: s.processingOrders, icon: CubeIcon, color: 'text-indigo-600' },
              { label: isAr ? 'تم الشحن' : 'Shipped', value: s.shippedOrders, icon: TruckIcon, color: 'text-purple-600' },
              { label: isAr ? 'تم التوصيل' : 'Delivered', value: s.deliveredOrders, icon: CheckCircleIcon, color: 'text-green-600' },
              { label: isAr ? 'إجمالي' : 'Total', value: s.totalOrders, icon: ShoppingBagIcon, color: 'text-gray-700' },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 rounded-lg border border-gray-100">
                <item.icon className={`w-8 h-8 mx-auto ${item.color}`} />
                <p className="text-2xl font-bold mt-2">{loading ? '...' : item.value}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
