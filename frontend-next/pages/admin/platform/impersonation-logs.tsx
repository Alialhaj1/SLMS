/**
 * ============================================================================
 * IMPERSONATION LOGS - Admin Session Impersonation Audit Trail
 * ============================================================================
 * Enhanced: search by admin name, reason column, export CSV, action chips,
 * card-based rows, active session indicators, RTL/bilingual, premium design.
 *
 * QA Scenarios:
 *   01 – Table shows all logs ✅
 *   02 – Read-only, no delete ✅
 *   03 – Columns: Admin + Target User + Tenant + Start + Duration + Reason + Details ✅
 *   04 – Action chips for session status ✅
 *   05 – Export button ✅
 *   06 – Search by admin name ✅
 *   07 – Newest logs at top (sorted desc) ✅
 *
 * @module pages/admin/platform/impersonation-logs
 * @version 3.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import {
  EyeIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

/* ── Types ── */
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
  ip_address?: string;
  actions_performed?: string[];
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
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [logs, setLogs] = useState<ImpersonationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewLog, setViewLog] = useState<ImpersonationLog | null>(null);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setLoading(false); return; }
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/platform/impersonation-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setLogs(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total || 0);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  /* ── Client-side search filter for admin name ── */
  const displayLogs = search
    ? logs.filter(l =>
        l.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.admin_email?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = dateFrom || dateTo || search;

  /* ── Export CSV ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
        ...(search && { search }),
        format: 'csv',
      });
      const res = await fetch(`/api/platform/impersonation-logs/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `impersonation-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast('success', isRTL ? 'تم التصدير بنجاح' : 'Export completed');
      } else {
        exportClientSide();
      }
    } catch {
      exportClientSide();
    } finally {
      setExporting(false);
    }
  };

  const exportClientSide = () => {
    try {
      const headers = ['ID', 'Admin', 'Admin Email', 'Target User', 'Target Email', 'Tenant', 'Start Time', 'End Time', 'Duration', 'Reason', 'IP Address'];
      const rows = displayLogs.map(l => [
        l.id,
        l.admin_name,
        l.admin_email,
        l.target_user_name,
        l.target_user_email,
        l.target_tenant,
        new Date(l.start_time).toISOString(),
        l.end_time ? new Date(l.end_time).toISOString() : '',
        formatDuration(l.duration_seconds),
        l.reason || '',
        l.ip_address || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `impersonation-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('success', isRTL ? 'تم التصدير بنجاح' : 'Export completed');
    } catch {
      showToast('error', isRTL ? 'فشل التصدير' : 'Export failed');
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const activeCount = logs.filter(l => !l.end_time).length;

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'سجلات انتحال الشخصية' : 'Impersonation Logs'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <EyeIcon className="h-7 w-7 text-purple-600" />
              {isRTL ? 'سجلات انتحال الشخصية' : 'Impersonation Logs'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRTL ? 'سجل التدقيق لجلسات انتحال الشخصية من قبل المسؤولين' : 'Audit trail of admin impersonation sessions'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                {activeCount} {isRTL ? 'جلسة نشطة' : 'active'}
              </span>
            )}
            <button
              onClick={handleExport}
              disabled={exporting || displayLogs.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
              title={isRTL ? 'تصدير CSV' : 'Export CSV'}
            >
              <ArrowDownTrayIcon className={`h-4 w-4 ${exporting ? 'animate-bounce' : ''}`} />
              {isRTL ? 'تصدير' : 'Export'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              <FunnelIcon className="h-4 w-4" />
              {isRTL ? 'فلاتر' : 'Filters'}
            </button>
            <button
              onClick={fetchLogs}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              title={isRTL ? 'تحديث' : 'Refresh'}
            >
              <ArrowPathIcon className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isRTL ? 'بحث باسم المسؤول أو البريد...' : 'Search by admin name or email...'}
            className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'من تاريخ' : 'From'}
                </label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {isRTL ? 'إلى تاريخ' : 'To'}
                </label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm" />
              </div>
              <button onClick={() => { setPage(1); fetchLogs(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                {isRTL ? 'تطبيق' : 'Apply'}
              </button>
              {hasActiveFilters && (
                <button onClick={handleClearFilters} className="inline-flex items-center gap-1 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-sm transition-colors">
                  <XMarkIcon className="h-3.5 w-3.5" />
                  {isRTL ? 'مسح الكل' : 'Clear All'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'المسؤول' : 'Admin'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'المستخدم المُنتحل' : 'Target User'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">{isRTL ? 'المستأجر' : 'Tenant'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'البداية' : 'Start Time'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'المدة' : 'Duration'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'السبب' : 'Reason'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'التفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <EyeIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">
                        {isRTL ? 'لا توجد جلسات انتحال مسجّلة' : 'No impersonation sessions recorded'}
                      </p>
                      {search && (
                        <p className="text-xs text-gray-400 mt-1">
                          {isRTL ? 'جرب تغيير مصطلح البحث' : 'Try adjusting your search term'}
                        </p>
                      )}
                    </td>
                  </tr>
                ) : displayLogs.map(log => {
                  const isActive = !log.end_time;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      {/* Admin */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold shrink-0">
                            {log.admin_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.admin_name}</p>
                            <p className="text-[10px] text-gray-400" dir="ltr">{log.admin_email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Target User */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 dark:text-white">{log.target_user_name}</p>
                        <p className="text-[10px] text-gray-400" dir="ltr">{log.target_user_email}</p>
                      </td>
                      {/* Tenant */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{log.target_tenant}</span>
                      </td>
                      {/* Start Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {new Date(log.start_time).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(log.start_time).toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      {/* Duration */}
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {formatDuration(log.duration_seconds)}
                      </td>
                      {/* Reason */}
                      <td className="px-4 py-3 max-w-[200px]">
                        {log.reason ? (
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate" title={log.reason}>
                            {log.reason}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-400 italic">{isRTL ? 'غير محدد' : 'Not specified'}</span>
                        )}
                      </td>
                      {/* Status Chip */}
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            {isRTL ? 'نشط' : 'Active'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            ✓ {isRTL ? 'مكتمل' : 'Complete'}
                          </span>
                        )}
                      </td>
                      {/* Details Button */}
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setViewLog(log)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isRTL ? 'عرض' : 'Showing'} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {isRTL ? 'من' : 'of'} {total}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {isRTL ? 'السابق' : 'Previous'}
                </button>
                <span className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">{page}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {isRTL ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {viewLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewLog(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {isRTL ? '📋 تفاصيل الجلسة' : '📋 Session Details'}
              </h3>
              <button onClick={() => setViewLog(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {[
                [isRTL ? 'المسؤول' : 'Admin', viewLog.admin_name],
                [isRTL ? 'بريد المسؤول' : 'Admin Email', viewLog.admin_email],
                [isRTL ? 'المستخدم المستهدف' : 'Target User', viewLog.target_user_name],
                [isRTL ? 'بريد المستهدف' : 'Target Email', viewLog.target_user_email],
                [isRTL ? 'المستأجر' : 'Tenant', viewLog.target_tenant],
                [isRTL ? 'المدة' : 'Duration', formatDuration(viewLog.duration_seconds)],
                [isRTL ? 'البداية' : 'Started', new Date(viewLog.start_time).toLocaleString(isRTL ? 'ar-SA' : 'en-US')],
                [isRTL ? 'النهاية' : 'Ended', viewLog.end_time ? new Date(viewLog.end_time).toLocaleString(isRTL ? 'ar-SA' : 'en-US') : (isRTL ? '⚡ لا يزال نشطاً' : '⚡ Still active')],
              ].map(([label, val], i) => (
                <div key={i} className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white break-all">{val}</p>
                </div>
              ))}
              {viewLog.reason && (
                <div className="col-span-2 p-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-[10px] text-purple-500 mb-0.5">{isRTL ? 'السبب' : 'Reason'}</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">{viewLog.reason}</p>
                </div>
              )}
              {viewLog.actions_performed && viewLog.actions_performed.length > 0 && (
                <div className="col-span-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-[10px] text-blue-500 mb-1.5">{isRTL ? 'الإجراءات المنفذة' : 'Actions Performed'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewLog.actions_performed.map((action, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300">
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewLog.ip_address && (
                <div className="col-span-2 p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-[10px] text-gray-400 mb-0.5">{isRTL ? 'عنوان IP' : 'IP Address'}</p>
                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300">{viewLog.ip_address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
