import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface InvoiceItem {
  id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  uom_code: string;
  // Three-way matching fields
  po_quantity?: number;
  po_unit_price?: number;
  gr_quantity?: number;
}

interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  vendor_id: number;
  vendor_code: string;
  vendor_name: string;
  vendor_invoice_number?: string;
  vendor_invoice_date?: string;
  purchase_order_id?: number;
  po_number?: string;
  goods_receipt_id?: number;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  freight_amount: number;
  total_amount: number;
  balance: number;
  currency_code: string;
  is_posted?: boolean;
  posted_at?: string;
  notes?: string;
  created_at: string;
  created_by_user_name?: string;
  items: InvoiceItem[];
}

interface MatchingVariance {
  item_name: string;
  variance_type: 'quantity' | 'price';
  invoice_value: number;
  po_value?: number;
  gr_value?: number;
  variance_percent: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  posted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  partially_paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function PurchaseInvoiceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();

  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [variances, setVariances] = useState<MatchingVariance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [postConfirmOpen, setPostConfirmOpen] = useState(false);
  const [showVarianceOverride, setShowVarianceOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setInvoice(result.data);
        
        // Calculate matching variances if linked to PO/GR
        if (result.data.purchase_order_id || result.data.goods_receipt_id) {
          calculateMatchingVariances(result.data.items);
        }
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
        router.push('/procurement/purchase-invoices');
      } else {
        showToast('Failed to load purchase invoice', 'error');
      }
    } catch (error) {
      showToast('Failed to load purchase invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchingVariances = (items: InvoiceItem[]) => {
    const detectedVariances: MatchingVariance[] = [];
    const VARIANCE_THRESHOLD = 5; // 5% threshold

    items.forEach((item) => {
      // Quantity variance (Invoice vs GR)
      if (item.gr_quantity && item.quantity !== item.gr_quantity) {
        const variancePercent = Math.abs((item.quantity - item.gr_quantity) / item.gr_quantity * 100);
        if (variancePercent > VARIANCE_THRESHOLD) {
          detectedVariances.push({
            item_name: item.item_name,
            variance_type: 'quantity',
            invoice_value: item.quantity,
            gr_value: item.gr_quantity,
            variance_percent: variancePercent,
          });
        }
      }

      // Price variance (Invoice vs PO)
      if (item.po_unit_price && item.unit_price !== item.po_unit_price) {
        const variancePercent = Math.abs((item.unit_price - item.po_unit_price) / item.po_unit_price * 100);
        if (variancePercent > VARIANCE_THRESHOLD) {
          detectedVariances.push({
            item_name: item.item_name,
            variance_type: 'price',
            invoice_value: item.unit_price,
            po_value: item.po_unit_price,
            variance_percent: variancePercent,
          });
        }
      }
    });

    setVariances(detectedVariances);
  };

  const handlePost = async (forcePost: boolean = false) => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const payload: any = {};
      if (forcePost && overrideReason) {
        payload.force_post = true;
        payload.matching_override_reason = overrideReason;
      }

      const res = await fetch(`http://localhost:4000/api/procurement/invoices/${invoice.id}/post`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Invoice posted successfully to GL', 'success');
        setPostConfirmOpen(false);
        setShowVarianceOverride(false);
        fetchInvoice();
      } else {
        const error = await res.json();
        if (error.error?.code === 'MATCHING_VARIANCE') {
          setShowVarianceOverride(true);
          showToast('Invoice has matching variances requiring approval', 'warning');
        } else {
          showToast(error.error?.message || 'Failed to post invoice', 'error');
        }
      }
    } catch (error) {
      showToast('Failed to post invoice', 'error');
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

  const canPost = hasPermission('purchase_invoices:post') && invoice?.status === 'approved' && !invoice.is_posted;
  const canEdit = hasPermission('purchase_invoices:edit') && invoice?.status === 'draft';

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-4">Loading purchase invoice...</p>
        </div>
      </MainLayout>
    );
  }

  if (!invoice) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <DocumentCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Purchase Invoice Not Found</h2>
          <Button onClick={() => router.push('/procurement/purchase-invoices')} className="mt-4">
            Back to Purchase Invoices
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{invoice.invoice_number} - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => router.push('/procurement/purchase-invoices')}>
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{invoice.invoice_number}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Purchase Invoice Details</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <Button variant="secondary" onClick={() => router.push(`/procurement/purchase-invoices/${invoice.id}/edit`)}>
                <PencilIcon className="w-5 h-5 mr-2" />
                Edit
              </Button>
            )}
            {canPost && (
              <Button onClick={() => setPostConfirmOpen(true)}>
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Post to GL
              </Button>
            )}
            <Button variant="secondary">
              <PrinterIcon className="w-5 h-5 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Status & Warnings */}
        <div className="space-y-3">
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              statusColors[invoice.status] || statusColors.draft
            }`}
          >
            {invoice.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            {invoice.is_posted && <CheckCircleIcon className="w-4 h-4" />}
          </span>

          {/* Three-Way Matching Variances */}
          {variances.length > 0 && (
            <div className="card border-2 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">Three-Way Matching Variances Detected</h3>
                  <ul className="mt-2 space-y-1">
                    {variances.map((variance, idx) => (
                      <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>{variance.item_name}</strong>: {variance.variance_type === 'quantity' ? 'Quantity' : 'Price'} variance {variance.variance_percent.toFixed(1)}%
                        {variance.variance_type === 'quantity' ? (
                          <> (Invoice: {variance.invoice_value}, GR: {variance.gr_value})</>
                        ) : (
                          <> (Invoice: {variance.invoice_value}, PO: {variance.po_value})</>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                    These variances exceed the 5% threshold. Posting requires management approval.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Invoice Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoice Number</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{invoice.invoice_number}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoice Date</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatDate(invoice.invoice_date)}</dd>
              </div>
              {invoice.due_date && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatDate(invoice.due_date)}</dd>
                </div>
              )}
              {invoice.vendor_invoice_number && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor Invoice #</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{invoice.vendor_invoice_number}</dd>
                </div>
              )}
              {invoice.po_number && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Linked PO</dt>
                  <dd className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                    <button onClick={() => router.push(`/procurement/purchase-orders/${invoice.purchase_order_id}`)}>
                      {invoice.po_number}
                    </button>
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
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{invoice.vendor_code}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor Name</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{invoice.vendor_name}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 px-6 pt-6">Invoice Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                  {invoice.purchase_order_id && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PO Qty</th>}
                  {invoice.goods_receipt_id && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">GR Qty</th>}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit Price</th>
                  {invoice.purchase_order_id && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PO Price</th>}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Discount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tax</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {invoice.items.map((item) => (
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
                    {invoice.purchase_order_id && (
                      <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                        {item.po_quantity || '—'}
                      </td>
                    )}
                    {invoice.goods_receipt_id && (
                      <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                        {item.gr_quantity || '—'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.unit_price, invoice.currency_code)}
                    </td>
                    {invoice.purchase_order_id && (
                      <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                        {item.po_unit_price ? formatCurrency(item.po_unit_price, invoice.currency_code) : '—'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.discount_amount, invoice.currency_code)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.tax_amount, invoice.currency_code)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.line_total, invoice.currency_code)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <td colSpan={invoice.purchase_order_id && invoice.goods_receipt_id ? 9 : (invoice.purchase_order_id || invoice.goods_receipt_id ? 8 : 7)} className="px-6 py-3 text-right">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(invoice.subtotal, invoice.currency_code)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">-{formatCurrency(invoice.discount_amount, invoice.currency_code)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(invoice.tax_amount, invoice.currency_code)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Freight:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(invoice.freight_amount, invoice.currency_code)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-gray-300 dark:border-gray-600 pt-1">
                        <span className="text-gray-900 dark:text-gray-100">Total Amount:</span>
                        <span className="text-gray-900 dark:text-gray-100">{formatCurrency(invoice.total_amount, invoice.currency_code)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold">
                        <span className={invoice.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>Balance Due:</span>
                        <span className={invoice.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>{formatCurrency(invoice.balance, invoice.currency_code)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Notes</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Post Confirmation */}
      <ConfirmDialog
        isOpen={postConfirmOpen && !showVarianceOverride}
        onClose={() => setPostConfirmOpen(false)}
        onConfirm={() => handlePost(false)}
        title="Post Invoice to General Ledger"
        message={`Are you sure you want to post invoice ${invoice.invoice_number}? This will create journal entries and update vendor balance. This action cannot be undone.`}
        confirmText="Post to GL"
        variant="primary"
        loading={actionLoading}
      />

      {/* Variance Override Dialog */}
      {showVarianceOverride && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => {
            setShowVarianceOverride(false);
            setPostConfirmOpen(false);
            setOverrideReason('');
          }}
          onConfirm={() => handlePost(true)}
          title="Override Matching Variances"
          message={
            <div className="space-y-3">
              <p>This invoice has matching variances that exceed the 5% threshold. To proceed with posting, please provide a reason for override:</p>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Enter reason for override (required)"
                className="input w-full h-24 resize-none"
              />
            </div>
          }
          confirmText="Override & Post"
          variant="danger"
          loading={actionLoading}
        />
      )}
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Procurement.PurchaseInvoices.View, PurchaseInvoiceDetailPage);
