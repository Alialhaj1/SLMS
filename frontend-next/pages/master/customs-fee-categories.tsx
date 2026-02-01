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

type ActiveStatus = 'active' | 'inactive';
type FeeBasis = 'fixed' | 'percentage';

interface CustomsFeeCategory {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  basis: FeeBasis;
  defaultValue: number;
  currency?: string;
  status: ActiveStatus;
}

const mockCategories: CustomsFeeCategory[] = [
  { id: 1, code: 'DOC_FEE', name: 'Documentation Fee', nameAr: 'رسوم المستندات', basis: 'fixed', defaultValue: 150, currency: 'SAR', status: 'active' },
  { id: 2, code: 'INSPECTION', name: 'Inspection Fee', nameAr: 'رسوم التفتيش', basis: 'fixed', defaultValue: 75, currency: 'SAR', status: 'active' },
  { id: 3, code: 'SERVICE_PCT', name: 'Service Fee (%)', nameAr: 'رسوم خدمة (%)', basis: 'percentage', defaultValue: 1.5, currency: undefined, status: 'inactive' },
];

export default function CustomsFeeCategoriesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.MasterData.CustomsFeeCategories.View]);
  const canCreate = hasAnyPermission([MenuPermissions.MasterData.CustomsFeeCategories.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.MasterData.CustomsFeeCategories.Edit]);

  const [items] = useState<CustomsFeeCategory[]>(mockCategories);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ActiveStatus>('all');
  const [basis, setBasis] = useState<'all' | FeeBasis>('all');
  const [selected, setSelected] = useState<CustomsFeeCategory | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    basis: 'fixed' as FeeBasis,
    defaultValue: '0',
    currency: 'SAR',
    status: 'active' as ActiveStatus,
  });

  const statusBadge = (s: ActiveStatus) => {
    const styles: Record<ActiveStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<ActiveStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[s])}>
        {locale === 'ar' ? labels[s].ar : labels[s].en}
      </span>
    );
  };

  const basisLabel = (b: FeeBasis) => {
    const labels: Record<FeeBasis, { en: string; ar: string }> = {
      fixed: { en: 'Fixed', ar: 'ثابت' },
      percentage: { en: 'Percentage', ar: 'نسبة' },
    };
    return locale === 'ar' ? labels[b].ar : labels[b].en;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      const sOk = status === 'all' || c.status === status;
      const bOk = basis === 'all' || c.basis === basis;
      const qOk = !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.nameAr.toLowerCase().includes(q);
      return sOk && bOk && qOk;
    });
  }, [items, search, status, basis]);

  const totalCount = items.length;
  const activeCount = items.filter((i) => i.status === 'active').length;
  const percentageCount = items.filter((i) => i.basis === 'percentage').length;

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
    showToast(locale === 'ar' ? 'تمت الإضافة (تجريبي)' : 'Added (demo)', 'success');
    setCreateOpen(false);
    setFormData({ code: '', name: '', nameAr: '', basis: 'fixed', defaultValue: '0', currency: 'SAR', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'فئات الرسوم الجمركية - SLMS' : 'Customs Fee Categories - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <TagIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض فئات الرسوم الجمركية.' : "You don't have permission to view customs fee categories."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'فئات الرسوم الجمركية - SLMS' : 'Customs Fee Categories - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <TagIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'فئات الرسوم الجمركية' : 'Customs Fee Categories'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تصنيف الرسوم المستخدمة في الجمارك والتخليص' : 'Categorize fees used in customs and clearance'}</p>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نِسَب' : 'Percentage'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{percentageCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-80">
                <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Basis'}</label>
                <select value={basis} onChange={(e) => setBasis(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="fixed">{locale === 'ar' ? 'ثابت' : 'Fixed'}</option>
                  <option value="percentage">{locale === 'ar' ? 'نسبة' : 'Percentage'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="input">
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Basis'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القيمة' : 'Default Value'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العملة' : 'Currency'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? c.nameAr : c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{basisLabel(c.basis)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{c.defaultValue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{c.currency || (c.basis === 'percentage' ? '%' : '-')}</td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(c)}>
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.nameAr : selected.name}</p>
              </div>
              {statusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Basis'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{basisLabel(selected.basis)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'القيمة' : 'Default Value'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.defaultValue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'العملة' : 'Currency'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.currency || (selected.basis === 'percentage' ? '%' : '-')}</p>
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

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'فئة رسوم جديدة' : 'New Fee Category'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="NEW_FEE" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Basis'}</label>
              <select value={formData.basis} onChange={(e) => setFormData({ ...formData, basis: e.target.value as any })} className="input">
                <option value="fixed">{locale === 'ar' ? 'ثابت' : 'Fixed'}</option>
                <option value="percentage">{locale === 'ar' ? 'نسبة' : 'Percentage'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'القيمة الافتراضية' : 'Default Value'} value={formData.defaultValue} onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })} placeholder="0" />
            <Input label={locale === 'ar' ? 'العملة' : 'Currency'} value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} placeholder="SAR" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إضافة' : 'Add'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
