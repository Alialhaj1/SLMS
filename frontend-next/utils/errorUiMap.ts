/**
 * Frontend Error Mapping Registry
 * Centralized error code → UX behavior mapping
 * 
 * Purpose: Consistent error handling across all components
 */

import { ErrorCode } from '../types/errors';

/**
 * UI Action Types
 * Defines how frontend should react to error
 */
export type UIAction =
  | 'lock'         // Lock/disable fields
  | 'toast'        // Show toast notification
  | 'modal'        // Show modal dialog
  | 'redirect'     // Redirect to another page
  | 'inline'       // Show inline error message
  | 'highlight'    // Highlight specific fields
  | 'badge';       // Show status badge

/**
 * Severity Levels
 * 
 * CTO Requirement: Visual Severity Levels
 * - error → Red (destructive, requires immediate attention)
 * - warning → Amber (caution, may proceed with care)
 * - info → Neutral / Blue (informational, policy-based)
 * - success → Green (confirmation)
 */
export type Severity = 'error' | 'warning' | 'info' | 'success';

/**
 * Severity Color Mapping (for Tailwind classes)
 */
export const SeverityColors = {
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-400',
    text: 'text-red-800 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-400',
    text: 'text-amber-800 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-400',
    text: 'text-blue-800 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-400',
    text: 'text-green-800 dark:text-green-300',
    icon: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
} as const;

/**
 * Error UI Config
 */
export interface ErrorUIConfig {
  // Messages (i18n)
  message_en: string;
  message_ar: string;

  // UI Behavior
  actions: UIAction[];
  severity: Severity;

  // Visual Feedback
  toast?: boolean;               // Show toast notification
  modal?: boolean;               // Show modal dialog
  fieldHighlight?: boolean;      // Highlight affected fields
  disableSubmit?: boolean;       // Disable submit button

  // Navigation
  redirectTo?: string;           // Redirect URL (optional)

  // Hints
  hint_en?: string;             // Actionable hint (English)
  hint_ar?: string;             // Actionable hint (Arabic)

  // Alternative Action
  alternativeAction?: {
    label_en: string;
    label_ar: string;
    action: () => void;
  };
}

/**
 * Error UI Mapping Registry
 * Source of truth for error → UX behavior
 */
