import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface DeletedRecord {
  id: number;
  resourceType: string;
  recordId: number;
  name: string;
  deletedBy: string;
  deletedAt: string;
}

const RESOURCE_TYPES = ['All', 'users', 'companies', 'shipments', 'expenses', 'suppliers', 'warehouses'];

export default function DeletedRecords() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const query = filter !== 'All' ? `?resourceType=${filter}` : '';
      const res = await fetch(`http://localhost:4000/api/deleted-records${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRecords(data.data ?? []);
    } catch {
      showToast('error', 'Failed to load deleted records');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (record: DeletedRecord) => {
    setRestoring(record.id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/deleted-records/${record.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', `Record "${record.name}" restored successfully`);
      fetchRecords();
    } catch {
      showToast('error', 'Failed to restore record');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>Deleted Records - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deleted Records</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Browse and restore soft-deleted records.
            </p>
          </div>
          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              aria-label="Filter by resource type"
            >
              {RESOURCE_TYPES.map((rt) => (
                <option key={rt} value={rt}>{rt === 'All' ? 'All Resources' : rt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Resource Type', 'Name', 'Deleted By', 'Deleted At', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <TrashIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No deleted records found.</p>
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                        {rec.resourceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{rec.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{rec.deletedBy}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(rec.deletedAt).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleRestore(rec)}
                        disabled={restoring === rec.id}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        aria-label={`Restore ${rec.name}`}
                      >
                        <ArrowPathIcon className={`h-3 w-3 ${restoring === rec.id ? 'animate-spin' : ''}`} />
                        {restoring === rec.id ? 'Restoring…' : 'Restore'}
                      </button>
                    </td>
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
