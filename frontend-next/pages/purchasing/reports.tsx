/**
 * 📊 PURCHASING REPORTS PAGE
 * ===========================
 * 6 report tabs matching backend procurement/reports endpoints:
 *   1. Vendor Aging — outstanding balances by aging buckets
 *   2. Price Variance — PO vs Invoice price comparison
 *   3. Outstanding POs — unreceived order quantities
 *   4. Payment History — all vendor payments with allocations
 *   5. Unapplied Payments — payments with unallocated amounts
 *   6. Vendor Balance — current outstanding balance per vendor
 *
 * Features:
 * ✅ Tab navigation for 6 reports
 * ✅ Per-report filters (date range, vendor, currency, threshold)
 * ✅ Summary/KPI cards per report
 * ✅ Formatted tables with AR/EN bilingual
 * ✅ RBAC: procurement:reports:view
 * ✅ Export-ready data
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
import {
  ChartBarIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ScaleIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

/* ─── Helpers ──────────────────────────────────────────────────── */
const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const companyId = companyStore.getActiveCompanyId();
  return {
    Authorization: `Bearer ${token || ''}`,
    'Content-Type': 'application/json',
    ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
  };
}

function fmt(n: number | string | null | undefined, decimals = 2): string {
  const num = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD
}

/* ─── Tab definitions ──────────────────────────────────────────── */
type ReportTab = 'vendor-aging' | 'price-variance' | 'outstanding-pos' | 'payment-history' | 'unapplied-payments' | 'vendor-balance';

interface TabDef {
  key: ReportTab;
  labelEn: string;
  labelAr: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { key: 'vendor-aging', labelEn: 'Vendor Aging', labelAr: 'أعمار الموردين', icon: ChartBarIcon },
  { key: 'price-variance', labelEn: 'Price Variance', labelAr: 'فروقات الأسعار', icon: ScaleIcon },
  { key: 'outstanding-pos', labelEn: 'Outstanding POs', labelAr: 'أوامر الشراء المعلقة', icon: ClipboardDocumentListIcon },
  { key: 'payment-history', labelEn: 'Payment History', labelAr: 'سجل المدفوعات', icon: BanknotesIcon },
  { key: 'unapplied-payments', labelEn: 'Unapplied Payments', labelAr: 'مدفوعات غير مخصصة', icon: ExclamationTriangleIcon },
  { key: 'vendor-balance', labelEn: 'Vendor Balance', labelAr: 'أرصدة الموردين', icon: CurrencyDollarIcon },
];

