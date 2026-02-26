import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  EyeIcon,
  CalendarDaysIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface ImpersonationLog {
  id: number;
  admin_name: string;
  admin_email: string;
  target_user_name: string;
  target_user_email: string;
  target_tenant: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  reason: string;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export default function ImpersonationLogsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<ImpersonationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
      });
      const res = await fetch(`http://localhost:4000/api/platform/impersonation-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch impersonation logs');
      const json = await res.json();
      setLogs(json.data || []);
      setTotal(json.total || 0);
    } catch (err) {
      showToast('error', t('platform.impersonation.fetchError') || 'Failed to load impersonation logs');
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );

  return (
    <MainLayout>
      <Head>
        <title>{t('platform.impersonation.title') || 'Impersonation Logs'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('platform.impersonation.title') || 'Impersonation Logs'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('platform.impersonation.subtitle') || 'Audit trail of admin impersonation sessions'}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
          >
            <FunnelIcon className="h-4 w-4" />
            {t('common.filters') || 'Filters'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  <CalendarDaysIcon className="inline h-3.5 w-3.5 mr-1" />
                  {t('common.from') || 'From'}
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  <CalendarDaysIcon className="inline h-3.5 w-3.5 mr-1" />
                  {t('common.to') || 'To'}
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <button onClick={handleApplyFilters} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                {t('common.apply') || 'Apply'}
              </button>
              <button onClick={handleClearFilters} className="px-4 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white text-sm">
                {t('common.clear') || 'Clear'}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('platform.impersonation.admin') || 'Admin'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('platform.impersonation.targetUser') || 'Target User'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('platform.impersonation.targetTenant') || 'Target Tenant'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('platform.impersonation.startTime') || 'Start Time'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('platform.impersonation.endTime') || 'End Time'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('platform.impersonation.duration') || 'Duration'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('platform.impersonation.reason') || 'Reason'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <EyeIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">{t('platform.impersonation.empty') || 'No impersonation sessions recorded'}</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{log.admin_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{log.admin_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-white">{log.target_user_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{log.target_user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{log.target_tenant}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {new Date(log.start_time).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {log.end_time ? new Date(log.end_time).toLocaleString() : <span className="text-yellow-600 dark:text-yellow-400 font-medium">Active</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDuration(log.duration_seconds)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[200px] truncate" title={log.reason}>
                        {log.reason || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.showing') || 'Showing'} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {t('common.of') || 'of'} {total}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {t('common.previous') || 'Previous'}
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {t('common.next') || 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
