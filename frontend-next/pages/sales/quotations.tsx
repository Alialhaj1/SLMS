import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

interface SalesQuotation {
  id: number;
  quoteNumber: string;
  customer: string;
  customerAr: string;
  issueDate: string;
  validUntil: string;
  amount: number;
  status: QuoteStatus;
  items: number;
  notes?: string;
}

const mockQuotations: SalesQuotation[] = [
  { id: 1, quoteNumber: 'SQ-2024-001', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', issueDate: '2024-01-10', validUntil: '2024-01-25', amount: 185000, status: 'accepted', items: 6, notes: 'Includes delivery and insurance.' },
  { id: 2, quoteNumber: 'SQ-2024-002', customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', issueDate: '2024-01-18', validUntil: '2024-02-02', amount: 92000, status: 'sent', items: 3, notes: 'Awaiting customer confirmation.' },
  { id: 3, quoteNumber: 'SQ-2024-003', customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', issueDate: '2024-01-20', validUntil: '2024-01-30', amount: 44500, status: 'draft', items: 2 },
  { id: 4, quoteNumber: 'SQ-2024-004', customer: 'Premium Shipping LLC', customerAr: 'الشحن المتميز ذ.م.م', issueDate: '2024-01-05', validUntil: '2024-01-12', amount: 310000, status: 'expired', items: 9 },
  { id: 5, quoteNumber: 'SQ-2024-005', customer: 'Eastern Transport', customerAr: 'النقل الشرقي', issueDate: '2024-01-22', validUntil: '2024-02-05', amount: 127500, status: 'rejected', items: 5, notes: 'Rejected due to timeline.' },
];

export default function QuotationsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const [quotations] = useState<SalesQuotation[]>(mockQuotations);
  const [selectedStatus, setSelectedStatus] = useState<'all' | QuoteStatus>('all');
  const [selectedQuote, setSelectedQuote] = useState<SalesQuotation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    customerAr: '',
    amount: '',
    validUntil: '',
    notes: '',
  });

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => selectedStatus === 'all' || q.status === selectedStatus);
  }, [quotations, selectedStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const getStatusBadge = (status: QuoteStatus) => {
    const styles: Record<QuoteStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      expired: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
    const labels: Record<QuoteStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      sent: { en: 'Sent', ar: 'مرسلة' },
      accepted: { en: 'Accepted', ar: 'مقبولة' },
      rejected: { en: 'Rejected', ar: 'مرفوضة' },
      expired: { en: 'Expired', ar: 'منتهية' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const totalQuotes = filteredQuotations.length;
  const totalValue = filteredQuotations.reduce((sum, q) => sum + q.amount, 0);
  const acceptedCount = quotations.filter(q => q.status === 'accepted').length;
  const openCount = quotations.filter(q => ['draft', 'sent'].includes(q.status)).length;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الحفظ (تجريبي)' : 'Saved (demo)', 'success');
    setCreateOpen(false);
    setFormData({ customer: '', customerAr: '', amount: '', validUntil: '', notes: '' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'عروض الأسعار - SLMS' : 'Sales Quotations - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'عروض الأسعار' : 'Sales Quotations'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة عروض الأسعار للعملاء وتحويلها لأوامر' : 'Manage customer quotations and convert to orders'}
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'عرض سعر جديد' : 'New Quotation'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><DocumentTextIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عدد العروض' : 'Quotations'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalQuotes}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مقبولة' : 'Accepted'}</p>
                <p className="text-xl font-semibold text-green-600">{acceptedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"><PaperAirplaneIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد المتابعة' : 'Open'}</p>
                <p className="text-xl font-semibold text-yellow-600">{openCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="sent">{locale === 'ar' ? 'مرسلة' : 'Sent'}</option>
                <option value="accepted">{locale === 'ar' ? 'مقبولة' : 'Accepted'}</option>
                <option value="rejected">{locale === 'ar' ? 'مرفوضة' : 'Rejected'}</option>
                <option value="expired">{locale === 'ar' ? 'منتهية' : 'Expired'}</option>
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الرقم' : 'Quote #'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القيمة' : 'Amount'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البنود' : 'Items'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الصلاحية' : 'Valid Until'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{q.quoteNumber}</p>
                      <p className="text-xs text-gray-500">{locale === 'ar' ? 'عرض سعر' : 'Quotation'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? q.customerAr : q.customer}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(q.amount)}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{q.items}</td>
                    <td className="px-4 py-3 text-gray-500">{q.issueDate}</td>
                    <td className="px-4 py-3 text-gray-500">{q.validUntil}</td>
                    <td className="px-4 py-3">{getStatusBadge(q.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedQuote(q)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل (تجريبي)' : 'Edit (demo)', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => showToast(locale === 'ar' ? 'إرسال (تجريبي)' : 'Send (demo)', 'info')}
                        >
                          <PaperAirplaneIcon className="h-4 w-4" />
                        </Button>
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
        isOpen={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        title={locale === 'ar' ? 'تفاصيل عرض السعر' : 'Quotation Details'}
        size="lg"
      >
        {selectedQuote && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedQuote.quoteNumber}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selectedQuote.customerAr : selectedQuote.customer}</p>
              </div>
              {getStatusBadge(selectedQuote.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'القيمة' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedQuote.amount)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الصلاحية حتى' : 'Valid Until'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedQuote.validUntil}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedQuote.issueDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'عدد البنود' : 'Items'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedQuote.items}</p>
              </div>
            </div>

            {selectedQuote.notes && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                <p className="text-sm text-gray-900 dark:text-white">{selectedQuote.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button
                onClick={() => showToast(locale === 'ar' ? 'تم الإرسال (تجريبي)' : 'Sent (demo)', 'success')}
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إرسال' : 'Send'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => showToast(locale === 'ar' ? 'تم التصدير (تجريبي)' : 'Exported (demo)', 'info')}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => showToast(locale === 'ar' ? 'تم قبول العرض (تجريبي)' : 'Accepted (demo)', 'success')}
              >
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'قبول' : 'Accept'}
              </Button>
              <Button
                variant="danger"
                onClick={() => showToast(locale === 'ar' ? 'تم رفض العرض (تجريبي)' : 'Rejected (demo)', 'error')}
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
        title={locale === 'ar' ? 'عرض سعر جديد' : 'New Quotation'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'العميل (EN)' : 'Customer (EN)'}
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              placeholder={locale === 'ar' ? 'اسم العميل' : 'Customer name'}
            />
            <Input
              label={locale === 'ar' ? 'العميل (AR)' : 'Customer (AR)'}
              value={formData.customerAr}
              onChange={(e) => setFormData({ ...formData, customerAr: e.target.value })}
              placeholder={locale === 'ar' ? 'اسم العميل بالعربية' : 'Arabic customer name'}
            />
            <Input
              label={locale === 'ar' ? 'القيمة' : 'Amount'}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              inputMode="decimal"
            />
            <Input
              label={locale === 'ar' ? 'الصلاحية حتى' : 'Valid Until'}
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <Input
            multiline
            rows={4}
            label={locale === 'ar' ? 'ملاحظات' : 'Notes'}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={locale === 'ar' ? 'أضف تفاصيل العرض...' : 'Add quotation details...'}
          />

          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
