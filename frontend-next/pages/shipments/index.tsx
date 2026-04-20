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
  TruckIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  EyeIcon,
  PencilIcon,
  MapPinIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  LockClosedIcon,
  CubeIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ============================================================
// Types & Constants
// ============================================================
const STATUS_CONFIG: Record<string, { label: string; labelEn: string; color: string; icon: any; bg: string; text: string }> = {
  draft:              { label: 'مسودة',         labelEn: 'Draft',              color: 'gray',    icon: ClipboardDocumentListIcon, bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  confirmed:          { label: 'مؤكد',          labelEn: 'Confirmed',          color: 'blue',    icon: CheckCircleIcon,           bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
  in_transit:         { label: 'في الطريق',     labelEn: 'In Transit',         color: 'amber',   icon: TruckIcon,                 bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300' },
  at_port:            { label: 'في الميناء',    labelEn: 'At Port',            color: 'indigo',  icon: CubeIcon,                  bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300' },
  customs_clearance:  { label: 'تخليص جمركي',   labelEn: 'Customs Clearance',  color: 'orange',  icon: ExclamationTriangleIcon,    bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300' },
  arrived:            { label: 'وصلت',          labelEn: 'Arrived',            color: 'teal',    icon: CheckCircleIcon,           bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-300' },
  delivered:          { label: 'تم التسليم',    labelEn: 'Delivered',          color: 'green',   icon: CheckCircleIcon,           bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
  received:           { label: 'مستلمة',        labelEn: 'Received',           color: 'green',   icon: CheckCircleIcon,           bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
  completed:          { label: 'مكتملة',        labelEn: 'Completed',          color: 'emerald', icon: CheckCircleIcon,           bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300' },
  cancelled:          { label: 'ملغية',         labelEn: 'Cancelled',          color: 'red',     icon: XCircleIcon,               bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300' },
};

const TYPE_CONFIG: Record<string, { label: string; labelEn: string; icon: string; color: string }> = {
  sea:  { label: 'بحري', labelEn: 'Sea',  icon: '🚢', color: 'blue' },
  air:  { label: 'جوي',  labelEn: 'Air',  icon: '✈️', color: 'sky' },
  land: { label: 'بري',  labelEn: 'Land', icon: '🚛', color: 'amber' },
};

interface Shipment {
  id: number;
  shipment_number: string;
  shipment_type_name_en: string;
  shipment_type_name_ar: string;
  shipment_type_code: string;
  status_code: string;
  stage_code: string;
  incoterm: string;
  bl_no: string;
  awb_no: string;
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  project_name_en: string;
  project_name_ar: string;
  project_code: string;
  origin_city_name: string;
  origin_city_name_ar: string;
  destination_city_name: string;
  destination_city_name_ar: string;
  port_of_loading_name: string;
  port_of_discharge_name: string;
  shipping_agent_name: string;
  warehouse_name: string;
  payment_method_name_en: string;
  payment_method_name_ar: string;
  actual_currency_code: string;
  actual_currency_symbol: string;
  currency_code: string;
  currency_symbol: string;
  total_amount: number;
  total_expenses_sar: number;
  po_number: string;
  po_total_amount: number;
  exchange_rate: number;
  lc_number: string;
  expected_arrival_date: string;
  actual_arrival_date: string;
  departure_date: string;
  items_count: number;
  items_preview: any[];
  containers_count: number;
  containers: any[];
  customs_declaration_number: string;
  locked_at: string;
  created_at: string;
  total_weight_kg: number;
  total_volume_cbm: number;
  packages_count: number;
}

interface SummaryData {
  total_shipments: number;
  active_shipments: number;
  received_shipments: number;
  cancelled_shipments: number;
  total_po_value: number;
  total_paid: number;
  total_remaining: number;
  total_expenses_sar: number;
  total_containers: number;
}

// ============================================================
// Helper Components
// ============================================================

function StatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {isRTL ? cfg.label : cfg.labelEn}
    </span>
  );
}

function TypeBadge({ typeCode, isRTL }: { typeCode: string; isRTL: boolean }) {
  const mode = typeCode?.toLowerCase();
  const cfg = TYPE_CONFIG[mode] || TYPE_CONFIG.sea;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium`}>
      <span>{cfg.icon}</span>
      <span>{isRTL ? cfg.label : cfg.labelEn}</span>
    </span>
  );
}

function SummaryCard({ title, value, subtitle, icon: Icon, color, onClick }: {
  title: string; value: string | number; subtitle?: string; icon: any; color: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left rtl:text-right w-full
        ${onClick ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer' : 'cursor-default'}
        bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
    >
      <div className="flex-shrink-0 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/20">
        <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </button>
  );
}

function formatCurrency(amount: number | string | null | undefined, currency?: string): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatDate(dateStr: string | null | undefined, isRTL: boolean): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return '-'; }
}

function getEtaDaysLeft(eta: string | null): { days: number; label: string; color: string } | null {
  if (!eta) return null;
  const etaDate = new Date(eta);
  const now = new Date();
  const diff = Math.ceil((etaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { days: Math.abs(diff), label: 'متأخرة', color: 'red' };
  if (diff === 0) return { days: 0, label: 'اليوم', color: 'orange' };
  if (diff <= 3) return { days: diff, label: `${diff} أيام`, color: 'amber' };
  return { days: diff, label: `${diff} يوم`, color: 'green' };
}

// ============================================================
// Main Component
// ============================================================
export default function ShipmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  // State
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<Shipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============================================================
  // Data Fetching
  // ============================================================
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(pageSize),
      };
      if (searchText) params.search = searchText;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (sortConfig) {
        params.sortBy = sortConfig.key;
        params.sortOrder = sortConfig.direction;
      }

      const res = await apiClient.get('/api/logistics-shipments', { params });
      setShipments(res.data || []);
      setTotalCount(res.pagination?.totalItems || res.total || 0);
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      showToast('error', isRTL ? 'فشل في تحميل الشحنات' : 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchText, statusFilter, sortConfig]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await apiClient.get('/api/logistics-shipments/summary');
      setSummary(res.data || null);
    } catch { /* silent */ } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // ============================================================
  // Actions
  // ============================================================
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/logistics-shipments/${deleteConfirm.id}`);
      showToast('success', isRTL ? 'تم حذف الشحنة بنجاح' : 'Shipment deleted successfully');
      setDeleteConfirm(null);
      fetchShipments();
      fetchSummary();
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.message || '';
      if (msg.includes('Cannot delete') || msg.includes('لا يمكن الحذف')) {
        showToast('error', msg);
      } else {
        showToast('error', isRTL ? 'فشل في حذف الشحنة' : 'Failed to delete shipment');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await apiClient.get('/api/logistics-shipments/export-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipments-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', isRTL ? 'تم تصدير البيانات' : 'Data exported');
    } catch {
      showToast('error', isRTL ? 'فشل في التصدير' : 'Export failed');
    }
  };

  // ============================================================
  // Table Columns
  // ============================================================
  const columns = [
    {
      key: 'shipment_number',
      label: isRTL ? 'رقم الشحنة' : 'Shipment #',
      sortable: true,
      width: '140px',
      render: (value: string, row: Shipment) => (
        <div className="flex flex-col">
          <button
            onClick={() => router.push(`/shipments/${row.id}`)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-sm transition-colors"
          >
            {value}
          </button>
          {row.locked_at && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
              <LockClosedIcon className="w-3 h-3" /> {isRTL ? 'مقفلة' : 'Locked'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'shipment_type_code',
      label: isRTL ? 'النوع' : 'Type',
      sortable: true,
      width: '100px',
      render: (_: any, row: Shipment) => (
        <TypeBadge typeCode={row.shipment_type_code || 'sea'} isRTL={isRTL} />
      ),
    },
    {
      key: 'vendor_name',
      label: isRTL ? 'المورد' : 'Vendor',
      sortable: true,
      render: (value: string, row: Shipment) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{value || '-'}</p>
          {row.vendor_code && (
            <p className="text-xs text-gray-400">{row.vendor_code}</p>
          )}
        </div>
      ),
    },
    {
      key: 'project_code',
      label: isRTL ? 'المشروع' : 'Project',
      sortable: true,
      render: (_: any, row: Shipment) => (
        <div className="min-w-0">
          <p className="text-sm text-gray-900 dark:text-white truncate">
            {isRTL ? row.project_name_ar : row.project_name_en || '-'}
          </p>
          {row.project_code && (
            <p className="text-xs text-gray-400">{row.project_code}</p>
          )}
        </div>
      ),
    },
    {
      key: 'origin_city_name',
      label: isRTL ? 'المنشأ → الوجهة' : 'Origin → Destination',
      sortable: false,
      render: (_: any, row: Shipment) => {
        const origin = isRTL ? (row.origin_city_name_ar || row.origin_city_name) : row.origin_city_name;
        const dest = isRTL ? (row.destination_city_name_ar || row.destination_city_name) : row.destination_city_name;
        return (
          <div className="text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">📍</span>
              <span className="text-gray-700 dark:text-gray-300">{origin || '-'}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-gray-500">🏁</span>
              <span className="text-gray-700 dark:text-gray-300">{dest || '-'}</span>
            </div>
            {(row.port_of_loading_name || row.port_of_discharge_name) && (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400">
                {row.port_of_loading_name && <span>⚓ {row.port_of_loading_name}</span>}
                {row.port_of_loading_name && row.port_of_discharge_name && <span>→</span>}
                {row.port_of_discharge_name && <span>⚓ {row.port_of_discharge_name}</span>}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status_code',
      label: isRTL ? 'الحالة' : 'Status',
      sortable: true,
      filterable: true,
      render: (value: string) => <StatusBadge status={value} isRTL={isRTL} />,
      filter: {
        type: 'select' as const,
        options: Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
          label: isRTL ? cfg.label : cfg.labelEn,
          value: key,
        })),
      },
    },
    {
      key: 'total_amount',
      label: isRTL ? 'القيمة' : 'Value',
      sortable: true,
      align: 'right' as const,
      render: (_: any, row: Shipment) => {
        const curr = row.actual_currency_code || row.currency_code || 'SAR';
        return (
          <div className="text-right rtl:text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatCurrency(row.total_amount || row.po_total_amount, curr)}
            </p>
            {Number(row.total_expenses_sar) > 0 && (
              <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">
                {isRTL ? 'مصروفات:' : 'Exp:'} {formatCurrency(row.total_expenses_sar, 'SAR')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'items_count',
      label: isRTL ? 'الأصناف' : 'Items',
      sortable: true,
      width: '80px',
      align: 'center' as const,
      render: (value: number) => (
        <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-medium
          ${value > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
          {value || 0}
        </span>
      ),
    },
    {
      key: 'expected_arrival_date',
      label: isRTL ? 'الوصول المتوقع' : 'ETA',
      sortable: true,
      width: '130px',
      render: (value: string, row: Shipment) => {
        const eta = getEtaDaysLeft(value);
        const isActive = !['delivered', 'received', 'completed', 'cancelled'].includes(row.status_code);
        return (
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(value, isRTL)}</p>
            {eta && isActive && (
              <span className={`text-[10px] font-medium ${
                eta.color === 'red' ? 'text-red-600 dark:text-red-400' :
                eta.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                eta.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {eta.days > 0 && eta.color === 'red'
                  ? (isRTL ? `متأخرة ${eta.days} يوم` : `${eta.days}d overdue`)
                  : eta.color === 'orange'
                    ? (isRTL ? 'اليوم!' : 'Today!')
                    : (isRTL ? `باقي ${eta.days} يوم` : `${eta.days}d left`)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'shipping_agent_name',
      label: isRTL ? 'وكيل الشحن' : 'Shipping Agent',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{value || '-'}</span>
      ),
    },
  ];

  // ============================================================
  // Row Actions
  // ============================================================
  const rowActions = [
    {
      id: 'view',
      label: isRTL ? 'فتح' : 'Open',
      icon: EyeIcon,
      onClick: (row: Shipment) => router.push(`/shipments/${row.id}`),
    },
    {
      id: 'edit',
      label: isRTL ? 'تعديل' : 'Edit',
      icon: PencilIcon,
      onClick: (row: Shipment) => router.push(`/shipments/${row.id}?tab=overview&edit=true`),
      condition: (row: Shipment) => !['delivered', 'received', 'completed', 'cancelled'].includes(row.status_code),
    },
    {
      id: 'track',
      label: isRTL ? 'تتبع' : 'Track',
      icon: MapPinIcon,
      onClick: (row: Shipment) => router.push(`/shipments/tracking?ref=${row.shipment_number}`),
    },
    {
      id: 'delete',
      label: isRTL ? 'حذف' : 'Delete',
      icon: TrashIcon,
      onClick: (row: Shipment) => setDeleteConfirm(row),
      variant: 'danger' as const,
      condition: (row: Shipment) => row.status_code === 'draft' && !row.locked_at,
    },
  ];

  // ============================================================
  // Render
  // ============================================================
  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'إدارة الشحنات' : 'Shipments Management'} - SLMS</title>
      </Head>

      <div className="space-y-6 p-1">
        {/* Header */}
        <PageHeader
          title={isRTL ? 'إدارة الشحنات' : 'Shipments Management'}
          description={isRTL ? 'عرض وإدارة جميع شحنات الشركة والتكاليف والمصروفات' : 'View and manage all company shipments, costs and expenses'}
          breadcrumbs={[
            { label: isRTL ? 'الرئيسية' : 'Home', href: '/dashboard' },
            { label: isRTL ? 'اللوجستيات' : 'Logistics', href: '/shipments' },
            { label: isRTL ? 'الشحنات' : 'Shipments' },
          ]}
          actions={[
            {
              id: 'new-shipment',
              label: isRTL ? 'شحنة جديدة' : 'New Shipment',
              onClick: () => router.push('/shipments/create'),
              variant: 'primary' as const,
              icon: PlusIcon,
            },
            {
              id: 'export-excel',
              label: isRTL ? 'تصدير Excel' : 'Export Excel',
              onClick: handleExportExcel,
              variant: 'secondary' as const,
              icon: ArrowDownTrayIcon,
            },
            {
              id: 'print',
              label: isRTL ? 'طباعة' : 'Print',
              onClick: () => window.print(),
              variant: 'secondary' as const,
              icon: PrinterIcon,
            },
          ]}
        />

        {/* Summary Cards */}
        {!summaryLoading && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
            <SummaryCard
              title={isRTL ? 'إجمالي الشحنات' : 'Total Shipments'}
              value={summary.total_shipments || 0}
              icon={TruckIcon}
              color="blue"
              onClick={() => setStatusFilter('all')}
            />
            <SummaryCard
              title={isRTL ? 'شحنات نشطة' : 'Active'}
              value={summary.active_shipments || 0}
              subtitle={isRTL ? 'قيد المعالجة' : 'In progress'}
              icon={ArrowPathIcon}
              color="amber"
              onClick={() => setStatusFilter('active')}
            />
            <SummaryCard
              title={isRTL ? 'مستلمة' : 'Received'}
              value={summary.received_shipments || 0}
              icon={CheckCircleIcon}
              color="green"
              onClick={() => setStatusFilter('received')}
            />
            <SummaryCard
              title={isRTL ? 'قيمة أوامر الشراء' : 'PO Value'}
              value={formatCurrency(summary.total_po_value, 'SAR')}
              subtitle={isRTL ? `المتبقي: ${formatCurrency(summary.total_remaining)}` : `Remaining: ${formatCurrency(summary.total_remaining)}`}
              icon={BanknotesIcon}
              color="indigo"
            />
            <SummaryCard
              title={isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}
              value={formatCurrency(summary.total_expenses_sar, 'SAR')}
              subtitle={isRTL ? `حاويات: ${summary.total_containers}` : `Containers: ${summary.total_containers}`}
              icon={ChartBarIcon}
              color="orange"
            />
          </div>
        )}

        {/* Status Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {isRTL ? 'تصفية:' : 'Filter:'}
          </span>
          {[
            { key: 'all', label: isRTL ? 'الكل' : 'All' },
            { key: 'active', label: isRTL ? 'نشطة' : 'Active' },
            { key: 'received', label: isRTL ? 'مستلمة' : 'Received' },
            { key: 'cancelled', label: isRTL ? 'ملغية' : 'Cancelled' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${statusFilter === f.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
            >
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative">
            <input
              type="text"
              placeholder={isRTL ? 'بحث برقم الشحنة أو المورد أو B/L...' : 'Search by shipment #, vendor, B/L...'}
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
              className="w-64 md:w-80 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <EnhancedTable
            data={shipments}
            columns={columns}
            actions={rowActions}
            loading={loading}
            selectable
            pagination={{
              page: currentPage,
              pageSize: pageSize,
              total: totalCount,
            }}
            onPaginationChange={(pag: any) => {
              setCurrentPage(pag.page);
              setPageSize(pag.pageSize);
            }}
            emptyMessage={isRTL ? 'لا توجد شحنات بعد. أنشئ أول شحنة!' : 'No shipments yet. Create your first shipment!'}
            bulkActions={[
              {
                id: 'bulk_export',
                label: isRTL ? 'تصدير المحدد' : 'Export Selected',
                icon: ArrowDownTrayIcon,
                onClick: (selectedRows: Shipment[]) => {
                  showToast('info', isRTL ? `سيتم تصدير ${selectedRows.length} شحنة` : `Will export ${selectedRows.length} shipments`);
                },
              },
            ]}
          />
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                {isRTL ? 'هل أنت متأكد من حذف الشحنة:' : 'Are you sure you want to delete shipment:'}
              </p>
              <p className="font-semibold text-gray-900 dark:text-white mb-6">
                {deleteConfirm.shipment_number}
              </p>
              <div className="flex gap-3 justify-end rtl:justify-start">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700
                    hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white
                    hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'حذف' : 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}