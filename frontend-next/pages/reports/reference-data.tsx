import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import { CircleStackIcon, EyeIcon, ArrowDownTrayIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

type RefCategory = 'geographic' | 'logistics' | 'tax' | 'system';

interface ReferenceEntityRow {
  id: number;
  entity: string;
  entityAr: string;
  category: RefCategory;
  total: number;
  active: number;
  inactive: number;
  lastUpdated: string;
  notes: string;
  notesAr: string;
}

const mockRows: ReferenceEntityRow[] = [
  { id: 1, entity: 'Regions', entityAr: 'المناطق', category: 'geographic', total: 32, active: 31, inactive: 1, lastUpdated: '2025-12-12', notes: '1 region archived', notesAr: 'تم أرشفة منطقة واحدة' },
  { id: 2, entity: 'Ports', entityAr: 'الموانئ', category: 'logistics', total: 18, active: 18, inactive: 0, lastUpdated: '2025-12-05', notes: 'All active', notesAr: 'جميعها نشطة' },
  { id: 3, entity: 'Tax Zones', entityAr: 'مناطق الضريبة', category: 'tax', total: 8, active: 7, inactive: 1, lastUpdated: '2025-11-28', notes: 'Review inactive zone', notesAr: 'مراجعة منطقة غير نشطة' },
  { id: 4, entity: 'Address Types', entityAr: 'أنواع العناوين', category: 'system', total: 6, active: 6, inactive: 0, lastUpdated: '2025-12-01', notes: 'Stable', notesAr: 'مستقر' },
];

export default function ReferenceDataReportsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Reports.ReferenceData.View]);
  const canExport = hasAnyPermission([MenuPermissions.Reports.ReferenceData.Export]);

  const [items] = useState<ReferenceEntityRow[]>(mockRows);
  const [category, setCategory] = useState<'all' | RefCategory>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('2025-12-01');
  const [to, setTo] = useState('2025-12-31');
  const [selected, setSelected] = useState<ReferenceEntityRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      const cOk = category === 'all' || r.category === category;
      const qOk = !q || r.entity.toLowerCase().includes(q) || r.entityAr.toLowerCase().includes(q);
      return cOk && qOk;
    });
  }, [items, category, search]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, r) => s + r.total, 0);
    const active = filtered.reduce((s, r) => s + r.active, 0);
    const inactive = filtered.reduce((s, r) => s + r.inactive, 0);
    const completeness = total ? Math.round((active / total) * 100) : 0;
    return { total, active, inactive, completeness };
  }, [filtered]);

  const categoryBadge = (c: RefCategory) => {
    const styles: Record<RefCategory, string> = {
      geographic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      logistics: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      tax: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      system: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<RefCategory, { en: string; ar: string }> = {
      geographic: { en: 'Geographic', ar: 'جغرافي' },
      logistics: { en: 'Logistics', ar: 'لوجستي' },
      tax: { en: 'Tax', ar: 'ضريبي' },
      system: { en: 'System', ar: 'نظام' },
    };
    return <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[c])}>{locale === 'ar' ? labels[c].ar : labels[c].en}</span>;
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'تقارير البيانات المرجعية - SLMS' : 'Reference Data Reports - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <TableCellsIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض تقارير البيانات المرجعية.' : "You don't have permission to view reference data reports."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير البيانات المرجعية - SLMS' : 'Reference Data Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <CircleStackIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'تقارير البيانات المرجعية' : 'Reference Data Reports'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قياس اكتمال وتحديث بيانات الأساس' : 'Measure completeness and freshness of master data'}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input label={locale === 'ar' ? 'من' : 'From'} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label={locale === 'ar' ? 'إلى' : 'To'} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الفئة' : 'Category'}</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="geographic">{locale === 'ar' ? 'جغرافي' : 'Geographic'}</option>
                <option value="logistics">{locale === 'ar' ? 'لوجستي' : 'Logistics'}</option>
                <option value="tax">{locale === 'ar' ? 'ضريبي' : 'Tax'}</option>
                <option value="system">{locale === 'ar' ? 'نظام' : 'System'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث باسم الكيان...' : 'Search entity...'} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{totals.active}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</p>
            <p className="text-2xl font-bold text-amber-600">{totals.inactive}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'اكتمال (تقريبي)' : 'Completeness (est.)'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.completeness}%</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? `الفترة: ${from} إلى ${to}` : `Period: ${from} to ${to}`}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكيان' : 'Entity'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'نشط' : 'Active'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'آخر تحديث' : 'Last Updated'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locale === 'ar' ? r.entityAr : r.entity}</td>
                    <td className="px-4 py-3">{categoryBadge(r.category)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{r.total}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{r.active}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{r.inactive}</td>
                    <td className="px-4 py-3 text-gray-500">{r.lastUpdated}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الكيان' : 'Entity Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{locale === 'ar' ? selected.entityAr : selected.entity}</h3>
              <div className="mt-1">{categoryBadge(selected.category)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.total}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'آخر تحديث' : 'Last Updated'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.lastUpdated}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'نشط' : 'Active'}</p>
                <p className="font-medium text-green-600">{selected.active}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</p>
                <p className="font-medium text-amber-600">{selected.inactive}</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'ملاحظات' : 'Notes'}</p>
              <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.notesAr : selected.notes}</p>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
