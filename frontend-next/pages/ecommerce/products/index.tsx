import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import EnhancedTable from '../../../components/ui/EnhancedTable';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../contexts/LocaleContext';
import { useToast } from '../../../hooks/useToast';
import apiClient from '../../../lib/apiClient';
import {
  PlusIcon,
  CubeIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  PhotoIcon,
  TagIcon,
  ArchiveBoxIcon,
  CheckBadgeIcon,
  XCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

interface Product {
  id: number;
  name: string;
  name_ar: string;
  sku: string;
  slug: string;
  category_name: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  image_url: string | null;
  created_at: string;
  total_sales: number;
  avg_rating: number;
  review_count: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  featured: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  lowStock: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const qp = new URLSearchParams({ page: String(currentPage), limit: String(pageSize) });
      if (searchQuery) qp.set('search', searchQuery);
      if (statusFilter !== 'all') qp.set('status', statusFilter);
      const res = await apiClient.get<any>(`/api/ecommerce/products?${qp}`);
      setProducts(res?.data || []);
      setTotalItems(res?.pagination?.totalItems || 0);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, statusFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await apiClient.request(`/api/ecommerce/products/${deleteId}`, { method: 'DELETE' });
      showToast('success', isAr ? 'تم حذف المنتج' : 'Product deleted');
      setDeleteId(null);
      fetchProducts();
    } catch {
      showToast('error', isAr ? 'فشل حذف المنتج' : 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const stats = [
    {
      label: isAr ? 'إجمالي المنتجات' : 'Total Products',
      value: totalItems,
      icon: CubeIcon,
      gradient: 'from-blue-500 to-cyan-500',
      bgGlow: 'bg-blue-500/10',
    },
    {
      label: isAr ? 'منتجات نشطة' : 'Active Products',
      value: products.filter(p => p.is_active).length,
      icon: CheckBadgeIcon,
      gradient: 'from-emerald-500 to-teal-500',
      bgGlow: 'bg-emerald-500/10',
    },
    {
      label: isAr ? 'منتجات مميزة' : 'Featured',
      value: products.filter(p => p.is_featured).length,
      icon: TagIcon,
      gradient: 'from-amber-500 to-orange-500',
      bgGlow: 'bg-amber-500/10',
    },
    {
      label: isAr ? 'مخزون منخفض' : 'Low Stock',
      value: products.filter(p => p.stock_quantity < 10 && p.stock_quantity > 0).length,
      icon: ArchiveBoxIcon,
      gradient: 'from-red-500 to-rose-500',
      bgGlow: 'bg-red-500/10',
    },
  ];

  const columns = [
    {
      key: 'image',
      label: 'Image',
      label_ar: 'صورة',
      width: 70,
      render: (_: any, row: Product) => (
        <div className="h-12 w-12 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {row.image_url ? (
            <img src={row.image_url} alt={row.name} className="h-full w-full object-cover transition-transform duration-300 hover:scale-110" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PhotoIcon className="h-6 w-6 text-gray-300" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Product Name',
      label_ar: 'اسم المنتج',
      sortable: true,
      render: (_: any, row: Product) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{isAr ? row.name_ar : row.name}</p>
          <p className="text-xs text-gray-500 font-mono">{row.sku}</p>
        </div>
      ),
    },
    {
      key: 'category_name',
      label: 'Category',
      label_ar: 'الفئة',
      sortable: true,
      render: (val: string) => (
        <span className="inline-flex items-center rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
          {val || '-'}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      label_ar: 'السعر',
      sortable: true,
      render: (_: any, row: Product) => (
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{Number(row.price || 0).toFixed(2)}</p>
          {row.compare_at_price && Number(row.compare_at_price) > Number(row.price) && (
            <p className="text-xs text-gray-400 line-through">{Number(row.compare_at_price || 0).toFixed(2)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'stock_quantity',
      label: 'Stock',
      label_ar: 'المخزون',
      sortable: true,
      align: 'center' as const,
      render: (val: number) => {
        const color = val === 0 ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : val < 10 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
        return <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${color}`}>{val}</span>;
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      label_ar: 'الحالة',
      render: (_: any, row: Product) => (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.is_active ? statusColors.active : statusColors.inactive}`}>
            {row.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
          </span>
          {row.is_featured && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors.featured}`}>
              ★
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'avg_rating',
      label: 'Rating',
      label_ar: 'التقييم',
      align: 'center' as const,
      render: (_: any, row: Product) => (
        <div className="flex items-center gap-1">
          <div className="flex">
            {[1,2,3,4,5].map(star => (
              <svg key={star} className={`h-3.5 w-3.5 ${star <= Math.round(row.avg_rating || 0) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-gray-500">({row.review_count || 0})</span>
        </div>
      ),
    },
    {
      key: 'total_sales',
      label: 'Sales',
      label_ar: 'المبيعات',
      sortable: true,
      align: 'center' as const,
      render: (val: number) => <span className="font-semibold text-gray-700 dark:text-gray-300">{val || 0}</span>,
    },
  ];

  const actions = [
    {
      id: 'view',
      label: isAr ? 'عرض' : 'View',
      icon: EyeIcon,
      onClick: (row: Product) => router.push(`/ecommerce/products/${row.id}`),
    },
    {
      id: 'edit',
      label: isAr ? 'تعديل' : 'Edit',
      icon: PencilSquareIcon,
      onClick: (row: Product) => router.push(`/ecommerce/products/${row.id}/edit`),
    },
    {
      id: 'delete',
      label: isAr ? 'حذف' : 'Delete',
      icon: TrashIcon,
      onClick: (row: Product) => setDeleteId(row.id),
      variant: 'danger' as const,
    },
  ];

  const filterButtons = [
    { key: 'all', label: isAr ? 'الكل' : 'All' },
    { key: 'active', label: isAr ? 'نشط' : 'Active' },
    { key: 'inactive', label: isAr ? 'معطل' : 'Inactive' },
    { key: 'featured', label: isAr ? 'مميز' : 'Featured' },
    { key: 'low_stock', label: isAr ? 'مخزون منخفض' : 'Low Stock' },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'إدارة المنتجات' : 'Product Management'} - SLMS</title></Head>
      <div className="space-y-6 p-1">
        <PageHeader
          title="Product Management"
          title_ar="إدارة المنتجات"
          description="Manage your store products, inventory, and pricing"
          description_ar="إدارة منتجات متجرك والمخزون والتسعير"
          icon={CubeIcon}
          breadcrumbs={[
            { label: 'E-Commerce', label_ar: 'المتجر الإلكتروني', href: '/ecommerce/settings' },
            { label: 'Products', label_ar: 'المنتجات' },
          ]}
          actions={[
            {
              id: 'import',
              label: 'Import',
              label_ar: 'استيراد',
              icon: ArrowUpTrayIcon,
              onClick: () => showToast('info', isAr ? 'ميزة الاستيراد قريبًا' : 'Import feature coming soon'),
              variant: 'secondary',
            },
            {
              id: 'add',
              label: 'Add Product',
              label_ar: 'إضافة منتج',
              icon: PlusIcon,
              onClick: () => router.push('/ecommerce/products/new'),
              variant: 'primary',
            },
          ]}
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800"
            >
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

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(f => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  statusFilter === f.key
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={isAr ? 'بحث عن منتج...' : 'Search products...'}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white w-64"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <EnhancedTable
            data={products}
            columns={columns}
            loading={loading}
            rowKey="id"
            actions={actions}
            emptyMessage={isAr ? 'لا توجد منتجات' : 'No products found'}
            pagination={{ page: currentPage, pageSize, total: totalItems }}
            onPaginationChange={(p) => { setCurrentPage(p.page); if (p.pageSize !== pageSize) setPageSize(p.pageSize); }}
          />
        </div>

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 animate-in zoom-in-95 duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {isAr ? 'حذف المنتج' : 'Delete Product'}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {isAr ? 'هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this product? This action cannot be undone.'}
              </p>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/25"
                >
                  {deleting ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin mx-4" />
                  ) : (
                    isAr ? 'حذف' : 'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
