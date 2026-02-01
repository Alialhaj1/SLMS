/**
 * 📋 USE AUDIT LOGS - Hook لسجل التدقيق
 * =====================================================
 * 
 * يوفر:
 * ✅ جلب السجلات مع pagination
 * ✅ فلترة متقدمة
 * ✅ تحديث تلقائي
 * ✅ تصدير
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  AuditLog, 
  AuditLogFilters, 
  AuditLogResponse,
  AuditStats,
  AuditExportOptions,
} from '../types/audit';
import { apiClient } from '../lib/apiClient';

interface UseAuditLogsState {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

interface UseAuditLogsReturn extends UseAuditLogsState {
  filters: AuditLogFilters;
  setFilters: (filters: AuditLogFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
  exportLogs: (options: AuditExportOptions) => Promise<void>;
  getLogDetails: (id: string) => Promise<AuditLog | null>;
  stats: AuditStats | null;
  loadStats: () => Promise<void>;
}

/**
 * تحويل action من Backend إلى eventType للـ Frontend
 */
function mapActionToEventType(action: string): AuditLog['eventType'] {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('create') || actionLower.includes('add')) return 'CREATE';
  if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('modify')) return 'UPDATE';
  if (actionLower.includes('delete') || actionLower.includes('remove')) return 'DELETE';
  if (actionLower.includes('login')) return 'LOGIN';
  if (actionLower.includes('logout')) return 'LOGOUT';
  if (actionLower.includes('post')) return 'POST';
  if (actionLower.includes('reverse')) return 'REVERSE';
  if (actionLower.includes('approve')) return 'APPROVE';
  if (actionLower.includes('reject')) return 'REJECT';
  if (actionLower.includes('export')) return 'EXPORT';
  if (actionLower.includes('import')) return 'IMPORT';
  // لا توجد قيم LOCK/UNLOCK في النوع؛ نستخدم STATUS_CHANGE
  if (actionLower.includes('lock') || actionLower.includes('unlock')) return 'STATUS_CHANGE';
  
  // قيمة افتراضية آمنة ضمن النوع
  return 'UPDATE';
}

