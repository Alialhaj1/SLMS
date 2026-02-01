import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type CustomerContractStatus = 'draft' | 'active' | 'expired' | 'terminated';
type BillingModel = 'fixed' | 'per_shipment' | 'tiered';

interface CustomerContract {
  id: number;
  contractNumber: string;
  customer: string;
  customerAr: string;
  status: CustomerContractStatus;
  startDate: string;
  endDate: string;
  value: number;
  billingModel: BillingModel;
  slaDays: number;
  autoRenew: boolean;
}

const mockCustomerContracts: CustomerContract[] = [
  { id: 1, contractNumber: 'CC-2025-001', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', status: 'active', startDate: '2025-01-01', endDate: '2025-12-31', value: 1500000, billingModel: 'fixed', slaDays: 3, autoRenew: true },
  { id: 2, contractNumber: 'CC-2025-002', customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', status: 'active', startDate: '2025-05-01', endDate: '2025-11-01', value: 520000, billingModel: 'per_shipment', slaDays: 5, autoRenew: false },
  { id: 3, contractNumber: 'CC-2024-019', customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', status: 'expired', startDate: '2024-01-01', endDate: '2024-12-31', value: 780000, billingModel: 'tiered', slaDays: 4, autoRenew: false },
  { id: 4, contractNumber: 'CC-2025-003', customer: 'Premium Shipping LLC', customerAr: 'الشحن المتميز ذ.م.م', status: 'draft', startDate: '2026-01-01', endDate: '2026-12-31', value: 2100000, billingModel: 'fixed', slaDays: 2, autoRenew: true },
  { id: 5, contractNumber: 'CC-2023-007', customer: 'Eastern Transport', customerAr: 'النقل الشرقي', status: 'terminated', startDate: '2023-01-01', endDate: '2023-12-31', value: 300000, billingModel: 'per_shipment', slaDays: 7, autoRenew: false },
];

export default function CustomerContractsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [contracts] = useState<CustomerContract[]>(mockCustomerContracts);
  const [selectedStatus, setSelectedStatus] = useState<'all' | CustomerContractStatus>('all');
  const [selectedModel, setSelectedModel] = useState<'all' | BillingModel>('all');
  const [selectedContract, setSelectedContract] = useState<CustomerContract | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    customerAr: '',
    startDate: '',
    endDate: '',
    value: '',
    billingModel: 'fixed' as BillingModel,
    slaDays: '3',
    autoRenew: true,
  });

  const filtered = useMemo(() => {
    return contracts.filter(c => {
      const sOk = selectedStatus === 'all' || c.status === selectedStatus;
      const mOk = selectedModel === 'all' || c.billingModel === selectedModel;
      return sOk && mOk;
    });
  }, [contracts, selectedStatus, selectedModel]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const getStatusBadge = (status: CustomerContractStatus) => {
    const styles: Record<CustomerContractStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      expired: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      terminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<CustomerContractStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      active: { en: 'Active', ar: 'ساري' },
      expired: { en: 'Expired', ar: 'منتهي' },
      terminated: { en: 'Terminated', ar: 'مفسوخ' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const getBillingBadge = (model: BillingModel) => {
    const styles: Record<BillingModel, string> = {
      fixed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      per_shipment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      tiered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    };
    const labels: Record<BillingModel, { en: string; ar: string }> = {
      fixed: { en: 'Fixed', ar: 'ثابت' },
      per_shipment: { en: 'Per Shipment', ar: 'لكل شحنة' },
      tiered: { en: 'Tiered', ar: 'شرائح' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[model])}>
        {locale === 'ar' ? labels[model].ar : labels[model].en}
      </span>
    );
  };

  const activeCount = contracts.filter(c => c.status === 'active').length;
  const totalValue = filtered.reduce((sum, c) => sum + c.value, 0);
  const avgSla = filtered.length ? Math.round(filtered.reduce((sum, c) => sum + c.slaDays, 0) / filtered.length) : 0;
  const autoRenewCount = contracts.filter(c => c.autoRenew).length;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الحفظ (تجريبي)' : 'Saved (demo)', 'success');
    setCreateOpen(false);
    setFormData({ customer: '', customerAr: '', startDate: '', endDate: '', value: '', billingModel: 'fixed', slaDays: '3', autoRenew: true });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'عقود العملاء - SLMS' : 'Customer Contracts - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'عقود العملاء' : 'Customer Contracts'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة العقود وشروط الفوترة وSLA' : 'Manage contracts, billing terms, and SLA'}
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'عقد جديد' : 'New Contract'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'العقود السارية' : 'Active'}</p>
                <p className="text-xl font-semibold text-green-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'القيمة' : 'Value'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><CalendarDaysIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط SLA' : 'Avg SLA'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{avgSla} {locale === 'ar' ? 'يوم' : 'days'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><ClipboardDocumentCheckIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تجديد تلقائي' : 'Auto Renew'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{autoRenewCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="active">{locale === 'ar' ? 'ساري' : 'Active'}</option>
                <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
                <option value="terminated">{locale === 'ar' ? 'مفسوخ' : 'Terminated'}</option>
              </select>

              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل النماذج' : 'All Models'}</option>
                <option value="fixed">{locale === 'ar' ? 'ثابت' : 'Fixed'}</option>
                <option value="per_shipment">{locale === 'ar' ? 'لكل شحنة' : 'Per Shipment'}</option>
                <option value="tiered">{locale === 'ar' ? 'شرائح' : 'Tiered'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العقد' : 'Contract'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفوترة' : 'Billing'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القيمة' : 'Value'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SLA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{c.contractNumber}</p>
                      <p className="text-xs text-gray-500">{c.autoRenew ? (locale === 'ar' ? 'تجديد تلقائي' : 'Auto-renew') : (locale === 'ar' ? 'يدوي' : 'Manual')}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? c.customerAr : c.customer}</td>
                    <td className="px-4 py-3">{getBillingBadge(c.billingModel)}</td>
                    <td className="px-4 py-3 text-gray-500">{c.startDate} → {c.endDate}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(c.value)}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{c.slaDays}</td>
                    <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedContract(c)}><EyeIcon className="h-4 w-4" /></Button>
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

      <Modal isOpen={!!selectedContract} onClose={() => setSelectedContract(null)} title={locale === 'ar' ? 'تفاصيل عقد العميل' : 'Customer Contract Details'} size="lg">
        {selectedContract && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedContract.contractNumber}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selectedContract.customerAr : selectedContract.customer}</p>
              </div>
              <div className="flex items-center gap-2">
                {getBillingBadge(selectedContract.billingModel)}
                {getStatusBadge(selectedContract.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'القيمة' : 'Value'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedContract.value)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">SLA</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContract.slaDays} {locale === 'ar' ? 'يوم' : 'days'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفترة' : 'Period'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContract.startDate} → {selectedContract.endDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'التجديد' : 'Renewal'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContract.autoRenew ? (locale === 'ar' ? 'تلقائي' : 'Auto') : (locale === 'ar' ? 'يدوي' : 'Manual')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التفعيل (تجريبي)' : 'Activated (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تفعيل' : 'Activate'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإنهاء (تجريبي)' : 'Terminated (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إنهاء' : 'Terminate'}
              </Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'عقد عميل جديد' : 'New Customer Contract'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'العميل (EN)' : 'Customer (EN)'} value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} />
            <Input label={locale === 'ar' ? 'العميل (AR)' : 'Customer (AR)'} value={formData.customerAr} onChange={(e) => setFormData({ ...formData, customerAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'تاريخ البداية' : 'Start Date'} value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'تاريخ النهاية' : 'End Date'} value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'القيمة' : 'Value'} value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <Input label={locale === 'ar' ? 'SLA بالأيام' : 'SLA days'} value={formData.slaDays} onChange={(e) => setFormData({ ...formData, slaDays: e.target.value })} inputMode="numeric" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نموذج الفوترة' : 'Billing Model'}</label>
              <select value={formData.billingModel} onChange={(e) => setFormData({ ...formData, billingModel: e.target.value as any })} className="input">
                <option value="fixed">{locale === 'ar' ? 'ثابت' : 'Fixed'}</option>
                <option value="per_shipment">{locale === 'ar' ? 'لكل شحنة' : 'Per Shipment'}</option>
                <option value="tiered">{locale === 'ar' ? 'شرائح' : 'Tiered'}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.autoRenew} onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })} />
              <span className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'تجديد تلقائي' : 'Auto renew'}</span>
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
