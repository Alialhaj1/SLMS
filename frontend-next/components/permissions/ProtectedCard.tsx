/**
 * 🔐 PROTECTED CARD - بطاقة محمية بالصلاحيات
 * =====================================================
 * 
 * بطاقة تتحقق من الصلاحيات قبل العرض
 * مناسبة لبطاقات الـ KPI وبطاقات الإحصائيات
 * 
 * @example
 * <ProtectedCard 
 *   permission="dashboard:statistics:view"
 *   title="إجمالي الشحنات"
 *   value={1234}
 *   icon={<TruckIcon />}
 *   color="blue"
 *   href="/shipments"
 *   linkPermission="shipments:view"
 * />
 */

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import clsx from 'clsx';

export interface ProtectedCardProps {
  /** الصلاحية المطلوبة للعرض */
  permission?: string;
  /** أي صلاحية من القائمة */
  anyOf?: string[];
  /** صلاحية الرابط (إذا كانت مختلفة عن صلاحية العرض) */
  linkPermission?: string;
  /** عنوان البطاقة */
  title: string;
  /** القيمة */
  value?: string | number;
  /** أيقونة البطاقة */
  icon?: ReactNode;
  /** لون البطاقة */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray' | 'orange';
  /** رابط التنقل */
  href?: string;
  /** اتجاه التغيير */
  trend?: 'up' | 'down' | 'neutral';
  /** نسبة التغيير */
  trendValue?: string;
  /** حالة التحميل */
  loading?: boolean;
  /** المحتوى الإضافي */
  children?: ReactNode;
  /** فئات CSS */
  className?: string;
  /** إخفاء البطاقة عند عدم وجود الصلاحية */
  hideOnNoPermission?: boolean;
  /** عرض placeholder عند عدم وجود الصلاحية */
  showPlaceholder?: boolean;
  /** نص الـ placeholder */
  placeholderText?: string;
  /** onClick */
  onClick?: () => void;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    hover: 'hover:bg-green-100 dark:hover:bg-green-900/30',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    hover: 'hover:bg-red-100 dark:hover:bg-red-900/30',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    icon: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-900/30',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
  },
};

export function ProtectedCard({
  permission,
  anyOf,
  linkPermission,
  title,
  value,
  icon,
  color = 'blue',
  href,
  trend,
  trendValue,
  loading = false,
  children,
  className,
  hideOnNoPermission = true,
  showPlaceholder = false,
  placeholderText,
  onClick,
}: ProtectedCardProps): React.ReactElement | null {
  const { can, canAny, isSuperAdmin } = usePermissions();
  const { t } = useTranslation();

  // التحقق من صلاحية العرض
  let hasViewPermission = true;
  if (permission) {
    hasViewPermission = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasViewPermission = canAny(anyOf);
  }

  // Super Admin يتخطى جميع الفحوصات
  if (isSuperAdmin) {
    hasViewPermission = true;
  }

  // التحقق من صلاحية الرابط
  let hasLinkPermission = true;
  if (linkPermission) {
    hasLinkPermission = isSuperAdmin || can(linkPermission);
  }

  // إخفاء البطاقة
  if (!hasViewPermission && hideOnNoPermission && !showPlaceholder) {
    return null;
  }

  // عرض placeholder
  if (!hasViewPermission && showPlaceholder) {
    return (
      <div className={clsx(
        'rounded-lg border p-4',
        colorClasses.gray.bg,
        colorClasses.gray.border,
        className
      )}>
        <div className="flex items-center justify-center h-20">
          <span className="text-gray-400 dark:text-gray-500 text-sm">
            {placeholderText || t('common.noPermissionToView')}
          </span>
        </div>
      </div>
    );
  }

  const colors = colorClasses[color];

  const cardContent = (
    <div className={clsx(
      'rounded-lg border p-4 transition-all duration-200',
      colors.bg,
      colors.border,
      (href && hasLinkPermission) || onClick ? colors.hover : '',
      ((href && hasLinkPermission) || onClick) && 'cursor-pointer',
      className
    )}>
      {loading ? (
        <div className="animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            {icon && (
              <div className={clsx('p-2 rounded-lg', colors.bg, colors.icon)}>
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {title}
              </p>
              {value !== undefined && (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
              )}
            </div>
          </div>
          
          {/* Trend indicator */}
          {trend && trendValue && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              <span className={clsx(
                trend === 'up' && 'text-green-600',
                trend === 'down' && 'text-red-600',
                trend === 'neutral' && 'text-gray-500'
              )}>
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trendValue}
              </span>
            </div>
          )}
          
          {children}
        </>
      )}
    </div>
  );

  // إذا كان هناك رابط وصلاحية
  if (href && hasLinkPermission) {
    return <Link href={href}>{cardContent}</Link>;
  }

  // إذا كان هناك onClick
  if (onClick) {
    return <div onClick={onClick}>{cardContent}</div>;
  }

  return cardContent;
}

export default ProtectedCard;
