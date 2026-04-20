import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import ApprovalStatusBadge from '../../../components/approvals/ApprovalStatusBadge';
import ApprovalTimeline from '../../../components/approvals/ApprovalTimeline';
import ApprovalActionBar from '../../../components/approvals/ApprovalActionBar';
import { useTranslation } from '../../../hooks/useTranslation';
import { useLocale } from '../../../contexts/LocaleContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import apiClient from '../../../lib/apiClient';

interface DocumentDetail {
  id: number;
  reference_id: number;
  document_type: string;
  document_number: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  priority: string;
  notes: string;
  rejection_count: number;
  created_by: number;
  created_by_name: string;
  current_assignee: number;
  current_assignee_name: string;
  current_step_label: string;
  current_step_number: number;
  total_steps: number;
  route_name: string;
  branch_name?: string;
  created_at: string;
  sla_deadline: string;
  timeline: any[];
  steps: any[];
  watchers: any[];
}

interface TrackerData {
  document: DocumentDetail;
  stages: { step_number: number; label: string; status: string; actor_name: string; completed_at: string }[];
  read_receipts: { user_name: string; viewed_at: string }[];
  time_per_stage: { step_number: number; label: string; hours: number }[];
}

const docTypeLinks: Record<string, (id: number) => string> = {
  journal_entry: (id) => `/accounting/journals/${id}`,
  payment_voucher: (id) => `/accounting/payment-voucher`,
  receipt_voucher: (id) => `/accounting/receipt-voucher`,
  purchase_order: (id) => `/purchasing/orders/${id}?mode=view`,
  expense_request: (id) => `/requests/expense/${id}`,
  bank_transfer: (id) => `/accounting/payment-voucher`,
};

