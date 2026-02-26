import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';

interface PlatformSettings {
  general: {
    system_name: string;
    default_locale: string;
    timezone: string;
  };
  security: {
    session_timeout_minutes: number;
    min_password_length: number;
    require_uppercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    mfa_required: boolean;
  };
  email: {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    from_address: string;
    from_name: string;
  };
  storage: {
    max_upload_size_mb: number;
    allowed_file_types: string;
  };
}

const defaultSettings: PlatformSettings = {
  general: { system_name: 'SLMS', default_locale: 'en', timezone: 'UTC' },
  security: { session_timeout_minutes: 30, min_password_length: 8, require_uppercase: true, require_numbers: true, require_special_chars: false, mfa_required: false },
  email: { smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_address: '', from_name: '' },
  storage: { max_upload_size_mb: 10, allowed_file_types: 'pdf,jpg,png,xlsx,docx' },
};

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://localhost:4000/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch settings');
        const json = await res.json();
        if (json.data) setSettings({ ...defaultSettings, ...json.data });
      } catch (err) {
        showToast('error', t('platform.settings.fetchError') || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      showToast('success', t('platform.settings.saved') || 'Settings saved successfully');
    } catch (err) {
      showToast('error', t('platform.settings.saveError') || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateGeneral = (key: keyof PlatformSettings['general'], value: string) =>
    setSettings((s) => ({ ...s, general: { ...s.general, [key]: value } }));
  const updateSecurity = (key: keyof PlatformSettings['security'], value: string | number | boolean) =>
    setSettings((s) => ({ ...s, security: { ...s.security, [key]: value } }));
  const updateEmail = (key: keyof PlatformSettings['email'], value: string | number) =>
    setSettings((s) => ({ ...s, email: { ...s.email, [key]: value } }));
  const updateStorage = (key: keyof PlatformSettings['storage'], value: string | number) =>
    setSettings((s) => ({ ...s, storage: { ...s.storage, [key]: value } }));

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  const SkeletonCard = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-2" />
            <div className="h-9 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <MainLayout>
        <Head><title>{t('platform.settings.title') || 'Platform Settings'} - SLMS</title></Head>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{t('platform.settings.title') || 'Platform Settings'} - SLMS</title>
      </Head>

      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('platform.settings.title') || 'Platform Settings'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('platform.settings.subtitle') || 'Configure system-wide settings'}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {saving ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : null}
            {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save Settings')}
          </button>
        </div>

        {/* General Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Cog6ToothIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('platform.settings.general') || 'General Settings'}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>{t('platform.settings.systemName') || 'System Name'}</label>
              <input type="text" value={settings.general.system_name} onChange={(e) => updateGeneral('system_name', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('platform.settings.defaultLocale') || 'Default Locale'}</label>
              <select value={settings.general.default_locale} onChange={(e) => updateGeneral('default_locale', e.target.value)} className={inputClass}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('platform.settings.timezone') || 'Timezone'}</label>
              <select value={settings.general.timezone} onChange={(e) => updateGeneral('timezone', e.target.value)} className={inputClass}>
                <option value="UTC">UTC</option>
                <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
                <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                <option value="Europe/London">Europe/London (UTC+0/+1)</option>
                <option value="America/New_York">America/New_York (UTC-5/-4)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('platform.settings.security') || 'Security Settings'}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('platform.settings.sessionTimeout') || 'Session Timeout (minutes)'}</label>
              <input type="number" min={5} max={1440} value={settings.security.session_timeout_minutes} onChange={(e) => updateSecurity('session_timeout_minutes', Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('platform.settings.minPasswordLength') || 'Min Password Length'}</label>
              <input type="number" min={6} max={128} value={settings.security.min_password_length} onChange={(e) => updateSecurity('min_password_length', Number(e.target.value))} className={inputClass} />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-6 pt-2">
              {([
                ['require_uppercase', 'Require Uppercase'],
                ['require_numbers', 'Require Numbers'],
                ['require_special_chars', 'Require Special Characters'],
                ['mfa_required', 'Require MFA'],
              ] as const).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security[key] as boolean}
                    onChange={(e) => updateSecurity(key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {t(`platform.settings.${key}`) || label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <EnvelopeIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('platform.settings.email') || 'Email Settings'}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('platform.settings.smtpHost') || 'SMTP Host'}</label>
              <input type="text" value={settings.email.smtp_host} onChange={(e) => updateEmail('smtp_host', e.target.value)} placeholder="smtp.example.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('platform.settings.smtpPort') || 'SMTP Port'}</label>
              <input type="number" value={settings.email.smtp_port} onChange={(e) => updateEmail('smtp_port', Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('platform.settings.smtpUser') || 'SMTP Username'}</label>
              <input type="text" value={settings.email.smtp_user} onChange={(e) => updateEmail('smtp_user', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('platform.settings.smtpPassword') || 'SMTP Password'}</label>
              <input type="password" value={settings.email.smtp_password} onChange={(e) => updateEmail('smtp_password', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('platform.settings.fromAddress') || 'From Address'}</label>
              <input type="email" value={settings.email.from_address} onChange={(e) => updateEmail('from_address', e.target.value)} placeholder="noreply@example.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('platform.settings.fromName') || 'From Name'}</label>
              <input type="text" value={settings.email.from_name} onChange={(e) => updateEmail('from_name', e.target.value)} placeholder="SLMS System" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Storage Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CloudArrowUpIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('platform.settings.storage') || 'Storage Settings'}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('platform.settings.maxUploadSize') || 'Max Upload Size (MB)'}</label>
              <input type="number" min={1} max={500} value={settings.storage.max_upload_size_mb} onChange={(e) => updateStorage('max_upload_size_mb', Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('platform.settings.allowedFileTypes') || 'Allowed File Types'}</label>
              <input type="text" value={settings.storage.allowed_file_types} onChange={(e) => updateStorage('allowed_file_types', e.target.value)} placeholder="pdf,jpg,png,xlsx" className={inputClass} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('platform.settings.fileTypesHint') || 'Comma-separated extensions'}</p>
            </div>
          </div>
        </div>

        {/* Bottom Save */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save Settings')}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
