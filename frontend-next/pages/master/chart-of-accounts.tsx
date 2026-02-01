import { useEffect, useMemo, useRef, useState } from 'react';
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
  RectangleStackIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  BanknotesIcon,
  LockClosedIcon,
  LockOpenIcon,
  LinkIcon,
  DocumentIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  TruckIcon,
  BriefcaseIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type AccountClassification = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface AccountType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  nature: 'debit' | 'credit';
  classification: AccountClassification;
  report_group: string;
  display_order: number;
}

interface AccountBehavior {
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  allow_posting: boolean;
  display_order: number;
}

interface LinkedEntityType {
  code: string;
  name: string;
  name_ar?: string;
  source_table?: string;
  display_order: number;
}

interface AccountRow {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  account_type_id: number;
  account_type_name?: string;
  parent_id?: number;
  parent_code?: string;
  parent_name?: string;
  level: number;
  is_group: boolean;
  is_header: boolean;
  can_delete?: boolean;
  currency_code?: string;
  balance?: number;
  is_active: boolean;
  is_frozen?: boolean;
  is_system?: boolean;
  account_behavior?: string;
  behavior_name?: string;
  behavior_name_ar?: string;
  level_type?: string;
  linked_entity_type?: string;
  linked_entity_id?: number;
  allow_posting?: boolean;
  normal_balance?: string;
  cost_center_required?: boolean;
  project_required?: boolean;
  budget_amount?: number;
  notes?: string;
  children_count?: number;
  created_at?: string;
  updated_at?: string;
}

