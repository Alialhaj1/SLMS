/**
 * 🔐 PAGE GUARD - حارس الصفحة
 * =====================================================
 * 
 * مكون لحماية الصفحات بالكامل بناءً على الصلاحيات
 * يعرض صفحة "رفض الوصول" إذا لم يكن لدى المستخدم الصلاحية
 * 
 * @example
 * // حماية صفحة كاملة
 * <PageGuard permission="shipments:view">
 *   <ShipmentsContent />
 * </PageGuard>
 * 
 * // أو أي صلاحية من القائمة
 * <PageGuard anyOf={['admin:view', 'users:manage']}>
 *   <AdminContent />
 * </PageGuard>
 */

import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import MainLayout from '../layout/MainLayout';
import Button from '../ui/Button';
import {
  ShieldExclamationIcon,
  HomeIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

export interface PageGuardProps {
  /** الصلاحية المطلوبة */
  permission?: string;
  /** أي صلاحية من القائمة */
  anyOf?: string[];
  /** جميع الصلاحيات مطلوبة */
  allOf?: string[];
  /** المحتوى المحمي */
  children: ReactNode;
  /** استخدام MainLayout */
  useLayout?: boolean;
  /** عنوان الصفحة عند رفض الوصول */
  title?: string;
  /** رسالة مخصصة عند رفض الوصول */
  deniedMessage?: string;
  /** إعادة التوجيه إلى صفحة أخرى */
  redirectTo?: string;
  /** إخفاء زر العودة */
  hideBackButton?: boolean;
  /** إخفاء زر الصفحة الرئيسية */
  hideHomeButton?: boolean;
  /** Only platform users (no tenant_id) can access */
  platformOnly?: boolean;
  /** Only tenant users can access */
  tenantOnly?: boolean;
  /** Required module — tenant must have this module enabled */
  requireModule?: string;
}

export function PageGuard({
  permission,
  anyOf,
  allOf,
  children,
  useLayout = true,
  title,
  deniedMessage,
  redirectTo,
  hideBackButton = false,
  hideHomeButton = false,
  platformOnly = false,
  tenantOnly = false,
  requireModule,
}: PageGuardProps): React.ReactElement {
  const { can, canAny, canAll, isSuperAdmin, loading } = usePermissions();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  // حالة التحميل
  if (loading) {
    const loadingContent = (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );

    return useLayout ? <MainLayout>{loadingContent}</MainLayout> : <>{loadingContent}</>;
  }

  // Super Admin يتخطى جميع الفحوصات
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Platform-only check: tenant users cannot access
  const isPlatformUser = !user?.tenant_id;
  if (platformOnly && !isPlatformUser) {
    const blockedContent = (
      <>
        <Head>
          <title>{t('common.accessDenied')} - SLMS</title>
        </Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md px-4">
            <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
              <ShieldExclamationIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('common.accessDenied')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t('common.platformOnlyPage') || 'This page is only accessible to platform administrators.'}
            </p>
            <Button variant="primary" onClick={() => router.push('/dashboard')} className="flex items-center justify-center gap-2">
              <HomeIcon className="w-5 h-5" />
              {t('menu.dashboard')}
            </Button>
          </div>
        </div>
      </>
    );
    return useLayout ? <MainLayout>{blockedContent}</MainLayout> : <>{blockedContent}</>;
  }

  // Tenant-only check: platform users cannot access
  if (tenantOnly && isPlatformUser) {
    const blockedContent = (
      <>
        <Head>
          <title>{t('common.accessDenied')} - SLMS</title>
        </Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md px-4">
            <div className="mx-auto w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-6">
              <ShieldExclamationIcon className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('common.accessDenied')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t('common.tenantOnlyPage') || 'This page is only accessible to tenant users.'}
            </p>
            <Button variant="primary" onClick={() => router.push('/dashboard')} className="flex items-center justify-center gap-2">
              <HomeIcon className="w-5 h-5" />
              {t('menu.dashboard')}
            </Button>
          </div>
        </div>
      </>
    );
    return useLayout ? <MainLayout>{blockedContent}</MainLayout> : <>{blockedContent}</>;
  }

  // Module check: tenant must have module enabled
  if (requireModule && !isPlatformUser && user?.enabled_modules) {
    const modules = Array.isArray(user.enabled_modules) ? user.enabled_modules : [];
    if (!modules.includes(requireModule)) {
      const blockedContent = (
        <>
          <Head>
            <title>{t('common.accessDenied')} - SLMS</title>
          </Head>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md px-4">
              <div className="mx-auto w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-6">
                <ShieldExclamationIcon className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('common.accessDenied')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                {t('common.moduleNotEnabled') || 'This module is not enabled for your organization.'}
              </p>
              <Button variant="primary" onClick={() => router.push('/dashboard')} className="flex items-center justify-center gap-2">
                <HomeIcon className="w-5 h-5" />
                {t('menu.dashboard')}
              </Button>
            </div>
          </div>
        </>
      );
      return useLayout ? <MainLayout>{blockedContent}</MainLayout> : <>{blockedContent}</>;
    }
  }

  // التحقق من الصلاحيات
  let hasAccess = true;
  if (permission) {
    hasAccess = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasAccess = canAny(anyOf);
  } else if (allOf && allOf.length > 0) {
    hasAccess = canAll(allOf);
  }

  // إعادة التوجيه إذا طُلب
  if (!hasAccess && redirectTo) {
    router.replace(redirectTo);
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // عرض صفحة رفض الوصول
  if (!hasAccess) {
    const accessDeniedContent = (
      <>
        <Head>
          <title>{title || t('common.accessDenied')} - SLMS</title>
        </Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md px-4">
            {/* أيقونة */}
            <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
              <ShieldExclamationIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>

            {/* العنوان */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {title || t('common.accessDenied')}
            </h1>

            {/* الرسالة */}
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {deniedMessage || t('common.noPermissionToAccess')}
            </p>

            {/* الأزرار */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!hideBackButton && (
                <Button
                  variant="secondary"
                  onClick={() => router.back()}
                  className="flex items-center justify-center gap-2"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  {t('common.back')}
                </Button>
              )}
              {!hideHomeButton && (
                <Button
                  variant="primary"
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center justify-center gap-2"
                >
                  <HomeIcon className="w-5 h-5" />
                  {t('menu.dashboard')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </>
    );

    return useLayout ? <MainLayout>{accessDeniedContent}</MainLayout> : <>{accessDeniedContent}</>;
  }

  // المستخدم لديه الصلاحية
  return <>{children}</>;
}

export default PageGuard;
