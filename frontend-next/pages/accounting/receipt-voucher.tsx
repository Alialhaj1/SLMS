import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  BanknotesIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type ReceiptStatus = 'draft' | 'posted' | 'void';
type ReceiptMethod = 'cash' | 'bank_transfer' | 'cheque';

interface ReceiptVoucher {
  id: number;
  voucherNo: string;
  payer: string;
  payerAr: string;
  method: ReceiptMethod;
  date: string;
  amount: number;
  currency: 'SAR' | 'USD';
  reference?: string;
  status: ReceiptStatus;
}

const mockReceipts: ReceiptVoucher[] = [
  { id: 1, voucherNo: 'RV-2025-001', payer: 'Al-Faisal Trading', payerAr: 'شركة الفيصل للتجارة', method: 'bank_transfer', date: '2025-12-18', amount: 24000, currency: 'SAR', reference: 'INV-8841', status: 'posted' },
  { id: 2, voucherNo: 'RV-2025-002', payer: 'Saudi Logistics Co.', payerAr: 'الشركة السعودية للخدمات اللوجستية', method: 'cash', date: '2025-12-22', amount: 1800, currency: 'SAR', reference: 'INV-8890', status: 'draft' },
  { id: 3, voucherNo: 'RV-2025-003', payer: 'Global Import Export', payerAr: 'الاستيراد والتصدير العالمية', method: 'cheque', date: '2025-11-29', amount: 1200, currency: 'USD', reference: 'INV-8820', status: 'posted' },
  { id: 4, voucherNo: 'RV-2025-004', payer: 'Legacy Customer', payerAr: 'عميل قديم', method: 'cash', date: '2025-10-01', amount: 250, currency: 'SAR', status: 'void' },
];

export default function ReceiptVoucherPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [vouchers] = useState<ReceiptVoucher[]>(mockReceipts);
  const [selectedStatus, setSelectedStatus] = useState<'all' | ReceiptStatus>('all');
  const [selectedMethod, setSelectedMethod] = useState<'all' | ReceiptMethod>('all');
  const [selected, setSelected] = useState<ReceiptVoucher | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    voucherNo: '',
    payer: '',
    payerAr: '',
    method: 'bank_transfer' as ReceiptMethod,
    date: '',
    amount: '',
    currency: 'SAR' as ReceiptVoucher['currency'],
    reference: '',
    status: 'draft' as ReceiptStatus,
  });

  const filtered = useMemo(() => {
    return vouchers.filter(v => {
      const sOk = selectedStatus === 'all' || v.status === selectedStatus;
      const mOk = selectedMethod === 'all' || v.method === selectedMethod;
      return sOk && mOk;
    });
  }, [vouchers, selectedStatus, selectedMethod]);

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency }).format(amount);

  const getStatusBadge = (status: ReceiptStatus) => {
    const styles: Record<ReceiptStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      void: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<ReceiptStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      posted: { en: 'Posted', ar: 'مرحل' },
      void: { en: 'Void', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const methodLabel = (m: ReceiptMethod) => {
    const labels: Record<ReceiptMethod, { en: string; ar: string }> = {
      cash: { en: 'Cash', ar: 'نقداً' },
      bank_transfer: { en: 'Bank transfer', ar: 'تحويل بنكي' },
      cheque: { en: 'Cheque', ar: 'شيك' },
    };
    return locale === 'ar' ? labels[m].ar : labels[m].en;
  };

  const postedCount = vouchers.filter(v => v.status === 'posted').length;
  const draftCount = vouchers.filter(v => v.status === 'draft').length;
  const voidCount = vouchers.filter(v => v.status === 'void').length;
  const totalSar = vouchers.reduce((sum, v) => sum + (v.currency === 'SAR' ? v.amount : 0), 0);

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ voucherNo: '', payer: '', payerAr: '', method: 'bank_transfer', date: '', amount: '', currency: 'SAR', reference: '', status: 'draft' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'سند القبض - SLMS' : 'Receipt Voucher - SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'سند القبض' : 'Receipt Voucher'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إنشاء وترحيل سندات قبض من العملاء' : 'Create and post receipt vouchers from customers'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'سند جديد' : 'New Voucher'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مرحل' : 'Posted'}</p>
            <p className="text-2xl font-bold text-green-600">{postedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مسودة' : 'Draft'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{draftCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'ملغي' : 'Void'}</p>
            <p className="text-2xl font-bold text-red-600">{voidCount}</p>
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
            <div className="flex items-center gap-3">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="posted">{locale === 'ar' ? 'مرحل' : 'Posted'}</option>
                <option value="void">{locale === 'ar' ? 'ملغي' : 'Void'}</option>
              </select>
              <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الطرق' : 'All Methods'}</option>
                <option value="cash">{locale === 'ar' ? 'نقداً' : 'Cash'}</option>
                <option value="bank_transfer">{locale === 'ar' ? 'تحويل بنكي' : 'Bank transfer'}</option>
                <option value="cheque">{locale === 'ar' ? 'شيك' : 'Cheque'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">RV</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الدافع' : 'Payer'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الطريقة' : 'Method'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مرجع' : 'Reference'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.voucherNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? v.payerAr : v.payer}</td>
                    <td className="px-4 py-3 text-gray-500">{methodLabel(v.method)}</td>
                    <td className="px-4 py-3 text-gray-500">{v.date}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatMoney(v.amount, v.currency)}</td>
                    <td className="px-4 py-3 text-gray-500">{v.reference || '—'}</td>
                    <td className="px-4 py-3">{getStatusBadge(v.status)}</td>
                    <td className="px-4 py-3"><Button size="sm" variant="secondary" onClick={() => setSelected(v)}><EyeIcon className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل سند القبض' : 'Receipt Voucher Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.voucherNo}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.payerAr : selected.payer} • {methodLabel(selected.method)}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'التاريخ' : 'Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.date}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.amount, selected.currency)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'مرجع' : 'Reference'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.reference || '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإجراء' : 'Action'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? 'ترحيل/إلغاء/تصدير' : 'Post/Void/Export'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم الترحيل (تجريبي)' : 'Posted (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'ترحيل' : 'Post'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإلغاء (تجريبي)' : 'Voided (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إلغاء' : 'Void'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'سند قبض جديد' : 'New Receipt Voucher'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="RV" value={formData.voucherNo} onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })} placeholder="RV-..." />
            <Input label={locale === 'ar' ? 'التاريخ' : 'Date'} value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'الدافع (EN)' : 'Payer (EN)'} value={formData.payer} onChange={(e) => setFormData({ ...formData, payer: e.target.value })} />
            <Input label={locale === 'ar' ? 'الدافع (AR)' : 'Payer (AR)'} value={formData.payerAr} onChange={(e) => setFormData({ ...formData, payerAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'مرجع' : 'Reference'} value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="INV-..." />
            <Input label={locale === 'ar' ? 'المبلغ' : 'Amount'} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الطريقة' : 'Method'}</label>
              <select value={formData.method} onChange={(e) => setFormData({ ...formData, method: e.target.value as any })} className="input">
                <option value="cash">{locale === 'ar' ? 'نقداً' : 'Cash'}</option>
                <option value="bank_transfer">{locale === 'ar' ? 'تحويل بنكي' : 'Bank transfer'}</option>
                <option value="cheque">{locale === 'ar' ? 'شيك' : 'Cheque'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة' : 'Currency'}</label>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })} className="input">
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="posted">{locale === 'ar' ? 'مرحل' : 'Posted'}</option>
                <option value="void">{locale === 'ar' ? 'ملغي' : 'Void'}</option>
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
