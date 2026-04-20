import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';

interface ProvisioningTask {
  id: number;
  tenant_name: string;
  tenant_code: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  steps: { name: string; status: 'pending' | 'running' | 'done' | 'error'; progress: number }[];
  started_at?: string;
  completed_at?: string;
}

const taskStatusColors: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const stepStatusIcon: Record<string, string> = {
  pending: '⏳', running: '🔄', done: '✅', error: '❌',
};

export default function ProvisioningPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<ProvisioningTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/admin/provisioning', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const arr = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      setTasks(arr);
    } catch {
      if (loading) showToast('error', t('adminProvisioning.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getOverallProgress = (steps: ProvisioningTask['steps']) => {
    if (!steps.length) return 0;
    return Math.round(steps.reduce((sum, s) => sum + s.progress, 0) / steps.length);
  };

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-4" />
      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-full" />
    </div>
  );

  return (
    <MainLayout>
      <Head>
        <title>{t('adminProvisioning.title')} - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adminProvisioning.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('adminProvisioning.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('adminProvisioning.autoRefresh')}</span>
            <button onClick={fetchTasks} className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-sm transition-colors">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {t('adminProvisioning.refresh')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('adminProvisioning.queued'), count: tasks.filter((t) => t.status === 'queued').length, color: 'text-gray-600 dark:text-gray-400' },
            { label: t('adminProvisioning.inProgress'), count: tasks.filter((t) => t.status === 'in_progress').length, color: 'text-blue-600 dark:text-blue-400' },
            { label: t('adminProvisioning.completed'), count: tasks.filter((t) => t.status === 'completed').length, color: 'text-green-600 dark:text-green-400' },
            { label: t('adminProvisioning.failed'), count: tasks.filter((t) => t.status === 'failed').length, color: 'text-red-600 dark:text-red-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : tasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <p className="font-medium text-gray-500 dark:text-gray-400">{t('adminProvisioning.noTasks')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('adminProvisioning.newTenantsHere')}</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{task.tenant_name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{task.tenant_code}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${taskStatusColors[task.status]}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${task.status === 'failed' ? 'bg-red-500' : task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${getOverallProgress(task.steps)}%` }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {task.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span>{stepStatusIcon[step.status]}</span>
                      <span>{step.name}</span>
                      <span className="ml-auto text-gray-400">{step.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
