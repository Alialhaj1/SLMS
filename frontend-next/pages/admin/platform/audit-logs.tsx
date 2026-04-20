/**
 * ============================================================================
 * PLATFORM AUDIT LOGS - System-Wide Activity Log with Severity Filtering
 * ============================================================================
 * QA Scenarios:
 *   01 – Red alert box about log immutability ✅
 *   02 – Read-only, no delete buttons ✅
 *   03 – Severity filter (danger/info/warning) ✅
 *   04 – Severity filter clears and shows all ✅
 *   05 – Clear filters button with ✕ ✅
 *   06 – Action column in code monospace format (resource.action) ✅
 *   07 – Text search across user/resource/action ✅
 *   08 – Real-time logging (refresh button) ✅
 *
 * @module pages/admin/platform/audit-logs
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import {
  ShieldCheckIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

/* ── Types ── */
interface AuditLog {
  id: number;
  timestamp: string;
  user_name: string;
  user_email: string;
  action: string;
  resource: string;
  ip_address: string;
  details: Record<string, unknown> | null;
  severity?: 'info' | 'warning' | 'critical';
}

/* ── Styles ── */
const ACTION_COLORS: Record<string, { bg: string; icon: string }> = {
  create: { bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '➕' },
  update: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '✏️' },
  delete: { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '🗑️' },
  login: { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: '🔑' },
  logout: { bg: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: '🚪' },
  import: { bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '📥' },
  export: { bg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: '📤' },
};

