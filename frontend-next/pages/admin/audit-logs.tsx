/**
 * Audit Logs Page - سجل المراجعة
 * Displays system audit logs with filtering and export capabilities
 */

import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { DataTablePro, Column } from '../../components/ui/DataTablePro';
import { useTranslation } from '../../hooks/useTranslation';
import { useMasterData } from '../../hooks/useMasterData';
import { withPermission } from '../../utils/withPermission';
import { usePermissions } from '../../hooks/usePermissions';
import { 
  ArrowDownTrayIcon, 
  ArrowPathIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: number;
  created_at: string;
  user_email?: string | null;
  action: string;
  resource: string;
  resource_id?: number | null;
  ip_address?: string | null;
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  view: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  approve: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  login: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function AuditLogsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const { data, loading, pagination, fetchList } = useMasterData<AuditLog>({ 
    endpoint: '/api/audit-logs' 
  });

  const [filters, setFilters] = useState({
    resource: '',
    action: '',
    user_id: '',
    date_from: '',
    date_to: '',
  });

  const columns: Column<AuditLog>[] = useMemo(
    () => [
      { 
        key: 'id', 
        label: t('common.id') || 'ID', 
        sortable: true,
        width: '80px',
      },
      { 
        key: 'created_at', 
        label: t('auditLogs.timestamp') || 'Timestamp', 
        sortable: true,
        render: (row) => new Date(row.created_at).toLocaleString(),
      },
      { 
        key: 'user_email', 
        label: t('auditLogs.user') || 'User',
        render: (row) => row.user_email || '-',
      },
      { 
        key: 'action', 
        label: t('auditLogs.action') || 'Action',
        render: (row) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColors[row.action] || actionColors.view}`}>
            {row.action}
          </span>
        ),
      },
      { 
        key: 'resource', 
        label: t('settingsAdmin.audit.filters.resource') || 'Resource',
      },
      { 
        key: 'resource_id', 
        label: t('auditLogs.resourceId') || 'Resource ID',
        render: (row) => row.resource_id || '-',
      },
      { 
        key: 'ip_address', 
        label: t('auditLogs.ipAddress') || 'IP Address',
        render: (row) => row.ip_address || '-',
      },
    ],
    [t]
  );

  const runSearch = async () => {
    await fetchList({
      page: 1,
      pageSize: pagination.pageSize,
      filters: {
        resource: filters.resource || undefined,
        action: filters.action || undefined,
        user_id: filters.user_id || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      },
    });
  };

  const exportCsv = async () => {
    if (!hasPermission('audit_logs:export')) return;

    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters.resource) params.set('resource', filters.resource);
    if (filters.action) params.set('action', filters.action);
    if (filters.user_id) params.set('user_id', filters.user_id);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);

    try {
      const res = await fetch(
        `http://localhost:4000/api/audit-logs/export?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) return;

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const printPage = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  const clearFilters = () => {
    setFilters({
      resource: '',
      action: '',
      user_id: '',
      date_from: '',
      date_to: '',
    });
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('auditLogs.title') || 'Audit Logs'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <ClipboardDocumentListIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {t('auditLogs.title') || 'Audit Logs'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('settingsAdmin.audit.subtitle') || 'View system activity and changes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={runSearch} disabled={loading}>
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {hasPermission('audit_logs:export') && (
              <Button onClick={exportCsv} variant="secondary">
                <ArrowDownTrayIcon className="w-5 h-5 me-2" />
                {t('settingsAdmin.audit.export') || 'Export'}
              </Button>
            )}
            <Button variant="secondary" onClick={printPage}>
              {t('common.print') || 'Print'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              label={t('settingsAdmin.audit.filters.resource') || 'Resource'}
              value={filters.resource}
              onChange={(e) => setFilters((p) => ({ ...p, resource: e.target.value }))}
              placeholder="e.g., shipments, users"
            />
            <Input
              label={t('settingsAdmin.audit.filters.action') || 'Action'}
              value={filters.action}
              onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
              placeholder="e.g., create, update, delete"
            />
            <Input
              label={t('settingsAdmin.audit.filters.userId') || 'User ID'}
              value={filters.user_id}
              onChange={(e) => setFilters((p) => ({ ...p, user_id: e.target.value }))}
              placeholder="User ID"
            />
            <Input
              label={t('settingsAdmin.audit.filters.dateFrom') || 'From Date'}
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
            />
            <Input
              label={t('settingsAdmin.audit.filters.dateTo') || 'To Date'}
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={clearFilters}>
              {t('common.clear') || 'Clear'}
            </Button>
            <Button onClick={runSearch}>
              {t('common.search') || 'Search'}
            </Button>
          </div>
        </Card>

        {/* Data Table */}
        <Card>
          <DataTablePro<AuditLog>
            data={data}
            columns={columns}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage={t('settingsAdmin.empty') || 'No audit logs found'}
            pagination={{
              page: pagination.currentPage,
              pageSize: pagination.pageSize,
              total: pagination.totalItems,
              onPageChange: (p) =>
                fetchList({
                  page: p,
                  pageSize: pagination.pageSize,
                  filters: {
                    resource: filters.resource || undefined,
                    action: filters.action || undefined,
                    user_id: filters.user_id || undefined,
                    date_from: filters.date_from || undefined,
                    date_to: filters.date_to || undefined,
                  },
                }),
            }}
          />
        </Card>
      </div>
    </MainLayout>
  );
}

export default withPermission('audit_logs:view', AuditLogsPage);
