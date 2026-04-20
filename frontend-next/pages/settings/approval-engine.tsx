import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useLocale } from '../../contexts/LocaleContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../lib/apiClient';
import {
  Cog6ToothIcon,
  PlusIcon,
  PencilSquareIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  UserGroupIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  CreditCardIcon,
  TruckIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ApprovalRoute {
  id: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  document_type: string;
  min_amount: number;
  max_amount: number;
  branch_id?: number;
  branch_name?: string;
  is_active: boolean;
  auto_approve_below: number;
  sla_hours: number;
  allow_same_approver?: boolean;
  escalation_enabled?: boolean;
  escalation_role_id?: number | null;
  created_at: string;
  steps?: RouteStep[];
}

interface RouteStep {
  id: number;
  step_number: number;
  label_en: string;
  label_ar: string;
  step_type: string;
  approval_type: string;
  role_id: number;
  role_name: string;
  user_id?: number | null;
  assigned_user_name?: string | null;
  can_delegate: boolean;
  sla_hours?: number;
  escalate_after_hours?: number | null;
  escalate_to_user_id?: number | null;
  condition_field?: string | null;
  condition_operator?: string | null;
  condition_value?: string | null;
  skip_if_condition_met?: boolean;
}

interface UserOption {
  id: number;
  full_name: string;
  email: string;
  job_title?: string;
}

interface RoleOption {
  id: number;
  name: string;
  display_name?: string;
}

const docTypeConfig: Record<string, { icon: typeof DocumentCheckIcon; color: string; label_en: string; label_ar: string }> = {
  journal_entry:    { icon: DocumentCheckIcon,      color: 'blue',   label_en: 'Journal Entry',      label_ar: 'قيد يومية' },
  payment_voucher:  { icon: BanknotesIcon,           color: 'red',    label_en: 'Payment Voucher',    label_ar: 'سند صرف' },
  receipt_voucher:  { icon: BanknotesIcon,           color: 'green',  label_en: 'Receipt Voucher',    label_ar: 'سند قبض' },
  purchase_order:   { icon: ShieldCheckIcon,         color: 'purple', label_en: 'Purchase Order',     label_ar: 'أمر شراء' },
  expense_request:  { icon: ExclamationTriangleIcon, color: 'amber',  label_en: 'Expense Request',    label_ar: 'طلب مصروف' },
  expense_claim:    { icon: DocumentCheckIcon,       color: 'amber',  label_en: 'Expense Claim',      label_ar: 'مطالبة مصروف' },
  bank_transfer:    { icon: ArrowPathIcon,            color: 'cyan',   label_en: 'Bank Transfer',      label_ar: 'تحويل بنكي' },
  transfer_request: { icon: TruckIcon,               color: 'green',  label_en: 'Transfer Request',   label_ar: 'طلب تحويل' },
  payment_request:  { icon: CreditCardIcon,           color: 'indigo', label_en: 'Payment Request',    label_ar: 'طلب سداد' },
  vendor_invoice:   { icon: DocumentCheckIcon,        color: 'orange', label_en: 'Vendor Invoice',     label_ar: 'فاتورة مورد' },
  shipment_expense: { icon: TruckIcon,                color: 'teal',   label_en: 'Shipment Expense',   label_ar: 'مصاريف شحنة' },
};

const stepTypeLabels: Record<string, { en: string; ar: string }> = {
  review:   { en: 'Review',   ar: 'مراجعة' },
  approve:  { en: 'Approve',  ar: 'اعتماد' },
  notify:   { en: 'Notify',   ar: 'إشعار' },
};

const conditionFieldOptions = [
  { value: 'amount', label_en: 'Amount', label_ar: 'المبلغ' },
  { value: 'document_type', label_en: 'Document Type', label_ar: 'نوع المستند' },
  { value: 'branch_id', label_en: 'Branch', label_ar: 'الفرع' },
];

const conditionOperatorOptions = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
];

function ApprovalEngineSettingsPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const router = useRouter();

  const canManage = hasPermission('approval_routes:create' as any) || hasPermission('approval_routes:edit' as any);
  const canDelete = hasPermission('approval_routes:delete' as any) || canManage;

  const [routes, setRoutes] = useState<ApprovalRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<ApprovalRoute | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({ is_active: true, sla_hours: 24, auto_approve_below: 0, allow_same_approver: false, escalation_enabled: false, escalation_role_id: '' });
  const [saving, setSaving] = useState(false);

  // Create route
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nameEn: '', nameAr: '', documentType: 'journal_entry', minAmount: 0, maxAmount: 999999999, slaHours: 24, autoApproveBelow: 0 });
  const [creating, setCreating] = useState(false);

  // Step assignment
  const [users, setUsers] = useState<UserOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [stepEditOpen, setStepEditOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<RouteStep | null>(null);
  const [stepForm, setStepForm] = useState<any>({
    user_id: '', role_id: '', can_delegate: true, step_type: 'review',
    label_en: '', label_ar: '', approval_type: 'any_one',
    escalate_after_hours: '', escalate_to_user_id: '',
    condition_field: '', condition_operator: '', condition_value: '', skip_if_condition_met: false,
  });
  const [savingStep, setSavingStep] = useState(false);

  // Add step
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [addStepForm, setAddStepForm] = useState<any>({
    stepType: 'review', roleId: '', userId: '', labelEn: '', labelAr: '',
    approvalType: 'any_one', canDelegate: true,
    escalateAfterHours: '', escalateToUserId: '',
    conditionField: '', conditionOperator: '', conditionValue: '', skipIfConditionMet: false,
  });
  const [addingStep, setAddingStep] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRoute, setDeletingRoute] = useState<ApprovalRoute | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingStepId, setDeletingStepId] = useState<number | null>(null);

  // Stats
  const totalRoutes = routes.length;
  const activeRoutes = routes.filter(r => r.is_active).length;
  const docTypesCovered = new Set(routes.filter(r => r.is_active).map(r => r.document_type)).size;

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/approval-documents/routes/list');
      setRoutes(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/users?limit=200');
      setUsers(res.data?.data || res.data?.users || []);
    } catch { /* silent */ }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/roles?limit=100');
      setRoles(res.data?.data || res.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchRoutes(); fetchUsers(); fetchRoles(); }, [fetchRoutes, fetchUsers, fetchRoles]);

  // â”€â”€â”€ Route Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openDetail = async (routeId: number) => {
    try {
      const res = await apiClient.get(`/api/approval-documents/routes/${routeId}`);
      setSelectedRoute(res.data?.data || res.data);
      setDetailOpen(true);
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل تحميل التفاصيل' : 'Failed to load details' });
    }
  };

  const refreshRoute = async (routeId: number) => {
    try {
      const res = await apiClient.get(`/api/approval-documents/routes/${routeId}`);
      setSelectedRoute(res.data?.data || res.data);
    } catch { /* silent */ }
  };

  // â”€â”€â”€ Create Route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCreateRoute = async () => {
    if (!createForm.nameEn && !createForm.nameAr) {
      showToast({ type: 'error', message: locale === 'ar' ? 'الاسم مطلوب' : 'Name is required' });
      return;
    }
    try {
      setCreating(true);
      await apiClient.post('/api/approval-documents/routes', {
        nameEn: createForm.nameEn,
        nameAr: createForm.nameAr,
        documentType: createForm.documentType,
        minAmount: createForm.minAmount,
        maxAmount: createForm.maxAmount,
        slaHours: createForm.slaHours,
        autoApproveBelow: createForm.autoApproveBelow,
        isActive: true,
      });
      showToast({ type: 'success', message: locale === 'ar' ? 'تم إنشاء المسار' : 'Route created' });
      setCreateOpen(false);
      setCreateForm({ nameEn: '', nameAr: '', documentType: 'journal_entry', minAmount: 0, maxAmount: 999999999, slaHours: 24, autoApproveBelow: 0 });
      fetchRoutes();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed';
      showToast({ type: 'error', message: msg });
    } finally {
      setCreating(false);
    }
  };

  // â”€â”€â”€ Edit Route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openEdit = (route: ApprovalRoute) => {
    setEditForm({
      is_active: route.is_active,
      sla_hours: route.sla_hours,
      auto_approve_below: route.auto_approve_below,
      allow_same_approver: route.allow_same_approver || false,
      escalation_enabled: route.escalation_enabled || false,
      escalation_role_id: route.escalation_role_id || '',
    });
    setSelectedRoute(route);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selectedRoute) return;
    try {
      setSaving(true);
      await apiClient.patch(`/api/approval-documents/routes/${selectedRoute.id}`, {
        ...editForm,
        escalation_role_id: editForm.escalation_role_id !== '' ? Number(editForm.escalation_role_id) : null,
      });
      showToast({ type: 'success', message: locale === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' });
      setEditOpen(false);
      fetchRoutes();
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل الحفظ' : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€â”€ Delete Route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDeleteRoute = async () => {
    if (!deletingRoute) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/api/approval-documents/routes/${deletingRoute.id}`);
      showToast({ type: 'success', message: locale === 'ar' ? 'تم حذف المسار' : 'Route deleted' });
      setDeleteOpen(false);
      setDeletingRoute(null);
      fetchRoutes();
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل الحذف' : 'Delete failed' });
    } finally {
      setDeleting(false);
    }
  };

  // â”€â”€â”€ Step Edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openStepEdit = (step: RouteStep) => {
    setEditingStep(step);
    setStepForm({
      user_id: step.user_id ?? '',
      role_id: step.role_id ?? '',
      can_delegate: step.can_delegate,
      step_type: step.step_type || 'review',
      label_en: step.label_en || '',
      label_ar: step.label_ar || '',
      approval_type: step.approval_type || 'any_one',
      escalate_after_hours: step.escalate_after_hours ?? '',
      escalate_to_user_id: step.escalate_to_user_id ?? '',
      condition_field: step.condition_field || '',
      condition_operator: step.condition_operator || '',
      condition_value: step.condition_value || '',
      skip_if_condition_met: step.skip_if_condition_met || false,
    });
    setStepEditOpen(true);
  };

  const handleSaveStep = async () => {
    if (!editingStep || !selectedRoute) return;
    try {
      setSavingStep(true);
      await apiClient.patch(
        `/api/approval-documents/routes/${selectedRoute.id}/steps/${editingStep.id}`,
        {
          user_id: stepForm.user_id !== '' ? Number(stepForm.user_id) : null,
          role_id: stepForm.role_id !== '' ? Number(stepForm.role_id) : null,
          can_delegate: stepForm.can_delegate,
          step_type: stepForm.step_type,
          label_en: stepForm.label_en || null,
          label_ar: stepForm.label_ar || null,
          approval_type: stepForm.approval_type,
          escalate_after_hours: stepForm.escalate_after_hours !== '' ? Number(stepForm.escalate_after_hours) : null,
          escalate_to_user_id: stepForm.escalate_to_user_id !== '' ? Number(stepForm.escalate_to_user_id) : null,
          condition_field: stepForm.condition_field || null,
          condition_operator: stepForm.condition_operator || null,
          condition_value: stepForm.condition_value || null,
          skip_if_condition_met: stepForm.skip_if_condition_met,
        }
      );
      showToast({ type: 'success', message: locale === 'ar' ? 'تم تحديث الخطوة' : 'Step updated' });
      setStepEditOpen(false);
      await refreshRoute(selectedRoute.id);
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل تحديث الخطوة' : 'Step update failed' });
    } finally {
      setSavingStep(false);
    }
  };

  // â”€â”€â”€ Add Step â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openAddStep = () => {
    setAddStepForm({
      stepType: 'review', roleId: '', userId: '', labelEn: '', labelAr: '',
      approvalType: 'any_one', canDelegate: true,
      escalateAfterHours: '', escalateToUserId: '',
      conditionField: '', conditionOperator: '', conditionValue: '', skipIfConditionMet: false,
    });
    setAddStepOpen(true);
  };

  const handleAddStep = async () => {
    if (!selectedRoute) return;
    if (!addStepForm.roleId) {
      showToast({ type: 'error', message: locale === 'ar' ? 'الدور مطلوب' : 'Role is required' });
      return;
    }
    try {
      setAddingStep(true);
      await apiClient.post(`/api/approval-documents/routes/${selectedRoute.id}/steps`, {
        stepType: addStepForm.stepType,
        roleId: Number(addStepForm.roleId),
        userId: addStepForm.userId ? Number(addStepForm.userId) : null,
        labelEn: addStepForm.labelEn || null,
        labelAr: addStepForm.labelAr || null,
        approvalType: addStepForm.approvalType,
        canDelegate: addStepForm.canDelegate,
        escalateAfterHours: addStepForm.escalateAfterHours ? Number(addStepForm.escalateAfterHours) : null,
        escalateToUserId: addStepForm.escalateToUserId ? Number(addStepForm.escalateToUserId) : null,
        conditionField: addStepForm.conditionField || null,
        conditionOperator: addStepForm.conditionOperator || null,
        conditionValue: addStepForm.conditionValue || null,
        skipIfConditionMet: addStepForm.skipIfConditionMet,
      });
      showToast({ type: 'success', message: locale === 'ar' ? 'تمت إضافة الخطوة' : 'Step added' });
      setAddStepOpen(false);
      await refreshRoute(selectedRoute.id);
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل إضافة الخطوة' : 'Failed to add step' });
    } finally {
      setAddingStep(false);
    }
  };

  // â”€â”€â”€ Remove Step â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRemoveStep = async (stepId: number) => {
    if (!selectedRoute) return;
    try {
      setDeletingStepId(stepId);
      await apiClient.delete(`/api/approval-documents/routes/${selectedRoute.id}/steps/${stepId}`);
      showToast({ type: 'success', message: locale === 'ar' ? 'تم حذف الخطوة' : 'Step removed' });
      await refreshRoute(selectedRoute.id);
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل حذف الخطوة' : 'Failed to remove step' });
    } finally {
      setDeletingStepId(null);
    }
  };

  // â”€â”€â”€ Reorder Steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleMoveStep = async (stepId: number, direction: 'up' | 'down') => {
    if (!selectedRoute?.steps) return;
    const sorted = [...selectedRoute.steps].sort((a, b) => a.step_number - b.step_number);
    const idx = sorted.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;

    const newOrder = sorted.map(s => s.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

    try {
      await apiClient.put(`/api/approval-documents/routes/${selectedRoute.id}/steps/reorder`, {
        stepIds: newOrder,
      });
      await refreshRoute(selectedRoute.id);
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل إعادة الترتيب' : 'Reorder failed' });
    }
  };

  const getDocTypeInfo = (type: string) => docTypeConfig[type] || { icon: DocumentCheckIcon, color: 'gray', label_en: type, label_ar: type };

  // â”€â”€â”€ Condition Display Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getConditionLabel = (step: RouteStep) => {
    if (!step.condition_field || !step.condition_operator) return null;
    const fieldLabel = conditionFieldOptions.find(f => f.value === step.condition_field);
    const fieldName = fieldLabel ? (locale === 'ar' ? fieldLabel.label_ar : fieldLabel.label_en) : step.condition_field;
    return `${step.skip_if_condition_met ? 'âڈ­ ' : ''}${fieldName} ${step.condition_operator} ${step.condition_value || '?'}`;
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'محرك الاعتمادات - SLMS' : 'Approval Engine - SLMS'}</title>
      </Head>

      <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/25">
              <Cog6ToothIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'محرك الاعتمادات' : 'Approval Engine'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة مسارات الاعتماد والخطوات والصلاحيات' : 'Manage approval routes, steps, and thresholds'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon className="h-4 w-4 me-1" />
                {locale === 'ar' ? 'مسار جديد' : 'New Route'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => router.push('/approvals/inbox')}>
              {locale === 'ar' ? '← صندوق الاعتمادات' : '← Approval Inbox'}
            </Button>
            <Button variant="secondary" onClick={fetchRoutes}>
              <ArrowPathIcon className={clsx('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-5 text-white shadow-lg shadow-violet-500/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-200 text-sm">{locale === 'ar' ? 'إجمالي المسارات' : 'Total Routes'}</p>
                <p className="text-3xl font-bold mt-1">{totalRoutes}</p>
              </div>
              <Cog6ToothIcon className="h-10 w-10 text-violet-200/50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-5 text-white shadow-lg shadow-emerald-500/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-200 text-sm">{locale === 'ar' ? 'المسارات النشطة' : 'Active Routes'}</p>
                <p className="text-3xl font-bold mt-1">{activeRoutes}</p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-emerald-200/50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg shadow-blue-500/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">{locale === 'ar' ? 'أنواع المستندات' : 'Document Types'}</p>
                <p className="text-3xl font-bold mt-1">{docTypesCovered}</p>
              </div>
              <DocumentCheckIcon className="h-10 w-10 text-blue-200/50" />
            </div>
          </div>
        </div>

        {/* Routes List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <ArrowPathIcon className="h-10 w-10 text-gray-400 animate-spin" />
          </div>
        ) : routes.length === 0 ? (
          <Card className="p-16 text-center">
            <Cog6ToothIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {locale === 'ar' ? 'لا توجد مسارات اعتماد' : 'No Approval Routes'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {locale === 'ar' ? 'قم بتشغيل الترحيل لبناء مسارات الاعتماد الافتراضية' : 'Run the migration to seed default approval routes'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {routes.map((route) => {
              const docInfo = getDocTypeInfo(route.document_type);
              const DocIcon = docInfo.icon;
              const borderColorMap: Record<string, string> = {
                blue: '#3b82f6', red: '#ef4444', green: '#22c55e', purple: '#a855f7',
                amber: '#f59e0b', cyan: '#06b6d4', indigo: '#6366f1', orange: '#f97316',
              };
              const borderColor = borderColorMap[docInfo.color] || '#6366f1';
              return (
              <div key={route.id} className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4`} style={{ borderLeftColor: borderColor }}>
                  <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Route info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className={clsx('p-3 rounded-xl', `bg-${docInfo.color}-100 dark:bg-${docInfo.color}-900/30`)}>
                          <DocIcon className={clsx('h-6 w-6', `text-${docInfo.color}-600 dark:text-${docInfo.color}-400`)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{route.name}</h3>
                            <Badge variant={route.is_active ? 'success' : 'secondary'} size="sm">
                              {route.is_active
                                ? (locale === 'ar' ? 'نشط' : 'Active')
                                : (locale === 'ar' ? 'معطل' : 'Inactive')}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <DocumentCheckIcon className="h-4 w-4" />
                              {locale === 'ar' ? docInfo.label_ar : docInfo.label_en}
                            </span>
                            <span className="flex items-center gap-1">
                              <BanknotesIcon className="h-4 w-4" />
                              {Number(route.min_amount).toLocaleString()} â€“ {Number(route.max_amount).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-4 w-4" />
                              SLA: {route.sla_hours}h
                            </span>
                            {route.auto_approve_below > 0 && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircleIcon className="h-4 w-4" />
                                {locale === 'ar' ? 'اعتماد تلقائي أقل من' : 'Auto < '}{Number(route.auto_approve_below).toLocaleString()}
                              </span>
                            )}
                            {route.allow_same_approver && (
                              <Badge variant="warning" size="sm">
                                {locale === 'ar' ? 'نفس المعتمد مسموح' : 'Same Approver OK'}
                              </Badge>
                            )}
                            {route.escalation_enabled && (
                              <Badge variant="danger" size="sm">
                                <BoltIcon className="h-3 w-3 inline me-0.5" />
                                {locale === 'ar' ? 'تصعيد مفعّل' : 'Escalation On'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openDetail(route.id)}>
                          {locale === 'ar' ? 'الخطوات' : 'Steps'}
                        </Button>
                        {canManage && (
                          <Button size="sm" onClick={() => openEdit(route)}>
                            <PencilSquareIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="sm" variant="danger" onClick={() => { setDeletingRoute(route); setDeleteOpen(true); }}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal â€” Workflow Builder (Steps) */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selectedRoute?.name || ''} size="xl">
        {selectedRoute?.steps && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? `${selectedRoute.steps.length} خطوات في هذا المسار` : `${selectedRoute.steps.length} steps in this route`}
              </p>
              {canManage && (
                <Button size="sm" onClick={openAddStep}>
                  <PlusIcon className="h-4 w-4 me-1" />
                  {locale === 'ar' ? 'إضافة خطوة' : 'Add Step'}
                </Button>
              )}
            </div>

            {/* Requester note */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold">{locale === 'ar' ? 'المنشئ (مقدّم الطلب):' : 'Requester (Document Creator):'}</span>{' '}
              {locale === 'ar' ? 'صاحب الطلب هو من ينشئ المستند تلقائياً.' : 'The requester is automatically the user who creates the document.'}
            </div>

            {/* Step cards */}
            <div className="space-y-3">
              {[...(selectedRoute.steps || [])].sort((a, b) => a.step_number - b.step_number).map((step, idx, arr) => {
                const condLabel = getConditionLabel(step);
                return (
                <div key={step.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="w-8 h-8 rounded-full bg-violet-600 text-white text-sm flex items-center justify-center font-bold flex-shrink-0">
                        {step.step_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={step.step_type === 'approve' ? 'success' : 'info'} size="sm">
                            {locale === 'ar' ? stepTypeLabels[step.step_type]?.ar : stepTypeLabels[step.step_type]?.en || step.step_type}
                          </Badge>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {locale === 'ar' ? step.label_ar : step.label_en}
                          </span>
                        </div>
                        {/* Role */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <UserGroupIcon className="h-3.5 w-3.5 text-gray-400" />
                          <span>{locale === 'ar' ? 'الدور:' : 'Role:'}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{step.role_name}</span>
                        </div>
                        {/* Assigned user */}
                        <div className="flex items-center gap-1.5 text-xs mt-1">
                          <UserCircleIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'معيّن:' : 'Assigned:'}</span>
                          {step.assigned_user_name
                            ? <span className="font-medium text-indigo-600 dark:text-indigo-400">{step.assigned_user_name}</span>
                            : <span className="text-amber-600 dark:text-amber-400 italic">{locale === 'ar' ? 'غير محدد (تلقائي حسب الدور)' : 'Dynamic by role'}</span>
                          }
                        </div>
                        {/* Delegation */}
                        {step.can_delegate && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                            <CheckCircleIcon className="h-3.5 w-3.5" />
                            {locale === 'ar' ? 'يقبل التفويض' : 'Delegable'}
                          </p>
                        )}
                        {/* Escalation */}
                        {step.escalate_after_hours && (
                          <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                            <BoltIcon className="h-3.5 w-3.5" />
                            {locale === 'ar' ? `تصعيد بعد ${step.escalate_after_hours} ساعة` : `Escalate after ${step.escalate_after_hours}h`}
                          </p>
                        )}
                        {/* Condition */}
                        {condLabel && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-1">
                            <FunnelIcon className="h-3.5 w-3.5" />
                            {locale === 'ar' ? 'شرط:' : 'Condition:'} {condLabel}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Actions: reorder + edit + delete */}
                    {canManage && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveStep(step.id, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                          >
                            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleMoveStep(step.id, 'down')}
                            disabled={idx === arr.length - 1}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                          >
                            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                        <button
                          onClick={() => openStepEdit(step)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          {locale === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleRemoveStep(step.id)}
                          disabled={deletingStepId === step.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          {locale === 'ar' ? 'حذف' : 'Del'}
                        </button>
                      </div>
                    )}
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="flex justify-center mt-2">
                      <ChevronRightIcon className="h-5 w-5 text-gray-400 rotate-90" />
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>


      {/* Step Edit Modal (Full - includes conditions, escalation) */}
      <Modal isOpen={stepEditOpen} onClose={() => setStepEditOpen(false)}
        title={locale === 'ar' ? 'تعديل الخطوة' : 'Edit Step'} size="lg">
        {editingStep && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                {locale === 'ar' ? `خطوة رقم ${editingStep.step_number}` : `Step ${editingStep.step_number}`}
              </p>
            </div>

            {/* Step Type + Labels */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نوع الخطوة' : 'Step Type'}</label>
                <select value={stepForm.step_type} onChange={e => setStepForm((f: any) => ({ ...f, step_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="review">{locale === 'ar' ? 'مراجعة' : 'Review'}</option>
                  <option value="approve">{locale === 'ar' ? 'اعتماد' : 'Approve'}</option>
                  <option value="notify">{locale === 'ar' ? 'إشعار' : 'Notify'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'التسمية (EN)' : 'Label (EN)'}</label>
                <input type="text" value={stepForm.label_en} onChange={e => setStepForm((f: any) => ({ ...f, label_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'التسمية (AR)' : 'Label (AR)'}</label>
                <input type="text" value={stepForm.label_ar} onChange={e => setStepForm((f: any) => ({ ...f, label_ar: e.target.value }))} dir="rtl"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            {/* Role + User */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <UserGroupIcon className="h-4 w-4 inline me-1 text-purple-500" />{locale === 'ar' ? 'الدور' : 'Role'}
                </label>
                <select value={String(stepForm.role_id)} onChange={e => setStepForm((f: any) => ({ ...f, role_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">{locale === 'ar' ? ' اختر ' : ' Select '}</option>
                  {roles.map(r => <option key={r.id} value={String(r.id)}>{r.display_name || r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <UserCircleIcon className="h-4 w-4 inline me-1 text-indigo-500" />{locale === 'ar' ? 'مستخدم محدد' : 'Specific User'} <span className="text-xs text-gray-400">({locale === 'ar' ? 'اختياري' : 'optional'})</span>
                </label>
                <select value={String(stepForm.user_id)} onChange={e => setStepForm((f: any) => ({ ...f, user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">{locale === 'ar' ? ' تلقائي حسب الدور ' : ' Dynamic by role '}</option>
                  {users.map(u => <option key={u.id} value={String(u.id)}>{u.full_name} | {u.email}</option>)}
                </select>
              </div>
            </div>

            {/* Approval Type + Can Delegate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نوع الاعتماد' : 'Approval Type'}</label>
                <select value={stepForm.approval_type} onChange={e => setStepForm((f: any) => ({ ...f, approval_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="any_one">{locale === 'ar' ? 'أي واحد' : 'Any One'}</option>
                  <option value="all_required">{locale === 'ar' ? 'الجميع مطلوب' : 'All Required'}</option>
                  <option value="majority">{locale === 'ar' ? 'الأغلبية' : 'Majority'}</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={stepForm.can_delegate} onChange={e => setStepForm((f: any) => ({ ...f, can_delegate: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'يسمح بالتفويض' : 'Allow delegation'}</span>
                </label>
              </div>
            </div>

            {/* Escalation */}
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
                <BoltIcon className="h-4 w-4" />{locale === 'ar' ? 'التصعيد' : 'Escalation'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'تصعيد بعد (ساعات)' : 'Escalate After (hours)'}</label>
                  <input type="number" min="0" value={stepForm.escalate_after_hours}
                    onChange={e => setStepForm((f: any) => ({ ...f, escalate_after_hours: e.target.value }))} placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'تصعيد إلى مستخدم' : 'Escalate To User'}</label>
                  <select value={String(stepForm.escalate_to_user_id)} onChange={e => setStepForm((f: any) => ({ ...f, escalate_to_user_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none">
                    <option value="">{locale === 'ar' ? ' لا يوجد ' : ' None '}</option>
                    {users.map(u => <option key={u.id} value={String(u.id)}>{u.full_name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Conditional Logic */}
            <div className="p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-1">
                <FunnelIcon className="h-4 w-4" />{locale === 'ar' ? 'شروط التنفيذ' : 'Conditional Logic'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'الحقل' : 'Field'}</label>
                  <select value={stepForm.condition_field} onChange={e => setStepForm((f: any) => ({ ...f, condition_field: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none">
                    <option value="">{locale === 'ar' ? ' لا شرط ' : ' No condition '}</option>
                    {conditionFieldOptions.map(f => <option key={f.value} value={f.value}>{locale === 'ar' ? f.label_ar : f.label_en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'العامل' : 'Operator'}</label>
                  <select value={stepForm.condition_operator} onChange={e => setStepForm((f: any) => ({ ...f, condition_operator: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none">
                    <option value=""></option>
                    {conditionOperatorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'القيمة' : 'Value'}</label>
                  <input type="text" value={stepForm.condition_value} onChange={e => setStepForm((f: any) => ({ ...f, condition_value: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-3">
                <input type="checkbox" checked={stepForm.skip_if_condition_met} onChange={e => setStepForm((f: any) => ({ ...f, skip_if_condition_met: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'تخطي الخطوة إذا تحقق الشرط' : 'Skip step if condition is met'}</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button onClick={handleSaveStep} loading={savingStep} className="flex-1">{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
              <Button variant="secondary" onClick={() => setStepEditOpen(false)} className="flex-1">{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Step Modal */}
      <Modal isOpen={addStepOpen} onClose={() => setAddStepOpen(false)}
        title={locale === 'ar' ? 'إضافة خطوة جديدة' : 'Add New Step'} size="lg">
        <div className="space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نوع الخطوة' : 'Step Type'}</label>
              <select value={addStepForm.stepType} onChange={e => setAddStepForm((f: any) => ({ ...f, stepType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="review">{locale === 'ar' ? 'مراجعة' : 'Review'}</option>
                <option value="approve">{locale === 'ar' ? 'اعتماد' : 'Approve'}</option>
                <option value="notify">{locale === 'ar' ? 'إشعار' : 'Notify'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'التسمية (EN)' : 'Label (EN)'}</label>
              <input type="text" value={addStepForm.labelEn} onChange={e => setAddStepForm((f: any) => ({ ...f, labelEn: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'التسمية (AR)' : 'Label (AR)'}</label>
              <input type="text" value={addStepForm.labelAr} onChange={e => setAddStepForm((f: any) => ({ ...f, labelAr: e.target.value }))} dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <UserGroupIcon className="h-4 w-4 inline me-1 text-purple-500" />{locale === 'ar' ? 'الدور *' : 'Role *'}
              </label>
              <select value={addStepForm.roleId} onChange={e => setAddStepForm((f: any) => ({ ...f, roleId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">{locale === 'ar' ? ' اختر دوراً ' : ' Select a role '}</option>
                {roles.map(r => <option key={r.id} value={String(r.id)}>{r.display_name || r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <UserCircleIcon className="h-4 w-4 inline me-1 text-indigo-500" />{locale === 'ar' ? 'مستخدم محدد' : 'Specific User'}
              </label>
              <select value={addStepForm.userId} onChange={e => setAddStepForm((f: any) => ({ ...f, userId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">{locale === 'ar' ? ' تلقائي ' : ' Dynamic '}</option>
                {users.map(u => <option key={u.id} value={String(u.id)}>{u.full_name} | {u.email}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نوع الاعتماد' : 'Approval Type'}</label>
              <select value={addStepForm.approvalType} onChange={e => setAddStepForm((f: any) => ({ ...f, approvalType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="any_one">{locale === 'ar' ? 'أي واحد' : 'Any One'}</option>
                <option value="all_required">{locale === 'ar' ? 'الجميع مطلوب' : 'All Required'}</option>
                <option value="majority">{locale === 'ar' ? 'الأغلبية' : 'Majority'}</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={addStepForm.canDelegate} onChange={e => setAddStepForm((f: any) => ({ ...f, canDelegate: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'يسمح بالتفويض' : 'Allow delegation'}</span>
              </label>
            </div>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
              <BoltIcon className="h-4 w-4" />{locale === 'ar' ? 'التصعيد' : 'Escalation'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'تصعيد بعد (ساعات)' : 'Escalate After (hours)'}</label>
                <input type="number" min="0" value={addStepForm.escalateAfterHours}
                  onChange={e => setAddStepForm((f: any) => ({ ...f, escalateAfterHours: e.target.value }))} placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'تصعيد إلى مستخدم' : 'Escalate To User'}</label>
                <select value={addStepForm.escalateToUserId} onChange={e => setAddStepForm((f: any) => ({ ...f, escalateToUserId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none">
                  <option value="">{locale === 'ar' ? ' لا يوجد ' : ' None '}</option>
                  {users.map(u => <option key={u.id} value={String(u.id)}>{u.full_name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-1">
              <FunnelIcon className="h-4 w-4" />{locale === 'ar' ? 'شروط التنفيذ' : 'Conditional Logic'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'الحقل' : 'Field'}</label>
                <select value={addStepForm.conditionField} onChange={e => setAddStepForm((f: any) => ({ ...f, conditionField: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">{locale === 'ar' ? ' لا شرط ' : ' No condition '}</option>
                  {conditionFieldOptions.map(f => <option key={f.value} value={f.value}>{locale === 'ar' ? f.label_ar : f.label_en}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'العامل' : 'Operator'}</label>
                <select value={addStepForm.conditionOperator} onChange={e => setAddStepForm((f: any) => ({ ...f, conditionOperator: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value=""></option>
                  {conditionOperatorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'القيمة' : 'Value'}</label>
                <input type="text" value={addStepForm.conditionValue} onChange={e => setAddStepForm((f: any) => ({ ...f, conditionValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-3">
              <input type="checkbox" checked={addStepForm.skipIfConditionMet} onChange={e => setAddStepForm((f: any) => ({ ...f, skipIfConditionMet: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'تخطي الخطوة إذا تحقق الشرط' : 'Skip step if condition is met'}</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={handleAddStep} loading={addingStep} className="flex-1">{locale === 'ar' ? 'إضافة' : 'Add Step'}</Button>
            <Button variant="secondary" onClick={() => setAddStepOpen(false)} className="flex-1">{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Route Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={locale === 'ar' ? 'تعديل المسار' : 'Edit Route'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SLA ({locale === 'ar' ? 'ساعات' : 'hours'})</label>
            <Input type="number" value={String(editForm.sla_hours)} onChange={(e) => setEditForm({ ...editForm, sla_hours: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{locale === 'ar' ? 'اعتماد تلقائي أقل من' : 'Auto-Approve Below'}</label>
            <Input type="number" value={String(editForm.auto_approve_below)} onChange={(e) => setEditForm({ ...editForm, auto_approve_below: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="allow_same" checked={editForm.allow_same_approver}
              onChange={(e) => setEditForm({ ...editForm, allow_same_approver: e.target.checked })}
              className="w-5 h-5 text-amber-600 rounded" />
            <label htmlFor="allow_same" className="text-sm text-gray-700 dark:text-gray-300">
              {locale === 'ar' ? 'السماح لنفس الشخص بالمراجعة والاعتماد' : 'Allow same user for review & approve'}
            </label>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="esc_enabled" checked={editForm.escalation_enabled}
                onChange={(e) => setEditForm({ ...editForm, escalation_enabled: e.target.checked })}
                className="w-5 h-5 text-red-600 rounded" />
              <label htmlFor="esc_enabled" className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
                <BoltIcon className="h-4 w-4" />{locale === 'ar' ? 'تفعيل التصعيد' : 'Enable Escalation'}
              </label>
            </div>
            {editForm.escalation_enabled && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{locale === 'ar' ? 'تصعيد إلى دور' : 'Escalation Role'}</label>
                <select value={String(editForm.escalation_role_id)}
                  onChange={e => setEditForm({ ...editForm, escalation_role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none">
                  <option value="">{locale === 'ar' ? ' اختر دوراً ' : ' Select role '}</option>
                  {roles.map(r => <option key={r.id} value={String(r.id)}>{r.display_name || r.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="route_active" checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="w-5 h-5 text-violet-600 rounded" />
            <label htmlFor="route_active" className="text-sm text-gray-700 dark:text-gray-300">
              {locale === 'ar' ? 'مسار نشط' : 'Route Active'}
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} loading={saving}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      {/* Create Route Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)}
        title={locale === 'ar' ? 'إنشاء مسار اعتماد جديد' : 'Create New Approval Route'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'اسم المسار (EN)' : 'Route Name (EN)'}</label>
              <input type="text" value={createForm.nameEn} onChange={e => setCreateForm(f => ({ ...f, nameEn: e.target.value }))}
                placeholder="e.g. Payment Voucher Standard"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'اسم المسار (AR)' : 'Route Name (AR)'}</label>
              <input type="text" value={createForm.nameAr} onChange={e => setCreateForm(f => ({ ...f, nameAr: e.target.value }))} dir="rtl"
                placeholder="مثال: سند صرف عادي"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نوع المستند' : 'Document Type'}</label>
            <select value={createForm.documentType} onChange={e => setCreateForm(f => ({ ...f, documentType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none">
              {Object.entries(docTypeConfig).map(([key, cfg]) => (
                <option key={key} value={key}>{locale === 'ar' ? cfg.label_ar : cfg.label_en}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحد الأدنى' : 'Min Amount'}</label>
              <Input type="number" value={String(createForm.minAmount)} onChange={e => setCreateForm(f => ({ ...f, minAmount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحد الأقصى' : 'Max Amount'}</label>
              <Input type="number" value={String(createForm.maxAmount)} onChange={e => setCreateForm(f => ({ ...f, maxAmount: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SLA ({locale === 'ar' ? 'ساعات' : 'hours'})</label>
              <Input type="number" value={String(createForm.slaHours)} onChange={e => setCreateForm(f => ({ ...f, slaHours: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'اعتماد تلقائي أقل من' : 'Auto-Approve Below'}</label>
              <Input type="number" value={String(createForm.autoApproveBelow)} onChange={e => setCreateForm(f => ({ ...f, autoApproveBelow: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleCreateRoute} loading={creating}>{locale === 'ar' ? 'إنشاء' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={deleteOpen} onClose={() => { setDeleteOpen(false); setDeletingRoute(null); }}
        title={locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {locale === 'ar'
              ? `هل أنت متأكد من حذف المسار "${deletingRoute?.name}"؟ لا يمكن التراجع.`
              : `Are you sure you want to delete "${deletingRoute?.name}"? This cannot be undone.`}
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeletingRoute(null); }}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="danger" onClick={handleDeleteRoute} loading={deleting}>
              {locale === 'ar' ? 'حذف' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

export default ApprovalEngineSettingsPage;
