import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';
import { useCurrencies } from '../../hooks/useReferenceData';

interface TenantConfig {
  tenant_name: string;
  tenant_code: string;
  timezone: string;
  locale: string;
  date_format: string;
  number_format: string;
  fiscal_year_start: string;
  currency: string;
  week_starts_on: string;
}

const defaults: TenantConfig = {
  tenant_name: 'Al Hajj Logistics Group',
  tenant_code: 'ALHAJJ',
  timezone: 'Asia/Riyadh',
  locale: 'en-SA',
  date_format: 'DD/MM/YYYY',
  number_format: '1,234.56',
  fiscal_year_start: '01',
  currency: 'SAR',
  week_starts_on: 'sunday',
};

const TIMEZONE_OPTIONS = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Qatar',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago',
  'Asia/Kolkata', 'Asia/Shanghai', 'Pacific/Auckland',
];

const LOCALE_OPTIONS = [
  { value: 'en-SA', label: 'English (Saudi Arabia)' },
  { value: 'ar-SA', label: 'العربية (السعودية)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'ar-AE', label: 'العربية (الإمارات)' },
];

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY'];
const NUMBER_FORMATS = ['1,234.56', '1.234,56', '1 234.56', '1 234,56'];
const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
  { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

function TenantSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { currencies: currencyList } = useCurrencies();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TenantConfig>(defaults);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (!config.tenant_name.trim() || !config.tenant_code.trim()) {
      showToast('error', t('common.requiredFields') || 'Tenant name and code are required');
      return;
    }
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('success', t('common.savedSuccessfully') || 'Tenant settings saved');
    } catch {
      showToast('error', t('common.saveFailed') || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const Select = ({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[] | string[]; onChange: (v: string) => void }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
        {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('settings.tenant') || 'Tenant Settings'} - SLMS</title></Head>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.tenant') || 'Tenant Settings'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.tenantDesc') || 'Configure tenant-wide preferences including timezone, locale, and formatting.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.tenantIdentity') || 'Tenant Identity'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.tenantName') || 'Tenant Name'} <span className="text-red-500">*</span></label>
                  <input value={config.tenant_name} onChange={e => setConfig(p => ({ ...p, tenant_name: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.tenantCode') || 'Tenant Code'} <span className="text-red-500">*</span></label>
                  <input value={config.tenant_code} onChange={e => setConfig(p => ({ ...p, tenant_code: e.target.value.toUpperCase() }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.regionalization') || 'Regionalization'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label={t('settings.timezone') || 'Timezone'} value={config.timezone} options={TIMEZONE_OPTIONS} onChange={v => setConfig(p => ({ ...p, timezone: v }))} />
                <Select label={t('settings.locale') || 'Locale'} value={config.locale} options={LOCALE_OPTIONS} onChange={v => setConfig(p => ({ ...p, locale: v }))} />
                <Select label={t('settings.currency') || 'Default Currency'} value={config.currency} options={currencyList.map(c => c.code)} onChange={v => setConfig(p => ({ ...p, currency: v }))} />
                <Select label={t('settings.weekStartsOn') || 'Week Starts On'} value={config.week_starts_on} options={[{ value: 'sunday', label: 'Sunday' }, { value: 'monday', label: 'Monday' }, { value: 'saturday', label: 'Saturday' }]} onChange={v => setConfig(p => ({ ...p, week_starts_on: v }))} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.formatting') || 'Formatting'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label={t('settings.dateFormat') || 'Date Format'} value={config.date_format} options={DATE_FORMATS} onChange={v => setConfig(p => ({ ...p, date_format: v }))} />
                <Select label={t('settings.numberFormat') || 'Number Format'} value={config.number_format} options={NUMBER_FORMATS} onChange={v => setConfig(p => ({ ...p, number_format: v }))} />
                <Select label={t('settings.fiscalYearStart') || 'Fiscal Year Start'} value={config.fiscal_year_start} options={MONTHS} onChange={v => setConfig(p => ({ ...p, fiscal_year_start: v }))} />
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

export default withPermission('system_policies:view', TenantSettingsPage);
