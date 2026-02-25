import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  BanknotesIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  WalletIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';

interface CashRegister {
  id: number;
  register_code: string;
  register_name: string;
  register_name_ar: string | null;
  branch_name: string | null;
  cashier_name: string | null;
  status: string;
  currency_code: string;
  opening_balance: number;
  current_balance: number;
  max_amount: number;
  is_active: boolean;
  created_at: string;
}

interface CashTransaction {
  id: number;
  transaction_type: string;
  amount: number;
  description: string;
  reference_number: string | null;
  created_at: string;
  created_by_name: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  open: { en: 'Open', ar: 'مفتوح' },
  closed: { en: 'Closed', ar: 'مغلق' },
  suspended: { en: 'Suspended', ar: 'معلّق' },
};

export default function CashRegistersPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ register_code: '', register_name: '', register_name_ar: '', opening_balance: 0, max_amount: 50000, currency_code: 'SAR' });
  const [creating, setCreating] = useState(false);

  // Transaction modal
  const [transModal, setTransModal] = useState<{ open: boolean; registerId: number | null; transactions: CashTransaction[] }>({ open: false, registerId: null, transactions: [] });
  const [transLoading, setTransLoading] = useState(false);

  useEffect(() => {
    fetchRegisters();
  }, []);

  const fetchRegisters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/cash-registers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setRegisters(result.data || []);
      } else {
        showToast('error', locale === 'ar' ? 'فشل تحميل الصناديق' : 'Failed to load registers');
      }
    } catch (error) {
      showToast('error', locale === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.register_code || !createForm.register_name) {
      showToast('error', locale === 'ar' ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields');
      return;
    }
    setCreating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/cash-registers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        showToast('success', locale === 'ar' ? 'تم إنشاء الصندوق' : 'Register created');
        setShowCreateModal(false);
        setCreateForm({ register_code: '', register_name: '', register_name_ar: '', opening_balance: 0, max_amount: 50000, currency_code: 'SAR' });
        fetchRegisters();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed');
      }
    } catch { showToast('error', 'Error'); }
    finally { setCreating(false); }
  };

  const fetchTransactions = async (registerId: number) => {
    setTransLoading(true);
    setTransModal({ open: true, registerId, transactions: [] });
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/cash-registers/${registerId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setTransModal({ open: true, registerId, transactions: result.data || [] });
      }
    } catch {} finally { setTransLoading(false); }
  };

  const filteredRegisters = registers.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.register_code?.toLowerCase().includes(term) ||
      r.register_name?.toLowerCase().includes(term) ||
      r.register_name_ar?.toLowerCase().includes(term) ||
      r.branch_name?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0) + ' ' + (currency || 'SAR');
  };

  const totalBalance = filteredRegisters.reduce((sum, r) => sum + (r.current_balance || 0), 0);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'صناديق النقدية — SLMS' : 'Cash Registers — SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <WalletIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'صناديق النقدية / العهد المالية' : 'Cash Registers / Petty Cash'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة الصناديق النقدية ومتابعة الأرصدة والعمليات' : 'Manage cash registers, balances & transactions'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchRegisters}>
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            {hasPermission('cash_registers:create') && (
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="w-5 h-5 mr-1" />
                {locale === 'ar' ? 'صندوق جديد' : 'New Register'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عدد الصناديق' : 'Total Registers'}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{registers.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مفتوحة' : 'Open'}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{registers.filter((r) => r.status === 'open').length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الرصيد' : 'Total Balance'}</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(totalBalance)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={locale === 'ar' ? 'بحث بكود الصندوق أو الاسم...' : 'Search by code or name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            ))
          ) : filteredRegisters.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <WalletIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'لا توجد صناديق نقدية' : 'No cash registers found'}
              </h3>
            </div>
          ) : (
            filteredRegisters.map((reg) => (
              <div
                key={reg.id}
                className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => fetchTransactions(reg.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{reg.register_code}</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[reg.status] || statusColors.closed}`}>
                    {reg.status === 'open' ? <LockOpenIcon className="w-3 h-3" /> : <LockClosedIcon className="w-3 h-3" />}
                    {locale === 'ar' ? statusLabels[reg.status]?.ar : statusLabels[reg.status]?.en || reg.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {locale === 'ar' && reg.register_name_ar ? reg.register_name_ar : reg.register_name}
                </h3>
                {reg.branch_name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{reg.branch_name}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(reg.current_balance, reg.currency_code)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الحد الأقصى' : 'Max Amount'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{formatCurrency(reg.max_amount, reg.currency_code)}</p>
                  </div>
                </div>
                {reg.cashier_name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {locale === 'ar' ? 'أمين الصندوق:' : 'Cashier:'} {reg.cashier_name}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={locale === 'ar' ? 'إنشاء صندوق نقدي جديد' : 'Create Cash Register'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'كود الصندوق *' : 'Register Code *'}
            </label>
            <input
              type="text"
              className="input w-full"
              value={createForm.register_code}
              onChange={(e) => setCreateForm({ ...createForm, register_code: e.target.value })}
              placeholder="CASH-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'الاسم (إنجليزي) *' : 'Name (English) *'}
            </label>
            <input
              type="text"
              className="input w-full"
              value={createForm.register_name}
              onChange={(e) => setCreateForm({ ...createForm, register_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
            </label>
            <input
              type="text"
              className="input w-full"
              value={createForm.register_name_ar}
              onChange={(e) => setCreateForm({ ...createForm, register_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}
              </label>
              <input
                type="number"
                className="input w-full"
                value={createForm.opening_balance}
                onChange={(e) => setCreateForm({ ...createForm, opening_balance: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الحد الأقصى' : 'Max Amount'}
              </label>
              <input
                type="number"
                className="input w-full"
                value={createForm.max_amount}
                onChange={(e) => setCreateForm({ ...createForm, max_amount: parseFloat(e.target.value) || 50000 })}
                min="0"
                step="100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              {locale === 'ar' ? 'إنشاء' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transactions Modal */}
      <Modal
        isOpen={transModal.open}
        onClose={() => setTransModal({ open: false, registerId: null, transactions: [] })}
        title={locale === 'ar' ? 'حركات الصندوق' : 'Register Transactions'}
        size="lg"
      >
        {transLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : transModal.transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {locale === 'ar' ? 'لا توجد حركات' : 'No transactions found'}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transModal.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {new Date(tx.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB')}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.transaction_type === 'receipt' || tx.transaction_type === 'deposit' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-sm text-right font-medium ${tx.transaction_type === 'receipt' || tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.transaction_type === 'receipt' || tx.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{tx.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
