/**
 * 🛒 PURCHASE ORDERS — Professional List Page
 * =============================================
 * Single source-of-truth for purchase order management.
 *
 * Features:
 * ✅ KPI dashboard strip — single /stats API call
 * ✅ Server-side search, status/vendor/date filters
 * ✅ Dynamic page size selector
 * ✅ Rich table with vendor avatar, type/contract/project badges
 * ✅ Overdue delivery highlighting
 * ✅ Status badges with DB-driven or fallback colors
 * ✅ Row hover quick-actions with icon tooltips
 * ✅ Approve/Cancel/Delete confirmation dialogs
 * ✅ AR/EN bilingual, full RTL support
 * ✅ RBAC permission gating throughout
 * ✅ Dark mode ready
 * ✅ Accessible keyboard + screen-reader labels
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Tooltip from '../../components/ui/Tooltip';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  XCircleIcon,
  ShoppingCartIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxArrowDownIcon,
  ArrowUturnLeftIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface PurchaseOrder {
  id: number;
  order_number: string;
  vendor_id: number;
  vendor_display_name?: string;
  vendor_display_name_ar?: string;
  vendor_name?: string;
  vendor_code?: string;
  order_date: string;
  expected_delivery_date?: string;
  expected_date?: string;
  order_type_id?: number;
  order_type_name?: string;
  order_type_name_ar?: string;
  contract_id?: number;
  vendor_contract_number_resolved?: string;
  project_id?: number;
  project_code?: string;
  project_name?: string;
  project_name_ar?: string;
  currency_id?: number;
  currency_code?: string;
  currency_symbol?: string;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  freight_amount?: number;
  total_amount?: number;
  status: string;
  status_id?: number;
  status_name?: string;
  status_name_ar?: string;
  status_code?: string;
  status_color?: string;
  allows_edit?: boolean;
  allows_delete?: boolean;
  allows_receive?: boolean;
  allows_invoice?: boolean;
  item_count?: number;
  warehouse_name?: string;
  warehouse_id?: number;
  created_at?: string;
  created_by_name?: string;
}

interface POStatus {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  color?: string;
}

interface Vendor {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
}

interface POStats {
  total: number;
  draft: number;
  pending_approval: number;
  approved: number;
  partially_received: number;
  fully_received: number;
  cancelled: number;
  total_value: number;
  active_value: number;
}

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  draft:               { bg: 'bg-slate-100 dark:bg-slate-700/60',     text: 'text-slate-600 dark:text-slate-300',   ring: 'ring-slate-300' },
  pending_approval:    { bg: 'bg-amber-50 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-300',   ring: 'ring-amber-300' },
  approved:            { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-300' },
  partially_received:  { bg: 'bg-orange-50 dark:bg-orange-900/30',   text: 'text-orange-700 dark:text-orange-300', ring: 'ring-orange-300' },
  fully_received:      { bg: 'bg-green-50 dark:bg-green-900/30',     text: 'text-green-700 dark:text-green-300',   ring: 'ring-green-300' },
  cancelled:           { bg: 'bg-rose-50 dark:bg-rose-900/30',       text: 'text-rose-600 dark:text-rose-400',     ring: 'ring-rose-300' },
  closed:              { bg: 'bg-gray-100 dark:bg-gray-700/60',      text: 'text-gray-600 dark:text-gray-400',     ring: 'ring-gray-300' },
  invoiced:            { bg: 'bg-blue-50 dark:bg-blue-900/30',       text: 'text-blue-700 dark:text-blue-300',     ring: 'ring-blue-300' },
};

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '—'; }
}

function daysDiff(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function getStatusClasses(code?: string, dbColor?: string) {
  if (dbColor) {
    return {
      className: '',
      style: { backgroundColor: dbColor + '18', color: dbColor, borderColor: dbColor + '40' } as React.CSSProperties,
    };
  }
  const key = (code || 'draft').toLowerCase();
  const s = STATUS_STYLES[key] || STATUS_STYLES.draft;
  return { className: `${s.bg} ${s.text}`, style: undefined as React.CSSProperties | undefined };
}

/* ═══════════════════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════════════════ */

function PurchaseOrdersPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const isAr = locale === 'ar';
  const searchRef = useRef<HTMLInputElement>(null);

  /* ─── State ──────────────────────────────────────────────── */
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [statuses, setStatuses] = useState<POStatus[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<POStats>({
    total: 0, draft: 0, pending_approval: 0, approved: 0,
    partially_received: 0, fully_received: 0, cancelled: 0,
    total_value: 0, active_value: 0,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Action states
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [approveTarget, setApproveTarget] = useState<PurchaseOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrder | null>(null);
  const [revertTarget, setRevertTarget] = useState<PurchaseOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const hasActiveFilters = statusFilter || vendorFilter || fromDate || toDate || debouncedSearch;

  /* ─── API helpers ────────────────────────────────────────── */

  const getHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const companyId = companyStore.getActiveCompanyId();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
    };
  }, []);

  /* ─── Fetch orders (server-side pagination) ──────────────── */

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      if (vendorFilter) params.set('vendor_id', vendorFilter);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);

      const res = await fetch(`${API_BASE}/procurement/purchase-orders?${params}`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) {
        setOrders(json.data || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      }
    } catch (err) {
      console.error('Fetch POs error:', err);
      showToast({ message: isAr ? 'فشل تحميل أوامر الشراء' : 'Failed to load purchase orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter, vendorFilter, fromDate, toDate, getHeaders, isAr, showToast]);

  /* ─── Fetch reference data (statuses + vendors + stats) ──── */

  const fetchRefData = useCallback(async () => {
    try {
      const h = getHeaders();
      const [statusRes, vendorRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/procurement/purchase-orders/statuses`, { headers: h }),
        fetch(`${API_BASE}/procurement/vendors?limit=500`, { headers: h }),
        fetch(`${API_BASE}/procurement/purchase-orders/stats`, { headers: h }),
      ]);

      if (statusRes.ok) {
        const j = await statusRes.json();
        setStatuses(j.data || []);
      }
      if (vendorRes.ok) {
        const j = await vendorRes.json();
        setVendors((j.data || []).map((v: any) => ({
          id: v.id,
          name: v.name || v.display_name || '',
          name_ar: v.name_ar || '',
          code: v.code || '',
        })));
      }
      if (statsRes.ok) {
        const j = await statsRes.json();
        if (j.data) setStats(j.data);
      }
    } catch {
      // Fallback styling will handle missing data
    }
  }, [getHeaders]);

  /* ─── Effects ────────────────────────────────────────────── */

  useEffect(() => { fetchRefData(); }, [fetchRefData]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Debounce search with 350ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  /* ─── Actions ────────────────────────────────────────────── */

  const executeAction = useCallback(async (
    url: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body?: object,
    successMsg?: string,
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await res.json();
      if (json.success || res.ok) {
        showToast({ message: successMsg || (isAr ? 'تم التنفيذ بنجاح' : 'Action completed'), type: 'success' });
        fetchOrders();
        fetchRefData(); // Refresh stats
        return true;
      }
      showToast({ message: json.error?.message || json.message || 'Error', type: 'error' });
      return false;
    } catch {
      showToast({ message: isAr ? 'حدث خطأ غير متوقع' : 'Unexpected error', type: 'error' });
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [getHeaders, isAr, showToast, fetchOrders, fetchRefData]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    await executeAction(
      `${API_BASE}/procurement/purchase-orders/${approveTarget.id}/approve`,
      'POST', {},
      isAr ? 'تم اعتماد أمر الشراء بنجاح' : 'Purchase order approved successfully',
    );
    setApproveTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await executeAction(
      `${API_BASE}/procurement/purchase-orders/${deleteTarget.id}`,
      'DELETE', undefined,
      isAr ? 'تم حذف أمر الشراء' : 'Purchase order deleted',
    );
    setDeleteTarget(null);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    await executeAction(
      `${API_BASE}/procurement/purchase-orders/${cancelTarget.id}`,
      'PUT', { status: 'cancelled' },
      isAr ? 'تم إلغاء أمر الشراء' : 'Purchase order cancelled',
    );
    setCancelTarget(null);
  };

  const handleRevert = async () => {
    if (!revertTarget) return;
    await executeAction(
      `${API_BASE}/procurement/purchase-orders/${revertTarget.id}/revert-to-draft`,
      'POST', {},
      isAr ? 'تم إرجاع أمر الشراء للمسودة' : 'Purchase order reverted to draft',
    );
    setRevertTarget(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setVendorFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  /* ─── KPI cards config ───────────────────────────────────── */

  const kpiCards = useMemo(() => [
    {
      label: isAr ? 'إجمالي الأوامر' : 'Total Orders',
      value: stats.total,
      icon: ClipboardDocumentListIcon,
      gradient: 'from-blue-500 to-blue-600',
      lightBg: 'bg-blue-50 dark:bg-blue-900/20',
      lightText: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: isAr ? 'مسودة' : 'Draft',
      value: stats.draft,
      icon: DocumentTextIcon,
      gradient: 'from-slate-400 to-slate-500',
      lightBg: 'bg-slate-50 dark:bg-slate-700/40',
      lightText: 'text-slate-600 dark:text-slate-400',
      filterCode: 'draft',
    },
    {
      label: isAr ? 'بانتظار الاعتماد' : 'Pending Approval',
      value: stats.pending_approval,
      icon: ClockIcon,
      gradient: 'from-amber-400 to-amber-500',
      lightBg: 'bg-amber-50 dark:bg-amber-900/20',
      lightText: 'text-amber-600 dark:text-amber-400',
      filterCode: 'pending_approval',
    },
    {
      label: isAr ? 'معتمدة' : 'Approved',
      value: stats.approved,
      icon: CheckCircleIcon,
      gradient: 'from-emerald-500 to-emerald-600',
      lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      lightText: 'text-emerald-600 dark:text-emerald-400',
      filterCode: 'approved',
    },
    {
      label: isAr ? 'مستلمة جزئياً' : 'Partially Received',
      value: stats.partially_received,
      icon: ArchiveBoxArrowDownIcon,
      gradient: 'from-orange-400 to-orange-500',
      lightBg: 'bg-orange-50 dark:bg-orange-900/20',
      lightText: 'text-orange-600 dark:text-orange-400',
      filterCode: 'partially_received',
    },
    {
      label: isAr ? 'القيمة الفعّالة' : 'Active Value',
      value: null,
      displayValue: fmtNum(stats.active_value, 0),
      icon: BanknotesIcon,
      gradient: 'from-indigo-500 to-purple-600',
      lightBg: 'bg-indigo-50 dark:bg-indigo-900/20',
      lightText: 'text-indigo-600 dark:text-indigo-400',
      isCurrency: true,
    },
  ], [stats, isAr]);

  /* ─── Pagination helpers ─────────────────────────────────── */

  const paginationRange = useMemo(() => {
    const range: number[] = [];
    const delta = 2;
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);
    for (let i = left; i <= right; i++) range.push(i);
    return range;
  }, [page, totalPages]);

  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <MainLayout>
      <Head>
        <title>{isAr ? 'أوامر الشراء — SLMS' : 'Purchase Orders — SLMS'}</title>
      </Head>

      <div className="space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto">

        {/* ═══ Header ══════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <ShoppingCartIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {isAr ? 'أوامر الشراء' : 'Purchase Orders'}
                {total > 0 && (
                  <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                    {total}
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'إدارة ومتابعة أوامر الشراء والمشتريات' : 'Manage and track purchase orders'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content={isAr ? 'تحديث البيانات' : 'Refresh data'}>
              <button
                onClick={() => { fetchOrders(); fetchRefData(); }}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400 transition-all hover:shadow-sm"
              >
                <ArrowPathIcon className={clsx('h-4.5 w-4.5', loading && 'animate-spin')} />
              </button>
            </Tooltip>
            {hasPermission('purchase_orders:create') && (
              <Button
                onClick={() => router.push('/purchasing/orders/new')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
              >
                <PlusIcon className="h-4.5 w-4.5 ltr:mr-1.5 rtl:ml-1.5" />
                {isAr ? 'أمر شراء جديد' : 'New Purchase Order'}
              </Button>
            )}
          </div>
        </div>

        {/* ═══ KPI Cards ═══════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((kpi, i) => {
            const Icon = kpi.icon;
            const filterCode = (kpi as any).filterCode as string | undefined;
            return (
              <button
                key={i}
                onClick={filterCode ? () => { setStatusFilter(statusFilter === filterCode ? '' : filterCode); setPage(1); } : undefined}
                disabled={!filterCode}
                className={clsx(
                  'group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4',
                  'transition-all duration-200',
                  filterCode
                    ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer hover:-translate-y-0.5'
                    : 'cursor-default',
                  filterCode && statusFilter === filterCode && 'ring-2 ring-blue-500 border-blue-400',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={clsx('p-2 rounded-lg', kpi.lightBg)}>
                    <Icon className={clsx('h-5 w-5', kpi.lightText)} />
                  </div>
                  {filterCode && statusFilter === filterCode && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
                <div className="mt-3">
                  <p className={clsx(
                    'font-bold text-slate-800 dark:text-white',
                    (kpi as any).isCurrency ? 'text-lg' : 'text-2xl',
                  )}>
                    {(kpi as any).displayValue ?? kpi.value}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{kpi.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ═══ Filters Bar ═════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Search + toggle row */}
          <div className="flex items-center gap-3 p-3 sm:p-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 h-4 w-4 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث برقم الأمر أو اسم المورد...' : 'Search by PO number or vendor...'}
                className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-3 rtl:pl-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-700 transition-colors"
              />
            </div>
            <Tooltip content={isAr ? 'فلاتر متقدمة' : 'Advanced filters'}>
              <button
                onClick={() => setShowFilters(f => !f)}
                className={clsx(
                  'relative p-2 rounded-lg border transition-all',
                  showFilters || hasActiveFilters
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:border-slate-300',
                )}
              >
                <FunnelIcon className="h-4 w-4" />
                {hasActiveFilters && !showFilters && (
                  <span className="absolute -top-1 ltr:-right-1 rtl:-left-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>
            </Tooltip>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 transition-colors whitespace-nowrap"
              >
                <XCircleIcon className="h-3.5 w-3.5" />
                {isAr ? 'مسح الكل' : 'Clear all'}
              </button>
            )}
          </div>

          {/* Expandable filters */}
          <div className={clsx(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-3 sm:px-4 overflow-hidden transition-all duration-300',
            showFilters ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0',
          )}>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {isAr ? 'الحالة' : 'Status'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white py-2 px-3 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                {statuses.length > 0
                  ? statuses.map(s => (
                      <option key={s.id} value={s.code}>{isAr ? (s.name_ar || s.name) : s.name}</option>
                    ))
                  : ['draft', 'pending_approval', 'approved', 'partially_received', 'fully_received', 'cancelled'].map(code => (
                      <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>
                    ))
                }
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {isAr ? 'المورد' : 'Vendor'}
              </label>
              <select
                value={vendorFilter}
                onChange={(e) => { setVendorFilter(e.target.value); setPage(1); }}
                className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white py-2 px-3 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isAr ? 'جميع الموردين' : 'All Vendors'}</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{isAr ? (v.name_ar || v.name) : v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {isAr ? 'من تاريخ' : 'From Date'}
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white py-2 px-3 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {isAr ? 'إلى تاريخ' : 'To Date'}
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white py-2 px-3 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ═══ Table ═══════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40">
                  {[
                    { key: 'po_number', label: isAr ? 'رقم الأمر' : 'PO #', align: 'start' },
                    { key: 'date',      label: isAr ? 'التاريخ' : 'Date',     align: 'start' },
                    { key: 'vendor',    label: isAr ? 'المورد' : 'Vendor',     align: 'start' },
                    { key: 'type',      label: isAr ? 'النوع' : 'Type',       align: 'center' },
                    { key: 'project',   label: isAr ? 'المشروع' : 'Project',   align: 'center' },
                    { key: 'total',     label: isAr ? 'الإجمالي' : 'Total',    align: 'end' },
                    { key: 'delivery',  label: isAr ? 'التسليم' : 'Delivery',  align: 'center' },
                    { key: 'items',     label: isAr ? 'البنود' : 'Items',      align: 'center' },
                    { key: 'status',    label: isAr ? 'الحالة' : 'Status',     align: 'center' },
                    { key: 'actions',   label: isAr ? 'الإجراءات' : 'Actions', align: 'center' },
                  ].map(col => (
                    <th key={col.key} className={clsx(
                      'px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap',
                      col.align === 'end' ? 'text-end' : col.align === 'center' ? 'text-center' : 'text-start',
                    )}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center">
                      <div className="inline-flex flex-col items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-600 rounded-full" />
                          <div className="absolute inset-0 w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-sm text-slate-400">{isAr ? 'جاري تحميل أوامر الشراء...' : 'Loading purchase orders...'}</p>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="inline-flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-2xl">
                          <ShoppingCartIcon className="h-10 w-10 text-slate-300 dark:text-slate-500" />
                        </div>
                        <div>
                          <p className="text-base font-medium text-slate-600 dark:text-slate-300">
                            {hasActiveFilters
                              ? (isAr ? 'لا توجد نتائج للفلاتر المحددة' : 'No results for current filters')
                              : (isAr ? 'لا توجد أوامر شراء بعد' : 'No purchase orders yet')}
                          </p>
                          <p className="text-sm text-slate-400 mt-1">
                            {hasActiveFilters
                              ? (isAr ? 'جرّب تغيير معايير البحث' : 'Try adjusting your search criteria')
                              : (isAr ? 'أنشئ أمر شراء جديد للبدء' : 'Create a new purchase order to get started')}
                          </p>
                        </div>
                        {hasActiveFilters && (
                          <button
                            onClick={resetFilters}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                          >
                            {isAr ? 'مسح جميع الفلاتر' : 'Clear all filters'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => {
                    const vendorName = isAr
                      ? (po.vendor_display_name_ar || po.vendor_display_name || po.vendor_name || '—')
                      : (po.vendor_display_name || po.vendor_display_name_ar || po.vendor_name || '—');
                    const typeName = isAr ? (po.order_type_name_ar || po.order_type_name) : po.order_type_name;
                    const projectLabel = po.project_code
                      ? `${po.project_code}${po.project_name ? ` • ${isAr ? (po.project_name_ar || po.project_name) : po.project_name}` : ''}`
                      : null;
                    const statusLabel = isAr ? (po.status_name_ar || po.status_name || po.status) : (po.status_name || po.status);
                    const sty = getStatusClasses(po.status_code || po.status, po.status_color);
                    const deliveryDate = po.expected_delivery_date || po.expected_date;
                    const daysLeft = daysDiff(deliveryDate);
                    const isOverdue = daysLeft !== null && daysLeft < 0 && !['fully_received', 'cancelled', 'closed'].includes(po.status);
                    const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && !['fully_received', 'cancelled', 'closed'].includes(po.status);
                    const statusCode = (po.status_code || po.status || '').toLowerCase();

                    return (
                      <tr
                        key={po.id}
                        className="group hover:bg-blue-50/40 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/purchasing/orders/${po.id}?mode=view`)}
                      >
                        {/* PO Number */}
                        <td className="px-3 py-3">
                          <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                            {po.order_number}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                          {fmtDate(po.order_date)}
                        </td>

                        {/* Vendor */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                              {(vendorName || '?')[0]}
                            </div>
                            <span className="text-slate-700 dark:text-slate-200 truncate max-w-[140px] text-xs font-medium" title={vendorName}>
                              {vendorName}
                            </span>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-3 py-3 text-center">
                          {typeName ? (
                            <span className="inline-block bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 text-[10px] px-2 py-0.5 rounded-full font-medium border border-violet-200 dark:border-violet-700/50">
                              {typeName}
                            </span>
                          ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>

                        {/* Project */}
                        <td className="px-3 py-3 text-center">
                          {projectLabel ? (
                            <span className="inline-block bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 text-[10px] px-2 py-0.5 rounded-full font-medium border border-teal-200 dark:border-teal-700/50 max-w-[120px] truncate" title={projectLabel}>
                              {po.project_code}
                            </span>
                          ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>

                        {/* Total */}
                        <td className="px-3 py-3 text-end whitespace-nowrap">
                          <span className="font-semibold text-slate-800 dark:text-white text-xs">
                            {fmtNum(po.total_amount)}
                          </span>
                          {po.currency_code && (
                            <span className="text-[10px] text-slate-400 ltr:ml-1 rtl:mr-1">{po.currency_code}</span>
                          )}
                        </td>

                        {/* Expected Delivery */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {deliveryDate ? (
                            <div className="inline-flex flex-col items-center">
                              <span className={clsx(
                                'text-xs',
                                isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' :
                                isDueSoon ? 'text-amber-600 dark:text-amber-400 font-medium' :
                                'text-slate-500 dark:text-slate-400',
                              )}>
                                {fmtDate(deliveryDate)}
                              </span>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-red-500 font-medium mt-0.5">
                                  <ExclamationTriangleIcon className="h-3 w-3" />
                                  {isAr ? `متأخر ${Math.abs(daysLeft!)}ي` : `${Math.abs(daysLeft!)}d late`}
                                </span>
                              )}
                              {isDueSoon && (
                                <span className="text-[10px] text-amber-500 font-medium mt-0.5">
                                  {daysLeft === 0 ? (isAr ? 'اليوم!' : 'Today!') : (isAr ? `${daysLeft}ي متبقي` : `${daysLeft}d left`)}
                                </span>
                              )}
                            </div>
                          ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>

                        {/* Items */}
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                            <CubeIcon className="h-3 w-3" />
                            {po.item_count || 0}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 text-center">
                          <span
                            className={clsx(
                              'inline-block text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap border',
                              sty.className,
                            )}
                            style={sty.style}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Tooltip content={isAr ? 'عرض' : 'View'}>
                              <button
                                onClick={() => router.push(`/purchasing/orders/${po.id}?mode=view`)}
                                className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                            </Tooltip>

                            {po.allows_edit !== false && statusCode === 'draft' && hasPermission('purchase_orders:edit') && (
                              <Tooltip content={isAr ? 'تعديل' : 'Edit'}>
                                <button
                                  onClick={() => router.push(`/purchasing/orders/${po.id}`)}
                                  className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            )}

                            {['draft', 'pending_approval'].includes(statusCode) && hasPermission('purchase_orders:approve') && (
                              <Tooltip content={isAr ? 'اعتماد' : 'Approve'}>
                                <button
                                  onClick={() => setApproveTarget(po)}
                                  className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            )}

                            {po.allows_receive !== false && ['approved', 'partially_received'].includes(statusCode) && hasPermission('purchase_orders:receive') && (
                              <Tooltip content={isAr ? 'استلام بضاعة' : 'Receive'}>
                                <button
                                  onClick={() => router.push(`/purchasing/orders/${po.id}?mode=view&tab=receive`)}
                                  className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition"
                                >
                                  <ArchiveBoxArrowDownIcon className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            )}

                            {['approved', 'pending_approval', 'ordered'].includes(statusCode) && hasPermission('purchase_orders:edit') && (
                              <Tooltip content={isAr ? 'إرجاع للمسودة' : 'Revert to Draft'}>
                                <button
                                  onClick={() => setRevertTarget(po)}
                                  className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                >
                                  <ArrowUturnLeftIcon className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            )}

                            {['draft', 'approved', 'pending_approval'].includes(statusCode) && hasPermission('purchase_orders:edit') && (
                              <Tooltip content={isAr ? 'إلغاء' : 'Cancel'}>
                                <button
                                  onClick={() => setCancelTarget(po)}
                                  className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            )}

                            {po.allows_delete !== false && statusCode === 'draft' && hasPermission('purchase_orders:delete') && (
                              <Tooltip content={isAr ? 'حذف' : 'Delete'}>
                                <button
                                  onClick={() => setDeleteTarget(po)}
                                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            )}

                            <Tooltip content={isAr ? 'طباعة' : 'Print'}>
                              <button
                                onClick={() => router.push(`/purchasing/orders/${po.id}?mode=view&print=1`)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                              >
                                <PrinterIcon className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ═══ Pagination ════════════════════════════════════ */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {isAr
                    ? `عرض ${startRow}–${endRow} من ${total}`
                    : `Showing ${startRow}–${endRow} of ${total}`}
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="pageSize" className="whitespace-nowrap">{isAr ? 'عدد الصفوف:' : 'Per page:'}</label>
                  <select
                    id="pageSize"
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-0.5 px-1.5 focus:ring-1 focus:ring-blue-500"
                  >
                    {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                  aria-label={isAr ? 'الصفحة الأولى' : 'First page'}
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5 inline" />
                  <ChevronLeftIcon className="h-3.5 w-3.5 inline -ml-2" />
                </button>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                  aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5" />
                </button>

                {paginationRange[0] > 1 && (
                  <span className="px-1 text-xs text-slate-400">…</span>
                )}

                {paginationRange.map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={clsx(
                      'min-w-[28px] py-1.5 text-xs rounded-lg border transition',
                      p === page
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-sm'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600',
                    )}
                  >
                    {p}
                  </button>
                ))}

                {paginationRange[paginationRange.length - 1] < totalPages && (
                  <span className="px-1 text-xs text-slate-400">…</span>
                )}

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                  aria-label={isAr ? 'الصفحة التالية' : 'Next page'}
                >
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                  aria-label={isAr ? 'الصفحة الأخيرة' : 'Last page'}
                >
                  <ChevronRightIcon className="h-3.5 w-3.5 inline" />
                  <ChevronRightIcon className="h-3.5 w-3.5 inline -ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Confirm Dialogs ═══════════════════════════════════ */}
      <ConfirmDialog
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title={isAr ? 'اعتماد أمر الشراء' : 'Approve Purchase Order'}
        message={
          isAr
            ? `هل أنت متأكد من اعتماد أمر الشراء رقم ${approveTarget?.order_number}؟\nالمورد: ${approveTarget?.vendor_display_name_ar || approveTarget?.vendor_display_name || ''}\nالقيمة: ${fmtNum(approveTarget?.total_amount)} ${approveTarget?.currency_code || ''}`
            : `Are you sure you want to approve PO ${approveTarget?.order_number}?\nVendor: ${approveTarget?.vendor_display_name || ''}\nTotal: ${fmtNum(approveTarget?.total_amount)} ${approveTarget?.currency_code || ''}`
        }
        confirmText={isAr ? 'اعتماد' : 'Approve'}
        variant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={isAr ? 'حذف أمر الشراء' : 'Delete Purchase Order'}
        message={
          isAr
            ? `هل أنت متأكد من حذف أمر الشراء رقم ${deleteTarget?.order_number}؟\nلا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to delete PO ${deleteTarget?.order_number}?\nThis action cannot be undone.`
        }
        confirmText={isAr ? 'حذف نهائي' : 'Delete'}
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title={isAr ? 'إلغاء أمر الشراء' : 'Cancel Purchase Order'}
        message={
          isAr
            ? `هل أنت متأكد من إلغاء أمر الشراء رقم ${cancelTarget?.order_number}؟\nلا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to cancel PO ${cancelTarget?.order_number}?\nThis action cannot be undone.`
        }
        confirmText={isAr ? 'تأكيد الإلغاء' : 'Cancel Order'}
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!revertTarget}
        onClose={() => setRevertTarget(null)}
        onConfirm={handleRevert}
        title={isAr ? 'إرجاع للمسودة' : 'Revert to Draft'}
        message={
          isAr
            ? `هل أنت متأكد من إرجاع أمر الشراء رقم ${revertTarget?.order_number} إلى حالة المسودة؟\nسيمكنك تعديل البيانات بعد ذلك.`
            : `Are you sure you want to revert PO ${revertTarget?.order_number} to draft?\nYou will be able to edit it afterwards.`
        }
        confirmText={isAr ? 'تأكيد الإرجاع' : 'Revert to Draft'}
        variant="primary"
        loading={actionLoading}
      />
    </MainLayout>
  );
}

export default withPermission('purchase_orders:view', PurchaseOrdersPage);
