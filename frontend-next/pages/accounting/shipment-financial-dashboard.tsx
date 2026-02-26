import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { ChartBarIcon, CurrencyDollarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface FinancialSummary {
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  margin_percent: number;
  shipment_count: number;
}

interface ShipmentFinancial {
  id: number;
  shipment_ref: string;
  revenue: number;
  cost: number;
  margin: number;
  margin_percent: number;
}

export default function ShipmentFinancialDashboardPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [items, setItems] = useState<ShipmentFinancial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/accounting/shipment-financials', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setSummary(json.summary || null);
      setItems(json.data || []);
    } catch {
      showToast('error', locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(n);

  const kpis = summary ? [
    { label: locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', value: formatCurrency(summary.total_revenue), color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: CurrencyDollarIcon },
    { label: locale === 'ar' ? 'إجمالي التكلفة' : 'Total Cost', value: formatCurrency(summary.total_cost), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', icon: ArrowTrendingDownIcon },
    { label: locale === 'ar' ? 'هامش الربح' : 'Gross Margin', value: formatCurrency(summary.gross_margin), color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: ArrowTrendingUpIcon },
    { label: locale === 'ar' ? 'نسبة الهامش' : 'Margin %', value: `${summary.margin_percent.toFixed(1)}%`, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: ChartBarIcon },
  ] : [];

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'لوحة الشحنات المالية - SLMS' : 'Shipment Financial Dashboard - SLMS'}</title></Head>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'لوحة الشحنات المالية' : 'Shipment Financial Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'تحليل الإيرادات والتكاليف والربحية' : 'Revenue, cost breakdown, margin analysis & profitability trends'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
                      <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                  {locale === 'ar' ? 'اتجاهات الربحية' : 'Profitability Trends'}
                </h3>
                <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-600 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  {locale === 'ar' ? 'مخطط قريباً' : 'Chart coming soon'}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                  {locale === 'ar' ? 'تفصيل التكاليف' : 'Cost Breakdown'}
                </h3>
                <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-600 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  {locale === 'ar' ? 'مخطط قريباً' : 'Chart coming soon'}
                </div>
              </div>
            </div>

            {/* Shipment table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {items.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {locale === 'ar' ? 'لا توجد بيانات مالية' : 'No financial data available'}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      {['Shipment', 'Revenue', 'Cost', 'Margin', 'Margin %'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.shipment_ref}</td>
                        <td className="px-4 py-3 text-sm text-green-700 dark:text-green-400 font-medium">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-red-700 dark:text-red-400">{formatCurrency(item.cost)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(item.margin)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.margin_percent >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                            {item.margin_percent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
