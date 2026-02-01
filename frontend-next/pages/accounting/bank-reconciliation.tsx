import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  BuildingLibraryIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ClockIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ReconciliationItem {
  id: number;
  date: string;
  reference: string;
  description: string;
  descriptionAr: string;
  bookAmount: number;
  bankAmount: number;
  difference: number;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest';
  status: 'matched' | 'unmatched' | 'pending' | 'discrepancy';
  bankAccount: string;
  bankAccountAr: string;
}

interface ReconciliationSession {
  id: number;
  bankAccount: string;
  bankAccountAr: string;
  bankCode: string;
  period: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  bookBalance: number;
  bankStatementBalance: number;
  difference: number;
  matchedCount: number;
  unmatchedCount: number;
  status: 'in_progress' | 'completed' | 'pending_review';
}

const mockSessions: ReconciliationSession[] = [
  {
    id: 1,
    bankAccount: 'Main Operating Account',
    bankAccountAr: 'الحساب التشغيلي الرئيسي',
    bankCode: 'SABB-001',
    period: 'January 2024',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    openingBalance: 500000,
    closingBalance: 750000,
    bookBalance: 745000,
    bankStatementBalance: 750000,
    difference: 5000,
    matchedCount: 145,
    unmatchedCount: 8,
    status: 'in_progress',
  },
  {
    id: 2,
    bankAccount: 'USD Foreign Currency',
    bankAccountAr: 'حساب الدولار الأمريكي',
    bankCode: 'NCB-USD-001',
    period: 'January 2024',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    openingBalance: 200000,
    closingBalance: 285000,
    bookBalance: 285000,
    bankStatementBalance: 285000,
    difference: 0,
    matchedCount: 52,
    unmatchedCount: 0,
    status: 'completed',
  },
];

const mockItems: ReconciliationItem[] = [
  {
    id: 1,
    date: '2024-01-28',
    reference: 'TRF-2024-001',
    description: 'Customer Payment - ABC Corp',
    descriptionAr: 'دفعة عميل - شركة ABC',
    bookAmount: 50000,
    bankAmount: 50000,
    difference: 0,
    type: 'deposit',
    status: 'matched',
    bankAccount: 'Main Operating Account',
    bankAccountAr: 'الحساب التشغيلي الرئيسي',
  },
  {
    id: 2,
    date: '2024-01-27',
    reference: 'CHK-2024-055',
    description: 'Supplier Payment - XYZ Ltd',
    descriptionAr: 'دفعة مورد - شركة XYZ',
    bookAmount: -25000,
    bankAmount: -25000,
    difference: 0,
    type: 'withdrawal',
    status: 'matched',
    bankAccount: 'Main Operating Account',
    bankAccountAr: 'الحساب التشغيلي الرئيسي',
  },
  {
    id: 3,
    date: '2024-01-26',
    reference: 'FEE-2024-012',
    description: 'Bank Service Fees',
    descriptionAr: 'رسوم الخدمات البنكية',
    bookAmount: 0,
    bankAmount: -500,
    difference: -500,
    type: 'fee',
    status: 'unmatched',
    bankAccount: 'Main Operating Account',
    bankAccountAr: 'الحساب التشغيلي الرئيسي',
  },
  {
    id: 4,
    date: '2024-01-25',
    reference: 'DEP-2024-089',
    description: 'Cash Deposit',
    descriptionAr: 'إيداع نقدي',
    bookAmount: 15000,
    bankAmount: 15000,
    difference: 0,
    type: 'deposit',
    status: 'matched',
    bankAccount: 'Main Operating Account',
    bankAccountAr: 'الحساب التشغيلي الرئيسي',
  },
  {
    id: 5,
    date: '2024-01-24',
    reference: 'TRF-2024-088',
    description: 'Internal Transfer',
    descriptionAr: 'تحويل داخلي',
    bookAmount: -100000,
    bankAmount: -100000,
    difference: 0,
    type: 'transfer',
    status: 'pending',
    bankAccount: 'Main Operating Account',
    bankAccountAr: 'الحساب التشغيلي الرئيسي',
  },
  {
    id: 6,
    date: '2024-01-23',
    reference: 'INT-2024-001',
    description: 'Interest Income',
    descriptionAr: 'دخل الفوائد',
    bookAmount: 0,
    bankAmount: 1250,
    difference: 1250,
    type: 'interest',
    status: 'unmatched',
    bankAccount: 'Main Operating Account',
    bankAccountAr: 'الحساب التشغيلي الرئيسي',
  },
];

