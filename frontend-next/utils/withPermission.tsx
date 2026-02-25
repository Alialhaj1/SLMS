/**
 * 🔒 WITH PERMISSION - Route Guard HOC
 * =====================================================
 * 
 * Higher-Order Component لحماية الصفحات على مستوى الـ Route
 * 
 * الغرض:
 * ✅ منع الوصول للصفحة أصلاً بدون permission
 * ✅ إعادة توجيه للـ login إذا لم يكن مسجل دخول
 * ✅ إعادة توجيه للـ 403 إذا كان مسجل دخول بدون صلاحية
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
import { useAuth } from '../hooks/useAuth';
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
    const { user, loading: authLoading, isAuthenticated, profileReady } = useAuth();
    const { can, loading: permissionsLoading } = usePermissions();
    const { t } = useTranslation();

    // Wait for both auth loading AND the fresh profile from API
    // This prevents redirects based on stale cached user data
    const isLoading = authLoading || permissionsLoading || !profileReady;
    const hasPermission = can(permission);

    useEffect(() => {
      // انتظر تحميل البيانات
      if (isLoading) return;

      // إذا لم يكن مسجل دخول، اذهب لصفحة تسجيل الدخول
      if (!isAuthenticated || !user) {
        console.warn(`[Route Guard] Not authenticated - redirecting to login from ${router.pathname}`);
        router.replace('/');
        return;
      }

      // إذا لم يكن لديه صلاحية، اذهب لـ 403
      if (!hasPermission) {
        console.warn(`[Route Guard] Access denied to ${router.pathname} - Missing permission: ${permission}`);
        router.replace('/403');
      }
    }, [isAuthenticated, user, hasPermission, isLoading, router]);

    // Loading state
    if (isLoading) {
      return <PermissionCheckingScreen />;
    }

    // Not authenticated - show loading (سيتم التوجيه لـ login)
    if (!isAuthenticated || !user) {
      return <PermissionCheckingScreen />;
    }

    // No permission - show loading (سيتم التوجيه لـ 403)
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
    const { user, loading: authLoading, isAuthenticated, profileReady } = useAuth();
    const { canAny, loading: permissionsLoading } = usePermissions();

    const isLoading = authLoading || permissionsLoading || !profileReady;
    const hasAnyPermission = canAny(permissions);

    useEffect(() => {
      if (isLoading) return;

      // إذا لم يكن مسجل دخول، اذهب لصفحة تسجيل الدخول
      if (!isAuthenticated || !user) {
        console.warn(`[Route Guard] Not authenticated - redirecting to login from ${router.pathname}`);
        router.replace('/');
        return;
      }

      if (!hasAnyPermission) {
        console.warn(`[Route Guard] Access denied to ${router.pathname} - Missing any of: ${permissions.join(', ')}`);
        router.replace('/403');
      }
    }, [isAuthenticated, user, hasAnyPermission, isLoading, router]);

    if (isLoading) {
      return <PermissionCheckingScreen />;
    }

    if (!isAuthenticated || !user) {
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
    const { user, loading: authLoading, isAuthenticated, profileReady } = useAuth();
    const { canAll, loading: permissionsLoading } = usePermissions();

    const isLoading = authLoading || permissionsLoading || !profileReady;
    const hasAllPermissions = canAll(permissions);

    useEffect(() => {
      if (isLoading) return;

      // إذا لم يكن مسجل دخول، اذهب لصفحة تسجيل الدخول
      if (!isAuthenticated || !user) {
        console.warn(`[Route Guard] Not authenticated - redirecting to login from ${router.pathname}`);
        router.replace('/');
        return;
      }

      if (!hasAllPermissions) {
        console.warn(`[Route Guard] Access denied to ${router.pathname} - Missing all of: ${permissions.join(', ')}`);
        router.replace('/403');
      }
    }, [isAuthenticated, user, hasAllPermissions, isLoading, router]);

    if (isLoading) {
      return <PermissionCheckingScreen />;
    }

    if (!isAuthenticated || !user) {
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
