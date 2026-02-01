import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import { ReceiptPercentIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useMasterData } from '../../hooks/useMasterData';

type CustomsDutyRule = {
  id: number;
  hs_code: string;
  hs_description_en?: string | null;
  hs_description_ar?: string | null;
  country_code: string;
  duty_rate_percent: number;
  effective_from: string;
  effective_to?: string | null;
  notes_en?: string | null;
  notes_ar?: string | null;
  rule_type?: 'DUTY' | 'EXEMPT' | 'PROHIBITED';
};

export default function MasterCustomsDutiesPage() {
  const { locale } = useTranslation();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([
    MenuPermissions.MasterData.CustomsDuties.View,
    MenuPermissions.Logistics.CustomsTariffs.View,
  ]);

  const { data: items, loading, fetchList, pagination } = useMasterData<CustomsDutyRule>({
    endpoint: '/api/customs-duties',
  });

  const [search, setSearch] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [selected, setSelected] = useState<CustomsDutyRule | null>(null);

  useEffect(() => {
    if (!canView) return;
    const timeout = setTimeout(() => {
      fetchList({
        search,
        page: 1,
        pageSize,
        filters: {
          country_code: countryCode || undefined,
          effective_date: effectiveDate || undefined,
        },
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [canView, countryCode, effectiveDate, fetchList, pageSize, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'الرسوم الجمركية - SLMS' : 'Customs Duties - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <ReceiptPercentIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الرسوم الجمركية - SLMS' : 'Customs Duties - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <ReceiptPercentIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'الرسوم الجمركية' : 'Customs Duties'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'قواعد الرسوم الحالية حسب HS والدولة' : 'Current effective duty rules by HS code and country'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label={locale === 'ar' ? 'بحث' : 'Search'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === 'ar' ? 'HS أو الوصف...' : 'HS or description...'}
            />
            <Input
              label={locale === 'ar' ? 'الدولة (اختياري)' : 'Country (optional)'}
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              placeholder={locale === 'ar' ? 'مثال: SA' : 'e.g., SA'}
            />
            <Input
              label={locale === 'ar' ? 'تاريخ السريان (اختياري)' : 'Effective date (optional)'}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'عدد الصفوف' : 'Rows'}
              </label>
              <select
                className="input w-full"
                value={String(pageSize)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'ALL') {
                    const allCount = pagination.totalItems || 1000;
                    setPageSize(allCount);
                    fetchList({
                      search,
                      page: 1,
                      pageSize: allCount,
                      filters: { country_code: countryCode || undefined, effective_date: effectiveDate || undefined },
                    });
                  } else {
                    const next = Number(v);
                    setPageSize(next);
                    fetchList({
                      search,
                      page: 1,
                      pageSize: next,
                      filters: { country_code: countryCode || undefined, effective_date: effectiveDate || undefined },
                    });
                  }
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="ALL">{locale === 'ar' ? 'الكل' : 'All'}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">HS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الدولة' : 'Country'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النسبة' : 'Rate'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'بدء النفاذ' : 'Effective'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'لا توجد بيانات' : 'No data'}
                  </td>
                </tr>
              ) : (
                items.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.hs_code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? d.hs_description_ar || '-' : d.hs_description_en || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{d.country_code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{d.rule_type || 'DUTY'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{d.duty_rate_percent}%</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{d.effective_from}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(d)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {locale === 'ar'
                ? `الصفحة ${pagination.currentPage} من ${pagination.totalPages} • الإجمالي ${pagination.totalItems}`
                : `Page ${pagination.currentPage} of ${pagination.totalPages} • Total ${pagination.totalItems}`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={loading || pagination.currentPage <= 1}
                onClick={() =>
                  fetchList({
                    page: pagination.currentPage - 1,
                    search,
                    pageSize,
                    filters: { country_code: countryCode || undefined, effective_date: effectiveDate || undefined },
                  })
                }
              >
                {locale === 'ar' ? 'السابق' : 'Prev'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={loading || pagination.currentPage >= pagination.totalPages}
                onClick={() =>
                  fetchList({
                    page: pagination.currentPage + 1,
                    search,
                    pageSize,
                    filters: { country_code: countryCode || undefined, effective_date: effectiveDate || undefined },
                  })
                }
              >
                {locale === 'ar' ? 'التالي' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <div className="text-gray-900 dark:text-white font-medium">{selected.hs_code}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{locale === 'ar' ? selected.hs_description_ar || '-' : selected.hs_description_en || '-'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الدولة' : 'Country'}: {selected.country_code}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'النوع' : 'Type'}: {selected.rule_type || 'DUTY'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'النسبة' : 'Rate'}: {selected.duty_rate_percent}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'بدء النفاذ' : 'Effective from'}: {selected.effective_from}</div>
            {selected.effective_to && <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'انتهاء النفاذ' : 'Effective to'}: {selected.effective_to}</div>}
            {(selected.notes_en || selected.notes_ar) && (
              <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? selected.notes_ar : selected.notes_en}</div>
            )}
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
