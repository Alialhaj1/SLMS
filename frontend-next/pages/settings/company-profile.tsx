import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';
import { companyStore } from '../../lib/companyStore';
import { BuildingOffice2Icon, InformationCircleIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

interface CompanyProfile {
  id?: number;
  code?: string;
  name: string;
  name_ar: string;
  legal_name?: string;
  tax_number: string;
  registration_number: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url?: string;
  currency?: string;
  is_active?: boolean;
  created_at?: string;
  branches_count?: number;
}

function CompanyProfileSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [formData, setFormData] = useState<Partial<CompanyProfile>>({});
  const isTenantUser = !!(user as any)?.tenant_id;

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId();
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (companyId) headers['X-Company-Id'] = String(companyId);
    return headers;
  }, []);

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      // First get the list of companies for this tenant, then fetch first one
      const res = await fetch(`${API_BASE}/companies?limit=1&page=1`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch company');
      const data = await res.json();
      const companies = data.data || [];
      if (companies.length > 0) {
        // Fetch full details
        const detailRes = await fetch(`${API_BASE}/companies/${companies[0].id}`, { headers: authHeaders() });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setProfile(detail.data || detail);
        } else {
          setProfile(companies[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching company:', err);
      showToast('error', t('common.loadFailed') || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, showToast, t]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  const startEditing = () => {
    if (!profile) return;
    setFormData({
      name: profile.name,
      name_ar: profile.name_ar,
      legal_name: profile.legal_name,
      tax_number: profile.tax_number,
      registration_number: profile.registration_number,
      address: profile.address,
      city: profile.city,
      country: profile.country,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      logo_url: profile.logo_url,
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFormData({});
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/companies/${profile.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Failed to save');
      }
      showToast('success', t('common.savedSuccessfully') || 'Saved successfully');
      setEditing(false);
      await fetchCompany();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save company profile');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof CompanyProfile) => (
    <input
      className="w-full text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 border border-blue-300 dark:border-blue-500 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={(formData[key] as string) ?? ''}
      onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
    />
  );

  const ReadOnlyField = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</label>
      <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 min-h-[38px]">
        {value || <span className="text-gray-400 italic">{t('common.notSet') || '—'}</span>}
      </div>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('settings.companyProfile.title', 'Company Profile')} - SLMS</title></Head>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BuildingOffice2Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.companyProfile.title', 'Company Profile')}</h1>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {isTenantUser
                ? t('settings.companyProfile.readOnly', 'View your company information. Contact your platform administrator to make changes.')
                : t('settings.companyProfile.subtitle', 'View your company information and contact details.')}
            </p>
          </div>
          </div>
          {!isTenantUser && profile && !editing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              {t('common.edit') || 'Edit'}
            </button>
          )}
          {editing && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <CheckIcon className="w-4 h-4" />
                {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </button>
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          )}
        </div>

        {/* Info banner for tenant users */}
        {isTenantUser && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('settings.companyProfile.readOnlyNotice', 'Company information is managed by your platform administrator. If you need changes, please contact support.')}
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : !profile ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow">
            <BuildingOffice2Icon className="mx-auto w-12 h-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">{t('common.noData') || 'No company information found.'}</p>
          </div>
        ) : (
          <>
            {/* Company Code & Status */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.basicInfo') || 'Basic Information'}</h2>
                <div className="flex items-center gap-2">
                  {profile.code && (
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {profile.code}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    profile.is_active !== false
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {profile.is_active !== false ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editing ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.companyName') || 'Company Name'}</label>
                      {field('name')}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.companyNameAr') || 'Company Name (Arabic)'}</label>
                      {field('name_ar')}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.legalName') || 'Legal Name'}</label>
                      {field('legal_name')}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.taxId') || 'Tax ID / VAT Number'}</label>
                      {field('tax_number')}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.registrationNumber') || 'Registration Number'}</label>
                      {field('registration_number')}
                    </div>
                    <ReadOnlyField label={t('settings.currency') || 'Currency'} value={profile.currency} />
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.logoUrl') || 'Logo URL'}</label>
                      {field('logo_url')}
                      {formData.logo_url && (
                        <img src={formData.logo_url} alt="Logo preview" className="mt-2 h-12 object-contain rounded border border-gray-200 dark:border-gray-600 p-1" onError={e => (e.currentTarget.style.display = 'none')} />
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <ReadOnlyField label={t('settings.companyName') || 'Company Name'} value={profile.name} />
                    <ReadOnlyField label={t('settings.companyNameAr') || 'Company Name (Arabic)'} value={profile.name_ar} />
                    <ReadOnlyField label={t('settings.legalName') || 'Legal Name'} value={profile.legal_name} />
                    <ReadOnlyField label={t('settings.taxId') || 'Tax ID / VAT Number'} value={profile.tax_number} />
                    <ReadOnlyField label={t('settings.registrationNumber') || 'Registration Number'} value={profile.registration_number} />
                    <ReadOnlyField label={t('settings.currency') || 'Currency'} value={profile.currency} />
                    {profile.logo_url && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.logo') || 'Logo'}</label>
                        <img src={profile.logo_url} alt="Company Logo" className="h-16 object-contain rounded border border-gray-200 dark:border-gray-600 p-1" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.addressInfo') || 'Address'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editing ? (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.address') || 'Street Address'}</label>
                      {field('address')}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.city') || 'City'}</label>
                      {field('city')}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.country') || 'Country'}</label>
                      {field('country')}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="md:col-span-2">
                      <ReadOnlyField label={t('settings.address') || 'Street Address'} value={profile.address} />
                    </div>
                    <ReadOnlyField label={t('settings.city') || 'City'} value={profile.city} />
                    <ReadOnlyField label={t('settings.country') || 'Country'} value={profile.country} />
                  </>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.contactInfo') || 'Contact Information'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editing ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.phone') || 'Phone'}</label>
                      {field('phone')}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.email') || 'Email'}</label>
                      {field('email')}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{t('settings.website') || 'Website'}</label>
                      {field('website')}
                    </div>
                  </>
                ) : (
                  <>
                    <ReadOnlyField label={t('settings.phone') || 'Phone'} value={profile.phone} />
                    <ReadOnlyField label={t('settings.email') || 'Email'} value={profile.email} />
                    <ReadOnlyField label={t('settings.website') || 'Website'} value={profile.website} />
                    {profile.branches_count !== undefined && (
                      <ReadOnlyField label={t('settings.branches') || 'Branches'} value={profile.branches_count} />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Metadata */}
            {profile.created_at && (
              <div className="text-xs text-gray-400 dark:text-gray-500 text-right">
                {t('common.createdAt') || 'Created'}: {new Date(profile.created_at).toLocaleDateString()}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('companies:view', CompanyProfileSettingsPage);
