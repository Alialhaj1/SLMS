/**
 * 📘 JOURNAL ENTRY PAGE
 * =====================================================
 * Reference Implementation - Template for all screens
 * 
 * Demonstrates:
 * - Permission-aware components
 * - Full i18n coverage
 * - Backend as Single Source of Truth
 * - Proper CRUD operations
 * - Post/Reverse workflow
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissions } from '@/hooks/usePermissions';
import { withPermission } from '@/utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import {
  PermissionButton,
  PermissionCard,
  PermissionGate,
  PermissionSection,
} from '@/components/permission';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/apiClient';

// Types
interface JournalLine {
  id?: number;
  line_no: number;
  account_id: number;
  account_code?: string;
  account_name?: string;
  description: string;
  debit: number;
  credit: number;
  cost_center_id?: number;
}

interface JournalEntry {
  id?: number;
  document_no: string;
  journal_date: string;
  reference_no?: string;
  description: string;
  status: 'draft' | 'posted' | 'reversed';
  total_debit: number;
  total_credit: number;
  lines: JournalLine[];
  created_at?: string;
  posted_at?: string;
  posted_by?: string;
}

// Empty journal template
const emptyJournal: JournalEntry = {
  document_no: '',
  journal_date: new Date().toISOString().split('T')[0],
  reference_no: '',
  description: '',
  status: 'draft',
  total_debit: 0,
  total_credit: 0,
  lines: [
    { line_no: 1, account_id: 0, description: '', debit: 0, credit: 0 },
    { line_no: 2, account_id: 0, description: '', debit: 0, credit: 0 },
  ],
};

function JournalEntryPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale, dir } = useLocale();
  const { t } = useTranslation();
  const { can, isSuperAdmin, isDangerous } = usePermissions();
  const { showToast } = useToast();
  
  // State
  const [journal, setJournal] = useState<JournalEntry>(emptyJournal);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  
  const isNew = !id || id === 'new';
  const isPosted = journal.status === 'posted';
  const isReversed = journal.status === 'reversed';
  const canEdit = !isPosted && !isReversed && can('accounting.journal.edit');
  
  // Load journal entry
  useEffect(() => {
    if (!isNew && id) {
      loadJournal(id as string);
    }
    loadAccounts();
    loadCostCenters();
  }, [id]);
  
  const loadJournal = async (journalId: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/journals/${journalId}`);
      setJournal(response.data);
    } catch (error: any) {
      showToast(t('error.notFound'), 'error');
      router.push('/accounting/journals');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAccounts = async () => {
    try {
      const response = await apiClient.get('/api/accounts?is_parent=false');
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts');
    }
  };
  
  const loadCostCenters = async () => {
    try {
      const response = await apiClient.get('/api/cost-centers');
      setCostCenters(response.data);
    } catch (error) {
      console.error('Failed to load cost centers');
    }
  };
  
  // Calculate totals
  const calculateTotals = useCallback(() => {
    const totalDebit = journal.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = journal.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    return { totalDebit, totalCredit, isBalanced: totalDebit === totalCredit };
  }, [journal.lines]);
  
  const { totalDebit, totalCredit, isBalanced } = calculateTotals();
  
  // Update line
  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    setJournal(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      ),
    }));
  };
  
  // Add line
  const addLine = () => {
    setJournal(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        { 
          line_no: prev.lines.length + 1, 
          account_id: 0, 
          description: '', 
          debit: 0, 
          credit: 0 
        },
      ],
    }));
  };
  
  // Remove line
  const removeLine = (index: number) => {
    if (journal.lines.length <= 2) {
      showToast(t('error.minTwoLines'), 'warning');
      return;
    }
    setJournal(prev => ({
      ...prev,
      lines: prev.lines
        .filter((_, i) => i !== index)
        .map((line, i) => ({ ...line, line_no: i + 1 })),
    }));
  };
  
  // Save journal
  const handleSave = async () => {
    // Validation
    if (!isBalanced) {
      showToast(t('error.balanceNotZero'), 'error');
      return;
    }
    
    if (journal.lines.some(l => !l.account_id)) {
      showToast(t('error.accountRequired'), 'error');
      return;
    }
    
    setSaving(true);
    try {
      if (isNew) {
        const response = await apiClient.post('/api/journals', {
          ...journal,
          total_debit: totalDebit,
          total_credit: totalCredit,
        });
        showToast(t('success.created'), 'success');
        router.push(`/accounting/journals/${response.data.id}`);
      } else {
        await apiClient.put(`/api/journals/${id}`, {
          ...journal,
          total_debit: totalDebit,
          total_credit: totalCredit,
        });
        showToast(t('success.saved'), 'success');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || t('error.general'), 'error');
    } finally {
      setSaving(false);
    }
  };
  
  // Post journal
  const handlePost = async () => {
    if (!isBalanced) {
      showToast(t('error.balanceNotZero'), 'error');
      return;
    }
    
    // Dangerous action confirmation
    if (!window.confirm(t('confirm.post'))) {
      return;
    }
    
    setSaving(true);
    try {
      await apiClient.post(`/api/journals/${id}/post`);
      showToast(t('success.posted'), 'success');
      loadJournal(id as string);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('error.general'), 'error');
    } finally {
      setSaving(false);
    }
  };
  
  // Reverse journal
  const handleReverse = async () => {
    if (!window.confirm(t('confirm.reverse'))) {
      return;
    }
    
    setSaving(true);
    try {
      const response = await apiClient.post(`/api/journals/${id}/reverse`);
      showToast(t('success.reversed'), 'success');
      // Navigate to the reversal entry
      router.push(`/accounting/journals/${response.data.reversal_id}`);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('error.general'), 'error');
    } finally {
      setSaving(false);
    }
  };
  
  // Delete journal
  const handleDelete = async () => {
    if (!window.confirm(t('confirm.delete'))) {
      return;
    }
    
    try {
      await apiClient.delete(`/api/journals/${id}`);
      showToast(t('success.deleted'), 'success');
      router.push('/accounting/journals');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('error.general'), 'error');
    }
  };
  
  // Print journal
  const handlePrint = () => {
    window.print();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin text-4xl">⏳</div>
        <span className="ml-2">{t('loading.data')}</span>
      </div>
    );
  }
  
  return (
    <div className="p-6" dir={dir}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? t('accounting.journal.new') : t('accounting.journal.title')}
          </h1>
          {!isNew && (
            <p className="text-gray-500">
              {t('fields.documentNo')}: {journal.document_no}
            </p>
          )}
        </div>
        
        {/* Status Badge */}
        {!isNew && (
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            journal.status === 'posted' ? 'bg-green-100 text-green-800' :
            journal.status === 'reversed' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {t(`fields.${journal.status}`)}
          </div>
        )}
      </div>
      
      {/* Main Form */}
      <PermissionCard 
        permission="accounting.journal.view"
        title="accounting.journal.details"
        variant="bordered"
      >
        {/* Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Journal Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.date')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={journal.journal_date}
              onChange={e => setJournal({ ...journal, journal_date: e.target.value })}
              disabled={!canEdit}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          
          {/* Reference No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.referenceNo')}
            </label>
            <input
              type="text"
              value={journal.reference_no || ''}
              onChange={e => setJournal({ ...journal, reference_no: e.target.value })}
              disabled={!canEdit}
              placeholder={t('fields.referenceNo')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.description')}
            </label>
            <input
              type="text"
              value={journal.description}
              onChange={e => setJournal({ ...journal, description: e.target.value })}
              disabled={!canEdit}
              placeholder={t('fields.description')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
        
        {/* Journal Lines */}
        <PermissionSection 
          permission="accounting.journal.lines.view"
          title="accounting.journal.lines"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-start border">#</th>
                  <th className="px-3 py-2 text-start border">{t('fields.account')}</th>
                  <th className="px-3 py-2 text-start border">{t('fields.description')}</th>
                  
                  {/* Cost Center - Only if user can view */}
                  <PermissionGate permission="accounting.journal.lines.costCenter.view">
                    <th className="px-3 py-2 text-start border">{t('fields.costCenter')}</th>
                  </PermissionGate>
                  
                  <th className="px-3 py-2 text-end border">{t('fields.debit')}</th>
                  <th className="px-3 py-2 text-end border">{t('fields.credit')}</th>
                  
                  {canEdit && (
                    <th className="px-3 py-2 border w-16"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {journal.lines.map((line, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border text-gray-500">{line.line_no}</td>
                    
                    {/* Account */}
                    <td className="px-3 py-2 border">
                      <select
                        value={line.account_id}
                        onChange={e => updateLine(index, 'account_id', Number(e.target.value))}
                        disabled={!canEdit || !can('accounting.journal.lines.account.edit')}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        <option value={0}>{t('actions.select')}</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {locale === 'ar' ? acc.name_ar : acc.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    
                    {/* Description */}
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={line.description}
                        onChange={e => updateLine(index, 'description', e.target.value)}
                        disabled={!canEdit}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </td>
                    
                    {/* Cost Center */}
                    <PermissionGate permission="accounting.journal.lines.costCenter.view">
                      <td className="px-3 py-2 border">
                        <select
                          value={line.cost_center_id || ''}
                          onChange={e => updateLine(index, 'cost_center_id', e.target.value ? Number(e.target.value) : null)}
                          disabled={!canEdit || !can('accounting.journal.lines.costCenter.edit')}
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                          <option value="">{t('actions.select')}</option>
                          {costCenters.map(cc => (
                            <option key={cc.id} value={cc.id}>
                              {locale === 'ar' ? cc.name_ar : cc.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </PermissionGate>
                    
                    {/* Debit */}
                    <td className="px-3 py-2 border">
                      <input
                        type="number"
                        value={line.debit || ''}
                        onChange={e => {
                          const value = parseFloat(e.target.value) || 0;
                          updateLine(index, 'debit', value);
                          if (value > 0) updateLine(index, 'credit', 0);
                        }}
                        disabled={!canEdit || !can('accounting.journal.lines.amount.edit')}
                        className="w-full px-2 py-1 border rounded text-end focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    
                    {/* Credit */}
                    <td className="px-3 py-2 border">
                      <input
                        type="number"
                        value={line.credit || ''}
                        onChange={e => {
                          const value = parseFloat(e.target.value) || 0;
                          updateLine(index, 'credit', value);
                          if (value > 0) updateLine(index, 'debit', 0);
                        }}
                        disabled={!canEdit || !can('accounting.journal.lines.amount.edit')}
                        className="w-full px-2 py-1 border rounded text-end focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    
                    {/* Actions */}
                    {canEdit && (
                      <td className="px-3 py-2 border text-center">
                        <PermissionButton
                          permission="accounting.journal.lines.delete"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(index)}
                          confirmDangerous={false}
                        >
                          🗑
                        </PermissionButton>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              
              {/* Totals Row */}
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={can('accounting.journal.lines.costCenter.view') ? 4 : 3} className="px-3 py-2 border text-end">
                    {t('fields.total')}
                  </td>
                  <td className={`px-3 py-2 border text-end ${!isBalanced ? 'text-red-600' : ''}`}>
                    {totalDebit.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-3 py-2 border text-end ${!isBalanced ? 'text-red-600' : ''}`}>
                    {totalCredit.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}
                  </td>
                  {canEdit && <td className="border"></td>}
                </tr>
                
                {/* Balance Warning */}
                {!isBalanced && (
                  <tr>
                    <td colSpan={can('accounting.journal.lines.costCenter.view') ? 7 : 6} className="px-3 py-2 bg-red-50 text-red-600 text-center">
                      ⚠️ {t('error.balanceNotZero')} ({t('fields.debit')}: {totalDebit}, {t('fields.credit')}: {totalCredit})
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
          
          {/* Add Line Button */}
          {canEdit && (
            <div className="mt-4">
              <PermissionButton
                permission="accounting.journal.lines.add"
                variant="ghost"
                onClick={addLine}
              >
                ➕ {t('actions.add')} {t('fields.line')}
              </PermissionButton>
            </div>
          )}
        </PermissionSection>
      </PermissionCard>
      
      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <div>
          {/* Back Button */}
          <button
            onClick={() => router.push('/accounting/journals')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← {t('actions.back')}
          </button>
        </div>
        
        <div className="flex gap-3">
          {/* Delete Button - Draft only */}
          {!isNew && journal.status === 'draft' && (
            <PermissionButton
              permission="accounting.journal.delete"
              variant="danger"
              onClick={handleDelete}
            >
              🗑 {t('actions.delete')}
            </PermissionButton>
          )}
          
          {/* Print Button */}
          {!isNew && (
            <PermissionButton
              permission="accounting.journal.print"
              variant="ghost"
              onClick={handlePrint}
            >
              🖨 {t('actions.print')}
            </PermissionButton>
          )}
          
          {/* Reverse Button - Posted only */}
          {isPosted && (
            <PermissionButton
              permission="accounting.journal.reverse"
              variant="secondary"
              onClick={handleReverse}
              loading={saving}
            >
              ↩️ {t('actions.reverse')}
            </PermissionButton>
          )}
          
          {/* Post Button - Draft only */}
          {!isNew && journal.status === 'draft' && (
            <PermissionButton
              permission="accounting.journal.post"
              variant="primary"
              onClick={handlePost}
              loading={saving}
              disabled={!isBalanced}
            >
              ✓ {t('actions.post')}
            </PermissionButton>
          )}
          
          {/* Save Button - Draft/New only */}
          {canEdit && (
            <PermissionButton
              permission={isNew ? 'accounting.journal.create' : 'accounting.journal.edit'}
              variant="primary"
              onClick={handleSave}
              loading={saving}
            >
              💾 {t('actions.save')}
            </PermissionButton>
          )}
        </div>
      </div>
      
      {/* Audit Info */}
      {!isNew && (
        <PermissionSection 
          permission="system.auditLogs.view"
          title="system.auditLogs"
          className="mt-6"
          collapsible
          defaultExpanded={false}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">{t('fields.createdAt')}:</span>
              <br />
              {journal.created_at ? new Date(journal.created_at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US') : '-'}
            </div>
            {journal.posted_at && (
              <div>
                <span className="font-medium">{t('actions.post')}:</span>
                <br />
                {new Date(journal.posted_at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
              </div>
            )}
            {journal.posted_by && (
              <div>
                <span className="font-medium">{t('fields.createdBy')}:</span>
                <br />
                {journal.posted_by}
              </div>
            )}
          </div>
        </PermissionSection>
      )}
    </div>
  );
}
export default JournalEntryPage;