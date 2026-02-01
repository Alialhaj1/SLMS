/**
 * 📄 VENDOR CONTRACTS PAGE
 * ========================
 * Production-ready vendor contracts management connected to real API
 * 
 * Features:
 * ✅ Full CRUD operations
 * ✅ Contract approval workflow
 * ✅ Contract types & statuses from DB
 * ✅ Real-time vendor dropdown
 * ✅ Pagination & search
 * ✅ AR/EN support
 * ✅ RBAC integration
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
// 📦 Shared Types
import type { Vendor as SharedVendor } from '@/shared/types';
import {
  PlusIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface VendorContract {
  id: number;
  contract_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_name_ar?: string;
  vendor_code?: string;
  contract_type_id?: number;
  contract_type_code?: string;
  contract_type_name?: string;
  contract_type_name_ar?: string;
  contract_status_id?: number;
  contract_status_code?: string;
  contract_status_name?: string;
  contract_status_name_ar?: string;
  title: string;
  title_ar?: string;
  start_date: string;
  end_date?: string;
  
  // Project & Financial
  project_id?: number;
  project_code?: string;
  project_name?: string;
  currency_id?: number;
  currency_code?: string;
  currency_symbol?: string;
  contract_value: number;
  
  // Deliverables & Milestones
  deliverables?: Deliverable[];
  milestones?: Milestone[];
  payment_schedule?: PaymentScheduleItem[];
  
  is_approved: boolean;
  approved_at?: string;
  approved_by?: number;
  notes?: string;
  terms_and_conditions?: string;
}

interface Deliverable {
  id?: number;
  description: string;
  description_ar?: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

interface Milestone {
  id?: number;
  title: string;
  title_ar?: string;
  target_date: string;
  completion_percentage: number;
  status: 'pending' | 'achieved' | 'missed';
}

interface PaymentScheduleItem {
  id?: number;
  milestone_id?: number;
  payment_date: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'paid';
  paid_at?: string;
}

// Using shared Vendor type
type Vendor = SharedVendor;

interface ContractType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface ContractStatus {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function VendorContractsPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();

  // Data states
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [contractStatuses, setContractStatuses] = useState<ContractStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<VendorContract | null>(null);
  const [editingContract, setEditingContract] = useState<VendorContract | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<VendorContract | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Approve confirmation
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [contractToApprove, setContractToApprove] = useState<VendorContract | null>(null);
  const [approving, setApproving] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    vendor_id: '',
    contract_type_id: '',
    title: '',
    title_ar: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    contract_value: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getToken = () => localStorage.getItem('accessToken');
  const getCompanyId = () => companyStore.getActiveCompanyId();

  const getHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    'X-Company-Id': String(getCompanyId() || ''),
  });

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const [vendorsRes, typesRes, statusesRes] = await Promise.all([
        fetch(`${API_BASE}/api/procurement/vendors`, { headers }),
        fetch(`${API_BASE}/api/procurement/contracts/types`, { headers }),
        fetch(`${API_BASE}/api/procurement/contracts/statuses`, { headers }),
      ]);

      if (vendorsRes.ok) {
        const result = await vendorsRes.json();
        setVendors(result.data || []);
      }
      if (typesRes.ok) {
        const result = await typesRes.json();
        setContractTypes(result.data || []);
      }
      if (statusesRes.ok) {
        const result = await statusesRes.json();
        setContractStatuses(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  }, []);

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_id', statusFilter);
      if (typeFilter) params.append('type_id', typeFilter);

      const res = await fetch(`${API_BASE}/api/procurement/contracts?${params}`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const result = await res.json();
        setContracts(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } else if (res.status === 401 || res.status === 403) {
        showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      } else {
        showToast(locale === 'ar' ? 'فشل في تحميل العقود' : 'Failed to load contracts', 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'فشل في تحميل العقود' : 'Failed to load contracts', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, typeFilter, showToast, locale]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.vendor_id) errors.vendor_id = locale === 'ar' ? 'المورد مطلوب' : 'Vendor is required';
    if (!formData.title) errors.title = locale === 'ar' ? 'العنوان مطلوب' : 'Title is required';
    if (!formData.start_date) errors.start_date = locale === 'ar' ? 'تاريخ البداية مطلوب' : 'Start date is required';
    if (!formData.contract_value || parseFloat(formData.contract_value) <= 0) {
      errors.contract_value = locale === 'ar' ? 'قيمة العقد يجب أن تكون أكبر من صفر' : 'Contract value must be greater than 0';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create/update
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const body = {
        vendor_id: parseInt(formData.vendor_id),
        contract_type_id: formData.contract_type_id ? parseInt(formData.contract_type_id) : null,
        title: formData.title,
        title_ar: formData.title_ar || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        contract_value: parseFloat(formData.contract_value),
        notes: formData.notes,
      };

      const url = editingContract 
        ? `${API_BASE}/api/procurement/contracts/${editingContract.id}`
        : `${API_BASE}/api/procurement/contracts`;
      
      const res = await fetch(url, {
        method: editingContract ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(
          locale === 'ar' 
            ? (editingContract ? 'تم تحديث العقد' : 'تم إنشاء العقد')
            : (editingContract ? 'Contract updated' : 'Contract created'),
          'success'
        );
        setModalOpen(false);
        setEditingContract(null);
        fetchContracts();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Operation failed', 'error');
      }
    } catch (error) {
      showToast('Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!contractToApprove) return;

    setApproving(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/contracts/${contractToApprove.id}/approve`, {
        method: 'PUT',
        headers: getHeaders(),
      });

      if (res.ok) {
        showToast(locale === 'ar' ? 'تم اعتماد العقد' : 'Contract approved', 'success');
        setApproveConfirmOpen(false);
        setContractToApprove(null);
        fetchContracts();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Approve failed', 'error');
      }
    } catch (error) {
      showToast('Approve failed', 'error');
    } finally {
      setApproving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!contractToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/contracts/${contractToDelete.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        showToast(locale === 'ar' ? 'تم حذف العقد' : 'Contract deleted', 'success');
        setDeleteConfirmOpen(false);
        setContractToDelete(null);
        fetchContracts();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast('Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Open create modal
  const handleOpenCreate = () => {
    setEditingContract(null);
    setFormData({
      vendor_id: '',
      contract_type_id: '',
      title: '',
      title_ar: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      contract_value: '',
      notes: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (contract: VendorContract) => {
    setEditingContract(contract);
    setFormData({
      vendor_id: String(contract.vendor_id),
      contract_type_id: contract.contract_type_id ? String(contract.contract_type_id) : '',
      title: contract.title,
      title_ar: contract.title_ar || '',
      start_date: contract.start_date.split('T')[0],
      end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
      contract_value: String(contract.contract_value),
      notes: contract.notes || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open view modal
  const handleOpenView = (contract: VendorContract) => {
    setViewingContract(contract);
    setViewModalOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: number, symbol?: string) => {
    return `${symbol || 'SAR'} ${amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}`;
  };

  // Get status badge
  const getStatusBadge = (statusCode: string, isApproved: boolean) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      terminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      renewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      pending_approval: { en: 'Pending Approval', ar: 'قيد الاعتماد' },
      active: { en: 'Active', ar: 'نشط' },
      expired: { en: 'Expired', ar: 'منتهي' },
      terminated: { en: 'Terminated', ar: 'منهي' },
      renewed: { en: 'Renewed', ar: 'مجدد' },
    };
    
    const status = statusCode || 'draft';
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status] || styles.draft)}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'عقود الموردين' : 'Vendor Contracts'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'عقود الموردين' : 'Vendor Contracts'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? `${total} عقد` : `${total} contracts`}
              </p>
            </div>
          </div>

          {hasPermission('vendor_contracts:create') && (
            <Button onClick={handleOpenCreate}>
              <PlusIcon className="h-5 w-5 mr-1" />
              {locale === 'ar' ? 'عقد جديد' : 'New Contract'}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
              {contractTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {locale === 'ar' ? type.name_ar || type.name : type.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
              {contractStatuses.map(status => (
                <option key={status.id} value={status.id}>
                  {locale === 'ar' ? status.name_ar || status.name : status.name}
                </option>
              ))}
            </select>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value={20}>20 {locale === 'ar' ? 'لكل صفحة' : 'per page'}</option>
              <option value={50}>50 {locale === 'ar' ? 'لكل صفحة' : 'per page'}</option>
              <option value={100}>100 {locale === 'ar' ? 'لكل صفحة' : 'per page'}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {locale === 'ar' ? 'لا توجد عقود' : 'No contracts found'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'رقم العقد' : 'Contract #'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'المورد' : 'Vendor'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'العنوان' : 'Title'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الفترة' : 'Period'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'القيمة' : 'Value'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {contracts.map(contract => (
                  <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {contract.contract_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {locale === 'ar' ? contract.vendor_name_ar : contract.vendor_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {locale === 'ar' ? contract.title_ar || contract.title : contract.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(contract.start_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                      {contract.end_date && (
                        <> - {new Date(contract.end_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}</>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(contract.contract_value, contract.currency_symbol)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(contract.contract_status_code || 'draft', contract.is_approved)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenView(contract)}
                          className="p-1 text-gray-500 hover:text-blue-600"
                          title={locale === 'ar' ? 'عرض' : 'View'}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {hasPermission('vendor_contracts:update') && !contract.is_approved && (
                          <button
                            onClick={() => handleOpenEdit(contract)}
                            className="p-1 text-gray-500 hover:text-blue-600"
                            title={locale === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                        {hasPermission('vendor_contracts:approve') && !contract.is_approved && (
                          <button
                            onClick={() => { setContractToApprove(contract); setApproveConfirmOpen(true); }}
                            className="p-1 text-gray-500 hover:text-green-600"
                            title={locale === 'ar' ? 'اعتماد' : 'Approve'}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                        {hasPermission('vendor_contracts:delete') && !contract.is_approved && (
                          <button
                            onClick={() => { setContractToDelete(contract); setDeleteConfirmOpen(true); }}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title={locale === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' 
                  ? `صفحة ${currentPage} من ${totalPages}`
                  : `Page ${currentPage} of ${totalPages}`
                }
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  {locale === 'ar' ? 'السابق' : 'Previous'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  {locale === 'ar' ? 'التالي' : 'Next'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingContract(null); }}
        title={locale === 'ar' 
          ? (editingContract ? 'تعديل العقد' : 'عقد جديد')
          : (editingContract ? 'Edit Contract' : 'New Contract')
        }
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المورد' : 'Vendor'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className={clsx(
                  "w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white",
                  formErrors.vendor_id ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                )}
              >
                <option value="">{locale === 'ar' ? 'اختر المورد' : 'Select Vendor'}</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {locale === 'ar' ? vendor.name_ar || vendor.name : vendor.name}
                  </option>
                ))}
              </select>
              {formErrors.vendor_id && (
                <p className="text-red-500 text-xs mt-1">{formErrors.vendor_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'نوع العقد' : 'Contract Type'}
              </label>
              <select
                value={formData.contract_type_id}
                onChange={(e) => setFormData({ ...formData, contract_type_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">{locale === 'ar' ? 'اختر النوع' : 'Select Type'}</option>
                {contractTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {locale === 'ar' ? type.name_ar || type.name : type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={clsx(
                  "w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white",
                  formErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                )}
              />
              {formErrors.title && (
                <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
              </label>
              <input
                type="text"
                value={formData.title_ar}
                onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ البداية' : 'Start Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={clsx(
                  "w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white",
                  formErrors.start_date ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                )}
              />
              {formErrors.start_date && (
                <p className="text-red-500 text-xs mt-1">{formErrors.start_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ النهاية' : 'End Date'}
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'قيمة العقد' : 'Contract Value'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                className={clsx(
                  "w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white",
                  formErrors.contract_value ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                )}
              />
              {formErrors.contract_value && (
                <p className="text-red-500 text-xs mt-1">{formErrors.contract_value}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingContract(null); }}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {locale === 'ar' ? (editingContract ? 'تحديث' : 'إنشاء') : (editingContract ? 'Update' : 'Create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={locale === 'ar' ? 'تفاصيل العقد' : 'Contract Details'}
        size="lg"
      >
        {viewingContract && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'رقم العقد' : 'Contract #'}</span>
                <p className="font-medium">{viewingContract.contract_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'المورد' : 'Vendor'}</span>
                <p className="font-medium">
                  {locale === 'ar' ? viewingContract.vendor_name_ar : viewingContract.vendor_name}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'العنوان' : 'Title'}</span>
                <p className="font-medium">
                  {locale === 'ar' ? viewingContract.title_ar || viewingContract.title : viewingContract.title}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</span>
                <p className="font-medium">
                  {locale === 'ar' 
                    ? viewingContract.contract_type_name_ar || viewingContract.contract_type_name
                    : viewingContract.contract_type_name
                  }
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'تاريخ البداية' : 'Start Date'}</span>
                <p className="font-medium">
                  {new Date(viewingContract.start_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'تاريخ النهاية' : 'End Date'}</span>
                <p className="font-medium">
                  {viewingContract.end_date 
                    ? new Date(viewingContract.end_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')
                    : '-'
                  }
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'القيمة' : 'Value'}</span>
                <p className="font-medium text-lg">
                  {formatCurrency(viewingContract.contract_value, viewingContract.currency_symbol)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'الحالة' : 'Status'}</span>
                <div className="mt-1">
                  {getStatusBadge(viewingContract.contract_status_code || 'draft', viewingContract.is_approved)}
                </div>
              </div>
            </div>
            
            {viewingContract.notes && (
              <div className="border-t pt-4">
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'ملاحظات' : 'Notes'}</span>
                <p className="mt-1">{viewingContract.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setContractToDelete(null); }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف العقد' : 'Delete Contract'}
        message={locale === 'ar' 
          ? `هل أنت متأكد من حذف العقد ${contractToDelete?.contract_number}؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Are you sure you want to delete contract ${contractToDelete?.contract_number}? This action cannot be undone.`
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={approveConfirmOpen}
        onClose={() => { setApproveConfirmOpen(false); setContractToApprove(null); }}
        onConfirm={handleApprove}
        title={locale === 'ar' ? 'اعتماد العقد' : 'Approve Contract'}
        message={locale === 'ar' 
          ? `هل أنت متأكد من اعتماد العقد ${contractToApprove?.contract_number}؟ بعد الاعتماد لا يمكن تعديله.`
          : `Are you sure you want to approve contract ${contractToApprove?.contract_number}? Once approved, it cannot be edited.`
        }
        confirmText={locale === 'ar' ? 'اعتماد' : 'Approve'}
        loading={approving}
      />
    </MainLayout>
  );
}

export default withPermission('vendor_contracts:view', VendorContractsPage);
