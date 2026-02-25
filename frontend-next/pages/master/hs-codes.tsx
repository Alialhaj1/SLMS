import { useEffect, useState, useCallback, useMemo } from 'react';
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
  QrCodeIcon, PlusIcon, PencilIcon, TrashIcon,
  ChevronRightIcon, ChevronDownIcon, MagnifyingGlassIcon,
  FolderIcon, FolderOpenIcon, DocumentTextIcon,
  ExclamationTriangleIcon, ShieldExclamationIcon,
  TagIcon, TableCellsIcon, ArrowPathIcon,
  CheckCircleIcon, XCircleIcon, EyeIcon,
} from '@heroicons/react/24/outline';

// ─── Types ──────────────────────────────────────────────────────────
interface HSCode {
  id: number;
  code: string;
  description_en: string;
  description_ar: string;
  level: string;
  parent_id: number | null;
  parent_code: string | null;
  version_year: number;
  duty_rate_pct: number | null;
  vat_applicable: boolean;
  excise_applicable: boolean;
  is_leaf: boolean;
  is_prohibited: boolean;
  requires_license: boolean;
  is_active: boolean;
  is_restricted: boolean;
  section: string | null;
  chapter: string | null;
  unit_of_measure: string | null;
  notes: string | null;
  duty_rate_min: number | null;
  duty_rate_max: number | null;
  child_count: number;
  created_at: string;
  updated_at: string;
  ancestors?: { id: number; code: string; description_en: string; description_ar: string; level: string }[];
  children?: HSCode[];
  parent_description_en?: string;
  parent_description_ar?: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  chapters: number;
  headings: number;
  detailed: number;
  leaf_codes: number;
  prohibited: number;
  requires_permit: number;
  excise_items: number;
  vat_items: number;
  avg_duty_rate: number | null;
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

const LEVEL_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  chapter:    { en: 'Chapter',    ar: 'فصل',       color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  heading:    { en: 'Heading',    ar: 'بند',       color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  subheading: { en: 'Subheading', ar: 'بند فرعي',  color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  tariff:     { en: 'Tariff',     ar: 'تعريفة',    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  national:   { en: 'National',   ar: 'وطنية',     color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
};

function LevelBadge({ level, locale }: { level: string; locale: string }) {
  const l = LEVEL_LABELS[level] || { en: level, ar: level, color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${l.color}`}>
      {locale === 'ar' ? l.ar : l.en}
    </span>
  );
}

// ─── Tree Row Component ─────────────────────────────────────────────
function TreeRow({
  node, depth, locale, expandedIds, onToggle, onSelect, onEdit, onDelete, canEdit, canDelete,
}: {
  node: HSCode; depth: number; locale: string;
  expandedIds: Set<number>; onToggle: (id: number) => void;
  onSelect: (n: HSCode) => void;
  onEdit: (n: HSCode) => void; onDelete: (n: HSCode) => void;
  canEdit: boolean; canDelete: boolean;
}) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.child_count > 0;
  const indent = depth * 24;

  return (
    <tr
      className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
        node.is_prohibited ? 'bg-red-50/50 dark:bg-red-900/10' : ''
      }`}
    >
      {/* Code + expand/collapse */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="flex items-center" style={{ paddingInlineStart: `${indent}px` }}>
          {hasChildren ? (
            <button
              onClick={() => onToggle(node.id)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 mr-1 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-5 mr-1 flex-shrink-0" />
          )}
          {hasChildren ? (
            isExpanded ? (
              <FolderOpenIcon className="h-4 w-4 text-amber-500 mr-1.5 flex-shrink-0" />
            ) : (
              <FolderIcon className="h-4 w-4 text-amber-400 mr-1.5 flex-shrink-0" />
            )
          ) : (
            <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-1.5 flex-shrink-0" />
          )}
          <button
            onClick={() => onSelect(node)}
            className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {node.code}
          </button>
        </div>
      </td>

      {/* Description */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-md">
            {locale === 'ar' ? node.description_ar : node.description_en}
          </span>
          {node.is_prohibited && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs font-medium">
              <ShieldExclamationIcon className="h-3 w-3" />
              {locale === 'ar' ? 'محظور' : 'Prohibited'}
            </span>
          )}
          {node.requires_license && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-medium">
              <ExclamationTriangleIcon className="h-3 w-3" />
              {locale === 'ar' ? 'تصريح' : 'Permit'}
            </span>
          )}
        </div>
      </td>

      {/* Level */}
      <td className="px-3 py-2.5">
        <LevelBadge level={node.level} locale={locale} />
      </td>

      {/* Duty */}
      <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 font-mono">
        {node.duty_rate_pct != null ? `${node.duty_rate_pct}%` : '—'}
      </td>

      {/* VAT / Excise badges */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          {node.vat_applicable && (
            <span className="inline-flex px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs font-medium">
              VAT
            </span>
          )}
          {node.excise_applicable && (
            <span className="inline-flex px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-xs font-medium">
              {locale === 'ar' ? 'انتقائية' : 'Excise'}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-2.5">
        {node.is_active ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : (
          <XCircleIcon className="h-5 w-5 text-red-400" />
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onSelect(node)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="View">
            <EyeIcon className="h-4 w-4 text-gray-500" />
          </button>
          {canEdit && (
            <button onClick={() => onEdit(node)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="Edit">
              <PencilIcon className="h-4 w-4 text-blue-500" />
            </button>
          )}
          {canDelete && node.child_count === 0 && (
            <button onClick={() => onDelete(node)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="Delete">
              <TrashIcon className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

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

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function HSCodesEnterprisePage() {
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
  const [treeData, setTreeData] = useState<Record<string, HSCode[]>>({});
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<HSCode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');

  // Flat list state
  const [flatData, setFlatData] = useState<HSCode[]>([]);
  const [flatTotal, setFlatTotal] = useState(0);
  const [flatPage, setFlatPage] = useState(1);
  const [flatLevel, setFlatLevel] = useState('');

  // Modals
  const [selected, setSelected] = useState<HSCode | null>(null);
  const [detailData, setDetailData] = useState<HSCode | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HSCode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '', description_en: '', description_ar: '', level: '',
    parent_id: null as number | null, version_year: 2022,
    duty_rate_pct: '' as string | number, vat_applicable: true,
    excise_applicable: false, is_leaf: true, is_prohibited: false,
    requires_license: false, is_active: true, unit_of_measure: '',
    notes: '',
  });

  // ─── API calls ──────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch('/api/master/hs-codes/stats');
      setStats(res.data);
    } catch (err: any) {
      console.error('Stats error:', err);
    }
  }, []);

  const loadTreeRoots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/master/hs-codes/tree?parent_id=null');
      setTreeData({ root: res.data });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadChildren = useCallback(async (parentId: number) => {
    setLoadingIds((prev) => new Set(prev).add(parentId));
    try {
      const res = await apiFetch(`/api/master/hs-codes/tree?parent_id=${parentId}`);
      setTreeData((prev) => ({ ...prev, [String(parentId)]: res.data }));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
  }, [showToast]);

  const handleToggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!treeData[String(id)]) {
          loadChildren(id);
        }
      }
      return next;
    });
  }, [treeData, loadChildren]);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/master/hs-codes/tree?search=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadFlatList = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (flatLevel) params.set('level', flatLevel);
      const res = await apiFetch(`/api/master/hs-codes?${params}`);
      setFlatData(res.data);
      setFlatTotal(res.total);
      setFlatPage(page);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, flatLevel, showToast]);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/master/hs-codes/${id}`);
      setDetailData(res.data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [showToast]);

  // ─── Effects ────────────────────────────────────────────────────
  useEffect(() => {
    if (!canView) return;
    loadStats();
    if (viewMode === 'tree') loadTreeRoots();
    else loadFlatList(1);
  }, [canView, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewMode === 'tree') {
      const timeout = setTimeout(() => doSearch(search), 300);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => loadFlatList(1), 300);
      return () => clearTimeout(timeout);
    }
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewMode === 'table') loadFlatList(1);
  }, [flatLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Form handlers ─────────────────────────────────────────────
  const openCreate = (parentNode?: HSCode) => {
    setFormMode('create');
    setFormData({
      code: '', description_en: '', description_ar: '', level: '',
      parent_id: parentNode?.id || null, version_year: 2022,
      duty_rate_pct: '', vat_applicable: true, excise_applicable: false,
      is_leaf: true, is_prohibited: false, requires_license: false,
      is_active: true, unit_of_measure: '', notes: '',
    });
    setFormOpen(true);
  };

  const openEdit = (node: HSCode) => {
    setFormMode('edit');
    setSelected(node);
    setFormData({
      code: node.code, description_en: node.description_en, description_ar: node.description_ar,
      level: node.level, parent_id: node.parent_id, version_year: node.version_year || 2022,
      duty_rate_pct: node.duty_rate_pct ?? '', vat_applicable: node.vat_applicable,
      excise_applicable: node.excise_applicable, is_leaf: node.is_leaf,
      is_prohibited: node.is_prohibited, requires_license: node.requires_license,
      is_active: node.is_active, unit_of_measure: node.unit_of_measure || '',
      notes: node.notes || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.description_en.trim() || !formData.description_ar.trim()) {
      showToast(isRTL ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        duty_rate_pct: formData.duty_rate_pct !== '' ? Number(formData.duty_rate_pct) : null,
        unit_of_measure: formData.unit_of_measure || null,
        notes: formData.notes || null,
      };
      if (formMode === 'create') {
        await apiFetch('/api/master/hs-codes', { method: 'POST', body: JSON.stringify(payload) });
        showToast(isRTL ? 'تم الإنشاء بنجاح' : 'Created successfully', 'success');
      } else {
        await apiFetch(`/api/master/hs-codes/${selected!.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast(isRTL ? 'تم التحديث بنجاح' : 'Updated successfully', 'success');
      }
      setFormOpen(false);
      loadStats();
      if (viewMode === 'tree') {
        loadTreeRoots();
        setExpandedIds(new Set());
      } else {
        loadFlatList(flatPage);
      }
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
      showToast(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
      setDeleteTarget(null);
      loadStats();
      if (viewMode === 'tree') {
        loadTreeRoots();
        setExpandedIds(new Set());
      } else {
        loadFlatList(flatPage);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewDetail = (node: HSCode) => {
    setSelected(node);
    setDetailData(null);
    loadDetail(node.id);
  };

  // ─── Render tree rows recursively ──────────────────────────────
  const renderTreeRows = (nodes: HSCode[], depth: number): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    for (const node of nodes) {
      rows.push(
        <TreeRow
          key={node.id}
          node={node}
          depth={depth}
          locale={locale}
          expandedIds={expandedIds}
          onToggle={handleToggle}
          onSelect={handleViewDetail}
          onEdit={openEdit}
          onDelete={(n) => setDeleteTarget(n)}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      );
      if (expandedIds.has(node.id)) {
        const children = treeData[String(node.id)];
        if (children) {
          rows.push(...renderTreeRows(children, depth + 1));
        } else if (loadingIds.has(node.id)) {
          rows.push(
            <tr key={`loading-${node.id}`}>
              <td colSpan={7} style={{ paddingInlineStart: `${(depth + 1) * 24 + 36}px` }} className="px-3 py-2">
                <span className="text-xs text-gray-400 animate-pulse">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</span>
              </td>
            </tr>
          );
        }
      }
    }
    return rows;
  };

  // ─── Access denied ─────────────────────────────────────────────
  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{isRTL ? 'رموز التعريفة الجمركية' : 'HS Codes'} - SLMS</title></Head>
        <div className="text-center py-16">
          <QrCodeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{isRTL ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  const totalPages = Math.ceil(flatTotal / 25);

  return (
    <MainLayout>
      <Head><title>{t('hsCodes.title')} - SLMS</title></Head>

      <div className="space-y-6 animate-fade-in">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
              <QrCodeIcon className="h-7 w-7 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('hsCodes.title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('hsCodes.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === 'tree' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('tree')}
            >
              <FolderOpenIcon className="h-4 w-4" />
              {isRTL ? 'شجري' : 'Tree'}
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('table')}
            >
              <TableCellsIcon className="h-4 w-4" />
              {isRTL ? 'جدول' : 'Table'}
            </Button>
            {canCreate && (
              <Button onClick={() => openCreate()}>
                <PlusIcon className="h-4 w-4" />
                {t('hsCodes.addNew')}
              </Button>
            )}
          </div>
        </div>

        {/* ─── Stats Cards ────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label={t('hsCodes.stats.total')}
              value={stats.total}
              icon={QrCodeIcon}
              color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
            />
            <StatCard
              label={t('hsCodes.stats.chapters')}
              value={stats.chapters}
              icon={FolderIcon}
              color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
            />
            <StatCard
              label={t('hsCodes.stats.leafCodes')}
              value={stats.leaf_codes}
              icon={DocumentTextIcon}
              color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300"
            />
            <StatCard
              label={t('hsCodes.stats.prohibited')}
              value={stats.prohibited}
              icon={ShieldExclamationIcon}
              color="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
            />
            <StatCard
              label={t('hsCodes.stats.requiresPermit')}
              value={stats.requires_permit}
              icon={ExclamationTriangleIcon}
              color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
            />
            <StatCard
              label={t('hsCodes.stats.avgDuty')}
              value={stats.avg_duty_rate != null ? `${stats.avg_duty_rate}%` : '—'}
              icon={TagIcon}
              color="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300"
            />
          </div>
        )}

        {/* ─── Search + Filters ───────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('hsCodes.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {viewMode === 'table' && (
              <select
                value={flatLevel}
                onChange={(e) => setFlatLevel(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">{isRTL ? 'جميع المستويات' : 'All Levels'}</option>
                {Object.entries(LEVEL_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{isRTL ? val.ar : val.en}</option>
                ))}
              </select>
            )}
            <Button size="sm" variant="secondary" onClick={() => {
              setSearch('');
              setSearchResults(null);
              if (viewMode === 'tree') loadTreeRoots();
              else loadFlatList(1);
            }}>
              <ArrowPathIcon className="h-4 w-4" />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* ─── Tree View ──────────────────────────────────────── */}
        {viewMode === 'tree' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-56">
                      {t('hsCodes.fields.code')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {t('hsCodes.fields.description')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-28">
                      {t('hsCodes.fields.level')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-20">
                      {t('hsCodes.fields.dutyRate')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-24">
                      {t('hsCodes.fields.taxes')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-16">
                      {t('hsCodes.fields.status')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-24">
                      {t('hsCodes.fields.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="animate-pulse text-gray-400">{isRTL ? 'جارٍ تحميل الشجرة...' : 'Loading tree...'}</div>
                      </td>
                    </tr>
                  ) : searchResults ? (
                    searchResults.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                          {isRTL ? 'لا توجد نتائج' : 'No results found'}
                        </td>
                      </tr>
                    ) : (
                      searchResults.map((node) => (
                        <TreeRow
                          key={node.id}
                          node={node}
                          depth={0}
                          locale={locale}
                          expandedIds={expandedIds}
                          onToggle={handleToggle}
                          onSelect={handleViewDetail}
                          onEdit={openEdit}
                          onDelete={(n) => setDeleteTarget(n)}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      ))
                    )
                  ) : treeData['root'] ? (
                    renderTreeRows(treeData['root'], 0)
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Table View ─────────────────────────────────────── */}
        {viewMode === 'table' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {t('hsCodes.fields.code')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {t('hsCodes.fields.description')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {t('hsCodes.fields.level')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {t('hsCodes.fields.dutyRate')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {t('hsCodes.fields.taxes')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {t('hsCodes.fields.status')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-24">
                      {t('hsCodes.fields.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 animate-pulse">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</td></tr>
                  ) : flatData.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">{isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>
                  ) : (
                    flatData.map((node) => (
                      <TreeRow
                        key={node.id}
                        node={node}
                        depth={0}
                        locale={locale}
                        expandedIds={new Set()}
                        onToggle={() => {}}
                        onSelect={handleViewDetail}
                        onEdit={openEdit}
                        onDelete={(n) => setDeleteTarget(n)}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? `الصفحة ${flatPage} من ${totalPages} • الإجمالي ${flatTotal}` : `Page ${flatPage} of ${totalPages} • Total ${flatTotal}`}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={flatPage <= 1} onClick={() => loadFlatList(flatPage - 1)}>
                  {isRTL ? 'السابق' : 'Prev'}
                </Button>
                <Button size="sm" variant="secondary" disabled={flatPage >= totalPages} onClick={() => loadFlatList(flatPage + 1)}>
                  {isRTL ? 'التالي' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Detail Modal ═══════════════════════════════════════ */}
      <Modal
        isOpen={!!selected && !formOpen}
        onClose={() => { setSelected(null); setDetailData(null); }}
        title={isRTL ? 'تفاصيل رمز التعريفة' : 'HS Code Details'}
        size="lg"
      >
        {detailLoading ? (
          <div className="py-8 text-center text-gray-400 animate-pulse">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</div>
        ) : detailData ? (
          <div className="space-y-5">
            {/* Breadcrumb */}
            {detailData.ancestors && detailData.ancestors.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                {detailData.ancestors.map((a, i) => (
                  <span key={a.id}>
                    <span className="text-blue-500 font-mono">{a.code}</span>
                    <span className="mx-1 text-gray-300">{isRTL ? '←' : '→'}</span>
                  </span>
                ))}
                <span className="font-semibold text-gray-700 dark:text-gray-200 font-mono">{detailData.code}</span>
              </div>
            )}

            {/* Code + Level + Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl font-mono font-bold text-gray-900 dark:text-white">{detailData.code}</span>
              <LevelBadge level={detailData.level} locale={locale} />
              {detailData.is_prohibited && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-sm font-medium">
                  <ShieldExclamationIcon className="h-4 w-4" />
                  {isRTL ? 'محظور' : 'PROHIBITED'}
                </span>
              )}
              {detailData.requires_license && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-sm font-medium">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  {isRTL ? 'يتطلب تصريح استيراد' : 'Import Permit Required'}
                </span>
              )}
              {!detailData.is_active && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-sm">
                  {isRTL ? 'غير فعال' : 'Inactive'}
                </span>
              )}
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">{isRTL ? 'الوصف (EN)' : 'Description (EN)'}</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{detailData.description_en}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{isRTL ? 'الوصف (AR)' : 'Description (AR)'}</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-arabic" dir="rtl">{detailData.description_ar}</p>
              </div>
            </div>

            {/* Financial info */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">{t('hsCodes.fields.dutyRate')}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{detailData.duty_rate_pct != null ? `${detailData.duty_rate_pct}%` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">VAT</p>
                <p className="text-lg font-bold">{detailData.vat_applicable ? <CheckCircleIcon className="h-6 w-6 text-green-500" /> : <XCircleIcon className="h-6 w-6 text-gray-400" />}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'انتقائية' : 'Excise'}</p>
                <p className="text-lg font-bold">{detailData.excise_applicable ? <CheckCircleIcon className="h-6 w-6 text-orange-500" /> : <XCircleIcon className="h-6 w-6 text-gray-400" />}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'نسخة HS' : 'HS Version'}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{detailData.version_year}</p>
              </div>
            </div>

            {/* Notes */}
            {detailData.notes && (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                <p className="text-xs text-gray-500 mb-1">{t('hsCodes.fields.notes')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{detailData.notes}</p>
              </div>
            )}

            {/* Children table */}
            {detailData.children && detailData.children.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {isRTL ? `الأكواد الفرعية (${detailData.children.length})` : `Sub-codes (${detailData.children.length})`}
                </h4>
                <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {detailData.children.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-1.5 font-mono text-blue-600 dark:text-blue-400">{c.code}</td>
                          <td className="px-3 py-1.5">{isRTL ? c.description_ar : c.description_en}</td>
                          <td className="px-3 py-1.5"><LevelBadge level={c.level} locale={locale} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* ═══ Create/Edit Modal ═════════════════════════════════ */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === 'create' ? t('hsCodes.addNew') : (isRTL ? 'تعديل رمز التعريفة' : 'Edit HS Code')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`${t('hsCodes.fields.code')} *`}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="0713310000"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('hsCodes.fields.level')}
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">{isRTL ? 'تلقائي (حسب طول الرمز)' : 'Auto (based on code length)'}</option>
                {Object.entries(LEVEL_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{isRTL ? val.ar : val.en}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label={`${t('hsCodes.fields.descriptionEn')} *`}
            value={formData.description_en}
            onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
          />
          <Input
            label={`${t('hsCodes.fields.descriptionAr')} *`}
            value={formData.description_ar}
            onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label={t('hsCodes.fields.dutyRate')}
              type="number"
              value={String(formData.duty_rate_pct)}
              onChange={(e) => setFormData({ ...formData, duty_rate_pct: e.target.value })}
              placeholder="5.000"
            />
            <Input
              label={t('hsCodes.fields.versionYear')}
              type="number"
              value={String(formData.version_year)}
              onChange={(e) => setFormData({ ...formData, version_year: parseInt(e.target.value) || 2022 })}
            />
            <Input
              label={t('hsCodes.fields.unitOfMeasure')}
              value={formData.unit_of_measure}
              onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
              placeholder="KG"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'vat_applicable' as const, label: 'VAT', labelAr: 'ضريبة القيمة المضافة' },
              { key: 'excise_applicable' as const, label: 'Excise Tax', labelAr: 'ضريبة انتقائية' },
              { key: 'is_prohibited' as const, label: 'Prohibited', labelAr: 'محظور' },
              { key: 'requires_license' as const, label: 'Requires Permit', labelAr: 'يتطلب تصريح' },
              { key: 'is_leaf' as const, label: 'Leaf Code', labelAr: 'كود نهائي' },
              { key: 'is_active' as const, label: 'Active', labelAr: 'فعال' },
            ].map(({ key, label, labelAr }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData[key] as boolean}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {isRTL ? labelAr : label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('hsCodes.fields.notes')}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Warning for prohibited */}
          {formData.is_prohibited && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <ShieldExclamationIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700 dark:text-red-300">
                {isRTL ? 'تحذير: هذا البند مصنف كبضاعة محظورة' : 'Warning: This item is classified as prohibited goods'}
              </span>
            </div>
          )}

          {formData.requires_license && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                {isRTL ? 'تنبيه: يتطلب هذا البند تصريح استيراد مسبق' : 'Notice: This item requires a prior import permit'}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button loading={formLoading} onClick={handleSubmit}>
              {formMode === 'create' ? (isRTL ? 'إنشاء' : 'Create') : (isRTL ? 'حفظ' : 'Save')}
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ Delete Confirm ════════════════════════════════════ */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
        message={
          deleteTarget
            ? `${isRTL ? 'هل تريد حذف رمز التعريفة' : 'Delete HS code'} ${deleteTarget.code}? ${isRTL ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'This cannot be undone.'}`
            : ''
        }
        confirmText={isRTL ? 'حذف' : 'Delete'}
        cancelText={isRTL ? 'إلغاء' : 'Cancel'}
        variant="danger"
        loading={deleteLoading}
      />
    </MainLayout>
  );
}
