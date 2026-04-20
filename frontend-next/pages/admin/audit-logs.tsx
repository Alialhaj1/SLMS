/**
 * ============================================================================
 * Audit Logs Page - سجل المراجعة  
 * Redirects to the enhanced platform audit logs page.
 * The main audit logs implementation is at /admin/platform/audit-logs.
 * ============================================================================
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useLocale } from '../../contexts/LocaleContext';

export default function AuditLogsPage() {
  const router = useRouter();
  const { locale } = useLocale();

  useEffect(() => {
    router.replace('/admin/platform/audit-logs');
  }, [router]);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'سجل المراجعة' : 'Audit Logs'} - SLMS</title>
      </Head>
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    </MainLayout>
  );
}
