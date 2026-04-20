import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission, withPlatformGuard } from '../../utils/withPermission';

interface SystemModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  features: string[];
  users_count: number;
  category: string;
}

const MOCK_MODULES: SystemModule[] = [
  { id: 'shipping', name: 'Shipping & Logistics', description: 'End-to-end shipment management, tracking, and delivery', icon: '🚚', enabled: true, features: ['Shipment Tracking', 'Route Optimization', 'Carrier Management', 'BOL Generation', 'Customs Documentation'], users_count: 45, category: 'core' },
  { id: 'accounting', name: 'Accounting & Finance', description: 'General ledger, accounts payable/receivable, and financial reporting', icon: '📊', enabled: true, features: ['General Ledger', 'AP/AR', 'Bank Reconciliation', 'Financial Reports', 'Multi-Currency'], users_count: 12, category: 'core' },
  { id: 'inventory', name: 'Inventory Management', description: 'Warehouse management, stock control, and inventory tracking', icon: '📦', enabled: true, features: ['Stock Tracking', 'Warehouse Zones', 'Barcode Scanning', 'Reorder Alerts', 'Cycle Counting'], users_count: 28, category: 'core' },
  { id: 'hr', name: 'Human Resources', description: 'Employee management, payroll, attendance, and leave tracking', icon: '👥', enabled: false, features: ['Employee Records', 'Payroll', 'Attendance', 'Leave Management', 'Performance Reviews'], users_count: 0, category: 'extended' },
  { id: 'crm', name: 'Customer Relations', description: 'Customer management, sales pipeline, and communication tracking', icon: '🤝', enabled: false, features: ['Contact Management', 'Sales Pipeline', 'Quotes & Proposals', 'Customer Portal', 'Communication Log'], users_count: 0, category: 'extended' },
  { id: 'procurement', name: 'Procurement', description: 'Purchase orders, supplier management, and sourcing', icon: '🛒', enabled: true, features: ['Purchase Orders', 'Supplier Ratings', 'RFQ Management', 'Contract Management', 'Price Comparison'], users_count: 15, category: 'extended' },
];

function ModulesSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setModules(MOCK_MODULES); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      await new Promise(r => setTimeout(r, 600));
      setModules(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
      showToast('success', t('common.updated') || 'Module updated');
    } catch {
      showToast('error', t('common.error') || 'Failed to update module');
    } finally {
      setToggling(null);
    }
  };

  const coreModules = modules.filter(m => m.category === 'core');
  const extendedModules = modules.filter(m => m.category === 'extended');

  const ModuleCard = ({ mod }: { mod: SystemModule }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow p-5 flex flex-col transition-all ${mod.enabled ? 'ring-2 ring-blue-200 dark:ring-blue-800' : 'opacity-80'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{mod.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{mod.name}</h3>
            {mod.enabled && <span className="text-xs text-green-600 dark:text-green-400">{mod.users_count} {t('settings.activeUsers') || 'active users'}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(mod.id)}
          disabled={toggling === mod.id}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${mod.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} ${toggling === mod.id ? 'opacity-50' : ''}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mod.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{mod.description}</p>
      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">{t('settings.features') || 'Features'}:</p>
        <div className="flex flex-wrap gap-1.5">
          {mod.features.map(f => (
            <span key={f} className={`px-2 py-0.5 rounded text-xs ${mod.enabled ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-gray-50 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('settings.modules') || 'Module Configuration'} - SLMS</title></Head>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.modules') || 'Module Configuration'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.modulesDesc') || 'Enable or disable system modules based on your business needs.'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{modules.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.totalModules') || 'Total Modules'}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{modules.filter(m => m.enabled).length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.enabledModules') || 'Enabled'}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{modules.reduce((s, m) => s + m.users_count, 0)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.totalModuleUsers') || 'Active Users'}</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-56 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('settings.coreModules') || 'Core Modules'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {coreModules.map(m => <ModuleCard key={m.id} mod={m} />)}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('settings.extendedModules') || 'Extended Modules'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {extendedModules.map(m => <ModuleCard key={m.id} mod={m} />)}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default withPlatformGuard(withPermission('system_policies:view', ModulesSettingsPage));
