import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';

interface ZatcaSubmission {
  id: number;
  invoice_id: number;
  invoice_number: string;
  customer_name: string;
  submission_type: string;
  status: string;
  zatca_uuid: string;
  submission_date: string | null;
  response_code: string | null;
  clearance_status: string;
  retry_count: number;
  error_message: string | null;
  created_at: string;
}

interface ZatcaStats {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  warning: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  accepted_with_warnings: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  pending: { en: 'Pending', ar: 'معلق' },
  submitted: { en: 'Submitted', ar: 'مُقدّم' },
  accepted: { en: 'Accepted', ar: 'مقبول' },
  accepted_with_warnings: { en: 'Accepted (Warnings)', ar: 'مقبول (مع تحذيرات)' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  failed: { en: 'Failed', ar: 'فشل' },
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <ClockIcon className="w-4 h-4" />,
  submitted: <CloudArrowUpIcon className="w-4 h-4" />,
  accepted: <CheckCircleIcon className="w-4 h-4" />,
  accepted_with_warnings: <ExclamationTriangleIcon className="w-4 h-4" />,
  rejected: <XCircleIcon className="w-4 h-4" />,
  failed: <XCircleIcon className="w-4 h-4" />,
};

export default function ZatcaSubmissionsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<ZatcaSubmission[]>([]);
  const [stats, setStats] = useState<ZatcaStats>({ total: 0, accepted: 0, rejected: 0, pending: 0, warning: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
  }, [statusFilter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/zatca?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setSubmissions(result.data || []);
      } else {
        showToast('error', locale === 'ar' ? 'فشل تحميل بيانات ZATCA' : 'Failed to load ZATCA submissions');
      }
    } catch (error) {
      showToast('error', locale === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/zatca/stats/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setStats(result.data || stats);
      }
    } catch {}
  };

  const handleRetry = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/zatca/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', locale === 'ar' ? 'تم إعادة التقديم' : 'Resubmitted');
        fetchSubmissions();
        fetchStats();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Retry failed');
      }
    } catch { showToast('error', 'Error'); }
  };

  const filteredSubmissions = submissions.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.invoice_number?.toLowerCase().includes(term) ||
      s.customer_name?.toLowerCase().includes(term) ||
      s.zatca_uuid?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الفوترة الإلكترونية — ZATCA — SLMS' : 'E-Invoicing — ZATCA — SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <QrCodeIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'الفوترة الإلكترونية — ZATCA' : 'E-Invoicing — ZATCA'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة تقديم الفواتير الإلكترونية لهيئة الزكاة المرحلة الثانية' : 'ZATCA Phase 2 e-invoice submission management'}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => { fetchSubmissions(); fetchStats(); }}>
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            {locale === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: locale === 'ar' ? 'الإجمالي' : 'Total', value: stats.total, color: 'text-blue-600 dark:text-blue-400' },
            { label: locale === 'ar' ? 'مقبول' : 'Accepted', value: stats.accepted, color: 'text-green-600 dark:text-green-400' },
            { label: locale === 'ar' ? 'معلق' : 'Pending', value: stats.pending, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: locale === 'ar' ? 'تحذيرات' : 'Warnings', value: stats.warning, color: 'text-orange-600 dark:text-orange-400' },
            { label: locale === 'ar' ? 'مرفوض' : 'Rejected', value: stats.rejected, color: 'text-red-600 dark:text-red-400' },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث برقم الفاتورة أو UUID...' : 'Search by invoice number, UUID...'}
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
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <QrCodeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'لا توجد تقديمات' : 'No submissions found'}
              </h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'العميل' : 'Customer'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'النوع' : 'Type'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      ZATCA UUID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'التاريخ' : 'Date'}
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
                  {filteredSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{s.invoice_number}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{s.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <span className="capitalize">{s.submission_type?.replace('_', ' ') || 'Standard'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400" title={s.zatca_uuid}>
                          {s.zatca_uuid?.substring(0, 12)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(s.submission_date || s.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || statusColors.pending}`}>
                          {statusIcons[s.status]}
                          {locale === 'ar' ? statusLabels[s.status]?.ar : statusLabels[s.status]?.en || s.status}
                        </span>
                        {s.error_message && (
                          <div className="text-xs text-red-500 dark:text-red-400 mt-1 max-w-xs truncate" title={s.error_message}>
                            {s.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {(s.status === 'rejected' || s.status === 'failed') && s.retry_count < 3 && hasPermission('zatca:submit') && (
                            <Button size="sm" variant="secondary" onClick={(e) => handleRetry(s.id, e)}>
                              <ArrowPathIcon className="w-3 h-3 mr-1" />
                              {locale === 'ar' ? 'إعادة' : 'Retry'} ({s.retry_count}/3)
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => router.push(`/accounting/zatca/${s.id}`)}
                          >
                            {locale === 'ar' ? 'تفاصيل' : 'Details'}
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
