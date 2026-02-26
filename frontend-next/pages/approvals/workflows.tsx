import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { QueueListIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface WorkflowStep {
  order: number;
  role: string;
  action: string;
  status: 'completed' | 'current' | 'pending';
  completed_by?: string;
  completed_at?: string;
}

interface Workflow {
  id: number;
  name: string;
  module: string;
  is_active: boolean;
  steps: WorkflowStep[];
  total_instances: number;
  active_instances: number;
}

export default function WorkflowsOverviewPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/approval-workflows', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setWorkflows(data.data || []);
    } catch {
      showToast('error', t('errors.load') || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => setExpanded(expanded === id ? null : id);

  const stepStatusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    if (s === 'current') return <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-blue-500" /></div>;
    return <ClockIcon className="w-5 h-5 text-gray-300 dark:text-slate-600" />;
  };

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
      <div className="flex gap-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-gray-200 dark:bg-slate-700 rounded-full w-8" />)}
      </div>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('workflows.title') || 'Workflows Overview'} - SLMS</title></Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <QueueListIcon className="w-7 h-7 text-blue-500" />
            {t('workflows.title') || 'Workflows Overview'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('workflows.subtitle') || 'Visual overview of approval workflow step sequences'}</p>
        </div>

        <div className="space-y-4">
          {loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />) : workflows.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
              <QueueListIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
              <p className="font-medium text-gray-500 dark:text-gray-400">No workflows configured</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create workflows from the admin panel</p>
            </div>
          ) : workflows.map((wf) => (
            <div key={wf.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => toggleExpand(wf.id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors text-left">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{wf.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{wf.module} · {wf.steps?.length || 0} steps</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${wf.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'}`}>
                    {wf.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{wf.active_instances || 0} in progress</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === wf.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>

              {expanded === wf.id && wf.steps && wf.steps.length > 0 && (
                <div className="px-5 pb-5 border-t border-gray-100 dark:border-slate-700 pt-4">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {wf.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex flex-col items-center">
                          {stepStatusIcon(step.status || 'pending')}
                          <div className="mt-1 text-center">
                            <p className="text-xs font-medium text-gray-900 dark:text-white">{step.role}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{step.action}</p>
                            {step.completed_by && <p className="text-[10px] text-green-500">{step.completed_by}</p>}
                          </div>
                        </div>
                        {idx < wf.steps.length - 1 && (
                          <div className={`w-8 h-0.5 ${step.status === 'completed' ? 'bg-green-400' : 'bg-gray-200 dark:bg-slate-600'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
