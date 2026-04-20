import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import EnhancedTable from '../../components/ui/EnhancedTable';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/apiClient';
import {
  UserGroupIcon,
  EyeIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
  StarIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  total_orders: number;
  total_spent: number;
  currency: string;
  last_order_date: string | null;
  created_at: string;
  is_verified: boolean;
  avg_order_value: number;
  loyalty_tier: string;
}

const tierColors: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
  bronze: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', label: 'Bronze', labelAr: 'برونزي' },
  silver: { bg: 'bg-gray-100 dark:bg-gray-600', text: 'text-gray-700 dark:text-gray-200', label: 'Silver', labelAr: 'فضي' },
  gold: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', label: 'Gold', labelAr: 'ذهبي' },
  platinum: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', label: 'Platinum', labelAr: 'بلاتيني' },
  new: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', label: 'New', labelAr: 'جديد' },
};

export default function CustomersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const qp = new URLSearchParams({ page: String(currentPage), limit: String(pageSize) });
      if (searchQuery) qp.set('search', searchQuery);
      if (tierFilter !== 'all') qp.set('tier', tierFilter);
      const res = await apiClient.get<any>(`/api/ecommerce/customers?${qp}`);
      setCustomers(res?.data || []);
      setTotalItems(res?.pagination?.totalItems || 0);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, tierFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const exportCustomersCsv = () => {
    if (!customers.length) return;
    const headers = ['Name', 'Email', 'Phone', 'City', 'Orders', 'Total Spent', 'Avg Order', 'Tier', 'Joined'];
    const rows = customers.map(c => [
      `${c.first_name} ${c.last_name}`.trim(),
      c.email,
      c.phone || '',
      c.city || '',
      c.total_orders,
      c.total_spent,
      Number(c.avg_order_value || 0).toFixed(2),
      c.loyalty_tier,
      new Date(c.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    {
      label: isAr ? 'إجمالي العملاء' : 'Total Customers',
      value: totalItems,
      icon: UserGroupIcon,
      gradient: 'from-violet-500 to-purple-500',
      bgGlow: 'bg-violet-500/10',
    },
    {
      label: isAr ? 'عملاء جدد هذا الشهر' : 'New This Month',
      value: customers.filter(c => {
        const d = new Date(c.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      icon: UserPlusIcon,
      gradient: 'from-emerald-500 to-teal-500',
      bgGlow: 'bg-emerald-500/10',
    },
    {
      label: isAr ? 'متوسط قيمة الطلب' : 'Avg Order Value',
      value: customers.length > 0
        ? (customers.reduce((sum, c) => sum + Number(c.avg_order_value || 0), 0) / customers.length).toFixed(0)
        : '0',
      icon: CurrencyDollarIcon,
      gradient: 'from-blue-500 to-cyan-500',
      bgGlow: 'bg-blue-500/10',
    },
    {
      label: isAr ? 'عملاء VIP' : 'VIP Customers',
      value: customers.filter(c => ['gold', 'platinum'].includes(c.loyalty_tier)).length,
      icon: StarIcon,
      gradient: 'from-amber-500 to-orange-500',
      bgGlow: 'bg-amber-500/10',
    },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      label_ar: 'العميل',
      sortable: true,
      render: (_: any, row: Customer) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white shadow-md">
            {(row.first_name?.[0] || '').toUpperCase()}{(row.last_name?.[0] || '').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {row.first_name} {row.last_name}
              {row.is_verified && <span className="ml-1 inline-block text-blue-500" title="Verified">✓</span>}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <EnvelopeIcon className="h-3 w-3" />
              {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      label_ar: 'الهاتف',
      render: (val: string) => val ? (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <PhoneIcon className="h-4 w-4" />
          <span dir="ltr">{val}</span>
        </div>
      ) : <span className="text-gray-400">-</span>,
    },
    {
      key: 'city',
      label: 'Location',
      label_ar: 'الموقع',
      render: (_: any, row: Customer) => row.city ? (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <MapPinIcon className="h-4 w-4" />
          {row.city}{row.country ? `, ${row.country}` : ''}
        </div>
      ) : <span className="text-gray-400">-</span>,
    },
    {
      key: 'loyalty_tier',
      label: 'Tier',
      label_ar: 'المستوى',
      render: (val: string) => {
        const tier = tierColors[val] || tierColors.new;
        return (
          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${tier.bg} ${tier.text}`}>
            {val === 'gold' || val === 'platinum' ? '★ ' : ''}{isAr ? tier.labelAr : tier.label}
          </span>
        );
      },
    },
    {
      key: 'total_orders',
      label: 'Orders',
      label_ar: 'الطلبات',
      sortable: true,
      align: 'center' as const,
      render: (val: number) => (
        <div className="flex items-center justify-center gap-1.5">
          <ShoppingBagIcon className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">{val || 0}</span>
        </div>
      ),
    },
    {
      key: 'total_spent',
      label: 'Total Spent',
      label_ar: 'إجمالي الإنفاق',
      sortable: true,
      render: (_: any, row: Customer) => (
        <span className="font-bold text-gray-900 dark:text-white">
          {(row.total_spent || 0).toLocaleString()} <span className="text-xs font-normal text-gray-500">{row.currency}</span>
        </span>
      ),
    },
    {
      key: 'last_order_date',
      label: 'Last Order',
      label_ar: 'آخر طلب',
      sortable: true,
      render: (val: string) => val ? (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <CalendarDaysIcon className="h-4 w-4" />
          {new Date(val).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
        </div>
      ) : <span className="text-xs text-gray-400">{isAr ? 'لا يوجد' : 'Never'}</span>,
    },
  ];

  const rowActions = [
    {
      id: 'view',
      label: isAr ? 'عرض التفاصيل' : 'View Details',
      icon: EyeIcon,
      onClick: (row: Customer) => setSelectedCustomer(row),
    },
    {
      id: 'orders',
      label: isAr ? 'عرض الطلبات' : 'View Orders',
      icon: ShoppingBagIcon,
      onClick: (row: Customer) => router.push(`/ecommerce/orders?customer=${row.id}`),
    },
  ];

  const tierFilters = [
    { key: 'all', label: isAr ? 'الكل' : 'All' },
    { key: 'new', label: isAr ? 'جديد' : 'New' },
    { key: 'bronze', label: isAr ? 'برونزي' : 'Bronze' },
    { key: 'silver', label: isAr ? 'فضي' : 'Silver' },
    { key: 'gold', label: isAr ? 'ذهبي' : 'Gold' },
    { key: 'platinum', label: isAr ? 'بلاتيني' : 'Platinum' },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'عملاء المتجر' : 'Store Customers'} - SLMS</title></Head>
      <div className="space-y-6 p-1">
        <PageHeader
          title="Store Customers"
          title_ar="عملاء المتجر"
          description="Manage and analyze your customer base"
          description_ar="إدارة وتحليل قاعدة عملائك"
          icon={UserGroupIcon}
          breadcrumbs={[
            { label: 'E-Commerce', label_ar: 'المتجر الإلكتروني', href: '/ecommerce/settings' },
            { label: 'Customers', label_ar: 'العملاء' },
          ]}
          actions={[
            {
              id: 'export',
              label: 'Export',
              label_ar: 'تصدير',
              icon: ArrowDownTrayIcon,
              onClick: () => exportCustomersCsv(),
              variant: 'secondary',
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

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {tierFilters.map(f => (
              <button
                key={f.key}
                onClick={() => { setTierFilter(f.key); setCurrentPage(1); }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  tierFilter === f.key
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/25'
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
              placeholder={isAr ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white w-72"
            />
          </div>
        </div>

        {/* Customers Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <EnhancedTable
            data={customers}
            columns={columns}
            loading={loading}
            rowKey="id"
            actions={rowActions}
            emptyMessage={isAr ? 'لا يوجد عملاء' : 'No customers found'}
            pagination={{ page: currentPage, pageSize, total: totalItems }}
            onPaginationChange={(p) => { setCurrentPage(p.page); if (p.pageSize !== pageSize) setPageSize(p.pageSize); }}
          />
        </div>

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 text-xl font-bold text-white shadow-lg">
                  {(selectedCustomer.first_name?.[0] || '').toUpperCase()}{(selectedCustomer.last_name?.[0] || '').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                  {selectedCustomer.loyalty_tier && (
                    <span className={`mt-1 inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold ${(tierColors[selectedCustomer.loyalty_tier] || tierColors.new).bg} ${(tierColors[selectedCustomer.loyalty_tier] || tierColors.new).text}`}>
                      {isAr ? (tierColors[selectedCustomer.loyalty_tier] || tierColors.new).labelAr : (tierColors[selectedCustomer.loyalty_tier] || tierColors.new).label}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <p className="text-xs text-gray-500">{isAr ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.total_orders}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald-900/20 dark:to-teal-900/20">
                  <p className="text-xs text-gray-500">{isAr ? 'إجمالي الإنفاق' : 'Total Spent'}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{(selectedCustomer.total_spent || 0).toLocaleString()} <span className="text-sm font-normal text-gray-500">{selectedCustomer.currency}</span></p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-4 dark:from-purple-900/20 dark:to-pink-900/20">
                  <p className="text-xs text-gray-500">{isAr ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(selectedCustomer.avg_order_value || 0).toFixed(0)}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-900/20 dark:to-orange-900/20">
                  <p className="text-xs text-gray-500">{isAr ? 'تاريخ التسجيل' : 'Joined'}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(selectedCustomer.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => router.push(`/ecommerce/orders?customer=${selectedCustomer.id}`)}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25"
                >
                  {isAr ? 'عرض الطلبات' : 'View Orders'}
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
