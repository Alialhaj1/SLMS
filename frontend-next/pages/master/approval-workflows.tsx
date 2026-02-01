import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Card from '../../components/ui/Card';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ClockIcon,
  ChevronRightIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface ApprovalStep {
  step_order: number;
  approver_type: 'role' | 'user' | 'department_head' | 'line_manager';
  approver_id?: number;
  approver_role?: string;
  can_skip: boolean;
  timeout_hours: number;
  escalation_enabled: boolean;
  escalation_to?: string;
}

interface ApprovalWorkflow {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: 'purchase' | 'expense' | 'leave' | 'document' | 'payment' | 'contract' | 'general';
  applicable_to: string;
  min_amount?: number;
  max_amount?: number;
  steps: ApprovalStep[];
  parallel_approval: boolean;
  require_all_approvers: boolean;
  auto_approve_timeout: boolean;
  timeout_action: 'approve' | 'reject' | 'escalate';
  notification_enabled: boolean;
  reminder_hours: number;
  usage_count: number;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const WORKFLOW_CATEGORIES = [
  { value: 'purchase', label: 'Purchase', labelAr: 'مشتريات', icon: '🛒', color: 'blue' },
  { value: 'expense', label: 'Expense', labelAr: 'مصروفات', icon: '💰', color: 'green' },
  { value: 'leave', label: 'Leave', labelAr: 'إجازات', icon: '🏖️', color: 'yellow' },
  { value: 'document', label: 'Document', labelAr: 'مستندات', icon: '📄', color: 'purple' },
  { value: 'payment', label: 'Payment', labelAr: 'مدفوعات', icon: '💳', color: 'indigo' },
  { value: 'contract', label: 'Contract', labelAr: 'عقود', icon: '📝', color: 'orange' },
  { value: 'general', label: 'General', labelAr: 'عام', icon: '⚙️', color: 'gray' },
];

const APPROVER_TYPES = [
  { value: 'role', label: 'By Role' },
  { value: 'user', label: 'Specific User' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'line_manager', label: 'Line Manager' },
];

const SAMPLE_ROLES = [
  'Super Admin', 'Admin', 'Finance Manager', 'HR Manager', 'Operations Manager',
  'Procurement Manager', 'CEO', 'CFO', 'Department Head', 'Branch Manager'
];

function ApprovalWorkflowsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ApprovalWorkflow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    category: ApprovalWorkflow['category'];
    applicable_to: string;
    min_amount: number;
    max_amount: number;
    steps: ApprovalStep[];
    parallel_approval: boolean;
    require_all_approvers: boolean;
    auto_approve_timeout: boolean;
    timeout_action: ApprovalWorkflow['timeout_action'];
    notification_enabled: boolean;
    reminder_hours: number;
    is_active: boolean;
    description: string;
  }>({
    code: '',
    name: '',
    name_ar: '',
    category: 'general',
    applicable_to: '',
    min_amount: 0,
    max_amount: 0,
    steps: [{ step_order: 1, approver_type: 'role', approver_role: '', can_skip: false, timeout_hours: 24, escalation_enabled: false }],
    parallel_approval: false,
    require_all_approvers: true,
    auto_approve_timeout: false,
    timeout_action: 'escalate',
    notification_enabled: true,
    reminder_hours: 4,
    is_active: true,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/approval-workflows', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.data || []);
      } else {
        loadMockData();
      }
    } catch {
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setItems([
      { id: 1, code: 'PO-STD', name: 'Standard Purchase Order', name_ar: 'أمر شراء عادي', category: 'purchase', applicable_to: 'Purchase Orders', min_amount: 0, max_amount: 50000, steps: [{ step_order: 1, approver_type: 'line_manager', can_skip: false, timeout_hours: 24, escalation_enabled: true, escalation_to: 'Procurement Manager' }], parallel_approval: false, require_all_approvers: true, auto_approve_timeout: false, timeout_action: 'escalate', notification_enabled: true, reminder_hours: 4, usage_count: 125, is_active: true, description: 'Standard PO up to 50K SAR', created_at: '2024-01-01' },
      { id: 2, code: 'PO-HIGH', name: 'High Value Purchase Order', name_ar: 'أمر شراء عالي القيمة', category: 'purchase', applicable_to: 'Purchase Orders', min_amount: 50000, max_amount: 500000, steps: [{ step_order: 1, approver_type: 'line_manager', can_skip: false, timeout_hours: 24, escalation_enabled: true }, { step_order: 2, approver_type: 'role', approver_role: 'Finance Manager', can_skip: false, timeout_hours: 48, escalation_enabled: true }, { step_order: 3, approver_type: 'role', approver_role: 'CEO', can_skip: false, timeout_hours: 72, escalation_enabled: false }], parallel_approval: false, require_all_approvers: true, auto_approve_timeout: false, timeout_action: 'escalate', notification_enabled: true, reminder_hours: 8, usage_count: 28, is_active: true, description: 'High value PO 50K-500K SAR, requires CEO approval', created_at: '2024-01-01' },
      { id: 3, code: 'EXP-STD', name: 'Expense Claim', name_ar: 'طلب تعويض مصروفات', category: 'expense', applicable_to: 'Expense Claims', max_amount: 10000, steps: [{ step_order: 1, approver_type: 'line_manager', can_skip: false, timeout_hours: 48, escalation_enabled: true }, { step_order: 2, approver_type: 'role', approver_role: 'Finance Manager', can_skip: true, timeout_hours: 72, escalation_enabled: false }], parallel_approval: false, require_all_approvers: false, auto_approve_timeout: false, timeout_action: 'escalate', notification_enabled: true, reminder_hours: 12, usage_count: 340, is_active: true, created_at: '2024-01-01' },
      { id: 4, code: 'LV-ANN', name: 'Annual Leave Request', name_ar: 'طلب إجازة سنوية', category: 'leave', applicable_to: 'Annual Leave', steps: [{ step_order: 1, approver_type: 'line_manager', can_skip: false, timeout_hours: 48, escalation_enabled: true, escalation_to: 'HR Manager' }], parallel_approval: false, require_all_approvers: true, auto_approve_timeout: true, timeout_action: 'approve', notification_enabled: true, reminder_hours: 24, usage_count: 89, is_active: true, description: 'Auto-approves after 48 hours if no action', created_at: '2024-01-01' },
      { id: 5, code: 'LV-SICK', name: 'Sick Leave Request', name_ar: 'طلب إجازة مرضية', category: 'leave', applicable_to: 'Sick Leave', steps: [{ step_order: 1, approver_type: 'line_manager', can_skip: false, timeout_hours: 24, escalation_enabled: false }], parallel_approval: false, require_all_approvers: true, auto_approve_timeout: false, timeout_action: 'escalate', notification_enabled: true, reminder_hours: 4, usage_count: 45, is_active: true, created_at: '2024-01-01' },
      { id: 6, code: 'DOC-CRIT', name: 'Critical Document Approval', name_ar: 'موافقة مستند حرج', category: 'document', applicable_to: 'Contracts, Policies', steps: [{ step_order: 1, approver_type: 'department_head', can_skip: false, timeout_hours: 48, escalation_enabled: true }, { step_order: 2, approver_type: 'role', approver_role: 'Legal Manager', can_skip: false, timeout_hours: 72, escalation_enabled: true }, { step_order: 3, approver_type: 'role', approver_role: 'CEO', can_skip: false, timeout_hours: 72, escalation_enabled: false }], parallel_approval: false, require_all_approvers: true, auto_approve_timeout: false, timeout_action: 'reject', notification_enabled: true, reminder_hours: 12, usage_count: 15, is_active: true, created_at: '2024-01-01' },
      { id: 7, code: 'PAY-VENDOR', name: 'Vendor Payment', name_ar: 'دفعة مورد', category: 'payment', applicable_to: 'Vendor Payments', min_amount: 10000, steps: [{ step_order: 1, approver_type: 'role', approver_role: 'Finance Manager', can_skip: false, timeout_hours: 24, escalation_enabled: true }, { step_order: 2, approver_type: 'role', approver_role: 'CFO', can_skip: false, timeout_hours: 48, escalation_enabled: false }], parallel_approval: true, require_all_approvers: true, auto_approve_timeout: false, timeout_action: 'escalate', notification_enabled: true, reminder_hours: 6, usage_count: 78, is_active: true, description: 'Parallel approval for payments over 10K', created_at: '2024-01-01' },
      { id: 8, code: 'CONTRACT', name: 'Contract Approval', name_ar: 'موافقة عقد', category: 'contract', applicable_to: 'All Contracts', steps: [{ step_order: 1, approver_type: 'role', approver_role: 'Legal Manager', can_skip: false, timeout_hours: 72, escalation_enabled: true }, { step_order: 2, approver_type: 'role', approver_role: 'Finance Manager', can_skip: false, timeout_hours: 48, escalation_enabled: true }, { step_order: 3, approver_type: 'role', approver_role: 'CEO', can_skip: false, timeout_hours: 72, escalation_enabled: false }], parallel_approval: false, require_all_approvers: true, auto_approve_timeout: false, timeout_action: 'escalate', notification_enabled: true, reminder_hours: 24, usage_count: 22, is_active: true, created_at: '2024-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.steps.length === 0) newErrors.steps = t('approvalWorkflows.needStep', 'At least one approval step required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/approval-workflows/${editingItem.id}`
        : 'http://localhost:4000/api/approval-workflows';
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(t('common.success'), 'success');
        fetchData();
        setShowModal(false);
        resetForm();
      } else {
        throw new Error();
      }
    } catch {
      const newItem: ApprovalWorkflow = {
        id: editingItem?.id || Date.now(),
        ...formData,
        min_amount: formData.min_amount || undefined,
        max_amount: formData.max_amount || undefined,
        description: formData.description || undefined,
        usage_count: editingItem?.usage_count || 0,
        created_at: new Date().toISOString(),
      };
      if (editingItem) {
        setItems(items.map(i => i.id === editingItem.id ? newItem : i));
      } else {
        setItems([...items, newItem]);
      }
      showToast(t('common.success'), 'success');
      setShowModal(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const item = items.find(i => i.id === deletingId);
    if (item && item.usage_count > 0) {
      showToast(t('approvalWorkflows.cannotDeleteUsed', 'Cannot delete workflow with existing usage'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/approval-workflows/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* continue */ }
    setItems(items.filter(i => i.id !== deletingId));
    showToast(t('common.deleted'), 'success');
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', category: 'general', applicable_to: '', min_amount: 0, max_amount: 0, steps: [{ step_order: 1, approver_type: 'role', approver_role: '', can_skip: false, timeout_hours: 24, escalation_enabled: false }], parallel_approval: false, require_all_approvers: true, auto_approve_timeout: false, timeout_action: 'escalate', notification_enabled: true, reminder_hours: 4, is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: ApprovalWorkflow) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      category: item.category,
      applicable_to: item.applicable_to,
      min_amount: item.min_amount || 0,
      max_amount: item.max_amount || 0,
      steps: item.steps,
      parallel_approval: item.parallel_approval,
      require_all_approvers: item.require_all_approvers,
      auto_approve_timeout: item.auto_approve_timeout,
      timeout_action: item.timeout_action,
      notification_enabled: item.notification_enabled,
      reminder_hours: item.reminder_hours,
      is_active: item.is_active,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { step_order: formData.steps.length + 1, approver_type: 'role', approver_role: '', can_skip: false, timeout_hours: 24, escalation_enabled: false }]
    });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index).map((step, i) => ({ ...step, step_order: i + 1 }));
    setFormData({ ...formData, steps: newSteps });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const totalUsage = items.reduce((sum, w) => sum + w.usage_count, 0);
  const activeWorkflows = items.filter(w => w.is_active).length;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      purchase: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      expense: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      leave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      document: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      payment: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      contract: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      general: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[category] || colors.general;
  };

  const getCategoryInfo = (category: string) => {
    return WORKFLOW_CATEGORIES.find(c => c.value === category);
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('approvalWorkflows.title', 'Approval Workflows')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('approvalWorkflows.title', 'Approval Workflows')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('approvalWorkflows.subtitle', 'Configure multi-level approval processes')}
            </p>
          </div>
          {hasPermission('master:documents:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('approvalWorkflows.new', 'New Workflow')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ArrowPathIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('approvalWorkflows.workflows', 'Workflows')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <PlayIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('approvalWorkflows.active', 'Active')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activeWorkflows}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CheckBadgeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('approvalWorkflows.totalUsage', 'Total Uses')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalUsage}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <UserGroupIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('approvalWorkflows.avgSteps', 'Avg Steps')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{(items.reduce((sum, w) => sum + w.steps.length, 0) / items.length || 0).toFixed(1)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('approvalWorkflows.allCategories', 'All Categories')}</option>
            {WORKFLOW_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length}
          </div>
        </div>
      </Card>

      {/* Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-2 p-8 text-center">
            <ArrowPathIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const catInfo = getCategoryInfo(item.category);
            return (
              <Card key={item.id} className="p-4 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{catInfo?.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{item.code}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                          {catInfo?.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                      {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {hasPermission('master:documents:update') && (
                      <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('master:documents:delete') && item.usage_count === 0 && (
                      <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {item.applicable_to}
                  {(item.min_amount || item.max_amount) && (
                    <span className="text-xs text-gray-400 ml-2">
                      ({item.min_amount ? `${item.min_amount.toLocaleString()} - ` : ''}
                      {item.max_amount ? `${item.max_amount.toLocaleString()} SAR` : '+∞'})
                    </span>
                  )}
                </p>

                {/* Steps visualization */}
                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {item.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center">
                      <div className={`px-2 py-1 text-xs rounded ${idx === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                        {step.approver_type === 'role' && step.approver_role}
                        {step.approver_type === 'line_manager' && 'Line Manager'}
                        {step.approver_type === 'department_head' && 'Dept Head'}
                        {step.approver_type === 'user' && 'User'}
                      </div>
                      {idx < item.steps.length - 1 && (
                        <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-1" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <UserGroupIcon className="w-3 h-3" />
                    {item.steps.length} steps
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckBadgeIcon className="w-3 h-3" />
                    {item.usage_count} uses
                  </span>
                  {item.parallel_approval && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Parallel</span>
                  )}
                  {item.auto_approve_timeout && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">Auto-approve</span>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('approvalWorkflows.edit') : t('approvalWorkflows.create')}
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., PO-STD"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('approvalWorkflows.category', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {WORKFLOW_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />
            <Input
              label={t('common.nameAr')}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('approvalWorkflows.applicableTo', 'Applicable To')}
              value={formData.applicable_to}
              onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value })}
              placeholder="e.g., Purchase Orders"
            />
            <Input
              label={t('approvalWorkflows.minAmount', 'Min Amount')}
              type="number"
              min="0"
              value={formData.min_amount}
              onChange={(e) => setFormData({ ...formData, min_amount: Number(e.target.value) })}
            />
            <Input
              label={t('approvalWorkflows.maxAmount', 'Max Amount')}
              type="number"
              min="0"
              value={formData.max_amount}
              onChange={(e) => setFormData({ ...formData, max_amount: Number(e.target.value) })}
            />
          </div>

          {/* Approval Steps */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">{t('approvalWorkflows.steps', 'Approval Steps')}</h4>
              <Button variant="secondary" onClick={addStep} className="text-sm">
                <PlusIcon className="w-4 h-4 mr-1" /> Add Step
              </Button>
            </div>
            {errors.steps && <p className="text-sm text-red-600 mb-2">{errors.steps}</p>}
            <div className="space-y-3">
              {formData.steps.map((step, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                      Step {step.step_order}
                    </span>
                    {formData.steps.length > 1 && (
                      <button onClick={() => removeStep(idx)} className="ml-auto p-1 text-red-600 hover:bg-red-50 rounded">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={step.approver_type}
                      onChange={(e) => updateStep(idx, 'approver_type', e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    >
                      {APPROVER_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    {step.approver_type === 'role' && (
                      <select
                        value={step.approver_role}
                        onChange={(e) => updateStep(idx, 'approver_role', e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                      >
                        <option value="">Select Role</option>
                        {SAMPLE_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        value={step.timeout_hours}
                        onChange={(e) => updateStep(idx, 'timeout_hours', Number(e.target.value))}
                        className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                      />
                      <span className="text-xs text-gray-500">hrs</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={step.can_skip}
                        onChange={(e) => updateStep(idx, 'can_skip', e.target.checked)}
                        className="w-3 h-3 text-blue-600 rounded"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Can Skip</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={step.escalation_enabled}
                        onChange={(e) => updateStep(idx, 'escalation_enabled', e.target.checked)}
                        className="w-3 h-3 text-blue-600 rounded"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Escalate</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.parallel_approval}
                  onChange={(e) => setFormData({ ...formData, parallel_approval: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Parallel Approval</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.require_all_approvers}
                  onChange={(e) => setFormData({ ...formData, require_all_approvers: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Require All Approvers</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.notification_enabled}
                  onChange={(e) => setFormData({ ...formData, notification_enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable Notifications</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.auto_approve_timeout}
                  onChange={(e) => setFormData({ ...formData, auto_approve_timeout: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Auto-Action on Timeout</span>
              </label>
              {formData.auto_approve_timeout && (
                <select
                  value={formData.timeout_action}
                  onChange={(e) => setFormData({ ...formData, timeout_action: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                >
                  <option value="approve">Auto Approve</option>
                  <option value="reject">Auto Reject</option>
                  <option value="escalate">Escalate</option>
                </select>
              )}
              <Input
                label={t('approvalWorkflows.reminderHours', 'Reminder (hours)')}
                type="number"
                min="1"
                value={formData.reminder_hours}
                onChange={(e) => setFormData({ ...formData, reminder_hours: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">{t('common.active')}</label>
          </div>

          <Input
            label={t('common.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} loading={isSubmitting} className="flex-1">{t('common.save')}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('approvalWorkflows.deleteWarning', 'This approval workflow will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, ApprovalWorkflowsPage);
