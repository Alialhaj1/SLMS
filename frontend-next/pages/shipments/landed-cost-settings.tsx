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
import { AdjustmentsVerticalIcon, EyeIcon } from '@heroicons/react/24/outline';

type SettingRow = {
  id: number;
  key: string;
  value: string;
  descriptionEn: string;
  descriptionAr: string;
};

const mockSettings: SettingRow[] = [
  {
    id: 1,
    key: 'defaultAllocationBasis',
    value: 'value',
    descriptionEn: 'Default landed cost allocation basis',
    descriptionAr: 'أساس توزيع التكلفة المُحمّلة الافتراضي',
  },
  {
    id: 2,
    key: 'roundingPrecision',
    value: '2',
    descriptionEn: 'Rounding precision for allocations',
    descriptionAr: 'دقة التقريب للتوزيع',
  },
];

export default function LandedCostSettingsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.LandedCostSettings.View]);
  const canManage = hasAnyPermission([MenuPermissions.Logistics.LandedCostSettings.Manage]);

  const [items] = useState<SettingRow[]>(mockSettings);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SettingRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState({ key: '', value: '' });

  const title = t('menu.logistics.landedCost.settings');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (s) =>
        !q ||
        s.key.toLowerCase().includes(q) ||
        s.value.toLowerCase().includes(q) ||
        s.descriptionEn.toLowerCase().includes(q) ||
        s.descriptionAr.toLowerCase().includes(q)
    );
  }, [items, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <AdjustmentsVerticalIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h2>
        </div>
      </MainLayout>
    );
  }

  const openEdit = (row: SettingRow) => {
    setSelected(row);
    setFormData({ key: row.key, value: row.value });
    setEditOpen(true);
  };

  return (
    <MainLayout>
      <Head>
        <title>{title} - SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <AdjustmentsVerticalIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إعدادات توزيع التكلفة المُحمّلة' : 'Landed cost allocation settings'}
              </p>
            </div>
          </div>

          {canManage && (
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'حفظ الإعدادات (تجريبي)' : 'Save settings (demo)', 'info')}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث...' : 'Search...'} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'المفتاح' : 'Key'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'القيمة' : 'Value'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الوصف' : 'Description'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'إجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.key}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{s.value}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{locale === 'ar' ? s.descriptionAr : s.descriptionEn}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected && !editOpen} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <div className="text-gray-900 dark:text-white font-medium">{selected.key}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{locale === 'ar' ? selected.descriptionAr : selected.descriptionEn}</div>
          </div>
        )}
      </Modal>

      <Modal isOpen={canManage && editOpen} onClose={() => setEditOpen(false)} title={locale === 'ar' ? 'تعديل إعداد' : 'Edit Setting'} size="md">
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'المفتاح' : 'Key'} value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} />
          <Input label={locale === 'ar' ? 'القيمة' : 'Value'} value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              onClick={() => {
                showToast(locale === 'ar' ? 'تم الحفظ (تجريبي)' : 'Saved (demo)', 'success');
                setEditOpen(false);
              }}
            >
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
