/**
 * Global Locked State UI Component
 * Displays banner when entity is locked due to business rules
 * 
 * CTO Requirement: "Global UX for Locked State - banner واحد: 'This record is locked due to business rules'"
 * 
 * Use Cases:
 * 1. Item locked after inventory movement
 * 2. Entity locked during approval workflow
 * 3. Record locked during accounting period close
 * 4. Bulk operation in progress
 */

import React from 'react';
import { LockClosedIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export interface LockedStateBannerProps {
  /**
   * Lock reason message
   */
  message: string;

  /**
   * Lock reason message (Arabic)
   */
  message_ar?: string;

  /**
   * Additional hint (optional)
   */
  hint?: string;

  /**
   * Additional hint (Arabic, optional)
   */
  hint_ar?: string;

  /**
   * Locked by user name (optional)
   */
  lockedBy?: string;

  /**
   * Locked at timestamp (optional)
   */
  lockedAt?: Date | string;

  /**
   * Lock type (for styling)
   */
  lockType?: 'policy' | 'approval' | 'accounting' | 'process';

  /**
   * Current locale
   */
  locale?: 'en' | 'ar';
}

export function LockedStateBanner({
  message,
  message_ar,
  hint,
  hint_ar,
  lockedBy,
  lockedAt,
  lockType = 'policy',
  locale = 'en',
}: LockedStateBannerProps) {
  const isArabic = locale === 'ar';
  const displayMessage = isArabic && message_ar ? message_ar : message;
  const displayHint = isArabic && hint_ar ? hint_ar : hint;

  // Format timestamp
  const formattedDate = lockedAt
    ? new Date(lockedAt).toLocaleString(isArabic ? 'ar-SA' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div
      className={`
        rounded-lg border-l-4 p-4 mb-6
        ${lockType === 'policy' ? 'bg-blue-50 border-blue-400 dark:bg-blue-900/20' : ''}
        ${lockType === 'approval' ? 'bg-amber-50 border-amber-400 dark:bg-amber-900/20' : ''}
        ${lockType === 'accounting' ? 'bg-purple-50 border-purple-400 dark:bg-purple-900/20' : ''}
        ${lockType === 'process' ? 'bg-gray-50 border-gray-400 dark:bg-gray-900/20' : ''}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Lock Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <LockClosedIcon
            className={`
              h-5 w-5
              ${lockType === 'policy' ? 'text-blue-600 dark:text-blue-400' : ''}
              ${lockType === 'approval' ? 'text-amber-600 dark:text-amber-400' : ''}
              ${lockType === 'accounting' ? 'text-purple-600 dark:text-purple-400' : ''}
              ${lockType === 'process' ? 'text-gray-600 dark:text-gray-400' : ''}
            `}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Main Message */}
          <p
            className={`
              font-semibold text-sm
              ${lockType === 'policy' ? 'text-blue-800 dark:text-blue-300' : ''}
              ${lockType === 'approval' ? 'text-amber-800 dark:text-amber-300' : ''}
              ${lockType === 'accounting' ? 'text-purple-800 dark:text-purple-300' : ''}
              ${lockType === 'process' ? 'text-gray-800 dark:text-gray-300' : ''}
            `}
          >
            {displayMessage}
          </p>

          {/* Hint */}
          {displayHint && (
            <p
              className={`
                mt-1 text-xs
                ${lockType === 'policy' ? 'text-blue-700 dark:text-blue-400' : ''}
                ${lockType === 'approval' ? 'text-amber-700 dark:text-amber-400' : ''}
                ${lockType === 'accounting' ? 'text-purple-700 dark:text-purple-400' : ''}
                ${lockType === 'process' ? 'text-gray-700 dark:text-gray-400' : ''}
              `}
            >
              <InformationCircleIcon className="inline h-4 w-4 mr-1" aria-hidden="true" />
              {displayHint}
            </p>
          )}

          {/* Metadata (locked by, locked at) */}
          {(lockedBy || lockedAt) && (
            <p
              className={`
                mt-2 text-xs opacity-75
                ${lockType === 'policy' ? 'text-blue-700 dark:text-blue-400' : ''}
                ${lockType === 'approval' ? 'text-amber-700 dark:text-amber-400' : ''}
                ${lockType === 'accounting' ? 'text-purple-700 dark:text-purple-400' : ''}
                ${lockType === 'process' ? 'text-gray-700 dark:text-gray-400' : ''}
              `}
            >
              {lockedBy && (
                <span>
                  {isArabic ? 'مقفل بواسطة:' : 'Locked by:'} <strong>{lockedBy}</strong>
                </span>
              )}
              {lockedBy && lockedAt && <span className="mx-2">•</span>}
              {lockedAt && <span>{formattedDate}</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Usage Examples:
 * 
 * // Policy Lock (Item after movement)
 * <LockedStateBanner
 *   message="This item is locked due to inventory movement"
 *   message_ar="هذا الصنف مقفل بسبب وجود حركة مخزون"
 *   hint="Policy fields cannot be modified to maintain accounting integrity"
 *   hint_ar="لا يمكن تعديل حقول السياسة للحفاظ على سلامة الحسابات"
 *   lockType="policy"
 *   locale={locale}
 * />
 * 
 * // Approval Lock
 * <LockedStateBanner
 *   message="This shipment is locked pending approval"
 *   message_ar="هذه الشحنة مقفلة في انتظار الموافقة"
 *   hint="Changes are not allowed during approval workflow"
 *   hint_ar="التغييرات غير مسموحة أثناء سير عمل الموافقة"
 *   lockType="approval"
 *   lockedBy="Ahmed Ali"
 *   lockedAt={new Date()}
 *   locale={locale}
 * />
 * 
 * // Accounting Lock
 * <LockedStateBanner
 *   message="This expense is locked due to closed accounting period"
 *   message_ar="هذا المصروف مقفل بسبب إغلاق الفترة المحاسبية"
 *   hint="Contact your accountant to reopen the period"
 *   hint_ar="اتصل بالمحاسب لإعادة فتح الفترة"
 *   lockType="accounting"
 *   locale={locale}
 * />
 * 
 * // Process Lock
 * <LockedStateBanner
 *   message="This record is locked due to ongoing bulk operation"
 *   message_ar="هذا السجل مقفل بسبب عملية مجمعة قيد التنفيذ"
 *   hint="Please wait for the operation to complete"
 *   hint_ar="يرجى الانتظار حتى تكتمل العملية"
 *   lockType="process"
 *   lockedBy="System"
 *   lockedAt={new Date()}
 *   locale={locale}
 * />
 */
