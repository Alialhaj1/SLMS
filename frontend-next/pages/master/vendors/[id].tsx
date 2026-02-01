import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../../components/layout/MainLayout';
import { withAnyPermission } from '../../../utils/withPermission';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation } from '../../../hooks/useTranslation';
import { useLocale } from '../../../contexts/LocaleContext';
import { useToast } from '../../../contexts/ToastContext';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  BanknotesIcon,
  CreditCardIcon,
  DocumentTextIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingLibraryIcon,
  ClockIcon,
  StarIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ExclamationCircleIcon,
  PhotoIcon,
  BriefcaseIcon,
  XMarkIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

// ========================================
// INTERFACES
// ========================================

interface VendorProfile {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  vendor_type?: string;
  is_external: boolean;
  
  // Status
  status: string;
  status_id?: number;
  status_name?: string;
  status_name_ar?: string;
  status_color?: string;
  allows_purchase_orders?: boolean;
  blocked_reason?: string;
  
  // Classification
  category_id?: number;
  category_name?: string;
  category_name_ar?: string;
  type_id?: number;
  type_name?: string;
  type_name_ar?: string;
  classification_id?: number;
  classification_name?: string;
  classification_name_ar?: string;
  classification_color?: string;
  
  // Contact
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  primary_contact_name?: string;
  
  // Address
  country_id?: number;
  country_name?: string;
  country_name_ar?: string;
  city_id?: number;
  city_name?: string;
  city_name_ar?: string;
  address?: string;
  postal_code?: string;
  
  // Financial
  currency_id?: number;
  currency_code?: string;
  currency_symbol?: string;
  credit_limit?: number;
  current_balance?: number;
  outstanding_balance?: number;
  opening_balance?: number;
  total_paid_amount?: number;
  
  // Tax
  tax_number?: string;
  commercial_register?: string;
  withholding_tax_applicable?: boolean;
  
  // Payment
  payment_terms_id?: number;
  payment_terms_name?: string;
  payment_terms_name_ar?: string;
  default_payment_method?: string;
  
  // GL Account
  payable_account_id?: number;
  gl_account_code?: string;
  gl_account_name?: string;
  
  // Bank (legacy single)
  bank_id?: number;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_iban?: string;
  bank_swift?: string;
  
  // Performance & Rating
  rating_score?: number;
  rating_quality?: number;
  rating_delivery?: number;
  rating_price?: number;
  rating_compliance?: number;
  rating_notes?: string;
  lead_time_days?: number;
  min_order_amount?: number;
  
  // Vendor Logo
  vendor_logo_url?: string;
  vendor_cover_url?: string;
  
  // Stats
  total_po_count?: number;
  total_invoice_count?: number;
  total_shipment_count?: number;
  last_transaction_date?: string;
  last_po_date?: string;
  last_payment_date?: string;
  
  // Audit
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface VendorStatistics {
  purchaseOrders: { total: number; pending: number; approved: number; totalAmount: number };
  invoices: { total: number; unpaid: number; totalAmount: number; paidAmount: number };
  payments: { total: number; totalAmount: number; lastPayment: string | null };
  shipments: { total: number };
  contracts: { total: number; active: number };
  priceLists: { total: number };
}

interface BankAccount {
  id: number;
  bank_id?: number;
  bank_name?: string;
  bank_name_lookup?: string;
  account_name: string;
  account_number: string;
  iban?: string;
  swift_code?: string;
  currency_id?: number;
  currency_code?: string;
  country_id?: number;
  country_name?: string;
  branch_name?: string;
  is_default: boolean;
  is_active: boolean;
}

interface VendorDocument {
  id: number;
  document_type: string;
  type_name_en?: string;
  type_name_ar?: string;
  document_name: string;
  document_number?: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  issue_date?: string;
  expiry_date?: string;
  status: string;
  expiry_status?: string;
  days_until_expiry?: number;
  is_required: boolean;
  created_at: string;
}

interface VendorProject {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  status: string;
  total_contracted: number;
  total_invoiced: number;
  total_paid: number;
  outstanding: number;
  po_count: number;
  invoice_count: number;
  payment_count: number;
}

interface VendorItem {
  id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  vendor_item_code?: string;
  default_price?: number;
  currency_code?: string;
  lead_time?: number;
  min_order_qty?: number;
  is_active: boolean;
}

interface Transaction {
  id: number;
  document_number?: string;
  document_date?: string;
  total_amount?: number;
  paid_amount?: number;
  status?: string;
  payment_status?: string;
  currency_code?: string;
}

// ========================================
// HELPER COMPONENTS
// ========================================

function StatCard({ 
  label, 
  value, 
  subValue,
  icon: Icon, 
  color = 'blue',
  trend,
  onClick 
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  icon: any; 
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  trend?: 'up' | 'down';
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400',
  };

  return (
    <div 
      className={`p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {subValue && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: any }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color?: string }) {
  const bgColor = color || 'gray';
  const colorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${colorMap[bgColor] || colorMap.gray}`}>
      {status}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        star <= rating ? (
          <StarIconSolid key={star} className="w-4 h-4 text-yellow-400" />
        ) : (
          <StarIcon key={star} className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        )
      ))}
      <span className="ml-1 text-sm text-gray-500">({rating.toFixed(1)})</span>
    </div>
  );
}

