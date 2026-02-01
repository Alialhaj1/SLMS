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
import { CurrencyDollarIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

type ShipmentCostReportRow = {
  id: number;
  shipmentRef: string;
  freight: number;
  insurance: number;
  customs: number;
  total: number;
};

const mockRows: ShipmentCostReportRow[] = [
  { id: 1, shipmentRef: 'SHP-2025-0001', freight: 5200, insurance: 300, customs: 450, total: 5950 },
  { id: 2, shipmentRef: 'SHP-2025-0002', freight: 4100, insurance: 250, customs: 0, total: 4350 },
];

export default function ShipmentCostsReportPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Reports.ShipmentCosts.View]);
  const canExport = hasAnyPermission([MenuPermissions.Reports.ShipmentCosts.Export]);

  const [items] = useState<ShipmentCostReportRow[]>(mockRows);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ShipmentCostReportRow | null>(null);

  const title = t('menu.logistics.analytics.shipmentCosts');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => !q || r.shipmentRef.toLowerCase().includes(q));
  }, [items, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <CurrencyDollarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <CurrencyDollarIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تقرير تكلفة الشحنة (تجريبي)' : 'Shipment costs report (demo)'}
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
          <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالشحنة...' : 'Search by shipment...'} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'شحن' : 'Freight'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تأمين' : 'Insurance'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'جمارك' : 'Customs'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجمالي' : 'Total'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.shipmentRef}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.freight.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.insurance.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.customs.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.total.toLocaleString()}</td>
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
            <div className="text-gray-900 dark:text-white font-medium">{selected.shipmentRef}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Freight: {selected.freight.toLocaleString()}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Insurance: {selected.insurance.toLocaleString()}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Customs: {selected.customs.toLocaleString()}</div>
            <div className="text-gray-900 dark:text-white font-semibold">Total: {selected.total.toLocaleString()}</div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
