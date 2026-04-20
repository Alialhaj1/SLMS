import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import EnhancedTable from '../../components/ui/EnhancedTable';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import { vendorApi, isVendorAccessError, getVendorErrorMessage } from '../../lib/marketplaceApi';
import {
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const TX_TYPE_CONFIG: Record<string, { label: string; labelAr: string; icon: string; color: string }> = {
  credit: { label: 'Credit', labelAr: 'إيداع', icon: '↑', color: 'text-green-600' },
  debit: { label: 'Debit', labelAr: 'سحب', icon: '↓', color: 'text-red-600' },
  commission: { label: 'Commission', labelAr: 'عمولة', icon: '−', color: 'text-orange-600' },
  payout: { label: 'Payout', labelAr: 'تحويل', icon: '→', color: 'text-blue-600' },
  refund: { label: 'Refund', labelAr: 'استرجاع', icon: '←', color: 'text-purple-600' },
  adjustment: { label: 'Adjustment', labelAr: 'تعديل', icon: '⟳', color: 'text-gray-600' },
};

export default function VendorWallet() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vendorApi.getWallet();
      setWallet(res?.data || res);
    } catch (err: any) {
      if (isVendorAccessError(err)) {
        setVendorError(getVendorErrorMessage(err, isAr));
      } else {
        showToast(isAr ? 'فشل تحميل المحفظة' : 'Failed to load wallet', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [isAr, showToast]);

  const fetchTransactions = useCallback(async () => {
    try {
      setTxLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (typeFilter !== 'all') params.type = typeFilter;
      const res = await vendorApi.getTransactions(params);
      setTransactions(res?.data || res?.transactions || []);
      setTotal(res?.pagination?.total || 0);
    } catch (err: any) {
      if (isVendorAccessError(err)) {
        setVendorError(getVendorErrorMessage(err, isAr));
      } else {
        showToast(isAr ? 'فشل تحميل المعاملات' : 'Failed to load transactions', 'error');
      }
    } finally {
      setTxLoading(false);
    }
  }, [page, typeFilter, isAr, showToast]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const walletCards = [
    {
      label: isAr ? 'الرصيد المتاح' : 'Available Balance',
      value: wallet?.available_balance || wallet?.balance || 0,
      icon: WalletIcon,
      color: 'from-green-500 to-emerald-600',
    },
    {
      label: isAr ? 'الرصيد المعلق' : 'Pending Balance',
      value: wallet?.pending_balance || 0,
      icon: ClockIcon,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      label: isAr ? 'إجمالي الأرباح' : 'Total Earned',
      value: wallet?.total_earned || 0,
      icon: BanknotesIcon,
      color: 'from-indigo-500 to-purple-600',
    },
    {
      label: isAr ? 'إجمالي المسحوب' : 'Total Withdrawn',
      value: wallet?.total_withdrawn || 0,
      icon: ArrowUpIcon,
      color: 'from-blue-500 to-cyan-500',
    },
  ];

  const typeFilters = ['all', 'credit', 'debit', 'commission', 'payout', 'refund'];

  const columns = [
    {
      key: 'date',
      label: isAr ? 'التاريخ' : 'Date',
      render: (row: any) => (
        <div>
          <p className="text-sm">{new Date(row.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
          <p className="text-xs text-gray-400">{new Date(row.created_at).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: isAr ? 'النوع' : 'Type',
      render: (row: any) => {
        const cfg = TX_TYPE_CONFIG[row.transaction_type || row.type] || { label: row.transaction_type || row.type, labelAr: row.transaction_type || row.type, icon: '•', color: 'text-gray-500' };
        return (
          <span className={`flex items-center gap-1 text-sm font-medium ${cfg.color}`}>
            <span className="text-lg">{cfg.icon}</span>
            {isAr ? cfg.labelAr : cfg.label}
          </span>
        );
      },
    },
    {
      key: 'description',
      label: isAr ? 'الوصف' : 'Description',
      render: (row: any) => (
        <span className="text-sm text-gray-600">{row.description || row.reference || '—'}</span>
      ),
    },
    {
      key: 'amount',
      label: isAr ? 'المبلغ' : 'Amount',
      render: (row: any) => {
        const isPositive = ['credit'].includes(row.transaction_type || row.type);
        return (
          <span className={`font-mono font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : '-'}{parseFloat(row.amount || 0).toLocaleString()}
          </span>
        );
      },
    },
    {
      key: 'balance_after',
      label: isAr ? 'الرصيد بعد' : 'Balance After',
      render: (row: any) => (
        <span className="font-mono text-sm text-gray-500">
          {row.balance_after != null ? parseFloat(row.balance_after).toLocaleString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'محفظتي — البائع' : 'My Wallet — Vendor'}</title></Head>
      {vendorError ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{isAr ? 'غير مسموح' : 'Access Denied'}</h2>
            <p className="text-gray-600 dark:text-gray-400">{vendorError}</p>
          </div>
        </div>
      ) : (
      <>
      <PageHeader
        title="Wallet"
        title_ar="المحفظة"
        description="Your balance and financial transactions"
        description_ar="رصيدك والمعاملات المالية"
        icon={WalletIcon}
        breadcrumbs={[
          { label: 'Vendor', label_ar: 'البائع', href: '/vendor/dashboard' },
          { label: 'Wallet', label_ar: 'المحفظة' },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Wallet Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {walletCards.map((card, i) => (
            <div key={i} className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{card.label}</span>
                <div className={`p-2 rounded-lg bg-gradient-to-r ${card.color}`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono">
                {loading ? '...' : parseFloat(card.value || 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Transactions Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{isAr ? 'سجل المعاملات' : 'Transaction History'}</h3>
          <div className="flex gap-1 flex-wrap mb-4">
            {typeFilters.map((f) => (
              <button key={f} onClick={() => { setTypeFilter(f); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${typeFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f === 'all' ? (isAr ? 'الكل' : 'All') :
                  (isAr ? (TX_TYPE_CONFIG[f]?.labelAr || f) : (TX_TYPE_CONFIG[f]?.label || f))}
              </button>
            ))}
          </div>

          <EnhancedTable
            columns={columns}
            data={transactions}
            loading={txLoading}
            emptyMessage={isAr ? 'لا توجد معاملات' : 'No transactions found'}
            pagination={{ page, total, pageSize: 20 }}
            onPaginationChange={(p) => setPage(p.page)}
          />
        </div>
      </div>
      </>
      )}
    </MainLayout>
  );
}
