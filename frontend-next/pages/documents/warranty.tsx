import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type WarrantyStatus = 'valid' | 'expiring' | 'expired' | 'revoked';

interface WarrantyDocument {
  id: number;
  docNo: string;
  customer: string;
  customerAr: string;
  item: string;
  itemAr: string;
  issueDate: string;
  expiryDate: string;
  status: WarrantyStatus;
  coverageMonths: number;
}

const mockWarrantyDocs: WarrantyDocument[] = [
  { id: 1, docNo: 'WR-2025-001', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', item: 'Cold Chain Container', itemAr: 'حاوية تبريد', issueDate: '2025-01-10', expiryDate: '2026-01-10', status: 'valid', coverageMonths: 12 },
  { id: 2, docNo: 'WR-2024-019', customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', item: 'Forklift Service Plan', itemAr: 'خطة صيانة رافعة', issueDate: '2024-02-01', expiryDate: '2025-02-01', status: 'expired', coverageMonths: 12 },
  { id: 3, docNo: 'WR-2025-014', customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', item: 'Packaging Service', itemAr: 'خدمة التغليف', issueDate: '2025-07-01', expiryDate: '2026-01-01', status: 'expiring', coverageMonths: 6 },
  { id: 4, docNo: 'WR-2025-006', customer: 'Premium Shipping LLC', customerAr: 'الشحن المتميز ذ.م.م', item: 'Insurance Add-on', itemAr: 'إضافة تأمين', issueDate: '2025-03-15', expiryDate: '2026-03-15', status: 'valid', coverageMonths: 12 },
  { id: 5, docNo: 'WR-2025-003', customer: 'Legacy Customer', customerAr: 'عميل قديم', item: 'Old Coverage', itemAr: 'تغطية قديمة', issueDate: '2025-01-01', expiryDate: '2025-06-01', status: 'revoked', coverageMonths: 6 },
];

export default function WarrantyDocumentsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [docs] = useState<WarrantyDocument[]>(mockWarrantyDocs);
  const [selectedStatus, setSelectedStatus] = useState<'all' | WarrantyStatus>('all');
  const [selected, setSelected] = useState<WarrantyDocument | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    customerAr: '',
    item: '',
    itemAr: '',
    issueDate: '',
    expiryDate: '',
    coverageMonths: '12',
    status: 'valid' as WarrantyStatus,
  });

  const filtered = useMemo(() => {
    return docs.filter(d => selectedStatus === 'all' || d.status === selectedStatus);
  }, [docs, selectedStatus]);

  const getStatusBadge = (status: WarrantyStatus) => {
    const styles: Record<WarrantyStatus, string> = {
      valid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      expiring: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      revoked: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<WarrantyStatus, { en: string; ar: string }> = {
      valid: { en: 'Valid', ar: 'ساري' },
      expiring: { en: 'Expiring', ar: 'قارب الانتهاء' },
      expired: { en: 'Expired', ar: 'منتهي' },
      revoked: { en: 'Revoked', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const validCount = docs.filter(d => d.status === 'valid').length;
  const expiringCount = docs.filter(d => d.status === 'expiring').length;
  const expiredCount = docs.filter(d => d.status === 'expired').length;
  const customerCount = new Set(docs.map(d => d.customer)).size;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ customer: '', customerAr: '', item: '', itemAr: '', issueDate: '', expiryDate: '', coverageMonths: '12', status: 'valid' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مستندات الضمان - SLMS' : 'Warranty Documents - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'مستندات الضمان' : 'Warranty Documents'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تتبع الضمانات وتواريخ الانتهاء والإلغاءات' : 'Track warranties, expiry dates, and revocations'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'مستند جديد' : 'New Document'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'ساري' : 'Valid'}</p>
                <p className="text-xl font-semibold text-green-600">{validCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><CalendarDaysIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قارب الانتهاء' : 'Expiring'}</p>
                <p className="text-xl font-semibold text-amber-600">{expiringCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600"><XCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'منتهي' : 'Expired'}</p>
                <p className="text-xl font-semibold text-red-600">{expiredCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><DocumentTextIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'العملاء' : 'Customers'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{customerCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="valid">{locale === 'ar' ? 'ساري' : 'Valid'}</option>
              <option value="expiring">{locale === 'ar' ? 'قارب الانتهاء' : 'Expiring'}</option>
              <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
              <option value="revoked">{locale === 'ar' ? 'ملغي' : 'Revoked'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الرقم' : 'Doc No'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البند' : 'Item'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإصدار' : 'Issued'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الانتهاء' : 'Expiry'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التغطية' : 'Coverage'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.docNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? d.customerAr : d.customer}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? d.itemAr : d.item}</td>
                    <td className="px-4 py-3 text-gray-500">{d.issueDate}</td>
                    <td className="px-4 py-3 text-gray-500">{d.expiryDate}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{d.coverageMonths} {locale === 'ar' ? 'شهر' : 'mo'}</td>
                    <td className="px-4 py-3">{getStatusBadge(d.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(d)}><EyeIcon className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الضمان' : 'Warranty Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.docNo}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.customerAr : selected.customer} • {locale === 'ar' ? selected.itemAr : selected.item}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإصدار' : 'Issue date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.issueDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الانتهاء' : 'Expiry date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.expiryDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'التغطية' : 'Coverage'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.coverageMonths} {locale === 'ar' ? 'شهر' : 'months'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإجراء' : 'Action'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? 'تحديث/سحب/تصدير' : 'Update/Revoke/Export'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التحديث (تجريبي)' : 'Updated (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تحديث' : 'Update'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم السحب (تجريبي)' : 'Revoked (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'سحب' : 'Revoke'}
              </Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'مستند ضمان جديد' : 'New Warranty Document'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'العميل (EN)' : 'Customer (EN)'} value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} />
            <Input label={locale === 'ar' ? 'العميل (AR)' : 'Customer (AR)'} value={formData.customerAr} onChange={(e) => setFormData({ ...formData, customerAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'البند (EN)' : 'Item (EN)'} value={formData.item} onChange={(e) => setFormData({ ...formData, item: e.target.value })} />
            <Input label={locale === 'ar' ? 'البند (AR)' : 'Item (AR)'} value={formData.itemAr} onChange={(e) => setFormData({ ...formData, itemAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'} value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'} value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'مدة التغطية (شهر)' : 'Coverage (months)'} value={formData.coverageMonths} onChange={(e) => setFormData({ ...formData, coverageMonths: e.target.value })} inputMode="numeric" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="valid">{locale === 'ar' ? 'ساري' : 'Valid'}</option>
                <option value="expiring">{locale === 'ar' ? 'قارب الانتهاء' : 'Expiring'}</option>
                <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
                <option value="revoked">{locale === 'ar' ? 'ملغي' : 'Revoked'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إنشاء' : 'Create'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
