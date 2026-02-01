import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  BanknotesIcon,
  TruckIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';

interface AutoPosting {
  id: number;
  rule_id: number;
  rule_code: string;
  rule_name: string;
  trigger_code: string;
  source_entity_type: string;
  source_entity_id: number;
  entity_reference?: string;
  journal_entry_id?: number;
  journal_number?: string;
  amount: number;
  currency_code?: string;
  status: 'pending' | 'preview' | 'posted' | 'failed' | 'reversed';
  error_message?: string;
  posted_at?: string;
  posted_by_name?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  pending: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: ClockIcon },
  preview: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: EyeIcon },
  posted: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircleIcon },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircleIcon },
  reversed: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400', icon: ArrowPathIcon },
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  expense_request: BanknotesIcon,
  payment_request: ArrowsRightLeftIcon,
  shipment: TruckIcon,
  default: DocumentTextIcon,
};

function AutoPostingsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [postings, setPostings] = useState<AutoPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
    }
    fetchPostings();
  }, [page, filterStatus, filterEntity]);

  const fetchPostings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (filterStatus) params.append('status', filterStatus);
      if (filterEntity) params.append('entity_type', filterEntity);

      const res = await fetch(`http://localhost:4000/api/accounting-rules/postings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const body = await res.json();
        setPostings(Array.isArray(body?.data) ? body.data : []);
        if (body.pagination) {
          setTotalPages(body.pagination.totalPages || 1);
        }
      }
    } catch (e: any) {
      showToast(e?.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPostings = postings.filter(p => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        p.rule_code?.toLowerCase().includes(search) ||
        p.rule_name?.toLowerCase().includes(search) ||
        p.entity_reference?.toLowerCase().includes(search) ||
        p.journal_number?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: locale === 'ar' ? arLocale : undefined,
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      preview: { en: 'Preview', ar: 'معاينة' },
      posted: { en: 'Posted', ar: 'مرحّل' },
      failed: { en: 'Failed', ar: 'فشل' },
      reversed: { en: 'Reversed', ar: 'معكوس' },
    };
    return locale === 'ar' ? labels[status]?.ar || status : labels[status]?.en || status;
  };

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      expense_request: { en: 'Expense Request', ar: 'طلب مصروف' },
      payment_request: { en: 'Payment Request', ar: 'طلب دفع' },
      shipment: { en: 'Shipment', ar: 'شحنة' },
      purchase_invoice: { en: 'Purchase Invoice', ar: 'فاتورة مشتريات' },
      sales_invoice: { en: 'Sales Invoice', ar: 'فاتورة مبيعات' },
    };
    return locale === 'ar' ? labels[entity]?.ar || entity : labels[entity]?.en || entity;
  };

  // Stats
  const pendingCount = postings.filter(p => p.status === 'pending').length;
  const postedCount = postings.filter(p => p.status === 'posted').length;
  const failedCount = postings.filter(p => p.status === 'failed').length;

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'سجل القيود التلقائية' : 'Auto Postings Log'} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowPathIcon className="w-7 h-7 text-purple-600" />
              {locale === 'ar' ? 'سجل القيود التلقائية' : 'Auto Postings Log'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {locale === 'ar' ? 'متابعة القيود المُنشأة تلقائياً' : 'Track automatically generated journal entries'}
            </p>
          </div>
          <Button onClick={() => fetchPostings()} variant="secondary" className="flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'تم الترحيل' : 'Posted'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{postedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'فشل' : 'Failed'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{failedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="pending">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
            <option value="posted">{locale === 'ar' ? 'مرحّل' : 'Posted'}</option>
            <option value="failed">{locale === 'ar' ? 'فشل' : 'Failed'}</option>
            <option value="reversed">{locale === 'ar' ? 'معكوس' : 'Reversed'}</option>
          </select>
          <select
            value={filterEntity}
            onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{locale === 'ar' ? 'كل الكيانات' : 'All Entities'}</option>
            <option value="expense_request">{locale === 'ar' ? 'طلبات المصروفات' : 'Expense Requests'}</option>
            <option value="payment_request">{locale === 'ar' ? 'طلبات الدفع' : 'Payment Requests'}</option>
            <option value="shipment">{locale === 'ar' ? 'الشحنات' : 'Shipments'}</option>
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-end">
            {t('common.showing')}: <span className="font-bold mx-1">{filteredPostings.length}</span>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredPostings.length === 0 ? (
            <div className="p-8 text-center">
              <ArrowPathIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'القاعدة' : 'Rule'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'الكيان المصدر' : 'Source Entity'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'رقم القيد' : 'Journal #'}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'التاريخ' : 'Date'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPostings.map((posting) => {
                  const EntityIcon = ENTITY_ICONS[posting.source_entity_type] || ENTITY_ICONS.default;
                  const statusConfig = STATUS_CONFIG[posting.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={posting.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{posting.rule_name}</p>
                        <p className="text-xs text-gray-500 font-mono">{posting.rule_code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <EntityIcon className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {getEntityLabel(posting.source_entity_type)}
                            </p>
                            {posting.entity_reference && (
                              <p className="text-xs text-blue-600 font-mono">{posting.entity_reference}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {posting.amount?.toLocaleString()} {posting.currency_code || 'SAR'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {posting.journal_number ? (
                          <a href={`/accounting/journal-entries/${posting.journal_entry_id}`} className="text-sm text-blue-600 hover:underline font-mono">
                            {posting.journal_number}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {getStatusLabel(posting.status)}
                          </span>
                        </div>
                        {posting.error_message && (
                          <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={posting.error_message}>
                            {posting.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(posting.created_at)}</p>
                        {posting.posted_by_name && (
                          <p className="text-xs text-gray-500">{posting.posted_by_name}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              {t('common.previous')}
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('common.page')} {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              {t('common.next')}
            </Button>
          </div>
        )}
      </Card>
    </MainLayout>
  );
}

export default withPermission('accounting:rules:view', AutoPostingsPage);
