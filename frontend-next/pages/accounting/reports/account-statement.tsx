/**
 * Account Statement (كشف حساب) — Professional Report
 * =====================================================
 * Features:
 *   - 3-step filter: type chips → account → date+project
 *   - Currency display with foreign currency amounts
 *   - Project-only mode (no account required when project selected)
 *   - Amount range filter (min/max)
 *   - Professional print: page borders, printed by, timestamp
 *   - CSV export, search filter, summary cards
 *   - Balance direction indicator (مدين/دائن)
 *   - Sticky table header
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import SearchableSelect, { SelectOption } from '../../../components/ui/SearchableSelect';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useAuth } from '../../../hooks/useAuth';
import apiClient from '../../../lib/apiClient';
import {
  PrinterIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
  Squares2X2Icon,
  BuildingLibraryIcon,
  ScaleIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  FunnelIcon,
  CalendarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountOption {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  type: string;
  balance: number;
}

interface ProjectOption {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface GLRow {
  date: string;
  reference: string;
  description: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  project_code?: string;
  project_name?: string;
  currency_code?: string;
  currency_symbol?: string;
  fc_debit_amount?: number;
  fc_credit_amount?: number;
  exchange_rate?: number;
  is_base_currency?: boolean;
}

interface GLSummary {
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

interface CompanyInfo {
  id: number;
  name: string;
  name_ar?: string;
  logo_url?: string;
  tax_number?: string;
  address?: string;
  phone?: string;
}

interface CurrencyBreakdown {
  currency_code: string;
  currency_symbol: string;
  fc_debit_total: number;
  fc_credit_total: number;
  sar_debit_total: number;
  sar_credit_total: number;
  count: number;
}

// ─── Account Type Definitions ─────────────────────────────────────────────────

type AccountTypeKey = 'all' | 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface AccountTypeConfig {
  key: AccountTypeKey;
  labelAr: string;
  labelEn: string;
  icon: React.ElementType;
  colorClass: string;
  badgeClass: string;
  borderClass: string;
}

const ACCOUNT_TYPES: AccountTypeConfig[] = [
  { key: 'all', labelAr: 'جميع الحسابات', labelEn: 'All', icon: Squares2X2Icon, colorClass: 'bg-gray-800 text-white', badgeClass: 'bg-white text-gray-800', borderClass: 'border-gray-800' },
  { key: 'asset', labelAr: 'أصول', labelEn: 'Assets', icon: BuildingLibraryIcon, colorClass: 'bg-blue-600 text-white', badgeClass: 'bg-blue-100 text-blue-800', borderClass: 'border-blue-600' },
  { key: 'liability', labelAr: 'خصوم', labelEn: 'Liabilities', icon: ScaleIcon, colorClass: 'bg-orange-500 text-white', badgeClass: 'bg-orange-100 text-orange-800', borderClass: 'border-orange-500' },
  { key: 'equity', labelAr: 'حقوق الملكية', labelEn: 'Equity', icon: ChartPieIcon, colorClass: 'bg-emerald-600 text-white', badgeClass: 'bg-emerald-100 text-emerald-800', borderClass: 'border-emerald-600' },
  { key: 'revenue', labelAr: 'إيرادات', labelEn: 'Revenue', icon: ArrowTrendingUpIcon, colorClass: 'bg-teal-600 text-white', badgeClass: 'bg-teal-100 text-teal-800', borderClass: 'border-teal-600' },
  { key: 'expense', labelAr: 'مصروفات', labelEn: 'Expenses', icon: BanknotesIcon, colorClass: 'bg-rose-600 text-white', badgeClass: 'bg-rose-100 text-rose-800', borderClass: 'border-rose-600' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }
function startOfYearStr() { return `${new Date().getFullYear()}-01-01`; }
function fmtAmount(amount: number, locale: string): string {
  if (amount == null) return '—';
  return Math.abs(amount).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(dateStr: string, locale: string): string {
  if (!dateStr || dateStr === 'OPENING') return '';
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return dateStr; }
}
function fmtDateTime(locale: string): string {
  return new Date().toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, locale, color, positiveOnly }: {
  label: string; value: number; locale: string; color: string; positiveOnly?: boolean;
}) {
  const displayValue = positiveOnly ? Math.abs(value) : value;
  const isNeg = !positiveOnly && value < 0;
  return (
    <div className={clsx('border rounded-xl p-4 flex flex-col gap-1', color)}>
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className={clsx('text-lg font-bold tabular-nums', isNeg ? 'text-red-700' : '')}>
        {fmtAmount(displayValue, locale)}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AccountStatementPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission, isTenantAdmin } = usePermissions();
  const { user } = useAuth();
  const isRtl = locale === 'ar';

  // ── State ─────────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const [selectedType, setSelectedType] = useState<AccountTypeKey>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [fromDate, setFromDate] = useState(startOfYearStr());
  const [toDate, setToDate] = useState(todayStr());
  const [searchText, setSearchText] = useState('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  const [reportData, setReportData] = useState<GLRow[]>([]);
  const [summary, setSummary] = useState<GLSummary | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountOption | null>(null);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isProjectOnly, setIsProjectOnly] = useState(false);

  const [company, setCompany] = useState<CompanyInfo | null>(null);

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadAccounts();
    loadProjects();
    loadCompany();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (router.isReady && router.query.account_id) {
      setSelectedAccountId(String(router.query.account_id));
    }
  }, [router.isReady, router.query.account_id]);

  const loadAccounts = async () => {
    setAccountsLoading(true);
    try {
      const res = await apiClient.get('/api/reports/general-ledger/accounts?exclude_zero=false');
      if (res && res.data) { setAccounts(res.data); setAccountsLoaded(true); }
    } catch {} finally { setAccountsLoading(false); }
  };

  const loadProjects = async () => {
    try {
      const res = await apiClient.get('/api/reports/general-ledger/projects');
      if (res && res.data) setProjects(res.data);
    } catch {}
  };

  const loadCompany = async () => {
    try {
      const res = await apiClient.get('/api/companies');
      if (res?.data?.length) setCompany(res.data[0]);
    } catch {}
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of accounts) counts[a.type] = (counts[a.type] || 0) + 1;
    return counts;
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (selectedType === 'all') return accounts;
    return accounts.filter(a => a.type === selectedType);
  }, [accounts, selectedType]);

  const accountOptions: SelectOption[] = useMemo(
    () => filteredAccounts.map(a => ({
      value: String(a.id),
      label: `${a.code} - ${a.name_ar || a.name}`,
      labelAr: `${a.code} - ${a.name_ar || a.name}`,
      code: a.code,
      searchText: `${a.code} ${a.name} ${a.name_ar || ''} ${a.type}`,
    })),
    [filteredAccounts]
  );

  const projectOptions: SelectOption[] = useMemo(
    () => projects.map(p => ({
      value: String(p.id),
      label: `${p.code} - ${p.name_ar || p.name}`,
      labelAr: `${p.code} - ${p.name_ar || p.name}`,
      code: p.code,
      searchText: `${p.code} ${p.name} ${p.name_ar || ''}`,
    })),
    [projects]
  );

  const canRunReport = !!selectedAccountId || !!selectedProjectId;

  // Currency breakdown
  const currencyBreakdown = useMemo((): CurrencyBreakdown[] => {
    const map: Record<string, CurrencyBreakdown> = {};
    for (const row of reportData) {
      if (row.date === 'OPENING') continue;
      const cc = row.currency_code || 'SAR';
      if (!map[cc]) {
        map[cc] = { currency_code: cc, currency_symbol: row.currency_symbol || cc, fc_debit_total: 0, fc_credit_total: 0, sar_debit_total: 0, sar_credit_total: 0, count: 0 };
      }
      map[cc].sar_debit_total += row.debit_amount || 0;
      map[cc].sar_credit_total += row.credit_amount || 0;
      map[cc].fc_debit_total += row.fc_debit_amount || 0;
      map[cc].fc_credit_total += row.fc_credit_amount || 0;
      map[cc].count++;
    }
    return Object.values(map).filter(c => c.count > 0);
  }, [reportData]);

  const hasMultipleCurrencies = currencyBreakdown.length > 1;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTypeSelect = (type: AccountTypeKey) => {
    setSelectedType(type);
    if (type !== 'all' && selectedAccountId) {
      const acct = accounts.find(a => String(a.id) === selectedAccountId);
      if (acct && acct.type !== type) {
        setSelectedAccountId('');
        setHasLoaded(false); setReportData([]); setSummary(null);
      }
    }
  };

  const loadReport = useCallback(async () => {
    if (!selectedAccountId && !selectedProjectId) {
      showToast(isRtl ? 'الرجاء اختيار حساب أو مشروع' : 'Please select an account or project', 'warning');
      return;
    }
    setLoading(true);
    setHasLoaded(false);
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate, include_opening: 'true' });
      if (selectedAccountId) params.set('account_id', selectedAccountId);
      if (selectedProjectId) params.set('project_id', selectedProjectId);
      if (!selectedAccountId && selectedProjectId) params.set('project_only', 'true');
      if (minAmount) params.set('min_amount', minAmount);
      if (maxAmount) params.set('max_amount', maxAmount);

      const projectOnly = !selectedAccountId && !!selectedProjectId;
      setIsProjectOnly(projectOnly);

      const res = await apiClient.get(`/api/reports/general-ledger?${params}`);
      if (res && res.success) {
        setReportData(res.data || []);
        setSummary(res.summary || null);
        const acct = accounts.find(a => String(a.id) === selectedAccountId) || res.account;
        setAccountInfo(projectOnly ? null : (acct || res.account || null));
        setPeriod(res.period || null);
        setHasLoaded(true);
      } else {
        showToast(res?.message || (isRtl ? 'حدث خطأ' : 'Error loading report'), 'error');
      }
    } catch (err: any) {
      showToast(err?.message || (isRtl ? 'حدث خطأ' : 'Error loading report'), 'error');
    } finally { setLoading(false); }
  }, [selectedAccountId, selectedProjectId, fromDate, toDate, minAmount, maxAmount, isRtl, showToast, accounts]);

  // Client-side text filter
  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return reportData;
    const q = searchText.toLowerCase();
    return reportData.filter(row => {
      if (row.date === 'OPENING') return true;
      return (
        row.description?.toLowerCase().includes(q) ||
        row.reference?.toLowerCase().includes(q) ||
        row.account_code?.toLowerCase().includes(q) ||
        row.account_name?.toLowerCase().includes(q) ||
        String(row.debit_amount || '').includes(q) ||
        String(row.credit_amount || '').includes(q) ||
        row.project_code?.toLowerCase().includes(q) ||
        row.project_name?.toLowerCase().includes(q) ||
        row.currency_code?.toLowerCase().includes(q)
      );
    });
  }, [reportData, searchText]);

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!filteredRows.length) return;
    const headers = ['التاريخ', 'المرجع', 'البيان', 'رقم الحساب', 'اسم الحساب', 'مدين', 'دائن', 'الرصيد', 'المشروع', 'العملة', 'مدين أجنبي', 'دائن أجنبي', 'سعر الصرف'];
    const rows = filteredRows.map(row => [
      row.date === 'OPENING' ? 'رصيد أول المدة' : (row.date || ''),
      row.reference || '',
      row.description || '',
      row.account_code || '',
      row.account_name || '',
      row.debit_amount > 0 ? row.debit_amount.toFixed(2) : '',
      row.credit_amount > 0 ? row.credit_amount.toFixed(2) : '',
      row.balance.toFixed(2),
      row.project_code ? `${row.project_code} - ${row.project_name || ''}` : '',
      row.currency_code || '',
      row.fc_debit_amount && row.fc_debit_amount > 0 ? row.fc_debit_amount.toFixed(2) : '',
      row.fc_credit_amount && row.fc_credit_amount > 0 ? row.fc_credit_amount.toFixed(2) : '',
      row.exchange_rate && row.exchange_rate !== 1 ? row.exchange_rate.toFixed(4) : '',
    ]);
    if (summary) {
      rows.push(['', '', 'الإجماليات', '', '', summary.total_debit.toFixed(2), summary.total_credit.toFixed(2), summary.closing_balance.toFixed(2), '', '', '', '', '']);
    }
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `كشف-حساب-${accountInfo?.code || 'project'}-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canView = isTenantAdmin || hasPermission('reports:general:view') || hasPermission('accounting:reports:general-ledger:view');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>{isRtl ? 'كشف حساب' : 'Account Statement'}</title></Head>

      {/* ── Print styles ─────────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: fixed !important; inset: 0 !important;
            background: white !important; z-index: 99999 !important;
            padding: 12mm 10mm !important;
            font-family: 'Arial', 'Tahoma', sans-serif !important;
            direction: rtl !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #999 !important; padding: 4px 6px !important; font-size: 9.5px !important; }
          thead tr { background: #1d4ed8 !important; color: white !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .row-opening { background: #eff6ff !important; font-weight: bold !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .row-closing { background: #fefce8 !important; font-weight: bold !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bal-pos { color: #166534 !important; }
          .bal-neg { color: #991b1b !important; }
          @page { margin: 8mm; size: A4; }
          #print-area::before {
            content: '';
            position: fixed;
            inset: 3mm;
            border: 1.5pt solid #1d4ed8;
            pointer-events: none;
            z-index: 100000;
          }
          .print-footer {
            position: fixed;
            bottom: 8mm;
            left: 12mm;
            right: 12mm;
            font-size: 8px;
            color: #666;
            border-top: 0.5pt solid #ccc;
            padding-top: 3mm;
            display: flex !important;
            justify-content: space-between;
            direction: rtl;
          }
        }
        .print-only { display: none; }
      `}</style>

      <MainLayout>
        <div className="p-4 max-w-screen-2xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>

          {/* ── Page Header ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-5 no-print">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-md">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isRtl ? 'كشف حساب' : 'Account Statement'}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isRtl ? 'عرض الحركات المحاسبية والأرصدة — من أول المدة حتى آخر المدة' : 'View financial transactions and balances for any account'}
                </p>
              </div>
            </div>
            {hasLoaded && (
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg shadow-sm transition">
                  <PrinterIcon className="w-4 h-4" />{isRtl ? 'طباعة' : 'Print'}
                </button>
                <button onClick={handleExportCSV} className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg shadow-sm transition">
                  <ArrowDownTrayIcon className="w-4 h-4" />{isRtl ? 'تصدير CSV' : 'Export CSV'}
                </button>
              </div>
            )}
          </div>

          {/* ── Filter Panel ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-5 overflow-hidden no-print">

            {/* Step 1: Account Type */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {isRtl ? 'الخطوة 1 — نوع الحساب' : 'Step 1 — Account Type'}
              </p>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_TYPES.map(type => {
                  const Icon = type.icon;
                  const isActive = selectedType === type.key;
                  const count = type.key === 'all' ? accounts.length : (typeCounts[type.key] || 0);
                  return (
                    <button key={type.key} onClick={() => handleTypeSelect(type.key)}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-150',
                        isActive ? `${type.colorClass} ${type.borderClass} shadow-md scale-[1.03]` : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50 bg-white'
                      )}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{isRtl ? type.labelAr : type.labelEn}</span>
                      {accountsLoaded && (
                        <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center', isActive ? type.badgeClass : 'bg-gray-100 text-gray-600')}>{count}</span>
                      )}
                      {accountsLoading && type.key === 'all' && <ArrowPathIcon className="w-3 h-3 animate-spin" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2 & 3: Account + Date + Project + Amount Range */}
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">

                {/* Account Selector */}
                <div className="lg:col-span-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    {isRtl ? 'الخطوة 2 — الحساب' : 'Step 2 — Account'}
                    {!selectedProjectId && <span className="text-red-500 mx-1">*</span>}
                    {selectedProjectId && <span className="text-gray-400 mx-1 text-[10px] normal-case">({isRtl ? 'اختياري مع المشروع' : 'optional with project'})</span>}
                  </p>
                  <SearchableSelect
                    options={accountOptions}
                    value={selectedAccountId}
                    onChange={v => { setSelectedAccountId(v); setHasLoaded(false); }}
                    placeholder={
                      accountsLoading ? (isRtl ? 'جاري التحميل...' : 'Loading accounts...')
                        : accountOptions.length === 0 && accountsLoaded ? (isRtl ? 'لا توجد حسابات في هذا النوع' : 'No accounts in this type')
                          : (isRtl ? 'اختر أو ابحث عن الحساب...' : 'Select or search account...')
                    }
                    searchPlaceholder={isRtl ? 'ابحث برقم أو اسم الحساب...' : 'Search by code or name...'}
                    locale={locale}
                    disabled={accountsLoading || accountOptions.length === 0}
                  />
                </div>

                {/* From Date */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    <CalendarIcon className="w-3.5 h-3.5 inline me-1 text-gray-400" />{isRtl ? 'من تاريخ' : 'From Date'}
                  </label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" dir="ltr" />
                </div>

                {/* To Date */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    <CalendarIcon className="w-3.5 h-3.5 inline me-1 text-gray-400" />{isRtl ? 'إلى تاريخ' : 'To Date'}
                  </label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" dir="ltr" />
                </div>

                {/* Project Filter */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    <FolderOpenIcon className="w-3.5 h-3.5 inline me-1 text-gray-400" />{isRtl ? 'المشروع (اختياري)' : 'Project (optional)'}
                  </label>
                  <div className="relative">
                    <SearchableSelect
                      options={projectOptions}
                      value={selectedProjectId}
                      onChange={v => { setSelectedProjectId(v); setHasLoaded(false); }}
                      placeholder={isRtl ? 'جميع المشاريع' : 'All projects'}
                      searchPlaceholder={isRtl ? 'ابحث عن مشروع...' : 'Search project...'}
                      locale={locale}
                      disabled={projects.length === 0}
                    />
                    {selectedProjectId && (
                      <button onClick={() => { setSelectedProjectId(''); setHasLoaded(false); }}
                        className="absolute top-1/2 -translate-y-1/2 end-8 text-gray-400 hover:text-gray-600 z-10" title={isRtl ? 'إزالة الفلتر' : 'Clear filter'}>
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Run Report Button */}
                <div className="lg:col-span-1 flex items-end">
                  <button onClick={loadReport} disabled={loading || !canRunReport}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    title={isRtl ? 'عرض التقرير' : 'Show Report'}>
                    {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <FunnelIcon className="w-5 h-5" />}
                    <span className="hidden xl:inline">{isRtl ? 'عرض' : 'Show'}</span>
                  </button>
                </div>
              </div>

              {/* Amount Range Filter */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      <CurrencyDollarIcon className="w-3.5 h-3.5 inline me-1 text-gray-400" />{isRtl ? 'المبلغ من' : 'Min Amount'}
                    </label>
                    <input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} min="0" step="0.01"
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      <CurrencyDollarIcon className="w-3.5 h-3.5 inline me-1 text-gray-400" />{isRtl ? 'المبلغ إلى' : 'Max Amount'}
                    </label>
                    <input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} min="0" step="0.01"
                      placeholder="999,999.99"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" dir="ltr" />
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    {(minAmount || maxAmount) && (
                      <button onClick={() => { setMinAmount(''); setMaxAmount(''); }}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                        <XMarkIcon className="w-3 h-3" />{isRtl ? 'مسح فلتر المبلغ' : 'Clear amount filter'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Client-side text filter (only when report loaded) */}
              {hasLoaded && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="relative max-w-md">
                    <MagnifyingGlassIcon className={clsx('w-4 h-4 absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none', isRtl ? 'right-3' : 'left-3')} />
                    <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
                      placeholder={isRtl ? 'فلترة: البيان، المرجع، المبلغ، المشروع، العملة...' : 'Filter: description, reference, amount, project, currency...'}
                      className={clsx('w-full border border-gray-300 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500', isRtl ? 'pr-9 pl-8' : 'pl-9 pr-8')} />
                    {searchText && (
                      <button onClick={() => setSearchText('')} className={clsx('absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600', isRtl ? 'left-3' : 'right-3')}>
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {searchText && (
                    <p className="text-xs text-gray-500 mt-1">
                      {isRtl ? `${filteredRows.length} صف من ${reportData.length}` : `${filteredRows.length} of ${reportData.length} rows`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Report Area ─────────────────────────────────────────────── */}
          <div id="print-area">

            {/* Loading skeleton */}
            {loading && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 no-print">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                  <div className="grid grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
                  </div>
                  <div className="space-y-2 mt-4">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && !hasLoaded && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 py-16 flex flex-col items-center justify-center text-center no-print">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <DocumentTextIcon className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">
                  {isRtl ? 'اختر حساباً أو مشروعاً لعرض الكشف' : 'Select an account or project to view statement'}
                </h3>
                <p className="text-sm text-gray-400 max-w-sm">
                  {isRtl ? 'حدد نوع الحساب ثم اختر الحساب المطلوب وحدد الفترة الزمنية، أو اختر مشروع فقط لعرض جميع الحركات' : 'Select account type, choose an account, set the date range then click Show. Or select a project only.'}
                </p>
              </div>
            )}

            {/* Report content */}
            {!loading && hasLoaded && (
              <>
                {/* ── Letterhead ──────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
                  <div className="flex items-start justify-between pb-4 mb-4 border-b-2 border-blue-600">
                    <div className="flex items-center gap-4">
                      {company?.logo_url && (
                        <img src={company.logo_url.startsWith('/') ? `http://localhost:4000${company.logo_url}` : company.logo_url}
                          alt={company.name} className="h-14 w-auto object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{isRtl ? (company?.name_ar || company?.name) : (company?.name || 'Company')}</h2>
                        {company?.address && <p className="text-sm text-gray-500">{company.address}</p>}
                        {company?.phone && <p className="text-sm text-gray-500" dir="ltr">{company.phone}</p>}
                        {company?.tax_number && <p className="text-xs text-gray-400">{isRtl ? `الرقم الضريبي: ${company.tax_number}` : `VAT No: ${company.tax_number}`}</p>}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-blue-600 text-white px-6 py-2.5 rounded-xl inline-block">
                        <p className="text-sm font-bold">
                          {isProjectOnly ? (isRtl ? 'كشف حركات المشروع' : 'Project Transactions') : (isRtl ? 'كشف حساب' : 'Account Statement')}
                        </p>
                      </div>
                      {period && <p className="text-xs text-gray-400 mt-2" dir="ltr">{period.from} — {period.to}</p>}
                    </div>
                  </div>

                  {/* Account / Project info pills */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {accountInfo && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">{isRtl ? 'رقم الحساب' : 'Code'}:</span>
                          <code className="bg-gray-100 text-gray-800 font-mono font-bold px-2 py-0.5 rounded">{accountInfo.code}</code>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">{isRtl ? 'اسم الحساب' : 'Name'}:</span>
                          <span className="font-semibold text-gray-800">{isRtl ? (accountInfo.name_ar || accountInfo.name) : accountInfo.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">{isRtl ? 'النوع' : 'Type'}:</span>
                          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {isRtl ? ACCOUNT_TYPES.find(tp => tp.key === accountInfo.type)?.labelAr || accountInfo.type : ACCOUNT_TYPES.find(tp => tp.key === accountInfo.type)?.labelEn || accountInfo.type}
                          </span>
                        </div>
                      </>
                    )}
                    {selectedProjectId && projects.length > 0 && (() => {
                      const proj = projects.find(p => String(p.id) === selectedProjectId);
                      return proj ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">{isRtl ? 'المشروع' : 'Project'}:</span>
                          <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {proj.code} - {isRtl ? (proj.name_ar || proj.name) : proj.name}
                          </span>
                        </div>
                      ) : null;
                    })()}
                    {(minAmount || maxAmount) && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 text-xs">{isRtl ? 'نطاق المبلغ' : 'Amount Range'}:</span>
                        <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {minAmount || '0'} — {maxAmount || '∞'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Summary Cards ───────────────────────────────────── */}
                {summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <SummaryCard label={isRtl ? 'رصيد أول المدة' : 'Opening Balance'} value={summary.opening_balance} locale={locale} color="border-blue-200 bg-blue-50 text-blue-900" />
                    <SummaryCard label={isRtl ? 'إجمالي المدين' : 'Total Debit'} value={summary.total_debit} locale={locale} color="border-green-200 bg-green-50 text-green-900" positiveOnly />
                    <SummaryCard label={isRtl ? 'إجمالي الدائن' : 'Total Credit'} value={summary.total_credit} locale={locale} color="border-orange-200 bg-orange-50 text-orange-900" positiveOnly />
                    <SummaryCard label={isRtl ? 'رصيد آخر المدة' : 'Closing Balance'} value={summary.closing_balance} locale={locale}
                      color={summary.closing_balance >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'} />
                  </div>
                )}

                {/* ── Currency Breakdown ──────────────────────────────── */}
                {hasMultipleCurrencies && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <CurrencyDollarIcon className="w-4 h-4 text-blue-600" />
                      {isRtl ? 'تفصيل العملات' : 'Currency Breakdown'}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" dir={isRtl ? 'rtl' : 'ltr'}>
                        <thead>
                          <tr className="bg-gray-100 text-gray-600 text-xs">
                            <th className="px-3 py-2 text-start">{isRtl ? 'العملة' : 'Currency'}</th>
                            <th className="px-3 py-2 text-center">{isRtl ? 'عدد الحركات' : 'Count'}</th>
                            <th className="px-3 py-2 text-end">{isRtl ? 'مدين (محلي)' : 'Debit (Local)'}</th>
                            <th className="px-3 py-2 text-end">{isRtl ? 'دائن (محلي)' : 'Credit (Local)'}</th>
                            <th className="px-3 py-2 text-end">{isRtl ? 'مدين (أجنبي)' : 'Debit (FC)'}</th>
                            <th className="px-3 py-2 text-end">{isRtl ? 'دائن (أجنبي)' : 'Credit (FC)'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currencyBreakdown.map(cb => (
                            <tr key={cb.currency_code} className="border-b border-gray-100">
                              <td className="px-3 py-2 font-semibold">
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{cb.currency_code}</span>
                                <span className="text-gray-400 text-xs ms-1">{cb.currency_symbol}</span>
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">{cb.count}</td>
                              <td className="px-3 py-2 text-end font-mono text-green-700">{fmtAmount(cb.sar_debit_total, locale)}</td>
                              <td className="px-3 py-2 text-end font-mono text-orange-600">{fmtAmount(cb.sar_credit_total, locale)}</td>
                              <td className="px-3 py-2 text-end font-mono text-blue-700">{cb.fc_debit_total > 0 ? fmtAmount(cb.fc_debit_total, locale) : '—'}</td>
                              <td className="px-3 py-2 text-end font-mono text-blue-700">{cb.fc_credit_total > 0 ? fmtAmount(cb.fc_credit_total, locale) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Transactions Table ───────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {filteredRows.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <MagnifyingGlassIcon className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">{isRtl ? 'لا توجد حركات في هذه الفترة' : 'No transactions in this period'}</p>
                      {searchText && <button onClick={() => setSearchText('')} className="mt-2 text-sm text-blue-600 hover:underline">{isRtl ? 'مسح الفلتر' : 'Clear filter'}</button>}
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[75vh]">
                      <table className="w-full text-sm" dir={isRtl ? 'rtl' : 'ltr'}>
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-blue-600 text-white text-xs uppercase tracking-wide">
                            <th className="px-3 py-3 font-semibold text-start w-10">#</th>
                            <th className="px-3 py-3 font-semibold text-start">{isRtl ? 'التاريخ' : 'Date'}</th>
                            <th className="px-3 py-3 font-semibold text-start">{isRtl ? 'المرجع' : 'Ref'}</th>
                            <th className="px-3 py-3 font-semibold text-start">{isRtl ? 'البيان' : 'Description'}</th>
                            {isProjectOnly && <th className="px-3 py-3 font-semibold text-start">{isRtl ? 'الحساب' : 'Account'}</th>}
                            {projects.length > 0 && !isProjectOnly && <th className="px-3 py-3 font-semibold text-start">{isRtl ? 'المشروع' : 'Project'}</th>}
                            <th className="px-3 py-3 font-semibold text-end">{isRtl ? 'مدين' : 'Debit'}</th>
                            <th className="px-3 py-3 font-semibold text-end">{isRtl ? 'دائن' : 'Credit'}</th>
                            {!isProjectOnly && <th className="px-3 py-3 font-semibold text-end">{isRtl ? 'الرصيد' : 'Balance'}</th>}
                            {hasMultipleCurrencies && <th className="px-3 py-3 font-semibold text-center">{isRtl ? 'العملة' : 'Cur.'}</th>}
                            {hasMultipleCurrencies && <th className="px-3 py-3 font-semibold text-end">{isRtl ? 'المبلغ الأجنبي' : 'FC Amt'}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((row, idx) => {
                            const isOpening = row.date === 'OPENING';
                            const isLastRow = idx === filteredRows.length - 1;
                            const isNegBal = row.balance < 0;
                            const isZeroBal = row.balance === 0;
                            const hasFc = (row.fc_debit_amount && row.fc_debit_amount > 0) || (row.fc_credit_amount && row.fc_credit_amount > 0);
                            return (
                              <tr key={idx}
                                className={clsx(
                                  'border-b border-gray-100 transition-colors',
                                  isOpening ? 'row-opening bg-blue-50 font-semibold' : '',
                                  isLastRow && !isOpening ? 'row-closing bg-amber-50 font-semibold' : '',
                                  !isOpening && !isLastRow ? (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50') : '',
                                  !isOpening && !isLastRow ? 'hover:bg-blue-50/40' : ''
                                )}>
                                <td className="px-3 py-2.5 text-gray-400 text-xs">{isOpening ? '' : idx}</td>
                                <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap" dir="ltr">
                                  {isOpening ? <span className="text-blue-700 font-bold text-xs">{isRtl ? 'رصيد أول المدة' : 'Opening Balance'}</span> : fmtDate(row.date, locale)}
                                </td>
                                <td className="px-3 py-2.5 text-gray-600 font-mono text-xs max-w-[120px] truncate">{row.reference}</td>
                                <td className="px-3 py-2.5 text-gray-800 max-w-[240px]"><p className="line-clamp-2 leading-snug">{row.description}</p></td>
                                {isProjectOnly && (
                                  <td className="px-3 py-2.5 text-gray-600 text-xs">
                                    {row.account_code ? (
                                      <span title={row.account_name}>
                                        <code className="bg-gray-100 px-1 rounded">{row.account_code}</code>
                                        <span className="ms-1 text-gray-500 hidden lg:inline">{row.account_name}</span>
                                      </span>
                                    ) : '—'}
                                  </td>
                                )}
                                {projects.length > 0 && !isProjectOnly && (
                                  <td className="px-3 py-2.5 text-gray-500 text-xs">
                                    {row.project_code ? <span className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-medium">{row.project_code}</span> : '—'}
                                  </td>
                                )}
                                <td className="px-3 py-2.5 text-end font-mono">
                                  {row.debit_amount > 0 ? <span className="text-green-700 font-semibold">{fmtAmount(row.debit_amount, locale)}</span> : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-end font-mono">
                                  {row.credit_amount > 0 ? <span className="text-orange-600 font-semibold">{fmtAmount(row.credit_amount, locale)}</span> : <span className="text-gray-300">—</span>}
                                </td>
                                {!isProjectOnly && (
                                  <td className={clsx('px-3 py-2.5 text-end font-mono font-bold', isNegBal ? 'text-red-700 bal-neg' : isZeroBal ? 'text-gray-400 bal-zero' : 'text-emerald-700 bal-pos')}>
                                    {isNegBal ? '-' : ''}{fmtAmount(row.balance, locale)}
                                    {!isOpening && !isZeroBal && (
                                      <span className="text-[10px] font-normal ms-1 opacity-60">{isNegBal ? (isRtl ? 'دائن' : 'Cr') : (isRtl ? 'مدين' : 'Dr')}</span>
                                    )}
                                  </td>
                                )}
                                {hasMultipleCurrencies && (
                                  <td className="px-3 py-2.5 text-center">
                                    {row.currency_code && !row.is_base_currency ? (
                                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{row.currency_code}</span>
                                    ) : <span className="text-gray-300 text-[10px]">SAR</span>}
                                  </td>
                                )}
                                {hasMultipleCurrencies && (
                                  <td className="px-3 py-2.5 text-end font-mono text-xs text-blue-700">
                                    {hasFc && !row.is_base_currency ? (
                                      <span>
                                        {row.fc_debit_amount && row.fc_debit_amount > 0 ? fmtAmount(row.fc_debit_amount, locale) : ''}
                                        {row.fc_credit_amount && row.fc_credit_amount > 0 ? fmtAmount(row.fc_credit_amount, locale) : ''}
                                        {row.exchange_rate && row.exchange_rate !== 1 && (
                                          <span className="text-[9px] text-gray-400 ms-1">@{row.exchange_rate.toFixed(2)}</span>
                                        )}
                                      </span>
                                    ) : <span className="text-gray-300">—</span>}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                        {summary && (
                          <tfoot>
                            <tr className="bg-gray-800 text-white font-bold">
                              <td colSpan={isProjectOnly ? 5 : (projects.length > 0 ? 5 : 4)} className="px-3 py-3 text-start">
                                {isRtl ? 'الإجماليات' : 'Totals'}
                              </td>
                              <td className="px-3 py-3 text-end font-mono tabular-nums">{fmtAmount(summary.total_debit, locale)}</td>
                              <td className="px-3 py-3 text-end font-mono tabular-nums">{fmtAmount(summary.total_credit, locale)}</td>
                              {!isProjectOnly && (
                                <td className={clsx('px-3 py-3 text-end font-mono tabular-nums', summary.closing_balance < 0 ? 'text-red-300' : 'text-emerald-300')}>
                                  {summary.closing_balance < 0 ? '-' : ''}{fmtAmount(summary.closing_balance, locale)}
                                </td>
                              )}
                              {hasMultipleCurrencies && <td className="px-3 py-3" />}
                              {hasMultipleCurrencies && <td className="px-3 py-3" />}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>

                {/* ── Print Footer ──────────────────────────────────────── */}
                <div className="print-only print-footer">
                  <div>
                    <span>{isRtl ? 'طُبع بواسطة' : 'Printed by'}: {user?.full_name || user?.email || '—'}</span>
                    <span className="mx-3">|</span>
                    <span>{isRtl ? 'تاريخ ووقت الطباعة' : 'Print date/time'}: {fmtDateTime(locale)}</span>
                  </div>
                  <div>
                    <span>{isRtl ? (company?.name_ar || company?.name || '') : (company?.name || '')}</span>
                  </div>
                </div>

                {/* Row count */}
                <div className="mt-3 text-center no-print">
                  <p className="text-xs text-gray-400">
                    {isRtl ? `إجمالي الصفوف: ${filteredRows.length}` : `Total rows: ${filteredRows.length}`}
                    {searchText && ` (${isRtl ? 'مفلتر' : 'filtered'})`}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </MainLayout>
    </>
  );
}
