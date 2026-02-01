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
  TruckIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type VehicleStatus = 'active' | 'inactive';
type VehicleOwnership = 'owned' | 'leased' | 'third_party';

interface Vehicle {
  id: number;
  plateNumber: string;
  type: string;
  typeAr: string;
  ownership: VehicleOwnership;
  capacityKg: number;
  status: VehicleStatus;
}

const mockVehicles: Vehicle[] = [
  { id: 1, plateNumber: 'RHD-1234', type: 'Truck (Flatbed)', typeAr: 'شاحنة (سطحة)', ownership: 'owned', capacityKg: 18000, status: 'active' },
  { id: 2, plateNumber: 'JED-7788', type: 'Van', typeAr: 'فان', ownership: 'leased', capacityKg: 2500, status: 'active' },
  { id: 3, plateNumber: 'DMM-5566', type: 'Pickup', typeAr: 'وانيت', ownership: 'third_party', capacityKg: 1200, status: 'inactive' },
];

export default function VehiclesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.Vehicles.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.Vehicles.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.Vehicles.Edit]);

  const [items] = useState<Vehicle[]>(mockVehicles);
  const [selectedStatus, setSelectedStatus] = useState<'all' | VehicleStatus>('all');
  const [selectedOwnership, setSelectedOwnership] = useState<'all' | VehicleOwnership>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    plateNumber: '',
    type: '',
    typeAr: '',
    ownership: 'owned' as VehicleOwnership,
    capacityKg: '1000',
    status: 'active' as VehicleStatus,
  });

  const ownershipLabel = (o: VehicleOwnership) => {
    const labels: Record<VehicleOwnership, { en: string; ar: string }> = {
      owned: { en: 'Owned', ar: 'مملوك' },
      leased: { en: 'Leased', ar: 'مستأجر' },
      third_party: { en: 'Third Party', ar: 'طرف ثالث' },
    };
    return locale === 'ar' ? labels[o].ar : labels[o].en;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((v) => {
      const sOk = selectedStatus === 'all' || v.status === selectedStatus;
      const oOk = selectedOwnership === 'all' || v.ownership === selectedOwnership;
      const qOk =
        !q ||
        v.plateNumber.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.typeAr.toLowerCase().includes(q);
      return sOk && oOk && qOk;
    });
  }, [items, selectedStatus, selectedOwnership, search]);

  const totalCount = items.length;
  const activeCount = items.filter((i) => i.status === 'active').length;
  const totalCapacity = items.reduce((s, i) => s + i.capacityKg, 0);

  const getStatusBadge = (status: VehicleStatus) => {
    const styles: Record<VehicleStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<VehicleStatus, { en: string; ar: string }> = {
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
    setFormData({ plateNumber: '', type: '', typeAr: '', ownership: 'owned', capacityKg: '1000', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'المركبات - SLMS' : 'Vehicles - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <TruckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض المركبات.' : "You don't have permission to view vehicles."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'المركبات - SLMS' : 'Vehicles - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TruckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'المركبات' : 'Vehicles'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة أسطول النقل والسعات' : 'Manage fleet, ownership, and capacity'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'مركبة جديدة' : 'New Vehicle'}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي السعة (كجم)' : 'Total Capacity (kg)'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCapacity.toLocaleString()}</p>
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
                  placeholder={locale === 'ar' ? 'بحث باللوحة أو النوع...' : 'Search by plate or type...'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الملكية' : 'Ownership'}</label>
                <select value={selectedOwnership} onChange={(e) => setSelectedOwnership(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="owned">{locale === 'ar' ? 'مملوك' : 'Owned'}</option>
                  <option value="leased">{locale === 'ar' ? 'مستأجر' : 'Leased'}</option>
                  <option value="third_party">{locale === 'ar' ? 'طرف ثالث' : 'Third Party'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'اللوحة' : 'Plate'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الملكية' : 'Ownership'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'السعة (كجم)' : 'Capacity (kg)'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.plateNumber}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? v.typeAr : v.type}</td>
                    <td className="px-4 py-3 text-gray-500">{ownershipLabel(v.ownership)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{v.capacityKg.toLocaleString()}</td>
                    <td className="px-4 py-3">{getStatusBadge(v.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(v)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل المركبة' : 'Vehicle Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.plateNumber}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.typeAr : selected.type}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الملكية' : 'Ownership'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{ownershipLabel(selected.ownership)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'السعة (كجم)' : 'Capacity (kg)'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.capacityKg.toLocaleString()}</p>
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

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'مركبة جديدة' : 'New Vehicle'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'رقم اللوحة' : 'Plate Number'} value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} placeholder="RHD-1234" />
            <Input label={locale === 'ar' ? 'السعة (كجم)' : 'Capacity (kg)'} value={formData.capacityKg} onChange={(e) => setFormData({ ...formData, capacityKg: e.target.value })} placeholder="1000" />
            <Input label={locale === 'ar' ? 'النوع (EN)' : 'Type (EN)'} value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} placeholder="Van" />
            <Input label={locale === 'ar' ? 'النوع (AR)' : 'Type (AR)'} value={formData.typeAr} onChange={(e) => setFormData({ ...formData, typeAr: e.target.value })} placeholder={locale === 'ar' ? 'فان' : 'فان'} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الملكية' : 'Ownership'}</label>
              <select value={formData.ownership} onChange={(e) => setFormData({ ...formData, ownership: e.target.value as any })} className="input">
                <option value="owned">{locale === 'ar' ? 'مملوك' : 'Owned'}</option>
                <option value="leased">{locale === 'ar' ? 'مستأجر' : 'Leased'}</option>
                <option value="third_party">{locale === 'ar' ? 'طرف ثالث' : 'Third Party'}</option>
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
