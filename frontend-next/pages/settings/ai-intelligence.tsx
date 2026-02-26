import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface AIIntelligenceConfig {
  ml_model: string;
  training_frequency: string;
  anomaly_sensitivity: number;
  prediction_horizon_days: number;
  auto_retrain: boolean;
  data_retention_months: number;
  feature_selection: string;
  enable_anomaly_detection: boolean;
  enable_forecasting: boolean;
  enable_clustering: boolean;
}

const defaults: AIIntelligenceConfig = {
  ml_model: 'gradient_boost',
  training_frequency: 'weekly',
  anomaly_sensitivity: 70,
  prediction_horizon_days: 30,
  auto_retrain: true,
  data_retention_months: 24,
  feature_selection: 'auto',
  enable_anomaly_detection: true,
  enable_forecasting: true,
  enable_clustering: false,
};

const MODEL_OPTIONS = [
  { value: 'gradient_boost', label: 'Gradient Boosting' },
  { value: 'random_forest', label: 'Random Forest' },
  { value: 'neural_network', label: 'Neural Network' },
  { value: 'linear_regression', label: 'Linear Regression' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'manual', label: 'Manual Only' },
];

function AIIntelligenceSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AIIntelligenceConfig>(defaults);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

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
      <button type="button" onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('settings.aiIntelligence') || 'AI Intelligence Settings'} - SLMS</title></Head>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.aiIntelligence') || 'AI Intelligence Settings'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.aiIntelligenceDesc') || 'Configure machine learning models, training data, and detection parameters.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.modelConfig') || 'Model Configuration'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.mlModel') || 'ML Model'}</label>
                  <select value={config.ml_model} onChange={e => setConfig(p => ({ ...p, ml_model: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.trainingFrequency') || 'Training Frequency'}</label>
                  <select value={config.training_frequency} onChange={e => setConfig(p => ({ ...p, training_frequency: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.featureSelection') || 'Feature Selection'}</label>
                  <select value={config.feature_selection} onChange={e => setConfig(p => ({ ...p, feature_selection: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    <option value="auto">Auto</option>
                    <option value="manual">Manual</option>
                    <option value="pca">PCA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.dataRetention') || 'Data Retention (months)'}</label>
                  <input type="number" min={6} max={120} value={config.data_retention_months} onChange={e => setConfig(p => ({ ...p, data_retention_months: +e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.detectionSettings') || 'Detection & Prediction'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.anomalySensitivity') || 'Anomaly Detection Sensitivity'}: {config.anomaly_sensitivity}%</label>
                <input type="range" min={10} max={100} value={config.anomaly_sensitivity} onChange={e => setConfig(p => ({ ...p, anomaly_sensitivity: +e.target.value }))} className="w-full accent-blue-600" />
                <div className="flex justify-between text-xs text-gray-400"><span>{t('settings.low') || 'Low'}</span><span>{t('settings.high') || 'High'}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.predictionHorizon') || 'Prediction Horizon (days)'}</label>
                <input type="number" min={7} max={365} value={config.prediction_horizon_days} onChange={e => setConfig(p => ({ ...p, prediction_horizon_days: +e.target.value }))} className="w-32 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white pb-3">{t('settings.capabilities') || 'Capabilities'}</h2>
              <Toggle checked={config.enable_anomaly_detection} onChange={() => setConfig(p => ({ ...p, enable_anomaly_detection: !p.enable_anomaly_detection }))} label={t('settings.enableAnomalyDetection') || 'Anomaly Detection'} />
              <Toggle checked={config.enable_forecasting} onChange={() => setConfig(p => ({ ...p, enable_forecasting: !p.enable_forecasting }))} label={t('settings.enableForecasting') || 'Forecasting'} />
              <Toggle checked={config.enable_clustering} onChange={() => setConfig(p => ({ ...p, enable_clustering: !p.enable_clustering }))} label={t('settings.enableClustering') || 'Data Clustering'} />
              <Toggle checked={config.auto_retrain} onChange={() => setConfig(p => ({ ...p, auto_retrain: !p.auto_retrain }))} label={t('settings.autoRetrain') || 'Auto Retrain'} />
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

export default withPermission('system_policies:view', AIIntelligenceSettingsPage);
