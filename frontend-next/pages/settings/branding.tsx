import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface BrandingConfig {
  company_display_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  email_header_bg: string;
  email_footer_text: string;
  login_background: string;
  show_powered_by: boolean;
}

const defaults: BrandingConfig = {
  company_display_name: 'SLMS Logistics',
  logo_url: '',
  favicon_url: '',
  primary_color: '#2563eb',
  secondary_color: '#475569',
  accent_color: '#06b6d4',
  email_header_bg: '#1e40af',
  email_footer_text: '© 2026 SLMS. All rights reserved.',
  login_background: '#f1f5f9',
  show_powered_by: true,
};

function BrandingSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BrandingConfig>(defaults);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('success', t('common.savedSuccessfully') || 'Branding saved successfully');
    } catch {
      showToast('error', t('common.saveFailed') || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const ColorInput = ({ label, value, field }: { label: string; value: string; field: keyof BrandingConfig }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => setConfig(p => ({ ...p, [field]: e.target.value }))} className="h-9 w-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
        <input type="text" value={value} onChange={e => setConfig(p => ({ ...p, [field]: e.target.value }))} className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm font-mono" />
      </div>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('settings.branding') || 'Branding Settings'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.branding') || 'Branding Settings'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.brandingDesc') || 'Customize your brand identity, colors, and email templates.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.identity') || 'Identity'}</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.companyDisplayName') || 'Company Display Name'}</label>
                  <input value={config.company_display_name} onChange={e => setConfig(p => ({ ...p, company_display_name: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.logoUrl') || 'Logo URL'}</label>
                  <input value={config.logo_url} onChange={e => setConfig(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.faviconUrl') || 'Favicon URL'}</label>
                  <input value={config.favicon_url} onChange={e => setConfig(p => ({ ...p, favicon_url: e.target.value }))} placeholder="https://..." className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.colors') || 'Colors'}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ColorInput label={t('settings.primaryColor') || 'Primary Color'} value={config.primary_color} field="primary_color" />
                  <ColorInput label={t('settings.secondaryColor') || 'Secondary Color'} value={config.secondary_color} field="secondary_color" />
                  <ColorInput label={t('settings.accentColor') || 'Accent Color'} value={config.accent_color} field="accent_color" />
                  <ColorInput label={t('settings.emailHeaderBg') || 'Email Header Color'} value={config.email_header_bg} field="email_header_bg" />
                  <ColorInput label={t('settings.loginBackground') || 'Login Background'} value={config.login_background} field="login_background" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.emailBranding') || 'Email Branding'}</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.footerText') || 'Email Footer Text'}</label>
                  <textarea value={config.email_footer_text} onChange={e => setConfig(p => ({ ...p, email_footer_text: e.target.value }))} rows={2} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={config.show_powered_by} onChange={() => setConfig(p => ({ ...p, show_powered_by: !p.show_powered_by }))} className="rounded border-gray-300 text-blue-600" />
                  <label className="text-sm text-gray-700 dark:text-gray-300">{t('settings.showPoweredBy') || 'Show "Powered by SLMS" in emails'}</label>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
                  {saving ? (t('common.saving') || 'Saving...') : (t('common.saveChanges') || 'Save Changes')}
                </button>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sticky top-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('settings.preview') || 'Preview'}</h3>
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                  <div style={{ backgroundColor: config.email_header_bg }} className="p-4 text-center">
                    {config.logo_url ? (
                      <img src={config.logo_url} alt="Logo" className="h-8 mx-auto" />
                    ) : (
                      <span className="text-white font-bold text-lg">{config.company_display_name}</span>
                    )}
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <p>{t('settings.sampleEmailBody') || 'This is a sample email body to preview your branding settings.'}</p>
                    <button style={{ backgroundColor: config.primary_color }} className="px-4 py-1.5 text-white rounded text-xs font-medium">{t('settings.sampleButton') || 'Sample Button'}</button>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 text-center text-xs text-gray-400">{config.email_footer_text}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('system_policies:view', BrandingSettingsPage);
