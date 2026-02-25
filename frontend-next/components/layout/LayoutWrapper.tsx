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

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const router = useRouter();
  const { userContext } = useAuthorization();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => router.pathname === route);

  // Handle redirect in useEffect to avoid render-phase navigation errors
  useEffect(() => {
    if (!isPublicRoute && userContext === null && router.pathname !== '/') {
      router.replace('/').catch(() => {});
    }
  }, [userContext, isPublicRoute, router.pathname]);

  // Public routes - render directly without layout
  if (isPublicRoute || router.pathname === '/') {
    return <>{children}</>;
  }

  // Authenticated routes - wrap in MainLayout
  return <MainLayout>{children}</MainLayout>;
}
