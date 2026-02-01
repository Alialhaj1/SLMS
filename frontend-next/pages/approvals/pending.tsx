import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useLocale } from '../../contexts/LocaleContext';

interface ApprovalRequest {
  id: number;
  document_type: string;
  document_id: number;
  document_number: string;
  document_amount: string;
  status: string;
  requested_at: string;
  request_notes?: string;
  requested_by_email: string;
  requested_by_name?: string;
  workflow_name: string;
  required_role?: string;
}

export default function PendingApprovalsPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const { t } = useTranslation();

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check permissions
  if (!hasPermission('approvals:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Access denied</p>
        </div>
      </MainLayout>
    );
  }

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/approvals/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch approvals');

      const result = await response.json();
      setApprovals(result.data || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      showToast('Failed to load pending approvals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (approval: ApprovalRequest, action: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setActionType(action);
    setNotes('');
    setActionModalOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedApproval) return;

    if (actionType === 'reject' && !notes.trim()) {
      showToast('Rejection notes are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const endpoint = actionType === 'approve' ? 'approve' : 'reject';
      
      const response = await fetch(`http://localhost:4000/api/approvals/${selectedApproval.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${actionType} request`);
      }

      showToast(`Request ${actionType}d successfully`, 'success');
      setActionModalOpen(false);
      fetchApprovals(); // Refresh list
    } catch (error: any) {
      console.error(`Error ${actionType}ing request:`, error);
      showToast(error.message || `Failed to ${actionType} request`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[status as keyof typeof colors] || colors.pending}`}>
        {status}
      </span>
    );
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase_order: 'Purchase Order',
      purchase_invoice: 'Purchase Invoice',
      vendor_payment: 'Vendor Payment'
    };
    return labels[type] || type;
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return <span className="text-gray-500 text-sm">Any</span>;
    
    const colors = {
      finance: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      management: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      super_admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
        {role}
      </span>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>Pending Approvals - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Approvals</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {approvals.length} {approvals.length === 1 ? 'request' : 'requests'} awaiting your approval
            </p>
          </div>
          <Button variant="secondary" onClick={fetchApprovals}>
            Refresh
          </Button>
        </div>

        {/* Approvals List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : approvals.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No pending approvals</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <Card key={approval.id}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left Section: Document Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {approval.document_number}
                      </h3>
                      {getStatusBadge(approval.status)}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {getDocumentTypeLabel(approval.document_type)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Amount:</span>{' '}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {parseFloat(approval.document_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Workflow:</span>{' '}
                        <span className="text-gray-900 dark:text-white">{approval.workflow_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Requested by:</span>{' '}
                        <span className="text-gray-900 dark:text-white">
                          {approval.requested_by_name || approval.requested_by_email}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Date:</span>{' '}
                        <span className="text-gray-900 dark:text-white">
                          {new Date(approval.requested_at).toLocaleString()}
                        </span>
                      </div>
                      {approval.required_role && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Required Role:</span>{' '}
                          {getRoleBadge(approval.required_role)}
                        </div>
                      )}
                    </div>

                    {approval.request_notes && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Notes:</span>{' '}
                        <span className="text-gray-700 dark:text-gray-300">{approval.request_notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Section: Actions */}
                  {hasPermission('approvals:approve') && approval.status === 'pending' && (
                    <div className="flex gap-2 md:flex-col">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openActionModal(approval, 'approve')}
                        className="flex-1 md:w-32"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openActionModal(approval, 'reject')}
                        className="flex-1 md:w-32"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal (Approve/Reject) */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => !submitting && setActionModalOpen(false)}
        title={actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
        size="md"
      >
        <div className="space-y-4">
          {selectedApproval && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-md">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Document:</strong> {selectedApproval.document_number}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Amount:</strong> {parseFloat(selectedApproval.document_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Type:</strong> {getDocumentTypeLabel(selectedApproval.document_type)}
              </p>
            </div>
          )}

          <Input
            label={actionType === 'reject' ? 'Rejection Notes (Required)' : 'Approval Notes (Optional)'}
            multiline={true}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={actionType === 'reject' ? 'Please provide a reason for rejection' : 'Optional notes...'}
            rows={4}
            required={actionType === 'reject'}
          />

          <div className="flex gap-2">
            <Button
              onClick={handleSubmitAction}
              loading={submitting}
              variant={actionType === 'approve' ? 'primary' : 'danger'}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
            <Button variant="secondary" onClick={() => setActionModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
