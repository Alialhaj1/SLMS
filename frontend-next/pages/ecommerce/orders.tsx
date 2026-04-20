import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
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
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  items_count: number;
  shipping_method: string;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

const orderStatusConfig: Record<string, { color: string; bgColor: string; icon: any; labelEn: string; labelAr: string }> = {
  pending: { color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800', icon: ClockIcon, labelEn: 'Pending', labelAr: 'قيد الانتظار' },
  confirmed: { color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800', icon: CheckCircleIcon, labelEn: 'Confirmed', labelAr: 'مؤكد' },
  processing: { color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800', icon: ArrowPathIcon, labelEn: 'Processing', labelAr: 'قيد التجهيز' },
  shipped: { color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800', icon: TruckIcon, labelEn: 'Shipped', labelAr: 'تم الشحن' },
  delivered: { color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800', icon: CheckCircleIcon, labelEn: 'Delivered', labelAr: 'تم التوصيل' },
  cancelled: { color: 'text-red-700', bgColor: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800', icon: XCircleIcon, labelEn: 'Cancelled', labelAr: 'ملغي' },
  refunded: { color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600', icon: BanknotesIcon, labelEn: 'Refunded', labelAr: 'مسترجع' },
};

const paymentStatusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const qp = new URLSearchParams({ page: String(currentPage), limit: String(pageSize) });
      if (searchQuery) qp.set('search', searchQuery);
      if (statusFilter !== 'all') qp.set('status', statusFilter);
      const res = await apiClient.get<any>(`/api/ecommerce/orders?${qp}`);
      setOrders(res?.data || []);
      setTotalItems(res?.pagination?.totalItems || 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      await apiClient.request(`/api/ecommerce/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      showToast('success', isAr ? 'تم تحديث حالة الطلب' : 'Order status updated');
      setSelectedOrder(null);
      fetchOrders();
    } catch {
      showToast('error', isAr ? 'فشل تحديث الحالة' : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const exportOrdersCsv = () => {
    if (!orders.length) return;
    const headers = ['Order #', 'Customer', 'Status', 'Payment', 'Total', 'Currency', 'Items', 'Date'];
    const rows = orders.map(o => [
      o.order_number,
      o.customer_name,
      o.status,
      o.payment_status,
      o.total_amount,
      o.currency || 'SAR',
      o.items_count,
      new Date(o.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const orderStats = [
    {
      label: isAr ? 'إجمالي الطلبات' : 'Total Orders',
      value: totalItems,
      icon: ShoppingBagIcon,
      gradient: 'from-indigo-500 to-blue-500',
      bgGlow: 'bg-indigo-500/10',
    },
    {
      label: isAr ? 'قيد الانتظار' : 'Pending',
      value: orders.filter(o => o.status === 'pending').length,
      icon: ClockIcon,
      gradient: 'from-amber-500 to-yellow-500',
      bgGlow: 'bg-amber-500/10',
    },
    {
      label: isAr ? 'قيد التجهيز' : 'Processing',
      value: orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length,
      icon: ArrowPathIcon,
      gradient: 'from-blue-500 to-cyan-500',
      bgGlow: 'bg-blue-500/10',
    },
    {
      label: isAr ? 'تم التوصيل' : 'Delivered',
      value: orders.filter(o => o.status === 'delivered').length,
      icon: CheckCircleIcon,
      gradient: 'from-emerald-500 to-teal-500',
      bgGlow: 'bg-emerald-500/10',
    },
  ];

  const columns = [
    {
      key: 'order_number',
      label: 'Order #',
      label_ar: 'رقم الطلب',
      sortable: true,
      render: (val: string) => (
        <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">#{val}</span>
      ),
    },
    {
      key: 'customer_name',
      label: 'Customer',
      label_ar: 'العميل',
      sortable: true,
      render: (_: any, row: Order) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.customer_name}</p>
          <p className="text-xs text-gray-500 truncate max-w-[180px]">{row.customer_email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      label_ar: 'الحالة',
      render: (val: string) => {
        const config = orderStatusConfig[val] || orderStatusConfig.pending;
        const StatusIcon = config.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${config.bgColor} ${config.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {isAr ? config.labelAr : config.labelEn}
          </span>
        );
      },
    },
    {
      key: 'payment_status',
      label: 'Payment',
      label_ar: 'الدفع',
      render: (val: string) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatusColors[val] || paymentStatusColors.pending}`}>
          {val === 'paid' ? (isAr ? 'مدفوع' : 'Paid') : val === 'pending' ? (isAr ? 'معلق' : 'Pending') : val === 'failed' ? (isAr ? 'فشل' : 'Failed') : (isAr ? 'مسترجع' : 'Refunded')}
        </span>
      ),
    },
    {
      key: 'items_count',
      label: 'Items',
      label_ar: 'العناصر',
      align: 'center' as const,
      render: (val: number) => (
        <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <CubeIcon className="h-4 w-4" /> {val}
        </span>
      ),
    },
    {
      key: 'total_amount',
      label: 'Total',
      label_ar: 'الإجمالي',
      sortable: true,
      render: (_: any, row: Order) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {Number(row.total_amount || 0).toFixed(2)} <span className="text-xs font-normal text-gray-500">{row.currency}</span>
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      label_ar: 'التاريخ',
      sortable: true,
      render: (val: string) => (
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(val).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
          <p className="text-xs text-gray-500">{new Date(val).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      ),
    },
  ];

  const rowActions = [
    {
      id: 'view',
      label: isAr ? 'عرض' : 'View Details',
      icon: EyeIcon,
      onClick: (row: Order) => setSelectedOrder(row),
    },
    {
      id: 'print',
      label: isAr ? 'طباعة' : 'Print',
      icon: PrinterIcon,
      onClick: (row: Order) => {
        setSelectedOrder(row);
        setTimeout(() => window.print(), 300);
      },
    },
  ];

  const statusFilters = [
    { key: 'all', label: isAr ? 'الكل' : 'All' },
    { key: 'pending', label: isAr ? 'قيد الانتظار' : 'Pending' },
    { key: 'confirmed', label: isAr ? 'مؤكد' : 'Confirmed' },
    { key: 'processing', label: isAr ? 'قيد التجهيز' : 'Processing' },
    { key: 'shipped', label: isAr ? 'تم الشحن' : 'Shipped' },
    { key: 'delivered', label: isAr ? 'تم التوصيل' : 'Delivered' },
    { key: 'cancelled', label: isAr ? 'ملغي' : 'Cancelled' },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'إدارة الطلبات' : 'Order Management'} - SLMS</title></Head>
      <div className="space-y-6 p-1">
        <PageHeader
          title="Order Management"
          title_ar="إدارة الطلبات"
          description="Track and manage online store orders"
          description_ar="تتبع وإدارة طلبات المتجر الإلكتروني"
          icon={ShoppingBagIcon}
          breadcrumbs={[
            { label: 'E-Commerce', label_ar: 'المتجر الإلكتروني', href: '/ecommerce/settings' },
            { label: 'Orders', label_ar: 'الطلبات' },
          ]}
          actions={[
            {
              id: 'export',
              label: 'Export',
              label_ar: 'تصدير',
              icon: ArrowDownTrayIcon,
              onClick: () => exportOrdersCsv(),
              variant: 'secondary',
            },
          ]}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {orderStats.map((stat, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
              <div className={`absolute inset-0 ${stat.bgGlow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={`rounded-2xl bg-gradient-to-br ${stat.gradient} p-3 shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(f => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  statusFilter === f.key
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالرقم أو العميل...' : 'Search by order # or customer...'}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white w-72"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <EnhancedTable
            data={orders}
            columns={columns}
            loading={loading}
            rowKey="id"
            actions={rowActions}
            emptyMessage={isAr ? 'لا توجد طلبات' : 'No orders found'}
            pagination={{ page: currentPage, pageSize, total: totalItems }}
            onPaginationChange={(p) => { setCurrentPage(p.page); if (p.pageSize !== pageSize) setPageSize(p.pageSize); }}
          />
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {isAr ? 'تفاصيل الطلب' : 'Order Details'} <span className="text-indigo-500">#{selectedOrder.order_number}</span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{new Date(selectedOrder.created_at).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 mb-1">{isAr ? 'العميل' : 'Customer'}</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.customer_name}</p>
                  <p className="text-xs text-gray-500">{selectedOrder.customer_email}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 mb-1">{isAr ? 'الإجمالي' : 'Total'}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(selectedOrder.total_amount || 0).toFixed(2)} <span className="text-sm font-normal text-gray-500">{selectedOrder.currency}</span></p>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{isAr ? 'تحديث الحالة' : 'Update Status'}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(orderStatusConfig).map(([key, config]) => {
                    const StatusIcon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => updateOrderStatus(selectedOrder.id, key)}
                        disabled={updatingStatus || selectedOrder.status === key}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                          selectedOrder.status === key
                            ? `${config.bgColor} ${config.color} ring-2 ring-offset-1`
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {isAr ? config.labelAr : config.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
