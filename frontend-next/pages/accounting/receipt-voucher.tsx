import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
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
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type ReceiptStatus = 'draft' | 'approved' | 'posted' | 'reversed';

interface ReceiptVoucher {
  id: number;
  voucher_number: string;
  customer_id: number;
  customer_name?: string;
  receipt_date: string;
  payment_method_name?: string;
  bank_account_number?: string;
  bank_name?: string;
  amount: number;
  amount_base?: number;
  currency_code?: string;
  exchange_rate?: number;
  reference_number?: string;
  notes?: string;
  status: ReceiptStatus;
  journal_entry_id?: number | null;
}

interface CustomerOption { id: number; code: string; name: string; name_ar?: string; }
interface CashBoxOption { id: number; code: string; name: string; }
interface BankAccountOption { id: number; account_number: string; bank_name?: string; account_name?: string; }
interface CurrencyOption { id: number; code: string; name: string; }

export default function ReceiptVoucherPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('receipt_vouchers:create') || hasPermission('accounting:manage');
  const canPost = hasPermission('receipt_vouchers:post') || hasPermission('receipt_vouchers:approve') || hasPermission('accounting:manage');

  const [vouchers, setVouchers] = useState<ReceiptVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | ReceiptStatus>('all');
  const [selected, setSelected] = useState<ReceiptVoucher | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBoxOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    receipt_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'bank_transfer' | 'cheque',
    cash_register_id: '',
    bank_account_id: '',
    currency_id: '',
    exchange_rate: '1',
    amount: '',
    reference_number: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rvRes, custRes, cbRes, baRes, curRes] = await Promise.all([
        apiClient.get('/api/receipt-vouchers').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/customers').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/cash-boxes').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/bank-accounts').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/finance/currencies?is_active=true').catch(() => ({ data: { data: [] } })),
      ]);
      const rvData = Array.isArray(rvRes?.data?.data) ? rvRes.data.data : Array.isArray(rvRes?.data) ? rvRes.data : [];
      setVouchers(rvData);
      const custData = Array.isArray(custRes?.data?.data) ? custRes.data.data : [];
      setCustomers(custData.map((c: any) => ({ id: c.id, code: c.code, name: c.name, name_ar: c.name_ar })));
      const cbData = Array.isArray(cbRes?.data?.data) ? cbRes.data.data : [];
      setCashBoxes(cbData.map((c: any) => ({ id: c.id, code: c.code, name: c.name })));
      const baData = Array.isArray(baRes?.data?.data) ? baRes.data.data : [];
      setBankAccounts(baData.map((b: any) => ({ id: b.id, account_number: b.account_number, bank_name: b.bank_name, account_name: b.account_name })));
      const curData = Array.isArray(curRes?.data?.data) ? curRes.data.data : Array.isArray(curRes?.data) ? curRes.data : [];
      setCurrencies(curData.map((c: any) => ({ id: c.id, code: c.code, name: c.name })));
      if (!formData.currency_id) {
        const sar = curData.find((c: any) => c.code === 'SAR');
        if (sar) setFormData(f => ({ ...f, currency_id: String(sar.id) }));
      }
    } catch (err) {
      console.error('Error fetching receipt voucher data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return vouchers.filter(v => selectedStatus === 'all' || v.status === selectedStatus);
  }, [vouchers, selectedStatus]);

  const formatMoney = (amount: number, currency?: string) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: currency || 'SAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      reversed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      approved: { en: 'Approved', ar: 'معتمد' },
      posted: { en: 'Posted', ar: 'مرحّل' },
      reversed: { en: 'Reversed', ar: 'معكوس' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status] || styles.draft)}>
        {locale === 'ar' ? (labels[status]?.ar || status) : (labels[status]?.en || status)}
      </span>
    );
  };

  const postedCount = vouchers.filter(v => v.status === 'posted').length;
  const draftCount = vouchers.filter(v => v.status === 'draft').length;
  const totalAmount = vouchers.reduce((sum, v) => sum + (parseFloat(String(v.amount)) || 0), 0);

  const handleCreate = async () => {
    if (!formData.customer_id || !formData.amount || !formData.currency_id) {
      showToast(locale === 'ar' ? 'العميل والمبلغ والعملة مطلوبة' : 'Customer, amount and currency required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        customer_id: Number(formData.customer_id),
        receipt_date: formData.receipt_date,
        currency_id: Number(formData.currency_id),
        exchange_rate: parseFloat(formData.exchange_rate) || 1,
        amount: parseFloat(formData.amount),
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
      };
      if (formData.payment_method === 'cash' && formData.cash_register_id) {
        payload.cash_register_id = Number(formData.cash_register_id);
      }
      if (formData.payment_method !== 'cash' && formData.bank_account_id) {
        payload.bank_account_id = Number(formData.bank_account_id);
      }
      await apiClient.post('/api/receipt-vouchers', payload);
      showToast(locale === 'ar' ? 'تم إنشاء سند القبض' : 'Receipt voucher created', 'success');
      setCreateOpen(false);
      setFormData({ customer_id: '', receipt_date: new Date().toISOString().split('T')[0], payment_method: 'cash', cash_register_id: '', bank_account_id: '', currency_id: formData.currency_id, exchange_rate: '1', amount: '', reference_number: '', notes: '' });
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to create', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async (rv: ReceiptVoucher) => {
    try {
      await apiClient.post(`/api/receipt-vouchers/${rv.id}/post`);
      showToast(locale === 'ar' ? 'تم ترحيل سند القبض' : 'Receipt voucher posted', 'success');
      setSelected(null);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to post', 'error');
    }
  };

  const handleReverse = async (rv: ReceiptVoucher) => {
    try {
      await apiClient.post(`/api/receipt-vouchers/${rv.id}/reverse`, { reason: 'Reversed by user' });
      showToast(locale === 'ar' ? 'تم عكس سند القبض' : 'Receipt voucher reversed', 'success');
      setSelected(null);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to reverse', 'error');
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'سندات القبض - SLMS' : 'Receipt Vouchers - SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'سندات القبض' : 'Receipt Vouchers'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إنشاء وترحيل سندات قبض من العملاء' : 'Create and post receipt vouchers from customers'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchData}><ArrowPathIcon className="h-4 w-4" />{locale === 'ar' ? 'تحديث' : 'Refresh'}</Button>
            {canCreate && (<Button onClick={() => setCreateOpen(true)}><PlusIcon className="h-4 w-4" />{locale === 'ar' ? 'سند جديد' : 'New Voucher'}</Button>)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{vouchers.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مسودة' : 'Draft'}</p>
            <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مرحّل' : 'Posted'}</p>
            <p className="text-2xl font-bold text-green-600">{postedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2"><CurrencyDollarIcon className="h-5 w-5 text-emerald-600" /><p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي المبالغ' : 'Total Amount'}</p></div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(totalAmount)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
              <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
              <option value="posted">{locale === 'ar' ? 'مرحّل' : 'Posted'}</option>
              <option value="reversed">{locale === 'ar' ? 'معكوس' : 'Reversed'}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم السند' : 'Voucher #'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العملة' : 'Currency'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مرجع' : 'Reference'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{locale === 'ar' ? 'لا توجد سندات' : 'No vouchers found'}</td></tr>
                ) : filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.voucher_number}</td>
                    <td className="px-4 py-3 text-gray-500">{String(v.receipt_date).slice(0, 10)}</td>
                    <td className="px-4 py-3 text-gray-500">{v.currency_code || 'SAR'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatMoney(parseFloat(String(v.amount)) || 0, v.currency_code || 'SAR')}</td>
                    <td className="px-4 py-3 text-gray-500">{v.reference_number || '—'}</td>
                    <td className="px-4 py-3">{getStatusBadge(v.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(v)}><EyeIcon className="h-4 w-4" /></Button>
                        {(v.status === 'draft' || v.status === 'approved') && canPost && (
                          <Button size="sm" onClick={() => handlePost(v)}><CheckCircleIcon className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </td>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.voucher_number}</h3>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'التاريخ' : 'Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{String(selected.receipt_date).slice(0, 10)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(parseFloat(String(selected.amount)) || 0, selected.currency_code || 'SAR')}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'مرجع' : 'Reference'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.reference_number || '—'}</p>
              </div>
              {selected.journal_entry_id && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500">{locale === 'ar' ? 'قيد يومية' : 'Journal Entry'}</p>
                  <p className="font-medium text-gray-900 dark:text-white">#{selected.journal_entry_id}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              {(selected.status === 'draft' || selected.status === 'approved') && canPost && (
                <Button onClick={() => handlePost(selected)}><CheckCircleIcon className="h-4 w-4" />{locale === 'ar' ? 'ترحيل' : 'Post'}</Button>
              )}
              {selected.status === 'posted' && (
                <Button variant="danger" onClick={() => handleReverse(selected)}><XCircleIcon className="h-4 w-4" />{locale === 'ar' ? 'عكس' : 'Reverse'}</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'سند قبض جديد' : 'New Receipt Voucher'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العميل' : 'Customer'} *</label>
              <select value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">{locale === 'ar' ? 'اختر العميل' : 'Select Customer'}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.code} - {locale === 'ar' && c.name_ar ? c.name_ar : c.name}</option>)}
              </select>
            </div>
            <Input label={locale === 'ar' ? 'التاريخ' : 'Date'} type="date" value={formData.receipt_date} onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })} />
            <Input label={locale === 'ar' ? 'المبلغ' : 'Amount'} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'طريقة الدفع' : 'Method'}</label>
              <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="cash">{locale === 'ar' ? 'نقداً' : 'Cash'}</option>
                <option value="bank_transfer">{locale === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="cheque">{locale === 'ar' ? 'شيك' : 'Cheque'}</option>
              </select>
            </div>
            {formData.payment_method === 'cash' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الصندوق' : 'Cash Box'}</label>
                <select value={formData.cash_register_id} onChange={(e) => setFormData({ ...formData, cash_register_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="">{locale === 'ar' ? 'اختر الصندوق' : 'Select Cash Box'}</option>
                  {cashBoxes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحساب البنكي' : 'Bank Account'}</label>
                <select value={formData.bank_account_id} onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="">{locale === 'ar' ? 'اختر الحساب' : 'Select Bank Account'}</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.account_number} {b.bank_name ? `- ${b.bank_name}` : ''}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة' : 'Currency'}</label>
              <select value={formData.currency_id} onChange={(e) => setFormData({ ...formData, currency_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">{locale === 'ar' ? 'اختر العملة' : 'Select Currency'}</option>
                {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>
            <Input label={locale === 'ar' ? 'سعر الصرف' : 'Exchange Rate'} value={formData.exchange_rate} onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })} inputMode="decimal" placeholder="1" />
            <Input label={locale === 'ar' ? 'مرجع' : 'Reference'} value={formData.reference_number} onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })} placeholder="INV-..." />
            <div className="sm:col-span-2">
              <Input label={locale === 'ar' ? 'ملاحظات' : 'Notes'} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={locale === 'ar' ? 'ملاحظات...' : 'Notes...'} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : (locale === 'ar' ? 'إنشاء' : 'Create')}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
