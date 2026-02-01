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
import {
  MapIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type RouteStatus = 'active' | 'inactive';
type RouteMode = 'road' | 'sea' | 'air' | 'rail' | 'multimodal';

interface TransportRoute {
  id: number;
  code: string;
  origin: string;
  originAr: string;
  destination: string;
  destinationAr: string;
  mode: RouteMode;
  distanceKm: number;
  status: RouteStatus;
}

const mockRoutes: TransportRoute[] = [
  { id: 1, code: 'RHD-JED-R', origin: 'Riyadh', originAr: 'الرياض', destination: 'Jeddah', destinationAr: 'جدة', mode: 'road', distanceKm: 950, status: 'active' },
  { id: 2, code: 'JED-DMM-R', origin: 'Jeddah', originAr: 'جدة', destination: 'Dammam', destinationAr: 'الدمام', mode: 'road', distanceKm: 1340, status: 'active' },
  { id: 3, code: 'JED-DXB-S', origin: 'Jeddah', originAr: 'جدة', destination: 'Dubai', destinationAr: 'دبي', mode: 'sea', distanceKm: 2050, status: 'inactive' },
];

export default function TransportRoutesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.TransportRoutes.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.TransportRoutes.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.TransportRoutes.Edit]);

  const [items] = useState<TransportRoute[]>(mockRoutes);
  const [selectedStatus, setSelectedStatus] = useState<'all' | RouteStatus>('all');
  const [selectedMode, setSelectedMode] = useState<'all' | RouteMode>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TransportRoute | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    origin: '',
    originAr: '',
    destination: '',
    destinationAr: '',
    mode: 'road' as RouteMode,
    distanceKm: '0',
    status: 'active' as RouteStatus,
  });

  const modeLabel = (m: RouteMode) => {
    const labels: Record<RouteMode, { en: string; ar: string }> = {
      road: { en: 'Road', ar: 'بري' },
      sea: { en: 'Sea', ar: 'بحري' },
      air: { en: 'Air', ar: 'جوي' },
      rail: { en: 'Rail', ar: 'سكك' },
      multimodal: { en: 'Multimodal', ar: 'متعدد الوسائط' },
    };
    return locale === 'ar' ? labels[m].ar : labels[m].en;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      const sOk = selectedStatus === 'all' || r.status === selectedStatus;
      const mOk = selectedMode === 'all' || r.mode === selectedMode;
      const qOk =
        !q ||
        r.code.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.originAr.toLowerCase().includes(q) ||
        r.destinationAr.toLowerCase().includes(q);
      return sOk && mOk && qOk;
    });
  }, [items, selectedStatus, selectedMode, search]);

  const totalCount = items.length;
  const activeCount = items.filter((i) => i.status === 'active').length;
  const totalDistance = items.reduce((s, i) => s + i.distanceKm, 0);

  const getStatusBadge = (status: RouteStatus) => {
    const styles: Record<RouteStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<RouteStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ code: '', origin: '', originAr: '', destination: '', destinationAr: '', mode: 'road', distanceKm: '0', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'خطوط النقل - SLMS' : 'Transport Routes - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <MapIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض خطوط النقل.' : "You don't have permission to view transport routes."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'خطوط النقل - SLMS' : 'Transport Routes - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <MapIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'خطوط النقل' : 'Transport Routes'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تعريف المسارات القياسية حسب وسيلة النقل' : 'Define standard routes by transport mode'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'مسار جديد' : 'New Route'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي المسافة (كم)' : 'Total Distance (km)'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDistance.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-72">
                <Input
                  label={locale === 'ar' ? 'بحث' : 'Search'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={locale === 'ar' ? 'بحث بالكود أو المدن...' : 'Search by code or cities...'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الوضع' : 'Mode'}</label>
                <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="road">{locale === 'ar' ? 'بري' : 'Road'}</option>
                  <option value="sea">{locale === 'ar' ? 'بحري' : 'Sea'}</option>
                  <option value="air">{locale === 'ar' ? 'جوي' : 'Air'}</option>
                  <option value="rail">{locale === 'ar' ? 'سكك' : 'Rail'}</option>
                  <option value="multimodal">{locale === 'ar' ? 'متعدد الوسائط' : 'Multimodal'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                  <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                  <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                </select>
              </div>
            </div>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الانطلاق' : 'Origin'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوجهة' : 'Destination'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوضع' : 'Mode'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المسافة (كم)' : 'Distance (km)'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? r.originAr : r.origin}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? r.destinationAr : r.destination}</td>
                    <td className="px-4 py-3 text-gray-500">{modeLabel(r.mode)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{r.distanceKm.toLocaleString()}</td>
                    <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل المسار' : 'Route Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{(locale === 'ar' ? selected.originAr : selected.origin) + ' → ' + (locale === 'ar' ? selected.destinationAr : selected.destination)}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الوضع' : 'Mode'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{modeLabel(selected.mode)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المسافة (كم)' : 'Distance (km)'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.distanceKm.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              {canEdit && (
                <>
                  <Button onClick={() => showToast(locale === 'ar' ? 'تم التفعيل (تجريبي)' : 'Activated (demo)', 'success')}>
                    <CheckCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'تفعيل' : 'Activate'}
                  </Button>
                  <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم التعطيل (تجريبي)' : 'Deactivated (demo)', 'error')}>
                    <XCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'تعطيل' : 'Deactivate'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'مسار نقل جديد' : 'New Transport Route'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="RHD-JED-R" />
            <Input label={locale === 'ar' ? 'المسافة (كم)' : 'Distance (km)'} value={formData.distanceKm} onChange={(e) => setFormData({ ...formData, distanceKm: e.target.value })} placeholder="950" />
            <Input label={locale === 'ar' ? 'الانطلاق (EN)' : 'Origin (EN)'} value={formData.origin} onChange={(e) => setFormData({ ...formData, origin: e.target.value })} placeholder="Riyadh" />
            <Input label={locale === 'ar' ? 'الانطلاق (AR)' : 'Origin (AR)'} value={formData.originAr} onChange={(e) => setFormData({ ...formData, originAr: e.target.value })} placeholder="الرياض" />
            <Input label={locale === 'ar' ? 'الوجهة (EN)' : 'Destination (EN)'} value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} placeholder="Jeddah" />
            <Input label={locale === 'ar' ? 'الوجهة (AR)' : 'Destination (AR)'} value={formData.destinationAr} onChange={(e) => setFormData({ ...formData, destinationAr: e.target.value })} placeholder="جدة" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الوضع' : 'Mode'}</label>
              <select value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })} className="input">
                <option value="road">{locale === 'ar' ? 'بري' : 'Road'}</option>
                <option value="sea">{locale === 'ar' ? 'بحري' : 'Sea'}</option>
                <option value="air">{locale === 'ar' ? 'جوي' : 'Air'}</option>
                <option value="rail">{locale === 'ar' ? 'سكك' : 'Rail'}</option>
                <option value="multimodal">{locale === 'ar' ? 'متعدد الوسائط' : 'Multimodal'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إنشاء' : 'Create'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
