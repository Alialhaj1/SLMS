import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  CalculatorIcon, ArrowPathIcon, ClockIcon, TrashIcon,
  CurrencyDollarIcon, ReceiptPercentIcon, TruckIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '../../lib/apiClient';
import { useMasterData } from '../../hooks/useMasterData';

type CalculationRow = {
  id: number;
  hsCode: string;
  hsDescriptionEn?: string | null;
  hsDescriptionAr?: string | null;
  countryCode: string;
  effectiveDate: string;
  customsValue: number;
  dutyRatePercent: number;
  dutyAmount: number;
  ruleType?: 'DUTY' | 'EXEMPT' | 'PROHIBITED' | 'UNKNOWN';
  notesEn?: string | null;
  notesAr?: string | null;
};

type HSCode = {
  id: number;
  code: string;
  description_en: string;
  description_ar: string;
  is_active: boolean;
};

const VAT_RATE = 15; // Saudi Arabia VAT

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function fmt(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function DutyCalculationPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.DutyCalculation.View]);
  const canManage = hasAnyPermission([MenuPermissions.Logistics.DutyCalculation.Manage]);
  const canPickHsCodes = hasAnyPermission([MenuPermissions.Logistics.HSCodes.View]);

  const { data: hsCodes, loading: hsLoading, fetchList: fetchHsCodes, pagination: hsPagination } = useMasterData<HSCode>({
    endpoint: '/api/hs-codes',
  });

  const [hsCode, setHsCode] = useState('');
  const [countryCode, setCountryCode] = useState('SA');
  const [effectiveDate, setEffectiveDate] = useState(todayIso());
  const [customsValue, setCustomsValue] = useState('');
  const [freightCost, setFreightCost] = useState('');
  const [insuranceCost, setInsuranceCost] = useState('');
  const [results, setResults] = useState<CalculationRow[]>([]);
  const [calculating, setCalculating] = useState(false);

  const [hsPickerOpen, setHsPickerOpen] = useState(false);
  const [hsSearch, setHsSearch] = useState('');
  const [hsPageSize, setHsPageSize] = useState<number>(20);

  const title = t('menu.logistics.customsDuties.calculation');

  useEffect(() => {
    if (!router.isReady) return;

    const qHs = router.query.hs_code;
    if (typeof qHs === 'string' && qHs.trim() && !hsCode) {
      setHsCode(qHs.trim());
    }

    const qCountry = router.query.country_code;
    if (typeof qCountry === 'string' && qCountry.trim()) {
      setCountryCode(qCountry.trim());
    }

    const qDate = router.query.effective_date;
    if (typeof qDate === 'string' && qDate.trim()) {
      setEffectiveDate(qDate.trim());
    }

    const qValue = router.query.customs_value;
    if (typeof qValue === 'string' && qValue.trim()) {
      setCustomsValue(qValue.trim());
    }
  }, [router.isReady, router.query.country_code, router.query.customs_value, router.query.effective_date, router.query.hs_code, hsCode]);

  useEffect(() => {
    if (!hsPickerOpen || !canPickHsCodes) return;
    const timeout = setTimeout(() => {
      fetchHsCodes({ search: hsSearch, page: 1, pageSize: hsPageSize, filters: { is_active: true } });
    }, 250);
    return () => clearTimeout(timeout);
  }, [canPickHsCodes, fetchHsCodes, hsPageSize, hsPickerOpen, hsSearch]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <CalculatorIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  const handleCalculate = async () => {
    if (!canManage) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }

    const value = Number(customsValue);
    if (!hsCode.trim() || !countryCode.trim() || !Number.isFinite(value) || value <= 0) {
      showToast(locale === 'ar' ? 'الرجاء إدخال البيانات بشكل صحيح' : 'Please enter valid inputs', 'error');
      return;
    }

    setCalculating(true);
    try {
      // Duty should be calculated on CIF value (goods + freight + insurance)
      const cifTotal = value + (Number(freightCost) || 0) + (Number(insuranceCost) || 0);
      const res = await apiClient.post<{ success: boolean; data: any }>('/api/customs-duty-calculation', {
        hs_code: hsCode.trim(),
        country_code: countryCode.trim(),
        customs_value: cifTotal,
        effective_date: effectiveDate,
      });

      const d = (res as any)?.data ?? (res as any);
      const row: CalculationRow = {
        id: Date.now(),
        hsCode: d.hs_code,
        hsDescriptionEn: d.hs_description_en,
        hsDescriptionAr: d.hs_description_ar,
        countryCode: d.country_code,
        effectiveDate: d.effective_date,
        customsValue: d.customs_value,
        dutyRatePercent: d.duty_rate_percent,
        dutyAmount: d.duty_amount,
        ruleType: d.rule_type,
        notesEn: d.notes_en,
        notesAr: d.notes_ar,
      };

      setResults((prev) => [row, ...prev].slice(0, 20));
      showToast(locale === 'ar' ? 'تم الاحتساب بنجاح' : 'Calculated successfully', 'success');
    } catch (e: any) {
      const errData = e?.data?.error || {};
      let msg = locale === 'ar' ? 'فشل احتساب الرسوم' : 'Failed to calculate duty';
      if (e?.status === 404) {
        const hsMatches = errData.hs_code_matches;
        if (hsMatches && hsMatches.length > 0) {
          const codes = hsMatches.map((h: any) => h.code).join(', ');
          msg = locale === 'ar'
            ? `لا يوجد تعريفة. رموز HS مشابهة: ${codes}`
            : `No tariff found. Similar HS codes: ${codes}`;
        } else {
          msg = locale === 'ar'
            ? 'لا يوجد تعريفة جمركية مطابقة لهذا الرمز/الدولة/التاريخ'
            : 'No applicable tariff rule found for this HS/country/date';
        }
      }
      showToast(msg, 'error');
    } finally {
      setCalculating(false);
    }
  };

  const reuseCalc = (r: CalculationRow) => {
    setHsCode(r.hsCode);
    setCountryCode(r.countryCode);
    setCustomsValue(String(r.customsValue));
    setEffectiveDate(r.effectiveDate);
  };

  // Derived calculations
  const latestResult = results[0] || null;
  const cifValue = (Number(customsValue) || 0) + (Number(freightCost) || 0) + (Number(insuranceCost) || 0);
  const dutyAmt = latestResult ? latestResult.dutyAmount : 0;
  const vatBase = cifValue + dutyAmt;
  const vatAmount = vatBase * (VAT_RATE / 100);
  const totalLanding = cifValue + dutyAmt + vatAmount;

  return (
    <MainLayout>
      <Head><title>{title} - SLMS</title></Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <CalculatorIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'احتساب شامل: رسوم + ضريبة + تكاليف الإنزال' : 'Full calculation: duty + VAT + landed cost'}
            </p>
          </div>
        </div>

        {/* Split Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Inputs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <TruckIcon className="h-4 w-4" /> {locale === 'ar' ? 'بيانات الشحنة' : 'Shipment Data'}
              </h2>
              <div>
                <Input label={locale === 'ar' ? 'رمز HS' : 'HS Code'} value={hsCode} onChange={(e: any) => setHsCode(e.target.value)} />
                {canPickHsCodes && (
                  <button onClick={() => { setHsSearch(hsCode || ''); setHsPickerOpen(true); }}
                    className="text-xs text-indigo-600 hover:underline mt-1">
                    {locale === 'ar' ? 'اختيار من القائمة' : 'Pick from list'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label={locale === 'ar' ? 'الدولة' : 'Country'} value={countryCode} onChange={(e: any) => setCountryCode(e.target.value)} />
                <Input label={locale === 'ar' ? 'التاريخ' : 'Date'} type="date" value={effectiveDate} onChange={(e: any) => setEffectiveDate(e.target.value)} />
              </div>

              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 pt-2 border-t dark:border-gray-600">
                <CurrencyDollarIcon className="h-4 w-4" /> CIF {locale === 'ar' ? 'التفصيل' : 'Breakdown'}
              </h2>
              <Input label={locale === 'ar' ? 'قيمة البضاعة (FOB)' : 'Goods Value (FOB)'} type="number" value={customsValue} onChange={(e: any) => setCustomsValue(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={locale === 'ar' ? 'الشحن' : 'Freight'} type="number" value={freightCost} onChange={(e: any) => setFreightCost(e.target.value)} />
                <Input label={locale === 'ar' ? 'التأمين' : 'Insurance'} type="number" value={insuranceCost} onChange={(e: any) => setInsuranceCost(e.target.value)} />
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{locale === 'ar' ? 'إجمالي CIF' : 'Total CIF'}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{fmt(cifValue)}</span>
                </div>
              </div>

              <Button onClick={handleCalculate} loading={calculating} disabled={!canManage || calculating} className="w-full">
                <CalculatorIcon className="h-4 w-4 mr-1" />
                {locale === 'ar' ? 'احتساب الرسوم' : 'Calculate Duty'}
              </Button>
            </div>
          </div>

          {/* RIGHT: Results */}
          <div className="lg:col-span-3 space-y-4">
            {/* Result Cards */}
            {latestResult ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: locale === 'ar' ? 'قيمة CIF' : 'CIF Value', value: fmt(cifValue), icon: TruckIcon, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                  { label: locale === 'ar' ? 'الرسوم' : 'Duty', value: `${fmt(dutyAmt)} (${latestResult.dutyRatePercent}%)`, icon: ReceiptPercentIcon, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
                  { label: `VAT (${VAT_RATE}%)`, value: fmt(vatAmount), icon: ReceiptPercentIcon, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
                  { label: locale === 'ar' ? 'تكلفة الإنزال' : 'Landed Cost', value: fmt(totalLanding), icon: CurrencyDollarIcon, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
                ].map((card, i) => (
                  <div key={i} className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${card.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <card.icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{card.label}</span>
                    </div>
                    <div className="text-lg font-bold">{card.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <CalculatorIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">{locale === 'ar' ? 'أدخل البيانات واضغط احتساب' : 'Enter data and click Calculate'}</p>
              </div>
            )}

            {/* Latest result detail */}
            {latestResult && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {locale === 'ar' ? 'تفاصيل آخر احتساب' : 'Latest Calculation Details'}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">HS:</span> <span className="font-mono font-medium text-gray-900 dark:text-white">{latestResult.hsCode}</span></div>
                  <div><span className="text-gray-500">{locale === 'ar' ? 'الوصف' : 'Desc'}:</span> <span className="text-gray-900 dark:text-white">{locale === 'ar' ? latestResult.hsDescriptionAr || '—' : latestResult.hsDescriptionEn || '—'}</span></div>
                  <div><span className="text-gray-500">{locale === 'ar' ? 'الدولة' : 'Country'}:</span> <span className="text-gray-900 dark:text-white">{latestResult.countryCode}</span></div>
                  <div><span className="text-gray-500">{locale === 'ar' ? 'النوع' : 'Rule'}:</span>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      latestResult.ruleType === 'DUTY' ? 'bg-amber-100 text-amber-700' :
                      latestResult.ruleType === 'EXEMPT' ? 'bg-emerald-100 text-emerald-700' :
                      latestResult.ruleType === 'PROHIBITED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{latestResult.ruleType || 'UNKNOWN'}</span>
                  </div>
                </div>
                {(latestResult.notesEn || latestResult.notesAr) && (
                  <p className="mt-2 text-xs text-gray-500 italic">{locale === 'ar' ? latestResult.notesAr : latestResult.notesEn}</p>
                )}

                {/* Cost breakdown table */}
                <div className="mt-4 border-t dark:border-gray-700 pt-3">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        [locale === 'ar' ? 'قيمة البضاعة (FOB)' : 'FOB Value', fmt(Number(customsValue) || 0)],
                        [locale === 'ar' ? 'الشحن' : 'Freight', fmt(Number(freightCost) || 0)],
                        [locale === 'ar' ? 'التأمين' : 'Insurance', fmt(Number(insuranceCost) || 0)],
                        [locale === 'ar' ? 'إجمالي CIF' : 'CIF Total', fmt(cifValue)],
                        [`${locale === 'ar' ? 'الرسوم الجمركية' : 'Customs Duty'} (${latestResult.dutyRatePercent}%)`, fmt(dutyAmt)],
                        [`VAT (${VAT_RATE}%)`, fmt(vatAmount)],
                      ].map(([label, val], i) => (
                        <tr key={i} className="border-b dark:border-gray-700/50">
                          <td className="py-1.5 text-gray-600 dark:text-gray-400">{label}</td>
                          <td className="py-1.5 text-right font-mono text-gray-900 dark:text-white">{val}</td>
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td className="py-2 text-gray-900 dark:text-white">{locale === 'ar' ? 'إجمالي تكلفة الإنزال' : 'Total Landed Cost'}</td>
                        <td className="py-2 text-right font-mono text-emerald-600">{fmt(totalLanding)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* History */}
            {results.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" /> {locale === 'ar' ? 'سجل الاحتسابات' : 'Calculation History'} ({results.length})
                  </h3>
                  <button onClick={() => setResults([])} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                    <TrashIcon className="h-3 w-3" /> {locale === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        {['HS', locale === 'ar' ? 'الدولة' : 'Country', locale === 'ar' ? 'القيمة' : 'Value', locale === 'ar' ? 'النسبة' : 'Rate', locale === 'ar' ? 'الرسوم' : 'Duty', ''].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {results.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-2 text-sm font-mono font-medium text-gray-900 dark:text-white">{r.hsCode}</td>
                          <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.countryCode}</td>
                          <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{fmt(r.customsValue)}</td>
                          <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.dutyRatePercent}%</td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">{fmt(r.dutyAmount)}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => reuseCalc(r)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                              <ArrowPathIcon className="h-3 w-3" /> {locale === 'ar' ? 'إعادة' : 'Reuse'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={hsPickerOpen}
        onClose={() => setHsPickerOpen(false)}
        title={locale === 'ar' ? 'اختيار رمز HS' : 'Pick HS Code'}
        size="lg"
      >
        <div className="space-y-3">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={hsSearch}
            onChange={(e) => setHsSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'رمز أو وصف...' : 'Code or description...'}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {locale === 'ar' ? 'عدد الصفوف' : 'Rows'}
              </div>
              <select
                className="input"
                value={String(hsPageSize)}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setHsPageSize(next);
                  fetchHsCodes({ search: hsSearch, page: 1, pageSize: next, filters: { is_active: true } });
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {locale === 'ar'
                ? `الصفحة ${hsPagination.currentPage} من ${hsPagination.totalPages}`
                : `Page ${hsPagination.currentPage} of ${hsPagination.totalPages}`}
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">HS</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {hsLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                    </td>
                  </tr>
                ) : hsCodes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'لا توجد نتائج' : 'No results'}
                    </td>
                  </tr>
                ) : (
                  hsCodes.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{r.code}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">
                        {locale === 'ar' ? r.description_ar : r.description_en}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setHsCode(r.code);
                            setHsPickerOpen(false);
                          }}
                        >
                          {locale === 'ar' ? 'اختيار' : 'Select'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={hsLoading || hsPagination.currentPage <= 1}
              onClick={() =>
                fetchHsCodes({
                  search: hsSearch,
                  page: hsPagination.currentPage - 1,
                  pageSize: hsPageSize,
                  filters: { is_active: true },
                })
              }
            >
              {locale === 'ar' ? 'السابق' : 'Prev'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={hsLoading || hsPagination.currentPage >= hsPagination.totalPages}
              onClick={() =>
                fetchHsCodes({
                  search: hsSearch,
                  page: hsPagination.currentPage + 1,
                  pageSize: hsPageSize,
                  filters: { is_active: true },
                })
              }
            >
              {locale === 'ar' ? 'التالي' : 'Next'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
