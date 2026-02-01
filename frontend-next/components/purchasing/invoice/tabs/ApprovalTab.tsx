/**
 * APPROVAL TAB - Purchase Invoice
 * Purpose: Approval workflow status, history, actions
 * Features: Timeline, status badges, approve/reject buttons
 */

import React from 'react';
import { InvoiceFormData } from '../hooks/useInvoiceForm';

interface ApprovalTabProps {
  formData: InvoiceFormData;
  canApprove: boolean;
  canPost: boolean;
  isLocked: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onPost?: () => void;
}

export const ApprovalTab: React.FC<ApprovalTabProps> = ({
  formData,
  canApprove,
  canPost,
  isLocked,
  onApprove,
  onReject,
  onPost,
}) => {
  
  // =============================================
  // STATUS RENDERING
  // =============================================
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; icon: string }> = {
      draft: { color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300', label: 'Draft', icon: '📝' },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Pending Approval', icon: '⏳' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Approved', icon: '✅' },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Rejected', icon: '❌' },
      posted: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Posted', icon: '🔒' },
      reversed: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', label: 'Reversed', icon: '↩️' },
    };

    const badge = badges[status] || badges.draft;

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${badge.color}`}>
        <span className="text-lg">{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  // =============================================
  // MOCK APPROVAL HISTORY
  // TODO: Replace with actual API data
  // =============================================
  const approvalHistory = [
    {
      id: 1,
      action: 'Created',
      user: 'John Doe',
      timestamp: '2026-01-10 10:30:00',
      comment: 'Invoice created from procurement module',
    },
    formData.status === 'pending_approval' || formData.status === 'approved' || formData.status === 'posted' ? {
      id: 2,
      action: 'Submitted for Approval',
      user: 'John Doe',
      timestamp: '2026-01-10 11:00:00',
      comment: 'Sent to finance manager for review',
    } : null,
    formData.status === 'approved' || formData.status === 'posted' ? {
      id: 3,
      action: 'Approved',
      user: 'Finance Manager',
      timestamp: '2026-01-10 14:30:00',
      comment: 'Approved - all documentation verified',
    } : null,
    formData.status === 'posted' ? {
      id: 4,
      action: 'Posted',
      user: 'System',
      timestamp: formData.posted_at || '2026-01-10 15:00:00',
      comment: 'Invoice posted to general ledger',
    } : null,
  ].filter(Boolean) as any[];

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="space-y-6">
      
      {/* CURRENT STATUS */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Current Status</h3>
        
        <div className="flex items-center justify-between">
          <div>
            {getStatusBadge(formData.status)}
            {isLocked && (
              <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-medium">Invoice is locked and cannot be edited</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {canApprove && onApprove && (
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve
              </button>
            )}

            {canApprove && onReject && (
              <button
                onClick={onReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            )}

            {canPost && onPost && (
              <button
                onClick={onPost}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Post to GL
              </button>
            )}
          </div>
        </div>

        {/* Status Details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Approval Status</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
              {formData.approval_status.replace('_', ' ')}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Posted Status</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {formData.is_posted ? 'Posted' : 'Not Posted'}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Posting Date</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {formData.posted_at ? new Date(formData.posted_at).toLocaleDateString() : '-'}
            </div>
          </div>
        </div>
      </section>

      {/* APPROVAL WORKFLOW INFO */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Approval Workflow</h3>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <p className="font-medium mb-2">Approval Process</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Invoice is created in <strong>Draft</strong> status</li>
                <li>Submitted for approval → <strong>Pending Approval</strong></li>
                <li>Finance manager reviews and approves → <strong>Approved</strong></li>
                <li>Approved invoice can be posted to GL → <strong>Posted</strong></li>
                <li>Posted invoices are locked and cannot be edited</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Approval Requirements */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Requirements for Approval</h4>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${formData.vendor_id ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={formData.vendor_id ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                </svg>
                Vendor selected
              </li>
              <li className="flex items-start gap-2">
                <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${formData.items.length > 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={formData.items.length > 0 ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                </svg>
                At least one item added
              </li>
              <li className="flex items-start gap-2">
                <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${formData.total_amount > 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={formData.total_amount > 0 ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                </svg>
                Invoice total is greater than zero
              </li>
              <li className="flex items-start gap-2">
                <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${formData.vendor_invoice_number ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={formData.vendor_invoice_number ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                </svg>
                Vendor invoice number provided
              </li>
            </ul>
          </div>

          <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Requirements for Posting</h4>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${formData.status === 'approved' ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={formData.status === 'approved' ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                </svg>
                Invoice is approved
              </li>
              <li className="flex items-start gap-2">
                <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${!formData.is_posted ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={!formData.is_posted ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                </svg>
                Not already posted
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Accounting entries are balanced
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* APPROVAL HISTORY TIMELINE */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">History Timeline</h3>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-600"></div>
          
          {/* Timeline items */}
          <div className="space-y-6">
            {approvalHistory.map((item, index) => (
              <div key={item.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                  index === approvalHistory.length - 1
                    ? 'bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                {/* Timeline content */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{item.action}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">by {item.user}</p>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {item.comment && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{item.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
