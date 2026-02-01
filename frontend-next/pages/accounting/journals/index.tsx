/**
 * 📘 JOURNAL ENTRIES LIST PAGE
 * =====================================================
 * Reference Implementation - List screen template
 * 
 * 🔒 Route Protection: accounting:journals:view
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissions } from '@/hooks/usePermissions';
import {
  PermissionButton,
  PermissionCard,
  PermissionGate,
} from '@/components/permission';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/apiClient';
import { withPermission } from '@/utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';

interface JournalEntry {
  id: number;
  document_no: string;
  journal_date: string;
  reference_no?: string;
  description: string;
  status: 'draft' | 'posted' | 'reversed';
  total_debit: number;
  total_credit: number;
  created_at: string;
}

function JournalsListPage() {
  const router = useRouter();
  const { locale, dir } = useLocale();
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { showToast } = useToast();
  
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });
  
  useEffect(() => {
    loadJournals();
  }, [pagination.page, filter]);
  
  const loadJournals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        ...(filter.status && { status: filter.status }),
        ...(filter.dateFrom && { date_from: filter.dateFrom }),
        ...(filter.dateTo && { date_to: filter.dateTo }),
        ...(filter.search && { search: filter.search }),
      });
      
      const response = await apiClient.get(`/api/journals?${params}`);
      setJournals(response.data.data || response.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || response.data.length,
      }));
    } catch (error) {
      showToast(t('error.general'), 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = async () => {
    try {
      // Use fetch for blob response type (apiClient doesn't support responseType)
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/journals/export', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `journals_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast(t('success.exported'), 'success');
    } catch (error) {
      showToast(t('error.general'), 'error');
    }
  };
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800',
      posted: 'bg-green-100 text-green-800',
      reversed: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {t(`fields.${status}`)}
      </span>
    );
  };
  
  return (
    <div className="p-6" dir={dir}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('accounting.journal.title')}
          </h1>
          <p className="text-gray-500">
            {t('accounting.journal.description')}
          </p>
        </div>
        
        <div className="flex gap-3">
          {/* Export Button */}
          <PermissionButton
            permission="accounting.journal.export"
            variant="ghost"
            onClick={handleExport}
          >
            📥 {t('actions.export')}
          </PermissionButton>
          
          {/* Create Button */}
          <PermissionButton
            permission="accounting.journal.create"
            variant="primary"
            onClick={() => router.push('/accounting/journals/new')}
          >
            ➕ {t('actions.create')}
          </PermissionButton>
        </div>
      </div>
      
      {/* Filters */}
      <PermissionCard
        permission="accounting.journal.view"
        variant="bordered"
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              value={filter.search}
              onChange={e => setFilter({ ...filter, search: e.target.value })}
              placeholder={`${t('actions.search')}...`}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Status */}
          <select
            value={filter.status}
            onChange={e => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('fields.status')} - {t('actions.selectAll')}</option>
            <option value="draft">{t('fields.draft')}</option>
            <option value="posted">{t('fields.posted')}</option>
            <option value="reversed">{t('fields.reversed')}</option>
          </select>
          
          {/* Date From */}
          <input
            type="date"
            value={filter.dateFrom}
            onChange={e => setFilter({ ...filter, dateFrom: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Date To */}
          <input
            type="date"
            value={filter.dateTo}
            onChange={e => setFilter({ ...filter, dateTo: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </PermissionCard>
      
      {/* Table */}
      <PermissionCard
        permission="accounting.journal.view"
        variant="bordered"
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin text-4xl">⏳</div>
          </div>
        ) : journals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📭</div>
            {t('empty.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-600">
                    {t('fields.documentNo')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-600">
                    {t('fields.date')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-600">
                    {t('fields.description')}
                  </th>
                  <th className="px-4 py-3 text-end text-sm font-medium text-gray-600">
                    {t('fields.debit')}
                  </th>
                  <th className="px-4 py-3 text-end text-sm font-medium text-gray-600">
                    {t('fields.credit')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t('fields.status')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t('actions.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {journals.map(journal => (
                  <tr 
                    key={journal.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/accounting/journals/${journal.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {journal.document_no}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(journal.journal_date).toLocaleDateString(
                        locale === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {journal.description || journal.reference_no || '-'}
                    </td>
                    <td className="px-4 py-3 text-end text-gray-900">
                      {journal.total_debit.toLocaleString(
                        locale === 'ar' ? 'ar-SA' : 'en-US',
                        { minimumFractionDigits: 2 }
                      )}
                    </td>
                    <td className="px-4 py-3 text-end text-gray-900">
                      {journal.total_credit.toLocaleString(
                        locale === 'ar' ? 'ar-SA' : 'en-US',
                        { minimumFractionDigits: 2 }
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(journal.status)}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-center gap-2">
                        <PermissionButton
                          permission="accounting.journal.view"
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/accounting/journals/${journal.id}`)}
                        >
                          👁
                        </PermissionButton>
                        
                        {journal.status === 'draft' && (
                          <PermissionButton
                            permission="accounting.journal.edit"
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/accounting/journals/${journal.id}`)}
                          >
                            ✏️
                          </PermissionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500">
              {t('showing')} {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t('of')} {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                {t('actions.previous')}
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page * pagination.limit >= pagination.total}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                {t('actions.next')}
              </button>
            </div>
          </div>
        )}
      </PermissionCard>
    </div>
  );
}

// 🔒 Apply Route Guard - User must have "accounting:journals:view" permission
export default withPermission(
  MenuPermissions.Accounting.Journals.View,
  JournalsListPage
);
