import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  TagIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type DiscountStatus = 'active' | 'scheduled' | 'expired' | 'disabled';
type DiscountScope = 'customer' | 'product' | 'category' | 'global';

interface DiscountAgreement {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  scope: DiscountScope;
  target: string;
  targetAr: string;
  discountPct: number;
  minAmount: number;
  startDate: string;
  endDate: string;
  status: DiscountStatus;
}

const mockDiscounts: DiscountAgreement[] = [
  { id: 1, code: 'DISC-CUST-001', name: 'VIP Customer Discount', nameAr: 'خصم العملاء المميزين', scope: 'customer', target: 'Al-Faisal Trading', targetAr: 'شركة الفيصل للتجارة', discountPct: 7, minAmount: 50000, startDate: '2025-01-01', endDate: '2025-12-31', status: 'active' },
  { id: 2, code: 'DISC-PROD-014', name: 'Seasonal Product Promo', nameAr: 'عرض موسمي لمنتج', scope: 'product', target: 'Packing Service', targetAr: 'خدمة التغليف', discountPct: 10, minAmount: 0, startDate: '2025-12-01', endDate: '2025-12-31', status: 'scheduled' },
  { id: 3, code: 'DISC-CAT-003', name: 'Customs Services Discount', nameAr: 'خصم خدمات التخليص', scope: 'category', target: 'Customs Clearance', targetAr: 'التخليص الجمركي', discountPct: 5, minAmount: 20000, startDate: '2025-06-01', endDate: '2025-09-30', status: 'expired' },
  { id: 4, code: 'DISC-GLOB-001', name: 'Year-End Campaign', nameAr: 'حملة نهاية العام', scope: 'global', target: 'All Customers', targetAr: 'كل العملاء', discountPct: 3, minAmount: 100000, startDate: '2025-12-15', endDate: '2026-01-15', status: 'active' },
  { id: 5, code: 'DISC-CUST-009', name: 'Partner Discount', nameAr: 'خصم الشركاء', scope: 'customer', target: 'Premium Shipping LLC', targetAr: 'الشحن المتميز ذ.م.م', discountPct: 6, minAmount: 30000, startDate: '2025-03-01', endDate: '2025-08-01', status: 'disabled' },
];

