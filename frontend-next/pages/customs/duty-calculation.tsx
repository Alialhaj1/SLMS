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
import { CalculatorIcon, EyeIcon } from '@heroicons/react/24/outline';
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

function todayIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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
  const [results, setResults] = useState<CalculationRow[]>([]);
  const [selected, setSelected] = useState<CalculationRow | null>(null);
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
      const res = await apiClient.post<{ success: boolean; data: any }>('/api/customs-duty-calculation', {
        hs_code: hsCode.trim(),
        country_code: countryCode.trim(),
        customs_value: value,
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

      setResults((prev) => [row, ...prev].slice(0, 10));
      showToast(locale === 'ar' ? 'تم الاحتساب بنجاح' : 'Calculated successfully', 'success');
    } catch (e: any) {
      showToast(locale === 'ar' ? 'فشل احتساب الرسوم' : 'Failed to calculate duty', 'error');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{title} - SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
            <CalculatorIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'احتساب الرسوم الجمركية حسب قواعد التعريفة' : 'Calculate customs duty using tariff rules'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Input label={locale === 'ar' ? 'رمز HS' : 'HS Code'} value={hsCode} onChange={(e) => setHsCode(e.target.value)} />
              {canPickHsCodes && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setHsSearch(hsCode || '');
                      setHsPickerOpen(true);
                    }}
                  >
                    {locale === 'ar' ? 'اختيار من القائمة' : 'Pick from list'}
                  </Button>
                </div>
              )}
            </div>
            <Input label={locale === 'ar' ? 'الدولة' : 'Country'} value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
            <Input label={locale === 'ar' ? 'تاريخ التطبيق' : 'Effective Date'} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            <Input label={locale === 'ar' ? 'قيمة جمركية' : 'Customs Value'} value={customsValue} onChange={(e) => setCustomsValue(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleCalculate} loading={calculating} disabled={!canManage || calculating}>
              {locale === 'ar' ? 'احتساب' : 'Calculate'}
            </Button>
            {!canManage && (
              <div className="text-sm text-gray-500 dark:text-gray-400 self-center">
                {locale === 'ar' ? 'صلاحيات الإدارة مطلوبة للميزات المتقدمة' : 'Manage permission required for advanced features'}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">HS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الدولة' : 'Country'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القيمة' : 'Value'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النسبة' : 'Rate'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Duty'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'لا توجد نتائج' : 'No results yet'}
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.hsCode}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? r.hsDescriptionAr || '-' : r.hsDescriptionEn || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.countryCode}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.customsValue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.dutyRatePercent}%</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.dutyAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <div className="text-gray-900 dark:text-white font-medium">HS: {selected.hsCode}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'الوصف' : 'Description'}: {locale === 'ar' ? selected.hsDescriptionAr || '-' : selected.hsDescriptionEn || '-'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'الدولة' : 'Country'}: {selected.countryCode}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'تاريخ التطبيق' : 'Effective date'}: {selected.effectiveDate}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'قيمة جمركية' : 'Customs value'}: {selected.customsValue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.dutyRatePercent}%</div>
            <div className="text-gray-900 dark:text-white font-medium">
              {locale === 'ar' ? 'الرسوم' : 'Duty'}: {selected.dutyAmount.toLocaleString()}
            </div>
            {(selected.notesEn || selected.notesAr) && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? selected.notesAr || '' : selected.notesEn || ''}
              </div>
            )}
          </div>
        )}
      </Modal>

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
