import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../contexts/ToastContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { usePermissions } from '../../../hooks/usePermissions';
import { MenuPermissions } from '../../../config/menu.permissions';
import { BanknotesIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface CashFlowLine {
  id: number;
  section: 'operating' | 'investing' | 'financing';
  label: string;
  labelAr: string;
  amount: number;
  currency: string;
}

const mockLines: CashFlowLine[] = [
  { id: 1, section: 'operating', label: 'Receipts from customers', labelAr: 'متحصلات من العملاء', amount: 42000, currency: 'SAR' },
  { id: 2, section: 'operating', label: 'Payments to suppliers', labelAr: 'مدفوعات للموردين', amount: -27500, currency: 'SAR' },
  { id: 3, section: 'operating', label: 'Payroll', labelAr: 'رواتب', amount: -8200, currency: 'SAR' },
  { id: 4, section: 'investing', label: 'Equipment purchase', labelAr: 'شراء معدات', amount: -12000, currency: 'SAR' },
  { id: 5, section: 'financing', label: 'Loan proceeds', labelAr: 'متحصلات قرض', amount: 15000, currency: 'SAR' },
  { id: 6, section: 'financing', label: 'Loan repayment', labelAr: 'سداد قرض', amount: -3500, currency: 'SAR' },
];

export default function CashFlowPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Accounting.Reports.CashFlow.View]);
  const canExport = hasAnyPermission([MenuPermissions.Accounting.Reports.CashFlow.Export]);

  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-01-31');

  const lines = useMemo(() => mockLines, []);

  const totals = useMemo(() => {
    const operating = lines.filter((l) => l.section === 'operating').reduce((s, l) => s + l.amount, 0);
    const investing = lines.filter((l) => l.section === 'investing').reduce((s, l) => s + l.amount, 0);
    const financing = lines.filter((l) => l.section === 'financing').reduce((s, l) => s + l.amount, 0);
    const net = operating + investing + financing;
    return { operating, investing, financing, net };
  }, [lines]);

  const sectionTitle = (s: CashFlowLine['section']) => {
    const map = {
      operating: { en: 'Operating Activities', ar: 'الأنشطة التشغيلية' },
      investing: { en: 'Investing Activities', ar: 'الأنشطة الاستثمارية' },
      financing: { en: 'Financing Activities', ar: 'الأنشطة التمويلية' },
    } as const;
    return locale === 'ar' ? map[s].ar : map[s].en;
  };

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
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تم التحديث (تجريبي)' : 'Refreshed (demo)', 'success')}>
                {locale === 'ar' ? 'تحديث التقرير' : 'Refresh Report'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تشغيلي' : 'Operating'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.operating.toLocaleString()} {locale === 'ar' ? 'ر.س' : 'SAR'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'استثماري' : 'Investing'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.investing.toLocaleString()} {locale === 'ar' ? 'ر.س' : 'SAR'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تمويلي' : 'Financing'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.financing.toLocaleString()} {locale === 'ar' ? 'ر.س' : 'SAR'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'صافي التدفق' : 'Net Cash Flow'}</p>
            <p className="text-2xl font-bold text-emerald-600">{totals.net.toLocaleString()} {locale === 'ar' ? 'ر.س' : 'SAR'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? `الفترة: ${startDate} إلى ${endDate}` : `Period: ${startDate} to ${endDate}`}</p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {(['operating', 'investing', 'financing'] as const).map((section) => {
              const sectionLines = lines.filter((l) => l.section === section);
              const sectionTotal = sectionLines.reduce((s, l) => s + l.amount, 0);
              return (
                <div key={section} className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{sectionTitle(section)}</h3>
                    <span className="font-semibold text-gray-900 dark:text-white">{sectionTotal.toLocaleString()} SAR</span>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البند' : 'Line'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sectionLines.map((l) => (
                          <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 text-gray-900 dark:text-white">{locale === 'ar' ? l.labelAr : l.label}</td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{l.amount.toLocaleString()} {l.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
