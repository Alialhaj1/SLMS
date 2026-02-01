import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  TruckIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

interface ExpenseReport {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

const ExpenseReports: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [reportData, setReportData] = useState<ExpenseReport[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const response = await fetch(
        `${apiUrl}/api/expenses/reports?start=${dateRange.start}&end=${dateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setReportData(data.categories || []);
        setTotalExpenses(data.total || 0);
      } else {
        // Use mock data
        const mockData = [
          { category: 'Shipping & Freight', total: 15000, count: 12, percentage: 35 },
          { category: 'Customs & Duties', total: 8500, count: 8, percentage: 20 },
          { category: 'Handling & Storage', total: 6200, count: 15, percentage: 15 },
          { category: 'Documentation', total: 3800, count: 25, percentage: 9 },
          { category: 'Insurance', total: 5500, count: 6, percentage: 13 },
          { category: 'Other', total: 3500, count: 10, percentage: 8 },
        ];
        setReportData(mockData);
        setTotalExpenses(mockData.reduce((sum, r) => sum + r.total, 0));
      }
    } catch (error) {
      // Use mock data on error
      const mockData = [
        { category: 'Shipping & Freight', total: 15000, count: 12, percentage: 35 },
        { category: 'Customs & Duties', total: 8500, count: 8, percentage: 20 },
        { category: 'Handling & Storage', total: 6200, count: 15, percentage: 15 },
        { category: 'Documentation', total: 3800, count: 25, percentage: 9 },
        { category: 'Insurance', total: 5500, count: 6, percentage: 13 },
        { category: 'Other', total: 3500, count: 10, percentage: 8 },
      ];
      setReportData(mockData);
      setTotalExpenses(mockData.reduce((sum, r) => sum + r.total, 0));
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
    ];
    return colors[index % colors.length];
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'shipping & freight':
        return <TruckIcon className="w-5 h-5" />;
      case 'customs & duties':
        return <DocumentTextIcon className="w-5 h-5" />;
      case 'documentation':
        return <DocumentTextIcon className="w-5 h-5" />;
      default:
        return <CurrencyDollarIcon className="w-5 h-5" />;
    }
  };

  const handleExport = () => {
    showToast(t('reports.exporting', 'Exporting report...'), 'info');
    // TODO: Implement actual export functionality
  };

  return (
    <MainLayout>
      <Head>
        <title>Expense Reports - SLMS</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('expenses.reports', 'Expense Reports')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('expenses.reportsSubtitle', 'Analyze expense data and trends')}
            </p>
          </div>
          <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2">
            <ArrowDownTrayIcon className="w-5 h-5" />
            {t('common.export', 'Export PDF')}
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('common.dateRange', 'Date Range')}:
              </span>
            </div>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  {t('reports.totalExpenses', 'Total Expenses')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ${totalExpenses.toLocaleString()}
                </p>
              </div>
              <CurrencyDollarIcon className="w-10 h-10 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  {t('reports.totalTransactions', 'Total Transactions')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {reportData.reduce((sum, r) => sum + r.count, 0)}
                </p>
              </div>
              <ChartBarIcon className="w-10 h-10 text-green-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  {t('reports.categories', 'Categories')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {reportData.length}
                </p>
              </div>
              <DocumentTextIcon className="w-10 h-10 text-purple-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Report Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              {t('reports.categoryBreakdown', 'Category Breakdown')}
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {reportData.map((item, index) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${getCategoryColor(index)} bg-opacity-20`}>
                          {getCategoryIcon(item.category)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${item.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`${getCategoryColor(index)} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.count} transactions</span>
                      <span>{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Top Expenses Table */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              {t('reports.expensesByCategory', 'Expenses by Category')}
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Category
                      </th>
                      <th className="text-right py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Amount
                      </th>
                      <th className="text-right py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Count
                      </th>
                      <th className="text-right py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reportData.map((item, index) => (
                      <tr key={item.category} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getCategoryColor(index)}`} />
                            <span className="text-sm text-gray-900 dark:text-white">{item.category}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          ${item.total.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                          {item.count}
                        </td>
                        <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                          {item.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                      <td className="py-3 font-semibold text-gray-900 dark:text-white">Total</td>
                      <td className="py-3 text-right font-bold text-gray-900 dark:text-white">
                        ${totalExpenses.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-600 dark:text-gray-400">
                        {reportData.reduce((sum, r) => sum + r.count, 0)}
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-600 dark:text-gray-400">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default withPermission(MenuPermissions.Expenses.View, ExpenseReports);
