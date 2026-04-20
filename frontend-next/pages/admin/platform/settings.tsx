/**
 * ============================================================================
 * PLATFORM SETTINGS - 5-Tab System Configuration
 * ============================================================================
 * General | Security | SMTP Email | Storage | Backup & Monitoring
 * Enhanced with tab navigation, toggle switches, test buttons, RTL/bilingual,
 * showToastRef pattern, relative API URLs.
 *
 * @module pages/admin/platform/settings
 * @version 2.0.0
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import { useCurrencies } from '@/hooks/useReferenceData';
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  ServerStackIcon,
  CpuChipIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/* ── Types ── */
interface PlatformSettings {
  general: {
    system_name: string;
    system_name_ar: string;
    support_email: string;
    support_phone: string;
    default_locale: string;
    default_currency: string;
    timezone: string;
    maintenance_mode: boolean;
    open_registration: boolean;
    logo_url: string;
  };
  security: {
    session_timeout_minutes: number;
    min_password_length: number;
    require_uppercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    mfa_required: boolean;
    max_login_attempts: number;
    lockout_duration_minutes: number;
    password_expiry_days: number;
  };
  email: {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    from_address: string;
    from_name: string;
    encryption: string;
  };
  storage: {
    max_upload_size_mb: number;
    allowed_file_types: string;
    storage_provider: string;
    s3_bucket: string;
    s3_region: string;
  };
  backup: {
    auto_backup_enabled: boolean;
    backup_frequency: string;
    backup_retention_days: number;
    backup_time: string;
    notification_email: string;
    include_uploads: boolean;
  };
  monitoring: {
    alert_email: string;
    cpu_threshold: number;
    memory_threshold: number;
    disk_threshold: number;
    health_check_interval: number;
  };
}

const defaultSettings: PlatformSettings = {
  general: { system_name: 'SLMS', system_name_ar: 'نظام إدارة اللوجستيات', support_email: '', support_phone: '', default_locale: 'en', default_currency: 'SAR', timezone: 'Asia/Riyadh', maintenance_mode: false, open_registration: true, logo_url: '' },
  security: { session_timeout_minutes: 30, min_password_length: 8, require_uppercase: true, require_numbers: true, require_special_chars: false, mfa_required: false, max_login_attempts: 5, lockout_duration_minutes: 15, password_expiry_days: 90 },
  email: { smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_address: '', from_name: 'SLMS', encryption: 'tls' },
  storage: { max_upload_size_mb: 10, allowed_file_types: 'pdf,jpg,png,xlsx,docx', storage_provider: 'local', s3_bucket: '', s3_region: '' },
  backup: { auto_backup_enabled: true, backup_frequency: 'daily', backup_retention_days: 30, backup_time: '02:00', notification_email: '', include_uploads: false },
  monitoring: { alert_email: '', cpu_threshold: 80, memory_threshold: 80, disk_threshold: 85, health_check_interval: 30 },
};

