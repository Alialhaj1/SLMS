import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';
import { useCurrencies } from '../../hooks/useReferenceData';

interface ConsolidationConfig {
  reporting_currency: string;
  exchange_rate_source: string;
  auto_elimination: boolean;
  intercompany_matching: boolean;
  threshold_variance_pct: number;
  consolidation_frequency: string;
  include_inactive_entities: boolean;
  rounding_precision: number;
}

interface ConsolidationGroup {
  id: number;
  name: string;
  parent_entity: string;
  entities: string[];
  elimination_rules: number;
  last_consolidated?: string;
}

const defaultConfig: ConsolidationConfig = {
  reporting_currency: 'SAR',
  exchange_rate_source: 'central_bank',
  auto_elimination: true,
  intercompany_matching: true,
  threshold_variance_pct: 2,
  consolidation_frequency: 'monthly',
  include_inactive_entities: false,
  rounding_precision: 2,
};

const MOCK_GROUPS: ConsolidationGroup[] = [
  { id: 1, name: 'Saudi Operations', parent_entity: 'Al Hajj International', entities: ['Jeddah Branch', 'Riyadh Branch', 'Dammam Branch'], elimination_rules: 5, last_consolidated: '2026-01-31' },
  { id: 2, name: 'Gulf Region', parent_entity: 'Gulf Holdings', entities: ['UAE Ops', 'Bahrain Ops', 'Oman Ops'], elimination_rules: 3, last_consolidated: '2026-01-31' },
  { id: 3, name: 'Global Consolidation', parent_entity: 'Parent Corp', entities: ['Saudi Ops', 'Gulf Region', 'Egypt Branch'], elimination_rules: 8 },
];


const RATE_SOURCES = [
  { value: 'central_bank', label: 'Central Bank' },
  { value: 'reuters', label: 'Reuters' },
  { value: 'bloomberg', label: 'Bloomberg' },
  { value: 'manual', label: 'Manual Entry' },
];

function ConsolidationSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { currencies: currencyList } = useCurrencies();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ConsolidationConfig>(defaultConfig);
  const [groups, setGroups] = useState<ConsolidationGroup[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => { setGroups(MOCK_GROUPS); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('success', t('common.savedSuccessfully') || 'Consolidation settings saved');
    } catch {
      showToast('error', t('common.saveFailed') || 'Failed to save');
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
      <Head><title>{t('settings.consolidation') || 'Financial Consolidation'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.consolidation') || 'Financial Consolidation Settings'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.consolidationDesc') || 'Configure inter-company elimination rules, consolidation groups, and reporting currency.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.generalConfig') || 'General Configuration'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.reportingCurrency') || 'Reporting Currency'}</label>
                  <select value={config.reporting_currency} onChange={e => setConfig(p => ({ ...p, reporting_currency: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    {currencyList.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.exchangeRateSource') || 'Exchange Rate Source'}</label>
                  <select value={config.exchange_rate_source} onChange={e => setConfig(p => ({ ...p, exchange_rate_source: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    {RATE_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.consolidationFrequency') || 'Frequency'}</label>
                  <select value={config.consolidation_frequency} onChange={e => setConfig(p => ({ ...p, consolidation_frequency: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.varianceThreshold') || 'Variance Threshold (%)'}</label>
                  <input type="number" min={0} max={100} step={0.5} value={config.threshold_variance_pct} onChange={e => setConfig(p => ({ ...p, threshold_variance_pct: +e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <Toggle checked={config.auto_elimination} onChange={() => setConfig(p => ({ ...p, auto_elimination: !p.auto_elimination }))} label={t('settings.autoElimination') || 'Auto Inter-Company Elimination'} />
                <Toggle checked={config.intercompany_matching} onChange={() => setConfig(p => ({ ...p, intercompany_matching: !p.intercompany_matching }))} label={t('settings.intercompanyMatching') || 'Inter-Company Matching'} />
                <Toggle checked={config.include_inactive_entities} onChange={() => setConfig(p => ({ ...p, include_inactive_entities: !p.include_inactive_entities }))} label={t('settings.includeInactive') || 'Include Inactive Entities'} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.consolidationGroups') || 'Consolidation Groups'}</h2>
                <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">{t('common.addNew') || 'Add Group'}</button>
              </div>
              <div className="space-y-3">
                {groups.map(g => (
                  <div key={g.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{g.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.parent') || 'Parent'}: {g.parent_entity} · {g.entities.length} {t('settings.entities') || 'entities'} · {g.elimination_rules} {t('settings.rules') || 'rules'}</p>
                      {g.last_consolidated && <p className="text-xs text-gray-400 mt-0.5">{t('settings.lastConsolidated') || 'Last consolidated'}: {g.last_consolidated}</p>}
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">{t('common.edit') || 'Edit'}</button>
                  </div>
                ))}
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

export default withPermission('system_policies:view', ConsolidationSettingsPage);
