import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { SparklesIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Feature {
  key: string;
  module: string;
  status: 'active' | 'beta' | 'coming';
  href: string;
  icon: string;
}

const featureList: Feature[] = [
  { key: 'dashboardKpis', module: 'Core', status: 'active', href: '/dashboard', icon: '📊' },
  { key: 'shipmentMgmt', module: 'Logistics', status: 'active', href: '/shipments', icon: '🚢' },
  { key: 'expenseTracking', module: 'Finance', status: 'active', href: '/expenses', icon: '💰' },
  { key: 'warehouseMgmt', module: 'Logistics', status: 'active', href: '/warehouses', icon: '🏭' },
  { key: 'supplierPortal', module: 'Procurement', status: 'active', href: '/suppliers', icon: '🤝' },
  { key: 'accounting', module: 'Finance', status: 'active', href: '/accounting/accounts', icon: '📒' },
  { key: 'approvalWorkflows', module: 'Core', status: 'active', href: '/approvals/pending', icon: '✅' },
  { key: 'userRoleMgmt', module: 'Admin', status: 'active', href: '/users', icon: '👥' },
  { key: 'auditLogging', module: 'Admin', status: 'active', href: '/admin/audit-logs', icon: '🔍' },
  { key: 'customsClearance', module: 'Logistics', status: 'beta', href: '/customs', icon: '🛃' },
  { key: 'documentMgmt', module: 'Core', status: 'beta', href: '/documents', icon: '📄' },
  { key: 'multiLang', module: 'Core', status: 'active', href: '#', icon: '🌐' },
  { key: 'masterData', module: 'Admin', status: 'active', href: '/master', icon: '🗄️' },
  { key: 'reportBuilder', module: 'Analytics', status: 'coming', href: '#', icon: '📈' },
  { key: 'notificationCenter', module: 'Core', status: 'coming', href: '#', icon: '🔔' },
  { key: 'apiIntegrations', module: 'Platform', status: 'beta', href: '#', icon: '🔌' },
];

export default function FeatureDiscoveryPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const getName = (f: Feature) => t(`adminFeatureDiscovery.features.${f.key}.name`);
  const getDesc = (f: Feature) => t(`adminFeatureDiscovery.features.${f.key}.desc`);
  const getModule = (f: Feature) => t(`adminFeatureDiscovery.modules.${f.module}`);

  const filtered = featureList.filter((f) => {
    const name = getName(f);
    const mod = getModule(f);
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || mod.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
      beta: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
      coming: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
    };
    const label = s === 'coming' ? t('adminFeatureDiscovery.comingSoon') : s === 'beta' ? t('adminFeatureDiscovery.beta') : t('adminFeatureDiscovery.active');
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${map[s]}`}>{label}</span>;
  };

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
      <Head><title>{t('adminFeatureDiscovery.title')} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <SparklesIcon className="w-7 h-7 text-blue-500" />
              {t('adminFeatureDiscovery.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('adminFeatureDiscovery.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> {featureList.filter((f) => f.status === 'active').length} {t('adminFeatureDiscovery.activeCount')}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> {featureList.filter((f) => f.status === 'beta').length} {t('adminFeatureDiscovery.betaCount')}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> {featureList.filter((f) => f.status === 'coming').length} {t('adminFeatureDiscovery.comingCount')}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder={t('adminFeatureDiscovery.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
            <option value="all">{t('adminFeatureDiscovery.allStatuses')}</option>
            <option value="active">{t('adminFeatureDiscovery.active')}</option>
            <option value="beta">{t('adminFeatureDiscovery.beta')}</option>
            <option value="coming">{t('adminFeatureDiscovery.comingSoon')}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
              <p className="font-medium text-gray-500 dark:text-gray-400">{t('adminFeatureDiscovery.noFeatures')}</p>
            </div>
          ) : filtered.map((f) => (
            <Link key={f.name} href={f.href} className={`block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 ${f.status === 'coming' ? 'opacity-60 pointer-events-none' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{getName(f)}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{getModule(f)}</p>
                  </div>
                </div>
                {statusBadge(f.status)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{getDesc(f)}</p>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
