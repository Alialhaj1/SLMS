/**
 * 🔐 PROTECTED ACTION - إجراء محمي بالصلاحيات
 * =====================================================
 * 
 * مكون لأيقونات الإجراءات في الجداول والقوائم
 * 
 * @example
 * <ProtectedAction
 *   permission="shipments:edit"
 *   icon={<PencilIcon className="w-5 h-5" />}
 *   onClick={() => handleEdit(row.id)}
 *   tooltip="تعديل"
 * />
 * 
 * <ProtectedAction
 *   permission="shipments:delete"
 *   icon={<TrashIcon className="w-5 h-5" />}
 *   onClick={() => handleDelete(row.id)}
 *   tooltip="حذف"
 *   requireConfirm
 *   confirmMessage="هل أنت متأكد من حذف هذه الشحنة؟"
 *   variant="danger"
 * />
 */

import React, { useState, ReactNode, ButtonHTMLAttributes } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import ConfirmDialog from '../ui/ConfirmDialog';
import clsx from 'clsx';

export interface ProtectedActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** الصلاحية المطلوبة */
  permission?: string;
  /** أي صلاحية من القائمة */
  anyOf?: string[];
  /** الأيقونة */
  icon: ReactNode;
  /** نص التلميح */
  tooltip?: string;
  /** دالة التنفيذ */
  onClick?: () => void | Promise<void>;
  /** اللون */
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning';
  /** الحجم */
  size?: 'sm' | 'md' | 'lg';
  /** طلب تأكيد */
  requireConfirm?: boolean;
  /** عنوان التأكيد */
  confirmTitle?: string;
  /** رسالة التأكيد */
  confirmMessage?: string;
  /** نص زر التأكيد */
  confirmButtonText?: string;
  /** إخفاء عند عدم وجود الصلاحية */
  hideOnNoPermission?: boolean;
  /** حالة التحميل */
  loading?: boolean;
  /** فئات CSS */
  className?: string;
}

const variantClasses = {
  default: 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
  primary: 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200',
  danger: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200',
  success: 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200',
  warning: 'text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200',
};

const sizeClasses = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

export function ProtectedAction({
  permission,
  anyOf,
  icon,
  tooltip,
  onClick,
  variant = 'default',
  size = 'md',
  requireConfirm = false,
  confirmTitle,
  confirmMessage,
  confirmButtonText,
  hideOnNoPermission = true,
  loading = false,
  className,
  disabled,
  ...rest
}: ProtectedActionProps): React.ReactElement | null {
  const { can, canAny, isDangerous, isSuperAdmin } = usePermissions();
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // التحقق من الصلاحيات
  let hasPermission = true;
  if (permission) {
    hasPermission = isSuperAdmin || can(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasPermission = isSuperAdmin || canAny(anyOf);
  }

  // إخفاء الإجراء
  if (!hasPermission && hideOnNoPermission) {
    return null;
  }

  const isActionDangerous = permission ? isDangerous(permission) : variant === 'danger';
  const needsConfirm = requireConfirm || isActionDangerous;

  const handleClick = async () => {
    if (!hasPermission || disabled || loading || isExecuting) return;

    if (needsConfirm) {
      setShowConfirm(true);
    } else {
      await executeAction();
    }
  };

  const executeAction = async () => {
    if (!onClick) return;
    
    try {
      setIsExecuting(true);
      await onClick();
    } finally {
      setIsExecuting(false);
    }
  };

  const handleConfirm = async () => {
    await executeAction();
    setShowConfirm(false);
  };

  const isLoading = loading || isExecuting;
  const isDisabled = disabled || !hasPermission || isLoading;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        title={tooltip}
        className={clsx(
          'rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          variantClasses[variant],
          sizeClasses[size],
          isDisabled && 'opacity-50 cursor-not-allowed',
          isLoading && 'animate-pulse',
          className
        )}
        {...rest}
      >
        {icon}
      </button>

      {/* حوار التأكيد */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title={confirmTitle || t('common.confirmAction')}
        message={confirmMessage || t('common.confirmActionMessage')}
        confirmText={confirmButtonText || t('common.confirm')}
        variant={variant === 'danger' ? 'danger' : 'primary'}
        loading={isExecuting}
      />
    </>
  );
}

export default ProtectedAction;
