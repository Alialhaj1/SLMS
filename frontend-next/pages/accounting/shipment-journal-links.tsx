import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import apiClient from '@/lib/apiClient';
import { BookOpenIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface JournalLink {
  expense_id: number;
  shipment_id: number;
  shipment_number: string;
  expense_type_name: string;
  expense_type_name_ar: string;
  category: string;
  vendor_name: string;
  total_amount: number;
  vat_amount: number;
  currency: string;
  journal_entry_number: string;
  posted_at: string;
  is_posted: boolean;
  invoice_number: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ShipmentJournalLinksPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const [items, setItems] = useState<JournalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'posted' | 'unposted'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 25, total: 0, totalPages: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await apiClient.get<{ success: boolean; data: JournalLink[]; pagination: PaginationInfo }>(`/api/shipment-accounting/journal-links?${params}`);
      setItems(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch {
      showToast('error', locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const fmt = (n: number) => new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const postedCount = items.filter(i => i.is_posted).length;
  const unpostedCount = items.filter(i => !i.is_posted).length;

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'ربط المصاريف بالقيود' : 'Expense → Journal Links'} - SLMS</title></Head>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
              <BookOpenIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'ربط المصاريف بالقيود المحاسبية' : 'Expense → Journal Entry Links'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تتبع حالة الترحيل لكل مصروف' : 'Track posting status of each expense'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium rounded-lg">
              {locale === 'ar' ? 'مرحّل' : 'Posted'}: {postedCount}
            </span>
            <span className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-medium rounded-lg">
              {locale === 'ar' ? 'غير مرحّل' : 'Unposted'}: {unpostedCount}
            </span>
            <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg">
              {locale === 'ar' ? 'الإجمالي' : 'Total'}: {pagination.total}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={locale === 'ar' ? 'بحث برقم الشحنة، المصروف، أو رقم القيد...' : 'Search by shipment #, expense, or journal #...'}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            {(['all', 'posted', 'unposted'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${statusFilter === f
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-teal-400'}`}>
                {f === 'all' ? (locale === 'ar' ? 'الكل' : 'All') : f === 'posted' ? (locale === 'ar' ? 'مرحّل' : 'Posted') : (locale === 'ar' ? 'غير مرحّل' : 'Unposted')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-r-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpenIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد مصاريف' : 'No expenses found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {[
                      locale === 'ar' ? 'رقم الشحنة' : 'Shipment #',
                      locale === 'ar' ? 'نوع المصروف' : 'Expense Type',
                      locale === 'ar' ? 'الفئة' : 'Category',
                      locale === 'ar' ? 'المورد' : 'Vendor',
                      locale === 'ar' ? 'المبلغ' : 'Amount',
                      locale === 'ar' ? 'الضريبة' : 'VAT',
                      locale === 'ar' ? 'رقم الفاتورة' : 'Invoice #',
                      locale === 'ar' ? 'رقم القيد' : 'Journal Entry #',
                      locale === 'ar' ? 'تاريخ الترحيل' : 'Posted Date',
                      locale === 'ar' ? 'الحالة' : 'Status',
                    ].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map(row => (
                    <tr key={row.expense_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-3 font-mono text-sm font-medium text-blue-600 dark:text-blue-400">{row.shipment_number}</td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">{locale === 'ar' ? row.expense_type_name_ar : row.expense_type_name}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{row.category}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{row.vendor_name || '—'}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmt(Number(row.total_amount))} {row.currency}</td>
                      <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">{fmt(Number(row.vat_amount))}</td>
                      <td className="px-3 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{row.invoice_number || '—'}</td>
                      <td className="px-3 py-3">
                        {row.journal_entry_number ? (
                          <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{row.journal_entry_number}</span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(row.posted_at)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${row.is_posted ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${row.is_posted ? 'bg-green-500' : 'bg-amber-500'}`} />
                          {row.is_posted ? (locale === 'ar' ? 'مرحّل' : 'Posted') : (locale === 'ar' ? 'معلق' : 'Pending')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {locale === 'ar' ? `صفحة ${page} من ${pagination.totalPages}` : `Page ${page} of ${pagination.totalPages}`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {locale === 'ar' ? 'السابق' : 'Previous'}
                </button>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {locale === 'ar' ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
