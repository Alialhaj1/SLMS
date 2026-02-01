/**
 * 📘 CREATE/EDIT JOURNAL ENTRY PAGE
 * =====================================================
 * Create new or edit existing journal entry
 * Workflow: Draft → Submit → Post
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import MainLayout from '@/components/layout/MainLayout';
import { withPermission } from '@/utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import { useTranslation } from '@/hooks/useTranslation.enhanced';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';
import { apiClient } from '@/lib/apiClient';
import JournalEntryForm from '@/components/accounting/JournalEntryForm';
import {
  ArrowUturnLeftIcon,
  CheckIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface JournalEntry {
  id?: number;
  entry_date: string;
  posting_date?: string;
  reference?: string;
  description?: string;
  status: 'draft' | 'submitted' | 'posted';
  lines: any[];
}

function JournalEntryPage() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { can } = usePermissions();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Load entry if editing
  useEffect(() => {
    if (id && typeof id === 'string') {
      loadEntry();
    }
  }, [id]);

  const loadEntry = async () => {
    try {
      const response = await apiClient.get(`/api/journals/${id}`);
      const data = response.data?.data ?? response.data;
      setEntry(data);

      // Read-only if posted
      if (data.status === 'posted') {
        setIsReadOnly(true);
      }
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
      router.push('/accounting/journals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: JournalEntry) => {
    setSubmitting(true);
    try {
      if (id) {
        // Update existing
        await apiClient.put(`/api/journals/${id}`, formData);
        showToast(t('common.updateSuccess'), 'success');
      } else {
        // Create new
        const response = await apiClient.post('/api/journals', formData);
        setEntry(response.data?.data ?? response.data);
        showToast(t('common.createSuccess'), 'success');
      }
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!entry?.id) return;
    setSubmitting(true);
    try {
      const response = await apiClient.post(`/api/journals/${entry.id}/submit`);
      setEntry(response.data?.data ?? response.data);
      showToast(t('accounting.journals.submittedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!entry?.id || !can(MenuPermissions.Accounting.Journals.Post)) return;

    if (!confirm(t('accounting.journals.confirmPost'))) return;

    setSubmitting(true);
    try {
      const response = await apiClient.post(`/api/journals/${entry.id}/post`);
      setEntry(response.data?.data ?? response.data);
      setIsReadOnly(true);
      showToast(t('accounting.journals.postedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverse = async () => {
    if (!entry?.id || !can(MenuPermissions.Accounting.Journals.Reverse)) return;

    if (!confirm(t('accounting.journals.confirmReverse'))) return;

    setSubmitting(true);
    try {
      const response = await apiClient.post(`/api/journals/${entry.id}/reverse`);
      showToast(t('accounting.journals.reversalCreated'), 'success');
      router.push(`/accounting/journals/${response.data?.data?.id ?? response.data?.id}`);
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">{t('common.loading')}...</div>
          </div>
        </MainLayout>
      </AuthGuard>
    );
  }

  const title = id
    ? t('accounting.journals.editEntry')
    : t('accounting.journals.newEntry');

  return (
    <AuthGuard>
      <MainLayout>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>

            {entry && (
              <div className="flex gap-2">
                {/* Reverse Button (only for posted) */}
                {entry.status === 'posted' &&
                  can(MenuPermissions.Accounting.Journals.Reverse) && (
                    <button
                      onClick={handleReverse}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 dark:border-orange-700 rounded-lg text-sm font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50"
                    >
                      <ArrowUturnLeftIcon className="w-4 h-4" />
                      {t('accounting.journals.reverse')}
                    </button>
                  )}

                {/* Post Button (only for submitted) */}
                {entry.status === 'submitted' &&
                  can(MenuPermissions.Accounting.Journals.Post) && (
                    <button
                      onClick={handlePost}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50"
                    >
                      <CheckIcon className="w-4 h-4" />
                      {t('accounting.journals.post')}
                    </button>
                  )}

                {/* Submit Button (only for draft) */}
                {entry.status === 'draft' &&
                  can(MenuPermissions.Accounting.Journals.Create) && (
                    <button
                      onClick={handleSubmitForApproval}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
                    >
                      <CheckIcon className="w-4 h-4" />
                      {t('accounting.journals.submit')}
                    </button>
                  )}

                {/* Print Button */}
                {entry && (
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    {t('common.print')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <JournalEntryForm
          initialData={entry || undefined}
          onSubmit={handleSubmit}
          isLoading={submitting}
          isReadOnly={isReadOnly}
        />
      </MainLayout>
    </AuthGuard>
  );
}

export default withPermission(MenuPermissions.Accounting.Journals.Create, JournalEntryPage);
