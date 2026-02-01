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
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type InsuranceStatus = 'requested' | 'quoted' | 'active' | 'expired' | 'rejected';

interface ShippingInsurancePolicy {
  id: number;
  policyNo: string;
  shipmentRef: string;
  provider: string;
  coverageType: 'all_risk' | 'basic' | 'special';
  insuredValue: number;
  premium: number;
  currency: 'SAR' | 'USD';
  startDate: string;
  endDate: string;
  status: InsuranceStatus;
}

const mockPolicies: ShippingInsurancePolicy[] = [
  { id: 1, policyNo: 'INS-2025-001', shipmentRef: 'SHP-10021', provider: 'Gulf Insurance', coverageType: 'all_risk', insuredValue: 500000, premium: 4200, currency: 'SAR', startDate: '2025-12-10', endDate: '2026-01-10', status: 'active' },
  { id: 2, policyNo: 'INS-2025-002', shipmentRef: 'SHP-10066', provider: 'National Insurance', coverageType: 'basic', insuredValue: 120000, premium: 900, currency: 'SAR', startDate: '2025-12-01', endDate: '2025-12-15', status: 'expired' },
  { id: 3, policyNo: 'INS-2025-003', shipmentRef: 'SHP-10102', provider: 'Gulf Insurance', coverageType: 'special', insuredValue: 95000, premium: 780, currency: 'USD', startDate: '2025-12-28', endDate: '2026-02-01', status: 'quoted' },
  { id: 4, policyNo: 'INS-2025-004', shipmentRef: 'SHP-09991', provider: 'Legacy Insurance', coverageType: 'basic', insuredValue: 30000, premium: 0, currency: 'SAR', startDate: '2025-10-10', endDate: '2025-10-20', status: 'rejected' },
  { id: 5, policyNo: 'INS-2026-001', shipmentRef: 'SHP-10120', provider: 'National Insurance', coverageType: 'all_risk', insuredValue: 220000, premium: 0, currency: 'SAR', startDate: '2025-12-29', endDate: '2026-01-29', status: 'requested' },
];

