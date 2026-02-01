import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  ArrowsRightLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  CloudArrowDownIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ==================================================
// Types
// ==================================================

type RateType = 'standard' | 'buying' | 'selling' | 'customs';
type RateSource = 'manual' | 'central_bank' | 'api' | 'ecb' | 'openexchangerates';

interface Currency {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  symbol: string;
}

interface ExchangeRate {
  id: number;
  company_id: number;
  from_currency_id: number;
  from_currency_code: string;
  from_currency_name: string;
  from_currency_name_ar: string;
  from_currency_symbol: string;
  to_currency_id: number;
  to_currency_code: string;
  to_currency_name: string;
  to_currency_name_ar: string;
  to_currency_symbol: string;
  rate: string | number;
  rate_date: string;
  rate_type: RateType;
  source: RateSource;
  is_active: boolean;
  created_by: number;
  created_by_email: string;
  created_at: string;
  updated_at: string | null;
}

interface FormData {
  from_currency_id: string;
  to_currency_id: string;
  rate: string;
  rate_date: string;
  rate_type: RateType;
  source: RateSource;
  is_active: boolean;
}

interface Filters {
  from_currency_id: string;
  to_currency_id: string;
  rate_type: string;
  source: string;
  is_active: string;
  date_from: string;
  date_to: string;
}

const initialFormData: FormData = {
  from_currency_id: '',
  to_currency_id: '',
  rate: '',
  rate_date: new Date().toISOString().split('T')[0],
  rate_type: 'standard',
  source: 'manual',
  is_active: true,
};

const initialFilters: Filters = {
  from_currency_id: '',
  to_currency_id: '',
  rate_type: '',
  source: '',
  is_active: '',
  date_from: '',
  date_to: '',
};

// ==================================================
// Utility Functions
// ==================================================

const rateTypeLabels: Record<RateType, { en: string; ar: string }> = {
  standard: { en: 'Standard', ar: 'قياسي' },
  buying: { en: 'Buying', ar: 'شراء' },
  selling: { en: 'Selling', ar: 'بيع' },
  customs: { en: 'Customs', ar: 'جمركي' },
};

const sourceLabels: Record<RateSource, { en: string; ar: string }> = {
  manual: { en: 'Manual', ar: 'يدوي' },
  central_bank: { en: 'Central Bank', ar: 'البنك المركزي' },
  api: { en: 'API', ar: 'واجهة برمجية' },
  ecb: { en: 'ECB', ar: 'البنك المركزي الأوروبي' },
  openexchangerates: { en: 'OpenExchangeRates', ar: 'OpenExchangeRates' },
};

// ==================================================
// Main Component
// ==================================================

