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
  ShoppingBagIcon,
  EyeIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Order {
  id: number;
  order_number: string;
  customer_email: string;
  customer_name: string;
  status: string;
  total_amount: number;
  platform_fee: number;
  vendor_count: number;
  sub_orders: { id: number; vendor_id: number; vendor_name: string; status: string; subtotal: number }[];
  created_at: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', label: 'Pending', labelAr: 'معلق' },
  processing: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', label: 'Processing', labelAr: 'قيد المعالجة' },
  partially_shipped: { bg: 'bg-indigo-100 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', label: 'Partially Shipped', labelAr: 'شحن جزئي' },
  shipped: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', label: 'Shipped', labelAr: 'تم الشحن' },
  delivered: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', label: 'Delivered', labelAr: 'تم التوصيل' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', label: 'Cancelled', labelAr: 'ملغي' },
  refunded: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', label: 'Refunded', labelAr: 'مسترد' },
};

export default function MarketplaceOrdersPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.request<any>(`/api/marketplace/admin/orders?${params.toString()}`);
      setOrders(res?.orders || []);
      setTotal(res?.total || 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const statCards = [
    { label: isAr ? 'إجمالي الطلبات' : 'Total Orders', value: total, icon: ShoppingBagIcon, gradient: 'from-indigo-500 to-purple-500' },
    { label: isAr ? 'قيد المعالجة' : 'Processing', value: orders.filter(o => o.status === 'processing').length, icon: ArrowPathIcon, gradient: 'from-blue-500 to-cyan-500' },
    { label: isAr ? 'تم الشحن' : 'Shipped', value: orders.filter(o => o.status === 'shipped').length, icon: TruckIcon, gradient: 'from-amber-500 to-orange-500' },
    { label: isAr ? 'تم التوصيل' : 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: CheckCircleIcon, gradient: 'from-emerald-500 to-teal-500' },
  ];

  const columns = [
    {
      key: 'order_number', label: 'Order', label_ar: 'رقم الطلب', sortable: true,
      render: (o: Order) => (
        <div>
          <div className="font-mono font-medium text-gray-900 dark:text-white">{o.order_number}</div>
          <div className="text-xs text-gray-400">{o.customer_name}</div>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status', label_ar: 'الحالة',
      render: (o: Order) => {
        const s = statusConfig[o.status] || statusConfig.pending;
        return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>{isAr ? s.labelAr : s.label}</span>;
      },
    },
    {
      key: 'vendor_count', label: 'Vendors', label_ar: 'البائعين',
      render: (o: Order) => (
        <span className="inline-flex items-center gap-1 text-sm">
          <BuildingStorefrontIcon className="h-4 w-4 text-gray-400" />
          {o.vendor_count}
        </span>
      ),
    },
    {
      key: 'total_amount', label: 'Total', label_ar: 'المجموع', sortable: true,
      render: (o: Order) => <span className="font-mono text-sm font-medium">${Number(o.total_amount || 0).toFixed(2)}</span>,
    },
    {
      key: 'platform_fee', label: 'Platform Fee', label_ar: 'رسوم المنصة',
      render: (o: Order) => <span className="font-mono text-sm text-emerald-600">${Number(o.platform_fee || 0).toFixed(2)}</span>,
    },
    {
      key: 'created_at', label: 'Date', label_ar: 'التاريخ', sortable: true,
      render: (o: Order) => <span className="text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString()}</span>,
    },
  ];

  const tableActions = [
    { id: 'view', label: isAr ? 'عرض التفاصيل' : 'View Details', icon: EyeIcon, onClick: (o: Order) => setDetailOrder(o) },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'طلبات السوق' : 'Marketplace Orders'}</title></Head>
      <PageHeader
        title="Marketplace Orders"
        title_ar="طلبات السوق"
        description="View and manage marketplace orders with multi-vendor split orders."
        description_ar="عرض وإدارة طلبات السوق مع الطلبات المقسمة متعددة البائعين."
        icon={ShoppingBagIcon}
        breadcrumbs={[
          { label: 'Marketplace', label_ar: 'السوق', href: '/marketplace/dashboard' },
          { label: 'Orders', label_ar: 'الطلبات' },
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
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === s
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-indigo-500'
            }`}>
            {s === '' ? (isAr ? 'الكل' : 'All') : (statusConfig[s]?.[isAr ? 'labelAr' : 'label'] || s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <EnhancedTable
          data={orders}
          columns={columns}
          actions={tableActions}
          loading={loading}
          pagination={{ page, total, pageSize: 20 }}
          onPaginationChange={(p) => setPage(p.page)}
          emptyMessage={isAr ? 'لا يوجد طلبات' : 'No orders found'}
        />
      </div>

      {/* Order Detail Modal — shows split sub-orders */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{detailOrder.order_number}</h3>
                <p className="text-sm text-gray-500">{detailOrder.customer_email}</p>
              </div>
              <button onClick={() => setDetailOrder(null)} className="text-gray-400 hover:text-gray-600"><XCircleIcon className="h-6 w-6" /></button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">{isAr ? 'المجموع' : 'Total'}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">${Number(detailOrder.total_amount || 0).toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">{isAr ? 'رسوم المنصة' : 'Platform Fee'}</div>
                <div className="text-lg font-bold text-emerald-600">${Number(detailOrder.platform_fee || 0).toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">{isAr ? 'البائعين' : 'Vendors'}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{detailOrder.vendor_count}</div>
              </div>
            </div>

            {/* Sub-Orders */}
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{isAr ? 'الطلبات الفرعية' : 'Vendor Sub-Orders'}</h4>
            <div className="space-y-3">
              {(detailOrder.sub_orders || []).map((sub, i) => {
                const s = statusConfig[sub.status] || statusConfig.pending;
                return (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{sub.vendor_name}</div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
                          {isAr ? s.labelAr : s.label}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono text-sm font-medium">${Number(sub.subtotal || 0).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={() => setDetailOrder(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
