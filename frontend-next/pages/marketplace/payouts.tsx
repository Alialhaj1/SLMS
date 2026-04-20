import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import EnhancedTable from '../../components/ui/EnhancedTable';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/apiClient';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface Payout {
  id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_name_ar: string;
  vendor_slug: string;
  amount: number;
  bank_name: string;
  bank_iban: string;
  bank_account_name: string;
  status: string;
  payment_reference: string | null;
  processed_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string; labelAr: string; icon: any }> = {
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', label: 'Pending', labelAr: 'معلق', icon: ClockIcon },
  completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', label: 'Completed', labelAr: 'مكتمل', icon: CheckCircleIcon },
  failed: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', label: 'Failed', labelAr: 'فشل', icon: XCircleIcon },
};

export default function PayoutsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [processModal, setProcessModal] = useState<Payout | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [settlingCount, setSettlingCount] = useState<number | null>(null);

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.request<any>(`/api/marketplace/admin/payouts?${params.toString()}`);
      setPayouts(res?.payouts || []);
      setTotal(res?.total || 0);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const handleProcess = async () => {
    if (!processModal || !paymentRef) return;
    try {
      await apiClient.request(`/api/marketplace/admin/payouts/${processModal.id}/process`, {
        method: 'PUT',
        body: JSON.stringify({ paymentReference: paymentRef }),
      });
      showToast(isAr ? 'تم معالجة الدفعة' : 'Payout processed', 'success');
      setProcessModal(null);
      setPaymentRef('');
      fetchPayouts();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleSettlement = async () => {
    try {
      const res = await apiClient.request<any>('/api/marketplace/admin/settlements/process', { method: 'POST' });
      setSettlingCount(res?.processed || 0);
      showToast(
        isAr ? `تم تسوية ${res?.processed || 0} طلبات` : `Settled ${res?.processed || 0} orders`,
        'success'
      );
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const totalPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);
  const totalCompleted = payouts.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0);

  const statCards = [
    { label: isAr ? 'إجمالي المدفوعات' : 'Total Payouts', value: total, icon: BanknotesIcon, gradient: 'from-indigo-500 to-purple-500' },
    { label: isAr ? 'معلقة' : 'Pending Amount', value: `$${totalPending.toLocaleString()}`, icon: ClockIcon, gradient: 'from-amber-500 to-orange-500' },
    { label: isAr ? 'مكتملة' : 'Completed Amount', value: `$${totalCompleted.toLocaleString()}`, icon: CheckCircleIcon, gradient: 'from-emerald-500 to-teal-500' },
    { label: isAr ? 'عدد معلق' : 'Pending Count', value: payouts.filter(p => p.status === 'pending').length, icon: DocumentTextIcon, gradient: 'from-rose-500 to-pink-500' },
  ];

  const columns = [
    {
      key: 'vendor_name', label: 'Vendor', label_ar: 'البائع',
      render: (p: Payout) => (
        <div className="flex items-center gap-2">
          <BuildingStorefrontIcon className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-sm">{isAr ? p.vendor_name_ar : p.vendor_name}</span>
        </div>
      ),
    },
    {
      key: 'amount', label: 'Amount', label_ar: 'المبلغ', sortable: true,
      render: (p: Payout) => <span className="font-mono text-sm font-medium">${Number(p.amount || 0).toFixed(2)}</span>,
    },
    {
      key: 'bank_iban', label: 'Bank / IBAN', label_ar: 'البنك',
      render: (p: Payout) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{p.bank_name}</div>
          <div className="text-xs text-gray-400 font-mono">{p.bank_iban?.slice(0, 8)}...{p.bank_iban?.slice(-4)}</div>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status', label_ar: 'الحالة',
      render: (p: Payout) => {
        const s = statusConfig[p.status] || statusConfig.pending;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
            <s.icon className="h-3.5 w-3.5" />
            {isAr ? s.labelAr : s.label}
          </span>
        );
      },
    },
    {
      key: 'payment_reference', label: 'Reference', label_ar: 'المرجع',
      render: (p: Payout) => <span className="text-sm text-gray-500 font-mono">{p.payment_reference || '—'}</span>,
    },
    {
      key: 'created_at', label: 'Date', label_ar: 'التاريخ', sortable: true,
      render: (p: Payout) => <span className="text-sm text-gray-500">{new Date(p.created_at).toLocaleDateString()}</span>,
    },
  ];

  const tableActions = [
    { id: 'process', label: isAr ? 'معالجة' : 'Process', icon: CheckCircleIcon, onClick: (p: Payout) => setProcessModal(p), condition: (p: Payout) => p.status === 'pending' },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'مدفوعات البائعين' : 'Vendor Payouts'}</title></Head>
      <PageHeader
        title="Vendor Payouts"
        title_ar="مدفوعات البائعين"
        description="Process vendor payout requests and manage settlements."
        description_ar="معالجة طلبات الدفع للبائعين وإدارة التسويات."
        icon={BanknotesIcon}
        breadcrumbs={[
          { label: 'Marketplace', label_ar: 'السوق', href: '/marketplace/dashboard' },
          { label: 'Payouts', label_ar: 'المدفوعات' },
        ]}
        actions={[
          {
            id: 'run-settlement',
            label: isAr ? 'تشغيل التسوية' : 'Run Settlement',
            icon: ArrowPathIcon,
            onClick: handleSettlement,
            variant: 'secondary',
          },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.gradient} flex items-center justify-center`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : card.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {['', 'pending', 'completed', 'failed'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === s
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-indigo-500'
            }`}>
            {s === '' ? (isAr ? 'الكل' : 'All') : (statusConfig[s]?.[isAr ? 'labelAr' : 'label'] || s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <EnhancedTable
          data={payouts}
          columns={columns}
          actions={tableActions}
          loading={loading}
          pagination={{ page, total, pageSize: 20 }}
          onPaginationChange={(p) => setPage(p.page)}
          emptyMessage={isAr ? 'لا يوجد مدفوعات' : 'No payouts found'}
        />
      </div>

      {/* Process Payout Modal */}
      {processModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {isAr ? 'معالجة الدفعة' : 'Process Payout'}
            </h3>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-500">{isAr ? processModal.vendor_name_ar : processModal.vendor_name}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">${Number(processModal.amount || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-400 font-mono">{processModal.bank_name} — {processModal.bank_iban}</p>
            </div>
            <input
              type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)}
              placeholder={isAr ? 'رقم مرجع الدفع' : 'Payment reference number'}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-3 mb-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setProcessModal(null); setPaymentRef(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleProcess} disabled={!paymentRef}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50">
                {isAr ? 'معالجة' : 'Process'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