// ========================================
// TAB COMPONENTS
// ========================================

function OverviewTab({ vendor, stats, isArabic, onTabChange }: { vendor: VendorProfile; stats: VendorStatistics | null; isArabic: boolean; onTabChange?: (tab: string) => void }) {
  const { t } = useTranslation();
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards - Clickable to switch tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label={isArabic ? 'أوامر الشراء' : 'Purchase Orders'}
          value={stats?.purchaseOrders.total || 0}
          subValue={`${stats?.purchaseOrders.pending || 0} ${isArabic ? 'قيد الانتظار' : 'pending'}`}
          icon={ClipboardDocumentListIcon}
          color="blue"
          onClick={() => onTabChange?.('purchase-orders')}
        />
        <StatCard
          label={isArabic ? 'الفواتير' : 'Invoices'}
          value={stats?.invoices.total || 0}
          subValue={`${stats?.invoices.unpaid || 0} ${isArabic ? 'غير مدفوعة' : 'unpaid'}`}
          icon={DocumentTextIcon}
          color={stats?.invoices.unpaid ? 'yellow' : 'green'}
          onClick={() => onTabChange?.('invoices')}
        />
        <StatCard
          label={isArabic ? 'المدفوعات' : 'Payments'}
          value={stats?.payments.total || 0}
          subValue={formatCurrency(stats?.payments.totalAmount || 0)}
          icon={BanknotesIcon}
          color="green"
          onClick={() => onTabChange?.('payments')}
        />
        <StatCard
          label={isArabic ? 'الشحنات' : 'Shipments'}
          value={stats?.shipments.total || 0}
          icon={TruckIcon}
          color="purple"
        />
        <StatCard
          label={isArabic ? 'العقود النشطة' : 'Active Contracts'}
          value={stats?.contracts.active || 0}
          subValue={`${stats?.contracts.total || 0} ${isArabic ? 'إجمالي' : 'total'}`}
          icon={DocumentTextIcon}
          color="blue"
        />
        <StatCard
          label={isArabic ? 'المشاريع' : 'Projects'}
          value={stats?.priceLists.total || 0}
          icon={BriefcaseIcon}
          color="gray"
          onClick={() => onTabChange?.('projects')}
        />
      </div>

      {/* Financial Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5 text-blue-500" />
          {isArabic ? 'الملخص المالي' : 'Financial Summary'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{isArabic ? 'حد الائتمان' : 'Credit Limit'}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(vendor.credit_limit || 0)} <span className="text-sm font-normal">{vendor.currency_code}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{isArabic ? 'الرصيد المستحق' : 'Outstanding Balance'}</p>
            <p className={`text-xl font-bold ${(vendor.outstanding_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(vendor.outstanding_balance || 0)} <span className="text-sm font-normal">{vendor.currency_code}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{isArabic ? 'إجمالي الفواتير' : 'Total Invoiced'}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats?.invoices.totalAmount || 0)} <span className="text-sm font-normal">{vendor.currency_code}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{isArabic ? 'إجمالي المدفوع' : 'Total Paid'}</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(stats?.payments.totalAmount || 0)} <span className="text-sm font-normal">{vendor.currency_code}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PhoneIcon className="w-5 h-5 text-green-500" />
            {isArabic ? 'معلومات الاتصال' : 'Contact Information'}
          </h3>
          <div className="space-y-1">
            <InfoRow label={isArabic ? 'الهاتف' : 'Phone'} value={vendor.phone} icon={PhoneIcon} />
            <InfoRow label={isArabic ? 'الجوال' : 'Mobile'} value={vendor.mobile} icon={PhoneIcon} />
            <InfoRow label={isArabic ? 'البريد الإلكتروني' : 'Email'} value={vendor.email} icon={EnvelopeIcon} />
            <InfoRow label={isArabic ? 'الموقع الإلكتروني' : 'Website'} value={vendor.website} icon={GlobeAltIcon} />
            <InfoRow label={isArabic ? 'جهة الاتصال الرئيسية' : 'Primary Contact'} value={vendor.primary_contact_name} />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPinIcon className="w-5 h-5 text-red-500" />
            {isArabic ? 'العنوان' : 'Address'}
          </h3>
          <div className="space-y-1">
            <InfoRow label={isArabic ? 'الدولة' : 'Country'} value={isArabic ? vendor.country_name_ar : vendor.country_name} />
            <InfoRow label={isArabic ? 'المدينة' : 'City'} value={isArabic ? vendor.city_name_ar : vendor.city_name} />
            <InfoRow label={isArabic ? 'العنوان' : 'Address'} value={vendor.address} icon={MapPinIcon} />
            <InfoRow label={isArabic ? 'الرمز البريدي' : 'Postal Code'} value={vendor.postal_code} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BankAccountsTab({ 
  vendorId, 
  bankAccounts, 
  loading, 
  onRefresh,
  canManage,
  isArabic 
}: { 
  vendorId: number; 
  bankAccounts: BankAccount[]; 
  loading: boolean; 
  onRefresh: () => void;
  canManage: boolean;
  isArabic: boolean;
}) {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    bank_name: '',
    account_name: '',
    account_number: '',
    iban: '',
    swift_code: '',
    branch_name: '',
    is_default: false,
  });

  const handleSubmit = async () => {
    if (!formData.account_name || !formData.account_number) {
      showToast(isArabic ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editing 
        ? `http://localhost:4000/api/procurement/vendors/${vendorId}/bank-accounts/${editing.id}`
        : `http://localhost:4000/api/procurement/vendors/${vendorId}/bank-accounts`;
      
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(isArabic ? 'تم الحفظ بنجاح' : 'Saved successfully', 'success');
        setModalOpen(false);
        setEditing(null);
        onRefresh();
      } else {
        const data = await res.json();
        showToast(data.error?.message || 'Failed to save', 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${vendorId}/bank-accounts/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(isArabic ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
        onRefresh();
      }
    } catch (error) {
      showToast(isArabic ? 'فشل الحذف' : 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const openAddModal = () => {
    setEditing(null);
    setFormData({
      bank_name: '',
      account_name: '',
      account_number: '',
      iban: '',
      swift_code: '',
      branch_name: '',
      is_default: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (account: BankAccount) => {
    setEditing(account);
    setFormData({
      bank_name: account.bank_name || account.bank_name_lookup || '',
      account_name: account.account_name,
      account_number: account.account_number,
      iban: account.iban || '',
      swift_code: account.swift_code || '',
      branch_name: account.branch_name || '',
      is_default: account.is_default,
    });
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isArabic ? 'الحسابات البنكية' : 'Bank Accounts'}
        </h3>
        {canManage && (
          <Button size="sm" onClick={openAddModal}>
            <PlusIcon className="w-4 h-4 mr-1" />
            {isArabic ? 'إضافة حساب' : 'Add Account'}
          </Button>
        )}
      </div>

      {/* List */}
      {bankAccounts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <BuildingLibraryIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{isArabic ? 'لا توجد حسابات بنكية' : 'No bank accounts found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bankAccounts.map((account) => (
            <div 
              key={account.id} 
              className={`p-4 rounded-lg border ${account.is_default ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BuildingLibraryIcon className="w-5 h-5 text-gray-500" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {account.bank_name || account.bank_name_lookup || (isArabic ? 'بنك غير محدد' : 'Unknown Bank')}
                    </span>
                    {account.is_default && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                        {isArabic ? 'افتراضي' : 'Default'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{isArabic ? 'اسم الحساب' : 'Account Name'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{account.account_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{isArabic ? 'رقم الحساب' : 'Account No.'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{account.account_number}</p>
                    </div>
                    {account.iban && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">IBAN</p>
                        <p className="font-medium text-gray-900 dark:text-white text-xs">{account.iban}</p>
                      </div>
                    )}
                    {account.swift_code && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">SWIFT</p>
                        <p className="font-medium text-gray-900 dark:text-white">{account.swift_code}</p>
                      </div>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(account)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(account.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing 
          ? (isArabic ? 'تعديل الحساب البنكي' : 'Edit Bank Account')
          : (isArabic ? 'إضافة حساب بنكي' : 'Add Bank Account')
        }
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={isArabic ? 'اسم البنك' : 'Bank Name'}
            value={formData.bank_name}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
          />
          <Input
            label={isArabic ? 'اسم الحساب' : 'Account Name'}
            value={formData.account_name}
            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
            required
          />
          <Input
            label={isArabic ? 'رقم الحساب' : 'Account Number'}
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="IBAN"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
            />
            <Input
              label="SWIFT Code"
              value={formData.swift_code}
              onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
            />
          </div>
          <Input
            label={isArabic ? 'اسم الفرع' : 'Branch Name'}
            value={formData.branch_name}
            onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {isArabic ? 'تعيين كحساب افتراضي' : 'Set as default account'}
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isArabic ? 'حفظ' : 'Save'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={isArabic ? 'حذف الحساب البنكي' : 'Delete Bank Account'}
        message={isArabic ? 'هل أنت متأكد من حذف هذا الحساب؟' : 'Are you sure you want to delete this bank account?'}
        confirmText={isArabic ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

function TransactionsTab<T extends Transaction>({ 
  title,
  data, 
  loading, 
  isArabic,
  emptyMessage,
  columns,
}: { 
  title: string;
  data: T[]; 
  loading: boolean; 
  isArabic: boolean;
  emptyMessage: string;
  columns: { key: keyof T | string; label: string; render?: (item: T) => React.ReactNode }[];
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {columns.map((col, i) => (
                  <td key={i} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {col.render ? col.render(item) : String((item as any)[col.key] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// File Upload Zone Component for drag & drop
function FileUploadZone({
  onFileSelect,
  accept = '*',
  maxSize = 10,
  isArabic = false,
  currentFile,
  disabled = false,
}: {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  isArabic?: boolean;
  currentFile?: string;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const validateFile = (file: File): boolean => {
    setError(null);
    if (file.size > maxSize * 1024 * 1024) {
      setError(isArabic ? `حجم الملف يتجاوز ${maxSize} MB` : `File exceeds ${maxSize} MB`);
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
        ${disabled 
          ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 cursor-not-allowed opacity-60'
          : isDragging
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      
      <CloudArrowUpIcon className={`w-10 h-10 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
      
      <p className={`text-sm font-medium ${isDragging ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
        {isDragging 
          ? (isArabic ? 'أفلت الملف هنا' : 'Drop file here')
          : (isArabic ? 'اسحب وأفلت الملف هنا أو انقر للاختيار' : 'Drag & drop file here or click to browse')
        }
      </p>
      
      <p className="text-xs text-gray-500 mt-1">
        {isArabic ? `الحد الأقصى: ${maxSize} MB` : `Max: ${maxSize} MB`}
      </p>

      {error && (
        <p className="text-xs text-red-600 mt-2 flex items-center justify-center gap-1">
          <ExclamationCircleIcon className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}

// Documents Tab Component
function DocumentsTab({ 
  vendorId, 
  documents, 
  loading, 
  onRefresh,
  canManage,
  isArabic,
  documentTypes 
}: { 
  vendorId: number; 
  documents: VendorDocument[]; 
  loading: boolean; 
  onRefresh: () => void;
  canManage: boolean;
  isArabic: boolean;
  documentTypes: any[];
}) {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendorDocument | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    document_type: '',
    document_name: '',
    document_number: '',
    description: '',
    file_url: '',
    file_name: '',
    issue_date: '',
    expiry_date: '',
    is_required: false,
  });

  const getExpiryStatusColor = (status?: string) => {
    if (status === 'expired') return 'red';
    if (status === 'expiring_soon') return 'yellow';
    return 'green';
  };

  const getExpiryStatusText = (doc: VendorDocument) => {
    if (doc.expiry_status === 'expired') {
      return isArabic ? 'منتهي' : 'Expired';
    }
    if (doc.expiry_status === 'expiring_soon') {
      return isArabic ? `ينتهي خلال ${doc.days_until_expiry} يوم` : `Expires in ${doc.days_until_expiry} days`;
    }
    return isArabic ? 'ساري' : 'Valid';
  };

  const handleSubmit = async () => {
    if (!formData.document_type || !formData.document_name || !formData.file_url) {
      showToast(isArabic ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editing 
        ? `http://localhost:4000/api/procurement/vendors/${vendorId}/documents/${editing.id}`
        : `http://localhost:4000/api/procurement/vendors/${vendorId}/documents`;
      
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...formData,
          file_name: formData.file_name || formData.file_url.split('/').pop(),
        }),
      });

      if (res.ok) {
        showToast(isArabic ? 'تم الحفظ بنجاح' : 'Saved successfully', 'success');
        setModalOpen(false);
        setEditing(null);
        onRefresh();
      } else {
        const data = await res.json();
        showToast(data.error?.message || 'Failed to save', 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${vendorId}/documents/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(isArabic ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
        onRefresh();
      }
    } catch (error) {
      showToast(isArabic ? 'فشل الحذف' : 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const openAddModal = () => {
    setEditing(null);
    setFormData({
      document_type: '',
      document_name: '',
      document_number: '',
      description: '',
      file_url: '',
      file_name: '',
      issue_date: '',
      expiry_date: '',
      is_required: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (doc: VendorDocument) => {
    setEditing(doc);
    setFormData({
      document_type: doc.document_type,
      document_name: doc.document_name,
      document_number: doc.document_number || '',
      description: doc.description || '',
      file_url: doc.file_url,
      file_name: doc.file_name,
      issue_date: doc.issue_date ? doc.issue_date.split('T')[0] : '',
      expiry_date: doc.expiry_date ? doc.expiry_date.split('T')[0] : '',
      is_required: doc.is_required,
    });
    setModalOpen(true);
  };

  // Count by status
  const expiredCount = documents.filter(d => d.expiry_status === 'expired').length;
  const expiringSoonCount = documents.filter(d => d.expiry_status === 'expiring_soon').length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header with alerts */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isArabic ? 'المستندات' : 'Documents'}
          </h3>
          {expiredCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
              <ExclamationCircleIcon className="w-3 h-3" />
              {expiredCount} {isArabic ? 'منتهي' : 'expired'}
            </span>
          )}
          {expiringSoonCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
              <ClockIcon className="w-3 h-3" />
              {expiringSoonCount} {isArabic ? 'ينتهي قريباً' : 'expiring soon'}
            </span>
          )}
        </div>
        {canManage && (
          <Button size="sm" onClick={openAddModal}>
            <PlusIcon className="w-4 h-4 mr-1" />
            {isArabic ? 'إضافة مستند' : 'Add Document'}
          </Button>
        )}
      </div>

      {/* List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FolderIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{isArabic ? 'لا توجد مستندات' : 'No documents found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className={`p-4 rounded-lg border ${
                doc.expiry_status === 'expired' 
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-700' 
                  : doc.expiry_status === 'expiring_soon'
                  ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-700'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {doc.document_name}
                    </span>
                    <StatusBadge 
                      status={getExpiryStatusText(doc)} 
                      color={getExpiryStatusColor(doc.expiry_status)} 
                    />
                    {doc.is_required && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                        {isArabic ? 'مطلوب' : 'Required'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{isArabic ? 'النوع' : 'Type'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {isArabic ? doc.type_name_ar : doc.type_name_en || doc.document_type}
                      </p>
                    </div>
                    {doc.document_number && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{isArabic ? 'الرقم' : 'Number'}</p>
                        <p className="font-medium text-gray-900 dark:text-white">{doc.document_number}</p>
                      </div>
                    )}
                    {doc.issue_date && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{isArabic ? 'تاريخ الإصدار' : 'Issue Date'}</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(doc.issue_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    )}
                    {doc.expiry_date && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{isArabic ? 'تاريخ الانتهاء' : 'Expiry Date'}</p>
                        <p className={`font-medium ${doc.expiry_status === 'expired' ? 'text-red-600' : doc.expiry_status === 'expiring_soon' ? 'text-yellow-600' : 'text-gray-900 dark:text-white'}`}>
                          {new Date(doc.expiry_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title={isArabic ? 'عرض' : 'View'}
                  >
                    <EyeIcon className="w-4 h-4" />
                  </a>
                  <a 
                    href={doc.file_url} 
                    download={doc.file_name}
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                    title={isArabic ? 'تحميل' : 'Download'}
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </a>
                  {canManage && (
                    <>
                      <button onClick={() => openEditModal(doc)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(doc.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing 
          ? (isArabic ? 'تعديل المستند' : 'Edit Document')
          : (isArabic ? 'إضافة مستند' : 'Add Document')
        }
        size="md"
      >
        <div className="space-y-4">
          <Select
            label={isArabic ? 'نوع المستند' : 'Document Type'}
            value={formData.document_type}
            onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
            required
          >
            <option value="">{isArabic ? 'اختر النوع' : 'Select type'}</option>
            {documentTypes.map((dt) => (
              <option key={dt.code} value={dt.code}>
                {isArabic ? dt.name_ar : dt.name_en}
              </option>
            ))}
          </Select>
          <Input
            label={isArabic ? 'اسم المستند' : 'Document Name'}
            value={formData.document_name}
            onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
            required
          />
          <Input
            label={isArabic ? 'رقم المستند' : 'Document Number'}
            value={formData.document_number}
            onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
          />
          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isArabic ? 'الملف' : 'File'} <span className="text-red-500">*</span>
            </label>
            
            {/* Drag & Drop Upload */}
            <FileUploadZone
              onFileSelect={async (file) => {
                // For now, create a local blob URL
                // In production, this would upload to backend
                const url = URL.createObjectURL(file);
                setFormData({ 
                  ...formData, 
                  file_url: url,
                  file_name: file.name 
                });
              }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
              maxSize={10}
              isArabic={isArabic}
              currentFile={formData.file_name || formData.file_url}
              disabled={false}
            />

            {/* Current file display */}
            {formData.file_url && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400 flex-1 truncate">
                  {formData.file_name || formData.file_url.split('/').pop() || (isArabic ? 'ملف محدد' : 'File selected')}
                </span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, file_url: '', file_name: '' })}
                  className="p-1 text-gray-500 hover:text-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Fallback URL input */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">
                {isArabic ? 'أو أدخل رابط الملف مباشرة:' : 'Or enter file URL directly:'}
              </p>
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label={isArabic ? 'تاريخ الإصدار' : 'Issue Date'}
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            />
            <Input
              type="date"
              label={isArabic ? 'تاريخ الانتهاء' : 'Expiry Date'}
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>
          <Input
            label={isArabic ? 'الوصف' : 'Description'}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_required}
              onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {isArabic ? 'مستند مطلوب' : 'Required document'}
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isArabic ? 'حفظ' : 'Save'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={isArabic ? 'حذف المستند' : 'Delete Document'}
        message={isArabic ? 'هل أنت متأكد من حذف هذا المستند؟' : 'Are you sure you want to delete this document?'}
        confirmText={isArabic ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

// Projects Tab Component
function ProjectsTab({ 
  vendorId, 
  projects, 
  loading, 
  isArabic 
}: { 
  vendorId: number; 
  projects: VendorProject[]; 
  loading: boolean; 
  isArabic: boolean;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate totals
  const totals = projects.reduce((acc, p) => ({
    contracted: acc.contracted + parseFloat(String(p.total_contracted || 0)),
    paid: acc.paid + parseFloat(String(p.total_paid || 0)),
    outstanding: acc.outstanding + parseFloat(String(p.outstanding || 0)),
  }), { contracted: 0, paid: 0, outstanding: 0 });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BriefcaseIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>{isArabic ? 'لا توجد مشاريع مرتبطة' : 'No linked projects'}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {isArabic ? 'المشاريع المرتبطة' : 'Linked Projects'}
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400">{isArabic ? 'إجمالي التعاقد' : 'Total Contracted'}</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totals.contracted)}</p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{isArabic ? 'إجمالي المدفوع' : 'Total Paid'}</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{isArabic ? 'إجمالي المتبقي' : 'Total Outstanding'}</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totals.outstanding)}</p>
        </div>
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {isArabic ? 'المشروع' : 'Project'}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {isArabic ? 'الحالة' : 'Status'}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {isArabic ? 'أوامر الشراء' : 'POs'}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {isArabic ? 'قيمة التعاقد' : 'Contracted'}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {isArabic ? 'المدفوع' : 'Paid'}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {isArabic ? 'المتبقي' : 'Outstanding'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {isArabic && project.name_ar ? project.name_ar : project.name}
                    </p>
                    <p className="text-xs text-gray-500">{project.code}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={project.status} color={project.status === 'active' ? 'green' : 'gray'} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{project.po_count}</td>
                <td className="px-4 py-3 text-sm font-medium text-blue-600">{formatCurrency(project.total_contracted)}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">{formatCurrency(project.total_paid)}</td>
                <td className="px-4 py-3 text-sm font-medium text-red-600">{formatCurrency(project.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Rating Edit Component
function RatingEditModal({
  isOpen,
  onClose,
  vendor,
  onSave,
  isArabic,
}: {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorProfile;
  onSave: (ratings: any) => Promise<void>;
  isArabic: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState({
    rating_quality: vendor.rating_quality || 0,
    rating_delivery: vendor.rating_delivery || 0,
    rating_price: vendor.rating_price || 0,
    rating_compliance: vendor.rating_compliance || 0,
    rating_notes: vendor.rating_notes || '',
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSave(ratings);
    setSubmitting(false);
    onClose();
  };

  const RatingInput = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            {star <= value ? (
              <StarIconSolid className="w-6 h-6 text-yellow-400" />
            ) : (
              <StarIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            )}
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-500">({value}/5)</span>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isArabic ? 'تقييم المورد' : 'Vendor Rating'}
      size="md"
    >
      <div className="space-y-5">
        <RatingInput
          label={isArabic ? 'الجودة' : 'Quality'}
          value={ratings.rating_quality}
          onChange={(v) => setRatings({ ...ratings, rating_quality: v })}
        />
        <RatingInput
          label={isArabic ? 'التسليم' : 'Delivery'}
          value={ratings.rating_delivery}
          onChange={(v) => setRatings({ ...ratings, rating_delivery: v })}
        />
        <RatingInput
          label={isArabic ? 'السعر' : 'Price'}
          value={ratings.rating_price}
          onChange={(v) => setRatings({ ...ratings, rating_price: v })}
        />
        <RatingInput
          label={isArabic ? 'الالتزام' : 'Compliance'}
          value={ratings.rating_compliance}
          onChange={(v) => setRatings({ ...ratings, rating_compliance: v })}
        />
        <Input
          label={isArabic ? 'ملاحظات' : 'Notes'}
          value={ratings.rating_notes}
          onChange={(e) => setRatings({ ...ratings, rating_notes: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>
          {isArabic ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button onClick={handleSubmit} loading={submitting}>
          {isArabic ? 'حفظ التقييم' : 'Save Rating'}
        </Button>
      </div>
    </Modal>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

function VendorProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [stats, setStats] = useState<VendorStatistics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Tab data
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [projects, setProjects] = useState<VendorProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const fetchVendorProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVendor(data.data.vendor);
        setStats(data.data.statistics);
      } else {
        showToast(isArabic ? 'فشل تحميل بيانات المورد' : 'Failed to load vendor', 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isArabic, showToast]);

  const fetchBankAccounts = useCallback(async () => {
    if (!id) return;
    setBankAccountsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/bank-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setBankAccountsLoading(false);
    }
  }, [id]);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!id) return;
    setPosLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/purchase-orders?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching POs:', error);
    } finally {
      setPosLoading(false);
    }
  }, [id]);

  const fetchInvoices = useCallback(async () => {
    if (!id) return;
    setInvoicesLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/invoices?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  }, [id]);

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    setPaymentsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/payments?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setPaymentsLoading(false);
    }
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    if (!id) return;
    setDocumentsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  }, [id]);

  const fetchDocumentTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/document-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocumentTypes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!id) return;
    setProjectsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setProjectsLoading(false);
    }
  }, [id]);

  // Rating modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);

  const handleSaveRating = async (ratings: any) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/rating`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(ratings),
      });
      if (res.ok) {
        showToast(isArabic ? 'تم حفظ التقييم' : 'Rating saved', 'success');
        fetchVendorProfile();
      } else {
        showToast(isArabic ? 'فشل حفظ التقييم' : 'Failed to save rating', 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    }
  };

  useEffect(() => {
    fetchVendorProfile();
    fetchDocumentTypes();
  }, [fetchVendorProfile, fetchDocumentTypes]);

  useEffect(() => {
    if (activeTab === 'bank-accounts') fetchBankAccounts();
    else if (activeTab === 'documents') fetchDocuments();
    else if (activeTab === 'projects') fetchProjects();
    else if (activeTab === 'purchase-orders') fetchPurchaseOrders();
    else if (activeTab === 'invoices') fetchInvoices();
    else if (activeTab === 'payments') fetchPayments();
  }, [activeTab, fetchBankAccounts, fetchDocuments, fetchProjects, fetchPurchaseOrders, fetchInvoices, fetchPayments]);

  const tabs = [
    { id: 'overview', label: isArabic ? 'نظرة عامة' : 'Overview', icon: ChartBarIcon },
    { id: 'documents', label: isArabic ? 'المستندات' : 'Documents', icon: FolderIcon, permission: 'vendors:documents:view' },
    { id: 'bank-accounts', label: isArabic ? 'الحسابات البنكية' : 'Bank Accounts', icon: BuildingLibraryIcon },
    { id: 'projects', label: isArabic ? 'المشاريع' : 'Projects', icon: BriefcaseIcon, permission: 'vendors:projects:view' },
    { id: 'purchase-orders', label: isArabic ? 'أوامر الشراء' : 'Purchase Orders', icon: ClipboardDocumentListIcon },
    { id: 'invoices', label: isArabic ? 'الفواتير' : 'Invoices', icon: DocumentTextIcon },
    { id: 'payments', label: isArabic ? 'المدفوعات' : 'Payments', icon: BanknotesIcon },
  ].filter(tab => !tab.permission || hasPermission(tab.permission));

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </MainLayout>
    );
  }

  if (!vendor) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Helper function to get full image URL
  const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) return `http://localhost:4000${url}`;
    return url;
  };

  return (
    <MainLayout>
      <Head>
        <title>{vendor.name} - {isArabic ? 'ملف المورد' : 'Vendor Profile'} | SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Cover Image Header */}
        {vendor.vendor_cover_url && (
          <div className="relative -mx-4 -mt-4 h-48 md:h-64 overflow-hidden">
            <img
              src={getImageUrl(vendor.vendor_cover_url) || ''}
              alt={`${vendor.name} cover`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {/* Sticky Header */}
        <div className={`sticky top-0 z-10 bg-white dark:bg-gray-900 -mx-4 px-4 py-4 border-b border-gray-200 dark:border-gray-700 shadow-sm ${vendor.vendor_cover_url ? '-mt-16' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
              </button>
              
              {/* Vendor Logo */}
              {vendor.vendor_logo_url ? (
                <img 
                  src={getImageUrl(vendor.vendor_logo_url) || ''} 
                  alt={vendor.name}
                  className={`w-12 h-12 rounded-lg object-cover border-2 ${vendor.vendor_cover_url ? 'border-white shadow-lg' : 'border-gray-200 dark:border-gray-700'}`}
                />
              ) : (
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${vendor.vendor_cover_url ? 'bg-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <BuildingOfficeIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {isArabic && vendor.name_ar ? vendor.name_ar : vendor.name}
                  </h1>
                  <StatusBadge 
                    status={vendor.status_name || vendor.status} 
                    color={vendor.status_color || (vendor.status === 'active' ? 'green' : 'red')} 
                  />
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>{vendor.code}</span>
                  <span>•</span>
                  <span>{vendor.currency_code}</span>
                  <span>•</span>
                  <span className={`font-medium ${(vendor.outstanding_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {isArabic ? 'الرصيد:' : 'Balance:'} {formatCurrency(vendor.outstanding_balance || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {hasPermission('vendor_payments:create') && (
                <Button size="sm" onClick={() => router.push(`/procurement/payments/new?vendor_id=${id}&from=vendor`)}>
                  <BanknotesIcon className="w-4 h-4 mr-1" />
                  {isArabic ? 'إضافة دفعة' : 'Add Payment'}
                </Button>
              )}
              {hasPermission('vendors:statements:view') && (
                <Button size="sm" variant="secondary" onClick={() => router.push(`/master/vendors/${id}/statement`)}>
                  <DocumentTextIcon className="w-4 h-4 mr-1" />
                  {isArabic ? 'كشف حساب' : 'Statement'}
                </Button>
              )}
              {hasPermission('vendors:edit') && (
                <Button size="sm" variant="secondary" onClick={() => router.push(`/master/vendors/${id}/edit`)}>
                  <PencilIcon className="w-4 h-4 mr-1" />
                  {isArabic ? 'تعديل' : 'Edit'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Classification & Rating Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-4 flex-wrap">
            {vendor.classification_name && (
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: vendor.classification_color || '#6B7280' }}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isArabic && vendor.classification_name_ar ? vendor.classification_name_ar : vendor.classification_name}
                </span>
              </div>
            )}
            {vendor.rating_score !== undefined && vendor.rating_score > 0 && (
              <div className="flex items-center gap-2">
                <RatingStars rating={vendor.rating_score} />
                {hasPermission('vendors:rating:edit') && (
                  <button 
                    onClick={() => setRatingModalOpen(true)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                    title={isArabic ? 'تعديل التقييم' : 'Edit Rating'}
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            {!vendor.rating_score && hasPermission('vendors:rating:edit') && (
              <button 
                onClick={() => setRatingModalOpen(true)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <StarIcon className="w-4 h-4" />
                {isArabic ? 'إضافة تقييم' : 'Add Rating'}
              </button>
            )}
            {vendor.last_transaction_date && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <ClockIcon className="w-4 h-4" />
                {isArabic ? 'آخر معاملة:' : 'Last:'} {new Date(vendor.last_transaction_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{isArabic ? 'حد الائتمان:' : 'Credit Limit:'}</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(vendor.credit_limit || 0)} {vendor.currency_code}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <OverviewTab vendor={vendor} stats={stats} isArabic={isArabic} onTabChange={setActiveTab} />
          )}

          {activeTab === 'documents' && (
            <DocumentsTab
              vendorId={Number(id)}
              documents={documents}
              loading={documentsLoading}
              onRefresh={fetchDocuments}
              canManage={hasPermission('vendors:documents:manage')}
              isArabic={isArabic}
              documentTypes={documentTypes}
            />
          )}
          
          {activeTab === 'bank-accounts' && (
            <BankAccountsTab
              vendorId={Number(id)}
              bankAccounts={bankAccounts}
              loading={bankAccountsLoading}
              onRefresh={fetchBankAccounts}
              canManage={hasPermission('vendors:bank_accounts:manage')}
              isArabic={isArabic}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsTab
              vendorId={Number(id)}
              projects={projects}
              loading={projectsLoading}
              isArabic={isArabic}
            />
          )}

          {activeTab === 'purchase-orders' && (
            <TransactionsTab
              title={isArabic ? 'أوامر الشراء' : 'Purchase Orders'}
              data={purchaseOrders}
              loading={posLoading}
              isArabic={isArabic}
              emptyMessage={isArabic ? 'لا توجد أوامر شراء' : 'No purchase orders found'}
              columns={[
                { key: 'po_number', label: isArabic ? 'رقم الأمر' : 'PO Number' },
                { key: 'order_date', label: isArabic ? 'التاريخ' : 'Date', render: (item) => new Date(item.order_date || item.document_date || '').toLocaleDateString() },
                { key: 'total_amount', label: isArabic ? 'المبلغ' : 'Amount', render: (item) => `${Number(item.total_amount || 0).toLocaleString()} ${item.currency_code || ''}` },
                { key: 'status', label: isArabic ? 'الحالة' : 'Status' },
              ]}
            />
          )}

          {activeTab === 'invoices' && (
            <TransactionsTab
              title={isArabic ? 'الفواتير' : 'Invoices'}
              data={invoices}
              loading={invoicesLoading}
              isArabic={isArabic}
              emptyMessage={isArabic ? 'لا توجد فواتير' : 'No invoices found'}
              columns={[
                { key: 'invoice_number', label: isArabic ? 'رقم الفاتورة' : 'Invoice No.' },
                { key: 'invoice_date', label: isArabic ? 'التاريخ' : 'Date', render: (item) => new Date(item.invoice_date || '').toLocaleDateString() },
                { key: 'total_amount', label: isArabic ? 'المبلغ' : 'Amount', render: (item) => `${Number(item.total_amount || 0).toLocaleString()} ${item.currency_code || ''}` },
                { key: 'payment_status', label: isArabic ? 'الحالة' : 'Status' },
              ]}
            />
          )}

          {activeTab === 'payments' && (
            <TransactionsTab
              title={isArabic ? 'المدفوعات' : 'Payments'}
              data={payments}
              loading={paymentsLoading}
              isArabic={isArabic}
              emptyMessage={isArabic ? 'لا توجد مدفوعات' : 'No payments found'}
              columns={[
                { key: 'payment_number', label: isArabic ? 'رقم الدفعة' : 'Payment No.' },
                { key: 'payment_date', label: isArabic ? 'التاريخ' : 'Date', render: (item) => new Date(item.payment_date || '').toLocaleDateString() },
                { key: 'payment_amount', label: isArabic ? 'المبلغ' : 'Amount', render: (item) => `${Number(item.payment_amount || 0).toLocaleString()} ${item.currency_code || ''}` },
                { key: 'payment_method_name', label: isArabic ? 'طريقة الدفع' : 'Method' },
                { key: 'status', label: isArabic ? 'الحالة' : 'Status' },
              ]}
            />
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {vendor && (
        <RatingEditModal
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
          vendor={vendor}
          onSave={handleSaveRating}
          isArabic={isArabic}
        />
      )}
    </MainLayout>
  );
}

export default withAnyPermission(['vendors:profile:view', 'vendors:view'], VendorProfilePage);