const SEVERITY_CONFIG: Record<string, { bg: string; label: string; labelAr: string; icon: string }> = {
  info: { bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', label: 'Info', labelAr: 'معلومات', icon: 'ℹ️' },
  warning: { bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', label: 'Warning', labelAr: 'تحذير', icon: '⚠️' },
  critical: { bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800', label: 'Critical', labelAr: 'خطير', icon: '🔴' },
};

const ACTION_TYPES = ['create', 'update', 'delete', 'login', 'logout', 'import', 'export'];

export default function PlatformAuditLogsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setLoading(false); return; }
      const params = new URLSearchParams({
        scope: 'platform',
        page: String(page),
        limit: String(pageSize),
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
        ...(filterUser && { user: filterUser }),
        ...(filterAction && { action: filterAction }),
        ...(filterSeverity && { severity: filterSeverity }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setLogs(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total || json.meta?.total || 0);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, filterUser, filterAction, filterSeverity, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  /* ── Client-side text search fallback ── */
  const displayLogs = search
    ? logs.filter(l =>
        l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.resource?.toLowerCase().includes(search.toLowerCase()) ||
        `${l.resource}.${l.action}`.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  /* ── Severity client-side filter (fallback if API doesn't support it) ── */
  const filteredLogs = filterSeverity
    ? displayLogs.filter(l => (l.severity || 'info') === filterSeverity)
    : displayLogs;

  const handleClearFilters = () => {
    setDateFrom(''); setDateTo(''); setFilterUser(''); setFilterAction('');
    setFilterSeverity(''); setSearch('');
    setPage(1);
  };

  const hasActiveFilters = dateFrom || dateTo || filterUser || filterAction || filterSeverity || search;

  const totalPages = Math.ceil(total / pageSize);

  /* ── Severity counts ── */
  const severityCounts = {
    info: logs.filter(l => (l.severity || 'info') === 'info').length,
    warning: logs.filter(l => l.severity === 'warning').length,
    critical: logs.filter(l => l.severity === 'critical').length,
  };

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'سجلات التدقيق' : 'Platform Audit Logs'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* 🔴 Log Protection Alert (QA Scenario 01) */}
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
          <LockClosedIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              {isRTL ? '🔒 سجلات التدقيق محمية ولا يمكن حذفها أو تعديلها' : '🔒 Audit logs are protected and cannot be deleted or modified'}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {isRTL ? 'يتم تسجيل جميع الأنشطة تلقائياً للامتثال والأمان. هذه السجلات للقراءة فقط.' : 'All activities are automatically logged for compliance and security. These records are read-only.'}
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
              {isRTL ? 'سجلات التدقيق' : 'Platform Audit Logs'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRTL ? 'سجل النشاط الشامل على مستوى المنصة' : 'System-wide activity audit trail'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
              {total.toLocaleString()} {isRTL ? 'سجل' : 'records'}
            </span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              <FunnelIcon className="h-4 w-4" />
              {isRTL ? 'فلاتر' : 'Filters'}
            </button>
            <button onClick={fetchLogs} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors" title={isRTL ? 'تحديث' : 'Refresh'}>
              <ArrowPathIcon className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar + Severity Filter Tabs (QA Scenarios 03, 04, 07) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Text search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isRTL ? 'بحث في المستخدم، المورد، الإجراء...' : 'Search user, resource, action...'}
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

          {/* Severity Filter Tabs */}
          <div className="flex gap-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setFilterSeverity('')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${!filterSeverity ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              {isRTL ? 'الكل' : 'All'}
            </button>
            {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setFilterSeverity(filterSeverity === key ? '' : key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${filterSeverity === key ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              >
                {cfg.icon} {isRTL ? cfg.labelAr : cfg.label}
                {severityCounts[key as keyof typeof severityCounts] > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterSeverity === key ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-700'}`}>
                    {severityCounts[key as keyof typeof severityCounts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Clear All Filters (QA Scenario 05) */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-xs font-medium transition-colors"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              {isRTL ? 'مسح الكل' : 'Clear All'}
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'من تاريخ' : 'From'}</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'إلى تاريخ' : 'To'}</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'المستخدم' : 'User'}</label>
                <input type="text" value={filterUser} onChange={e => setFilterUser(e.target.value)} placeholder={isRTL ? 'بريد أو اسم...' : 'Email or name...'}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm w-48" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'الإجراء' : 'Action'}</label>
                <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm">
                  <option value="">{isRTL ? 'الكل' : 'All'}</option>
                  {ACTION_TYPES.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
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
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'الوقت' : 'Time'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'المستخدم' : 'User'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'الإجراء' : 'Action'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'الخطورة' : 'Severity'}</th>
                  <th className="px-4 py-3 text-left rtl:text-right font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">IP</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'التفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <ShieldCheckIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{isRTL ? 'لا توجد سجلات' : 'No audit logs found'}</p>
                      {(search || filterSeverity) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {isRTL ? 'جرب تعديل معايير البحث أو الفلاتر' : 'Try adjusting your search or filters'}
                        </p>
                      )}
                    </td>
                  </tr>
                ) : filteredLogs.map(log => {
                  const severity = log.severity || 'info';
                  const sevCfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
                  const actionCode = `${log.resource}.${log.action}`;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        {/* Time */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {new Date(log.timestamp).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </td>
                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0">
                              {log.user_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900 dark:text-white">{log.user_name}</p>
                              <p className="text-[10px] text-gray-400" dir="ltr">{log.user_email}</p>
                            </div>
                          </div>
                        </td>
                        {/* Action - Monospace Code Format (QA Scenario 06) */}
                        <td className="px-4 py-3">
                          <code className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono font-semibold rounded-md bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600">
                            {actionCode}
                          </code>
                        </td>
                        {/* Severity */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${sevCfg.bg}`}>
                            {sevCfg.icon} {isRTL ? sevCfg.labelAr : sevCfg.label}
                          </span>
                        </td>
                        {/* IP */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[10px] font-mono text-gray-400">{log.ip_address}</span>
                        </td>
                        {/* Details Expand */}
                        <td className="px-4 py-3 text-center">
                          {log.details && (
                            <button
                              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === log.id && log.details && (
                        <tr>
                          <td colSpan={6} className="px-6 py-3 bg-gray-50 dark:bg-slate-900/50">
                            <pre className="text-[11px] text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap font-mono max-h-60 overflow-y-auto bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
    </MainLayout>
  );
}
