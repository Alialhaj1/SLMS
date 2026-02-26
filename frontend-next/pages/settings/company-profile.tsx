import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface CompanyProfile {
  name: string;
  name_ar: string;
  tax_id: string;
  registration_number: string;
  industry: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
}

const defaults: CompanyProfile = {
  name: 'Al Hajj International Logistics',
  name_ar: 'الحاج الدولية للخدمات اللوجستية',
  tax_id: '300000000000003',
  registration_number: 'CR-12345678',
  industry: 'logistics',
  address: '123 King Fahd Road',
  city: 'Jeddah',
  country: 'Saudi Arabia',
  postal_code: '21589',
  phone: '+966-12-123-4567',
  email: 'info@alhajj.com',
  website: 'https://alhajj.com',
  logo_url: '',
};

const INDUSTRY_OPTIONS = [
  { value: 'logistics', label: 'Logistics & Shipping' },
  { value: 'freight', label: 'Freight Forwarding' },
  { value: 'customs', label: 'Customs Brokerage' },
  { value: 'warehousing', label: 'Warehousing' },
  { value: 'trading', label: 'Trading' },
  { value: 'other', label: 'Other' },
];

function CompanyProfileSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!profile.name.trim()) e.name = t('common.required') || 'Required';
    if (!profile.tax_id.trim()) e.tax_id = t('common.required') || 'Required';
    if (!profile.email.trim()) e.email = t('common.required') || 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) e.email = t('common.invalidEmail') || 'Invalid email';
    if (profile.website && !/^https?:\/\/.+/.test(profile.website)) e.website = t('common.invalidUrl') || 'Invalid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('success', t('common.savedSuccessfully') || 'Company profile saved');
    } catch {
      showToast('error', t('common.saveFailed') || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, field, required, type = 'text', placeholder }: { label: string; field: keyof CompanyProfile; required?: boolean; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input
        type={type}
        value={profile[field]}
        onChange={e => { setProfile(p => ({ ...p, [field]: e.target.value })); if (errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n; }); }}
        placeholder={placeholder}
        className={`w-full rounded border ${errors[field] ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm`}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('settings.companyProfile') || 'Company Profile'} - SLMS</title></Head>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.companyProfile') || 'Company Profile'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.companyProfileDesc') || 'Manage your company information, tax ID, and contact details.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.basicInfo') || 'Basic Information'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('settings.companyName') || 'Company Name'} field="name" required />
                <Field label={t('settings.companyNameAr') || 'Company Name (Arabic)'} field="name_ar" />
                <Field label={t('settings.taxId') || 'Tax ID / VAT Number'} field="tax_id" required />
                <Field label={t('settings.registrationNumber') || 'Registration Number'} field="registration_number" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.industry') || 'Industry'}</label>
                  <select value={profile.industry} onChange={e => setProfile(p => ({ ...p, industry: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <Field label={t('settings.logoUrl') || 'Logo URL'} field="logo_url" placeholder="https://..." />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.addressInfo') || 'Address'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Field label={t('settings.address') || 'Street Address'} field="address" />
                </div>
                <Field label={t('settings.city') || 'City'} field="city" />
                <Field label={t('settings.country') || 'Country'} field="country" />
                <Field label={t('settings.postalCode') || 'Postal Code'} field="postal_code" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.contactInfo') || 'Contact Information'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('settings.phone') || 'Phone'} field="phone" type="tel" />
                <Field label={t('settings.email') || 'Email'} field="email" type="email" required />
                <Field label={t('settings.website') || 'Website'} field="website" type="url" placeholder="https://..." />
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
                {saving ? (t('common.saving') || 'Saving...') : (t('common.saveChanges') || 'Save Changes')}
              </button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('companies:view', CompanyProfileSettingsPage);
