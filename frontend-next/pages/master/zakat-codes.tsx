import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import {
  QrCodeIcon, PlusIcon, PencilIcon, TrashIcon,
  MagnifyingGlassIcon, ArrowPathIcon, EyeIcon,
  FunnelIcon, ChevronLeftIcon, ChevronRightIcon,
  CheckCircleIcon, XCircleIcon,
  DocumentTextIcon, CurrencyDollarIcon,
  ShieldCheckIcon, CreditCardIcon,
  TagIcon, ScaleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ─── Types ──────────────────────────────────────────────────────────
type ZatcaType = 'vat_category' | 'unit_of_measure' | 'payment_method' | 'invoice_type' | 'exemption_reason';

interface ZatcaCode {
  id: number;
  code: string;
  type: ZatcaType;
  name_ar: string;
  name_en: string;
  applicable_to: 'B2B' | 'B2C' | 'both';
  is_active: boolean;
  version: string;
  effective_from: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  vat_categories: number;
  units_of_measure: number;
  payment_methods: number;
  invoice_types: number;
  exemption_reasons: number;
  type_count: number;
  version_count: number;
  b2b_only: number;
  b2c_only: number;
  both_applicable: number;
}

interface Filters {
  types: { type: string; count: number }[];
  versions: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function apiFetch(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const TYPE_META: Record<ZatcaType, { en: string; ar: string; icon: any; color: string }> = {
  vat_category:     { en: 'VAT Category',     ar: 'فئة الضريبة',     icon: CurrencyDollarIcon,   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  unit_of_measure:  { en: 'Unit of Measure',   ar: 'وحدة القياس',     icon: ScaleIcon,            color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  payment_method:   { en: 'Payment Method',    ar: 'طريقة الدفع',     icon: CreditCardIcon,       color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  invoice_type:     { en: 'Invoice Type',      ar: 'نوع الفاتورة',    icon: DocumentTextIcon,     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  exemption_reason: { en: 'Exemption Reason',  ar: 'سبب الإعفاء',     icon: ShieldCheckIcon,      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const APPLICABLE_BADGES: Record<string, { en: string; ar: string; color: string }> = {
  B2B:  { en: 'B2B',  ar: 'أعمال-أعمال',  color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  B2C:  { en: 'B2C',  ar: 'أعمال-مستهلك',  color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  both: { en: 'Both',  ar: 'كلاهما',        color: 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300' },
};

const VALID_TYPES: ZatcaType[] = ['vat_category', 'unit_of_measure', 'payment_method', 'invoice_type', 'exemption_reason'];

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: any; color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════
export default function ZatcaCodesEnterprisePage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';

  // Use the MasterData permission group
  const canView   = hasPermission('master:zakat_codes:view');
  const canCreate = hasPermission('master:zakat_codes:create');
  const canEdit   = hasPermission('master:zakat_codes:edit');
  const canDelete = hasPermission('master:zakat_codes:delete');

  // ─── State ──────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [data, setData] = useState<ZatcaCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterApplicable, setFilterApplicable] = useState('');
  const [filterVersion, setFilterVersion] = useState('');

  // Modals
  const [selected, setSelected] = useState<ZatcaCode | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ZatcaCode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form
  const emptyForm = {
    code: '', type: 'vat_category' as ZatcaType, name_ar: '', name_en: '',
    applicable_to: 'both' as const, is_active: true, version: '2.1',
    effective_from: new Date().toISOString().slice(0, 10), notes: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  // ─── API calls ──────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch('/api/master/zatca-codes/stats');
      setStats(res.data);
    } catch (err: any) { console.error('Stats error:', err); }
  }, []);

  const loadFilters = useCallback(async () => {
    try {
      const res = await apiFetch('/api/master/zatca-codes/filters');
      setFilters(res.data);
    } catch (err: any) { console.error('Filters error:', err); }
  }, []);

  const loadList = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(pageSize) });
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterApplicable) params.set('applicable_to', filterApplicable);
      if (filterVersion) params.set('version', filterVersion);
      const res = await apiFetch(`/api/master/zatca-codes?${params}`);
      setData(res.data);
      setTotal(res.total);
      setPage(p);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally { setLoading(false); }
  }, [search, filterType, filterApplicable, filterVersion, pageSize, showToast]);

  // ─── Effects ────────────────────────────────────────────────────
  useEffect(() => {
    if (!canView) return;
    loadStats();
    loadFilters();
  }, [canView, loadStats, loadFilters]);

  useEffect(() => {
    if (!canView) return;
    const timeout = setTimeout(() => loadList(1), 300);
    return () => clearTimeout(timeout);
  }, [canView, search, filterType, filterApplicable, filterVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Form handlers ─────────────────────────────────────────────
  const openCreate = () => {
    setFormMode('create');
    setFormData({ ...emptyForm, effective_from: new Date().toISOString().slice(0, 10) });
    setFormOpen(true);
  };

  const openEdit = (item: ZatcaCode) => {
    setFormMode('edit');
    setSelected(item);
    setFormData({
      code: item.code,
      type: item.type,
      name_ar: item.name_ar,
      name_en: item.name_en,
      applicable_to: item.applicable_to,
      is_active: item.is_active,
      version: item.version,
      effective_from: item.effective_from?.slice(0, 10) || '',
      notes: item.notes || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name_ar.trim() || !formData.name_en.trim()) {
      showToast(isRTL ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        notes: formData.notes || null,
      };
      if (formMode === 'create') {
        await apiFetch('/api/master/zatca-codes', { method: 'POST', body: JSON.stringify(payload) });
        showToast(isRTL ? 'تم الإنشاء بنجاح' : 'Created successfully', 'success');
      } else {
        await apiFetch(`/api/master/zatca-codes/${selected!.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast(isRTL ? 'تم التحديث بنجاح' : 'Updated successfully', 'success');
      }
      setFormOpen(false);
      loadStats();
      loadList(page);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/master/zatca-codes/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
      setDeleteTarget(null);
      loadStats();
      loadList(page);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally { setDeleteLoading(false); }
  };

  // ─── Access denied ─────────────────────────────────────────────
  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{isRTL ? 'أكواد ZATCA' : 'ZATCA Codes'} - SLMS</title></Head>
        <div className="text-center py-16">
          <QrCodeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isRTL ? 'غير مصرح' : 'Access Denied'}
          </h2>
        </div>
      </MainLayout>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <MainLayout>
      <Head><title>{t('zatcaCodes.title') || (isRTL ? 'أكواد ZATCA' : 'ZATCA Classification Codes')} - SLMS</title></Head>

      <div className="space-y-6 animate-fade-in">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <QrCodeIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('zatcaCodes.title') || (isRTL ? 'أكواد ZATCA' : 'ZATCA Classification Codes')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('zatcaCodes.subtitle') || (isRTL ? 'أكواد الفاتورة الإلكترونية — FATOORAH Phase 2 Compliance' : 'E-Invoicing codes — FATOORAH Phase 2 Compliance')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button onClick={openCreate}>
                <PlusIcon className="h-4 w-4" />
                {t('zatcaCodes.addNew') || (isRTL ? 'إضافة كود' : 'Add Code')}
              </Button>
            )}
          </div>
        </div>

        {/* ─── Compliance Banner ──────────────────────────────── */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{isRTL ? 'امتثال FATOORAH:' : 'FATOORAH Compliance:'}</strong>{' '}
            {isRTL
              ? 'هذه الأكواد مطلوبة للفواتير الإلكترونية المتوافقة مع ZATCA المرحلة الثانية. فاتورة بكود خاطئ تُعدّ غير مطابقة.'
              : 'These codes are required for ZATCA Phase 2 compliant e-invoices. An invoice with an incorrect code is considered non-compliant.'}
          </div>
        </div>

        {/* ─── Stats Cards ────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label={isRTL ? 'فئات الضريبة' : 'VAT Categories'}
              value={stats.vat_categories}
              icon={CurrencyDollarIcon}
              color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
            />
            <StatCard
              label={isRTL ? 'أنواع الفواتير' : 'Invoice Types'}
              value={stats.invoice_types}
              icon={DocumentTextIcon}
              color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
            />
            <StatCard
              label={isRTL ? 'طرق الدفع' : 'Payment Methods'}
              value={stats.payment_methods}
              icon={CreditCardIcon}
              color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300"
            />
            <StatCard
              label={isRTL ? 'وحدات القياس' : 'Units of Measure'}
              value={stats.units_of_measure}
              icon={ScaleIcon}
              color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300"
            />
            <StatCard
              label={isRTL ? 'أسباب الإعفاء' : 'Exemption Reasons'}
              value={stats.exemption_reasons}
              icon={ShieldCheckIcon}
              color="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
            />
          </div>
        )}

        {/* ─── Search + Filters ───────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isRTL ? 'بحث بالكود أو الوصف...' : 'Search by code or description...'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button size="sm" variant="secondary" onClick={() => {
                setSearch(''); setFilterType(''); setFilterApplicable(''); setFilterVersion('');
              }}>
                <ArrowPathIcon className="h-4 w-4" />
                {isRTL ? 'مسح' : 'Clear'}
              </Button>
            </div>

            {/* Filter dropdowns */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100"
              >
                <option value="">{isRTL ? 'جميع الأنواع' : 'All Types'}</option>
                {VALID_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {isRTL ? TYPE_META[t].ar : TYPE_META[t].en}
                    {filters ? ` (${filters.types.find((f) => f.type === t)?.count || 0})` : ''}
                  </option>
                ))}
              </select>

              <select
                value={filterApplicable}
                onChange={(e) => setFilterApplicable(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100"
              >
                <option value="">{isRTL ? 'جميع الفئات' : 'All Applicability'}</option>
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
                <option value="both">{isRTL ? 'كلاهما' : 'Both'}</option>
              </select>

              {filters && filters.versions.length > 1 && (
                <select
                  value={filterVersion}
                  onChange={(e) => setFilterVersion(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100"
                >
                  <option value="">{isRTL ? 'جميع الإصدارات' : 'All Versions'}</option>
                  {filters.versions.map((v) => (
                    <option key={v} value={v}>v{v}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* ─── Data Table ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الكود' : 'Code'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'النوع' : 'Type'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الوصف' : 'Description'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'ينطبق على' : 'Applies To'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الإصدار' : 'Version'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-24">
                    {isRTL ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading && !data.length ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-gray-400">
                      <QrCodeIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      {isRTL ? 'لا توجد أكواد مطابقة' : 'No ZATCA codes found'}
                    </td>
                  </tr>
                ) : (
                  data.map((row) => {
                    const typeMeta = TYPE_META[row.type] || TYPE_META.vat_category;
                    const appBadge = APPLICABLE_BADGES[row.applicable_to] || APPLICABLE_BADGES.both;
                    const TypeIcon = typeMeta.icon;

                    return (
                      <tr key={row.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        {/* Code */}
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                            {row.code}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeMeta.color}`}>
                            <TypeIcon className="h-3 w-3" />
                            {isRTL ? typeMeta.ar : typeMeta.en}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="px-3 py-2.5">
                          <div>
                            <span className="text-sm text-gray-900 dark:text-gray-100 block">
                              {isRTL ? row.name_ar : row.name_en}
                            </span>
                            <span className="text-xs text-gray-400 block">
                              {isRTL ? row.name_en : row.name_ar}
                            </span>
                          </div>
                        </td>

                        {/* Applicable To */}
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${appBadge.color}`}>
                            {isRTL ? appBadge.ar : appBadge.en}
                          </span>
                        </td>

                        {/* Version */}
                        <td className="px-3 py-2.5">
                          <span className="text-sm text-gray-500 dark:text-gray-400">v{row.version}</span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5">
                          {row.is_active ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircleIcon className="h-4 w-4" />
                              <span className="text-xs">{isRTL ? 'ساري' : 'Active'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400">
                              <XCircleIcon className="h-4 w-4" />
                              <span className="text-xs">{isRTL ? 'غير ساري' : 'Inactive'}</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelected(row)}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                              title={isRTL ? 'عرض' : 'View'}
                            >
                              <EyeIcon className="h-4 w-4 text-gray-500" />
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => openEdit(row)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                title={isRTL ? 'تعديل' : 'Edit'}
                              >
                                <PencilIcon className="h-4 w-4 text-blue-500" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(row)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                title={isRTL ? 'حذف' : 'Delete'}
                              >
                                <TrashIcon className="h-4 w-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL
                  ? `عرض ${((page - 1) * pageSize) + 1}-${Math.min(page * pageSize, total)} من ${total.toLocaleString()}`
                  : `Showing ${((page - 1) * pageSize) + 1}-${Math.min(page * pageSize, total)} of ${total.toLocaleString()}`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => loadList(page - 1)}
                  className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => loadList(p)}
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        p === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  disabled={page >= totalPages}
                  onClick={() => loadList(page + 1)}
                  className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ DETAIL MODAL ═══════════ */}
      <Modal
        isOpen={!!selected && !formOpen}
        onClose={() => setSelected(null)}
        title={isRTL ? 'تفاصيل كود ZATCA' : 'ZATCA Code Details'}
        size="md"
      >
        {selected && (() => {
          const typeMeta = TYPE_META[selected.type] || TYPE_META.vat_category;
          const appBadge = APPLICABLE_BADGES[selected.applicable_to] || APPLICABLE_BADGES.both;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'الكود' : 'Code'}
                  </label>
                  <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">{selected.code}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'النوع' : 'Type'}
                  </label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${typeMeta.color}`}>
                    {isRTL ? typeMeta.ar : typeMeta.en}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'الوصف (عربي)' : 'Name (Arabic)'}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white" dir="rtl">{selected.name_ar}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'الوصف (إنجليزي)' : 'Name (English)'}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{selected.name_en}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'ينطبق على' : 'Applies To'}
                  </label>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${appBadge.color}`}>
                    {isRTL ? appBadge.ar : appBadge.en}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'الإصدار' : 'Version'}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">v{selected.version}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'تاريخ السريان' : 'Effective From'}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{selected.effective_from?.slice(0, 10)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'الحالة' : 'Status'}
                  </label>
                  {selected.is_active ? (
                    <span className="inline-flex items-center gap-1 text-green-600"><CheckCircleIcon className="h-4 w-4" /> {isRTL ? 'ساري' : 'Active'}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-400"><XCircleIcon className="h-4 w-4" /> {isRTL ? 'غير ساري' : 'Inactive'}</span>
                  )}
                </div>
              </div>

              {selected.notes && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'ملاحظات' : 'Notes'}
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selected.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {canEdit && (
                  <Button size="sm" onClick={() => openEdit(selected)}>
                    <PencilIcon className="h-4 w-4" />
                    {isRTL ? 'تعديل' : 'Edit'}
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
                  {isRTL ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════ CREATE / EDIT MODAL ═══════════ */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === 'create'
          ? (isRTL ? 'إضافة كود ZATCA' : 'Add ZATCA Code')
          : (isRTL ? 'تعديل كود ZATCA' : 'Edit ZATCA Code')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'الكود' : 'Code'} *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. S, 388, KGM"
                maxLength={20}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'النوع' : 'Type'} *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ZatcaType })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {VALID_TYPES.map((t) => (
                  <option key={t} value={t}>{isRTL ? TYPE_META[t].ar : TYPE_META[t].en}</option>
                ))}
              </select>
            </div>

            {/* Name Arabic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'الوصف بالعربية' : 'Name (Arabic)'} *
              </label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                dir="rtl"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Name English */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'الوصف بالإنجليزية' : 'Name (English)'} *
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Applicable To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'ينطبق على' : 'Applicable To'}
              </label>
              <select
                value={formData.applicable_to}
                onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="both">{isRTL ? 'كلاهما' : 'Both (B2B & B2C)'}</option>
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </select>
            </div>

            {/* Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'إصدار ZATCA' : 'ZATCA Version'} *
              </label>
              <select
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="2.1">v2.1</option>
                <option value="3.0">v3.0</option>
              </select>
            </div>

            {/* Effective From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'تاريخ السريان' : 'Effective From'} *
              </label>
              <input
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Active */}
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                {isRTL ? 'ساري' : 'Active'}
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} loading={formLoading}>
              {formMode === 'create'
                ? (isRTL ? 'إنشاء' : 'Create')
                : (isRTL ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════ DELETE CONFIRM ═══════════ */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={isRTL ? 'حذف كود ZATCA' : 'Delete ZATCA Code'}
        message={isRTL
          ? `هل أنت متأكد من حذف الكود ${deleteTarget?.code} (${deleteTarget?.name_ar})؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Are you sure you want to delete code ${deleteTarget?.code} (${deleteTarget?.name_en})? This action cannot be undone.`}
        confirmText={isRTL ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleteLoading}
      />
    </MainLayout>
  );
}
