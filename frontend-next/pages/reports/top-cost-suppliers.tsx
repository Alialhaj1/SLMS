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
import { useMasterData } from '../../hooks/useMasterData';
import { BuildingOffice2Icon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

type TopCostSupplierRow = {
  id: number;
  supplier: string;
  shipments: number;
  totalCost: number;
  avgCost: number;
};

export default function TopCostSuppliersReportPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Reports.TopCostSuppliers.View]);
  const canExport = hasAnyPermission([MenuPermissions.Reports.TopCostSuppliers.Export]);

  const { data, loading, fetchList } = useMasterData<TopCostSupplierRow>({
    endpoint: '/api/reports/top-cost-suppliers',
  });

  const items = data || [];
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TopCostSupplierRow | null>(null);

  const title = t('menu.logistics.analytics.topCostSuppliers');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => !q || r.supplier.toLowerCase().includes(q));
  }, [items, search]);

  useEffect(() => {
    if (!canView) return;
    const handle = setTimeout(() => {
      fetchList({ page: 1, pageSize: 100, search });
    }, 250);
    return () => clearTimeout(handle);
  }, [canView, fetchList, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <BuildingOffice2Icon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <BuildingOffice2Icon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تقرير الموردين الأعلى تكلفة' : 'Top cost suppliers report'}
              </p>
            </div>
          </div>

          {canExport && (
            <Button
              variant="secondary"
              onClick={() => showToast(locale === 'ar' ? 'التصدير غير متاح حالياً' : 'Export is not available yet', 'info')}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالمورد...' : 'Search by supplier...'}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المورد' : 'Supplier'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'عدد الشحنات' : 'Shipments'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجمالي التكلفة' : 'Total cost'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'متوسط' : 'Avg'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.supplier}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.shipments}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.totalCost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.avgCost.toLocaleString()}</td>
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
          <div className="space-y-3">
            <div className="text-gray-900 dark:text-white font-semibold">{selected.supplier}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عدد الشحنات' : 'Shipments'}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selected.shipments}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط التكلفة' : 'Avg cost'}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selected.avgCost.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 col-span-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي التكلفة' : 'Total cost'}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selected.totalCost.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
