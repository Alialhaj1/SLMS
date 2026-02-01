import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  ShoppingCartIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ClockIcon,
  BuildingStorefrontIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface PurchaseReport {
  id: number;
  poNumber: string;
  supplier: string;
  supplierAr: string;
  category: string;
  categoryAr: string;
  amount: number;
  itemCount: number;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  orderDate: string;
  deliveryDate: string | null;
  leadTime: number | null;
}

const mockReports: PurchaseReport[] = [
  { id: 1, poNumber: 'PO-2024-001', supplier: 'ABC Logistics', supplierAr: 'ABC للخدمات اللوجستية', category: 'Transport', categoryAr: 'النقل', amount: 45000, itemCount: 3, status: 'received', orderDate: '2024-01-15', deliveryDate: '2024-01-25', leadTime: 10 },
  { id: 2, poNumber: 'PO-2024-002', supplier: 'XYZ Equipment', supplierAr: 'XYZ للمعدات', category: 'Equipment', categoryAr: 'المعدات', amount: 125000, itemCount: 5, status: 'approved', orderDate: '2024-01-20', deliveryDate: null, leadTime: null },
  { id: 3, poNumber: 'PO-2024-003', supplier: 'Global Supplies', supplierAr: 'المستلزمات العالمية', category: 'Supplies', categoryAr: 'المستلزمات', amount: 18500, itemCount: 12, status: 'pending', orderDate: '2024-01-25', deliveryDate: null, leadTime: null },
  { id: 4, poNumber: 'PO-2024-004', supplier: 'Tech Solutions', supplierAr: 'الحلول التقنية', category: 'IT', categoryAr: 'تقنية المعلومات', amount: 32000, itemCount: 2, status: 'received', orderDate: '2024-01-10', deliveryDate: '2024-01-18', leadTime: 8 },
  { id: 5, poNumber: 'PO-2024-005', supplier: 'Packaging Pro', supplierAr: 'التغليف المحترف', category: 'Packaging', categoryAr: 'التغليف', amount: 8500, itemCount: 8, status: 'cancelled', orderDate: '2024-01-12', deliveryDate: null, leadTime: null },
  { id: 6, poNumber: 'PO-2024-006', supplier: 'Safety First', supplierAr: 'السلامة أولاً', category: 'Safety', categoryAr: 'السلامة', amount: 15200, itemCount: 15, status: 'received', orderDate: '2024-01-08', deliveryDate: '2024-01-16', leadTime: 8 },
];

const supplierStats = [
  { name: 'ABC Logistics', nameAr: 'ABC للخدمات اللوجستية', orders: 12, totalSpend: 156000, avgLeadTime: 9, rating: 4.5 },
  { name: 'XYZ Equipment', nameAr: 'XYZ للمعدات', orders: 8, totalSpend: 320000, avgLeadTime: 14, rating: 4.2 },
  { name: 'Global Supplies', nameAr: 'المستلزمات العالمية', orders: 24, totalSpend: 89000, avgLeadTime: 5, rating: 4.8 },
];

export default function PurchasingReportsPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [reports] = useState<PurchaseReport[]>(mockReports);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [selectedReport, setSelectedReport] = useState<PurchaseReport | null>(null);

  const categories = ['all', 'Transport', 'Equipment', 'Supplies', 'IT', 'Packaging', 'Safety'];

  const filteredReports = reports.filter(report => {
    const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    return matchesStatus && matchesCategory;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const handleExport = () => {
    showToast(locale === 'ar' ? 'جاري التصدير...' : 'Exporting...', 'info');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      received: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      approved: { en: 'Approved', ar: 'معتمد' },
      received: { en: 'Received', ar: 'تم الاستلام' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const totalSpend = filteredReports.reduce((sum, r) => sum + r.amount, 0);
  const totalOrders = filteredReports.length;
  const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;
  const receivedOrders = reports.filter(r => r.status === 'received').length;
  const avgLeadTime = reports.filter(r => r.leadTime).reduce((sum, r, _, arr) => sum + (r.leadTime || 0) / arr.length, 0);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير المشتريات - SLMS' : 'Purchasing Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <ShoppingCartIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'تقارير المشتريات' : 'Purchasing Reports'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تحليل المشتريات وأداء الموردين' : 'Purchase analysis and supplier performance'}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <CurrencyDollarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الإنفاق' : 'Total Spend'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalSpend)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <DocumentTextIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عدد الطلبات' : 'Total Orders'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                <ChartBarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط الطلب' : 'Avg Order'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(avgOrderValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                <TruckIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تم الاستلام' : 'Received'}</p>
                <p className="text-xl font-semibold text-orange-600">{receivedOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                <ClockIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط التسليم' : 'Avg Lead Time'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{avgLeadTime.toFixed(1)} {locale === 'ar' ? 'يوم' : 'days'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button onClick={() => setActiveTab('orders')} className={clsx('px-6 py-3 text-sm font-medium border-b-2 transition-colors', activeTab === 'orders' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400')}>
                {locale === 'ar' ? 'أوامر الشراء' : 'Purchase Orders'}
              </button>
              <button onClick={() => setActiveTab('suppliers')} className={clsx('px-6 py-3 text-sm font-medium border-b-2 transition-colors', activeTab === 'suppliers' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400')}>
                {locale === 'ar' ? 'أداء الموردين' : 'Supplier Performance'}
              </button>
            </nav>
          </div>

          {activeTab === 'orders' && (
            <div className="p-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div>
                  <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                    <option value="pending">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
                    <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
                    <option value="received">{locale === 'ar' ? 'تم الاستلام' : 'Received'}</option>
                    <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                  </select>
                </div>
                <div>
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="all">{locale === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Orders Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم الأمر' : 'PO Number'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المورد' : 'Supplier'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البنود' : 'Items'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 dark:text-white">{report.poNumber}</span>
                          <p className="text-xs text-gray-500">{report.orderDate}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? report.supplierAr : report.supplier}</td>
                        <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? report.categoryAr : report.category}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(report.amount)}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{report.itemCount}</td>
                        <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="secondary" onClick={() => setSelectedReport(report)}>
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {supplierStats.map((supplier, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                        <h3 className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? supplier.nameAr : supplier.name}</h3>
                      </div>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        ★ {supplier.rating}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{locale === 'ar' ? 'عدد الطلبات' : 'Orders'}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{supplier.orders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{locale === 'ar' ? 'إجمالي الإنفاق' : 'Total Spend'}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(supplier.totalSpend)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{locale === 'ar' ? 'متوسط التسليم' : 'Avg Lead Time'}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{supplier.avgLeadTime} {locale === 'ar' ? 'يوم' : 'days'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={locale === 'ar' ? 'تفاصيل أمر الشراء' : 'Purchase Order Details'} size="lg">
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{selectedReport.poNumber}</h3>
              {getStatusBadge(selectedReport.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المورد' : 'Supplier'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedReport.supplierAr : selectedReport.supplier}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفئة' : 'Category'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedReport.categoryAr : selectedReport.category}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedReport.amount)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'عدد البنود' : 'Item Count'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedReport.itemCount}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الطلب' : 'Order Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedReport.orderDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ التسليم' : 'Delivery Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedReport.deliveryDate || '-'}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={handleExport}>
                <DocumentTextIcon className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button variant="secondary" onClick={handleExport}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
