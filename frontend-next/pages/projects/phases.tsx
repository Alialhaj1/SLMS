import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  ListBulletIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type PhaseStatus = 'active' | 'inactive';
type PhaseStage = 'planning' | 'execution' | 'closure';

interface ProjectPhaseTemplate {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  sequence: number;
  defaultDurationDays: number;
  stage: PhaseStage;
  status: PhaseStatus;
}

const mockPhases: ProjectPhaseTemplate[] = [
  { id: 1, code: 'PLAN', name: 'Planning', nameAr: 'التخطيط', sequence: 10, defaultDurationDays: 14, stage: 'planning', status: 'active' },
  { id: 2, code: 'EXEC', name: 'Execution', nameAr: 'التنفيذ', sequence: 20, defaultDurationDays: 60, stage: 'execution', status: 'active' },
  { id: 3, code: 'CLOS', name: 'Closure', nameAr: 'الإقفال', sequence: 30, defaultDurationDays: 7, stage: 'closure', status: 'inactive' },
];

export default function ProjectPhasesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Projects.View, MenuPermissions.Projects.Phases.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Projects.Create, MenuPermissions.Projects.Phases.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Projects.Edit, MenuPermissions.Projects.Phases.Edit]);

  const [items] = useState<ProjectPhaseTemplate[]>(mockPhases);
  const [selectedStatus, setSelectedStatus] = useState<'all' | PhaseStatus>('all');
  const [selectedStage, setSelectedStage] = useState<'all' | PhaseStage>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProjectPhaseTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    sequence: '10',
    defaultDurationDays: '7',
    stage: 'planning' as PhaseStage,
    status: 'active' as PhaseStatus,
  });

  const stageLabel = (s: PhaseStage) => {
    const labels: Record<PhaseStage, { en: string; ar: string }> = {
      planning: { en: 'Planning', ar: 'التخطيط' },
      execution: { en: 'Execution', ar: 'التنفيذ' },
      closure: { en: 'Closure', ar: 'الإقفال' },
    };
    return locale === 'ar' ? labels[s].ar : labels[s].en;
  };

  const statusBadge = (s: PhaseStatus) => {
    const styles: Record<PhaseStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<PhaseStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[s])}>
        {locale === 'ar' ? labels[s].ar : labels[s].en}
      </span>
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      const sOk = selectedStatus === 'all' || p.status === selectedStatus;
      const stOk = selectedStage === 'all' || p.stage === selectedStage;
      const qOk = !q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.nameAr.toLowerCase().includes(q);
      return sOk && stOk && qOk;
    });
  }, [items, selectedStatus, selectedStage, search]);

  const totalCount = items.length;
  const activeCount = items.filter((i) => i.status === 'active').length;
  const avgDuration = items.length ? Math.round((items.reduce((s, i) => s + i.defaultDurationDays, 0) / items.length) * 10) / 10 : 0;

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ code: '', name: '', nameAr: '', sequence: '10', defaultDurationDays: '7', stage: 'planning', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'مراحل المشاريع - SLMS' : 'Project Phases - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <ListBulletIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض مراحل المشاريع.' : "You don't have permission to view project phases."}</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ListBulletIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'مراحل المشاريع' : 'Project Phases'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قوالب مراحل المشاريع الافتراضية' : 'Default templates for project phases'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'مرحلة جديدة' : 'New Phase'}
            </Button>
          )}
        </div>

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
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط المدة (يوم)' : 'Avg. Duration (days)'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgDuration.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-72">
                <Input
                  label={locale === 'ar' ? 'بحث' : 'Search'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={locale === 'ar' ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'المرحلة' : 'Stage'}</label>
                <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="planning">{locale === 'ar' ? 'التخطيط' : 'Planning'}</option>
                  <option value="execution">{locale === 'ar' ? 'التنفيذ' : 'Execution'}</option>
                  <option value="closure">{locale === 'ar' ? 'الإقفال' : 'Closure'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                  <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                  <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                </select>
              </div>
            </div>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الترتيب' : 'Sequence'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المدة (يوم)' : 'Duration (days)'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرحلة' : 'Stage'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? p.nameAr : p.name}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{p.sequence}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{p.defaultDurationDays}</td>
                    <td className="px-4 py-3 text-gray-500">{stageLabel(p.stage)}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(p)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل المرحلة' : 'Phase Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.nameAr : selected.name}</p>
              </div>
              {statusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المرحلة' : 'Stage'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{stageLabel(selected.stage)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المدة (يوم)' : 'Duration (days)'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.defaultDurationDays}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الترتيب' : 'Sequence'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.sequence}</p>
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
                <Button onClick={() => showToast(locale === 'ar' ? 'تم التفعيل (تجريبي)' : 'Activated (demo)', 'success')}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'تفعيل' : 'Activate'}
                </Button>
                <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم التعطيل (تجريبي)' : 'Deactivated (demo)', 'error')}>
                  <XCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'تعطيل' : 'Deactivate'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'مرحلة جديدة' : 'New Phase'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="PLAN" />
            <Input label={locale === 'ar' ? 'الترتيب' : 'Sequence'} value={formData.sequence} onChange={(e) => setFormData({ ...formData, sequence: e.target.value })} placeholder="10" />
            <Input label={locale === 'ar' ? 'المدة الافتراضية (يوم)' : 'Default Duration (days)'} value={formData.defaultDurationDays} onChange={(e) => setFormData({ ...formData, defaultDurationDays: e.target.value })} placeholder="7" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'المرحلة' : 'Stage'}</label>
              <select value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })} className="input">
                <option value="planning">{locale === 'ar' ? 'التخطيط' : 'Planning'}</option>
                <option value="execution">{locale === 'ar' ? 'التنفيذ' : 'Execution'}</option>
                <option value="closure">{locale === 'ar' ? 'الإقفال' : 'Closure'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إنشاء' : 'Create'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
