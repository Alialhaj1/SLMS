/**
 * 📘 JOURNAL ENTRY FORM - نموذج إدخال القيود
 * =====================================================
 * معقد:
 * ✅ Line items مع Debit/Credit
 * ✅ Validation في الوقت الفعلي
 * ✅ Balance checker
 * ✅ Account selection من COA
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '@/hooks/useTranslation.enhanced';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/contexts/ToastContext';

interface JournalLine {
  id?: number;
  account_id: number;
  account_code?: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  cost_center_id?: number;
  project_id?: number;
}

interface JournalEntry {
  id?: number;
  entry_date: string;
  posting_date?: string;
  reference?: string;
  description?: string;
  status: 'draft' | 'submitted' | 'posted';
  lines: JournalLine[];
}

interface Account {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  is_active: boolean;
  is_header?: boolean;
}

interface JournalEntryFormProps {
  initialData?: JournalEntry;
  onSubmit: (data: JournalEntry) => Promise<void>;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  isReadOnly = false,
}) => {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();

  // Form state
  const [formData, setFormData] = useState<JournalEntry>(
    initialData || {
      entry_date: new Date().toISOString().split('T')[0],
      reference: '',
      description: '',
      status: 'draft',
      lines: [{ account_id: 0, debit_amount: 0, credit_amount: 0 }],
    }
  );

  // UI state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountSearchOpen, setAccountSearchOpen] = useState<Record<number, boolean>>({});
  const [accountSearch, setAccountSearch] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await apiClient.get('/api/accounts?is_active=true');
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setAccounts(data.filter((acc: Account) => !acc.is_header));
    } catch (error) {
      showToast(t('common.error'), 'error');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Calculate totals
  const totals = useCallback(() => {
    const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }, [formData.lines]);

  // Validation
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.entry_date) newErrors.entry_date = t('accounting.journals.dateRequired');
    if (formData.lines.length === 0) newErrors.lines = t('accounting.journals.linesRequired');
    if (formData.lines.some(l => l.account_id === 0 || l.account_id === null)) {
      newErrors.lines = t('accounting.journals.accountsRequired');
    }

    const { isBalanced } = totals();
    if (!isBalanced) newErrors.balance = t('accounting.journals.notBalanced');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, totals, t]);

  // Handlers
  const handleHeaderChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };

      // If changing account, fetch account details
      if (field === 'account_id' && value) {
        const account = accounts.find(a => a.id === value);
        if (account) {
          newLines[index].account_code = account.code;
          newLines[index].account_name = account.name;
        }
      }

      return { ...prev, lines: newLines };
    });
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { account_id: 0, debit_amount: 0, credit_amount: 0 }],
    }));
  };

  const removeLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(formData);
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    }
  };

  const { totalDebit, totalCredit, isBalanced } = totals();

  // Account dropdown filtered by search
  const getFilteredAccounts = (searchIndex: number) => {
    const searchTerm = accountSearch[searchIndex] || '';
    return accounts.filter(
      acc =>
        acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">{t('accounting.journals.entryDetails')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Entry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('accounting.journals.entryDate')} *
            </label>
            <input
              type="date"
              value={formData.entry_date}
              onChange={e => handleHeaderChange('entry_date', e.target.value)}
              disabled={isReadOnly || formData.status === 'posted'}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700"
              required
            />
            {errors.entry_date && (
              <p className="text-red-500 text-xs mt-1">{errors.entry_date}</p>
            )}
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('accounting.journals.reference')}
            </label>
            <input
              type="text"
              value={formData.reference || ''}
              onChange={e => handleHeaderChange('reference', e.target.value)}
              disabled={isReadOnly || formData.status === 'posted'}
              placeholder="INV-2025-001"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700"
            />
          </div>

          {/* Status Badge */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('common.status')}
            </label>
            <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                  formData.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : formData.status === 'submitted'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}
              >
                {formData.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('common.description')}
          </label>
          <textarea
            value={formData.description || ''}
            onChange={e => handleHeaderChange('description', e.target.value)}
            disabled={isReadOnly || formData.status === 'posted'}
            rows={2}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700"
          />
        </div>
      </div>

      {/* Line Items Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{t('accounting.journals.lineItems')}</h2>
        </div>

        {/* Lines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  {t('accounting.accounts.code')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  {t('accounting.accounts.name')}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 w-24">
                  {t('accounting.journals.debit')}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 w-24">
                  {t('accounting.journals.credit')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  {t('common.description')}
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 w-10">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {formData.lines.map((line, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {/* Account Selection */}
                  <td className="px-4 py-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={accountSearch[index] || line.account_code || ''}
                        onChange={e => setAccountSearch(prev => ({ ...prev, [index]: e.target.value }))}
                        onFocus={() => setAccountSearchOpen(prev => ({ ...prev, [index]: true }))}
                        disabled={isReadOnly || formData.status === 'posted'}
                        placeholder="Code"
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs disabled:bg-gray-100"
                      />
                      {accountSearchOpen[index] && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-10 max-h-32 overflow-y-auto">
                          {getFilteredAccounts(index).map(acc => (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                handleLineChange(index, 'account_id', acc.id);
                                setAccountSearchOpen(prev => ({ ...prev, [index]: false }));
                                setAccountSearch(prev => ({ ...prev, [index]: '' }));
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-xs"
                            >
                              {acc.code}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Account Name */}
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {line.account_name}
                  </td>

                  {/* Debit */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={line.debit_amount || 0}
                      onChange={e => {
                        handleLineChange(index, 'debit_amount', parseFloat(e.target.value) || 0);
                        handleLineChange(index, 'credit_amount', 0);
                      }}
                      disabled={isReadOnly || formData.status === 'posted'}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-right text-xs disabled:bg-gray-100"
                    />
                  </td>

                  {/* Credit */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={line.credit_amount || 0}
                      onChange={e => {
                        handleLineChange(index, 'credit_amount', parseFloat(e.target.value) || 0);
                        handleLineChange(index, 'debit_amount', 0);
                      }}
                      disabled={isReadOnly || formData.status === 'posted'}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-right text-xs disabled:bg-gray-100"
                    />
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={line.description || ''}
                      onChange={e => handleLineChange(index, 'description', e.target.value)}
                      disabled={isReadOnly || formData.status === 'posted'}
                      placeholder="Optional"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs disabled:bg-gray-100"
                    />
                  </td>

                  {/* Delete */}
                  <td className="px-4 py-3 text-center">
                    {!isReadOnly && formData.status !== 'posted' && formData.lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Row */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-end items-center gap-8">
            <div className="text-right">
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('accounting.journals.totalDebit')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {totalDebit.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('accounting.journals.totalCredit')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {totalCredit.toFixed(2)}
              </p>
            </div>
            <div
              className={`text-right px-4 py-2 rounded ${
                isBalanced
                  ? 'bg-green-100 dark:bg-green-900'
                  : 'bg-red-100 dark:bg-red-900'
              }`}
            >
              <p className="text-xs font-semibold">
                {isBalanced ? (
                  <span className="text-green-800 dark:text-green-200 flex items-center gap-1">
                    <CheckIcon className="w-4 h-4" /> {t('accounting.journals.balanced')}
                  </span>
                ) : (
                  <span className="text-red-800 dark:text-red-200 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-4 h-4" /> {t('accounting.journals.notBalanced')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Add Line Button */}
        {!isReadOnly && formData.status !== 'posted' && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <PlusIcon className="w-4 h-4" />
              {t('accounting.journals.addLine')}
            </button>
          </div>
        )}

        {errors.lines && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400 text-sm">{errors.lines}</p>
          </div>
        )}
        {errors.balance && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400 text-sm">{errors.balance}</p>
          </div>
        )}
      </div>

      {/* Form Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading || !isBalanced}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      )}
    </form>
  );
};

export default JournalEntryForm;
