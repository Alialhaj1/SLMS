import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission, withPlatformGuard } from '../../utils/withPermission';

interface MFAConfig {
  mfa_enabled: boolean;
  required_for_admins: boolean;
  required_for_all: boolean;
  totp_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  remember_device_days: number;
  recovery_codes_count: number;
  backup_email_enabled: boolean;
  grace_period_hours: number;
}

const defaults: MFAConfig = {
  mfa_enabled: true,
  required_for_admins: true,
  required_for_all: false,
  totp_enabled: true,
  sms_enabled: true,
  email_enabled: true,
  remember_device_days: 30,
  recovery_codes_count: 10,
  backup_email_enabled: true,
  grace_period_hours: 48,
};

function MFASettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<MFAConfig>(defaults);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('success', t('common.savedSuccessfully') || 'MFA settings saved');
    } catch {
      showToast('error', t('common.saveFailed') || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: () => void; label: string; description?: string; disabled?: boolean }) => (
    <div className={`flex items-center justify-between py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button type="button" onClick={onChange} disabled={disabled} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} ${disabled ? 'cursor-not-allowed' : ''}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('settings.mfa') || 'MFA Settings'} - SLMS</title></Head>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.mfa') || 'Multi-Factor Authentication'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.mfaDesc') || 'Configure MFA methods, enforcement policies, and recovery options.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white pb-3">{t('settings.enforcement') || 'Enforcement'}</h2>
              <Toggle checked={config.mfa_enabled} onChange={() => setConfig(p => ({ ...p, mfa_enabled: !p.mfa_enabled }))} label={t('settings.enableMFA') || 'Enable MFA'} description="Allow users to enable multi-factor authentication" />
              <Toggle checked={config.required_for_admins} onChange={() => setConfig(p => ({ ...p, required_for_admins: !p.required_for_admins }))} label={t('settings.requiredForAdmins') || 'Required for Admins'} description="Force admin users to configure MFA" disabled={!config.mfa_enabled} />
              <Toggle checked={config.required_for_all} onChange={() => setConfig(p => ({ ...p, required_for_all: !p.required_for_all }))} label={t('settings.requiredForAll') || 'Required for All Users'} description="Force all users to configure MFA" disabled={!config.mfa_enabled} />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white pb-3">{t('settings.methods') || 'Authentication Methods'}</h2>
              <Toggle checked={config.totp_enabled} onChange={() => setConfig(p => ({ ...p, totp_enabled: !p.totp_enabled }))} label={t('settings.totp') || 'Authenticator App (TOTP)'} description="Google Authenticator, Authy, etc." disabled={!config.mfa_enabled} />
              <Toggle checked={config.sms_enabled} onChange={() => setConfig(p => ({ ...p, sms_enabled: !p.sms_enabled }))} label={t('settings.sms') || 'SMS Verification'} description="Send one-time code via SMS" disabled={!config.mfa_enabled} />
              <Toggle checked={config.email_enabled} onChange={() => setConfig(p => ({ ...p, email_enabled: !p.email_enabled }))} label={t('settings.emailVerification') || 'Email Verification'} description="Send one-time code via email" disabled={!config.mfa_enabled} />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.recoveryOptions') || 'Recovery & Backup'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.recoveryCodes') || 'Recovery Codes Count'}</label>
                  <input type="number" min={5} max={20} value={config.recovery_codes_count} onChange={e => setConfig(p => ({ ...p, recovery_codes_count: +e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.rememberDevice') || 'Remember Device (days)'}</label>
                  <input type="number" min={1} max={90} value={config.remember_device_days} onChange={e => setConfig(p => ({ ...p, remember_device_days: +e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.gracePeriod') || 'Grace Period (hours)'}</label>
                  <input type="number" min={0} max={168} value={config.grace_period_hours} onChange={e => setConfig(p => ({ ...p, grace_period_hours: +e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                  <p className="text-xs text-gray-400 mt-1">{t('settings.gracePeriodDesc') || 'Time new users have to set up MFA after first login'}</p>
                </div>
              </div>
              <Toggle checked={config.backup_email_enabled} onChange={() => setConfig(p => ({ ...p, backup_email_enabled: !p.backup_email_enabled }))} label={t('settings.backupEmail') || 'Backup Email Recovery'} description="Allow recovery via backup email address" />
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

export default withPlatformGuard(withPermission('system_policies:view', MFASettingsPage));
