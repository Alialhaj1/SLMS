import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  CalculatorIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface VatReturn {
  id: number;
  return_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  status: string;
  total_output_vat: number;
  total_input_vat: number;
  net_vat: number;
  refund_amount: number;
  payment_amount: number;
  submission_date: string | null;
  payment_date: string | null;
  zatca_reference: string | null;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  submitted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  draft: { en: 'Draft', ar: 'مسودة' },
  review: { en: 'Under Review', ar: 'قيد المراجعة' },
  approved: { en: 'Approved', ar: 'معتمد' },
  submitted: { en: 'Submitted to ZATCA', ar: 'مُقدّم للزكاة' },
  paid: { en: 'Paid', ar: 'مدفوع' },
  overdue: { en: 'Overdue', ar: 'متأخر' },
};

export default function VatReturnsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const [returns, setReturns] = useState<VatReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchReturns();
  }, [statusFilter]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/vat-returns?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setReturns(result.data || []);
      } else {
        showToast('error', locale === 'ar' ? 'فشل تحميل إقرارات الضريبة' : 'Failed to load VAT returns');
      }
    } catch (error) {
      showToast('error', locale === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0) + ' SAR';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB');
  };

  const formatPeriod = (start: string, end: string) => {
    return `${formatDate(start)} — ${formatDate(end)}`;
  };

  const handleApprove = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/vat-returns/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', locale === 'ar' ? 'تم اعتماد الإقرار' : 'Return approved');
        fetchReturns();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed');
      }
    } catch { showToast('error', 'Error'); }
  };

  const handleSubmit = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/vat-returns/${id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', locale === 'ar' ? 'تم تقديم الإقرار للزكاة' : 'Submitted to ZATCA');
        fetchReturns();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed');
      }
    } catch { showToast('error', 'Error'); }
  };

  const isOverdue = (r: VatReturn) => {
    return r.due_date && new Date(r.due_date) < new Date() && r.status !== 'paid' && r.status !== 'submitted';
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'إقرارات ضريبة القيمة المضافة — SLMS' : 'VAT Returns — SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CalculatorIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'إقرارات ضريبة القيمة المضافة' : 'VAT Returns'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة الإقرارات الضريبية وتقديمها لهيئة الزكاة' : 'Manage VAT returns & submit to ZATCA'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchReturns}>
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            {hasPermission('vat_returns:create') && (
              <Button onClick={() => router.push('/accounting/vat-returns/new')}>
                <PlusIcon className="w-5 h-5 mr-1" />
                {locale === 'ar' ? 'إقرار جديد' : 'New VAT Return'}
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(() => {
            const totalOutput = returns.reduce((s, r) => s + (r.total_output_vat || 0), 0);
            const totalInput = returns.reduce((s, r) => s + (r.total_input_vat || 0), 0);
            const totalNet = returns.reduce((s, r) => s + (r.net_vat || 0), 0);
            const overdueCount = returns.filter(isOverdue).length;
            return [
              { label: locale === 'ar' ? 'ضريبة المخرجات' : 'Output VAT', value: formatCurrency(totalOutput), color: 'text-blue-600 dark:text-blue-400' },
              { label: locale === 'ar' ? 'ضريبة المدخلات' : 'Input VAT', value: formatCurrency(totalInput), color: 'text-green-600 dark:text-green-400' },
              { label: locale === 'ar' ? 'صافي الضريبة' : 'Net VAT', value: formatCurrency(totalNet), color: 'text-purple-600 dark:text-purple-400' },
              { label: locale === 'ar' ? 'متأخرة' : 'Overdue', value: overdueCount.toString(), color: overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400' },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ));
          })()}
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex gap-4">
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
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-12">
              <CalculatorIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'لا توجد إقرارات ضريبية' : 'No VAT returns found'}
              </h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'رقم الإقرار' : 'Return #'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الفترة' : 'Period'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'ض. المخرجات' : 'Output VAT'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'ض. المدخلات' : 'Input VAT'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الصافي' : 'Net VAT'}
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
                  {filteredReturns.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${isOverdue(r) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                      onClick={() => router.push(`/accounting/vat-returns/${r.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{r.return_number}</span>
                        {r.zatca_reference && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">ZATCA: {r.zatca_reference}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatPeriod(r.period_start, r.period_end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={isOverdue(r) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100'}>
                          {formatDate(r.due_date)}
                          {isOverdue(r) && <ExclamationTriangleIcon className="w-4 h-4 inline ml-1" />}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(r.total_output_vat)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 dark:text-green-400">
                        ({formatCurrency(r.total_input_vat)})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-bold ${(r.net_vat || 0) >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {formatCurrency(Math.abs(r.net_vat || 0))}
                          {(r.net_vat || 0) < 0 ? ` (${locale === 'ar' ? 'استرداد' : 'Refund'})` : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || statusColors.draft}`}>
                          {locale === 'ar' ? statusLabels[r.status]?.ar : statusLabels[r.status]?.en || r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === 'review' && hasPermission('vat_returns:approve') && (
                            <Button size="sm" variant="secondary" onClick={(e) => handleApprove(r.id, e)}>
                              {locale === 'ar' ? 'اعتماد' : 'Approve'}
                            </Button>
                          )}
                          {r.status === 'approved' && hasPermission('vat_returns:submit') && (
                            <Button size="sm" onClick={(e) => handleSubmit(r.id, e)}>
                              <DocumentArrowUpIcon className="w-3 h-3 mr-1" />
                              {locale === 'ar' ? 'تقديم' : 'Submit'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); router.push(`/accounting/vat-returns/${r.id}`); }}
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