export default function ExchangeRatesPage() {
  const { locale, t } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission, hasPermission } = usePermissions();

  // Permissions
  const canView = hasAnyPermission([MenuPermissions.Master.View, 'exchange_rates:view']);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, 'exchange_rates:create']);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, 'exchange_rates:update']);
  const canDelete = hasAnyPermission([MenuPermissions.Master.Delete, 'exchange_rates:delete']);
  const canSync = hasPermission('exchange_rates:sync_api');

  // State
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<ExchangeRate | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ==================================================
  // API Functions
  // ==================================================

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchCurrencies = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/currencies`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch currencies');
      const data = await res.json();
      setCurrencies(data.data || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      showToast(locale === 'ar' ? 'فشل تحميل العملات' : 'Failed to load currencies', 'error');
    }
  }, [locale, showToast]);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      if (filters.from_currency_id) params.set('from_currency_id', filters.from_currency_id);
      if (filters.to_currency_id) params.set('to_currency_id', filters.to_currency_id);
      if (filters.rate_type) params.set('rate_type', filters.rate_type);
      if (filters.source) params.set('source', filters.source);
      if (filters.is_active) params.set('is_active', filters.is_active);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);

      const res = await fetch(`${API_URL}/api/exchange-rates?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          showToast(locale === 'ar' ? 'غير مصرح' : 'Unauthorized', 'error');
          return;
        }
        throw new Error('Failed to fetch rates');
      }

      const data = await res.json();
      setRates(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      showToast(locale === 'ar' ? 'فشل تحميل أسعار الصرف' : 'Failed to load exchange rates', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, locale, showToast]);

  useEffect(() => {
    if (canView) {
      fetchCurrencies();
      fetchRates();
    }
  }, [canView, fetchCurrencies, fetchRates]);

  // ==================================================
  // Form Validation
  // ==================================================

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.from_currency_id) {
      errors.from_currency_id = locale === 'ar' ? 'العملة الأصلية مطلوبة' : 'From currency is required';
    }
    if (!formData.to_currency_id) {
      errors.to_currency_id = locale === 'ar' ? 'العملة الهدف مطلوبة' : 'To currency is required';
    }
    if (formData.from_currency_id === formData.to_currency_id && formData.from_currency_id) {
      errors.to_currency_id = locale === 'ar' ? 'العملتان يجب أن تكونا مختلفتين' : 'Currencies must be different';
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      errors.rate = locale === 'ar' ? 'السعر يجب أن يكون أكبر من صفر' : 'Rate must be greater than 0';
    }
    if (!formData.rate_date) {
      errors.rate_date = locale === 'ar' ? 'التاريخ مطلوب' : 'Date is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================================================
  // CRUD Handlers
  // ==================================================

  const handleCreate = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/exchange-rates`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          from_currency_id: parseInt(formData.from_currency_id),
          to_currency_id: parseInt(formData.to_currency_id),
          rate: parseFloat(formData.rate),
          rate_date: formData.rate_date,
          rate_type: formData.rate_type,
          source: formData.source,
          is_active: formData.is_active,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          showToast(locale === 'ar' ? 'سعر الصرف موجود مسبقاً لهذا التاريخ' : 'Exchange rate already exists for this date', 'error');
        } else {
          throw new Error(data.error?.message || 'Failed to create');
        }
        return;
      }

      showToast(locale === 'ar' ? 'تم إنشاء سعر الصرف بنجاح' : 'Exchange rate created successfully', 'success');
      setCreateOpen(false);
      setFormData(initialFormData);
      fetchRates();
    } catch (error: any) {
      console.error('Error creating exchange rate:', error);
      showToast(error.message || (locale === 'ar' ? 'فشل الإنشاء' : 'Failed to create'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRate || !validateForm()) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/exchange-rates/${selectedRate.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          from_currency_id: parseInt(formData.from_currency_id),
          to_currency_id: parseInt(formData.to_currency_id),
          rate: parseFloat(formData.rate),
          rate_date: formData.rate_date,
          rate_type: formData.rate_type,
          source: formData.source,
          is_active: formData.is_active,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update');
      }

      showToast(locale === 'ar' ? 'تم تحديث سعر الصرف بنجاح' : 'Exchange rate updated successfully', 'success');
      setEditOpen(false);
      setSelectedRate(null);
      setFormData(initialFormData);
      fetchRates();
    } catch (error: any) {
      console.error('Error updating exchange rate:', error);
      showToast(error.message || (locale === 'ar' ? 'فشل التحديث' : 'Failed to update'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRate) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/exchange-rates/${selectedRate.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to delete');
      }

      showToast(locale === 'ar' ? 'تم حذف سعر الصرف بنجاح' : 'Exchange rate deleted successfully', 'success');
      setDeleteOpen(false);
      setSelectedRate(null);
      fetchRates();
    } catch (error: any) {
      console.error('Error deleting exchange rate:', error);
      showToast(error.message || (locale === 'ar' ? 'فشل الحذف' : 'Failed to delete'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/exchange-rates/sync`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          base_currency_code: 'USD',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to sync');
      }

      const syncedCount = data.data?.synced?.length || 0;
      showToast(
        locale === 'ar' 
          ? `تم مزامنة ${syncedCount} سعر صرف` 
          : `Synced ${syncedCount} exchange rates`,
        'success'
      );
      fetchRates();
    } catch (error: any) {
      console.error('Error syncing exchange rates:', error);
      showToast(error.message || (locale === 'ar' ? 'فشل المزامنة' : 'Failed to sync'), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleActive = async (rate: ExchangeRate) => {
    try {
      const res = await fetch(`${API_URL}/api/exchange-rates/${rate.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: !rate.is_active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to update');
      }

      showToast(
        locale === 'ar' 
          ? (rate.is_active ? 'تم تعطيل السعر' : 'تم تفعيل السعر')
          : (rate.is_active ? 'Rate deactivated' : 'Rate activated'),
        'success'
      );
      fetchRates();
    } catch (error: any) {
      console.error('Error toggling rate status:', error);
      showToast(error.message || (locale === 'ar' ? 'فشل التحديث' : 'Failed to update'), 'error');
    }
  };

  // ==================================================
  // UI Helpers
  // ==================================================

  const openEditModal = (rate: ExchangeRate) => {
    setSelectedRate(rate);
    setFormData({
      from_currency_id: rate.from_currency_id.toString(),
      to_currency_id: rate.to_currency_id.toString(),
      rate: String(rate.rate),
      rate_date: rate.rate_date?.split('T')[0] || '',
      rate_type: rate.rate_type,
      source: rate.source,
      is_active: rate.is_active,
    });
    setFormErrors({});
    setEditOpen(true);
  };

  const openDeleteModal = (rate: ExchangeRate) => {
    setSelectedRate(rate);
    setDeleteOpen(true);
  };

  const formatRate = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 6 
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getStatusBadge = (isActive: boolean) => (
    <span className={clsx(
      'px-2 py-0.5 text-xs font-medium rounded-full',
      isActive 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    )}>
      {isActive 
        ? (locale === 'ar' ? 'نشط' : 'Active')
        : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
    </span>
  );

  const getSourceBadge = (source: RateSource) => {
    const colors: Record<RateSource, string> = {
      manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      central_bank: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      api: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      ecb: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      openexchangerates: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', colors[source])}>
        {locale === 'ar' ? sourceLabels[source].ar : sourceLabels[source].en}
      </span>
    );
  };

  // Computed stats
  const activeCount = rates.filter(r => r.is_active).length;
  const lastUpdate = rates.length > 0 
    ? rates.reduce((max, r) => (r.rate_date > max ? r.rate_date : max), rates[0]?.rate_date || '')
    : null;

  const totalPages = Math.ceil(total / limit);

  // ==================================================
  // Render: Access Denied
  // ==================================================

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'أسعار الصرف - SLMS' : 'Exchange Rates - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <ArrowsRightLeftIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض أسعار الصرف.' : "You don't have permission to view exchange rates."}
          </p>
        </div>
      </MainLayout>
    );
  }

  // ==================================================
  // Render: Main
  // ==================================================

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'أسعار الصرف - SLMS' : 'Exchange Rates - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <ArrowsRightLeftIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'أسعار الصرف' : 'Exchange Rates'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة أسعار الصرف بين العملات' : 'Manage exchange rates between currencies'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canSync && (
              <Button variant="secondary" onClick={handleSync} loading={syncing}>
                <CloudArrowDownIcon className="h-4 w-4" />
                {locale === 'ar' ? 'مزامنة من API' : 'Sync from API'}
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => { setFormData(initialFormData); setFormErrors({}); setCreateOpen(true); }}>
                <PlusIcon className="h-4 w-4" />
                {locale === 'ar' ? 'سعر جديد' : 'New Rate'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'آخر تحديث' : 'Last Update'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {lastUpdate ? formatDate(lastUpdate) : '—'}
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FunnelIcon className="h-4 w-4" />
                {locale === 'ar' ? 'فلترة' : 'Filter'}
              </Button>
              
              {/* Quick filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filters.source}
                  onChange={(e) => { setFilters(f => ({ ...f, source: e.target.value })); setPage(1); }}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">{locale === 'ar' ? 'كل المصادر' : 'All Sources'}</option>
                  {Object.entries(sourceLabels).map(([key, label]) => (
                    <option key={key} value={key}>{locale === 'ar' ? label.ar : label.en}</option>
                  ))}
                </select>
                
                <select
                  value={filters.is_active}
                  onChange={(e) => { setFilters(f => ({ ...f, is_active: e.target.value })); setPage(1); }}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                  <option value="true">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                  <option value="false">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                </select>

                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => { setFilters(initialFilters); setPage(1); }}
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'إعادة تعيين' : 'Reset'}
                </Button>
              </div>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {locale === 'ar' ? 'من عملة' : 'From Currency'}
                  </label>
                  <select
                    value={filters.from_currency_id}
                    onChange={(e) => { setFilters(f => ({ ...f, from_currency_id: e.target.value })); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
                    {currencies.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {locale === 'ar' ? c.name_ar || c.name : c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {locale === 'ar' ? 'إلى عملة' : 'To Currency'}
                  </label>
                  <select
                    value={filters.to_currency_id}
                    onChange={(e) => { setFilters(f => ({ ...f, to_currency_id: e.target.value })); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
                    {currencies.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {locale === 'ar' ? c.name_ar || c.name : c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {locale === 'ar' ? 'من تاريخ' : 'From Date'}
                  </label>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => { setFilters(f => ({ ...f, date_from: e.target.value })); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {locale === 'ar' ? 'إلى تاريخ' : 'To Date'}
                  </label>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => { setFilters(f => ({ ...f, date_to: e.target.value })); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <ArrowPathIcon className="h-8 w-8 mx-auto text-gray-400 animate-spin" />
                <p className="mt-2 text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
              </div>
            ) : rates.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowsRightLeftIcon className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">{locale === 'ar' ? 'لا توجد أسعار صرف' : 'No exchange rates found'}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الزوج' : 'Pair'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'السعر' : 'Rate'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'النوع' : 'Type'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'المصدر' : 'Source'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {rate.from_currency_code}
                          </span>
                          <ArrowsRightLeftIcon className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {rate.to_currency_code}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {locale === 'ar' 
                            ? `${rate.from_currency_name_ar || rate.from_currency_name} → ${rate.to_currency_name_ar || rate.to_currency_name}`
                            : `${rate.from_currency_name} → ${rate.to_currency_name}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 dark:text-white">
                        {formatRate(rate.rate)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {formatDate(rate.rate_date)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {locale === 'ar' ? rateTypeLabels[rate.rate_type].ar : rateTypeLabels[rate.rate_type].en}
                      </td>
                      <td className="px-4 py-3">
                        {getSourceBadge(rate.source)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(rate.is_active)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openEditModal(rate)}
                                title={locale === 'ar' ? 'تعديل' : 'Edit'}
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={rate.is_active ? 'secondary' : 'primary'}
                                onClick={() => handleToggleActive(rate)}
                                title={rate.is_active 
                                  ? (locale === 'ar' ? 'تعطيل' : 'Deactivate')
                                  : (locale === 'ar' ? 'تفعيل' : 'Activate')}
                              >
                                {rate.is_active 
                                  ? <XCircleIcon className="h-4 w-4" />
                                  : <CheckCircleIcon className="h-4 w-4" />}
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => openDeleteModal(rate)}
                              title={locale === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {locale === 'ar' 
                  ? `عرض ${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} من ${total}`
                  : `Showing ${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} of ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal 
        isOpen={createOpen} 
        onClose={() => setCreateOpen(false)} 
        title={locale === 'ar' ? 'سعر صرف جديد' : 'New Exchange Rate'} 
        size="lg"
      >
        <div className="space-y-4">
          {/* Helper text explaining how to enter rates */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
              {locale === 'ar' 
                ? '💡 طريقة الإدخال: إذا كانت عملتك الأساسية SAR وتريد إدخال سعر الدولار (3.75 ريال لكل دولار):'
                : '💡 Entry method: If your base currency is SAR and you want to enter USD rate (3.75 SAR per USD):'}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              {locale === 'ar'
                ? '• من عملة: SAR (العملة الأساسية) | إلى عملة: USD (العملة الأجنبية) | السعر: 3.75'
                : '• From: SAR (base) | To: USD (foreign) | Rate: 3.75'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'من عملة (العملة الأساسية)' : 'From Currency (Base)'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.from_currency_id}
                onChange={(e) => setFormData({ ...formData, from_currency_id: e.target.value })}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  formErrors.from_currency_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              >
                <option value="">{locale === 'ar' ? 'اختر العملة' : 'Select currency'}</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {locale === 'ar' ? c.name_ar || c.name : c.name}</option>
                ))}
              </select>
              {formErrors.from_currency_id && (
                <p className="mt-1 text-sm text-red-500">{formErrors.from_currency_id}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'إلى عملة (العملة الأجنبية)' : 'To Currency (Foreign)'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.to_currency_id}
                onChange={(e) => setFormData({ ...formData, to_currency_id: e.target.value })}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  formErrors.to_currency_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              >
                <option value="">{locale === 'ar' ? 'اختر العملة' : 'Select currency'}</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {locale === 'ar' ? c.name_ar || c.name : c.name}</option>
                ))}
              </select>
              {formErrors.to_currency_id && (
                <p className="mt-1 text-sm text-red-500">{formErrors.to_currency_id}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'السعر' : 'Rate'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  formErrors.rate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
                placeholder="0.00"
              />
              {formErrors.rate && (
                <p className="mt-1 text-sm text-red-500">{formErrors.rate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'التاريخ' : 'Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.rate_date}
                onChange={(e) => setFormData({ ...formData, rate_date: e.target.value })}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  formErrors.rate_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {formErrors.rate_date && (
                <p className="mt-1 text-sm text-red-500">{formErrors.rate_date}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'نوع السعر' : 'Rate Type'}
              </label>
              <select
                value={formData.rate_type}
                onChange={(e) => setFormData({ ...formData, rate_type: e.target.value as RateType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(rateTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{locale === 'ar' ? label.ar : label.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المصدر' : 'Source'}
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as RateSource })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(sourceLabels).map(([key, label]) => (
                  <option key={key} value={key}>{locale === 'ar' ? label.ar : label.en}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              {locale === 'ar' ? 'نشط' : 'Active'}
            </label>
          </div>

          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate} loading={saving}>
              {locale === 'ar' ? 'إنشاء' : 'Create'}
            </Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={editOpen} 
        onClose={() => { setEditOpen(false); setSelectedRate(null); }} 
        title={locale === 'ar' ? 'تعديل سعر الصرف' : 'Edit Exchange Rate'} 
        size="lg"
      >
        <div className="space-y-4">
          {/* Helper text */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
              {locale === 'ar' 
                ? '💡 طريقة الإدخال: إذا كانت عملتك الأساسية SAR وتريد إدخال سعر الدولار (3.75 ريال لكل دولار):'
                : '💡 Entry method: If your base currency is SAR and you want to enter USD rate (3.75 SAR per USD):'}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              {locale === 'ar'
                ? '• من عملة: SAR (العملة الأساسية) | إلى عملة: USD (العملة الأجنبية) | السعر: 3.75'
                : '• From: SAR (base) | To: USD (foreign) | Rate: 3.75'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'من عملة (العملة الأساسية)' : 'From Currency (Base)'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.from_currency_id}
                onChange={(e) => setFormData({ ...formData, from_currency_id: e.target.value })}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  formErrors.from_currency_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              >
                <option value="">{locale === 'ar' ? 'اختر العملة' : 'Select currency'}</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {locale === 'ar' ? c.name_ar || c.name : c.name}</option>
                ))}
              </select>
              {formErrors.from_currency_id && (
                <p className="mt-1 text-sm text-red-500">{formErrors.from_currency_id}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'إلى عملة (العملة الأجنبية)' : 'To Currency (Foreign)'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.to_currency_id}
                onChange={(e) => setFormData({ ...formData, to_currency_id: e.target.value })}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  formErrors.to_currency_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              >
                <option value="">{locale === 'ar' ? 'اختر العملة' : 'Select currency'}</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {locale === 'ar' ? c.name_ar || c.name : c.name}</option>
                ))}
              </select>
              {formErrors.to_currency_id && (
                <p className="mt-1 text-sm text-red-500">{formErrors.to_currency_id}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'السعر' : 'Rate'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  formErrors.rate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
                placeholder="0.00"
              />
              {formErrors.rate && (
                <p className="mt-1 text-sm text-red-500">{formErrors.rate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'التاريخ' : 'Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.rate_date}
                onChange={(e) => setFormData({ ...formData, rate_date: e.target.value })}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  formErrors.rate_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {formErrors.rate_date && (
                <p className="mt-1 text-sm text-red-500">{formErrors.rate_date}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'نوع السعر' : 'Rate Type'}
              </label>
              <select
                value={formData.rate_type}
                onChange={(e) => setFormData({ ...formData, rate_type: e.target.value as RateType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(rateTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{locale === 'ar' ? label.ar : label.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المصدر' : 'Source'}
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as RateSource })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(sourceLabels).map(([key, label]) => (
                  <option key={key} value={key}>{locale === 'ar' ? label.ar : label.en}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="edit_is_active" className="text-sm text-gray-700 dark:text-gray-300">
              {locale === 'ar' ? 'نشط' : 'Active'}
            </label>
          </div>

          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleUpdate} loading={saving}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => { setEditOpen(false); setSelectedRate(null); }}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setSelectedRate(null); }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف سعر الصرف' : 'Delete Exchange Rate'}
        message={
          selectedRate 
            ? (locale === 'ar' 
                ? `هل أنت متأكد من حذف سعر الصرف ${selectedRate.from_currency_code} → ${selectedRate.to_currency_code}؟ هذا الإجراء لا يمكن التراجع عنه.`
                : `Are you sure you want to delete the exchange rate ${selectedRate.from_currency_code} → ${selectedRate.to_currency_code}? This action cannot be undone.`)
            : ''
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}
