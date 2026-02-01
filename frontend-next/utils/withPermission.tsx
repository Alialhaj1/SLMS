/**
 * 🔒 WITH PERMISSION - Route Guard HOC
 * =====================================================
 * 
 * Higher-Order Component لحماية الصفحات على مستوى الـ Route
 * 
 * الغرض:
 * ✅ منع الوصول للصفحة أصلاً بدون permission
 * ✅ إعادة توجيه تلقائية للـ 403
 * ✅ Loading state أثناء التحقق
 * 
 * @example
 * // في الصفحة
 * export default withPermission(
 *   MenuPermissions.Accounting.Journals.View,
 *   JournalsPage
 * );
 * 
 * @see GOLDEN_RULES.md - Rule 1
 */

import { useEffect, ComponentType } from 'react';
import { useRouter } from 'next/router';
import { usePermissions } from '../hooks/usePermissions';
import { useTranslation } from '../hooks/useTranslation';
import { Permission } from '../types/permissions';

/**
 * Loading Screen أثناء التحقق من الصلاحيات
 */
function PermissionCheckingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">جاري التحقق من الصلاحيات...</p>
      </div>
    </div>
  );
}

/**
 * HOC للحماية بالصلاحيات
 * 
 * @param permission - الصلاحية المطلوبة
 * @param Component - المكون المراد حمايته
 * @returns مكون محمي بالصلاحية
 */
export function withPermission<P extends object>(
  permission: Permission,
  Component: ComponentType<P>
): ComponentType<P> {
  const PermissionGuard = (props: P) => {
    const router = useRouter();
    const { can, loading: permissionsLoading } = usePermissions();
    const { t } = useTranslation();

    const hasPermission = can(permission);

    useEffect(() => {
      // انتظر تحميل الصلاحيات
      if (permissionsLoading) return;

      // إذا لم يكن لديه صلاحية، اذهب لـ 403
      if (!hasPermission) {
        console.warn(`[Route Guard] Access denied to ${router.pathname} - Missing permission: ${permission}`);
        router.replace('/403');
      }
    }, [hasPermission, permissionsLoading, router]);

    // Loading state
    if (permissionsLoading) {
      return <PermissionCheckingScreen />;
    }

    // No permission - show nothing (سيتم التوجيه لـ 403)
    if (!hasPermission) {
      return <PermissionCheckingScreen />;
    }

    // Has permission - render component
    return <Component {...props} />;
  };

  // احتفظ بالـ display name للتطوير
  const componentName = Component.displayName || Component.name || 'Component';
  PermissionGuard.displayName = `withPermission(${permission})(${componentName})`;

  return PermissionGuard;
}

/**
 * نسخة مع permissions متعددة (أي واحدة منها)
 * 
 * @example
 * export default withAnyPermission(
 *   [MenuPermissions.Accounting.Journals.View, MenuPermissions.Accounting.Journals.Create],
 *   JournalsPage
 * );
 */
export function withAnyPermission<P extends object>(
  permissions: Permission[],
  Component: ComponentType<P>
): ComponentType<P> {
  const PermissionGuard = (props: P) => {
    const router = useRouter();
    const { canAny, loading: permissionsLoading } = usePermissions();

    const hasAnyPermission = canAny(permissions);

    useEffect(() => {
      if (permissionsLoading) return;

      if (!hasAnyPermission) {
        console.warn(`[Route Guard] Access denied to ${router.pathname} - Missing any of: ${permissions.join(', ')}`);
        router.replace('/403');
      }
    }, [hasAnyPermission, permissionsLoading, router]);

    if (permissionsLoading) {
      return <PermissionCheckingScreen />;
    }

    if (!hasAnyPermission) {
      return <PermissionCheckingScreen />;
    }

    return <Component {...props} />;
  };

  const componentName = Component.displayName || Component.name || 'Component';
  PermissionGuard.displayName = `withAnyPermission(${permissions.join('|')})(${componentName})`;

  return PermissionGuard;
}

/**
 * نسخة مع permissions متعددة (كلها مطلوبة)
 * 
 * @example
 * export default withAllPermissions(
 *   [MenuPermissions.Accounting.Journals.View, MenuPermissions.Accounting.Journals.Edit],
 *   JournalEditPage
 * );
 */
export function withAllPermissions<P extends object>(
  permissions: Permission[],
  Component: ComponentType<P>
): ComponentType<P> {
  const PermissionGuard = (props: P) => {
    const router = useRouter();
    const { canAll, loading: permissionsLoading } = usePermissions();

    const hasAllPermissions = canAll(permissions);

    useEffect(() => {
      if (permissionsLoading) return;

      if (!hasAllPermissions) {
        console.warn(`[Route Guard] Access denied to ${router.pathname} - Missing all of: ${permissions.join(', ')}`);
        router.replace('/403');
      }
    }, [hasAllPermissions, permissionsLoading, router]);

    if (permissionsLoading) {
      return <PermissionCheckingScreen />;
    }

    if (!hasAllPermissions) {
      return <PermissionCheckingScreen />;
    }

    return <Component {...props} />;
  };

  const componentName = Component.displayName || Component.name || 'Component';
  PermissionGuard.displayName = `withAllPermissions(${permissions.join('&')})(${componentName})`;

  return PermissionGuard;
}

export default withPermission;
