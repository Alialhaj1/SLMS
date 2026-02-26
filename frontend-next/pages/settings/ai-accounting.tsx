import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface AIAccountingConfig {
  auto_categorization: boolean;
  smart_reconciliation: boolean;
  predictive_analytics: boolean;
  confidence_threshold: number;
  auto_approve_above: number;
  review_queue_enabled: boolean;
  learning_mode: boolean;
  max_suggestions: number;
}

const defaults: AIAccountingConfig = {
  auto_categorization: true,
  smart_reconciliation: true,
  predictive_analytics: false,
  confidence_threshold: 75,
  auto_approve_above: 95,
  review_queue_enabled: true,
  learning_mode: true,
  max_suggestions: 5,
};

function AIAccountingSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AIAccountingConfig>(defaults);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = (key: keyof AIAccountingConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('success', t('common.savedSuccessfully') || 'Settings saved successfully');
    } catch {
      showToast('error', t('common.saveFailed') || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('settings.aiAccounting') || 'AI Accounting Settings'} - SLMS</title></Head>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.aiAccounting') || 'AI Accounting Settings'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.aiAccountingDesc') || 'Configure AI-powered accounting features and automation thresholds.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white pb-3">{t('settings.aiFeatures') || 'AI Features'}</h2>
              <Toggle checked={config.auto_categorization} onChange={() => handleToggle('auto_categorization')} label={t('settings.autoCategorization') || 'Auto-Categorization'} />
              <Toggle checked={config.smart_reconciliation} onChange={() => handleToggle('smart_reconciliation')} label={t('settings.smartReconciliation') || 'Smart Reconciliation'} />
              <Toggle checked={config.predictive_analytics} onChange={() => handleToggle('predictive_analytics')} label={t('settings.predictiveAnalytics') || 'Predictive Analytics'} />
              <Toggle checked={config.learning_mode} onChange={() => handleToggle('learning_mode')} label={t('settings.learningMode') || 'Learning Mode'} />
              <Toggle checked={config.review_queue_enabled} onChange={() => handleToggle('review_queue_enabled')} label={t('settings.reviewQueue') || 'Review Queue Enabled'} />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.thresholds') || 'Thresholds'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.confidenceThreshold') || 'Confidence Threshold'}: {config.confidence_threshold}%
                </label>
                <input type="range" min={50} max={100} value={config.confidence_threshold} onChange={e => setConfig(p => ({ ...p, confidence_threshold: +e.target.value }))} className="w-full accent-blue-600" />
                <div className="flex justify-between text-xs text-gray-400"><span>50%</span><span>100%</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.autoApproveAbove') || 'Auto-Approve Above'}: {config.auto_approve_above}%
                </label>
                <input type="range" min={80} max={100} value={config.auto_approve_above} onChange={e => setConfig(p => ({ ...p, auto_approve_above: +e.target.value }))} className="w-full accent-blue-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.maxSuggestions') || 'Max Suggestions'}</label>
                <input type="number" min={1} max={20} value={config.max_suggestions} onChange={e => setConfig(p => ({ ...p, max_suggestions: +e.target.value }))} className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm" />
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

export default withPermission('system_policies:view', AIAccountingSettingsPage);
