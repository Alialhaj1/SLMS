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
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type BoLStatus = 'active' | 'inactive';
type BoLMode = 'sea' | 'air' | 'road' | 'rail' | 'multimodal';
type BoLKind = 'master' | 'house' | 'other';

interface BillOfLadingType {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  mode: BoLMode;
  kind: BoLKind;
  status: BoLStatus;
}

const mockTypes: BillOfLadingType[] = [
  { id: 1, code: 'MBL-SEA', name: 'Master B/L (Sea)', nameAr: 'بوليصة رئيسية (بحري)', mode: 'sea', kind: 'master', status: 'active' },
  { id: 2, code: 'HBL-SEA', name: 'House B/L (Sea)', nameAr: 'بوليصة فرعية (بحري)', mode: 'sea', kind: 'house', status: 'active' },
  { id: 3, code: 'AWB', name: 'Air Waybill', nameAr: 'بوليصة شحن جوي', mode: 'air', kind: 'other', status: 'inactive' },
];

export default function BillOfLadingTypesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.BillOfLadingTypes.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.BillOfLadingTypes.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.BillOfLadingTypes.Edit]);

  const [items] = useState<BillOfLadingType[]>(mockTypes);
  const [selectedStatus, setSelectedStatus] = useState<'all' | BoLStatus>('all');
  const [selectedMode, setSelectedMode] = useState<'all' | BoLMode>('all');
  const [selectedKind, setSelectedKind] = useState<'all' | BoLKind>('all');
  const [selected, setSelected] = useState<BillOfLadingType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    mode: 'sea' as BoLMode,
    kind: 'master' as BoLKind,
    status: 'active' as BoLStatus,
  });

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const modeLabel = (mode: BoLMode) => {
    const labels: Record<BoLMode, { en: string; ar: string }> = {
      sea: { en: 'Sea', ar: 'بحري' },
      air: { en: 'Air', ar: 'جوي' },
      road: { en: 'Road', ar: 'بري' },
      rail: { en: 'Rail', ar: 'سكك' },
      multimodal: { en: 'Multimodal', ar: 'متعدد الوسائط' },
    };
    return locale === 'ar' ? labels[mode].ar : labels[mode].en;
  };

  const kindLabel = (kind: BoLKind) => {
    const labels: Record<BoLKind, { en: string; ar: string }> = {
      master: { en: 'Master', ar: 'رئيسية' },
      house: { en: 'House', ar: 'فرعية' },
      other: { en: 'Other', ar: 'أخرى' },
    };
    return locale === 'ar' ? labels[kind].ar : labels[kind].en;
  };

  const getStatusBadge = (status: BoLStatus) => {
    const styles: Record<BoLStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<BoLStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const sOk = selectedStatus === 'all' || i.status === selectedStatus;
      const mOk = selectedMode === 'all' || i.mode === selectedMode;
      const kOk = selectedKind === 'all' || i.kind === selectedKind;
      return sOk && mOk && kOk;
    });
  }, [items, selectedStatus, selectedMode, selectedKind]);

  const totalCount = items.length;
  const activeCount = items.filter(i => i.status === 'active').length;
  const modeCount = new Set(items.map(i => i.mode)).size;

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ code: '', name: '', nameAr: '', mode: 'sea', kind: 'master', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'أنواع بوليصة الشحن - SLMS' : 'Bill of Lading Types - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض أنواع بوليصة الشحن.' : "You don't have permission to view bill of lading types."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'أنواع بوليصة الشحن - SLMS' : 'Bill of Lading Types - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'أنواع بوليصة الشحن' : 'Bill of Lading Types'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تحديد أنواع البوالص حسب وسيلة النقل' : 'Define B/L types by transport mode'}</p>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'وسائل النقل' : 'Modes'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{modeCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الوسائل' : 'All modes'}</option>
                <option value="sea">{locale === 'ar' ? 'بحري' : 'Sea'}</option>
                <option value="air">{locale === 'ar' ? 'جوي' : 'Air'}</option>
                <option value="road">{locale === 'ar' ? 'بري' : 'Road'}</option>
                <option value="rail">{locale === 'ar' ? 'سكك' : 'Rail'}</option>
                <option value="multimodal">{locale === 'ar' ? 'متعدد الوسائط' : 'Multimodal'}</option>
              </select>
              <select value={selectedKind} onChange={(e) => setSelectedKind(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All kinds'}</option>
                <option value="master">{locale === 'ar' ? 'رئيسية' : 'Master'}</option>
                <option value="house">{locale === 'ar' ? 'فرعية' : 'House'}</option>
                <option value="other">{locale === 'ar' ? 'أخرى' : 'Other'}</option>
              </select>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوسيلة' : 'Mode'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Kind'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? i.nameAr : i.name}</td>
                    <td className="px-4 py-3 text-gray-500">{modeLabel(i.mode)}</td>
                    <td className="px-4 py-3 text-gray-500">{kindLabel(i.kind)}</td>
                    <td className="px-4 py-3">{getStatusBadge(i.status)}</td>
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
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الوسيلة' : 'Mode'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{modeLabel(selected.mode)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Kind'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{kindLabel(selected.kind)}</p>
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

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'نوع بوليصة جديد' : 'New Bill of Lading Type'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="MBL-SEA" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الوسيلة' : 'Mode'}</label>
              <select value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })} className="input">
                <option value="sea">{locale === 'ar' ? 'بحري' : 'Sea'}</option>
                <option value="air">{locale === 'ar' ? 'جوي' : 'Air'}</option>
                <option value="road">{locale === 'ar' ? 'بري' : 'Road'}</option>
                <option value="rail">{locale === 'ar' ? 'سكك' : 'Rail'}</option>
                <option value="multimodal">{locale === 'ar' ? 'متعدد الوسائط' : 'Multimodal'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Kind'}</label>
              <select value={formData.kind} onChange={(e) => setFormData({ ...formData, kind: e.target.value as any })} className="input">
                <option value="master">{locale === 'ar' ? 'رئيسية' : 'Master'}</option>
                <option value="house">{locale === 'ar' ? 'فرعية' : 'House'}</option>
                <option value="other">{locale === 'ar' ? 'أخرى' : 'Other'}</option>
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
