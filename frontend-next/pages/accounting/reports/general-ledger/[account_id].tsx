/**
 * 📚 GENERAL LEDGER DETAILS PAGE
 * =====================================================
 * Account-specific GL with transaction detail
 * Drill-down from Trial Balance or GL list
 * Shows all postings with running balance
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
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface GLRow {
  date: string;
  reference: string;
  description: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
}

interface GLResponse {
  account: {
    id: number;
    code: string;
    name: string;
    type: string;
  };
  data: GLRow[];
  summary: {
    opening_balance: number;
    total_debit: number;
    total_credit: number;
    closing_balance: number;
  };
  period: {
    from: string;
    to: string;
  };
}

function GeneralLedgerDetailsPage() {
  const router = useRouter();
  const { account_id } = router.query;
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { can } = usePermissions();

  const [data, setData] = useState<GLRow[]>([]);
  const [summary, setSummary] = useState<GLResponse['summary'] | null>(null);
  const [accountInfo, setAccountInfo] = useState<GLResponse['account'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Load GL on mount
  useEffect(() => {
    if (account_id) {
      // Set default dates
      const today = new Date().toISOString().split('T')[0];
      const startOfYear = new Date(new Date().getFullYear(), 0, 1)
        .toISOString()
        .split('T')[0];

      setFromDate(startOfYear);
      setToDate(today);
    }
  }, [account_id]);

  // Load GL when account or dates change
  useEffect(() => {
    if (account_id && fromDate && toDate) {
      loadGeneralLedger();
    }
  }, [account_id, fromDate, toDate]);

  const loadGeneralLedger = async () => {
    if (!account_id) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('account_id', account_id as string);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const response = await apiClient.get(`/api/reports/general-ledger?${params}`);
      const result = response.data;

      setData(result.data || []);
      setSummary(result.summary);
      setAccountInfo(result.account);
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!account_id) return;

    setExporting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/reports/general-ledger/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          account_id: parseInt(account_id as string),
          from_date: fromDate,
          to_date: toDate,
          format: 'excel',
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `gl-${accountInfo?.code}-${new Date().toISOString().split('T')[0]}.xlsx`
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

  const handleDrillDown = (reference: string) => {
    // Extract JE ID from reference (JE-123 -> 123)
    const jeId = reference.replace('JE-', '');
    router.push(`/accounting/journals/${jeId}`);
  };

  const formatNumber = (num: number) => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatDate = (dateStr: string) => {
    if (dateStr === 'OPENING') return t('accounting.generalLedger.opening');
    return new Date(dateStr).toLocaleDateString();
  };

  if (!can(MenuPermissions.Accounting.Reports?.GeneralLedger.View)) {
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
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/accounting/reports/general-ledger">
            <a className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
              <ArrowLeftIcon className="w-4 h-4" />
              {t('common.back')}
            </a>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              {accountInfo && (
                <>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {accountInfo.code} - {accountInfo.name}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {t('accounting.generalLedger.details')} | {accountInfo.type}
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadGeneralLedger}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4" />
                {t('common.refresh')}
              </button>

              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {t('common.export')}
              </button>
            </div>
          </div>
        </div>

        {/* Account Summary */}
        {summary && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Opening Balance */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('accounting.generalLedger.openingBalance')}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    summary.opening_balance > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatNumber(summary.opening_balance)}
                </p>
              </div>

              {/* Total Debit */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('accounting.journals.debit')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(summary.total_debit)}
                </p>
              </div>

              {/* Total Credit */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('accounting.journals.credit')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(summary.total_credit)}
                </p>
              </div>

              {/* Closing Balance */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('accounting.generalLedger.closingBalance')}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    summary.closing_balance > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatNumber(summary.closing_balance)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            {t('common.filters')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('common.date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('accounting.generalLedger.reference')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('common.description')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('accounting.journals.debit')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('accounting.journals.credit')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('accounting.generalLedger.balance')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {t('common.loading')}...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                        row.date === 'OPENING' ? 'bg-gray-100 dark:bg-gray-700/50' : ''
                      }`}
                      onClick={() => {
                        if (row.reference && row.date !== 'OPENING') {
                          handleDrillDown(row.reference);
                        }
                      }}
                    >
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {row.reference || '-'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {row.description}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {row.debit_amount > 0 ? formatNumber(row.debit_amount) : '-'}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {row.credit_amount > 0 ? formatNumber(row.credit_amount) : '-'}
                      </td>
                      <td
                        className={`px-6 py-3 text-sm font-medium text-right ${
                          row.balance > 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatNumber(row.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 {t('accounting.generalLedger.helpText')}
          </p>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

export default withPermission(
  MenuPermissions.Accounting.Reports?.GeneralLedger.View,
  GeneralLedgerDetailsPage
);
