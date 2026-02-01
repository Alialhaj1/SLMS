import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
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
  CogIcon,
  BoltIcon,
  PlayIcon,
  PauseIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  TruckIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface Trigger {
  code: string;
  name: string;
  name_ar?: string;
  entity_type: string;
  available_fields?: any;
}

interface AccountingRule {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  trigger_code: string;
  trigger_name?: string;
  trigger_name_ar?: string;
  entity_type?: string;
  is_active: boolean;
  is_system: boolean;
  priority: number;
  auto_post: boolean;
  require_approval: boolean;
  conditions_count?: number;
  lines_count?: number;
  postings_count?: number;
  created_at?: string;
}

interface RuleCondition {
  id?: number;
  field_name: string;
  operator: string;
  field_value: string;
  field_value_2?: string;
  condition_group: number;
}

interface RuleLine {
  id?: number;
  line_type: 'debit' | 'credit';
  account_source: string;
  account_id?: number;
  account_field?: string;
  fallback_account_id?: number;
  amount_source: string;
  amount_value?: number;
  amount_field?: string;
  cost_center_source: string;
  project_source: string;
  shipment_source: string;
  description_template?: string;
}

interface Account {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  expense_request: BanknotesIcon,
  payment_request: ArrowsRightLeftIcon,
  shipment: TruckIcon,
  purchase_invoice: DocumentTextIcon,
  sales_invoice: DocumentDuplicateIcon,
  default: BoltIcon,
};

const OPERATORS = [
  { value: '=', label: 'Equals', labelAr: 'يساوي' },
  { value: '!=', label: 'Not Equals', labelAr: 'لا يساوي' },
  { value: '>', label: 'Greater Than', labelAr: 'أكبر من' },
  { value: '<', label: 'Less Than', labelAr: 'أصغر من' },
  { value: '>=', label: 'Greater or Equal', labelAr: 'أكبر أو يساوي' },
  { value: '<=', label: 'Less or Equal', labelAr: 'أصغر أو يساوي' },
  { value: 'IN', label: 'In List', labelAr: 'ضمن قائمة' },
  { value: 'NOT_IN', label: 'Not In List', labelAr: 'ليس ضمن قائمة' },
  { value: 'IS_NULL', label: 'Is Empty', labelAr: 'فارغ' },
  { value: 'IS_NOT_NULL', label: 'Is Not Empty', labelAr: 'غير فارغ' },
];

const ACCOUNT_SOURCES = [
  { value: 'fixed', label: 'Fixed Account', labelAr: 'حساب ثابت' },
  { value: 'from_expense_type', label: 'From Expense Type', labelAr: 'من نوع المصروف' },
  { value: 'from_vendor', label: 'From Vendor', labelAr: 'من المورد' },
  { value: 'from_customer', label: 'From Customer', labelAr: 'من العميل' },
  { value: 'from_bank', label: 'From Bank Account', labelAr: 'من الحساب البنكي' },
  { value: 'from_entity_field', label: 'From Entity Field', labelAr: 'من حقل الكيان' },
];

const AMOUNT_SOURCES = [
  { value: 'full_amount', label: 'Full Amount', labelAr: 'المبلغ كاملاً' },
  { value: 'percentage', label: 'Percentage', labelAr: 'نسبة مئوية' },
  { value: 'fixed', label: 'Fixed Amount', labelAr: 'مبلغ ثابت' },
  { value: 'field', label: 'From Field', labelAr: 'من حقل' },
];

function AccountingRulesPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [rules, setRules] = useState<AccountingRule[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrigger, setFilterTrigger] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AccountingRule | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<'general' | 'conditions' | 'lines'>('general');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    description: '',
    trigger_code: '',
    is_active: true,
    priority: 100,
    auto_post: false,
    require_approval: true,
    stop_on_match: true,
  });

  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [lines, setLines] = useState<RuleLine[]>([]);

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

      const [rulesRes, triggersRes, accountsRes] = await Promise.all([
        fetch('http://localhost:4000/api/accounting-rules', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/api/accounting-rules/triggers', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/api/accounts?limit=500', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (rulesRes.ok) {
        const rulesBody = await rulesRes.json();
        setRules(Array.isArray(rulesBody?.data) ? rulesBody.data : []);
      }

      if (triggersRes.ok) {
        const triggersBody = await triggersRes.json();
        setTriggers(Array.isArray(triggersBody?.data) ? triggersBody.data : []);
      }

      if (accountsRes.ok) {
        const accountsBody = await accountsRes.json();
        setAccounts(Array.isArray(accountsBody?.data) ? accountsBody.data : []);
      }
    } catch (e: any) {
      showToast(e?.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.trigger_code) newErrors.trigger_code = t('validation.required');
    if (lines.length === 0) newErrors.lines = locale === 'ar' ? 'يجب إضافة بند واحد على الأقل' : 'At least one line is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      if (errors.lines) {
        setActiveTab('lines');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingRule
        ? `http://localhost:4000/api/accounting-rules/${editingRule.id}`
        : 'http://localhost:4000/api/accounting-rules';

      const payload = {
        ...formData,
        conditions,
        lines,
      };

      const res = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(t('common.success'), 'success');
        await fetchData();
        setShowModal(false);
        resetForm();
      } else {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || body?.message || t('common.error'));
      }
    } catch (e: any) {
      showToast(e?.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/accounting-rules/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || body?.message || t('common.error'));
      }

      await fetchData();
      showToast(t('common.deleted'), 'success');
    } catch (e: any) {
      showToast(e?.message || t('common.error'), 'error');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: number) => {
    setTogglingId(id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/accounting-rules/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || body?.message || t('common.error'));
      }

      await fetchData();
      showToast(t('common.success'), 'success');
    } catch (e: any) {
      showToast(e?.message || t('common.error'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      description: '',
      trigger_code: '',
      is_active: true,
      priority: 100,
      auto_post: false,
      require_approval: true,
      stop_on_match: true,
    });
    setConditions([]);
    setLines([]);
    setErrors({});
    setActiveTab('general');
  };

  const openEdit = async (rule: AccountingRule) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/accounting-rules/${rule.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load rule');

      const body = await res.json();
      const ruleData = body.data;

      setEditingRule(rule);
      setFormData({
        code: ruleData.code,
        name: ruleData.name,
        name_ar: ruleData.name_ar || '',
        description: ruleData.description || '',
        trigger_code: ruleData.trigger_code,
        is_active: ruleData.is_active,
        priority: ruleData.priority,
        auto_post: ruleData.auto_post,
        require_approval: ruleData.require_approval,
        stop_on_match: ruleData.stop_on_match ?? true,
      });
      setConditions(ruleData.conditions || []);
      setLines(ruleData.lines || []);
      setShowModal(true);
    } catch (e: any) {
      showToast(e?.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field_name: '', operator: '=', field_value: '', condition_group: 1 },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof RuleCondition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const addLine = (lineType: 'debit' | 'credit') => {
    setLines([
      ...lines,
      {
        line_type: lineType,
        account_source: 'fixed',
        amount_source: 'full_amount',
        cost_center_source: 'from_entity',
        project_source: 'from_entity',
        shipment_source: 'from_entity',
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof RuleLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  // Filter rules
  const filteredRules = rules.filter(rule => {
    if (filterTrigger && rule.trigger_code !== filterTrigger) return false;
    if (filterActive === 'active' && !rule.is_active) return false;
    if (filterActive === 'inactive' && rule.is_active) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        rule.code.toLowerCase().includes(search) ||
        rule.name.toLowerCase().includes(search) ||
        (rule.name_ar && rule.name_ar.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Group triggers by entity type
  const triggersByEntity = useMemo(() => {
    const grouped: Record<string, Trigger[]> = {};
    triggers.forEach(t => {
      if (!grouped[t.entity_type]) grouped[t.entity_type] = [];
      grouped[t.entity_type].push(t);
    });
    return grouped;
  }, [triggers]);

  // Stats
  const activeRulesCount = rules.filter(r => r.is_active).length;
  const totalPostings = rules.reduce((sum, r) => sum + (r.postings_count || 0), 0);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'محرك القواعد المحاسبية' : 'Accounting Rules Engine'} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CogIcon className="w-7 h-7 text-blue-600" />
              {locale === 'ar' ? 'محرك القواعد المحاسبية' : 'Accounting Rules Engine'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {locale === 'ar' ? 'القيود المحاسبية التلقائية' : 'Automatic journal entry generation'}
            </p>
          </div>
          {hasPermission('accounting:rules:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {locale === 'ar' ? 'قاعدة جديدة' : 'New Rule'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CogIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'إجمالي القواعد' : 'Total Rules'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{rules.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'القواعد النشطة' : 'Active Rules'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activeRulesCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BoltIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'الأحداث المتاحة' : 'Available Triggers'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{triggers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <ArrowPathIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'القيود المُنشأة' : 'Total Postings'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalPostings}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
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
            value={filterTrigger}
            onChange={(e) => setFilterTrigger(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{locale === 'ar' ? 'كل الأحداث' : 'All Triggers'}</option>
            {triggers.map(t => (
              <option key={t.code} value={t.code}>{locale === 'ar' ? t.name_ar || t.name : t.name}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
            <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-end">
            {t('common.showing')}: <span className="font-bold mx-1">{filteredRules.length}</span> / {rules.length}
          </div>
        </div>
      </Card>

      {/* Rules Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="p-8 text-center">
              <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
              {hasPermission('accounting:rules:create') && (
                <Button onClick={() => { resetForm(); setShowModal(true); }} className="mt-4">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  {locale === 'ar' ? 'إنشاء أول قاعدة' : 'Create First Rule'}
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'الكود' : 'Code'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'اسم القاعدة' : 'Rule Name'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'الحدث' : 'Trigger'}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'الشروط' : 'Conditions'}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'البنود' : 'Lines'}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'الترحيل' : 'Auto-Post'}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRules.map((rule) => {
                  const TriggerIcon = TRIGGER_ICONS[rule.entity_type || 'default'] || BoltIcon;
                  return (
                    <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-900 dark:text-white">{rule.code}</span>
                        {rule.is_system && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {locale === 'ar' ? 'نظام' : 'System'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{rule.name}</p>
                        {rule.name_ar && <p className="text-xs text-gray-500">{rule.name_ar}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TriggerIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {locale === 'ar' ? rule.trigger_name_ar || rule.trigger_name : rule.trigger_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{rule.conditions_count || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{rule.lines_count || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {rule.auto_post ? (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                            {locale === 'ar' ? 'تلقائي' : 'Auto'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                            {locale === 'ar' ? 'يدوي' : 'Manual'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          rule.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {rule.is_active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'متوقف' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {hasPermission('accounting:rules:edit') && !rule.is_system && (
                            <>
                              <button
                                onClick={() => handleToggle(rule.id)}
                                disabled={togglingId === rule.id}
                                className={`p-1.5 rounded transition ${rule.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                                title={rule.is_active ? (locale === 'ar' ? 'إيقاف' : 'Deactivate') : (locale === 'ar' ? 'تفعيل' : 'Activate')}
                              >
                                {togglingId === rule.id ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : rule.is_active ? (
                                  <PauseIcon className="w-4 h-4" />
                                ) : (
                                  <PlayIcon className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => openEdit(rule)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {hasPermission('accounting:rules:delete') && !rule.is_system && (
                            <button
                              onClick={() => { setDeletingId(rule.id); setConfirmOpen(true); }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingRule ? (locale === 'ar' ? 'تعديل القاعدة' : 'Edit Rule') : (locale === 'ar' ? 'قاعدة جديدة' : 'New Rule')}
        size="xl"
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {locale === 'ar' ? 'عام' : 'General'}
            </button>
            <button
              onClick={() => setActiveTab('conditions')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === 'conditions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {locale === 'ar' ? 'الشروط' : 'Conditions'} ({conditions.length})
            </button>
            <button
              onClick={() => setActiveTab('lines')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === 'lines'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {locale === 'ar' ? 'بنود القيد' : 'Journal Lines'} ({lines.length})
              {errors.lines && <ExclamationTriangleIcon className="w-4 h-4 text-red-500 inline ml-1" />}
            </button>
          </div>

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={locale === 'ar' ? 'الكود' : 'Code'}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  error={errors.code}
                  required
                  disabled={!!editingRule}
                  placeholder="e.g., EXP_SEA_FREIGHT"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {locale === 'ar' ? 'الحدث المحفز' : 'Trigger Event'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.trigger_code}
                    onChange={(e) => setFormData({ ...formData, trigger_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    disabled={!!editingRule}
                  >
                    <option value="">{t('common.select')}</option>
                    {Object.entries(triggersByEntity).map(([entity, entityTriggers]) => (
                      <optgroup key={entity} label={entity.replace('_', ' ').toUpperCase()}>
                        {entityTriggers.map(t => (
                          <option key={t.code} value={t.code}>
                            {locale === 'ar' ? t.name_ar || t.name : t.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {errors.trigger_code && <p className="mt-1 text-sm text-red-600">{errors.trigger_code}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={locale === 'ar' ? 'الاسم (إنجليزي)' : 'Name (EN)'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={errors.name}
                  required
                />
                <Input
                  label={locale === 'ar' ? 'الاسم (عربي)' : 'Name (AR)'}
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  dir="rtl"
                />
              </div>

              <Input
                label={locale === 'ar' ? 'الوصف' : 'Description'}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label={locale === 'ar' ? 'الأولوية' : 'Priority'}
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                  helperText={locale === 'ar' ? 'الأقل = الأولى' : 'Lower = Higher priority'}
                />
              </div>

              <div className="flex flex-wrap gap-6 pt-4 border-t dark:border-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {locale === 'ar' ? 'نشط' : 'Active'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_post}
                    onChange={(e) => setFormData({ ...formData, auto_post: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {locale === 'ar' ? 'ترحيل تلقائي' : 'Auto-Post'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.require_approval}
                    onChange={(e) => setFormData({ ...formData, require_approval: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {locale === 'ar' ? 'يتطلب موافقة' : 'Require Approval'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Conditions Tab */}
          {activeTab === 'conditions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {locale === 'ar' ? 'الشروط التي يجب تحققها لتطبيق القاعدة' : 'Conditions that must be met for the rule to apply'}
                </p>
                <Button size="sm" variant="secondary" onClick={addCondition}>
                  <PlusIcon className="w-4 h-4 mr-1" />
                  {locale === 'ar' ? 'إضافة شرط' : 'Add Condition'}
                </Button>
              </div>

              {conditions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {locale === 'ar' ? 'لا توجد شروط - سيتم تطبيق القاعدة دائماً' : 'No conditions - rule will always apply'}
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((cond, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <input
                        type="text"
                        placeholder={locale === 'ar' ? 'اسم الحقل' : 'Field name'}
                        value={cond.field_name}
                        onChange={(e) => updateCondition(index, 'field_name', e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      >
                        {OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>
                            {locale === 'ar' ? op.labelAr : op.label}
                          </option>
                        ))}
                      </select>
                      {!['IS_NULL', 'IS_NOT_NULL'].includes(cond.operator) && (
                        <input
                          type="text"
                          placeholder={locale === 'ar' ? 'القيمة' : 'Value'}
                          value={cond.field_value}
                          onChange={(e) => updateCondition(index, 'field_value', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        />
                      )}
                      <button
                        onClick={() => removeCondition(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lines Tab */}
          {activeTab === 'lines' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {locale === 'ar' ? 'بنود القيد المحاسبي المُولّد' : 'Journal entry lines to be generated'}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => addLine('debit')}>
                    <PlusIcon className="w-4 h-4 mr-1" />
                    {locale === 'ar' ? 'مدين' : 'Debit'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => addLine('credit')}>
                    <PlusIcon className="w-4 h-4 mr-1" />
                    {locale === 'ar' ? 'دائن' : 'Credit'}
                  </Button>
                </div>
              </div>

              {errors.lines && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded">
                  {errors.lines}
                </div>
              )}

              {lines.length === 0 ? (
                <div className="p-4 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {locale === 'ar' ? 'أضف بنود القيد المحاسبي' : 'Add journal entry lines'}
                </div>
              ) : (
                <div className="space-y-4">
                  {lines.map((line, index) => (
                    <div key={index} className={`p-4 rounded-lg border-2 ${line.line_type === 'debit' ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${line.line_type === 'debit' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                          {line.line_type === 'debit' ? (locale === 'ar' ? 'مدين' : 'DEBIT') : (locale === 'ar' ? 'دائن' : 'CREDIT')}
                        </span>
                        <button onClick={() => removeLine(index)} className="p-1 text-red-500 hover:bg-red-100 rounded">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">{locale === 'ar' ? 'مصدر الحساب' : 'Account Source'}</label>
                          <select
                            value={line.account_source}
                            onChange={(e) => updateLine(index, 'account_source', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          >
                            {ACCOUNT_SOURCES.map(s => (
                              <option key={s.value} value={s.value}>{locale === 'ar' ? s.labelAr : s.label}</option>
                            ))}
                          </select>
                        </div>

                        {line.account_source === 'fixed' && (
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">{locale === 'ar' ? 'الحساب' : 'Account'}</label>
                            <select
                              value={line.account_id || ''}
                              onChange={(e) => updateLine(index, 'account_id', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            >
                              <option value="">{t('common.select')}</option>
                              {accounts.filter(a => !a.code.includes('.')).slice(0, 100).map(a => (
                                <option key={a.id} value={a.id}>{a.code} - {locale === 'ar' ? a.name_ar || a.name : a.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">{locale === 'ar' ? 'مصدر المبلغ' : 'Amount Source'}</label>
                          <select
                            value={line.amount_source}
                            onChange={(e) => updateLine(index, 'amount_source', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          >
                            {AMOUNT_SOURCES.map(s => (
                              <option key={s.value} value={s.value}>{locale === 'ar' ? s.labelAr : s.label}</option>
                            ))}
                          </select>
                        </div>

                        {(line.amount_source === 'percentage' || line.amount_source === 'fixed') && (
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              {line.amount_source === 'percentage' ? (locale === 'ar' ? 'النسبة %' : 'Percentage %') : (locale === 'ar' ? 'المبلغ' : 'Amount')}
                            </label>
                            <input
                              type="number"
                              value={line.amount_value || ''}
                              onChange={(e) => updateLine(index, 'amount_value', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            />
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <label className="text-xs text-gray-500 mb-1 block">{locale === 'ar' ? 'قالب الوصف' : 'Description Template'}</label>
                        <input
                          type="text"
                          placeholder={locale === 'ar' ? 'مثال: مصروف {expense_type} للشحنة {shipment_number}' : 'e.g., {expense_type} expense for shipment {shipment_number}'}
                          value={line.description_template || ''}
                          onChange={(e) => updateLine(index, 'description_template', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSubmit} loading={isSubmitting} className="flex-1">
              {t('common.save')}
            </Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={locale === 'ar' ? 'هل أنت متأكد من حذف هذه القاعدة؟' : 'Are you sure you want to delete this rule?'}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission('accounting:rules:view', AccountingRulesPage);
