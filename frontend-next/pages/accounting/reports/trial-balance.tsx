/**
 * 📊 TRIAL BALANCE REPORT PAGE
 * =====================================================
 * Displays aggregated account balances from posted journals
 * Real-time calculation, no stored balances
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import MainLayout from '@/components/layout/MainLayout';
import { withPermission } from '@/utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import { useTranslation } from '@/hooks/useTranslation.enhanced';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';
import { apiClient } from '@/lib/apiClient';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface TrialBalanceRow {
  account_id: number;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  debit: number;
  credit: number;
  balance: number;
  level: number;
  is_header?: boolean;
}

interface TrialBalanceResponse {
  data: TrialBalanceRow[];
  summary: {
    total_debit: number;
    total_credit: number;
    total_balance: number;
    is_balanced: boolean;
  };
  period: {
    from: string;
    to: string;
  };
}

function TrialBalancePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { can } = usePermissions();

  const [data, setData] = useState<TrialBalanceRow[]>([]);
  const [summary, setSummary] = useState<TrialBalanceResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters - Set defaults on mount
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [accountFrom, setAccountFrom] = useState('');
  const [accountTo, setAccountTo] = useState('');
  const [includeZeroBalance, setIncludeZeroBalance] = useState(false);

  // Initialize with default dates on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    
    setFromDate(startOfYear);
    setToDate(today);
  }, []);

  // Load trial balance when filters change
  useEffect(() => {
    if (fromDate && toDate) {
      loadTrialBalance();
    }
  }, [fromDate, toDate, accountFrom, accountTo, includeZeroBalance]);

  const loadTrialBalance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (accountFrom) params.append('account_from', accountFrom);
      if (accountTo) params.append('account_to', accountTo);
      if (includeZeroBalance) params.append('include_zero_balance', 'true');

      const response = await apiClient.get(`/api/reports/trial-balance?${params}`);
      const result = response.data?.data ?? response.data;

      setData(result.data || []);
      setSummary(result.summary);

      if (!result.summary.is_balanced) {
        showToast(
          t('accounting.trialBalance.notBalanced'),
          'warning'
        );
      }
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (accountFrom) params.append('account_from', accountFrom);
      if (accountTo) params.append('account_to', accountTo);

      // Use fetch for blob response
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/reports/trial-balance/export?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `trial-balance-${new Date().toISOString().split('T')[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      showToast(t('common.export'), 'success');
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const getIndentLevel = (level: number) => {
    return `${level * 20}px`;
  };

  const formatNumber = (num: number) => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  if (!can(MenuPermissions.Accounting.Reports?.TrialBalance.View)) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">{t('common.error')}</div>
          </div>
        </MainLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <MainLayout>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('accounting.trialBalance.title')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {t('accounting.trialBalance.subtitle')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadTrialBalance}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4" />
                {t('common.refresh')}
              </button>

              <button
                onClick={handleExport}
                disabled={exporting || !summary?.is_balanced}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {t('common.export')}
              </button>
            </div>
          </div>
        </div>

        {/* Balance Status */}
        {summary && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              summary.is_balanced
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {summary.is_balanced ? (
                <>
                  <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-300">
                      {t('accounting.trialBalance.balanced')}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {t('accounting.trialBalance.debit')} = {t('accounting.trialBalance.credit')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-300">
                      {t('accounting.trialBalance.notBalanced')}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {t('accounting.trialBalance.variance')}: {formatNumber(Math.abs(summary.total_debit - summary.total_credit))}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            {t('common.filters')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.dateFrom')}
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.dateTo')}
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Include Zero Balance */}
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeZeroBalance}
                  onChange={(e) => setIncludeZeroBalance(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('accounting.trialBalance.includeZeroBalance')}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('accounting.accounts.code')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('accounting.accounts.name')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('accounting.journals.debit')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('accounting.journals.credit')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('accounting.trialBalance.balance')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      {t('common.loading')}...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.account_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td
                        className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white"
                        style={{ paddingLeft: getIndentLevel(row.level) }}
                      >
                        {row.account_code}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {row.account_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {row.debit > 0 ? formatNumber(row.debit) : '-'}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {row.credit > 0 ? formatNumber(row.credit) : '-'}
                      </td>
                      <td
                        className={`px-6 py-3 text-sm font-medium text-right ${
                          row.balance > 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {formatNumber(row.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                    <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      {t('common.total')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-900 dark:text-white">
                      {formatNumber(summary.total_debit)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-900 dark:text-white">
                      {formatNumber(summary.total_credit)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-900 dark:text-white">
                      {formatNumber(summary.total_balance)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

export default withPermission(
  MenuPermissions.Accounting.Reports?.TrialBalance.View,
  TrialBalancePage
);
