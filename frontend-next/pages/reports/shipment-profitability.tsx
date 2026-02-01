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
import { ChartBarIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

type ShipmentProfitRow = {
  id: number;
  shipmentRef: string;
  revenue: number;
  totalCost: number;
  profit: number;
  marginPct: number;
};

export default function ShipmentProfitabilityReportPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Reports.ShipmentProfitability.View]);
  const canExport = hasAnyPermission([MenuPermissions.Reports.ShipmentProfitability.Export]);

  const { data, loading, fetchList } = useMasterData<ShipmentProfitRow>({
    endpoint: '/api/reports/shipment-profitability',
  });

  const items = data || [];
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ShipmentProfitRow | null>(null);

  const title = t('menu.logistics.analytics.shipmentProfitability');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => !q || r.shipmentRef.toLowerCase().includes(q));
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
          <ChartBarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <ChartBarIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تقرير أرباح الشحنات' : 'Shipment profitability report'}
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
            placeholder={locale === 'ar' ? 'بحث بالشحنة...' : 'Search by shipment...'}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإيراد' : 'Revenue'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التكلفة' : 'Cost'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الربح' : 'Profit'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الهامش' : 'Margin'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.shipmentRef}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.totalCost.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.profit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.marginPct.toFixed(1)}%</td>
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
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.shipmentRef}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإيراد' : 'Revenue'}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selected.revenue.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'التكلفة' : 'Cost'}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selected.totalCost.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الربح' : 'Profit'}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selected.profit.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الهامش' : 'Margin'}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selected.marginPct.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
