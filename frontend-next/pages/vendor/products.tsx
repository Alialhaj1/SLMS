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
  CubeIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const STATUS_CONFIG: Record<string, { label: string; labelAr: string; color: string }> = {
  draft: { label: 'Draft', labelAr: 'مسودة', color: 'bg-gray-100 text-gray-700' },
  pending_review: { label: 'Pending Review', labelAr: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', labelAr: 'مقبول', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', labelAr: 'مرفوض', color: 'bg-red-100 text-red-800' },
  suspended: { label: 'Suspended', labelAr: 'معلق', color: 'bg-orange-100 text-orange-800' },
};

export default function VendorProducts() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    itemId: '', listingTitle: '', listingTitleAr: '',
    listingDescription: '', listingDescriptionAr: '',
    price: '', compareAtPrice: '', stockSource: 'warehouse',
    manualStock: '0', marketplaceCategoryId: '',
  });

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const res = await vendorApi.getListings(params);
      setListings(res?.data || res?.listings || []);
      setTotal(res?.pagination?.total || 0);
    } catch (err: any) {
      if (isVendorAccessError(err)) {
        setVendorError(getVendorErrorMessage(err, isAr));
      } else {
        showToast(isAr ? 'فشل تحميل المنتجات' : 'Failed to load listings', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, isAr, showToast]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleCreate = async () => {
    try {
      setCreating(true);
      await vendorApi.createListing({
        itemId: parseInt(form.itemId),
        listingTitle: form.listingTitle,
        listingTitleAr: form.listingTitleAr,
        listingDescription: form.listingDescription,
        listingDescriptionAr: form.listingDescriptionAr,
        price: parseFloat(form.price),
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        stockSource: form.stockSource,
        manualStock: form.stockSource === 'manual' ? parseInt(form.manualStock) : null,
        marketplaceCategoryId: form.marketplaceCategoryId ? parseInt(form.marketplaceCategoryId) : null,
      });
      showToast(isAr ? 'تم إنشاء المنتج بنجاح' : 'Listing created successfully', 'success');
      setShowCreateModal(false);
      setForm({ itemId: '', listingTitle: '', listingTitleAr: '', listingDescription: '', listingDescriptionAr: '', price: '', compareAtPrice: '', stockSource: 'warehouse', manualStock: '0', marketplaceCategoryId: '' });
      fetchListings();
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل إنشاء المنتج' : 'Failed to create listing'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    try {
      await vendorApi.deleteListing(showDeleteModal.id);
      showToast(isAr ? 'تم حذف المنتج' : 'Listing deleted', 'success');
      setShowDeleteModal(null);
      fetchListings();
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل حذف المنتج' : 'Failed to delete'), 'error');
    }
  };

  const handleTogglePublish = async (listing: any) => {
    try {
      await vendorApi.togglePublish(listing.id, !listing.is_published);
      showToast(isAr ? 'تم التحديث' : 'Updated', 'success');
      fetchListings();
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل التحديث' : 'Failed to update'), 'error');
    }
  };

  const statusFilters = ['all', 'draft', 'pending_review', 'approved', 'rejected', 'suspended'];

  const columns = [
    {
      key: 'listing_title',
      label: isAr ? 'المنتج' : 'Listing',
      render: (row: any) => (
        <div>
          <p className="font-medium">{isAr ? (row.listing_title_ar || row.listing_title) : row.listing_title}</p>
          <p className="text-xs text-gray-400 font-mono">/{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'price',
      label: isAr ? 'السعر' : 'Price',
      render: (row: any) => (
        <div>
          <span className="font-mono font-bold">{parseFloat(row.price || 0).toLocaleString()}</span>
          {row.compare_at_price && (
            <span className="text-xs text-gray-400 line-through ms-2">{parseFloat(row.compare_at_price).toLocaleString()}</span>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      label: isAr ? 'المخزون' : 'Stock',
      render: (row: any) => {
        const stock = row.stock_source === 'manual' ? row.manual_stock : row.available_stock;
        const s = parseFloat(stock || 0);
        return (
          <span className={`font-mono ${s <= 0 ? 'text-red-600' : s < 10 ? 'text-orange-600' : 'text-green-600'}`}>
            {s} {row.stock_source === 'manual' && <span className="text-xs text-gray-400">(M)</span>}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: isAr ? 'الحالة' : 'Status',
      render: (row: any) => {
        const cfg = STATUS_CONFIG[row.status] || { label: row.status, labelAr: row.status, color: 'bg-gray-100' };
        return (
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
              {isAr ? cfg.labelAr : cfg.label}
            </span>
            {row.is_published && <span className="text-xs text-green-500">● {isAr ? 'منشور' : 'Published'}</span>}
          </div>
        );
      },
    },
    {
      key: 'stats',
      label: isAr ? 'المشاهدات / الطلبات' : 'Views / Orders',
      render: (row: any) => (
        <span className="text-sm text-gray-500">
          👁 {row.view_count || 0} · 🛍 {row.order_count || 0}
        </span>
      ),
    },
    {
      key: 'actions',
      label: isAr ? 'إجراءات' : 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-1">
          {row.status === 'approved' && (
            <button onClick={() => handleTogglePublish(row)}
              className={`p-1.5 rounded-lg hover:bg-gray-100 ${row.is_published ? 'text-green-600' : 'text-gray-400'}`}
              title={row.is_published ? (isAr ? 'إلغاء النشر' : 'Unpublish') : (isAr ? 'نشر' : 'Publish')}>
              <CheckCircleIcon className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setShowDeleteModal(row)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title={isAr ? 'حذف' : 'Delete'}>
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'منتجاتي — البائع' : 'My Listings — Vendor'}</title></Head>
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
        title="Manage Listings"
        title_ar="إدارة المنتجات"
        description="View, create and manage your marketplace listings"
        description_ar="عرض وإنشاء وإدارة منتجاتك المعروضة في السوق"
        icon={CubeIcon}
        breadcrumbs={[
          { label: 'Vendor', label_ar: 'البائع', href: '/vendor/dashboard' },
          { label: 'Listings', label_ar: 'المنتجات' },
        ]}
        actions={[
          {
            id: 'new-listing',
            label: 'New Listing',
            label_ar: 'منتج جديد',
            icon: PlusIcon,
            onClick: () => setShowCreateModal(true),
            variant: 'primary',
          },
        ]}
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={isAr ? 'بحث...' : 'Search...'}
            className="px-3 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500" />
          <div className="flex gap-1 flex-wrap">
            {statusFilters.map((f) => (
              <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${statusFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f === 'all' ? (isAr ? 'الكل' : 'All') :
                  (isAr ? (STATUS_CONFIG[f]?.labelAr || f) : (STATUS_CONFIG[f]?.label || f))}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <EnhancedTable
          columns={columns}
          data={listings}
          loading={loading}
          emptyMessage={isAr ? 'لا توجد منتجات' : 'No listings found'}
          pagination={{ page, total, pageSize: 20 }}
          onPaginationChange={(p) => setPage(p.page)}
        />
      </div>

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 m-4">
            <h3 className="text-lg font-semibold mb-4">{isAr ? 'إنشاء منتج جديد' : 'Create New Listing'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'رقم المنتج (Item ID)' : 'Item ID'} *</label>
                <input type="number" value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'العنوان (EN)' : 'Title (EN)'} *</label>
                  <input type="text" value={form.listingTitle} onChange={(e) => setForm({ ...form, listingTitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'العنوان (AR)' : 'Title (AR)'}</label>
                  <input type="text" value={form.listingTitleAr} onChange={(e) => setForm({ ...form, listingTitleAr: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" dir="rtl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'الوصف (EN)' : 'Description (EN)'}</label>
                <textarea value={form.listingDescription} onChange={(e) => setForm({ ...form, listingDescription: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'السعر' : 'Price'} *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'سعر المقارنة' : 'Compare Price'}</label>
                  <input type="number" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" step="0.01" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'مصدر المخزون' : 'Stock Source'}</label>
                <select value={form.stockSource} onChange={(e) => setForm({ ...form, stockSource: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="warehouse">{isAr ? 'المستودع' : 'Warehouse'}</option>
                  <option value="manual">{isAr ? 'يدوي' : 'Manual'}</option>
                </select>
              </div>
              {form.stockSource === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? 'المخزون اليدوي' : 'Manual Stock'}</label>
                  <input type="number" value={form.manualStock} onChange={(e) => setForm({ ...form, manualStock: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{isAr ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleCreate} disabled={creating || !form.itemId || !form.listingTitle || !form.price}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {creating ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'إنشاء' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 m-4">
            <h3 className="text-lg font-semibold text-red-600 mb-2">{isAr ? 'حذف المنتج' : 'Delete Listing'}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {isAr ? 'هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع.' : 'Are you sure you want to delete this listing? This cannot be undone.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{isAr ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">{isAr ? 'حذف' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </MainLayout>
  );
}
