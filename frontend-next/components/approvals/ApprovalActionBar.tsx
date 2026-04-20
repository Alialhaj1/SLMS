import React, { useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';

interface Props {
  status: string;
  isAssignee: boolean;
  isCreator: boolean;
  onApprove?: (comment: string) => Promise<void>;
  onReject?: (comment: string) => Promise<void>;
  onPost?: () => Promise<void>;
  onVoid?: (reason: string) => Promise<void>;
  onRecall?: () => Promise<void>;
  onResubmit?: (comment: string) => Promise<void>;
  onCancel?: () => Promise<void>;
  onDelegate?: (userId: number) => Promise<void>;
  onRemind?: () => Promise<void>;
  loading?: boolean;
}

export default function ApprovalActionBar({
  status, isAssignee, isCreator,
  onApprove, onReject, onPost, onVoid, onRecall, onResubmit, onCancel, onDelegate, onRemind,
  loading = false,
}: Props) {
  const { t } = useTranslation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voidConfirm, setVoidConfirm] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);

  const canApprove = isAssignee && ['pending_review', 'under_review', 'pending_approval'].includes(status);
  const canReject = canApprove;
  const canPost = status === 'pending_post';
  const canVoid = status === 'posted';
  const canRecall = isCreator && status === 'pending_review';
  const canResubmit = isCreator && status === 'rejected';
  const canCancel = isCreator && ['draft', 'rejected'].includes(status);

  return (
    <>
      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Approve */}
        {canApprove && onApprove && (
          <Button
            variant="primary"
            onClick={() => setApproveOpen(true)}
            loading={loading}
            className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-green-900/30 
                       transform hover:scale-105 transition-all"
          >
            ✅ {t('approvals.actions.approve') || 'Approve'}
          </Button>
        )}

        {/* Reject */}
        {canReject && onReject && (
          <Button
            variant="danger"
            onClick={() => setRejectOpen(true)}
            loading={loading}
            className="shadow-lg shadow-red-200 dark:shadow-red-900/30 
                       transform hover:scale-105 transition-all"
          >
            ❌ {t('approvals.actions.reject') || 'Reject'}
          </Button>
        )}

        {/* Post */}
        {canPost && onPost && (
          <Button
            variant="primary"
            onClick={onPost}
            loading={loading}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 
                       transform hover:scale-105 transition-all"
          >
            ✨ {t('approvals.actions.post') || 'Post to GL'}
          </Button>
        )}

        {/* Void */}
        {canVoid && onVoid && (
          <Button
            variant="danger"
            onClick={() => setVoidOpen(true)}
            loading={loading}
            className="transform hover:scale-105 transition-all"
          >
            🚫 {t('approvals.actions.void') || 'Void'}
          </Button>
        )}

        {/* Recall */}
        {canRecall && onRecall && (
          <Button
            variant="secondary"
            onClick={onRecall}
            loading={loading}
            className="transform hover:scale-105 transition-all"
          >
            ↩️ {t('approvals.actions.recall') || 'Recall'}
          </Button>
        )}

        {/* Resubmit */}
        {canResubmit && onResubmit && (
          <Button
            variant="primary"
            onClick={() => onResubmit('')}
            loading={loading}
            className="transform hover:scale-105 transition-all"
          >
            🔄 {t('approvals.actions.resubmit') || 'Resubmit'}
          </Button>
        )}

        {/* Cancel */}
        {canCancel && onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            loading={loading}
          >
            ⊘ {t('approvals.actions.cancel') || 'Cancel'}
          </Button>
        )}

        {/* Remind */}
        {isCreator && ['pending_review', 'under_review', 'pending_approval'].includes(status) && onRemind && (
          <Button
            variant="secondary"
            onClick={onRemind}
            loading={loading}
          >
            🔔 {t('approvals.actions.remind') || 'Send Reminder'}
          </Button>
        )}
      </div>

      {/* Approve Modal */}
      <Modal isOpen={approveOpen} onClose={() => setApproveOpen(false)} title={t('approvals.approveTitle') || 'Approve Document'} size="md">
        <div className="space-y-4">
          <textarea
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 
                       p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            placeholder={t('approvals.commentOptional') || 'Add optional comment...'}
            value={approveComment}
            onChange={e => setApproveComment(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="primary"
              className="bg-green-600 hover:bg-green-700"
              loading={loading}
              onClick={async () => {
                await onApprove!(approveComment);
                setApproveOpen(false);
                setApproveComment('');
              }}
            >
              ✅ {t('approvals.confirmApprove') || 'Confirm Approval'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title={t('approvals.rejectTitle') || 'Reject Document'} size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('approvals.rejectWarning') || 'Please provide a reason for rejection (minimum 10 characters). The document will be returned to the creator.'}
          </p>
          <textarea
            className="w-full rounded-lg border border-red-300 dark:border-red-600 bg-white dark:bg-gray-900 
                       p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows={4}
            placeholder={t('approvals.rejectReason') || 'Reason for rejection...'}
            value={comment}
            onChange={e => setComment(e.target.value)}
            required
          />
          {comment.length > 0 && comment.length < 10 && (
            <p className="text-xs text-red-500">{t('approvals.minChars') || 'Minimum 10 characters required'} ({comment.length}/10)</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setRejectOpen(false); setComment(''); }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="danger"
              loading={loading}
              disabled={comment.trim().length < 10}
              onClick={async () => {
                await onReject!(comment);
                setRejectOpen(false);
                setComment('');
              }}
            >
              ❌ {t('approvals.confirmReject') || 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Void Modal */}
      <Modal isOpen={voidOpen} onClose={() => setVoidOpen(false)} title={t('approvals.voidTitle') || 'Void Posted Document'} size="md">
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-300 font-semibold">
              ⚠️ {t('approvals.voidWarning') || 'This action will create a reversal entry. This cannot be undone.'}
            </p>
          </div>
          <textarea
            className="w-full rounded-lg border border-red-300 dark:border-red-600 bg-white dark:bg-gray-900 
                       p-3 text-sm focus:ring-2 focus:ring-red-500"
            rows={3}
            placeholder={t('approvals.voidReason') || 'Reason for voiding...'}
            value={voidReason}
            onChange={e => setVoidReason(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('approvals.typeVoid') || 'Type VOID to confirm'}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 
                         p-2 text-sm font-mono"
              value={voidConfirm}
              onChange={e => setVoidConfirm(e.target.value)}
              placeholder="VOID"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setVoidOpen(false); setVoidReason(''); setVoidConfirm(''); }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="danger"
              loading={loading}
              disabled={voidConfirm !== 'VOID' || voidReason.trim().length < 10}
              onClick={async () => {
                await onVoid!(voidReason);
                setVoidOpen(false);
                setVoidReason('');
                setVoidConfirm('');
              }}
            >
              🚫 {t('approvals.confirmVoid') || 'Confirm Void'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
