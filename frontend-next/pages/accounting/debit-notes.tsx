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

type DebitNoteStatus = 'draft' | 'issued' | 'settled' | 'cancelled';

interface DebitNote {
  id: number;
  dnNo: string;
  vendor: string;
  vendorAr: string;
  relatedBill?: string;
  issueDate: string;
  amount: number;
  currency: 'SAR' | 'USD';
  status: DebitNoteStatus;
}

const mockDebitNotes: DebitNote[] = [
  { id: 1, dnNo: 'DN-2025-001', vendor: 'Gulf Supplies', vendorAr: 'إمدادات الخليج', relatedBill: 'BILL-4412', issueDate: '2025-12-08', amount: 2200, currency: 'SAR', status: 'issued' },
  { id: 2, dnNo: 'DN-2025-002', vendor: 'Warehouse Partners', vendorAr: 'شركاء المستودعات', issueDate: '2025-12-18', amount: 750, currency: 'USD', status: 'draft' },
  { id: 3, dnNo: 'DN-2025-003', vendor: 'Blue Freight Co.', vendorAr: 'شركة الشحن الأزرق', relatedBill: 'BILL-4470', issueDate: '2025-11-30', amount: 5400, currency: 'SAR', status: 'settled' },
  { id: 4, dnNo: 'DN-2025-004', vendor: 'Legacy Vendor', vendorAr: 'مورد قديم', relatedBill: 'BILL-4301', issueDate: '2025-10-03', amount: 300, currency: 'SAR', status: 'cancelled' },
];

export default function DebitNotesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [notes] = useState<DebitNote[]>(mockDebitNotes);
  const [selectedStatus, setSelectedStatus] = useState<'all' | DebitNoteStatus>('all');
  const [selected, setSelected] = useState<DebitNote | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    dnNo: '',
    vendor: '',
    vendorAr: '',
    relatedBill: '',
    issueDate: '',
    amount: '',
    currency: 'SAR' as DebitNote['currency'],
    status: 'draft' as DebitNoteStatus,
  });

  const filtered = useMemo(() => {
    return notes.filter(n => selectedStatus === 'all' || n.status === selectedStatus);
  }, [notes, selectedStatus]);

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency }).format(amount);

  const getStatusBadge = (status: DebitNoteStatus) => {
    const styles: Record<DebitNoteStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      issued: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      settled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<DebitNoteStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      issued: { en: 'Issued', ar: 'صادر' },
      settled: { en: 'Settled', ar: 'مسوى' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const issuedCount = notes.filter(n => n.status === 'issued').length;
  const settledCount = notes.filter(n => n.status === 'settled').length;
  const draftCount = notes.filter(n => n.status === 'draft').length;
  const totalSar = notes.reduce((sum, n) => sum + (n.currency === 'SAR' ? n.amount : 0), 0);

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ dnNo: '', vendor: '', vendorAr: '', relatedBill: '', issueDate: '', amount: '', currency: 'SAR', status: 'draft' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'إشعارات مدينة - SLMS' : 'Debit Notes - SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'إشعارات مدينة' : 'Debit Notes'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة الإشعارات المدينة للموردين وتسويتها' : 'Manage vendor debit notes and settlements'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'إشعار مدين جديد' : 'New Debit Note'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'صادر' : 'Issued'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{issuedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مسوى' : 'Settled'}</p>
            <p className="text-2xl font-bold text-green-600">{settledCount}</p>
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
              <option value="settled">{locale === 'ar' ? 'مسوى' : 'Settled'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">DN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المورد' : 'Vendor'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'فاتورة' : 'Bill'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{n.dnNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? n.vendorAr : n.vendor}</td>
                    <td className="px-4 py-3 text-gray-500">{n.relatedBill || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{n.issueDate}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatMoney(n.amount, n.currency)}</td>
                    <td className="px-4 py-3">{getStatusBadge(n.status)}</td>
                    <td className="px-4 py-3"><Button size="sm" variant="secondary" onClick={() => setSelected(n)}><EyeIcon className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الإشعار المدين' : 'Debit Note Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.dnNo}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.vendorAr : selected.vendor}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'فاتورة مرتبطة' : 'Related bill'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.relatedBill || '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.amount, selected.currency)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تمت التسوية (تجريبي)' : 'Settled (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تسوية' : 'Settle'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإلغاء (تجريبي)' : 'Cancelled (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'إشعار مدين جديد' : 'New Debit Note'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="DN" value={formData.dnNo} onChange={(e) => setFormData({ ...formData, dnNo: e.target.value })} placeholder="DN-..." />
            <Input label={locale === 'ar' ? 'فاتورة مرتبطة' : 'Related bill'} value={formData.relatedBill} onChange={(e) => setFormData({ ...formData, relatedBill: e.target.value })} placeholder="BILL-..." />
            <Input label={locale === 'ar' ? 'المورد (EN)' : 'Vendor (EN)'} value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} />
            <Input label={locale === 'ar' ? 'المورد (AR)' : 'Vendor (AR)'} value={formData.vendorAr} onChange={(e) => setFormData({ ...formData, vendorAr: e.target.value })} />
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
                <option value="settled">{locale === 'ar' ? 'مسوى' : 'Settled'}</option>
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
