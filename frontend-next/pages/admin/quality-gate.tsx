import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { ShieldCheckIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface GateCheck {
  key: string;
  category: string;
  status: 'pass' | 'fail' | 'running' | 'pending';
  value?: string;
}

export default function QualityGatePage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [checks, setChecks] = useState<GateCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const defaultChecks: GateCheck[] = [
    { key: 'unitTests', category: 'Tests', status: 'pass', value: '142/142' },
    { key: 'integrationTests', category: 'Tests', status: 'pass', value: '38/38' },
    { key: 'securityScan', category: 'Security', status: 'pass', value: '0 critical' },
    { key: 'dependencyAudit', category: 'Security', status: 'fail', value: '3 high' },
    { key: 'codeCoverage', category: 'Quality', status: 'pass', value: '84.2%' },
    { key: 'typescriptStrict', category: 'Quality', status: 'pass', value: '0 errors' },
    { key: 'eslint', category: 'Quality', status: 'fail', value: '12 warnings' },
    { key: 'apiResponseTime', category: 'Performance', status: 'pass', value: 'P95: 145ms' },
    { key: 'bundleSize', category: 'Performance', status: 'pass', value: '387KB' },
    { key: 'dbMigrations', category: 'Infrastructure', status: 'pass', value: 'Up to date' },
    { key: 'dockerBuild', category: 'Infrastructure', status: 'pass', value: 'Success' },
    { key: 'healthEndpoint', category: 'Infrastructure', status: 'pass', value: 'OK' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setChecks(defaultChecks);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleRunAll = () => {
    setRunning(true);
    setChecks(checks.map((c) => ({ ...c, status: 'running' as const })));
    setTimeout(() => {
      setChecks(defaultChecks);
      setRunning(false);
      showToast('success', t('adminQualityGate.checksCompleted'));
    }, 2000);
  };

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const allPass = failCount === 0 && checks.length > 0;

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    if (s === 'fail') return <XCircleIcon className="w-5 h-5 text-red-500" />;
    if (s === 'running') return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
    return <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-slate-600" />;
  };

  const categories = [...new Set(checks.map((c) => c.category))];

  const SkeletonRow = () => (
    <div className="animate-pulse flex items-center gap-4 p-4">
      <div className="w-5 h-5 bg-gray-200 dark:bg-slate-700 rounded-full" />
      <div className="flex-1"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-1" /><div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3" /></div>
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16" />
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('adminQualityGate.title')} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="w-7 h-7 text-blue-500" />
              {t('adminQualityGate.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('adminQualityGate.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${allPass ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}>
                {allPass ? t('adminQualityGate.gatePassed') : `✗ ${failCount} ${t('adminQualityGate.failing')}`}
              </div>
            )}
            <button onClick={handleRunAll} disabled={running} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50">
              <ArrowPathIcon className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
              {running ? t('adminQualityGate.running') : t('adminQualityGate.runAllChecks')}
            </button>
          </div>
        </div>

        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{checks.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminQualityGate.totalChecks')}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{passCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminQualityGate.passing')}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{failCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminQualityGate.failing')}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{checks.length ? Math.round((passCount / checks.length) * 100) : 0}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminQualityGate.passRate')}</p>
            </div>
          </div>
        )}

        {categories.map((cat) => (
          <div key={cat} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t(`adminQualityGate.categories.${cat}`)}</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} />) : checks.filter((c) => c.category === cat).map((check) => (
                <div key={check.name} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  {statusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t(`adminQualityGate.checks.${check.key}.name`)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t(`adminQualityGate.checks.${check.key}.detail`)}</p>
                  </div>
                  {check.value && <span className="text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">{check.value}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}
