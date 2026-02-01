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
  DocumentCheckIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type DocStatusState = 'active' | 'inactive';
type DocStatusStage = 'draft' | 'review' | 'approved' | 'rejected' | 'archived';

interface DocumentStatus {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  stage: DocStatusStage;
  isFinal: boolean;
  state: DocStatusState;
}

const mockStatuses: DocumentStatus[] = [
  { id: 1, code: 'DRAFT', name: 'Draft', nameAr: 'مسودة', stage: 'draft', isFinal: false, state: 'active' },
  { id: 2, code: 'IN_REVIEW', name: 'In Review', nameAr: 'قيد المراجعة', stage: 'review', isFinal: false, state: 'active' },
  { id: 3, code: 'APPROVED', name: 'Approved', nameAr: 'معتمد', stage: 'approved', isFinal: true, state: 'active' },
  { id: 4, code: 'REJECTED', name: 'Rejected', nameAr: 'مرفوض', stage: 'rejected', isFinal: true, state: 'active' },
  { id: 5, code: 'ARCHIVED', name: 'Archived', nameAr: 'مؤرشف', stage: 'archived', isFinal: true, state: 'inactive' },
];

export default function DocumentStatusPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.DocumentStatus.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.DocumentStatus.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.DocumentStatus.Edit]);

  const [items] = useState<DocumentStatus[]>(mockStatuses);
  const [selectedState, setSelectedState] = useState<'all' | DocStatusState>('all');
  const [selectedStage, setSelectedStage] = useState<'all' | DocStatusStage>('all');
  const [selected, setSelected] = useState<DocumentStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    stage: 'draft' as DocStatusStage,
    isFinal: false,
    state: 'active' as DocStatusState,
  });

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const sOk = selectedState === 'all' || i.state === selectedState;
      const stOk = selectedStage === 'all' || i.stage === selectedStage;
      return sOk && stOk;
    });
  }, [items, selectedState, selectedStage]);

  const activeCount = items.filter(i => i.state === 'active').length;
  const finalCount = items.filter(i => i.isFinal).length;
  const stageCount = new Set(items.map(i => i.stage)).size;

  const getStateBadge = (state: DocStatusState) => {
    const styles: Record<DocStatusState, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<DocStatusState, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[state])}>
        {locale === 'ar' ? labels[state].ar : labels[state].en}
      </span>
    );
  };

  const stageLabel = (stage: DocStatusStage) => {
    const labels: Record<DocStatusStage, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      review: { en: 'Review', ar: 'مراجعة' },
      approved: { en: 'Approved', ar: 'معتمد' },
      rejected: { en: 'Rejected', ar: 'مرفوض' },
      archived: { en: 'Archived', ar: 'مؤرشف' },
    };
    return locale === 'ar' ? labels[stage].ar : labels[stage].en;
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ code: '', name: '', nameAr: '', stage: 'draft', isFinal: false, state: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'حالات المستندات - SLMS' : 'Document Status - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <DocumentCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض حالات المستندات.' : "You don't have permission to view document statuses."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'حالات المستندات - SLMS' : 'Document Status - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DocumentCheckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'حالات المستندات' : 'Document Status'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تعريف حالات سير العمل للمستندات' : 'Define document workflow statuses'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'حالة جديدة' : 'New Status'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'حالات نهائية' : 'Final statuses'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{finalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مراحل' : 'Stages'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stageCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل المراحل' : 'All stages'}</option>
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="review">{locale === 'ar' ? 'مراجعة' : 'Review'}</option>
                <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
                <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                <option value="archived">{locale === 'ar' ? 'مؤرشف' : 'Archived'}</option>
              </select>
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All state'}</option>
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرحلة' : 'Stage'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'نهائي' : 'Final'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'State'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? i.nameAr : i.name}</td>
                    <td className="px-4 py-3 text-gray-500">{stageLabel(i.stage)}</td>
                    <td className="px-4 py-3 text-gray-500">{i.isFinal ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No')}</td>
                    <td className="px-4 py-3">{getStateBadge(i.state)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(i)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الحالة' : 'Status Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.nameAr : selected.name}</p>
              </div>
              {getStateBadge(selected.state)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المرحلة' : 'Stage'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{stageLabel(selected.stage)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'نهائي' : 'Final'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.isFinal ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              {canEdit && (
                <>
                  <Button onClick={() => showToast(locale === 'ar' ? 'تم التفعيل (تجريبي)' : 'Activated (demo)', 'success')}>
                    <CheckCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'تفعيل' : 'Activate'}
                  </Button>
                  <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم التعطيل (تجريبي)' : 'Deactivated (demo)', 'error')}>
                    <XCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'تعطيل' : 'Deactivate'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'حالة مستند جديدة' : 'New Document Status'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="APPROVED" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'المرحلة' : 'Stage'}</label>
              <select value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })} className="input">
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="review">{locale === 'ar' ? 'مراجعة' : 'Review'}</option>
                <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
                <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                <option value="archived">{locale === 'ar' ? 'مؤرشف' : 'Archived'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <div className="sm:col-span-2 flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.isFinal} onChange={(e) => setFormData({ ...formData, isFinal: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                {locale === 'ar' ? 'حالة نهائية' : 'Final status'}
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'State'}</label>
                <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value as any })} className="input">
                  <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                  <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                </select>
              </div>
            </div>
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
