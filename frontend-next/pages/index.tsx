/**
 * Home/Landing Page
 * Redirects based on user type:
 * - Platform users → /admin/platform
 * - Tenant users → /tenant/dashboard
 * - Not authenticated → /auth/login
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && user) {
      // Use login_context if available, otherwise fall back to tenant_id check
      const context = (user as any).login_context;
      if (context === 'tenant' || user.tenant_id) {
        router.replace('/tenant/dashboard');
      } else {
        router.replace('/admin/platform');
      }
    } else {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, user, router]);

  // Show loading while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
