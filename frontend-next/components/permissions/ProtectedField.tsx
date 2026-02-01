/**
 * 🔐 PROTECTED FIELD - حقل محمي بالصلاحيات
 * =====================================================
 * 
 * يتحكم في إظهار/إخفاء الحقول أو جعلها للقراءة فقط
 * 
 * @example
 * // إخفاء الحقل تماماً
 * <ProtectedField permission="items:edit" field="cost_price">
 *   <Input label="سعر التكلفة" value={costPrice} />
 * </ProtectedField>
 * 
 * // جعل الحقل للقراءة فقط
 * <ProtectedField 
 *   permission="items:edit" 
 *   field="cost_price"
 *   readOnlyOnNoPermission
 * >
 *   <Input label="سعر التكلفة" value={costPrice} />
 * </ProtectedField>
 * 
 * // عرض قيمة بديلة
 * <ProtectedField 
 *   permission="salaries:view" 
 *   fallbackValue="****"
 * >
 *   <span>{salary}</span>
 * </ProtectedField>
 */

import React, { ReactNode, ReactElement, cloneElement, isValidElement } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

export interface ProtectedFieldProps {
  /** الصلاحية المطلوبة */
  permission?: string;
  /** اسم الحقل (للصلاحيات على مستوى الحقل) */
  field?: string;
  /** أي صلاحية من القائمة */
  anyOf?: string[];
  /** جميع الصلاحيات */
  allOf?: string[];
  /** جعل الحقل للقراءة فقط عند عدم وجود الصلاحية */
  readOnlyOnNoPermission?: boolean;
  /** تعطيل الحقل عند عدم وجود الصلاحية */
  disableOnNoPermission?: boolean;
  /** قيمة بديلة عند عدم وجود صلاحية العرض */
  fallbackValue?: ReactNode;
  /** إخفاء الحقل تماماً */
  hideOnNoPermission?: boolean;
  /** المحتوى */
  children: ReactNode;
  /** فئات CSS للحاوية */
  className?: string;
  /** إظهار تلميح بعدم وجود الصلاحية */
  showTooltip?: boolean;
  /** نص التلميح المخصص */
  tooltipText?: string;
}

export function ProtectedField({
  permission,
  field,
  anyOf,
  allOf,
  readOnlyOnNoPermission = false,
  disableOnNoPermission = false,
  fallbackValue,
  hideOnNoPermission = true,
  children,
  className,
  showTooltip = false,
  tooltipText,
}: ProtectedFieldProps): React.ReactElement | null {
  const { can, canAny, canAll, isSuperAdmin } = usePermissions();

  // Super Admin يتخطى جميع الفحوصات
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // بناء الصلاحية الكاملة مع اسم الحقل
  const buildFieldPermission = (basePerm: string): string => {
    if (field) {
      return `${basePerm}:field:${field}`;
    }
    return basePerm;
  };

  // التحقق من الصلاحيات
  let hasPermission = true;
  if (permission) {
    // نتحقق أولاً من الصلاحية الأساسية، ثم من صلاحية الحقل
    hasPermission = can(permission) && (field ? can(buildFieldPermission(permission)) : true);
  } else if (anyOf && anyOf.length > 0) {
    hasPermission = canAny(field ? anyOf.map(buildFieldPermission) : anyOf);
  } else if (allOf && allOf.length > 0) {
    hasPermission = canAll(field ? allOf.map(buildFieldPermission) : allOf);
  }

  // إخفاء الحقل تماماً
  if (!hasPermission && hideOnNoPermission && !readOnlyOnNoPermission && !disableOnNoPermission) {
    if (fallbackValue !== undefined) {
      return <span className={className}>{fallbackValue}</span>;
    }
    return null;
  }

  // إذا لم يكن لديه صلاحية وطُلب readOnly أو disable
  if (!hasPermission && (readOnlyOnNoPermission || disableOnNoPermission)) {
    // نحاول إضافة props للمكون الطفل
    if (isValidElement(children)) {
      const childElement = children as ReactElement<any>;
      const newProps: any = {};
      
      if (readOnlyOnNoPermission) {
        newProps.readOnly = true;
        newProps.className = clsx(
          childElement.props.className,
          'bg-gray-100 dark:bg-slate-700 cursor-not-allowed'
        );
      }
      
      if (disableOnNoPermission) {
        newProps.disabled = true;
      }

      if (showTooltip) {
        newProps.title = tooltipText || 'لا تملك صلاحية تعديل هذا الحقل';
      }

      return cloneElement(childElement, newProps);
    }
    
    // إذا لم يكن المكون element، نعرض القيمة البديلة
    if (fallbackValue !== undefined) {
      return <span className={className}>{fallbackValue}</span>;
    }
  }

  return <>{children}</>;
}

/**
 * مكون لإظهار قيمة مخفية (مثل كلمات المرور أو البيانات الحساسة)
 */
export function MaskedValue({
  permission,
  value,
  maskChar = '•',
  showLength = 4,
  className,
}: {
  permission: string;
  value: string | number;
  maskChar?: string;
  showLength?: number;
  className?: string;
}): React.ReactElement {
  const { can, isSuperAdmin } = usePermissions();

  const stringValue = String(value);
  
  if (isSuperAdmin || can(permission)) {
    return <span className={className}>{stringValue}</span>;
  }

  // إظهار جزء من القيمة مع إخفاء الباقي
  const masked = maskChar.repeat(Math.max(0, stringValue.length - showLength)) + 
                 stringValue.slice(-showLength);
  
  return <span className={className}>{masked}</span>;
}

export default ProtectedField;
