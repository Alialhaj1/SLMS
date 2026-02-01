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
import {
  CurrencyDollarIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type ParallelCurrencyStatus = 'active' | 'inactive';

interface ParallelCurrency {
  id: number;
  baseCurrency: 'SAR' | 'USD' | 'EUR';
  parallelCurrency: 'SAR' | 'USD' | 'EUR';
  rate: number;
  effectiveDate: string;
  source: 'manual' | 'provider';
  status: ParallelCurrencyStatus;
}

const mockParallelCurrencies: ParallelCurrency[] = [
  { id: 1, baseCurrency: 'SAR', parallelCurrency: 'USD', rate: 0.2667, effectiveDate: '2025-12-25', source: 'provider', status: 'active' },
  { id: 2, baseCurrency: 'SAR', parallelCurrency: 'EUR', rate: 0.2431, effectiveDate: '2025-12-25', source: 'provider', status: 'active' },
  { id: 3, baseCurrency: 'USD', parallelCurrency: 'EUR', rate: 0.91, effectiveDate: '2025-12-10', source: 'manual', status: 'inactive' },
];

export default function ParallelCurrenciesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.ParallelCurrencies.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.ParallelCurrencies.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.ParallelCurrencies.Edit]);

  const [items] = useState<ParallelCurrency[]>(mockParallelCurrencies);
  const [selectedStatus, setSelectedStatus] = useState<'all' | ParallelCurrencyStatus>('all');
  const [selectedBase, setSelectedBase] = useState<'all' | ParallelCurrency['baseCurrency']>('all');
  const [selected, setSelected] = useState<ParallelCurrency | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const [formData, setFormData] = useState({
    baseCurrency: 'SAR' as ParallelCurrency['baseCurrency'],
    parallelCurrency: 'USD' as ParallelCurrency['parallelCurrency'],
    rate: '',
    effectiveDate: '',
    source: 'provider' as ParallelCurrency['source'],
    status: 'active' as ParallelCurrencyStatus,
  });

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const sOk = selectedStatus === 'all' || i.status === selectedStatus;
      const bOk = selectedBase === 'all' || i.baseCurrency === selectedBase;
      return sOk && bOk;
    });
  }, [items, selectedStatus, selectedBase]);

  const activeCount = items.filter(i => i.status === 'active').length;
  const baseCount = new Set(items.map(i => i.baseCurrency)).size;
  const lastDate = items.reduce((max, i) => (i.effectiveDate > max ? i.effectiveDate : max), items[0]?.effectiveDate || '—');

  const formatRate = (value: number) => {
    const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', { maximumFractionDigits: 6 }).format(value);
    return formatted;
  };

  const getStatusBadge = (status: ParallelCurrencyStatus) => {
    const styles: Record<ParallelCurrencyStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<ParallelCurrencyStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ baseCurrency: 'SAR', parallelCurrency: 'USD', rate: '', effectiveDate: '', source: 'provider', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'العملات الموازية - SLMS' : 'Parallel Currencies - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <CurrencyDollarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض العملات الموازية.' : "You don't have permission to view parallel currencies."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'العملات الموازية - SLMS' : 'Parallel Currencies - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'العملات الموازية' : 'Parallel Currencies'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة أسعار العملات الموازية وتاريخ السريان' : 'Manage parallel currency rates and effective dates'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة سعر' : 'Add Rate'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الروابط النشطة' : 'Active pairs'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عملات الأساس' : 'Base currencies'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{baseCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'آخر تحديث' : 'Last update'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{lastDate}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedBase} onChange={(e) => setSelectedBase(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل عملات الأساس' : 'All base currencies'}</option>
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الأساس' : 'Base'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'موازية' : 'Parallel'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'السعر' : 'Rate'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تاريخ السريان' : 'Effective date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المصدر' : 'Source'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.baseCurrency}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{i.parallelCurrency}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatRate(i.rate)}</td>
                    <td className="px-4 py-3 text-gray-500">{i.effectiveDate}</td>
                    <td className="px-4 py-3 text-gray-500">{i.source === 'provider' ? (locale === 'ar' ? 'مزود' : 'Provider') : (locale === 'ar' ? 'يدوي' : 'Manual')}</td>
                    <td className="px-4 py-3">{getStatusBadge(i.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(i)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل السعر' : 'Rate Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.baseCurrency} → {selected.parallelCurrency}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? 'تاريخ السريان' : 'Effective'}: {selected.effectiveDate}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'السعر' : 'Rate'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatRate(selected.rate)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المصدر' : 'Source'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.source === 'provider' ? (locale === 'ar' ? 'مزود' : 'Provider') : (locale === 'ar' ? 'يدوي' : 'Manual')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              {canEdit && (
                <>
                  <Button onClick={() => showToast(locale === 'ar' ? 'تم التفعيل (تجريبي)' : 'Activated (demo)', 'success')}>
                    <CheckCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'تفعيل' : 'Activate'}
                  </Button>
                  <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم التعطيل (تجريبي)' : 'Deactivated (demo)', 'error')}>
                    <XCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'تعطيل' : 'Deactivate'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'إضافة سعر عملة موازية' : 'Add Parallel Currency Rate'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'عملة الأساس' : 'Base currency'}</label>
              <select value={formData.baseCurrency} onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value as any })} className="input">
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة الموازية' : 'Parallel currency'}</label>
              <select value={formData.parallelCurrency} onChange={(e) => setFormData({ ...formData, parallelCurrency: e.target.value as any })} className="input">
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'السعر' : 'Rate'} value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} inputMode="decimal" placeholder="0.000000" />
            <Input label={locale === 'ar' ? 'تاريخ السريان' : 'Effective date'} value={formData.effectiveDate} onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'المصدر' : 'Source'}</label>
              <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value as any })} className="input">
                <option value="provider">{locale === 'ar' ? 'مزود' : 'Provider'}</option>
                <option value="manual">{locale === 'ar' ? 'يدوي' : 'Manual'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إضافة' : 'Add'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
