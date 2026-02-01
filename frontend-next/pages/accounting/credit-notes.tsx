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
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type CreditNoteStatus = 'draft' | 'issued' | 'applied' | 'cancelled';

interface CreditNote {
  id: number;
  cnNo: string;
  customer: string;
  customerAr: string;
  relatedInvoice?: string;
  issueDate: string;
  amount: number;
  currency: 'SAR' | 'USD';
  status: CreditNoteStatus;
}

const mockCreditNotes: CreditNote[] = [
  { id: 1, cnNo: 'CN-2025-001', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', relatedInvoice: 'INV-8841', issueDate: '2025-12-12', amount: 12500, currency: 'SAR', status: 'issued' },
  { id: 2, cnNo: 'CN-2025-002', customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', relatedInvoice: 'INV-8890', issueDate: '2025-12-05', amount: 3200, currency: 'SAR', status: 'applied' },
  { id: 3, cnNo: 'CN-2025-003', customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', issueDate: '2025-12-20', amount: 950, currency: 'USD', status: 'draft' },
  { id: 4, cnNo: 'CN-2025-004', customer: 'Premium Shipping LLC', customerAr: 'الشحن المتميز ذ.م.م', relatedInvoice: 'INV-8772', issueDate: '2025-11-19', amount: 1500, currency: 'SAR', status: 'issued' },
  { id: 5, cnNo: 'CN-2025-005', customer: 'Legacy Customer', customerAr: 'عميل قديم', relatedInvoice: 'INV-8601', issueDate: '2025-10-10', amount: 500, currency: 'SAR', status: 'cancelled' },
];

export default function CreditNotesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [notes] = useState<CreditNote[]>(mockCreditNotes);
  const [selectedStatus, setSelectedStatus] = useState<'all' | CreditNoteStatus>('all');
  const [selected, setSelected] = useState<CreditNote | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    cnNo: '',
    customer: '',
    customerAr: '',
    relatedInvoice: '',
    issueDate: '',
    amount: '',
    currency: 'SAR' as CreditNote['currency'],
    status: 'draft' as CreditNoteStatus,
  });

  const filtered = useMemo(() => {
    return notes.filter(n => selectedStatus === 'all' || n.status === selectedStatus);
  }, [notes, selectedStatus]);

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency }).format(amount);

  const getStatusBadge = (status: CreditNoteStatus) => {
    const styles: Record<CreditNoteStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      issued: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      applied: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<CreditNoteStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      issued: { en: 'Issued', ar: 'صادر' },
      applied: { en: 'Applied', ar: 'مطبق' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const issuedCount = notes.filter(n => n.status === 'issued').length;
  const appliedCount = notes.filter(n => n.status === 'applied').length;
  const draftCount = notes.filter(n => n.status === 'draft').length;
  const totalSar = notes.reduce((sum, n) => sum + (n.currency === 'SAR' ? n.amount : 0), 0);

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ cnNo: '', customer: '', customerAr: '', relatedInvoice: '', issueDate: '', amount: '', currency: 'SAR', status: 'draft' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'إشعارات دائنة - SLMS' : 'Credit Notes - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'إشعارات دائنة' : 'Credit Notes'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة الإشعارات الدائنة وربطها بالفواتير وتطبيقها' : 'Manage credit notes, link invoices, and apply credits'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'إشعار دائن جديد' : 'New Credit Note'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'صادر' : 'Issued'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{issuedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مطبق' : 'Applied'}</p>
            <p className="text-2xl font-bold text-green-600">{appliedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مسودة' : 'Draft'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{draftCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي SAR' : 'Total SAR'}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(totalSar, 'SAR')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
              <option value="issued">{locale === 'ar' ? 'صادر' : 'Issued'}</option>
              <option value="applied">{locale === 'ar' ? 'مطبق' : 'Applied'}</option>
              <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'فاتورة' : 'Invoice'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{n.cnNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? n.customerAr : n.customer}</td>
                    <td className="px-4 py-3 text-gray-500">{n.relatedInvoice || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{n.issueDate}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatMoney(n.amount, n.currency)}</td>
                    <td className="px-4 py-3">{getStatusBadge(n.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(n)}><EyeIcon className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الإشعار الدائن' : 'Credit Note Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.cnNo}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.customerAr : selected.customer}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'فاتورة مرتبطة' : 'Related invoice'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.relatedInvoice || '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.amount, selected.currency)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التطبيق (تجريبي)' : 'Applied (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تطبيق' : 'Apply'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإلغاء (تجريبي)' : 'Cancelled (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'إشعار دائن جديد' : 'New Credit Note'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="CN" value={formData.cnNo} onChange={(e) => setFormData({ ...formData, cnNo: e.target.value })} placeholder="CN-..." />
            <Input label={locale === 'ar' ? 'فاتورة مرتبطة' : 'Related invoice'} value={formData.relatedInvoice} onChange={(e) => setFormData({ ...formData, relatedInvoice: e.target.value })} placeholder="INV-..." />
            <Input label={locale === 'ar' ? 'العميل (EN)' : 'Customer (EN)'} value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} />
            <Input label={locale === 'ar' ? 'العميل (AR)' : 'Customer (AR)'} value={formData.customerAr} onChange={(e) => setFormData({ ...formData, customerAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'تاريخ الإصدار' : 'Issue date'} value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'المبلغ' : 'Amount'} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة' : 'Currency'}</label>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })} className="input">
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="issued">{locale === 'ar' ? 'صادر' : 'Issued'}</option>
                <option value="applied">{locale === 'ar' ? 'مطبق' : 'Applied'}</option>
                <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
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
