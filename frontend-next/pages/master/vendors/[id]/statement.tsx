/**
 * Vendor Statement Page - كشف حساب المورد
 * Professional account statement with filtering, export, and print capabilities
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layout/MainLayout';
import { withAnyPermission } from '../../../../utils/withPermission';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useLocale } from '../../../../contexts/LocaleContext';
import { useToast } from '../../../../contexts/ToastContext';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  DocumentPlusIcon,
  ReceiptRefundIcon,
  MinusCircleIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

// ========================================
// INTERFACES
// ========================================

interface VendorInfo {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
  currency_code: string;
  currency_symbol?: string;
  opening_balance?: number;
  credit_limit?: number;
}

interface StatementEntry {
  id: number;
  transaction_date: string;
  document_type: 'opening_balance' | 'purchase_order' | 'purchase_invoice' | 'payment' | 'credit_note' | 'debit_note' | 'adjustment';
  document_number: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string;
  due_date?: string;
  payment_status?: string;
}

interface StatementSummary {
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  period_start: string;
  period_end: string;
}

// ========================================
// HELPER COMPONENTS
// ========================================

function TransactionTypeIcon({ type }: { type: string }) {
  const iconClass = "w-5 h-5";
  
  switch (type) {
    case 'purchase_order':
      return <DocumentTextIcon className={`${iconClass} text-blue-500`} />;
    case 'purchase_invoice':
      return <DocumentPlusIcon className={`${iconClass} text-red-500`} />;
    case 'payment':
      return <BanknotesIcon className={`${iconClass} text-green-500`} />;
    case 'credit_note':
      return <MinusCircleIcon className={`${iconClass} text-blue-500`} />;
    case 'debit_note':
      return <PlusCircleIcon className={`${iconClass} text-orange-500`} />;
    case 'adjustment':
      return <ReceiptRefundIcon className={`${iconClass} text-purple-500`} />;
    default:
      return <DocumentTextIcon className={`${iconClass} text-gray-400`} />;
  }
}

function getTransactionLabel(type: string, isArabic: boolean): string {
  const labels: Record<string, { en: string; ar: string }> = {
    opening_balance: { en: 'Opening Balance', ar: 'رصيد افتتاحي' },
    purchase_order: { en: 'Purchase Order', ar: 'أمر شراء' },
    purchase_invoice: { en: 'Invoice', ar: 'فاتورة' },
    payment: { en: 'Payment', ar: 'دفعة' },
    credit_note: { en: 'Credit Note', ar: 'إشعار دائن' },
    debit_note: { en: 'Debit Note', ar: 'إشعار مدين' },
    adjustment: { en: 'Adjustment', ar: 'تسوية' },
  };
  return labels[type]?.[isArabic ? 'ar' : 'en'] || type;
}

// ========================================
// MAIN COMPONENT
// ========================================

function VendorStatementPage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';
  const printRef = useRef<HTMLDivElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  
  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [isArabic]);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [isArabic]);

  // Fetch vendor info
  const fetchVendor = useCallback(async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVendor(data.data);
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
    }
  }, [id]);

  // Fetch statement - combines POs, Invoices, and Payments
  const fetchStatement = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch POs, Invoices, and Payments in parallel
      const [posRes, invoicesRes, paymentsRes] = await Promise.all([
        fetch(`http://localhost:4000/api/procurement/vendors/${id}/purchase-orders?limit=500`, { headers }),
        fetch(`http://localhost:4000/api/procurement/vendors/${id}/invoices?limit=500`, { headers }),
        fetch(`http://localhost:4000/api/procurement/vendors/${id}/payments?limit=500`, { headers }),
      ]);

      const [posData, invoicesData, paymentsData] = await Promise.all([
        posRes.ok ? posRes.json() : { data: [] },
        invoicesRes.ok ? invoicesRes.json() : { data: [] },
        paymentsRes.ok ? paymentsRes.json() : { data: [] },
      ]);

      // Combine and transform into statement entries
      const allEntries: StatementEntry[] = [];
      // Ensure opening_balance is a number (it might come as string from API)
      let runningBalance = parseFloat(String(vendor?.opening_balance || 0)) || 0;

      // Opening balance entry
      allEntries.push({
        id: 0,
        transaction_date: dateFrom,
        document_type: 'opening_balance',
        document_number: '-',
        description: isArabic ? 'رصيد افتتاحي' : 'Opening Balance',
        debit: 0,
        credit: 0,
        balance: runningBalance,
      });

      // Helper function to normalize date to YYYY-MM-DD format for comparison
      const normalizeDate = (dateStr: string): string => {
        if (!dateStr) return '';
        return dateStr.split('T')[0];
      };

      // Add Purchase Orders (debit - increases balance owed)
      (posData.data || []).forEach((po: any, idx: number) => {
        const poDateRaw = po.order_date || po.document_date || po.created_at;
        const poDate = normalizeDate(poDateRaw);
        if (poDate >= dateFrom && poDate <= dateTo) {
          allEntries.push({
            id: 10000 + idx,
            transaction_date: poDateRaw,
            document_type: 'purchase_order',
            document_number: po.po_number || po.order_number || `PO-${po.id}`,
            description: po.description || (isArabic ? 'أمر شراء' : 'Purchase Order'),
            debit: parseFloat(po.total_amount || 0),
            credit: 0,
            balance: 0, // Will be calculated
            reference: po.reference_number,
          });
        }
      });

      // Add Invoices (debit - increases balance owed)
      (invoicesData.data || []).forEach((inv: any, idx: number) => {
        const invDateRaw = inv.invoice_date || inv.document_date || inv.created_at;
        const invDate = normalizeDate(invDateRaw);
        if (invDate >= dateFrom && invDate <= dateTo) {
          allEntries.push({
            id: 20000 + idx,
            transaction_date: invDateRaw,
            document_type: 'purchase_invoice',
            document_number: inv.invoice_number || `INV-${inv.id}`,
            description: inv.description || (isArabic ? 'فاتورة مشتريات' : 'Purchase Invoice'),
            debit: parseFloat(inv.total_amount || 0),
            credit: 0,
            balance: 0,
            due_date: inv.due_date,
            payment_status: inv.payment_status || inv.status,
          });
        }
      });

      // Add Payments (credit - decreases balance owed)
      (paymentsData.data || []).forEach((pay: any, idx: number) => {
        const payDateRaw = pay.payment_date || pay.created_at;
        const payDate = normalizeDate(payDateRaw);
        if (payDate >= dateFrom && payDate <= dateTo) {
          allEntries.push({
            id: 30000 + idx,
            transaction_date: payDateRaw,
            document_type: 'payment',
            document_number: pay.payment_number || `PAY-${pay.id}`,
            description: pay.notes || pay.description || (isArabic ? 'دفعة' : 'Payment'),
            debit: 0,
            credit: parseFloat(pay.payment_amount || pay.amount || 0),
            balance: 0,
            reference: pay.reference_number,
          });
        }
      });

      // Sort by date
      allEntries.sort((a, b) => {
        if (a.document_type === 'opening_balance') return -1;
        if (b.document_type === 'opening_balance') return 1;
        return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      });

      // Calculate running balance
      allEntries.forEach((entry, idx) => {
        if (idx === 0) {
          // Opening balance already set
        } else {
          // Ensure all values are numbers to prevent NaN
          const debit = parseFloat(String(entry.debit)) || 0;
          const credit = parseFloat(String(entry.credit)) || 0;
          runningBalance = (parseFloat(String(runningBalance)) || 0) + debit - credit;
          entry.balance = runningBalance;
        }
      });

      // Filter by type if specified
      let filteredEntries = allEntries;
      if (typeFilter) {
        filteredEntries = allEntries.filter(e => 
          e.document_type === typeFilter || e.document_type === 'opening_balance'
        );
      }

      setEntries(filteredEntries);

      // Calculate summary
      const totalDebit = filteredEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalCredit = filteredEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
      setSummary({
        opening_balance: vendor?.opening_balance || 0,
        total_debit: totalDebit,
        total_credit: totalCredit,
        closing_balance: runningBalance,
        period_start: dateFrom,
        period_end: dateTo,
      });

    } catch (error) {
      console.error('Error fetching statement:', error);
      // Generate mock data as fallback
      generateMockStatement();
    } finally {
      setLoading(false);
    }
  }, [id, dateFrom, dateTo, typeFilter, vendor, isArabic]);

  // Generate mock statement for demonstration
  const generateMockStatement = () => {
    const mockEntries: StatementEntry[] = [];
    let runningBalance = vendor?.opening_balance || 0;
    
    // Opening balance
    mockEntries.push({
      id: 0,
      transaction_date: dateFrom,
      document_type: 'opening_balance',
      document_number: '-',
      description: isArabic ? 'رصيد افتتاحي' : 'Opening Balance',
      debit: 0,
      credit: 0,
      balance: runningBalance,
    });

    // Generate some sample transactions
    const now = new Date(dateTo);
    const start = new Date(dateFrom);
    const daysDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 1; i <= Math.min(daysDiff / 5, 20); i++) {
      const transDate = new Date(start);
      transDate.setDate(transDate.getDate() + (i * 5));
      
      // Invoice
      const invoiceAmount = Math.random() * 50000 + 5000;
      runningBalance += invoiceAmount;
      mockEntries.push({
        id: i * 2 - 1,
        transaction_date: transDate.toISOString(),
        document_type: 'purchase_invoice',
        document_number: `INV-${2024}${String(i).padStart(4, '0')}`,
        description: isArabic ? `فاتورة مشتريات رقم ${i}` : `Purchase Invoice #${i}`,
        debit: invoiceAmount,
        credit: 0,
        balance: runningBalance,
        due_date: new Date(transDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Payment (sometimes)
      if (Math.random() > 0.3) {
        const payDate = new Date(transDate);
        payDate.setDate(payDate.getDate() + 10);
        const paymentAmount = invoiceAmount * (Math.random() * 0.5 + 0.5);
        runningBalance -= paymentAmount;
        mockEntries.push({
          id: i * 2,
          transaction_date: payDate.toISOString(),
          document_type: 'payment',
          document_number: `PAY-${2024}${String(i).padStart(4, '0')}`,
          description: isArabic ? `دفعة للفاتورة ${i}` : `Payment for Invoice #${i}`,
          debit: 0,
          credit: paymentAmount,
          balance: runningBalance,
        });
      }
    }

    setEntries(mockEntries);
    setSummary({
      opening_balance: vendor?.opening_balance || 0,
      total_debit: mockEntries.reduce((sum, e) => sum + e.debit, 0),
      total_credit: mockEntries.reduce((sum, e) => sum + e.credit, 0),
      closing_balance: runningBalance,
      period_start: dateFrom,
      period_end: dateTo,
    });
  };

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  useEffect(() => {
    if (vendor) {
      fetchStatement();
    }
  }, [vendor, fetchStatement]);

  // Filtered and paginated entries
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (typeFilter) {
      result = result.filter(e => e.document_type === typeFilter);
    }
    return result;
  }, [entries, typeFilter]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage]);

  const totalPages = Math.ceil(filteredEntries.length / pageSize);

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Document', 'Description', 'Debit', 'Credit', 'Balance'];
    const rows = filteredEntries.map(e => [
      formatDate(e.transaction_date),
      getTransactionLabel(e.document_type, false),
      e.document_number,
      e.description,
      e.debit || '',
      e.credit || '',
      e.balance,
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendor_statement_${vendor?.code}_${dateFrom}_${dateTo}.csv`;
    link.click();
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  if (!vendor && !loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <BuildingOfficeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {isArabic ? 'المورد غير موجود' : 'Vendor Not Found'}
          </h2>
          <Button onClick={() => router.push('/master/vendors')}>
            {isArabic ? 'العودة للقائمة' : 'Back to List'}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{vendor?.name || ''} - {isArabic ? 'كشف حساب' : 'Statement'} | SLMS</title>
      </Head>

      <div className="space-y-6 print:space-y-4" ref={printRef}>
        {/* Header - Hidden in print */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isArabic ? 'كشف حساب المورد' : 'Vendor Statement'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {vendor?.code} - {isArabic && vendor?.name_ar ? vendor.name_ar : vendor?.name}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowFilters(!showFilters)}>
              <FunnelIcon className="w-4 h-4 mr-1" />
              {isArabic ? 'الفلاتر' : 'Filters'}
            </Button>
            <Button size="sm" variant="secondary" onClick={exportCSV}>
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              {isArabic ? 'تصدير' : 'Export'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handlePrint}>
              <PrinterIcon className="w-4 h-4 mr-1" />
              {isArabic ? 'طباعة' : 'Print'}
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">{isArabic ? 'كشف حساب المورد' : 'Vendor Statement'}</h1>
            <p className="text-gray-600">{isArabic ? 'نظام إدارة اللوجستيات الذكية' : 'Smart Logistics Management System'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4 mb-4">
            <div>
              <p><strong>{isArabic ? 'المورد:' : 'Vendor:'}</strong> {vendor?.name}</p>
              <p><strong>{isArabic ? 'الكود:' : 'Code:'}</strong> {vendor?.code}</p>
              {vendor?.tax_number && <p><strong>{isArabic ? 'الرقم الضريبي:' : 'Tax No:'}</strong> {vendor.tax_number}</p>}
            </div>
            <div className="text-right">
              <p><strong>{isArabic ? 'الفترة:' : 'Period:'}</strong> {formatDate(dateFrom)} - {formatDate(dateTo)}</p>
              <p><strong>{isArabic ? 'العملة:' : 'Currency:'}</strong> {vendor?.currency_code}</p>
              <p><strong>{isArabic ? 'تاريخ الطباعة:' : 'Print Date:'}</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                type="date"
                label={isArabic ? 'من تاريخ' : 'From Date'}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                type="date"
                label={isArabic ? 'إلى تاريخ' : 'To Date'}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'نوع المعاملة' : 'Transaction Type'}
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="input w-full"
                >
                  <option value="">{isArabic ? 'الكل' : 'All'}</option>
                  <option value="purchase_order">{isArabic ? 'أوامر الشراء' : 'Purchase Orders'}</option>
                  <option value="purchase_invoice">{isArabic ? 'فواتير' : 'Invoices'}</option>
                  <option value="payment">{isArabic ? 'مدفوعات' : 'Payments'}</option>
                  <option value="credit_note">{isArabic ? 'إشعارات دائنة' : 'Credit Notes'}</option>
                  <option value="debit_note">{isArabic ? 'إشعارات مدينة' : 'Debit Notes'}</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchStatement} className="w-full">
                  <ArrowPathIcon className="w-4 h-4 mr-1" />
                  {isArabic ? 'تحديث' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{isArabic ? 'الرصيد الافتتاحي' : 'Opening Balance'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summary.opening_balance)} <span className="text-sm font-normal">{vendor?.currency_code}</span>
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{isArabic ? 'إجمالي المدين' : 'Total Debit'}</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(summary.total_debit)} <span className="text-sm font-normal">{vendor?.currency_code}</span>
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{isArabic ? 'إجمالي الدائن' : 'Total Credit'}</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(summary.total_credit)} <span className="text-sm font-normal">{vendor?.currency_code}</span>
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">{isArabic ? 'الرصيد الختامي' : 'Closing Balance'}</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(summary.closing_balance)} <span className="text-sm font-normal">{vendor?.currency_code}</span>
              </p>
            </div>
          </div>
        )}

        {/* Statement Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{isArabic ? 'لا توجد حركات في هذه الفترة' : 'No transactions in this period'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right w-28">
                        {isArabic ? 'التاريخ' : 'Date'}
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right w-24 print:hidden">
                        {isArabic ? 'النوع' : 'Type'}
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right w-32">
                        {isArabic ? 'رقم المستند' : 'Document'}
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                        {isArabic ? 'الوصف' : 'Description'}
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right w-28">
                        {isArabic ? 'مدين' : 'Debit'}
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right w-28">
                        {isArabic ? 'دائن' : 'Credit'}
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right w-32">
                        {isArabic ? 'الرصيد' : 'Balance'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {paginatedEntries.map((entry, index) => (
                      <tr 
                        key={entry.id || index} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${entry.document_type === 'opening_balance' ? 'bg-gray-50 dark:bg-gray-700/50 font-semibold' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          {formatDate(entry.transaction_date)}
                        </td>
                        <td className="px-4 py-3 print:hidden">
                          <div className="flex items-center gap-2">
                            <TransactionTypeIcon type={entry.document_type} />
                            <span className="text-xs text-gray-500">
                              {getTransactionLabel(entry.document_type, isArabic)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                          {entry.document_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold whitespace-nowrap ${entry.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Footer */}
                  <tfoot className="bg-gray-100 dark:bg-gray-700 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                        {isArabic ? 'الإجمالي' : 'Total'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">
                        {formatCurrency(summary?.total_debit || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                        {formatCurrency(summary?.total_credit || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-blue-600 dark:text-blue-400">
                        {formatCurrency(summary?.closing_balance || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between print:hidden">
                  <span className="text-sm text-gray-500">
                    {isArabic 
                      ? `عرض ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredEntries.length)} من ${filteredEntries.length}`
                      : `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredEntries.length)} of ${filteredEntries.length}`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-8 pt-4 border-t text-sm text-gray-600">
          <div className="flex justify-between">
            <span>{isArabic ? 'تم الإنشاء بواسطة: SLMS' : 'Generated by: SLMS'}</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block {
            display: block !important;
            visibility: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #__next, .space-y-6, .space-y-6 * {
            visibility: visible;
          }
          .bg-white, .bg-gray-50, .dark\\:bg-gray-800, .dark\\:bg-gray-700 {
            background: white !important;
          }
          table {
            font-size: 10pt;
          }
          th, td {
            padding: 4px 8px !important;
          }
        }
      `}</style>
    </MainLayout>
  );
}

export default withAnyPermission(['vendors:statements:view', 'vendors:view'], VendorStatementPage);
