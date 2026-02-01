/**
 * 📒 CHART OF ACCOUNTS PAGE
 * =====================================================
 * Manage company's chart of accounts with hierarchy
 * 
 * 🔒 Route Protection: master:accounts:view
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
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

interface Account {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  account_type_name: string;
  account_type_id?: number;
  parent_id?: number;
  parent_name?: string;
  level: number;
  is_header: boolean;
  is_active: boolean;
  can_delete?: boolean;
  current_balance?: number;
  balance?: number;
  currency_code?: string;
}

interface AccountType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  nature: 'debit' | 'credit';
  classification: string;
}

function AccountsPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { can } = usePermissions();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  const [filters, setFilters] = useState({
    search: '',
    account_type_id: '',
    is_active: 'true',
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
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
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const accountTypeById = React.useMemo(() => {
    return new Map(accountTypes.map((t) => [t.id, t] as const));
  }, [accountTypes]);

  const formatLevelLabel = (level?: number) => {
    const l = Number(level);
    if (!Number.isFinite(l) || l <= 0) return '-';
    if (locale === 'ar') {
      if (l === 1) return 'رئيسي';
      if (l === 2) return 'فرعي';
      return `${'فرع من '.repeat(Math.max(0, l - 2))}الفرعي`;
    }
    if (l === 1) return 'Main';
    if (l === 2) return 'Sub';
    return `${'Sub of '.repeat(Math.max(0, l - 2))}Sub`;
  };

  const buildAccountsQuery = (page: number, limit: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));

    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.account_type_id) params.set('account_type_id', filters.account_type_id);
    if (filters.is_active) params.set('is_active', filters.is_active);

    // Keep balance column meaningful if backend supports it
    params.set('with_balance', 'true');

    return `/api/accounts?${params.toString()}`;
  };

  const fetchAllAccounts = async () => {
    const limit = 100; // backend hard cap
    let page = 1;
    const all: Account[] = [];

    while (true) {
      const res: any = await apiClient.get(buildAccountsQuery(page, limit));
      const data: Account[] = res?.data ?? [];
      const meta = res?.meta;
      all.push(...data);

      const totalPages = Number(meta?.totalPages);
      if (!Number.isFinite(totalPages) || page >= totalPages) break;
      page += 1;
    }

    return all;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsRes, typesRes] = await Promise.all([
        fetchAllAccounts(),
        apiClient.get('/api/accounts/types'),
      ]);

      setAccounts(Array.isArray(accountsRes) ? accountsRes : []);

      // apiClient returns { success, data } shape
      setAccountTypes(typesRes?.data ?? []);

      // Expand top levels by default for better “tree” visibility
      setExpandedAccounts((prev) => {
        if (prev.size > 0) return prev;
        const initial = new Set<number>();
        (Array.isArray(accountsRes) ? accountsRes : []).forEach((a: Account) => {
          if (a.is_header && a.level <= 2) initial.add(a.id);
        });
        return initial;
      });
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountId: number) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const handleDelete = async (account: Account) => {
    if (!confirm(t('common.confirmDelete'))) return;

    try {
      await apiClient.delete(`/api/accounts/${account.id}`);
      showToast(t('common.deleteSuccess'), 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || t('common.error'), 'error');
    }
  };

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
    });
  };

  const openCreate = () => {
    setEditingAccount(null);
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (account: Account) => {
    setShowCreateModal(false);
    setEditingAccount(account);

    const inferredTypeId =
      account.account_type_id ??
      accountTypes.find((t) => t.name === account.account_type_name)?.id;

    setFormErrors({});
    setFormData({
      code: account.code || '',
      name: account.name || '',
      name_ar: account.name_ar || '',
      account_type_id: inferredTypeId ? String(inferredTypeId) : '',
      parent_id: account.parent_id ? String(account.parent_id) : '',
      is_header: !!account.is_header,
      is_active: !!account.is_active,
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingAccount(null);
    setSaving(false);
    setFormErrors({});
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      nextErrors.code = locale === 'ar' ? 'الكود مطلوب' : 'Code is required';
    }
    if (!formData.name.trim()) {
      nextErrors.name = locale === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    }
    if (!formData.account_type_id) {
      nextErrors.account_type_id = locale === 'ar' ? 'نوع الحساب مطلوب' : 'Account type is required';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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
      };

      if (editingAccount) {
        await apiClient.put(`/api/accounts/${editingAccount.id}`, payload);
        showToast(locale === 'ar' ? 'تم تحديث الحساب بنجاح' : 'Account updated successfully', 'success');
      } else {
        await apiClient.post('/api/accounts', payload);
        showToast(locale === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully', 'success');
      }

      closeModal();
      loadData();
    } catch (error: any) {
      showToast(error?.message || (locale === 'ar' ? 'فشل الحفظ' : 'Save failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const buildAccountTree = (list: Account[]): Account[] => {
    // Build a stable, parent->children ordered list so parents always appear before children
    const byParent = new Map<number | null, Account[]>();
    for (const acc of list) {
      const key = acc.parent_id ?? null;
      const bucket = byParent.get(key) ?? [];
      bucket.push(acc);
      byParent.set(key, bucket);
    }

    for (const bucket of byParent.values()) {
      bucket.sort((a, b) => a.code.localeCompare(b.code));
    }

    const ordered: Account[] = [];
    const visited = new Set<number>();

    const walk = (parentId: number | null) => {
      const children = byParent.get(parentId) ?? [];
      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        ordered.push(child);
        walk(child.id);
      }
    };

    walk(null);

    // Append any orphaned nodes (shouldn't happen, but keeps UI resilient)
    for (const acc of list) {
      if (!visited.has(acc.id)) ordered.push(acc);
    }

    return ordered;
  };

  const formatBalance = (balance?: number, currencyCode?: string) => {
    if (balance === undefined || balance === null) return '-';
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(balance));
    return `${balance < 0 ? '-' : ''}${formatted} ${currencyCode || ''}`;
  };

  const renderAccountRow = (account: Account, index: number) => {
    const hasChildren = accounts.some(a => a.parent_id === account.id);
    const isExpanded = expandedAccounts.has(account.id);
    const indent = (account.level - 1) * 24;
    const typeInfo = account.account_type_id ? accountTypeById.get(account.account_type_id) : undefined;
    const typeName =
      locale === 'ar'
        ? (typeInfo?.name_ar || typeInfo?.name || account.account_type_name)
        : (typeInfo?.name || account.account_type_name);

    return (
      <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(account.id)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded mr-2"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6 mr-2" />
            )}
            <span className={`font-mono ${account.is_header ? 'font-bold' : ''}`}>
              {account.code}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className={account.is_header ? 'font-semibold' : ''}>
            {locale === 'ar' && account.name_ar ? account.name_ar : account.name}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          {typeName}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          {formatLevelLabel(account.level)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right font-mono">
          {!account.is_header &&
            formatBalance(
              account.current_balance ?? account.balance,
              account.currency_code
            )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              account.is_active
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {account.is_active ? t('common.active') : t('common.inactive')}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          {can(MenuPermissions.Accounting.Accounts.Edit) && (
            <button
              onClick={() => openEdit(account)}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
            >
              <PencilIcon className="w-4 h-4 inline" />
            </button>
          )}
          {can(MenuPermissions.Accounting.Accounts.Delete) && account.can_delete && (
            <button
              onClick={() => handleDelete(account)}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              <TrashIcon className="w-4 h-4 inline" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  const displayedAccounts = buildAccountTree(accounts).filter(account => {
    // If account has parent, only show if parent is expanded
    if (account.parent_id) {
      return expandedAccounts.has(account.parent_id);
    }
    return true;
  });

  return (
    <AuthGuard>
      <MainLayout>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('accounting.accounts.title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('accounting.accounts.subtitle')}
              </p>
            </div>

            {can(MenuPermissions.Accounting.Accounts.Create) && (
              <button
                onClick={openCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                {t('common.create')}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm"
              />
            </div>

            {/* Account Type Filter */}
            <select
              value={filters.account_type_id}
              onChange={e => setFilters(prev => ({ ...prev, account_type_id: e.target.value }))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm"
            >
              <option value="">{t('common.allTypes')}</option>
              {accountTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {locale === 'ar' ? (type.name_ar || type.name) : type.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.is_active}
              onChange={e => setFilters(prev => ({ ...prev, is_active: e.target.value }))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm"
            >
              <option value="">{t('common.allStatus')}</option>
              <option value="true">{t('common.active')}</option>
              <option value="false">{t('common.inactive')}</option>
            </select>

            {/* Export Button */}
            <button
              onClick={() => {
                showToast(
                  locale === 'ar'
                    ? 'التصدير غير متاح في النسخة التجريبية'
                    : 'Export is not available in the demo',
                  'info'
                );
              }}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              {t('common.export')}
            </button>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {t('common.loading')}...
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {t('common.noData')}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('accounting.accounts.code')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('accounting.accounts.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('accounting.accounts.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'المستوى' : 'Level'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('accounting.accounts.balance')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('common.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayedAccounts.map((account, index) => renderAccountRow(account, index))}
              </tbody>
            </table>
          )}
        </div>

        <Modal
          isOpen={showCreateModal || !!editingAccount}
          onClose={closeModal}
          title={
            editingAccount
              ? (locale === 'ar' ? 'تعديل حساب' : 'Edit Account')
              : (locale === 'ar' ? 'إضافة حساب' : 'Create Account')
          }
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {locale === 'ar' ? 'حفظ' : 'Save'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'الكود' : 'Code'}
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                error={formErrors.code}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'نوع الحساب' : 'Account Type'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={formData.account_type_id}
                  onChange={(e) => setFormData((p) => ({ ...p, account_type_id: e.target.value }))}
                  className={`input ${formErrors.account_type_id ? 'input-error' : ''}`}
                >
                  <option value="">{locale === 'ar' ? 'اختر...' : 'Select...'}</option>
                  {accountTypes.map((type) => (
                    <option key={type.id} value={String(type.id)}>
                      {locale === 'ar' ? (type.name_ar || type.name) : type.name}
                    </option>
                  ))}
                </select>
                {formErrors.account_type_id && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.account_type_id}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'}
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                error={formErrors.name}
                required
              />
              <Input
                label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'}
                value={formData.name_ar}
                onChange={(e) => setFormData((p) => ({ ...p, name_ar: e.target.value }))}
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الحساب الأب (اختياري)' : 'Parent Account (optional)'}
              </label>
              <select
                value={formData.parent_id}
                onChange={(e) => setFormData((p) => ({ ...p, parent_id: e.target.value }))}
                className="input"
              >
                <option value="">{locale === 'ar' ? 'بدون' : 'None'}</option>
                {accounts
                  .filter((a) => a.is_header)
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.code} - {locale === 'ar' && a.name_ar ? a.name_ar : a.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.is_header}
                  onChange={(e) => setFormData((p) => ({ ...p, is_header: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                {locale === 'ar' ? 'حساب تجميعي (Header)' : 'Header account'}
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                {locale === 'ar' ? 'نشط' : 'Active'}
              </label>
            </div>
          </div>
        </Modal>
      </MainLayout>
    </AuthGuard>
  );
}

export default withPermission(MenuPermissions.Accounting.Accounts.View, AccountsPage);