export default function BankReconciliationPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('accounting:manage');

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ReconciliationSession[]>([]);
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<ReconciliationSession | null>(null);
  const [selectedItem, setSelectedItem] = useState<ReconciliationItem | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isItemDetailOpen, setIsItemDetailOpen] = useState(false);
  const [confirmMatch, setConfirmMatch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'sessions' | 'items'>('sessions');

  useEffect(() => {
    setTimeout(() => {
      setSessions(mockSessions);
      setItems(mockItems);
      setLoading(false);
    }, 500);
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descriptionAr.includes(searchQuery) ||
      item.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; labelAr: string; icon: any }> = {
      matched: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Matched', labelAr: 'مطابق', icon: CheckCircleIcon },
      unmatched: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', label: 'Unmatched', labelAr: 'غير مطابق', icon: XCircleIcon },
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200', label: 'Pending', labelAr: 'معلق', icon: ClockIcon },
      discrepancy: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-200', label: 'Discrepancy', labelAr: 'تباين', icon: ExclamationTriangleIcon },
      in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', label: 'In Progress', labelAr: 'قيد التنفيذ', icon: ArrowPathIcon },
      completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Completed', labelAr: 'مكتمل', icon: CheckCircleIcon },
      pending_review: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-200', label: 'Pending Review', labelAr: 'بانتظار المراجعة', icon: DocumentCheckIcon },
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

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; labelAr: string }> = {
      deposit: { label: 'Deposit', labelAr: 'إيداع' },
      withdrawal: { label: 'Withdrawal', labelAr: 'سحب' },
      transfer: { label: 'Transfer', labelAr: 'تحويل' },
      fee: { label: 'Fee', labelAr: 'رسوم' },
      interest: { label: 'Interest', labelAr: 'فائدة' },
    };
    const config = typeConfig[type] || typeConfig.deposit;
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
        {locale === 'ar' ? config.labelAr : config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleMatchItem = () => {
    if (selectedItem) {
      setItems(items.map(i => i.id === selectedItem.id ? { ...i, status: 'matched' as const, difference: 0 } : i));
      showToast(locale === 'ar' ? 'تم مطابقة العنصر بنجاح' : 'Item matched successfully', 'success');
      setConfirmMatch(false);
      setSelectedItem(null);
    }
  };

  const matchedItems = items.filter(i => i.status === 'matched').length;
  const unmatchedItems = items.filter(i => i.status === 'unmatched').length;
  const pendingItems = items.filter(i => i.status === 'pending').length;
  const totalDifference = items.reduce((sum, i) => sum + i.difference, 0);

  const stats = [
    { label: locale === 'ar' ? 'عناصر مطابقة' : 'Matched Items', value: matchedItems.toString(), icon: CheckCircleIcon, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: locale === 'ar' ? 'غير مطابقة' : 'Unmatched', value: unmatchedItems.toString(), icon: XCircleIcon, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    { label: locale === 'ar' ? 'معلقة' : 'Pending', value: pendingItems.toString(), icon: ClockIcon, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
    { label: locale === 'ar' ? 'إجمالي الفرق' : 'Total Difference', value: formatCurrency(totalDifference), icon: ArrowsRightLeftIcon, color: totalDifference === 0 ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تسوية البنك - SLMS' : 'Bank Reconciliation - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BuildingLibraryIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'تسوية البنك' : 'Bank Reconciliation'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'مطابقة كشوف الحساب البنكية مع السجلات المحاسبية' : 'Match bank statements with accounting records'}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري استيراد كشف الحساب...' : 'Importing bank statement...', 'info')}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                {locale === 'ar' ? 'استيراد كشف' : 'Import Statement'}
              </Button>
              <Button onClick={() => setIsSessionModalOpen(true)}>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                {locale === 'ar' ? 'تسوية جديدة' : 'New Reconciliation'}
              </Button>
            </div>
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

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('sessions')}
              className={clsx(
                'py-2 px-1 border-b-2 text-sm font-medium transition-colors',
                activeTab === 'sessions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              )}
            >
              {locale === 'ar' ? 'جلسات التسوية' : 'Reconciliation Sessions'}
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={clsx(
                'py-2 px-1 border-b-2 text-sm font-medium transition-colors',
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              )}
            >
              {locale === 'ar' ? 'عناصر التسوية' : 'Reconciliation Items'}
            </button>
          </nav>
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center">
                <BuildingLibraryIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد جلسات تسوية' : 'No reconciliation sessions'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {sessions.map((session) => (
                  <div key={session.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {locale === 'ar' ? session.bankAccountAr : session.bankAccount}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">({session.bankCode})</span>
                          {getStatusBadge(session.status)}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{session.period}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رصيد الدفاتر' : 'Book Balance'}</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(session.bookBalance)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رصيد البنك' : 'Bank Balance'}</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(session.bankStatementBalance)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفرق' : 'Difference'}</p>
                            <p className={clsx('font-medium', session.difference === 0 ? 'text-green-600' : 'text-red-600')}>
                              {formatCurrency(session.difference)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المطابقة' : 'Matching'}</p>
                            <p className="font-medium text-gray-900 dark:text-white">{session.matchedCount} / {session.matchedCount + session.unmatchedCount}</p>
                          </div>
                        </div>
                      </div>
                      {canManage && session.status !== 'completed' && (
                        <Button size="sm" onClick={() => { setSelectedSession(session); setActiveTab('items'); }}>
                          {locale === 'ar' ? 'متابعة' : 'Continue'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'بحث بالوصف أو المرجع...' : 'Search by description or reference...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                  <option value="matched">{locale === 'ar' ? 'مطابق' : 'Matched'}</option>
                  <option value="unmatched">{locale === 'ar' ? 'غير مطابق' : 'Unmatched'}</option>
                  <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
                  <option value="deposit">{locale === 'ar' ? 'إيداع' : 'Deposit'}</option>
                  <option value="withdrawal">{locale === 'ar' ? 'سحب' : 'Withdrawal'}</option>
                  <option value="transfer">{locale === 'ar' ? 'تحويل' : 'Transfer'}</option>
                  <option value="fee">{locale === 'ar' ? 'رسوم' : 'Fee'}</option>
                  <option value="interest">{locale === 'ar' ? 'فائدة' : 'Interest'}</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرجع' : 'Reference'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مبلغ الدفاتر' : 'Book Amount'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مبلغ البنك' : 'Bank Amount'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفرق' : 'Difference'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.date}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{item.reference}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{locale === 'ar' ? item.descriptionAr : item.description}</td>
                        <td className="px-4 py-3">{getTypeBadge(item.type)}</td>
                        <td className={clsx('px-4 py-3 text-sm font-medium', item.bookAmount >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(item.bookAmount)}
                        </td>
                        <td className={clsx('px-4 py-3 text-sm font-medium', item.bankAmount >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(item.bankAmount)}
                        </td>
                        <td className={clsx('px-4 py-3 text-sm font-medium', item.difference === 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(item.difference)}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3">
                          {canManage && item.status !== 'matched' && (
                            <Button size="sm" variant="secondary" onClick={() => { setSelectedItem(item); setConfirmMatch(true); }}>
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              {locale === 'ar' ? 'مطابقة' : 'Match'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Session Modal */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title={locale === 'ar' ? 'تسوية بنكية جديدة' : 'New Bank Reconciliation'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحساب البنكي' : 'Bank Account'}</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>{locale === 'ar' ? 'الحساب التشغيلي الرئيسي' : 'Main Operating Account'}</option>
              <option>{locale === 'ar' ? 'حساب الدولار الأمريكي' : 'USD Foreign Currency'}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'من تاريخ' : 'Start Date'}</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'إلى تاريخ' : 'End Date'}</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'رصيد كشف البنك' : 'Bank Statement Balance'}</label>
            <input type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsSessionModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => { setIsSessionModalOpen(false); showToast(locale === 'ar' ? 'تم إنشاء جلسة التسوية' : 'Reconciliation session created', 'success'); }}>
              {locale === 'ar' ? 'بدء التسوية' : 'Start Reconciliation'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmMatch}
        onClose={() => setConfirmMatch(false)}
        onConfirm={handleMatchItem}
        title={locale === 'ar' ? 'تأكيد المطابقة' : 'Confirm Match'}
        message={locale === 'ar' ? 'هل أنت متأكد من مطابقة هذا العنصر؟' : 'Are you sure you want to match this item?'}
        confirmText={locale === 'ar' ? 'مطابقة' : 'Match'}
        variant="primary"
      />
    </MainLayout>
  );
}
