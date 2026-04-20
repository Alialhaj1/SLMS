import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import EnhancedTable from '../../components/ui/EnhancedTable';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import { vendorApi, isVendorAccessError, getVendorErrorMessage } from '../../lib/marketplaceApi';
import {
  ShoppingBagIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const ORDER_STATUS_CONFIG: Record<string, { label: string; labelAr: string; color: string }> = {
  pending: { label: 'Pending', labelAr: 'معلق', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', labelAr: 'مؤكد', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing', labelAr: 'قيد التجهيز', color: 'bg-indigo-100 text-indigo-800' },
  shipped: { label: 'Shipped', labelAr: 'تم الشحن', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Delivered', labelAr: 'تم التسليم', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', labelAr: 'مسترجع', color: 'bg-gray-100 text-gray-700' },
};

export default function VendorOrders() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await vendorApi.getOrders(params);
      setOrders(res?.data || res?.orders || []);
      setTotal(res?.pagination?.total || 0);
    } catch (err: any) {
      if (isVendorAccessError(err)) {
        setVendorError(getVendorErrorMessage(err, isAr));
      } else {
        showToast(isAr ? 'فشل تحميل الطلبات' : 'Failed to load orders', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, isAr, showToast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openDetail = async (order: any) => {
    try {
      setDetailLoading(true);
      setDetailOrder(order);
      const res = await vendorApi.getOrder(order.id);
      setDetailOrder(res?.data || res);
      setUpdateStatus(res?.data?.status || order.status || '');
      setTrackingNumber(res?.data?.tracking_number || '');
    } catch {
      showToast(isAr ? 'فشل تحميل التفاصيل' : 'Failed to load details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!detailOrder) return;
    try {
      setUpdating(true);
      const body: any = { status: updateStatus };
      if (trackingNumber) body.trackingNumber = trackingNumber;
      await vendorApi.updateOrderStatus(detailOrder.id, body);
      showToast(isAr ? 'تم تحديث الطلب' : 'Order updated', 'success');
      setDetailOrder(null);
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل التحديث' : 'Failed to update'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  const statusFilters = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  const columns = [
    {
      key: 'order_number',
      label: isAr ? 'رقم الطلب' : 'Order #',
      render: (row: any) => (
        <div>
          <p className="font-mono font-bold text-sm">{row.order_number || `#${row.id}`}</p>
          <p className="text-xs text-gray-400">{new Date(row.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      label: isAr ? 'العميل' : 'Customer',
      render: (row: any) => (
        <span className="text-sm">{row.customer_name || row.customer_email || '—'}</span>
      ),
    },
    {
      key: 'items',
      label: isAr ? 'المنتجات' : 'Items',
      render: (row: any) => (
        <span className="text-sm font-mono">{row.item_count || row.items_count || '—'}</span>
      ),
    },
    {
      key: 'vendor_subtotal',
      label: isAr ? 'المبلغ' : 'Amount',
      render: (row: any) => (
        <div>
          <span className="font-mono font-bold">{parseFloat(row.vendor_subtotal || row.subtotal || 0).toLocaleString()}</span>
          {row.commission_amount && (
            <p className="text-xs text-gray-400">
              {isAr ? 'عمولة:' : 'Commission:'} {parseFloat(row.commission_amount).toLocaleString()}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: isAr ? 'الحالة' : 'Status',
      render: (row: any) => {
        const cfg = ORDER_STATUS_CONFIG[row.status] || { label: row.status, labelAr: row.status, color: 'bg-gray-100' };
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
            {isAr ? cfg.labelAr : cfg.label}
          </span>
        );
      },
    },
    {
      key: 'settlement',
      label: isAr ? 'التسوية' : 'Settlement',
      render: (row: any) => {
        const s = row.settlement_status || 'unsettled';
        const colors: Record<string, string> = { settled: 'text-green-600', pending: 'text-yellow-600', unsettled: 'text-gray-400' };
        return <span className={`text-xs font-medium ${colors[s] || 'text-gray-400'}`}>{s}</span>;
      },
    },
    {
      key: 'actions',
      label: isAr ? 'إجراءات' : 'Actions',
      render: (row: any) => (
        <button onClick={() => openDetail(row)}
          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600" title={isAr ? 'تفاصيل' : 'Details'}>
          <EyeIcon className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'طلباتي — البائع' : 'My Orders — Vendor'}</title></Head>
      {vendorError ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{isAr ? 'غير مسموح' : 'Access Denied'}</h2>
            <p className="text-gray-600 dark:text-gray-400">{vendorError}</p>
          </div>
        </div>
      ) : (
      <>
      <PageHeader
        title="Manage Orders"
        title_ar="إدارة الطلبات"
        description="View and update your customer orders"
        description_ar="عرض وتحديث طلبات العملاء الخاصة بك"
        icon={ShoppingBagIcon}
        breadcrumbs={[
          { label: 'Vendor', label_ar: 'البائع', href: '/vendor/dashboard' },
          { label: 'Orders', label_ar: 'الطلبات' },
        ]}
      />

      <div className="p-6 space-y-4">
        {/* Status Filters */}
        <div className="flex gap-1 flex-wrap">
          {statusFilters.map((f) => (
            <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${statusFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'all' ? (isAr ? 'الكل' : 'All') :
                (isAr ? (ORDER_STATUS_CONFIG[f]?.labelAr || f) : (ORDER_STATUS_CONFIG[f]?.label || f))}
            </button>
          ))}
        </div>

        <EnhancedTable
          columns={columns}
          data={orders}
          loading={loading}
          emptyMessage={isAr ? 'لا توجد طلبات' : 'No orders found'}
          pagination={{ page, total, pageSize: 20 }}
          onPaginationChange={(p) => setPage(p.page)}
        />
      </div>

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isAr ? 'تفاصيل الطلب' : 'Order Details'} — {detailOrder.order_number || `#${detailOrder.id}`}
              </h3>
              <button onClick={() => setDetailOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>
            ) : (
              <div className="space-y-4">
                {/* Items list */}
                {detailOrder.items?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{isAr ? 'المنتجات' : 'Items'}</h4>
                    <div className="divide-y border rounded-lg">
                      {detailOrder.items.map((item: any, i: number) => (
                        <div key={i} className="p-3 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{isAr ? (item.name_ar || item.name) : item.name}</p>
                            <p className="text-xs text-gray-400">x{item.quantity}</p>
                          </div>
                          <span className="font-mono">{parseFloat(item.total || item.line_total || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Update Status */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'تحديث الحالة' : 'Update Status'}</label>
                    <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm">
                      {Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{isAr ? v.labelAr : v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'رقم التتبع' : 'Tracking Number'}</label>
                    <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={isAr ? 'أدخل رقم التتبع (اختياري)' : 'Enter tracking number (optional)'} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setDetailOrder(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{isAr ? 'إغلاق' : 'Close'}</button>
                  <button onClick={handleUpdateOrder} disabled={updating}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {updating ? (isAr ? 'جاري التحديث...' : 'Updating...') : (isAr ? 'تحديث' : 'Update')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </MainLayout>
  );
}