const ACCOUNT_CLASSIFICATIONS: Array<{
  value: AccountClassification;
  label: string;
  labelAr: string;
  color: string;
  bgColor: string;
}> = [
  { value: 'asset', label: 'Assets', labelAr: 'الأصول', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'liability', label: 'Liabilities', labelAr: 'الالتزامات', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'equity', label: 'Equity', labelAr: 'حقوق الملكية', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { value: 'revenue', label: 'Revenue', labelAr: 'الإيرادات', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { value: 'expense', label: 'Expenses', labelAr: 'المصروفات', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
];

const BEHAVIOR_COLORS: Record<string, string> = {
  HEADER: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  GROUP: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  CONTROL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DETAIL: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ANALYTICAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SYSTEM: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  SUSPENSE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CLEARING: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  customer: UserGroupIcon,
  vendor: TruckIcon,
  employee: BriefcaseIcon,
  bank: BuildingOfficeIcon,
  project: CubeIcon,
  cost_center: WrenchScrewdriverIcon,
  asset: CurrencyDollarIcon,
  shipment: DocumentIcon,
  branch: BuildingOfficeIcon,
};

function ChartOfAccountsPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<AccountRow[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [behaviors, setBehaviors] = useState<AccountBehavior[]>([]);
  const [linkedEntityTypes, setLinkedEntityTypes] = useState<LinkedEntityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AccountClassification | ''>('');
  const [filterBehavior, setFilterBehavior] = useState<string>('');
  const [showFrozenOnly, setShowFrozenOnly] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [freezingId, setFreezingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    account_type_id: 0,
    parent_id: 0,
    is_header: false,
    description: '',
    is_active: true,
    account_behavior: 'DETAIL',
    linked_entity_type: '',
    cost_center_required: false,
    project_required: false,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const accountTypeById = useMemo(() => {
    return new Map(accountTypes.map(at => [at.id, at] as const));
  }, [accountTypes]);

  const formatLevelLabel = (level?: number, levelType?: string) => {
    if (levelType) {
      const labels: Record<string, { en: string; ar: string }> = {
        header: { en: 'Header', ar: 'رئيسي' },
        group: { en: 'Group', ar: 'مجموعة' },
        control: { en: 'Control', ar: 'تحكم' },
        detail: { en: 'Detail', ar: 'تفصيلي' },
        analytical: { en: 'Analytical', ar: 'تحليلي' },
      };
      const label = labels[levelType];
      if (label) return locale === 'ar' ? label.ar : label.en;
    }

    const l = Number(level);
    if (!Number.isFinite(l) || l <= 0) return '-';
    if (locale === 'ar') {
      if (l === 1) return 'رئيسي';
      if (l === 2) return 'مجموعة';
      if (l === 3) return 'تحكم';
      if (l === 4) return 'تفصيلي';
      return `مستوى ${l}`;
    }
    if (l === 1) return 'Header';
    if (l === 2) return 'Group';
    if (l === 3) return 'Control';
    if (l === 4) return 'Detail';
    return `Level ${l}`;
  };

  const formatAccountTypeName = (typeInfo?: AccountType, fallback?: string) => {
    if (!typeInfo) return fallback || t('common.type');
    if (locale === 'ar') return typeInfo.name_ar || typeInfo.name || fallback || t('common.type');
    return typeInfo.name || fallback || t('common.type');
  };

  const formatBehaviorName = (item: AccountRow) => {
    if (locale === 'ar' && item.behavior_name_ar) return item.behavior_name_ar;
    return item.behavior_name || item.account_behavior || '-';
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      void fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch account types, behaviors, and linked entity types in parallel
      const [typesRes, behaviorsRes, entityTypesRes] = await Promise.all([
        fetch('http://localhost:4000/api/accounts/types', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/api/accounts/behaviors', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/api/accounts/linked-entity-types', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!typesRes.ok) {
        const body = await typesRes.json().catch(() => null);
        throw new Error(body?.error || body?.message || t('common.error'));
      }
      const typesBody = await typesRes.json();

      if (behaviorsRes.ok) {
        const behaviorsBody = await behaviorsRes.json();
        setBehaviors(Array.isArray(behaviorsBody?.data) ? behaviorsBody.data : []);
      }

      if (entityTypesRes.ok) {
        const entityTypesBody = await entityTypesRes.json();
        setLinkedEntityTypes(Array.isArray(entityTypesBody?.data) ? entityTypesBody.data : []);
      }

      // Fetch ALL accounts across pages
      const allAccounts: AccountRow[] = [];
      let page = 1;
      const limit = 100;
      while (true) {
        const url = `http://localhost:4000/api/accounts?with_balance=true&page=${page}&limit=${limit}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || body?.message || t('common.error'));
        }
        const body = await res.json();
        const pageData = Array.isArray(body?.data) ? body.data : [];
        allAccounts.push(...pageData);

        const totalPages = Number(body?.meta?.totalPages);
        if (!Number.isFinite(totalPages) || page >= totalPages) break;
        page += 1;
      }

      setAccountTypes(Array.isArray(typesBody?.data) ? typesBody.data : []);
      setItems(allAccounts);
      setExpandedItems(new Set());
    } catch (e: any) {
      setItems([]);
      setAccountTypes([]);
      showToast(e?.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.account_type_id) newErrors.account_type_id = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem
        ? `http://localhost:4000/api/accounts/${editingItem.id}`
        : 'http://localhost:4000/api/accounts';

      const payload = editingItem
        ? {
            name: formData.name,
            name_ar: formData.name_ar || null,
            description: formData.description || null,
            is_active: formData.is_active,
            account_behavior: formData.account_behavior,
            linked_entity_type: formData.linked_entity_type || null,
            cost_center_required: formData.cost_center_required,
            project_required: formData.project_required,
            notes: formData.notes || null,
          }
        : {
            code: formData.code,
            name: formData.name,
            name_ar: formData.name_ar || null,
            description: formData.description || null,
            account_type_id: formData.account_type_id,
            parent_id: formData.parent_id || null,
            is_header: formData.is_header,
            is_active: formData.is_active,
            account_behavior: formData.account_behavior,
            linked_entity_type: formData.linked_entity_type || null,
            cost_center_required: formData.cost_center_required,
            project_required: formData.project_required,
            notes: formData.notes || null,
          };

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
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
      const res = await fetch(`http://localhost:4000/api/accounts/${deletingId}`, {
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

  const handleToggleFreeze = async (id: number) => {
    setFreezingId(id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/accounts/${id}/toggle-freeze`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || body?.message || t('common.error'));
      }

      const body = await res.json();
      showToast(body.message || t('common.success'), 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.error'), 'error');
    } finally {
      setFreezingId(null);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      account_type_id: 0,
      parent_id: 0,
      is_header: false,
      description: '',
      is_active: true,
      account_behavior: 'DETAIL',
      linked_entity_type: '',
      cost_center_required: false,
      project_required: false,
      notes: '',
    });
    setErrors({});
  };

  const openEdit = (item: AccountRow) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      account_type_id: item.account_type_id,
      parent_id: item.parent_id || 0,
      is_header: item.is_header || item.is_group,
      description: item.description || '',
      is_active: item.is_active,
      account_behavior: item.account_behavior || 'DETAIL',
      linked_entity_type: item.linked_entity_type || '',
      cost_center_required: item.cost_center_required || false,
      project_required: item.project_required || false,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    const allWithChildren = items.filter(i => i.children_count && i.children_count > 0).map(i => i.id);
    setExpandedItems(new Set(allWithChildren));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  const hasChildren = (id: number) => {
    const item = items.find(i => i.id === id);
    return (item?.children_count ?? 0) > 0 || items.some(i => i.parent_id === id);
  };

  const itemById = useMemo(() => {
    return new Map(items.map((i) => [i.id, i] as const));
  }, [items]);

  const allowedRootIds = useMemo(() => {
    const wantedCodes = new Set(['1', '2', '3', '4', '5']);
    const roots = items.filter((i) => !i.parent_id);
    const byCode = roots.filter((r) => wantedCodes.has(String(r.code)));
    const picked = (byCode.length > 0 ? byCode : roots.filter((r) => (r.level ?? 0) === 1))
      .slice(0, 5)
      .map((r) => r.id);
    return new Set<number>(picked);
  }, [items]);

  const getTopRootId = (item: AccountRow): number | null => {
    let current: AccountRow | undefined = item;
    let guard = 0;
    while (current && current.parent_id && guard < 50) {
      current = itemById.get(current.parent_id);
      guard += 1;
    }
    return current?.id ?? null;
  };

  const matchesSearch = (item: AccountRow, q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      item.code.toLowerCase().includes(s) ||
      item.name.toLowerCase().includes(s) ||
      (item.name_ar ? item.name_ar.toLowerCase().includes(s) : false)
    );
  };

  const isVisible = (item: AccountRow, q: string): boolean => {
    const topRootId = getTopRootId(item);
    if (!topRootId || !allowedRootIds.has(topRootId)) return false;

    const s = q.trim();
    if (s) {
      if (matchesSearch(item, s)) return true;
      let current: AccountRow | undefined = item;
      let guard = 0;
      while (current?.parent_id && guard < 50) {
        const parent = itemById.get(current.parent_id);
        if (!parent) break;
        if (matchesSearch(parent, s)) return true;
        current = parent;
        guard += 1;
      }
      return items.some((child) => {
        if (!matchesSearch(child, s)) return false;
        return getTopRootId(child) === topRootId;
      });
    }

    if (!item.parent_id) return allowedRootIds.has(item.id);
    const parent = itemById.get(item.parent_id);
    if (!parent) return true;
    return expandedItems.has(parent.id) && isVisible(parent, '');
  };

  const filteredItems = items.filter(item => {
    if (!isVisible(item, searchTerm)) return false;

    const typeInfo = accountTypeById.get(item.account_type_id);
    const matchType = !filterType || typeInfo?.classification === filterType;
    if (!matchType) return false;

    if (filterBehavior && item.account_behavior !== filterBehavior) return false;
    if (showFrozenOnly && !item.is_frozen) return false;

    const s = searchTerm.trim();
    if (!s) return true;

    if (matchesSearch(item, s)) return true;
    return items.some((child) => {
      if (!matchesSearch(child, s)) return false;
      let current: AccountRow | undefined = child;
      let guard = 0;
      while (current?.parent_id && guard < 50) {
        const parent = itemById.get(current.parent_id);
        if (!parent) break;
        if (parent.id === item.id) return true;
        current = parent;
        guard += 1;
      }
      return false;
    });
  });

  const headerAccounts = items.filter(i => {
    if (!i.is_header && !i.is_group && i.account_behavior !== 'HEADER' && i.account_behavior !== 'GROUP' && i.account_behavior !== 'CONTROL') return false;
    if (!filterType) return true;
    const typeInfo = accountTypeById.get(i.account_type_id);
    return typeInfo?.classification === filterType;
  });

  // Stats
  const totalAccounts = items.length;
  const frozenCount = items.filter(i => i.is_frozen).length;
  const detailCount = items.filter(i => i.account_behavior === 'DETAIL' || i.allow_posting).length;

  return (
    <MainLayout>
      <Head>
        <title>{t('chartOfAccounts.title') || 'Chart of Accounts'} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('chartOfAccounts.title') || 'Chart of Accounts'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {locale === 'ar' ? 'الهيكل المحاسبي بخمسة مستويات' : '5-Level Professional Account Structure'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={expandAll} className="text-sm">
              {locale === 'ar' ? 'توسيع الكل' : 'Expand All'}
            </Button>
            <Button variant="secondary" onClick={collapseAll} className="text-sm">
              {locale === 'ar' ? 'طي الكل' : 'Collapse All'}
            </Button>
            {hasPermission('master:accounts:create') && (
              <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                {t('chartOfAccounts.new') || 'New Account'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {ACCOUNT_CLASSIFICATIONS.map(type => {
          const typeAccountsCount = items.filter(i => {
            const typeInfo = accountTypeById.get(i.account_type_id);
            return typeInfo?.classification === type.value;
          }).length;
          const isActive = filterType === type.value;
          return (
            <Card
              key={type.value}
              className={`p-3 cursor-pointer select-none transition-all ${isActive ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-102'}`}
              onClick={() => setFilterType((prev) => (prev === type.value ? '' : (type.value as any)))}
            >
              <div className="text-center">
                <div className={`inline-flex p-2 rounded-lg ${type.bgColor} mb-2`}>
                  {type.value === 'asset' ? <CurrencyDollarIcon className={`w-5 h-5 ${type.color}`} /> :
                   type.value === 'liability' ? <CalculatorIcon className={`w-5 h-5 ${type.color}`} /> :
                   type.value === 'equity' ? <RectangleStackIcon className={`w-5 h-5 ${type.color}`} /> :
                   type.value === 'revenue' ? <BanknotesIcon className={`w-5 h-5 ${type.color}`} /> :
                   <CalculatorIcon className={`w-5 h-5 ${type.color}`} />}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{locale === 'ar' ? type.labelAr : type.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{typeAccountsCount}</p>
              </div>
            </Card>
          );
        })}
        {/* Frozen accounts indicator */}
        <Card
          className={`p-3 cursor-pointer select-none transition-all ${showFrozenOnly ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setShowFrozenOnly(!showFrozenOnly)}
        >
          <div className="text-center">
            <div className="inline-flex p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 mb-2">
              <LockClosedIcon className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{locale === 'ar' ? 'مجمدة' : 'Frozen'}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{frozenCount}</p>
          </div>
        </Card>
        {/* Detail accounts */}
        <Card className="p-3">
          <div className="text-center">
            <div className="inline-flex p-2 rounded-lg bg-green-100 dark:bg-green-900/30 mb-2">
              <DocumentIcon className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{locale === 'ar' ? 'قابلة للقيد' : 'Postable'}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{detailCount}</p>
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
            value={filterType}
            onChange={(e) => setFilterType((e.target.value || '') as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{locale === 'ar' ? 'كل التصنيفات' : 'All Classifications'}</option>
            {ACCOUNT_CLASSIFICATIONS.map(type => (
              <option key={type.value} value={type.value}>{locale === 'ar' ? type.labelAr : type.label}</option>
            ))}
          </select>
          <select
            value={filterBehavior}
            onChange={(e) => setFilterBehavior(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{locale === 'ar' ? 'كل السلوكيات' : 'All Behaviors'}</option>
            {behaviors.map(b => (
              <option key={b.code} value={b.code}>{locale === 'ar' ? b.name_ar || b.name : b.name}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-end">
            {t('common.showing')}: <span className="font-bold mx-1">{filteredItems.length}</span> / {totalAccounts}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <RectangleStackIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('chartOfAccounts.code') || 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('chartOfAccounts.accountName') || 'Account Name'}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{locale === 'ar' ? 'المستوى' : 'Level'}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{locale === 'ar' ? 'السلوك' : 'Behavior'}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{locale === 'ar' ? 'الربط' : 'Linked'}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{locale === 'ar' ? 'الطبيعة' : 'Nature'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('chartOfAccounts.currentBalance') || 'Balance'}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const typeInfo = accountTypeById.get(item.account_type_id);
                  const classification = typeInfo?.classification;
                  const classificationInfo = classification
                    ? ACCOUNT_CLASSIFICATIONS.find(c => c.value === classification)
                    : undefined;
                  const paddingLeft = (item.level - 1) * 20;
                  const hasChildAccounts = hasChildren(item.id);
                  const EntityIcon = item.linked_entity_type ? ENTITY_ICONS[item.linked_entity_type] || LinkIcon : null;
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                        item.is_header || item.is_group || item.account_behavior === 'HEADER' ? 'bg-slate-50 dark:bg-slate-800/50 font-semibold' : ''
                      } ${item.is_frozen ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center" style={{ paddingLeft }}>
                          {hasChildAccounts ? (
                            <button onClick={() => toggleExpand(item.id)} className="mr-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                              <ChevronRightIcon className={`w-4 h-4 text-gray-500 transition-transform ${expandedItems.has(item.id) ? 'rotate-90' : ''}`} />
                            </button>
                          ) : (
                            <span className="w-5 mr-1" />
                          )}
                          <span className={`font-mono text-sm ${item.is_header || item.account_behavior === 'HEADER' ? 'font-bold text-slate-700 dark:text-slate-300' : ''} text-gray-900 dark:text-white`}>
                            {item.code}
                          </span>
                          {item.is_frozen && (
                            <LockClosedIcon className="w-3.5 h-3.5 text-orange-500 ml-1" title={locale === 'ar' ? 'مجمد' : 'Frozen'} />
                          )}
                          {item.is_system && (
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-gray-400 ml-1" title={locale === 'ar' ? 'حساب نظام' : 'System Account'} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {(item.is_header || item.is_group || item.account_behavior === 'HEADER' || item.account_behavior === 'GROUP') && (
                            <FolderIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm truncate ${item.is_header || item.account_behavior === 'HEADER' ? 'font-semibold' : ''} text-gray-900 dark:text-white`}>
                              {item.name}
                            </p>
                            {item.name_ar && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.name_ar}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {formatLevelLabel(item.level, item.level_type)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${BEHAVIOR_COLORS[item.account_behavior || 'DETAIL'] || 'bg-gray-100 text-gray-700'}`}>
                          {formatBehaviorName(item)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {EntityIcon && (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                            <EntityIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">{item.linked_entity_type}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-xs font-medium ${typeInfo?.nature === 'debit' ? 'text-blue-600' : 'text-green-600'}`}>
                          {typeInfo?.nature === 'debit' ? (locale === 'ar' ? 'مدين' : 'Dr') : (locale === 'ar' ? 'دائن' : 'Cr')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {item.allow_posting !== false && item.balance !== undefined ? (
                          <span className={`font-mono text-sm ${Number(item.balance) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
                            {Number(item.balance).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            item.is_active 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {item.is_active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {hasPermission('master:accounts:edit') && !item.is_system && (
                            <>
                              <button 
                                onClick={() => handleToggleFreeze(item.id)} 
                                disabled={freezingId === item.id}
                                className={`p-1.5 rounded transition ${item.is_frozen ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
                                title={item.is_frozen ? (locale === 'ar' ? 'إلغاء التجميد' : 'Unfreeze') : (locale === 'ar' ? 'تجميد' : 'Freeze')}
                              >
                                {freezingId === item.id ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : item.is_frozen ? (
                                  <LockOpenIcon className="w-4 h-4" />
                                ) : (
                                  <LockClosedIcon className="w-4 h-4" />
                                )}
                              </button>
                              <button 
                                onClick={() => openEdit(item)} 
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {hasPermission('master:accounts:delete') && (item.can_delete ?? true) && !item.is_system && (
                            <button 
                              onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} 
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
        title={editingItem ? (locale === 'ar' ? 'تعديل الحساب' : 'Edit Account') : (locale === 'ar' ? 'حساب جديد' : 'New Account')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Row 1: Code & Type */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('chartOfAccounts.code') || 'Account Code'}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={errors.code}
              required
              placeholder="e.g., 1101"
              disabled={!!editingItem}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.account_type_id}
                onChange={(e) => setFormData({ ...formData, account_type_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={!!editingItem}
              >
                <option value={0}>{t('common.select')}</option>
                {accountTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.code} - {locale === 'ar' ? type.name_ar || type.name : type.name}
                  </option>
                ))}
              </select>
              {errors.account_type_id && (
                <p className="mt-1 text-sm text-red-600">{errors.account_type_id}</p>
              )}
            </div>
          </div>

          {/* Row 2: Names */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('chartOfAccounts.accountName') || 'Account Name (EN)'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />
            <Input
              label={locale === 'ar' ? 'اسم الحساب (عربي)' : 'Account Name (AR)'}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          {/* Row 3: Parent & Behavior */}
          <div className="grid grid-cols-2 gap-4">
            {!editingItem && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'الحساب الأب' : 'Parent Account'}
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">{locale === 'ar' ? 'بدون أب (جذر)' : 'None (Root)'}</option>
                  {headerAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{'  '.repeat(acc.level - 1)}{acc.code} - {acc.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'سلوك الحساب' : 'Account Behavior'}
              </label>
              <select
                value={formData.account_behavior}
                onChange={(e) => setFormData({ ...formData, account_behavior: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {behaviors.map(b => (
                  <option key={b.code} value={b.code}>
                    {locale === 'ar' ? b.name_ar || b.name : b.name}
                  </option>
                ))}
                {behaviors.length === 0 && (
                  <>
                    <option value="HEADER">{locale === 'ar' ? 'رئيسي' : 'Header'}</option>
                    <option value="GROUP">{locale === 'ar' ? 'مجموعة' : 'Group'}</option>
                    <option value="CONTROL">{locale === 'ar' ? 'تحكم' : 'Control'}</option>
                    <option value="DETAIL">{locale === 'ar' ? 'تفصيلي' : 'Detail'}</option>
                    <option value="ANALYTICAL">{locale === 'ar' ? 'تحليلي' : 'Analytical'}</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Row 4: Linked Entity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'ربط مع كيان' : 'Link to Entity'}
              </label>
              <select
                value={formData.linked_entity_type}
                onChange={(e) => setFormData({ ...formData, linked_entity_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">{locale === 'ar' ? 'بدون ربط' : 'No Link'}</option>
                {linkedEntityTypes.map(et => (
                  <option key={et.code} value={et.code}>
                    {locale === 'ar' ? et.name_ar || et.name : et.name}
                  </option>
                ))}
                {linkedEntityTypes.length === 0 && (
                  <>
                    <option value="customer">{locale === 'ar' ? 'عميل' : 'Customer'}</option>
                    <option value="vendor">{locale === 'ar' ? 'مورد' : 'Vendor'}</option>
                    <option value="employee">{locale === 'ar' ? 'موظف' : 'Employee'}</option>
                    <option value="bank">{locale === 'ar' ? 'بنك' : 'Bank'}</option>
                    <option value="project">{locale === 'ar' ? 'مشروع' : 'Project'}</option>
                    <option value="shipment">{locale === 'ar' ? 'شحنة' : 'Shipment'}</option>
                  </>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {locale === 'ar' ? 'ربط الحساب بكيان محدد (عميل، مورد...)' : 'Link account to entity (customer, vendor...)'}
              </p>
            </div>
            <Input
              label={locale === 'ar' ? 'الوصف' : 'Description'}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Row 5: Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-6 pt-2 border-t dark:border-gray-700">
            {!editingItem && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_header"
                  checked={formData.is_header}
                  onChange={(e) => setFormData({ ...formData, is_header: e.target.checked, account_behavior: e.target.checked ? 'HEADER' : 'DETAIL' })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="is_header" className="text-sm text-gray-700 dark:text-gray-300">
                  {locale === 'ar' ? 'حساب رئيسي (مجموعة)' : 'Header Account (Group)'}
                </label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cost_center_required"
                checked={formData.cost_center_required}
                onChange={(e) => setFormData({ ...formData, cost_center_required: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="cost_center_required" className="text-sm text-gray-700 dark:text-gray-300">
                {locale === 'ar' ? 'يتطلب مركز تكلفة' : 'Requires Cost Center'}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="project_required"
                checked={formData.project_required}
                onChange={(e) => setFormData({ ...formData, project_required: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="project_required" className="text-sm text-gray-700 dark:text-gray-300">
                {locale === 'ar' ? 'يتطلب مشروع' : 'Requires Project'}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                {locale === 'ar' ? 'نشط' : 'Active'}
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
        message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this account? This action cannot be undone.'}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, ChartOfAccountsPage);
