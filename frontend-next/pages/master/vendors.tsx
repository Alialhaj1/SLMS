import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  FunnelIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  EllipsisVerticalIcon,
  BanknotesIcon,
  DocumentPlusIcon,
  NoSymbolIcon,
  PlayIcon,
  PaperClipIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  HeartIcon,
  DocumentCheckIcon,
  DocumentMinusIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

// ============================================
// INTERFACES
// ============================================

interface VendorType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface VendorClassification {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  color?: string;
}

interface VendorStatus {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  color?: string;
  allows_purchase_orders?: boolean;
  allows_invoices?: boolean;
  allows_payments?: boolean;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol?: string;
}

interface Country {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface PaymentTerm {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  days: number;
}

interface Vendor {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  tax_number?: string;
  country_id?: number;
  country_name?: string;
  country_name_ar?: string;
  city_id?: number;
  city_name?: string;
  city_name_ar?: string;
  address?: string;
  credit_limit?: number;
  outstanding_balance?: number;
  opening_balance?: number;
  overdue_invoices_count?: number;
  type_id?: number;
  type_name?: string;
  type_name_ar?: string;
  category_id?: number;
  category_name?: string;
  category_name_ar?: string;
  classification_id?: number;
  classification_name?: string;
  classification_name_ar?: string;
  classification_color?: string;
  status_id?: number;
  status_name?: string;
  status_name_ar?: string;
  status_color?: string;
  status_code?: string;
  allows_purchase_orders?: boolean;
  allows_invoices?: boolean;
  allows_payments?: boolean;
  currency_id?: number;
  currency_code?: string;
  currency_name?: string;
  currency_symbol?: string;
  default_payment_term_id?: number;
  payment_terms_name?: string;
  payment_terms_name_ar?: string;
  payment_terms_days?: number;
  is_local?: boolean;
  rating_score?: number;
  logo_url?: string;
  website?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  last_transaction_date?: string;
  last_po_date?: string;
  last_payment_date?: string;
  last_po_amount?: number;
  last_payment_amount?: number;
  po_count?: number;
  invoice_count?: number;
  total_purchases?: number;
  is_active?: boolean;
  is_suspended?: boolean;
  documents_status?: 'complete' | 'missing' | 'expired';
  documents_count?: number;
  expired_documents_count?: number;
  missing_documents_count?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface VendorStats {
  total: number;
  active: number;
  inactive: number;
  local: number;
  foreign: number;
  totalOutstanding: number;
  totalCreditLimit: number;
  expiredDocuments: number;
  highRisk: number;
  attentionNeeded: number;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  email: string;
  phone: string;
  mobile: string;
  tax_number: string;
  country_id: number | null;
  city_id: number | null;
  address: string;
  credit_limit: number;
  type_id: number | null;
  category_id: number | null;
  classification_id: number | null;
  status_id: number | null;
  currency_id: number | null;
  default_payment_term_id: number | null;
  is_local: boolean;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  notes: string;
  is_active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  email: '',
  phone: '',
  mobile: '',
  tax_number: '',
  country_id: null,
  city_id: null,
  address: '',
  credit_limit: 0,
  type_id: null,
  category_id: null,
  classification_id: null,
  status_id: null,
  currency_id: null,
  default_payment_term_id: null,
  is_local: true,
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  notes: '',
  is_active: true,
};

// ============================================
// VENDOR HEALTH CALCULATION
// ============================================

type HealthStatus = 'healthy' | 'attention' | 'high_risk';

interface VendorHealth {
  status: HealthStatus;
  reasons: string[];
  score: number;
}

function calculateVendorHealth(vendor: Vendor, isArabic: boolean): VendorHealth {
  const reasons: string[] = [];
  let score = 100;

  // Check if suspended
  if (vendor.is_suspended || vendor.status_code === 'suspended' || vendor.status_code === 'blocked') {
    reasons.push(isArabic ? 'مورد موقوف' : 'Vendor suspended');
    score -= 50;
  }

  // Check credit limit exceeded
  if (vendor.credit_limit && vendor.outstanding_balance) {
    if (vendor.outstanding_balance > vendor.credit_limit) {
      reasons.push(isArabic ? 'تجاوز حد الائتمان' : 'Credit limit exceeded');
      score -= 30;
    } else if (vendor.outstanding_balance > vendor.credit_limit * 0.8) {
      reasons.push(isArabic ? 'اقتراب من حد الائتمان' : 'Near credit limit');
      score -= 15;
    }
  }

  // Check overdue invoices
  if (vendor.overdue_invoices_count && vendor.overdue_invoices_count > 0) {
    reasons.push(isArabic ? `${vendor.overdue_invoices_count} فواتير متأخرة` : `${vendor.overdue_invoices_count} overdue invoices`);
    score -= vendor.overdue_invoices_count * 10;
  }

  // Check low rating
  if (vendor.rating_score !== undefined && vendor.rating_score < 3) {
    reasons.push(isArabic ? 'تقييم منخفض' : 'Low rating');
    score -= 20;
  }

  // Check expired documents
  if (vendor.expired_documents_count && vendor.expired_documents_count > 0) {
    reasons.push(isArabic ? 'مستندات منتهية' : 'Expired documents');
    score -= 15;
  }

  // Determine status
  let status: HealthStatus;
  if (score >= 80) {
    status = 'healthy';
  } else if (score >= 50) {
    status = 'attention';
  } else {
    status = 'high_risk';
  }

  return { status, reasons, score: Math.max(0, score) };
}

// ============================================
// HELPER COMPONENTS
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  trend?: { value: number; label: string };
  onClick?: () => void;
  loading?: boolean;
}

function StatCard({ title, value, icon, color, trend, onClick, loading }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    gray: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div
      className={`rounded-xl border p-4 ${colorClasses[color]} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]' : ''
      }`}
      onClick={onClick}
    >
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
            <span className={iconColorClasses[color]}>{icon}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
          {trend && (
            <div className="flex items-center mt-1 text-xs">
              <span className={trend.value >= 0 ? 'text-green-600' : 'text-red-600'}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">{trend.label}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars.push(<StarIconSolid key={i} className={`${sizeClass} text-yellow-400`} />);
    } else {
      stars.push(<StarIcon key={i} className={`${sizeClass} text-gray-300 dark:text-gray-600`} />);
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

// Vendor Health Badge Component
function HealthBadge({ health, isArabic }: { health: VendorHealth; isArabic: boolean }) {
  const config = {
    healthy: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      icon: <HeartIconSolid className="w-3.5 h-3.5" />,
      label: isArabic ? 'سليم' : 'Healthy',
    },
    attention: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" />,
      label: isArabic ? 'يحتاج متابعة' : 'Attention',
    },
    high_risk: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      icon: <ShieldExclamationIcon className="w-3.5 h-3.5" />,
      label: isArabic ? 'خطر عالي' : 'High Risk',
    },
  };

  const c = config[health.status];

  return (
    <div className="relative group">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {c.icon}
        {c.label}
      </span>
      {health.reasons.length > 0 && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap min-w-[150px]">
          <div className="font-medium mb-1">{isArabic ? 'الأسباب:' : 'Reasons:'}</div>
          <ul className="space-y-0.5">
            {health.reasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
}

// Documents Status Badge
function DocumentsStatusBadge({ vendor, isArabic }: { vendor: Vendor; isArabic: boolean }) {
  const status = vendor.documents_status || 'missing';
  const config = {
    complete: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      icon: <DocumentCheckIcon className="w-4 h-4" />,
      label: isArabic ? 'مكتملة' : 'Complete',
    },
    missing: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      icon: <DocumentMinusIcon className="w-4 h-4" />,
      label: isArabic ? 'ناقصة' : 'Missing',
    },
    expired: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      icon: <DocumentTextIcon className="w-4 h-4" />,
      label: isArabic ? 'منتهية' : 'Expired',
    },
  };

  const c = config[status];

  return (
    <div className="relative group">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
        {c.icon}
        {c.label}
      </span>
      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        <div className="space-y-1">
          <div>{isArabic ? 'المستندات:' : 'Documents:'} {vendor.documents_count || 0}</div>
          {vendor.expired_documents_count ? (
            <div className="text-red-300">{isArabic ? 'منتهية:' : 'Expired:'} {vendor.expired_documents_count}</div>
          ) : null}
          {vendor.missing_documents_count ? (
            <div className="text-yellow-300">{isArabic ? 'ناقصة:' : 'Missing:'} {vendor.missing_documents_count}</div>
          ) : null}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    </div>
  );
}

// Vendor Avatar with Smart Fallback
function VendorAvatar({ vendor, size = 'md' }: { vendor: Vendor; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  // Generate consistent color based on vendor name
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
  ];
  const colorIndex = vendor.name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  const initials = vendor.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  if (vendor.logo_url) {
    return (
      <img
        src={vendor.logo_url}
        alt={vendor.name}
        className={`${sizeClasses[size]} rounded-lg object-cover border border-gray-200 dark:border-gray-700`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} rounded-lg flex items-center justify-center text-white font-semibold`}
    >
      {initials}
    </div>
  );
}

// Quick Actions Dropdown
interface QuickActionsProps {
  vendor: Vendor;
  isArabic: boolean;
  hasPermission: (p: string) => boolean;
  onAction: (action: string, vendor: Vendor) => void;
}

function QuickActionsDropdown({ vendor, isArabic, hasPermission, onAction }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actions = [
    { key: 'view', label: isArabic ? 'عرض الملف' : 'View Profile', icon: EyeIcon, permission: 'vendors:view', show: true },
    { key: 'statement', label: isArabic ? 'كشف حساب' : 'Statement', icon: DocumentTextIcon, permission: 'vendors:statements:view', show: true },
    { key: 'payment', label: isArabic ? 'إنشاء دفعة' : 'Create Payment', icon: BanknotesIcon, permission: 'vendor_payments:create', show: vendor.allows_payments !== false },
    { key: 'po', label: isArabic ? 'إنشاء أمر شراء' : 'Create PO', icon: DocumentPlusIcon, permission: 'purchase_orders:create', show: vendor.allows_purchase_orders !== false },
    { key: 'divider1', label: '', icon: null, permission: '', show: true },
    { key: 'edit', label: isArabic ? 'تعديل' : 'Edit', icon: PencilIcon, permission: 'vendors:edit', show: true },
    { key: 'upload', label: isArabic ? 'رفع مستند' : 'Upload Document', icon: PaperClipIcon, permission: 'vendors:documents:manage', show: true },
    { key: 'divider2', label: '', icon: null, permission: '', show: true },
    { key: vendor.is_suspended ? 'activate' : 'suspend', label: vendor.is_suspended ? (isArabic ? 'تفعيل' : 'Activate') : (isArabic ? 'إيقاف' : 'Suspend'), icon: vendor.is_suspended ? PlayIcon : NoSymbolIcon, permission: 'vendors:status:manage', show: true },
    { key: 'delete', label: isArabic ? 'حذف' : 'Delete', icon: TrashIcon, permission: 'vendors:delete', show: true, danger: true },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {actions.map((action) => {
            if (!action.show) return null;
            if (action.key.startsWith('divider')) {
              return <div key={action.key} className="border-t border-gray-200 dark:border-gray-700 my-1" />;
            }
            if (action.permission && !hasPermission(action.permission) && !hasPermission(`master:${action.permission}`)) {
              return null;
            }
            const Icon = action.icon!;
            return (
              <button
                key={action.key}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onAction(action.key, vendor);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                  action.danger
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Vendor Hover Preview
function VendorHoverPreview({ vendor, isArabic }: { vendor: Vendor; isArabic: boolean }) {
  const formatCurrency = (amount: number | undefined, currencyCode?: string) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currencyCode || 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="absolute z-50 left-full top-0 ml-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
      <div className="flex items-center gap-3 mb-3">
        <VendorAvatar vendor={vendor} size="lg" />
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{vendor.name}</div>
          <div className="text-xs text-gray-500">{vendor.code}</div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">{isArabic ? 'المستحق' : 'Outstanding'}</span>
          <span className={`font-medium ${(vendor.outstanding_balance || 0) > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(vendor.outstanding_balance, vendor.currency_code)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{isArabic ? 'حد الائتمان' : 'Credit Limit'}</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(vendor.credit_limit, vendor.currency_code)}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
          <div className="flex justify-between">
            <span className="text-gray-500">{isArabic ? 'آخر أمر شراء' : 'Last PO'}</span>
            <span className="text-gray-900 dark:text-white">{formatDate(vendor.last_po_date)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-500">{isArabic ? 'آخر دفعة' : 'Last Payment'}</span>
            <span className="text-gray-900 dark:text-white">{formatDate(vendor.last_payment_date)}</span>
          </div>
        </div>
        {vendor.rating_score !== undefined && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-500">{isArabic ? 'التقييم' : 'Rating'}</span>
            <RatingStars rating={vendor.rating_score} />
          </div>
        )}
      </div>
    </div>
  );
}

// Last Activity Indicator
function LastActivityIndicator({ date, isArabic }: { date: string | undefined; isArabic: boolean }) {
  if (!date) return <span className="text-xs text-gray-400">—</span>;

  const now = new Date();
  const lastDate = new Date(date);
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  let color = 'text-green-600';
  let label = isArabic ? 'نشط' : 'Active';

  if (diffDays > 90) {
    color = 'text-red-500';
    label = isArabic ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  } else if (diffDays > 30) {
    color = 'text-yellow-500';
    label = isArabic ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  } else if (diffDays > 7) {
    label = isArabic ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  } else if (diffDays > 0) {
    label = isArabic ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  }

  return (
    <span className={`text-xs ${color} flex items-center gap-1`}>
      <CalendarDaysIcon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

function VendorsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();
  const isArabic = locale === 'ar';

  // Data states
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Reference data
  const [vendorTypes, setVendorTypes] = useState<VendorType[]>([]);
  const [classifications, setClassifications] = useState<VendorClassification[]>([]);
  const [statuses, setStatuses] = useState<VendorStatus[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [categories, setCategories] = useState<VendorType[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterClassification, setFilterClassification] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCurrency, setFilterCurrency] = useState<string>('');
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [filterLocal, setFilterLocal] = useState<string>('');
  const [filterBalance, setFilterBalance] = useState<string>('');
  const [filterHealth, setFilterHealth] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);
  const [vendorToSuspend, setVendorToSuspend] = useState<Vendor | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    fetchVendors();
    fetchStats();
    fetchReferenceData();
  }, []);

