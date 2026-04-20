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
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface Review {
  id: number;
  customer_name: string;
  customer_email: string;
  product_name: string;
  product_name_ar: string;
  product_image_url: string | null;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  is_approved: boolean | null;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const qp = new URLSearchParams({ page: String(currentPage), limit: String(pageSize) });
      if (statusFilter !== 'all') qp.set('status', statusFilter);
      if (ratingFilter > 0) qp.set('rating', String(ratingFilter));
      if (searchQuery) qp.set('search', searchQuery);
      const res = await apiClient.get<any>(`/api/ecommerce/reviews?${qp}`);
      setReviews(res?.data || []);
      setTotalItems(res?.pagination?.totalItems || 0);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, ratingFilter, searchQuery]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleApprove = async (id: number) => {
    try {
      setActionLoading(id);
      await apiClient.request(`/api/ecommerce/reviews/${id}/approve`, { method: 'PATCH' });
      showToast('success', isAr ? 'تمت الموافقة على التقييم' : 'Review approved');
      fetchReviews();
    } catch {
      showToast('error', isAr ? 'فشلت العملية' : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setActionLoading(id);
      await apiClient.request(`/api/ecommerce/reviews/${id}/reject`, { method: 'PATCH' });
      showToast('success', isAr ? 'تم رفض التقييم' : 'Review rejected');
      fetchReviews();
    } catch {
      showToast('error', isAr ? 'فشلت العملية' : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  const stats = [
    { label: isAr ? 'إجمالي التقييمات' : 'Total Reviews', value: totalItems, icon: ChatBubbleLeftRightIcon, gradient: 'from-blue-500 to-indigo-500', bgGlow: 'bg-blue-500/10' },
    {
      label: isAr ? 'متوسط التقييم' : 'Average Rating',
      value: avgRating.toFixed(1),
      icon: StarIcon,
      gradient: 'from-amber-500 to-yellow-500',
      bgGlow: 'bg-amber-500/10',
      suffix: '★',
    },
    { label: isAr ? 'بانتظار المراجعة' : 'Pending Review', value: reviews.filter(r => r.is_approved === null).length, icon: ExclamationTriangleIcon, gradient: 'from-orange-500 to-red-500', bgGlow: 'bg-orange-500/10' },
    { label: isAr ? 'مميزة' : 'Featured', value: reviews.filter(r => r.is_featured).length, icon: StarIcon, gradient: 'from-purple-500 to-indigo-500', bgGlow: 'bg-purple-500/10' },
  ];

  // Rating distribution
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rev => rev.rating === r).length,
    pct: reviews.length > 0 ? (reviews.filter(rev => rev.rating === r).length / reviews.length) * 100 : 0,
  }));

  const RatingStars = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => (
    <div className="flex">
      {[1,2,3,4,5].map(star => (
        <StarSolidIcon
          key={star}
          className={`${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} ${star <= rating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
        />
      ))}
    </div>
  );

  const columns = [
    {
      key: 'product',
      label: 'Product',
      label_ar: 'المنتج',
      render: (_: any, row: Review) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700 shrink-0">
            {row.product_image_url ? <img src={row.product_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-gray-400 text-xs">N/A</div>}
          </div>
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-[150px]">{isAr ? row.product_name_ar : row.product_name}</span>
        </div>
      ),
    },
    {
      key: 'customer_name',
      label: 'Customer',
      label_ar: 'العميل',
      render: (_: any, row: Review) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{row.customer_name}</p>
          {row.is_verified_purchase && (
            <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="h-3 w-3" /> {isAr ? 'شراء مؤكد' : 'Verified'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      label_ar: 'التقييم',
      sortable: true,
      render: (val: number) => <RatingStars rating={val} />,
    },
    {
      key: 'comment',
      label: 'Comment',
      label_ar: 'التعليق',
      render: (_: any, row: Review) => (
        <div className="max-w-[250px]">
          {row.title && <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{row.title}</p>}
          <p className="text-xs text-gray-500 line-clamp-2">{row.comment}</p>
        </div>
      ),
    },
    {
      key: 'is_approved',
      label: 'Status',
      label_ar: 'الحالة',
      render: (val: boolean | null, row: Review) => (
        <div className="flex flex-col gap-1">
          {val === true ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <CheckCircleIcon className="h-3 w-3" /> {isAr ? 'موافق' : 'Approved'}
            </span>
          ) : val === false ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <XCircleIcon className="h-3 w-3" /> {isAr ? 'مرفوض' : 'Rejected'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <ExclamationTriangleIcon className="h-3 w-3" /> {isAr ? 'معلق' : 'Pending'}
            </span>
          )}
          {row.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              <StarIcon className="h-3 w-3" /> {isAr ? 'مميز' : 'Featured'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'helpful_count',
      label: 'Helpful',
      label_ar: 'مفيد',
      align: 'center' as const,
      render: (val: number) => (
        <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <HandThumbUpIcon className="h-4 w-4" /> {val || 0}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      label_ar: 'التاريخ',
      sortable: true,
      render: (val: string) => <span className="text-sm text-gray-500">{new Date(val).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</span>,
    },
  ];

  const rowActions = [
    { id: 'view', label: isAr ? 'عرض' : 'View', icon: EyeIcon, onClick: (row: Review) => setSelectedReview(row) },
    { id: 'approve', label: isAr ? 'موافقة' : 'Approve', icon: CheckCircleIcon, onClick: (row: Review) => handleApprove(row.id) },
    { id: 'reject', label: isAr ? 'رفض' : 'Reject', icon: XCircleIcon, onClick: (row: Review) => handleReject(row.id), variant: 'danger' as const },
  ];

  const statusFilters = [
    { key: 'all', label: isAr ? 'الكل' : 'All' },
    { key: 'pending', label: isAr ? 'معلق' : 'Pending' },
    { key: 'approved', label: isAr ? 'موافق' : 'Approved' },
    { key: 'rejected', label: isAr ? 'مرفوض' : 'Rejected' },
    { key: 'flagged', label: isAr ? 'مبلغ عنه' : 'Flagged' },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'التقييمات والمراجعات' : 'Reviews & Ratings'} - SLMS</title></Head>
      <div className="space-y-6 p-1">
        <PageHeader
          title="Reviews & Ratings"
          title_ar="التقييمات والمراجعات"
          description="Moderate and manage customer product reviews"
          description_ar="إدارة ومراجعة تقييمات العملاء للمنتجات"
          icon={StarIcon}
          breadcrumbs={[
            { label: 'E-Commerce', label_ar: 'المتجر الإلكتروني', href: '/ecommerce/settings' },
            { label: 'Reviews', label_ar: 'التقييمات' },
          ]}
        />

        {/* Stats + Rating Distribution */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat, i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
                <div className={`absolute inset-0 ${stat.bgGlow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="relative">
                  <div className={`mb-3 inline-flex rounded-2xl bg-gradient-to-br ${stat.gradient} p-2.5 shadow-lg`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}{(stat as any).suffix || ''}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{isAr ? 'توزيع التقييمات' : 'Rating Distribution'}</h4>
            <div className="space-y-2">
              {ratingDist.map(rd => (
                <div key={rd.rating} className="flex items-center gap-3">
                  <span className="w-3 text-sm font-bold text-gray-600 dark:text-gray-400">{rd.rating}</span>
                  <StarSolidIcon className="h-4 w-4 text-amber-400" />
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700" style={{ width: `${rd.pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-medium text-gray-500">{rd.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(f => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  statusFilter === f.key
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[0,1,2,3,4,5].map(star => (
                <button
                  key={star}
                  onClick={() => { setRatingFilter(star); setCurrentPage(1); }}
                  title={star === 0 ? (isAr ? 'الكل' : 'All') : `${star} ${isAr ? 'نجوم' : 'stars'}`}
                  className={`rounded-lg p-1.5 transition-all ${ratingFilter === star ? 'bg-amber-100 dark:bg-amber-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {star === 0 ? (
                    <span className="text-xs font-bold text-gray-500 px-1">{isAr ? 'الكل' : 'All'}</span>
                  ) : (
                    <StarSolidIcon className={`h-4 w-4 ${ratingFilter === star ? 'text-amber-500' : 'text-gray-300 dark:text-gray-500'}`} />
                  )}
                </button>
              ))}
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={isAr ? 'بحث...' : 'Search reviews...'}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white w-64"
              />
            </div>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <EnhancedTable
            data={reviews}
            columns={columns}
            loading={loading}
            rowKey="id"
            actions={rowActions}
            emptyMessage={isAr ? 'لا توجد تقييمات' : 'No reviews found'}
            pagination={{ page: currentPage, pageSize, total: totalItems }}
            onPaginationChange={(p) => { setCurrentPage(p.page); if (p.pageSize !== pageSize) setPageSize(p.pageSize); }}
          />
        </div>

        {/* Review Detail Modal */}
        {selectedReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 animate-in zoom-in-95 duration-300">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedReview.title || (isAr ? 'تقييم المنتج' : 'Product Review')}</h3>
                  <p className="text-sm text-gray-500">{isAr ? selectedReview.product_name_ar : selectedReview.product_name}</p>
                </div>
                <button onClick={() => setSelectedReview(null)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <RatingStars rating={selectedReview.rating} size="lg" />
                <span className="text-xl font-bold text-amber-600">{selectedReview.rating}/5</span>
              </div>

              <div className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedReview.comment}</p>
              </div>

              <div className="mb-4 flex items-center gap-4 text-sm text-gray-500">
                <span className="font-medium text-gray-700 dark:text-gray-300">{selectedReview.customer_name}</span>
                {selectedReview.is_verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircleIcon className="h-4 w-4" /> {isAr ? 'شراء مؤكد' : 'Verified Purchase'}
                  </span>
                )}
                <span>{new Date(selectedReview.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</span>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { handleReject(selectedReview.id); setSelectedReview(null); }}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-all dark:border-red-800 dark:text-red-400"
                >
                  <span className="flex items-center gap-1.5"><XCircleIcon className="h-4 w-4" /> {isAr ? 'رفض' : 'Reject'}</span>
                </button>
                <button
                  onClick={() => { handleApprove(selectedReview.id); setSelectedReview(null); }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/25"
                >
                  <span className="flex items-center gap-1.5"><CheckCircleIcon className="h-4 w-4" /> {isAr ? 'موافقة' : 'Approve'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
