import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  last_sync?: string;
  config_fields: string[];
}

const MOCK_INTEGRATIONS: Integration[] = [
  { id: 'zatca', name: 'ZATCA E-Invoicing', description: 'Saudi tax authority electronic invoicing (Fatoora)', category: 'Tax & Compliance', icon: '🏛️', status: 'connected', last_sync: '2026-02-26T07:30:00Z', config_fields: ['api_key', 'environment', 'vat_number'] },
  { id: 'bank_sab', name: 'Saudi British Bank (SABB)', description: 'Direct bank feed integration for reconciliation', category: 'Banking', icon: '🏦', status: 'connected', last_sync: '2026-02-26T06:00:00Z', config_fields: ['account_id', 'api_secret'] },
  { id: 'bank_rajhi', name: 'Al Rajhi Bank', description: 'Corporate banking integration', category: 'Banking', icon: '🏦', status: 'disconnected', config_fields: ['corporate_id', 'api_key'] },
  { id: 'aramex', name: 'Aramex', description: 'Shipping tracking and rate calculation', category: 'Shipping', icon: '🚚', status: 'connected', last_sync: '2026-02-26T08:15:00Z', config_fields: ['account_number', 'api_key', 'country_code'] },
  { id: 'dhl', name: 'DHL Express', description: 'International express shipping integration', category: 'Shipping', icon: '📦', status: 'pending', config_fields: ['site_id', 'password', 'account_number'] },
  { id: 'sap', name: 'SAP ERP', description: 'Enterprise resource planning sync', category: 'ERP', icon: '⚙️', status: 'disconnected', config_fields: ['host', 'client', 'username', 'password'] },
  { id: 'quickbooks', name: 'QuickBooks Online', description: 'Accounting software integration', category: 'Accounting', icon: '📊', status: 'error', last_sync: '2026-02-25T12:00:00Z', config_fields: ['company_id', 'oauth_token'] },
  { id: 'slack', name: 'Slack', description: 'Team notifications and alerts', category: 'Communication', icon: '💬', status: 'connected', last_sync: '2026-02-26T09:00:00Z', config_fields: ['webhook_url', 'channel'] },
];

function IntegrationHubPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setIntegrations(MOCK_INTEGRATIONS); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      await new Promise(r => setTimeout(r, 1500));
      showToast('success', t('settings.connectionTestSuccess') || 'Connection test successful');
    } catch {
      showToast('error', t('settings.connectionTestFailed') || 'Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  const categories = ['all', ...Array.from(new Set(integrations.map(i => i.category)))];
  const filtered = integrations.filter(i => filterCategory === 'all' || i.category === filterCategory);

  const statusStyle = (status: Integration['status']) => {
    const styles = {
      connected: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      disconnected: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return styles[status];
  };

  return (
    <MainLayout>
      <Head><title>{t('settings.integrationHub') || 'Integration Hub'} - SLMS</title></Head>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.integrationHub') || 'Integration Hub'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.integrationHubDesc') || 'Connect and manage third-party integrations for your logistics operations.'}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
              {cat === 'all' ? (t('common.all') || 'All') : cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(integration => (
              <div key={integration.id} className="bg-white dark:bg-slate-800 rounded-lg shadow p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                      <span className="text-xs text-gray-400">{integration.category}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle(integration.status)}`}>
                    {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">{integration.description}</p>
                {integration.last_sync && (
                  <p className="text-xs text-gray-400 mt-2">{t('settings.lastSync') || 'Last sync'}: {new Date(integration.last_sync).toLocaleString()}</p>
                )}
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    {t('settings.configure') || 'Configure'}
                  </button>
                  <button onClick={() => handleTest(integration.id)} disabled={testing === integration.id} className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50">
                    {testing === integration.id ? (t('settings.testing') || 'Testing...') : (t('settings.testConnection') || 'Test')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('system_policies:view', IntegrationHubPage);
