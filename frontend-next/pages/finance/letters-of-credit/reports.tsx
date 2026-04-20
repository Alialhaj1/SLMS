/**
 * 📊 LC REPORTS PAGE — تقارير الاعتمادات المستندية
 * =================================================
 * Dashboard with charts and summary tables from GET /reports/summary
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  ArrowLeftIcon, ArrowRightIcon, ArrowPathIcon,
  ChartBarIcon, BanknotesIcon, BuildingLibraryIcon,
  ClockIcon, CalendarIcon, CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const API = '/api';

const SC: Record<string, { icon: string; color: string; bg: string }> = {
  DRAFT: { icon: '📝', color: 'text-slate-600', bg: 'bg-slate-100' },
  REQUESTED: { icon: '📤', color: 'text-blue-600', bg: 'bg-blue-100' },
  ISSUED: { icon: '✅', color: 'text-teal-600', bg: 'bg-teal-100' },
  ADVISED: { icon: '📨', color: 'text-cyan-600', bg: 'bg-cyan-100' },
  CONFIRMED: { icon: '🔒', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  AMENDED: { icon: '✏️', color: 'text-purple-600', bg: 'bg-purple-100' },
  DOCUMENTS_PRESENTED: { icon: '📎', color: 'text-amber-600', bg: 'bg-amber-100' },
  DISCREPANT: { icon: '⚠️', color: 'text-orange-600', bg: 'bg-orange-100' },
  PAID: { icon: '💰', color: 'text-green-600', bg: 'bg-green-100' },
  CLOSED: { icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  CANCELLED: { icon: '🚫', color: 'text-red-600', bg: 'bg-red-100' },
  EXPIRED: { icon: '⏰', color: 'text-gray-600', bg: 'bg-gray-100' },
};

export default function LCReportsPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';
  const canView = hasPermission('letters_of_credit:view');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('accessToken');
  const h = () => ({ Authorization: `Bearer ${token()}` });

  const fmt = (n: number, c = 'SAR') => {
    try { return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', { style: 'currency', currency: c || 'SAR', minimumFractionDigits: 2 }).format(n || 0); }
    catch { return `${(n || 0).toFixed(2)} ${c}`; }
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/letters-of-credit/reports/summary`, { headers: h() });
      if (res.ok) { const d = await res.json(); setData(d.data); }
      else { showToast('Failed to load report', 'error'); }
    } catch { showToast('Failed', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const Card = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );

  const BarVisual = ({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
      </div>
    </div>
  );

  if (!canView) return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-red-600 font-semibold">{isRTL ? 'ليس لديك صلاحية لعرض هذه الصفحة' : 'You do not have permission to view this page'}</p>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <Head><title>{isRTL ? 'تقارير الاعتمادات' : 'LC Reports'} - SLMS</title></Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/finance/letters-of-credit')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              {isRTL ? <ArrowRightIcon className="h-5 w-5" /> : <ArrowLeftIcon className="h-5 w-5" />}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isRTL ? '📊 تقارير الاعتمادات المستندية' : '📊 LC Reports & Analytics'}</h1>
              <p className="text-sm text-gray-500 mt-1">{isRTL ? 'ملخص شامل' : 'Comprehensive Summary'}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={fetchReport} loading={loading}><ArrowPathIcon className="h-4 w-4" /> {isRTL ? 'تحديث' : 'Refresh'}</Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
        ) : !data ? (
          <p className="text-center text-gray-500 py-10">{isRTL ? 'لا توجد بيانات' : 'No data available'}</p>
        ) : (
          <div className="space-y-6">
            {/* By Status */}
            <Card title={isRTL ? 'حسب الحالة' : 'By Status'} icon={<ChartBarIcon className="h-5 w-5" />}>
              {(!data.by_status || data.by_status.length === 0) ? (
                <p className="text-center text-gray-500 py-4">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
              ) : (
                <div className="space-y-3">
                  {(() => { const maxCount = Math.max(...data.by_status.map((s: any) => Number(s.count) || 0)); return data.by_status.map((s: any) => {
                    const cfg = SC[s.status_code] || { icon: '📄', color: 'text-gray-600', bg: 'bg-gray-100' };
                    return (
                      <div key={s.status_code} className="flex items-center gap-3">
                        <div className="w-36 sm:w-44 flex items-center gap-2 flex-shrink-0">
                          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', cfg.bg, cfg.color)}>{cfg.icon} {isRTL ? (s.status_name_ar || s.status_code) : (s.status_name || s.status_code)}</span>
                        </div>
                        <div className="flex-1"><BarVisual value={Number(s.count)} max={maxCount} color={cfg.bg.replace('bg-', 'bg-').replace('100', '500')} /></div>
                        <div className="w-12 text-end text-sm font-bold">{s.count}</div>
                        <div className="w-28 text-end text-xs text-gray-500">{fmt(Number(s.total_original) || 0)}</div>
                      </div>
                    );
                  }); })()}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Currency */}
              <Card title={isRTL ? 'حسب العملة' : 'By Currency'} icon={<CurrencyDollarIcon className="h-5 w-5" />}>
                {(!data.by_currency || data.by_currency.length === 0) ? (
                  <p className="text-center text-gray-500 py-4">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{isRTL ? 'العملة' : 'Currency'}</th>
                        <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isRTL ? 'العدد' : 'Count'}</th>
                        <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isRTL ? 'المبلغ' : 'Amount'}</th>
                        <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isRTL ? 'المستخدم' : 'Utilized'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {data.by_currency.map((c: any) => (
                        <tr key={c.currency_code}>
                          <td className="px-3 py-2 font-medium">{c.currency_code}</td>
                          <td className="px-3 py-2 text-end">{c.count}</td>
                          <td className="px-3 py-2 text-end font-medium">{fmt(Number(c.total_amount), c.currency_code)}</td>
                          <td className="px-3 py-2 text-end text-amber-600">{fmt(Number(c.total_utilized), c.currency_code)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              {/* By Bank */}
              <Card title={isRTL ? 'حسب البنك' : 'By Bank'} icon={<BuildingLibraryIcon className="h-5 w-5" />}>
                {(!data.by_bank || data.by_bank.length === 0) ? (
                  <p className="text-center text-gray-500 py-4">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{isRTL ? 'البنك' : 'Bank'}</th>
                        <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isRTL ? 'العدد' : 'Count'}</th>
                        <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isRTL ? 'المبلغ' : 'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {data.by_bank.map((b: any) => (
                        <tr key={b.bank_name}>
                          <td className="px-3 py-2 font-medium">{b.bank_name}</td>
                          <td className="px-3 py-2 text-end">{b.count}</td>
                          <td className="px-3 py-2 text-end font-medium">{fmt(Number(b.total_amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expiry Aging */}
              <Card title={isRTL ? 'فترات الانتهاء' : 'Expiry Aging'} icon={<ClockIcon className="h-5 w-5" />}>
                {(!data.expiry_aging || data.expiry_aging.length === 0) ? (
                  <p className="text-center text-gray-500 py-4">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
                ) : (
                  <div className="space-y-3">
                    {data.expiry_aging.map((b: any) => {
                      const colors: Record<string, string> = { expired: 'bg-red-500', within_7_days: 'bg-orange-500', within_30_days: 'bg-amber-500', within_60_days: 'bg-yellow-500', over_60_days: 'bg-green-500' };
                      const labels: Record<string, string> = isRTL
                        ? { expired: 'منتهي', within_7_days: '0-7 يوم', within_30_days: '8-30 يوم', within_60_days: '31-60 يوم', over_60_days: '+60 يوم' }
                        : { expired: 'Expired', within_7_days: '0-7 days', within_30_days: '8-30 days', within_60_days: '31-60 days', over_60_days: '60+ days' };
                      return (
                        <div key={b.aging_category} className="flex items-center gap-3">
                          <span className="w-24 text-sm font-medium">{labels[b.aging_category] || b.aging_category}</span>
                          <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                            <div className={clsx('h-full rounded flex items-center px-2 text-white text-xs font-bold', colors[b.aging_category] || 'bg-gray-500')} style={{ width: `${Math.max(5, Number(b.count) * 10)}%` }}>{b.count}</div>
                          </div>
                          <span className="w-28 text-end text-xs text-gray-500">{fmt(Number(b.total_amount))}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Fees Summary */}
              <Card title={isRTL ? 'ملخص الرسوم' : 'Fees Summary'} icon={<BanknotesIcon className="h-5 w-5" />}>
                {(!data.fees_summary || Number(data.fees_summary.grand_total_fees) === 0) ? (
                  <p className="text-center text-gray-500 py-4">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex justify-between mb-3">
                      <span className="font-bold text-lg">{isRTL ? 'إجمالي الرسوم' : 'Grand Total'}</span>
                      <span className="font-bold text-purple-600 text-lg">{fmt(Number(data.fees_summary.grand_total_fees))}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded"><span className="text-gray-500">{isRTL ? 'عمولة الفتح' : 'Opening Commission'}</span><span className="font-medium">{fmt(Number(data.fees_summary.total_opening_commission))}</span></div>
                      <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded"><span className="text-gray-500">{isRTL ? 'رسوم التعديل' : 'Amendment Fees'}</span><span className="font-medium">{fmt(Number(data.fees_summary.total_amendment_fees))}</span></div>
                      <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded"><span className="text-gray-500">{isRTL ? 'رسوم SWIFT' : 'SWIFT Charges'}</span><span className="font-medium">{fmt(Number(data.fees_summary.total_swift_charges))}</span></div>
                      <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded"><span className="text-gray-500">{isRTL ? 'رسوم أخرى' : 'Other Charges'}</span><span className="font-medium">{fmt(Number(data.fees_summary.total_other_charges))}</span></div>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card title={isRTL ? 'الاتجاه الشهري' : 'Monthly Trend'} icon={<CalendarIcon className="h-5 w-5" />}>
              {(!data.monthly_trend || data.monthly_trend.length === 0) ? (
                <p className="text-center text-gray-500 py-4">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{isRTL ? 'الشهر' : 'Month'}</th>
                        <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isRTL ? 'عدد جديد' : 'New LCs'}</th>
                        <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isRTL ? 'المبلغ' : 'Amount'}</th>
                        <th className="px-3 py-2 text-xs font-medium text-gray-500">{isRTL ? 'النسبة' : 'Trend'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(() => { const maxAmt = Math.max(...data.monthly_trend.map((m: any) => Number(m.total_amount) || 0)); return data.monthly_trend.map((m: any) => (
                        <tr key={m.month}>
                          <td className="px-3 py-2 font-medium">{m.month}</td>
                          <td className="px-3 py-2 text-end">{m.count}</td>
                          <td className="px-3 py-2 text-end font-medium">{fmt(Number(m.total_amount))}</td>
                          <td className="px-3 py-2">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${maxAmt > 0 ? (Number(m.total_amount) / maxAmt) * 100 : 0}%` }} />
                            </div>
                          </td>
                        </tr>
                      )); })()}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
