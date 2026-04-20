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
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import apiClient from '../../lib/apiClient';

interface InboxItem {
  id: number;
  document_type: string;
  document_number: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  priority: string;
  current_step_label: string;
  created_by_name: string;
  created_at: string;
  sla_deadline: string;
  branch_name?: string;
}

const priorityColors: Record<string, string> = {
  urgent: 'danger',
  high: 'warning',
  normal: 'info',
  low: 'secondary',
};

const docTypeIcons: Record<string, string> = {
  journal_entry: '📒',
  payment_voucher: '💸',
  receipt_voucher: '💰',
  purchase_order: '🛒',
  expense_request: '📄',
  bank_transfer: '🏦',
};

export default function ApprovalInbox() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { hasPermission, can } = usePermissions();
  const router = useRouter();

  const [data, setData] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const fetchInbox = useCallback(async (p = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: '20',
        ...(search && { search }),
        ...(docTypeFilter && { documentType: docTypeFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
      });

      const res = await apiClient.get(`/api/approval-documents/inbox?${params}`);
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, docTypeFilter, priorityFilter]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleApprove = async (docId: number) => {
    try {
      await apiClient.post(`/api/approval-documents/${docId}/approve`, { comment: '' });
      showToast({ message: t('approvals.approved') || 'Document approved', type: 'success' });
      fetchInbox();
    } catch (err: any) {
      showToast({ message: err?.response?.data?.error || 'Failed to approve', type: 'error' });
    }
  };

  const handleReject = async (docId: number) => {
    // Navigate to detail page for reject (needs reason)
    router.push(`/approvals/tracker/${docId}`);
  };

  const columns: Column<InboxItem>[] = useMemo(() => [
    {
      key: 'priority',
      label: '',
      width: '40px',
      render: (row) => (
        <span className={`inline-block w-2 h-8 rounded-full ${
          row.priority === 'urgent' ? 'bg-red-500 animate-pulse' :
          row.priority === 'high' ? 'bg-orange-400' :
          'bg-gray-300'
        }`} />
      ),
    },
    {
      key: 'document_type',
      label: t('approvals.type') || 'Type',
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="text-lg">{docTypeIcons[row.document_type] || '📄'}</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t(`approvals.docTypes.${row.document_type}`) || row.document_type.replace(/_/g, ' ')}
          </span>
        </span>
      ),
    },
    {
      key: 'document_number',
      label: t('approvals.docNumber') || 'Doc #',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
          {row.document_number}
        </span>
      ),
    },
    {
      key: 'title',
      label: t('approvals.title') || 'Title',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-xs">
            {row.title}
          </div>
          <div className="text-xs text-gray-400">{row.created_by_name}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('approvals.amount') || 'Amount',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-sm tabular-nums">
          {Number(row.amount).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}
          <span className="text-xs text-gray-400 ml-1">{row.currency}</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: t('approvals.status') || 'Status',
      render: (row) => <ApprovalStatusBadge status={row.status} pulse />,
    },
    {
      key: 'current_step_label',
      label: t('approvals.step') || 'Step',
      render: (row) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.current_step_label}
        </span>
      ),
    },
    {
      key: 'sla_deadline',
      label: t('approvals.sla') || 'SLA',
      render: (row) => {
        if (!row.sla_deadline) return <span className="text-gray-400">-</span>;
        const deadline = new Date(row.sla_deadline);
        const now = new Date();
        const overdue = deadline < now;
        const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

        return (
          <span className={`text-xs font-medium ${overdue ? 'text-red-600 animate-pulse' : hoursLeft < 4 ? 'text-orange-500' : 'text-gray-500'}`}>
            {overdue
              ? `⚠️ ${t('approvals.overdue') || 'Overdue'}`
              : `${hoursLeft}h`}
          </span>
        );
      },
    },
  ], [t, locale]);

  const actions = useMemo(() => [
    ...(can('approval_documents:approve') ? [{
      label: t('approvals.actions.approve') || 'Approve',
      icon: <span>✅</span>,
      onClick: (row: InboxItem) => handleApprove(row.id),
      variant: 'default' as const,
    }] : []),
    {
      label: t('approvals.view') || 'View',
      icon: <span>👁️</span>,
      onClick: (row: InboxItem) => router.push(`/approvals/tracker/${row.id}`),
      variant: 'default' as const,
    },
  ], [t, router]);

  if (!hasPermission('approval_documents:view')) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{t('common.noPermission') || 'You do not have permission to view this page'}</p>
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
              📥 {t('approvals.inbox') || 'Approval Inbox'}
              {total > 0 && (
                <Badge variant="danger" size="lg">
                  {total}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('approvals.inboxDesc') || 'Documents awaiting your review and approval'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push('/approvals/my-requests')}
            >
              📤 {t('approvals.myDocuments') || 'My Documents'}
            </Button>
            {hasPermission('approval_documents:monitor') && (
              <Button
                variant="primary"
                onClick={() => router.push('/approvals/monitor')}
              >
                📊 {t('approvals.monitor') || 'Monitor'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 
                         px-4 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500"
              placeholder={t('common.search') || 'Search...'}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <select
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 
                         px-3 py-2 text-sm"
              value={docTypeFilter}
              onChange={e => { setDocTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t('approvals.allTypes') || 'All Types'}</option>
              <option value="journal_entry">{t('approvals.docTypes.journal_entry') || 'Journal Entry'}</option>
              <option value="payment_voucher">{t('approvals.docTypes.payment_voucher') || 'Payment Voucher'}</option>
              <option value="receipt_voucher">{t('approvals.docTypes.receipt_voucher') || 'Receipt Voucher'}</option>
              <option value="purchase_order">{t('approvals.docTypes.purchase_order') || 'Purchase Order'}</option>
              <option value="expense_request">{t('approvals.docTypes.expense_request') || 'Expense Request'}</option>
            </select>
            <select
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 
                         px-3 py-2 text-sm"
              value={priorityFilter}
              onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t('approvals.allPriorities') || 'All Priorities'}</option>
              <option value="urgent">🔴 {t('approvals.priority.urgent') || 'Urgent'}</option>
              <option value="high">🟠 {t('approvals.priority.high') || 'High'}</option>
              <option value="normal">🔵 {t('approvals.priority.normal') || 'Normal'}</option>
              <option value="low">⚪ {t('approvals.priority.low') || 'Low'}</option>
            </select>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <DataTablePro<InboxItem>
            data={data}
            columns={columns}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage={t('approvals.emptyInbox') || 'No documents pending your approval 🎉'}
            actions={actions}
            pagination={{
              page,
              pageSize: 20,
              total,
              onPageChange: (p) => setPage(p),
            }}
          />
        </Card>
      </div>
    </MainLayout>
  );
}
