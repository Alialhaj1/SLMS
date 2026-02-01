import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import { companyStore } from '../../../lib/companyStore';

interface Payment {
  id: number;
  payment_number: string;
  payment_date: string;
  vendor_id: number;
  vendor_name: string;
  payment_amount: string;
  allocated_amount: string;
  unallocated_amount: string;
  currency_code: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  status: string;
  is_posted: boolean;
  posted_at?: string;
  allocations: Allocation[];
  // Linked entities
  purchase_order_id?: number;
  purchase_order_number?: string;
  shipment_id?: number;
  shipment_number?: string;
  lc_id?: number;
  lc_number?: string;
  project_id?: number;
  project_code?: string;
  project_name?: string;
  bank_account_number?: string;
  bank_name?: string;
  // Transfer request
  transfer_request_id?: number;
  transfer_request_number?: string;
}

interface Allocation {
  id: number;
  invoice_id: number;
  invoice_number: string;
  allocated_amount: string;
  invoice_currency_amount: string;
  settlement_type: string;
  discount_amount?: string;
}

interface OutstandingInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: string;
  balance: string;
}

interface AllocationInput {
  invoice_id: number;
  invoice_number: string;
  balance: string;
  allocated_amount: string;
}

export default function PaymentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [confirmPostOpen, setConfirmPostOpen] = useState(false);

  // Allocation modal state
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [allocationInputs, setAllocationInputs] = useState<AllocationInput[]>([]);
  const [allocating, setAllocating] = useState(false);

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Check permissions - must be after all hooks
  const canView = hasPermission('procurement:payments:view');

  useEffect(() => {
    if (id && id !== 'new' && canView) {
      fetchPayment();
    }
  }, [id, canView]);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId() || 1;
      
      const response = await fetch(`http://localhost:4000/api/procurement/payments/${id}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId)
        }
      });

      if (!response.ok) throw new Error('Failed to fetch payment');

      const result = await response.json();
      setPayment(result.data);
    } catch (error) {
      console.error('Error fetching payment:', error);
      showToast('Failed to load payment details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostPayment = async () => {
    setPosting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId() || 1;
      
      const response = await fetch(`http://localhost:4000/api/procurement/payments/${id}/post`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Company-Id': String(companyId)
        }
      });

      if (!response.ok) throw new Error('Failed to post payment');

      showToast('Payment posted successfully', 'success');
      fetchPayment(); // Refresh data
    } catch (error) {
      console.error('Error posting payment:', error);
      showToast('Failed to post payment', 'error');
    } finally {
      setPosting(false);
      setConfirmPostOpen(false);
    }
  };

  const openAllocateModal = async () => {
    if (!payment) return;

    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId() || 1;
      
      const response = await fetch(
        `http://localhost:4000/api/procurement/payments/vendor/${payment.vendor_id}/outstanding-invoices`,
        { headers: { 
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId)
        } }
      );

      if (!response.ok) throw new Error('Failed to fetch outstanding invoices');

      const result = await response.json();
      setOutstandingInvoices(result.data || []);
      setAllocationInputs(
        result.data.map((inv: OutstandingInvoice) => ({
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          balance: inv.balance,
          allocated_amount: ''
        }))
      );
      setAllocateModalOpen(true);
    } catch (error) {
      console.error('Error fetching outstanding invoices:', error);
      showToast('Failed to load outstanding invoices', 'error');
    }
  };

  const handleAllocationChange = (invoice_id: number, value: string) => {
    setAllocationInputs(prev =>
      prev.map(input =>
        input.invoice_id === invoice_id
          ? { ...input, allocated_amount: value }
          : input
      )
    );
  };

  const calculateTotalAllocation = () => {
    return allocationInputs.reduce((sum, input) => {
      const amount = parseFloat(input.allocated_amount || '0');
      return sum + amount;
    }, 0);
  };

  const handleSubmitAllocations = async () => {
    if (!payment) return;

    // Validate
    const allocations = allocationInputs.filter(input => parseFloat(input.allocated_amount || '0') > 0);
    
    if (allocations.length === 0) {
      showToast('Please enter at least one allocation amount', 'error');
      return;
    }

    const total = calculateTotalAllocation();
    const unallocated = parseFloat(payment.unallocated_amount);

    if (total > unallocated) {
      showToast(`Total allocation (${total.toFixed(2)}) exceeds unallocated amount (${unallocated.toFixed(2)})`, 'error');
      return;
    }

    // Validate individual allocations
    for (const alloc of allocations) {
      const amount = parseFloat(alloc.allocated_amount);
      const balance = parseFloat(alloc.balance);
      if (amount > balance) {
        showToast(`Allocation for ${alloc.invoice_number} exceeds invoice balance`, 'error');
        return;
      }
    }

    setAllocating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId() || 1;
      
      const payload = {
        allocations: allocations.map(alloc => ({
          invoice_id: alloc.invoice_id,
          allocated_amount: parseFloat(alloc.allocated_amount),
          settlement_type: parseFloat(alloc.allocated_amount) >= parseFloat(alloc.balance) ? 'full' : 'partial'
        }))
      };

      const response = await fetch(`http://localhost:4000/api/procurement/payments/${id}/allocate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Company-Id': String(companyId)
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to allocate payment');
      }

      showToast('Payment allocated successfully', 'success');
      setAllocateModalOpen(false);
      fetchPayment(); // Refresh data
    } catch (error: any) {
      console.error('Error allocating payment:', error);
      showToast(error.message || 'Failed to allocate payment', 'error');
    } finally {
      setAllocating(false);
    }
  };

  // Permission check - after all hooks
  if (!canView) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Access denied</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!payment) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Payment not found</p>
        </div>
      </MainLayout>
    );
  }

  const unallocated = parseFloat(payment.unallocated_amount);
  const canAllocate = !payment.is_posted && unallocated > 0 && hasPermission('procurement:payments:allocate');
  const canPost = !payment.is_posted && hasPermission('procurement:payments:post');
  const canCreateTransfer = hasPermission('transfer_requests:create') && !payment.transfer_request_id;

  const handleCreateTransferRequest = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId() || 1;
      
      const response = await fetch('http://localhost:4000/api/transfer-requests/from-vendor-payment', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Company-Id': String(companyId)
        },
        body: JSON.stringify({
          vendor_payment_id: payment.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create transfer request');
      }

      const result = await response.json();
      showToast(`Transfer request ${result.request_number} created`, 'success');
      router.push(`/requests/transfer/${result.id}`);
    } catch (error: any) {
      console.error('Error creating transfer request:', error);
      showToast(error.message || 'Failed to create transfer request', 'error');
    }
  };

  const handleDeletePayment = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId() || 1;
      
      const response = await fetch(`http://localhost:4000/api/procurement/payments/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId)
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete payment');
      }

      showToast('Payment deleted successfully', 'success');
      router.push('/procurement/payments');
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || 'Failed to delete payment', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const canDelete = payment.status === 'draft' && !payment.is_posted && hasPermission('procurement:payments:delete');

  return (
    <MainLayout>
      <Head>
        <title>Payment {payment.payment_number} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{payment.payment_number}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Payment Details</p>
          </div>
          <div className="flex gap-2">
            {canCreateTransfer && (
              <Button
                variant="secondary"
                onClick={handleCreateTransferRequest}
                className="!bg-purple-100 hover:!bg-purple-200 dark:!bg-purple-900 dark:hover:!bg-purple-800 !text-purple-700 dark:!text-purple-300"
              >
                طلب تحويل
              </Button>
            )}
            {payment.transfer_request_id && (
              <Button
                variant="secondary"
                onClick={() => router.push(`/requests/transfer/${payment.transfer_request_id}`)}
                className="!bg-blue-100 hover:!bg-blue-200 dark:!bg-blue-900 dark:hover:!bg-blue-800 !text-blue-700 dark:!text-blue-300"
              >
                عرض طلب التحويل
              </Button>
            )}
            {canAllocate && (
              <Button onClick={openAllocateModal}>
                Allocate to Invoices
              </Button>
            )}
            {canPost && (
              <Button
                variant="primary"
                onClick={() => setConfirmPostOpen(true)}
              >
                Post Payment
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => router.push('/procurement/payments')}>
              Back to List
            </Button>
          </div>
        </div>

        {/* Payment Info */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Payment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Payment Number</p>
              <p className="font-medium text-gray-900 dark:text-white">{payment.payment_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(payment.payment_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vendor</p>
              <p className="font-medium text-gray-900 dark:text-white">{payment.vendor_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">{payment.payment_method.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reference Number</p>
              <p className="font-medium text-gray-900 dark:text-white">{payment.reference_number || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <p className="font-medium">
                {payment.is_posted ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Posted
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    Draft
                  </span>
                )}
              </p>
            </div>
          </div>
          {payment.notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
              <p className="font-medium text-gray-900 dark:text-white">{payment.notes}</p>
            </div>
          )}
        </Card>

        {/* Amounts Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">Payment Amount</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {parseFloat(payment.payment_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {payment.currency_code}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">Allocated Amount</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {parseFloat(payment.allocated_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {payment.currency_code}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">Unallocated Amount</p>
            <p className={`text-2xl font-bold ${unallocated > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {unallocated.toLocaleString(undefined, { minimumFractionDigits: 2 })} {payment.currency_code}
            </p>
          </Card>
        </div>

        {/* Linked Documents */}
        {(payment.purchase_order_number || payment.shipment_number || payment.lc_number || payment.project_code) && (
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">المستندات المرتبطة</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {payment.purchase_order_number && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400">أمر الشراء</p>
                  <p className="font-medium text-blue-900 dark:text-blue-300">{payment.purchase_order_number}</p>
                </div>
              )}
              {payment.shipment_number && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400">الشحنة</p>
                  <p className="font-medium text-green-900 dark:text-green-300">{payment.shipment_number}</p>
                </div>
              )}
              {payment.lc_number && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-purple-600 dark:text-purple-400">الاعتماد المستندي</p>
                  <p className="font-medium text-purple-900 dark:text-purple-300">{payment.lc_number}</p>
                </div>
              )}
              {payment.project_code && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">المشروع</p>
                  <p className="font-medium text-yellow-900 dark:text-yellow-300">{payment.project_code} - {payment.project_name}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Allocations Table */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Allocations</h2>
          {payment.allocations && payment.allocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Invoice Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Allocated Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Settlement Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {payment.allocations.map((alloc) => (
                    <tr key={alloc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {alloc.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {parseFloat(alloc.invoice_currency_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 capitalize">
                        {alloc.settlement_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No allocations yet</p>
          )}
        </Card>
      </div>

      {/* Post Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmPostOpen}
        onClose={() => setConfirmPostOpen(false)}
        onConfirm={handlePostPayment}
        title="Post Payment"
        message="Are you sure you want to post this payment? This will update invoice balances and cannot be undone."
        confirmText="Post Payment"
        variant="primary"
        loading={posting}
      />

      {/* Allocate Modal */}
      <Modal
        isOpen={allocateModalOpen}
        onClose={() => !allocating && setAllocateModalOpen(false)}
        title="Allocate Payment to Invoices"
        size="lg"
      >
        <div className="space-y-4">
          {outstandingInvoices.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No outstanding invoices found for this vendor</p>
          ) : (
            <>
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Unallocated Amount: <strong>{unallocated.toLocaleString(undefined, { minimumFractionDigits: 2 })} {payment.currency_code}</strong>
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Total Allocation: <strong>{calculateTotalAllocation().toLocaleString(undefined, { minimumFractionDigits: 2 })} {payment.currency_code}</strong>
                </p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allocationInputs.map((input, index) => {
                  const invoice = outstandingInvoices[index];
                  return (
                    <div key={input.invoice_id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {parseFloat(invoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <Input
                        label="Allocation Amount"
                        type="number"
                        step="0.01"
                        min="0"
                        max={invoice.balance}
                        value={input.allocated_amount}
                        onChange={(e) => handleAllocationChange(input.invoice_id, e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmitAllocations} loading={allocating}>
                  Submit Allocations
                </Button>
                <Button variant="secondary" onClick={() => setAllocateModalOpen(false)} disabled={allocating}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeletePayment}
        title="Delete Payment"
        message={`Are you sure you want to delete payment "${payment.payment_number}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}
