import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import apiClient from '@/lib/apiClient';
import { ChartBarIcon, BanknotesIcon, DocumentCheckIcon, TruckIcon, ReceiptPercentIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DashboardData {
  summary: {
    shipment_count: number;
    total_shipment_value: number;
    total_expenses: number;
    total_vat: number;
    shipments_with_expenses: number;
    shipments_without_expenses: number;
  };
  categories: { category: string; count: number; total_before_vat: number; total_vat: number; total_base: number }[];
  shipments: { id: number; shipment_number: string; total_amount: number; expense_count: number; total_expenses: number; posted_count: number; unposted_count: number }[];
}

export default function ShipmentFinancialDashboardPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: DashboardData }>('/api/shipment-accounting/financial-dashboard');
      setData(res.data);
    } catch {
      showToast('error', locale === 'ar' ? 'فشل تحميل لوحة المعلومات' : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmt = (n: number) => new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
        </div>
      </MainLayout>
    );
  }

  const s = data?.summary || { shipment_count: 0, total_shipment_value: 0, total_expenses: 0, total_vat: 0, shipments_with_expenses: 0, shipments_without_expenses: 0 };
  const cats = data?.categories || [];
  const ships = data?.shipments || [];
  const totalCatAmount = cats.reduce((sum, c) => sum + Number(c.total_base), 0);

  const KPI_CARDS = [
    { label: locale === 'ar' ? 'إجمالي الشحنات' : 'Total Shipments', value: s.shipment_count, icon: TruckIcon, color: 'from-blue-500 to-blue-600', sub: '' },
    { label: locale === 'ar' ? 'قيمة الشحنات' : 'Shipment Value', value: fmt(s.total_shipment_value), icon: BanknotesIcon, color: 'from-emerald-500 to-emerald-600', sub: 'SAR' },
    { label: locale === 'ar' ? 'إجمالي المصاريف' : 'Total Expenses', value: fmt(s.total_expenses), icon: ReceiptPercentIcon, color: 'from-amber-500 to-orange-500', sub: 'SAR' },
    { label: locale === 'ar' ? 'إجمالي الضريبة' : 'Total VAT', value: fmt(s.total_vat), icon: DocumentCheckIcon, color: 'from-purple-500 to-purple-600', sub: 'SAR' },
  ];

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'لوحة التحكم المالية للشحنات' : 'Shipment Financial Dashboard'} - SLMS</title></Head>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <ChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'لوحة التحكم المالية' : 'Financial Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'نظرة شاملة على التكاليف والمصاريف' : 'Overview of shipment costs & expenses'}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CARDS.map(k => (
            <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{k.label}</p>
                <div className={`p-2 bg-gradient-to-br ${k.color} rounded-lg`}>
                  <k.icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{k.value}</p>
              {k.sub && <p className="text-xs text-gray-400 mt-1">{k.sub}</p>}
            </div>
          ))}
        </div>

        {/* Coverage row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800 p-4 flex items-center gap-4">
            <div className="p-3 bg-green-600 rounded-xl"><DocumentCheckIcon className="h-5 w-5 text-white" /></div>
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">{locale === 'ar' ? 'شحنات بمصاريف' : 'With Expenses'}</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-200">{s.shipments_with_expenses}</p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800 p-4 flex items-center gap-4">
            <div className="p-3 bg-red-600 rounded-xl"><ExclamationTriangleIcon className="h-5 w-5 text-white" /></div>
            <div>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{locale === 'ar' ? 'شحنات بدون مصاريف' : 'Without Expenses'}</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-200">{s.shipments_without_expenses}</p>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'توزيع المصاريف حسب الفئة' : 'Expenses by Category'}
            </h2>
          </div>
          {cats.length === 0 ? (
            <div className="p-8 text-center text-gray-400">{locale === 'ar' ? 'لا توجد بيانات' : 'No data yet'}</div>
          ) : (
            <div className="p-5 space-y-3">
              {cats.map(c => {
                const pct = totalCatAmount > 0 ? (Number(c.total_base) / totalCatAmount * 100) : 0;
                return (
                  <div key={c.category} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{c.category || 'Other'}</div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                          {fmt(Number(c.total_base))} SAR
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold w-14 text-right text-gray-600 dark:text-gray-400">{pct.toFixed(1)}%</div>
                    <div className="text-xs text-gray-400 w-12 text-center">{c.count}x</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Per-Shipment Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'التفاصيل المالية حسب الشحنة' : 'Financial Details per Shipment'}
            </h2>
          </div>
          {ships.length === 0 ? (
            <div className="p-8 text-center text-gray-400">{locale === 'ar' ? 'لا توجد شحنات' : 'No shipments'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {[
                      locale === 'ar' ? 'رقم الشحنة' : 'Shipment #',
                      locale === 'ar' ? 'قيمة الشحنة' : 'Shipment Value',
                      locale === 'ar' ? 'المصاريف' : 'Expenses',
                      locale === 'ar' ? 'إجمالي المصاريف' : 'Total Expenses',
                      locale === 'ar' ? 'مرحّل' : 'Posted',
                      locale === 'ar' ? 'غير مرحّل' : 'Unposted',
                      locale === 'ar' ? 'نسبة التكلفة' : 'Cost %',
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {ships.map(sh => {
                    const costPct = Number(sh.total_amount) > 0 ? (Number(sh.total_expenses) / Number(sh.total_amount) * 100) : 0;
                    return (
                      <tr key={sh.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600 dark:text-blue-400">{sh.shipment_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{fmt(Number(sh.total_amount))}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{sh.expense_count}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmt(Number(sh.total_expenses))}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">{sh.posted_count}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${Number(sh.unposted_count) > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-500'}`}>{sh.unposted_count}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden max-w-[80px]">
                              <div className={`h-full rounded-full ${costPct > 10 ? 'bg-red-500' : costPct > 5 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(costPct, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{costPct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
