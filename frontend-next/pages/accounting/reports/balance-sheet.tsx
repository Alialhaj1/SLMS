/**
 * 📊 BALANCE SHEET PAGE
 * =====================================================
 * Statement of Financial Position
 * Assets = Liabilities + Equity (auto-balanced)
 */

import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface BSRow {
  account_code: string;
  account_name: string;
  amount: number;
  level: number;
}

interface BSSummary {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  retained_earnings: number;
  is_balanced: boolean;
  balance_variance: number;
}

interface BSResponse {
  assets: BSRow[];
  liabilities: BSRow[];
  equity: BSRow[];
  summary: BSSummary;
  as_of_date: string;
}

function BalanceSheetPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { can } = usePermissions();

  const [data, setData] = useState<BSResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState<string>('');
  const hasFetched = useRef(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setAsOfDate(today);
  }, []);

  useEffect(() => {
    if (asOfDate && !hasFetched.current) {
      hasFetched.current = true;
      loadBalanceSheet();
    }
  }, [asOfDate]);

  const loadBalanceSheet = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('as_of_date', asOfDate);

      const response = await apiClient.get(`/api/reports/balance-sheet?${params}`);
      const result = response.data;

      setData({
        assets: result.data.assets || [],
        liabilities: result.data.liabilities || [],
        equity: result.data.equity || [],
        summary: result.summary,
        as_of_date: result.as_of_date,
      });

      if (!result.summary.is_balanced) {
        showToast(t('accounting.balanceSheet.notBalanced'), 'warning');
      }
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

  if (!can(MenuPermissions.Accounting.Reports?.BalanceSheet.View)) {
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('accounting.balanceSheet.title')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {t('accounting.balanceSheet.subtitle')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadBalanceSheet}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium"
              >
                <ArrowPathIcon className="w-4 h-4" />
                {t('common.refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* Balance Status */}
        {data && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              data.summary.is_balanced
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {data.summary.is_balanced ? (
                <>
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  <p className="font-medium text-green-900 dark:text-green-300">
                    {t('accounting.balanceSheet.balanced')}
                  </p>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">
                      {t('accounting.balanceSheet.notBalanced')}
                    </p>
                    <p className="text-sm text-red-700">
                      {t('common.variance')}: {formatNumber(data.summary.balance_variance)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <label className="block text-sm font-medium mb-1">
            {t('accounting.balanceSheet.asOfDate')}
          </label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-700"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">{t('common.loading')}...</div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b">
                <h3 className="text-lg font-medium">{t('accounting.balanceSheet.assets')}</h3>
              </div>
              <table className="w-full">
                <tbody>
                  {data.assets.map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-6 py-3 text-sm" style={{ paddingLeft: getIndent(row.level) }}>
                        {row.account_code} - {row.account_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-right">{formatNumber(row.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <td className="px-6 py-4 font-bold">{t('common.total')}</td>
                    <td className="px-6 py-4 font-bold text-right">
                      {formatNumber(data.summary.total_assets)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Liabilities + Equity */}
            <div className="space-y-6">
              {/* Liabilities */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b">
                  <h3 className="text-lg font-medium">{t('accounting.balanceSheet.liabilities')}</h3>
                </div>
                <table className="w-full">
                  <tbody>
                    {data.liabilities.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-6 py-3 text-sm" style={{ paddingLeft: getIndent(row.level) }}>
                          {row.account_code} - {row.account_name}
                        </td>
                        <td className="px-6 py-3 text-sm text-right">{formatNumber(row.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <td className="px-6 py-4 font-bold">{t('common.total')}</td>
                      <td className="px-6 py-4 font-bold text-right">
                        {formatNumber(data.summary.total_liabilities)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Equity */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b">
                  <h3 className="text-lg font-medium">{t('accounting.balanceSheet.equity')}</h3>
                </div>
                <table className="w-full">
                  <tbody>
                    {data.equity.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-6 py-3 text-sm" style={{ paddingLeft: getIndent(row.level) }}>
                          {row.account_code} - {row.account_name}
                        </td>
                        <td className="px-6 py-3 text-sm text-right">{formatNumber(row.amount)}</td>
                      </tr>
                    ))}
                    <tr className="border-b">
                      <td className="px-6 py-3 text-sm">{t('accounting.balanceSheet.retainedEarnings')}</td>
                      <td className="px-6 py-3 text-sm text-right">
                        {formatNumber(data.summary.retained_earnings)}
                      </td>
                    </tr>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <td className="px-6 py-4 font-bold">{t('common.total')}</td>
                      <td className="px-6 py-4 font-bold text-right">
                        {formatNumber(data.summary.total_equity)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </MainLayout>
    </AuthGuard>
  );
}

export default withPermission(
  MenuPermissions.Accounting.Reports?.BalanceSheet.View,
  BalanceSheetPage
);
