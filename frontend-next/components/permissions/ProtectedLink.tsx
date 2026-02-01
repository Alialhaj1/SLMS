/**
 * 🔐 PROTECTED LINK - رابط محمي بالصلاحيات
 * =====================================================
 * 
 * رابط يتحقق من الصلاحيات قبل العرض أو التنقل
 * 
 * @example
 * // إخفاء الرابط عند عدم وجود الصلاحية
 * <ProtectedLink href="/shipments/new" permission="shipments:create">
 *   إنشاء شحنة جديدة
 * </ProtectedLink>
 * 
 * // عرض نص عادي بدلاً من الرابط
 * <ProtectedLink 
 *   href="/reports/financial" 
 *   permission="reports:view"
 *   showAsTextOnNoPermission
 * >
 *   التقارير المالية
 * </ProtectedLink>
 */

import React, { ReactNode, MouseEvent } from 'react';
import Link, { LinkProps } from 'next/link';
import { useRouter } from 'next/router';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import clsx from 'clsx';

export interface ProtectedLinkProps extends Omit<LinkProps, 'href'> {
  /** الرابط */
  href: string;
  /** الصلاحية المطلوبة */
  permission?: string;
  /** أي صلاحية من القائمة */
  anyOf?: string[];
  /** جميع الصلاحيات */
  allOf?: string[];
  /** إخفاء الرابط عند عدم وجود الصلاحية */
  hideOnNoPermission?: boolean;
  /** عرض كنص عادي بدلاً من رابط */
  showAsTextOnNoPermission?: boolean;
  /** إظهار رسالة خطأ عند محاولة النقر بدون صلاحية */
  showErrorOnClick?: boolean;
  /** المحتوى */
  children: ReactNode;
  /** فئات CSS */
  className?: string;
  /** فئات CSS للنص العادي */
  textClassName?: string;
  /** Target للرابط */
  target?: string;
  /** أيقونة */
  icon?: ReactNode;
  /** موقع الأيقونة */
  iconPosition?: 'left' | 'right';
  /** onClick إضافي */
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

export function ProtectedLink({
  href,
  permission,
  anyOf,
  allOf,
  hideOnNoPermission = true,
  showAsTextOnNoPermission = false,
  showErrorOnClick = false,
  children,
  className,
  textClassName,
  target,
  icon,
  iconPosition = 'left',
  onClick,
  ...linkProps
}: ProtectedLinkProps): React.ReactElement | null {
  const { can, canAny, canAll, isSuperAdmin } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  // التحقق من الصلاحيات
  let hasPermission = true;
  if (permission) {
    hasPermission = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasPermission = canAny(anyOf);
  } else if (allOf && allOf.length > 0) {
    hasPermission = canAll(allOf);
  }

  // Super Admin يتخطى جميع الفحوصات
  if (isSuperAdmin) {
    hasPermission = true;
  }

  // إخفاء الرابط
  if (!hasPermission && hideOnNoPermission && !showAsTextOnNoPermission) {
    return null;
  }

  // عرض كنص عادي
  if (!hasPermission && showAsTextOnNoPermission) {
    return (
      <span className={clsx(textClassName || className, 'cursor-not-allowed opacity-60')}>
        {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
      </span>
    );
  }

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!hasPermission) {
      e.preventDefault();
      if (showErrorOnClick) {
        showToast(t('common.noPermissionToAccess'), 'error');
      }
      return;
    }
    onClick?.(e);
  };

  return (
    <Link
      href={href}
      className={clsx(
        className,
        !hasPermission && 'pointer-events-none opacity-50'
      )}
      target={target}
      onClick={handleClick}
      {...linkProps}
    >
      {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </Link>
  );
}

export default ProtectedLink;
