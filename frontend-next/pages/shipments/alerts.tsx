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
import { BellAlertIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';

type ShipmentAlert = {
  id: number;
  shipmentRef: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  status: 'open' | 'resolved';
};

const mockAlerts: ShipmentAlert[] = [
  { id: 1, shipmentRef: 'SHP-2025-0002', severity: 'high', message: 'Customs docs missing', status: 'open' },
  { id: 2, shipmentRef: 'SHP-2025-0003', severity: 'medium', message: 'ETA delayed by 2 days', status: 'open' },
  { id: 3, shipmentRef: 'SHP-2025-0001', severity: 'low', message: 'Pickup scheduled', status: 'resolved' },
];

export default function ShipmentAlertsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.ShipmentAlerts.View]);
  const canManage = hasAnyPermission([MenuPermissions.Logistics.ShipmentAlerts.Manage]);

  const [items] = useState<ShipmentAlert[]>(mockAlerts);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ShipmentAlert | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ shipmentRef: '', severity: 'medium', message: '' });

  const title = t('menu.logistics.shipmentManagement.shipmentAlerts');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (a) =>
        !q ||
        a.shipmentRef.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.severity.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
    );
  }, [items, search]);

  const badgeClass = (severity: ShipmentAlert['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    }
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <BellAlertIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <BellAlertIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تنبيهات تشغيلية مرتبطة بالشحنات' : 'Operational alerts linked to shipments'}
              </p>
            </div>
          </div>

          {canManage && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة تنبيه' : 'Create Alert'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالشحنة/الرسالة...' : 'Search by shipment/message...'}
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
                  {locale === 'ar' ? 'الخطورة' : 'Severity'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الحالة' : 'State'}
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
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${badgeClass(a.severity)}`}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {a.status === 'open' ? (locale === 'ar' ? 'مفتوح' : 'Open') : locale === 'ar' ? 'محلول' : 'Resolved'}
                  </td>
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

      <Modal isOpen={!!selected && !createOpen} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل التنبيه' : 'Alert Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.shipmentRef}</div>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-fit ${badgeClass(selected.severity)}`}>
              {selected.severity}
            </div>
            <div className="text-gray-900 dark:text-white font-medium">{selected.message}</div>
          </div>
        )}
      </Modal>

      <Modal isOpen={canManage && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'تنبيه جديد' : 'New Alert'} size="md">
        <div className="space-y-4">
          <Input
            label={locale === 'ar' ? 'مرجع الشحنة' : 'Shipment Reference'}
            value={formData.shipmentRef}
            onChange={(e) => setFormData({ ...formData, shipmentRef: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {locale === 'ar' ? 'الخطورة' : 'Severity'}
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
          <Input
            label={locale === 'ar' ? 'الرسالة' : 'Message'}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              onClick={() => {
                showToast(locale === 'ar' ? 'تم إنشاء التنبيه (تجريبي)' : 'Alert created (demo)', 'success');
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
