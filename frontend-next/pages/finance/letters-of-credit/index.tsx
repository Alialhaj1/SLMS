/**
 * 📄 LETTERS OF CREDIT PAGE - صفحة الاعتمادات المستندية
 * =====================================================
 * Full LC management with real API integration
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  DocumentCheckIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  DocumentPlusIcon,
  ClockIcon,
  BuildingLibraryIcon,
  TruckIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface LcType {
  id: number;
  code: string;
  name: string;
  name_ar: string;
}

interface LcStatus {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  color: string;
}

interface LetterOfCredit {
  id: number;
  lc_number: string;
  lc_type_id: number;
  status_id: number;
  type_name?: string;
  type_name_ar?: string;
  status_name?: string;
  status_name_ar?: string;
  status_color?: string;
  beneficiary_vendor_id?: number;
  beneficiary_name?: string;
  beneficiary_name_ar?: string;
  vendor_name?: string;
  vendor_name_ar?: string;
  issuing_bank_id?: number;
  issuing_bank_name?: string;
  issuing_bank_name_display?: string;
  currency_id: number;
  currency_code?: string;
  original_amount: number;
  current_amount: number;
  utilized_amount: number;
  available_amount?: number;
  issue_date: string;
  expiry_date: string;
  latest_shipment_date?: string;
  project_id?: number;
  project_name?: string;
  project_code?: string;
  purchase_order_id?: number;
  po_number?: string;
  shipment_id?: number;
  shipment_number?: string;
  amendments_count?: number;
  documents_count?: number;
  payments_count?: number;
  created_at: string;
}

interface DashboardSummary {
  active_lcs: number;
  draft_lcs: number;
  issued_lcs: number;
  paid_lcs: number;
  expiring_soon: number;
  shipment_due_soon: number;
  total_active_amount: number;
  total_utilized: number;
  total_available: number;
  total_margin: number;
}

interface LcAlert {
  id: number;
  lc_id: number;
  lc_number: string;
  alert_type: string;
  title: string;
  title_ar: string;
  priority: string;
  trigger_date: string;
}

const API_BASE = 'http://localhost:4000/api';

export default function LettersOfCreditPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';

  // Data state
  const [lcs, setLcs] = useState<LetterOfCredit[]>([]);
  const [lcTypes, setLcTypes] = useState<LcType[]>([]);
  const [lcStatuses, setLcStatuses] = useState<LcStatus[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<LcAlert[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]); // Projects for selected vendor
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<LetterOfCredit | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<LetterOfCredit | null>(null);
  
  // Vendor search state
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  
  // Filter vendors based on search
  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors.slice(0, 20);
    const search = vendorSearch.toLowerCase();
    return vendors.filter((v: any) => 
      v.name?.toLowerCase().includes(search) || 
      v.name_ar?.toLowerCase().includes(search) ||
      v.code?.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [vendors, vendorSearch]);
  const [saving, setSaving] = useState(false);

  // Form state
  const initialFormData = {
    lc_number: '',
    lc_type_id: '',
    status_id: '',
    beneficiary_vendor_id: '',
    beneficiary_name: '',
    beneficiary_name_ar: '',
    issuing_bank_id: '',
    issuing_bank_name: '',
    currency_id: '',
    original_amount: '',
    tolerance_percent: '0',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    latest_shipment_date: '',
    payment_terms: '',
    tenor_days: '',
    partial_shipments: 'allowed',
    transhipment: 'allowed',
    port_of_loading: '',
    port_of_discharge: '',
    incoterm: '',
    goods_description: '',
    project_id: '',
    margin_percent: '0',
    margin_amount: '0',
    opening_commission: '0',
    special_conditions: '',
    internal_notes: '',
  };
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getToken = () => localStorage.getItem('accessToken');

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [lcsRes, typesRes, statusesRes, dashRes, currRes, vendRes, bankRes, projRes] = await Promise.all([
        fetch(`${API_BASE}/letters-of-credit?status=${selectedStatus !== 'all' ? selectedStatus : ''}&type=${selectedType !== 'all' ? selectedType : ''}&search=${searchTerm}`, { headers }),
        fetch(`${API_BASE}/letters-of-credit/types`, { headers }),
        fetch(`${API_BASE}/letters-of-credit/statuses`, { headers }),
        fetch(`${API_BASE}/letters-of-credit/dashboard`, { headers }),
        fetch(`${API_BASE}/currencies`, { headers }),
        fetch(`${API_BASE}/vendors`, { headers }),
        fetch(`${API_BASE}/bank-accounts`, { headers }),
        fetch(`${API_BASE}/projects`, { headers }),
      ]);

      if (lcsRes.ok) {
        const data = await lcsRes.json();
        setLcs(data.data || []);
      }
      if (typesRes.ok) {
        const data = await typesRes.json();
        setLcTypes(data.data || []);
      }
      if (statusesRes.ok) {
        const data = await statusesRes.json();
        setLcStatuses(data.data || []);
      }
      if (dashRes.ok) {
        const data = await dashRes.json();
        setDashboard(data.data?.summary || null);
        setAlerts(data.data?.recent_alerts || []);
      }
      if (currRes.ok) {
        const data = await currRes.json();
        setCurrencies(data.data || []);
      }
      if (vendRes.ok) {
        const data = await vendRes.json();
        setVendors(data.data || []);
      }
      if (bankRes.ok) {
        const data = await bankRes.json();
        setBankAccounts(data.data || []);
      }
      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast(isRTL ? 'فشل في جلب البيانات' : 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedType, searchTerm, isRTL, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch available projects when vendor is selected
  const fetchAvailableProjects = useCallback(async (vendorId: string) => {
    if (!vendorId) {
      setAvailableProjects([]);
      return;
    }
    
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/letters-of-credit/available-projects/${vendorId}`, { headers });
      
      if (res.ok) {
        const data = await res.json();
        setAvailableProjects(data.data || []);
      } else {
        setAvailableProjects([]);
      }
    } catch (error) {
      console.error('Error fetching available projects:', error);
      setAvailableProjects([]);
    }
  }, []);

  const formatMoney = (amount: number, currency: string = 'SAR') => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', { 
      style: 'currency', 
      currency: currency || 'SAR',
      minimumFractionDigits: 2 
    }).format(amount || 0);
  };

  const getStatusBadge = (lc: LetterOfCredit) => {
    const color = lc.status_color || 'gray';
    const colorClasses: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', colorClasses[color] || colorClasses.gray)}>
        {isRTL ? lc.status_name_ar : lc.status_name}
      </span>
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.lc_number) newErrors.lc_number = isRTL ? 'رقم الاعتماد مطلوب' : 'LC number is required';
    if (!formData.lc_type_id) newErrors.lc_type_id = isRTL ? 'نوع الاعتماد مطلوب' : 'LC type is required';
    if (!formData.beneficiary_vendor_id) newErrors.beneficiary_vendor_id = isRTL ? 'المورد مطلوب' : 'Vendor is required';
    if (!formData.currency_id) newErrors.currency_id = isRTL ? 'العملة مطلوبة' : 'Currency is required';
    if (!formData.original_amount || Number(formData.original_amount) <= 0) {
      newErrors.original_amount = isRTL ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero';
    }
    if (!formData.issue_date) newErrors.issue_date = isRTL ? 'تاريخ الإصدار مطلوب' : 'Issue date is required';
    if (!formData.expiry_date) newErrors.expiry_date = isRTL ? 'تاريخ الانتهاء مطلوب' : 'Expiry date is required';
    if (formData.issue_date && formData.expiry_date && new Date(formData.expiry_date) <= new Date(formData.issue_date)) {
      newErrors.expiry_date = isRTL ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار' : 'Expiry date must be after issue date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          lc_type_id: formData.lc_type_id ? Number(formData.lc_type_id) : null,
          status_id: formData.status_id ? Number(formData.status_id) : null,
          currency_id: formData.currency_id ? Number(formData.currency_id) : null,
          beneficiary_vendor_id: formData.beneficiary_vendor_id ? Number(formData.beneficiary_vendor_id) : null,
          issuing_bank_id: formData.issuing_bank_id ? Number(formData.issuing_bank_id) : null,
          project_id: formData.project_id ? Number(formData.project_id) : null,
          original_amount: Number(formData.original_amount),
          tolerance_percent: Number(formData.tolerance_percent) || 0,
          tenor_days: formData.tenor_days ? Number(formData.tenor_days) : null,
          margin_percent: Number(formData.margin_percent) || 0,
          margin_amount: Number(formData.margin_amount) || 0,
          opening_commission: Number(formData.opening_commission) || 0,
        }),
      });
      if (res.ok) {
        showToast(isRTL ? 'تم إنشاء الاعتماد بنجاح' : 'LC created successfully', 'success');
        setCreateOpen(false);
        setFormData(initialFormData);
        setAvailableProjects([]);
        setVendorSearch('');
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error?.message || (isRTL ? 'فشل في الإنشاء' : 'Failed to create'), 'error');
      }
    } catch (error) {
      console.error('Error creating LC:', error);
      showToast(isRTL ? 'فشل في الإنشاء' : 'Failed to create', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected || !validateForm()) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          lc_type_id: formData.lc_type_id ? Number(formData.lc_type_id) : null,
          status_id: formData.status_id ? Number(formData.status_id) : null,
          currency_id: formData.currency_id ? Number(formData.currency_id) : null,
          beneficiary_vendor_id: formData.beneficiary_vendor_id ? Number(formData.beneficiary_vendor_id) : null,
          issuing_bank_id: formData.issuing_bank_id ? Number(formData.issuing_bank_id) : null,
          project_id: formData.project_id ? Number(formData.project_id) : null,
        }),
      });
      if (res.ok) {
        showToast(isRTL ? 'تم تحديث الاعتماد بنجاح' : 'LC updated successfully', 'success');
        setEditOpen(false);
        setSelected(null);
        setAvailableProjects([]);
        setVendorSearch('');
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error?.message || (isRTL ? 'فشل في التحديث' : 'Failed to update'), 'error');
      }
    } catch (error) {
      console.error('Error updating LC:', error);
      showToast(isRTL ? 'فشل في التحديث' : 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(isRTL ? 'تم حذف الاعتماد بنجاح' : 'LC deleted successfully', 'success');
        setDeleteConfirm(null);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error?.message || (isRTL ? 'فشل في الحذف' : 'Failed to delete'), 'error');
      }
    } catch (error) {
      console.error('Error deleting LC:', error);
      showToast(isRTL ? 'فشل في الحذف' : 'Failed to delete', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (lc: LetterOfCredit) => {
    setSelected(lc);
    setFormData({
      lc_number: lc.lc_number,
      lc_type_id: String(lc.lc_type_id || ''),
      status_id: String(lc.status_id || ''),
      beneficiary_vendor_id: String(lc.beneficiary_vendor_id || ''),
      beneficiary_name: lc.beneficiary_name || '',
      beneficiary_name_ar: lc.beneficiary_name_ar || '',
      issuing_bank_id: String(lc.issuing_bank_id || ''),
      issuing_bank_name: lc.issuing_bank_name || '',
      currency_id: String(lc.currency_id || ''),
      original_amount: String(lc.original_amount || ''),
      tolerance_percent: '0',
      issue_date: lc.issue_date?.split('T')[0] || '',
      expiry_date: lc.expiry_date?.split('T')[0] || '',
      latest_shipment_date: lc.latest_shipment_date?.split('T')[0] || '',
      payment_terms: '',
      tenor_days: '',
      partial_shipments: 'allowed',
      transhipment: 'allowed',
      port_of_loading: '',
      port_of_discharge: '',
      incoterm: '',
      goods_description: '',
      project_id: String(lc.project_id || ''),
      margin_percent: '0',
      margin_amount: '0',
      opening_commission: '0',
      special_conditions: '',
      internal_notes: '',
    });
    setEditOpen(true);
  };

  const canCreate = hasPermission('letters_of_credit:create');
  const canEdit = hasPermission('letters_of_credit:edit');
  const canDelete = hasPermission('letters_of_credit:delete');

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'الاعتمادات المستندية - SLMS' : 'Letters of Credit - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <DocumentCheckIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isRTL ? 'الاعتمادات المستندية' : 'Letters of Credit'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? 'إدارة الاعتمادات المستندية والتنبيهات والمدفوعات' : 'Manage LCs, alerts, and payments'}
              </p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={() => { 
              setFormData(initialFormData); 
              setErrors({}); 
              setAvailableProjects([]);
              setVendorSearch('');
              setCreateOpen(true); 
            }}>
              <PlusIcon className="h-4 w-4" />
              {isRTL ? 'اعتماد جديد' : 'New LC'}
            </Button>
          )}
        </div>

        {/* Dashboard Cards */}
        {dashboard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                  <DocumentCheckIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'الاعتمادات النشطة' : 'Active LCs'}</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{dashboard.active_lcs}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                  <CurrencyDollarIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'إجمالي القيمة' : 'Total Value'}</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatMoney(dashboard.total_active_amount)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'قاربت على الانتهاء' : 'Expiring Soon'}</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{dashboard.expiring_soon}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                  <BanknotesIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'المبلغ المتاح' : 'Available'}</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatMoney(dashboard.total_available)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BellAlertIcon className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium text-amber-800 dark:text-amber-200">{isRTL ? 'تنبيهات' : 'Alerts'}</h3>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 dark:text-amber-300">{isRTL ? alert.title_ar : alert.title}</span>
                  <span className="text-amber-600 dark:text-amber-400 text-xs">{alert.lc_number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <Input
              placeholder={isRTL ? 'بحث...' : 'Search...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">{isRTL ? 'كل الحالات' : 'All Status'}</option>
              {lcStatuses.map((s) => (
                <option key={s.id} value={s.code}>{isRTL ? s.name_ar : s.name}</option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">{isRTL ? 'كل الأنواع' : 'All Types'}</option>
              {lcTypes.map((t) => (
                <option key={t.id} value={t.code}>{isRTL ? t.name_ar : t.name}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{isRTL ? 'رقم الاعتماد' : 'LC Number'}</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{isRTL ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{isRTL ? 'المستفيد' : 'Beneficiary'}</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{isRTL ? 'البنك' : 'Bank'}</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{isRTL ? 'المبلغ' : 'Amount'}</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{isRTL ? 'الانتهاء' : 'Expiry'}</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{isRTL ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{isRTL ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {lcs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {isRTL ? 'لا توجد اعتمادات مستندية' : 'No letters of credit found'}
                      </td>
                    </tr>
                  ) : (
                    lcs.map((lc) => (
                      <tr key={lc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{lc.lc_number}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{isRTL ? lc.type_name_ar : lc.type_name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {isRTL ? (lc.vendor_name_ar || lc.beneficiary_name_ar) : (lc.vendor_name || lc.beneficiary_name)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{lc.issuing_bank_name_display || lc.issuing_bank_name}</td>
                        <td className="px-4 py-3 text-end font-medium text-gray-900 dark:text-white">
                          {formatMoney(lc.current_amount, lc.currency_code)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{lc.expiry_date?.split('T')[0]}</td>
                        <td className="px-4 py-3">{getStatusBadge(lc)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => setSelected(lc)}>
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button size="sm" variant="secondary" onClick={() => openEditModal(lc)}>
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(lc)}>
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      <Modal isOpen={!!selected && !editOpen} onClose={() => setSelected(null)} title={isRTL ? 'تفاصيل الاعتماد' : 'LC Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.lc_number}</h3>
                <p className="text-sm text-gray-500">{isRTL ? selected.type_name_ar : selected.type_name}</p>
              </div>
              {getStatusBadge(selected)}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{isRTL ? 'المستفيد' : 'Beneficiary'}</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {isRTL ? (selected.vendor_name_ar || selected.beneficiary_name_ar) : (selected.vendor_name || selected.beneficiary_name)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{isRTL ? 'البنك المصدر' : 'Issuing Bank'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.issuing_bank_name_display || selected.issuing_bank_name}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{isRTL ? 'المبلغ الأصلي' : 'Original Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.original_amount, selected.currency_code)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{isRTL ? 'المبلغ الحالي' : 'Current Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.current_amount, selected.currency_code)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{isRTL ? 'المستخدم' : 'Utilized'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.utilized_amount, selected.currency_code)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{isRTL ? 'المتاح' : 'Available'}</p>
                <p className="font-medium text-green-600 dark:text-green-400">{formatMoney((selected.current_amount || 0) - (selected.utilized_amount || 0), selected.currency_code)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{isRTL ? 'تاريخ الإصدار' : 'Issue Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.issue_date?.split('T')[0]}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.expiry_date?.split('T')[0]}</p>
              </div>
              {selected.project_name && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500">{isRTL ? 'المشروع' : 'Project'}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selected.project_code} - {selected.project_name}</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t dark:border-gray-700">
              <span className="flex items-center gap-1">
                <DocumentPlusIcon className="h-4 w-4" />
                {selected.amendments_count || 0} {isRTL ? 'تعديلات' : 'amendments'}
              </span>
              <span className="flex items-center gap-1">
                <DocumentCheckIcon className="h-4 w-4" />
                {selected.documents_count || 0} {isRTL ? 'مستندات' : 'documents'}
              </span>
              <span className="flex items-center gap-1">
                <BanknotesIcon className="h-4 w-4" />
                {selected.payments_count || 0} {isRTL ? 'مدفوعات' : 'payments'}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal 
        isOpen={createOpen || editOpen} 
        onClose={() => { 
          setCreateOpen(false); 
          setEditOpen(false); 
          setSelected(null); 
          setErrors({}); 
          setAvailableProjects([]);
          setVendorSearch('');
        }} 
        title={createOpen ? (isRTL ? 'اعتماد مستندي جديد' : 'New Letter of Credit') : (isRTL ? 'تعديل الاعتماد' : 'Edit LC')} 
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label={isRTL ? 'رقم الاعتماد *' : 'LC Number *'} 
              value={formData.lc_number} 
              onChange={(e) => setFormData({ ...formData, lc_number: e.target.value })} 
              error={errors.lc_number}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'نوع الاعتماد *' : 'LC Type *'}
              </label>
              <select
                value={formData.lc_type_id}
                onChange={(e) => setFormData({ ...formData, lc_type_id: e.target.value })}
                className={clsx(
                  "w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
                  errors.lc_type_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              >
                <option value="">{isRTL ? 'اختر النوع' : 'Select Type'}</option>
                {lcTypes.map((t) => (
                  <option key={t.id} value={t.id}>{isRTL ? t.name_ar : t.name}</option>
                ))}
              </select>
              {errors.lc_type_id && <p className="text-red-500 text-xs mt-1">{errors.lc_type_id}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'حالة الاعتماد' : 'LC Status'}
              </label>
              <select
                value={formData.status_id}
                onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{isRTL ? 'اختر الحالة' : 'Select Status'}</option>
                {lcStatuses.map((s) => (
                  <option key={s.id} value={s.id}>{isRTL ? s.name_ar : s.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'المورد (المستفيد) *' : 'Vendor (Beneficiary) *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={isRTL ? 'ابحث عن مورد...' : 'Search vendor...'}
                  value={vendorSearch}
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
                    setShowVendorDropdown(true);
                  }}
                  onFocus={() => setShowVendorDropdown(true)}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
                    errors.beneficiary_vendor_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                />
                {showVendorDropdown && filteredVendors.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {filteredVendors.map((v: any) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setFormData({ ...formData, beneficiary_vendor_id: String(v.id), beneficiary_name: isRTL ? v.name_ar : v.name, project_id: '' });
                          setVendorSearch(isRTL ? v.name_ar || v.name : v.name);
                          setShowVendorDropdown(false);
                          fetchAvailableProjects(String(v.id));
                        }}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-white"
                      >
                        {v.code} - {isRTL ? v.name_ar || v.name : v.name}
                      </div>
                    ))}
                  </div>
                )}
                {formData.beneficiary_vendor_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, beneficiary_vendor_id: '', beneficiary_name: '', project_id: '' });
                      setVendorSearch('');
                      setAvailableProjects([]);
                    }}
                    className="absolute left-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              {errors.beneficiary_vendor_id && <p className="text-red-500 text-xs mt-1">{errors.beneficiary_vendor_id}</p>}
            </div>
            
            <Input 
              label={isRTL ? 'اسم المستفيد (إذا لم يكن مورد)' : 'Beneficiary Name (if not vendor)'} 
              value={formData.beneficiary_name} 
              onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })} 
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'البنك المصدر' : 'Issuing Bank'}
              </label>
              <select
                value={formData.issuing_bank_id}
                onChange={(e) => setFormData({ ...formData, issuing_bank_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{isRTL ? 'اختر البنك' : 'Select Bank'}</option>
                {bankAccounts.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                ))}
              </select>
            </div>
            
            <Input 
              label={isRTL ? 'اسم البنك (إذا لم يكن في القائمة)' : 'Bank Name (if not in list)'} 
              value={formData.issuing_bank_name} 
              onChange={(e) => setFormData({ ...formData, issuing_bank_name: e.target.value })} 
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'العملة *' : 'Currency *'}
              </label>
              <select
                value={formData.currency_id}
                onChange={(e) => setFormData({ ...formData, currency_id: e.target.value })}
                className={clsx(
                  "w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
                  errors.currency_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              >
                <option value="">{isRTL ? 'اختر العملة' : 'Select Currency'}</option>
                {currencies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.code} - {isRTL ? c.name_ar : c.name}</option>
                ))}
              </select>
              {errors.currency_id && <p className="text-red-500 text-xs mt-1">{errors.currency_id}</p>}
            </div>
            
            <Input 
              label={isRTL ? 'المبلغ *' : 'Amount *'} 
              value={formData.original_amount} 
              onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })} 
              type="number"
              error={errors.original_amount}
            />
            
            <Input 
              label={isRTL ? 'تاريخ الإصدار *' : 'Issue Date *'} 
              value={formData.issue_date} 
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} 
              type="date"
              error={errors.issue_date}
            />
            
            <Input 
              label={isRTL ? 'تاريخ الانتهاء *' : 'Expiry Date *'} 
              value={formData.expiry_date} 
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} 
              type="date"
              error={errors.expiry_date}
            />
            
            <Input 
              label={isRTL ? 'آخر موعد للشحن' : 'Latest Shipment Date'} 
              value={formData.latest_shipment_date} 
              onChange={(e) => setFormData({ ...formData, latest_shipment_date: e.target.value })} 
              type="date"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'المشروع' : 'Project'}
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                disabled={!formData.beneficiary_vendor_id}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!formData.beneficiary_vendor_id 
                    ? (isRTL ? 'اختر المورد أولاً' : 'Select vendor first')
                    : (availableProjects.length === 0 
                        ? (isRTL ? 'لا توجد مشاريع متاحة' : 'No available projects')
                        : (isRTL ? 'اختر المشروع' : 'Select Project'))
                  }
                </option>
                {availableProjects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name} 
                    {p.purchase_orders_count > 0 && ` (${p.purchase_orders_count} ${isRTL ? 'أوامر شراء' : 'POs'})`}
                  </option>
                ))}
              </select>
              {formData.beneficiary_vendor_id && availableProjects.length === 0 && (
                <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                  {isRTL ? 'لا توجد مشاريع متاحة لهذا المورد (جميع المشاريع لديها اعتمادات مستندية بالفعل)' : 'No available projects for this vendor (all projects already have LCs)'}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'الشحنات الجزئية' : 'Partial Shipments'}
              </label>
              <select
                value={formData.partial_shipments}
                onChange={(e) => setFormData({ ...formData, partial_shipments: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="allowed">{isRTL ? 'مسموحة' : 'Allowed'}</option>
                <option value="not_allowed">{isRTL ? 'غير مسموحة' : 'Not Allowed'}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'إعادة الشحن' : 'Transhipment'}
              </label>
              <select
                value={formData.transhipment}
                onChange={(e) => setFormData({ ...formData, transhipment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="allowed">{isRTL ? 'مسموحة' : 'Allowed'}</option>
                <option value="not_allowed">{isRTL ? 'غير مسموحة' : 'Not Allowed'}</option>
              </select>
            </div>
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'وصف البضاعة' : 'Goods Description'}
            </label>
            <textarea
              value={formData.goods_description}
              onChange={(e) => setFormData({ ...formData, goods_description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={createOpen ? handleCreate : handleUpdate} loading={saving}>
              {createOpen ? (isRTL ? 'إنشاء' : 'Create') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
            </Button>
            <Button variant="secondary" onClick={() => { 
              setCreateOpen(false); 
              setEditOpen(false); 
              setSelected(null); 
              setErrors({}); 
              setAvailableProjects([]);
              setVendorSearch('');
            }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={isRTL ? 'حذف الاعتماد المستندي' : 'Delete Letter of Credit'}
        message={isRTL 
          ? `هل أنت متأكد من حذف الاعتماد ${deleteConfirm?.lc_number}؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Are you sure you want to delete LC ${deleteConfirm?.lc_number}? This action cannot be undone.`
        }
        confirmText={isRTL ? 'حذف' : 'Delete'}
        variant="danger"
        loading={saving}
      />
    </MainLayout>
  );
}
