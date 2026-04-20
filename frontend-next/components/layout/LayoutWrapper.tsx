/**
 * LayoutWrapper Component
 * Wraps all pages with MainLayout for authenticated routes
 * or renders bare content for public routes (login, register, etc.)
 */

import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuthorization } from '../../contexts/AuthorizationContext';
import MainLayout from './MainLayout';

const PUBLIC_ROUTES = [
  '/login',
  '/auth/login',
  '/admin',
  '/register',
  '/auth/register',
  '/forgot-password',
  '/auth/forgot-password',
  '/reset-password',
  '/auth/reset-password',
  '/verify-email',
  '/auth/verify-email',
  '/_error',
  '/404',
  '/500',
];

// Store routes use their own layout (StoreLayout) — bypass ERP wrapper
const isStoreRoute = (path: string) => path.startsWith('/store/');

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const router = useRouter();
  const { userContext } = useAuthorization();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => router.pathname === route) || isStoreRoute(router.pathname);
  const isAdminRoute = router.pathname.startsWith('/admin');

  // Handle redirect in useEffect to avoid render-phase navigation errors
  useEffect(() => {
    // Skip redirect for public routes, root page, and admin sub-routes
    // (admin sub-routes handle their own auth checks)
    if (isPublicRoute || router.pathname === '/' || isAdminRoute) return;

    // Only redirect if no user context AND no token in storage (avoids race condition after login)
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
    if (userContext === null && !hasToken) {
      router.replace('/').catch(() => {});
    }
  }, [userContext, isPublicRoute, isAdminRoute, router.pathname]);

  // All routes render children directly.
  // Individual pages already wrap themselves in <MainLayout> where needed,
  // so wrapping again here would cause a double header/sidebar.
  return <>{children}</>;
}
