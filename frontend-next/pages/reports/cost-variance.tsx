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
import { ScaleIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

type CostVarianceRow = {
  id: number;
  shipmentRef: string;
  plannedCost: number;
  actualCost: number;
  variance: number;
  variancePct: number;
  reason: string;
};

export default function CostVarianceReportPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Reports.CostVariance.View]);
  const canExport = hasAnyPermission([MenuPermissions.Reports.CostVariance.Export]);

  const { data, loading, fetchList } = useMasterData<CostVarianceRow>({
    endpoint: '/api/reports/cost-variance',
  });

  const items = data || [];
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CostVarianceRow | null>(null);

  const title = t('menu.logistics.analytics.costVariance');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => !q || r.shipmentRef.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q));
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
          <ScaleIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  const varianceClass = (v: number) =>
    v > 0
      ? 'text-rose-700 dark:text-rose-300'
      : v < 0
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-gray-900 dark:text-white';

  return (
    <MainLayout>
      <Head>
        <title>{title} - SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <ScaleIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تحليل فروقات التكاليف (مخطط مقابل فعلي)' : 'Cost variance analysis (planned vs actual)'}
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
            placeholder={locale === 'ar' ? 'بحث بالشحنة/السبب...' : 'Search by shipment/reason...'}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مخطط' : 'Planned'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'فعلي' : 'Actual'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفرق' : 'Variance'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.shipmentRef}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.plannedCost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.actualCost.toLocaleString()}</td>
                  <td className={`px-4 py-3 font-semibold ${varianceClass(r.variance)}`}>{r.variance.toLocaleString()} ({r.variancePct.toFixed(1)}%)</td>
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
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'السبب' : 'Reason'}</div>
              <div className="font-medium text-gray-900 dark:text-white">{selected.reason}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مخطط' : 'Planned'}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selected.plannedCost.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'فعلي' : 'Actual'}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selected.actualCost.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 col-span-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفرق' : 'Variance'}</div>
                <div className={`font-semibold ${varianceClass(selected.variance)}`}>{selected.variance.toLocaleString()} ({selected.variancePct.toFixed(1)}%)</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
