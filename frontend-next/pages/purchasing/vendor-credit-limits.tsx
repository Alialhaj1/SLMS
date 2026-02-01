import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  ShieldCheckIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type CreditStatus = 'ok' | 'warning' | 'exceeded' | 'locked';

interface VendorCredit {
  id: number;
  vendor: string;
  vendorAr: string;
  limit: number;
  exposure: number;
  paymentTermsDays: number;
  status: CreditStatus;
  lastReviewed: string;
}

const mockVendorCredits: VendorCredit[] = [
  { id: 1, vendor: 'Gulf Supplies', vendorAr: 'إمدادات الخليج', limit: 300000, exposure: 140000, paymentTermsDays: 30, status: 'ok', lastReviewed: '2025-12-01' },
  { id: 2, vendor: 'Blue Freight Co.', vendorAr: 'شركة الشحن الأزرق', limit: 200000, exposure: 175000, paymentTermsDays: 45, status: 'warning', lastReviewed: '2025-11-20' },
  { id: 3, vendor: 'Warehouse Partners', vendorAr: 'شركاء المستودعات', limit: 150000, exposure: 165000, paymentTermsDays: 30, status: 'exceeded', lastReviewed: '2025-10-15' },
  { id: 4, vendor: 'International Parts', vendorAr: 'قطع دولية', limit: 500000, exposure: 120000, paymentTermsDays: 60, status: 'ok', lastReviewed: '2025-12-10' },
  { id: 5, vendor: 'Legacy Vendor', vendorAr: 'مورد قديم', limit: 50000, exposure: 0, paymentTermsDays: 15, status: 'locked', lastReviewed: '2025-09-01' },
];

export default function VendorCreditLimitsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [credits] = useState<VendorCredit[]>(mockVendorCredits);
  const [selectedStatus, setSelectedStatus] = useState<'all' | CreditStatus>('all');
  const [selected, setSelected] = useState<VendorCredit | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    vendor: '',
    vendorAr: '',
    limit: '',
    paymentTermsDays: '30',
    lastReviewed: '',
    status: 'ok' as CreditStatus,
  });

  const filtered = useMemo(() => {
    return credits.filter(c => selectedStatus === 'all' || c.status === selectedStatus);
  }, [credits, selectedStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const getStatusBadge = (status: CreditStatus) => {
    const styles: Record<CreditStatus, string> = {
      ok: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      exceeded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      locked: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<CreditStatus, { en: string; ar: string }> = {
      ok: { en: 'OK', ar: 'سليم' },
      warning: { en: 'Warning', ar: 'تحذير' },
      exceeded: { en: 'Exceeded', ar: 'متجاوز' },
      locked: { en: 'Locked', ar: 'موقوف' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const totalLimit = filtered.reduce((sum, c) => sum + c.limit, 0);
  const totalExposure = filtered.reduce((sum, c) => sum + c.exposure, 0);
  const atRisk = credits.filter(c => c.status === 'warning' || c.status === 'exceeded').length;
  const exceeded = credits.filter(c => c.status === 'exceeded').length;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الحفظ (تجريبي)' : 'Saved (demo)', 'success');
    setCreateOpen(false);
    setFormData({ vendor: '', vendorAr: '', limit: '', paymentTermsDays: '30', lastReviewed: '', status: 'ok' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'حدود ائتمان الموردين - SLMS' : 'Vendor Credit Limits - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'حدود ائتمان الموردين' : 'Vendor Credit Limits'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متابعة الحدود والتعرض والإنذارات قبل الشراء' : 'Track limits, exposure, and warnings before purchasing'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'تعيين حد' : 'Set Limit'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الحد' : 'Total Limit'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalLimit)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><ExclamationTriangleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي التعرض' : 'Total Exposure'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalExposure)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600"><XCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متجاوز' : 'Exceeded'}</p>
                <p className="text-xl font-semibold text-red-600">{exceeded}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><ExclamationTriangleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'موردون معرضون' : 'At Risk'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{atRisk}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="ok">{locale === 'ar' ? 'سليم' : 'OK'}</option>
              <option value="warning">{locale === 'ar' ? 'تحذير' : 'Warning'}</option>
              <option value="exceeded">{locale === 'ar' ? 'متجاوز' : 'Exceeded'}</option>
              <option value="locked">{locale === 'ar' ? 'موقوف' : 'Locked'}</option>
            </select>

            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المورد' : 'Vendor'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحد' : 'Limit'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التعرض' : 'Exposure'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المتاح' : 'Available'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'شروط الدفع' : 'Terms'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مراجعة' : 'Reviewed'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((c) => {
                  const available = c.limit - c.exposure;
                  const availableClass = available < 0 ? 'text-red-600' : available < c.limit * 0.15 ? 'text-amber-600' : 'text-gray-900 dark:text-white';
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? c.vendorAr : c.vendor}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(c.limit)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(c.exposure)}</td>
                      <td className={clsx('px-4 py-3 text-right font-medium', availableClass)}>{formatCurrency(available)}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{c.paymentTermsDays} {locale === 'ar' ? 'يوم' : 'days'}</td>
                      <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-gray-500">{c.lastReviewed}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onClick={() => setSelected(c)}><EyeIcon className="h-4 w-4" /></Button>
                          <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل (تجريبي)' : 'Edit (demo)', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل حد الائتمان' : 'Credit Limit Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{locale === 'ar' ? selected.vendorAr : selected.vendor}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? 'آخر مراجعة' : 'Last reviewed'}: {selected.lastReviewed}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الحد' : 'Limit'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selected.limit)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'التعرض' : 'Exposure'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selected.exposure)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المتاح' : 'Available'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selected.limit - selected.exposure)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'شروط الدفع' : 'Payment terms'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.paymentTermsDays} {locale === 'ar' ? 'يوم' : 'days'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'طلب زيادة حد (تجريبي)' : 'Request increase (demo)', 'info')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'طلب زيادة' : 'Request Increase'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم إيقاف الشراء (تجريبي)' : 'Purchasing locked (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إيقاف الشراء' : 'Lock Purchasing'}
              </Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'تعيين حد ائتمان لمورد' : 'Set Vendor Credit Limit'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'المورد (EN)' : 'Vendor (EN)'} value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} />
            <Input label={locale === 'ar' ? 'المورد (AR)' : 'Vendor (AR)'} value={formData.vendorAr} onChange={(e) => setFormData({ ...formData, vendorAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'الحد' : 'Limit'} value={formData.limit} onChange={(e) => setFormData({ ...formData, limit: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <Input label={locale === 'ar' ? 'شروط الدفع (يوم)' : 'Payment terms (days)'} value={formData.paymentTermsDays} onChange={(e) => setFormData({ ...formData, paymentTermsDays: e.target.value })} inputMode="numeric" />
            <Input label={locale === 'ar' ? 'آخر مراجعة' : 'Last reviewed'} value={formData.lastReviewed} onChange={(e) => setFormData({ ...formData, lastReviewed: e.target.value })} placeholder="YYYY-MM-DD" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="ok">{locale === 'ar' ? 'سليم' : 'OK'}</option>
                <option value="warning">{locale === 'ar' ? 'تحذير' : 'Warning'}</option>
                <option value="exceeded">{locale === 'ar' ? 'متجاوز' : 'Exceeded'}</option>
                <option value="locked">{locale === 'ar' ? 'موقوف' : 'Locked'}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
