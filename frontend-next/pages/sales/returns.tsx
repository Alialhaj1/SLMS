import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  ArrowUturnLeftIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  XCircleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type ReturnStatus = 'requested' | 'approved' | 'picked_up' | 'received' | 'refunded' | 'rejected';

interface SalesReturn {
  id: number;
  returnNumber: string;
  invoiceNumber: string;
  customer: string;
  customerAr: string;
  requestDate: string;
  amount: number;
  reason: string;
  reasonAr: string;
  status: ReturnStatus;
}

const mockReturns: SalesReturn[] = [
  { id: 1, returnNumber: 'SR-2024-001', invoiceNumber: 'INV-2024-003', customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', requestDate: '2024-01-21', amount: 51750, reason: 'Damaged item', reasonAr: 'بضاعة تالفة', status: 'approved' },
  { id: 2, returnNumber: 'SR-2024-002', invoiceNumber: 'INV-2024-002', customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', requestDate: '2024-01-26', amount: 143750, reason: 'Incorrect quantity', reasonAr: 'كمية غير صحيحة', status: 'picked_up' },
  { id: 3, returnNumber: 'SR-2024-003', invoiceNumber: 'INV-2024-005', customer: 'Eastern Transport', customerAr: 'النقل الشرقي', requestDate: '2024-01-29', amount: 44275, reason: 'Customer cancellation', reasonAr: 'إلغاء العميل', status: 'requested' },
  { id: 4, returnNumber: 'SR-2024-004', invoiceNumber: 'INV-2024-001', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', requestDate: '2024-01-16', amount: 97750, reason: 'Packaging issue', reasonAr: 'مشكلة في التغليف', status: 'refunded' },
  { id: 5, returnNumber: 'SR-2024-005', invoiceNumber: 'INV-2024-004', customer: 'Premium Shipping LLC', customerAr: 'الشحن المتميز ذ.م.م', requestDate: '2024-01-25', amount: 253000, reason: 'Not as described', reasonAr: 'غير مطابق للوصف', status: 'rejected' },
];

export default function SalesReturnsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [returns] = useState<SalesReturn[]>(mockReturns);
  const [selectedStatus, setSelectedStatus] = useState<'all' | ReturnStatus>('all');
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    customer: '',
    customerAr: '',
    amount: '',
    reason: '',
    reasonAr: '',
  });

  const filteredReturns = useMemo(() => {
    return returns.filter(r => selectedStatus === 'all' || r.status === selectedStatus);
  }, [returns, selectedStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const getStatusBadge = (status: ReturnStatus) => {
    const styles: Record<ReturnStatus, string> = {
      requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      picked_up: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      received: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      refunded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<ReturnStatus, { en: string; ar: string }> = {
      requested: { en: 'Requested', ar: 'مطلوب' },
      approved: { en: 'Approved', ar: 'معتمد' },
      picked_up: { en: 'Picked Up', ar: 'تم الاستلام' },
      received: { en: 'Received', ar: 'تم التوريد' },
      refunded: { en: 'Refunded', ar: 'تم الاسترجاع' },
      rejected: { en: 'Rejected', ar: 'مرفوض' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const totalReturns = filteredReturns.length;
  const pendingCount = returns.filter(r => ['requested', 'approved', 'picked_up', 'received'].includes(r.status)).length;
  const refundedValue = returns.filter(r => r.status === 'refunded').reduce((sum, r) => sum + r.amount, 0);
  const requestedValue = returns.filter(r => r.status === 'requested').reduce((sum, r) => sum + r.amount, 0);

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم إرسال طلب الإرجاع (تجريبي)' : 'Return requested (demo)', 'success');
    setCreateOpen(false);
    setFormData({ invoiceNumber: '', customer: '', customerAr: '', amount: '', reason: '', reasonAr: '' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مرتجعات المبيعات - SLMS' : 'Sales Returns - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <ArrowUturnLeftIcon className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'مرتجعات المبيعات' : 'Sales Returns'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة طلبات الإرجاع والاسترجاع المالي' : 'Manage return requests and refunds'}
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'طلب إرجاع جديد' : 'New Return'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><ArrowUturnLeftIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عدد المرتجعات' : 'Returns'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalReturns}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"><ClockIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد المعالجة' : 'In Progress'}</p>
                <p className="text-xl font-semibold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيمة المسترد' : 'Refunded'}</p>
                <p className="text-xl font-semibold text-green-600">{formatCurrency(refundedValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><TruckIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيمة الطلبات الجديدة' : 'New Requests'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(requestedValue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="requested">{locale === 'ar' ? 'مطلوب' : 'Requested'}</option>
              <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
              <option value="picked_up">{locale === 'ar' ? 'تم الاستلام' : 'Picked Up'}</option>
              <option value="received">{locale === 'ar' ? 'تم التوريد' : 'Received'}</option>
              <option value="refunded">{locale === 'ar' ? 'تم الاسترجاع' : 'Refunded'}</option>
              <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الرقم' : 'Return #'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفاتورة' : 'Invoice'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القيمة' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'السبب' : 'Reason'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{r.returnNumber}</p>
                      <p className="text-xs text-gray-500">{r.requestDate}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? r.customerAr : r.customer}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? r.reasonAr : r.reason}</td>
                    <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedReturn(r)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل (تجريبي)' : 'Edit (demo)', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail */}
      <Modal
        isOpen={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        title={locale === 'ar' ? 'تفاصيل المرتجع' : 'Return Details'}
        size="lg"
      >
        {selectedReturn && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedReturn.returnNumber}</h3>
                <p className="text-sm text-gray-500">{selectedReturn.invoiceNumber}</p>
              </div>
              {getStatusBadge(selectedReturn.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'العميل' : 'Customer'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedReturn.customerAr : selectedReturn.customer}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'القيمة' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedReturn.amount)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedReturn.requestDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'السبب' : 'Reason'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedReturn.reasonAr : selectedReturn.reason}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button
                onClick={() => showToast(locale === 'ar' ? 'تمت الموافقة (تجريبي)' : 'Approved (demo)', 'success')}
              >
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'موافقة' : 'Approve'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => showToast(locale === 'ar' ? 'تم الاستلام (تجريبي)' : 'Picked up (demo)', 'info')}
              >
                <TruckIcon className="h-4 w-4" />
                {locale === 'ar' ? 'استلام' : 'Pick Up'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => showToast(locale === 'ar' ? 'تم الاسترجاع المالي (تجريبي)' : 'Refunded (demo)', 'success')}
              >
                <CurrencyDollarIcon className="h-4 w-4" />
                {locale === 'ar' ? 'استرجاع' : 'Refund'}
              </Button>
              <Button
                variant="danger"
                onClick={() => showToast(locale === 'ar' ? 'تم الرفض (تجريبي)' : 'Rejected (demo)', 'error')}
              >
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'رفض' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={locale === 'ar' ? 'طلب إرجاع جديد' : 'New Return'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder="INV-2024-000"
            />
            <Input
              label={locale === 'ar' ? 'القيمة' : 'Amount'}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              inputMode="decimal"
            />
            <Input
              label={locale === 'ar' ? 'العميل (EN)' : 'Customer (EN)'}
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
            />
            <Input
              label={locale === 'ar' ? 'العميل (AR)' : 'Customer (AR)'}
              value={formData.customerAr}
              onChange={(e) => setFormData({ ...formData, customerAr: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              multiline
              rows={3}
              label={locale === 'ar' ? 'السبب (EN)' : 'Reason (EN)'}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
            <Input
              multiline
              rows={3}
              label={locale === 'ar' ? 'السبب (AR)' : 'Reason (AR)'}
              value={formData.reasonAr}
              onChange={(e) => setFormData({ ...formData, reasonAr: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إرسال' : 'Submit'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
