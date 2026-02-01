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
import { ArrowsRightLeftIcon, EyeIcon } from '@heroicons/react/24/outline';

type AllocationRow = {
  id: number;
  shipmentRef: string;
  totalCost: number;
  allocatedItems: number;
  status: 'draft' | 'posted';
};

const mockAllocations: AllocationRow[] = [
  { id: 1, shipmentRef: 'SHP-2025-0001', totalCost: 12450, allocatedItems: 18, status: 'draft' },
  { id: 2, shipmentRef: 'SHP-2025-0002', totalCost: 9800, allocatedItems: 10, status: 'posted' },
];

export default function LandedCostAllocationPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.LandedCostAllocation.View]);
  const canManage = hasAnyPermission([MenuPermissions.Logistics.LandedCostAllocation.Manage]);

  const [items] = useState<AllocationRow[]>(mockAllocations);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AllocationRow | null>(null);

  const title = t('menu.logistics.landedCost.allocation');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => !q || a.shipmentRef.toLowerCase().includes(q) || a.status.toLowerCase().includes(q));
  }, [items, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <ArrowsRightLeftIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <ArrowsRightLeftIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar'
                  ? 'توزيع التكاليف على أصناف الشحنة'
                  : 'Allocate landed costs across shipment items'}
              </p>
            </div>
          </div>

          {canManage && (
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'ترحيل (تجريبي)' : 'Post (demo)', 'info')}>
              {locale === 'ar' ? 'ترحيل' : 'Post'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالشحنة/الحالة...' : 'Search by shipment/status...'}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الشحنة' : 'Shipment'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الإجمالي' : 'Total'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الأصناف' : 'Items'}
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
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.shipmentRef}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{a.totalCost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{a.allocatedItems}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.status}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(a)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل التوزيع' : 'Allocation Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.shipmentRef}</div>
            <div className="text-gray-900 dark:text-white font-medium">
              {locale === 'ar' ? 'الإجمالي' : 'Total'}: {selected.totalCost.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'عدد الأصناف' : 'Allocated items'}: {selected.allocatedItems}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.status}</div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
