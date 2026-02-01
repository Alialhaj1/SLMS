/**
 * 🔐 PERMISSION GATE - بوابة الصلاحيات
 * =====================================================
 * 
 * مكون يتحكم في عرض المحتوى بناءً على الصلاحيات
 * 
 * @example
 * // إخفاء تام
 * <PermissionGate permission="shipments:create">
 *   <Button>إنشاء شحنة</Button>
 * </PermissionGate>
 * 
 * // عرض رسالة بديلة
 * <PermissionGate 
 *   permission="reports:export" 
 *   fallback={<span>لا تملك صلاحية التصدير</span>}
 * >
 *   <ExportButton />
 * </PermissionGate>
 * 
 * // التحقق من عدة صلاحيات (أي واحدة)
 * <PermissionGate anyOf={['shipments:create', 'shipments:edit']}>
 *   <ShipmentForm />
 * </PermissionGate>
 * 
 * // التحقق من جميع الصلاحيات
 * <PermissionGate allOf={['shipments:view', 'expenses:view']}>
 *   <CombinedReport />
 * </PermissionGate>
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';

export interface PermissionGateProps {
  /** صلاحية واحدة للتحقق */
  permission?: string;
  /** التحقق من أي صلاحية من القائمة */
  anyOf?: string[];
  /** التحقق من جميع الصلاحيات */
  allOf?: string[];
  /** المحتوى المعروض عند عدم وجود الصلاحية */
  fallback?: ReactNode;
  /** المحتوى الرئيسي */
  children: ReactNode;
  /** عرض حالة التحميل */
  showLoading?: boolean;
  /** مكون التحميل المخصص */
  loadingComponent?: ReactNode;
}

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
  showLoading = false,
  loadingComponent,
}: PermissionGateProps): React.ReactElement | null {
  const { can, canAny, canAll, loading, isSuperAdmin } = usePermissions();

  // حالة التحميل
  if (loading && showLoading) {
    return <>{loadingComponent || <span className="animate-pulse">...</span>}</>;
  }

  // Super Admin يتخطى جميع الفحوصات
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // التحقق من الصلاحيات
  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasAccess = canAny(anyOf);
  } else if (allOf && allOf.length > 0) {
    hasAccess = canAll(allOf);
  } else {
    // لا توجد صلاحيات محددة = سماح بالعرض
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * HOC للتحكم في صلاحيات المكونات
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string,
  fallback?: ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate permission={permission} fallback={fallback}>
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}

export default PermissionGate;
