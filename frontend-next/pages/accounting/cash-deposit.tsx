import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import apiClient from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExchangeRateField from '../../components/ui/ExchangeRateField';
import {
  BanknotesIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PrinterIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CashDeposit {
  id: number;
  depositNumber: string;
  date: string;
  cashAccount: string;
  cashAccountAr: string;
  bankAccount: string;
  bankAccountAr: string;
  bankName: string;
  bankNameAr: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  description: string;
  descriptionAr: string;
  depositSlipNo: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdBy: string;
  confirmedBy: string;
  confirmedDate: string;
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

type CreateDepositForm = {
  entry_date: string;
  cash_box_id: string;
  bank_name: string;
  bank_account_id: string;
  amount: string;
  currency_code: string;
  exchange_rate: string;
  deposit_slip_no: string;
  description: string;
};

export default function CashDepositPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('accounting:manage') || hasPermission('accounting:journal:create');
  const canPost = hasPermission('accounting:manage') || hasPermission('accounting:journal:post');
  const canCancel = hasPermission('accounting:manage') || hasPermission('accounting:journal:delete');

  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState<CashDeposit[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<CashDeposit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'reject' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBank, setFilterBank] = useState<string>('all');

  const [cashBoxes, setCashBoxes] = useState<CashBoxOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateDepositForm>({
    entry_date: new Date().toISOString().split('T')[0],
    cash_box_id: '',
    bank_name: '',
    bank_account_id: '',
    amount: '',
    currency_code: 'SAR',
    exchange_rate: '1',
    deposit_slip_no: '',
    description: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [depositsRes, cashBoxesRes, bankAccountsRes]: any[] = await Promise.all([
        apiClient.get('/api/cash-deposits?limit=100'),
        apiClient.get('/api/cash-boxes'),
        apiClient.get('/api/bank-accounts'),
      ]);

      const depositRows: CashDeposit[] = Array.isArray(depositsRes)
        ? depositsRes
        : Array.isArray(depositsRes?.data)
          ? depositsRes.data
          : Array.isArray(depositsRes?.data?.data)
            ? depositsRes.data.data
            : [];
      setDeposits(depositRows);

      const cbRows: CashBoxOption[] = Array.isArray(cashBoxesRes)
        ? cashBoxesRes
        : Array.isArray(cashBoxesRes?.data)
          ? cashBoxesRes.data
          : Array.isArray(cashBoxesRes?.data?.data)
            ? cashBoxesRes.data.data
            : [];
      setCashBoxes(cbRows);

      const baRows: any[] = Array.isArray(bankAccountsRes)
        ? bankAccountsRes
        : Array.isArray(bankAccountsRes?.data)
          ? bankAccountsRes.data
          : Array.isArray(bankAccountsRes?.data?.data)
            ? bankAccountsRes.data.data
            : [];

      const normalizedBankAccounts: BankAccountOption[] = baRows.map((r: any) => ({
        id: Number(r.id),
        bank_name: r.bank_name,
        bank_name_ar: r.bank_name_ar,
        account_number: r.account_number,
        currency_code: r.currency_code,
      }));
      setBankAccounts(normalizedBankAccounts);

      const uniqueBanks = [...new Set(normalizedBankAccounts.map((b) => b.bank_name).filter(Boolean))];
      if (!form.bank_name && uniqueBanks.length > 0) {
        setForm((prev) => ({ ...prev, bank_name: uniqueBanks[0] }));
      }
    } catch {
      setDeposits([]);
      setCashBoxes([]);
      setBankAccounts([]);
      showToast(t('common.failedToLoad', 'Failed to load'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch = deposit.depositNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deposit.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deposit.descriptionAr.includes(searchQuery);
    const matchesStatus = filterStatus === 'all' || deposit.status === filterStatus;
    const matchesBank = filterBank === 'all' || deposit.bankName === filterBank;
    return matchesSearch && matchesStatus && matchesBank;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; labelAr: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200', label: 'Pending', labelAr: 'معلق', icon: ClockIcon },
      confirmed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Confirmed', labelAr: 'مؤكد', icon: CheckCircleIcon },
      rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', label: 'Rejected', labelAr: 'مرفوض', icon: XCircleIcon },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full', config.bg, config.text)}>
        <Icon className="h-3 w-3" />
        {locale === 'ar' ? config.labelAr : config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'SAR') => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleDelete = async () => {
    if (!selectedDeposit) return;
    if (!canCancel) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }

    try {
      await apiClient.post(`/api/journals/${selectedDeposit.id}/cancel`, {});
      showToast(locale === 'ar' ? 'تم إلغاء الإيداع' : 'Deposit cancelled', 'success');
      setConfirmDelete(false);
      setSelectedDeposit(null);
      await fetchData();
    } catch {
      showToast(locale === 'ar' ? 'فشل إلغاء الإيداع' : 'Failed to cancel deposit', 'error');
    }
  };

  const handleConfirmDeposit = async () => {
    if (!selectedDeposit || !confirmAction) return;

    try {
      if (confirmAction === 'confirm') {
        if (!canPost) {
          showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
          return;
        }
        await apiClient.post(`/api/journals/${selectedDeposit.id}/post`, {});
        showToast(locale === 'ar' ? 'تم ترحيل الإيداع' : 'Deposit posted', 'success');
      } else {
        if (!canCancel) {
          showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
          return;
        }
        await apiClient.post(`/api/journals/${selectedDeposit.id}/cancel`, {});
        showToast(locale === 'ar' ? 'تم إلغاء الإيداع' : 'Deposit cancelled', 'warning');
      }
      setConfirmAction(null);
      setSelectedDeposit(null);
      await fetchData();
    } catch {
      showToast(locale === 'ar' ? 'فشل تنفيذ العملية' : 'Failed to perform action', 'error');
    }
  };

  const availableBanks = [...new Set(bankAccounts.map((b) => b.bank_name).filter(Boolean))];
  const filteredBankAccounts = bankAccounts.filter((b) => !form.bank_name || b.bank_name === form.bank_name);

  useEffect(() => {
    const selected = filteredBankAccounts.find((b) => String(b.id) === form.bank_account_id);
    if (!selected && filteredBankAccounts.length > 0) {
      setForm((prev) => ({ ...prev, bank_account_id: String(filteredBankAccounts[0].id), currency_code: filteredBankAccounts[0].currency_code }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.bank_name]);

  const handleCreateDeposit = async () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }

    const amountNum = Number(form.amount);
    if (!form.entry_date) {
      showToast(locale === 'ar' ? 'التاريخ مطلوب' : 'Date is required', 'error');
      return;
    }
    if (!form.cash_box_id) {
      showToast(locale === 'ar' ? 'الصندوق مطلوب' : 'Cash box is required', 'error');
      return;
    }
    if (!form.bank_account_id) {
      showToast(locale === 'ar' ? 'الحساب البنكي مطلوب' : 'Bank account is required', 'error');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      showToast(locale === 'ar' ? 'المبلغ غير صحيح' : 'Invalid amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/cash-deposits', {
        entry_date: form.entry_date,
        cash_box_id: Number(form.cash_box_id),
        bank_account_id: Number(form.bank_account_id),
        amount: amountNum,
        currency_code: form.currency_code,
        exchange_rate: Number(form.exchange_rate) || 1,
        deposit_slip_no: form.deposit_slip_no || null,
        description: form.description || null,
      });

      showToast(locale === 'ar' ? 'تم إنشاء الإيداع (مسودة)' : 'Deposit created (draft)', 'success');
      setIsModalOpen(false);
      setForm((prev) => ({
        ...prev,
        cash_box_id: '',
        amount: '',
        deposit_slip_no: '',
        description: '',
      }));
      await fetchData();
    } catch {
      showToast(locale === 'ar' ? 'فشل إنشاء الإيداع' : 'Failed to create deposit', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalDeposits = deposits.filter(d => d.status === 'confirmed').reduce((sum, d) => sum + (d.amount * d.exchangeRate), 0);
  const pendingDeposits = deposits.filter(d => d.status === 'pending').reduce((sum, d) => sum + (d.amount * d.exchangeRate), 0);

  const stats = [
    { label: locale === 'ar' ? 'إجمالي الإيداعات' : 'Total Deposits', value: formatCurrency(totalDeposits), icon: BanknotesIcon, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: locale === 'ar' ? 'معلقة' : 'Pending', value: formatCurrency(pendingDeposits), icon: ClockIcon, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
    { label: locale === 'ar' ? 'عدد الإيداعات' : 'Deposit Count', value: deposits.length.toString(), icon: DocumentTextIcon, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: locale === 'ar' ? 'البنوك النشطة' : 'Active Banks', value: [...new Set(deposits.map(d => d.bankName))].length.toString(), icon: BuildingLibraryIcon, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'إيداع نقدي - SLMS' : 'Cash Deposit - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'إيداع نقدي' : 'Cash Deposit'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة الإيداعات النقدية في البنوك' : 'Manage cash deposits to banks'}
              </p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={() => { setSelectedDeposit(null); setIsModalOpen(true); }}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {locale === 'ar' ? 'إيداع جديد' : 'New Deposit'}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث برقم الإيداع...' : 'Search by deposit number...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل البنوك' : 'All Banks'}</option>
              {availableBanks.map((b) => {
                const bankAr = bankAccounts.find((x) => x.bank_name === b)?.bank_name_ar;
                return (
                  <option key={b} value={b}>
                    {locale === 'ar' ? (bankAr || b) : b}
                  </option>
                );
              })}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
              <option value="confirmed">{locale === 'ar' ? 'مؤكد' : 'Confirmed'}</option>
              <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredDeposits.length === 0 ? (
            <div className="p-8 text-center">
              <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد إيداعات' : 'No deposits found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم الإيداع' : 'Deposit #'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'من الصندوق' : 'From Cash'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إلى البنك' : 'To Bank'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDeposits.map((deposit) => (
                    <tr key={deposit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelectedDeposit(deposit); setIsDetailModalOpen(true); }}
                          className="text-sm font-mono text-blue-600 hover:underline"
                        >
                          {deposit.depositNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{deposit.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{locale === 'ar' ? deposit.cashAccountAr : deposit.cashAccount}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 dark:text-white">{locale === 'ar' ? deposit.bankAccountAr : deposit.bankAccount}</p>
                        <p className="text-xs text-gray-500">{locale === 'ar' ? deposit.bankNameAr : deposit.bankName}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">{formatCurrency(deposit.amount, deposit.currency)}</td>
                      <td className="px-4 py-3">{getStatusBadge(deposit.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(canPost || canCancel) && deposit.status === 'pending' && (
                            <>
                              <button
                                onClick={() => { setSelectedDeposit(deposit); setConfirmAction('confirm'); }}
                                className="p-1 text-green-500 hover:text-green-600"
                                title={locale === 'ar' ? 'تأكيد' : 'Confirm'}
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedDeposit(deposit); setConfirmAction('reject'); }}
                                className="p-1 text-red-500 hover:text-red-600"
                                title={locale === 'ar' ? 'رفض' : 'Reject'}
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => showToast(locale === 'ar' ? 'جاري الطباعة...' : 'Printing...', 'info')}
                            className="p-1 text-gray-500 hover:text-gray-600"
                            title={locale === 'ar' ? 'طباعة' : 'Print'}
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </button>
                          {canCancel && deposit.status === 'pending' && (
                            <button
                              onClick={() => { setSelectedDeposit(deposit); setConfirmDelete(true); }}
                              className="p-1 text-gray-500 hover:text-red-600"
                              title={locale === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={locale === 'ar' ? 'تفاصيل الإيداع' : 'Deposit Details'}
        size="md"
      >
        {selectedDeposit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رقم الإيداع' : 'Deposit Number'}</p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">{selectedDeposit.depositNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'التاريخ' : 'Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedDeposit.date}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'البيان' : 'Description'}</p>
              <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedDeposit.descriptionAr : selectedDeposit.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'من الصندوق' : 'From Cash Account'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedDeposit.cashAccountAr : selectedDeposit.cashAccount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إلى البنك' : 'To Bank Account'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedDeposit.bankAccountAr : selectedDeposit.bankAccount}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedDeposit.amount, selectedDeposit.currency)}</p>
              {selectedDeposit.currency !== 'SAR' && (
                <p className="text-sm text-gray-500">= {formatCurrency(selectedDeposit.amount * selectedDeposit.exchangeRate)}</p>
              )}
            </div>
            {selectedDeposit.depositSlipNo && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رقم إيصال الإيداع' : 'Deposit Slip #'}</p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">{selectedDeposit.depositSlipNo}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'بواسطة' : 'Created By'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedDeposit.createdBy}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الحالة' : 'Status'}</p>
                {getStatusBadge(selectedDeposit.status)}
              </div>
            </div>
            {selectedDeposit.confirmedBy && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تم التأكيد بواسطة' : 'Confirmed By'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedDeposit.confirmedBy} - {selectedDeposit.confirmedDate}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={locale === 'ar' ? 'إيداع نقدي جديد' : 'New Cash Deposit'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'التاريخ' : 'Date'}
              type="date"
              value={form.entry_date}
              onChange={(e) => setForm((prev) => ({ ...prev, entry_date: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'من الصندوق' : 'From Cash Account'}</label>
              <select
                value={form.cash_box_id}
                onChange={(e) => setForm((prev) => ({ ...prev, cash_box_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{locale === 'ar' ? 'اختر الصندوق' : 'Select Cash Box'}</option>
                {cashBoxes.map((cb) => (
                  <option key={cb.id} value={String(cb.id)}>
                    {locale === 'ar' ? (cb.name_ar || cb.name) : cb.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'البنك' : 'Bank'}</label>
              <select
                value={form.bank_name}
                onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value, bank_account_id: '' }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {availableBanks.length === 0 ? (
                  <option value="">{locale === 'ar' ? 'لا توجد بنوك' : 'No banks'}</option>
                ) : (
                  availableBanks.map((b) => {
                    const bankAr = bankAccounts.find((x) => x.bank_name === b)?.bank_name_ar;
                    return (
                      <option key={b} value={b}>
                        {locale === 'ar' ? (bankAr || b) : b}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحساب البنكي' : 'Bank Account'}</label>
              <select
                value={form.bank_account_id}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const selected = bankAccounts.find((b) => String(b.id) === nextId);
                  setForm((prev) => ({
                    ...prev,
                    bank_account_id: nextId,
                    currency_code: selected?.currency_code || prev.currency_code,
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{locale === 'ar' ? 'اختر الحساب' : 'Select Account'}</option>
                {filteredBankAccounts.map((ba) => (
                  <option key={ba.id} value={String(ba.id)}>
                    {ba.account_number}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={locale === 'ar' ? 'المبلغ' : 'Amount'}
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة' : 'Currency'}</label>
              <select
                value={form.currency_code}
                onChange={(e) => setForm((prev) => ({ ...prev, currency_code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {[...new Set(bankAccounts.map((b) => b.currency_code).filter(Boolean))].map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <ExchangeRateField
              currencyCode={form.currency_code}
              value={form.exchange_rate}
              onChange={(value) => setForm((prev) => ({ ...prev, exchange_rate: value }))}
              label={locale === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
              date={form.entry_date}
            />
          </div>
          <Input
            label={locale === 'ar' ? 'رقم إيصال الإيداع' : 'Deposit Slip Number'}
            placeholder="DS-2024-XXXX"
            value={form.deposit_slip_no}
            onChange={(e) => setForm((prev) => ({ ...prev, deposit_slip_no: e.target.value }))}
          />
          <Input
            label={locale === 'ar' ? 'البيان' : 'Description'}
            placeholder={locale === 'ar' ? 'وصف الإيداع...' : 'Deposit description...'}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button loading={isSubmitting} onClick={handleCreateDeposit}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف الإيداع' : 'Delete Deposit'}
        message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا الإيداع؟' : 'Are you sure you want to delete this deposit?'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmDeposit}
        title={confirmAction === 'confirm' ? (locale === 'ar' ? 'تأكيد الإيداع' : 'Confirm Deposit') : (locale === 'ar' ? 'رفض الإيداع' : 'Reject Deposit')}
        message={confirmAction === 'confirm' 
          ? (locale === 'ar' ? 'هل أنت متأكد من تأكيد هذا الإيداع؟' : 'Are you sure you want to confirm this deposit?')
          : (locale === 'ar' ? 'هل أنت متأكد من رفض هذا الإيداع؟' : 'Are you sure you want to reject this deposit?')}
        confirmText={confirmAction === 'confirm' ? (locale === 'ar' ? 'تأكيد' : 'Confirm') : (locale === 'ar' ? 'رفض' : 'Reject')}
        variant={confirmAction === 'confirm' ? 'primary' : 'danger'}
      />
    </MainLayout>
  );
}
