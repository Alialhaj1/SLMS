/**
 * ============================================================================
 * TENANT DASHBOARD - Redirect to Main Dashboard
 * ============================================================================
 * Legacy route. Redirects to /dashboard which is the unified dashboard
 * for both platform and tenant users.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TenantDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
