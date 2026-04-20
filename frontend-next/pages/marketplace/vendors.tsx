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
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  NoSymbolIcon,
  MagnifyingGlassIcon,
  StarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface Vendor {
  id: number;
  vendor_name: string;
  vendor_name_ar: string;
  slug: string;
  status: string;
  commission_rate: number | null;
  total_orders: number;
  total_revenue: number;
  total_listings: number;
  is_featured: boolean;
  is_verified: boolean;
  created_at: string;
  available_balance?: number;
  pending_balance?: number;
}

const statusConfig: Record<string, { bg: string; text: string; label: string; labelAr: string; icon: any }> = {
  active: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', label: 'Active', labelAr: 'نشط', icon: CheckCircleIcon },
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', label: 'Pending', labelAr: 'معلق', icon: ClockIcon },
  suspended: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', label: 'Suspended', labelAr: 'معلق', icon: NoSymbolIcon },
  banned: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', label: 'Banned', labelAr: 'محظور', icon: XCircleIcon },
};

export default function VendorsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionModal, setActionModal] = useState<{ vendor: Vendor; action: string } | null>(null);
  const [reason, setReason] = useState('');

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.request<any>(`/api/marketplace/admin/vendors?${params.toString()}`);
      setVendors(res?.vendors || []);
      setTotal(res?.total || 0);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleStatusChange = async () => {
    if (!actionModal) return;
    try {
      await apiClient.request(`/api/marketplace/admin/vendors/${actionModal.vendor.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: actionModal.action, reason }),
      });
      showToast(isAr ? 'تم تحديث حالة البائع' : 'Vendor status updated', 'success');
      setActionModal(null);
      setReason('');
      fetchVendors();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const statCards = [
    { label: isAr ? 'إجمالي البائعين' : 'Total Vendors', value: total, icon: BuildingStorefrontIcon, gradient: 'from-indigo-500 to-purple-500' },
    { label: isAr ? 'نشط' : 'Active', value: vendors.filter(v => v.status === 'active').length, icon: CheckCircleIcon, gradient: 'from-emerald-500 to-teal-500' },
    { label: isAr ? 'معلق' : 'Pending', value: vendors.filter(v => v.status === 'pending').length, icon: ClockIcon, gradient: 'from-amber-500 to-orange-500' },
    { label: isAr ? 'مميز' : 'Featured', value: vendors.filter(v => v.is_featured).length, icon: StarIcon, gradient: 'from-rose-500 to-pink-500' },
  ];

  const columns = [
    {
      key: 'vendor_name', label: 'Vendor', label_ar: 'البائع', sortable: true,
      render: (v: Vendor) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{isAr ? v.vendor_name_ar : v.vendor_name}</div>
          <div className="text-xs text-gray-400">/{v.slug}</div>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status', label_ar: 'الحالة',
      render: (v: Vendor) => {
        const s = statusConfig[v.status] || statusConfig.pending;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
            <s.icon className="h-3.5 w-3.5" />
            {isAr ? s.labelAr : s.label}
          </span>
        );
      },
    },
    {
      key: 'total_orders', label: 'Orders', label_ar: 'الطلبات', sortable: true,
      render: (v: Vendor) => <span className="font-mono text-sm">{v.total_orders}</span>,
    },
    {
      key: 'total_revenue', label: 'Revenue', label_ar: 'الإيرادات', sortable: true,
      render: (v: Vendor) => <span className="font-mono text-sm">${Number(v.total_revenue || 0).toLocaleString()}</span>,
    },
    {
      key: 'commission_rate', label: 'Commission', label_ar: 'العمولة',
      render: (v: Vendor) => <span className="text-sm">{v.commission_rate ? `${v.commission_rate}%` : 'Default'}</span>,
    },
    {
      key: 'created_at', label: 'Joined', label_ar: 'الانضمام', sortable: true,
      render: (v: Vendor) => <span className="text-sm text-gray-500">{new Date(v.created_at).toLocaleDateString()}</span>,
    },
  ];

  const tableActions = [
    { id: 'approve', label: isAr ? 'تفعيل' : 'Approve', icon: CheckCircleIcon, onClick: (v: Vendor) => setActionModal({ vendor: v, action: 'active' }), condition: (v: Vendor) => v.status === 'pending' },
    { id: 'suspend', label: isAr ? 'تعليق' : 'Suspend', icon: NoSymbolIcon, onClick: (v: Vendor) => setActionModal({ vendor: v, action: 'suspended' }), condition: (v: Vendor) => v.status === 'active' },
    { id: 'reactivate', label: isAr ? 'إعادة تفعيل' : 'Reactivate', icon: CheckCircleIcon, onClick: (v: Vendor) => setActionModal({ vendor: v, action: 'active' }), condition: (v: Vendor) => v.status === 'suspended' },
    { id: 'ban', label: isAr ? 'حظر' : 'Ban', icon: XCircleIcon, variant: 'danger' as const, onClick: (v: Vendor) => setActionModal({ vendor: v, action: 'banned' }), condition: (v: Vendor) => v.status === 'suspended' },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'إدارة البائعين' : 'Vendor Management'}</title></Head>
      <PageHeader
        title="Vendor Management"
        title_ar="إدارة البائعين"
        description="Manage marketplace vendors, approvals, and commissions."
        description_ar="إدارة البائعين في السوق، الموافقات، والعمولات."
        icon={BuildingStorefrontIcon}
        breadcrumbs={[
          { label: 'Marketplace', label_ar: 'السوق', href: '/marketplace/dashboard' },
          { label: 'Vendors', label_ar: 'البائعين' },
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
            placeholder={isAr ? 'بحث عن البائعين...' : 'Search vendors...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        {['', 'active', 'pending', 'suspended', 'banned'].map(s => (
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
          data={vendors}
          columns={columns}
          actions={tableActions}
          loading={loading}
          pagination={{ page, total, pageSize: 20 }}
          onPaginationChange={(p) => setPage(p.page)}
          emptyMessage={isAr ? 'لا يوجد بائعين' : 'No vendors found'}
        />
      </div>

      {/* Status Change Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {isAr ? 'تغيير حالة البائع' : 'Change Vendor Status'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isAr
                ? `${actionModal.action === 'active' ? 'تفعيل' : actionModal.action === 'suspended' ? 'تعليق' : 'حظر'} ${actionModal.vendor.vendor_name_ar}`
                : `${actionModal.action === 'active' ? 'Approve' : actionModal.action === 'suspended' ? 'Suspend' : 'Ban'} ${actionModal.vendor.vendor_name}`}
            </p>
            <textarea
              value={reason} onChange={e => setReason(e.target.value)}
              placeholder={isAr ? 'السبب (اختياري)' : 'Reason (optional)'}
              rows={3}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-3 mb-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionModal(null); setReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleStatusChange}
                className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${
                  actionModal.action === 'active' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  actionModal.action === 'suspended' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-red-600 hover:bg-red-700'
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
