/**
 * 📊 INCOME STATEMENT PAGE
 * =====================================================
 * Profit & Loss Statement (P&L)
 * Revenue - COGS - Expenses = Net Profit
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
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
} from '@heroicons/react/24/outline';

interface ISRow {
  account_code: string;
  account_name: string;
  amount: number;
  level: number;
  is_header: boolean;
}

interface ISSummary {
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
  net_profit_margin: number;
}

interface ISResponse {
  revenue: ISRow[];
  cogs: ISRow[];
  expenses: ISRow[];
  summary: ISSummary;
  period: { from: string; to: string };
}

function IncomeStatementPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { can } = usePermissions();

  const [data, setData] = useState<ISResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const hasFetched = useRef(false);

  // Initialize dates on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const startOfYear = new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split('T')[0];

    setFromDate(startOfYear);
    setToDate(today);
  }, []);

  // Load IS when dates change
  useEffect(() => {
    if (fromDate && toDate && !hasFetched.current) {
      hasFetched.current = true;
      loadIncomeStatement();
    }
  }, [fromDate, toDate]);

  const loadIncomeStatement = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('from_date', fromDate);
      params.append('to_date', toDate);

      const response = await apiClient.get(`/api/reports/income-statement?${params}`);
      const result = response.data;

      setData({
        revenue: result.data.revenue || [],
        cogs: result.data.cogs || [],
        expenses: result.data.expenses || [],
        summary: result.summary,
        period: result.period,
      });
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getIndent = (level: number) => {
    return `${level * 20}px`;
  };

  if (!can(MenuPermissions.Accounting.Reports?.IncomeStatement.View)) {
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
                {t('accounting.incomeStatement.title')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {t('accounting.incomeStatement.subtitle')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadIncomeStatement}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4" />
                {t('common.refresh')}
              </button>

              <button
                onClick={() => {}}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {t('common.export')}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            {t('common.filters')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Income Statement */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">{t('common.loading')}...</div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Revenue Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('accounting.incomeStatement.revenue')}
                </h3>
              </div>
              <table className="w-full">
                <tbody>
                  {data.revenue.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td
                        className="px-6 py-3 text-sm text-gray-900 dark:text-white"
                        style={{ paddingLeft: getIndent(row.level) }}
                      >
                        {row.account_code} - {row.account_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {formatNumber(row.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      {t('accounting.incomeStatement.totalRevenue')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-900 dark:text-white">
                      {formatNumber(data.summary.total_revenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* COGS Section */}
            {data.cogs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {t('accounting.incomeStatement.cogs')}
                  </h3>
                </div>
                <table className="w-full">
                  <tbody>
                    {data.cogs.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <td
                          className="px-6 py-3 text-sm text-gray-900 dark:text-white"
                          style={{ paddingLeft: getIndent(row.level) }}
                        >
                          {row.account_code} - {row.account_name}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-red-600 dark:text-red-400">
                          ({formatNumber(row.amount)})
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                        {t('accounting.incomeStatement.grossProfit')}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-right text-green-600 dark:text-green-400">
                        {formatNumber(data.summary.gross_profit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Expenses Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('accounting.incomeStatement.expenses')}
                </h3>
              </div>
              <table className="w-full">
                <tbody>
                  {data.expenses.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td
                        className="px-6 py-3 text-sm text-gray-900 dark:text-white"
                        style={{ paddingLeft: getIndent(row.level) }}
                      >
                        {row.account_code} - {row.account_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-red-600 dark:text-red-400">
                        ({formatNumber(row.amount)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Net Profit */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr className="bg-blue-50 dark:bg-blue-900/20">
                    <td className="px-6 py-4 text-lg font-bold text-gray-900 dark:text-white">
                      {t('accounting.incomeStatement.netProfit')}
                    </td>
                    <td
                      className={`px-6 py-4 text-lg font-bold text-right ${
                        data.summary.net_profit >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatNumber(data.summary.net_profit)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {t('accounting.incomeStatement.netProfitMargin')}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
                      {data.summary.net_profit_margin.toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </MainLayout>
    </AuthGuard>
  );
}

export default withPermission(
  MenuPermissions.Accounting.Reports?.IncomeStatement.View,
  IncomeStatementPage
);
