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
  RectangleGroupIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type VehicleTypeStatus = 'active' | 'inactive';
type VehicleMode = 'road' | 'sea' | 'air' | 'rail';

interface VehicleType {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  mode: VehicleMode;
  defaultCapacityKg: number;
  status: VehicleTypeStatus;
}

const mockVehicleTypes: VehicleType[] = [
  { id: 1, code: 'TRUCK_FLAT', name: 'Truck (Flatbed)', nameAr: 'شاحنة (سطحة)', mode: 'road', defaultCapacityKg: 18000, status: 'active' },
  { id: 2, code: 'VAN', name: 'Van', nameAr: 'فان', mode: 'road', defaultCapacityKg: 2500, status: 'active' },
  { id: 3, code: 'FORKLIFT', name: 'Forklift', nameAr: 'رافعة شوكية', mode: 'road', defaultCapacityKg: 1500, status: 'inactive' },
];

export default function VehicleTypesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.VehicleTypes.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.VehicleTypes.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.VehicleTypes.Edit]);

  const [items] = useState<VehicleType[]>(mockVehicleTypes);
  const [selectedStatus, setSelectedStatus] = useState<'all' | VehicleTypeStatus>('all');
  const [selectedMode, setSelectedMode] = useState<'all' | VehicleMode>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<VehicleType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    mode: 'road' as VehicleMode,
    defaultCapacityKg: '1000',
    status: 'active' as VehicleTypeStatus,
  });

  const modeLabel = (m: VehicleMode) => {
    const labels: Record<VehicleMode, { en: string; ar: string }> = {
      road: { en: 'Road', ar: 'بري' },
      sea: { en: 'Sea', ar: 'بحري' },
      air: { en: 'Air', ar: 'جوي' },
      rail: { en: 'Rail', ar: 'سكك' },
    };
    return locale === 'ar' ? labels[m].ar : labels[m].en;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((t) => {
      const sOk = selectedStatus === 'all' || t.status === selectedStatus;
      const mOk = selectedMode === 'all' || t.mode === selectedMode;
      const qOk =
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.nameAr.toLowerCase().includes(q);
      return sOk && mOk && qOk;
    });
  }, [items, selectedStatus, selectedMode, search]);

  const totalCount = items.length;
  const activeCount = items.filter((i) => i.status === 'active').length;
  const avgCap = items.length ? Math.round((items.reduce((s, i) => s + i.defaultCapacityKg, 0) / items.length) * 10) / 10 : 0;

  const getStatusBadge = (status: VehicleTypeStatus) => {
    const styles: Record<VehicleTypeStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<VehicleTypeStatus, { en: string; ar: string }> = {
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
    setFormData({ code: '', name: '', nameAr: '', mode: 'road', defaultCapacityKg: '1000', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'أنواع المركبات - SLMS' : 'Vehicle Types - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <RectangleGroupIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض أنواع المركبات.' : "You don't have permission to view vehicle types."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'أنواع المركبات - SLMS' : 'Vehicle Types - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <RectangleGroupIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'أنواع المركبات' : 'Vehicle Types'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قوالب لأنواع المركبات والسعات الافتراضية' : 'Templates for vehicle types and default capacities'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'نوع جديد' : 'New Type'}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط السعة (كجم)' : 'Avg. Capacity (kg)'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgCap.toLocaleString()}</p>
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
                  placeholder={locale === 'ar' ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوضع' : 'Mode'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'السعة الافتراضية (كجم)' : 'Default Capacity (kg)'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? t.nameAr : t.name}</td>
                    <td className="px-4 py-3 text-gray-500">{modeLabel(t.mode)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{t.defaultCapacityKg.toLocaleString()}</td>
                    <td className="px-4 py-3">{getStatusBadge(t.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(t)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل النوع' : 'Type Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.nameAr : selected.name}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الوضع' : 'Mode'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{modeLabel(selected.mode)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'السعة الافتراضية (كجم)' : 'Default Capacity (kg)'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.defaultCapacityKg.toLocaleString()}</p>
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

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'نوع مركبة جديد' : 'New Vehicle Type'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="VAN" />
            <Input label={locale === 'ar' ? 'السعة الافتراضية (كجم)' : 'Default Capacity (kg)'} value={formData.defaultCapacityKg} onChange={(e) => setFormData({ ...formData, defaultCapacityKg: e.target.value })} placeholder="1000" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الوضع' : 'Mode'}</label>
              <select value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })} className="input">
                <option value="road">{locale === 'ar' ? 'بري' : 'Road'}</option>
                <option value="sea">{locale === 'ar' ? 'بحري' : 'Sea'}</option>
                <option value="air">{locale === 'ar' ? 'جوي' : 'Air'}</option>
                <option value="rail">{locale === 'ar' ? 'سكك' : 'Rail'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
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
