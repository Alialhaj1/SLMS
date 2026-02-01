import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import { FlagIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useMasterData } from '../../hooks/useMasterData';

type ShipmentStatus = {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
};

export default function ShipmentStatusesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.ShipmentLifecycleStatuses.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Logistics.ShipmentLifecycleStatuses.Create]);

  const { data: items, loading, fetchList, create } = useMasterData<ShipmentStatus>({
    endpoint: '/api/shipment-lifecycle-statuses',
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ShipmentStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', name_en: '', name_ar: '' });

  const title = t('menu.logistics.shipmentManagement.lifecycleStatuses');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (s) =>
        !q ||
        s.code.toLowerCase().includes(q) ||
        (s.name_en || '').toLowerCase().includes(q) ||
        (s.name_ar || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  useEffect(() => {
    if (!canView) return;
    const timeout = setTimeout(() => {
      fetchList({ search });
    }, 250);
    return () => clearTimeout(timeout);
  }, [canView, fetchList, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <FlagIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <FlagIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar'
                  ? 'إعداد حالات دورة حياة الشحنة'
                  : 'Configure shipment lifecycle statuses'}
              </p>
            </div>
          </div>

          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة حالة' : 'Add Status'}
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
                  {locale === 'ar' ? 'الحالة' : 'Status'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'إجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.code}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {locale === 'ar' ? s.name_ar : s.name_en}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        s.is_active
                          ? 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }
                    >
                      {s.is_active ? (locale === 'ar' ? 'نشط' : 'Active') : locale === 'ar' ? 'غير نشط' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(s)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!selected && !createOpen}
        onClose={() => setSelected(null)}
        title={locale === 'ar' ? 'تفاصيل' : 'Details'}
        size="md"
      >
        {selected && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {locale === 'ar' ? selected.name_ar : selected.name_en}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{selected.code}</p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={canCreate && createOpen}
        onClose={() => setCreateOpen(false)}
        title={locale === 'ar' ? 'حالة جديدة' : 'New Status'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={locale === 'ar' ? 'الكود' : 'Code'}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
          <Input
            label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'}
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
          />
          <Input
            label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'}
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              loading={loading}
              onClick={() => {
                (async () => {
                  const payload = {
                    code: formData.code.trim(),
                    name_en: formData.name_en.trim(),
                    name_ar: formData.name_ar.trim(),
                  };

                  if (!payload.code || !payload.name_en || !payload.name_ar) {
                    showToast(locale === 'ar' ? 'الرجاء تعبئة جميع الحقول' : 'Please fill all fields', 'error');
                    return;
                  }

                  const created = await create(payload as any);
                  if (created) {
                    setFormData({ code: '', name_en: '', name_ar: '' });
                    setCreateOpen(false);
                    fetchList({ search });
                  }
                })();
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
