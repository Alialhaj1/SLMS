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
import { TagIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';

type ShipmentCostType = {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
  allocationBasis: 'value' | 'weight' | 'quantity';
};

const mockCostTypes: ShipmentCostType[] = [
  { id: 1, code: 'FREIGHT', nameEn: 'Freight', nameAr: 'الشحن', allocationBasis: 'weight' },
  { id: 2, code: 'INSURANCE', nameEn: 'Insurance', nameAr: 'التأمين', allocationBasis: 'value' },
  { id: 3, code: 'CUSTOMS', nameEn: 'Customs Fees', nameAr: 'رسوم جمركية', allocationBasis: 'value' },
];

export default function ShipmentCostTypesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.ShipmentCostTypes.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Logistics.ShipmentCostTypes.Create]);

  const [items] = useState<ShipmentCostType[]>(mockCostTypes);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ShipmentCostType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', nameEn: '', nameAr: '', allocationBasis: 'value' });

  const title = t('menu.logistics.landedCost.costTypes');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (c) =>
        !q ||
        c.code.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.toLowerCase().includes(q) ||
        c.allocationBasis.toLowerCase().includes(q)
    );
  }, [items, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <TagIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{title} - SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <TagIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'أنواع تكاليف الشحنة وتوزيعها' : 'Shipment cost types and allocation basis'}
              </p>
            </div>
          </div>

          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة نوع' : 'Add Type'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الكود' : 'Code'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الاسم' : 'Name'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'أساس التوزيع' : 'Allocation Basis'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'إجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.code}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {locale === 'ar' ? c.nameAr : c.nameEn}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.allocationBasis}</td>
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

      <Modal isOpen={!!selected && !createOpen} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {locale === 'ar' ? selected.nameAr : selected.nameEn}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{selected.code}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'أساس التوزيع' : 'Allocation basis'}: {selected.allocationBasis}
            </p>
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'نوع تكلفة جديد' : 'New Cost Type'} size="md">
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} />
          <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {locale === 'ar' ? 'أساس التوزيع' : 'Allocation Basis'}
            </label>
            <select
              value={formData.allocationBasis}
              onChange={(e) => setFormData({ ...formData, allocationBasis: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="value">value</option>
              <option value="weight">weight</option>
              <option value="quantity">quantity</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              onClick={() => {
                showToast(locale === 'ar' ? 'تمت الإضافة (تجريبي)' : 'Added (demo)', 'success');
                setCreateOpen(false);
              }}
            >
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
