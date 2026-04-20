import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import { useLocale } from '../../../contexts/LocaleContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { DataTablePro } from '../../../components/ui/DataTablePro';
import { companyStore } from '../../../lib/companyStore';
import { useTranslation } from '../../../hooks/useTranslation';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

interface Payment {
  id: number;
  payment_number: string;
  payment_date: string;
  vendor_name: string;
  vendor_code: string;
  payment_amount: string;
  allocated_amount: string;
  unallocated_amount: string;
  status: string;
  is_posted: boolean;
  payment_method: string;
  currency_code: string;
  purchase_order_number: string;
  shipment_number: string;
  lc_number: string;
  project_code: string;
  project_name: string;
  source_type: string;
}

interface PaymentStats {
  total_payments: number;
  draft_count: number;
  posted_count: number;
  total_amount: number;
  total_unallocated: number;
  total_allocated: number;
  this_month_count: number;
  this_month_amount: number;
  pending_allocation_count: number;
  top_vendors: Array<{ vendor_name: string; vendor_code: string; payment_count: number; total_paid: number }>;
  payment_methods_breakdown: Array<{ payment_method: string; count: number; total_amount: number }>;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  let isArabic = false;
  try { const localeCtx = useLocale(); isArabic = localeCtx?.locale === 'ar'; } catch {}

  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unpostConfirmOpen, setUnpostConfirmOpen] = useState(false);
  const [paymentToUnpost, setPaymentToUnpost] = useState<Payment | null>(null);
  const [unposting, setUnposting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    vendorId: '',
    status: '',
    startDate: '',
    endDate: '',
    unallocatedOnly: false
  });

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [currentPage]);

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId() || 1;
    return {
      Authorization: `Bearer ${token}`,
      'X-Company-Id': String(companyId)
    };
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/procurement/payments/stats', { headers: getHeaders() });
      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.vendorId) params.append('vendor_id', filters.vendorId);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('from_date', filters.startDate);
      if (filters.endDate) params.append('to_date', filters.endDate);
      if (filters.unallocatedOnly) params.append('unallocated_only', 'true');
      params.append('page', String(currentPage));
      params.append('limit', '25');

      const queryString = params.toString();
      const url = `/api/procurement/payments${queryString ? '?' + queryString : ''}`;
      
      const response = await fetch(url, { headers: getHeaders() });

      if (!response.ok) {
        console.error('API response not OK:', response.status, await response.text());
        throw new Error('Failed to fetch payments');
      }

      const result = await response.json();
      setPayments(result.data || []);
      setTotalCount(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error('Error fetching payments:', error);
      showToast(isArabic ? 'فشل في تحميل المدفوعات' : 'Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchPayments();
  };

  const handleClearFilters = () => {
    setFilters({
      vendorId: '',
      status: '',
      startDate: '',
      endDate: '',
      unallocatedOnly: false
    });
    setTimeout(fetchPayments, 100);
  };

  const handleViewDetails = (id: number) => {
    router.push(`/procurement/payments/${id}`);
  };

  const handleDeleteClick = (payment: Payment) => {
    setPaymentToDelete(payment);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/procurement/payments/${paymentToDelete.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete payment');
      }

      showToast(isArabic ? 'تم حذف الدفعة بنجاح' : 'Payment deleted successfully', 'success');
      fetchPayments();
      fetchStats();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || (isArabic ? 'فشل في حذف الدفعة' : 'Failed to delete payment'), 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setPaymentToDelete(null);
    }
  };

  const handleUnpostClick = (payment: Payment) => {
    setPaymentToUnpost(payment);
    setUnpostConfirmOpen(true);
  };

  const handleUnpostConfirm = async () => {
    if (!paymentToUnpost) return;
    
    setUnposting(true);
    try {
      const response = await fetch(`/api/procurement/payments/${paymentToUnpost.id}/unpost`, {
        method: 'POST',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unpost payment');
      }

      showToast(isArabic ? 'تم إرجاع الدفعة إلى مسودة' : 'Payment reverted to draft successfully', 'success');
      fetchPayments();
      fetchStats();
    } catch (error: any) {
      console.error('Error unposting payment:', error);
      showToast(error.message || (isArabic ? 'فشل في إلغاء الترحيل' : 'Failed to unpost payment'), 'error');
    } finally {
      setUnposting(false);
      setUnpostConfirmOpen(false);
      setPaymentToUnpost(null);
    }
  };

  const getStatusBadge = (status: string, isPosted: boolean) => {
    if (isPosted) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700">● {isArabic ? 'مرحّل' : 'Posted'}</span>;
    }
    if (status === 'draft') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-600">○ {isArabic ? 'مسودة' : 'Draft'}</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700">◐ {status}</span>;
  };

  const getSourceBadge = (sourceType: string | null) => {
    if (!sourceType) return <span className="text-xs text-gray-400">—</span>;
    const configs: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
      purchase_order: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'PO', labelAr: 'أمر شراء' },
      shipment: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Shipment', labelAr: 'شحنة' },
      lc: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', label: 'LC', labelAr: 'اعتماد' },
      direct: { bg: 'bg-gray-50 dark:bg-gray-700/30', text: 'text-gray-700 dark:text-gray-300', label: 'Direct', labelAr: 'مباشر' }
    };
    const c = configs[sourceType] || configs['direct'];
    return <span className={`px-2 py-0.5 text-xs font-medium rounded ${c.bg} ${c.text}`}>{isArabic ? c.labelAr : c.label}</span>;
  };

  const formatAmount = (amount: string | number, currency?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formatted = num.toLocaleString(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency ? `${formatted} ${currency}` : formatted;
  };

  const columns = [
    {
      key: 'payment_number',
      label: isArabic ? 'رقم الدفعة' : 'Payment #',
      sortable: true,
      render: (row: Payment) => (
        <button onClick={() => handleViewDetails(row.id)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline" title={isArabic ? 'عرض التفاصيل' : 'View details'}>
          {row.payment_number}
        </button>
      )
    },
    {
      key: 'payment_date',
      label: isArabic ? 'التاريخ' : 'Date',
      sortable: true,
      render: (row: Payment) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {new Date(row.payment_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'vendor_name',
      label: isArabic ? 'المورد' : 'Vendor',
      sortable: true,
      render: (row: Payment) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.vendor_name}</div>
          {row.vendor_code && <div className="text-xs text-gray-400">{row.vendor_code}</div>}
        </div>
      )
    },
    {
      key: 'source_type',
      label: isArabic ? 'المصدر' : 'Source',
      render: (row: Payment) => (
        <div className="flex flex-col gap-1">
          {getSourceBadge(row.source_type)}
          {row.project_code && <span className="text-xs text-gray-500" title={row.project_name || ''}>{row.project_code}</span>}
        </div>
      )
    },
    {
      key: 'payment_amount',
      label: isArabic ? 'المبلغ' : 'Amount',
      sortable: true,
      render: (row: Payment) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatAmount(row.payment_amount, row.currency_code)}
        </span>
      )
    },
    {
      key: 'allocated_amount',
      label: isArabic ? 'المخصص' : 'Allocated',
      sortable: true,
      render: (row: Payment) => {
        const total = parseFloat(row.payment_amount);
        const allocated = parseFloat(row.allocated_amount);
        const pct = total > 0 ? Math.round((allocated / total) * 100) : 0;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm">{formatAmount(row.allocated_amount)}</span>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'unallocated_amount',
      label: isArabic ? 'غير مخصص' : 'Unallocated',
      sortable: true,
      render: (row: Payment) => {
        const unallocated = parseFloat(row.unallocated_amount);
        return (
          <span className={`text-sm font-medium ${unallocated > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
            {formatAmount(row.unallocated_amount)}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (row: Payment) => getStatusBadge(row.status, row.is_posted)
    },
    {
      key: 'actions',
      label: '',
      render: (row: Payment) => (
        <div className="flex gap-1.5 justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleViewDetails(row.id)}
            title={isArabic ? 'عرض' : 'View'}
          >
            👁
          </Button>
          {hasPermission('procurement:payments:edit') && row.status === 'draft' && !row.is_posted && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/procurement/payments/${row.id}/edit`)}
              title={isArabic ? 'تعديل' : 'Edit'}
            >
              ✏️
            </Button>
          )}
          {hasPermission('procurement:payments:unpost') && row.is_posted && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleUnpostClick(row)}
              title={isArabic ? 'إلغاء الترحيل' : 'Unpost'}
              className="text-orange-600 hover:text-orange-800"
            >
              ↩️
            </Button>
          )}
          {hasPermission('procurement:payments:delete') && row.status === 'draft' && !row.is_posted && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDeleteClick(row)}
              title={isArabic ? 'حذف' : 'Delete'}
            >
              🗑
            </Button>
          )}
        </div>
      )
    }
  ];

  // Check permissions
  if (!hasPermission('procurement:payments:view')) {
    return (
      <MainLayout>
        <Head>
          <title>{isArabic ? 'مدفوعات الموردين' : 'Vendor Payments'} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <p className="text-gray-500">{t('common.accessDenied')}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'مدفوعات الموردين' : 'Vendor Payments'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isArabic ? 'مدفوعات الموردين' : 'Vendor Payments'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isArabic ? `${totalCount} دفعة` : `${totalCount} payment${totalCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          {hasPermission('procurement:payments:create') && (
            <Button onClick={() => router.push('/procurement/payments/new')} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25">
              + {isArabic ? 'دفعة جديدة' : 'New Payment'}
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Payments */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg p-5 text-white">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <p className="text-blue-100 text-sm font-medium">{isArabic ? 'إجمالي المدفوعات' : 'Total Payments'}</p>
                <p className="text-3xl font-bold mt-1">{stats.total_payments}</p>
                <p className="text-blue-100 text-xs mt-2">
                  {isArabic ? `مرحّل: ${stats.posted_count} | مسودة: ${stats.draft_count}` : `Posted: ${stats.posted_count} | Draft: ${stats.draft_count}`}
                </p>
              </div>
            </div>

            {/* Total Amount */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg p-5 text-white">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <p className="text-emerald-100 text-sm font-medium">{isArabic ? 'إجمالي المبلغ' : 'Total Amount'}</p>
                <p className="text-2xl font-bold mt-1">{formatAmount(stats.total_amount || 0)}</p>
                <p className="text-emerald-100 text-xs mt-2">
                  {isArabic ? `مخصص: ${formatAmount(stats.total_allocated || 0)}` : `Allocated: ${formatAmount(stats.total_allocated || 0)}`}
                </p>
              </div>
            </div>

            {/* Unallocated */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg p-5 text-white">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <p className="text-amber-100 text-sm font-medium">{isArabic ? 'غير مخصص' : 'Unallocated'}</p>
                <p className="text-2xl font-bold mt-1">{formatAmount(stats.total_unallocated || 0)}</p>
                <p className="text-amber-100 text-xs mt-2">
                  {isArabic ? `${stats.pending_allocation_count} دفعة بانتظار التخصيص` : `${stats.pending_allocation_count} pending allocation`}
                </p>
              </div>
            </div>

            {/* This Month */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg p-5 text-white">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <p className="text-violet-100 text-sm font-medium">{isArabic ? 'هذا الشهر' : 'This Month'}</p>
                <p className="text-3xl font-bold mt-1">{stats.this_month_count}</p>
                <p className="text-violet-100 text-xs mt-2">
                  {formatAmount(stats.this_month_amount || 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold mb-3 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {isArabic ? 'تصفية' : 'Filters'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <Input
              label={isArabic ? 'رقم المورد' : 'Vendor ID'}
              type="text"
              value={filters.vendorId}
              onChange={(e) => handleFilterChange('vendorId', e.target.value)}
              placeholder={isArabic ? 'أدخل رقم المورد' : 'Vendor ID'}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isArabic ? 'الحالة' : 'Status'}
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white text-sm"
              >
                <option value="">{isArabic ? 'الكل' : 'All'}</option>
                <option value="draft">{isArabic ? 'مسودة' : 'Draft'}</option>
                <option value="posted">{isArabic ? 'مرحّل' : 'Posted'}</option>
              </select>
            </div>
            <Input
              label={isArabic ? 'من تاريخ' : 'From Date'}
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <Input
              label={isArabic ? 'إلى تاريخ' : 'To Date'}
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="unallocatedOnly"
                  checked={filters.unallocatedOnly}
                  onChange={(e) => handleFilterChange('unallocatedOnly', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="unallocatedOnly" className="text-xs text-gray-600 dark:text-gray-400">
                  {isArabic ? 'غير مخصص فقط' : 'Unallocated'}
                </label>
              </div>
              <Button size="sm" onClick={handleApplyFilters}>{isArabic ? 'بحث' : 'Apply'}</Button>
              <Button size="sm" variant="secondary" onClick={handleClearFilters}>{isArabic ? 'مسح' : 'Clear'}</Button>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <DataTablePro
            columns={columns}
            data={payments}
            keyExtractor={(row) => row.id.toString()}
            loading={loading}
            emptyMessage={isArabic ? 'لا توجد مدفوعات' : 'No payments found'}
            searchable={false}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isArabic
                  ? `صفحة ${currentPage} من ${totalPages} (${totalCount} سجل)`
                  : `Page ${currentPage} of ${totalPages} (${totalCount} records)`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  {'<<'}
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  {isArabic ? 'السابق' : 'Prev'}
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  {isArabic ? 'التالي' : 'Next'}
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  {'>>'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setPaymentToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={isArabic ? 'حذف الدفعة' : 'Delete Payment'}
        message={isArabic
          ? `هل أنت متأكد من حذف الدفعة "${paymentToDelete?.payment_number}"؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Are you sure you want to delete payment "${paymentToDelete?.payment_number}"? This action cannot be undone.`}
        confirmText={isArabic ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />

      {/* Unpost Confirmation Dialog */}
      <ConfirmDialog
        isOpen={unpostConfirmOpen}
        onClose={() => {
          setUnpostConfirmOpen(false);
          setPaymentToUnpost(null);
        }}
        onConfirm={handleUnpostConfirm}
        title={isArabic ? 'إلغاء ترحيل الدفعة' : 'Revert Payment to Draft'}
        message={isArabic
          ? `هل أنت متأكد من إلغاء ترحيل الدفعة "${paymentToUnpost?.payment_number}"؟ سيتم إلغاء القيود المحاسبية المرتبطة.`
          : `Are you sure you want to revert payment "${paymentToUnpost?.payment_number}" to draft? Journal entries will be reversed.`}
        confirmText={isArabic ? 'إلغاء الترحيل' : 'Unpost'}
        variant="danger"
        loading={unposting}
      />
    </MainLayout>
  );
}
