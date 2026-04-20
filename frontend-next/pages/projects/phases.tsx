/**
 * Project Phases — Templates & Management
 * =========================================
 * Two sections: Global templates + project-specific phase management.
 * Connected to /api/project-phases/* endpoints.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
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
  ListBulletIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  RocketLaunchIcon,
  FlagIcon,
  BeakerIcon,
  LockClosedIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// =============================================
// TYPES
// =============================================

type PhaseType = 'planning' | 'procurement' | 'execution' | 'testing' | 'closure' | 'custom';
type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

interface PhaseTemplate {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  phase_type: PhaseType;
  sort_order: number;
  duration_days: number;
  budget: number;
  is_active: boolean;
  created_at?: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  phase_type: PhaseType;
  sort_order: string;
  duration_days: string;
  budget: string;
  is_active: boolean;
}

const EMPTY_FORM: FormData = {
  code: '', name: '', name_ar: '', phase_type: 'planning',
  sort_order: '10', duration_days: '7', budget: '0', is_active: true,
};

// =============================================
// CONFIG
// =============================================

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

const PHASE_TYPE_CONFIG: Record<PhaseType, { en: string; ar: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  planning: { en: 'Planning', ar: 'تخطيط', icon: ClockIcon, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  procurement: { en: 'Procurement', ar: 'شراء', icon: ArrowDownTrayIcon, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  execution: { en: 'Execution', ar: 'تنفيذ', icon: RocketLaunchIcon, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  testing: { en: 'Testing', ar: 'اختبار', icon: BeakerIcon, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  closure: { en: 'Closure', ar: 'إقفال', icon: LockClosedIcon, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/20' },
  custom: { en: 'Custom', ar: 'مخصص', icon: WrenchScrewdriverIcon, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
};

// =============================================
// API HELPER
// =============================================

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function ProjectPhasesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Projects.View, MenuPermissions.Projects.Phases?.View || 'projects:view']);
  const canCreate = hasAnyPermission([MenuPermissions.Projects.Create, MenuPermissions.Projects.Phases?.Create || 'projects:create']);
  const canEdit = hasAnyPermission([MenuPermissions.Projects.Edit, MenuPermissions.Projects.Phases?.Edit || 'projects:edit']);

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | PhaseType>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PhaseTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth(`${API_BASE}/project-phases/templates`);
      setTemplates(data.data || []);
    } catch (err: any) {
      showToast(locale === 'ar' ? 'فشل تحميل القوالب' : 'Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, locale]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (filterType !== 'all' && t.phase_type !== filterType) return false;
      if (filterActive === 'active' && !t.is_active) return false;
      if (filterActive === 'inactive' && t.is_active) return false;
      if (q && !t.code.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) && !(t.name_ar || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, search, filterType, filterActive]);

  // Stats
  const totalCount = templates.length;
  const activeCount = templates.filter((t) => t.is_active).length;
  const avgDuration = templates.length ? Math.round(templates.reduce((s, t) => s + t.duration_days, 0) / templates.length) : 0;

  // Open create/edit modal
  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (t: PhaseTemplate) => {
    setEditingId(t.id);
    setFormData({
      code: t.code,
      name: t.name,
      name_ar: t.name_ar || '',
      phase_type: t.phase_type,
      sort_order: String(t.sort_order),
      duration_days: String(t.duration_days),
      budget: String(t.budget || 0),
      is_active: t.is_active,
    });
    setModalOpen(true);
  };

  // Save template
  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      showToast(locale === 'ar' ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        name_ar: formData.name_ar.trim() || undefined,
        phase_type: formData.phase_type,
        sort_order: parseInt(formData.sort_order) || 10,
        duration_days: parseInt(formData.duration_days) || 7,
        budget: parseFloat(formData.budget) || 0,
        is_active: formData.is_active,
      };

      if (editingId) {
        await fetchWithAuth(`${API_BASE}/project-phases/templates/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        showToast(locale === 'ar' ? 'تم التحديث بنجاح' : 'Template updated', 'success');
      } else {
        await fetchWithAuth(`${API_BASE}/project-phases/templates`, { method: 'POST', body: JSON.stringify(payload) });
        showToast(locale === 'ar' ? 'تم الإنشاء بنجاح' : 'Template created', 'success');
      }
      setModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      showToast(err.message || (locale === 'ar' ? 'فشل الحفظ' : 'Save failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const confirmDelete = (t: PhaseTemplate) => {
    setDeleteTarget(t);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await fetchWithAuth(`${API_BASE}/project-phases/templates/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(locale === 'ar' ? 'تم الحذف بنجاح' : 'Template deleted', 'success');
      fetchTemplates();
    } catch (err: any) {
      showToast(err.message || (locale === 'ar' ? 'فشل الحذف' : 'Delete failed'), 'error');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'مراحل المشاريع - SLMS' : 'Project Phases - SLMS'}</title></Head>
        <div className="text-center py-12">
          <ListBulletIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مراحل المشاريع - SLMS' : 'Project Phases - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ListBulletIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'مراحل المشاريع' : 'Project Phases'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قوالب المراحل الافتراضية — تُطبق على المشاريع الجديدة' : 'Default phase templates — applied to new projects'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={fetchTemplates}>
              <ArrowPathIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            {canCreate && (
              <Button onClick={openCreate}>
                <PlusIcon className="h-4 w-4" />
                {locale === 'ar' ? 'قالب جديد' : 'New Template'}
              </Button>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط المدة (يوم)' : 'Avg Duration (days)'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgDuration}</p>
          </div>
        </div>

        {/* Templates Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <div className="w-64">
              <Input
                label={locale === 'ar' ? 'بحث' : 'Search'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === 'ar' ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="input">
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                {Object.entries(PHASE_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{locale === 'ar' ? cfg.ar : cfg.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as any)} className="input">
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الترتيب' : 'Order'}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المدة (يوم)' : 'Duration'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        <ListBulletIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        {locale === 'ar' ? 'لا توجد قوالب' : 'No templates found'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => {
                      const typeCfg = PHASE_TYPE_CONFIG[t.phase_type] || PHASE_TYPE_CONFIG.custom;
                      const TypeIcon = typeCfg.icon;
                      return (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.code}</td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900 dark:text-white">{locale === 'ar' ? t.name_ar || t.name : t.name}</p>
                            {t.name_ar && locale !== 'ar' && <p className="text-xs text-gray-500">{t.name_ar}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full', typeCfg.color)}>
                              <TypeIcon className="h-3.5 w-3.5" />
                              {locale === 'ar' ? typeCfg.ar : typeCfg.en}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{t.sort_order}</td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{t.duration_days}</td>
                          <td className="px-4 py-3">
                            <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full',
                              t.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            )}>
                              {t.is_active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {canEdit && (
                                <button onClick={() => openEdit(t)} className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              )}
                              {canEdit && (
                                <button onClick={() => confirmDelete(t)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                  <TrashIcon className="h-4 w-4" />
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
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? (locale === 'ar' ? 'تعديل القالب' : 'Edit Template') : (locale === 'ar' ? 'قالب جديد' : 'New Template')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود *' : 'Code *'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="PLAN" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={formData.phase_type} onChange={(e) => setFormData({ ...formData, phase_type: e.target.value as PhaseType })} className="input">
                {Object.entries(PHASE_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{locale === 'ar' ? cfg.ar : cfg.en}</option>
                ))}
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN) *' : 'Name (EN) *'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} />
            <Input label={locale === 'ar' ? 'الترتيب' : 'Sort Order'} value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })} type="number" />
            <Input label={locale === 'ar' ? 'المدة (يوم)' : 'Duration (days)'} value={formData.duration_days} onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })} type="number" />
            <Input label={locale === 'ar' ? 'الميزانية الافتراضية' : 'Default Budget'} value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} type="number" />
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'نشط' : 'Active'}</label>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (editingId ? (locale === 'ar' ? 'تحديث' : 'Update') : (locale === 'ar' ? 'إنشاء' : 'Create'))}
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف القالب' : 'Delete Template'}
        message={
          deleteTarget
            ? (locale === 'ar' ? `هل تريد حذف القالب "${deleteTarget.name}"؟` : `Delete template "${deleteTarget.name}"?`)
            : ''
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}
