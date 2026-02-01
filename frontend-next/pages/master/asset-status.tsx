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
  CheckBadgeIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type AssetStatusState = 'active' | 'inactive';
type AssetLifecycle = 'in_service' | 'maintenance' | 'retired' | 'disposed';

interface AssetStatus {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  lifecycle: AssetLifecycle;
  status: AssetStatusState;
}

const mockStatuses: AssetStatus[] = [
  { id: 1, code: 'IN_SERVICE', name: 'In Service', nameAr: 'قيد الخدمة', lifecycle: 'in_service', status: 'active' },
  { id: 2, code: 'MAINT', name: 'Under Maintenance', nameAr: 'تحت الصيانة', lifecycle: 'maintenance', status: 'active' },
  { id: 3, code: 'RETIRED', name: 'Retired', nameAr: 'متقاعد', lifecycle: 'retired', status: 'inactive' },
];

export default function AssetStatusPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.AssetStatus.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.AssetStatus.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.AssetStatus.Edit]);

  const [items] = useState<AssetStatus[]>(mockStatuses);
  const [selectedState, setSelectedState] = useState<'all' | AssetStatusState>('all');
  const [selectedLifecycle, setSelectedLifecycle] = useState<'all' | AssetLifecycle>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AssetStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    lifecycle: 'in_service' as AssetLifecycle,
    status: 'active' as AssetStatusState,
  });

  const lifecycleLabel = (l: AssetLifecycle) => {
    const labels: Record<AssetLifecycle, { en: string; ar: string }> = {
      in_service: { en: 'In Service', ar: 'قيد الخدمة' },
      maintenance: { en: 'Maintenance', ar: 'صيانة' },
      retired: { en: 'Retired', ar: 'متقاعد' },
      disposed: { en: 'Disposed', ar: 'تم التخلص' },
    };
    return locale === 'ar' ? labels[l].ar : labels[l].en;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const sOk = selectedState === 'all' || i.status === selectedState;
      const lOk = selectedLifecycle === 'all' || i.lifecycle === selectedLifecycle;
      const qOk =
        !q ||
        i.code.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.nameAr.toLowerCase().includes(q);
      return sOk && lOk && qOk;
    });
  }, [items, selectedState, selectedLifecycle, search]);

  const totalCount = items.length;
  const activeCount = items.filter((i) => i.status === 'active').length;
  const inServiceCount = items.filter((i) => i.lifecycle === 'in_service').length;

  const getStateBadge = (state: AssetStatusState) => {
    const styles: Record<AssetStatusState, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<AssetStatusState, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[state])}>
        {locale === 'ar' ? labels[state].ar : labels[state].en}
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
    setFormData({ code: '', name: '', nameAr: '', lifecycle: 'in_service', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'حالات الأصول - SLMS' : 'Asset Status - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <CheckBadgeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض حالات الأصول.' : "You don't have permission to view asset statuses."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'حالات الأصول - SLMS' : 'Asset Status - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckBadgeIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'حالات الأصول' : 'Asset Status'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة دورة حياة الأصول' : 'Manage asset lifecycle statuses'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'حالة جديدة' : 'New Status'}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد الخدمة' : 'In Service'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{inServiceCount}</p>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'دورة الحياة' : 'Lifecycle'}</label>
                <select value={selectedLifecycle} onChange={(e) => setSelectedLifecycle(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="in_service">{locale === 'ar' ? 'قيد الخدمة' : 'In Service'}</option>
                  <option value="maintenance">{locale === 'ar' ? 'صيانة' : 'Maintenance'}</option>
                  <option value="retired">{locale === 'ar' ? 'متقاعد' : 'Retired'}</option>
                  <option value="disposed">{locale === 'ar' ? 'تم التخلص' : 'Disposed'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select value={selectedState} onChange={(e) => setSelectedState(e.target.value as any)} className="input">
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'دورة الحياة' : 'Lifecycle'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? i.nameAr : i.name}</td>
                    <td className="px-4 py-3 text-gray-500">{lifecycleLabel(i.lifecycle)}</td>
                    <td className="px-4 py-3">{getStateBadge(i.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(i)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الحالة' : 'Status Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.nameAr : selected.name}</p>
              </div>
              {getStateBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'دورة الحياة' : 'Lifecycle'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{lifecycleLabel(selected.lifecycle)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الحالة' : 'Status'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.status === 'active' ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}</p>
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

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'حالة أصل جديدة' : 'New Asset Status'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="IN_SERVICE" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'دورة الحياة' : 'Lifecycle'}</label>
              <select value={formData.lifecycle} onChange={(e) => setFormData({ ...formData, lifecycle: e.target.value as any })} className="input">
                <option value="in_service">{locale === 'ar' ? 'قيد الخدمة' : 'In Service'}</option>
                <option value="maintenance">{locale === 'ar' ? 'صيانة' : 'Maintenance'}</option>
                <option value="retired">{locale === 'ar' ? 'متقاعد' : 'Retired'}</option>
                <option value="disposed">{locale === 'ar' ? 'تم التخلص' : 'Disposed'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <div className="sm:col-span-2">
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
