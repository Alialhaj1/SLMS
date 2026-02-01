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
import { CubeIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

type ItemLandedCostRow = {
  id: number;
  itemCode: string;
  itemName: string;
  shipmentRef: string;
  baseCost: number;
  landedCost: number;
};

const mockRows: ItemLandedCostRow[] = [
  { id: 1, itemCode: 'ITM-001', itemName: 'Laptop', shipmentRef: 'SHP-2025-0001', baseCost: 2500, landedCost: 2875 },
  { id: 2, itemCode: 'ITM-002', itemName: 'Mobile Phone', shipmentRef: 'SHP-2025-0002', baseCost: 1200, landedCost: 1260 },
];

export default function ItemLandedCostReportPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Reports.ItemLandedCost.View]);
  const canExport = hasAnyPermission([MenuPermissions.Reports.ItemLandedCost.Export]);

  const [items] = useState<ItemLandedCostRow[]>(mockRows);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ItemLandedCostRow | null>(null);

  const title = t('menu.logistics.analytics.itemLandedCost');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (r) =>
        !q ||
        r.itemCode.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.shipmentRef.toLowerCase().includes(q)
    );
  }, [items, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <CubeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
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
              <CubeIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تقرير التكلفة المُحمّلة لكل صنف' : 'Item landed cost report'}
              </p>
            </div>
          </div>

          {canExport && (
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الصنف' : 'Item'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تكلفة أساس' : 'Base'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تكلفة مُحمّلة' : 'Landed'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.itemCode} - {r.itemName}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.shipmentRef}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.baseCost.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.landedCost.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <div className="text-gray-900 dark:text-white font-medium">{selected.itemCode} - {selected.itemName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.shipmentRef}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Base: {selected.baseCost.toLocaleString()}</div>
            <div className="text-gray-900 dark:text-white font-semibold">Landed: {selected.landedCost.toLocaleString()}</div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
