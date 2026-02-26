import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';

interface Module {
  id: number;
  name: string;
  code: string;
  description: string;
  icon: string;
  is_enabled: boolean;
  tenant_count: number;
  version: string;
}

const moduleIcons: Record<string, string> = {
  shipping: '🚢', accounting: '📊', inventory: '📦', hr: '👥',
  crm: '🤝', procurement: '🛒', quality: '✅', projects: '📋',
  documents: '📄', reports: '📈',
};

export default function ModulesPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/modules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch modules');
      const data = await res.json();
      setModules(data.data || []);
    } catch {
      showToast('error', 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (mod: Module) => {
    setToggling(mod.id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/modules/${mod.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !mod.is_enabled }),
      });
      if (!res.ok) throw new Error('Failed to update module');
      showToast('success', `${mod.name} ${mod.is_enabled ? 'disabled' : 'enabled'} successfully`);
      fetchModules();
    } catch {
      showToast('error', `Failed to update ${mod.name}`);
    } finally {
      setToggling(null);
    }
  };

  const filtered = modules.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
    </div>
  );

  return (
    <MainLayout>
      <Head>
        <title>Module Management - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Module Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enable or disable system modules per tenant</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> {modules.filter((m) => m.is_enabled).length} enabled</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> {modules.filter((m) => !m.is_enabled).length} disabled</span>
          </div>
        </div>

        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <p className="font-medium text-gray-500 dark:text-gray-400">No modules found</p>
            </div>
          ) : (
            filtered.map((mod) => (
              <div key={mod.id} className={`bg-white dark:bg-slate-800 rounded-xl border-2 transition-all ${mod.is_enabled ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-slate-700 opacity-75'} p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{moduleIcons[mod.code] || '📦'}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{mod.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">v{mod.version}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(mod)}
                    disabled={toggling === mod.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${mod.is_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                    aria-label={`Toggle ${mod.name}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${mod.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{mod.description}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{mod.tenant_count} tenants using this module</p>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
