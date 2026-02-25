import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  ShoppingCartIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  XCircleIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface SalesOrder {
  id: number;
  so_number: string;
  customer_id: number;
  customer_name: string;
  customer_code: string;
  order_date: string;
  delivery_date: string | null;
  status: string;
  currency_code: string;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;
  credit_check_status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  delivered: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  invoiced: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  draft: { en: 'Draft', ar: 'مسودة' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  processing: { en: 'Processing', ar: 'قيد التجهيز' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  invoiced: { en: 'Invoiced', ar: 'مُفوتَر' },
  closed: { en: 'Closed', ar: 'مغلق' },
  cancelled: { en: 'Cancelled', ar: 'ملغى' },
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <DocumentCheckIcon className="w-4 h-4" />,
  confirmed: <CheckCircleIcon className="w-4 h-4" />,
  processing: <ClockIcon className="w-4 h-4" />,
  delivered: <TruckIcon className="w-4 h-4" />,
  invoiced: <CurrencyDollarIcon className="w-4 h-4" />,
  closed: <CheckCircleIcon className="w-4 h-4" />,
  cancelled: <XCircleIcon className="w-4 h-4" />,
};

export default function SalesOrdersPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, confirmed: 0, processing: 0, delivered: 0 });

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/sales/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        const data = result.data || [];
        setOrders(data);
        setStats({
          total: data.length,
          confirmed: data.filter((o: SalesOrder) => o.status === 'confirmed').length,
          processing: data.filter((o: SalesOrder) => o.status === 'processing').length,
          delivered: data.filter((o: SalesOrder) => o.status === 'delivered').length,
        });
      } else {
        showToast('error', locale === 'ar' ? 'فشل تحميل أوامر البيع' : 'Failed to load sales orders');
      }
    } catch (error) {
      showToast('error', locale === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order.so_number?.toLowerCase().includes(term) ||
      order.customer_name?.toLowerCase().includes(term) ||
      order.customer_code?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + (currency || 'SAR');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB');
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'أوامر البيع — SLMS' : 'Sales Orders — SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingCartIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'أوامر البيع' : 'Sales Orders'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة أوامر البيع ومتابعة التسليم والفوترة' : 'Manage sales orders, delivery & invoicing'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchOrders}>
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            {hasPermission('sales_orders:create') && (
              <Button onClick={() => router.push('/sales/orders/new')}>
                <PlusIcon className="w-5 h-5 mr-1" />
                {locale === 'ar' ? 'أمر بيع جديد' : 'New Sales Order'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: locale === 'ar' ? 'إجمالي الأوامر' : 'Total Orders', value: stats.total, color: 'blue' },
            { label: locale === 'ar' ? 'مؤكدة' : 'Confirmed', value: stats.confirmed, color: 'green' },
            { label: locale === 'ar' ? 'قيد التجهيز' : 'Processing', value: stats.processing, color: 'yellow' },
            { label: locale === 'ar' ? 'تم التسليم' : 'Delivered', value: stats.delivered, color: 'indigo' },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.value}</p>
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
                  placeholder={locale === 'ar' ? 'بحث برقم الأمر أو اسم العميل...' : 'Search by order number, customer...'}
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
              <p className="text-gray-500 dark:text-gray-400 mt-4">
                {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCartIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'لا توجد أوامر بيع' : 'No sales orders found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm
                  ? (locale === 'ar' ? 'حاول تعديل معايير البحث' : 'Try adjusting your search')
                  : (locale === 'ar' ? 'أنشئ أول أمر بيع' : 'Create your first sales order')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'رقم الأمر' : 'SO Number'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'العميل' : 'Customer'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'تاريخ التسليم' : 'Delivery Date'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'المبلغ' : 'Amount'}
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
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => router.push(`/sales/orders/${order.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                          {order.so_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(order.order_date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.customer_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{order.customer_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(order.delivery_date || '')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(order.total_amount, order.currency_code)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || statusColors.draft}`}>
                          {statusIcons[order.status]}
                          {locale === 'ar' ? statusLabels[order.status]?.ar : statusLabels[order.status]?.en || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); router.push(`/sales/orders/${order.id}`); }}
                        >
                          {locale === 'ar' ? 'عرض' : 'View'}
                        </Button>
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
