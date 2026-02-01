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
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface AuditLog {
  id: number;
  created_at: string;
  user_email?: string | null;
  action: string;
  resource: string;
  resource_id?: number | null;
  ip_address?: string | null;
}

function AuditSettingsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const { data, loading, pagination, fetchList } = useMasterData<AuditLog>({ endpoint: '/api/audit-logs' });

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    resource: '',
    action: '',
    user_id: '',
    date_from: '',
    date_to: '',
  });

  const columns: Column<AuditLog>[] = useMemo(
    () => [
      { key: 'id', label: t('common.id'), sortable: true },
      { key: 'created_at', label: t('auditLogs.timestamp'), sortable: true },
      { key: 'user_email', label: t('auditLogs.user') },
      { key: 'action', label: t('auditLogs.action') },
      { key: 'resource', label: t('settingsAdmin.audit.filters.resource') },
      { key: 'resource_id', label: t('auditLogs.resourceId') },
      { key: 'ip_address', label: t('auditLogs.ipAddress') },
    ],
    [t]
  );

  const runSearch = async () => {
    setPage(1);
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

    const res = await fetch(`http://localhost:4000/api/audit-logs/export?${params.toString()}`,
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
  };

  const printPage = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('settingsAdmin.audit.title')} - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('settingsAdmin.audit.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('settingsAdmin.audit.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => runSearch()} disabled={loading}>
              <ArrowPathIcon className="w-5 h-5" />
            </Button>
            {hasPermission('audit_logs:export') && (
              <Button onClick={exportCsv}>
                <ArrowDownTrayIcon className="w-5 h-5 me-2" />
                {t('settingsAdmin.audit.export')}
              </Button>
            )}
            <Button variant="secondary" onClick={printPage}>
              {t('common.print')}
            </Button>
          </div>
        </div>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              label={t('settingsAdmin.audit.filters.resource')}
              value={filters.resource}
              onChange={(e) => setFilters((p) => ({ ...p, resource: e.target.value }))}
            />
            <Input
              label={t('settingsAdmin.audit.filters.action')}
              value={filters.action}
              onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
            />
            <Input
              label={t('settingsAdmin.audit.filters.userId')}
              value={filters.user_id}
              onChange={(e) => setFilters((p) => ({ ...p, user_id: e.target.value }))}
            />
            <Input
              label={t('settingsAdmin.audit.filters.dateFrom')}
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
            />
            <Input
              label={t('settingsAdmin.audit.filters.dateTo')}
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={runSearch}>{t('common.search')}</Button>
          </div>
        </Card>

        <Card>
          <DataTablePro<AuditLog>
            data={data}
            columns={columns}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage={t('settingsAdmin.empty')}
            pagination={{
              page: pagination.currentPage,
              pageSize: pagination.pageSize,
              total: pagination.totalItems,
              onPageChange: (p) => {
                setPage(p);
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
                });
              },
            }}
          />
        </Card>
      </div>
    </MainLayout>
  );
}

export default withPermission('audit_logs:view', AuditSettingsPage);
