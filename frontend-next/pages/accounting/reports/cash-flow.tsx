import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../contexts/ToastContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { usePermissions } from '../../../hooks/usePermissions';
import { useAuth } from '../../../hooks/useAuth';
import { MenuPermissions } from '../../../config/menu.permissions';
import { BanknotesIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CashFlowLineData {
  label: string;
  label_ar: string;
  amount: number;
  is_subtotal: boolean;
  indent: number;
}

interface CashFlowSectionData {
  title: string;
  title_ar: string;
  lines: CashFlowLineData[];
  total: number;
}

interface CashFlowReport {
  start_date: string;
  end_date: string;
  operating: CashFlowSectionData;
  investing: CashFlowSectionData;
  financing: CashFlowSectionData;
  net_change_in_cash: number;
  opening_cash_balance: number;
  closing_cash_balance: number;
}

export default function CashFlowPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Accounting.Reports.CashFlow.View]);
  const canExport = hasAnyPermission([MenuPermissions.Accounting.Reports.CashFlow.Export]);

  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CashFlowReport | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${API_BASE}/api/reports/cash-flow?start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      } else {
        throw new Error(data.message || 'Failed');
      }
    } catch (err: any) {
      showToast(locale === 'ar' ? 'فشل تحميل التقرير' : 'Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, locale, showToast]);

  useEffect(() => {
    if (canView) fetchReport();
  }, [canView]);

  const totals = useMemo(() => {
    if (!report) return { operating: 0, investing: 0, financing: 0, net: 0, opening: 0, closing: 0 };
    return {
      operating: report.operating.total,
      investing: report.investing.total,
      financing: report.financing.total,
      net: report.net_change_in_cash,
      opening: report.opening_cash_balance,
      closing: report.closing_cash_balance,
    };
  }, [report]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'قائمة التدفق النقدي - SLMS' : 'Cash Flow - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <BanknotesIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض قائمة التدفق النقدي.' : "You don't have permission to view cash flow statement."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'قائمة التدفق النقدي - SLMS' : 'Cash Flow - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'قائمة التدفق النقدي' : 'Cash Flow Statement'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'ملخص التدفقات النقدية حسب الأنشطة' : 'Cash flow summary by activities'}</p>
            </div>
          </div>
          {canExport && (
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label={locale === 'ar' ? 'من' : 'From'} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label={locale === 'ar' ? 'إلى' : 'To'} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <div className="flex items-end">
              <Button variant="secondary" loading={loading} onClick={fetchReport}>
                <ArrowPathIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تحديث التقرير' : 'Refresh Report'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رصيد أول المدة' : 'Opening Cash'}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{totals.opening.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تشغيلي' : 'Operating'}</p>
            <p className={`text-xl font-bold ${totals.operating >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.operating.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'استثماري' : 'Investing'}</p>
            <p className={`text-xl font-bold ${totals.investing >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.investing.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تمويلي' : 'Financing'}</p>
            <p className={`text-xl font-bold ${totals.financing >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.financing.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'صافي التدفق' : 'Net Cash Flow'}</p>
            <p className={`text-xl font-bold ${totals.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totals.net.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رصيد آخر المدة' : 'Closing Cash'}</p>
            <p className="text-xl font-bold text-blue-600">{totals.closing.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? `الفترة: ${startDate} إلى ${endDate}` : `Period: ${startDate} to ${endDate}`}</p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto" />
              <p className="mt-4 text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : !report ? (
            <div className="p-12 text-center text-gray-500">
              {locale === 'ar' ? 'لا توجد بيانات' : 'No data available'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {(['operating', 'investing', 'financing'] as const).map((sectionKey) => {
                const section = report[sectionKey];
                return (
                  <div key={sectionKey} className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {locale === 'ar' ? section.title_ar : section.title}
                      </h3>
                      <span className={`font-semibold ${section.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {section.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البند' : 'Line Item'}</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {section.lines.filter(l => l.amount !== 0 || l.is_subtotal).map((line, idx) => (
                            <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${line.is_subtotal ? 'font-semibold' : ''}`}>
                              <td className="px-3 py-2 text-gray-900 dark:text-white" style={{ paddingLeft: `${12 + line.indent * 16}px` }}>
                                {locale === 'ar' ? line.label_ar : line.label}
                              </td>
                              <td className={`px-3 py-2 text-right ${line.amount >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
                                {line.amount !== 0 ? line.amount.toLocaleString() : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Net Change Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{locale === 'ar' ? 'صافي التغير في النقدية' : 'Net Change in Cash'}</span>
                    <span className={`font-semibold ${report.net_change_in_cash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {report.net_change_in_cash.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{locale === 'ar' ? 'رصيد أول المدة' : 'Opening Cash Balance'}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{report.opening_cash_balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base border-t border-gray-300 dark:border-gray-600 pt-2">
                    <span className="font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'رصيد آخر المدة' : 'Closing Cash Balance'}</span>
                    <span className="font-bold text-blue-600">{report.closing_cash_balance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
