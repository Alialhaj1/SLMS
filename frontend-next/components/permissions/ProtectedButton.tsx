/**
 * 🔐 PROTECTED BUTTON - زر محمي بالصلاحيات
 * =====================================================
 * 
 * زر يتحقق تلقائياً من الصلاحيات قبل العرض أو التنفيذ
 * 
 * @example
 * // إخفاء تام عند عدم وجود الصلاحية
 * <ProtectedButton permission="shipments:create" onClick={handleCreate}>
 *   إنشاء شحنة
 * </ProtectedButton>
 * 
 * // تعطيل مع tooltip عند عدم وجود الصلاحية
 * <ProtectedButton 
 *   permission="shipments:delete" 
 *   hideOnNoPermission={false}
 *   onClick={handleDelete}
 * >
 *   حذف
 * </ProtectedButton>
 * 
 * // أزرار خطيرة تتطلب تأكيد
 * <ProtectedButton 
 *   permission="journals:post" 
 *   requireConfirm
 *   confirmMessage="هل تريد ترحيل القيد؟"
 *   onClick={handlePost}
 * >
 *   ترحيل
 * </ProtectedButton>
 */

import React, { useState, ReactNode, ButtonHTMLAttributes } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import clsx from 'clsx';

export interface ProtectedButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** الصلاحية المطلوبة */
  permission?: string;
  /** أي صلاحية من القائمة */
  anyOf?: string[];
  /** جميع الصلاحيات */
  allOf?: string[];
  /** إخفاء الزر عند عدم وجود الصلاحية (افتراضي: true) */
  hideOnNoPermission?: boolean;
  /** نوع الزر */
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  /** حجم الزر */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** حالة التحميل */
  loading?: boolean;
  /** أيقونة الزر */
  icon?: ReactNode;
  /** موقع الأيقونة */
  iconPosition?: 'left' | 'right';
  /** طلب تأكيد قبل التنفيذ */
  requireConfirm?: boolean;
  /** عنوان رسالة التأكيد */
  confirmTitle?: string;
  /** نص رسالة التأكيد */
  confirmMessage?: string;
  /** نص زر التأكيد */
  confirmButtonText?: string;
  /** نوع حوار التأكيد */
  confirmVariant?: 'danger' | 'primary';
  /** دالة التنفيذ */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  /** المحتوى */
  children: ReactNode;
  /** فئات CSS إضافية */
  className?: string;
  /** Tooltip عند تعطيل الزر */
  disabledTooltip?: string;
  /** ملء العرض */
  fullWidth?: boolean;
}

export function ProtectedButton({
  permission,
  anyOf,
  allOf,
  hideOnNoPermission = true,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  requireConfirm = false,
  confirmTitle,
  confirmMessage,
  confirmButtonText,
  confirmVariant = 'danger',
  onClick,
  children,
  className,
  disabledTooltip,
  fullWidth = false,
  disabled,
  ...rest
}: ProtectedButtonProps): React.ReactElement | null {
  const { can, canAny, canAll, isDangerous, loading: permLoading } = usePermissions();
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // التحقق من الصلاحيات
  let hasPermission = true;
  if (permission) {
    hasPermission = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasPermission = canAny(anyOf);
  } else if (allOf && allOf.length > 0) {
    hasPermission = canAll(allOf);
  }

  // التحقق إذا كان الإجراء خطير
  const isActionDangerous = permission ? isDangerous(permission) : false;
  const needsConfirm = requireConfirm || isActionDangerous;

  // إخفاء الزر إذا لم يكن لديه صلاحية
  if (!hasPermission && hideOnNoPermission) {
    return null;
  }

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!hasPermission || disabled || loading) return;

    if (needsConfirm) {
      setShowConfirm(true);
    } else {
      await executeAction(e);
    }
  };

  const executeAction = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (!onClick) return;
    
    try {
      setIsExecuting(true);
      await onClick(e as React.MouseEvent<HTMLButtonElement>);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleConfirm = async () => {
    await executeAction();
    setShowConfirm(false);
  };

  const isLoading = loading || isExecuting || permLoading;
  const isDisabled = disabled || !hasPermission || isLoading;

  // حساب الـ variant للزر
  const buttonVariant = variant === 'danger' || variant === 'warning' ? 'danger' : 
                        variant === 'success' ? 'primary' :
                        variant === 'ghost' ? 'secondary' : variant;

  return (
    <>
      <Button
        variant={buttonVariant as 'primary' | 'secondary' | 'danger'}
        size={size === 'xs' ? 'sm' : size}
        loading={isLoading}
        disabled={isDisabled}
        onClick={handleClick}
        className={clsx(
          className,
          fullWidth && 'w-full',
          !hasPermission && !hideOnNoPermission && 'opacity-50 cursor-not-allowed'
        )}
        title={!hasPermission ? (disabledTooltip || t('common.noPermission')) : undefined}
        {...rest}
      >
        {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
      </Button>

      {/* حوار التأكيد */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title={confirmTitle || t('common.confirmAction')}
        message={confirmMessage || t('common.confirmActionMessage')}
        confirmText={confirmButtonText || t('common.confirm')}
        variant={confirmVariant}
        loading={isExecuting}
      />
    </>
  );
}

export default ProtectedButton;
