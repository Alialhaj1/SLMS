/**
 * 🔐 CONFIRM ACTION MODAL
 * ========================
 * Smart confirmation dialog that shows what will happen before critical actions
 * 
 * Features:
 * ✅ Shows side effects (inventory, accounting, locks)
 * ✅ Bilingual (EN/AR)
 * ✅ Action-specific styling (post=blue, reverse=yellow, delete=red)
 * ✅ Loading state during async operations
 * ✅ Required reason field for reversals
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, DocumentCheckIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { useLocale } from '../../contexts/LocaleContext';

export type ActionType = 'post' | 'reverse' | 'delete' | 'approve' | 'cancel';

export interface SideEffect {
  updates_inventory: boolean;
  updates_vendor_balance: boolean;
  creates_journal_entry: boolean;
  locks_document: boolean;
  description: string;
  description_ar: string;
}

export interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  action: ActionType;
  documentType: string;
  documentNumber: string;
  sideEffects?: SideEffect;
  details?: {
    total_amount?: number;
    vendor_name?: string;
    vendor_balance_change?: number;
  };
  requireReason?: boolean;
  loading?: boolean;
}

const ACTION_LABELS: Record<ActionType, { en: string; ar: string }> = {
  post: { en: 'Post', ar: 'ترحيل' },
  reverse: { en: 'Reverse', ar: 'عكس' },
  delete: { en: 'Delete', ar: 'حذف' },
  approve: { en: 'Approve', ar: 'اعتماد' },
  cancel: { en: 'Cancel', ar: 'إلغاء' }
};

const ACTION_COLORS: Record<ActionType, string> = {
  post: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  reverse: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  delete: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  approve: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  cancel: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
};

const ACTION_ICONS: Record<ActionType, React.ElementType> = {
  post: DocumentCheckIcon,
  reverse: ArrowUturnLeftIcon,
  delete: ExclamationTriangleIcon,
  approve: DocumentCheckIcon,
  cancel: XMarkIcon
};

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  documentType,
  documentNumber,
  sideEffects,
  details,
  requireReason = false,
  loading = false
}) => {
  const { locale } = useLocale();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isArabic = locale === 'ar';
  const actionLabel = ACTION_LABELS[action][isArabic ? 'ar' : 'en'];
  const ActionIcon = ACTION_ICONS[action];

  // Reset reason when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onConfirm(reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative w-full max-w-lg transform rounded-xl bg-white dark:bg-slate-800 shadow-2xl transition-all ${isArabic ? 'text-right' : 'text-left'}`}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${action === 'delete' || action === 'reverse' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                <ActionIcon className={`h-6 w-6 ${action === 'delete' || action === 'reverse' ? 'text-amber-600' : 'text-blue-600'}`} />
              </div>
              <h3 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                {isArabic ? `تأكيد ${actionLabel}` : `Confirm ${actionLabel}`}
              </h3>
            </div>
            <button
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              aria-label={isArabic ? 'إغلاق' : 'Close'}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Document Info */}
            <div className="rounded-lg bg-gray-50 dark:bg-slate-700/50 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {isArabic ? 'المستند:' : 'Document:'}
                <span className="font-semibold text-gray-900 dark:text-white mx-2">
                  {documentNumber}
                </span>
                <span className="text-gray-500">
                  ({isArabic ? documentType.replace('purchase_invoice', 'فاتورة مشتريات')
                              .replace('purchase_order', 'أمر شراء')
                              .replace('goods_receipt', 'سند استلام')
                              .replace('purchase_return', 'مرتجع مشتريات') 
                    : documentType.replace(/_/g, ' ')})
                </span>
              </p>
              
              {details && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {details.vendor_name && (
                    <div>
                      <span className="text-gray-500">{isArabic ? 'المورد:' : 'Vendor:'}</span>
                      <span className="font-medium text-gray-900 dark:text-white mx-1">{details.vendor_name}</span>
                    </div>
                  )}
                  {details.total_amount && (
                    <div>
                      <span className="text-gray-500">{isArabic ? 'المبلغ:' : 'Amount:'}</span>
                      <span className="font-medium text-gray-900 dark:text-white mx-1">
                        {details.total_amount.toLocaleString(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Side Effects */}
            {sideEffects && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isArabic ? 'ما سيحدث:' : 'What will happen:'}
                </h4>
                
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isArabic ? sideEffects.description_ar : sideEffects.description}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {sideEffects.updates_inventory && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {isArabic ? 'تحديث المخزون' : 'Update inventory'}
                      </span>
                    </div>
                  )}
                  {sideEffects.updates_vendor_balance && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {isArabic ? 'تحديث رصيد المورد' : 'Update vendor balance'}
                        {details?.vendor_balance_change && (
                          <span className={`mx-1 font-medium ${details.vendor_balance_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ({details.vendor_balance_change > 0 ? '+' : ''}{details.vendor_balance_change.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {sideEffects.creates_journal_entry && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {isArabic ? 'إنشاء قيد محاسبي' : 'Create journal entry'}
                      </span>
                    </div>
                  )}
                  {sideEffects.locks_document && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {isArabic ? 'قفل المستند' : 'Lock document'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning for reverse/delete */}
            {(action === 'reverse' || action === 'delete') && (
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {action === 'reverse' 
                    ? (isArabic ? 'سيتم عكس جميع الآثار المحاسبية والمخزنية. لا يمكن التراجع عن هذا الإجراء.' 
                                : 'All accounting and inventory effects will be reversed. This action cannot be undone.')
                    : (isArabic ? 'سيتم حذف هذا المستند نهائياً. لا يمكن التراجع عن هذا الإجراء.'
                                : 'This document will be permanently deleted. This action cannot be undone.')}
                </p>
              </div>
            )}

            {/* Reason field for reversals */}
            {(requireReason || action === 'reverse') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'سبب العكس *' : 'Reason for reversal *'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder={isArabic ? 'أدخل سبب العكس...' : 'Enter reason for reversal...'}
                  required
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-700 px-6 py-4">
            <button
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors disabled:opacity-50"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || loading || (action === 'reverse' && !reason.trim())}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ACTION_COLORS[action]}`}
            >
              {isSubmitting || loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isArabic ? 'جاري المعالجة...' : 'Processing...'}
                </span>
              ) : (
                <>
                  {isArabic ? `تأكيد ${actionLabel}` : `Confirm ${actionLabel}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;
