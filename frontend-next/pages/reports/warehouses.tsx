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
import { BuildingStorefrontIcon, EyeIcon, ArrowDownTrayIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';

interface WarehouseReportRow {
  id: number;
  warehouse: string;
  warehouseAr: string;
  location: string;
  locationAr: string;
  items: number;
  lowStock: number;
  expiringSoon: number;
  utilizationPct: number;
  lastAudit: string;
}

const mockRows: WarehouseReportRow[] = [
  { id: 1, warehouse: 'Main Warehouse', warehouseAr: 'المستودع الرئيسي', location: 'Riyadh', locationAr: 'الرياض', items: 1240, lowStock: 18, expiringSoon: 9, utilizationPct: 76, lastAudit: '2025-12-10' },
  { id: 2, warehouse: 'Secondary Warehouse', warehouseAr: 'المستودع الفرعي', location: 'Jeddah', locationAr: 'جدة', items: 640, lowStock: 11, expiringSoon: 4, utilizationPct: 58, lastAudit: '2025-11-22' },
  { id: 3, warehouse: 'Cold Storage', warehouseAr: 'مستودع مبرد', location: 'Dammam', locationAr: 'الدمام', items: 210, lowStock: 5, expiringSoon: 12, utilizationPct: 61, lastAudit: '2025-10-05' },
];

export default function WarehousesReportsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Reports.Warehouses.View]);
  const canExport = hasAnyPermission([MenuPermissions.Reports.Warehouses.Export]);

  const [rows] = useState<WarehouseReportRow[]>(mockRows);
  const [warehouse, setWarehouse] = useState<'all' | string>('all');
  const [from, setFrom] = useState('2025-12-01');
  const [to, setTo] = useState('2025-12-31');
  const [selected, setSelected] = useState<WarehouseReportRow | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => warehouse === 'all' || r.warehouse === warehouse);
  }, [rows, warehouse]);

  const totals = useMemo(() => {
    const items = filtered.reduce((s, r) => s + r.items, 0);
    const lowStock = filtered.reduce((s, r) => s + r.lowStock, 0);
    const expiringSoon = filtered.reduce((s, r) => s + r.expiringSoon, 0);
    const avgUtil = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.utilizationPct, 0) / filtered.length) : 0;
    return { items, lowStock, expiringSoon, avgUtil };
  }, [filtered]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'تقارير المستودعات - SLMS' : 'Warehouses Reports - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <ArchiveBoxIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض تقارير المستودعات.' : "You don't have permission to view warehouses reports."}</p>
        </div>
      </MainLayout>
    );
  }

  const uniqueWarehouses = Array.from(new Set(rows.map((r) => r.warehouse)));

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير المستودعات - SLMS' : 'Warehouses Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BuildingStorefrontIcon className="h-6 w-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'تقارير المستودعات' : 'Warehouses Reports'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'ملخص المخزون والتنبيهات حسب المستودع' : 'Inventory summary and alerts by warehouse'}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label={locale === 'ar' ? 'من' : 'From'} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label={locale === 'ar' ? 'إلى' : 'To'} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'المستودع' : 'Warehouse'}</label>
              <select className="input" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                <option value="all">{locale === 'ar' ? 'كل المستودعات' : 'All warehouses'}</option>
                {uniqueWarehouses.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عدد الأصناف' : 'Items'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.items.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'منخفض المخزون' : 'Low Stock'}</p>
            <p className="text-2xl font-bold text-amber-600">{totals.lowStock.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قارب على الانتهاء' : 'Expiring Soon'}</p>
            <p className="text-2xl font-bold text-red-600">{totals.expiringSoon.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط الإشغال' : 'Avg. Utilization'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.avgUtil}%</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? `الفترة: ${from} إلى ${to}` : `Period: ${from} to ${to}`}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المستودع' : 'Warehouse'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الموقع' : 'Location'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الأصناف' : 'Items'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'منخفض' : 'Low'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'ينتهي قريباً' : 'Expiring'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إشغال' : 'Util.'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'آخر تدقيق' : 'Last Audit'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locale === 'ar' ? r.warehouseAr : r.warehouse}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? r.locationAr : r.location}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{r.items.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{r.lowStock.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{r.expiringSoon.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{r.utilizationPct}%</td>
                    <td className="px-4 py-3 text-gray-500">{r.lastAudit}</td>
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
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل المستودع' : 'Warehouse Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{locale === 'ar' ? selected.warehouseAr : selected.warehouse}</h3>
              <p className="text-sm text-gray-500">{locale === 'ar' ? selected.locationAr : selected.location}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'عدد الأصناف' : 'Items'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.items.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإشغال' : 'Utilization'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.utilizationPct}%</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'منخفض المخزون' : 'Low Stock'}</p>
                <p className="font-medium text-amber-600">{selected.lowStock.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'ينتهي قريباً' : 'Expiring Soon'}</p>
                <p className="font-medium text-red-600">{selected.expiringSoon.toLocaleString()}</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'آخر تدقيق' : 'Last Audit'}</p>
              <p className="font-medium text-gray-900 dark:text-white">{selected.lastAudit}</p>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
