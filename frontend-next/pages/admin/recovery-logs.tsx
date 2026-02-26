import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface RecoveryLog {
  id: number;
  timestamp: string;
  adminName: string;
  resourceType: string;
  recordId: number;
  action: 'restored' | 'purged';
}

export default function RecoveryLogs() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<RecoveryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/recovery-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLogs(data.data ?? []);
    } catch {
      showToast('error', 'Failed to load recovery logs');
    } finally {
      setLoading(false);
    }
  };

  const actionBadge = (action: RecoveryLog['action']) => {
    const cls = action === 'restored'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${cls}`}>{action}</span>;
  };

  return (
    <MainLayout>
      <Head>
        <title>Recovery Logs - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recovery Logs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Audit trail of data recovery and purge actions performed by administrators.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Timestamp', 'Admin', 'Resource', 'Record ID', 'Action'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <DocumentMagnifyingGlassIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No recovery logs recorded yet.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{log.adminName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                        {log.resourceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">#{log.recordId}</td>
                    <td className="px-6 py-4">{actionBadge(log.action)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
