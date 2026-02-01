import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

type ReportType = 'vendor_aging' | 'price_variance' | 'outstanding_pos';

interface VendorAgingRow {
  vendor_code: string;
  vendor_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  days_120_plus: number;
  total_balance: number;
  currency_code: string;
}

interface PriceVarianceRow {
  item_code: string;
  item_name: string;
  avg_po_price: number;
  avg_invoice_price: number;
  variance_amount: number;
  variance_percent: number;
  purchase_count: number;
  currency_code: string;
}

interface OutstandingPORow {
  po_number: string;
  po_date: string;
  vendor_code: string;
  vendor_name: string;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  po_amount: number;
  currency_code: string;
  days_outstanding: number;
}

function ProcurementReportsPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const router = useRouter();

  const [activeReport, setActiveReport] = useState<ReportType>('vendor_aging');
  const [loading, setLoading] = useState(false);
  const [vendorAgingData, setVendorAgingData] = useState<VendorAgingRow[]>([]);
  const [priceVarianceData, setPriceVarianceData] = useState<PriceVarianceRow[]>([]);
  const [outstandingPOData, setOutstandingPOData] = useState<OutstandingPORow[]>([]);

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  const loadReport = async (reportType: ReportType) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/reports/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        switch (reportType) {
          case 'vendor_aging':
            setVendorAgingData(result.data || []);
            break;
          case 'price_variance':
            setPriceVarianceData(result.data || []);
            break;
          case 'outstanding_pos':
            setOutstandingPOData(result.data || []);
            break;
        }
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast('Failed to load report', 'error');
      }
    } catch (error) {
      showToast('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf') => {
    showToast(`Exporting to ${format.toUpperCase()}...`, 'info');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/reports/${activeReport}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeReport}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Report exported successfully', 'success');
      } else {
        showToast('Export not yet implemented', 'warning');
      }
    } catch (error) {
      showToast('Export feature coming soon', 'warning');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + currency;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (!hasPermission('reports:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <ChartBarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view reports.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Procurement Reports - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Procurement Reports</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Analyze procurement performance and vendor relationships
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => exportReport('excel')}>
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
              Export Excel
            </Button>
            <Button variant="secondary" onClick={() => exportReport('pdf')}>
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Report Tabs */}
        <div className="card">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveReport('vendor_aging')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeReport === 'vendor_aging'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <ClockIcon className="w-5 h-5 inline-block mr-2" />
              Vendor Aging
            </button>
            <button
              onClick={() => setActiveReport('price_variance')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeReport === 'price_variance'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <ChartBarIcon className="w-5 h-5 inline-block mr-2" />
              Price Variance
            </button>
            <button
              onClick={() => setActiveReport('outstanding_pos')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeReport === 'outstanding_pos'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5 inline-block mr-2" />
              Outstanding POs
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading report...</p>
            </div>
          ) : (
            <>
              {/* Vendor Aging Report */}
              {activeReport === 'vendor_aging' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">1-30 Days</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">31-60 Days</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">61-90 Days</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">90+ Days</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Balance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {vendorAgingData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No vendor balances found
                          </td>
                        </tr>
                      ) : (
                        vendorAgingData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.vendor_name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{row.vendor_code}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(row.current, row.currency_code)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(row.days_30, row.currency_code)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-yellow-600 dark:text-yellow-400">
                              {formatCurrency(row.days_60, row.currency_code)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-orange-600 dark:text-orange-400">
                              {formatCurrency(row.days_90, row.currency_code)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400">
                              {formatCurrency(row.days_120_plus, row.currency_code)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(row.total_balance, row.currency_code)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Price Variance Report */}
              {activeReport === 'price_variance' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg PO Price</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Invoice Price</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Variance</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Variance %</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purchases</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {priceVarianceData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No price variance data found
                          </td>
                        </tr>
                      ) : (
                        priceVarianceData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.item_name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{row.item_code}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(row.avg_po_price, row.currency_code)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(row.avg_invoice_price, row.currency_code)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm">
                              <span className={row.variance_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                                {row.variance_amount > 0 ? '+' : ''}{formatCurrency(row.variance_amount, row.currency_code)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm">
                              <span className={Math.abs(row.variance_percent) > 5 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}>
                                {row.variance_percent > 0 ? '+' : ''}{row.variance_percent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                              {row.purchase_count}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Outstanding POs Report */}
              {activeReport === 'outstanding_pos' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PO Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ordered</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Received</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remaining</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Days</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {outstandingPOData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No outstanding purchase orders
                          </td>
                        </tr>
                      ) : (
                        outstandingPOData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                                {row.po_number}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {formatDate(row.po_date)}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.vendor_name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{row.vendor_code}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                              {row.ordered_quantity}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                              {row.received_quantity}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-orange-600 dark:text-orange-400">
                              {row.remaining_quantity}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(row.po_amount, row.currency_code)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm">
                              <span className={row.days_outstanding > 30 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}>
                                {row.days_outstanding}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Procurement.Reports.View, ProcurementReportsPage);
