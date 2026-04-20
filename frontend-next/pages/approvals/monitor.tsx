import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTablePro, Column } from '../../components/ui/DataTablePro';
import ApprovalStatusBadge from '../../components/approvals/ApprovalStatusBadge';
import { useTranslation } from '../../hooks/useTranslation';
import { useLocale } from '../../contexts/LocaleContext';
import { usePermissions } from '../../hooks/usePermissions';
import apiClient from '../../lib/apiClient';

interface MonitorKPI {
  pending: number;
  sla_overdue: number;
  posted_today: number;
  rejected_today: number;
  total_pending_amount: number;
  total_posted_amount: number;
  avg_approval_time_hours: number;
}

interface MonitorRow {
  id: number;
  document_type: string;
  document_number: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  priority: string;
  created_by_name: string;
  current_assignee_name: string;
  current_step_label: string;
  created_at: string;
  sla_deadline: string;
}

function KPICard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: string; color: string; sub?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${color} text-white shadow-lg
                     transform hover:scale-105 transition-all duration-300 cursor-default`}>
      <div className="absolute top-2 right-3 text-4xl opacity-20">{icon}</div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-sm font-medium mt-1 opacity-90">{label}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

export default function ApprovalMonitor() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const [kpis, setKpis] = useState<MonitorKPI | null>(null);
  const [data, setData] = useState<MonitorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchMonitor = useCallback(async (p = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
        ...(docTypeFilter && { documentType: docTypeFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const res = await apiClient.get(`/api/approval-documents/monitor?${params}`);
      setKpis(res.kpis || null);
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch monitor:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, docTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchMonitor();
  }, [fetchMonitor]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchMonitor(), 30000);
    return () => clearInterval(interval);
  }, [fetchMonitor]);

  const fmtAmount = (n: number) =>
    Number(n || 0).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const columns: Column<MonitorRow>[] = useMemo(() => [
    {
      key: 'priority',
      label: '',
      width: '8px',
      render: (row) => (
        <span className={`inline-block w-1.5 h-8 rounded-full ${
          row.priority === 'urgent' ? 'bg-red-500 animate-pulse' :
          row.priority === 'high' ? 'bg-orange-400' :
          row.priority === 'normal' ? 'bg-blue-400' : 'bg-gray-300'
        }`} />
      ),
    },
    {
      key: 'document_number',
      label: t('approvals.docNumber') || 'Doc #',
      sortable: true,
      render: (row) => (
        <button
          onClick={() => router.push(`/approvals/tracker/${row.id}`)}
          className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {row.document_number}
        </button>
      ),
    },
    {
      key: 'document_type',
      label: t('approvals.type') || 'Type',
      render: (row) => (
        <span className="text-xs font-medium">
          {t(`approvals.docTypes.${row.document_type}`) || row.document_type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'title',
      label: t('approvals.title') || 'Title',
      render: (row) => <span className="text-sm truncate max-w-xs block">{row.title}</span>,
    },
    {
      key: 'amount',
      label: t('approvals.amount') || 'Amount',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-sm tabular-nums">
          {fmtAmount(row.amount)} <span className="text-xs text-gray-400">{row.currency}</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: t('approvals.status') || 'Status',
      render: (row) => <ApprovalStatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'created_by_name',
      label: t('approvals.creator') || 'Creator',
      render: (row) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.created_by_name}</span>,
    },
    {
      key: 'current_assignee_name',
      label: t('approvals.assignee') || 'Assignee',
      render: (row) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.current_assignee_name || '-'}</span>,
    },
    {
      key: 'created_at',
      label: t('common.date') || 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-500">
          {new Date(row.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
  ], [t, locale, router]);

  if (!hasPermission('approval_documents:monitor')) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{t('common.noPermission') || 'No permission'}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              📊 {t('approvals.monitor') || 'Approval Monitor'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('approvals.monitorDesc') || 'Real-time overview of all approval workflows'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/approvals/inbox')}>
              📥 {t('approvals.inbox') || 'Inbox'}
            </Button>
            {hasPermission('approval_routes:view') && (
              <Button variant="secondary" onClick={() => router.push('/approvals/settings')}>
                ⚙️ {t('approvals.settings') || 'Settings'}
              </Button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <KPICard label={t('approvals.kpi.pending') || 'Pending'} value={kpis.pending} icon="⏳" color="from-yellow-500 to-orange-500" />
            <KPICard
              label={t('approvals.kpi.slaOverdue') || 'SLA Overdue'}
              value={kpis.sla_overdue}
              icon="⚠️"
              color={kpis.sla_overdue > 0 ? 'from-red-500 to-red-700' : 'from-green-500 to-green-600'}
            />
            <KPICard label={t('approvals.kpi.postedToday') || 'Posted Today'} value={kpis.posted_today} icon="✨" color="from-emerald-500 to-green-600" />
            <KPICard label={t('approvals.kpi.rejectedToday') || 'Rejected Today'} value={kpis.rejected_today} icon="❌" color="from-red-400 to-red-600" />
            <KPICard
              label={t('approvals.kpi.pendingAmount') || 'Pending Amount'}
              value={fmtAmount(kpis.total_pending_amount)}
              icon="💰"
              color="from-blue-500 to-blue-700"
              sub="SAR"
            />
            <KPICard
              label={t('approvals.kpi.postedAmount') || 'Posted Amount'}
              value={fmtAmount(kpis.total_posted_amount)}
              icon="💎"
              color="from-violet-500 to-purple-700"
              sub="SAR"
            />
            <KPICard
              label={t('approvals.kpi.avgTime') || 'Avg Time'}
              value={`${(kpis.avg_approval_time_hours || 0).toFixed(1)}h`}
              icon="⏱️"
              color="from-cyan-500 to-teal-600"
            />
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t('approvals.allStatuses') || 'All Statuses'}</option>
              <option value="pending_review">{t('approvals.status.pending_review') || 'Pending Review'}</option>
              <option value="under_review">{t('approvals.status.under_review') || 'Under Review'}</option>
              <option value="pending_approval">{t('approvals.status.pending_approval') || 'Pending Approval'}</option>
              <option value="pending_post">{t('approvals.status.pending_post') || 'Pending Post'}</option>
              <option value="posted">{t('approvals.status.posted') || 'Posted'}</option>
              <option value="rejected">{t('approvals.status.rejected') || 'Rejected'}</option>
            </select>
            <select
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={docTypeFilter}
              onChange={e => { setDocTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t('approvals.allTypes') || 'All Types'}</option>
              <option value="journal_entry">Journal Entry</option>
              <option value="payment_voucher">Payment Voucher</option>
              <option value="receipt_voucher">Receipt Voucher</option>
              <option value="purchase_order">Purchase Order</option>
              <option value="expense_request">Expense Request</option>
            </select>
            <input
              type="date"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            />
            <span className="text-gray-400 text-sm">→</span>
            <input
              type="date"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
            />
            <Button variant="secondary" size="sm" onClick={() => { setStatusFilter(''); setDocTypeFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
              {t('common.clear') || 'Clear'}
            </Button>
          </div>
        </Card>

        {/* Data Table */}
        <Card>
          <DataTablePro<MonitorRow>
            data={data}
            columns={columns}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage={t('approvals.noDocuments') || 'No approval documents found'}
            actions={[{
              label: t('approvals.view') || 'View',
              icon: <span>👁️</span>,
              onClick: (row) => router.push(`/approvals/tracker/${row.id}`),
            }]}
            pagination={{
              page,
              pageSize: 20,
              total,
              onPageChange: setPage,
            }}
          />
        </Card>
      </div>
    </MainLayout>
  );
}
