import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import {
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  LinkIcon,
  XMarkIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface BookTransaction {
  id: number;
  date: string;
  reference: string;
  description: string;
  descriptionAr: string;
  amount: number;
  type: 'debit' | 'credit';
  matched: boolean;
  matchedWith: number | null;
}

interface BankTransaction {
  id: number;
  date: string;
  reference: string;
  description: string;
  descriptionAr: string;
  amount: number;
  type: 'debit' | 'credit';
  matched: boolean;
  matchedWith: number | null;
}

const mockBookTransactions: BookTransaction[] = [
  { id: 1, date: '2024-01-28', reference: 'PAY-001', description: 'Customer Payment', descriptionAr: 'دفعة عميل', amount: 50000, type: 'debit', matched: true, matchedWith: 1 },
  { id: 2, date: '2024-01-27', reference: 'TRF-055', description: 'Supplier Payment', descriptionAr: 'دفعة مورد', amount: 25000, type: 'credit', matched: true, matchedWith: 2 },
  { id: 3, date: '2024-01-26', reference: 'DEP-012', description: 'Cash Deposit', descriptionAr: 'إيداع نقدي', amount: 100000, type: 'debit', matched: false, matchedWith: null },
  { id: 4, date: '2024-01-25', reference: 'CHK-089', description: 'Rent Payment', descriptionAr: 'دفعة إيجار', amount: 15000, type: 'credit', matched: false, matchedWith: null },
  { id: 5, date: '2024-01-24', reference: 'TRF-054', description: 'Utility Payment', descriptionAr: 'دفعة مرافق', amount: 8500, type: 'credit', matched: true, matchedWith: 4 },
];

const mockBankTransactions: BankTransaction[] = [
  { id: 1, date: '2024-01-28', reference: 'TRN001', description: 'INCOMING TRF', descriptionAr: 'تحويل وارد', amount: 50000, type: 'credit', matched: true, matchedWith: 1 },
  { id: 2, date: '2024-01-27', reference: 'CHQ123', description: 'CHEQUE CLEARANCE', descriptionAr: 'تصفية شيك', amount: 25000, type: 'debit', matched: true, matchedWith: 2 },
  { id: 3, date: '2024-01-26', reference: 'FEE001', description: 'SERVICE FEE', descriptionAr: 'رسوم خدمة', amount: 500, type: 'debit', matched: false, matchedWith: null },
  { id: 4, date: '2024-01-25', reference: 'DD0089', description: 'DIRECT DEBIT', descriptionAr: 'خصم مباشر', amount: 8500, type: 'debit', matched: true, matchedWith: 5 },
  { id: 5, date: '2024-01-24', reference: 'INT001', description: 'INTEREST INCOME', descriptionAr: 'دخل فوائد', amount: 1250, type: 'credit', matched: false, matchedWith: null },
];

export default function BankMatchingPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('accounting:manage');

  const [loading, setLoading] = useState(true);
  const [bookTxs, setBookTxs] = useState<BookTransaction[]>([]);
  const [bankTxs, setBankTxs] = useState<BankTransaction[]>([]);
  const [selectedBookTx, setSelectedBookTx] = useState<BookTransaction | null>(null);
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null);
  const [searchBook, setSearchBook] = useState('');
  const [searchBank, setSearchBank] = useState('');
  const [filterMatched, setFilterMatched] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setBookTxs(mockBookTransactions);
      setBankTxs(mockBankTransactions);
      setLoading(false);
    }, 500);
  }, []);

  const filteredBookTxs = bookTxs.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchBook.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchBook.toLowerCase());
    const matchesFilter = filterMatched === 'all' || 
      (filterMatched === 'matched' && tx.matched) || 
      (filterMatched === 'unmatched' && !tx.matched);
    return matchesSearch && matchesFilter;
  });

  const filteredBankTxs = bankTxs.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchBank.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchBank.toLowerCase());
    const matchesFilter = filterMatched === 'all' || 
      (filterMatched === 'matched' && tx.matched) || 
      (filterMatched === 'unmatched' && !tx.matched);
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleMatch = () => {
    if (selectedBookTx && selectedBankTx) {
      setBookTxs(bookTxs.map(tx => tx.id === selectedBookTx.id ? { ...tx, matched: true, matchedWith: selectedBankTx.id } : tx));
      setBankTxs(bankTxs.map(tx => tx.id === selectedBankTx.id ? { ...tx, matched: true, matchedWith: selectedBookTx.id } : tx));
      showToast(locale === 'ar' ? 'تم مطابقة العناصر بنجاح' : 'Items matched successfully', 'success');
      setSelectedBookTx(null);
      setSelectedBankTx(null);
    }
  };

  const handleUnmatch = (bookId: number, bankId: number) => {
    setBookTxs(bookTxs.map(tx => tx.id === bookId ? { ...tx, matched: false, matchedWith: null } : tx));
    setBankTxs(bankTxs.map(tx => tx.id === bankId ? { ...tx, matched: false, matchedWith: null } : tx));
    showToast(locale === 'ar' ? 'تم إلغاء المطابقة' : 'Match removed', 'success');
  };

  const handleAutoMatch = () => {
    // Simple auto-match by amount (demo)
    let matchCount = 0;
    const newBookTxs = [...bookTxs];
    const newBankTxs = [...bankTxs];
    
    newBookTxs.forEach(bookTx => {
      if (!bookTx.matched) {
        const matchingBank = newBankTxs.find(bankTx => 
          !bankTx.matched && 
          Math.abs(bookTx.amount) === Math.abs(bankTx.amount) &&
          bookTx.type !== bankTx.type
        );
        if (matchingBank) {
          bookTx.matched = true;
          bookTx.matchedWith = matchingBank.id;
          matchingBank.matched = true;
          matchingBank.matchedWith = bookTx.id;
          matchCount++;
        }
      }
    });
    
    setBookTxs(newBookTxs);
    setBankTxs(newBankTxs);
    showToast(
      locale === 'ar' ? `تم مطابقة ${matchCount} عنصر تلقائياً` : `Auto-matched ${matchCount} items`,
      matchCount > 0 ? 'success' : 'info'
    );
  };

  const matchedCount = bookTxs.filter(tx => tx.matched).length;
  const unmatchedBookCount = bookTxs.filter(tx => !tx.matched).length;
  const unmatchedBankCount = bankTxs.filter(tx => !tx.matched).length;

  const stats = [
    { label: locale === 'ar' ? 'عناصر مطابقة' : 'Matched', value: matchedCount.toString(), color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: locale === 'ar' ? 'دفاتر غير مطابقة' : 'Unmatched Book', value: unmatchedBookCount.toString(), color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    { label: locale === 'ar' ? 'بنك غير مطابق' : 'Unmatched Bank', value: unmatchedBankCount.toString(), color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مطابقة البنك - SLMS' : 'Bank Matching - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ArrowsRightLeftIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'مطابقة البنك' : 'Bank Matching'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'مطابقة حركات الدفاتر مع كشف البنك' : 'Match book transactions with bank statement'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button variant="secondary" onClick={handleAutoMatch}>
                <LinkIcon className="h-4 w-4 mr-2" />
                {locale === 'ar' ? 'مطابقة تلقائية' : 'Auto Match'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري استيراد كشف البنك...' : 'Importing bank statement...', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {locale === 'ar' ? 'استيراد كشف' : 'Import Statement'}
            </Button>
          </div>
        </div>

        {/* Stats & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-4">
            {stats.map((stat, index) => (
              <div key={index} className={clsx('px-4 py-2 rounded-lg', stat.color)}>
                <span className="text-sm font-medium">{stat.label}: </span>
                <span className="text-lg font-bold">{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filterMatched}
              onChange={(e) => setFilterMatched(e.target.value as 'all' | 'matched' | 'unmatched')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
              <option value="matched">{locale === 'ar' ? 'مطابق' : 'Matched'}</option>
              <option value="unmatched">{locale === 'ar' ? 'غير مطابق' : 'Unmatched'}</option>
            </select>
          </div>
        </div>

        {/* Match Action Bar */}
        {selectedBookTx && selectedBankTx && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <p className="text-blue-800 dark:text-blue-200">{locale === 'ar' ? 'الدفاتر:' : 'Book:'} {selectedBookTx.reference}</p>
                  <p className="font-medium">{formatCurrency(selectedBookTx.amount)}</p>
                </div>
                <ArrowsRightLeftIcon className="h-6 w-6 text-blue-600" />
                <div className="text-sm">
                  <p className="text-blue-800 dark:text-blue-200">{locale === 'ar' ? 'البنك:' : 'Bank:'} {selectedBankTx.reference}</p>
                  <p className="font-medium">{formatCurrency(selectedBankTx.amount)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleMatch}>
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  {locale === 'ar' ? 'مطابقة' : 'Match'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setSelectedBookTx(null); setSelectedBankTx(null); }}>
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Book Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  {locale === 'ar' ? 'حركات الدفاتر' : 'Book Transactions'}
                </h3>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                  value={searchBook}
                  onChange={(e) => setSearchBook(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : filteredBookTxs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">{locale === 'ar' ? 'لا توجد حركات' : 'No transactions'}</div>
              ) : (
                filteredBookTxs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => !tx.matched && setSelectedBookTx(selectedBookTx?.id === tx.id ? null : tx)}
                    className={clsx(
                      'p-3 cursor-pointer transition-colors',
                      tx.matched ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      selectedBookTx?.id === tx.id && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">{tx.reference}</span>
                          {tx.matched && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white">{locale === 'ar' ? tx.descriptionAr : tx.description}</p>
                        <p className="text-xs text-gray-500">{tx.date}</p>
                      </div>
                      <p className={clsx('font-medium text-sm', tx.type === 'debit' ? 'text-green-600' : 'text-red-600')}>
                        {tx.type === 'debit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bank Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <BuildingLibraryIcon className="h-5 w-5" />
                  {locale === 'ar' ? 'حركات البنك' : 'Bank Transactions'}
                </h3>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                  value={searchBank}
                  onChange={(e) => setSearchBank(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : filteredBankTxs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">{locale === 'ar' ? 'لا توجد حركات' : 'No transactions'}</div>
              ) : (
                filteredBankTxs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => !tx.matched && setSelectedBankTx(selectedBankTx?.id === tx.id ? null : tx)}
                    className={clsx(
                      'p-3 cursor-pointer transition-colors',
                      tx.matched ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      selectedBankTx?.id === tx.id && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">{tx.reference}</span>
                          {tx.matched && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white">{locale === 'ar' ? tx.descriptionAr : tx.description}</p>
                        <p className="text-xs text-gray-500">{tx.date}</p>
                      </div>
                      <p className={clsx('font-medium text-sm', tx.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Matched Pairs */}
        {matchedCount > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-green-600" />
              {locale === 'ar' ? 'العناصر المطابقة' : 'Matched Items'}
            </h3>
            <div className="space-y-2">
              {bookTxs.filter(tx => tx.matched).map((bookTx) => {
                const bankTx = bankTxs.find(b => b.id === bookTx.matchedWith);
                if (!bankTx) return null;
                return (
                  <div key={bookTx.id} className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">{bookTx.reference}</p>
                        <p className="text-gray-500 text-xs">{locale === 'ar' ? bookTx.descriptionAr : bookTx.description}</p>
                      </div>
                      <ArrowsRightLeftIcon className="h-4 w-4 text-green-600" />
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">{bankTx.reference}</p>
                        <p className="text-gray-500 text-xs">{locale === 'ar' ? bankTx.descriptionAr : bankTx.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(bookTx.amount)}</span>
                      {canManage && (
                        <button
                          onClick={() => handleUnmatch(bookTx.id, bankTx.id)}
                          className="p-1 text-red-500 hover:text-red-600"
                          title={locale === 'ar' ? 'إلغاء المطابقة' : 'Unmatch'}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
