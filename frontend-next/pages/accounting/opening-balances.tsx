import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../lib/apiClient';
import withPermission from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import { usePermissions } from '../../hooks/usePermissions';
import {
  ScaleIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type OpeningStatus = 'draft' | 'posted' | 'reversed';

interface OpeningBalanceLine {
  id: number;
  batchId: number;
  batchNo: string;
  period: string;
  accountCode: string;
  accountName: string;
  accountNameAr: string;
  debit: number;
  credit: number;
  currency: string;
  status: OpeningStatus;
}
function OpeningBalancesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<OpeningBalanceLine[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | OpeningStatus>('all');
  const [selectedBatch, setSelectedBatch] = useState<'all' | string>('all');
  const [selected, setSelected] = useState<OpeningBalanceLine | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [formData, setFormData] = useState({
    batchNo: '',
    period: '',
    accountCode: '',
    accountName: '',
    accountNameAr: '',
    debit: '',
    credit: '',
    currency: 'SAR' as string,
  });

  const canCreate = hasPermission(MenuPermissions.Accounting.OpeningBalances.Create);
  const canPost = hasPermission(MenuPermissions.Accounting.OpeningBalances.Post);
  const canReverse = hasPermission(MenuPermissions.Accounting.OpeningBalances.Reverse);

  const fetchLines = async () => {
    setLoading(true);
    try {
      const resp = await apiClient.get<any>('/api/opening-balances');
      const rows = Array.isArray(resp) ? resp : resp.data || [];
      const mapped: OpeningBalanceLine[] = rows.map((r: any) => {
        const year = Number(r.year);
        const month = Number(r.month);
        const period = `${year}-${String(month).padStart(2, '0')}`;
        return {
          id: Number(r.id),
          batchId: Number(r.batch_id),
          batchNo: String(r.batch_no),
          period,
          accountCode: String(r.account_code),
          accountName: String(r.account_name || ''),
          accountNameAr: String(r.account_name_ar || ''),
          debit: Number(r.debit || 0),
          credit: Number(r.credit || 0),
          currency: String(r.currency_code || ''),
          status: (String(r.status) as OpeningStatus) || 'draft',
        };
      });
      setLines(mapped);
    } catch (e: any) {
      setLines([]);
      showToast(e?.message || (locale === 'ar' ? 'فشل التحميل' : 'Failed to load'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const batches = useMemo(() => Array.from(new Set(lines.map(l => l.batchNo))), [lines]);

  const filtered = useMemo(() => {
    return lines.filter(l => {
      const sOk = selectedStatus === 'all' || l.status === selectedStatus;
      const bOk = selectedBatch === 'all' || l.batchNo === selectedBatch;
      return sOk && bOk;
    });
  }, [lines, selectedStatus, selectedBatch]);

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency }).format(amount);

  const getStatusBadge = (status: OpeningStatus) => {
    const styles: Record<OpeningStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      reversed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
    const labels: Record<OpeningStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      posted: { en: 'Posted', ar: 'مرحل' },
      reversed: { en: 'Reversed', ar: 'معكوس' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const postedCount = lines.filter(l => l.status === 'posted').length;
  const draftCount = lines.filter(l => l.status === 'draft').length;
  const totalDebitSar = lines.reduce((sum, l) => sum + (l.currency === 'SAR' ? l.debit : 0), 0);
  const totalCreditSar = lines.reduce((sum, l) => sum + (l.currency === 'SAR' ? l.credit : 0), 0);

  const handleCreate = () => {
    // Kept for backward compatibility; use handleCreateReal instead.
  };

  const handleCreateReal = async () => {
    const debit = Number(formData.debit || 0);
    const credit = Number(formData.credit || 0);

    if (!formData.batchNo.trim()) {
      showToast(locale === 'ar' ? 'رقم الدفعة مطلوب' : 'Batch no is required', 'error');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(formData.period.trim())) {
      showToast(locale === 'ar' ? 'الفترة يجب أن تكون YYYY-MM' : 'Period must be YYYY-MM', 'error');
      return;
    }
    if (!formData.accountCode.trim()) {
      showToast(locale === 'ar' ? 'كود الحساب مطلوب' : 'Account code is required', 'error');
      return;
    }
    if (!(Number.isFinite(debit) && debit >= 0) || !(Number.isFinite(credit) && credit >= 0)) {
      showToast(locale === 'ar' ? 'قيم المدين/الدائن غير صحيحة' : 'Invalid debit/credit', 'error');
      return;
    }

    setBusy(true);
    try {
      await apiClient.post('/api/opening-balances', {
        batch_no: formData.batchNo,
        period: formData.period,
        account_code: formData.accountCode,
        debit,
        credit,
        currency_code: formData.currency,
        description: null,
      });
      showToast(locale === 'ar' ? 'تمت الإضافة' : 'Added', 'success');
      setCreateOpen(false);
      setFormData({ batchNo: '', period: '', accountCode: '', accountName: '', accountNameAr: '', debit: '', credit: '', currency: 'SAR' });
      fetchLines();
    } catch (e: any) {
      showToast(e?.message || (locale === 'ar' ? 'فشل الإضافة' : 'Failed to add'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePostBatch = async (batchId: number) => {
    setBusy(true);
    try {
      await apiClient.post(`/api/opening-balances/batches/${batchId}/post`, {});
      showToast(locale === 'ar' ? 'تم الترحيل' : 'Posted', 'success');
      fetchLines();
    } catch (e: any) {
      showToast(e?.message || (locale === 'ar' ? 'فشل الترحيل' : 'Failed to post'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReverseBatch = async (batchId: number) => {
    setBusy(true);
    try {
      await apiClient.post(`/api/opening-balances/batches/${batchId}/reverse`, {});
      showToast(locale === 'ar' ? 'تم العكس' : 'Reversed', 'success');
      fetchLines();
    } catch (e: any) {
      showToast(e?.message || (locale === 'ar' ? 'فشل العكس' : 'Failed to reverse'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الأرصدة الافتتاحية - SLMS' : 'Opening Balances - SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <ScaleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'الأرصدة الافتتاحية' : 'Opening Balances'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تسجيل وترحيل أرصدة بداية الفترة حسب الحسابات' : 'Record and post opening balances by account'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'قيد جديد' : 'New Line'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مرحل' : 'Posted lines'}</p>
            <p className="text-2xl font-bold text-green-600">{postedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مسودة' : 'Draft lines'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{draftCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي مدين SAR' : 'Total debit SAR'}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(totalDebitSar, 'SAR')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي دائن SAR' : 'Total credit SAR'}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(totalCreditSar, 'SAR')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الدُفعات' : 'All batches'}</option>
                {batches.map((b) => (<option key={b} value={b}>{b}</option>))}
              </select>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="posted">{locale === 'ar' ? 'مرحل' : 'Posted'}</option>
                <option value="reversed">{locale === 'ar' ? 'معكوس' : 'Reversed'}</option>
              </select>
            </div>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'قريباً' : 'Coming soon', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'دفعة' : 'Batch'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحساب' : 'Account'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مدين' : 'Debit'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'دائن' : 'Credit'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</td></tr>
                ) : filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.batchNo}</td>
                    <td className="px-4 py-3 text-gray-500">{l.period}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{l.accountCode} - {locale === 'ar' ? l.accountNameAr : l.accountName}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatMoney(l.debit, l.currency)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatMoney(l.credit, l.currency)}</td>
                    <td className="px-4 py-3">{getStatusBadge(l.status)}</td>
                    <td className="px-4 py-3"><Button size="sm" variant="secondary" onClick={() => setSelected(l)}><EyeIcon className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل القيد' : 'Line Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.batchNo}</h3>
                <p className="text-sm text-gray-500">{selected.period} • {selected.accountCode}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الحساب' : 'Account'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.accountNameAr : selected.accountName}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الرصيد' : 'Balance'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.debit - selected.credit, selected.currency)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              {selected.status === 'draft' && canPost && (
                <Button onClick={() => handlePostBatch(selected.batchId)} disabled={busy}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'ترحيل' : 'Post'}
                </Button>
              )}
              {selected.status === 'posted' && canReverse && (
                <Button variant="danger" onClick={() => handleReverseBatch(selected.batchId)} disabled={busy}>
                  <XCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'عكس' : 'Reverse'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'قيد رصيد افتتاحي' : 'Opening Balance Line'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'رقم الدفعة' : 'Batch no'} value={formData.batchNo} onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })} placeholder="OB-..." />
            <Input label={locale === 'ar' ? 'الفترة' : 'Period'} value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} placeholder="YYYY-MM" />
            <Input label={locale === 'ar' ? 'كود الحساب' : 'Account code'} value={formData.accountCode} onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })} placeholder="1100" />
            <Input label={locale === 'ar' ? 'اسم الحساب (EN)' : 'Account name (EN)'} value={formData.accountName} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })} />
            <Input label={locale === 'ar' ? 'اسم الحساب (AR)' : 'Account name (AR)'} value={formData.accountNameAr} onChange={(e) => setFormData({ ...formData, accountNameAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'مدين' : 'Debit'} value={formData.debit} onChange={(e) => setFormData({ ...formData, debit: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <Input label={locale === 'ar' ? 'دائن' : 'Credit'} value={formData.credit} onChange={(e) => setFormData({ ...formData, credit: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة' : 'Currency'}</label>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })} className="input">
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreateReal} disabled={busy}>{locale === 'ar' ? 'إضافة' : 'Add'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Accounting.OpeningBalances.View, OpeningBalancesPage);
