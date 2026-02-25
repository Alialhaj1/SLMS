import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  ScaleIcon, PlusIcon, PencilIcon, TrashIcon,
  MagnifyingGlassIcon, ArrowPathIcon, EyeIcon,
  CalculatorIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon,
  CheckCircleIcon, XCircleIcon, GlobeAltIcon,
  DocumentTextIcon, CurrencyDollarIcon, ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ─── Types ──────────────────────────────────────────────────────────
interface Tariff {
  id: number;
  hs_code: string;
  hs_description_en: string | null;
  hs_description_ar: string | null;
  country_code: string;
  duty_rate_percent: number;
  effective_from: string;
  effective_to: string | null;
  notes_en: string | null;
  notes_ar: string | null;
  is_active: boolean;
  duty_type_code: string;
  duty_type_name_en: string | null;
  duty_type_name_ar: string | null;
  rate_type: string;
  rate_fixed: number;
  fta_code: string | null;
  origin_country_code: string | null;
  rule_type: 'DUTY' | 'EXEMPT' | 'PROHIBITED';
  calculation_basis: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  unique_hs_codes: number;
  unique_countries: number;
  zero_duty: number;
  with_duty: number;
  fta_rates: number;
  fta_agreements: number;
  duty_types: number;
  avg_rate: number | null;
  max_rate: number | null;
  excise_items: number;
  expired: number;
}

interface Filters {
  countries: string[];
  dutyTypes: { duty_type_code: string; name_en: string; name_ar: string }[];
  ftaAgreements: string[];
}

