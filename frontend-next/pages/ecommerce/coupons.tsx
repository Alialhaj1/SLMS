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
  TicketIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PercentBadgeIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

interface Coupon {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  min_order_amount: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  per_customer_limit: number | null;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  applicable_to: 'all' | 'categories' | 'products';
  created_at: string;
}

const typeConfig: Record<string, { icon: any; color: string; bgColor: string; labelEn: string; labelAr: string }> = {
  percentage: { icon: PercentBadgeIcon, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', labelEn: 'Percentage', labelAr: 'نسبة مئوية' },
  fixed_amount: { icon: CurrencyDollarIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', labelEn: 'Fixed Amount', labelAr: 'مبلغ ثابت' },
  free_shipping: { icon: TagIcon, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20', labelEn: 'Free Shipping', labelAr: 'شحن مجاني' },
};

export default function CouponsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  const defaultCouponForm = {
    code: '',
    name: '',
    name_ar: '',
    type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_shipping',
    value: 10,
    min_order_amount: 0,
    max_discount: 0,
    usage_limit: 0,
    per_customer_limit: 1,
    starts_at: new Date().toISOString().split('T')[0],
    expires_at: '',
    applicable_to: 'all' as const,
  };

  const [newCoupon, setNewCoupon] = useState(defaultCouponForm);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const qp = new URLSearchParams({ page: String(currentPage), limit: String(pageSize) });
      if (statusFilter !== 'all') qp.set('status', statusFilter);
      const res = await apiClient.get<any>(`/api/ecommerce/coupons?${qp}`);
      setCoupons(res?.data || []);
      setTotalItems(res?.pagination?.totalItems || 0);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleCreate = async () => {
    if (!newCoupon.code.trim()) {
      showToast('error', isAr ? 'يرجى إدخال كود القسيمة' : 'Please enter a coupon code');
      return;
    }
    try {
      setCreating(true);
      if (editingCouponId) {
        await apiClient.request(`/api/ecommerce/coupons/${editingCouponId}`, { method: 'PUT', body: JSON.stringify(newCoupon) });
        showToast('success', isAr ? 'تم تحديث القسيمة بنجاح' : 'Coupon updated successfully');
      } else {
        await apiClient.request('/api/ecommerce/coupons', { method: 'POST', body: JSON.stringify(newCoupon) });
        showToast('success', isAr ? 'تم إنشاء القسيمة بنجاح' : 'Coupon created successfully');
      }
      setShowCreateModal(false);
      setEditingCouponId(null);
      setNewCoupon(defaultCouponForm);
      fetchCoupons();
    } catch {
      showToast('error', isAr ? 'فشل إنشاء القسيمة' : 'Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await apiClient.request(`/api/ecommerce/coupons/${deleteId}`, { method: 'DELETE' });
      showToast('success', isAr ? 'تم حذف القسيمة' : 'Coupon deleted');
      setDeleteId(null);
      fetchCoupons();
    } catch {
      showToast('error', isAr ? 'فشل حذف القسيمة' : 'Failed to delete coupon');
    } finally {
      setDeleting(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast('success', isAr ? 'تم نسخ الكود' : 'Code copied');
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    for (let i = 0; i < 8; i++) code += chars[array[i] % chars.length];
    setNewCoupon(prev => ({ ...prev, code }));
  };

  const stats = [
    { label: isAr ? 'إجمالي القسائم' : 'Total Coupons', value: totalItems, icon: TicketIcon, gradient: 'from-indigo-500 to-blue-500', bgGlow: 'bg-indigo-500/10' },
    { label: isAr ? 'نشطة' : 'Active', value: coupons.filter(c => c.is_active).length, icon: CheckCircleIcon, gradient: 'from-emerald-500 to-teal-500', bgGlow: 'bg-emerald-500/10' },
    { label: isAr ? 'منتهية' : 'Expired', value: coupons.filter(c => c.expires_at && new Date(c.expires_at) < new Date()).length, icon: ClockIcon, gradient: 'from-gray-400 to-gray-500', bgGlow: 'bg-gray-400/10' },
    { label: isAr ? 'إجمالي الاستخدام' : 'Total Uses', value: coupons.reduce((sum, c) => sum + c.used_count, 0), icon: UserGroupIcon, gradient: 'from-purple-500 to-pink-500', bgGlow: 'bg-purple-500/10' },
  ];

  const columns = [
    {
      key: 'code',
      label: 'Code',
      label_ar: 'الكود',
      render: (val: string) => (
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-sm font-bold text-gray-800 dark:bg-gray-700 dark:text-gray-200">{val}</span>
          <button onClick={() => copyCode(val)} className="rounded-lg p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all dark:hover:bg-indigo-900/20">
            <ClipboardDocumentIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      label_ar: 'الاسم',
      render: (_: any, row: Coupon) => <span className="font-semibold text-gray-900 dark:text-white">{isAr ? row.name_ar : row.name}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      label_ar: 'النوع',
      render: (_: any, row: Coupon) => {
        const config = typeConfig[row.type] || typeConfig.percentage;
        const TypeIcon = config.icon;
        return (
          <div className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${config.bgColor} ${config.color}`}>
            <TypeIcon className="h-4 w-4" />
            {row.type === 'percentage' ? `${row.value}%` : row.type === 'fixed_amount' ? `${row.value} SAR` : (isAr ? config.labelAr : config.labelEn)}
          </div>
        );
      },
    },
    {
      key: 'used_count',
      label: 'Usage',
      label_ar: 'الاستخدام',
      align: 'center' as const,
      render: (_: any, row: Coupon) => (
        <div className="text-center">
          <span className="font-bold text-gray-700 dark:text-gray-300">{row.used_count}</span>
          {row.usage_limit && (
            <span className="text-gray-400"> / {row.usage_limit}</span>
          )}
          {row.usage_limit && (
            <div className="mt-1.5 h-1.5 w-16 mx-auto overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min((row.used_count / row.usage_limit) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      label_ar: 'الحالة',
      render: (_: any, row: Coupon) => {
        const isExpired = row.expires_at && new Date(row.expires_at) < new Date();
        return isExpired ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            <ClockIcon className="h-3 w-3" /> {isAr ? 'منتهي' : 'Expired'}
          </span>
        ) : row.is_active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircleIcon className="h-3 w-3" /> {isAr ? 'نشط' : 'Active'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <XCircleIcon className="h-3 w-3" /> {isAr ? 'معطل' : 'Disabled'}
          </span>
        );
      },
    },
    {
      key: 'expires_at',
      label: 'Expires',
      label_ar: 'ينتهي',
      render: (val: string) => val ? (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(val).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
        </span>
      ) : <span className="text-xs text-gray-400">{isAr ? 'بدون انتهاء' : 'No expiry'}</span>,
    },
  ];

  const rowActions = [
    { id: 'edit', label: isAr ? 'تعديل' : 'Edit', icon: PencilSquareIcon, onClick: (row: Coupon) => {
      setEditingCouponId(row.id);
      setNewCoupon({
        code: row.code,
        name: row.name || '',
        name_ar: row.name_ar || '',
        type: row.type as any,
        value: row.value,
        min_order_amount: row.min_order_amount || 0,
        max_discount: row.max_discount || 0,
        usage_limit: row.usage_limit || 0,
        per_customer_limit: row.per_customer_limit || 1,
        starts_at: row.starts_at ? row.starts_at.split('T')[0] : '',
        expires_at: row.expires_at ? row.expires_at.split('T')[0] : '',
        applicable_to: 'all',
      });
      setShowCreateModal(true);
    } },
    { id: 'delete', label: isAr ? 'حذف' : 'Delete', icon: TrashIcon, onClick: (row: Coupon) => setDeleteId(row.id), variant: 'danger' as const },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'القسائم والعروض' : 'Coupons & Promotions'} - SLMS</title></Head>
      <div className="space-y-6 p-1">
        <PageHeader
          title="Coupons & Promotions"
          title_ar="القسائم والعروض"
          description="Create and manage discount coupons for your store"
          description_ar="إنشاء وإدارة قسائم الخصم لمتجرك"
          icon={TicketIcon}
          breadcrumbs={[
            { label: 'E-Commerce', label_ar: 'المتجر الإلكتروني', href: '/ecommerce/settings' },
            { label: 'Coupons', label_ar: 'القسائم' },
          ]}
          actions={[
            {
              id: 'add',
              label: 'Create Coupon',
              label_ar: 'إنشاء قسيمة',
              icon: PlusIcon,
              onClick: () => setShowCreateModal(true),
              variant: 'primary',
            },
          ]}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
              <div className={`absolute inset-0 ${stat.bgGlow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={`rounded-2xl bg-gradient-to-br ${stat.gradient} p-3 shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <EnhancedTable
            data={coupons}
            columns={columns}
            loading={loading}
            rowKey="id"
            actions={rowActions}
            emptyMessage={isAr ? 'لا توجد قسائم' : 'No coupons found'}
            pagination={{ page: currentPage, pageSize, total: totalItems }}
            onPaginationChange={(p) => { setCurrentPage(p.page); if (p.pageSize !== pageSize) setPageSize(p.pageSize); }}
          />
        </div>

        {/* Create Coupon Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 animate-in zoom-in-95 duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingCouponId
                  ? (isAr ? 'تعديل القسيمة' : 'Edit Coupon')
                  : (isAr ? 'إنشاء قسيمة جديدة' : 'Create New Coupon')}
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'كود القسيمة' : 'Coupon Code'}</label>
                  <div className="flex gap-2">
                    <input type="text" value={newCoupon.code} onChange={(e) => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER2024" className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-mono uppercase shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    <button onClick={generateCode} className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-all dark:bg-gray-700 dark:text-gray-300">
                      {isAr ? 'توليد' : 'Generate'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'الاسم (EN)' : 'Name (EN)'}</label>
                    <input type="text" value={newCoupon.name} onChange={(e) => setNewCoupon(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'الاسم (AR)' : 'Name (AR)'}</label>
                    <input type="text" dir="rtl" value={newCoupon.name_ar} onChange={(e) => setNewCoupon(p => ({ ...p, name_ar: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'نوع الخصم' : 'Discount Type'}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['percentage', 'fixed_amount', 'free_shipping'] as const).map(t => {
                      const config = typeConfig[t];
                      const TypeIcon = config.icon;
                      return (
                        <button key={t} onClick={() => setNewCoupon(p => ({ ...p, type: t }))} className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all duration-200 ${newCoupon.type === t ? `border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md dark:bg-indigo-900/20 dark:text-indigo-300` : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'}`}>
                          <TypeIcon className="h-5 w-5" />
                          {isAr ? config.labelAr : config.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {newCoupon.type !== 'free_shipping' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      {newCoupon.type === 'percentage' ? (isAr ? 'نسبة الخصم (%)' : 'Discount (%)') : (isAr ? 'مبلغ الخصم' : 'Discount Amount')}
                    </label>
                    <input type="number" value={newCoupon.value} onChange={(e) => setNewCoupon(p => ({ ...p, value: Number(e.target.value) }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'تاريخ البدء' : 'Start Date'}</label>
                    <input type="date" value={newCoupon.starts_at} onChange={(e) => setNewCoupon(p => ({ ...p, starts_at: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
                    <input type="date" value={newCoupon.expires_at} onChange={(e) => setNewCoupon(p => ({ ...p, expires_at: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'حد الاستخدام الكلي' : 'Total Usage Limit'}</label>
                    <input type="number" value={newCoupon.usage_limit} onChange={(e) => setNewCoupon(p => ({ ...p, usage_limit: Number(e.target.value) }))} placeholder="0 = unlimited" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'لكل عميل' : 'Per Customer'}</label>
                    <input type="number" value={newCoupon.per_customer_limit} onChange={(e) => setNewCoupon(p => ({ ...p, per_customer_limit: Number(e.target.value) }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => { setShowCreateModal(false); setEditingCouponId(null); setNewCoupon(defaultCouponForm); }} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={handleCreate} disabled={creating} className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50">
                  {creating ? <ArrowPathIcon className="h-4 w-4 animate-spin mx-4" /> : editingCouponId ? (isAr ? 'تحديث القسيمة' : 'Update Coupon') : (isAr ? 'إنشاء القسيمة' : 'Create Coupon')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 animate-in zoom-in-95 duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isAr ? 'حذف القسيمة' : 'Delete Coupon'}</h3>
              <p className="mt-2 text-sm text-gray-500">{isAr ? 'هل أنت متأكد من حذف هذه القسيمة؟' : 'Are you sure you want to delete this coupon?'}</p>
              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => setDeleteId(null)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/25">
                  {deleting ? <ArrowPathIcon className="h-4 w-4 animate-spin mx-4" /> : (isAr ? 'حذف' : 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