/* ─── Page Component ───────────────────────────────────────────── */
function PurchasingReportsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [activeTab, setActiveTab] = useState<ReportTab>('vendor-aging');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [meta, setMeta] = useState<any>({});

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [threshold, setThreshold] = useState('5');
  const [vendorFilter, setVendorFilter] = useState('');

  /* ─── Fetch report data ──────────────────────────────────────── */
  const fetchReport = useCallback(async (tab: ReportTab) => {
    setLoading(true);
    setData([]);
    setSummary({});
    setMeta({});

    try {
      const params = new URLSearchParams();

      switch (tab) {
        case 'vendor-aging':
          if (asOfDate) params.set('as_of_date', asOfDate);
          break;
        case 'price-variance':
          if (threshold) params.set('threshold', threshold);
          if (fromDate) params.set('from_date', fromDate);
          if (toDate) params.set('to_date', toDate);
          break;
        case 'outstanding-pos':
          if (vendorFilter) params.set('vendor_id', vendorFilter);
          break;
        case 'payment-history':
          if (vendorFilter) params.set('vendor_id', vendorFilter);
          if (fromDate) params.set('from_date', fromDate);
          if (toDate) params.set('to_date', toDate);
          break;
        default:
          break;
      }

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API}/procurement/reports/${tab}${qs}`, { headers: authHeaders() });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json.data || []);
      setSummary(json.summary || json.totals || {});
      setMeta(json.meta || {});
    } catch (err: any) {
      showToast({ message: err.message || 'Failed to load report', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [asOfDate, threshold, fromDate, toDate, vendorFilter, showToast]);

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilters = () => fetchReport(activeTab);

  /* ─── CSV export ─────────────────────────────────────────────── */
  const exportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => {
      const v = row[h];
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── Summary cards renderer ─────────────────────────────────── */
  const renderSummary = () => {
    switch (activeTab) {
      case 'vendor-aging':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <SummaryCard label={isRTL ? 'الحالي' : 'Current'} value={fmt(summary.current_balance)} color="green" />
            <SummaryCard label={isRTL ? '1-30 يوم' : '1-30 Days'} value={fmt(summary.days_1_30)} color="yellow" />
            <SummaryCard label={isRTL ? '31-60 يوم' : '31-60 Days'} value={fmt(summary.days_31_60)} color="orange" />
            <SummaryCard label={isRTL ? '61-90 يوم' : '61-90 Days'} value={fmt(summary.days_61_90)} color="red" />
            <SummaryCard label={isRTL ? '120+ يوم' : '120+ Days'} value={fmt(summary.days_120_plus)} color="purple" />
            <SummaryCard label={isRTL ? 'الإجمالي' : 'Total'} value={fmt(summary.total_balance)} color="blue" />
          </div>
        );

      case 'price-variance':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <SummaryCard label={isRTL ? 'إجمالي الأصناف' : 'Total Items'} value={String(summary.total_items ?? 0)} color="blue" />
            <SummaryCard label={isRTL ? 'تجاوز الحد' : 'Exceeds Threshold'} value={String(summary.items_exceeding_threshold ?? 0)} color="red" />
            <SummaryCard label={isRTL ? 'متوسط الفرق %' : 'Avg Variance %'} value={fmt(summary.avg_variance_percent)} color="yellow" />
          </div>
        );

      case 'outstanding-pos':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard label={isRTL ? 'إجمالي الأوامر' : 'Total POs'} value={String(summary.total_pos ?? 0)} color="blue" />
            <SummaryCard label={isRTL ? 'المبلغ المتبقي' : 'Remaining Amount'} value={fmt(summary.total_remaining_amount)} color="yellow" />
            <SummaryCard label={isRTL ? 'متأخرة' : 'Overdue'} value={String(summary.overdue_count ?? 0)} color="red" />
            <SummaryCard label={isRTL ? 'قديمة' : 'Aging'} value={String(summary.aging_count ?? 0)} color="orange" />
          </div>
        );

      case 'payment-history':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard label={isRTL ? 'إجمالي المدفوعات' : 'Total Payments'} value={String(summary.total_payments ?? 0)} color="blue" />
            <SummaryCard label={isRTL ? 'إجمالي المبلغ' : 'Total Amount'} value={fmt(summary.total_amount)} color="green" />
            <SummaryCard label={isRTL ? 'مخصص' : 'Allocated'} value={fmt(summary.total_allocated)} color="teal" />
            <SummaryCard label={isRTL ? 'غير مخصص' : 'Unallocated'} value={fmt(summary.total_unallocated)} color="red" />
          </div>
        );

      case 'unapplied-payments':
        return (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <SummaryCard label={isRTL ? 'عدد المدفوعات' : 'Payment Count'} value={String(summary.total_payments ?? 0)} color="blue" />
            <SummaryCard label={isRTL ? 'إجمالي غير مخصص' : 'Total Unapplied'} value={fmt(summary.total_unapplied_amount)} color="red" />
          </div>
        );

      case 'vendor-balance':
        return (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <SummaryCard label={isRTL ? 'عدد الموردين' : 'Vendor Count'} value={String(summary.total_vendors ?? 0)} color="blue" />
            <SummaryCard label={isRTL ? 'إجمالي الرصيد' : 'Total Outstanding'} value={fmt(summary.total_outstanding)} color="red" />
          </div>
        );

      default:
        return null;
    }
  };

  /* ─── Filters renderer ───────────────────────────────────────── */
  const renderFilters = () => {
    const showDateRange = ['price-variance', 'payment-history'].includes(activeTab);
    const showAsOfDate = activeTab === 'vendor-aging';
    const showThreshold = activeTab === 'price-variance';
    const showVendor = ['outstanding-pos', 'payment-history'].includes(activeTab);

    if (!showDateRange && !showAsOfDate && !showThreshold && !showVendor) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isRTL ? 'فلاتر' : 'Filters'}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {showAsOfDate && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{isRTL ? 'كما في تاريخ' : 'As of Date'}</label>
              <input
                type="date"
                value={asOfDate}
                onChange={e => setAsOfDate(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}

          {showDateRange && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{isRTL ? 'من تاريخ' : 'From Date'}</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{isRTL ? 'إلى تاريخ' : 'To Date'}</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </>
          )}

          {showThreshold && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{isRTL ? 'حد الفرق %' : 'Threshold %'}</label>
              <input
                type="number"
                min="0"
                step="1"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm w-20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}

          {showVendor && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{isRTL ? 'رقم المورد' : 'Vendor ID'}</label>
              <input
                type="text"
                value={vendorFilter}
                onChange={e => setVendorFilter(e.target.value)}
                placeholder={isRTL ? 'اختياري' : 'Optional'}
                className="border rounded px-2 py-1.5 text-sm w-28 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}

          <Button size="sm" variant="primary" onClick={handleApplyFilters}>
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            {isRTL ? 'تطبيق' : 'Apply'}
          </Button>
        </div>
      </div>
    );
  };

  /* ─── Table renderer per report ──────────────────────────────── */
  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <ArrowPathIcon className="w-6 h-6 animate-spin mr-2" />
          {isRTL ? 'جاري التحميل...' : 'Loading...'}
        </div>
      );
    }

    if (!data.length) {
      return (
        <div className="text-center py-20 text-gray-400">
          {isRTL ? 'لا توجد بيانات' : 'No data available'}
        </div>
      );
    }

    switch (activeTab) {
      case 'vendor-aging':
        return <VendorAgingTable data={data} isRTL={isRTL} />;
      case 'price-variance':
        return <PriceVarianceTable data={data} isRTL={isRTL} />;
      case 'outstanding-pos':
        return <OutstandingPOsTable data={data} isRTL={isRTL} />;
      case 'payment-history':
        return <PaymentHistoryTable data={data} isRTL={isRTL} />;
      case 'unapplied-payments':
        return <UnappliedPaymentsTable data={data} isRTL={isRTL} />;
      case 'vendor-balance':
        return <VendorBalanceTable data={data} isRTL={isRTL} />;
      default:
        return null;
    }
  };

  /* ─── Main render ────────────────────────────────────────────── */
  return (
    <>
      <Head>
        <title>{isRTL ? 'تقارير المشتريات' : 'Purchasing Reports'}</title>
      </Head>
      <MainLayout>
        <div className="p-4 max-w-[1400px] mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>

          {/* ── Tab bar ── */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 overflow-x-auto bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                      active
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {isRTL ? tab.labelAr : tab.labelEn}
                  </button>
                );
              })}
            </div>

            {data.length > 0 && (
              <Button size="sm" variant="secondary" onClick={exportCSV}>
                <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                {isRTL ? 'تصدير CSV' : 'Export CSV'}
              </Button>
            )}
          </div>

          {/* ── Filters ── */}
          {renderFilters()}

          {/* ── Summary cards ── */}
          {!loading && data.length > 0 && renderSummary()}

          {/* ── Table ── */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {renderTable()}
          </div>

        </div>
      </MainLayout>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Summary Card ─────────────────────────────────────────────── */
const COLORS: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
  orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300',
};

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={clsx('rounded-lg border p-3', COLORS[color] || COLORS.blue)}>
      <div className="text-xs opacity-75">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}

/* ─── Vendor Aging Table ───────────────────────────────────────── */
function VendorAgingTable({ data, isRTL }: { data: any[]; isRTL: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-start">{isRTL ? 'كود المورد' : 'Vendor Code'}</th>
            <th className="px-3 py-2 text-start">{isRTL ? 'اسم المورد' : 'Vendor Name'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'الحالي' : 'Current'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? '1-30' : '1-30'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? '31-60' : '31-60'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? '61-90' : '61-90'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? '120+' : '120+'}</th>
            <th className="px-3 py-2 text-end font-bold">{isRTL ? 'الإجمالي' : 'Total'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((row, i) => (
            <tr key={row.vendor_id || i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
              <td className="px-3 py-2 font-mono text-xs">{row.vendor_code}</td>
              <td className="px-3 py-2">{isRTL ? (row.vendor_name_arabic || row.vendor_name) : row.vendor_name}</td>
              <td className="px-3 py-2 text-end">{fmt(row.current_balance)}</td>
              <td className="px-3 py-2 text-end">{fmt(row.days_1_30)}</td>
              <td className="px-3 py-2 text-end">{fmt(row.days_31_60)}</td>
              <td className="px-3 py-2 text-end">{fmt(row.days_61_90)}</td>
              <td className={clsx('px-3 py-2 text-end', parseFloat(row.days_120_plus) > 0 && 'text-red-600 font-semibold')}>
                {fmt(row.days_120_plus)}
              </td>
              <td className="px-3 py-2 text-end font-bold">{fmt(row.total_balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Price Variance Table ─────────────────────────────────────── */
function PriceVarianceTable({ data, isRTL }: { data: any[]; isRTL: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-start">{isRTL ? 'كود الصنف' : 'Item Code'}</th>
            <th className="px-3 py-2 text-start">{isRTL ? 'اسم الصنف' : 'Item Name'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'و.ق' : 'UOM'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'سعر أمر الشراء' : 'PO Price'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'سعر الفاتورة' : 'Invoice Price'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'الفرق' : 'Variance'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'الفرق %' : 'Var %'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((row, i) => {
            const varPct = parseFloat(row.variance_percent);
            const exceeds = row.exceeds_threshold;
            return (
              <tr key={row.item_id || i} className={clsx('hover:bg-gray-50 dark:hover:bg-gray-750', exceeds && 'bg-red-50/50 dark:bg-red-900/10')}>
                <td className="px-3 py-2 font-mono text-xs">{row.item_code}</td>
                <td className="px-3 py-2">{isRTL ? (row.item_name_arabic || row.item_name) : row.item_name}</td>
                <td className="px-3 py-2 text-center text-xs">{row.uom_code}</td>
                <td className="px-3 py-2 text-end">{fmt(row.avg_po_price)}</td>
                <td className="px-3 py-2 text-end">{fmt(row.avg_invoice_price)}</td>
                <td className={clsx('px-3 py-2 text-end', parseFloat(row.variance_amount) > 0 ? 'text-red-600' : 'text-green-600')}>
                  {fmt(row.variance_amount)}
                </td>
                <td className={clsx('px-3 py-2 text-end font-medium', varPct > 0 ? 'text-red-600' : 'text-green-600')}>
                  {fmt(varPct, 1)}%
                </td>
                <td className="px-3 py-2 text-center">
                  {exceeds ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      {isRTL ? 'تجاوز' : 'Exceeds'}
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {isRTL ? 'طبيعي' : 'Normal'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Outstanding POs Table ────────────────────────────────────── */
function OutstandingPOsTable({ data, isRTL }: { data: any[]; isRTL: boolean }) {
  const statusColors: Record<string, string> = {
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    aging: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-start">{isRTL ? 'رقم الأمر' : 'PO Number'}</th>
            <th className="px-3 py-2 text-start">{isRTL ? 'المورد' : 'Vendor'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'تاريخ الأمر' : 'Order Date'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'التسليم المتوقع' : 'Expected Delivery'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'مطلوب' : 'Ordered'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'مستلم' : 'Received'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'متبقي' : 'Remaining'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'المبلغ المتبقي' : 'Remaining Amt'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'أيام' : 'Days'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((row, i) => (
            <tr key={row.id || i} className={clsx('hover:bg-gray-50 dark:hover:bg-gray-750', row.aging_status === 'overdue' && 'bg-red-50/50 dark:bg-red-900/10')}>
              <td className="px-3 py-2 font-mono text-xs font-medium">{row.order_number}</td>
              <td className="px-3 py-2">{isRTL ? (row.vendor_name_arabic || row.vendor_name) : row.vendor_name}</td>
              <td className="px-3 py-2 text-center text-xs">{fmtDate(row.order_date)}</td>
              <td className="px-3 py-2 text-center text-xs">{fmtDate(row.expected_delivery_date)}</td>
              <td className="px-3 py-2 text-end">{fmt(row.total_ordered, 0)}</td>
              <td className="px-3 py-2 text-end">{fmt(row.total_received, 0)}</td>
              <td className="px-3 py-2 text-end font-medium">{fmt(row.total_remaining, 0)}</td>
              <td className="px-3 py-2 text-end">{fmt(row.remaining_amount)}</td>
              <td className="px-3 py-2 text-center">{row.days_outstanding}</td>
              <td className="px-3 py-2 text-center">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[row.aging_status] || statusColors.normal)}>
                  {row.aging_status === 'overdue' ? (isRTL ? 'متأخر' : 'Overdue')
                    : row.aging_status === 'aging' ? (isRTL ? 'قديم' : 'Aging')
                    : (isRTL ? 'طبيعي' : 'Normal')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Payment History Table ────────────────────────────────────── */
function PaymentHistoryTable({ data, isRTL }: { data: any[]; isRTL: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-start">{isRTL ? 'رقم الدفعة' : 'Payment #'}</th>
            <th className="px-3 py-2 text-start">{isRTL ? 'المورد' : 'Vendor'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'التاريخ' : 'Date'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'الطريقة' : 'Method'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'المبلغ' : 'Amount'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'مخصص' : 'Allocated'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'غير مخصص' : 'Unallocated'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'العملة' : 'Currency'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'تخصيصات' : 'Alloc.'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
              <td className="px-3 py-2 font-mono text-xs">{row.payment_number}</td>
              <td className="px-3 py-2">{row.vendor_name}</td>
              <td className="px-3 py-2 text-center text-xs">{fmtDate(row.payment_date)}</td>
              <td className="px-3 py-2 text-center text-xs capitalize">{row.payment_method?.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2 text-end">{fmt(row.payment_amount)}</td>
              <td className="px-3 py-2 text-end">{fmt(row.allocated_amount)}</td>
              <td className={clsx('px-3 py-2 text-end', parseFloat(row.unallocated_amount) > 0 && 'text-orange-600 font-medium')}>
                {fmt(row.unallocated_amount)}
              </td>
              <td className="px-3 py-2 text-center text-xs">{row.currency_code}</td>
              <td className="px-3 py-2 text-center">
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  row.status === 'posted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : row.status === 'cancelled' ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                )}>
                  {row.status}
                </span>
              </td>
              <td className="px-3 py-2 text-center">{row.allocation_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Unapplied Payments Table ─────────────────────────────────── */
function UnappliedPaymentsTable({ data, isRTL }: { data: any[]; isRTL: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-start">{isRTL ? 'رقم الدفعة' : 'Payment #'}</th>
            <th className="px-3 py-2 text-start">{isRTL ? 'المورد' : 'Vendor'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'التاريخ' : 'Date'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'المبلغ الكلي' : 'Total Amount'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'مخصص' : 'Allocated'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'غير مخصص' : 'Unapplied'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'العملة' : 'Currency'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'أيام بدون تخصيص' : 'Days Unapplied'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
              <td className="px-3 py-2 font-mono text-xs">{row.payment_number}</td>
              <td className="px-3 py-2">{row.vendor_name}</td>
              <td className="px-3 py-2 text-center text-xs">{fmtDate(row.payment_date)}</td>
              <td className="px-3 py-2 text-end">{fmt(row.payment_amount)}</td>
              <td className="px-3 py-2 text-end">{fmt(row.allocated_amount)}</td>
              <td className="px-3 py-2 text-end text-red-600 font-medium">{fmt(row.unallocated_amount)}</td>
              <td className="px-3 py-2 text-center text-xs">{row.currency_code}</td>
              <td className={clsx('px-3 py-2 text-center', parseInt(row.days_unapplied) > 30 && 'text-red-600 font-medium')}>
                {row.days_unapplied}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Vendor Balance Table ─────────────────────────────────────── */
function VendorBalanceTable({ data, isRTL }: { data: any[]; isRTL: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-start">{isRTL ? 'كود المورد' : 'Vendor Code'}</th>
            <th className="px-3 py-2 text-start">{isRTL ? 'اسم المورد' : 'Vendor Name'}</th>
            <th className="px-3 py-2 text-end">{isRTL ? 'الرصيد المعلق' : 'Outstanding Balance'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'فواتير معلقة' : 'Open Invoices'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'أقدم استحقاق' : 'Oldest Due'}</th>
            <th className="px-3 py-2 text-center">{isRTL ? 'أحدث استحقاق' : 'Newest Due'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((row, i) => (
            <tr key={row.vendor_id || i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
              <td className="px-3 py-2 font-mono text-xs">{row.vendor_code}</td>
              <td className="px-3 py-2">{row.vendor_name}</td>
              <td className="px-3 py-2 text-end font-bold text-red-600">{fmt(row.outstanding_balance)}</td>
              <td className="px-3 py-2 text-center">{row.outstanding_invoices}</td>
              <td className="px-3 py-2 text-center text-xs">{fmtDate(row.oldest_due_date)}</td>
              <td className="px-3 py-2 text-center text-xs">{fmtDate(row.newest_due_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default withPermission('procurement:reports:view', PurchasingReportsPage);
