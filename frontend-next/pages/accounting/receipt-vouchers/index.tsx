import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  BanknotesIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface ReceiptVoucher {
  id: number;
  voucher_number: string;
  customer_id: number;
  customer_name: string;
  customer_code: string;
  receipt_date: string;
  payment_method: string;
  bank_account_name: string | null;
  status: string;
  currency_code: string;
  total_amount: number;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  reversed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  draft: { en: 'Draft', ar: 'مسودة' },
  approved: { en: 'Approved', ar: 'معتمد' },
  posted: { en: 'Posted', ar: 'مرحّل' },
  reversed: { en: 'Reversed', ar: 'معكوس' },
};

const paymentMethodLabels: Record<string, { en: string; ar: string }> = {
  cash: { en: 'Cash', ar: 'نقداً' },
  bank_transfer: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
  cheque: { en: 'Cheque', ar: 'شيك' },
  credit_card: { en: 'Credit Card', ar: 'بطاقة ائتمان' },
};

export default function ReceiptVouchersPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const [vouchers, setVouchers] = useState<ReceiptVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, posted: 0, totalAmount: 0 });

  useEffect(() => {
    fetchVouchers();
  }, [statusFilter]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/receipt-vouchers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        const data = result.data || [];
        setVouchers(data);
        setStats({
          total: data.length,
          posted: data.filter((v: ReceiptVoucher) => v.status === 'posted').length,
          totalAmount: data.reduce((sum: number, v: ReceiptVoucher) => sum + (v.total_amount || 0), 0),
        });
      } else {
        showToast('error', locale === 'ar' ? 'فشل تحميل سندات القبض' : 'Failed to load receipt vouchers');
      }
    } catch (error) {
      showToast('error', locale === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const filteredVouchers = vouchers.filter((v) => {
    const term = searchTerm.toLowerCase();
    return (
      v.voucher_number?.toLowerCase().includes(term) ||
      v.customer_name?.toLowerCase().includes(term) ||
      v.reference_number?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0) + ' ' + (currency || 'SAR');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB');
  };

  const handleApprove = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/receipt-vouchers/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', locale === 'ar' ? 'تم اعتماد السند' : 'Voucher approved');
        fetchVouchers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Approval failed');
      }
    } catch { showToast('error', 'Error'); }
  };

  const handlePost = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/receipt-vouchers/${id}/post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', locale === 'ar' ? 'تم ترحيل السند' : 'Voucher posted');
        fetchVouchers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Posting failed');
      }
    } catch { showToast('error', 'Error'); }
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'سندات القبض — SLMS' : 'Receipt Vouchers — SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'سندات القبض' : 'Receipt Vouchers'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تحصيل المبالغ من العملاء وترحيل القيود المحاسبية' : 'Collect payments from customers & post journal entries'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchVouchers}>
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            {hasPermission('receipt_vouchers:create') && (
              <Button onClick={() => router.push('/accounting/receipt-vouchers/new')}>
                <PlusIcon className="w-5 h-5 mr-1" />
                {locale === 'ar' ? 'سند قبض جديد' : 'New Receipt Voucher'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي السندات' : 'Total Vouchers'}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مرحّلة' : 'Posted'}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.posted}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي المحصّل' : 'Total Collected'}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث برقم السند أو اسم العميل...' : 'Search by voucher number, customer...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full">
                <option value="all">{locale === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{locale === 'ar' ? label.ar : label.en}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="text-center py-12">
              <BanknotesIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'لا توجد سندات قبض' : 'No receipt vouchers found'}
              </h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'رقم السند' : 'Voucher #'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'العميل' : 'Customer'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'المبلغ' : 'Amount'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredVouchers.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => router.push(`/accounting/receipt-vouchers/${v.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{v.voucher_number}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(v.receipt_date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{v.customer_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{v.customer_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {locale === 'ar' ? paymentMethodLabels[v.payment_method]?.ar : paymentMethodLabels[v.payment_method]?.en || v.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(v.total_amount, v.currency_code)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[v.status] || statusColors.draft}`}>
                          {locale === 'ar' ? statusLabels[v.status]?.ar : statusLabels[v.status]?.en || v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {v.status === 'draft' && hasPermission('receipt_vouchers:approve') && (
                            <Button size="sm" variant="secondary" onClick={(e) => handleApprove(v.id, e)}>
                              {locale === 'ar' ? 'اعتماد' : 'Approve'}
                            </Button>
                          )}
                          {v.status === 'approved' && hasPermission('receipt_vouchers:post') && (
                            <Button size="sm" onClick={(e) => handlePost(v.id, e)}>
                              {locale === 'ar' ? 'ترحيل' : 'Post'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); router.push(`/accounting/receipt-vouchers/${v.id}`); }}
                          >
                            {locale === 'ar' ? 'عرض' : 'View'}
                          </Button>
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
    </MainLayout>
  );
}
