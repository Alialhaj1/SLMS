/**
 *  ITEM BARCODES PAGE — Enterprise Edition
 * ═══════════════════════════════════════
 *  Professional barcode management with CRUD, search, pagination,
 *  barcode type badges, inline editing, and item linking.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  QrCodeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  XMarkIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { BarcodeCompact, BarcodeLarge } from '@/components/ui/BarcodeDisplay';

// ─── Cross-screen sync helper ──────────────────────────────────────────
function fireBarcodeUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('barcode-updated'));
  }
}

// ─── Types ────────────────────────────────────────────────────────────
interface BarcodeRecord {
  id: number;
  item_id: number;
  uom_id: number | null;
  barcode: string;
  barcode_type: string;
  is_primary: boolean;
  is_active: boolean;
  notes: string | null;
  item_code: string;
  item_name: string;
  item_name_ar: string;
  uom_name: string;
  uom_name_ar: string;
  base_uom_name: string;
  created_at: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface UomOption {
  value: number;
  label: string;
  labelAr?: string;
}

interface ItemOption {
  value: number;
  label: string;
  code: string;
}

const BARCODE_TYPES = ['EAN-13', 'EAN-8', 'UPC-A', 'CODE-128', 'QR', 'CODE-39', 'ITF'] as const;

const TYPE_COLORS: Record<string, string> = {
  'EAN-13': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'EAN-8': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  'UPC-A': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'CODE-128': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'QR': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'CODE-39': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'ITF': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

// ─── Helper: API call ──────────────────────────────────────────────
function apiHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(companyId ? { 'X-Company-Id': companyId } : {}),
    'Content-Type': 'application/json',
  };
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ItemBarcodesPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const router = useRouter();
  const isAr = locale === 'ar';

  // ─── State ────────────────────────────────────────────────────────
  const [barcodes, setBarcodes] = useState<BarcodeRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 50, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBarcode, setEditingBarcode] = useState<BarcodeRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formBarcode, setFormBarcode] = useState('');
  const [formBarcodeType, setFormBarcodeType] = useState('EAN-13');
  const [formItemId, setFormItemId] = useState<number | ''>('');
  const [formUomId, setFormUomId] = useState<number | ''>('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  // Items & UOMs for dropdowns
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);
  const [itemUoms, setItemUoms] = useState<UomOption[]>([]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: meta.total,
      ean13: barcodes.filter((b) => b.barcode_type === 'EAN-13').length,
      primary: barcodes.filter((b) => b.is_primary).length,
    };
  }, [barcodes, meta.total]);

  // ─── Debounce search ────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ─── Fetch barcodes ─────────────────────────────────────────────
  const fetchBarcodes = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (filterType) params.set('barcode_type', filterType);
        const res = await fetch(`${API}/api/master/item-barcodes?${params}`, { headers: apiHeaders() });
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setBarcodes(Array.isArray(json.data) ? json.data : []);
        if (json.meta) setMeta(json.meta);
      } catch {
        showToast(isAr ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, filterType, isAr, showToast]
  );

  useEffect(() => {
    fetchBarcodes(1);
  }, [fetchBarcodes]);

  // ─── Listen for cross-screen barcode updates ────────────────────
  useEffect(() => {
    const handler = () => fetchBarcodes(meta.page || 1);
    window.addEventListener('barcode-updated', handler);
    return () => window.removeEventListener('barcode-updated', handler);
  }, [fetchBarcodes, meta.page]);

  // ─── Load items for dropdown ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/master/items?limit=5000&fields=id,code,name_en,name_ar`, {
          headers: apiHeaders(),
        });
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        setItemOptions(
          rows.map((r: any) => ({
            value: r.id,
            label: `${r.code} — ${isAr ? r.name_ar || r.name_en || r.name : r.name_en || r.name}`,
            code: r.code,
          }))
        );
      } catch { /* silent */ }
    };
    load();
  }, [isAr]);

  // ─── Load UOMs for dropdown ─────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/master/items/filters`, { headers: apiHeaders() });
        const json = await res.json();
        const units = json.data?.units || [];
        setUomOptions(
          units.map((u: any) => ({
            value: u.id,
            label: isAr ? u.name_ar || u.name_en || u.name : u.name_en || u.name,
            labelAr: u.name_ar,
          }))
        );
      } catch { /* silent */ }
    };
    load();
  }, [isAr]);

  // ─── Load item-specific UOMs when item changes ──────────────────
  useEffect(() => {
    if (!formItemId) {
      setItemUoms([]);
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/master/items/${formItemId}/uoms`, { headers: apiHeaders() });
        const json = await res.json();
        const rows = json.data || [];
        setItemUoms(
          rows.map((r: any) => ({
            value: r.uom_id,
            label: isAr ? r.name_ar || r.name : r.name || r.name_ar,
          }))
        );
      } catch {
        setItemUoms([]);
      }
    };
    load();
  }, [formItemId, isAr]);

  // ─── Open modal for create / edit ───────────────────────────────
  const openCreate = useCallback(() => {
    setEditingBarcode(null);
    setFormBarcode('');
    setFormBarcodeType('EAN-13');
    setFormItemId('');
    setFormUomId('');
    setFormIsPrimary(false);
    setFormNotes('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((rec: BarcodeRecord) => {
    setEditingBarcode(rec);
    setFormBarcode(rec.barcode);
    setFormBarcodeType(rec.barcode_type);
    setFormItemId(rec.item_id);
    setFormUomId(rec.uom_id || '');
    setFormIsPrimary(rec.is_primary);
    setFormNotes(rec.notes || '');
    setModalOpen(true);
  }, []);

  // ─── Save (create / update) ─────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!formBarcode.trim()) {
      showToast(isAr ? 'الباركود مطلوب' : 'Barcode is required', 'error');
      return;
    }
    if (!editingBarcode && !formItemId) {
      showToast(isAr ? 'الصنف مطلوب' : 'Item is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        barcode: formBarcode.trim(),
        barcode_type: formBarcodeType,
        uom_id: formUomId || undefined,
        is_primary: formIsPrimary,
        notes: formNotes || undefined,
      };
      if (!editingBarcode) body.item_id = formItemId;

      const url = editingBarcode
        ? `${API}/api/master/item-barcodes/${editingBarcode.id}`
        : `${API}/api/master/item-barcodes`;
      const method = editingBarcode ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(body) });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Save failed');
      }

      showToast(
        isAr
          ? editingBarcode ? 'تم تحديث الباركود بنجاح' : 'تم إضافة الباركود بنجاح'
          : editingBarcode ? 'Barcode updated successfully' : 'Barcode created successfully',
        'success'
      );
      setModalOpen(false);
      fetchBarcodes(meta.page);
      fireBarcodeUpdated();
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل الحفظ' : 'Save failed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [formBarcode, formBarcodeType, formItemId, formUomId, formIsPrimary, formNotes, editingBarcode, isAr, showToast, fetchBarcodes, meta.page]);

  // ─── Delete ─────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/master/item-barcodes/${deleteId}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast(isAr ? 'تم حذف الباركود' : 'Barcode deleted', 'success');
      setDeleteId(null);
      fetchBarcodes(meta.page);
      fireBarcodeUpdated();
    } catch {
      showToast(isAr ? 'فشل الحذف' : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  }, [deleteId, isAr, showToast, fetchBarcodes, meta.page]);

  // ─── Navigate to item ──────────────────────────────────────────
  const goToItem = useCallback(
    (itemId: number) => {
      router.push(`/master/items?highlight=${itemId}`);
    },
    [router]
  );

  // ─── UOM options for form (item-specific if available, fallback to all) ──
  const formUomOptions = itemUoms.length > 0 ? itemUoms : uomOptions;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <MainLayout>
      <Head>
        <title>{isAr ? 'باركود الأصناف - SLMS' : 'Item Barcodes - SLMS'}</title>
      </Head>
      <div className="space-y-5">
        {/* ═══ Header ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <QrCodeIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isAr ? 'باركود الأصناف' : 'Item Barcodes'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isAr
                  ? `${meta.total.toLocaleString()} باركود مسجل`
                  : `${meta.total.toLocaleString()} registered barcodes`}
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/20 text-sm font-medium transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            {isAr ? 'إضافة باركود' : 'Add Barcode'}
          </button>
        </div>

        {/* ═══ Stats Cards ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: isAr ? 'إجمالي الباركود' : 'Total Barcodes',
              value: meta.total,
              color: 'from-blue-500 to-indigo-500',
              bg: 'bg-blue-50 dark:bg-blue-900/20',
            },
            {
              label: 'EAN-13',
              value: stats.ean13,
              color: 'from-purple-500 to-pink-500',
              bg: 'bg-purple-50 dark:bg-purple-900/20',
            },
            {
              label: isAr ? 'باركود رئيسي' : 'Primary',
              value: stats.primary,
              color: 'from-amber-500 to-orange-500',
              bg: 'bg-amber-50 dark:bg-amber-900/20',
            },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700/50`}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
                {s.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* ═══ Search & Filters ═══ */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث بالباركود، كود الصنف أو الاسم...' : 'Search by barcode, item code or name...'}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-2.5 px-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
              {BARCODE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {(search || filterType) && (
              <button
                onClick={() => { setSearch(''); setFilterType(''); }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title={isAr ? 'مسح الفلاتر' : 'Clear filters'}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ═══ Table ═══ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isAr ? 'جاري التحميل...' : 'Loading...'}
              </div>
            </div>
          ) : barcodes.length === 0 ? (
            <div className="p-12 text-center">
              <QrCodeIcon className="h-16 w-16 mx-auto mb-3 text-gray-200 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {isAr ? 'لا توجد باركودات' : 'No barcodes found'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {isAr ? 'قم بإضافة باركود جديد أو تغيير معايير البحث' : 'Add a new barcode or adjust your search criteria'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/40">
                    {[
                      isAr ? 'الباركود' : 'Barcode',
                      isAr ? 'كود الصنف' : 'Item Code',
                      isAr ? 'اسم الصنف' : 'Item Name',
                      isAr ? 'الوحدة' : 'Unit',
                      isAr ? 'النوع' : 'Type',
                      isAr ? 'الحالة' : 'Status',
                      isAr ? 'إجراءات' : 'Actions',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {barcodes.map((bc) => (
                    <tr
                      key={bc.id}
                      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors group"
                    >
                      {/* Barcode */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {bc.is_primary && (
                            <StarSolid className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" title={isAr ? 'رئيسي' : 'Primary'} />
                          )}
                          <div className="flex flex-col items-start">
                            <BarcodeCompact value={bc.barcode} format={bc.barcode_type} />
                          </div>
                        </div>
                      </td>
                      {/* Item Code */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => goToItem(bc.item_id)}
                          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline transition-colors flex items-center gap-1"
                        >
                          {bc.item_code}
                          <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      {/* Item Name */}
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                        {isAr ? bc.item_name_ar || bc.item_name : bc.item_name || bc.item_name_ar}
                      </td>
                      {/* UOM */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {isAr ? bc.uom_name_ar || bc.uom_name : bc.uom_name || bc.uom_name_ar || '—'}
                        </span>
                      </td>
                      {/* Type badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${TYPE_COLORS[bc.barcode_type] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                          {bc.barcode_type}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                            bc.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {bc.is_active ? (
                            <>
                              <CheckBadgeIcon className="h-3 w-3" />
                              {isAr ? 'نشط' : 'Active'}
                            </>
                          ) : (
                            isAr ? 'معطل' : 'Inactive'
                          )}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(bc)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            title={isAr ? 'تعديل' : 'Edit'}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(bc.id)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title={isAr ? 'حذف' : 'Delete'}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══ Pagination ═══ */}
          {meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isAr
                  ? `صفحة ${meta.page} من ${meta.pages}`
                  : `Page ${meta.page} of ${meta.pages}`}
              </p>
              <div className="flex gap-1">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => fetchBarcodes(meta.page - 1)}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <button
                  disabled={meta.page >= meta.pages}
                  onClick={() => fetchBarcodes(meta.page + 1)}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Create / Edit Modal ═══ */}
        <Modal
          isOpen={modalOpen}
          onClose={() => !saving && setModalOpen(false)}
          title={
            editingBarcode
              ? isAr ? 'تعديل الباركود' : 'Edit Barcode'
              : isAr ? 'إضافة باركود جديد' : 'Add New Barcode'
          }
          size="lg"
          closable={!saving}
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {editingBarcode
                  ? isAr ? 'تحديث' : 'Update'
                  : isAr ? 'إضافة' : 'Create'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Item selector (only for create) */}
            {!editingBarcode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'الصنف' : 'Item'} <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={itemOptions.map((o) => ({ value: o.value, label: o.label }))}
                  value={formItemId}
                  onChange={(v) => setFormItemId(v ? Number(v) : '')}
                  placeholder={isAr ? 'اختر الصنف...' : 'Select item...'}
                  locale={locale}
                />
              </div>
            )}
            {editingBarcode && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <QrCodeIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {editingBarcode.item_code} — {isAr ? editingBarcode.item_name_ar || editingBarcode.item_name : editingBarcode.item_name}
                </span>
              </div>
            )}

            {/* Barcode + Type Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'الباركود' : 'Barcode'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tracking-wider"
                  placeholder="6281234567890"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'النوع' : 'Type'}
                </label>
                <select
                  value={formBarcodeType}
                  onChange={(e) => setFormBarcodeType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {BARCODE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* UOM selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isAr ? 'وحدة القياس' : 'Unit of Measure'}
              </label>
              <SearchableSelect
                options={formUomOptions.map((o) => ({
                  value: o.value,
                  label: isAr ? o.labelAr || o.label : o.label,
                }))}
                value={formUomId}
                onChange={(v) => setFormUomId(v ? Number(v) : '')}
                placeholder={isAr ? 'اختر الوحدة...' : 'Select unit...'}
                locale={locale}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {isAr
                  ? 'الوحدة التي ينطبق عليها هذا الباركود (اتركه فارغاً للوحدة الأساسية)'
                  : 'Unit this barcode applies to (leave empty for base unit)'}
              </p>
            </div>

            {/* Live Barcode Preview */}
            {formBarcode.trim() && (
              <div className="flex flex-col items-center gap-1 py-3 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
                  {isAr ? 'معاينة الباركود' : 'Barcode Preview'}
                </p>
                <BarcodeLarge value={formBarcode.trim()} format={formBarcodeType} />
              </div>
            )}

            {/* Primary + Notes Row */}
            <div className="flex items-start gap-4">
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={formIsPrimary}
                  onChange={(e) => setFormIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <StarIcon className="h-3.5 w-3.5 text-amber-500" />
                  {isAr ? 'باركود رئيسي' : 'Primary barcode'}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isAr ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder={isAr ? 'ملاحظات اختيارية...' : 'Optional notes...'}
              />
            </div>
          </div>
        </Modal>

        {/* ═══ Delete Confirmation Modal ═══ */}
        <Modal
          isOpen={!!deleteId}
          onClose={() => !deleting && setDeleteId(null)}
          title={isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
          size="sm"
          closable={!deleting}
          footer={
            <>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50 transition-colors"
              >
                {deleting ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'حذف' : 'Delete')}
              </button>
            </>
          }
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isAr
                ? 'هل أنت متأكد من حذف هذا الباركود؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this barcode? This action cannot be undone.'}
            </p>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}

/**
 * Standalone Barcode Dialog — can be imported from items page
 * to show/edit barcodes for a specific item in a popup.
 */
export function ItemBarcodeDialog({
  itemId,
  itemCode,
  itemName,
  isOpen,
  onClose,
  onUpdate,
}: {
  itemId: number;
  itemCode: string;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}) {
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [barcodes, setBarcodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [newBarcode, setNewBarcode] = useState('');
  const [newType, setNewType] = useState('EAN-13');
  const [saving, setSaving] = useState(false);

  const fetchItemBarcodes = useCallback(async () => {
    if (!itemId || !isOpen) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/master/item-barcodes/item/${itemId}`, { headers: apiHeaders() });
      const json = await res.json();
      setBarcodes(Array.isArray(json.data) ? json.data : []);
    } catch {
      setBarcodes([]);
    } finally {
      setLoading(false);
    }
  }, [itemId, isOpen]);

  useEffect(() => {
    fetchItemBarcodes();
  }, [fetchItemBarcodes]);

  // Listen for external barcode updates (e.g. from main barcodes page)
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => fetchItemBarcodes();
    window.addEventListener('barcode-updated', handler);
    return () => window.removeEventListener('barcode-updated', handler);
  }, [isOpen, fetchItemBarcodes]);

  const handleAdd = async () => {
    if (!newBarcode.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/master/item-barcodes`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ item_id: itemId, barcode: newBarcode.trim(), barcode_type: newType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed');
      showToast(isAr ? 'تم إضافة الباركود' : 'Barcode added', 'success');
      setNewBarcode('');
      fetchItemBarcodes();
      fireBarcodeUpdated();
      onUpdate?.();
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل الإضافة' : 'Failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/master/item-barcodes/${id}`, { method: 'DELETE', headers: apiHeaders() });
      if (!res.ok) throw new Error('Failed');
      showToast(isAr ? 'تم الحذف' : 'Deleted', 'success');
      fetchItemBarcodes();
      fireBarcodeUpdated();
      onUpdate?.();
    } catch {
      showToast(isAr ? 'فشل الحذف' : 'Delete failed', 'error');
    }
  };

  const handleSetPrimary = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/master/item-barcodes/${id}`, {
        method: 'PUT',
        headers: apiHeaders(),
        body: JSON.stringify({ is_primary: true }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchItemBarcodes();
      fireBarcodeUpdated();
      onUpdate?.();
    } catch {
      showToast(isAr ? 'فشل التحديث' : 'Update failed', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `باركود: ${itemCode}` : `Barcodes: ${itemCode}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Item info */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-3 py-2 rounded-lg">
          <QrCodeIcon className="h-4 w-4" />
          <span className="font-medium text-gray-700 dark:text-gray-200">{itemCode}</span>
          <span>—</span>
          <span>{itemName}</span>
        </div>

        {/* Existing barcodes */}
        {loading ? (
          <div className="text-center py-4 text-sm text-gray-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : barcodes.length === 0 ? (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <QrCodeIcon className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">{isAr ? 'لا توجد باركودات لهذا الصنف' : 'No barcodes for this item'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {barcodes.map((bc) => (
              <div key={bc.id} className="flex items-center justify-between py-2.5 group">
                <div className="flex items-center gap-3">
                  {bc.is_primary ? (
                    <StarSolid className="h-4 w-4 text-amber-500" />
                  ) : (
                    <button
                      onClick={() => handleSetPrimary(bc.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title={isAr ? 'تعيين كرئيسي' : 'Set as primary'}
                    >
                      <StarIcon className="h-4 w-4 text-gray-300 hover:text-amber-500 transition-colors" />
                    </button>
                  )}
                  <div className="flex flex-col items-start">
                    <BarcodeCompact value={bc.barcode} format={bc.barcode_type} />
                  </div>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${TYPE_COLORS[bc.barcode_type] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {bc.barcode_type}
                  </span>
                  {bc.uom_name && (
                    <span className="text-xs text-gray-400">
                      ({isAr ? bc.uom_name_ar || bc.uom_name : bc.uom_name})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(bc.id)}
                  className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new barcode inline */}
        <div className="flex items-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {isAr ? 'باركود جديد' : 'New Barcode'}
            </label>
            <input
              type="text"
              value={newBarcode}
              onChange={(e) => setNewBarcode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 tracking-wider"
              placeholder="6281234567890"
              dir="ltr"
              disabled={saving}
            />
          </div>
          {newBarcode.trim() && (
            <div className="flex-shrink-0 pb-0.5">
              <BarcodeCompact value={newBarcode.trim()} format={newType} />
            </div>
          )}
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200"
            disabled={saving}
          >
            {BARCODE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={saving || !newBarcode.trim()}
            className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            {isAr ? 'إضافة' : 'Add'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