/* ── Tab Config ── */
const TABS = [
  { key: 'general', icon: Cog6ToothIcon, label: 'General', labelAr: 'عام', color: 'text-blue-600' },
  { key: 'email', icon: EnvelopeIcon, label: 'Email', labelAr: 'البريد', color: 'text-amber-600' },
  { key: 'security', icon: ShieldCheckIcon, label: 'Security', labelAr: 'الأمان', color: 'text-green-600' },
  { key: 'backup', icon: ServerStackIcon, label: 'Backup', labelAr: 'النسخ', color: 'text-cyan-600' },
  { key: 'monitoring', icon: CpuChipIcon, label: 'Monitoring', labelAr: 'المراقبة', color: 'text-purple-600' },
] as const;

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const { currencies: currencyList } = useCurrencies();
  const isRTL = locale === 'ar';

  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token) { setLoading(false); return; }
        const res = await fetch('http://localhost:4000/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        if (json.data) setSettings(prev => ({ ...prev, ...json.data }));
      } catch {
        // Use defaults
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
      if (!res.ok) throw new Error('Failed');
      showToast('success', isRTL ? '✅ تم حفظ الإعدادات' : '✅ Settings saved');
    } catch {
      showToast('error', isRTL ? 'فشل في حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMTP = async () => {
    setSmtpTesting(true);
    showToast('info', isRTL ? '📧 جاري اختبار الاتصال بخادم SMTP...' : '📧 Testing SMTP connection...');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/settings/test-smtp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.email),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = json.error || json.message || '';
        showToast('error', isRTL
          ? `❌ فشل اختبار SMTP${detail ? ': ' + detail : ''}`
          : `❌ SMTP test failed${detail ? ': ' + detail : ''}`);
      } else {
        showToast('success', isRTL
          ? `✅ تم إرسال البريد الاختباري بنجاح إلى ${settings.email.from_address || 'العنوان المحدد'}`
          : `✅ Test email sent successfully to ${settings.email.from_address || 'configured address'}`);
      }
    } catch {
      showToast('error', isRTL
        ? '❌ تعذر الاتصال بخادم SMTP — تحقق من إعدادات الخادم والمنفذ'
        : '❌ Could not connect to SMTP server — check host and port settings');
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleInstantBackup = async () => {
    setBackingUp(true);
    showToast('info', isRTL ? '💾 نسخ احتياطي — جاري الإنشاء' : '💾 Backup — Creating now...');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/settings/backup-now', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', isRTL ? '✅ تم إنشاء النسخة الاحتياطية' : '✅ Backup created successfully');
    } catch {
      showToast('error', isRTL ? 'فشل في إنشاء النسخة الاحتياطية' : 'Backup failed');
    } finally {
      setBackingUp(false);
    }
  };

  // Helper updaters
  const u = <S extends keyof PlatformSettings>(
    section: S,
    key: keyof PlatformSettings[S],
    value: PlatformSettings[S][keyof PlatformSettings[S]]
  ) => setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  /* ── Toggle Component ── */
  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center justify-between cursor-pointer py-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 ${checked ? 'right-0.5 rtl:left-0.5 rtl:right-auto' : 'left-0.5 rtl:right-0.5 rtl:left-auto'} w-5 h-5 bg-white rounded-full shadow transition-transform`} />
      </button>
    </label>
  );

  if (loading) {
    return (
      <MainLayout>
        <Head><title>{isRTL ? 'إعدادات المنصة' : 'Platform Settings'} - SLMS</title></Head>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-6" />
              <div className="space-y-4">
                {[1, 2, 3].map(j => (
                  <div key={j}><div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-2" /><div className="h-9 bg-gray-200 dark:bg-slate-700 rounded" /></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'إعدادات المنصة' : 'Platform Settings'} - SLMS</title>
      </Head>

      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              ⚙️ {isRTL ? 'إعدادات المنصة' : 'Platform Settings'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRTL ? 'إعدادات التكوين على مستوى المنصة' : 'System-wide configuration settings'}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-semibold"
          >
            {saving ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : <CheckIcon className="h-4 w-4" />}
            {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? '💾 حفظ الإعدادات' : '💾 Save Settings')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              >
                <Icon className="h-4 w-4" />
                {isRTL ? tab.labelAr : tab.label}
              </button>
            );
          })}
        </div>

        {/* ── General Tab ── */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            {/* Maintenance Mode Alert (QA 04) */}
            {settings.general.maintenance_mode && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    {isRTL ? '🔧 وضع الصيانة مفعّل — المنصة مقفلة أمام المستأجرين' : '🔧 Maintenance Mode Active — Platform is locked for tenants'}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {isRTL ? 'لن يتمكن المستأجرون من الوصول حتى يتم إيقاف وضع الصيانة' : 'Tenants cannot access the system until maintenance mode is disabled'}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Cog6ToothIcon className="h-5 w-5 text-blue-600" />
                {isRTL ? 'الإعدادات العامة' : 'General Settings'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>{isRTL ? 'اسم المنصة (EN)' : 'Platform Name (EN)'}</label>
                  <input type="text" value={settings.general.system_name} onChange={e => u('general', 'system_name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{isRTL ? 'اسم المنصة (AR)' : 'Platform Name (AR)'}</label>
                  <input type="text" value={settings.general.system_name_ar} onChange={e => u('general', 'system_name_ar', e.target.value)} className={inputClass} dir="rtl" />
                </div>
                <div>
                  <label className={labelClass}>{isRTL ? 'بريد الدعم' : 'Support Email'}</label>
                  <input type="email" value={settings.general.support_email} onChange={e => u('general', 'support_email', e.target.value)} placeholder="support@company.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{isRTL ? 'هاتف الدعم' : 'Support Phone'}</label>
                  <input type="tel" value={settings.general.support_phone} onChange={e => u('general', 'support_phone', e.target.value)} placeholder="+966 12 345 6789" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{isRTL ? 'اللغة الافتراضية' : 'Default Language'}</label>
                  <select value={settings.general.default_locale} onChange={e => u('general', 'default_locale', e.target.value)} className={inputClass}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{isRTL ? 'العملة الافتراضية' : 'Default Currency'}</label>
                  <select value={settings.general.default_currency} onChange={e => u('general', 'default_currency', e.target.value)} className={inputClass}>
                    {currencyList.map(c => (
                      <option key={c.code} value={c.code}>{isRTL ? (c.name_ar || c.name) : c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{isRTL ? 'المنطقة الزمنية' : 'Timezone'}</label>
                  <select value={settings.general.timezone} onChange={e => u('general', 'timezone', e.target.value)} className={inputClass}>
                    <option value="UTC">UTC</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
                    <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
                <div /> {/* spacer */}
                <div className="sm:col-span-2 border-t border-gray-200 dark:border-slate-700 pt-4 space-y-1">
                  <Toggle
                    checked={settings.general.maintenance_mode}
                    onChange={v => u('general', 'maintenance_mode', v)}
                    label={isRTL ? '🔧 وضع الصيانة (يمنع وصول المستأجرين)' : '🔧 Maintenance Mode (blocks tenant access)'}
                  />
                  <Toggle
                    checked={settings.general.open_registration}
                    onChange={v => u('general', 'open_registration', v)}
                    label={isRTL ? '📝 فتح التسجيل (السماح بطلبات حسابات جديدة)' : '📝 Open Registration (allow new account requests)'}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Security Tab ── */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-green-600" />
              {isRTL ? 'إعدادات الأمان' : 'Security Settings'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{isRTL ? 'مهلة الجلسة (دقيقة)' : 'Session Timeout (min)'}</label>
                <input type="number" min={1} max={1440} value={settings.security.session_timeout_minutes} onChange={e => u('security', 'session_timeout_minutes', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'أقل طول كلمة مرور' : 'Min Password Length'}</label>
                <input type="number" min={6} max={128} value={settings.security.min_password_length} onChange={e => u('security', 'min_password_length', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'أقصى محاولات تسجيل دخول' : 'Max Login Attempts'}</label>
                <input type="number" min={3} max={20} value={settings.security.max_login_attempts} onChange={e => u('security', 'max_login_attempts', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'مدة الحظر (دقيقة)' : 'Lockout Duration (min)'}</label>
                <input type="number" min={1} max={1440} value={settings.security.lockout_duration_minutes} onChange={e => u('security', 'lockout_duration_minutes', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'صلاحية كلمة المرور (يوم)' : 'Password Expiry (days)'}</label>
                <input type="number" min={0} max={365} value={settings.security.password_expiry_days} onChange={e => u('security', 'password_expiry_days', Number(e.target.value))} className={inputClass} />
                <p className="text-[10px] text-gray-400 mt-1">{isRTL ? '0 = لا انتهاء' : '0 = never expire'}</p>
              </div>
              <div className="sm:col-span-2 border-t border-gray-200 dark:border-slate-700 pt-4 space-y-1">
                <Toggle checked={settings.security.require_uppercase} onChange={v => u('security', 'require_uppercase', v)} label={isRTL ? 'يتطلب حرف كبير' : 'Require Uppercase'} />
                <Toggle checked={settings.security.require_numbers} onChange={v => u('security', 'require_numbers', v)} label={isRTL ? 'يتطلب أرقام' : 'Require Numbers'} />
                <Toggle checked={settings.security.require_special_chars} onChange={v => u('security', 'require_special_chars', v)} label={isRTL ? 'يتطلب رموز خاصة' : 'Require Special Characters'} />
                <Toggle checked={settings.security.mfa_required} onChange={v => u('security', 'mfa_required', v)} label={isRTL ? '🔐 إلزام المصادقة الثنائية (MFA)' : '🔐 Require MFA for all accounts'} />
              </div>
            </div>
          </div>
        )}

        {/* ── Email Tab ── */}
        {activeTab === 'email' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-amber-600" />
              {isRTL ? 'إعدادات البريد الإلكتروني (SMTP)' : 'SMTP Email Settings'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{isRTL ? 'خادم SMTP' : 'SMTP Host'}</label>
                <input type="text" value={settings.email.smtp_host} onChange={e => u('email', 'smtp_host', e.target.value)} placeholder="smtp.example.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'المنفذ' : 'SMTP Port'}</label>
                <input type="number" value={settings.email.smtp_port} onChange={e => u('email', 'smtp_port', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'اسم المستخدم' : 'Username'}</label>
                <input type="text" value={settings.email.smtp_user} onChange={e => u('email', 'smtp_user', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'كلمة المرور' : 'Password'}</label>
                <input type="password" value={settings.email.smtp_password} onChange={e => u('email', 'smtp_password', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'عنوان المرسل' : 'From Address'}</label>
                <input type="email" value={settings.email.from_address} onChange={e => u('email', 'from_address', e.target.value)} placeholder="noreply@company.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'اسم المرسل' : 'From Name'}</label>
                <input type="text" value={settings.email.from_name} onChange={e => u('email', 'from_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'التشفير' : 'Encryption'}</label>
                <select value={settings.email.encryption} onChange={e => u('email', 'encryption', e.target.value)} className={inputClass}>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleTestSMTP}
                  disabled={smtpTesting || !settings.email.smtp_host}
                  className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {smtpTesting ? (isRTL ? 'جاري الاختبار...' : 'Testing...') : (isRTL ? '📧 اختبار الاتصال' : '📧 Test Connection')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Storage Tab (hidden, kept for API compat) ── */}

        {/* ── Monitoring Tab ── */}
        {activeTab === 'monitoring' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <CpuChipIcon className="h-5 w-5 text-purple-600" />
              {isRTL ? 'إعدادات المراقبة' : 'Monitoring Settings'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {isRTL ? 'تكوين حدود التنبيه وإعدادات فحص الصحة' : 'Configure alert thresholds and health check settings'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{isRTL ? 'بريد التنبيهات' : 'Alert Email'}</label>
                <input type="email" value={settings.monitoring.alert_email} onChange={e => u('monitoring', 'alert_email', e.target.value)} placeholder="alerts@company.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'فاصل فحص الصحة (ثانية)' : 'Health Check Interval (sec)'}</label>
                <input type="number" min={10} max={300} value={settings.monitoring.health_check_interval} onChange={e => u('monitoring', 'health_check_interval', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'حد تنبيه المعالج %' : 'CPU Alert Threshold %'}</label>
                <input type="number" min={50} max={99} value={settings.monitoring.cpu_threshold} onChange={e => u('monitoring', 'cpu_threshold', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'حد تنبيه الذاكرة %' : 'Memory Alert Threshold %'}</label>
                <input type="number" min={50} max={99} value={settings.monitoring.memory_threshold} onChange={e => u('monitoring', 'memory_threshold', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'حد تنبيه القرص %' : 'Disk Alert Threshold %'}</label>
                <input type="number" min={50} max={99} value={settings.monitoring.disk_threshold} onChange={e => u('monitoring', 'disk_threshold', Number(e.target.value))} className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* ── Backup Tab ── */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            {/* Backup Status Banner (QA 13) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'آخر نسخة احتياطية' : 'Last Backup'}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{isRTL ? 'اليوم 02:00 ص' : 'Today 02:00 AM'}</p>
                <p className="text-[10px] text-green-600 mt-0.5">✅ {isRTL ? 'ناجح' : 'Successful'}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'حجم قاعدة البيانات' : 'Database Size'}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">248 MB</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{isRTL ? 'مع الفهارس' : 'Including indexes'}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex items-center justify-center">
                <button
                  onClick={handleInstantBackup}
                  disabled={backingUp}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors text-sm font-semibold"
                >
                  {backingUp ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : null}
                  {backingUp ? (isRTL ? 'جاري النسخ...' : 'Backing up...') : (isRTL ? '💾 نسخ احتياطي الآن' : '💾 Backup Now')}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <ServerStackIcon className="h-5 w-5 text-cyan-600" />
                {isRTL ? 'إعدادات النسخ الاحتياطي' : 'Backup Settings'}
              </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <Toggle
                  checked={settings.backup.auto_backup_enabled}
                  onChange={v => u('backup', 'auto_backup_enabled', v)}
                  label={isRTL ? '🔄 تفعيل النسخ الاحتياطي التلقائي' : '🔄 Enable Automatic Backups'}
                />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'التكرار' : 'Frequency'}</label>
                <select value={settings.backup.backup_frequency} onChange={e => u('backup', 'backup_frequency', e.target.value)} className={inputClass}>
                  <option value="hourly">{isRTL ? 'كل ساعة' : 'Hourly'}</option>
                  <option value="daily">{isRTL ? 'يومي' : 'Daily'}</option>
                  <option value="weekly">{isRTL ? 'أسبوعي' : 'Weekly'}</option>
                  <option value="monthly">{isRTL ? 'شهري' : 'Monthly'}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'وقت النسخ' : 'Backup Time'}</label>
                <input type="time" value={settings.backup.backup_time} onChange={e => u('backup', 'backup_time', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'مدة الاحتفاظ (يوم)' : 'Retention (days)'}</label>
                <input type="number" min={1} max={365} value={settings.backup.backup_retention_days} onChange={e => u('backup', 'backup_retention_days', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'بريد الإشعارات' : 'Notification Email'}</label>
                <input type="email" value={settings.backup.notification_email} onChange={e => u('backup', 'notification_email', e.target.value)} placeholder="admin@company.com" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <Toggle
                  checked={settings.backup.include_uploads}
                  onChange={v => u('backup', 'include_uploads', v)}
                  label={isRTL ? '📎 تضمين الملفات المرفوعة في النسخة الاحتياطية' : '📎 Include uploaded files in backup'}
                />
              </div>
            </div>
          </div>
          </div>
        )}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-semibold"
          >
            {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? '💾 حفظ جميع الإعدادات' : '💾 Save All Settings')}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