  // Restore filters from session storage
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('vendorListFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setSearchTerm(filters.searchTerm || '');
        setFilterType(filters.filterType || '');
        setFilterClassification(filters.filterClassification || '');
        setFilterStatus(filters.filterStatus || '');
        setFilterCurrency(filters.filterCurrency || '');
        setFilterCountry(filters.filterCountry || '');
        setFilterLocal(filters.filterLocal || '');
        setFilterBalance(filters.filterBalance || '');
        setFilterHealth(filters.filterHealth || '');
        setCurrentPage(filters.currentPage || 1);
        setSortField(filters.sortField || 'code');
        setSortDirection(filters.sortDirection || 'asc');
      } catch (e) {
        console.error('Failed to restore filters:', e);
      }
    }
  }, []);

  // Save filters to session storage
  useEffect(() => {
    const filters = {
      searchTerm, filterType, filterClassification, filterStatus,
      filterCurrency, filterCountry, filterLocal, filterBalance, filterHealth,
      currentPage, sortField, sortDirection,
    };
    sessionStorage.setItem('vendorListFilters', JSON.stringify(filters));
  }, [searchTerm, filterType, filterClassification, filterStatus, filterCurrency, filterCountry, filterLocal, filterBalance, filterHealth, currentPage, sortField, sortDirection]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/procurement/vendors?limit=1000', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setVendors(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast('Failed to load vendors', 'error');
      }
    } catch (error) {
      showToast('Failed to load vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/procurement/vendors/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [typesRes, classRes, statusRes, currRes, countryRes, paymentRes, catRes] = await Promise.all([
        fetch('http://localhost:4000/api/procurement/vendors/vendor-types', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/procurement/vendors/classifications', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/procurement/vendors/vendor-statuses', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/master/currencies', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/master/countries', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/procurement/vendors/payment-terms', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/procurement/vendors/vendor-categories', { headers }).catch(() => null),
      ]);

      if (typesRes?.ok) setVendorTypes((await typesRes.json()).data || []);
      if (classRes?.ok) setClassifications((await classRes.json()).data || []);
      if (statusRes?.ok) setStatuses((await statusRes.json()).data || []);
      if (currRes?.ok) setCurrencies((await currRes.json()).data || []);
      if (countryRes?.ok) setCountries((await countryRes.json()).data || []);
      if (paymentRes?.ok) setPaymentTerms((await paymentRes.json()).data || []);
      if (catRes?.ok) setCategories((await catRes.json()).data || []);
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  };

  // ============================================
  // FILTERING & SORTING
  // ============================================

  const filteredVendors = useMemo(() => {
    let result = [...vendors];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.code?.toLowerCase().includes(term) ||
          v.name?.toLowerCase().includes(term) ||
          v.name_ar?.toLowerCase().includes(term) ||
          v.email?.toLowerCase().includes(term) ||
          v.phone?.toLowerCase().includes(term) ||
          v.tax_number?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filterType) result = result.filter((v) => v.type_id?.toString() === filterType);

    // Classification filter
    if (filterClassification) result = result.filter((v) => v.classification_id?.toString() === filterClassification);

    // Status filter
    if (filterStatus) result = result.filter((v) => v.status_id?.toString() === filterStatus);

    // Currency filter
    if (filterCurrency) result = result.filter((v) => v.currency_id?.toString() === filterCurrency);

    // Country filter
    if (filterCountry) result = result.filter((v) => v.country_id?.toString() === filterCountry);

    // Local/Foreign filter
    if (filterLocal === 'local') result = result.filter((v) => v.is_local === true);
    else if (filterLocal === 'foreign') result = result.filter((v) => v.is_local === false);

    // Balance filter
    if (filterBalance === 'with_balance') result = result.filter((v) => (v.outstanding_balance || 0) > 0);
    else if (filterBalance === 'no_balance') result = result.filter((v) => (v.outstanding_balance || 0) === 0);
    else if (filterBalance === 'over_limit') result = result.filter((v) => (v.outstanding_balance || 0) > (v.credit_limit || 0));

    // Health filter
    if (filterHealth) {
      result = result.filter((v) => calculateVendorHealth(v, isArabic).status === filterHealth);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any = a[sortField as keyof Vendor];
      let bVal: any = b[sortField as keyof Vendor];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [vendors, searchTerm, filterType, filterClassification, filterStatus, filterCurrency, filterCountry, filterLocal, filterBalance, filterHealth, sortField, sortDirection, isArabic]);

  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVendors.slice(start, start + pageSize);
  }, [filteredVendors, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredVendors.length / pageSize);

  const hasActiveFilters = filterType || filterClassification || filterStatus || filterCurrency || filterCountry || filterLocal || filterBalance || filterHealth;

  const clearFilters = () => {
    setFilterType('');
    setFilterClassification('');
    setFilterStatus('');
    setFilterCurrency('');
    setFilterCountry('');
    setFilterLocal('');
    setFilterBalance('');
    setFilterHealth('');
    setSearchTerm('');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ============================================
  // QUICK ACTIONS HANDLER
  // ============================================

  const handleQuickAction = (action: string, vendor: Vendor) => {
    switch (action) {
      case 'view':
        router.push(`/master/vendors/${vendor.id}`);
        break;
      case 'statement':
        router.push(`/master/vendors/${vendor.id}?tab=statement`);
        break;
      case 'payment':
        router.push(`/finance/vendor-payments/create?vendorId=${vendor.id}`);
        break;
      case 'po':
        router.push(`/procurement/purchase-orders/create?vendorId=${vendor.id}`);
        break;
      case 'edit':
        handleOpenModal(vendor);
        break;
      case 'upload':
        router.push(`/master/vendors/${vendor.id}?tab=documents&action=upload`);
        break;
      case 'suspend':
      case 'activate':
        setVendorToSuspend(vendor);
        setSuspendConfirmOpen(true);
        break;
      case 'delete':
        handleDeleteClick(vendor);
        break;
    }
  };

  // ============================================
  // FORM HANDLERS
  // ============================================

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Vendor code is required';
    if (!formData.name.trim()) errors.name = 'Vendor name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      errors.contact_email = 'Invalid email format';
    }
    if (formData.credit_limit < 0) errors.credit_limit = 'Credit limit must be positive';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        code: vendor.code,
        name: vendor.name,
        name_ar: vendor.name_ar || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        mobile: vendor.mobile || '',
        tax_number: vendor.tax_number || '',
        country_id: vendor.country_id || null,
        city_id: vendor.city_id || null,
        address: vendor.address || '',
        credit_limit: vendor.credit_limit || 0,
        type_id: vendor.type_id || null,
        category_id: vendor.category_id || null,
        classification_id: vendor.classification_id || null,
        status_id: vendor.status_id || null,
        currency_id: vendor.currency_id || null,
        default_payment_term_id: vendor.default_payment_term_id || null,
        is_local: vendor.is_local ?? true,
        contact_person: vendor.contact_person || '',
        contact_email: vendor.contact_email || '',
        contact_phone: vendor.contact_phone || '',
        website: vendor.website || '',
        notes: vendor.notes || '',
        is_active: vendor.is_active ?? true,
      });
    } else {
      setEditingVendor(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingVendor(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingVendor
        ? `http://localhost:4000/api/procurement/vendors/${editingVendor.id}`
        : 'http://localhost:4000/api/procurement/vendors';
      const res = await fetch(url, {
        method: editingVendor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToast(editingVendor ? 'Vendor updated successfully' : 'Vendor created successfully', 'success');
        handleCloseModal();
        fetchVendors();
        fetchStats();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Failed to save vendor', 'error');
      }
    } catch (error) {
      showToast('Failed to save vendor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setVendorToDelete(vendor);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vendorToDelete) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${vendorToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Vendor deleted successfully', 'success');
        fetchVendors();
        fetchStats();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Failed to delete vendor', 'error');
      }
    } catch (error) {
      showToast('Failed to delete vendor', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setVendorToDelete(null);
    }
  };

  const handleSuspendConfirm = async () => {
    if (!vendorToSuspend) return;
    try {
      const token = localStorage.getItem('accessToken');
      const action = vendorToSuspend.is_suspended ? 'activate' : 'suspend';
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${vendorToSuspend.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Vendor ${action === 'suspend' ? 'suspended' : 'activated'} successfully`, 'success');
        fetchVendors();
        fetchStats();
      } else {
        showToast(`Failed to ${action} vendor`, 'error');
      }
    } catch (error) {
      showToast('Operation failed', 'error');
    } finally {
      setSuspendConfirmOpen(false);
      setVendorToSuspend(null);
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const formatCurrency = (amount: number | undefined, currencyCode?: string) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currencyCode || 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (color?: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colorMap[color || 'gray'] || colorMap.gray;
  };

  const getRowHighlight = (vendor: Vendor) => {
    const health = calculateVendorHealth(vendor, isArabic);
    if (vendor.is_suspended) return 'bg-gray-100/50 dark:bg-gray-800/50 opacity-60';
    if (health.status === 'high_risk') return 'bg-red-50/50 dark:bg-red-900/10';
    if (health.status === 'attention') return 'bg-yellow-50/30 dark:bg-yellow-900/10';
    // New vendor (created in last 7 days)
    const created = new Date(vendor.created_at);
    const now = new Date();
    if ((now.getTime() - created.getTime()) < 7 * 24 * 60 * 60 * 1000) {
      return 'bg-blue-50/30 dark:bg-blue-900/10';
    }
    return '';
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 inline ml-1" />
    );
  };

  // ============================================
  // PERMISSION CHECK
  // ============================================

  if (!hasPermission('vendors:view') && !hasPermission('master:vendors:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <BuildingOfficeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view vendors.
          </p>
        </div>
      </MainLayout>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'إدارة الموردين - SLMS' : 'Vendors Management - SLMS'}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isArabic ? 'الموردين' : 'Vendors'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isArabic ? 'إدارة بيانات الموردين والارتباطات المالية والتشغيلية' : 'Manage vendor information, financial & operational data'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => { fetchVendors(); fetchStats(); }}>
              <ArrowPathIcon className="w-5 h-5 mr-2" />
              {isArabic ? 'تحديث' : 'Refresh'}
            </Button>
            {(hasPermission('vendors:create') || hasPermission('master:vendors:create')) && (
              <Button onClick={() => handleOpenModal()}>
                <PlusIcon className="w-5 h-5 mr-2" />
                {isArabic ? 'إضافة مورد' : 'Add Vendor'}
              </Button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard
            title={isArabic ? 'الموردين' : 'Vendors'}
            value={stats?.total || vendors.length}
            icon={<BuildingOfficeIcon className="w-5 h-5" />}
            color="blue"
            loading={statsLoading}
          />
          <StatCard
            title={isArabic ? 'نشطين' : 'Active'}
            value={stats?.active || vendors.filter(v => v.is_active !== false).length}
            icon={<CheckCircleIcon className="w-5 h-5" />}
            color="green"
            loading={statsLoading}
          />
          <StatCard
            title={isArabic ? 'محليين' : 'Local'}
            value={stats?.local || vendors.filter(v => v.is_local).length}
            icon={<TruckIcon className="w-5 h-5" />}
            color="purple"
            loading={statsLoading}
            onClick={() => { setFilterLocal('local'); setShowFilters(true); }}
          />
          <StatCard
            title={isArabic ? 'خارجيين' : 'Foreign'}
            value={stats?.foreign || vendors.filter(v => !v.is_local).length}
            icon={<TruckIcon className="w-5 h-5" />}
            color="yellow"
            loading={statsLoading}
            onClick={() => { setFilterLocal('foreign'); setShowFilters(true); }}
          />
          <StatCard
            title={isArabic ? 'المستحق' : 'Outstanding'}
            value={formatCurrency(stats?.totalOutstanding || vendors.reduce((s, v) => s + (v.outstanding_balance || 0), 0))}
            icon={<CurrencyDollarIcon className="w-5 h-5" />}
            color="red"
            loading={statsLoading}
            onClick={() => { setFilterBalance('with_balance'); setShowFilters(true); }}
          />
          <StatCard
            title={isArabic ? 'خطر عالي' : 'High Risk'}
            value={stats?.highRisk || vendors.filter(v => calculateVendorHealth(v, isArabic).status === 'high_risk').length}
            icon={<ShieldExclamationIcon className="w-5 h-5" />}
            color="red"
            loading={statsLoading}
            onClick={() => { setFilterHealth('high_risk'); setShowFilters(true); }}
          />
          <StatCard
            title={isArabic ? 'يحتاج متابعة' : 'Attention'}
            value={stats?.attentionNeeded || vendors.filter(v => calculateVendorHealth(v, isArabic).status === 'attention').length}
            icon={<ExclamationTriangleIcon className="w-5 h-5" />}
            color="yellow"
            loading={statsLoading}
            onClick={() => { setFilterHealth('attention'); setShowFilters(true); }}
          />
          <StatCard
            title={isArabic ? 'مستندات منتهية' : 'Expired Docs'}
            value={stats?.expiredDocuments || 0}
            icon={<DocumentTextIcon className="w-5 h-5" />}
            color={stats?.expiredDocuments ? 'red' : 'gray'}
            loading={statsLoading}
          />
        </div>

        {/* Search & Filters */}
        <div className="card">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={isArabic ? 'بحث بالاسم، الكود، البريد، الهاتف...' : 'Search by name, code, email, phone...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant={showFilters ? 'primary' : 'secondary'} onClick={() => setShowFilters(!showFilters)}>
                <FunnelIcon className="w-5 h-5 mr-2" />
                {isArabic ? 'الفلاتر' : 'Filters'}
                {hasActiveFilters && (
                  <span className="ml-2 bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 rounded-full px-2 py-0.5 text-xs font-medium">
                    {[filterType, filterClassification, filterStatus, filterCurrency, filterCountry, filterLocal, filterBalance, filterHealth].filter(Boolean).length}
                  </span>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="secondary" onClick={clearFilters} title={isArabic ? 'مسح الفلاتر' : 'Clear filters'}>
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'النوع' : 'Type'}
                  </label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-full text-sm">
                    <option value="">{isArabic ? 'الكل' : 'All'}</option>
                    {vendorTypes.map((type) => (
                      <option key={type.id} value={type.id}>{isArabic ? type.name_ar || type.name : type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'التصنيف' : 'Classification'}
                  </label>
                  <select value={filterClassification} onChange={(e) => setFilterClassification(e.target.value)} className="input w-full text-sm">
                    <option value="">{isArabic ? 'الكل' : 'All'}</option>
                    {classifications.map((cls) => (
                      <option key={cls.id} value={cls.id}>{isArabic ? cls.name_ar || cls.name : cls.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'الحالة' : 'Status'}
                  </label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-full text-sm">
                    <option value="">{isArabic ? 'الكل' : 'All'}</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>{isArabic ? status.name_ar || status.name : status.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'العملة' : 'Currency'}
                  </label>
                  <select value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)} className="input w-full text-sm">
                    <option value="">{isArabic ? 'الكل' : 'All'}</option>
                    {currencies.map((curr) => (
                      <option key={curr.id} value={curr.id}>{curr.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'الدولة' : 'Country'}
                  </label>
                  <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="input w-full text-sm">
                    <option value="">{isArabic ? 'الكل' : 'All'}</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>{isArabic ? country.name_ar || country.name : country.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'محلي/خارجي' : 'Local/Foreign'}
                  </label>
                  <select value={filterLocal} onChange={(e) => setFilterLocal(e.target.value)} className="input w-full text-sm">
                    <option value="">{isArabic ? 'الكل' : 'All'}</option>
                    <option value="local">{isArabic ? 'محلي' : 'Local'}</option>
                    <option value="foreign">{isArabic ? 'خارجي' : 'Foreign'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'الرصيد' : 'Balance'}
                  </label>
                  <select value={filterBalance} onChange={(e) => setFilterBalance(e.target.value)} className="input w-full text-sm">
                    <option value="">{isArabic ? 'الكل' : 'All'}</option>
                    <option value="with_balance">{isArabic ? 'له رصيد' : 'With Balance'}</option>
                    <option value="no_balance">{isArabic ? 'بدون رصيد' : 'No Balance'}</option>
                    <option value="over_limit">{isArabic ? 'تجاوز الحد' : 'Over Limit'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'الصحة' : 'Health'}
                  </label>
                  <select value={filterHealth} onChange={(e) => setFilterHealth(e.target.value)} className="input w-full text-sm">
                    <option value="">{isArabic ? 'الكل' : 'All'}</option>
                    <option value="healthy">{isArabic ? 'سليم' : 'Healthy'}</option>
                    <option value="attention">{isArabic ? 'يحتاج متابعة' : 'Attention'}</option>
                    <option value="high_risk">{isArabic ? 'خطر عالي' : 'High Risk'}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Vendors Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isArabic 
                ? `عرض ${paginatedVendors.length} من ${filteredVendors.length} مورد${vendors.length !== filteredVendors.length ? ` (إجمالي ${vendors.length})` : ''}`
                : `Showing ${paginatedVendors.length} of ${filteredVendors.length} vendors${vendors.length !== filteredVendors.length ? ` (${vendors.length} total)` : ''}`}
            </span>
            <div className="flex items-center gap-4">
              <button 
                onClick={fetchVendors} 
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isArabic ? 'تحديث البيانات' : 'Refresh data'}
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const csv = [
                    ['Code', 'Name', 'Name (AR)', 'Type', 'Status', 'Outstanding', 'Credit Limit', 'Currency'].join(','),
                    ...filteredVendors.map(v => [
                      v.code,
                      `"${(v.name || '').replace(/"/g, '""')}"`,
                      `"${(v.name_ar || '').replace(/"/g, '""')}"`,
                      v.type_name || '',
                      v.status_name || '',
                      v.outstanding_balance || 0,
                      v.credit_limit || 0,
                      v.currency_code || 'SAR'
                    ].join(','))
                  ].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `vendors_${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                }}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isArabic ? 'تصدير CSV' : 'Export CSV'}
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">{isArabic ? 'جاري التحميل...' : 'Loading vendors...'}</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{isArabic ? 'لا توجد نتائج' : 'No vendors found'}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm || hasActiveFilters ? (isArabic ? 'جرب تعديل معايير البحث' : 'Try adjusting your search criteria') : (isArabic ? 'ابدأ بإضافة مورد جديد' : 'Get started by creating a new vendor')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('code')}>
                      {isArabic ? 'الكود' : 'Code'}<SortIcon field="code" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('name')}>
                      {isArabic ? 'المورد' : 'Vendor'}<SortIcon field="name" />
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'الصحة' : 'Health'}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'المستندات' : 'Docs'}
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('outstanding_balance')}>
                      {isArabic ? 'المستحق' : 'Outstanding'}<SortIcon field="outstanding_balance" />
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'حد الائتمان' : 'Credit Limit'}
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'التقييم' : 'Rating'}
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'آخر نشاط' : 'Activity'}
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedVendors.map((vendor) => {
                    const health = calculateVendorHealth(vendor, isArabic);
                    return (
                      <tr
                        key={vendor.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${getRowHighlight(vendor)}`}
                        onClick={() => router.push(`/master/vendors/${vendor.id}`)}
                      >
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">{vendor.code}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3 group relative">
                            <VendorAvatar vendor={vendor} />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {isArabic ? vendor.name_ar || vendor.name : vendor.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {vendor.type_name && (
                                  <span className="text-xs text-gray-500">{isArabic ? vendor.type_name_ar || vendor.type_name : vendor.type_name}</span>
                                )}
                                {vendor.is_local === false && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {isArabic ? 'خارجي' : 'Foreign'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <VendorHoverPreview vendor={vendor} isArabic={isArabic} />
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <HealthBadge health={health} isArabic={isArabic} />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {vendor.status_name ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vendor.status_color)}`}>
                              {isArabic ? vendor.status_name_ar || vendor.status_name : vendor.status_name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <DocumentsStatusBadge vendor={vendor} isArabic={isArabic} />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-right">
                          <span className={`text-sm font-medium ${(vendor.outstanding_balance || 0) > (vendor.credit_limit || 0) ? 'text-red-600 dark:text-red-400' : (vendor.outstanding_balance || 0) > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            {formatCurrency(vendor.outstanding_balance, vendor.currency_code)}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatCurrency(vendor.credit_limit, vendor.currency_code)}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          {vendor.rating_score ? <RatingStars rating={vendor.rating_score} /> : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <LastActivityIndicator date={vendor.last_transaction_date} isArabic={isArabic} />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <QuickActionsDropdown
                            vendor={vendor}
                            isArabic={isArabic}
                            hasPermission={hasPermission}
                            onAction={handleQuickAction}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredVendors.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Info and Page Size Selector */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    {isArabic 
                      ? `الصفحة ${currentPage} من ${totalPages} (${filteredVendors.length} مورد)`
                      : `Page ${currentPage} of ${totalPages} (${filteredVendors.length} vendors)`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{isArabic ? 'عرض:' : 'Show:'}</span>
                    <select 
                      value={pageSize} 
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} 
                      className="input py-1 px-2 text-sm min-w-[70px]"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                      <option value={500}>500</option>
                    </select>
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center gap-1">
                  {/* First Page */}
                  <button 
                    onClick={() => setCurrentPage(1)} 
                    disabled={currentPage === 1} 
                    className="px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isArabic ? 'الصفحة الأولى' : 'First page'}
                  >
                    «
                  </button>
                  
                  {/* Previous */}
                  <button 
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} 
                    disabled={currentPage === 1} 
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isArabic ? 'السابق' : 'Previous'}
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="hidden sm:flex items-center gap-1">
                    {totalPages <= 7 ? (
                      // Show all pages if total <= 7
                      Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))
                    ) : (
                      // Smart pagination with ellipsis
                      <>
                        {/* Always show first page */}
                        <button
                          onClick={() => setCurrentPage(1)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === 1 ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          1
                        </button>
                        
                        {/* Left ellipsis */}
                        {currentPage > 3 && <span className="px-2 text-gray-400">...</span>}
                        
                        {/* Middle pages */}
                        {Array.from({ length: 3 }, (_, i) => {
                          let pageNum;
                          if (currentPage <= 3) pageNum = i + 2;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 3 + i;
                          else pageNum = currentPage - 1 + i;
                          
                          if (pageNum <= 1 || pageNum >= totalPages) return null;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === pageNum ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        {/* Right ellipsis */}
                        {currentPage < totalPages - 2 && <span className="px-2 text-gray-400">...</span>}
                        
                        {/* Always show last page */}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === totalPages ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Mobile: Simple page indicator */}
                  <span className="sm:hidden px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentPage} / {totalPages}
                  </span>
                  
                  {/* Next */}
                  <button 
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages || totalPages === 0} 
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isArabic ? 'التالي' : 'Next'}
                  </button>
                  
                  {/* Last Page */}
                  <button 
                    onClick={() => setCurrentPage(totalPages)} 
                    disabled={currentPage === totalPages || totalPages === 0} 
                    className="px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isArabic ? 'الصفحة الأخيرة' : 'Last page'}
                  >
                    »
                  </button>
                </div>

                {/* Quick Jump */}
                <div className="hidden lg:flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? 'انتقل إلى:' : 'Go to:'}</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= totalPages) setCurrentPage(val);
                    }}
                    className="input py-1 px-2 text-sm w-16 text-center"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingVendor ? (isArabic ? 'تعديل المورد' : 'Edit Vendor') : (isArabic ? 'إضافة مورد جديد' : 'Create Vendor')} size="xl">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <BuildingOfficeIcon className="w-4 h-4" />
              {isArabic ? 'البيانات الأساسية' : 'Basic Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label={isArabic ? 'كود المورد' : 'Vendor Code'} required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} error={formErrors.code} disabled={!!editingVendor} />
              <Input label={isArabic ? 'الاسم (إنجليزي)' : 'Name (English)'} required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} error={formErrors.name} />
              <Input label={isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'} value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isArabic ? 'النوع' : 'Type'}</label>
                <select value={formData.type_id || ''} onChange={(e) => setFormData({ ...formData, type_id: e.target.value ? Number(e.target.value) : null })} className="input w-full">
                  <option value="">{isArabic ? 'اختر...' : 'Select...'}</option>
                  {vendorTypes.map((type) => (<option key={type.id} value={type.id}>{isArabic ? type.name_ar || type.name : type.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isArabic ? 'الفئة' : 'Category'}</label>
                <select value={formData.category_id || ''} onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : null })} className="input w-full">
                  <option value="">{isArabic ? 'اختر...' : 'Select...'}</option>
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{isArabic ? cat.name_ar || cat.name : cat.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isArabic ? 'التصنيف' : 'Classification'}</label>
                <select value={formData.classification_id || ''} onChange={(e) => setFormData({ ...formData, classification_id: e.target.value ? Number(e.target.value) : null })} className="input w-full">
                  <option value="">{isArabic ? 'اختر...' : 'Select...'}</option>
                  {classifications.map((cls) => (<option key={cls.id} value={cls.id}>{isArabic ? cls.name_ar || cls.name : cls.name}</option>))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isArabic ? 'الحالة' : 'Status'}</label>
                <select value={formData.status_id || ''} onChange={(e) => setFormData({ ...formData, status_id: e.target.value ? Number(e.target.value) : null })} className="input w-full">
                  <option value="">{isArabic ? 'اختر...' : 'Select...'}</option>
                  {statuses.map((status) => (<option key={status.id} value={status.id}>{isArabic ? status.name_ar || status.name : status.name}</option>))}
                </select>
              </div>
              <Input label={isArabic ? 'الرقم الضريبي' : 'Tax Number'} value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} />
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_local} onChange={(e) => setFormData({ ...formData, is_local: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-primary-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{isArabic ? 'محلي' : 'Local'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-primary-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{isArabic ? 'نشط' : 'Active'}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{isArabic ? 'معلومات الاتصال' : 'Contact Information'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label={isArabic ? 'البريد' : 'Email'} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} error={formErrors.email} />
              <Input label={isArabic ? 'الهاتف' : 'Phone'} type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              <Input label={isArabic ? 'الجوال' : 'Mobile'} type="tel" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isArabic ? 'الدولة' : 'Country'}</label>
                <select value={formData.country_id || ''} onChange={(e) => setFormData({ ...formData, country_id: e.target.value ? Number(e.target.value) : null })} className="input w-full">
                  <option value="">{isArabic ? 'اختر...' : 'Select...'}</option>
                  {countries.map((country) => (<option key={country.id} value={country.id}>{isArabic ? country.name_ar || country.name : country.name}</option>))}
                </select>
              </div>
              <Input label={isArabic ? 'العنوان' : 'Address'} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <CurrencyDollarIcon className="w-4 h-4" />
              {isArabic ? 'البيانات المالية' : 'Financial Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isArabic ? 'العملة' : 'Currency'}</label>
                <select value={formData.currency_id || ''} onChange={(e) => setFormData({ ...formData, currency_id: e.target.value ? Number(e.target.value) : null })} className="input w-full">
                  <option value="">{isArabic ? 'اختر...' : 'Select...'}</option>
                  {currencies.map((curr) => (<option key={curr.id} value={curr.id}>{curr.code} - {curr.name}</option>))}
                </select>
              </div>
              <Input label={isArabic ? 'حد الائتمان' : 'Credit Limit'} type="number" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })} error={formErrors.credit_limit} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isArabic ? 'شروط الدفع' : 'Payment Terms'}</label>
                <select value={formData.default_payment_term_id || ''} onChange={(e) => setFormData({ ...formData, default_payment_term_id: e.target.value ? Number(e.target.value) : null })} className="input w-full">
                  <option value="">{isArabic ? 'اختر...' : 'Select...'}</option>
                  {paymentTerms.map((term) => (<option key={term.id} value={term.id}>{isArabic ? term.name_ar || term.name : term.name}</option>))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isArabic ? 'ملاحظات' : 'Notes'}</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="input w-full" placeholder={isArabic ? 'أي ملاحظات...' : 'Any notes...'} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSubmit} loading={submitting}>{editingVendor ? (isArabic ? 'تحديث' : 'Update') : (isArabic ? 'إنشاء' : 'Create')}</Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setVendorToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        title={isArabic ? 'حذف المورد' : 'Delete Vendor'}
        message={isArabic ? `هل أنت متأكد من حذف "${vendorToDelete?.name_ar || vendorToDelete?.name}"؟` : `Are you sure you want to delete "${vendorToDelete?.name}"?`}
        confirmText={isArabic ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />

      {/* Suspend Confirmation */}
      <ConfirmDialog
        isOpen={suspendConfirmOpen}
        onClose={() => { setSuspendConfirmOpen(false); setVendorToSuspend(null); }}
        onConfirm={handleSuspendConfirm}
        title={vendorToSuspend?.is_suspended ? (isArabic ? 'تفعيل المورد' : 'Activate Vendor') : (isArabic ? 'إيقاف المورد' : 'Suspend Vendor')}
        message={vendorToSuspend?.is_suspended ? (isArabic ? `هل تريد تفعيل "${vendorToSuspend?.name}"؟` : `Do you want to activate "${vendorToSuspend?.name}"?`) : (isArabic ? `هل تريد إيقاف "${vendorToSuspend?.name}"؟ لن يمكن إنشاء معاملات جديدة.` : `Do you want to suspend "${vendorToSuspend?.name}"? New transactions will be blocked.`)}
        confirmText={vendorToSuspend?.is_suspended ? (isArabic ? 'تفعيل' : 'Activate') : (isArabic ? 'إيقاف' : 'Suspend')}
        variant={vendorToSuspend?.is_suspended ? 'primary' : 'danger'}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.Vendors.View, VendorsPage);