export const errorUiMap: Record<string, ErrorUIConfig> = {
  /**
   * Item Policy Locked
   * User attempts to modify locked policy fields
   * Severity: info (policy-based, neutral)
   */
  [ErrorCode.ITEM_POLICY_LOCKED]: {
    message_en: 'Cannot modify locked fields after inventory movement',
    message_ar: 'لا يمكن تعديل الحقول المقفلة بعد حركة المخزون',
    actions: ['toast', 'highlight', 'lock'],
    severity: 'info', // Policy block → Neutral / Info (CTO requirement)
    toast: true,
    fieldHighlight: true,
    disableSubmit: true,
    hint_en: 'These fields are locked to preserve accounting integrity. Create a new item instead.',
    hint_ar: 'هذه الحقول مقفلة للحفاظ على سلامة الحسابات. أنشئ صنفًا جديدًا بدلاً من ذلك.',
  },

  /**
   * Item Has Movement
   * User attempts to delete item with movements
   */
  [ErrorCode.ITEM_HAS_MOVEMENT]: {
    message_en: 'Cannot delete item with inventory movements',
    message_ar: 'لا يمكن حذف صنف له حركات مخزنية',
    actions: ['toast', 'modal'],
    severity: 'error',
    toast: true,
    modal: true,
    hint_en: 'To remove this item from active use, set "Active" to No instead of deleting.',
    hint_ar: 'لإزالة هذا الصنف من الاستخدام، اضبط "نشط" على لا بدلاً من الحذف.',
    alternativeAction: {
      label_en: 'Deactivate Instead',
      label_ar: 'تعطيل بدلاً من الحذف',
      action: () => {
        // Navigate to edit page with is_active=false preset
      },
    },
  },

  /**
   * Group Has Children
   * User attempts to delete/reparent group with children
   */
  [ErrorCode.GROUP_HAS_CHILDREN]: {
    message_en: 'Cannot delete group with child groups',
    message_ar: 'لا يمكن حذف مجموعة تحتوي على مجموعات فرعية',
    actions: ['toast', 'modal'],
    severity: 'error',
    toast: true,
    modal: true,
    hint_en: 'Move or delete child groups first.',
    hint_ar: 'انقل أو احذف المجموعات الفرعية أولاً.',
  },

  /**
   * Group Has Items
   * User attempts to delete/reparent group with items
   */
  [ErrorCode.GROUP_HAS_ITEMS]: {
    message_en: 'Cannot delete group with items',
    message_ar: 'لا يمكن حذف مجموعة تحتوي على أصناف',
    actions: ['toast', 'modal'],
    severity: 'error',
    toast: true,
    modal: true,
    hint_en: 'Move items to another group first.',
    hint_ar: 'انقل الأصناف إلى مجموعة أخرى أولاً.',
  },

  /**
   * Validation Error
   * Input validation failure
   */
  [ErrorCode.VALIDATION_ERROR]: {
    message_en: 'Please correct the highlighted fields',
    message_ar: 'يرجى تصحيح الحقول المميزة',
    actions: ['inline', 'highlight'],
    severity: 'error',
    fieldHighlight: true,
    disableSubmit: true,
    hint_en: 'Required fields must be filled and valid.',
    hint_ar: 'يجب ملء الحقول المطلوبة بشكل صحيح.',
  },

  /**
   * Duplicate Code
   * Unique constraint violation
   */
  [ErrorCode.DUPLICATE_CODE]: {
    message_en: 'This code already exists',
    message_ar: 'هذا الرمز موجود بالفعل',
    actions: ['inline', 'highlight'],
    severity: 'error',
    fieldHighlight: true,
    disableSubmit: true,
    hint_en: 'Choose a unique code for this entity.',
    hint_ar: 'اختر رمزًا فريدًا لهذا العنصر.',
  },

  /**
   * Entity Not Found
   * Resource not found (404)
   */
  [ErrorCode.ENTITY_NOT_FOUND]: {
    message_en: 'The requested resource was not found',
    message_ar: 'المورد المطلوب غير موجود',
    actions: ['toast', 'redirect'],
    severity: 'error',
    toast: true,
    redirectTo: '/404',
    hint_en: 'The resource may have been deleted or moved.',
    hint_ar: 'قد يكون المورد قد تم حذفه أو نقله.',
  },

  /**
   * Unauthorized
   * Authentication required
   */
  [ErrorCode.UNAUTHORIZED]: {
    message_en: 'Please log in to continue',
    message_ar: 'يرجى تسجيل الدخول للمتابعة',
    actions: ['toast', 'redirect'],
    severity: 'warning',
    toast: true,
    redirectTo: '/login',
    hint_en: 'Your session may have expired.',
    hint_ar: 'قد تكون جلستك قد انتهت.',
  },

  /**
   * Forbidden
   * Permission denied
   */
  [ErrorCode.FORBIDDEN]: {
    message_en: 'You do not have permission to perform this action',
    message_ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
    actions: ['toast', 'modal'],
    severity: 'error',
    toast: true,
    modal: true,
    hint_en: 'Contact your administrator to request access.',
    hint_ar: 'اتصل بالمسؤول لطلب الوصول.',
  },

  /**
   * Operation Not Allowed
   * Generic business rule violation
   */
  [ErrorCode.OPERATION_NOT_ALLOWED]: {
    message_en: 'This operation is not allowed',
    message_ar: 'هذا الإجراء غير مسموح به',
    actions: ['toast'],
    severity: 'error',
    toast: true,
    hint_en: 'Check business rules and try again.',
    hint_ar: 'تحقق من قواعد العمل وحاول مرة أخرى.',
  },

  /**
   * Concurrent Modification
   * Optimistic lock failure
   */
  [ErrorCode.CONCURRENT_MODIFICATION]: {
    message_en: 'This record was modified by another user',
    message_ar: 'تم تعديل هذا السجل بواسطة مستخدم آخر',
    actions: ['toast', 'modal'],
    severity: 'warning',
    toast: true,
    modal: true,
    hint_en: 'Refresh the page to see the latest changes.',
    hint_ar: 'قم بتحديث الصفحة لرؤية التغييرات الأخيرة.',
    alternativeAction: {
      label_en: 'Refresh Page',
      label_ar: 'تحديث الصفحة',
      action: () => window.location.reload(),
    },
  },
};

