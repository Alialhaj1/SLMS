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
  ReceiptPercentIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type TaxCategoryStatus = 'active' | 'inactive';
type TaxCategoryType = 'vat' | 'withholding' | 'exempt';

interface TaxCategory {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  type: TaxCategoryType;
  rate: number;
  status: TaxCategoryStatus;
}

const mockTaxCategories: TaxCategory[] = [
  { id: 1, code: 'VAT-15', name: 'VAT Standard', nameAr: 'ضريبة القيمة المضافة - قياسي', type: 'vat', rate: 15, status: 'active' },
  { id: 2, code: 'VAT-0', name: 'VAT Zero-rated', nameAr: 'ضريبة القيمة المضافة - صفرية', type: 'vat', rate: 0, status: 'active' },
  { id: 3, code: 'WHT-5', name: 'Withholding 5%', nameAr: 'حجز ضريبي 5%', type: 'withholding', rate: 5, status: 'inactive' },
  { id: 4, code: 'EXEMPT', name: 'Tax Exempt', nameAr: 'معفى من الضريبة', type: 'exempt', rate: 0, status: 'active' },
];

export default function TaxCategoriesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.TaxCategories.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.TaxCategories.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.TaxCategories.Edit]);

  const [items] = useState<TaxCategory[]>(mockTaxCategories);
  const [selectedStatus, setSelectedStatus] = useState<'all' | TaxCategoryStatus>('all');
  const [selectedType, setSelectedType] = useState<'all' | TaxCategoryType>('all');
  const [selected, setSelected] = useState<TaxCategory | null>(null);
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
    type: 'vat' as TaxCategoryType,
    rate: '',
    status: 'active' as TaxCategoryStatus,
  });

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const sOk = selectedStatus === 'all' || i.status === selectedStatus;
      const tOk = selectedType === 'all' || i.type === selectedType;
      return sOk && tOk;
    });
  }, [items, selectedStatus, selectedType]);

  const activeCount = items.filter(i => i.status === 'active').length;
  const vatCount = items.filter(i => i.type === 'vat').length;
  const avgRate = items.length ? items.reduce((sum, i) => sum + i.rate, 0) / items.length : 0;

  const getStatusBadge = (status: TaxCategoryStatus) => {
    const styles: Record<TaxCategoryStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<TaxCategoryStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const typeLabel = (type: TaxCategoryType) => {
    const labels: Record<TaxCategoryType, { en: string; ar: string }> = {
      vat: { en: 'VAT', ar: 'ضريبة القيمة المضافة' },
      withholding: { en: 'Withholding', ar: 'حجز ضريبي' },
      exempt: { en: 'Exempt', ar: 'معفى' },
    };
    return locale === 'ar' ? labels[type].ar : labels[type].en;
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ code: '', name: '', nameAr: '', type: 'vat', rate: '', status: 'active' });
  };

  const formatPercent = (value: number) => {
    const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', { maximumFractionDigits: 2 }).format(value);
    return `${formatted}%`;
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'فئات الضرائب - SLMS' : 'Tax Categories - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <ReceiptPercentIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض فئات الضرائب.' : "You don't have permission to view tax categories."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'فئات الضرائب - SLMS' : 'Tax Categories - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ReceiptPercentIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'فئات الضرائب' : 'Tax Categories'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تعريف فئات الضرائب وأنواعها ونِسَبها' : 'Define tax categories, types, and rates'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'فئة جديدة' : 'New Category'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'فئات VAT' : 'VAT categories'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{vatCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط النسبة' : 'Average rate'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPercent(avgRate)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All types'}</option>
                <option value="vat">VAT</option>
                <option value="withholding">{locale === 'ar' ? 'حجز ضريبي' : 'Withholding'}</option>
                <option value="exempt">{locale === 'ar' ? 'معفى' : 'Exempt'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النسبة' : 'Rate'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? i.nameAr : i.name}</td>
                    <td className="px-4 py-3 text-gray-500">{typeLabel(i.type)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatPercent(i.rate)}</td>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الفئة' : 'Category Details'} size="lg">
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
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{typeLabel(selected.type)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النسبة' : 'Rate'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatPercent(selected.rate)}</p>
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

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'فئة ضريبة جديدة' : 'New Tax Category'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="VAT-15" />
            <Input label={locale === 'ar' ? 'النسبة %' : 'Rate %'} value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} inputMode="decimal" placeholder="0" />
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} className="input">
                <option value="vat">VAT</option>
                <option value="withholding">{locale === 'ar' ? 'حجز ضريبي' : 'Withholding'}</option>
                <option value="exempt">{locale === 'ar' ? 'معفى' : 'Exempt'}</option>
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
