/**
 * Chart of Accounts – Redirect to unified page
 * This page redirects to /accounting/accounts which is the primary COA management screen.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';

export default function ChartOfAccounts() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/accounting/accounts');
  }, [router]);

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p>Redirecting to Chart of Accounts...</p>
        </div>
      </div>
    </MainLayout>
  );
}