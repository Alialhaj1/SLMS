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
import { DocumentTextIcon, PlusIcon, EyeIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ContractStatus {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
  colorCode: string;
  isActive: boolean;
}

const mockStatuses: ContractStatus[] = [
  { id: 1, code: 'DRAFT', nameEn: 'Draft', nameAr: 'مسودة', colorCode: 'gray', isActive: true },
  { id: 2, code: 'ACTIVE', nameEn: 'Active', nameAr: 'نشط', colorCode: 'green', isActive: true },
  { id: 3, code: 'EXPIRED', nameEn: 'Expired', nameAr: 'منتهي', colorCode: 'red', isActive: true },
  { id: 4, code: 'TERMINATED', nameEn: 'Terminated', nameAr: 'ملغى', colorCode: 'red', isActive: true },
];

export default function ContractStatusPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.MasterData.ContractStatus.View]);
  const canCreate = hasAnyPermission([MenuPermissions.MasterData.ContractStatus.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.MasterData.ContractStatus.Edit]);

  const [items] = useState<ContractStatus[]>(mockStatuses);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ContractStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', nameEn: '', nameAr: '', colorCode: 'gray' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((s) => !q || s.code.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q) || s.nameAr.toLowerCase().includes(q));
  }, [items, search]);

  const statusPill = (s: ContractStatus) => {
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', colors[s.colorCode] || colors.gray)}>{locale === 'ar' ? s.nameAr : s.nameEn}</span>;
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'حالات العقود - SLMS' : 'Contract Status - SLMS'}</title></Head>
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض حالات العقود.' : "You don't have permission to view contract statuses."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'حالات العقود - SLMS' : 'Contract Status - SLMS'}</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'حالات العقود' : 'Contract Status'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'حالات دورة حياة العقد' : 'Contract lifecycle statuses'}</p>
            </div>
          </div>
          {canCreate && <Button onClick={() => setCreateOpen(true)}><PlusIcon className="h-4 w-4" />{locale === 'ar' ? 'إضافة حالة' : 'Add Status'}</Button>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث...' : 'Search...'} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'معاينة' : 'Preview'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.code}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? s.nameAr : s.nameEn}</td>
                  <td className="px-4 py-3">{statusPill(s)}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(s)}><EyeIcon className="h-4 w-4" /></Button>
                    {canEdit && <Button size="sm" onClick={() => showToast(locale === 'ar' ? 'تحديث (تجريبي)' : 'Edit (demo)', 'info')}><PencilSquareIcon className="h-4 w-4" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={!!selected && !createOpen} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="md">
        {selected && <div className="space-y-3"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">{locale === 'ar' ? selected.nameAr : selected.nameEn}</h3><div>{statusPill(selected)}</div></div>}
      </Modal>
      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'حالة جديدة' : 'New Status'} size="md">
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} />
          <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={() => { showToast(locale === 'ar' ? 'تمت الإضافة (تجريبي)' : 'Added (demo)', 'success'); setCreateOpen(false); }}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
