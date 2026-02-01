import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CurrencyDollarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface SalesInvoice {
  id: number;
  invoiceNumber: string;
  orderNumber: string;
  customer: string;
  customerAr: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  invoiceDate: string;
  dueDate: string;
  items: number;
}

const mockInvoices: SalesInvoice[] = [
  { id: 1, invoiceNumber: 'INV-2024-001', orderNumber: 'SO-2024-001', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', amount: 85000, vatAmount: 12750, totalAmount: 97750, status: 'paid', invoiceDate: '2024-01-15', dueDate: '2024-02-15', items: 5 },
  { id: 2, invoiceNumber: 'INV-2024-002', orderNumber: 'SO-2024-002', customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', amount: 125000, vatAmount: 18750, totalAmount: 143750, status: 'sent', invoiceDate: '2024-01-20', dueDate: '2024-02-20', items: 8 },
  { id: 3, invoiceNumber: 'INV-2024-003', orderNumber: 'SO-2024-003', customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', amount: 45000, vatAmount: 6750, totalAmount: 51750, status: 'overdue', invoiceDate: '2024-01-05', dueDate: '2024-01-20', items: 3 },
  { id: 4, invoiceNumber: 'INV-2024-004', orderNumber: 'SO-2024-004', customer: 'Premium Shipping LLC', customerAr: 'الشحن المتميز ذ.م.م', amount: 220000, vatAmount: 33000, totalAmount: 253000, status: 'viewed', invoiceDate: '2024-01-22', dueDate: '2024-02-22', items: 12 },
  { id: 5, invoiceNumber: 'INV-2024-005', orderNumber: 'SO-2024-005', customer: 'Eastern Transport', customerAr: 'النقل الشرقي', amount: 38500, vatAmount: 5775, totalAmount: 44275, status: 'draft', invoiceDate: '2024-01-28', dueDate: '2024-02-28', items: 2 },
];

export default function SalesInvoicesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [invoices] = useState<SalesInvoice[]>(mockInvoices);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredInvoices = invoices.filter(inv => selectedStatus === 'all' || inv.status === selectedStatus);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      viewed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      sent: { en: 'Sent', ar: 'مرسلة' },
      viewed: { en: 'Viewed', ar: 'تمت المشاهدة' },
      paid: { en: 'Paid', ar: 'مدفوعة' },
      overdue: { en: 'Overdue', ar: 'متأخرة' },
      cancelled: { en: 'Cancelled', ar: 'ملغاة' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingAmount = invoices.filter(i => ['sent', 'viewed'].includes(i.status)).reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'فواتير المبيعات - SLMS' : 'Sales Invoices - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة فواتير العملاء والإيرادات' : 'Manage customer invoices and revenue'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المدفوعة' : 'Paid'}</p>
                <p className="text-xl font-semibold text-green-600">{formatCurrency(paidAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"><ClockIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
                <p className="text-xl font-semibold text-yellow-600">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600"><XCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متأخرة' : 'Overdue'}</p>
                <p className="text-xl font-semibold text-red-600">{formatCurrency(overdueAmount)}</p>
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
              <option value="sent">{locale === 'ar' ? 'مرسلة' : 'Sent'}</option>
              <option value="paid">{locale === 'ar' ? 'مدفوعة' : 'Paid'}</option>
              <option value="overdue">{locale === 'ar' ? 'متأخرة' : 'Overdue'}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاستحقاق' : 'Due Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</span>
                      <p className="text-xs text-gray-500">{invoice.invoiceDate}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? invoice.customerAr : invoice.customer}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(invoice.totalAmount)}</span>
                      <p className="text-xs text-gray-500">{locale === 'ar' ? 'شامل الضريبة' : 'Inc. VAT'}</p>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                    <td className="px-4 py-3 text-gray-500">{invoice.dueDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedInvoice(invoice)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري الإرسال...' : 'Sending...', 'info')}><PrinterIcon className="h-4 w-4" /></Button>
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
      <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title={locale === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details'} size="lg">
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{selectedInvoice.invoiceNumber}</h3>
              {getStatusBadge(selectedInvoice.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'العميل' : 'Customer'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedInvoice.customerAr : selectedInvoice.customer}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'أمر البيع' : 'Order #'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedInvoice.orderNumber}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedInvoice.amount)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'ضريبة القيمة المضافة' : 'VAT'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedInvoice.vatAmount)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
                <p className="font-medium text-green-600">{formatCurrency(selectedInvoice.totalAmount)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedInvoice.dueDate}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم الإرسال' : 'Sent', 'success')}>{locale === 'ar' ? 'إرسال' : 'Send'}</Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري التصدير...' : 'Exporting...', 'info')}><ArrowDownTrayIcon className="h-4 w-4 mr-1" />PDF</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={locale === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}>
        <div className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نموذج إنشاء فاتورة جديدة' : 'Create new invoice form'}</p>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => { setShowCreateModal(false); showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); }}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
