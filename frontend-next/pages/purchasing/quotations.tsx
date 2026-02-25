/**
 * 📝 VENDOR QUOTATIONS PAGE
 * =========================
 * Production-ready vendor quotations (RFQ) management connected to real API
 * 
 * Features:
 * ✅ Full CRUD operations
 * ✅ Accept/Reject workflow
 * ✅ Real-time vendor dropdown
 * ✅ Pagination & search
 * ✅ AR/EN support
 * ✅ RBAC integration
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
// 📦 Shared Types
import type { Vendor as SharedVendor, Warehouse as SharedWarehouse } from '@/shared/types';
import {
  PlusIcon,
  TrashIcon,
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface VendorQuotation {
  id: number;
  quotation_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_name_ar?: string;
  vendor_code?: string;
  quotation_date: string;
  validity_date?: string;
  
  // Currency & Terms
  currency_id?: number;
  currency_code?: string;
  currency_symbol?: string;
  supply_terms_id?: number;
  supply_terms_code?: string;
  delivery_terms_id?: number;
  delivery_terms_code?: string;
  payment_terms_id?: number;
  payment_terms_days?: number;
  
  // Amounts
  subtotal: number;
  discount_amount?: number;
  tax_amount: number;
  total_amount: number;
  
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
  technical_notes?: string;
  items?: QuotationItem[];
}

interface QuotationItem {
  id?: number;
  item_id?: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  uom_id?: number;
  uom_code?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_rate_id?: number;
  tax_percent?: number;
  
  // Enhanced fields
  specifications?: string;
  brand?: string;
  model?: string;
  country_of_origin?: string;
  warranty_period?: string;
  delivery_period_days?: number;
  
  line_total: number;
}

// Using shared Vendor type
type Vendor = SharedVendor;

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '') + '/api';

function VendorQuotationsPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();

  // Data states
  const [quotations, setQuotations] = useState<VendorQuotation[]>([]);
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
  const [viewingQuotation, setViewingQuotation] = useState<VendorQuotation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<VendorQuotation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Accept/Reject confirmation
  const [acceptConfirmOpen, setAcceptConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [quotationToAction, setQuotationToAction] = useState<VendorQuotation | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    vendor_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    validity_date: '',
    notes: '',
    items: [] as QuotationItem[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getToken = () => localStorage.getItem('accessToken');
  const getCompanyId = () => companyStore.getActiveCompanyId();

  const getHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    'X-Company-Id': String(getCompanyId() || ''),
  });

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const vendorsRes = await fetch(`${API_BASE}/procurement/vendors`, { headers });

      if (vendorsRes.ok) {
        const result = await vendorsRes.json();
        setVendors(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  }, []);

  // Fetch quotations
  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${API_BASE}/procurement/quotations?${params}`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const result = await res.json();
        setQuotations(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } else if (res.status === 401 || res.status === 403) {
        showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      } else {
        showToast(locale === 'ar' ? 'فشل في تحميل عروض الأسعار' : 'Failed to load quotations', 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'فشل في تحميل عروض الأسعار' : 'Failed to load quotations', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, showToast, locale]);

  // Fetch quotation details
  const fetchQuotationDetails = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/procurement/quotations/${id}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        return result.data;
      }
    } catch (error) {
      console.error('Failed to fetch quotation details:', error);
    }
    return null;
  };

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.vendor_id) errors.vendor_id = locale === 'ar' ? 'المورد مطلوب' : 'Vendor is required';
    if (!formData.quotation_date) errors.quotation_date = locale === 'ar' ? 'تاريخ العرض مطلوب' : 'Quotation date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const body = {
        vendor_id: parseInt(formData.vendor_id),
        quotation_date: formData.quotation_date,
        validity_date: formData.validity_date || null,
        notes: formData.notes,
        items: formData.items.map(item => ({
          item_id: item.item_id,
          item_code: item.item_code,
          item_name: item.item_name,
          uom_id: item.uom_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      const res = await fetch(`${API_BASE}/procurement/quotations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(locale === 'ar' ? 'تم إنشاء عرض السعر' : 'Quotation created', 'success');
        setModalOpen(false);
        fetchQuotations();
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

  // Handle accept
  const handleAccept = async () => {
    if (!quotationToAction) return;

    setActionProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/procurement/quotations/${quotationToAction.id}/accept`, {
        method: 'PUT',
        headers: getHeaders(),
      });

      if (res.ok) {
        showToast(locale === 'ar' ? 'تم قبول عرض السعر' : 'Quotation accepted', 'success');
        setAcceptConfirmOpen(false);
        setQuotationToAction(null);
        fetchQuotations();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Accept failed', 'error');
      }
    } catch (error) {
      showToast('Accept failed', 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!quotationToAction) return;

    setActionProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/procurement/quotations/${quotationToAction.id}/reject`, {
        method: 'PUT',
        headers: getHeaders(),
      });

      if (res.ok) {
        showToast(locale === 'ar' ? 'تم رفض عرض السعر' : 'Quotation rejected', 'success');
        setRejectConfirmOpen(false);
        setQuotationToAction(null);
        fetchQuotations();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Reject failed', 'error');
      }
    } catch (error) {
      showToast('Reject failed', 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!quotationToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/procurement/quotations/${quotationToDelete.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        showToast(locale === 'ar' ? 'تم حذف عرض السعر' : 'Quotation deleted', 'success');
        setDeleteConfirmOpen(false);
        setQuotationToDelete(null);
        fetchQuotations();
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

  // Open create modal
  const handleOpenCreate = () => {
    setFormData({
      vendor_id: '',
      quotation_date: new Date().toISOString().split('T')[0],
      validity_date: '',
      notes: '',
      items: [],
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open view modal
  const handleOpenView = async (quot: VendorQuotation) => {
    const details = await fetchQuotationDetails(quot.id);
    if (details) {
      setViewingQuotation(details);
      setViewModalOpen(true);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, symbol?: string) => {
    return `${symbol || 'SAR'} ${amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      accepted: { en: 'Accepted', ar: 'مقبول' },
      rejected: { en: 'Rejected', ar: 'مرفوض' },
      expired: { en: 'Expired', ar: 'منتهي الصلاحية' },
    };
    
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status] || styles.pending)}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'عروض أسعار الموردين' : 'Vendor Quotations'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <DocumentMagnifyingGlassIcon className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'عروض أسعار الموردين' : 'Vendor Quotations'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? `${total} عرض سعر` : `${total} quotations`}
              </p>
            </div>
          </div>

          {hasPermission('vendor_quotations:create') && (
            <Button onClick={handleOpenCreate}>
              <PlusIcon className="h-5 w-5 mr-1" />
              {locale === 'ar' ? 'عرض سعر جديد' : 'New Quotation'}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
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
              <option value="pending">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
              <option value="accepted">{locale === 'ar' ? 'مقبول' : 'Accepted'}</option>
              <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
              <option value="expired">{locale === 'ar' ? 'منتهي الصلاحية' : 'Expired'}</option>
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

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : quotations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {locale === 'ar' ? 'لا توجد عروض أسعار' : 'No quotations found'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'رقم العرض' : 'Quotation #'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'المورد' : 'Vendor'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'تاريخ العرض' : 'Date'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الصلاحية' : 'Valid Until'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {quotations.map(quot => (
                  <tr key={quot.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-purple-600 dark:text-purple-400">
                      {quot.quotation_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {locale === 'ar' ? quot.vendor_name_ar : quot.vendor_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(quot.quotation_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {quot.validity_date 
                        ? new Date(quot.validity_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(quot.total_amount, quot.currency_symbol)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(quot.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenView(quot)}
                          className="p-1 text-gray-500 hover:text-blue-600"
                          title={locale === 'ar' ? 'عرض' : 'View'}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {hasPermission('vendor_quotations:accept') && quot.status === 'pending' && (
                          <button
                            onClick={() => { setQuotationToAction(quot); setAcceptConfirmOpen(true); }}
                            className="p-1 text-gray-500 hover:text-green-600"
                            title={locale === 'ar' ? 'قبول' : 'Accept'}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                        {hasPermission('vendor_quotations:reject') && quot.status === 'pending' && (
                          <button
                            onClick={() => { setQuotationToAction(quot); setRejectConfirmOpen(true); }}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title={locale === 'ar' ? 'رفض' : 'Reject'}
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                        {hasPermission('vendor_quotations:delete') && quot.status === 'pending' && (
                          <button
                            onClick={() => { setQuotationToDelete(quot); setDeleteConfirmOpen(true); }}
                            className="p-1 text-gray-500 hover:text-red-600"
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

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={locale === 'ar' ? 'عرض سعر جديد' : 'New Quotation'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المورد' : 'Vendor'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className={clsx(
                  "w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white",
                  formErrors.vendor_id ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                )}
              >
                <option value="">{locale === 'ar' ? 'اختر المورد' : 'Select Vendor'}</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {locale === 'ar' ? vendor.name_ar || vendor.name : vendor.name}
                  </option>
                ))}
              </select>
              {formErrors.vendor_id && (
                <p className="text-red-500 text-xs mt-1">{formErrors.vendor_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ العرض' : 'Quotation Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.quotation_date}
                onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                className={clsx(
                  "w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white",
                  formErrors.quotation_date ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                )}
              />
              {formErrors.quotation_date && (
                <p className="text-red-500 text-xs mt-1">{formErrors.quotation_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ الصلاحية' : 'Validity Date'}
              </label>
              <input
                type="date"
                value={formData.validity_date}
                onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {locale === 'ar' ? 'إنشاء' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={locale === 'ar' ? 'تفاصيل عرض السعر' : 'Quotation Details'}
        size="xl"
      >
        {viewingQuotation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'رقم العرض' : 'Quotation #'}</span>
                <p className="font-medium">{viewingQuotation.quotation_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'المورد' : 'Vendor'}</span>
                <p className="font-medium">
                  {locale === 'ar' ? viewingQuotation.vendor_name_ar : viewingQuotation.vendor_name}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'التاريخ' : 'Date'}</span>
                <p className="font-medium">
                  {new Date(viewingQuotation.quotation_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                <p className="font-medium text-lg">
                  {formatCurrency(viewingQuotation.total_amount, viewingQuotation.currency_symbol)}
                </p>
              </div>
            </div>

            {viewingQuotation.items && viewingQuotation.items.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">{locale === 'ar' ? 'البنود' : 'Items'}</h3>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        {locale === 'ar' ? 'الصنف' : 'Item'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        {locale === 'ar' ? 'الكمية' : 'Qty'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        {locale === 'ar' ? 'السعر' : 'Price'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        {locale === 'ar' ? 'الإجمالي' : 'Total'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {viewingQuotation.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm">{item.item_name}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.unit_price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right font-medium">{item.line_total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setQuotationToDelete(null); }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف عرض السعر' : 'Delete Quotation'}
        message={locale === 'ar' 
          ? `هل أنت متأكد من حذف عرض السعر ${quotationToDelete?.quotation_number}؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Are you sure you want to delete quotation ${quotationToDelete?.quotation_number}? This action cannot be undone.`
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />

      {/* Accept Confirmation */}
      <ConfirmDialog
        isOpen={acceptConfirmOpen}
        onClose={() => { setAcceptConfirmOpen(false); setQuotationToAction(null); }}
        onConfirm={handleAccept}
        title={locale === 'ar' ? 'قبول عرض السعر' : 'Accept Quotation'}
        message={locale === 'ar' 
          ? `هل أنت متأكد من قبول عرض السعر ${quotationToAction?.quotation_number}؟`
          : `Are you sure you want to accept quotation ${quotationToAction?.quotation_number}?`
        }
        confirmText={locale === 'ar' ? 'قبول' : 'Accept'}
        loading={actionProcessing}
      />

      {/* Reject Confirmation */}
      <ConfirmDialog
        isOpen={rejectConfirmOpen}
        onClose={() => { setRejectConfirmOpen(false); setQuotationToAction(null); }}
        onConfirm={handleReject}
        title={locale === 'ar' ? 'رفض عرض السعر' : 'Reject Quotation'}
        message={locale === 'ar' 
          ? `هل أنت متأكد من رفض عرض السعر ${quotationToAction?.quotation_number}؟`
          : `Are you sure you want to reject quotation ${quotationToAction?.quotation_number}?`
        }
        confirmText={locale === 'ar' ? 'رفض' : 'Reject'}
        variant="danger"
        loading={actionProcessing}
      />
    </MainLayout>
  );
}

export default withPermission('vendor_quotations:view', VendorQuotationsPage);
