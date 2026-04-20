/**
 * ============================================================================
 * TENANT MANAGEMENT — Full QA-Compliant Implementation
 * ============================================================================
 * 4-step wizard (Create/Edit), 9-column sortable table, Impersonation modal,
 * View details, Suspend/Activate/Delete/Reset confirmations, result counter.
 *
 * @module pages/admin/tenants
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChartBarIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  TruckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolid,
  BuildingOfficeIcon as BuildingOfficeSolid,
  UserGroupIcon as UserGroupSolid,
  ShieldCheckIcon as ShieldCheckSolid,
} from '@heroicons/react/24/solid';

import MainLayout from '@/components/layout/MainLayout';
import Modal, { ConfirmDialog } from '@/components/ui/Modal.enhanced';
import { TextField, SelectField, NumberField, DateField, TextArea } from '@/components/ui/Fields.enhanced';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import { getModuleScreenMap, countModuleScreens, type ModuleScreenNode } from '@/config/menu.registry';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Tenant {
  id: number;
  code: string;
  tenant_code: string;
  name: string;
  name_ar?: string;
  slug?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  currency?: string;
  tax_number?: string;
  registration_number?: string;
  legal_name?: string;
  status: 'active' | 'suspended' | 'trial' | 'terminated' | 'pending';
  tenant_type?: string;
  subscription_plan?: string;
  subscription_status?: string;
  is_active: boolean;
  user_count?: number;
  shipment_count?: number;
  last_login?: string;
  logo_url?: string;
  primary_color?: string;
  max_users?: number;
  active_modules?: string[];
  notes?: string;
  admin_name?: string;
  created_at: string;
  updated_at: string;
}

interface TenantStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
}

interface Country {
  id: number;
  code: string;
  name: string;
  name_en: string;
  name_ar: string;
  currency_code?: string;
  phone_code?: string;
  flag_emoji?: string;
}

interface City {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  country_id: number;
}

interface CurrencyOption {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  symbol: string;
}

// Country → Currency mapping for auto-selection (fallback)
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  SAU: 'SAR', UAE: 'AED', KWT: 'KWD', BHR: 'BHD', QAT: 'QAR', OMN: 'OMR',
  EGY: 'EGP', JOR: 'JOD', LBN: 'LBP', IRQ: 'IQD', SYR: 'SYP', YEM: 'YER',
  USA: 'USD', GBR: 'GBP', EUR: 'EUR', TUR: 'TRY', IND: 'INR', PAK: 'PKR',
};

interface WizardFormData {
  // Step 1 - Company
  company_name: string;
  company_name_ar: string;
  company_code: string;
  legal_name: string;
  tax_number: string;
  registration_number: string;
  phone: string;
  country: string;
  currency: string;
  city: string;
  address: string;
  website: string;
  logo_url: string;
  // Step 2 - Admin
  email: string;
  password: string;
  admin_name: string;
  // Step 3 - Modules & Plan
  plan: 'Starter' | 'Pro' | 'Enterprise';
  active_modules: string[];
  max_users: number;
  start_date: string;
  // Step 4 - Review (no extra fields)
  notes: string;
}

type SortField = 'code' | 'name' | 'country' | 'subscription_plan' | 'status' | 'user_count' | 'shipment_count' | 'last_login' | 'created_at';
type SortDir = 'asc' | 'desc';

const WIZARD_STEPS = [
  { key: 'company', icon: '🏢', label: 'Company Info', labelAr: 'معلومات الشركة' },
  { key: 'admin', icon: '👤', label: 'Admin Account', labelAr: 'حساب المسؤول' },
  { key: 'modules', icon: '📦', label: 'Plan & Modules', labelAr: 'الخطة والوحدات' },
  { key: 'review', icon: '✅', label: 'Review', labelAr: 'مراجعة' },
];

const MODULE_CATEGORIES = [
  {
    key: 'finance',
    icon: '💼',
    labelEn: 'Finance & Accounting',
    labelAr: 'المالية والمحاسبة',
    modules: [
      { code: 'accounting', icon: '📒', labelEn: 'Accounting & Finance', labelAr: 'المحاسبة والمالية', descEn: 'General ledger, journals, banks, financial statements, fixed assets & depreciation', descAr: 'دفتر الأستاذ، القيود، البنوك، القوائم المالية، الأصول الثابتة والإهلاك' },
      { code: 'zatca', icon: '🧾', labelEn: 'ZATCA E-Invoicing', labelAr: 'الفوترة الإلكترونية (زاتكا)', descEn: 'ZATCA e-invoicing integration, tax types & rates', descAr: 'تكامل الفوترة الإلكترونية، أنواع ومعدلات الضرائب' },
    ],
  },
  {
    key: 'operations',
    icon: '⚙️',
    labelEn: 'Business Operations',
    labelAr: 'العمليات التجارية',
    modules: [
      { code: 'sales', icon: '🛒', labelEn: 'Sales', labelAr: 'المبيعات', descEn: 'Quotations, sales orders, invoices, returns & price lists', descAr: 'عروض الأسعار، طلبيات البيع، الفواتير، المرتجعات وقوائم الأسعار' },
      { code: 'procurement', icon: '📋', labelEn: 'Procurement', labelAr: 'المشتريات', descEn: 'Purchase orders, vendor management, purchase returns', descAr: 'أوامر الشراء، إدارة الموردين، مرتجعات المشتريات' },
      { code: 'crm', icon: '🤝', labelEn: 'CRM', labelAr: 'إدارة العملاء', descEn: 'Customer management, contacts, opportunities, follow-ups', descAr: 'إدارة العملاء، جهات الاتصال، الفرص، المتابعات' },
    ],
  },
  {
    key: 'logistics',
    icon: '🚛',
    labelEn: 'Logistics & Warehousing',
    labelAr: 'اللوجستيات والمستودعات',
    modules: [
      { code: 'shipments', icon: '📦', labelEn: 'Shipments & Logistics', labelAr: 'الشحنات واللوجستيات', descEn: 'Shipment management, tracking, shipping bills, transport', descAr: 'إدارة الشحنات، التتبع، بوالص الشحن، النقل' },
      { code: 'customs', icon: '🛃', labelEn: 'Customs & Compliance', labelAr: 'الجمارك والامتثال', descEn: 'Customs declarations, HS codes, tariffs, compliance certificates', descAr: 'التصريحات الجمركية، الرموز الجمركية، التعريفات، شهادات الامتثال' },
      { code: 'warehousing', icon: '🏭', labelEn: 'Warehousing & Inventory', labelAr: 'المستودعات والمخزون', descEn: 'Warehouse management, stock operations, inventory tracking', descAr: 'إدارة المستودعات، عمليات المخزون، تتبع المخزون' },
    ],
  },
  {
    key: 'hr_projects',
    icon: '👔',
    labelEn: 'Human Resources & Projects',
    labelAr: 'الموارد البشرية والمشاريع',
    modules: [
      { code: 'hr', icon: '👥', labelEn: 'Human Resources', labelAr: 'الموارد البشرية', descEn: 'Employees, payroll, departments, attendance, contracts', descAr: 'الموظفين، الرواتب، الأقسام، الحضور، العقود' },
      { code: 'projects', icon: '📁', labelEn: 'Project Management', labelAr: 'إدارة المشاريع', descEn: 'Projects, phases, contracts, project types', descAr: 'المشاريع، المراحل، العقود، أنواع المشاريع' },
    ],
  },
  {
    key: 'ecommerce',
    icon: '🛍️',
    labelEn: 'E-Commerce & Marketplace',
    labelAr: 'التجارة الإلكترونية والسوق',
    modules: [
      { code: 'ecommerce', icon: '🛒', labelEn: 'E-Commerce Store', labelAr: 'المتجر الإلكتروني', descEn: 'Online store, products, orders, customers, coupons', descAr: 'المتجر الإلكتروني، المنتجات، الطلبات، العملاء، الكوبونات' },
      { code: 'marketplace', icon: '🏪', labelEn: 'Multi-Vendor Marketplace', labelAr: 'السوق متعدد البائعين', descEn: 'Vendors, listings, marketplace orders, payouts', descAr: 'البائعين، العروض، طلبات السوق، المدفوعات' },
      { code: 'seller_dashboard', icon: '📊', labelEn: 'Seller Dashboard', labelAr: 'لوحة البائع', descEn: 'Vendor self-service portal for products, orders & wallet', descAr: 'بوابة الخدمة الذاتية للبائع للمنتجات والطلبات والمحفظة' },
    ],
  },
  {
    key: 'analytics',
    icon: '📈',
    labelEn: 'Reports & Analytics',
    labelAr: 'التقارير والتحليلات',
    modules: [
      { code: 'reports', icon: '📊', labelEn: 'Reports & Analytics', labelAr: 'التقارير والتحليلات', descEn: 'Report types, KPIs, analytical templates, dashboards', descAr: 'أنواع التقارير، مؤشرات الأداء، القوالب التحليلية، لوحات المعلومات' },
    ],
  },
];

// All non-core module codes
const ALL_MODULE_CODES = MODULE_CATEGORIES.flatMap(cat => cat.modules.map(m => m.code));
// Flat lookup for module display info
const MODULE_INFO_MAP = Object.fromEntries(
  MODULE_CATEGORIES.flatMap(cat => cat.modules.map(m => [m.code, m]))
);
// Screen map from MENU_REGISTRY (computed once)
const MODULE_SCREEN_MAP = getModuleScreenMap();

const PLAN_LIMITS: Record<string, { maxUsers: number; modules: string[] }> = {
  Starter: { maxUsers: 10, modules: ['shipments', 'reports'] },
  Pro: { maxUsers: 50, modules: ['shipments', 'customs', 'warehousing', 'accounting', 'sales', 'procurement', 'reports', 'ecommerce'] },
  Enterprise: { maxUsers: 10000, modules: ALL_MODULE_CODES },
};

const pageSize = 15;

const emptyForm: WizardFormData = {
  company_name: '', company_name_ar: '', company_code: '', legal_name: '',
  tax_number: '', registration_number: '',
  phone: '', country: 'SAU', currency: 'SAR',
  city: '', address: '', website: '', logo_url: '',
  email: '', password: '', admin_name: '',
  plan: 'Starter', active_modules: ['shipments', 'reports'], max_users: 10,
  start_date: new Date().toISOString().split('T')[0],
  notes: '',
};

// ─── Helper: Auto-generate company code ──────────────────────────────────────
function generateCode(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() +
    Math.random().toString(36).substring(2, 5).toUpperCase();
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, trend, onClick, loading, isRTL }: {
  label: string; value: number; icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: string; onClick?: () => void; loading?: boolean; isRTL?: boolean;
}) {
  const colors = {
    blue:   { bg: 'from-blue-500 to-blue-600',   light: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600 dark:text-blue-400',   ring: 'ring-blue-200 dark:ring-blue-800' },
    green:  { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
    yellow: { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-200 dark:ring-amber-800' },
    red:    { bg: 'from-red-500 to-red-600',     light: 'bg-red-50 dark:bg-red-900/20',     text: 'text-red-600 dark:text-red-400',     ring: 'ring-red-200 dark:ring-red-800' },
    purple: { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-200 dark:ring-purple-800' },
  };
  const c = colors[color];
  return (
    <button onClick={onClick} disabled={!onClick} className={`relative group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-start transition-all duration-200 ${onClick ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : ''} overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">{label}</p>
          {loading ? (
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
          )}
          {trend && <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-0.5"><ArrowTrendingUpIcon className="w-3 h-3" />{trend}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${c.light} ring-1 ${c.ring}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
    </button>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const map: Record<string, { bg: string; dot: string; label: string; labelAr: string }> = {
    active:     { bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Active', labelAr: 'نشط' },
    trial:      { bg: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', dot: 'bg-blue-500 animate-pulse', label: 'Trial', labelAr: 'تجريبي' },
    suspended:  { bg: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400', dot: 'bg-red-500', label: 'Suspended', labelAr: 'معلّق' },
    terminated: { bg: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400', dot: 'bg-slate-400', label: 'Terminated', labelAr: 'مُنهى' },
    pending:    { bg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', dot: 'bg-amber-500 animate-pulse', label: 'Pending', labelAr: 'معلّق' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {isRTL ? s.labelAr : s.label}
    </span>
  );
}

// ─── Plan Badge ──────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan?: string }) {
  const m: Record<string, string> = {
    Starter: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    Pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${m[plan || ''] || m.Starter}`}>
      {plan || 'Starter'}
    </span>
  );
}

// ─── Screen Tree Section (recursive) ─────────────────────────────────────────
function ScreenTreeSection({ node, t, depth }: { node: ModuleScreenNode; t: (key: string) => string; depth: number }) {
  const [open, setOpen] = React.useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const label = t(node.labelKey);
  const displayLabel = label !== node.labelKey ? label : node.labelKey.split('.').pop() || node.labelKey;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1 ${hasChildren ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/20 rounded' : ''}`}
        style={{ paddingInlineStart: `${depth * 14}px` }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          <ChevronDownIcon className={`w-3 h-3 text-slate-400 flex-shrink-0 transition-transform duration-150 ${open ? '' : '-rotate-90 rtl:rotate-90'}`} />
        ) : (
          <span className="w-3 flex-shrink-0 text-center text-slate-300 dark:text-slate-600 text-[8px]">●</span>
        )}
        <span className={`text-[11px] ${hasChildren ? 'font-semibold text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {displayLabel}
        </span>
        {hasChildren && (
          <span className="text-[9px] text-slate-300 dark:text-slate-600 ms-1">({node.children!.length})</span>
        )}
      </div>
      {open && hasChildren && node.children!.map(child => (
        <ScreenTreeSection key={child.key} node={child} t={t} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─── Sortable Header ─────────────────────────────────────────────────────────
function SortHeader({ label, field, current, dir, onSort }: {
  label: string; field: SortField; current: SortField; dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = field === current;
  return (
    <th
      className="px-4 py-3 text-start font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? <ChevronUpIcon className="w-3 h-3 text-blue-600" /> : <ChevronDownIcon className="w-3 h-3 text-blue-600" />
        ) : (
          <ArrowsUpDownIcon className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

// ─── Detail Item ─────────────────────────────────────────────────────────────
function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function TenantManagement() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { locale, t } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  // ─── Data state ────────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<TenantStats>({ total: 0, active: 0, trial: 0, suspended: 0 });
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // ─── Filter & pagination ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / pageSize);

  // ─── Modal state ───────────────────────────────────────────────────────────
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create');
  const [editTenantId, setEditTenantId] = useState<number | null>(null);
  const [formData, setFormData] = useState<WizardFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
  const [impersonateTarget, setImpersonateTarget] = useState<Tenant | null>(null);
  const [impersonateReason, setImpersonateReason] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: 'suspend' | 'activate' | 'delete' | 'reset_password'; tenant?: Tenant }>({ isOpen: false, type: 'suspend' });

  const [actionLoading, setActionLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // ─── Token helper ──────────────────────────────────────────────────────────
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  // ─── Data loading ──────────────────────────────────────────────────────────
  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sort: sortField,
        order: sortDir,
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(planFilter !== 'all' && { plan: planFilter }),
      });
      const res = await fetch(`http://localhost:4000/api/tenants?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      setTenants(list.map((t: any) => ({
        ...t,
        active_modules: typeof t.active_modules === 'string' ? t.active_modules.split(/\s+/).filter(Boolean) : (t.active_modules || []),
      })));
      setTotal(json.total ?? json.meta?.total ?? 0);
    } catch {
      showToast('error', isRTL ? 'فشل في تحميل المستأجرين' : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, planFilter, sortField, sortDir, isRTL]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch('http://localhost:4000/api/tenants/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      const d = json.data || json;
      setStats({ total: d.total || 0, active: d.active || 0, trial: d.trial || 0, suspended: d.suspended || 0 });
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  }, []);

  const loadCountries = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch('http://localhost:4000/api/countries?limit=300', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setCountries(data.map((c: any) => ({
          id: c.id, code: c.code, name: c.name || c.name_en, name_en: c.name_en || c.name,
          name_ar: c.name_ar, currency_code: c.currency_code, phone_code: c.phone_code, flag_emoji: c.flag_emoji,
        })));
      }
    } catch { /* optional */ }
  }, []);

  const loadCities = useCallback(async (countryCode?: string) => {
    try {
      const token = getToken();
      if (!token) return;
      const cobj = countries.find(c => c.code === countryCode);
      const qp = cobj ? `?country_id=${cobj.id}&limit=500` : '?limit=500';
      const res = await fetch(`http://localhost:4000/api/cities${qp}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setCities(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []);
      }
    } catch { /* optional */ }
  }, [countries]);

  const loadCurrencies = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch('/api/finance/currencies?is_active=true', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        // Deduplicate by code
        const seen = new Set<string>();
        const unique = data.filter((c: any) => {
          if (seen.has(c.code)) return false;
          seen.add(c.code);
          return true;
        });
        setCurrencies(unique);
      }
    } catch { /* optional */ }
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);
  useEffect(() => { loadStats(); loadCountries(); loadCurrencies(); }, [loadStats, loadCountries, loadCurrencies]);

  // ─── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  // ─── Form helpers ──────────────────────────────────────────────────────────
  const handleFormChange = (key: keyof WizardFormData, value: any) => {
    setFormData(p => {
      const next = { ...p, [key]: value };
      // Auto-link plan → modules & max_users
      if (key === 'plan') {
        const limits = PLAN_LIMITS[value as string];
        if (limits) {
          next.active_modules = [...limits.modules];
          next.max_users = limits.maxUsers;
        }
      }
      // Auto-set currency when country changes and load cities
      if (key === 'country') {
        const matchedCountry = countries.find(c => c.code === value);
        if (matchedCountry?.currency_code) {
          next.currency = matchedCountry.currency_code;
        } else {
          const mapped = COUNTRY_CURRENCY_MAP[value as string];
          if (mapped) next.currency = mapped;
        }
        // Reset city and load cities for the selected country
        next.city = '';
        loadCities(value as string);
      }
      // Auto-generate code from name
      if (key === 'company_name' && !p.company_code) {
        next.company_code = generateCode(value);
      }
      // BUG-006 fix: Force company_code to uppercase
      if (key === 'company_code') {
        next.company_code = (value as string).toUpperCase().replace(/[^A-Z0-9]/g, '');
      }
      return next;
    });
    if (formErrors[key]) setFormErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  // ─── Logo file handling ────────────────────────────────────────────────────
  const handleLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('error', isRTL ? 'يرجى اختيار ملف صورة' : 'Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', isRTL ? 'حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)' : 'File too large (max 5MB)');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [isRTL, showToast]);

  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  }, [handleLogoFile]);

  const handleLogoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
  }, [handleLogoFile]);

  const removeLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview('');
    handleFormChange('logo_url', '');
    if (logoInputRef.current) logoInputRef.current.value = '';
  }, []);

  // ─── Step validation ───────────────────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!formData.company_name.trim()) errs.company_name = isRTL ? 'اسم الشركة مطلوب' : 'Company name required';
      if (!formData.company_code.trim()) errs.company_code = isRTL ? 'رمز الشركة مطلوب' : 'Company code required';
      else if (!/^[A-Z0-9]{3,10}$/.test(formData.company_code)) errs.company_code = isRTL ? 'رمز غير صالح (3-10 أحرف كبيرة وأرقام)' : 'Invalid code (3-10 uppercase letters/digits)';
    }
    if (step === 1) {
      if (!formData.email.trim()) errs.email = isRTL ? 'البريد مطلوب' : 'Email required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = isRTL ? 'بريد غير صالح' : 'Invalid email';
      if (wizardMode === 'create') {
        if (!formData.password) errs.password = isRTL ? 'كلمة المرور مطلوبة' : 'Password required';
        else if (formData.password.length < 8) errs.password = isRTL ? '8 أحرف على الأقل' : 'Min 8 characters';
      }
    }
    if (step === 2) {
      if (formData.active_modules.length === 0) errs.active_modules = isRTL ? 'اختر وحدة واحدة على الأقل' : 'Select at least one module';
      if (formData.max_users < 1) errs.max_users = isRTL ? 'يجب أن يكون أكبر من 0' : 'Must be greater than 0';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(wizardStep)) setWizardStep(s => Math.min(3, s + 1));
  };
  const prevStep = () => setWizardStep(s => Math.max(0, s - 1));

  // ─── Create tenant ─────────────────────────────────────────────────────────
  const handleCreateTenant = async () => {
    if (!validateStep(2)) return; // final validation
    setActionLoading(true);
    try {
      const token = getToken();

      // Upload logo file if selected
      let uploadedLogoUrl = formData.logo_url;
      if (logoFile && logoPreview) {
        // Will upload after tenant is created (need tenant ID)
      }

      const body: any = {
        company_name: formData.company_name,
        company_name_ar: formData.company_name_ar || undefined,
        company_code: formData.company_code,
        legal_name: formData.legal_name || undefined,
        tax_number: formData.tax_number || undefined,
        registration_number: formData.registration_number || undefined,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        country: formData.country,
        currency: formData.currency,
        city: formData.city || undefined,
        address: formData.address || undefined,
        website: formData.website || undefined,
        logo_url: uploadedLogoUrl || undefined,
        plan: formData.plan,
        active_modules: formData.active_modules,
        max_users: formData.max_users,
        notes: formData.notes,
        admin_name: formData.admin_name,
      };
      const res = await fetch('http://localhost:4000/api/tenants', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = err.code || '';
        let msg = err.message || err.error || 'Failed';
        if (res.status === 409) {
          if (code === 'DUPLICATE_CODE') {
            msg = isRTL ? 'رمز الشركة موجود بالفعل — استخدم رمزاً مختلفاً' : 'Company code already exists — use a different code';
          } else if (code === 'DUPLICATE_EMAIL') {
            msg = isRTL ? 'البريد الإلكتروني مستخدم بالفعل' : 'Email already in use';
          } else if (code === 'DUPLICATE_SLUG') {
            msg = isRTL ? 'الاسم المختصر مكرر — غيّر رمز الشركة' : 'Slug conflict — change company code';
          } else {
            msg = isRTL ? 'بيانات مكررة — تحقق من رمز الشركة والبريد الإلكتروني' : 'Duplicate data — check company code and email';
          }
        }
        throw new Error(msg);
      }

      // Upload logo after tenant creation if file was selected
      const created = await res.json();
      if (logoFile && logoPreview && created?.data?.id) {
        try {
          await fetch(`http://localhost:4000/api/tenants/${created.data.id}/logo`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: logoPreview }),
          });
        } catch { /* logo upload failure is non-critical */ }
      }

      showToast('success', isRTL ? 'تم إنشاء المستأجر بنجاح' : 'Tenant created successfully');
      setWizardOpen(false);
      setWizardStep(0);
      setFormData({ ...emptyForm });
      setLogoFile(null);
      setLogoPreview('');
      loadTenants();
      loadStats();
    } catch (err: any) {
      showToast('error', err.message || (isRTL ? 'فشل في الإنشاء' : 'Creation failed'));
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Update tenant ─────────────────────────────────────────────────────────
  const handleUpdateTenant = async () => {
    if (!validateStep(2)) return;
    if (!editTenantId) return;
    setActionLoading(true);
    try {
      const token = getToken();

      // Upload logo file if a new file was selected
      let logoUrlToSend = formData.logo_url;
      if (logoFile && logoPreview) {
        try {
          const logoRes = await fetch(`http://localhost:4000/api/tenants/${editTenantId}/logo`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: logoPreview }),
          });
          if (logoRes.ok) {
            const logoData = await logoRes.json();
            logoUrlToSend = logoData?.data?.logo_url || logoUrlToSend;
          }
        } catch { /* logo upload failure is non-critical */ }
      }

      const body: any = {
        company_name: formData.company_name,
        company_name_ar: formData.company_name_ar || undefined,
        company_code: formData.company_code,
        legal_name: formData.legal_name || undefined,
        tax_number: formData.tax_number || undefined,
        registration_number: formData.registration_number || undefined,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        currency: formData.currency,
        subscription_plan: formData.plan,
        city: formData.city || undefined,
        address: formData.address || undefined,
        website: formData.website || undefined,
        logo_url: logoUrlToSend || undefined,
        admin_name: formData.admin_name || undefined,
        active_modules: formData.active_modules,
      };
      if (formData.password) body.password = formData.password;
      const res = await fetch(`http://localhost:4000/api/tenants/${editTenantId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', isRTL ? 'تم تحديث المستأجر' : 'Tenant updated successfully');
      setWizardOpen(false);
      setWizardStep(0);
      loadTenants();
      loadStats();
    } catch {
      showToast('error', isRTL ? 'فشل في التحديث' : 'Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Tenant actions ────────────────────────────────────────────────────────
  const handleTenantAction = async (action: string, tenant: Tenant) => {
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:4000/api/tenants/${tenant.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      const messages: Record<string, string> = {
        suspend: isRTL ? 'تم تعليق المستأجر' : 'Tenant suspended',
        activate: isRTL ? 'تم تفعيل المستأجر' : 'Tenant activated',
        delete: isRTL ? 'تم حذف المستأجر' : 'Tenant deleted',
        reset_password: isRTL ? 'تم إرسال رابط إعادة التعيين' : 'Password reset sent',
      };
      showToast('success', messages[action] || 'Done');
      setConfirmDialog({ isOpen: false, type: 'suspend' });
      loadTenants();
      loadStats();
    } catch {
      showToast('error', isRTL ? 'فشل في تنفيذ الإجراء' : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Impersonate ───────────────────────────────────────────────────────────
  const handleImpersonate = async () => {
    if (!impersonateTarget || !impersonateReason.trim()) {
      showToast('error', isRTL ? 'سبب الانتحال مطلوب' : 'Impersonation reason is required');
      return;
    }
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:4000/api/tenants/${impersonateTarget.id}/impersonate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: impersonateReason }),
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      // Store impersonation token and navigate
      if (json.data?.token) {
        localStorage.setItem('impersonationToken', json.data.token);
        localStorage.setItem('originalToken', token || '');
        showToast('success', isRTL ? `جاري الدخول كـ ${impersonateTarget.name}` : `Impersonating ${impersonateTarget.name}`);
        setImpersonateModalOpen(false);
        // Could redirect to tenant dashboard
      } else {
        showToast('success', isRTL ? 'تم تسجيل عملية الانتحال' : 'Impersonation logged');
        setImpersonateModalOpen(false);
      }
    } catch {
      showToast('error', isRTL ? 'فشل في عملية الانتحال' : 'Impersonation failed');
    } finally {
      setActionLoading(false);
      setImpersonateReason('');
    }
  };

  // ─── Open wizard ───────────────────────────────────────────────────────────
  const openCreateWizard = () => {
    setWizardMode('create');
    setEditTenantId(null);
    setFormData({ ...emptyForm });
    setFormErrors({});
    setLogoFile(null);
    setLogoPreview('');
    setWizardStep(0);
    setWizardOpen(true);
    loadCities('SAU');
  };

  const openEditWizard = (tenant: Tenant) => {
    setWizardMode('edit');
    setEditTenantId(tenant.id);
    setFormData({
      company_name: tenant.name || '',
      company_name_ar: tenant.name_ar || '',
      company_code: tenant.code || tenant.tenant_code || '',
      legal_name: tenant.legal_name || '',
      tax_number: tenant.tax_number || '',
      registration_number: tenant.registration_number || '',
      phone: tenant.phone || '',
      country: tenant.country || 'SAU',
      currency: tenant.currency || COUNTRY_CURRENCY_MAP[tenant.country || 'SAU'] || 'SAR',
      city: tenant.city || '',
      address: tenant.address || '',
      website: tenant.website || '',
      logo_url: tenant.logo_url || '',
      email: tenant.email || '',
      password: '',
      admin_name: tenant.admin_name || '',
      plan: (tenant.subscription_plan as WizardFormData['plan']) || 'Starter',
      active_modules: Array.isArray(tenant.active_modules) ? tenant.active_modules : PLAN_LIMITS[tenant.subscription_plan || 'Starter']?.modules || [],
      max_users: tenant.max_users || 10,
      start_date: new Date().toISOString().split('T')[0],
      notes: tenant.notes || '',
    });
    setFormErrors({});
    setLogoFile(null);
    setLogoPreview(tenant.logo_url || '');
    setWizardStep(0);
    setWizardOpen(true);
    loadCities(tenant.country || 'SAU');
  };

  // ─── Copy code to clipboard ────────────────────────────────────────────────
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast('success', isRTL ? 'تم نسخ الرمز' : 'Code copied');
  };

  // ─── Country/City/Currency label helpers ─────────────────────────────────
  const countryLabel = (code?: string) => {
    if (!code) return '-';
    const c = countries.find(c => c.code === code);
    return c ? (isRTL ? c.name_ar : (c.name_en || c.name)) : code;
  };

  const cityLabel = (code?: string) => {
    if (!code) return '-';
    const c = cities.find(c => c.code === code || c.name_en === code || c.name_ar === code);
    return c ? (isRTL ? c.name_ar : c.name_en || c.name_ar) : code;
  };

  const currencyLabel = (code?: string) => {
    if (!code) return '-';
    const c = currencies.find(c => c.code === code);
    return c ? `${code} - ${isRTL ? c.name_ar : c.name_en} (${c.symbol})` : code;
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <MainLayout>
      <Head><title>{isRTL ? 'إدارة المستأجرين' : 'Tenant Management'} - SLMS</title></Head>

      <div className="space-y-6">
        {/* ─── Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              🏢 {isRTL ? 'إدارة المستأجرين' : 'Tenant Management'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isRTL ? 'إنشاء ومراقبة جميع الشركات المستأجرة' : 'Create, monitor and manage all tenant companies'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => { loadTenants(); loadStats(); }} className="!rounded-xl">
              <ArrowPathIcon className="w-4 h-4 me-1.5" />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
            <Button variant="primary" onClick={openCreateWizard} className="!rounded-xl !px-5">
              <PlusIcon className="w-4 h-4 me-1.5" />
              {isRTL ? 'مستأجر جديد' : 'New Tenant'}
            </Button>
          </div>
        </div>

        {/* ─── Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={isRTL ? 'إجمالي المستأجرين' : 'Total Tenants'} value={stats.total} icon={BuildingOfficeIcon} color="blue" loading={statsLoading} isRTL={isRTL} onClick={() => { setStatusFilter('all'); setPage(1); }} />
          <StatCard label={isRTL ? 'نشط' : 'Active'} value={stats.active} icon={CheckCircleIcon} color="green" loading={statsLoading} isRTL={isRTL} onClick={() => { setStatusFilter('active'); setPage(1); }} />
          <StatCard label={isRTL ? 'تجريبي' : 'Trial'} value={stats.trial} icon={SparklesIcon} color="yellow" loading={statsLoading} isRTL={isRTL} onClick={() => { setStatusFilter('trial'); setPage(1); }} />
          <StatCard label={isRTL ? 'معلّق' : 'Suspended'} value={stats.suspended} icon={ExclamationTriangleIcon} color="red" loading={statsLoading} isRTL={isRTL} onClick={() => { setStatusFilter('suspended'); setPage(1); }} />
        </div>

        {/* ─── Toolbar ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder={isRTL ? 'بحث بالاسم أو الرمز أو البريد...' : 'Search by name, code or email...'}
              className="w-full ps-9 pe-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm"
          >
            <option value="all">{isRTL ? 'كل الحالات' : 'All Status'}</option>
            <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
            <option value="trial">{isRTL ? 'تجريبي' : 'Trial'}</option>
            <option value="suspended">{isRTL ? 'معلّق' : 'Suspended'}</option>
            <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
          </select>
          {/* Plan filter */}
          <select
            value={planFilter}
            onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm"
          >
            <option value="all">{isRTL ? 'كل الخطط' : 'All Plans'}</option>
            <option value="Starter">Starter</option>
            <option value="Pro">Pro</option>
            <option value="Enterprise">Enterprise</option>
          </select>
          {/* Result counter */}
          <div className="ms-auto text-sm text-slate-500 dark:text-slate-400 font-medium">
            {loading ? '...' : (
              isRTL ? `${total} نتيجة` : `${total} result${total !== 1 ? 's' : ''}`
            )}
          </div>
        </div>

        {/* ─── Table View ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <SortHeader label={isRTL ? 'الرمز' : 'Code'} field="code" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortHeader label={isRTL ? 'الشركة' : 'Company'} field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortHeader label={isRTL ? 'البلد' : 'Country'} field="country" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortHeader label={isRTL ? 'الخطة' : 'Plan'} field="subscription_plan" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortHeader label={isRTL ? 'الحالة' : 'Status'} field="status" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortHeader label={isRTL ? 'المستخدمون' : 'Users'} field="user_count" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortHeader label={isRTL ? 'الشحنات' : 'Shipments'} field="shipment_count" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortHeader label={isRTL ? 'آخر دخول' : 'Last Login'} field="last_login" current={sortField} dir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-end font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {isRTL ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-20 text-center">
                      <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {searchQuery || statusFilter !== 'all' || planFilter !== 'all'
                          ? (isRTL ? 'لا توجد نتائج مطابقة' : 'No matching tenants found')
                          : (isRTL ? 'لا يوجد مستأجرون بعد' : 'No tenants yet')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchQuery || statusFilter !== 'all' || planFilter !== 'all'
                          ? (isRTL ? 'حاول تغيير معايير البحث' : 'Try adjusting your filters')
                          : (isRTL ? 'أنشئ أول مستأجر للبدء' : 'Create your first tenant to get started')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  tenants.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      {/* Code */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyCode(t.code || t.tenant_code)}
                          className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          title={isRTL ? 'انقر للنسخ' : 'Click to copy'}
                        >
                          {t.code || t.tenant_code}
                        </button>
                      </td>
                      {/* Company */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow flex-shrink-0">
                            {t.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {isRTL && t.name_ar ? t.name_ar : t.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Country */}
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {countryLabel(t.country)}
                      </td>
                      {/* Plan */}
                      <td className="px-4 py-3">
                        <PlanBadge plan={t.subscription_plan} />
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} isRTL={isRTL} />
                      </td>
                      {/* Users */}
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t.user_count ?? 0}
                      </td>
                      {/* Shipments */}
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t.shipment_count ?? 0}
                      </td>
                      {/* Last Login */}
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {t.last_login ? new Date(t.last_login).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '—'}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setSelectedTenant(t); setViewModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title={isRTL ? 'عرض' : 'View'}>
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditWizard(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            title={isRTL ? 'تعديل' : 'Edit'}>
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setImpersonateTarget(t); setImpersonateReason(''); setImpersonateModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                            title={isRTL ? 'انتحال' : 'Impersonate'}>
                            <ArrowRightOnRectangleIcon className="w-4 h-4" />
                          </button>
                          {t.status === 'active' ? (
                            <button onClick={() => setConfirmDialog({ isOpen: true, type: 'suspend', tenant: t })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title={isRTL ? 'تعليق' : 'Suspend'}>
                              <PauseIcon className="w-4 h-4" />
                            </button>
                          ) : t.status === 'suspended' ? (
                            <button onClick={() => setConfirmDialog({ isOpen: true, type: 'activate', tenant: t })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                              title={isRTL ? 'تفعيل' : 'Activate'}>
                              <PlayIcon className="w-4 h-4" />
                            </button>
                          ) : null}
                          <button onClick={() => setConfirmDialog({ isOpen: true, type: 'delete', tenant: t })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title={isRTL ? 'حذف' : 'Delete'}>
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Pagination ────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isRTL
                ? `عرض ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} من ${total}`
                : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* 4-STEP WIZARD (Create / Edit)                               */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={wizardOpen}
          onClose={() => { setWizardOpen(false); setWizardStep(0); setFormErrors({}); }}
          title={wizardMode === 'create'
            ? (isRTL ? '✨ إنشاء مستأجر جديد' : '✨ Create New Tenant')
            : (isRTL ? '✏️ تعديل المستأجر' : '✏️ Edit Tenant')}
          size="xl"
        >
          <div className="space-y-5">
            {/* Step indicators */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {WIZARD_STEPS.map((s, i) => {
                const isActive = i === wizardStep;
                const isDone = i < wizardStep;
                return (
                  <button
                    key={s.key}
                    onClick={() => { if (isDone) setWizardStep(i); }}
                    disabled={!isDone && !isActive}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                        : isDone
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 cursor-pointer hover:bg-emerald-100'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </span>
                    <span className="hidden sm:inline">{isRTL ? s.labelAr : s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Step 0: Company Info */}
            {wizardStep === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/30">
                    <BuildingOfficeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                      {isRTL ? 'معلومات الشركة' : 'Company Information'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {isRTL ? 'الاسم والرمز والشعار وبيانات الاتصال' : 'Name, code, logo and contact details'}
                    </p>
                  </div>
                </div>

                {/* Logo Upload + Name/Code row */}
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all group relative"
                      onClick={() => logoInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={handleLogoDrop}
                    >
                      {(logoPreview || formData.logo_url) ? (
                        <>
                          <img src={logoPreview || formData.logo_url} alt="Logo" className="w-full h-full object-contain rounded-2xl" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeLogo(); }}
                            className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          {formData.company_name ? (
                            <span className="text-2xl font-bold text-slate-400">{formData.company_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</span>
                          ) : (
                            <ArrowDownTrayIcon className="w-6 h-6 text-slate-300 dark:text-slate-500 group-hover:text-blue-400 transition-colors" />
                          )}
                          <span className="text-[9px] text-slate-400 group-hover:text-blue-500 mt-1 transition-colors">{isRTL ? 'اسحب أو اختر' : 'Drop or click'}</span>
                        </>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleLogoSelect}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">{isRTL ? 'شعار الشركة' : 'Company Logo'}</p>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField
                      name="company_name"
                      label={isRTL ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'}
                      value={formData.company_name}
                      onChange={v => handleFormChange('company_name', v)}
                      error={formErrors.company_name}
                      required
                      placeholder={isRTL ? 'مثال: Alhaj Shipping Co.' : 'e.g. Alhaj Shipping Co.'}
                    />
                    <TextField
                      name="company_name_ar"
                      label={isRTL ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'}
                      value={formData.company_name_ar}
                      onChange={v => handleFormChange('company_name_ar', v)}
                      placeholder={isRTL ? 'مثال: شركة الحج للشحن' : 'e.g. شركة الحج للشحن'}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <TextField
                      name="company_code"
                      label={isRTL ? 'رمز الشركة' : 'Company Code'}
                      value={formData.company_code}
                      onChange={v => handleFormChange('company_code', v)}
                      error={formErrors.company_code}
                      required
                      helpText={isRTL ? 'رمز فريد (3-10 أحرف)' : 'Unique code (3-10 chars)'}
                    />
                    {formData.company_name && !formData.company_code && (
                      <button
                        type="button"
                        onClick={() => handleFormChange('company_code', generateCode(formData.company_name))}
                        className="text-xs text-blue-600 hover:underline mt-1"
                      >
                        {isRTL ? '🔄 توليد تلقائي' : '🔄 Auto-generate'}
                      </button>
                    )}
                  </div>
                  <TextField
                    name="legal_name"
                    label={isRTL ? 'الاسم القانوني' : 'Legal Name'}
                    value={formData.legal_name}
                    onChange={v => handleFormChange('legal_name', v)}
                    placeholder={isRTL ? 'الاسم الرسمي المسجل' : 'Official registered name'}
                  />
                  <TextField
                    name="phone"
                    label={isRTL ? 'رقم الهاتف' : 'Phone'}
                    type="tel"
                    value={formData.phone}
                    onChange={v => handleFormChange('phone', v)}
                    placeholder="+966 5XX XXX XXXX"
                  />
                </div>

                {/* Registration & Tax Section */}
                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3">
                    {isRTL ? '📋 بيانات التسجيل والضريبة' : '📋 Registration & Tax Details'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField
                      name="registration_number"
                      label={isRTL ? 'رقم السجل التجاري' : 'Commercial Registration No.'}
                      value={formData.registration_number}
                      onChange={v => handleFormChange('registration_number', v)}
                      placeholder={isRTL ? 'مثال: 1010XXXXXX' : 'e.g. 1010XXXXXX'}
                    />
                    <TextField
                      name="tax_number"
                      label={isRTL ? 'الرقم الضريبي (VAT)' : 'Tax Number (VAT)'}
                      value={formData.tax_number}
                      onChange={v => handleFormChange('tax_number', v)}
                      placeholder={isRTL ? 'مثال: 3XXXXXXXXXX003' : 'e.g. 3XXXXXXXXXX003'}
                    />
                  </div>
                </div>

                {/* Location & Currency Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SelectField
                    name="country"
                    label={isRTL ? 'البلد' : 'Country'}
                    value={formData.country}
                    onChange={v => handleFormChange('country', v)}
                    options={countries.length > 0
                      ? countries.map(c => ({ value: c.code, label: `${c.flag_emoji || ''} ${isRTL ? c.name_ar : c.name_en}`.trim() }))
                      : [
                          { value: 'SAU', label: isRTL ? '🇸🇦 السعودية' : '🇸🇦 Saudi Arabia' },
                          { value: 'UAE', label: isRTL ? '🇦🇪 الإمارات' : '🇦🇪 UAE' },
                          { value: 'KWT', label: isRTL ? '🇰🇼 الكويت' : '🇰🇼 Kuwait' },
                          { value: 'BHR', label: isRTL ? '🇧🇭 البحرين' : '🇧🇭 Bahrain' },
                          { value: 'QAT', label: isRTL ? '🇶🇦 قطر' : '🇶🇦 Qatar' },
                          { value: 'OMN', label: isRTL ? '🇴🇲 عُمان' : '🇴🇲 Oman' },
                        ]}
                  />
                  <SelectField
                    name="city"
                    label={isRTL ? 'المدينة' : 'City'}
                    value={formData.city}
                    onChange={v => handleFormChange('city', v)}
                    options={cities.length > 0
                      ? [
                          { value: '', label: isRTL ? '-- اختر المدينة --' : '-- Select City --' },
                          ...cities.map(c => ({ value: c.name_en || c.name_ar, label: isRTL ? c.name_ar : (c.name_en || c.name_ar) }))
                        ]
                      : [{ value: '', label: isRTL ? 'لا توجد مدن متاحة' : 'No cities available' }]}
                  />
                  <SelectField
                    name="currency"
                    label={isRTL ? 'العملة' : 'Currency'}
                    value={formData.currency}
                    onChange={v => handleFormChange('currency', v)}
                    helpText={isRTL ? 'يتم تعيينها تلقائياً عند اختيار البلد' : 'Auto-set when country is selected'}
                    options={currencies.length > 0
                      ? currencies.map(c => ({ value: c.code, label: `${c.code} - ${isRTL ? c.name_ar : c.name_en} (${c.symbol})` }))
                      : [
                          { value: 'SAR', label: 'SAR - Saudi Riyal (﷼)' },
                          { value: 'AED', label: 'AED - UAE Dirham (د.إ)' },
                          { value: 'USD', label: 'USD - US Dollar ($)' },
                        ]}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    name="address"
                    label={isRTL ? 'العنوان' : 'Address'}
                    value={formData.address}
                    onChange={v => handleFormChange('address', v)}
                    placeholder={isRTL ? 'العنوان التفصيلي...' : 'Full address...'}
                  />
                  <TextField
                    name="website"
                    label={isRTL ? 'الموقع الإلكتروني' : 'Website'}
                    value={formData.website}
                    onChange={v => handleFormChange('website', v)}
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Admin Account */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800/30">
                    <UserGroupIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                      {isRTL ? 'حساب المسؤول' : 'Admin Account'}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      {isRTL ? 'سيتم إنشاء حساب مسؤول تلقائياً' : 'An admin account will be created automatically'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    name="admin_name"
                    label={isRTL ? 'اسم المسؤول' : 'Admin Name'}
                    value={formData.admin_name}
                    onChange={v => handleFormChange('admin_name', v)}
                    placeholder={isRTL ? 'مثال: أحمد محمد' : 'e.g. John Doe'}
                  />
                  <TextField
                    name="email"
                    label={isRTL ? 'بريد المسؤول' : 'Admin Email'}
                    type="email"
                    value={formData.email}
                    onChange={v => handleFormChange('email', v)}
                    error={formErrors.email}
                    required
                    placeholder="admin@company.com"
                  />
                  <TextField
                    name="password"
                    label={isRTL ? 'كلمة المرور' : 'Password'}
                    type="password"
                    value={formData.password}
                    onChange={v => handleFormChange('password', v)}
                    error={formErrors.password}
                    required={wizardMode === 'create'}
                    helpText={wizardMode === 'edit'
                      ? (isRTL ? 'اتركها فارغة لعدم التغيير' : 'Leave blank to keep unchanged')
                      : (isRTL ? '8 أحرف على الأقل' : 'Minimum 8 characters')}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Plan & Modules */}
            {wizardStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-800/30">
                    <ChartBarIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                      {isRTL ? 'الخطة والوحدات' : 'Plan & Modules'}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {isRTL ? 'اختر الخطة والوحدات المراد تفعيلها' : 'Select subscription plan and active modules'}
                    </p>
                  </div>
                </div>

                {/* Plan Cards */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    {isRTL ? 'خطة الاشتراك' : 'Subscription Plan'}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key: 'Starter', icon: '🚀', price: '499', priceAr: '٤٩٩', color: 'slate', users: 10, modulesCount: 3 },
                      { key: 'Pro', icon: '⚡', price: '1,499', priceAr: '١,٤٩٩', color: 'blue', users: 50, modulesCount: 6 },
                      { key: 'Enterprise', icon: '🏢', price: isRTL ? 'حسب الطلب' : 'Custom', priceAr: 'حسب الطلب', color: 'purple', users: 10000, modulesCount: 8 },
                    ] as const).map(p => {
                      const isSelected = formData.plan === p.key;
                      const colorMap = {
                        slate: { border: 'border-slate-300 dark:border-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50', ring: 'ring-slate-400', text: 'text-slate-700 dark:text-slate-300' },
                        blue: { border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20', ring: 'ring-blue-500', text: 'text-blue-700 dark:text-blue-300' },
                        purple: { border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20', ring: 'ring-purple-500', text: 'text-purple-700 dark:text-purple-300' },
                      };
                      const cl = colorMap[p.color];
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => handleFormChange('plan', p.key)}
                          className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all text-center ${
                            isSelected
                              ? `${cl.border} ${cl.bg} ring-2 ${cl.ring} shadow-md`
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-2 -end-2">
                              <CheckCircleSolid className="w-5 h-5 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-full" />
                            </div>
                          )}
                          <span className="text-2xl mb-1">{p.icon}</span>
                          <span className={`text-sm font-bold ${isSelected ? cl.text : 'text-slate-800 dark:text-white'}`}>{p.key}</span>
                          <span className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                            {p.key === 'Enterprise' ? (isRTL ? p.priceAr : p.price) : (isRTL ? `${p.priceAr} ر.س` : `${p.price} SAR`)}
                          </span>
                          {p.key !== 'Enterprise' && <span className="text-[10px] text-slate-400">/{isRTL ? 'شهر' : 'mo'}</span>}
                          <div className="mt-2 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <p>👥 {isRTL ? `حتى ${p.users} مستخدم` : `Up to ${p.users} users`}</p>
                            <p>📦 {isRTL ? `${p.modulesCount} وحدات` : `${p.modulesCount} modules`}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Max Users */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/30">
                    <UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{isRTL ? 'الحد الأقصى للمستخدمين' : 'Max Users'}</p>
                    <p className="text-xs text-slate-400">{isRTL ? `الخطة الحالية تدعم حتى ${PLAN_LIMITS[formData.plan]?.maxUsers} مستخدم` : `Current plan supports up to ${PLAN_LIMITS[formData.plan]?.maxUsers} users`}</p>
                  </div>
                  <div className="w-28">
                    <NumberField
                      name="max_users"
                      value={formData.max_users}
                      onChange={v => handleFormChange('max_users', v)}
                      error={formErrors.max_users}
                      min={1}
                      max={PLAN_LIMITS[formData.plan]?.maxUsers || 10000}
                    />
                  </div>
                </div>

                {/* Hierarchical Module Tree */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {isRTL ? 'الوحدات والشاشات المفعّلة' : 'Active Modules & Screens'} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleFormChange('active_modules', ALL_MODULE_CODES)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
                      >
                        {isRTL ? 'تحديد الكل' : 'Select All'}
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleFormChange('active_modules', [])}
                        className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium hover:underline"
                      >
                        {isRTL ? 'إلغاء الكل' : 'Deselect All'}
                      </button>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        {formData.active_modules.length}/{ALL_MODULE_CODES.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {MODULE_CATEGORIES.map(cat => {
                      const catModuleCodes = cat.modules.map(m => m.code);
                      const selectedInCat = catModuleCodes.filter(c => formData.active_modules.includes(c));
                      const allCatSelected = selectedInCat.length === catModuleCodes.length;
                      const someCatSelected = selectedInCat.length > 0 && !allCatSelected;

                      return (
                        <div key={cat.key} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                          {/* Category Header */}
                          <button
                            type="button"
                            onClick={() => {
                              if (allCatSelected) {
                                handleFormChange('active_modules', formData.active_modules.filter(v => !catModuleCodes.includes(v)));
                              } else {
                                handleFormChange('active_modules', [...new Set([...formData.active_modules, ...catModuleCodes])]);
                              }
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              allCatSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : someCatSelected
                                ? 'bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {allCatSelected && <span className="text-xs font-bold">✓</span>}
                              {someCatSelected && <span className="w-2 h-0.5 bg-blue-500 rounded-full" />}
                            </div>
                            <span className="text-lg">{cat.icon}</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-white flex-1 text-start">
                              {isRTL ? cat.labelAr : cat.labelEn}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {selectedInCat.length}/{catModuleCodes.length}
                            </span>
                          </button>

                          {/* Module Items */}
                          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {cat.modules.map(mod => {
                              const isSelected = formData.active_modules.includes(mod.code);
                              const planModules = PLAN_LIMITS[formData.plan]?.modules || [];
                              const isInPlan = planModules.includes(mod.code);
                              const screenNodes = MODULE_SCREEN_MAP[mod.code] || [];
                              const screenCount = countModuleScreens(screenNodes);
                              const isExpanded = expandedModules.has(mod.code);

                              return (
                                <div key={mod.code}>
                                  {/* Module Toggle Row */}
                                  <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                                    isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                  }`}>
                                    <div className="w-4" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const mods = isSelected
                                          ? formData.active_modules.filter(v => v !== mod.code)
                                          : [...formData.active_modules, mod.code];
                                        handleFormChange('active_modules', mods);
                                      }}
                                      className="flex items-center gap-3 flex-1 min-w-0 text-start"
                                    >
                                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                        isSelected
                                          ? 'bg-blue-600 border-blue-600 text-white'
                                          : 'border-slate-300 dark:border-slate-600'
                                      }`}>
                                        {isSelected && <span className="text-[10px] font-bold">✓</span>}
                                      </div>
                                      <span className="text-base flex-shrink-0">{mod.icon}</span>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${isSelected ? 'text-blue-800 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'}`}>
                                          {isRTL ? mod.labelAr : mod.labelEn}
                                        </p>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                          {isRTL ? mod.descAr : mod.descEn}
                                        </p>
                                      </div>
                                    </button>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {isInPlan && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                                          {isRTL ? 'ضمن الخطة' : 'In plan'}
                                        </span>
                                      )}
                                      {screenCount > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = new Set(expandedModules);
                                            if (isExpanded) next.delete(mod.code); else next.add(mod.code);
                                            setExpandedModules(next);
                                          }}
                                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                        >
                                          <span>{screenCount} {isRTL ? 'شاشة' : 'screens'}</span>
                                          <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Expandable Screen Tree */}
                                  {isExpanded && screenNodes.length > 0 && (
                                    <div className="px-4 pb-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700/30">
                                      <div className="pt-2">
                                        {screenNodes.map(section => (
                                          <ScreenTreeSection key={section.key} node={section} t={t} depth={0} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {formErrors.active_modules && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{formErrors.active_modules}</p>
                  )}
                </div>

                <TextArea
                  name="notes"
                  label={isRTL ? 'ملاحظات داخلية' : 'Internal Notes'}
                  value={formData.notes}
                  onChange={v => handleFormChange('notes', v)}
                  rows={2}
                  placeholder={isRTL ? 'ملاحظات اختيارية...' : 'Optional notes...'}
                />
              </div>
            )}

            {/* Step 3: Review */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-800/30">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                      {isRTL ? 'مراجعة البيانات' : 'Review Information'}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {isRTL ? 'تأكد من صحة جميع البيانات قبل الإرسال' : 'Verify all details before submitting'}
                    </p>
                  </div>
                </div>

                {/* Company Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/70">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? '🏢 معلومات الشركة' : '🏢 Company Info'}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow overflow-hidden">
                        {(logoPreview || formData.logo_url) ? (
                          <img src={logoPreview || formData.logo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          formData.company_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?'
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{formData.company_name}</p>
                        <p className="text-xs font-mono text-slate-500">{formData.company_code}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <ReviewField label={isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'} value={formData.company_name} />
                      <ReviewField label={isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'} value={formData.company_name_ar || '-'} />
                      <ReviewField label={isRTL ? 'البريد' : 'Email'} value={formData.email} />
                      <ReviewField label={isRTL ? 'الهاتف' : 'Phone'} value={formData.phone || '-'} />
                      <ReviewField label={isRTL ? 'البلد' : 'Country'} value={countryLabel(formData.country)} />
                      <ReviewField label={isRTL ? 'المدينة' : 'City'} value={formData.city || '-'} />
                      <ReviewField label={isRTL ? 'العملة' : 'Currency'} value={formData.currency} />
                      <ReviewField label={isRTL ? 'الموقع' : 'Website'} value={formData.website || '-'} />
                      {formData.legal_name && (
                        <ReviewField label={isRTL ? 'الاسم القانوني' : 'Legal Name'} value={formData.legal_name} />
                      )}
                      {formData.registration_number && (
                        <ReviewField label={isRTL ? 'السجل التجاري' : 'CR No.'} value={formData.registration_number} />
                      )}
                      {formData.tax_number && (
                        <ReviewField label={isRTL ? 'الرقم الضريبي' : 'Tax No.'} value={formData.tax_number} />
                      )}
                      {formData.address && (
                        <div className="col-span-2">
                          <ReviewField label={isRTL ? 'العنوان' : 'Address'} value={formData.address} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Plan & Modules Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/70">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? '📦 الخطة والوحدات' : '📦 Plan & Modules'}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlanBadge plan={formData.plan} />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          · 👥 {formData.max_users} {isRTL ? 'مستخدم' : 'users'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.active_modules.map(m => {
                        const mod = MODULE_INFO_MAP[m];
                        return (
                          <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-300">
                            {mod?.icon} {isRTL ? mod?.labelAr : mod?.labelEn || m}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {formData.notes && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{formData.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Wizard Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              {wizardStep > 0 && (
                <Button variant="secondary" onClick={prevStep} className="!rounded-xl">
                  {isRTL ? '→ السابق' : '← Previous'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setWizardOpen(false); setWizardStep(0); setFormErrors({}); }} className="!rounded-xl">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              {wizardStep < 3 ? (
                <Button variant="primary" onClick={nextStep} className="!rounded-xl !px-6">
                  {isRTL ? 'التالي ←' : 'Next →'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={wizardMode === 'create' ? handleCreateTenant : handleUpdateTenant}
                  loading={actionLoading}
                  className="!rounded-xl !px-6"
                >
                  {wizardMode === 'create'
                    ? (isRTL ? '✨ إنشاء المستأجر' : '✨ Create Tenant')
                    : (isRTL ? '💾 حفظ التعديلات' : '💾 Save Changes')}
                </Button>
              )}
            </div>
          </div>
        </Modal>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* VIEW TENANT DETAILS MODAL                                   */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={isRTL ? 'تفاصيل المستأجر' : 'Tenant Details'}
          size="lg"
        >
          {selectedTenant && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {selectedTenant.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isRTL && selectedTenant.name_ar ? selectedTenant.name_ar : selectedTenant.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-sm text-slate-500">{selectedTenant.code || selectedTenant.tenant_code}</span>
                    <StatusBadge status={selectedTenant.status} isRTL={isRTL} />
                    <PlanBadge plan={selectedTenant.subscription_plan} />
                  </div>
                </div>
              </div>

              {/* Details Grid - 12 fields */}
              <div className="grid grid-cols-2 gap-3">
                <DetailItem icon={EnvelopeIcon} label={isRTL ? 'البريد الإلكتروني' : 'Email'} value={selectedTenant.email || '-'} />
                <DetailItem icon={PhoneIcon} label={isRTL ? 'الهاتف' : 'Phone'} value={selectedTenant.phone || '-'} />
                <DetailItem icon={GlobeAltIcon} label={isRTL ? 'البلد' : 'Country'} value={countryLabel(selectedTenant.country)} />
                <DetailItem icon={UserGroupIcon} label={isRTL ? 'المستخدمون' : 'Users'} value={`${selectedTenant.user_count || 0}${selectedTenant.max_users ? ` / ${selectedTenant.max_users}` : ''}`} />
                <DetailItem icon={TruckIcon} label={isRTL ? 'الشحنات' : 'Shipments'} value={String(selectedTenant.shipment_count || 0)} />
                <DetailItem icon={CalendarDaysIcon} label={isRTL ? 'تاريخ الإنشاء' : 'Created'} value={new Date(selectedTenant.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')} />
                <DetailItem icon={ClockIcon} label={isRTL ? 'آخر دخول' : 'Last Login'} value={selectedTenant.last_login ? new Date(selectedTenant.last_login).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'} />
                <DetailItem icon={ChartBarIcon} label={isRTL ? 'الخطة' : 'Plan'} value={selectedTenant.subscription_plan || '-'} />
                <DetailItem icon={SparklesIcon} label={isRTL ? 'النوع' : 'Type'} value={selectedTenant.tenant_type || '-'} />
                <DetailItem icon={CheckCircleIcon} label={isRTL ? 'الحالة' : 'Status'} value={selectedTenant.status} />
              </div>

              {/* Modules chips */}
              {selectedTenant.active_modules && selectedTenant.active_modules.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-semibold uppercase">
                    {isRTL ? 'الوحدات المفعّلة' : 'Active Modules'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTenant.active_modules.map(m => {
                      const mod = MODULE_INFO_MAP[m];
                      return (
                        <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-300">
                          {mod?.icon} {isRTL ? mod?.labelAr : mod?.labelEn || m}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="secondary" onClick={() => { setViewModalOpen(false); openEditWizard(selectedTenant); }} className="!rounded-xl">
                  <PencilIcon className="w-4 h-4 me-1.5" /> {isRTL ? 'تعديل' : 'Edit'}
                </Button>
                <Button variant="secondary" onClick={() => { setViewModalOpen(false); setImpersonateTarget(selectedTenant); setImpersonateReason(''); setImpersonateModalOpen(true); }} className="!rounded-xl">
                  <ArrowRightOnRectangleIcon className="w-4 h-4 me-1.5" /> {isRTL ? 'انتحال' : 'Impersonate'}
                </Button>
                {selectedTenant.status === 'active' ? (
                  <Button variant="secondary" onClick={() => { setViewModalOpen(false); setConfirmDialog({ isOpen: true, type: 'suspend', tenant: selectedTenant }); }} className="!rounded-xl">
                    <PauseIcon className="w-4 h-4 me-1.5" /> {isRTL ? 'تعليق' : 'Suspend'}
                  </Button>
                ) : selectedTenant.status === 'suspended' ? (
                  <Button variant="primary" onClick={() => { setViewModalOpen(false); setConfirmDialog({ isOpen: true, type: 'activate', tenant: selectedTenant }); }} className="!rounded-xl">
                    <PlayIcon className="w-4 h-4 me-1.5" /> {isRTL ? 'تفعيل' : 'Activate'}
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => { setViewModalOpen(false); setConfirmDialog({ isOpen: true, type: 'reset_password', tenant: selectedTenant }); }} className="!rounded-xl">
                  <KeyIcon className="w-4 h-4 me-1.5" /> {isRTL ? 'إعادة كلمة المرور' : 'Reset Password'}
                </Button>
                <Button variant="danger" onClick={() => { setViewModalOpen(false); setConfirmDialog({ isOpen: true, type: 'delete', tenant: selectedTenant }); }} className="!rounded-xl ms-auto">
                  <TrashIcon className="w-4 h-4 me-1.5" /> {isRTL ? 'حذف' : 'Delete'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* IMPERSONATION MODAL                                         */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={impersonateModalOpen}
          onClose={() => { setImpersonateModalOpen(false); setImpersonateReason(''); }}
          title={isRTL ? '🔑 انتحال شخصية المستأجر' : '🔑 Impersonate Tenant'}
          size="md"
        >
          {impersonateTarget && (
            <div className="space-y-4">
              {/* Yellow warning bar */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/50">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {isRTL ? 'تحذير — عملية حساسة' : 'Warning — Sensitive Operation'}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    {isRTL
                      ? 'ستدخل بصلاحيات هذا المستأجر. سيتم تسجيل هذه العملية في سجل المراجعة.'
                      : 'You will log in with this tenant\'s permissions. This action will be logged in the audit trail.'}
                  </p>
                </div>
              </div>

              {/* Target info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {impersonateTarget.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{impersonateTarget.name}</p>
                  <p className="text-xs text-slate-400">{impersonateTarget.email} · {impersonateTarget.code || impersonateTarget.tenant_code}</p>
                </div>
              </div>

              {/* Reason field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isRTL ? 'سبب الانتحال' : 'Impersonation Reason'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={impersonateReason}
                  onChange={e => setImpersonateReason(e.target.value)}
                  rows={3}
                  placeholder={isRTL ? 'اكتب سبب الدخول كهذا المستأجر...' : 'Describe why you need to impersonate this tenant...'}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                {!impersonateReason.trim() && (
                  <p className="mt-1 text-xs text-slate-400">{isRTL ? 'هذا الحقل مطلوب لأغراض المراجعة' : 'Required for audit purposes'}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => { setImpersonateModalOpen(false); setImpersonateReason(''); }} className="!rounded-xl">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImpersonate}
                  loading={actionLoading}
                  disabled={!impersonateReason.trim()}
                  className="!rounded-xl !bg-purple-600 hover:!bg-purple-700"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 me-1.5" />
                  {isRTL ? 'دخول كمستأجر' : 'Impersonate'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* CONFIRM DIALOG (Suspend/Activate/Delete/Reset)              */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, type: 'suspend' })}
          onConfirm={() => confirmDialog.tenant && handleTenantAction(confirmDialog.type, confirmDialog.tenant)}
          title={
            confirmDialog.type === 'suspend' ? (isRTL ? '⚠️ تعليق المستأجر' : '⚠️ Suspend Tenant') :
            confirmDialog.type === 'activate' ? (isRTL ? '✅ تفعيل المستأجر' : '✅ Activate Tenant') :
            confirmDialog.type === 'delete' ? (isRTL ? '🗑️ حذف المستأجر' : '🗑️ Delete Tenant') :
            isRTL ? '🔑 إعادة تعيين كلمة المرور' : '🔑 Reset Password'
          }
          message={
            confirmDialog.type === 'suspend'
              ? (isRTL
                  ? `هل أنت متأكد من تعليق "${confirmDialog.tenant?.name}"؟\n\n• سيتم منع جميع المستخدمين من الدخول\n• لن يتمكنوا من الوصول إلى البيانات\n• يمكنك إعادة التفعيل لاحقاً`
                  : `Suspend "${confirmDialog.tenant?.name}"?\n\n• All users will lose access immediately\n• Data will be preserved but inaccessible\n• You can reactivate later`)
              : confirmDialog.type === 'activate'
              ? (isRTL
                  ? `تفعيل "${confirmDialog.tenant?.name}"؟ سيتمكن جميع المستخدمين من الدخول مجدداً.`
                  : `Activate "${confirmDialog.tenant?.name}"? All users will regain access.`)
              : confirmDialog.type === 'delete'
              ? (isRTL
                  ? `⚠️ حذف "${confirmDialog.tenant?.name}" نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع البيانات والمستخدمين المرتبطين.`
                  : `⚠️ Permanently delete "${confirmDialog.tenant?.name}"?\n\nThis action cannot be undone. All associated data and users will be removed.`)
              : (isRTL
                  ? `إرسال رابط إعادة تعيين كلمة المرور إلى ${confirmDialog.tenant?.email || 'المسؤول'}`
                  : `Send password reset link to ${confirmDialog.tenant?.email || 'admin'}`)
          }
          confirmText={
            confirmDialog.type === 'suspend' ? (isRTL ? 'تعليق' : 'Suspend') :
            confirmDialog.type === 'activate' ? (isRTL ? 'تفعيل' : 'Activate') :
            confirmDialog.type === 'delete' ? (isRTL ? 'حذف نهائياً' : 'Delete Permanently') :
            isRTL ? 'إرسال' : 'Send'
          }
          variant={confirmDialog.type === 'delete' ? 'danger' : confirmDialog.type === 'suspend' ? 'warning' : 'info'}
          loading={actionLoading}
        />
      </div>
    </MainLayout>
  );
}

// ─── Review Field Component ──────────────────────────────────────────────────
function ReviewField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-slate-900 dark:text-white ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