export default function ApprovalTracker() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { id } = router.query;

  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [detailRes, trackerRes] = await Promise.all([
        apiClient.get(`/api/approval-documents/${id}`),
        apiClient.get(`/api/approval-documents/${id}/tracker`),
      ]);
      setDetail(detailRes.data);
      setTracker(trackerRes.data);
    } catch (err) {
      console.error('Failed to fetch document:', err);
      showToast('Failed to load document', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const doAction = async (action: string, body: any = {}) => {
    try {
      setActionLoading(true);
      await apiClient.post(`/api/approval-documents/${id}/${action}`, body);
      showToast(t(`approvals.${action}Success`) || `${action} successful`, 'success');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || `Failed to ${action}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </MainLayout>
    );
  }

  if (!detail) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-gray-500">{t('approvals.notFound') || 'Document not found'}</p>
          <Button onClick={() => router.push('/approvals/inbox')}>
            {t('approvals.backToInbox') || 'Back to Inbox'}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isAssignee = detail.current_assignee === user?.id;
  const isCreator = detail.created_by === user?.id;
  const progressPercent = detail.total_steps > 0 ? Math.round((detail.current_step_number / detail.total_steps) * 100) : 0;

  const fmtAmount = (n: number) =>
    Number(n).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 });

  return (
    <MainLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            ← {t('common.back') || 'Back'}
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              {detail.document_number}
              <ApprovalStatusBadge status={detail.status} pulse />
              {detail.priority === 'urgent' && <Badge variant="danger">🔴 URGENT</Badge>}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {detail.title} • {detail.route_name}
            </p>
          </div>
          {/* Link to source document */}
          {docTypeLinks[detail.document_type] && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(docTypeLinks[detail.document_type](detail.reference_id))}
            >
              📄 {t('approvals.viewSource') || 'View Source'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Info + Progress + Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Info Card */}
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label={t('approvals.type') || 'Type'}
                  value={t(`approvals.docTypes.${detail.document_type}`) || detail.document_type.replace(/_/g, ' ')} />
                <InfoItem label={t('approvals.amount') || 'Amount'}
                  value={`${fmtAmount(detail.amount)} ${detail.currency}`} highlight />
                <InfoItem label={t('approvals.creator') || 'Creator'}
                  value={detail.created_by_name} />
                <InfoItem label={t('approvals.assignee') || 'Current Assignee'}
                  value={detail.current_assignee_name || '-'}
                  highlight={isAssignee} />
                <InfoItem label={t('approvals.step') || 'Step'}
                  value={detail.current_step_label} />
                {detail.branch_name && (
                  <InfoItem label={t('approvals.branch') || 'Branch'}
                    value={detail.branch_name} />
                )}
                <InfoItem label={t('common.date') || 'Date'}
                  value={new Date(detail.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')} />
                {detail.rejection_count > 0 && (
                  <InfoItem label={t('approvals.rejections') || 'Rejections'}
                    value={String(detail.rejection_count)} />
                )}
              </div>
              {detail.notes && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                  {detail.notes}
                </div>
              )}
            </Card>

            {/* Progress Bar */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                {t('approvals.progress') || 'Approval Progress'}
              </h3>

              {/* Step indicators */}
              <div className="flex items-center justify-between mb-2">
                {tracker?.stages?.map((stage, idx) => {
                  const isActive = stage.step_number === detail.current_step_number;
                  const isDone = stage.status === 'completed' || stage.status === 'approved';
                  const isRejected = stage.status === 'rejected';

                  return (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                        transition-all duration-500
                        ${isDone ? 'bg-green-500 text-white shadow-lg shadow-green-200' :
                          isRejected ? 'bg-red-500 text-white shadow-lg shadow-red-200' :
                          isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 animate-pulse ring-4 ring-blue-200' :
                          'bg-gray-200 dark:bg-gray-700 text-gray-500'}
                      `}>
                        {isDone ? '✓' : isRejected ? '✗' : stage.step_number}
                      </div>
                      <span className={`text-xs mt-1 text-center ${isActive ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
                        {stage.label}
                      </span>
                      {stage.actor_name && (
                        <span className="text-[10px] text-gray-400">{stage.actor_name}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ease-out
                    ${detail.status === 'rejected' ? 'bg-red-500' :
                      detail.status === 'posted' ? 'bg-green-500' :
                      'bg-blue-500'}`}
                  style={{ width: `${detail.status === 'posted' ? 100 : progressPercent}%` }}
                />
              </div>
            </Card>

            {/* Action Bar */}
            <ApprovalActionBar
              status={detail.status}
              isAssignee={isAssignee}
              isCreator={isCreator}
              loading={actionLoading}
              onApprove={(comment) => doAction('approve', { comment })}
              onReject={(comment) => doAction('reject', { comment })}
              onPost={() => doAction('post', { confirmToken: 'CONFIRM' })}
              onVoid={(reason) => doAction('void', { voidConfirm: 'VOID', reason })}
              onRecall={() => doAction('recall')}
              onResubmit={(comment) => doAction('resubmit', { comment })}
              onCancel={() => doAction('cancel')}
              onRemind={() => doAction('remind')}
            />

            {/* Time per Stage */}
            {tracker?.time_per_stage && tracker.time_per_stage.length > 0 && (
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  ⏱️ {t('approvals.timePerStage') || 'Time per Stage'}
                </h3>
                <div className="space-y-2">
                  {tracker.time_per_stage.map((stage, idx) => {
                    const maxHours = Math.max(...tracker.time_per_stage.map(s => s.hours), 1);
                    const widthPct = Math.min((stage.hours / maxHours) * 100, 100);

                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-xs w-24 text-gray-600 dark:text-gray-400 truncate">{stage.label}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-blue-600 h-4 rounded-full transition-all duration-700"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-500 w-12 text-right">
                          {stage.hours < 1 ? `${Math.round(stage.hours * 60)}m` : `${stage.hours.toFixed(1)}h`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Timeline + Watchers */}
          <div className="space-y-6">
            {/* Activity Timeline */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                📋 {t('approvals.timeline') || 'Activity Timeline'}
              </h3>
              <ApprovalTimeline entries={detail.timeline || []} />
            </Card>

            {/* Read Receipts */}
            {tracker?.read_receipts && tracker.read_receipts.length > 0 && (
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  👁️ {t('approvals.readReceipts') || 'Read Receipts'}
                </h3>
                <div className="space-y-2">
                  {tracker.read_receipts.map((receipt, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300">{receipt.user_name}</span>
                      <span className="text-gray-400">
                        {new Date(receipt.viewed_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Watchers */}
            {detail.watchers && detail.watchers.length > 0 && (
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  👥 {t('approvals.watchers') || 'Watchers'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {detail.watchers.map((w: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
                                              bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      👤 {w.user_name}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`text-sm font-medium mt-0.5 ${highlight ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </dd>
    </div>
  );
}