export default function ShippingInsurancePage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [policies] = useState<ShippingInsurancePolicy[]>(mockPolicies);
  const [selectedStatus, setSelectedStatus] = useState<'all' | InsuranceStatus>('all');
  const [selected, setSelected] = useState<ShippingInsurancePolicy | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    policyNo: '',
    shipmentRef: '',
    provider: '',
    coverageType: 'all_risk' as ShippingInsurancePolicy['coverageType'],
    insuredValue: '',
    premium: '',
    currency: 'SAR' as ShippingInsurancePolicy['currency'],
    startDate: '',
    endDate: '',
    status: 'requested' as InsuranceStatus,
  });

  const filtered = useMemo(() => {
    return policies.filter(p => selectedStatus === 'all' || p.status === selectedStatus);
  }, [policies, selectedStatus]);

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency }).format(amount);
  };

  const getStatusBadge = (status: InsuranceStatus) => {
    const styles: Record<InsuranceStatus, string> = {
      requested: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      quoted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      expired: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<InsuranceStatus, { en: string; ar: string }> = {
      requested: { en: 'Requested', ar: 'مطلوب' },
      quoted: { en: 'Quoted', ar: 'عرض مقدم' },
      active: { en: 'Active', ar: 'ساري' },
      expired: { en: 'Expired', ar: 'منتهي' },
      rejected: { en: 'Rejected', ar: 'مرفوض' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const activeCount = policies.filter(p => p.status === 'active').length;
  const pendingCount = policies.filter(p => p.status === 'requested' || p.status === 'quoted').length;
  const rejectedCount = policies.filter(p => p.status === 'rejected').length;
  const insuredTotalSar = policies.reduce((sum, p) => sum + (p.currency === 'SAR' ? p.insuredValue : 0), 0);

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ policyNo: '', shipmentRef: '', provider: '', coverageType: 'all_risk', insuredValue: '', premium: '', currency: 'SAR', startDate: '', endDate: '', status: 'requested' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تأمين الشحن - SLMS' : 'Shipping Insurance - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'تأمين الشحن' : 'Shipping Insurance'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة وثائق التأمين للشحنات، الأقساط، والتغطيات' : 'Manage shipment insurance policies, premiums, and coverage'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'طلب تأمين' : 'Request Insurance'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'ساري' : 'Active'}</p>
                <p className="text-xl font-semibold text-green-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><ExclamationTriangleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد المعالجة' : 'Pending'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600"><XCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</p>
                <p className="text-xl font-semibold text-red-600">{rejectedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي قيمة SAR' : 'Total SAR insured'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatMoney(insuredTotalSar, 'SAR')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="requested">{locale === 'ar' ? 'مطلوب' : 'Requested'}</option>
              <option value="quoted">{locale === 'ar' ? 'عرض مقدم' : 'Quoted'}</option>
              <option value="active">{locale === 'ar' ? 'ساري' : 'Active'}</option>
              <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
              <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوثيقة' : 'Policy'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المزود' : 'Provider'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التغطية' : 'Coverage'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'قيمة' : 'Insured'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'قسط' : 'Premium'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.policyNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{p.shipmentRef}</td>
                    <td className="px-4 py-3 text-gray-500">{p.provider}</td>
                    <td className="px-4 py-3 text-gray-500">{p.coverageType}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatMoney(p.insuredValue, p.currency)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatMoney(p.premium, p.currency)}</td>
                    <td className="px-4 py-3 text-gray-500">{p.startDate} → {p.endDate}</td>
                    <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(p)}><EyeIcon className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل التأمين' : 'Insurance Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.policyNo}</h3>
                <p className="text-sm text-gray-500">{selected.shipmentRef} • {selected.provider}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'التغطية' : 'Coverage'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.coverageType}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'قيمة التأمين' : 'Insured value'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.insuredValue, selected.currency)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'القسط' : 'Premium'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.premium, selected.currency)}</p>
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
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الرفض (تجريبي)' : 'Rejected (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'رفض' : 'Reject'}
              </Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'طلب تأمين شحنة' : 'Request Shipping Insurance'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'رقم الوثيقة' : 'Policy No'} value={formData.policyNo} onChange={(e) => setFormData({ ...formData, policyNo: e.target.value })} placeholder="INS-..." />
            <Input label={locale === 'ar' ? 'الشحنة' : 'Shipment Ref'} value={formData.shipmentRef} onChange={(e) => setFormData({ ...formData, shipmentRef: e.target.value })} placeholder="SHP-..." />
            <Input label={locale === 'ar' ? 'المزود' : 'Provider'} value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نوع التغطية' : 'Coverage type'}</label>
              <select value={formData.coverageType} onChange={(e) => setFormData({ ...formData, coverageType: e.target.value as any })} className="input">
                <option value="all_risk">{locale === 'ar' ? 'شامل' : 'All risk'}</option>
                <option value="basic">{locale === 'ar' ? 'أساسي' : 'Basic'}</option>
                <option value="special">{locale === 'ar' ? 'خاص' : 'Special'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'قيمة التأمين' : 'Insured value'} value={formData.insuredValue} onChange={(e) => setFormData({ ...formData, insuredValue: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <Input label={locale === 'ar' ? 'القسط' : 'Premium'} value={formData.premium} onChange={(e) => setFormData({ ...formData, premium: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة' : 'Currency'}</label>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })} className="input">
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'من' : 'Start date'} value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'إلى' : 'End date'} value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="requested">{locale === 'ar' ? 'مطلوب' : 'Requested'}</option>
                <option value="quoted">{locale === 'ar' ? 'عرض مقدم' : 'Quoted'}</option>
                <option value="active">{locale === 'ar' ? 'ساري' : 'Active'}</option>
                <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
                <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إرسال' : 'Submit'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
