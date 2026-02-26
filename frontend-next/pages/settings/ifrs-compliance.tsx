import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface IFRSStandard {
  code: string;
  name: string;
  enabled: boolean;
  transition_date: string;
  status: 'compliant' | 'in_progress' | 'not_started';
  disclosure_template: string;
}

interface IFRSConfig {
  reporting_framework: string;
  first_time_adoption: boolean;
  comparative_period: boolean;
  standards: IFRSStandard[];
}

const defaultConfig: IFRSConfig = {
  reporting_framework: 'ifrs_full',
  first_time_adoption: false,
  comparative_period: true,
  standards: [
    { code: 'IFRS 9', name: 'Financial Instruments', enabled: true, transition_date: '2025-01-01', status: 'compliant', disclosure_template: 'ifrs9_standard' },
    { code: 'IFRS 15', name: 'Revenue from Contracts with Customers', enabled: true, transition_date: '2025-01-01', status: 'compliant', disclosure_template: 'ifrs15_standard' },
    { code: 'IFRS 16', name: 'Leases', enabled: true, transition_date: '2025-01-01', status: 'in_progress', disclosure_template: 'ifrs16_standard' },
    { code: 'IFRS 17', name: 'Insurance Contracts', enabled: false, transition_date: '', status: 'not_started', disclosure_template: 'ifrs17_standard' },
  ],
};

const TEMPLATE_OPTIONS = [
  { value: 'standard', label: 'Standard Template' },
  { value: 'detailed', label: 'Detailed Template' },
  { value: 'custom', label: 'Custom Template' },
];

function IFRSCompliancePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<IFRSConfig>(defaultConfig);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleStandardToggle = (code: string) => {
    setConfig(prev => ({
      ...prev,
      standards: prev.standards.map(s => s.code === code ? { ...s, enabled: !s.enabled } : s),
    }));
  };

  const handleStandardField = (code: string, field: keyof IFRSStandard, value: string) => {
    setConfig(prev => ({
      ...prev,
      standards: prev.standards.map(s => s.code === code ? { ...s, [field]: value } : s),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast('success', t('common.savedSuccessfully') || 'IFRS settings saved');
    } catch {
      showToast('error', t('common.saveFailed') || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: IFRSStandard['status']) => {
    const styles = {
      compliant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      not_started: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    };
    const labels = { compliant: 'Compliant', in_progress: 'In Progress', not_started: 'Not Started' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  return (
    <MainLayout>
      <Head><title>{t('settings.ifrsCompliance') || 'IFRS Compliance'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.ifrsCompliance') || 'IFRS Compliance Settings'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.ifrsComplianceDesc') || 'Manage IFRS standard selection, transition dates, and disclosure templates.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.framework') || 'Reporting Framework'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.framework') || 'Framework'}</label>
                  <select value={config.reporting_framework} onChange={e => setConfig(p => ({ ...p, reporting_framework: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    <option value="ifrs_full">Full IFRS</option>
                    <option value="ifrs_sme">IFRS for SMEs</option>
                    <option value="local_gaap">Local GAAP</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={config.first_time_adoption} onChange={() => setConfig(p => ({ ...p, first_time_adoption: !p.first_time_adoption }))} className="rounded border-gray-300 text-blue-600" />
                  {t('settings.firstTimeAdoption') || 'First-Time Adoption (IFRS 1)'}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={config.comparative_period} onChange={() => setConfig(p => ({ ...p, comparative_period: !p.comparative_period }))} className="rounded border-gray-300 text-blue-600" />
                  {t('settings.comparativePeriod') || 'Include Comparative Period'}
                </label>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.standards') || 'Standards'}</h2>
              <div className="space-y-4">
                {config.standards.map(standard => (
                  <div key={standard.code} className={`border rounded-lg p-4 ${standard.enabled ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => handleStandardToggle(standard.code)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${standard.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${standard.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">{standard.code}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">{standard.name}</span>
                        </div>
                      </div>
                      {statusBadge(standard.status)}
                    </div>
                    {standard.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pl-14">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('settings.transitionDate') || 'Transition Date'}</label>
                          <input type="date" value={standard.transition_date} onChange={e => handleStandardField(standard.code, 'transition_date', e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('settings.status') || 'Status'}</label>
                          <select value={standard.status} onChange={e => handleStandardField(standard.code, 'status', e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-2 py-1.5 text-sm">
                            <option value="compliant">Compliant</option>
                            <option value="in_progress">In Progress</option>
                            <option value="not_started">Not Started</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('settings.disclosureTemplate') || 'Disclosure Template'}</label>
                          <select value={standard.disclosure_template} onChange={e => handleStandardField(standard.code, 'disclosure_template', e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-2 py-1.5 text-sm">
                            {TEMPLATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
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

export default withPermission('system_policies:view', IFRSCompliancePage);