export default function DiscountAgreementsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [discounts] = useState<DiscountAgreement[]>(mockDiscounts);
  const [selectedStatus, setSelectedStatus] = useState<'all' | DiscountStatus>('all');
  const [selectedScope, setSelectedScope] = useState<'all' | DiscountScope>('all');
  const [selected, setSelected] = useState<DiscountAgreement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    scope: 'customer' as DiscountScope,
    target: '',
    targetAr: '',
    discountPct: '5',
    minAmount: '0',
    startDate: '',
    endDate: '',
    status: 'active' as DiscountStatus,
  });

  const filtered = useMemo(() => {
    return discounts.filter(d => {
      const sOk = selectedStatus === 'all' || d.status === selectedStatus;
      const scOk = selectedScope === 'all' || d.scope === selectedScope;
      return sOk && scOk;
    });
  }, [discounts, selectedStatus, selectedScope]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const getStatusBadge = (status: DiscountStatus) => {
    const styles: Record<DiscountStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      expired: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      disabled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<DiscountStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      scheduled: { en: 'Scheduled', ar: 'مجدول' },
      expired: { en: 'Expired', ar: 'منتهي' },
      disabled: { en: 'Disabled', ar: 'معطل' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const getScopeBadge = (scope: DiscountScope) => {
    const styles: Record<DiscountScope, string> = {
      customer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      product: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      category: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      global: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    };
    const labels: Record<DiscountScope, { en: string; ar: string }> = {
      customer: { en: 'Customer', ar: 'عميل' },
      product: { en: 'Product', ar: 'منتج' },
      category: { en: 'Category', ar: 'فئة' },
      global: { en: 'Global', ar: 'عام' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[scope])}>
        {locale === 'ar' ? labels[scope].ar : labels[scope].en}
      </span>
    );
  };

  const activeCount = discounts.filter(d => d.status === 'active').length;
  const scheduledCount = discounts.filter(d => d.status === 'scheduled').length;
  const avgDiscount = filtered.length ? Math.round(filtered.reduce((sum, d) => sum + d.discountPct, 0) / filtered.length) : 0;
  const highThresholdCount = discounts.filter(d => d.minAmount >= 50000).length;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الحفظ (تجريبي)' : 'Saved (demo)', 'success');
    setCreateOpen(false);
    setFormData({ code: '', name: '', nameAr: '', scope: 'customer', target: '', targetAr: '', discountPct: '5', minAmount: '0', startDate: '', endDate: '', status: 'active' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'اتفاقيات الخصم - SLMS' : 'Discount Agreements - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'اتفاقيات الخصم' : 'Discount Agreements'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة الخصومات حسب العميل أو المنتج أو الفئات' : 'Manage discounts by customer, product, category, or global'}
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'اتفاقية جديدة' : 'New Agreement'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشطة' : 'Active'}</p>
                <p className="text-xl font-semibold text-green-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><CalendarDaysIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مجدولة' : 'Scheduled'}</p>
                <p className="text-xl font-semibold text-blue-600">{scheduledCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><TagIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط الخصم' : 'Avg Discount'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{avgDiscount}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><AdjustmentsHorizontalIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'حد أدنى مرتفع' : 'High Threshold'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{highThresholdCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="scheduled">{locale === 'ar' ? 'مجدول' : 'Scheduled'}</option>
                <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
                <option value="disabled">{locale === 'ar' ? 'معطل' : 'Disabled'}</option>
              </select>

              <select value={selectedScope} onChange={(e) => setSelectedScope(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل النطاقات' : 'All Scopes'}</option>
                <option value="customer">{locale === 'ar' ? 'عميل' : 'Customer'}</option>
                <option value="product">{locale === 'ar' ? 'منتج' : 'Product'}</option>
                <option value="category">{locale === 'ar' ? 'فئة' : 'Category'}</option>
                <option value="global">{locale === 'ar' ? 'عام' : 'Global'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النطاق' : 'Scope'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الهدف' : 'Target'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الخصم' : 'Discount'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحد الأدنى' : 'Min Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.code}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{locale === 'ar' ? d.nameAr : d.name}</p>
                    </td>
                    <td className="px-4 py-3">{getScopeBadge(d.scope)}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? d.targetAr : d.target}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{d.discountPct}%</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(d.minAmount)}</td>
                    <td className="px-4 py-3 text-gray-500">{d.startDate} → {d.endDate}</td>
                    <td className="px-4 py-3">{getStatusBadge(d.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(d)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل (تجريبي)' : 'Edit (demo)', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الاتفاقية' : 'Agreement Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.nameAr : selected.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {getScopeBadge(selected.scope)}
                {getStatusBadge(selected.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الهدف' : 'Target'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.targetAr : selected.target}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الخصم' : 'Discount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.discountPct}%</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الحد الأدنى' : 'Min Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selected.minAmount)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفترة' : 'Period'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.startDate} → {selected.endDate}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التفعيل (تجريبي)' : 'Activated (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تفعيل' : 'Activate'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم التعطيل (تجريبي)' : 'Disabled (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تعطيل' : 'Disable'}
              </Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'اتفاقية خصم جديدة' : 'New Discount Agreement'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="DISC-..." />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="scheduled">{locale === 'ar' ? 'مجدول' : 'Scheduled'}</option>
                <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
                <option value="disabled">{locale === 'ar' ? 'معطل' : 'Disabled'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النطاق' : 'Scope'}</label>
              <select value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value as any })} className="input">
                <option value="customer">{locale === 'ar' ? 'عميل' : 'Customer'}</option>
                <option value="product">{locale === 'ar' ? 'منتج' : 'Product'}</option>
                <option value="category">{locale === 'ar' ? 'فئة' : 'Category'}</option>
                <option value="global">{locale === 'ar' ? 'عام' : 'Global'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الهدف (EN)' : 'Target (EN)'} value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })} placeholder={locale === 'ar' ? 'اسم عميل/منتج...' : 'Customer/Product...'} />
            <Input label={locale === 'ar' ? 'الهدف (AR)' : 'Target (AR)'} value={formData.targetAr} onChange={(e) => setFormData({ ...formData, targetAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'الخصم %' : 'Discount %'} value={formData.discountPct} onChange={(e) => setFormData({ ...formData, discountPct: e.target.value })} inputMode="numeric" />
            <Input label={locale === 'ar' ? 'الحد الأدنى' : 'Min Amount'} value={formData.minAmount} onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <Input label={locale === 'ar' ? 'من' : 'Start'} value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'إلى' : 'End'} value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} placeholder="YYYY-MM-DD" />
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