/**
 * Get UI config for error code
 */
export function getErrorUiConfig(errorCode: string): ErrorUIConfig | null {
  return errorUiMap[errorCode] || null;
}

/**
 * Get localized error message
 */
export function getErrorMessage(errorCode: string, locale: 'en' | 'ar' = 'en'): string {
  const config = getErrorUiConfig(errorCode);
  if (!config) return 'An error occurred'; // Fallback
  return locale === 'ar' ? config.message_ar : config.message_en;
}

/**
 * Get localized hint
 */
export function getErrorHint(errorCode: string, locale: 'en' | 'ar' = 'en'): string | undefined {
  const config = getErrorUiConfig(errorCode);
  if (!config) return undefined;
  return locale === 'ar' ? config.hint_ar : config.hint_en;
}

/**
 * Check if error should show toast
 */
export function shouldShowToast(errorCode: string): boolean {
  const config = getErrorUiConfig(errorCode);
  return config?.toast || false;
}

/**
 * Check if error should show modal
 */
export function shouldShowModal(errorCode: string): boolean {
  const config = getErrorUiConfig(errorCode);
  return config?.modal || false;
}

/**
 * Check if error should highlight fields
 */
export function shouldHighlightFields(errorCode: string): boolean {
  const config = getErrorUiConfig(errorCode);
  return config?.fieldHighlight || false;
}

/**
 * Usage Examples:
 * 
 * Example 1: Handle API error in component
 * =========================================
 * const handleSubmit = async () => {
 *   try {
 *     await updateItem(itemId, formData);
 *   } catch (error: any) {
 *     const errorCode = error.error?.code;
 *     const config = getErrorUiConfig(errorCode);
 *     
 *     if (config) {
 *       // Show toast
 *       if (config.toast) {
 *         showToast(getErrorMessage(errorCode, locale), 'error');
 *       }
 *       
 *       // Highlight fields
 *       if (config.fieldHighlight && error.error.fields) {
 *         highlightFields(error.error.fields);
 *       }
 *       
 *       // Show modal
 *       if (config.modal) {
 *         showErrorModal({
 *           title: getErrorMessage(errorCode, locale),
 *           message: getErrorHint(errorCode, locale),
 *           actions: config.alternativeAction ? [config.alternativeAction] : [],
 *         });
 *       }
 *       
 *       // Redirect
 *       if (config.redirectTo) {
 *         router.push(config.redirectTo);
 *       }
 *     }
 *   }
 * };
 * 
 * Example 2: Disable fields based on error
 * =========================================
 * const isFieldLocked = (fieldName: string): boolean => {
 *   if (!item.has_movement) return false;
 *   
 *   const config = getErrorUiConfig(ErrorCode.ITEM_POLICY_LOCKED);
 *   return config?.actions.includes('lock') || false;
 * };
 * 
 * Example 3: Show alternative action button
 * ==========================================
 * {errorCode === ErrorCode.ITEM_HAS_MOVEMENT && (
 *   <Button onClick={errorUiMap[ErrorCode.ITEM_HAS_MOVEMENT].alternativeAction?.action}>
 *     {locale === 'ar'
 *       ? errorUiMap[ErrorCode.ITEM_HAS_MOVEMENT].alternativeAction?.label_ar
 *       : errorUiMap[ErrorCode.ITEM_HAS_MOVEMENT].alternativeAction?.label_en}
 *   </Button>
 * )}
 */
