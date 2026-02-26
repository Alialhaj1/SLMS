import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ServerStackIcon,
  ClockIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

interface DRConfig {
  backupStrategy: string;
  rpoMinutes: number;
  rtoMinutes: number;
  failoverEnabled: boolean;
  lastBackup: string | null;
  testHistory: { date: string; result: string; duration: string }[];
}

export default function DisasterRecovery() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [config, setConfig] = useState<DRConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/security/disaster-recovery', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConfig(data.data);
    } catch {
      showToast('error', 'Failed to load disaster recovery config');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { label: 'Backup Strategy', value: config?.backupStrategy ?? '—', icon: ServerStackIcon, color: 'blue' },
    { label: 'RPO', value: config ? `${config.rpoMinutes} min` : '—', icon: ClockIcon, color: 'green' },
    { label: 'RTO', value: config ? `${config.rtoMinutes} min` : '—', icon: ArrowPathIcon, color: 'yellow' },
    { label: 'Failover', value: config?.failoverEnabled ? 'Enabled' : 'Disabled', icon: ShieldCheckIcon, color: 'purple' },
    { label: 'Last Backup', value: config?.lastBackup ? new Date(config.lastBackup).toLocaleString() : '—', icon: BeakerIcon, color: 'gray' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
    gray: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  };

  return (
    <MainLayout>
      <Head>
        <title>Disaster Recovery - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Disaster Recovery</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Backup strategy, recovery objectives, and failover configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {sections.map((s) => (
            <div key={s.label} className={`rounded-lg border border-gray-200 dark:border-gray-700 p-5 ${colorMap[s.color]}`}>
              <div className="flex items-center gap-3">
                <s.icon className="h-6 w-6 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium opacity-75 truncate">{s.label}</p>
                  {loading ? (
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-lg font-bold truncate">{s.value}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">DR Test History</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : !config?.testHistory?.length ? (
            <div className="py-12 text-center">
              <BeakerIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No DR tests have been performed yet.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  {['Date', 'Result', 'Duration'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {config.testHistory.map((test, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{new Date(test.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${test.result === 'Pass' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {test.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{test.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Failover Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Auto-failover</span>
              <span className="font-medium text-gray-900 dark:text-white">{config?.failoverEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Recovery Point Objective</span>
              <span className="font-medium text-gray-900 dark:text-white">{config?.rpoMinutes ?? '—'} min</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
