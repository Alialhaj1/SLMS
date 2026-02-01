/**
 * 💰 FinancialPulse Component - Financial Overview Widget
 * =======================================================
 * 
 * Displays:
 * - Cash flow chart (income vs expenses)
 * - Payment summary (due today, this week, overdue)
 * - Expenses by type breakdown
 * 
 * Features:
 * - Interactive line chart
 * - Currency formatting
 * - Quick action buttons
 * - RTL/LTR support
 * - Dark mode colors
 */

import React from 'react';
import { useRouter } from 'next/router';
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useLocale } from '../../contexts/LocaleContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { FinancialData } from '../../lib/dashboardService';

interface FinancialPulseProps {
  data: FinancialData | null;
  loading?: boolean;
}

// Simple Line Chart Component (no external library)
const SimpleCashFlowChart: React.FC<{
  data: { date: string; income: number; expenses: number }[];
}> = ({ data }) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.income, d.expenses)),
    1
  );
  const width = 100;
  const height = 60;
  const padding = 5;

  const getY = (value: number) =>
    height - padding - ((value / maxValue) * (height - padding * 2));

  const getX = (index: number) =>
    padding + (index / (data.length - 1 || 1)) * (width - padding * 2);

  // Generate path for expenses line
  const expensesPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.expenses)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
      {/* Grid lines */}
      {[0, 0.5, 1].map((ratio, i) => (
        <line
          key={i}
          x1={padding}
          y1={height - padding - ratio * (height - padding * 2)}
          x2={width - padding}
          y2={height - padding - ratio * (height - padding * 2)}
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeDasharray="2,2"
        />
      ))}
      
      {/* Expenses line */}
      <path
        d={expensesPath}
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Expenses area fill */}
      <path
        d={`${expensesPath} L ${getX(data.length - 1)} ${height - padding} L ${padding} ${height - padding} Z`}
        fill="url(#expenseGradient)"
        opacity={0.2}
      />
      
      {/* Gradient definition */}
      <defs>
        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  );
};

// Payment Card Component
const PaymentCard: React.FC<{
  title: string;
  amount: number;
  currency: string;
  variant: 'normal' | 'warning' | 'danger';
  onClick?: () => void;
}> = ({ title, amount, currency, variant, onClick }) => {
  const { formatCurrency } = useTranslation();
  
  const variantStyles = {
    normal: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 p-3 rounded-lg border ${variantStyles[variant]} hover:opacity-80 transition-opacity text-start`}
    >
      <p className="text-xs font-medium opacity-80">{title}</p>
      <p className="text-lg font-bold mt-1">{formatCurrency(amount, currency)}</p>
    </button>
  );
};

// Expense Type Bar
const ExpenseBar: React.FC<{
  type: string;
  amount: number;
  maxAmount: number;
  currency: string;
}> = ({ type, amount, maxAmount, currency }) => {
  const { formatCurrency } = useTranslation();
  const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{type}</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {formatCurrency(amount, currency)}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Skeleton loader
const FinancialPulseSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
    <div className="flex gap-2 mb-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex-1 h-16 bg-gray-200 dark:bg-gray-700 rounded" />
      ))}
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
      ))}
    </div>
  </div>
);

const FinancialPulse: React.FC<FinancialPulseProps> = ({ data, loading = false }) => {
  const router = useRouter();
  const { t, formatCurrency } = useTranslation();
  const { isRTL } = useLocale();
  const { hasPermission } = usePermissions();

  if (loading) {
    return <FinancialPulseSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { cashFlow, paymentSummary, expensesByType } = data;
  const maxExpense = Math.max(...expensesByType.map(e => e.amount), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          {t('dashboard.financial.title')}
        </h2>
        <button
          onClick={() => router.push('/finance')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t('common.viewAll')}
        </button>
      </div>

      {/* Cash Flow Chart */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-4 h-4" />
          {t('dashboard.financial.cashFlow')}
        </h3>
        {cashFlow.length > 0 ? (
          <SimpleCashFlowChart data={cashFlow} />
        ) : (
          <div className="h-20 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            {t('dashboard.financial.noData')}
          </div>
        )}
      </div>

      {/* Payment Summary Cards */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <BanknotesIcon className="w-4 h-4" />
          {t('dashboard.financial.paymentSummary')}
        </h3>
        <div className="flex gap-2">
          <PaymentCard
            title={t('dashboard.financial.dueToday')}
            amount={paymentSummary.dueToday}
            currency={paymentSummary.currency}
            variant="normal"
            onClick={() => router.push('/finance/vendor-payments?due=today')}
          />
          <PaymentCard
            title={t('dashboard.financial.dueThisWeek')}
            amount={paymentSummary.dueThisWeek}
            currency={paymentSummary.currency}
            variant="warning"
            onClick={() => router.push('/finance/vendor-payments?due=week')}
          />
          <PaymentCard
            title={t('dashboard.financial.overdue')}
            amount={paymentSummary.overdue}
            currency={paymentSummary.currency}
            variant="danger"
            onClick={() => router.push('/finance/vendor-payments?due=overdue')}
          />
        </div>
      </div>

      {/* Expenses by Type */}
      {expensesByType.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('dashboard.financial.expensesByType')}
          </h3>
          <div className="space-y-3">
            {expensesByType.slice(0, 4).map((expense, index) => (
              <ExpenseBar
                key={index}
                type={expense.type}
                amount={expense.amount}
                maxAmount={maxExpense}
                currency={paymentSummary.currency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {hasPermission('vendor_payments:create') && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => router.push('/finance/vendor-payments/create')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            {t('dashboard.quickActions.newPayment')}
          </button>
        </div>
      )}
    </div>
  );
};

export default FinancialPulse;
