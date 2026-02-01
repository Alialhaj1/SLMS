/**
 * 💰 PROFESSIONAL VENDOR PAYMENTS PAGE
 * =====================================
 * Enterprise-grade vendor payment management with comprehensive features
 * 
 * ✨ FEATURES:
 * ✅ Full CRUD operations
 * ✅ Payment method selection (Cash, Cheque, Bank Transfer, Credit Card)
 * ✅ Bank account integration for banking methods
 * ✅ Multiple invoice allocation (partial & full payment)
 * ✅ Currency selection with exchange rates
 * ✅ Cost center & project tracking
 * ✅ Approval workflow integration
 * ✅ Post payment (updates vendor balance & journal entries)
 * ✅ Outstanding invoices display with vendor selection
 * ✅ RBAC integration
 * ✅ AR/EN bilingual support
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
import CurrencySelector from '../../components/shared/CurrencySelector';
import CostCenterDropdown from '../../components/shared/CostCenterDropdown';
import ProjectDropdown from '../../components/shared/ProjectDropdown';
import PaymentMethodSelector from '../../components/shared/PaymentMethodSelector';
import VendorPaymentForm from '../../components/purchasing/VendorPaymentForm';
import {
  PlusIcon,
  TrashIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// ===========================
// INTERFACES
// ===========================

interface VendorPayment {
  id: number;
  payment_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_name_ar?: string;
  vendor_code?: string;
  vendor_outstanding_balance?: number;
  
  payment_date: string;
  
  // Payment Method & Bank
  payment_method_id: number;
  payment_method_name?: string;
  payment_method_name_ar?: string;
  bank_account_id?: number;
  bank_account_number?: string;
  bank_name?: string;
  
  // Currency & Amount
  currency_id: number;
  currency_code?: string;
  currency_symbol?: string;
  exchange_rate: number;
  payment_amount: number;
  
  // Invoice Allocations
  invoices: PaymentInvoiceAllocation[];
  total_allocated: number;
  
  // Tracking
  cost_center_id?: number;
  cost_center_code?: string;
  project_id?: number;
  project_code?: string;
  
  // Status & Approval
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'rejected';
  is_posted: boolean;
  posted_at?: string;
  
  requires_approval: boolean;
  approval_status?: string;
  approved_by_user_id?: number;
  approved_by_name?: string;
  approved_at?: string;
  
  reference_number?: string;
  notes?: string;
}

interface PaymentInvoiceAllocation {
  id?: number;
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  invoice_amount: number;
  outstanding_amount: number;
  allocated_amount: number;
  is_selected?: boolean;
}

interface Vendor {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  outstanding_balance: number;
}

interface OutstandingInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  invoice_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  is_selected?: boolean;
  allocated_amount: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ===========================
// MAIN COMPONENT
// ===========================

function VendorPaymentsPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const companyId = companyStore.getActiveCompanyId() || 1;

  // Data states
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<VendorPayment | null>(null);
  const [viewingPayment, setViewingPayment] = useState<VendorPayment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete & Post confirmations
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<VendorPayment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [postConfirmOpen, setPostConfirmOpen] = useState(false);
  const [paymentToPost, setPaymentToPost] = useState<VendorPayment | null>(null);
  const [posting, setPosting] = useState(false);

  // Outstanding invoices
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Form data
  const [formData, setFormData] = useState<Partial<VendorPayment>>({
    vendor_id: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method_id: 0,
    bank_account_id: undefined,
    currency_id: 0,
    exchange_rate: 1,
    payment_amount: 0,
    cost_center_id: undefined,
    project_id: undefined,
    reference_number: '',
    notes: '',
    invoices: [],
    total_allocated: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getToken = () => localStorage.getItem('accessToken');
  const getHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    'X-Company-Id': String(companyId),
  });

  // ===========================
  // FETCH DATA
  // ===========================

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/procurement/vendors`, { headers: getHeaders() });
      if (res.ok) {
        const result = await res.json();
        setVendors(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  }, [companyId]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${API_BASE}/api/procurement/vendor-payments?${params}`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const result = await res.json();
        setPayments(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } else if (res.status === 401 || res.status === 403) {
        showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'فشل في تحميل المدفوعات' : 'Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, showToast, locale, companyId]);

  const fetchOutstandingInvoices = async (vendorId: number) => {
    setLoadingInvoices(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/vendors/${vendorId}/outstanding-invoices`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        const invoices = (result.data || []).map((inv: OutstandingInvoice) => ({
          ...inv,
          is_selected: false,
          allocated_amount: 0,
        }));
        setOutstandingInvoices(invoices);
      }
    } catch (error) {
      console.error('Failed to fetch outstanding invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // ===========================
  // INVOICE ALLOCATION LOGIC
  // ===========================

  const handleVendorChange = (vendorId: number) => {
    setFormData({ ...formData, vendor_id: vendorId, invoices: [] });
    if (vendorId) {
      fetchOutstandingInvoices(vendorId);
    } else {
      setOutstandingInvoices([]);
    }
  };

  const handleInvoiceToggle = (invoice: OutstandingInvoice) => {
    const updatedInvoices = outstandingInvoices.map(inv => {
      if (inv.id === invoice.id) {
        return {
          ...inv,
          is_selected: !inv.is_selected,
          allocated_amount: !inv.is_selected ? inv.outstanding_amount : 0,
        };
      }
      return inv;
    });
    setOutstandingInvoices(updatedInvoices);
    recalculateAllocation(updatedInvoices);
  };

  const handleAllocationChange = (invoiceId: number, amount: number) => {
    const updatedInvoices = outstandingInvoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          allocated_amount: Math.min(amount, inv.outstanding_amount),
        };
      }
      return inv;
    });
    setOutstandingInvoices(updatedInvoices);
    recalculateAllocation(updatedInvoices);
  };

  const recalculateAllocation = (invoices: any[]) => {
    const selectedInvoices = invoices
      .filter(inv => inv.is_selected && inv.allocated_amount > 0)
      .map(inv => ({
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        invoice_amount: inv.invoice_amount,
        outstanding_amount: inv.outstanding_amount,
        allocated_amount: inv.allocated_amount,
      }));

    const totalAllocated = selectedInvoices.reduce((sum, inv) => sum + inv.allocated_amount, 0);

    setFormData(prev => ({
      ...prev,
      invoices: selectedInvoices,
      total_allocated: totalAllocated,
    }));
  };

  // ===========================
  // CRUD OPERATIONS
  // ===========================

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.vendor_id) {
      errors.vendor_id = locale === 'ar' ? 'المورد مطلوب' : 'Vendor is required';
    }
    if (!formData.payment_date) {
      errors.payment_date = locale === 'ar' ? 'تاريخ الدفع مطلوب' : 'Payment date is required';
    }
    if (!formData.payment_method_id) {
      errors.payment_method_id = locale === 'ar' ? 'طريقة الدفع مطلوبة' : 'Payment method is required';
    }
    if (!formData.currency_id) {
      errors.currency_id = locale === 'ar' ? 'العملة مطلوبة' : 'Currency is required';
    }
    if (!formData.payment_amount || formData.payment_amount <= 0) {
      errors.payment_amount = locale === 'ar' ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero';
    }
    if (!formData.invoices || formData.invoices.length === 0) {
      errors.invoices = locale === 'ar' ? 'يجب تخصيص الدفعة على فاتورة واحدة على الأقل' : 'At least one invoice must be allocated';
    }
    if (formData.payment_amount !== formData.total_allocated) {
      errors.allocation = locale === 'ar' 
        ? `المبلغ المدفوع (${formData.payment_amount}) لا يساوي المبلغ المخصص (${formData.total_allocated})`
        : `Payment amount (${formData.payment_amount}) does not match allocated amount (${formData.total_allocated})`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = editingPayment
        ? `${API_BASE}/api/procurement/vendor-payments/${editingPayment.id}`
        : `${API_BASE}/api/procurement/vendor-payments`;
      const method = editingPayment ? 'PUT' : 'POST';

      const body = {
        vendor_id: formData.vendor_id,
        payment_date: formData.payment_date,
        payment_method_id: formData.payment_method_id,
        bank_account_id: formData.bank_account_id || null,
        currency_id: formData.currency_id,
        exchange_rate: formData.exchange_rate,
        payment_amount: formData.payment_amount,
        cost_center_id: formData.cost_center_id || null,
        project_id: formData.project_id || null,
        reference_number: formData.reference_number,
        notes: formData.notes,
        invoices: formData.invoices!.map(inv => ({
          invoice_id: inv.invoice_id,
          allocated_amount: inv.allocated_amount,
        })),
      };

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(
          editingPayment
            ? (locale === 'ar' ? 'تم تحديث الدفعة بنجاح' : 'Payment updated successfully')
            : (locale === 'ar' ? 'تم إنشاء الدفعة بنجاح' : 'Payment created successfully'),
          'success'
        );
        setModalOpen(false);
        fetchPayments();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Operation failed', 'error');
      }
    } catch (error) {
      showToast('Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!paymentToPost) return;

    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/vendor-payments/${paymentToPost.id}/post`, {
        method: 'PUT',
        headers: getHeaders(),
      });

      if (res.ok) {
        showToast(
          locale === 'ar' 
            ? 'تم ترحيل الدفعة - تم تحديث رصيد المورد والحركة البنكية' 
            : 'Payment posted - vendor balance and bank transaction updated',
          'success'
        );
        setPostConfirmOpen(false);
        setPaymentToPost(null);
        fetchPayments();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Post failed', 'error');
      }
    } catch (error) {
      showToast('Post failed', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async () => {
    if (!paymentToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/vendor-payments/${paymentToDelete.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        showToast(locale === 'ar' ? 'تم حذف الدفعة' : 'Payment deleted', 'success');
        setDeleteConfirmOpen(false);
        setPaymentToDelete(null);
        fetchPayments();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast('Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ===========================
  // MODAL HANDLERS
  // ===========================

  const handleOpenCreate = () => {
    setEditingPayment(null);
    setFormData({
      vendor_id: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method_id: 0,
      bank_account_id: undefined,
      currency_id: 0,
      exchange_rate: 1,
      payment_amount: 0,
      cost_center_id: undefined,
      project_id: undefined,
      reference_number: '',
      notes: '',
      invoices: [],
      total_allocated: 0,
    });
    setOutstandingInvoices([]);
    setFormErrors({});
    setModalOpen(true);
  };

  const fetchPaymentDetails = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/procurement/vendor-payments/${id}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        return result.data;
      }
    } catch (error) {
      console.error('Failed to fetch payment details:', error);
    }
    return null;
  };

  const handleOpenView = async (payment: VendorPayment) => {
    const details = await fetchPaymentDetails(payment.id);
    if (details) {
      setViewingPayment(details);
      setViewModalOpen(true);
    }
  };

  // ===========================
  // UTILITIES
  // ===========================

  const formatCurrency = (amount: number, symbol?: string) => {
    return `${symbol || 'SAR'} ${amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getStatusBadge = (status: string, isPosted: boolean) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      pending_approval: { en: 'Pending', ar: 'قيد الاعتماد' },
      approved: { en: 'Approved', ar: 'معتمدة' },
      posted: { en: 'Posted', ar: 'مرحّلة' },
      rejected: { en: 'Rejected', ar: 'مرفوضة' },
    };
    
    const displayStatus = isPosted ? 'posted' : status;
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[displayStatus])}>
        {locale === 'ar' ? labels[displayStatus]?.ar : labels[displayStatus]?.en}
      </span>
    );
  };

  // ===========================
  // RENDER
  // ===========================

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مدفوعات الموردين' : 'Vendor Payments'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <BanknotesIcon className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'مدفوعات الموردين' : 'Vendor Payments'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? `${total} دفعة` : `${total} payments`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('vendor_payments:export') && (
              <Button variant="secondary" size="sm">
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                {locale === 'ar' ? 'تصدير' : 'Export'}
              </Button>
            )}
            {hasPermission('vendor_payments:create') && (
              <Button onClick={handleOpenCreate}>
                <PlusIcon className="h-5 w-5 mr-1" />
                {locale === 'ar' ? 'دفعة جديدة' : 'New Payment'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث برقم الدفعة أو المورد...' : 'Search by payment # or vendor...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
              <option value="pending_approval">{locale === 'ar' ? 'قيد الاعتماد' : 'Pending Approval'}</option>
              <option value="approved">{locale === 'ar' ? 'معتمدة' : 'Approved'}</option>
              <option value="posted">{locale === 'ar' ? 'مرحّلة' : 'Posted'}</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value={20}>20 {locale === 'ar' ? 'لكل صفحة' : 'per page'}</option>
              <option value={50}>50 {locale === 'ar' ? 'لكل صفحة' : 'per page'}</option>
              <option value={100}>100 {locale === 'ar' ? 'لكل صفحة' : 'per page'}</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {locale === 'ar' ? 'لا توجد مدفوعات' : 'No payments found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'رقم الدفعة' : 'Payment #'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'المورد' : 'Vendor'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الطريقة' : 'Method'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'المبلغ' : 'Amount'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {payments.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-purple-600 dark:text-purple-400">
                        {payment.payment_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {locale === 'ar' && payment.vendor_name_ar ? payment.vendor_name_ar : payment.vendor_name}
                        </div>
                        {payment.vendor_code && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{payment.vendor_code}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(payment.payment_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {locale === 'ar' && payment.payment_method_name_ar ? payment.payment_method_name_ar : payment.payment_method_name}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-gray-900 dark:text-white">
                        {formatCurrency(payment.payment_amount, payment.currency_symbol)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(payment.status, payment.is_posted)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenView(payment)}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title={locale === 'ar' ? 'عرض' : 'View'}
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          {hasPermission('vendor_payments:post') && !payment.is_posted && 
                           (payment.status === 'approved' || (payment.status === 'draft' && payment.approval_status === 'not_required')) && (
                            <button
                              onClick={() => { setPaymentToPost(payment); setPostConfirmOpen(true); }}
                              className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                              title={locale === 'ar' ? 'ترحيل' : 'Post'}
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          {hasPermission('vendor_payments:delete') && payment.status === 'draft' && !payment.is_posted && (
                            <button
                              onClick={() => { setPaymentToDelete(payment); setDeleteConfirmOpen(true); }}
                              className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                              title={locale === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' 
                  ? `صفحة ${currentPage} من ${totalPages}`
                  : `Page ${currentPage} of ${totalPages}`
                }
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  {locale === 'ar' ? 'السابق' : 'Previous'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  {locale === 'ar' ? 'التالي' : 'Next'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Payment Modal */}
      <VendorPaymentForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        editingPayment={editingPayment}
        onSubmit={handleSubmit}
        submitting={submitting}
        companyId={companyId}
        vendors={vendors}
        outstandingInvoices={outstandingInvoices}
        setOutstandingInvoices={setOutstandingInvoices}
        onVendorChange={handleVendorChange}
        loadingInvoices={loadingInvoices}
        onInvoiceToggle={handleInvoiceToggle}
        onAllocationChange={handleAllocationChange}
      />

      {/* View Modal - TODO: Create separate component */}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setPaymentToDelete(null); }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف الدفعة' : 'Delete Payment'}
        message={locale === 'ar' 
          ? `هل أنت متأكد من حذف الدفعة ${paymentToDelete?.payment_number}؟`
          : `Are you sure you want to delete payment ${paymentToDelete?.payment_number}?`
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={postConfirmOpen}
        onClose={() => { setPostConfirmOpen(false); setPaymentToPost(null); }}
        onConfirm={handlePost}
        title={locale === 'ar' ? 'ترحيل الدفعة' : 'Post Payment'}
        message={locale === 'ar' 
          ? `هل أنت متأكد من ترحيل الدفعة ${paymentToPost?.payment_number}؟ سيتم تحديث رصيد المورد والحركة البنكية.`
          : `Are you sure you want to post payment ${paymentToPost?.payment_number}? This will update vendor balance and bank transaction.`
        }
        confirmText={locale === 'ar' ? 'ترحيل' : 'Post'}
        loading={posting}
      />
    </MainLayout>
  );
}

export default withPermission('vendor_payments:view', VendorPaymentsPage);
