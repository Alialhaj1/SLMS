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
  ClockIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type DeferredStatus = 'active' | 'recognized' | 'cancelled';

interface DeferredRevenue {
  id: number;
  reference: string;
  customer: string;
  customerAr: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  remainingMonths: number;
  status: DeferredStatus;
}

const mockItems: DeferredRevenue[] = [
  { id: 1, reference: 'DEFREV-2025-0003', customer: 'ACME Trading', customerAr: 'شركة أكمي للتجارة', amount: 18000, currency: 'SAR', startDate: '2025-01-01', endDate: '2025-12-31', remainingMonths: 10, status: 'active' },
  { id: 2, reference: 'DEFREV-2024-0014', customer: 'Blue Port Logistics', customerAr: 'بلو بورت لوجستكس', amount: 9000, currency: 'SAR', startDate: '2024-06-01', endDate: '2024-11-30', remainingMonths: 0, status: 'recognized' },
  { id: 3, reference: 'DEFREV-2025-0006', customer: 'Gulf Retail', customerAr: 'جلف ريتيل', amount: 12000, currency: 'SAR', startDate: '2025-03-01', endDate: '2025-08-31', remainingMonths: 6, status: 'active' },
];

export default function DeferredRevenuePage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Accounting.DeferredRevenue.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Accounting.DeferredRevenue.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Accounting.DeferredRevenue.Edit]);

  const [items] = useState<DeferredRevenue[]>(mockItems);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | DeferredStatus>('all');
  const [selected, setSelected] = useState<DeferredRevenue | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    reference: '',
    customer: '',
    customerAr: '',
    amount: '0',
    currency: 'SAR',
    startDate: '',
    endDate: '',
  });

  const statusBadge = (s: DeferredStatus) => {
    const styles: Record<DeferredStatus, string> = {
      active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      recognized: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<DeferredStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      recognized: { en: 'Recognized', ar: 'معترف به' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[s])}>
        {locale === 'ar' ? labels[s].ar : labels[s].en}
      </span>
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const sOk = status === 'all' || i.status === status;
      const qOk =
        !q ||
        i.reference.toLowerCase().includes(q) ||
        i.customer.toLowerCase().includes(q) ||
        i.customerAr.toLowerCase().includes(q);
      return sOk && qOk;
    });
  }, [items, search, status]);

  const totalCount = items.length;
  const activeCount = items.filter((i) => i.status === 'active').length;
  const remainingAmount = items
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + (i.amount * (i.remainingMonths / 12)), 0);

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تمت الإضافة (تجريبي)' : 'Added (demo)', 'success');
    setCreateOpen(false);
    setFormData({ reference: '', customer: '', customerAr: '', amount: '0', currency: 'SAR', startDate: '', endDate: '' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'الإيرادات المؤجلة - SLMS' : 'Deferred Revenue - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <ClockIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض الإيرادات المؤجلة.' : "You don't have permission to view deferred revenue."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الإيرادات المؤجلة - SLMS' : 'Deferred Revenue - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
              <ClockIcon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'الإيرادات المؤجلة' : 'Deferred Revenue'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متابعة الإيرادات التي يتم الاعتراف بها على فترات' : 'Track revenue recognized over time'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'قيد جديد' : 'New Entry'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المتبقي (تقديري)' : 'Remaining (est.)'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{remainingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {locale === 'ar' ? 'ر.س' : 'SAR'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-80">
                <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالمرجع أو العميل...' : 'Search by reference or customer...'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                  <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                  <option value="recognized">{locale === 'ar' ? 'معترف به' : 'Recognized'}</option>
                  <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                </select>
              </div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرجع' : 'Reference'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'من' : 'From'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إلى' : 'To'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'أشهر متبقية' : 'Remaining Months'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.reference}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? i.customerAr : i.customer}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{i.amount.toLocaleString()} {i.currency}</td>
                    <td className="px-4 py-3 text-gray-500">{i.startDate}</td>
                    <td className="px-4 py-3 text-gray-500">{i.endDate}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{i.remainingMonths}</td>
                    <td className="px-4 py-3">{statusBadge(i.status)}</td>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل القيد' : 'Entry Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.reference}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.customerAr : selected.customer}</p>
              </div>
              {statusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.amount.toLocaleString()} {selected.currency}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'أشهر متبقية' : 'Remaining Months'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.remainingMonths}</p>
              </div>
            </div>

            {canEdit && (
              <div className="pt-4 border-t dark:border-gray-700">
                <Button onClick={() => showToast(locale === 'ar' ? 'تم التحديث (تجريبي)' : 'Updated (demo)', 'success')}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'تحديث' : 'Update'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'قيد إيراد مؤجل' : 'New Deferred Revenue'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'المرجع' : 'Reference'} value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="DEFREV-2025-0009" />
            <Input label={locale === 'ar' ? 'العملة' : 'Currency'} value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} placeholder="SAR" />
            <Input label={locale === 'ar' ? 'العميل (EN)' : 'Customer (EN)'} value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} />
            <Input label={locale === 'ar' ? 'العميل (AR)' : 'Customer (AR)'} value={formData.customerAr} onChange={(e) => setFormData({ ...formData, customerAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'المبلغ' : 'Amount'} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            <Input label={locale === 'ar' ? 'من' : 'From'} type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            <Input label={locale === 'ar' ? 'إلى' : 'To'} type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
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