export function useAuditLogs(): UseAuditLogsReturn {
  const [state, setState] = useState<UseAuditLogsState>({
    logs: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    isLoading: false,
    error: null,
  });

  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [stats, setStats] = useState<AuditStats | null>(null);

  /**
   * جلب السجلات
   */
  const fetchLogs = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // بناء الاستعلام كـ query string
      const qs = new URLSearchParams({
        page: String(state.page),
        limit: String(state.pageSize),
        ...(filters.eventType ? { action: String(filters.eventType) } : {}),
        ...(filters.resource ? { resource_type: String(filters.resource) } : {}),
        ...(filters.search ? { search: String(filters.search) } : {}),
        ...(filters.userId ? { user_id: String(filters.userId) } : {}),
        ...(filters.companyId ? { company_id: String(filters.companyId) } : {}),
        ...(filters.branchId ? { branch_id: String(filters.branchId) } : {}),
        ...(filters.dateFrom ? { date_from: String(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { date_to: String(filters.dateTo) } : {}),
        ...(typeof filters.success === 'boolean' ? { success: String(filters.success) } : {}),
      }).toString();

      const result: any = await apiClient.get(`/api/audit-logs?${qs}`);

      // تحويل البيانات من Backend format إلى Frontend format
      const rawList: any[] = Array.isArray(result) ? result : (result?.data ?? []);
      const logs: AuditLog[] = rawList.map((log: any) => ({
        id: String(log.id ?? ''),
        eventType: mapActionToEventType(String(log.action ?? 'update')),
        resource: String(log.resource_type ?? 'system') as any,
        resourceId: String(log.resource_id ?? ''),
        resourceName: String(log.resource_name ?? log.resource_type ?? ''),
        userId: String(log.user_id ?? ''),
        userName: String(log.user_name ?? log.user_email ?? ''),
        userEmail: log.user_email ?? undefined,
        companyId: log.company_id != null ? String(log.company_id) : undefined,
        branchId: log.branch_id != null ? String(log.branch_id) : undefined,
        timestamp: String(log.created_at ?? log.timestamp ?? ''),
        ipAddress: log.ip_address ?? undefined,
        userAgent: log.user_agent ?? undefined,
        success: !(log.error_message),
        errorMessage: log.error_message ?? undefined,
        oldValues: log.old_values ?? undefined,
        newValues: log.new_values ?? undefined,
        changes: log.changes ?? undefined,
        notes: log.notes ?? undefined,
      }));

      const total = (result?.total ?? logs.length) as number;
      const totalPages = Math.ceil(total / state.pageSize);

      setState(prev => ({
        ...prev,
        logs,
        total,
        totalPages,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب السجلات';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, [filters, state.page, state.pageSize]);

  /**
   * جلب تفاصيل سجل معين
   */
  const getLogDetails = useCallback(async (id: string): Promise<AuditLog | null> => {
    try {
      const result: any = await apiClient.get<any>(`/api/audit-logs/${id}`);
      const log: any = Array.isArray(result) ? result[0] : (result?.data ?? result);

      if (!log) return null;

      const detailed: AuditLog = {
        id: String(log.id ?? id),
        eventType: mapActionToEventType(String(log.action ?? 'update')),
        resource: String(log.resource_type ?? 'system') as any,
        resourceId: String(log.resource_id ?? ''),
        resourceName: String(log.resource_name ?? log.resource_type ?? ''),
        userId: String(log.user_id ?? ''),
        userName: String(log.user_name ?? log.user_email ?? ''),
        userEmail: log.user_email ?? undefined,
        companyId: log.company_id != null ? String(log.company_id) : undefined,
        branchId: log.branch_id != null ? String(log.branch_id) : undefined,
        timestamp: String(log.created_at ?? log.timestamp ?? ''),
        ipAddress: log.ip_address ?? undefined,
        userAgent: log.user_agent ?? undefined,
        success: !(log.error_message),
        errorMessage: log.error_message ?? undefined,
        oldValues: log.old_values ?? undefined,
        newValues: log.new_values ?? undefined,
        changes: log.changes ?? undefined,
        notes: log.notes ?? undefined,
      };

      return detailed;
    } catch (error) {
      console.error('Failed to fetch log details:', error);
      return null;
    }
  }, []);

  /**
   * تصدير السجلات
   */
  const exportLogs = useCallback(async (options: AuditExportOptions): Promise<void> => {
    try {
      const qs = new URLSearchParams({
        format: options.format,
        ...(options.dateRange?.from ? { from: options.dateRange.from } : {}),
        ...(options.dateRange?.to ? { to: options.dateRange.to } : {}),
        ...(options.filters?.eventType ? { action: String(options.filters.eventType) } : {}),
        ...(options.filters?.resource ? { resource_type: String(options.filters.resource) } : {}),
        ...(options.filters?.userId ? { user_id: String(options.filters.userId) } : {}),
        ...(options.filters?.companyId ? { company_id: String(options.filters.companyId) } : {}),
        ...(options.filters?.branchId ? { branch_id: String(options.filters.branchId) } : {}),
        ...(options.filters?.search ? { search: String(options.filters.search) } : {}),
        ...(typeof options.filters?.success === 'boolean' ? { success: String(options.filters?.success) } : {}),
        ...(options.columns && options.columns.length ? { columns: options.columns.join(',') } : {}),
      }).toString();

      // نستخدم fetch مباشرة للحصول على Blob مع ترويسة Authorization
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${window.location.origin}/api/audit-logs/export?${qs}`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = options.format === 'csv' ? 'csv' : options.format === 'excel' ? 'xlsx' : options.format;
      link.download = `audit-logs-${Date.now()}.${ext}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
      throw error;
    }
  }, []);

  /**
   * جلب الإحصائيات
   */
  const loadStats = useCallback(async (): Promise<void> => {
    try {
      const result: any = await apiClient.get<any>('/api/audit-logs/stats');
      const data: any = Array.isArray(result) ? result[0] : (result?.data ?? result);

      const computed: AuditStats = {
        totalEvents: Number(data?.totalEvents ?? data?.total_events ?? 0),
        todayEvents: Number(data?.todayEvents ?? data?.today_events ?? 0),
        weekEvents: Number(data?.weekEvents ?? data?.week_events ?? 0),
        monthEvents: Number(data?.monthEvents ?? data?.month_events ?? 0),
        topUsers: (data?.topUsers ?? data?.top_users ?? []).map((u: any) => ({
          userId: String(u?.userId ?? u?.user_id ?? ''),
          userName: String(u?.userName ?? u?.user_name ?? ''),
          count: Number(u?.count ?? 0),
        })),
        topResources: (data?.topResources ?? data?.top_resources ?? []).map((r: any) => ({
          resource: String(r?.resource ?? r?.resource_type ?? 'system') as any,
          count: Number(r?.count ?? 0),
        })),
        eventsByType: (data?.eventsByType ?? data?.events_by_type ?? []).map((e: any) => ({
          eventType: mapActionToEventType(String(e?.eventType ?? e?.action ?? e?.type ?? 'update')),
          count: Number(e?.count ?? 0),
        })),
      };

      setStats(computed);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setState(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const refresh = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  // جلب البيانات عند التحميل أو تغيير الفلاتر
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    ...state,
    filters,
    setFilters,
    setPage,
    setPageSize,
    refresh,
    exportLogs,
    getLogDetails,
    stats,
    loadStats,
  };
}

export default useAuditLogs;
