/**
 * 📒 CHART OF ACCOUNTS – Professional Tree View
 * =====================================================
 * Unified chart of accounts management with:
 * - Beautiful hierarchical tree visualization
 * - Summary statistics dashboard
 * - Expand/collapse all levels
 * - Color-coded account types
 * - Full CRUD with proper validation
 * - Bilingual support (AR/EN)
 *
 * 🔒 Route Protection: master:accounts:view
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  ScaleIcon,
  CurrencyDollarIcon,
  ReceiptRefundIcon,
  CubeTransparentIcon,
  CreditCardIcon,
  LockClosedIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import AuthGuard from '@/components/AuthGuard';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { withPermission } from '@/utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import { useTranslation } from '@/hooks/useTranslation.enhanced';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';

/* ─── Types ─── */
interface Account {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  account_type_id?: number;
  account_type_name?: string;
  classification?: string;
  nature?: string;
  parent_id?: number | null;
  parent_name?: string;
  level: number;
  is_header: boolean;
  is_active: boolean;
  is_frozen?: boolean;
  is_system?: boolean;
  can_delete?: boolean;
  allow_posting?: boolean;
  current_balance?: number;
  opening_balance?: number;
  currency_code?: string;
  children_count?: number;
  description?: string;
  notes?: string;
}

interface AccountType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  nature: 'debit' | 'credit';
  classification: string;
}

