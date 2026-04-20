import { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import * as XLSX from 'xlsx';
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
  QrCodeIcon, PlusIcon, PencilIcon, TrashIcon,
  MagnifyingGlassIcon, ArrowPathIcon, ArrowDownTrayIcon,
  ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ─── Types ──────────────────────────────────────────────────────
interface HSCode {
  id: number;
  code: string;
  description_en: string;
  description_ar: string;
  duty_rate_ar: string | null;
  duty_rate_en: string | null;
  procedures: string | null;
  effective_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Stats { total: number; active: number; inactive: number }

// ─── Helpers ────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
async function apiFetch(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  const json = await res.json().catch(() => ({ success: false, error: res.statusText }));
  if (!res.ok) throw new Error(json.error?.message || json.error || `HTTP ${res.status}`);
  return json;
}

function parseImportFile(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes('\t') ? '\t' : ',';
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map(c => c.replace(/^"|"$/g, '').trim());
    if (!cols[0]) continue;
    rows.push({
      code: cols[0] || '',
      description_ar: cols[1] || '',
      description_en: cols[2] || '',
      duty_rate_ar: cols[3] || '',
      duty_rate_en: cols[4] || '',
      procedures: cols[5] || '',
      effective_date: cols[6] || '',
    });
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function HSCodesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';

  const canView = hasPermission(MenuPermissions.MasterData.HSCodes.View);
  const canCreate = hasPermission(MenuPermissions.MasterData.HSCodes.Create);
  const canEdit = hasPermission(MenuPermissions.MasterData.HSCodes.Edit);
  const canDelete = hasPermission(MenuPermissions.MasterData.HSCodes.Delete);

  // ─── State ──────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats | null>(null);
  const [data, setData] = useState<HSCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [allSelected, setAllSelected] = useState(false);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<HSCode | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HSCode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Import
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'insert' | 'upsert'>('upsert');
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form
  const emptyForm = { code: '', description_en: '', description_ar: '', duty_rate_ar: '', duty_rate_en: '', procedures: '', effective_date: '', is_active: true };
  const [formData, setFormData] = useState(emptyForm);

  // ─── API calls ──────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const r = await apiFetch('/api/master/hs-codes/stats');
      setStats(r.data);
    } catch {}
  }, []);

  const loadData = useCallback(async (p = 1, s = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (s) params.set('search', s);
      const r = await apiFetch(`/api/master/hs-codes?${params}`);
      setData(r.data);
      setTotal(r.meta?.total ?? r.total ?? 0);
      setPage(p);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [limit, search, showToast]);

  const refresh = useCallback(() => {
    loadStats();
    loadData(1, search);
    setSelectedIds(new Set());
    setAllSelected(false);
  }, [loadStats, loadData, search]);

  // ─── Effects ────────────────────────────────────────────────────
  useEffect(() => {
    if (canView) { loadStats(); loadData(1, ''); }
  }, [canView]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canView) return;
    const t = setTimeout(() => loadData(1, search), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Selection handlers ─────────────────────────────────────────
  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setAllSelected(false);
  };

  const handleSelectAll = async () => {
    if (allSelected) {
      setSelectedIds(new Set());
      setAllSelected(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const r = await apiFetch(`/api/master/hs-codes/all-ids?${params}`);
      setSelectedIds(new Set(r.data));
      setAllSelected(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteLoading(true);
    try {
      await apiFetch('/api/master/hs-codes/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      showToast(isRTL ? `تم حذف ${selectedIds.size} سجل` : `${selectedIds.size} records deleted`, 'success');
      setBulkDeleteOpen(false);
      refresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // ─── Export ─────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`${API}/api/master/hs-codes/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hs-codes.tsv';
      a.click();
      URL.revokeObjectURL(url);
      showToast(isRTL ? 'تم تصدير البيانات' : 'Data exported', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ─── Import ─────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (jsonRows.length < 2) { setImportRows([]); setImportOpen(true); return; }
        const rows: any[] = [];
        for (let i = 1; i < jsonRows.length; i++) {
          const cols = jsonRows[i].map((c: any) => String(c ?? '').trim());
          if (!cols[0]) continue;
          rows.push({
            code: cols[0] || '',
            description_ar: cols[1] || '',
            description_en: cols[2] || '',
            duty_rate_ar: cols[3] || '',
            duty_rate_en: cols[4] || '',
            procedures: cols[5] || '',
            effective_date: cols[6] || '',
          });
        }
        setImportRows(rows);
        setImportOpen(true);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const rows = parseImportFile(text);
        setImportRows(rows);
        setImportOpen(true);
      };
      reader.readAsText(file, 'UTF-8');
    }
    e.target.value = '';
  };

  const handleImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    try {
      const r = await apiFetch('/api/master/hs-codes/import', {
        method: 'POST',
        body: JSON.stringify({ rows: importRows, mode: importMode }),
      });
      const d = r.data;
      showToast(
        isRTL
          ? `تم الاستيراد: ${d.inserted} إدراج، ${d.updated} تحديث، ${d.skipped} تخطي`
          : `Import done: ${d.inserted} inserted, ${d.updated} updated, ${d.skipped} skipped`,
        'success'
      );
      setImportOpen(false);
      setImportRows([]);
      refresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'رمز النظام المنسق\nHS Code',
      'الصنف باللغة العربية\nArabic Description',
      'الصنف باللغة الانجليزية\nEnglish Description',
      'فئة الرسم باللغة العربية\nArabic Duty Rate',
      'فئة الرسم باللغة الانجليزية\nEnglish Duty Rate',
      'الاجراءات\nProcedures',
      'التاريخ\nEffective Date',
    ];
    const sampleRows = [
      ['0713310000', 'عدس مجفف', 'Dried Lentils', '5 %', '5 %', 'استيراد عادي', '2024-01-01'],
      ['8471300000', 'حواسيب محمولة', 'Laptop Computers', 'Exempted', 'معفاة', '', '2024-01-01'],
      ['2203000000', 'بيرة مصنوعة من الشعير', 'Beer made from malt', 'Prohibited from Importing', 'محظور استيراده', '', '2024-01-01'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    // Column widths
    ws['!cols'] = [
      { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HS Codes');
    XLSX.writeFile(wb, 'hs-codes-template.xlsx');
  };

  // ─── CRUD ───────────────────────────────────────────────────────
  const openCreate = () => {
    setFormMode('create');
    setEditTarget(null);
    setFormData(emptyForm);
    setFormOpen(true);
  };
  const openEdit = (row: HSCode) => {
    setFormMode('edit');
    setEditTarget(row);
    setFormData({
      code: row.code, description_en: row.description_en, description_ar: row.description_ar,
      duty_rate_ar: row.duty_rate_ar || '', duty_rate_en: row.duty_rate_en || '',
      procedures: row.procedures || '', effective_date: row.effective_date || '', is_active: row.is_active,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      showToast(isRTL ? 'رمز النظام المنسق مطلوب' : 'Harmonized code is required', 'error');
      return;
    }
    setFormLoading(true);
    try {
      if (formMode === 'create') {
        await apiFetch('/api/master/hs-codes', { method: 'POST', body: JSON.stringify(formData) });
        showToast(isRTL ? 'تم الإنشاء بنجاح' : 'Created successfully', 'success');
      } else {
        await apiFetch(`/api/master/hs-codes/${editTarget!.id}`, { method: 'PUT', body: JSON.stringify(formData) });
        showToast(isRTL ? 'تم التحديث بنجاح' : 'Updated successfully', 'success');
      }
      setFormOpen(false);
      refresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/master/hs-codes/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(isRTL ? 'تم الحذف' : 'Deleted', 'success');
      setDeleteTarget(null);
      refresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Access denied ─────────────────────────────────────────────
  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{isRTL ? 'رموز النظام المنسق' : 'HS Codes'} - SLMS</title></Head>
        <div className="text-center py-16">
          <QrCodeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{isRTL ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  const totalPages = Math.ceil(total / limit);
  const pageChecked = data.length > 0 && data.every(r => selectedIds.has(r.id));

  return (
    <MainLayout>
      <Head><title>{isRTL ? 'رموز النظام المنسق' : 'HS Codes'} - SLMS</title></Head>
      <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.tsv,.csv,.txt" className="hidden" onChange={handleFileSelect} />

      <div className="space-y-5">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
              <QrCodeIcon className="h-7 w-7 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isRTL ? 'رموز النظام المنسق' : 'Harmonized System Codes'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? 'إدارة بيانات التعريفة الجمركية' : 'Manage customs tariff data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="secondary" onClick={downloadTemplate}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {isRTL ? 'تنزيل القالب' : 'Template'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <ArrowUpTrayIcon className="h-4 w-4" />
              {isRTL ? 'استيراد' : 'Import'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleExport}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {isRTL ? 'تصدير' : 'Export'}
            </Button>
            {canCreate && (
              <Button onClick={openCreate}>
                <PlusIcon className="h-4 w-4" />
                {isRTL ? 'إضافة' : 'Add'}
              </Button>
            )}
          </div>
        </div>

        {/* ─── Stats ──────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: isRTL ? 'الإجمالي' : 'Total', value: stats.total, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
              { label: isRTL ? 'فعال' : 'Active', value: stats.active, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
              { label: isRTL ? 'غير فعال' : 'Inactive', value: stats.inactive, color: 'text-gray-500 bg-gray-50 dark:bg-gray-700' },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Search + Selection Actions ─────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث في الرمز, الوصف, فئة الرسم, الاجراءات...' : 'Search code, description, duty rate, procedures...'}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && canDelete && (
                <Button size="sm" variant="secondary" onClick={() => setBulkDeleteOpen(true)} className="!text-red-600 !border-red-300 hover:!bg-red-50">
                  <TrashIcon className="h-4 w-4" />
                  {isRTL ? `حذف (${selectedIds.size})` : `Delete (${selectedIds.size})`}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={handleSelectAll}>
                {allSelected
                  ? (isRTL ? 'إلغاء تحديد الكل' : 'Deselect All')
                  : (isRTL ? 'تحديد الكل' : 'Select All')
                }
              </Button>
              <Button size="sm" variant="secondary" onClick={refresh}>
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {allSelected && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
              {isRTL
                ? `تم تحديد جميع ${selectedIds.size} سجل عبر كل الصفحات`
                : `All ${selectedIds.size} records selected across all pages`}
            </div>
          )}
        </div>

        {/* ─── Table ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={pageChecked}
                      onChange={() => {
                        if (pageChecked) {
                          setSelectedIds(prev => {
                            const n = new Set(prev);
                            data.forEach(r => n.delete(r.id));
                            return n;
                          });
                          setAllSelected(false);
                        } else {
                          setSelectedIds(prev => {
                            const n = new Set(prev);
                            data.forEach(r => n.add(r.id));
                            return n;
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  {[
                    { label: isRTL ? 'رمز النظام المنسق' : 'Harmonized Code', w: 'w-36' },
                    { label: isRTL ? 'الصنف بالعربية' : 'Item Arabic Name', w: '' },
                    { label: isRTL ? 'الصنف بالانجليزية' : 'Item English Name', w: '' },
                    { label: isRTL ? 'فئة الرسم بالعربية' : 'Arabic Duty Rate', w: 'w-36' },
                    { label: isRTL ? 'فئة الرسم بالانجليزية' : 'English Duty Rate', w: 'w-36' },
                    { label: isRTL ? 'الاجراءات' : 'Procedures', w: 'w-40' },
                    { label: isRTL ? 'التاريخ' : 'Date', w: 'w-28' },
                    { label: isRTL ? 'إجراءات' : 'Actions', w: 'w-24' },
                  ].map((col, i) => (
                    <th key={i} className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 ${col.w}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 animate-pulse">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">{isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>
                ) : (
                  data.map(row => (
                    <tr key={row.id} className={`group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${selectedIds.has(row.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{row.code}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100" dir="rtl">{row.description_ar || '—'}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100">{row.description_en || '—'}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300" dir="rtl">{row.duty_rate_ar || '—'}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">{row.duty_rate_en || '—'}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{row.procedures || '—'}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 font-mono">{row.effective_date || '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit && (
                            <button onClick={() => openEdit(row)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title={isRTL ? 'تعديل' : 'Edit'}>
                              <PencilIcon className="h-4 w-4 text-blue-500" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteTarget(row)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title={isRTL ? 'حذف' : 'Delete'}>
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isRTL
                ? `الصفحة ${page} من ${totalPages || 1} • الإجمالي ${total}`
                : `Page ${page} of ${totalPages || 1} • Total ${total}`}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => loadData(page - 1, search)}>
                {isRTL ? 'السابق' : 'Prev'}
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => loadData(page + 1, search)}>
                {isRTL ? 'التالي' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Create/Edit Modal ═════════════════════════════════ */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)}
        title={formMode === 'create' ? (isRTL ? 'إضافة رمز' : 'Add HS Code') : (isRTL ? 'تعديل رمز' : 'Edit HS Code')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={isRTL ? 'رمز النظام المنسق *' : 'Harmonized Code *'} value={formData.code}
              onChange={(e: any) => setFormData({ ...formData, code: e.target.value })} placeholder="0713310000" />
            <Input label={isRTL ? 'التاريخ' : 'Date'} type="date" value={formData.effective_date}
              onChange={(e: any) => setFormData({ ...formData, effective_date: e.target.value })} />
          </div>
          <Input label={isRTL ? 'الصنف باللغة العربية' : 'Item Arabic Name'} value={formData.description_ar}
            onChange={(e: any) => setFormData({ ...formData, description_ar: e.target.value })} />
          <Input label={isRTL ? 'الصنف باللغة الانجليزية' : 'Item English Name'} value={formData.description_en}
            onChange={(e: any) => setFormData({ ...formData, description_en: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={isRTL ? 'فئة الرسم بالعربية' : 'Arabic Duty Rate'} value={formData.duty_rate_ar}
              onChange={(e: any) => setFormData({ ...formData, duty_rate_ar: e.target.value })} placeholder="5%" />
            <Input label={isRTL ? 'فئة الرسم بالانجليزية' : 'English Duty Rate'} value={formData.duty_rate_en}
              onChange={(e: any) => setFormData({ ...formData, duty_rate_en: e.target.value })} placeholder="5%" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'الاجراءات' : 'Procedures'}</label>
            <textarea value={formData.procedures} onChange={(e) => setFormData({ ...formData, procedures: e.target.value })}
              rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            {isRTL ? 'فعال' : 'Active'}
          </label>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button loading={formLoading} onClick={handleSubmit}>
              {formMode === 'create' ? (isRTL ? 'إنشاء' : 'Create') : (isRTL ? 'حفظ' : 'Save')}
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ Import Modal ══════════════════════════════════════ */}
      <Modal isOpen={importOpen} onClose={() => { setImportOpen(false); setImportRows([]); }}
        title={isRTL ? 'استيراد بيانات النظام المنسق' : 'Import HS Codes'} size="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{isRTL ? 'وضع الاستيراد:' : 'Import Mode:'}</span>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="importMode" checked={importMode === 'upsert'} onChange={() => setImportMode('upsert')}
                className="text-blue-600 focus:ring-blue-500" />
              {isRTL ? 'إدراج أو تحديث (بدون تكرار)' : 'Insert or Update (no duplicates)'}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="importMode" checked={importMode === 'insert'} onChange={() => setImportMode('insert')}
                className="text-blue-600 focus:ring-blue-500" />
              {isRTL ? 'إدراج فقط (تخطي الموجود)' : 'Insert only (skip existing)'}
            </label>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-700/50">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? `${importRows.length} سجل جاهز للاستيراد` : `${importRows.length} rows ready to import`}
            </p>
            {importRows.length > 0 && (
              <div className="max-h-48 overflow-y-auto text-xs font-mono">
                <table className="w-full">
                  <thead><tr className="text-gray-500">
                    <th className="text-left px-1 py-0.5">{isRTL ? 'الرمز' : 'Code'}</th>
                    <th className="text-left px-1 py-0.5">{isRTL ? 'عربي' : 'Arabic'}</th>
                    <th className="text-left px-1 py-0.5">{isRTL ? 'انجليزي' : 'English'}</th>
                    <th className="text-left px-1 py-0.5">{isRTL ? 'الرسم' : 'Duty'}</th>
                  </tr></thead>
                  <tbody>
                    {importRows.slice(0, 10).map((r: any, i: number) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-gray-600">
                        <td className="px-1 py-0.5 text-blue-600">{r.code}</td>
                        <td className="px-1 py-0.5">{r.description_ar?.substring(0, 30)}</td>
                        <td className="px-1 py-0.5">{r.description_en?.substring(0, 30)}</td>
                        <td className="px-1 py-0.5">{r.duty_rate_en || r.duty_rate_ar}</td>
                      </tr>
                    ))}
                    {importRows.length > 10 && (
                      <tr><td colSpan={4} className="px-1 py-1 text-gray-400">... {importRows.length - 10} {isRTL ? 'سجل إضافي' : 'more rows'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button loading={importLoading} onClick={handleImport} disabled={importRows.length === 0}>
              <ArrowUpTrayIcon className="h-4 w-4" />
              {isRTL ? `استيراد ${importRows.length} سجل` : `Import ${importRows.length} rows`}
            </Button>
            <Button variant="secondary" onClick={() => { setImportOpen(false); setImportRows([]); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ Delete Confirm ════════════════════════════════════ */}
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title={isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
        message={deleteTarget ? `${isRTL ? 'حذف' : 'Delete'} ${deleteTarget.code}?` : ''}
        confirmText={isRTL ? 'حذف' : 'Delete'} cancelText={isRTL ? 'إلغاء' : 'Cancel'} variant="danger" loading={deleteLoading} />

      {/* ═══ Bulk Delete Confirm ═══════════════════════════════ */}
      <ConfirmDialog isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete}
        title={isRTL ? 'تأكيد حذف المحدد' : 'Confirm Bulk Delete'}
        message={isRTL
          ? `هل تريد حذف ${selectedIds.size} سجل؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Delete ${selectedIds.size} records? This cannot be undone.`}
        confirmText={isRTL ? `حذف ${selectedIds.size}` : `Delete ${selectedIds.size}`}
        cancelText={isRTL ? 'إلغاء' : 'Cancel'} variant="danger" loading={bulkDeleteLoading} />
    </MainLayout>
  );
}
