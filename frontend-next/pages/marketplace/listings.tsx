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
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  NoSymbolIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  TagIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

interface Listing {
  id: number;
  title: string;
  title_ar: string;
  slug: string;
  vendor_id: number;
  vendor_name: string;
  marketplace_price: number;
  compare_at_price: number | null;
  moderation_status: string;
  is_published: boolean;
  is_active: boolean;
  view_count: number;
  created_at: string;
}

const moderationConfig: Record<string, { bg: string; text: string; label: string; labelAr: string; icon: any }> = {
  pending_review: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', label: 'Pending Review', labelAr: 'قيد المراجعة', icon: ClockIcon },
  approved: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', label: 'Approved', labelAr: 'مقبول', icon: CheckCircleIcon },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', label: 'Rejected', labelAr: 'مرفوض', icon: XCircleIcon },
  suspended: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', label: 'Suspended', labelAr: 'معلق', icon: NoSymbolIcon },
};

export default function ListingsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [moderateModal, setModerateModal] = useState<{ listing: Listing; action: string } | null>(null);
  const [moderateReason, setModerateReason] = useState('');

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.request<any>(`/api/marketplace/admin/listings?${params.toString()}`);
      setListings(res?.listings || []);
      setTotal(res?.total || 0);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleModerate = async () => {
    if (!moderateModal) return;
    try {
      await apiClient.request(`/api/marketplace/admin/listings/${moderateModal.listing.id}/moderate`, {
        method: 'PUT',
        body: JSON.stringify({ action: moderateModal.action, reason: moderateReason }),
      });
      showToast(isAr ? 'تم تحديث حالة المنتج' : 'Listing moderated', 'success');
      setModerateModal(null);
      setModerateReason('');
      fetchListings();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const statCards = [
    { label: isAr ? 'إجمالي المنتجات' : 'Total Listings', value: total, icon: CubeIcon, gradient: 'from-indigo-500 to-purple-500' },
    { label: isAr ? 'مقبول' : 'Approved', value: listings.filter(l => l.moderation_status === 'approved').length, icon: CheckCircleIcon, gradient: 'from-emerald-500 to-teal-500' },
    { label: isAr ? 'قيد المراجعة' : 'Pending Review', value: listings.filter(l => l.moderation_status === 'pending_review').length, icon: ClockIcon, gradient: 'from-amber-500 to-orange-500' },
    { label: isAr ? 'مرفوض' : 'Rejected', value: listings.filter(l => l.moderation_status === 'rejected').length, icon: XCircleIcon, gradient: 'from-rose-500 to-pink-500' },
  ];

  const columns = [
    {
      key: 'title', label: 'Listing', label_ar: 'المنتج', sortable: true,
      render: (l: Listing) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{isAr ? l.title_ar : l.title}</div>
          <div className="text-xs text-gray-400">/{l.slug}</div>
        </div>
      ),
    },
    {
      key: 'vendor_name', label: 'Vendor', label_ar: 'البائع',
      render: (l: Listing) => (
        <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
          <BuildingStorefrontIcon className="h-4 w-4" /> {l.vendor_name}
        </span>
      ),
    },
    {
      key: 'marketplace_price', label: 'Price', label_ar: 'السعر', sortable: true,
      render: (l: Listing) => (
        <div>
          <span className="font-mono text-sm font-medium">${Number(l.marketplace_price || 0).toFixed(2)}</span>
          {l.compare_at_price && (
            <span className="ml-2 text-xs text-gray-400 line-through">${Number(l.compare_at_price || 0).toFixed(2)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'moderation_status', label: 'Status', label_ar: 'الحالة',
      render: (l: Listing) => {
        const s = moderationConfig[l.moderation_status] || moderationConfig.pending_review;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
            <s.icon className="h-3.5 w-3.5" />
            {isAr ? s.labelAr : s.label}
          </span>
        );
      },
    },
    {
      key: 'view_count', label: 'Views', label_ar: 'المشاهدات', sortable: true,
      render: (l: Listing) => <span className="text-sm text-gray-500">{l.view_count}</span>,
    },
    {
      key: 'created_at', label: 'Created', label_ar: 'تاريخ الإنشاء', sortable: true,
      render: (l: Listing) => <span className="text-sm text-gray-500">{new Date(l.created_at).toLocaleDateString()}</span>,
    },
  ];

  const tableActions = [
    { id: 'approve', label: isAr ? 'قبول' : 'Approve', icon: CheckCircleIcon, onClick: (l: Listing) => setModerateModal({ listing: l, action: 'approve' }), condition: (l: Listing) => l.moderation_status === 'pending_review' },
    { id: 'reject', label: isAr ? 'رفض' : 'Reject', icon: XCircleIcon, variant: 'danger' as const, onClick: (l: Listing) => setModerateModal({ listing: l, action: 'reject' }), condition: (l: Listing) => l.moderation_status === 'pending_review' },
    { id: 'suspend', label: isAr ? 'تعليق' : 'Suspend', icon: NoSymbolIcon, onClick: (l: Listing) => setModerateModal({ listing: l, action: 'suspend' }), condition: (l: Listing) => l.moderation_status === 'approved' },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'إدارة المنتجات' : 'Listing Management'}</title></Head>
      <PageHeader
        title="Listing Moderation"
        title_ar="مراجعة المنتجات"
        description="Review and moderate marketplace product listings."
        description_ar="مراجعة وإدارة منتجات السوق."
        icon={CubeIcon}
        breadcrumbs={[
          { label: 'Marketplace', label_ar: 'السوق', href: '/marketplace/dashboard' },
          { label: 'Listings', label_ar: 'المنتجات' },
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
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={isAr ? 'بحث...' : 'Search listings...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        {['', 'pending_review', 'approved', 'rejected', 'suspended'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === s
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-indigo-500'
            }`}>
            {s === '' ? (isAr ? 'الكل' : 'All') : (moderationConfig[s]?.[isAr ? 'labelAr' : 'label'] || s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <EnhancedTable
          data={listings}
          columns={columns}
          actions={tableActions}
          loading={loading}
          pagination={{ page, total, pageSize: 20 }}
          onPaginationChange={(p) => setPage(p.page)}
          emptyMessage={isAr ? 'لا يوجد منتجات' : 'No listings found'}
        />
      </div>

      {/* Moderation Modal */}
      {moderateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {moderateModal.action === 'approve'
                ? (isAr ? 'قبول المنتج' : 'Approve Listing')
                : moderateModal.action === 'reject'
                ? (isAr ? 'رفض المنتج' : 'Reject Listing')
                : (isAr ? 'تعليق المنتج' : 'Suspend Listing')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isAr ? moderateModal.listing.title_ar : moderateModal.listing.title}
            </p>
            {moderateModal.action !== 'approve' && (
              <textarea
                value={moderateReason} onChange={e => setModerateReason(e.target.value)}
                placeholder={isAr ? 'السبب' : 'Reason'}
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-3 mb-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setModerateModal(null); setModerateReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleModerate}
                className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${
                  moderateModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  moderateModal.action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-amber-600 hover:bg-amber-700'
                }`}>
                {isAr ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
