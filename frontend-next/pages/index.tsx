/**
 * ============================================================================
 * ROOT INDEX PAGE - Smart Routing Based on Specification
 * ============================================================================
 * Implements the dual-flow routing as per specification:
 * - Platform users → /admin/platform
 * - Tenant users → /dashboard  
 * - Not authenticated → /auth/login (tenant portal)
 * 
 * This enforces the separation where:
 * - Platform admins use /admin for login
 * - Tenant users use /auth/login (company-first flow)
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const canViewDashboard = Array.isArray(user?.permissions)
    ? (user.permissions.includes('*:*') || user.permissions.includes('*.*') || user.permissions.includes('dashboard:view'))
    : false;

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && user) {
      if (user.must_change_password) {
        router.replace('/auth/change-password');
        return;
      }

      // Determine user context and redirect accordingly
      const isPlatformUser = !user.tenant_id && (
        user.roles?.includes('super_admin') || 
        user.roles?.includes('platform_admin') ||
        (user as any).is_platform_admin ||
        (user as any).login_context === 'platform'
      );
      
      if (isPlatformUser) {
        // Platform users → Admin dashboard
        router.replace('/admin/platform');
      } else if (user.tenant_id) {
        // Tenant users → Main dashboard
        router.replace(canViewDashboard ? '/dashboard' : '/profile');
      } else {
        // Unclear context - logout and redirect to tenant login
        console.warn('User has unclear context, redirecting to login');
        router.replace('/auth/login');
      }
    } else {
      // Not authenticated → Tenant login portal (per specification)
      // Platform admins should use /admin directly
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, user, router, canViewDashboard]);

  // Show loading while determining route
  return (
    <>
      <Head>
        <title>{isRTL ? 'نظام إدارة اللوجستيات الذكي' : 'Smart Logistics Management System'}</title>
        <meta name="description" content={isRTL ? 'نظام إدارة اللوجستيات الذكي - SLMS' : 'Smart Logistics Management System - SLMS'} />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isRTL ? 'نظام إدارة اللوجستيات الذكي' : 'Smart Logistics Management System'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {isRTL ? 'جاري تحميل النظام...' : 'Loading system...'}
            </p>
          </div>
          
          <LoadingSpinner size="lg" className="mx-auto mb-6" />
          
          {/* Helpful navigation hints */}
          <div className="text-left space-y-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{isRTL ? 'مستخدمو الشركات ← /auth/login' : 'Company Users ← /auth/login'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>{isRTL ? 'مديرو المنصة ← /admin' : 'Platform Admins ← /admin'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
