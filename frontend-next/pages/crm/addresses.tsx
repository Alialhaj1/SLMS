import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  MapPinIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type AddressStatus = 'active' | 'inactive';
type AddressType = 'billing' | 'shipping' | 'both';

interface CustomerAddress {
  id: number;
  customer: string;
  customerAr: string;
  label: string;
  labelAr: string;
  type: AddressType;
  city: string;
  cityAr: string;
  country: string;
  status: AddressStatus;
  isDefault: boolean;
}

const mockAddresses: CustomerAddress[] = [
  { id: 1, customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', label: 'HQ - Riyadh', labelAr: 'المقر - الرياض', type: 'both', city: 'Riyadh', cityAr: 'الرياض', country: 'Saudi Arabia', status: 'active', isDefault: true },
  { id: 2, customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', label: 'Warehouse - Dammam', labelAr: 'مستودع - الدمام', type: 'shipping', city: 'Dammam', cityAr: 'الدمام', country: 'Saudi Arabia', status: 'active', isDefault: false },
  { id: 3, customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', label: 'Billing Office', labelAr: 'مكتب الفوترة', type: 'billing', city: 'Jeddah', cityAr: 'جدة', country: 'Saudi Arabia', status: 'active', isDefault: true },
  { id: 4, customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', label: 'Old Address', labelAr: 'عنوان قديم', type: 'shipping', city: 'Riyadh', cityAr: 'الرياض', country: 'Saudi Arabia', status: 'inactive', isDefault: false },
];

export default function CustomerAddressesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [addresses] = useState<CustomerAddress[]>(mockAddresses);
  const [selectedStatus, setSelectedStatus] = useState<'all' | AddressStatus>('all');
  const [selectedType, setSelectedType] = useState<'all' | AddressType>('all');
  const [selected, setSelected] = useState<CustomerAddress | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    customerAr: '',
    label: '',
    labelAr: '',
    type: 'shipping' as AddressType,
    city: '',
    cityAr: '',
    country: 'Saudi Arabia',
    status: 'active' as AddressStatus,
    isDefault: false,
  });

  const filtered = useMemo(() => {
    return addresses.filter(a => {
      const sOk = selectedStatus === 'all' || a.status === selectedStatus;
      const tOk = selectedType === 'all' || a.type === selectedType;
      return sOk && tOk;
    });
  }, [addresses, selectedStatus, selectedType]);

  const getStatusBadge = (status: AddressStatus) => {
    const styles: Record<AddressStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<AddressStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const getTypeBadge = (type: AddressType) => {
    const styles: Record<AddressType, string> = {
      billing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      shipping: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      both: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    };
    const labels: Record<AddressType, { en: string; ar: string }> = {
      billing: { en: 'Billing', ar: 'فوترة' },
      shipping: { en: 'Shipping', ar: 'شحن' },
      both: { en: 'Both', ar: 'كلاهما' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[type])}>
        {locale === 'ar' ? labels[type].ar : labels[type].en}
      </span>
    );
  };

  const customerCount = new Set(addresses.map(a => a.customer)).size;
  const activeCount = addresses.filter(a => a.status === 'active').length;
  const defaultCount = addresses.filter(a => a.isDefault).length;
  const citiesCount = new Set(addresses.map(a => a.city)).size;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الحفظ (تجريبي)' : 'Saved (demo)', 'success');
    setCreateOpen(false);
    setFormData({
      customer: '',
      customerAr: '',
      label: '',
      labelAr: '',
      type: 'shipping',
      city: '',
      cityAr: '',
      country: 'Saudi Arabia',
      status: 'active',
      isDefault: false,
    });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'عناوين العملاء - SLMS' : 'Customer Addresses - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'عناوين العملاء' : 'Customer Addresses'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة عناوين الشحن والفوترة الافتراضية للعملاء' : 'Manage customer billing/shipping addresses and defaults'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'عنوان جديد' : 'New Address'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><BuildingOffice2Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'العملاء' : 'Customers'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{customerCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'النشطة' : 'Active'}</p>
                <p className="text-xl font-semibold text-green-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"><MapPinIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الافتراضية' : 'Default'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{defaultCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><MapPinIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المدن' : 'Cities'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{citiesCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
                <option value="billing">{locale === 'ar' ? 'فوترة' : 'Billing'}</option>
                <option value="shipping">{locale === 'ar' ? 'شحن' : 'Shipping'}</option>
                <option value="both">{locale === 'ar' ? 'كلاهما' : 'Both'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Label'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المدينة' : 'City'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'افتراضي' : 'Default'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? a.customerAr : a.customer}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{locale === 'ar' ? a.labelAr : a.label}</p>
                      <p className="text-xs text-gray-500">{a.country}</p>
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(a.type)}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? a.cityAr : a.city}</td>
                    <td className="px-4 py-3">{getStatusBadge(a.status)}</td>
                    <td className="px-4 py-3 text-center">
                      {a.isDefault ? <CheckCircleIcon className="h-5 w-5 text-green-600 inline" /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(a)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل (تجريبي)' : 'Edit (demo)', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل العنوان' : 'Address Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{locale === 'ar' ? selected.customerAr : selected.customer}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.labelAr : selected.label}</p>
              </div>
              <div className="flex items-center gap-2">
                {getTypeBadge(selected.type)}
                {getStatusBadge(selected.status)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المدينة' : 'City'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.cityAr : selected.city}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الدولة' : 'Country'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.country}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'افتراضي' : 'Default'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.isDefault ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No')}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? (selected.type === 'billing' ? 'فوترة' : selected.type === 'shipping' ? 'شحن' : 'كلاهما') : selected.type}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التعيين كافتراضي (تجريبي)' : 'Set as default (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تعيين افتراضي' : 'Set Default'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم التعطيل (تجريبي)' : 'Deactivated (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تعطيل' : 'Deactivate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'عنوان جديد' : 'New Address'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'العميل (EN)' : 'Customer (EN)'} value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} />
            <Input label={locale === 'ar' ? 'العميل (AR)' : 'Customer (AR)'} value={formData.customerAr} onChange={(e) => setFormData({ ...formData, customerAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'الوصف (EN)' : 'Label (EN)'} value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} />
            <Input label={locale === 'ar' ? 'الوصف (AR)' : 'Label (AR)'} value={formData.labelAr} onChange={(e) => setFormData({ ...formData, labelAr: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} className="input">
                <option value="billing">{locale === 'ar' ? 'فوترة' : 'Billing'}</option>
                <option value="shipping">{locale === 'ar' ? 'شحن' : 'Shipping'}</option>
                <option value="both">{locale === 'ar' ? 'كلاهما' : 'Both'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'المدينة (EN)' : 'City (EN)'} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            <Input label={locale === 'ar' ? 'المدينة (AR)' : 'City (AR)'} value={formData.cityAr} onChange={(e) => setFormData({ ...formData, cityAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'الدولة' : 'Country'} value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.isDefault} onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })} />
              <span className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'عنوان افتراضي' : 'Default address'}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
