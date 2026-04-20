import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import { vendorApi, isVendorAccessError, getVendorErrorMessage } from '../../lib/marketplaceApi';
import {
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function VendorSettings() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    businessNameAr: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    country: '',
    description: '',
    descriptionAr: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIban: '',
    returnPolicy: '',
    returnPolicyAr: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vendorApi.getProfile();
      const data = res?.data || res;
      if (data) {
        setForm({
          businessName: data.business_name || '',
          businessNameAr: data.business_name_ar || '',
          contactEmail: data.contact_email || '',
          contactPhone: data.contact_phone || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || '',
          description: data.description || '',
          descriptionAr: data.description_ar || '',
          bankName: data.bank_name || '',
          bankAccountName: data.bank_account_name || '',
          bankAccountNumber: data.bank_account_number || '',
          bankIban: data.bank_iban || '',
          returnPolicy: data.return_policy || '',
          returnPolicyAr: data.return_policy_ar || '',
        });
      }
    } catch (err: any) {
      if (isVendorAccessError(err)) {
        setVendorError(getVendorErrorMessage(err, isAr));
      } else {
        showToast(isAr ? 'فشل تحميل الملف الشخصي' : 'Failed to load profile', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [isAr, showToast]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await vendorApi.updateProfile({
        businessName: form.businessName,
        businessNameAr: form.businessNameAr,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        address: form.address,
        city: form.city,
        country: form.country,
        description: form.description,
        descriptionAr: form.descriptionAr,
        bankName: form.bankName,
        bankAccountName: form.bankAccountName,
        bankAccountNumber: form.bankAccountNumber,
        bankIban: form.bankIban,
        returnPolicy: form.returnPolicy,
        returnPolicyAr: form.returnPolicyAr,
      });
      showToast(isAr ? 'تم حفظ الإعدادات' : 'Settings saved', 'success');
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل الحفظ' : 'Failed to save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (vendorError) {
    return (
      <MainLayout>
        <Head><title>{isAr ? 'إعدادات البائع' : 'Vendor Settings'}</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{isAr ? 'غير مسموح' : 'Access Denied'}</h2>
            <p className="text-gray-600 dark:text-gray-400">{vendorError}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{isAr ? 'إعدادات البائع' : 'Vendor Settings'}</title></Head>
      <PageHeader
        title="Profile Settings"
        title_ar="إعدادات الملف الشخصي"
        description="Manage your store info and bank details"
        description_ar="إدارة معلومات متجرك وتفاصيل البنك"
        icon={Cog6ToothIcon}
        breadcrumbs={[
          { label: 'Vendor', label_ar: 'البائع', href: '/vendor/dashboard' },
          { label: 'Settings', label_ar: 'الإعدادات' },
        ]}
        actions={[
          {
            id: 'save-settings',
            label: 'Save Changes',
            label_ar: 'حفظ التغييرات',
            onClick: handleSave,
            variant: 'primary',
            loading: saving,
          },
        ]}
      />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Business Info */}
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BuildingStorefrontIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">{isAr ? 'معلومات المتجر' : 'Store Information'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'اسم المتجر (EN)' : 'Business Name (EN)'}</label>
              <input type="text" value={form.businessName} onChange={(e) => update('businessName', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'اسم المتجر (AR)' : 'Business Name (AR)'}</label>
              <input type="text" value={form.businessNameAr} onChange={(e) => update('businessNameAr', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'الوصف (EN)' : 'Description (EN)'}</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'الوصف (AR)' : 'Description (AR)'}</label>
              <textarea value={form.descriptionAr} onChange={(e) => update('descriptionAr', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} dir="rtl" />
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <PhoneIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">{isAr ? 'معلومات الاتصال' : 'Contact Information'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
              <input type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'الهاتف' : 'Phone'}</label>
              <input type="tel" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'العنوان' : 'Address'}</label>
              <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'المدينة' : 'City'}</label>
              <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'الدولة' : 'Country'}</label>
              <input type="text" value={form.country} onChange={(e) => update('country', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BanknotesIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">{isAr ? 'التفاصيل البنكية' : 'Bank Details'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'اسم البنك' : 'Bank Name'}</label>
              <input type="text" value={form.bankName} onChange={(e) => update('bankName', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'اسم صاحب الحساب' : 'Account Name'}</label>
              <input type="text" value={form.bankAccountName} onChange={(e) => update('bankAccountName', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'رقم الحساب' : 'Account Number'}</label>
              <input type="text" value={form.bankAccountNumber} onChange={(e) => update('bankAccountNumber', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'رقم الآيبان' : 'IBAN'}</label>
              <input type="text" value={form.bankIban} onChange={(e) => update('bankIban', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        </section>

        {/* Return Policy */}
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="text-lg font-semibold">{isAr ? 'سياسة الإرجاع' : 'Return Policy'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'سياسة الإرجاع (EN)' : 'Return Policy (EN)'}</label>
              <textarea value={form.returnPolicy} onChange={(e) => update('returnPolicy', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" rows={4} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'سياسة الإرجاع (AR)' : 'Return Policy (AR)'}</label>
              <textarea value={form.returnPolicyAr} onChange={(e) => update('returnPolicyAr', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" rows={4} dir="rtl" />
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
