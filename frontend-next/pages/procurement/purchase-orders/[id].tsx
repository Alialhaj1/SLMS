import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  DocumentCheckIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface POItem {
  id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  received_quantity: number;
  uom_code: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  po_date: string;
  vendor_id: number;
  vendor_code: string;
  vendor_name: string;
  vendor_email?: string;
  vendor_phone?: string;
  status: string;
  total_amount: number;
  currency_code: string;
  expected_delivery_date?: string;
  delivery_address?: string;
  notes?: string;
  approved_at?: string;
  approved_by_user_name?: string;
  created_at: string;
  created_by_user_name?: string;
  items: POItem[];
}

interface GoodsReceiptData {
  po_item_id: number;
  quantity_received: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  partially_received: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  fully_received: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function PurchaseOrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, number>>({});
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setOrder(result.data);
        // Initialize receive quantities with remaining quantities
        const initialQuantities: Record<number, number> = {};
        result.data.items.forEach((item: POItem) => {
          initialQuantities[item.id] = item.quantity - item.received_quantity;
        });
        setReceiveQuantities(initialQuantities);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
        router.push('/procurement/purchase-orders');
      } else {
        showToast('Failed to load purchase order', 'error');
      }
    } catch (error) {
      showToast('Failed to load purchase order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/purchase-orders/${order.id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        showToast('Purchase order approved successfully', 'success');
        fetchOrder();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to approve purchase order', 'error');
      }
    } catch (error) {
      showToast('Failed to approve purchase order', 'error');
    } finally {
      setActionLoading(false);
      setApproveConfirmOpen(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/purchase-orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        showToast('Purchase order cancelled successfully', 'success');
        fetchOrder();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to cancel purchase order', 'error');
      }
    } catch (error) {
      showToast('Failed to cancel purchase order', 'error');
    } finally {
      setActionLoading(false);
      setCancelConfirmOpen(false);
    }
  };

  const handleReceiveGoods = async () => {
    if (!order) return;

    // Build goods receipt items
    const items: GoodsReceiptData[] = [];
    Object.entries(receiveQuantities).forEach(([itemId, qty]) => {
      if (qty > 0) {
        items.push({ po_item_id: Number(itemId), quantity_received: qty });
      }
    });

    if (items.length === 0) {
      showToast('Please enter at least one quantity to receive', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/purchase-orders/${order.id}/receive`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        showToast('Goods received successfully', 'success');
        setReceiveModalOpen(false);
        fetchOrder();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to receive goods', 'error');
      }
    } catch (error) {
      showToast('Failed to receive goods', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + currency;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const canApprove = hasPermission('purchase_orders:approve') && order?.status === 'pending_approval';
  const canReceive = hasPermission('purchase_orders:receive') && (order?.status === 'approved' || order?.status === 'partially_received');
  const canCancel = hasPermission('purchase_orders:cancel') && ['draft', 'pending_approval', 'approved'].includes(order?.status || '');
  const canEdit = hasPermission('purchase_orders:edit') && order?.status === 'draft';

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-4">Loading purchase order...</p>
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <DocumentCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Purchase Order Not Found</h2>
          <Button onClick={() => router.push('/procurement/purchase-orders')} className="mt-4">
            Back to Purchase Orders
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{order.po_number} - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => router.push('/procurement/purchase-orders')}>
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{order.po_number}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Purchase Order Details</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <Button variant="secondary" onClick={() => router.push(`/procurement/purchase-orders/${order.id}/edit`)}>
                <PencilIcon className="w-5 h-5 mr-2" />
                Edit
              </Button>
            )}
            {canApprove && (
              <Button onClick={() => setApproveConfirmOpen(true)}>
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Approve
              </Button>
            )}
            {canReceive && (
              <Button onClick={() => setReceiveModalOpen(true)}>
                <TruckIcon className="w-5 h-5 mr-2" />
                Receive Goods
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" onClick={() => setCancelConfirmOpen(true)}>
                <XCircleIcon className="w-5 h-5 mr-2" />
                Cancel
              </Button>
            )}
            <Button variant="secondary">
              <PrinterIcon className="w-5 h-5 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              statusColors[order.status] || statusColors.draft
            }`}
          >
            {order.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
        </div>

        {/* Order Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">PO Number</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{order.po_number}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">PO Date</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatDate(order.po_date)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Expected Delivery</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created By</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {order.created_by_user_name || '—'}
                  <span className="text-gray-500 dark:text-gray-400 ml-2">on {formatDate(order.created_at)}</span>
                </dd>
              </div>
              {order.approved_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved By</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {order.approved_by_user_name || '—'}
                    <span className="text-gray-500 dark:text-gray-400 ml-2">on {formatDate(order.approved_at)}</span>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Vendor Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor Code</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{order.vendor_code}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor Name</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{order.vendor_name}</dd>
              </div>
              {order.vendor_email && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{order.vendor_email}</dd>
                </div>
              )}
              {order.vendor_phone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{order.vendor_phone}</dd>
                </div>
              )}
              {order.delivery_address && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivery Address</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{order.delivery_address}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Order Items */}
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 px-6 pt-6">Order Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Received</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remaining</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Discount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tax</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.item_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{item.item_code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {item.quantity} {item.uom_code}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {item.received_quantity} {item.uom_code}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {item.quantity - item.received_quantity} {item.uom_code}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.unit_price, order.currency_code)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.discount_amount, order.currency_code)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.tax_amount, order.currency_code)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.line_total, order.currency_code)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Total Amount:
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(order.total_amount, order.currency_code)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Notes</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Receive Goods Modal */}
      <Modal isOpen={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} title="Receive Goods" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter the quantities received for each item. Quantities cannot exceed the remaining quantities.
          </p>
          <div className="space-y-3">
            {order.items.map((item) => {
              const remaining = item.quantity - item.received_quantity;
              if (remaining <= 0) return null;
              return (
                <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.item_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.item_code} · Remaining: {remaining} {item.uom_code}
                    </div>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      step="0.01"
                      value={receiveQuantities[item.id] || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setReceiveQuantities((prev) => ({ ...prev, [item.id]: Math.min(val, remaining) }));
                      }}
                      className="input text-right"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setReceiveModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleReceiveGoods} loading={actionLoading}>
              Confirm Receipt
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={approveConfirmOpen}
        onClose={() => setApproveConfirmOpen(false)}
        onConfirm={handleApprove}
        title="Approve Purchase Order"
        message={`Are you sure you want to approve purchase order ${order.po_number}? This action will allow goods to be received against this order.`}
        confirmText="Approve"
        variant="primary"
        loading={actionLoading}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel purchase order ${order.po_number}? This action cannot be undone.`}
        confirmText="Cancel Order"
        variant="danger"
        loading={actionLoading}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Procurement.PurchaseOrders.View, PurchaseOrderDetailPage);
