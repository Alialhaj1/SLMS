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
import { InboxStackIcon, EyeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

type ReceivingRow = {
  id: number;
  shipmentRef: string;
  warehouse: string;
  status: 'pending' | 'received' | 'partial';
};

const mockRows: ReceivingRow[] = [
  { id: 1, shipmentRef: 'SHP-2025-0001', warehouse: 'Main Warehouse', status: 'pending' },
  { id: 2, shipmentRef: 'SHP-2025-0002', warehouse: 'Jeddah WH', status: 'partial' },
  { id: 3, shipmentRef: 'SHP-2025-0003', warehouse: 'Riyadh WH', status: 'received' },
];

export default function ShipmentReceivingPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.ShipmentReceiving.View]);
  const canReceive = hasAnyPermission([MenuPermissions.Logistics.ShipmentReceiving.Receive]);

  const [items] = useState<ReceivingRow[]>(mockRows);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReceivingRow | null>(null);

  const title = t('menu.logistics.shipmentManagement.receiving');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (r) => !q || r.shipmentRef.toLowerCase().includes(q) || r.warehouse.toLowerCase().includes(q)
    );
  }, [items, search]);

  const statusLabel = (s: ReceivingRow['status']) => {
    if (s === 'pending') return locale === 'ar' ? 'قيد الاستلام' : 'Pending';
    if (s === 'partial') return locale === 'ar' ? 'استلام جزئي' : 'Partial';
    return locale === 'ar' ? 'مستلم' : 'Received';
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <InboxStackIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <InboxStackIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'استلام الشحنات إلى المخزون' : 'Receive shipments into inventory'}
              </p>
            </div>
          </div>

          {canReceive && (
            <Button
              onClick={() => showToast(locale === 'ar' ? 'بدء الاستلام (تجريبي)' : 'Start receiving (demo)', 'info')}
            >
              <CheckCircleIcon className="h-4 w-4" />
              {locale === 'ar' ? 'استلام' : 'Receive'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالشحنة/المستودع...' : 'Search by shipment/warehouse...'}
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
                  {locale === 'ar' ? 'المستودع' : 'Warehouse'}
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
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.shipmentRef}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.warehouse}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{statusLabel(r.status)}</td>
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
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.shipmentRef}</div>
            <div className="text-gray-900 dark:text-white font-medium">{selected.warehouse}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{statusLabel(selected.status)}</div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
