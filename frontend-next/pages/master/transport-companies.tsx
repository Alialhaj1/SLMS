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
  PhoneIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type TransportCompanyStatus = 'active' | 'inactive' | 'suspended';

interface TransportCompany {
  id: number;
  name: string;
  nameAr: string;
  contact: string;
  contactAr: string;
  phone: string;
  licenseNo: string;
  serviceArea: string;
  serviceAreaAr: string;
  status: TransportCompanyStatus;
}

const mockCompanies: TransportCompany[] = [
  { id: 1, name: 'Desert Transport', nameAr: 'نقل الصحراء', contact: 'Abdullah Saeed', contactAr: 'عبدالله سعيد', phone: '+966 55 000 1111', licenseNo: 'TR-001122', serviceArea: 'Riyadh / Central', serviceAreaAr: 'الرياض / الوسطى', status: 'active' },
  { id: 2, name: 'Coastal Freight', nameAr: 'شحن الساحل', contact: 'Maha Ali', contactAr: 'مها علي', phone: '+966 55 000 2222', licenseNo: 'TR-004455', serviceArea: 'Jeddah / West', serviceAreaAr: 'جدة / الغربية', status: 'active' },
  { id: 3, name: 'Northern Routes', nameAr: 'مسارات الشمال', contact: 'Khaled Nasser', contactAr: 'خالد ناصر', phone: '+966 55 000 3333', licenseNo: 'TR-009900', serviceArea: 'Dammam / East', serviceAreaAr: 'الدمام / الشرقية', status: 'suspended' },
  { id: 4, name: 'Legacy Carrier', nameAr: 'ناقل قديم', contact: 'Support', contactAr: 'الدعم', phone: '+966 55 000 9999', licenseNo: 'TR-000001', serviceArea: 'All regions', serviceAreaAr: 'كل المناطق', status: 'inactive' },
];

export default function TransportCompaniesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.TransportCompanies.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.TransportCompanies.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.TransportCompanies.Edit]);

  const [items] = useState<TransportCompany[]>(mockCompanies);
  const [selectedStatus, setSelectedStatus] = useState<'all' | TransportCompanyStatus>('all');
  const [selected, setSelected] = useState<TransportCompany | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    contact: '',
    contactAr: '',
    phone: '',
    licenseNo: '',
    serviceArea: '',
    serviceAreaAr: '',
    status: 'active' as TransportCompanyStatus,
  });

  const filtered = useMemo(() => {
    return items.filter(i => selectedStatus === 'all' || i.status === selectedStatus);
  }, [items, selectedStatus]);

  const activeCount = items.filter(i => i.status === 'active').length;
  const suspendedCount = items.filter(i => i.status === 'suspended').length;
  const totalCount = items.length;

  const getStatusBadge = (status: TransportCompanyStatus) => {
    const styles: Record<TransportCompanyStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      suspended: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
    const labels: Record<TransportCompanyStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
      suspended: { en: 'Suspended', ar: 'موقوف' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ name: '', nameAr: '', contact: '', contactAr: '', phone: '', licenseNo: '', serviceArea: '', serviceAreaAr: '', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'شركات النقل - SLMS' : 'Transport Companies - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <TruckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض شركات النقل.' : "You don't have permission to view transport companies."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'شركات النقل - SLMS' : 'Transport Companies - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TruckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'شركات النقل' : 'Transport Companies'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة شركات النقل وتوفرها حسب المنطقة' : 'Manage transport carriers and availability by region'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'شركة جديدة' : 'New Company'}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'موقوف' : 'Suspended'}</p>
            <p className="text-2xl font-bold text-amber-600">{suspendedCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
              <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              <option value="suspended">{locale === 'ar' ? 'موقوف' : 'Suspended'}</option>
            </select>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التواصل' : 'Contact'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الهاتف' : 'Phone'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الترخيص' : 'License'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'منطقة الخدمة' : 'Service area'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locale === 'ar' ? i.nameAr : i.name}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? i.contactAr : i.contact}</td>
                    <td className="px-4 py-3 text-gray-500">{i.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{i.licenseNo}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? i.serviceAreaAr : i.serviceArea}</td>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الشركة' : 'Company Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{locale === 'ar' ? selected.nameAr : selected.name}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.serviceAreaAr : selected.serviceArea}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'جهة الاتصال' : 'Contact'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.contactAr : selected.contact}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الهاتف' : 'Phone'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.phone}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'رقم الترخيص' : 'License no.'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.licenseNo}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الحالة' : 'Status'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.status === 'active' ? (locale === 'ar' ? 'نشط' : 'Active') : selected.status === 'inactive' ? (locale === 'ar' ? 'غير نشط' : 'Inactive') : (locale === 'ar' ? 'موقوف' : 'Suspended')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              {canEdit && (
                <>
                  <Button onClick={() => showToast(locale === 'ar' ? 'تم التفعيل (تجريبي)' : 'Activated (demo)', 'success')}>
                    <CheckCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'تفعيل' : 'Activate'}
                  </Button>
                  <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإيقاف (تجريبي)' : 'Suspended (demo)', 'error')}>
                    <XCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'إيقاف' : 'Suspend'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'شركة نقل جديدة' : 'New Transport Company'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'التواصل (EN)' : 'Contact (EN)'} value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
            <Input label={locale === 'ar' ? 'التواصل (AR)' : 'Contact (AR)'} value={formData.contactAr} onChange={(e) => setFormData({ ...formData, contactAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'الهاتف' : 'Phone'} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+966 ..." />
            <Input label={locale === 'ar' ? 'رقم الترخيص' : 'License no.'} value={formData.licenseNo} onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })} placeholder="TR-..." />
            <Input label={locale === 'ar' ? 'منطقة الخدمة (EN)' : 'Service area (EN)'} value={formData.serviceArea} onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })} placeholder="Riyadh / Central" />
            <Input label={locale === 'ar' ? 'منطقة الخدمة (AR)' : 'Service area (AR)'} value={formData.serviceAreaAr} onChange={(e) => setFormData({ ...formData, serviceAreaAr: e.target.value })} placeholder="الرياض / الوسطى" />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                <option value="suspended">{locale === 'ar' ? 'موقوف' : 'Suspended'}</option>
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
