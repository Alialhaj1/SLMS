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
import { ClockIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useMasterData } from '../../hooks/useMasterData';
import { companyStore } from '../../lib/companyStore';

type ShipmentEvent = {
  id: number;
  shipment_reference?: string;
  event_type: string;
  event_source?: string;
  stage_code?: string;
  status_code?: string;
  location?: string;
  description_en?: string;
  description_ar?: string;
  occurred_at: string;
};

export default function ShipmentEventsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.ShipmentEventLog.View]);
  const canExport = hasAnyPermission([MenuPermissions.Logistics.ShipmentEventLog.Export]);

  const { data: items, loading, fetchList } = useMasterData<ShipmentEvent>({
    endpoint: '/api/shipment-events',
  });

  const [search, setSearch] = useState('');
  const [shipment, setShipment] = useState('');
  const [eventType, setEventType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState<ShipmentEvent | null>(null);

  const title = t('menu.logistics.shipmentManagement.eventLog');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (e) =>
        !q ||
        (e.shipment_reference || '').toLowerCase().includes(q) ||
        (e.event_type || '').toLowerCase().includes(q) ||
        (e.description_en || '').toLowerCase().includes(q) ||
        (e.description_ar || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  useEffect(() => {
    if (!canView) return;
    const timeout = setTimeout(() => {
      fetchList({
        search,
        filters: {
          shipment_reference: shipment.trim() || undefined,
          event_type: eventType.trim() || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [canView, eventType, fetchList, fromDate, search, shipment, toDate]);

  const exportCsv = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const query = new URLSearchParams();
      if (search.trim()) query.append('search', search.trim());
      if (shipment.trim()) query.append('shipment_reference', shipment.trim());
      if (eventType.trim()) query.append('event_type', eventType.trim());
      if (fromDate) query.append('from', fromDate);
      if (toDate) query.append('to', toDate);

      const res = await fetch(`${baseUrl}/api/shipment-events/export?${query.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shipment-events.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      showToast(locale === 'ar' ? 'تم التصدير' : 'Exported', 'success');
    } catch (err: any) {
      showToast(err?.message || (locale === 'ar' ? 'فشل التصدير' : 'Export failed'), 'error');
    }
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <ClockIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <ClockIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'سجل أحداث الشحنات للتتبع والتدقيق' : 'Shipment event log for tracking and audit'}
              </p>
            </div>
          </div>

          {canExport && (
            <Button
              variant="secondary"
              loading={loading}
              onClick={exportCsv}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label={locale === 'ar' ? 'بحث عام' : 'Search'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
            />
            <Input
              label={locale === 'ar' ? 'الشحنة' : 'Shipment'}
              value={shipment}
              onChange={(e) => setShipment(e.target.value)}
              placeholder={locale === 'ar' ? 'مرجع/رقم...' : 'Reference/number...'}
            />
            <Input
              label={locale === 'ar' ? 'نوع الحدث' : 'Event Type'}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="STATUS_CHANGE"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label={locale === 'ar' ? 'من' : 'From'}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <Input
                type="date"
                label={locale === 'ar' ? 'إلى' : 'To'}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الشحنة' : 'Shipment'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'النوع' : 'Type'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الوقت' : 'Time'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'إجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.shipment_reference || '-'}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{e.event_type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {e.occurred_at ? new Date(e.occurred_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(e)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الحدث' : 'Event Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selected.occurred_at ? new Date(selected.occurred_at).toLocaleString() : '-'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.shipment_reference || '-'}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{selected.event_type}</div>
            {selected.event_source && (
              <div className="text-sm text-gray-500 dark:text-gray-400">{selected.event_source}</div>
            )}
            {selected.location && (
              <div className="text-sm text-gray-500 dark:text-gray-400">{selected.location}</div>
            )}
            <div className="text-gray-700 dark:text-gray-200">
              {locale === 'ar' ? selected.description_ar || selected.description_en : selected.description_en || selected.description_ar}
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