interface LevelType {
  level: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface TreeNode extends Account {
  children: TreeNode[];
  depth: number;
}

/* ─── Constants ─── */
const CLASSIFICATION_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  lightBg: string;
}> = {
  asset: {
    icon: CubeTransparentIcon,
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  liability: {
    icon: CreditCardIcon,
    color: 'text-rose-700 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-900/40',
    borderColor: 'border-rose-200 dark:border-rose-800',
    lightBg: 'bg-rose-50 dark:bg-rose-950/30',
  },
  equity: {
    icon: ScaleIcon,
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40',
    borderColor: 'border-purple-200 dark:border-purple-800',
    lightBg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  revenue: {
    icon: CurrencyDollarIcon,
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  expense: {
    icon: ReceiptRefundIcon,
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
    lightBg: 'bg-amber-50 dark:bg-amber-950/30',
  },
};

/* ─── Page Component ─── */
function AccountsPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const isArabic = locale === 'ar';

  /* ─── State ─── */
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [levelTypes, setLevelTypes] = useState<LevelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const [filters, setFilters] = useState({
    search: '',
    classification: '',
    is_active: '',
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    account_type_id: '',
    parent_id: '',
    is_header: false,
    is_active: true,
    description: '',
  });

  // Detail panel
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  /* ─── Data Loading ─── */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, typesRes, levelsRes] = await Promise.all([
        fetchAllAccounts(),
        apiClient.get('/api/accounts/types'),
        apiClient.get('/api/accounts/level-types').catch(() => ({ data: [] })),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setAccountTypes(typesRes?.data ?? []);
      setLevelTypes(levelsRes?.data ?? []);
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAccounts = async () => {
    const limit = 100;
    let page = 1;
    const all: Account[] = [];
    while (true) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        with_balance: 'true',
      });
      const res: any = await apiClient.get(`/api/accounts?${params.toString()}`);
      const data: Account[] = res?.data ?? [];
      all.push(...data);
      const totalPages = Number(res?.meta?.totalPages);
      if (!Number.isFinite(totalPages) || page >= totalPages) break;
      page += 1;
    }
    return all;
  };

  /* ─── Derived Data ─── */
  const accountTypeMap = useMemo(() => {
    return new Map(accountTypes.map((t) => [t.id, t]));
  }, [accountTypes]);

  const levelTypeMap = useMemo(() => {
    return new Map(levelTypes.map((l) => [l.level, l]));
  }, [levelTypes]);

  const classificationForAccount = useCallback(
    (acc: Account): string => {
      if (acc.classification) return acc.classification;
      if (acc.account_type_id) {
        const at = accountTypeMap.get(acc.account_type_id);
        if (at) return at.classification;
      }
      return '';
    },
    [accountTypeMap]
  );

  // Build tree structure
  const accountTree = useMemo((): TreeNode[] => {
    const byParent = new Map<number | null, Account[]>();
    for (const acc of accounts) {
      const key = acc.parent_id ?? null;
      const bucket = byParent.get(key) ?? [];
      bucket.push(acc);
      byParent.set(key, bucket);
    }
    for (const bucket of byParent.values()) {
      bucket.sort((a, b) => a.code.localeCompare(b.code));
    }

    const buildChildren = (parentId: number | null, depth: number): TreeNode[] => {
      const children = byParent.get(parentId) ?? [];
      return children.map((acc) => ({
        ...acc,
        depth,
        children: buildChildren(acc.id, depth + 1),
      }));
    };
    return buildChildren(null, 0);
  }, [accounts]);

  // Filter tree
  const filteredTree = useMemo(() => {
    const searchLower = filters.search.toLowerCase().trim();
    const classFilter = filters.classification;
    const activeFilter = filters.is_active;

    if (!searchLower && !classFilter && !activeFilter) return accountTree;

    const matchesFilter = (acc: Account): boolean => {
      if (searchLower) {
        const matchSearch =
          acc.code.toLowerCase().includes(searchLower) ||
          acc.name.toLowerCase().includes(searchLower) ||
          (acc.name_ar && acc.name_ar.toLowerCase().includes(searchLower));
        if (!matchSearch) return false;
      }
      if (classFilter) {
        const cls = classificationForAccount(acc);
        if (cls !== classFilter) return false;
      }
      if (activeFilter) {
        if (activeFilter === 'true' && !acc.is_active) return false;
        if (activeFilter === 'false' && acc.is_active) return false;
      }
      return true;
    };

    const filterNode = (node: TreeNode): TreeNode | null => {
      const filteredChildren = node.children
        .map(filterNode)
        .filter(Boolean) as TreeNode[];
      if (matchesFilter(node) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return accountTree.map(filterNode).filter(Boolean) as TreeNode[];
  }, [accountTree, filters, classificationForAccount]);

  // Statistics
  const stats = useMemo(() => {
    const total = accounts.length;
    const byClass: Record<string, number> = {};
    const headers = accounts.filter((a) => a.is_header).length;
    const posting = accounts.filter((a) => !a.is_header).length;

    for (const acc of accounts) {
      const cls = classificationForAccount(acc);
      byClass[cls] = (byClass[cls] || 0) + 1;
    }
    return { total, byClass, headers, posting };
  }, [accounts, classificationForAccount]);

  /* ─── Expand/Collapse ─── */
  const toggleExpand = useCallback((id: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = new Set<number>();
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) allIds.add(n.id);
        walk(n.children);
      }
    };
    walk(accountTree);
    setExpandedNodes(allIds);
  }, [accountTree]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Auto-expand first 2 levels on initial load
  useEffect(() => {
    if (accounts.length > 0 && expandedNodes.size === 0) {
      const initial = new Set<number>();
      for (const acc of accounts) {
        if (acc.is_header && acc.level <= 2) initial.add(acc.id);
      }
      setExpandedNodes(initial);
    }
  }, [accounts]);

  /* ─── CRUD ─── */
  const resetForm = () => {
    setFormErrors({});
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      account_type_id: '',
      parent_id: '',
      is_header: false,
      is_active: true,
      description: '',
    });
  };

  const openCreate = (parentAccount?: Account) => {
    setEditingAccount(null);
    resetForm();
    if (parentAccount) {
      setFormData((prev) => ({
        ...prev,
        parent_id: String(parentAccount.id),
        account_type_id: parentAccount.account_type_id
          ? String(parentAccount.account_type_id)
          : '',
      }));
    }
    setModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setFormErrors({});
    setFormData({
      code: account.code || '',
      name: account.name || '',
      name_ar: account.name_ar || '',
      account_type_id: account.account_type_id ? String(account.account_type_id) : '',
      parent_id: account.parent_id ? String(account.parent_id) : '',
      is_header: !!account.is_header,
      is_active: !!account.is_active,
      description: account.description || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAccount(null);
    setSaving(false);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) {
      errors.code = isArabic ? 'كود الحساب مطلوب' : 'Account code is required';
    }
    if (!formData.name.trim()) {
      errors.name = isArabic ? 'اسم الحساب مطلوب' : 'Account name is required';
    }
    if (!formData.account_type_id) {
      errors.account_type_id = isArabic ? 'نوع الحساب مطلوب' : 'Account type is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        name_ar: formData.name_ar.trim() || null,
        account_type_id: Number(formData.account_type_id),
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
        is_header: formData.is_header,
        is_active: formData.is_active,
        description: formData.description.trim() || null,
      };

      if (editingAccount) {
        await apiClient.put(`/api/accounts/${editingAccount.id}`, payload);
        showToast(isArabic ? 'تم تحديث الحساب بنجاح' : 'Account updated', 'success');
      } else {
        await apiClient.post('/api/accounts', payload);
        showToast(isArabic ? 'تم إنشاء الحساب بنجاح' : 'Account created', 'success');
      }
      closeModal();
      loadData();
    } catch (error: any) {
      showToast(error?.message || (isArabic ? 'فشل الحفظ' : 'Save failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: Account) => {
    const msg = isArabic
      ? `هل أنت متأكد من حذف الحساب "${account.name_ar || account.name}"؟`
      : `Delete account "${account.name}"?`;
    if (!confirm(msg)) return;
    try {
      await apiClient.delete(`/api/accounts/${account.id}`);
      showToast(isArabic ? 'تم حذف الحساب' : 'Account deleted', 'success');
      if (selectedAccount?.id === account.id) setSelectedAccount(null);
      loadData();
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    }
  };

  /* ─── Helpers ─── */
  const getClassificationConfig = (cls: string) => {
    return CLASSIFICATION_CONFIG[cls] || CLASSIFICATION_CONFIG.asset;
  };

  const getClassificationLabel = (cls: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      asset: { en: 'Assets', ar: 'أصول' },
      liability: { en: 'Liabilities', ar: 'خصوم' },
      equity: { en: 'Equity', ar: 'حقوق ملكية' },
      revenue: { en: 'Revenue', ar: 'إيرادات' },
      expense: { en: 'Expenses', ar: 'مصروفات' },
    };
    const l = labels[cls];
    return l ? (isArabic ? l.ar : l.en) : cls;
  };

  const getTypeName = (acc: Account) => {
    if (acc.account_type_id) {
      const at = accountTypeMap.get(acc.account_type_id);
      if (at) return isArabic ? (at.name_ar || at.name) : at.name;
    }
    return acc.account_type_name || '';
  };

  const getLevelName = (level: number) => {
    const lt = levelTypeMap.get(level);
    if (lt) return isArabic ? (lt.name_ar || lt.name) : lt.name;
    return `${isArabic ? 'مستوى' : 'Level'} ${level}`;
  };

  const formatBalance = (balance?: number, currencyCode?: string) => {
    if (balance === undefined || balance === null) return '-';
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(balance));
    return `${balance < 0 ? '(' : ''}${formatted}${balance < 0 ? ')' : ''} ${currencyCode || ''}`.trim();
  };

  const getAccountDisplayName = (acc: Account) => {
    return isArabic && acc.name_ar ? acc.name_ar : acc.name;
  };

  /* ─── Grouped types for the form select ─── */
  const groupedTypes = useMemo(() => {
    const groups: Record<string, AccountType[]> = {};
    for (const at of accountTypes) {
      const cls = at.classification || 'other';
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(at);
    }
    return groups;
  }, [accountTypes]);

  /* ─── Export ─── */
  const handleExport = () => {
    if (accounts.length === 0) return;
    const rows = [['Code', 'Name', 'Name (AR)', 'Type', 'Classification', 'Level', 'Status'].join(',')];
    for (const acc of accounts) {
      rows.push(
        [
          acc.code,
          `"${(acc.name || '').replace(/"/g, '""')}"`,
          `"${(acc.name_ar || '').replace(/"/g, '""')}"`,
          `"${(getTypeName(acc) || '').replace(/"/g, '""')}"`,
          classificationForAccount(acc),
          acc.level,
          acc.is_active ? 'Active' : 'Inactive',
        ].join(',')
      );
    }
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chart-of-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(isArabic ? 'تم تصدير الملف بنجاح' : 'Exported successfully', 'success');
  };

  /* ─── Tree Row Renderer ─── */
  const renderTreeNode = (node: TreeNode, isLast: boolean, ancestorLines: boolean[]) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const cls = classificationForAccount(node);
    const config = getClassificationConfig(cls);
    const IconComp = config.icon;
    const isSelected = selectedAccount?.id === node.id;

    return (
      <React.Fragment key={node.id}>
        <div
          className={`group flex items-center py-2.5 px-4 border-b border-gray-100 dark:border-gray-800 transition-colors cursor-pointer ${
            isSelected
              ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 !border-l-blue-500'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-l-transparent'
          }`}
          onClick={() => setSelectedAccount(node)}
        >
          {/* Tree indent */}
          <div className="flex items-center shrink-0" style={{ width: `${node.depth * 28 + 28}px` }}>
            {Array.from({ length: node.depth }).map((_, i) => (
              <div key={i} className="w-7 flex justify-center shrink-0">
                {ancestorLines[i] && (
                  <div className="w-px h-full bg-gray-200 dark:bg-gray-700" />
                )}
              </div>
            ))}

            <div className="w-7 flex justify-center shrink-0">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(node.id);
                  }}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              ) : (
                <div className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* Icon */}
          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${config.bgColor}`}>
            {hasChildren ? (
              isExpanded ? (
                <FolderOpenIcon className={`w-4 h-4 ${config.color}`} />
              ) : (
                <FolderIcon className={`w-4 h-4 ${config.color}`} />
              )
            ) : (
              <IconComp className={`w-4 h-4 ${config.color}`} />
            )}
          </div>

          {/* Code */}
          <span
            className={`shrink-0 font-mono text-sm px-2 py-0.5 rounded mr-3 ${
              node.depth === 0
                ? `font-bold ${config.bgColor} ${config.color}`
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {node.code}
          </span>

          {/* Name */}
          <div className="flex-1 min-w-0 mr-3">
            <span
              className={`block truncate ${
                node.depth === 0
                  ? 'font-bold text-gray-900 dark:text-gray-100 text-base'
                  : node.is_header
                  ? 'font-semibold text-gray-800 dark:text-gray-200'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {getAccountDisplayName(node)}
            </span>
          </div>

          {/* Type badge */}
          <span
            className={`shrink-0 hidden lg:inline-flex text-xs px-2 py-0.5 rounded-full mr-3 font-medium ${config.bgColor} ${config.color}`}
          >
            {getTypeName(node)}
          </span>

          {/* Balance */}
          {!node.is_header && node.current_balance != null && (
            <span className="shrink-0 hidden md:block font-mono text-sm text-gray-600 dark:text-gray-400 mr-3 w-28 text-right">
              {formatBalance(node.current_balance, node.currency_code)}
            </span>
          )}

          {/* Status indicators */}
          <div className="shrink-0 flex items-center gap-1.5 mr-3">
            {!node.is_active && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 rounded">
                {isArabic ? 'معطل' : 'Off'}
              </span>
            )}
            {node.is_frozen && (
              <LockClosedIcon className="w-3.5 h-3.5 text-orange-500" title={isArabic ? 'مجمد' : 'Frozen'} />
            )}
            {node.is_system && (
              <BuildingLibraryIcon className="w-3.5 h-3.5 text-indigo-500" title={isArabic ? 'نظامي' : 'System'} />
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {can(MenuPermissions.Accounting.Accounts.Create) && node.is_header && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openCreate(node);
                }}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                title={isArabic ? 'إضافة حساب فرعي' : 'Add sub-account'}
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            )}
            {can(MenuPermissions.Accounting.Accounts.Edit) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(node);
                }}
                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                title={isArabic ? 'تعديل' : 'Edit'}
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
            {can(MenuPermissions.Accounting.Accounts.Delete) && node.can_delete && !node.is_system && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(node);
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title={isArabic ? 'حذف' : 'Delete'}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren &&
          isExpanded &&
          node.children.map((child, idx) =>
            renderTreeNode(child, idx === node.children.length - 1, [
              ...ancestorLines,
              idx < node.children.length - 1,
            ])
          )}
      </React.Fragment>
    );
  };

  /* ─── Render ─── */
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                {isArabic ? 'دليل الحسابات' : 'Chart of Accounts'}
              </h1>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                {isArabic
                  ? 'إدارة وتنظيم الهيكل المحاسبي للشركة'
                  : 'Manage your company accounting structure'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={accounts.length === 0}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-1.5" />
                {isArabic ? 'تصدير' : 'Export'}
              </button>
              {can(MenuPermissions.Accounting.Accounts.Create) && (
                <button
                  onClick={() => openCreate()}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-1.5" />
                  {isArabic ? 'حساب جديد' : 'New Account'}
                </button>
              )}
            </div>
          </div>

          {/* ── Statistics Cards ── */}
          {!loading && accounts.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isArabic ? 'إجمالي الحسابات' : 'Total Accounts'}
                </div>
              </div>

              {/* By classification */}
              {Object.entries(CLASSIFICATION_CONFIG).map(([cls, cfg]) => {
                const count = stats.byClass[cls] || 0;
                if (count === 0) return null;
                const Icon = cfg.icon;
                return (
                  <div
                    key={cls}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${cfg.lightBg} ${cfg.borderColor} ${
                      filters.classification === cls ? 'ring-2 ring-blue-500 shadow-sm' : ''
                    }`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        classification: prev.classification === cls ? '' : cls,
                      }))
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className={`text-2xl font-bold ${cfg.color}`}>{count}</div>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className={`text-xs mt-1 ${cfg.color} font-medium`}>
                      {getClassificationLabel(cls)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Search & Filters ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={isArabic ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Classification filter */}
              <select
                value={filters.classification}
                onChange={(e) => setFilters((prev) => ({ ...prev, classification: e.target.value }))}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
              >
                <option value="">{isArabic ? 'كل التصنيفات' : 'All Classifications'}</option>
                {Object.keys(CLASSIFICATION_CONFIG).map((cls) => (
                  <option key={cls} value={cls}>
                    {getClassificationLabel(cls)}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filters.is_active}
                onChange={(e) => setFilters((prev) => ({ ...prev, is_active: e.target.value }))}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
              >
                <option value="">{isArabic ? 'كل الحالات' : 'All Status'}</option>
                <option value="true">{isArabic ? 'نشط' : 'Active'}</option>
                <option value="false">{isArabic ? 'غير نشط' : 'Inactive'}</option>
              </select>

              {/* Expand/Collapse */}
              <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-3">
                <button
                  onClick={expandAll}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={isArabic ? 'توسيع الكل' : 'Expand All'}
                >
                  <ArrowsPointingOutIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={collapseAll}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={isArabic ? 'طي الكل' : 'Collapse All'}
                >
                  <ArrowsPointingInIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Main Content: Tree + Detail Panel ── */}
          <div className="flex gap-6">
            {/* Tree */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Tree header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {isArabic ? 'هيكل الحسابات' : 'Account Structure'}
                  </h2>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {accounts.length} {isArabic ? 'حساب' : 'accounts'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="hidden md:inline">
                    <FolderIcon className="w-3.5 h-3.5 inline mr-1" />
                    {stats.headers} {isArabic ? 'تجميعي' : 'headers'}
                  </span>
                  <span className="hidden md:inline">
                    <DocumentTextIcon className="w-3.5 h-3.5 inline mr-1" />
                    {stats.posting} {isArabic ? 'ترحيل' : 'posting'}
                  </span>
                </div>
              </div>

              {/* Tree body */}
              <div className="min-h-[400px] max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div
                          className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"
                          style={{ marginLeft: `${(i % 4) * 28}px` }}
                        />
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="flex-1 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : filteredTree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <BanknotesIcon className="w-12 h-12 mb-3" />
                    <p className="text-sm font-medium">
                      {filters.search || filters.classification || filters.is_active
                        ? isArabic ? 'لا توجد نتائج مطابقة' : 'No matching accounts'
                        : isArabic ? 'لا توجد حسابات' : 'No accounts yet'}
                    </p>
                    {!filters.search && !filters.classification && !filters.is_active && (
                      <p className="text-xs mt-1">
                        {isArabic ? 'أنشئ حسابك الأول للبدء' : 'Create your first account to get started'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    {filteredTree.map((node, idx) =>
                      renderTreeNode(node, idx === filteredTree.length - 1, [])
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Detail Side Panel */}
            {selectedAccount && (
              <div className="hidden xl:block w-80 shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 sticky top-4">
                  {/* Detail header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`font-mono text-sm font-bold px-2 py-1 rounded ${
                          getClassificationConfig(classificationForAccount(selectedAccount)).bgColor
                        } ${getClassificationConfig(classificationForAccount(selectedAccount)).color}`}
                      >
                        {selectedAccount.code}
                      </span>
                      <button
                        onClick={() => setSelectedAccount(null)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {getAccountDisplayName(selectedAccount)}
                    </h3>
                    {selectedAccount.name_ar && !isArabic && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5" dir="rtl">
                        {selectedAccount.name_ar}
                      </p>
                    )}
                    {selectedAccount.name && isArabic && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {selectedAccount.name}
                      </p>
                    )}
                  </div>

                  {/* Detail body */}
                  <div className="p-4 space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">{isArabic ? 'النوع' : 'Type'}</div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {getTypeName(selectedAccount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">{isArabic ? 'التصنيف' : 'Classification'}</div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {getClassificationLabel(classificationForAccount(selectedAccount))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">{isArabic ? 'المستوى' : 'Level'}</div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {getLevelName(selectedAccount.level)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">{isArabic ? 'الطبيعة' : 'Nature'}</div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {(() => {
                            const at = selectedAccount.account_type_id
                              ? accountTypeMap.get(selectedAccount.account_type_id)
                              : undefined;
                            if (!at) return '-';
                            return at.nature === 'debit'
                              ? isArabic ? 'مدين' : 'Debit'
                              : isArabic ? 'دائن' : 'Credit';
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Balance */}
                    {selectedAccount.current_balance != null && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">{isArabic ? 'الرصيد الحالي' : 'Current Balance'}</div>
                        <div className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                          {formatBalance(selectedAccount.current_balance, selectedAccount.currency_code)}
                        </div>
                      </div>
                    )}

                    {/* Parent */}
                    {selectedAccount.parent_name && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">{isArabic ? 'الحساب الأب' : 'Parent'}</div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {selectedAccount.parent_name}
                        </div>
                      </div>
                    )}

                    {/* Flags */}
                    <div className="flex flex-wrap gap-2">
                      {selectedAccount.is_header && (
                        <span className="px-2 py-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                          {isArabic ? 'تجميعي' : 'Header'}
                        </span>
                      )}
                      {selectedAccount.is_active ? (
                        <span className="px-2 py-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                          {isArabic ? 'نشط' : 'Active'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg">
                          {isArabic ? 'غير نشط' : 'Inactive'}
                        </span>
                      )}
                      {selectedAccount.is_frozen && (
                        <span className="px-2 py-1 text-xs bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                          {isArabic ? 'مجمد' : 'Frozen'}
                        </span>
                      )}
                      {selectedAccount.is_system && (
                        <span className="px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                          {isArabic ? 'نظامي' : 'System'}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                      {can(MenuPermissions.Accounting.Accounts.Edit) && (
                        <button
                          onClick={() => openEdit(selectedAccount)}
                          className="flex-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <PencilIcon className="w-4 h-4" />
                          {isArabic ? 'تعديل' : 'Edit'}
                        </button>
                      )}
                      {can(MenuPermissions.Accounting.Accounts.Delete) &&
                        selectedAccount.can_delete &&
                        !selectedAccount.is_system && (
                          <button
                            onClick={() => handleDelete(selectedAccount)}
                            className="px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Create/Edit Modal ── */}
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={
            editingAccount
              ? isArabic ? 'تعديل الحساب' : 'Edit Account'
              : isArabic ? 'حساب جديد' : 'New Account'
          }
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} disabled={saving}>
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editingAccount
                  ? isArabic ? 'تحديث' : 'Update'
                  : isArabic ? 'إنشاء' : 'Create'}
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            {/* Code + Type row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={isArabic ? 'كود الحساب' : 'Account Code'}
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                error={formErrors.code}
                placeholder={isArabic ? 'مثال: 1100' : 'e.g. 1100'}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {isArabic ? 'نوع الحساب' : 'Account Type'}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={formData.account_type_id}
                  onChange={(e) => setFormData((p) => ({ ...p, account_type_id: e.target.value }))}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    formErrors.account_type_id
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none`}
                >
                  <option value="">{isArabic ? 'اختر النوع...' : 'Select type...'}</option>
                  {Object.entries(groupedTypes).map(([cls, types]) => (
                    <optgroup key={cls} label={getClassificationLabel(cls)}>
                      {types.map((at) => (
                        <option key={at.id} value={String(at.id)}>
                          {isArabic ? (at.name_ar || at.name) : at.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {formErrors.account_type_id && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {formErrors.account_type_id}
                  </p>
                )}
              </div>
            </div>

            {/* Name EN + AR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={isArabic ? 'الاسم (إنجليزي)' : 'Name (English)'}
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                error={formErrors.name}
                required
              />
              <Input
                label={isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}
                value={formData.name_ar}
                onChange={(e) => setFormData((p) => ({ ...p, name_ar: e.target.value }))}
                dir="rtl"
              />
            </div>

            {/* Parent account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {isArabic ? 'الحساب الأب' : 'Parent Account'}
              </label>
              <select
                value={formData.parent_id}
                onChange={(e) => setFormData((p) => ({ ...p, parent_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">{isArabic ? 'بدون (حساب رئيسي)' : 'None (root account)'}</option>
                {accounts
                  .filter((a) => a.is_header && a.id !== editingAccount?.id)
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {'\u00A0\u00A0'.repeat(Math.max(0, a.level - 1))}
                      {a.code} – {getAccountDisplayName(a)}
                    </option>
                  ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {isArabic ? 'الوصف' : 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder={isArabic ? 'وصف الحساب (اختياري)' : 'Account description (optional)'}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-6 pt-3 border-t border-gray-200 dark:border-gray-700">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_header}
                  onChange={(e) => setFormData((p) => ({ ...p, is_header: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <FolderIcon className="w-4 h-4 text-gray-400" />
                {isArabic ? 'حساب تجميعي (Header)' : 'Header Account'}
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                {isArabic ? 'نشط' : 'Active'}
              </label>
            </div>
          </div>
        </Modal>
      </MainLayout>
    </AuthGuard>
  );
}

export default withPermission(MenuPermissions.Accounting.Accounts.View, AccountsPage);
