import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExchangeRateField from '../../components/ui/ExchangeRateField';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import apiClient from '../../lib/apiClient';
import {
  BanknotesIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type VoucherStatus = 'draft' | 'posted' | 'void';
type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque';

interface PaymentVoucher {
  id: number;
  voucherNo: string;
  payee: string;
  payeeAr: string;
  method: PaymentMethod;
  date: string;
  amount: number;
  currency: string;
  reference?: string;
  status: VoucherStatus;
  journal_id?: number | null;
}

type CashBoxOption = {
  id: number;
  code: string;
  name: string;
  name_ar?: string | null;
  currency_code: string;
};

type BankAccountOption = {
  id: number;
  bank_name: string;
  bank_name_ar?: string | null;
  account_number: string;
  currency_code: string;
};

type CreateVoucherForm = {
  voucher_date: string;
  payee: string;
  payee_ar: string;
  method: PaymentMethod;
  cash_box_id: string;
  bank_account_id: string;
  expense_gl_account_code: string;
  amount: string;
  currency_code: string;
  exchange_rate: string;
  reference: string;
};

export default function PaymentVoucherPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const canView =
    hasPermission('purchases:payment:view') ||
    hasPermission('purchases:payment:create') ||
    hasPermission('purchases:payment:approve') ||
    hasPermission('accounting:manage');
  const canCreate =
    hasPermission('purchases:payment:create') ||
    hasPermission('purchases:payment:approve') ||
    hasPermission('accounting:manage');
  const canPost =
    hasPermission('purchases:payment:approve') ||
    hasPermission('accounting:journal:post') ||
    hasPermission('accounting:manage');
  const canVoid =
    hasPermission('purchases:payment:approve') ||
    hasPermission('accounting:journal:delete') ||
    hasPermission('accounting:manage');

  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBoxOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | VoucherStatus>('all');
  const [selectedMethod, setSelectedMethod] = useState<'all' | PaymentMethod>('all');
  const [selected, setSelected] = useState<PaymentVoucher | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmVoidOpen, setConfirmVoidOpen] = useState(false);

  const [formData, setFormData] = useState<CreateVoucherForm>({
    voucher_date: new Date().toISOString().split('T')[0],
    payee: '',
    payee_ar: '',
    method: 'bank_transfer',
    cash_box_id: '',
    bank_account_id: '',
    expense_gl_account_code: '',
    amount: '',
    currency_code: 'SAR',
    exchange_rate: '1',
    reference: '',
  });

  const normalizeList = (resp: any): any[] => {
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp?.data)) return resp.data;
    if (Array.isArray(resp?.data?.data)) return resp.data.data;
    return [];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vouchersRes, cashBoxesRes, bankAccountsRes]: any[] = await Promise.all([
        apiClient.get('/api/payment-vouchers?limit=100'),
        apiClient.get('/api/cash-boxes'),
        apiClient.get('/api/bank-accounts'),
      ]);

      const voucherRows: PaymentVoucher[] = normalizeList(vouchersRes).map((r: any) => ({
        id: Number(r.id),
        voucherNo: r.voucherNo || r.voucher_number || r.voucherNo,
        payee: r.payee,
        payeeAr: r.payeeAr || r.payee_ar || '',
        method: r.method,
        date: r.date || String(r.voucher_date || '').slice(0, 10),
        amount: Number(r.amount) || 0,
        currency: r.currency || r.currency_code || 'SAR',
        reference: r.reference || '',
        status: r.status,
        journal_id: r.journal_id ?? r.journal_entry_id ?? null,
      }));
      setVouchers(voucherRows);

      const cbRows: CashBoxOption[] = normalizeList(cashBoxesRes);
      setCashBoxes(cbRows);

      const baRows: any[] = normalizeList(bankAccountsRes);
      const normalizedBankAccounts: BankAccountOption[] = baRows.map((r: any) => ({
        id: Number(r.id),
        bank_name: r.bank_name,
        bank_name_ar: r.bank_name_ar,
        account_number: r.account_number,
        currency_code: r.currency_code,
      }));
      setBankAccounts(normalizedBankAccounts);
    } catch {
      setVouchers([]);
      setCashBoxes([]);
      setBankAccounts([]);
      showToast(t('common.failedToLoad', 'Failed to load'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const filtered = useMemo(() => {
    return vouchers.filter(v => {
      const sOk = selectedStatus === 'all' || v.status === selectedStatus;
      const mOk = selectedMethod === 'all' || v.method === selectedMethod;
      return sOk && mOk;
    });
  }, [vouchers, selectedStatus, selectedMethod]);

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency }).format(amount);

  const getStatusBadge = (status: VoucherStatus) => {
    const styles: Record<VoucherStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      void: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<VoucherStatus, { en: string; ar: string }> = {
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

  const postedCount = vouchers.filter(v => v.status === 'posted').length;
  const draftCount = vouchers.filter(v => v.status === 'draft').length;
  const voidCount = vouchers.filter(v => v.status === 'void').length;
  const totalSar = vouchers.reduce((sum, v) => sum + (v.currency === 'SAR' ? v.amount : 0), 0);

  const handleCreate = async () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }

    if (!formData.voucher_date) {
      showToast(locale === 'ar' ? 'التاريخ مطلوب' : 'Date is required', 'error');
      return;
    }
    if (!formData.payee.trim()) {
      showToast(locale === 'ar' ? 'اسم المستفيد مطلوب' : 'Payee is required', 'error');
      return;
    }
    if (!formData.expense_gl_account_code.trim()) {
      showToast(locale === 'ar' ? 'حساب المصروف مطلوب' : 'Expense account code is required', 'error');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast(locale === 'ar' ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be > 0', 'error');
      return;
    }
    if (formData.method === 'cash' && !formData.cash_box_id) {
      showToast(locale === 'ar' ? 'اختر صندوق النقد' : 'Select cash box', 'error');
      return;
    }
    if (formData.method !== 'cash' && !formData.bank_account_id) {
      showToast(locale === 'ar' ? 'اختر الحساب البنكي' : 'Select bank account', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/payment-vouchers', {
        voucher_date: formData.voucher_date,
        payee: formData.payee,
        payee_ar: formData.payee_ar,
        method: formData.method,
        amount: formData.amount,
        currency_code: formData.currency_code,
        exchange_rate: formData.exchange_rate,
        reference: formData.reference,
        cash_box_id: formData.method === 'cash' ? formData.cash_box_id : null,
        bank_account_id: formData.method === 'cash' ? null : formData.bank_account_id,
        expense_gl_account_code: formData.expense_gl_account_code,
      });

      showToast(locale === 'ar' ? 'تم إنشاء السند' : 'Voucher created', 'success');
      setCreateOpen(false);
      setFormData({
        voucher_date: new Date().toISOString().split('T')[0],
        payee: '',
        payee_ar: '',
        method: 'bank_transfer',
        cash_box_id: '',
        bank_account_id: '',
        expense_gl_account_code: '',
        amount: '',
        currency_code: 'SAR',
        exchange_rate: '1',
        reference: '',
      });
      await fetchData();
    } catch {
      showToast(locale === 'ar' ? 'فشل إنشاء السند' : 'Failed to create voucher', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!selected) return;
    if (!canPost) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    try {
      await apiClient.post(`/api/payment-vouchers/${selected.id}/post`, {});
      showToast(locale === 'ar' ? 'تم ترحيل السند' : 'Voucher posted', 'success');
      setSelected(null);
      await fetchData();
    } catch {
      showToast(locale === 'ar' ? 'فشل ترحيل السند' : 'Failed to post voucher', 'error');
    }
  };

  const handleVoid = async () => {
    if (!selected) return;
    if (!canVoid) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    try {
      await apiClient.post(`/api/payment-vouchers/${selected.id}/void`, {});
      showToast(locale === 'ar' ? 'تم إلغاء السند' : 'Voucher voided', 'warning');
      setConfirmVoidOpen(false);
      setSelected(null);
      await fetchData();
    } catch {
      showToast(locale === 'ar' ? 'فشل إلغاء السند' : 'Failed to void voucher', 'error');
    }
  };

  const methodLabel = (m: PaymentMethod) => {
    const labels: Record<PaymentMethod, { en: string; ar: string }> = {
      cash: { en: 'Cash', ar: 'نقداً' },
      bank_transfer: { en: 'Bank transfer', ar: 'تحويل بنكي' },
      cheque: { en: 'Cheque', ar: 'شيك' },
    };
    return locale === 'ar' ? labels[m].ar : labels[m].en;
  };

  // Keep currency synced with selected source (cash box / bank account)
  useEffect(() => {
    if (formData.method === 'cash') {
      const cb = cashBoxes.find((c) => String(c.id) === formData.cash_box_id);
      if (cb?.currency_code && cb.currency_code !== formData.currency_code) {
        setFormData((prev) => ({ ...prev, currency_code: cb.currency_code }));
      }
      return;
    }

    const ba = bankAccounts.find((b) => String(b.id) === formData.bank_account_id);
    if (ba?.currency_code && ba.currency_code !== formData.currency_code) {
      setFormData((prev) => ({ ...prev, currency_code: ba.currency_code }));
    }
  }, [formData.method, formData.cash_box_id, formData.bank_account_id, cashBoxes, bankAccounts, formData.currency_code]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'سند الصرف - SLMS' : 'Payment Voucher - SLMS'}</title>
        </Head>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-200">{locale === 'ar' ? 'غير مصرح' : 'Access denied'}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'سند الصرف - SLMS' : 'Payment Voucher - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'سند الصرف' : 'Payment Voucher'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إنشاء وترحيل سندات صرف للموردين' : 'Create and post payment vouchers for vendors'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} disabled={!canCreate}>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PV</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المستفيد' : 'Payee'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الطريقة' : 'Method'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مرجع' : 'Reference'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'لا توجد بيانات' : 'No data'}
                    </td>
                  </tr>
                ) : filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.voucherNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? v.payeeAr : v.payee}</td>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل سند الصرف' : 'Payment Voucher Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.voucherNo}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.payeeAr : selected.payee} • {methodLabel(selected.method)}</p>
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
              {selected.status === 'draft' && (
                <Button onClick={handlePost} disabled={!canPost}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'ترحيل' : 'Post'}
                </Button>
              )}
              {selected.status === 'draft' && (
                <Button variant="danger" onClick={() => setConfirmVoidOpen(true)} disabled={!canVoid}>
                  <XCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'إلغاء' : 'Void'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'سند صرف جديد' : 'New Payment Voucher'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'التاريخ' : 'Date'}
              value={formData.voucher_date}
              onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label={locale === 'ar' ? 'المستفيد (EN)' : 'Payee (EN)'}
              value={formData.payee}
              onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
            />
            <Input
              label={locale === 'ar' ? 'المستفيد (AR)' : 'Payee (AR)'}
              value={formData.payee_ar}
              onChange={(e) => setFormData({ ...formData, payee_ar: e.target.value })}
            />
            <Input
              label={locale === 'ar' ? 'مرجع' : 'Reference'}
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="BILL-..."
            />
            <Input
              label={locale === 'ar' ? 'المبلغ' : 'Amount'}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              inputMode="decimal"
              placeholder="0.00"
            />
            <Input
              label={locale === 'ar' ? 'كود حساب المصروف' : 'Expense GL Account Code'}
              value={formData.expense_gl_account_code}
              onChange={(e) => setFormData({ ...formData, expense_gl_account_code: e.target.value })}
              placeholder="5100"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الطريقة' : 'Method'}</label>
              <select
                value={formData.method}
                onChange={(e) => {
                  const next = e.target.value as PaymentMethod;
                  setFormData((prev) => ({
                    ...prev,
                    method: next,
                    cash_box_id: next === 'cash' ? prev.cash_box_id : '',
                    bank_account_id: next === 'cash' ? '' : prev.bank_account_id,
                  }));
                }}
                className="input"
              >
                <option value="cash">{locale === 'ar' ? 'نقداً' : 'Cash'}</option>
                <option value="bank_transfer">{locale === 'ar' ? 'تحويل بنكي' : 'Bank transfer'}</option>
                <option value="cheque">{locale === 'ar' ? 'شيك' : 'Cheque'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة' : 'Currency'}</label>
              <Input
                value={formData.currency_code}
                onChange={(e) => setFormData({ ...formData, currency_code: e.target.value.toUpperCase() })}
                placeholder="SAR"
              />
            </div>
            <ExchangeRateField
              currencyCode={formData.currency_code}
              value={formData.exchange_rate}
              onChange={(value) => setFormData({ ...formData, exchange_rate: value })}
              label={locale === 'ar' ? 'سعر الصرف' : 'Exchange rate'}
              date={formData.voucher_date}
            />

            {formData.method === 'cash' ? (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'صندوق النقد' : 'Cash Box'}</label>
                <select
                  value={formData.cash_box_id}
                  onChange={(e) => setFormData({ ...formData, cash_box_id: e.target.value })}
                  className="input"
                >
                  <option value="">{locale === 'ar' ? 'اختر...' : 'Select...'}</option>
                  {cashBoxes.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {locale === 'ar' ? (c.name_ar || c.name) : c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحساب البنكي' : 'Bank Account'}</label>
                <select
                  value={formData.bank_account_id}
                  onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                  className="input"
                >
                  <option value="">{locale === 'ar' ? 'اختر...' : 'Select...'}</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {(locale === 'ar' ? (b.bank_name_ar || b.bank_name) : b.bank_name) + ' - ' + b.account_number}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate} loading={isSubmitting}>
              {locale === 'ar' ? 'إنشاء' : 'Create'}
            </Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmVoidOpen}
        onClose={() => setConfirmVoidOpen(false)}
        onConfirm={handleVoid}
        title={locale === 'ar' ? 'إلغاء سند الصرف' : 'Void Payment Voucher'}
        message={locale === 'ar' ? 'هل أنت متأكد؟ سيتم إلغاء السند (مسودة) ولا يمكن التراجع.' : 'Are you sure? This will void the draft voucher and cannot be undone.'}
        confirmText={locale === 'ar' ? 'إلغاء' : 'Void'}
        variant="danger"
      />
    </MainLayout>
  );
}
