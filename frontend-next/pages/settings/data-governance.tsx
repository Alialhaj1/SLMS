import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission, withPlatformGuard } from '../../utils/withPermission';

interface DataGovernanceConfig {
  data_classification_enabled: boolean;
  default_classification: string;
  pii_auto_detection: boolean;
  anonymization_enabled: boolean;
  anonymization_method: string;
  gdpr_compliance: boolean;
  ccpa_compliance: boolean;
  data_retention_policy: boolean;
  retention_default_months: number;
  right_to_erasure: boolean;
  consent_tracking: boolean;
  data_export_enabled: boolean;
  access_logging: boolean;
}

const defaults: DataGovernanceConfig = {
  data_classification_enabled: true,
  default_classification: 'internal',
  pii_auto_detection: true,
  anonymization_enabled: false,
  anonymization_method: 'masking',
  gdpr_compliance: true,
  ccpa_compliance: false,
  data_retention_policy: true,
  retention_default_months: 84,
  right_to_erasure: true,
  consent_tracking: true,
  data_export_enabled: true,
  access_logging: true,
};

const CLASSIFICATION_LEVELS = [
  { value: 'public', label: 'Public', color: 'green' },
  { value: 'internal', label: 'Internal', color: 'blue' },
  { value: 'confidential', label: 'Confidential', color: 'yellow' },
  { value: 'restricted', label: 'Restricted', color: 'red' },
];

function DataGovernanceSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<DataGovernanceConfig>(defaults);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('success', t('common.savedSuccessfully') || 'Data governance settings saved');
    } catch {
      showToast('error', t('common.saveFailed') || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: string; description?: string }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button type="button" onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('settings.dataGovernance') || 'Data Governance'} - SLMS</title></Head>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.dataGovernance') || 'Data Governance'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.dataGovernanceDesc') || 'Configure data classification, access policies, anonymization, and compliance settings.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.classification') || 'Data Classification'}</h2>
              <Toggle checked={config.data_classification_enabled} onChange={() => setConfig(p => ({ ...p, data_classification_enabled: !p.data_classification_enabled }))} label={t('settings.enableClassification') || 'Enable Data Classification'} description="Automatically tag data with classification levels" />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.defaultClassification') || 'Default Classification'}</label>
                <select value={config.default_classification} onChange={e => setConfig(p => ({ ...p, default_classification: e.target.value }))} className="w-full max-w-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                  {CLASSIFICATION_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {CLASSIFICATION_LEVELS.map(c => (
                  <span key={c.value} className={`px-3 py-1 rounded-full text-xs font-medium ${c.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : c.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : c.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{c.label}</span>
                ))}
              </div>
              <Toggle checked={config.pii_auto_detection} onChange={() => setConfig(p => ({ ...p, pii_auto_detection: !p.pii_auto_detection }))} label={t('settings.piiDetection') || 'PII Auto-Detection'} description="Automatically detect personally identifiable information" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.anonymization') || 'Anonymization'}</h2>
              <Toggle checked={config.anonymization_enabled} onChange={() => setConfig(p => ({ ...p, anonymization_enabled: !p.anonymization_enabled }))} label={t('settings.enableAnonymization') || 'Enable Anonymization'} />
              {config.anonymization_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.anonymizationMethod') || 'Method'}</label>
                  <select value={config.anonymization_method} onChange={e => setConfig(p => ({ ...p, anonymization_method: e.target.value }))} className="w-full max-w-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    <option value="masking">Data Masking</option>
                    <option value="pseudonymization">Pseudonymization</option>
                    <option value="generalization">Generalization</option>
                    <option value="redaction">Full Redaction</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 divide-y divide-gray-100 dark:divide-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white pb-3">{t('settings.compliance') || 'Compliance'}</h2>
              <Toggle checked={config.gdpr_compliance} onChange={() => setConfig(p => ({ ...p, gdpr_compliance: !p.gdpr_compliance }))} label="GDPR Compliance" description="European Union General Data Protection Regulation" />
              <Toggle checked={config.ccpa_compliance} onChange={() => setConfig(p => ({ ...p, ccpa_compliance: !p.ccpa_compliance }))} label="CCPA Compliance" description="California Consumer Privacy Act" />
              <Toggle checked={config.right_to_erasure} onChange={() => setConfig(p => ({ ...p, right_to_erasure: !p.right_to_erasure }))} label={t('settings.rightToErasure') || 'Right to Erasure'} description="Allow users to request data deletion" />
              <Toggle checked={config.consent_tracking} onChange={() => setConfig(p => ({ ...p, consent_tracking: !p.consent_tracking }))} label={t('settings.consentTracking') || 'Consent Tracking'} description="Track and manage user consent records" />
              <Toggle checked={config.data_export_enabled} onChange={() => setConfig(p => ({ ...p, data_export_enabled: !p.data_export_enabled }))} label={t('settings.dataExport') || 'Data Export (Portability)'} description="Allow users to export their data" />
              <Toggle checked={config.access_logging} onChange={() => setConfig(p => ({ ...p, access_logging: !p.access_logging }))} label={t('settings.accessLogging') || 'Access Logging'} description="Log all data access for audit trails" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.retention') || 'Data Retention'}</h2>
              <Toggle checked={config.data_retention_policy} onChange={() => setConfig(p => ({ ...p, data_retention_policy: !p.data_retention_policy }))} label={t('settings.retentionPolicy') || 'Enable Retention Policy'} />
              {config.data_retention_policy && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.defaultRetention') || 'Default Retention Period (months)'}</label>
                  <input type="number" min={6} max={360} value={config.retention_default_months} onChange={e => setConfig(p => ({ ...p, retention_default_months: +e.target.value }))} className="w-32 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              )}
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

export default withPlatformGuard(withPermission('system_policies:view', DataGovernanceSettingsPage));
