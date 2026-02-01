import { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../components/layout/MainLayout';
import { withPermission } from '../utils/withPermission';
import { MenuPermissions } from '../config/menu.permissions';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../contexts/ToastContext';
import { useLocale } from '../contexts/LocaleContext';
import apiClient from '../lib/apiClient';
import {
  TruckIcon,
  PlusIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  InboxStackIcon,
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  ClockIcon,
  XCircleIcon,
  BanknotesIcon,
  DocumentTextIcon,
  FunnelIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

// Types
type ShipmentRow = {
  id: number;
  shipment_number: string;
  shipment_type_name_en?: string | null;
  shipment_type_name_ar?: string | null;
  project_id: number;
  incoterm: string;
  bl_no?: string | null;
  awb_no?: string | null;
  expected_arrival_date?: string | null;
  locked_at?: string | null;
  created_at?: string | null;
  status_code?: string | null;
  stage_code?: string | null;
  vendor_id?: number | null;
  vendor_name?: string | null;
  vendor_code?: string | null;
  purchase_order_id?: number | null;
  po_number?: string | null;
  po_total_amount?: number | null;
  po_paid_amount?: number | null;
  po_remaining_amount?: number | null;
  po_currency_code?: string | null;
  po_currency_symbol?: string | null;
  actual_currency_code?: string | null;
  actual_currency_symbol?: string | null;
  exchange_rate?: number | null;
  total_expenses_sar?: number | null;
  items_preview?: { item_name: string; item_name_ar: string; quantity: number; unit_code: string }[] | null;
  items_count?: number;
  customs_declaration_number?: string | null;
  customs_status_code?: string | null;
  lc_number?: string | null;
  lc_amount?: number | null;
  containers?: { bill_number: string; container_type: string; containers_count: number; container_numbers: string[] }[] | null;
  containers_count?: number;
};

type SummaryData = {
  total_shipments: number;
  active_shipments: number;
  received_shipments: number;
  cancelled_shipments: number;
  total_po_value: number;
  total_paid: number;
  total_remaining: number;
  total_expenses_sar: number;
  total_containers?: number;
  containers: { container_type: string; count: number }[];
  amounts_by_currency?: Record<string, { total: number; paid: number; symbol: string }>;
  currency: string;
};

type ListResponse = {
  success: boolean;
  data: ShipmentRow[];
  total: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
};

type SummaryResponse = {
  success: boolean;
  data: SummaryData;
};

// Tab types
type TabType = 'active' | 'received' | 'cancelled';

function ShipmentsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRTL = locale === 'ar';

  const mode = (router.query.mode as string | undefined) ?? 'shipments';

  // State
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Export/Import state
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    total: number;
    created: number;
    updated: number;
    errors: { row: number; message: string }[];
    shipments: { shipment_number: string; id?: number; action: string }[];
  } | null>(null);
  const [dryRunMode, setDryRunMode] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Generate years for filter (last 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: isRTL ? 'يناير' : 'January' },
    { value: 2, label: isRTL ? 'فبراير' : 'February' },
    { value: 3, label: isRTL ? 'مارس' : 'March' },
    { value: 4, label: isRTL ? 'أبريل' : 'April' },
    { value: 5, label: isRTL ? 'مايو' : 'May' },
    { value: 6, label: isRTL ? 'يونيو' : 'June' },
    { value: 7, label: isRTL ? 'يوليو' : 'July' },
    { value: 8, label: isRTL ? 'أغسطس' : 'August' },
    { value: 9, label: isRTL ? 'سبتمبر' : 'September' },
    { value: 10, label: isRTL ? 'أكتوبر' : 'October' },
    { value: 11, label: isRTL ? 'نوفمبر' : 'November' },
    { value: 12, label: isRTL ? 'ديسمبر' : 'December' },
  ];

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const qs = new URLSearchParams();
      if (selectedYear) qs.set('year', String(selectedYear));
      if (selectedMonth) qs.set('month', String(selectedMonth));
      
      const res = await apiClient.get<SummaryResponse>(`/api/logistics-shipments/summary?${qs.toString()}`);
      setSummary(res.data);
    } catch (err: any) {
      console.error('Error fetching summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  // Fetch shipments
  const fetchShipments = useCallback(async (search?: string, page = 1) => {
    setLoading(true);
    try {
      setError(null);
      const qs = new URLSearchParams();
      if (search && search.trim()) qs.set('search', search.trim());
      qs.set('status', activeTab);
      qs.set('page', String(page));
      qs.set('limit', '20');
      if (selectedYear) qs.set('year', String(selectedYear));
      if (selectedMonth) qs.set('month', String(selectedMonth));
      
      const res = await apiClient.get<ListResponse>(`/api/logistics-shipments?${qs.toString()}`, { cache: 'no-store' });
      setShipments(res.data || []);
      if (res.pagination) {
        setCurrentPage(res.pagination.currentPage);
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.totalItems);
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to load shipments';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedYear, selectedMonth, showToast]);

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchShipments(searchTerm, 1);
  }, [activeTab, selectedYear, selectedMonth]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchShipments(searchTerm, 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Export shipments to Excel
  async function handleExport() {
    setExporting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/logistics-shipments/export-excel', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to export shipments');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipments_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(isRTL ? 'تم تصدير الشحنات بنجاح' : 'Shipments exported successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export shipments', 'error');
    } finally {
      setExporting(false);
    }
  }

  // Download import template
  async function handleDownloadTemplate() {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/logistics-shipments/export-template', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shipments_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(isRTL ? 'تم تحميل القالب بنجاح' : 'Template downloaded successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to download template', 'error');
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showToast(isRTL ? 'يرجى اختيار ملف Excel فقط' : 'Please select an Excel file only', 'error');
        return;
      }
      setImportFile(file);
      setImportResults(null);
    }
  }

  async function handleImport(dryRun: boolean = true) {
    if (!importFile) {
      showToast(isRTL ? 'يرجى اختيار ملف' : 'Please select a file', 'error');
      return;
    }

    setImporting(true);
    setDryRunMode(dryRun);
    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', importFile);

      const url = `http://localhost:4000/api/logistics-shipments/import-excel${dryRun ? '?dryRun=true' : ''}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error?.message || 'Failed to import shipments');

      setImportResults(result.data);

      if (!dryRun) {
        showToast(
          isRTL 
            ? `تم استيراد الشحنات: ${result.data.created} جديد، ${result.data.updated} محدث` 
            : `Import complete: ${result.data.created} created, ${result.data.updated} updated`,
          result.data.errors.length > 0 ? 'warning' : 'success'
        );
        fetchShipments();
        fetchSummary();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to import shipments', 'error');
    } finally {
      setImporting(false);
    }
  }

  function resetImportModal() {
    setImportFile(null);
    setImportResults(null);
    setImportModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearFilters() {
    setSelectedYear(null);
    setSelectedMonth(null);
  }

  // Format currency
  function formatCurrency(amount: number, currency = 'SAR') {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  // Format number
  function formatNumber(num: number) {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA').format(num);
  }

  // Get status badge
  function getStatusBadge(statusCode: string | null | undefined) {
    const status = (statusCode || '').toLowerCase();
    const statusMap: Record<string, { label: string; labelAr: string; color: string }> = {
      pending: { label: 'Pending', labelAr: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
      in_transit: { label: 'In Transit', labelAr: 'في الطريق', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      arrived: { label: 'Arrived', labelAr: 'وصلت', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      delivered: { label: 'Delivered', labelAr: 'تم التسليم', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      received: { label: 'Received', labelAr: 'مستلمة', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      completed: { label: 'Completed', labelAr: 'مكتملة', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      cancelled: { label: 'Cancelled', labelAr: 'ملغية', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
      canceled: { label: 'Cancelled', labelAr: 'ملغية', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
      customs: { label: 'At Customs', labelAr: 'في الجمارك', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      customs_clearance: { label: 'Customs Clearance', labelAr: 'تخليص جمركي', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
    };
    const info = statusMap[status] || { label: statusCode || '-', labelAr: statusCode || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>
        {isRTL ? info.labelAr : info.label}
      </span>
    );
  }

  // Calculate shipment financials
  function getShipmentFinancials(shipment: ShipmentRow) {
    const poTotal = Number(shipment.po_total_amount || 0);
    const poPaid = Number(shipment.po_paid_amount || 0);
    const poRemaining = Number(shipment.po_remaining_amount ?? (poTotal - poPaid));
    const exchangeRate = Number(shipment.exchange_rate || 1);
    const expenses = Number(shipment.total_expenses_sar || 0);
    const currency = shipment.actual_currency_code || shipment.po_currency_code || 'SAR';
    const symbol = shipment.actual_currency_symbol || shipment.po_currency_symbol || 'ر.س.';
    
    return {
      totalInvoice: poTotal,
      totalInvoiceBase: poTotal * exchangeRate,
      paid: poPaid,
      paidBase: poPaid * exchangeRate,
      remaining: poRemaining,
      remainingBase: poRemaining * exchangeRate,
      expenses,
      currency,
      symbol,
    };
  }

  if (!hasPermission(MenuPermissions.Logistics.Shipments.View)) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{isRTL ? 'الوصول مرفوض' : 'Access denied'}</p>
        </div>
      </MainLayout>
    );
  }

  const tabs: { key: TabType; label: string; labelAr: string; icon: React.ReactNode; count: number }[] = [
    { key: 'active', label: 'Active Shipments', labelAr: 'الشحنات النشطة', icon: <TruckIcon className="w-5 h-5" />, count: summary?.active_shipments || 0 },
    { key: 'received', label: 'Received Shipments', labelAr: 'الشحنات المستلمة', icon: <CheckCircleIcon className="w-5 h-5" />, count: summary?.received_shipments || 0 },
    { key: 'cancelled', label: 'Cancelled Shipments', labelAr: 'الشحنات الملغية', icon: <XCircleIcon className="w-5 h-5" />, count: summary?.cancelled_shipments || 0 },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'الشحنات - SLMS' : 'Shipments - SLMS'}</title>
      </Head>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <TruckIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isRTL ? 'الشحنات' : 'Shipments'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isRTL ? 'إدارة وتتبع جميع الشحنات' : 'Manage and track all shipments'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleExport} variant="secondary" disabled={exporting} size="sm">
              {exporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <ArrowDownTrayIcon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline ms-1">{isRTL ? 'تصدير' : 'Export'}</span>
            </Button>

            {hasPermission(MenuPermissions.Logistics.Shipments.Create) && (
              <Button onClick={() => setImportModalOpen(true)} variant="secondary" size="sm">
                <ArrowUpTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline ms-1">{isRTL ? 'استيراد' : 'Import'}</span>
              </Button>
            )}

            {hasPermission(MenuPermissions.Logistics.Shipments.Create) && (
              <Button onClick={() => router.push('/shipments/create')} variant="primary" size="sm">
                <PlusIcon className="w-4 h-4" />
                <span className="ms-1">{isRTL ? 'شحنة جديدة' : 'New Shipment'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {/* Total Shipments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'إجمالي الشحنات' : 'Total Shipments'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryLoading ? '...' : formatNumber(summary?.total_shipments || 0)}
              </p>
            </div>
            <TruckIcon className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        {/* Active Shipments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'الشحنات النشطة' : 'Active'}</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {summaryLoading ? '...' : formatNumber(summary?.active_shipments || 0)}
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        {/* Total PO Value */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'إجمالي القيمة' : 'Total Value'}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {summaryLoading ? '...' : formatCurrency(summary?.total_po_value || 0)}
              </p>
            </div>
            <BanknotesIcon className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'المدفوع' : 'Paid'}</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">
                {summaryLoading ? '...' : formatCurrency(summary?.total_paid || 0)}
              </p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-emerald-500 opacity-50" />
          </div>
        </div>

        {/* Remaining */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'المتبقي' : 'Remaining'}</p>
              <p className="text-lg font-bold text-orange-600 mt-1">
                {summaryLoading ? '...' : formatCurrency(summary?.total_remaining || 0)}
              </p>
            </div>
            <CurrencyDollarIcon className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'المصاريف' : 'Expenses'}</p>
              <p className="text-lg font-bold text-red-600 mt-1">
                {summaryLoading ? '...' : formatCurrency(summary?.total_expenses_sar || 0)}
              </p>
            </div>
            <DocumentTextIcon className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>

        {/* Total Containers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-cyan-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'عدد الحاويات' : 'Containers'}</p>
              <p className="text-lg font-bold text-cyan-600 mt-1">
                {summaryLoading ? '...' : formatNumber(summary?.total_containers || 0)}
              </p>
              {summary?.containers && summary.containers.length > 0 && (
                <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                  {summary.containers.slice(0, 3).map((c: any) => (
                    <div key={c.container_type}>
                      {c.container_type}: {c.count}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <CubeIcon className="w-8 h-8 text-cyan-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Containers Summary */}
      {summary?.containers && summary.containers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <CubeIcon className="w-5 h-5" />
            {isRTL ? 'الحاويات' : 'Containers'}
          </h3>
          <div className="flex flex-wrap gap-3">
            {summary.containers.map((c, idx) => (
              <div key={idx} className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">{formatNumber(c.count)}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{c.container_type || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={isRTL ? 'بحث برقم الشحنة، المورد، BL أو AWB...' : 'Search by shipment no, vendor, BL or AWB...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Toggle */}
          <Button 
            variant="secondary" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <FunnelIcon className="w-5 h-5" />
            {isRTL ? 'فلترة' : 'Filter'}
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'السنة' : 'Year'}
              </label>
              <select
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                className="block w-32 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">{isRTL ? 'الكل' : 'All'}</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'الشهر' : 'Month'}
              </label>
              <select
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
                className="block w-36 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">{isRTL ? 'الكل' : 'All'}</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {(selectedYear || selectedMonth) && (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                <XMarkIcon className="w-4 h-4" />
                {isRTL ? 'مسح' : 'Clear'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span>{isRTL ? tab.labelAr : tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {formatNumber(tab.count)}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{isRTL ? 'جاري التحميل...' : 'Loading shipments...'}</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-8 text-center">
            <TruckIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">{isRTL ? 'لا توجد شحنات' : 'No shipments found'}</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm mt-2"
              >
                {isRTL ? 'مسح البحث' : 'Clear search'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'رقم الشحنة' : 'Shipment No'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'المورد' : 'Vendor'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'الصنف' : 'Item'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'الكمية' : 'Qty'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'إجمالي الفاتورة' : 'Invoice Total'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'المدفوع' : 'Paid'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'المتبقي' : 'Remaining'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'المصاريف (SAR)' : 'Expenses (SAR)'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'رقم البوليصة' : 'BL/AWB'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'الوصول المتوقع' : 'ETA'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'حالة التخليص' : 'Customs Status'}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {isRTL ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {shipments.map((shipment) => {
                  const fin = getShipmentFinancials(shipment);
                  const items = shipment.items_preview || [];
                  const firstItem = items[0];
                  
                  return (
                    <tr
                      key={shipment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      {/* Shipment Number */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">{shipment.shipment_number}</span>
                          {shipment.locked_at && (
                            <span className="text-xs text-gray-500">🔒</span>
                          )}
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-white">{shipment.vendor_name || '-'}</span>
                          {shipment.vendor_code && (
                            <span className="text-xs text-gray-500">{shipment.vendor_code}</span>
                          )}
                        </div>
                      </td>

                      {/* Item */}
                      <td className="px-4 py-3">
                        {firstItem ? (
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white">
                              {isRTL ? firstItem.item_name_ar || firstItem.item_name : firstItem.item_name}
                            </span>
                            {(shipment.items_count || 0) > 1 && (
                              <span className="text-xs text-blue-600">
                                +{(shipment.items_count || 0) - 1} {isRTL ? 'أصناف أخرى' : 'more items'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {firstItem ? (
                          <span>{formatNumber(firstItem.quantity)} {firstItem.unit_code}</span>
                        ) : '-'}
                      </td>

                      {/* Invoice Total */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {fin.currency !== 'SAR' ? `${fin.currency} ${formatNumber(fin.totalInvoice)}` : formatCurrency(fin.totalInvoice)}
                          </span>
                          {fin.currency !== 'SAR' && (
                            <span className="text-xs text-gray-500">≈ {formatCurrency(fin.totalInvoiceBase)}</span>
                          )}
                        </div>
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {fin.currency !== 'SAR' ? `${fin.currency} ${formatNumber(fin.paid)}` : formatCurrency(fin.paid)}
                          </span>
                          {fin.currency !== 'SAR' && fin.paidBase > 0 && (
                            <span className="text-xs text-gray-500">≈ {formatCurrency(fin.paidBase)}</span>
                          )}
                        </div>
                      </td>

                      {/* Remaining */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            {fin.currency !== 'SAR' ? `${fin.currency} ${formatNumber(fin.remaining)}` : formatCurrency(fin.remaining)}
                          </span>
                          {fin.currency !== 'SAR' && fin.remainingBase > 0 && (
                            <span className="text-xs text-gray-500">≈ {formatCurrency(fin.remainingBase)}</span>
                          )}
                        </div>
                      </td>

                      {/* Expenses */}
                      <td className="px-4 py-3 text-red-600 font-medium">
                        {formatCurrency(fin.expenses)}
                      </td>

                      {/* BL/AWB */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {shipment.bl_no || shipment.awb_no || '-'}
                      </td>

                      {/* ETA */}
                      <td className="px-4 py-3">
                        {shipment.expected_arrival_date ? (
                          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span>{new Date(shipment.expected_arrival_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-GB')}</span>
                          </div>
                        ) : '-'}
                      </td>

                      {/* Customs Status */}
                      <td className="px-4 py-3">
                        {shipment.customs_status_code ? (
                          getStatusBadge(shipment.customs_status_code)
                        ) : (
                          getStatusBadge(shipment.status_code)
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-end">
                        <button
                          onClick={() => router.push(`/shipments/${shipment.id}`)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 inline-flex items-center gap-1"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span className="hidden sm:inline">{isRTL ? 'عرض' : 'View'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRTL 
                ? `عرض ${((currentPage - 1) * 20) + 1} - ${Math.min(currentPage * 20, totalItems)} من ${totalItems}`
                : `Showing ${((currentPage - 1) * 20) + 1} - ${Math.min(currentPage * 20, totalItems)} of ${totalItems}`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => fetchShipments(searchTerm, currentPage - 1)}
              >
                {isRTL ? 'السابق' : 'Previous'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => fetchShipments(searchTerm, currentPage + 1)}
              >
                {isRTL ? 'التالي' : 'Next'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={resetImportModal}
        title={isRTL ? 'استيراد الشحنات من Excel' : 'Import Shipments from Excel'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Download Template Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <DocumentArrowDownIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  {isRTL ? 'قالب الاستيراد' : 'Import Template'}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {isRTL 
                    ? 'قم بتحميل القالب وتعبئته بالبيانات، ثم ارفعه للاستيراد'
                    : 'Download the template, fill in your data, then upload it for import'}
                </p>
                <Button onClick={handleDownloadTemplate} variant="secondary" className="mt-3" size="sm">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span className="ms-2">{isRTL ? 'تحميل القالب' : 'Download Template'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isRTL ? 'اختر ملف Excel' : 'Select Excel File'}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
                file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                dark:file:bg-blue-900/30 dark:file:text-blue-300
                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 file:cursor-pointer cursor-pointer"
            />
            {importFile && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {isRTL ? 'الملف المحدد:' : 'Selected file:'} <span className="font-medium">{importFile.name}</span>
              </p>
            )}
          </div>

          {/* Import Actions */}
          {importFile && !importResults && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => handleImport(true)} variant="secondary" disabled={importing}>
                {importing && dryRunMode ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
                <span className="ms-2">{isRTL ? 'معاينة' : 'Preview'}</span>
              </Button>
              <Button onClick={() => handleImport(false)} variant="primary" disabled={importing}>
                {importing && !dryRunMode ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <ArrowUpTrayIcon className="w-5 h-5" />
                )}
                <span className="ms-2">{isRTL ? 'استيراد' : 'Import'}</span>
              </Button>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{importResults.total}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'إجمالي' : 'Total'}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{importResults.created}</p>
                  <p className="text-xs text-green-600">{isRTL ? 'جديد' : 'New'}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{importResults.updated}</p>
                  <p className="text-xs text-blue-600">{isRTL ? 'تحديث' : 'Updated'}</p>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400 mb-2">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="font-medium">{importResults.errors.length} {isRTL ? 'أخطاء' : 'Errors'}</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResults.errors.map((err, idx) => (
                      <p key={idx} className="text-sm text-red-700 dark:text-red-300">
                        {isRTL ? `صف ${err.row}:` : `Row ${err.row}:`} {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t dark:border-gray-600">
                {dryRunMode && importResults.errors.length === 0 && (
                  <Button onClick={() => handleImport(false)} variant="primary" disabled={importing}>
                    {importing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <CheckCircleIcon className="w-5 h-5" />}
                    <span className="ms-2">{isRTL ? 'تأكيد' : 'Confirm'}</span>
                  </Button>
                )}
                <Button onClick={resetImportModal} variant="secondary">
                  <XMarkIcon className="w-5 h-5" />
                  <span className="ms-2">{isRTL ? 'إغلاق' : 'Close'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Logistics.Shipments.View, ShipmentsPage);
