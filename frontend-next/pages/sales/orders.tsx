import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  ShoppingCartIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface SalesOrder {
  id: number;
  orderNumber: string;
  customer: string;
  customerAr: string;
  orderDate: string;
  deliveryDate: string | null;
  amount: number;
  items: number;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  paymentStatus: 'pending' | 'partial' | 'paid';
}

const mockOrders: SalesOrder[] = [
  { id: 1, orderNumber: 'SO-2024-001', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', orderDate: '2024-01-15', deliveryDate: '2024-01-25', amount: 97750, items: 5, status: 'delivered', priority: 'normal', paymentStatus: 'paid' },
  { id: 2, orderNumber: 'SO-2024-002', customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', orderDate: '2024-01-20', deliveryDate: '2024-02-05', amount: 143750, items: 8, status: 'shipped', priority: 'high', paymentStatus: 'pending' },
  { id: 3, orderNumber: 'SO-2024-003', customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', orderDate: '2024-01-22', deliveryDate: null, amount: 51750, items: 3, status: 'processing', priority: 'normal', paymentStatus: 'partial' },
  { id: 4, orderNumber: 'SO-2024-004', customer: 'Premium Shipping LLC', customerAr: 'الشحن المتميز ذ.م.م', orderDate: '2024-01-25', deliveryDate: null, amount: 253000, items: 12, status: 'confirmed', priority: 'urgent', paymentStatus: 'pending' },
  { id: 5, orderNumber: 'SO-2024-005', customer: 'Eastern Transport', customerAr: 'النقل الشرقي', orderDate: '2024-01-28', deliveryDate: null, amount: 44275, items: 2, status: 'draft', priority: 'low', paymentStatus: 'pending' },
];

export default function SalesOrdersPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [orders] = useState<SalesOrder[]>(mockOrders);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredOrders = orders.filter(order => selectedStatus === 'all' || order.status === selectedStatus);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      confirmed: { en: 'Confirmed', ar: 'مؤكد' },
      processing: { en: 'Processing', ar: 'قيد التجهيز' },
      shipped: { en: 'Shipped', ar: 'تم الشحن' },
      delivered: { en: 'Delivered', ar: 'تم التسليم' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      normal: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      low: { en: 'Low', ar: 'منخفضة' },
      normal: { en: 'Normal', ar: 'عادية' },
      high: { en: 'High', ar: 'عالية' },
      urgent: { en: 'Urgent', ar: 'عاجلة' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[priority])}>
        {locale === 'ar' ? labels[priority]?.ar : labels[priority]?.en}
      </span>
    );
  };

  const totalOrders = filteredOrders.length;
  const totalAmount = filteredOrders.reduce((sum, o) => sum + o.amount, 0);
  const inProgress = orders.filter(o => ['confirmed', 'processing', 'shipped'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'delivered').length;

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'أوامر البيع - SLMS' : 'Sales Orders - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ShoppingCartIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'أوامر البيع' : 'Sales Orders'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة طلبات العملاء والتسليم' : 'Manage customer orders and delivery'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'أمر بيع جديد' : 'New Order'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><ShoppingCartIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الأوامر' : 'Total Orders'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"><ClockIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</p>
                <p className="text-xl font-semibold text-yellow-600">{inProgress}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><TruckIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تم التسليم' : 'Delivered'}</p>
                <p className="text-xl font-semibold text-green-600">{delivered}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><UserIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
              <option value="confirmed">{locale === 'ar' ? 'مؤكد' : 'Confirmed'}</option>
              <option value="processing">{locale === 'ar' ? 'قيد التجهيز' : 'Processing'}</option>
              <option value="shipped">{locale === 'ar' ? 'تم الشحن' : 'Shipped'}</option>
              <option value="delivered">{locale === 'ar' ? 'تم التسليم' : 'Delivered'}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم الأمر' : 'Order #'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البنود' : 'Items'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الأولوية' : 'Priority'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</span>
                      <p className="text-xs text-gray-500">{order.orderDate}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? order.customerAr : order.customer}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(order.amount)}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{order.items}</td>
                    <td className="px-4 py-3">{getPriorityBadge(order.priority)}</td>
                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedOrder(order)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل...' : 'Edit...', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={locale === 'ar' ? 'تفاصيل أمر البيع' : 'Order Details'} size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{selectedOrder.orderNumber}</h3>
              <div className="flex gap-2">{getPriorityBadge(selectedOrder.priority)}{getStatusBadge(selectedOrder.status)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'العميل' : 'Customer'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedOrder.customerAr : selectedOrder.customer}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الطلب' : 'Order Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.orderDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-green-600">{formatCurrency(selectedOrder.amount)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ التسليم' : 'Delivery Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.deliveryDate || '-'}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التأكيد' : 'Confirmed', 'success')}><CheckCircleIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'تأكيد' : 'Confirm'}</Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري التصدير...' : 'Exporting...', 'info')}><ArrowDownTrayIcon className="h-4 w-4 mr-1" />PDF</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={locale === 'ar' ? 'أمر بيع جديد' : 'New Sales Order'}>
        <div className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نموذج إنشاء أمر بيع جديد' : 'Create new sales order form'}</p>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => { setShowCreateModal(false); showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); }}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
