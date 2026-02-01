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
  TagIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type CostItemStatus = 'active' | 'inactive';
type CostItemCategory = 'freight' | 'customs' | 'handling' | 'insurance' | 'other';

interface CostItem {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  category: CostItemCategory;
  glAccount: string;
  status: CostItemStatus;
}

const mockCostItems: CostItem[] = [
  { id: 1, code: 'FRT', name: 'Freight Charges', nameAr: 'تكاليف الشحن', category: 'freight', glAccount: '5100', status: 'active' },
  { id: 2, code: 'CUS', name: 'Customs Duties', nameAr: 'رسوم جمركية', category: 'customs', glAccount: '5200', status: 'active' },
  { id: 3, code: 'HDL', name: 'Handling', nameAr: 'مناولة', category: 'handling', glAccount: '5300', status: 'active' },
  { id: 4, code: 'INS', name: 'Insurance', nameAr: 'تأمين', category: 'insurance', glAccount: '5400', status: 'inactive' },
];

export default function CostItemsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.CostItems.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.CostItems.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.CostItems.Edit]);

  const [items] = useState<CostItem[]>(mockCostItems);
  const [selectedStatus, setSelectedStatus] = useState<'all' | CostItemStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | CostItemCategory>('all');
  const [selected, setSelected] = useState<CostItem | null>(null);
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
    category: 'freight' as CostItemCategory,
    glAccount: '',
    status: 'active' as CostItemStatus,
  });

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const sOk = selectedStatus === 'all' || i.status === selectedStatus;
      const cOk = selectedCategory === 'all' || i.category === selectedCategory;
      return sOk && cOk;
    });
  }, [items, selectedStatus, selectedCategory]);

  const activeCount = items.filter(i => i.status === 'active').length;
  const categoryCount = new Set(items.map(i => i.category)).size;
  const mappedCount = items.filter(i => i.glAccount?.trim()).length;

  const getStatusBadge = (status: CostItemStatus) => {
    const styles: Record<CostItemStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<CostItemStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const categoryLabel = (category: CostItemCategory) => {
    const labels: Record<CostItemCategory, { en: string; ar: string }> = {
      freight: { en: 'Freight', ar: 'شحن' },
      customs: { en: 'Customs', ar: 'جمارك' },
      handling: { en: 'Handling', ar: 'مناولة' },
      insurance: { en: 'Insurance', ar: 'تأمين' },
      other: { en: 'Other', ar: 'أخرى' },
    };
    return locale === 'ar' ? labels[category].ar : labels[category].en;
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ code: '', name: '', nameAr: '', category: 'freight', glAccount: '', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'بنود التكلفة - SLMS' : 'Cost Items - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <TagIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض بنود التكلفة.' : "You don't have permission to view cost items."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'بنود التكلفة - SLMS' : 'Cost Items - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <TagIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'بنود التكلفة' : 'Cost Items'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تعريف بنود التكلفة وربطها بحسابات الأستاذ العام' : 'Define cost items and map them to GL accounts'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'بند جديد' : 'New Item'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تصنيفات' : 'Categories'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{categoryCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مرتبطة بحساب' : 'Mapped to GL'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mappedCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل التصنيفات' : 'All categories'}</option>
                <option value="freight">{locale === 'ar' ? 'شحن' : 'Freight'}</option>
                <option value="customs">{locale === 'ar' ? 'جمارك' : 'Customs'}</option>
                <option value="handling">{locale === 'ar' ? 'مناولة' : 'Handling'}</option>
                <option value="insurance">{locale === 'ar' ? 'تأمين' : 'Insurance'}</option>
                <option value="other">{locale === 'ar' ? 'أخرى' : 'Other'}</option>
              </select>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التصنيف' : 'Category'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">GL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? i.nameAr : i.name}</td>
                    <td className="px-4 py-3 text-gray-500">{categoryLabel(i.category)}</td>
                    <td className="px-4 py-3 text-gray-500">{i.glAccount}</td>
                    <td className="px-4 py-3">{getStatusBadge(i.status)}</td>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل البند' : 'Item Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.nameAr : selected.name}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'التصنيف' : 'Category'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{categoryLabel(selected.category)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">GL</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.glAccount}</p>
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

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'بند تكلفة جديد' : 'New Cost Item'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="FRT" />
            <Input label="GL" value={formData.glAccount} onChange={(e) => setFormData({ ...formData, glAccount: e.target.value })} placeholder="5100" />
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'التصنيف' : 'Category'}</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })} className="input">
                <option value="freight">{locale === 'ar' ? 'شحن' : 'Freight'}</option>
                <option value="customs">{locale === 'ar' ? 'جمارك' : 'Customs'}</option>
                <option value="handling">{locale === 'ar' ? 'مناولة' : 'Handling'}</option>
                <option value="insurance">{locale === 'ar' ? 'تأمين' : 'Insurance'}</option>
                <option value="other">{locale === 'ar' ? 'أخرى' : 'Other'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
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
