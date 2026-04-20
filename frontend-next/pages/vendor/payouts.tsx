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
  BanknotesIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const PAYOUT_STATUS_CONFIG: Record<string, { label: string; labelAr: string; color: string }> = {
  pending: { label: 'Pending', labelAr: 'معلق', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Processing', labelAr: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', labelAr: 'مكتمل', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', labelAr: 'مرفوض', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: 'bg-gray-100 text-gray-700' },
};

export default function VendorPayouts() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [wallet, setWallet] = useState<any>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [requesting, setRequesting] = useState(false);

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vendorApi.getPayouts({ page: String(page), limit: '20' });
      setPayouts(res?.data || res?.payouts || []);
      setTotal(res?.pagination?.total || 0);
    } catch (err: any) {
      if (isVendorAccessError(err)) {
        setVendorError(getVendorErrorMessage(err, isAr));
      } else {
        showToast(isAr ? 'فشل تحميل التحويلات' : 'Failed to load payouts', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [page, isAr, showToast]);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await vendorApi.getWallet();
      setWallet(res?.data || res);
    } catch { /* wallet fetch is secondary */ }
  }, []);

  useEffect(() => { fetchPayouts(); fetchWallet(); }, [fetchPayouts, fetchWallet]);

  const handleRequestPayout = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      showToast(isAr ? 'أدخل مبلغ صحيح' : 'Enter a valid amount', 'error');
      return;
    }
    const available = parseFloat(wallet?.available_balance || wallet?.balance || 0);
    if (amt > available) {
      showToast(isAr ? 'المبلغ يتجاوز الرصيد المتاح' : 'Amount exceeds available balance', 'error');
      return;
    }
    try {
      setRequesting(true);
      await vendorApi.requestPayout({ amount: amt, notes: notes || undefined });
      showToast(isAr ? 'تم طلب التحويل بنجاح' : 'Payout request submitted', 'success');
      setShowRequestModal(false);
      setAmount('');
      setNotes('');
      fetchPayouts();
      fetchWallet();
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل طلب التحويل' : 'Failed to request payout'), 'error');
    } finally {
      setRequesting(false);
    }
  };

  const columns = [
    {
      key: 'date',
      label: isAr ? 'التاريخ' : 'Date',
      render: (row: any) => (
        <div>
          <p className="text-sm">{new Date(row.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
          <p className="text-xs text-gray-400">#{row.id}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: isAr ? 'المبلغ' : 'Amount',
      render: (row: any) => (
        <span className="font-mono font-bold text-lg">{parseFloat(row.amount || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'method',
      label: isAr ? 'طريقة الدفع' : 'Method',
      render: (row: any) => (
        <span className="text-sm text-gray-600">{row.payout_method || row.method || 'Bank Transfer'}</span>
      ),
    },
    {
      key: 'status',
      label: isAr ? 'الحالة' : 'Status',
      render: (row: any) => {
        const cfg = PAYOUT_STATUS_CONFIG[row.status] || { label: row.status, labelAr: row.status, color: 'bg-gray-100' };
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
            {isAr ? cfg.labelAr : cfg.label}
          </span>
        );
      },
    },
    {
      key: 'processed_at',
      label: isAr ? 'تاريخ التنفيذ' : 'Processed',
      render: (row: any) => (
        <span className="text-sm text-gray-500">
          {row.processed_at ? new Date(row.processed_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US') : '—'}
        </span>
      ),
    },
    {
      key: 'notes',
      label: isAr ? 'ملاحظات' : 'Notes',
      render: (row: any) => (
        <span className="text-sm text-gray-500 truncate max-w-[200px] block">{row.notes || row.admin_notes || '—'}</span>
      ),
    },
  ];

  const available = parseFloat(wallet?.available_balance || wallet?.balance || 0);

  return (
    <MainLayout>
      <Head><title>{isAr ? 'التحويلات — البائع' : 'Payouts — Vendor'}</title></Head>
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
        title="Payouts"
        title_ar="التحويلات المالية"
        description="Request and review your financial payouts"
        description_ar="طلب واستعراض تحويلاتك المالية"
        icon={BanknotesIcon}
        breadcrumbs={[
          { label: 'Vendor', label_ar: 'البائع', href: '/vendor/dashboard' },
          { label: 'Payouts', label_ar: 'التحويلات' },
        ]}
        actions={[
          {
            id: 'request-payout',
            label: 'Request Payout',
            label_ar: 'طلب تحويل',
            icon: PlusIcon,
            onClick: () => setShowRequestModal(true),
            variant: 'primary',
          },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Balance Summary */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-green-700">{isAr ? 'الرصيد المتاح للسحب' : 'Available for withdrawal'}</p>
            <p className="text-3xl font-bold font-mono text-green-800">{available.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{isAr ? 'الرصيد المعلق' : 'Pending balance'}</p>
            <p className="text-lg font-mono text-gray-600">{parseFloat(wallet?.pending_balance || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Payouts Table */}
        <EnhancedTable
          columns={columns}
          data={payouts}
          loading={loading}
          emptyMessage={isAr ? 'لا توجد تحويلات' : 'No payouts found'}
          pagination={{ page, total, pageSize: 20 }}
          onPaginationChange={(p) => setPage(p.page)}
        />
      </div>

      {/* Request Payout Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 m-4">
            <h3 className="text-lg font-semibold mb-4">{isAr ? 'طلب تحويل مالي' : 'Request Payout'}</h3>
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-sm text-green-600">{isAr ? 'الرصيد المتاح' : 'Available'}</p>
                <p className="text-2xl font-bold font-mono text-green-800">{available.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'المبلغ' : 'Amount'} *</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono" step="0.01" min="0"
                  max={String(available)}
                  placeholder={isAr ? 'أدخل المبلغ' : 'Enter amount'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" rows={2}
                  placeholder={isAr ? 'ملاحظات اختيارية...' : 'Optional notes...'} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{isAr ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleRequestPayout} disabled={requesting || !amount}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {requesting ? (isAr ? 'جاري الطلب...' : 'Requesting...') : (isAr ? 'طلب تحويل' : 'Request')}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </MainLayout>
  );
}
