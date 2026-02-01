import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import {
  BanknotesIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CashTransaction {
  id: number;
  date: string;
  reference: string;
  description: string;
  descriptionAr: string;
  type: 'receipt' | 'payment' | 'transfer_in' | 'transfer_out';
  amount: number;
  balance: number;
  cashAccount: string;
  cashAccountAr: string;
  category: string;
  categoryAr: string;
  relatedParty: string;
  relatedPartyAr: string;
  createdBy: string;
}

const mockTransactions: CashTransaction[] = [
  {
    id: 1,
    date: '2024-01-28',
    reference: 'RCV-2024-001',
    description: 'Cash Sales - Daily Collection',
    descriptionAr: 'مبيعات نقدية - تحصيل يومي',
    type: 'receipt',
    amount: 25000,
    balance: 175000,
    cashAccount: 'Main Cash',
    cashAccountAr: 'الصندوق الرئيسي',
    category: 'Sales',
    categoryAr: 'مبيعات',
    relatedParty: 'Walk-in Customer',
    relatedPartyAr: 'عميل زائر',
    createdBy: 'Ahmed Ali',
  },
  {
    id: 2,
    date: '2024-01-27',
    reference: 'PAY-2024-055',
    description: 'Office Supplies Purchase',
    descriptionAr: 'شراء مستلزمات مكتبية',
    type: 'payment',
    amount: -3500,
    balance: 150000,
    cashAccount: 'Main Cash',
    cashAccountAr: 'الصندوق الرئيسي',
    category: 'Office Expenses',
    categoryAr: 'مصاريف مكتبية',
    relatedParty: 'Office Mart',
    relatedPartyAr: 'مارت المكتب',
    createdBy: 'Sara Ahmed',
  },
  {
    id: 3,
    date: '2024-01-26',
    reference: 'TRF-2024-012',
    description: 'Transfer to Bank',
    descriptionAr: 'تحويل إلى البنك',
    type: 'transfer_out',
    amount: -50000,
    balance: 153500,
    cashAccount: 'Main Cash',
    cashAccountAr: 'الصندوق الرئيسي',
    category: 'Internal Transfer',
    categoryAr: 'تحويل داخلي',
    relatedParty: 'SABB Bank',
    relatedPartyAr: 'بنك ساب',
    createdBy: 'Mohammed Hassan',
  },
  {
    id: 4,
    date: '2024-01-25',
    reference: 'RCV-2024-089',
    description: 'Customer Payment - Invoice #1234',
    descriptionAr: 'دفعة عميل - فاتورة رقم 1234',
    type: 'receipt',
    amount: 45000,
    balance: 203500,
    cashAccount: 'Main Cash',
    cashAccountAr: 'الصندوق الرئيسي',
    category: 'Receivables',
    categoryAr: 'مستحقات',
    relatedParty: 'ABC Trading Co.',
    relatedPartyAr: 'شركة ABC التجارية',
    createdBy: 'Ahmed Ali',
  },
  {
    id: 5,
    date: '2024-01-24',
    reference: 'PAY-2024-054',
    description: 'Petty Cash Replenishment',
    descriptionAr: 'تجديد المصروفات النثرية',
    type: 'transfer_in',
    amount: 5000,
    balance: 158500,
    cashAccount: 'Petty Cash',
    cashAccountAr: 'صندوق المصروفات النثرية',
    category: 'Internal Transfer',
    categoryAr: 'تحويل داخلي',
    relatedParty: 'Main Cash',
    relatedPartyAr: 'الصندوق الرئيسي',
    createdBy: 'Fatima Omar',
  },
  {
    id: 6,
    date: '2024-01-23',
    reference: 'PAY-2024-053',
    description: 'Utility Bills Payment',
    descriptionAr: 'دفع فواتير المرافق',
    type: 'payment',
    amount: -8500,
    balance: 153500,
    cashAccount: 'Main Cash',
    cashAccountAr: 'الصندوق الرئيسي',
    category: 'Utilities',
    categoryAr: 'مرافق',
    relatedParty: 'Saudi Electricity',
    relatedPartyAr: 'الكهرباء السعودية',
    createdBy: 'Sara Ahmed',
  },
];

export default function CashLedgerPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 500);
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.descriptionAr.includes(searchQuery) ||
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.relatedParty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesAccount = filterAccount === 'all' || tx.cashAccount === filterAccount;
    const matchesDateFrom = !dateFrom || tx.date >= dateFrom;
    const matchesDateTo = !dateTo || tx.date <= dateTo;
    return matchesSearch && matchesType && matchesAccount && matchesDateFrom && matchesDateTo;
  });

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { bg: string; text: string; label: string; labelAr: string; icon: any }> = {
      receipt: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Receipt', labelAr: 'قبض', icon: ArrowDownIcon },
      payment: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', label: 'Payment', labelAr: 'صرف', icon: ArrowUpIcon },
      transfer_in: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', label: 'Transfer In', labelAr: 'تحويل وارد', icon: ArrowDownIcon },
      transfer_out: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-200', label: 'Transfer Out', labelAr: 'تحويل صادر', icon: ArrowUpIcon },
    };
    const config = typeConfig[type] || typeConfig.receipt;
    const Icon = config.icon;
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full', config.bg, config.text)}>
        <Icon className="h-3 w-3" />
        {locale === 'ar' ? config.labelAr : config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const totalReceipts = transactions.filter(t => t.type === 'receipt' || t.type === 'transfer_in').reduce((sum, t) => sum + t.amount, 0);
  const totalPayments = transactions.filter(t => t.type === 'payment' || t.type === 'transfer_out').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const currentBalance = transactions.length > 0 ? transactions[0].balance : 0;

  const stats = [
    { label: locale === 'ar' ? 'الرصيد الحالي' : 'Current Balance', value: formatCurrency(currentBalance), icon: BanknotesIcon, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: locale === 'ar' ? 'إجمالي المقبوضات' : 'Total Receipts', value: formatCurrency(totalReceipts), icon: ArrowDownIcon, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: locale === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments', value: formatCurrency(totalPayments), icon: ArrowUpIcon, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    { label: locale === 'ar' ? 'عدد العمليات' : 'Transactions', value: transactions.length.toString(), icon: DocumentTextIcon, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'كشف حساب النقدية - SLMS' : 'Cash Ledger - SLMS'}</title>
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
                {locale === 'ar' ? 'كشف حساب النقدية' : 'Cash Ledger'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'عرض حركات الصندوق والأرصدة' : 'View cash transactions and balances'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري تصدير البيانات...' : 'Exporting data...', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري الطباعة...' : 'Printing...', 'info')}>
              <PrinterIcon className="h-4 w-4 mr-2" />
              {locale === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الحسابات' : 'All Accounts'}</option>
              <option value="Main Cash">{locale === 'ar' ? 'الصندوق الرئيسي' : 'Main Cash'}</option>
              <option value="Petty Cash">{locale === 'ar' ? 'صندوق المصروفات النثرية' : 'Petty Cash'}</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
              <option value="receipt">{locale === 'ar' ? 'قبض' : 'Receipt'}</option>
              <option value="payment">{locale === 'ar' ? 'صرف' : 'Payment'}</option>
              <option value="transfer_in">{locale === 'ar' ? 'تحويل وارد' : 'Transfer In'}</option>
              <option value="transfer_out">{locale === 'ar' ? 'تحويل صادر' : 'Transfer Out'}</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={locale === 'ar' ? 'من تاريخ' : 'From Date'}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={locale === 'ar' ? 'إلى تاريخ' : 'To Date'}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد حركات' : 'No transactions found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرجع' : 'Reference'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البيان' : 'Description'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحساب' : 'Account'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الرصيد' : 'Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTransactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => { setSelectedTransaction(tx); setIsDetailModalOpen(true); }}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{tx.date}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{tx.reference}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 dark:text-white">{locale === 'ar' ? tx.descriptionAr : tx.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? tx.relatedPartyAr : tx.relatedParty}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{locale === 'ar' ? tx.cashAccountAr : tx.cashAccount}</td>
                      <td className="px-4 py-3">{getTypeBadge(tx.type)}</td>
                      <td className={clsx('px-4 py-3 text-sm font-medium', tx.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {tx.amount >= 0 ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(tx.balance)}</td>
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
        title={locale === 'ar' ? 'تفاصيل الحركة' : 'Transaction Details'}
        size="md"
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المرجع' : 'Reference'}</p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">{selectedTransaction.reference}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'التاريخ' : 'Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedTransaction.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                {getTypeBadge(selectedTransaction.type)}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الحساب' : 'Account'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedTransaction.cashAccountAr : selectedTransaction.cashAccount}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'البيان' : 'Description'}</p>
              <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedTransaction.descriptionAr : selectedTransaction.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الطرف المقابل' : 'Related Party'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedTransaction.relatedPartyAr : selectedTransaction.relatedParty}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفئة' : 'Category'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedTransaction.categoryAr : selectedTransaction.category}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className={clsx('text-xl font-bold', selectedTransaction.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {selectedTransaction.amount >= 0 ? '+' : ''}{formatCurrency(selectedTransaction.amount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرصيد بعد' : 'Balance After'}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(selectedTransaction.balance)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'بواسطة' : 'Created By'}</p>
              <p className="font-medium text-gray-900 dark:text-white">{selectedTransaction.createdBy}</p>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
