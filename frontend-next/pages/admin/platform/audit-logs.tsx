import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ShieldCheckIcon,
  FunnelIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: number;
  timestamp: string;
  user_name: string;
  user_email: string;
  action: string;
  resource: string;
  ip_address: string;
  details: Record<string, unknown> | null;
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  login: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  logout: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function PlatformAuditLogsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        scope: 'platform',
        page: String(page),
        limit: String(pageSize),
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
        ...(filterUser && { user: filterUser }),
        ...(filterAction && { action: filterAction }),
      });
      const res = await fetch(`http://localhost:4000/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const json = await res.json();
      setLogs(json.data || []);
      setTotal(json.total || 0);
    } catch (err) {
      showToast('error', t('platform.audit.fetchError') || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, filterUser, filterAction]);

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
    setFilterUser('');
    setFilterAction('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );

  return (
    <MainLayout>
      <Head>
        <title>{t('platform.audit.title') || 'Platform Audit Logs'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('platform.audit.title') || 'Platform Audit Logs'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('platform.audit.subtitle') || 'System-wide activity log'}
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
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  <CalendarDaysIcon className="inline h-3.5 w-3.5 mr-1" />
                  {t('common.to') || 'To'}
                </label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.user') || 'User'}</label>
                <input type="text" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} placeholder="Email or name..."
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm w-48" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.action') || 'Action'}</label>
                <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm">
                  <option value="">{t('common.all') || 'All'}</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                </select>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('common.timestamp') || 'Timestamp'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('common.user') || 'User'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('common.action') || 'Action'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('common.resource') || 'Resource'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('platform.audit.ipAddress') || 'IP Address'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('common.details') || 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <ShieldCheckIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">{t('platform.audit.empty') || 'No audit logs found'}</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <>
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{log.user_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{log.user_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${actionColors[log.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{log.resource}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{log.ip_address}</td>
                        <td className="px-4 py-3 text-center">
                          {log.details && (
                            <button
                              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                              title="View details"
                            >
                              <InformationCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === log.id && log.details && (
                        <tr key={`${log.id}-details`}>
                          <td colSpan={6} className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50">
                            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap font-mono">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
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
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {t('common.previous') || 'Previous'}
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
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