interface CalcResult {
  hs_code: string;
  country_code: string;
  goods_value: number;
  quantity: number;
  breakdown: {
    duty_type: string;
    duty_type_name_en: string;
    duty_type_name_ar: string;
    rate_type: string;
    rate_percent: number;
    rate_fixed: number;
    fta_code: string | null;
    calculated_amount: number;
  }[];
  total_duty: number;
  total_with_goods: number;
  tariffs_found: number;
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

const RULE_BADGES: Record<string, { en: string; ar: string; color: string }> = {
  DUTY:       { en: 'Duty',       ar: 'رسوم',   color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  EXEMPT:     { en: 'Exempt',     ar: 'معفى',    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  PROHIBITED: { en: 'Prohibited', ar: 'محظور',   color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

const DUTY_TYPE_COLORS: Record<string, string> = {
  import_duty:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  vat_import:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  excise_tax:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  anti_dumping:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  export_fee:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  transit_fee:       'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  port_handling:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  customs_processing:'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300',
};

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
export default function TariffsEnterprisePage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';

  const canView   = hasPermission(MenuPermissions.Logistics.CustomsTariffs.View);
  const canCreate = hasPermission(MenuPermissions.Logistics.CustomsTariffs.Create);
  const canEdit   = hasPermission(MenuPermissions.Logistics.CustomsTariffs.Edit);
  const canDelete = hasPermission(MenuPermissions.Logistics.CustomsTariffs.Delete);

  // ─── State ──────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [data, setData] = useState<Tariff[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterCountry, setFilterCountry] = useState('');
  const [filterDutyType, setFilterDutyType] = useState('');
  const [filterFta, setFilterFta] = useState('');
  const [filterRule, setFilterRule] = useState('');

  // Modals
  const [selected, setSelected] = useState<Tariff | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tariff | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Calculator
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcHsCode, setCalcHsCode] = useState('');
  const [calcCountry, setCalcCountry] = useState('SA');
  const [calcValue, setCalcValue] = useState('100000');
  const [calcQty, setCalcQty] = useState('1');
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    hs_code: '', country_code: 'SA', duty_rate_percent: '5',
    effective_from: '2025-01-01', effective_to: '',
    notes_en: '', notes_ar: '', is_active: true,
    duty_type_code: 'import_duty', rate_type: 'percentage',
    rate_fixed: '0', fta_code: '', origin_country_code: '',
  });

  // ─── API calls ──────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch('/api/master/tariffs/stats');
      setStats(res.data);
    } catch (err: any) { console.error('Stats error:', err); }
  }, []);

  const loadFilters = useCallback(async () => {
    try {
      const res = await apiFetch('/api/master/tariffs/filters');
      setFilters(res.data);
    } catch (err: any) { console.error('Filters error:', err); }
  }, []);

  const loadList = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(pageSize) });
      if (search) params.set('search', search);
      if (filterCountry) params.set('country_code', filterCountry);
      if (filterDutyType) params.set('duty_type_code', filterDutyType);
      if (filterFta) params.set('fta_code', filterFta);
      if (filterRule) params.set('rule_type', filterRule);
      const res = await apiFetch(`/api/master/tariffs?${params}`);
      setData(res.data);
      setTotal(res.total);
      setPage(p);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally { setLoading(false); }
  }, [search, filterCountry, filterDutyType, filterFta, filterRule, pageSize, showToast]);

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
  }, [canView, search, filterCountry, filterDutyType, filterFta, filterRule]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill from URL query
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.hs_code) setSearch(String(router.query.hs_code));
  }, [router.isReady, router.query.hs_code]);

  // ─── Form handlers ─────────────────────────────────────────────
  const openCreate = () => {
    setFormMode('create');
    setFormData({
      hs_code: '', country_code: 'SA', duty_rate_percent: '5',
      effective_from: new Date().toISOString().slice(0, 10), effective_to: '',
      notes_en: '', notes_ar: '', is_active: true,
      duty_type_code: 'import_duty', rate_type: 'percentage',
      rate_fixed: '0', fta_code: '', origin_country_code: '',
    });
    setFormOpen(true);
  };

  const openEdit = (t: Tariff) => {
    setFormMode('edit');
    setSelected(t);
    setFormData({
      hs_code: t.hs_code,
      country_code: t.country_code,
      duty_rate_percent: String(t.duty_rate_percent),
      effective_from: t.effective_from?.slice(0, 10) || '',
      effective_to: t.effective_to?.slice(0, 10) || '',
      notes_en: t.notes_en || '',
      notes_ar: t.notes_ar || '',
      is_active: t.is_active,
      duty_type_code: t.duty_type_code || 'import_duty',
      rate_type: t.rate_type || 'percentage',
      rate_fixed: String(t.rate_fixed || 0),
      fta_code: t.fta_code || '',
      origin_country_code: t.origin_country_code || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.hs_code.trim() || !formData.country_code.trim()) {
      showToast(isRTL ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        duty_rate_percent: Number(formData.duty_rate_percent) || 0,
        rate_fixed: Number(formData.rate_fixed) || 0,
        effective_to: formData.effective_to || null,
        notes_en: formData.notes_en || null,
        notes_ar: formData.notes_ar || null,
        fta_code: formData.fta_code || null,
        origin_country_code: formData.origin_country_code || null,
      };
      if (formMode === 'create') {
        await apiFetch('/api/master/tariffs', { method: 'POST', body: JSON.stringify(payload) });
        showToast(isRTL ? 'تم الإنشاء بنجاح' : 'Created successfully', 'success');
      } else {
        await apiFetch(`/api/master/tariffs/${selected!.id}`, { method: 'PUT', body: JSON.stringify(payload) });
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
      await apiFetch(`/api/master/tariffs/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
      setDeleteTarget(null);
      loadStats();
      loadList(page);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally { setDeleteLoading(false); }
  };

  const handleCalculate = async () => {
    if (!calcHsCode.trim()) {
      showToast(isRTL ? 'أدخل رمز النظام المنسق' : 'Enter HS Code', 'error');
      return;
    }
    setCalcLoading(true);
    try {
      const params = new URLSearchParams({
        hs_code: calcHsCode,
        country_code: calcCountry,
        value: calcValue,
        quantity: calcQty,
      });
      const res = await apiFetch(`/api/master/tariffs/calculate?${params}`);
      setCalcResult(res.data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally { setCalcLoading(false); }
  };

  // ─── Access denied ─────────────────────────────────────────────
  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{isRTL ? 'التعريفة الجمركية' : 'Customs Tariffs'} - SLMS</title></Head>
        <div className="text-center py-16">
          <ScaleIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
      <Head><title>{t('tariffs.title') || (isRTL ? 'التعريفة الجمركية' : 'Customs Tariffs')} - SLMS</title></Head>

      <div className="space-y-6 animate-fade-in">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <ScaleIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('tariffs.title') || (isRTL ? 'التعريفة الجمركية' : 'Customs Tariffs')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('tariffs.subtitle') || (isRTL ? 'إدارة معدلات الرسوم الجمركية واتفاقيات التجارة الحرة' : 'Manage duty rates, FTA agreements & tariff schedules')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setCalcOpen(true); setCalcResult(null); }}>
              <CalculatorIcon className="h-4 w-4" />
              {isRTL ? 'حاسبة الرسوم' : 'Duty Calculator'}
            </Button>
            {canCreate && (
              <Button onClick={openCreate}>
                <PlusIcon className="h-4 w-4" />
                {t('tariffs.addNew') || (isRTL ? 'إضافة تعريفة' : 'Add Tariff')}
              </Button>
            )}
          </div>
        </div>

        {/* ─── Stats Cards ────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label={isRTL ? 'إجمالي التعريفات' : 'Total Tariffs'}
              value={stats.total.toLocaleString()}
              icon={ScaleIcon}
              color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
            />
            <StatCard
              label={isRTL ? 'رموز HS فريدة' : 'Unique HS Codes'}
              value={stats.unique_hs_codes.toLocaleString()}
              icon={DocumentTextIcon}
              color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
            />
            <StatCard
              label={isRTL ? 'بدون رسوم' : 'Zero Duty'}
              value={stats.zero_duty.toLocaleString()}
              icon={ShieldCheckIcon}
              color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300"
            />
            <StatCard
              label={isRTL ? 'معدلات FTA' : 'FTA Rates'}
              value={stats.fta_rates}
              icon={GlobeAltIcon}
              color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300"
            />
            <StatCard
              label={isRTL ? 'متوسط المعدل' : 'Avg Rate'}
              value={stats.avg_rate != null ? `${stats.avg_rate}%` : '—'}
              icon={CurrencyDollarIcon}
              color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
            />
            <StatCard
              label={isRTL ? 'سلع انتقائية' : 'Excise Items'}
              value={stats.excise_items}
              icon={ExclamationTriangleIcon}
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
                  placeholder={isRTL ? 'بحث برمز HS، الوصف، الدولة، FTA...' : 'Search by HS code, description, country, FTA...'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button size="sm" variant="secondary" onClick={() => {
                setSearch(''); setFilterCountry(''); setFilterDutyType(''); setFilterFta(''); setFilterRule('');
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
              {filters && (
                <>
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100"
                  >
                    <option value="">{isRTL ? 'جميع الدول' : 'All Countries'}</option>
                    {filters.countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={filterDutyType}
                    onChange={(e) => setFilterDutyType(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100"
                  >
                    <option value="">{isRTL ? 'جميع أنواع الرسوم' : 'All Duty Types'}</option>
                    {filters.dutyTypes.map((dt) => (
                      <option key={dt.duty_type_code} value={dt.duty_type_code}>
                        {isRTL ? dt.name_ar : dt.name_en}
                      </option>
                    ))}
                  </select>

                  {filters.ftaAgreements.length > 0 && (
                    <select
                      value={filterFta}
                      onChange={(e) => setFilterFta(e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100"
                    >
                      <option value="">{isRTL ? 'جميع اتفاقيات FTA' : 'All FTA'}</option>
                      <option value="__none__">{isRTL ? 'بدون FTA' : 'No FTA'}</option>
                      {filters.ftaAgreements.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  )}
                </>
              )}

              <select
                value={filterRule}
                onChange={(e) => setFilterRule(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100"
              >
                <option value="">{isRTL ? 'جميع الأنواع' : 'All Rules'}</option>
                <option value="DUTY">{isRTL ? 'رسوم' : 'With Duty'}</option>
                <option value="EXEMPT">{isRTL ? 'معفى' : 'Exempt (0%)'}</option>
              </select>
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
                    {isRTL ? 'رمز HS' : 'HS Code'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الوصف' : 'Description'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الدولة' : 'Country'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'نوع الرسم' : 'Duty Type'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'المعدل' : 'Rate'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'FTA' : 'FTA'}
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
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-gray-400">
                      <ScaleIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      {isRTL ? 'لا توجد تعريفات مطابقة' : 'No tariffs found'}
                    </td>
                  </tr>
                ) : (
                  data.map((row) => {
                    const ruleBadge = RULE_BADGES[row.rule_type] || RULE_BADGES.DUTY;
                    const dtColor = DUTY_TYPE_COLORS[row.duty_type_code] || 'bg-gray-100 text-gray-700';

                    return (
                      <tr key={row.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        {/* HS Code */}
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => router.push(`/master/hs-codes?search=${row.hs_code}`)}
                            className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {row.hs_code}
                          </button>
                        </td>

                        {/* Description */}
                        <td className="px-3 py-2.5">
                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-xs block">
                            {isRTL
                              ? (row.hs_description_ar || row.hs_description_en || '—')
                              : (row.hs_description_en || row.hs_description_ar || '—')}
                          </span>
                        </td>

                        {/* Country */}
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                            {row.country_code}
                          </span>
                        </td>

                        {/* Duty Type */}
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${dtColor}`}>
                            {isRTL ? (row.duty_type_name_ar || row.duty_type_code) : (row.duty_type_name_en || row.duty_type_code)}
                          </span>
                        </td>

                        {/* Rate */}
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                            {row.rate_type === 'percentage'
                              ? `${row.duty_rate_percent}%`
                              : row.rate_type === 'fixed_per_unit'
                              ? `${row.rate_fixed} SAR`
                              : `${row.duty_rate_percent}% + ${row.rate_fixed}`}
                          </span>
                        </td>

                        {/* FTA */}
                        <td className="px-3 py-2.5">
                          {row.fta_code ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-medium">
                              <GlobeAltIcon className="h-3 w-3" />
                              {row.fta_code}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${ruleBadge.color}`}>
                              {isRTL ? ruleBadge.ar : ruleBadge.en}
                            </span>
                            {row.is_active ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircleIcon className="h-4 w-4 text-red-400" />
                            )}
                          </div>
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
        title={isRTL ? 'تفاصيل التعريفة' : 'Tariff Details'}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'رمز HS' : 'HS Code'}
                </label>
                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{selected.hs_code}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'الدولة' : 'Country'}
                </label>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selected.country_code}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'الوصف' : 'Description'}
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {isRTL ? (selected.hs_description_ar || selected.hs_description_en || '—') : (selected.hs_description_en || selected.hs_description_ar || '—')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'نوع الرسم' : 'Duty Type'}
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {isRTL ? (selected.duty_type_name_ar || selected.duty_type_code) : (selected.duty_type_name_en || selected.duty_type_code)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'نوع المعدل' : 'Rate Type'}
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{selected.rate_type}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'معدل الرسوم %' : 'Duty Rate %'}
                </label>
                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{selected.duty_rate_percent}%</p>
              </div>
              {selected.rate_fixed > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'معدل ثابت' : 'Fixed Rate'}
                  </label>
                  <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{selected.rate_fixed} SAR</p>
                </div>
              )}
              {selected.fta_code && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">FTA</label>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-medium">
                    <GlobeAltIcon className="h-3 w-3" />
                    {selected.fta_code}
                  </span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'تاريخ السريان' : 'Effective From'}
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{selected.effective_from?.slice(0, 10)}</p>
              </div>
              {selected.effective_to && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRTL ? 'تاريخ الانتهاء' : 'Effective To'}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{selected.effective_to?.slice(0, 10)}</p>
                </div>
              )}
            </div>

            {(selected.notes_en || selected.notes_ar) && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'ملاحظات' : 'Notes'}
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-300">{isRTL ? selected.notes_ar : selected.notes_en}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {canEdit && (
                <Button size="sm" onClick={() => { openEdit(selected); }}>
                  <PencilIcon className="h-4 w-4" />
                  {isRTL ? 'تعديل' : 'Edit'}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════ CREATE / EDIT MODAL ═══════════ */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === 'create'
          ? (isRTL ? 'إضافة تعريفة جمركية' : 'Add Customs Tariff')
          : (isRTL ? 'تعديل التعريفة الجمركية' : 'Edit Customs Tariff')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* HS Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'رمز HS' : 'HS Code'} *
              </label>
              <input
                type="text"
                value={formData.hs_code}
                onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                placeholder="e.g. 7213"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'رمز الدولة' : 'Country Code'} *
              </label>
              <input
                type="text"
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                placeholder="SA"
                maxLength={10}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Duty Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'نوع الرسم' : 'Duty Type'}
              </label>
              <select
                value={formData.duty_type_code}
                onChange={(e) => setFormData({ ...formData, duty_type_code: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="import_duty">{isRTL ? 'رسم استيراد' : 'Import Duty'}</option>
                <option value="vat_import">{isRTL ? 'ضريبة القيمة المضافة' : 'Import VAT'}</option>
                <option value="excise_tax">{isRTL ? 'ضريبة انتقائية' : 'Excise Tax'}</option>
                <option value="anti_dumping">{isRTL ? 'رسم مكافحة الإغراق' : 'Anti-Dumping'}</option>
                <option value="export_fee">{isRTL ? 'رسم تصدير' : 'Export Fee'}</option>
                <option value="transit_fee">{isRTL ? 'رسم عبور' : 'Transit Fee'}</option>
                <option value="port_handling">{isRTL ? 'رسم مناولة' : 'Port Handling'}</option>
                <option value="customs_processing">{isRTL ? 'رسم تخليص' : 'Customs Processing'}</option>
              </select>
            </div>

            {/* Rate Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'نوع المعدل' : 'Rate Type'}
              </label>
              <select
                value={formData.rate_type}
                onChange={(e) => setFormData({ ...formData, rate_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">{isRTL ? 'نسبة مئوية' : 'Percentage'}</option>
                <option value="fixed_per_unit">{isRTL ? 'مبلغ ثابت لكل وحدة' : 'Fixed per Unit'}</option>
                <option value="compound">{isRTL ? 'مركب' : 'Compound'}</option>
              </select>
            </div>

            {/* Duty Rate % */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'معدل الرسوم %' : 'Duty Rate %'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="999"
                value={formData.duty_rate_percent}
                onChange={(e) => setFormData({ ...formData, duty_rate_percent: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fixed Rate */}
            {(formData.rate_type === 'fixed_per_unit' || formData.rate_type === 'compound') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isRTL ? 'مبلغ ثابت (SAR)' : 'Fixed Amount (SAR)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.rate_fixed}
                  onChange={(e) => setFormData({ ...formData, rate_fixed: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* FTA Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'اتفاقية تجارة حرة' : 'FTA Agreement'}
              </label>
              <input
                type="text"
                value={formData.fta_code}
                onChange={(e) => setFormData({ ...formData, fta_code: e.target.value.toUpperCase() })}
                placeholder="e.g. GCC_FTA, GAFTA"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Origin Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'بلد المنشأ' : 'Origin Country'}
              </label>
              <input
                type="text"
                value={formData.origin_country_code}
                onChange={(e) => setFormData({ ...formData, origin_country_code: e.target.value.toUpperCase() })}
                placeholder="e.g. CN, JP"
                maxLength={10}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
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

            {/* Effective To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'تاريخ الانتهاء' : 'Effective To'}
              </label>
              <input
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
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
                {isRTL ? 'نشط' : 'Active'}
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'ملاحظات (EN)' : 'Notes (EN)'}
              </label>
              <textarea
                value={formData.notes_en}
                onChange={(e) => setFormData({ ...formData, notes_en: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'ملاحظات (AR)' : 'Notes (AR)'}
              </label>
              <textarea
                value={formData.notes_ar}
                onChange={(e) => setFormData({ ...formData, notes_ar: e.target.value })}
                rows={2}
                dir="rtl"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

      {/* ═══════════ DUTY CALCULATOR MODAL ═══════════ */}
      <Modal
        isOpen={calcOpen}
        onClose={() => setCalcOpen(false)}
        title={isRTL ? 'حاسبة الرسوم الجمركية' : 'Duty Calculator'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'رمز HS' : 'HS Code'} *
              </label>
              <input
                type="text"
                value={calcHsCode}
                onChange={(e) => setCalcHsCode(e.target.value)}
                placeholder="e.g. 7213"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'الدولة' : 'Country'}
              </label>
              <input
                type="text"
                value={calcCountry}
                onChange={(e) => setCalcCountry(e.target.value.toUpperCase())}
                placeholder="SA"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'قيمة البضاعة (SAR)' : 'Goods Value (SAR)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={calcValue}
                onChange={(e) => setCalcValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'الكمية' : 'Quantity'}
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={calcQty}
                onChange={(e) => setCalcQty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <Button onClick={handleCalculate} loading={calcLoading} className="w-full">
            <CalculatorIcon className="h-4 w-4" />
            {isRTL ? 'احسب الرسوم' : 'Calculate Duties'}
          </Button>

          {calcResult && (
            <div className="mt-4 space-y-3">
              {calcResult.tariffs_found === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <ScaleIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{isRTL ? 'لم يتم العثور على تعريفات مطابقة' : 'No matching tariffs found'}</p>
                </div>
              ) : (
                <>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {isRTL ? 'تفصيل الرسوم' : 'Duty Breakdown'}
                  </h4>
                  <div className="space-y-2">
                    {calcResult.breakdown.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {isRTL ? b.duty_type_name_ar : b.duty_type_name_en}
                          </span>
                          {b.fta_code && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                              {b.fta_code}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            ({b.rate_type === 'percentage' ? `${b.rate_percent}%` : `${b.rate_fixed} SAR`})
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {b.calculated_amount.toLocaleString()} SAR
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">{isRTL ? 'قيمة البضاعة' : 'Goods Value'}</span>
                      <span className="text-sm font-mono text-gray-900 dark:text-white">{calcResult.goods_value.toLocaleString()} SAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{isRTL ? 'إجمالي الرسوم' : 'Total Duties'}</span>
                      <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{calcResult.total_duty.toLocaleString()} SAR</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{isRTL ? 'الإجمالي مع البضاعة' : 'Total with Goods'}</span>
                      <span className="text-sm font-mono font-bold text-green-600 dark:text-green-400">{calcResult.total_with_goods.toLocaleString()} SAR</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ═══════════ DELETE CONFIRM ═══════════ */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={isRTL ? 'حذف التعريفة' : 'Delete Tariff'}
        message={isRTL
          ? `هل أنت متأكد من حذف التعريفة لرمز ${deleteTarget?.hs_code}؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Are you sure you want to delete the tariff for HS ${deleteTarget?.hs_code}? This action cannot be undone.`}
        confirmText={isRTL ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleteLoading}
      />
    </MainLayout>
  );
}
