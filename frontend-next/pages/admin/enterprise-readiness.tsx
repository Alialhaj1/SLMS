import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { ShieldCheckIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface CheckItem {
  key: string;
  done: boolean;
  critical?: boolean;
}

interface Section {
  name: string;
  icon: string;
  color: string;
  items: CheckItem[];
}

const buildSections = (): Section[] => [
  {
    name: 'Security', icon: '🔒', color: 'blue',
    items: [
      { key: 'jwt_auth', done: true },
      { key: 'rbac', done: true },
      { key: 'bcrypt', done: true },
      { key: 'sql_injection', done: true },
      { key: 'rate_limiting', done: false, critical: true },
      { key: 'cors', done: false },
      { key: 'https', done: true },
      { key: 'sensitive_data', done: true },
    ],
  },
  {
    name: 'Compliance', icon: '📋', color: 'green',
    items: [
      { key: 'audit_logging', done: true },
      { key: 'soft_deletes', done: true },
      { key: 'data_export', done: false },
      { key: 'user_consent', done: false },
      { key: 'password_policy', done: true },
      { key: 'session_timeout', done: false },
    ],
  },
  {
    name: 'Performance', icon: '⚡', color: 'yellow',
    items: [
      { key: 'db_pooling', done: true },
      { key: 'query_optimization', done: true },
      { key: 'redis_caching', done: false },
      { key: 'code_splitting', done: true },
      { key: 'image_optimization', done: false },
      { key: 'load_testing', done: false, critical: true },
    ],
  },
  {
    name: 'Scalability', icon: '📈', color: 'purple',
    items: [
      { key: 'multi_tenant', done: true },
      { key: 'horizontal_scaling', done: true },
      { key: 'message_queue', done: true },
      { key: 'read_replicas', done: false },
      { key: 'cdn', done: false },
    ],
  },
  {
    name: 'Documentation', icon: '📄', color: 'gray',
    items: [
      { key: 'api_docs', done: true },
      { key: 'deployment_guide', done: true },
      { key: 'onboarding_guide', done: false },
      { key: 'adr', done: false },
      { key: 'user_manual', done: false, critical: true },
    ],
  },
];

export default function EnterpriseReadinessPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSections(buildSections());
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const doneItems = sections.reduce((sum, s) => sum + s.items.filter((i) => i.done).length, 0);
  const overallPct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500', purple: 'bg-purple-500', gray: 'bg-gray-500',
  };

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2" />
      ))}
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('adminEnterpriseReadiness.title')} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="w-7 h-7 text-blue-500" />
              {t('adminEnterpriseReadiness.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('adminEnterpriseReadiness.subtitle')}</p>
          </div>
          {!loading && (
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{overallPct}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{doneItems}/{totalItems} {t('adminEnterpriseReadiness.itemsComplete')}</p>
            </div>
          )}
        </div>

        {!loading && (
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
            <div className="h-3 rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${overallPct}%` }} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />) : sections.map((section) => {
            const pct = section.items.length ? Math.round((section.items.filter((i) => i.done).length / section.items.length) * 100) : 0;
            return (
              <div key={section.name} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{section.icon}</span> {t(`adminEnterpriseReadiness.sections.${section.name}`)}
                  </h3>
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{pct}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mb-4">
                  <div className={`h-1.5 rounded-full ${colorMap[section.color]} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
                <ul className="space-y-2">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      {item.done ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <ExclamationTriangleIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${item.critical ? 'text-red-500' : 'text-gray-300 dark:text-slate-600'}`} />
                      )}
                      <span className={`${item.done ? 'text-gray-600 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'} ${item.critical && !item.done ? 'font-medium' : ''}`}>
                        {t(`adminEnterpriseReadiness.items.${item.key}`)}
                        {item.critical && !item.done && <span className="ml-1 text-xs text-red-500 font-semibold">{t('adminEnterpriseReadiness.critical')}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
