/**
 * Project Detail Page — Cost Center Hub
 * =======================================
 * The most important screen: financial command centre for a project.
 * 9 tabs: Overview · Costs · Shipments · Payments · Invoices · Expenses · Phases · Links · Audit
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useToast } from '../../../contexts/ToastContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  FolderIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  DocumentTextIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  PresentationChartBarIcon,
  CpuChipIcon,
  CubeTransparentIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  TagIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  LinkIcon as LinkIconOutline,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  FunnelIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// Lazy-load recharts for code-splitting
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

// =============================================
// TYPES
// =============================================

type ProjectStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
type FinancialStatus = 'open' | 'in_review' | 'approved' | 'closed' | 'archived';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type CostCategory = 'freight' | 'customs_duty' | 'insurance' | 'inland_transport' | 'supplier_payment' | 'service_fee' | 'demurrage' | 'bank_charges' | 'misc' | 'revenue';
type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

interface ProjectPhase {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  phase_type: string;
  sort_order: number;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  duration_days: number;
  budget: number;
  actual_cost: number;
  completion_pct: number;
  status: PhaseStatus;
}

interface CostBreakdown {
  total_cost: number;
  total_revenue: number;
  profit_loss: number;
  freight_cost: number;
  customs_cost: number;
  insurance_cost: number;
  inland_transport_cost: number;
  supplier_payment_cost: number;
  service_fee_cost: number;
  demurrage_cost: number;
  bank_charges_cost: number;
  misc_cost: number;
  shipments_count: number;
  payments_count: number;
  expenses_count: number;
  invoices_count: number;
  total_links_count: number;
}

interface ProjectLinkItem {
  id: number;
  link_type: string;
  linked_id: number;
  linked_reference?: string;
  linked_description?: string;
  linked_status?: string;
  linked_amount?: number;
  amount?: number;
  currency_code?: string;
  cost_category?: CostCategory;
  notes?: string;
  linked_by_name?: string;
  linked_at?: string;
  created_at: string;
}

interface ProjectDetail {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  parent_project_id?: number;
  parent_project_code?: string;
  parent_project_name?: string;
  project_level: string;
  level: number;
  project_type_code?: string;
  project_type_name?: string;
  project_type_name_ar?: string;
  manager_name?: string;
  vendor_name?: string;
  vendor_code?: string;
  customer_name?: string;
  cost_center_name?: string;
  currency_code?: string;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  budget: number;
  budget_allocated: number;
  budget_consumed: number;
  budget_materials: number;
  budget_labor: number;
  budget_services: number;
  budget_miscellaneous: number;
  revenue_target: number;
  revenue_actual: number;
  status: ProjectStatus;
  financial_status: FinancialStatus;
  priority: ProjectPriority;
  risk_level: RiskLevel;
  completion_pct: number;
  progress_percent: number;
  tags: string[];
  is_locked?: boolean;
  is_active: boolean;
  lc_number?: string;
  contract_number?: string;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
  closed_at?: string;
  closed_by_name?: string;
  children: { id: number; code: string; name: string; name_ar?: string; budget: number; budget_consumed: number; status: ProjectStatus; progress_percent: number; financial_status: FinancialStatus }[];
}

// =============================================
// CONFIG MAPS
// =============================================

const STATUS_CONFIG: Record<ProjectStatus, { en: string; ar: string; color: string; dot: string }> = {
  planned: { en: 'Planned', ar: 'مخطط', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', dot: 'bg-gray-500' },
  in_progress: { en: 'In Progress', ar: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-500' },
  on_hold: { en: 'On Hold', ar: 'معلق', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' },
  completed: { en: 'Completed', ar: 'مكتمل', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-500' },
  cancelled: { en: 'Cancelled', ar: 'ملغي', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' },
};

const FINANCIAL_STATUS_CONFIG: Record<FinancialStatus, { en: string; ar: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { en: 'Open', ar: 'مفتوح', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: FolderIcon },
  in_review: { en: 'In Review', ar: 'قيد المراجعة', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: ClockIcon },
  approved: { en: 'Approved', ar: 'معتمد', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: ShieldCheckIcon },
  closed: { en: 'Closed', ar: 'مغلق مالياً', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300', icon: LockClosedIcon },
  archived: { en: 'Archived', ar: 'مؤرشف', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: DocumentDuplicateIcon },
};

const RISK_CONFIG: Record<RiskLevel, { en: string; ar: string; color: string }> = {
  low: { en: 'Low', ar: 'منخفض', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  medium: { en: 'Medium', ar: 'متوسط', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  high: { en: 'High', ar: 'مرتفع', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  critical: { en: 'Critical', ar: 'حرج', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
};

const COST_CATEGORY_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  freight: { en: 'Freight', ar: 'شحن', color: '#3B82F6' },
  customs_duty: { en: 'Customs', ar: 'جمارك', color: '#EF4444' },
  insurance: { en: 'Insurance', ar: 'تأمين', color: '#10B981' },
  inland_transport: { en: 'Inland Transport', ar: 'نقل داخلي', color: '#F59E0B' },
  supplier_payment: { en: 'Supplier', ar: 'مورد', color: '#8B5CF6' },
  service_fee: { en: 'Service Fees', ar: 'رسوم خدمات', color: '#EC4899' },
  demurrage: { en: 'Demurrage', ar: 'أرضيات', color: '#F97316' },
  bank_charges: { en: 'Bank Charges', ar: 'مصاريف بنكية', color: '#6366F1' },
  misc: { en: 'Miscellaneous', ar: 'متنوعة', color: '#78716C' },
};

const PHASE_STATUS_CONFIG: Record<PhaseStatus, { en: string; ar: string; color: string; bg: string }> = {
  pending: { en: 'Pending', ar: 'معلق', color: 'text-gray-600', bg: 'bg-gray-200 dark:bg-gray-600' },
  in_progress: { en: 'In Progress', ar: 'جاري', color: 'text-blue-600', bg: 'bg-blue-500' },
  completed: { en: 'Completed', ar: 'مكتمل', color: 'text-green-600', bg: 'bg-green-500' },
  skipped: { en: 'Skipped', ar: 'تم تخطيه', color: 'text-slate-400', bg: 'bg-slate-300 dark:bg-slate-600' },
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  construction: BuildingOfficeIcon,
  procurement: TruckIcon,
  real_estate: HomeModernIcon,
  new_branch: RocketLaunchIcon,
  internal_dev: WrenchScrewdriverIcon,
  research_marketing: PresentationChartBarIcon,
  it_infrastructure: CpuChipIcon,
  other: CubeTransparentIcon,
};

const LINK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shipment: TruckIcon,
  purchase_invoice: DocumentTextIcon,
  sales_invoice: ReceiptPercentIcon,
  expense: BanknotesIcon,
  payment: CurrencyDollarIcon,
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

const formatCurrency = (amount: number, locale: string, currency?: string) => {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    style: 'currency',
    currency: currency || 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const formatNumber = (n: number, locale: string) => {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA').format(n || 0);
};

const formatDate = (dateStr?: string | null, locale?: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const pct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

// =============================================
// API
// =============================================

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

async function fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// =============================================
// SUB-COMPONENTS
// =============================================

function ProgressBar({ percent, size = 'md' }: { percent: number; size?: 'sm' | 'md' | 'lg' }) {
  const v = Math.min(100, Math.max(0, percent));
  const color = v >= 80 ? 'bg-green-500' : v >= 50 ? 'bg-blue-500' : v >= 25 ? 'bg-amber-500' : 'bg-red-500';
  const h = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
  return (
    <div className="flex items-center gap-3">
      <div className={clsx('flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden', h[size])}>
        <div className={clsx('h-full transition-all duration-500', color)} style={{ width: `${v}%` }} />
      </div>
      <span className={clsx('font-semibold text-slate-700 dark:text-slate-300', size === 'lg' ? 'text-lg' : 'text-sm')}>{v}%</span>
    </div>
  );
}

function KPICard({ label, value, sub, trend, color }: { label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral'; color: string }) {
  return (
    <div className={clsx('p-4 rounded-xl border', color)}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1">
        {value}
        {trend === 'up' && <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />}
        {trend === 'down' && <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />}
      </p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700', className)}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

function EmptyTab({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="text-center py-16 text-slate-500">
      <Icon className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p>{message}</p>
    </div>
  );
}

function DetailRow({ label, value, link }: { label: string; value?: string | React.ReactNode; link?: string }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-slate-500 dark:text-slate-400 text-sm">{label}</span>
      {link ? (
        <Link href={link} className="font-medium text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">{value || '-'}</Link>
      ) : (
        <span className="font-medium text-sm text-slate-900 dark:text-white">{value || '-'}</span>
      )}
    </div>
  );
}

function Tabs({ tabs, activeTab, onTabChange }: { tabs: { id: string; label: string; icon?: React.ComponentType<{ className?: string }>; count?: number }[]; activeTab: string; onTabChange: (id: string) => void }) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
      <nav className="flex space-x-1 overflow-x-auto px-4" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canEdit = hasAnyPermission(['projects:edit']);
  const canDelete = hasAnyPermission(['projects:delete']);
  const canManageLinks = hasAnyPermission(['projects:links:manage', 'projects:edit']);
  const canFinancialClose = hasAnyPermission(['projects:financial:close', 'projects:edit']);
  const canViewReports = hasAnyPermission(['projects:reports:view', 'projects:view']);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // Lazy-loaded tab data
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [links, setLinks] = useState<ProjectLinkItem[]>([]);
  const [shipments, setShipments] = useState<ProjectLinkItem[]>([]);
  const [payments, setPayments] = useState<ProjectLinkItem[]>([]);
  const [invoices, setInvoices] = useState<ProjectLinkItem[]>([]);
  const [expenses, setExpenses] = useState<ProjectLinkItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  // Fetch project
  const fetchProject = useCallback(async () => {
    if (!id || !token) return;
    try {
      setLoading(true);
      const data = await fetchWithAuth(`${API_BASE}/projects/${id}`, token);
      setProject(data.data);
    } catch (err: any) {
      showToast(locale === 'ar' ? 'فشل تحميل المشروع' : 'Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, token, showToast, locale]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // Fetch tab data on tab change
  useEffect(() => {
    if (!id || !token) return;
    const load = async (endpoint: string) => {
      setTabLoading(true);
      try {
        return await fetchWithAuth(`${API_BASE}${endpoint}`, token);
      } catch { return null; }
      finally { setTabLoading(false); }
    };

    switch (activeTab) {
      case 'costs':
        if (!costBreakdown) load(`/projects/${id}/cost-breakdown`).then(d => d && setCostBreakdown(d.data));
        break;
      case 'phases':
        if (phases.length === 0) load(`/project-phases/project/${id}`).then(d => d && setPhases(d.data || []));
        break;
      case 'links':
        if (links.length === 0) load(`/projects/${id}/links`).then(d => d && setLinks(d.data || []));
        break;
      case 'shipments':
        if (shipments.length === 0) load(`/projects/${id}/shipments`).then(d => d && setShipments(d.data || []));
        break;
      case 'payments':
        if (payments.length === 0) load(`/projects/${id}/payments`).then(d => d && setPayments(d.data || []));
        break;
      case 'invoices':
        if (invoices.length === 0) load(`/projects/${id}/invoices`).then(d => d && setInvoices(d.data || []));
        break;
      case 'expenses':
        if (expenses.length === 0) load(`/projects/${id}/expenses`).then(d => d && setExpenses(d.data || []));
        break;
    }
  }, [activeTab, id, token]);

  // Financial close
  const handleFinancialClose = async () => {
    if (!project || !token) return;
    try {
      setClosing(true);
      await fetchWithAuth(`${API_BASE}/projects/${project.id}/financial-close`, token, { method: 'PATCH' });
      showToast(locale === 'ar' ? 'تم الإغلاق المالي بنجاح' : 'Financial close completed', 'success');
      fetchProject();
    } catch (err: any) {
      showToast(err.message || (locale === 'ar' ? 'فشل الإغلاق المالي' : 'Financial close failed'), 'error');
    } finally {
      setClosing(false);
      setCloseDialogOpen(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!project || !token) return;
    try {
      setDeleting(true);
      await fetchWithAuth(`${API_BASE}/projects/${project.id}`, token, { method: 'DELETE' });
      showToast(locale === 'ar' ? 'تم حذف المشروع بنجاح' : 'Project deleted successfully', 'success');
      router.push('/projects');
    } catch (err: any) {
      showToast(err.message || (locale === 'ar' ? 'فشل حذف المشروع' : 'Failed to delete project'), 'error');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  // Computed
  const budgetAllocated = project?.budget_allocated || project?.budget || 0;
  const budgetConsumed = project?.budget_consumed || 0;
  const budgetRemaining = budgetAllocated - budgetConsumed;
  const budgetUsedPct = pct(budgetConsumed, budgetAllocated);
  const revenueTarget = project?.revenue_target || 0;
  const revenueActual = project?.revenue_actual || 0;
  const profitLoss = revenueActual - budgetConsumed;

  // Cost donut data
  const costDonutData = useMemo(() => {
    if (!costBreakdown) return [];
    return Object.entries(COST_CATEGORY_LABELS)
      .map(([key, cfg]) => ({
        name: locale === 'ar' ? cfg.ar : cfg.en,
        value: Number((costBreakdown as any)[`${key}_cost`] || (costBreakdown as any)[key] || 0),
        color: cfg.color,
      }))
      .filter(d => d.value > 0);
  }, [costBreakdown, locale]);

  if (loading) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'تحميل...' : 'Loading...'}</title></Head>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="grid grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'غير موجود' : 'Not Found'}</title></Head>
        <div className="text-center py-12">
          <FolderIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'المشروع غير موجود' : 'Project not found'}</h2>
          <Link href="/projects" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">← {locale === 'ar' ? 'العودة للمشاريع' : 'Back to Projects'}</Link>
        </div>
      </MainLayout>
    );
  }

  const TypeIcon = TYPE_ICONS[project.project_type_code || 'other'] || FolderIcon;
  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planned;
  const fStatusCfg = FINANCIAL_STATUS_CONFIG[project.financial_status] || FINANCIAL_STATUS_CONFIG.open;
  const riskCfg = RISK_CONFIG[project.risk_level] || RISK_CONFIG.low;
  const isFinanciallyClosed = project.financial_status === 'closed' || project.financial_status === 'archived';

  const tabs = [
    { id: 'overview', label: locale === 'ar' ? 'نظرة عامة' : 'Overview', icon: ChartBarIcon },
    { id: 'costs', label: locale === 'ar' ? 'التكاليف' : 'Costs', icon: CurrencyDollarIcon },
    { id: 'shipments', label: locale === 'ar' ? 'الشحنات' : 'Shipments', icon: TruckIcon, count: shipments.length || project.children?.length },
    { id: 'payments', label: locale === 'ar' ? 'المدفوعات' : 'Payments', icon: BanknotesIcon },
    { id: 'invoices', label: locale === 'ar' ? 'الفواتير' : 'Invoices', icon: DocumentTextIcon },
    { id: 'expenses', label: locale === 'ar' ? 'المصروفات' : 'Expenses', icon: ReceiptPercentIcon },
    { id: 'phases', label: locale === 'ar' ? 'المراحل' : 'Phases', icon: ClipboardDocumentListIcon, count: phases.length },
    { id: 'links', label: locale === 'ar' ? 'الروابط' : 'Links', icon: LinkIconOutline, count: links.length },
  ];

  // =============================================
  // RENDER TABS
  // =============================================

  const renderLinksTable = (items: ProjectLinkItem[], type: string) => {
    if (tabLoading && items.length === 0) return <div className="animate-pulse py-12"><div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" /></div>;
    if (items.length === 0) return <EmptyTab icon={LINK_ICONS[type] || DocumentTextIcon} message={locale === 'ar' ? 'لا توجد سجلات مرتبطة' : 'No linked records'} />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'المرجع' : 'Reference'}</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-right">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const catCfg = item.cost_category ? COST_CATEGORY_LABELS[item.cost_category] : null;
              return (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400">{item.linked_reference || `#${item.linked_id}`}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{item.linked_description || '-'}</td>
                  <td className="px-4 py-3">
                    {catCfg && (
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {locale === 'ar' ? catCfg.ar : catCfg.en}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(item.amount || item.linked_amount || 0, locale, item.currency_code)}</td>
                  <td className="px-4 py-3">
                    {item.linked_status && (
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 capitalize">{item.linked_status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(item.linked_at || item.created_at, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>{project.code} - {locale === 'ar' ? 'المشاريع' : 'Projects'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* ===== STICKY HEADER ===== */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm text-slate-500 mb-2 flex-wrap">
              <Link href="/projects" className="hover:text-indigo-600">{locale === 'ar' ? 'المشاريع' : 'Projects'}</Link>
              {project.parent_project_id && (
                <>
                  <span>/</span>
                  <Link href={`/projects/${project.parent_project_id}`} className="hover:text-indigo-600">
                    {project.parent_project_code || project.parent_project_name}
                  </Link>
                </>
              )}
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-medium">{project.code}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <TypeIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {locale === 'ar' ? project.name_ar || project.name : project.name}
                  </h1>
                  {/* Status badge */}
                  <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full', statusCfg.color)}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                    {locale === 'ar' ? statusCfg.ar : statusCfg.en}
                  </span>
                  {/* Financial status badge */}
                  <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full', fStatusCfg.color)}>
                    <fStatusCfg.icon className="h-3 w-3" />
                    {locale === 'ar' ? fStatusCfg.ar : fStatusCfg.en}
                  </span>
                  {/* Risk level */}
                  {project.risk_level && project.risk_level !== 'low' && (
                    <span className={clsx('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full', riskCfg.color)}>
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      {locale === 'ar' ? riskCfg.ar : riskCfg.en}
                    </span>
                  )}
                  {/* Level badge */}
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                    {project.project_level || 'sub'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {project.code}
                  {project.project_type_name && ` • ${locale === 'ar' ? project.project_type_name_ar || project.project_type_name : project.project_type_name}`}
                  {project.vendor_name && ` • ${project.vendor_name}`}
                </p>
                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <TagIcon className="h-3.5 w-3.5 text-slate-400" />
                    {project.tags.map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {canViewReports && (
              <Button variant="secondary" onClick={() => router.push(`/projects/reports?project=${project.id}`)}>
                <PresentationChartBarIcon className="h-4 w-4" />
                {locale === 'ar' ? 'التقارير' : 'Reports'}
              </Button>
            )}
            {canFinancialClose && !isFinanciallyClosed && (
              <Button variant="secondary" onClick={() => setCloseDialogOpen(true)}>
                <LockClosedIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إغلاق مالي' : 'Financial Close'}
              </Button>
            )}
            {canEdit && !isFinanciallyClosed && (
              <Button variant="secondary" onClick={() => router.push(`/projects/${project.id}/edit`)}>
                <PencilIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تعديل' : 'Edit'}
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <TrashIcon className="h-4 w-4" />
                {locale === 'ar' ? 'حذف' : 'Delete'}
              </Button>
            )}
          </div>
        </div>

        {/* ===== LOCKED BANNER ===== */}
        {isFinanciallyClosed && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <LockClosedIcon className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {locale === 'ar'
                ? `هذا المشروع مغلق مالياً${project.closed_at ? ` بتاريخ ${formatDate(project.closed_at, locale)}` : ''}. لا يمكن ربط معاملات جديدة.`
                : `This project is financially closed${project.closed_at ? ` on ${formatDate(project.closed_at, locale)}` : ''}. No new transactions can be linked.`
              }
            </p>
          </div>
        )}

        {/* ===== KPI CARDS ===== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            label={locale === 'ar' ? 'الميزانية المخصصة' : 'Budget Allocated'}
            value={formatCurrency(budgetAllocated, locale, project.currency_code)}
            color="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
          <KPICard
            label={locale === 'ar' ? 'المصروف' : 'Consumed'}
            value={formatCurrency(budgetConsumed, locale, project.currency_code)}
            sub={`${budgetUsedPct}%`}
            trend={budgetUsedPct > 90 ? 'down' : 'neutral'}
            color={budgetUsedPct > 90 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}
          />
          <KPICard
            label={locale === 'ar' ? 'المتبقي' : 'Remaining'}
            value={formatCurrency(budgetRemaining, locale, project.currency_code)}
            trend={budgetRemaining < 0 ? 'down' : 'up'}
            color={budgetRemaining < 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'}
          />
          <KPICard
            label={locale === 'ar' ? 'الإيراد المستهدف' : 'Revenue Target'}
            value={formatCurrency(revenueTarget, locale, project.currency_code)}
            color="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
          <KPICard
            label={locale === 'ar' ? 'الإيراد الفعلي' : 'Actual Revenue'}
            value={formatCurrency(revenueActual, locale, project.currency_code)}
            sub={revenueTarget > 0 ? `${pct(revenueActual, revenueTarget)}%` : undefined}
            color="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
          <KPICard
            label={locale === 'ar' ? 'الربح / الخسارة' : 'Profit / Loss'}
            value={formatCurrency(profitLoss, locale, project.currency_code)}
            trend={profitLoss >= 0 ? 'up' : 'down'}
            color={profitLoss >= 0 ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}
          />
        </div>

        {/* ===== PROGRESS + COMPLETION ===== */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {locale === 'ar' ? 'نسبة الإنجاز' : 'Completion'}
            </h3>
            <span className="text-2xl font-bold text-indigo-600">{project.completion_pct || project.progress_percent || 0}%</span>
          </div>
          <ProgressBar percent={project.completion_pct || project.progress_percent || 0} size="lg" />
        </div>

        {/* ===== TABS BLOCK ===== */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="p-6">
            {/* ---- OVERVIEW TAB ---- */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                    {locale === 'ar' ? 'التفاصيل' : 'Details'}
                  </h4>
                  <DetailRow label={locale === 'ar' ? 'مدير المشروع' : 'Manager'} value={project.manager_name} />
                  <DetailRow label={locale === 'ar' ? 'المورد' : 'Vendor'} value={project.vendor_name ? `${project.vendor_name} (${project.vendor_code})` : undefined} />
                  <DetailRow label={locale === 'ar' ? 'العميل' : 'Customer'} value={project.customer_name} />
                  <DetailRow label={locale === 'ar' ? 'مركز التكلفة' : 'Cost Center'} value={project.cost_center_name} />
                  <DetailRow label={locale === 'ar' ? 'العملة' : 'Currency'} value={project.currency_code} />
                  <DetailRow label={locale === 'ar' ? 'رقم خطاب الاعتماد' : 'LC Number'} value={project.lc_number} />
                  <DetailRow label={locale === 'ar' ? 'رقم العقد' : 'Contract #'} value={project.contract_number} />
                  <DetailRow label={locale === 'ar' ? 'تاريخ البداية' : 'Start Date'} value={formatDate(project.start_date, locale)} />
                  <DetailRow label={locale === 'ar' ? 'تاريخ الانتهاء' : 'End Date'} value={formatDate(project.end_date, locale)} />
                  {project.actual_start_date && <DetailRow label={locale === 'ar' ? 'البداية الفعلية' : 'Actual Start'} value={formatDate(project.actual_start_date, locale)} />}
                  {project.actual_end_date && <DetailRow label={locale === 'ar' ? 'الانتهاء الفعلي' : 'Actual End'} value={formatDate(project.actual_end_date, locale)} />}
                  {project.parent_project_name && (
                    <DetailRow label={locale === 'ar' ? 'المشروع الأب' : 'Parent'} value={project.parent_project_name} link={`/projects/${project.parent_project_id}`} />
                  )}
                  <DetailRow label={locale === 'ar' ? 'أنشئ بواسطة' : 'Created By'} value={project.created_by_name} />
                  <DetailRow label={locale === 'ar' ? 'تاريخ الإنشاء' : 'Created'} value={formatDate(project.created_at, locale)} />
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                    {locale === 'ar' ? 'الوصف' : 'Description'}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {locale === 'ar' ? project.description_ar || project.description : project.description || (locale === 'ar' ? 'لا يوجد وصف' : 'No description')}
                  </p>

                  {/* Budget breakdown mini */}
                  <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mt-6">
                    {locale === 'ar' ? 'توزيع الميزانية' : 'Budget Breakdown'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'materials', label: { en: 'Materials', ar: 'مواد' }, value: project.budget_materials, color: 'bg-blue-50 dark:bg-blue-900/20' },
                      { key: 'labor', label: { en: 'Labor', ar: 'عمالة' }, value: project.budget_labor, color: 'bg-green-50 dark:bg-green-900/20' },
                      { key: 'services', label: { en: 'Services', ar: 'خدمات' }, value: project.budget_services, color: 'bg-amber-50 dark:bg-amber-900/20' },
                      { key: 'misc', label: { en: 'Miscellaneous', ar: 'متنوعة' }, value: project.budget_miscellaneous, color: 'bg-purple-50 dark:bg-purple-900/20' },
                    ].map((b) => (
                      <div key={b.key} className={clsx('p-3 rounded-lg', b.color)}>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{locale === 'ar' ? b.label.ar : b.label.en}</p>
                        <p className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(b.value || 0, locale, project.currency_code)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-Projects */}
                {project.children && project.children.length > 0 && (
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                      {locale === 'ar' ? 'المشاريع الفرعية' : 'Sub-Projects'} ({project.children.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {project.children.map((child) => {
                        const childStatus = STATUS_CONFIG[child.status] || STATUS_CONFIG.planned;
                        return (
                          <Link
                            key={child.id}
                            href={`/projects/${child.id}`}
                            className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-slate-900 dark:text-white text-sm">{locale === 'ar' ? child.name_ar || child.name : child.name}</p>
                              <span className={clsx('w-2 h-2 rounded-full', childStatus.dot)} />
                            </div>
                            <p className="text-xs text-slate-500 mb-2">{child.code}</p>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                              <span>{locale === 'ar' ? 'الميزانية' : 'Budget'}: {formatCurrency(child.budget, locale)}</span>
                              <span>{locale === 'ar' ? 'المصروف' : 'Spent'}: {formatCurrency(child.budget_consumed || 0, locale)}</span>
                            </div>
                            <ProgressBar percent={child.progress_percent || 0} size="sm" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- COSTS TAB ---- */}
            {activeTab === 'costs' && (
              <div className="space-y-6">
                {tabLoading && !costBreakdown ? (
                  <div className="animate-pulse space-y-4">
                    <div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />)}</div>
                    <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  </div>
                ) : costBreakdown ? (
                  <>
                    {/* Cost category cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {Object.entries(COST_CATEGORY_LABELS).map(([key, cfg]) => {
                        const val = Number((costBreakdown as any)[`${key}_cost`] || 0);
                        if (val === 0) return null;
                        return (
                          <div key={key} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{locale === 'ar' ? cfg.ar : cfg.en}</p>
                            </div>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(val, locale, project.currency_code)}</p>
                            <p className="text-xs text-slate-500">{pct(val, Number(costBreakdown.total_cost || 1))}% {locale === 'ar' ? 'من الإجمالي' : 'of total'}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Donut + Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Donut Chart */}
                      {costDonutData.length > 0 && (
                        <div className="flex flex-col items-center">
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{locale === 'ar' ? 'توزيع التكاليف' : 'Cost Distribution'}</h4>
                          <div style={{ width: '100%', height: 280 }}>
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie data={costDonutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                                  {costDonutData.map((d, i) => (
                                    <Cell key={i} fill={d.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => formatCurrency(v, locale, project.currency_code)} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Legend */}
                          <div className="flex flex-wrap gap-3 mt-2 justify-center">
                            {costDonutData.map((d, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary table */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{locale === 'ar' ? 'ملخص مالي' : 'Financial Summary'}</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500">{locale === 'ar' ? 'إجمالي التكاليف' : 'Total Costs'}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(costBreakdown.total_cost, locale, project.currency_code)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</span>
                            <span className="font-semibold text-green-600">{formatCurrency(costBreakdown.total_revenue, locale, project.currency_code)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500">{locale === 'ar' ? 'الربح / الخسارة' : 'Profit / Loss'}</span>
                            <span className={clsx('font-semibold', costBreakdown.profit_loss >= 0 ? 'text-green-600' : 'text-red-600')}>
                              {formatCurrency(costBreakdown.profit_loss, locale, project.currency_code)}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500">{locale === 'ar' ? 'عدد الشحنات' : 'Shipments'}</span>
                            <span className="font-medium text-slate-900 dark:text-white">{formatNumber(costBreakdown.shipments_count, locale)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500">{locale === 'ar' ? 'عدد المدفوعات' : 'Payments'}</span>
                            <span className="font-medium text-slate-900 dark:text-white">{formatNumber(costBreakdown.payments_count, locale)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500">{locale === 'ar' ? 'عدد الفواتير' : 'Invoices'}</span>
                            <span className="font-medium text-slate-900 dark:text-white">{formatNumber(costBreakdown.invoices_count, locale)}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-slate-500">{locale === 'ar' ? 'عدد المصروفات' : 'Expenses'}</span>
                            <span className="font-medium text-slate-900 dark:text-white">{formatNumber(costBreakdown.expenses_count, locale)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyTab icon={CurrencyDollarIcon} message={locale === 'ar' ? 'لا توجد بيانات تكاليف' : 'No cost data available'} />
                )}
              </div>
            )}

            {/* ---- SHIPMENTS TAB ---- */}
            {activeTab === 'shipments' && renderLinksTable(shipments, 'shipment')}

            {/* ---- PAYMENTS TAB ---- */}
            {activeTab === 'payments' && renderLinksTable(payments, 'payment')}

            {/* ---- INVOICES TAB ---- */}
            {activeTab === 'invoices' && renderLinksTable(invoices, 'purchase_invoice')}

            {/* ---- EXPENSES TAB ---- */}
            {activeTab === 'expenses' && renderLinksTable(expenses, 'expense')}

            {/* ---- PHASES TAB ---- */}
            {activeTab === 'phases' && (
              <div className="space-y-4">
                {tabLoading && phases.length === 0 ? (
                  <div className="animate-pulse space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />)}</div>
                ) : phases.length > 0 ? (
                  <>
                    {/* Simple Gantt */}
                    <div className="space-y-2">
                      {phases.map((phase) => {
                        const phaseCfg = PHASE_STATUS_CONFIG[phase.status] || PHASE_STATUS_CONFIG.pending;
                        return (
                          <div key={phase.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            {/* Phase info */}
                            <div className="w-40 flex-shrink-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{locale === 'ar' ? phase.name_ar || phase.name : phase.name}</p>
                              <p className="text-xs text-slate-500">{phase.code} • {phase.duration_days}d</p>
                            </div>
                            {/* Gantt bar */}
                            <div className="flex-1 relative">
                              <div className="h-6 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div
                                  className={clsx('h-full rounded-full transition-all duration-500', phaseCfg.bg)}
                                  style={{ width: `${Math.max(phase.completion_pct || 0, 3)}%` }}
                                />
                              </div>
                            </div>
                            {/* Percent */}
                            <span className={clsx('text-sm font-semibold w-12 text-right', phaseCfg.color)}>{phase.completion_pct || 0}%</span>
                            {/* Status */}
                            <span className={clsx('text-xs px-2 py-1 rounded-full whitespace-nowrap', phaseCfg.color, 'bg-slate-100 dark:bg-slate-700')}>
                              {locale === 'ar' ? phaseCfg.ar : phaseCfg.en}
                            </span>
                            {/* Cost */}
                            <div className="w-28 text-right flex-shrink-0">
                              <p className="text-xs text-slate-500">{formatCurrency(phase.actual_cost || 0, locale, project.currency_code)}</p>
                              <p className="text-xs text-slate-400">/ {formatCurrency(phase.budget || 0, locale, project.currency_code)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Phase dates */}
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'المرحلة' : 'Phase'}</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'بداية مخططة' : 'Planned Start'}</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'نهاية مخططة' : 'Planned End'}</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'بداية فعلية' : 'Actual Start'}</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'نهاية فعلية' : 'Actual End'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {phases.map((p) => (
                            <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{locale === 'ar' ? p.name_ar || p.name : p.name}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(p.planned_start, locale)}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(p.planned_end, locale)}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(p.actual_start, locale)}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(p.actual_end, locale)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <EmptyTab icon={ClipboardDocumentListIcon} message={locale === 'ar' ? 'لم يتم تعيين مراحل لهذا المشروع' : 'No phases assigned to this project'} />
                )}
              </div>
            )}

            {/* ---- LINKS TAB ---- */}
            {activeTab === 'links' && (
              <div>
                {tabLoading && links.length === 0 ? (
                  <div className="animate-pulse py-8"><div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" /></div>
                ) : links.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'المرجع' : 'Reference'}</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-right">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'بواسطة' : 'Linked By'}</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {links.map((link) => {
                          const LinkTypeIcon = LINK_ICONS[link.link_type] || DocumentTextIcon;
                          const catCfg = link.cost_category ? COST_CATEGORY_LABELS[link.cost_category] : null;
                          return (
                            <tr key={link.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <LinkTypeIcon className="h-4 w-4 text-slate-400" />
                                  <span className="capitalize text-sm">{link.link_type.replace(/_/g, ' ')}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400">{link.linked_reference || `#${link.linked_id}`}</td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{link.linked_description || '-'}</td>
                              <td className="px-4 py-3">
                                {catCfg ? (
                                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">{locale === 'ar' ? catCfg.ar : catCfg.en}</span>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                                {formatCurrency(link.amount || link.linked_amount || 0, locale, link.currency_code)}
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{link.linked_by_name || '-'}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(link.linked_at || link.created_at, locale)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyTab icon={LinkIconOutline} message={locale === 'ar' ? 'لا توجد روابط' : 'No links found'} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== DIALOGS ===== */}
        <ConfirmDialog
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          title={locale === 'ar' ? 'حذف المشروع' : 'Delete Project'}
          message={
            locale === 'ar'
              ? `هل أنت متأكد من حذف المشروع "${project.name}"؟`
              : `Are you sure you want to delete "${project.name}"?`
          }
          confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
          variant="danger"
          loading={deleting}
        />

        <ConfirmDialog
          isOpen={closeDialogOpen}
          onClose={() => setCloseDialogOpen(false)}
          onConfirm={handleFinancialClose}
          title={locale === 'ar' ? 'إغلاق مالي' : 'Financial Close'}
          message={
            locale === 'ar'
              ? `هل تريد تنفيذ الإغلاق المالي للمشروع "${project.name}"؟ لن يمكن ربط معاملات جديدة بعد الإغلاق.`
              : `Are you sure you want to financially close "${project.name}"? New transactions cannot be linked after closing.`
          }
          confirmText={locale === 'ar' ? 'إغلاق مالي' : 'Close Financially'}
          variant="danger"
          loading={closing}
        />
      </div>
    </MainLayout>
  );
}
