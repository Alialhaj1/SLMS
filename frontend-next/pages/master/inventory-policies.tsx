/**
 * 📋 INVENTORY POLICIES PAGE
 * ==========================
 * 
 * Configure inventory valuation methods and policies
 * 
 * Features:
 * ✅ Valuation methods (FIFO/LIFO/Weighted Average/Standard Cost)
 * ✅ Reorder settings
 * ✅ Stock alerts configuration
 * ✅ Policy rules (JSONB)
 * ✅ RBAC permissions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable, { TableColumn } from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  PlusIcon,
  FunnelIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface InventoryPolicy {
  id: number;
  policy_code: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  valuation_method: 'FIFO' | 'LIFO' | 'Weighted Average' | 'Standard Cost';
  allow_negative_stock: boolean;
  auto_reorder: boolean;
  min_stock_alert: boolean;
  expiry_alert_days: number;
  is_active: boolean;
}

interface FormData {
  policy_code: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  valuation_method: string;
  allow_negative_stock: boolean;
  auto_reorder: boolean;
  min_stock_alert: boolean;
  expiry_alert_days: string;
  is_active: boolean;
}

const VALUATION_METHODS = ['FIFO', 'LIFO', 'Weighted Average', 'Standard Cost'];

export default function InventoryPoliciesPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();

  // Permissions
  const canView = hasPermission('inventory_policies:view');
  const canCreate = hasPermission('inventory_policies:create');
  const canEdit = hasPermission('inventory_policies:edit');
  const canDelete = hasPermission('inventory_policies:delete');

  useEffect(() => {
    if (!canView) {
      router.push('/dashboard');
    }
  }, [canView, router]);

  const {
    data,
    loading,
    pagination,
    fetchList,
    create,
    update,
    remove,
  } = useMasterData<InventoryPolicy>({
    endpoint: '/api/inventory-policies',
    pageSize: 10,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryPolicy | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryPolicy | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    valuation_method: '',
    is_active: '',
  });

  const [formData, setFormData] = useState<FormData>({
    policy_code: '',
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    valuation_method: 'FIFO',
    allow_negative_stock: false,
    auto_reorder: false,
    min_stock_alert: true,
    expiry_alert_days: '30',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (canView) {
      fetchList({ filters });
    }
  }, [canView, filters, fetchList]);

  const columns: TableColumn<InventoryPolicy>[] = [
    {
      key: 'policy_code',
      label: locale === 'ar' ? 'الرمز' : 'Code',
      sortable: true,
      render: (value) => <span className="font-mono font-medium">{value}</span>,
    },
    {
      key: 'name',
      label: locale === 'ar' ? 'الاسم' : 'Name',
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-medium">{locale === 'ar' ? row.name_ar : row.name_en}</div>
          {row.description_en && (
            <div className="text-xs text-gray-500 mt-1">
              {locale === 'ar' ? row.description_ar : row.description_en}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'valuation_method',
      label: locale === 'ar' ? 'طريقة التقييم' : 'Valuation Method',
      sortable: true,
      render: (value) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {value}
        </span>
      ),
    },
    {
      key: 'settings',
      label: locale === 'ar' ? 'الإعدادات' : 'Settings',
      hideOnMobile: true,
      render: (_, row) => (
        <div className="text-xs space-y-1">
          {row.allow_negative_stock && (
            <div className="text-yellow-600 dark:text-yellow-400">
              {locale === 'ar' ? '✓ مخزون سالب' : '✓ Negative stock'}
            </div>
          )}
          {row.auto_reorder && (
            <div className="text-green-600 dark:text-green-400">
              {locale === 'ar' ? '✓ طلب تلقائي' : '✓ Auto reorder'}
            </div>
          )}
          {row.min_stock_alert && (
            <div className="text-blue-600 dark:text-blue-400">
              {locale === 'ar' ? '✓ تنبيه مخزون' : '✓ Stock alert'}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'expiry_alert_days',
      label: locale === 'ar' ? 'تنبيه الانتهاء' : 'Expiry Alert',
      hideOnMobile: true,
      render: (value) => (
        <span className="text-sm">
          {value} {locale === 'ar' ? 'يوم' : 'days'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: locale === 'ar' ? 'الحالة' : 'Status',
      render: (value) => (
        <span
          className={clsx(
            'px-2 py-1 text-xs font-medium rounded-full',
            value
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
          )}
        >
          {value ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
        </span>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      policy_code: '',
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      valuation_method: 'FIFO',
      allow_negative_stock: false,
      auto_reorder: false,
      min_stock_alert: true,
      expiry_alert_days: '30',
      is_active: true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (!item) return;
    setEditingItem(item);
    setFormData({
      policy_code: item.policy_code,
      name_en: item.name_en,
      name_ar: item.name_ar,
      description_en: item.description_en || '',
      description_ar: item.description_ar || '',
      valuation_method: item.valuation_method,
      allow_negative_stock: item.allow_negative_stock,
      auto_reorder: item.auto_reorder,
      min_stock_alert: item.min_stock_alert,
      expiry_alert_days: String(item.expiry_alert_days),
      is_active: item.is_active,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    const item = data.find(d => d.id === id);
    if (!item) return;
    setDeletingItem(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    const success = await remove(deletingItem.id);
    if (success) {
      setShowDeleteConfirm(false);
      setDeletingItem(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.policy_code.trim()) {
      errors.policy_code = locale === 'ar' ? 'الرمز مطلوب' : 'Code is required';
    }

    if (!formData.name_en.trim()) {
      errors.name_en = locale === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';
    }

    if (!formData.name_ar.trim()) {
      errors.name_ar = locale === 'ar' ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    }

    const alertDays = parseInt(formData.expiry_alert_days);
    if (isNaN(alertDays) || alertDays < 0 || alertDays > 365) {
      errors.expiry_alert_days = locale === 'ar' ? 'يجب أن يكون بين 0 و 365' : 'Must be between 0 and 365';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload: Partial<InventoryPolicy> = {
      policy_code: formData.policy_code.trim(),
      name_en: formData.name_en.trim(),
      name_ar: formData.name_ar.trim(),
      description_en: formData.description_en.trim() || undefined,
      description_ar: formData.description_ar.trim() || undefined,
      valuation_method: formData.valuation_method as InventoryPolicy['valuation_method'],
      allow_negative_stock: formData.allow_negative_stock,
      auto_reorder: formData.auto_reorder,
      min_stock_alert: formData.min_stock_alert,
      expiry_alert_days: parseInt(formData.expiry_alert_days),
      is_active: formData.is_active,
    };

    let success;
    if (editingItem) {
      success = await update(editingItem.id, payload);
    } else {
      success = await create(payload);
    }

    if (success) {
      setShowModal(false);
      setEditingItem(null);
    }
  };

  if (!canView) {
    return null;
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'سياسات المخزون - SLMS' : 'Inventory Policies - SLMS'}</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {locale === 'ar' ? 'سياسات المخزون' : 'Inventory Policies'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'إدارة طرق التقييم والسياسات' : 'Manage valuation methods and policies'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
              <FunnelIcon className="w-5 h-5 me-2" />
              {locale === 'ar' ? 'فلترة' : 'Filters'}
            </Button>
            {canCreate && (
              <Button variant="primary" onClick={handleCreate}>
                <PlusIcon className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'إضافة سياسة' : 'Add Policy'}
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label={locale === 'ar' ? 'بحث' : 'Search'}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
              />
              <div>
                <label className="block text-sm font-medium mb-1">
                  {locale === 'ar' ? 'طريقة التقييم' : 'Valuation Method'}
                </label>
                <select
                  value={filters.valuation_method}
                  onChange={(e) => setFilters({ ...filters, valuation_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  {VALUATION_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {locale === 'ar' ? 'الحالة' : 'Status'}
                </label>
                <select
                  value={filters.is_active}
                  onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="true">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                  <option value="false">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <MasterDataTable
            columns={columns}
            data={data}
            loading={loading}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            canEdit={canEdit}
            canDelete={canDelete}
            pagination={{
              ...pagination,
              onPageChange: (page) => fetchList({ filters, page }),
            }}
            emptyMessage={locale === 'ar' ? 'لا توجد سياسات' : 'No policies found'}
          />
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? (locale === 'ar' ? 'تعديل السياسة' : 'Edit Policy') : (locale === 'ar' ? 'إضافة سياسة' : 'Add Policy')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'الرمز' : 'Code'}
              value={formData.policy_code}
              onChange={(e) => setFormData({ ...formData, policy_code: e.target.value })}
              error={formErrors.policy_code}
              required
            />
            <div>
              <label className="block text-sm font-medium mb-1">
                {locale === 'ar' ? 'طريقة التقييم' : 'Valuation Method'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.valuation_method}
                onChange={(e) => setFormData({ ...formData, valuation_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                {VALUATION_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            <Input
              label={locale === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              error={formErrors.name_en}
              required
            />
            <Input
              label={locale === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              error={formErrors.name_ar}
              required
              dir="rtl"
            />
            <Input
              label={locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
              value={formData.description_en}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
            />
            <Input
              label={locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              dir="rtl"
            />
            <Input
              label={locale === 'ar' ? 'تنبيه الانتهاء (أيام)' : 'Expiry Alert (days)'}
              type="number"
              value={formData.expiry_alert_days}
              onChange={(e) => setFormData({ ...formData, expiry_alert_days: e.target.value })}
              error={formErrors.expiry_alert_days}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allow_negative_stock}
                onChange={(e) => setFormData({ ...formData, allow_negative_stock: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">{locale === 'ar' ? 'السماح بمخزون سالب' : 'Allow negative stock'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_reorder}
                onChange={(e) => setFormData({ ...formData, auto_reorder: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">{locale === 'ar' ? 'طلب تلقائي' : 'Auto reorder'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.min_stock_alert}
                onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">{locale === 'ar' ? 'تنبيه الحد الأدنى' : 'Min stock alert'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">{locale === 'ar' ? 'نشط' : 'Active'}</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {editingItem ? (locale === 'ar' ? 'تحديث' : 'Update') : (locale === 'ar' ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={locale === 'ar' ? 'حذف السياسة' : 'Delete Policy'}
        message={locale === 'ar' ? `هل أنت متأكد من حذف السياسة "${deletingItem?.policy_code}"؟` : `Are you sure you want to delete policy "${deletingItem?.policy_code}"?`}
        variant="danger"
        loading={loading}
      />
    </MainLayout>
  );
}
