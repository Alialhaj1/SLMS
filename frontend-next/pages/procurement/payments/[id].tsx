import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import { useLocale } from '../../../contexts/LocaleContext';
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
  bank_account_name?: string;
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

interface Project {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

export default function PaymentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  let isArabic = false;
  try { const localeCtx = useLocale(); isArabic = localeCtx?.locale === 'ar'; } catch {}

  const getHeaders = (json = false) => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId() || 1;
    const h: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'X-Company-Id': String(companyId)
    };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  };

  const fmt = (amount: string | number, currency?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formatted = num.toLocaleString(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency ? `${formatted} ${currency}` : formatted;
  };

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [confirmPostOpen, setConfirmPostOpen] = useState(false);

  // Allocation modal state
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [allocationInputs, setAllocationInputs] = useState<AllocationInput[]>([]);
  const [allocating, setAllocating] = useState(false);

  // Transfer request form modal
  const [trModalOpen, setTrModalOpen] = useState(false);
  const [trForm, setTrForm] = useState({
    project_id: '',
    beneficiary_name: '',
    beneficiary_account: '',
    beneficiary_bank: '',
    beneficiary_iban: '',
    swift_code: '',
    transfer_method: 'bank_transfer',
    expected_transfer_date: '',
    notes: ''
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [creatingTransfer, setCreatingTransfer] = useState(false);

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
      const response = await fetch(`/api/procurement/payments/${id}`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Failed to fetch payment');
      const result = await response.json();
      setPayment(result.data);
    } catch (error) {
      console.error('Error fetching payment:', error);
      showToast(isArabic ? 'فشل في تحميل تفاصيل الدفعة' : 'Failed to load payment details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostPayment = async () => {
    setPosting(true);
    try {
      const response = await fetch(`/api/procurement/payments/${id}/post`, {
        method: 'POST',
        headers: getHeaders(true)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to post payment');
      }
      showToast(isArabic ? 'تم ترحيل الدفعة بنجاح' : 'Payment posted successfully', 'success');
      fetchPayment();
    } catch (error: any) {
      console.error('Error posting payment:', error);
      showToast(error.message || (isArabic ? 'فشل في ترحيل الدفعة' : 'Failed to post payment'), 'error');
    } finally {
      setPosting(false);
      setConfirmPostOpen(false);
    }
  };

  const openAllocateModal = async () => {
    if (!payment) return;
    try {
      const response = await fetch(
        `/api/procurement/payments/vendor/${payment.vendor_id}/outstanding-invoices`,
        { headers: getHeaders() }
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
      showToast(isArabic ? 'فشل في تحميل الفواتير المستحقة' : 'Failed to load outstanding invoices', 'error');
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
      const payload = {
        allocations: allocations.map(alloc => ({
          invoice_id: alloc.invoice_id,
          allocated_amount: parseFloat(alloc.allocated_amount),
          settlement_type: parseFloat(alloc.allocated_amount) >= parseFloat(alloc.balance) ? 'full' : 'partial'
        }))
      };

      const response = await fetch(`/api/procurement/payments/${id}/allocate`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to allocate payment');
      }

      showToast(isArabic ? 'تم تخصيص الدفعة بنجاح' : 'Payment allocated successfully', 'success');
      setAllocateModalOpen(false);
      fetchPayment();
    } catch (error: any) {
      console.error('Error allocating payment:', error);
      showToast(error.message || (isArabic ? 'فشل في تخصيص الدفعة' : 'Failed to allocate payment'), 'error');
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

  // Open transfer request form with pre-filled data
  const handleCreateTransferRequest = async () => {
    if (!payment) return;
    // Pre-fill form from payment data
    setTrForm({
      project_id: payment.project_id ? String(payment.project_id) : '',
      beneficiary_name: '',
      beneficiary_account: '',
      beneficiary_bank: payment.bank_name || '',
      beneficiary_iban: '',
      swift_code: '',
      transfer_method: payment.payment_method === 'check' ? 'cheque' : (payment.payment_method === 'wire_transfer' ? 'bank_transfer' : (payment.payment_method || 'bank_transfer')),
      expected_transfer_date: '',
      notes: payment.notes || ''
    });
    // Load projects if not yet loaded
    if (projects.length === 0) {
      setLoadingProjects(true);
      try {
        const response = await fetch('/api/projects?status=active&limit=200', { headers: getHeaders() });
        if (response.ok) {
          const result = await response.json();
          setProjects(result.data || []);
        }
      } catch {}
      setLoadingProjects(false);
    }
    // Try to fetch vendor bank info to pre-fill beneficiary
    try {
      const response = await fetch(`/api/procurement/vendors/${payment.vendor_id}/bank-accounts`, { headers: getHeaders() });
      if (response.ok) {
        const result = await response.json();
        const bankAccounts = result.data || [];
        const defaultBank = bankAccounts.find((b: any) => b.is_default) || bankAccounts[0];
        if (defaultBank) {
          setTrForm(prev => ({
            ...prev,
            beneficiary_name: defaultBank.account_name || payment.vendor_name,
            beneficiary_account: defaultBank.account_number || '',
            beneficiary_bank: defaultBank.bank_name || prev.beneficiary_bank,
            beneficiary_iban: defaultBank.iban || '',
            swift_code: defaultBank.swift_code || ''
          }));
        } else {
          setTrForm(prev => ({ ...prev, beneficiary_name: payment.vendor_name }));
        }
      } else {
        setTrForm(prev => ({ ...prev, beneficiary_name: payment.vendor_name }));
      }
    } catch {
      setTrForm(prev => ({ ...prev, beneficiary_name: payment.vendor_name }));
    }
    setTrModalOpen(true);
  };

  const handleSubmitTransferRequest = async () => {
    if (!payment) return;
    if (!trForm.project_id && !payment.project_id) {
      showToast(isArabic ? 'الرجاء اختيار المشروع' : 'Please select a project', 'error');
      return;
    }
    setCreatingTransfer(true);
    try {
      const body: any = {
        vendor_payment_id: payment.id,
        transfer_method: trForm.transfer_method,
        notes: trForm.notes || undefined
      };
      if (trForm.project_id) body.project_id = parseInt(trForm.project_id);
      if (trForm.beneficiary_name) body.beneficiary_name = trForm.beneficiary_name;
      if (trForm.beneficiary_account) body.beneficiary_account = trForm.beneficiary_account;
      if (trForm.beneficiary_bank) body.beneficiary_bank = trForm.beneficiary_bank;
      if (trForm.beneficiary_iban) body.beneficiary_iban = trForm.beneficiary_iban;
      if (trForm.swift_code) body.swift_code = trForm.swift_code;
      if (trForm.expected_transfer_date) body.expected_transfer_date = trForm.expected_transfer_date;

      const response = await fetch('/api/transfer-requests/from-vendor-payment', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create transfer request');
      }

      const result = await response.json();
      showToast(
        isArabic ? `تم إنشاء طلب التحويل ${result.request_number}` : `Transfer request ${result.request_number} created`,
        'success'
      );
      setTrModalOpen(false);
      router.push(`/requests/transfer/${result.id}`);
    } catch (error: any) {
      console.error('Error creating transfer request:', error);
      showToast(error.message || (isArabic ? 'فشل في إنشاء طلب التحويل' : 'Failed to create transfer request'), 'error');
    } finally {
      setCreatingTransfer(false);
    }
  };

  const handleDeletePayment = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/procurement/payments/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete payment');
      }

      showToast(isArabic ? 'تم حذف الدفعة بنجاح' : 'Payment deleted successfully', 'success');
      router.push('/procurement/payments');
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || (isArabic ? 'فشل في حذف الدفعة' : 'Failed to delete payment'), 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const canDelete = payment.status === 'draft' && !payment.is_posted && hasPermission('procurement:payments:delete');

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'دفعة' : 'Payment'} {payment.payment_number} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/procurement/payments')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition" title={isArabic ? 'رجوع' : 'Back'}>
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{payment.payment_number}</h1>
                {payment.is_posted ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700">● {isArabic ? 'مرحّل' : 'Posted'}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-600">○ {isArabic ? 'مسودة' : 'Draft'}</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {payment.vendor_name} • {new Date(payment.payment_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateTransfer && (
              <Button variant="secondary" onClick={handleCreateTransferRequest} loading={creatingTransfer}
                className="!bg-purple-50 hover:!bg-purple-100 dark:!bg-purple-900/30 dark:hover:!bg-purple-900/50 !text-purple-700 dark:!text-purple-300 !border-purple-200 dark:!border-purple-700">
                ↗ {isArabic ? 'طلب تحويل' : 'Transfer Request'}
              </Button>
            )}
            {payment.transfer_request_id && (
              <Button variant="secondary" onClick={() => router.push(`/requests/transfer/${payment.transfer_request_id}`)}
                className="!bg-blue-50 hover:!bg-blue-100 dark:!bg-blue-900/30 dark:hover:!bg-blue-900/50 !text-blue-700 dark:!text-blue-300 !border-blue-200 dark:!border-blue-700">
                ↗ {isArabic ? 'عرض طلب التحويل' : 'View Transfer'}
              </Button>
            )}
            {canAllocate && (
              <Button onClick={openAllocateModal} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25">
                {isArabic ? 'تخصيص للفواتير' : 'Allocate to Invoices'}
              </Button>
            )}
            {canPost && (
              <Button variant="primary" onClick={() => setConfirmPostOpen(true)} className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-green-500/25">
                ✓ {isArabic ? 'ترحيل الدفعة' : 'Post Payment'}
              </Button>
            )}
            {hasPermission('procurement:payments:edit') && payment.status === 'draft' && !payment.is_posted && (
              <Button variant="secondary" onClick={() => router.push(`/procurement/payments/${id}/edit`)}>
                ✏️ {isArabic ? 'تعديل' : 'Edit'}
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
                🗑 {isArabic ? 'حذف' : 'Delete'}
              </Button>
            )}
          </div>
        </div>

        {/* Amount Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg p-5 text-white">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10"></div>
            <p className="text-blue-100 text-sm">{isArabic ? 'مبلغ الدفعة' : 'Payment Amount'}</p>
            <p className="text-2xl font-bold mt-1">{fmt(payment.payment_amount)}</p>
            <p className="text-blue-100 text-xs mt-1">{payment.currency_code} • {payment.payment_method.replace('_', ' ')}</p>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg p-5 text-white">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10"></div>
            <p className="text-emerald-100 text-sm">{isArabic ? 'المبلغ المخصص' : 'Allocated'}</p>
            <p className="text-2xl font-bold mt-1">{fmt(payment.allocated_amount)}</p>
            {parseFloat(payment.payment_amount) > 0 && (
              <div className="mt-2">
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <div className="bg-white h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.round((parseFloat(payment.allocated_amount) / parseFloat(payment.payment_amount)) * 100))}%` }}></div>
                </div>
                <p className="text-emerald-100 text-xs mt-1">{Math.round((parseFloat(payment.allocated_amount) / parseFloat(payment.payment_amount)) * 100)}%</p>
              </div>
            )}
          </div>
          <div className={`relative overflow-hidden rounded-xl shadow-lg p-5 text-white ${unallocated > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10"></div>
            <p className={`text-sm ${unallocated > 0 ? 'text-amber-100' : 'text-gray-200'}`}>{isArabic ? 'غير مخصص' : 'Unallocated'}</p>
            <p className="text-2xl font-bold mt-1">{fmt(payment.unallocated_amount)}</p>
            {unallocated > 0 && canAllocate && (
              <button onClick={openAllocateModal} className="mt-2 text-xs text-white/80 hover:text-white underline">
                {isArabic ? 'تخصيص الآن →' : 'Allocate now →'}
              </button>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{isArabic ? 'معلومات الدفعة' : 'Payment Information'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'رقم الدفعة' : 'Payment #'}</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{payment.payment_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'التاريخ' : 'Date'}</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{new Date(payment.payment_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'المورد' : 'Vendor'}</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{payment.vendor_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'طريقة الدفع' : 'Payment Method'}</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5 capitalize">{payment.payment_method.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'العملة' : 'Currency'}</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{payment.currency_code}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'الرقم المرجعي' : 'Reference'}</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{payment.reference_number || '—'}</p>
            </div>
            {payment.bank_name && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'البنك' : 'Bank'}</p>
                <p className="font-medium text-gray-900 dark:text-white mt-0.5">{payment.bank_name}</p>
              </div>
            )}
            {payment.bank_account_name && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'اسم المستفيد' : 'Beneficiary'}</p>
                <p className="font-medium text-gray-900 dark:text-white mt-0.5">{payment.bank_account_name}</p>
              </div>
            )}
            {payment.bank_account_number && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'رقم الحساب' : 'Account No.'}</p>
                <p className="font-medium text-gray-900 dark:text-white mt-0.5">{payment.bank_account_number}</p>
              </div>
            )}
            {payment.posted_at && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{isArabic ? 'تاريخ الترحيل' : 'Posted At'}</p>
                <p className="font-medium text-gray-900 dark:text-white mt-0.5">{new Date(payment.posted_at).toLocaleString(isArabic ? 'ar-SA' : 'en-US')}</p>
              </div>
            )}
          </div>
          {payment.notes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{isArabic ? 'ملاحظات' : 'Notes'}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{payment.notes}</p>
            </div>
          )}
        </div>

        {/* Linked Documents */}
        {(payment.purchase_order_number || payment.shipment_number || payment.lc_number || payment.project_code || payment.transfer_request_number) && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{isArabic ? 'المستندات المرتبطة' : 'Linked Documents'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {payment.purchase_order_number && (
                <button onClick={() => payment.purchase_order_id && router.push(`/procurement/purchase-orders/${payment.purchase_order_id}`)}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-md transition text-left group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-500">📋</span>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">{isArabic ? 'أمر الشراء' : 'Purchase Order'}</p>
                  </div>
                  <p className="font-semibold text-blue-900 dark:text-blue-300 group-hover:underline">{payment.purchase_order_number}</p>
                </button>
              )}
              {payment.shipment_number && (
                <button onClick={() => payment.shipment_id && router.push(`/procurement/shipments/${payment.shipment_id}`)}
                  className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 hover:shadow-md transition text-left group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-purple-500">🚢</span>
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">{isArabic ? 'الشحنة' : 'Shipment'}</p>
                  </div>
                  <p className="font-semibold text-purple-900 dark:text-purple-300 group-hover:underline">{payment.shipment_number}</p>
                </button>
              )}
              {payment.lc_number && (
                <button onClick={() => payment.lc_id && router.push(`/procurement/lcs/${payment.lc_id}`)}
                  className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:shadow-md transition text-left group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-indigo-500">🏦</span>
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase">{isArabic ? 'الاعتماد المستندي' : 'Letter of Credit'}</p>
                  </div>
                  <p className="font-semibold text-indigo-900 dark:text-indigo-300 group-hover:underline">{payment.lc_number}</p>
                </button>
              )}
              {payment.project_code && (
                <button onClick={() => payment.project_id && router.push(`/projects/${payment.project_id}`)}
                  className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 hover:shadow-md transition text-left group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-500">📁</span>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">{isArabic ? 'المشروع' : 'Project'}</p>
                  </div>
                  <p className="font-semibold text-amber-900 dark:text-amber-300 group-hover:underline">{payment.project_code}</p>
                  {payment.project_name && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{payment.project_name}</p>}
                </button>
              )}
              {payment.transfer_request_number && (
                <button onClick={() => payment.transfer_request_id && router.push(`/requests/transfer/${payment.transfer_request_id}`)}
                  className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800 hover:shadow-md transition text-left group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-teal-500">↗️</span>
                    <p className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase">{isArabic ? 'طلب التحويل' : 'Transfer Request'}</p>
                  </div>
                  <p className="font-semibold text-teal-900 dark:text-teal-300 group-hover:underline">{payment.transfer_request_number}</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Allocations Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isArabic ? 'التخصيصات' : 'Allocations'}
              {payment.allocations && payment.allocations.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">({payment.allocations.length})</span>
              )}
            </h2>
            {canAllocate && (
              <Button size="sm" onClick={openAllocateModal}>
                + {isArabic ? 'تخصيص' : 'Allocate'}
              </Button>
            )}
          </div>
          {payment.allocations && payment.allocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'رقم الفاتورة' : 'Invoice #'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'المبلغ المخصص' : 'Allocated Amount'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'مبلغ عملة الفاتورة' : 'Invoice Currency Amount'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'نوع التسوية' : 'Settlement'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {payment.allocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                        {alloc.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {fmt(alloc.allocated_amount, payment.currency_code)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {fmt(alloc.invoice_currency_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {alloc.settlement_type === 'full' ? (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            {isArabic ? 'كامل' : 'Full'}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                            {isArabic ? 'جزئي' : 'Partial'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-400 text-sm">{isArabic ? 'لا توجد تخصيصات بعد' : 'No allocations yet'}</p>
              {canAllocate && (
                <button onClick={openAllocateModal} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  {isArabic ? 'تخصيص للفواتير ←' : 'Allocate to invoices →'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmPostOpen}
        onClose={() => setConfirmPostOpen(false)}
        onConfirm={handlePostPayment}
        title={isArabic ? 'ترحيل الدفعة' : 'Post Payment'}
        message={isArabic
          ? 'هل أنت متأكد من ترحيل هذه الدفعة؟ سيتم إنشاء قيد محاسبي وتحديث أرصدة الفواتير.'
          : 'Are you sure you want to post this payment? A journal entry will be created and invoice balances will be updated.'}
        confirmText={isArabic ? 'ترحيل' : 'Post Payment'}
        variant="primary"
        loading={posting}
      />

      {/* Allocate Modal */}
      <Modal
        isOpen={allocateModalOpen}
        onClose={() => !allocating && setAllocateModalOpen(false)}
        title={isArabic ? 'تخصيص الدفعة للفواتير' : 'Allocate Payment to Invoices'}
        size="lg"
      >
        <div className="space-y-4">
          {outstandingInvoices.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-400">{isArabic ? 'لا توجد فواتير مستحقة لهذا المورد' : 'No outstanding invoices found for this vendor'}</p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div>
                  <p className="text-xs text-blue-500 uppercase">{isArabic ? 'المتاح للتخصيص' : 'Available'}</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{fmt(unallocated, payment.currency_code)}</p>
                </div>
                <div className="border-l border-blue-200 dark:border-blue-700 pl-4">
                  <p className="text-xs text-blue-500 uppercase">{isArabic ? 'إجمالي التخصيص' : 'Allocating'}</p>
                  <p className={`text-lg font-bold ${calculateTotalAllocation() > unallocated ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {fmt(calculateTotalAllocation(), payment.currency_code)}
                  </p>
                </div>
                <div className="border-l border-blue-200 dark:border-blue-700 pl-4">
                  <p className="text-xs text-blue-500 uppercase">{isArabic ? 'المتبقي' : 'Remaining'}</p>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{fmt(unallocated - calculateTotalAllocation(), payment.currency_code)}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allocationInputs.map((input, index) => {
                  const invoice = outstandingInvoices[index];
                  const allocAmt = parseFloat(input.allocated_amount || '0');
                  const balance = parseFloat(invoice.balance);
                  const isOver = allocAmt > balance;
                  return (
                    <div key={input.invoice_id} className={`p-4 rounded-xl border transition ${isOver ? 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-700' : allocAmt > 0 ? 'border-green-300 bg-green-50 dark:bg-green-900/10 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">
                            {isArabic ? 'تاريخ الاستحقاق' : 'Due'}: {new Date(invoice.due_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{isArabic ? 'الرصيد المستحق' : 'Balance'}</p>
                          <p className="font-bold text-gray-900 dark:text-white">{fmt(invoice.balance)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          label=""
                          type="number"
                          step="0.01"
                          min="0"
                          max={invoice.balance}
                          value={input.allocated_amount}
                          onChange={(e) => handleAllocationChange(input.invoice_id, e.target.value)}
                          placeholder="0.00"
                        />
                        <div className="flex gap-1 mt-1">
                          {[25, 50, 75, 100].map(pct => (
                            <button key={pct} onClick={() => handleAllocationChange(input.invoice_id, (balance * pct / 100).toFixed(2))}
                              className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:text-blue-600 dark:hover:text-blue-300 transition">
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                      {isOver && <p className="text-xs text-red-600 mt-1">{isArabic ? 'المبلغ يتجاوز الرصيد' : 'Amount exceeds balance'}</p>}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={handleSubmitAllocations} loading={allocating} disabled={calculateTotalAllocation() === 0 || calculateTotalAllocation() > unallocated}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  {isArabic ? 'تأكيد التخصيص' : 'Submit Allocations'}
                </Button>
                <Button variant="secondary" onClick={() => setAllocateModalOpen(false)} disabled={allocating}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
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
        title={isArabic ? 'حذف الدفعة' : 'Delete Payment'}
        message={isArabic
          ? `هل أنت متأكد من حذف الدفعة "${payment.payment_number}"؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Are you sure you want to delete payment "${payment.payment_number}"? This action cannot be undone.`}
        confirmText={isArabic ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />

      {/* Transfer Request Form Modal */}
      <Modal
        isOpen={trModalOpen}
        onClose={() => !creatingTransfer && setTrModalOpen(false)}
        title={isArabic ? 'إنشاء طلب تحويل' : 'Create Transfer Request'}
        size="lg"
      >
        <div className="space-y-5">
          {/* Payment summary banner */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <div>
              <p className="text-xs text-purple-500 uppercase">{isArabic ? 'الدفعة' : 'Payment'}</p>
              <p className="font-bold text-purple-900 dark:text-purple-200">{payment?.payment_number}</p>
            </div>
            <div className="border-l border-purple-300 dark:border-purple-700 pl-4">
              <p className="text-xs text-purple-500 uppercase">{isArabic ? 'المورد' : 'Vendor'}</p>
              <p className="font-semibold text-purple-800 dark:text-purple-300">{payment?.vendor_name}</p>
            </div>
            <div className="border-l border-purple-300 dark:border-purple-700 pl-4">
              <p className="text-xs text-purple-500 uppercase">{isArabic ? 'المبلغ' : 'Amount'}</p>
              <p className="font-bold text-purple-900 dark:text-purple-200">{payment && fmt(payment.payment_amount, payment.currency_code)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isArabic ? 'المشروع' : 'Project'} {!payment?.project_id && <span className="text-red-500">*</span>}
              </label>
              {payment?.project_id ? (
                <div className="px-3 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm text-gray-800 dark:text-gray-200">
                  {payment.project_code} — {payment.project_name}
                </div>
              ) : (
                <select
                  value={trForm.project_id}
                  onChange={e => setTrForm(prev => ({ ...prev, project_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">{isArabic ? '-- اختر مشروع --' : '-- Select Project --'}</option>
                  {loadingProjects ? (
                    <option disabled>{isArabic ? 'جاري التحميل...' : 'Loading...'}</option>
                  ) : (
                    projects.map(p => (
                      <option key={p.id} value={p.id}>{p.code} — {p.name_ar || p.name}</option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Transfer Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isArabic ? 'طريقة التحويل' : 'Transfer Method'}
              </label>
              <select
                value={trForm.transfer_method}
                onChange={e => setTrForm(prev => ({ ...prev, transfer_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="bank_transfer">{isArabic ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="cheque">{isArabic ? 'شيك' : 'Cheque'}</option>
                <option value="cash">{isArabic ? 'نقدي' : 'Cash'}</option>
                <option value="online">{isArabic ? 'إلكتروني' : 'Online'}</option>
              </select>
            </div>

            {/* Expected Transfer Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isArabic ? 'تاريخ التحويل المتوقع' : 'Expected Transfer Date'}
              </label>
              <input
                type="date"
                value={trForm.expected_transfer_date}
                onChange={e => setTrForm(prev => ({ ...prev, expected_transfer_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Beneficiary Section */}
          <div className="border border-gray-200 dark:border-slate-600 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              🏦 {isArabic ? 'بيانات المستفيد' : 'Beneficiary Details'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{isArabic ? 'اسم المستفيد' : 'Beneficiary Name'}</label>
                <input
                  type="text"
                  value={trForm.beneficiary_name}
                  onChange={e => setTrForm(prev => ({ ...prev, beneficiary_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder={isArabic ? 'اسم المستفيد...' : 'Beneficiary name...'}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{isArabic ? 'رقم الحساب' : 'Account Number'}</label>
                <input
                  type="text"
                  value={trForm.beneficiary_account}
                  onChange={e => setTrForm(prev => ({ ...prev, beneficiary_account: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="XXXXXXXXXXXXXXX"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{isArabic ? 'اسم البنك' : 'Bank Name'}</label>
                <input
                  type="text"
                  value={trForm.beneficiary_bank}
                  onChange={e => setTrForm(prev => ({ ...prev, beneficiary_bank: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder={isArabic ? 'اسم البنك...' : 'Bank name...'}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">IBAN</label>
                <input
                  type="text"
                  value={trForm.beneficiary_iban}
                  onChange={e => setTrForm(prev => ({ ...prev, beneficiary_iban: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                  placeholder="SA00 0000 0000 0000 0000 0000"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">SWIFT / BIC</label>
                <input
                  type="text"
                  value={trForm.swift_code}
                  onChange={e => setTrForm(prev => ({ ...prev, swift_code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                  placeholder="SWIFT code"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isArabic ? 'ملاحظات' : 'Notes'}</label>
            <textarea
              value={trForm.notes}
              onChange={e => setTrForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleSubmitTransferRequest}
              loading={creatingTransfer}
              disabled={!trForm.project_id && !payment?.project_id}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              ↗ {isArabic ? 'إنشاء طلب التحويل' : 'Create Transfer Request'}
            </Button>
            <Button variant="secondary" onClick={() => setTrModalOpen(false)} disabled={creatingTransfer}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
