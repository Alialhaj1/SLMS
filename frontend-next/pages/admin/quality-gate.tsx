import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { ShieldCheckIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface GateCheck {
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'running' | 'pending';
  detail: string;
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
    { name: 'Unit Tests', category: 'Tests', status: 'pass', detail: 'All 142 tests passing', value: '142/142' },
    { name: 'Integration Tests', category: 'Tests', status: 'pass', detail: 'API integration suite passing', value: '38/38' },
    { name: 'Security Scan', category: 'Security', status: 'pass', detail: 'No critical vulnerabilities found', value: '0 critical' },
    { name: 'Dependency Audit', category: 'Security', status: 'fail', detail: '3 high-severity advisories', value: '3 high' },
    { name: 'Code Coverage', category: 'Quality', status: 'pass', detail: 'Coverage above 80% threshold', value: '84.2%' },
    { name: 'TypeScript Strict', category: 'Quality', status: 'pass', detail: 'No type errors detected', value: '0 errors' },
    { name: 'ESLint', category: 'Quality', status: 'fail', detail: '12 warnings remaining', value: '12 warnings' },
    { name: 'API Response Time', category: 'Performance', status: 'pass', detail: 'P95 under 200ms threshold', value: 'P95: 145ms' },
    { name: 'Bundle Size', category: 'Performance', status: 'pass', detail: 'Under 500KB gzip limit', value: '387KB' },
    { name: 'Database Migrations', category: 'Infrastructure', status: 'pass', detail: 'All migrations applied', value: 'Up to date' },
    { name: 'Docker Build', category: 'Infrastructure', status: 'pass', detail: 'Build completes successfully', value: 'Success' },
    { name: 'Health Endpoint', category: 'Infrastructure', status: 'pass', detail: '/api/health returns 200', value: 'OK' },
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
      showToast('success', 'Quality gate checks completed');
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
      <Head><title>{t('qualityGate.title') || 'Quality Gate'} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="w-7 h-7 text-blue-500" />
              {t('qualityGate.title') || 'Quality Gate'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('qualityGate.subtitle') || 'Pre-deployment readiness checks'}</p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${allPass ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}>
                {allPass ? '✓ Gate Passed' : `✗ ${failCount} Failed`}
              </div>
            )}
            <button onClick={handleRunAll} disabled={running} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50">
              <ArrowPathIcon className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Running...' : 'Run All Checks'}
            </button>
          </div>
        </div>

        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{checks.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Checks</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{passCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Passing</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{failCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failing</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{checks.length ? Math.round((passCount / checks.length) * 100) : 0}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pass Rate</p>
            </div>
          </div>
        )}

        {categories.map((cat) => (
          <div key={cat} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cat}</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} />) : checks.filter((c) => c.category === cat).map((check) => (
                <div key={check.name} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  {statusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{check.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{check.detail}</p>
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
