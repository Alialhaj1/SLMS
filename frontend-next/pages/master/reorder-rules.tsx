import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import MasterDataTable, { TableColumn } from '@/components/common/MasterDataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ItemSelector from '@/components/common/ItemSelector';
import WarehouseSelector from '@/components/common/WarehouseSelector';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useMasterData } from '@/hooks/useMasterData';
import { 
  AdjustmentsHorizontalIcon, 
  PlusIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface ReorderRule {
  id: number;
  rule_code: string;
  item_id: number;
  warehouse_id: number;
  min_quantity: number;
  max_quantity: number;
  reorder_quantity: number;
  lead_time_days: number;
  safety_stock: number;
  preferred_supplier_id: number | null;
  auto_generate_po: boolean;
  is_active: boolean;
  current_stock?: number;
  item?: {
    item_code: string;
    name_en: string;
    name_ar: string;
  };
  warehouse?: {
    warehouse_code: string;
    name_en: string;
    name_ar: string;
  };
  supplier?: {
    supplier_code: string;
    name_en: string;
  };
}

interface FormData {
  rule_code: string;
  item_id: number | null;
  warehouse_id: number | null;
  min_quantity: number;
  max_quantity: number;
  reorder_quantity: number;
  lead_time_days: number;
  safety_stock: number;
  preferred_supplier_id: number | null;
  auto_generate_po: boolean;
  is_active: boolean;
}

export default function ReorderRulesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  // Permissions
  const canView = hasPermission('reorder_rules:view');
  const canCreate = hasPermission('reorder_rules:create');
  const canEdit = hasPermission('reorder_rules:edit');
  const canDelete = hasPermission('reorder_rules:delete');

  // Master data hook
  const {
    data: rules,
    loading,
    pagination,
    fetchList,
    create,
    update,
    remove
  } = useMasterData<ReorderRule>({
    endpoint: '/api/reorder-rules',
    pageSize: 20
  });

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<ReorderRule | null>(null);
  const [deletingItem, setDeletingItem] = useState<ReorderRule | null>(null);

  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    item_id: null as number | null,
    warehouse_id: null as number | null,
    below_min: false,
    is_active: ''
  });

  // Form State
  const [formData, setFormData] = useState<FormData>({
    rule_code: '',
    item_id: null,
    warehouse_id: null,
    min_quantity: 0,
    max_quantity: 0,
    reorder_quantity: 0,
    lead_time_days: 7,
    safety_stock: 0,
    preferred_supplier_id: null,
    auto_generate_po: false,
    is_active: true
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch data on mount and filter changes
  useEffect(() => {
    if (canView) {
      const params: any = { page: 1 };
      if (filters.search) params.search = filters.search;
      if (filters.item_id) params.item_id = filters.item_id;
      if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;
      if (filters.below_min) params.below_min = 'true';
      if (filters.is_active) params.is_active = filters.is_active;
      
      fetchList(params);
    }
  }, [canView, filters]);

  // Table columns
  const columns: TableColumn<ReorderRule>[] = [
    {
      key: 'rule_code',
      label: isArabic ? 'رمز القاعدة' : 'Rule Code',
      sortable: true,
      render: (value) => (
        <span className="font-mono font-medium text-gray-900 dark:text-white">
          {value}
        </span>
      )
    },
    {
      key: 'item',
      label: isArabic ? 'الصنف' : 'Item',
      sortable: false,
      render: (_, row) => (
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {row.item?.item_code}
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {isArabic ? row.item?.name_ar : row.item?.name_en}
          </div>
        </div>
      )
    },
    {
      key: 'warehouse',
      label: isArabic ? 'المستودع' : 'Warehouse',
      sortable: false,
      render: (_, row) => (
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.warehouse?.warehouse_code}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {isArabic ? row.warehouse?.name_ar : row.warehouse?.name_en}
          </div>
        </div>
      )
    },
    {
      key: 'quantities',
      label: isArabic ? 'الكميات' : 'Quantities',
      sortable: false,
      render: (_, row) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Min:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {row.min_quantity.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Max:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {row.max_quantity.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Reorder:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {row.reorder_quantity.toLocaleString()}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'current_stock',
      label: isArabic ? 'المخزون الحالي' : 'Current Stock',
      sortable: false,
      render: (value, row) => {
        const stock = value ?? 0;
        const isBelowMin = stock < row.min_quantity;
        
        return (
          <div className="flex items-center gap-2">
            {isBelowMin && (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            )}
            <span className={`text-sm font-bold ${
              isBelowMin 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-green-600 dark:text-green-400'
            }`}>
              {stock.toLocaleString()}
            </span>
          </div>
        );
      }
    },
    {
      key: 'lead_time_days',
      label: isArabic ? 'مدة التسليم' : 'Lead Time',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {value} {isArabic ? 'يوم' : 'days'}
        </span>
      )
    },
    {
      key: 'auto_generate_po',
      label: isArabic ? 'أمر شراء تلقائي' : 'Auto PO',
      sortable: false,
      render: (value) => (
        value ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : (
          <span className="text-gray-400">—</span>
        )
      )
    },
    {
      key: 'is_active',
      label: isArabic ? 'الحالة' : 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {value ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
        </span>
      )
    }
  ];

  // CRUD Handlers
  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      rule_code: '',
      item_id: null,
      warehouse_id: null,
      min_quantity: 0,
      max_quantity: 0,
      reorder_quantity: 0,
      lead_time_days: 7,
      safety_stock: 0,
      preferred_supplier_id: null,
      auto_generate_po: false,
      is_active: true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (rule: ReorderRule) => {
    setEditingItem(rule);
    setFormData({
      rule_code: rule.rule_code,
      item_id: rule.item_id,
      warehouse_id: rule.warehouse_id,
      min_quantity: rule.min_quantity,
      max_quantity: rule.max_quantity,
      reorder_quantity: rule.reorder_quantity,
      lead_time_days: rule.lead_time_days,
      safety_stock: rule.safety_stock,
      preferred_supplier_id: rule.preferred_supplier_id,
      auto_generate_po: rule.auto_generate_po,
      is_active: rule.is_active
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = (rule: ReorderRule) => {
    setDeletingItem(rule);
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

    if (!formData.rule_code?.trim()) {
      errors.rule_code = isArabic ? 'رمز القاعدة مطلوب' : 'Rule code is required';
    }

    if (!formData.item_id) {
      errors.item_id = isArabic ? 'الصنف مطلوب' : 'Item is required';
    }

    if (!formData.warehouse_id) {
      errors.warehouse_id = isArabic ? 'المستودع مطلوب' : 'Warehouse is required';
    }

    if (formData.min_quantity < 0) {
      errors.min_quantity = isArabic ? 'الكمية الدنيا يجب أن تكون موجبة' : 'Min quantity must be positive';
    }

    if (formData.max_quantity < formData.min_quantity) {
      errors.max_quantity = isArabic ? 'الكمية القصوى يجب أن تكون أكبر من الدنيا' : 'Max quantity must be >= min quantity';
    }

    if (formData.reorder_quantity <= 0) {
      errors.reorder_quantity = isArabic ? 'كمية إعادة الطلب يجب أن تكون موجبة' : 'Reorder quantity must be positive';
    }

    if (formData.reorder_quantity > (formData.max_quantity - formData.min_quantity)) {
      errors.reorder_quantity = isArabic 
        ? 'كمية إعادة الطلب تتجاوز الفرق بين الحد الأقصى والأدنى' 
        : 'Reorder quantity exceeds (max - min)';
    }

    if (formData.lead_time_days < 0 || formData.lead_time_days > 365) {
      errors.lead_time_days = isArabic ? 'مدة التسليم يجب أن تكون بين 0 و 365 يوم' : 'Lead time must be between 0 and 365 days';
    }

    if (formData.safety_stock < 0) {
      errors.safety_stock = isArabic ? 'المخزون الآمن يجب أن يكون موجباً' : 'Safety stock must be positive';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let success;
      if (editingItem) {
        success = await update(editingItem.id, formData);
      } else {
        success = await create(formData);
      }

      if (success) {
        setShowModal(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500 dark:text-gray-400">
            {isArabic ? 'ليس لديك صلاحية لعرض قواعد إعادة الطلب' : 'You do not have permission to view reorder rules'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'قواعد إعادة الطلب - SLMS' : 'Reorder Rules - SLMS'}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isArabic ? 'قواعد إعادة الطلب' : 'Reorder Rules'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isArabic ? 'إدارة قواعد إعادة الطلب التلقائي' : 'Manage automated reordering rules'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
              {isArabic ? 'تصفية' : 'Filters'}
            </Button>
            {canCreate && (
              <Button
                onClick={handleCreate}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                {isArabic ? 'قاعدة جديدة' : 'New Rule'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                label={isArabic ? 'بحث' : 'Search'}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder={isArabic ? 'بحث في رمز القاعدة...' : 'Search rule code...'}
              />
              
              <ItemSelector
                label={isArabic ? 'الصنف' : 'Item'}
                value={filters.item_id ? String(filters.item_id) : ''}
                onChange={(itemId) => setFilters({ ...filters, item_id: itemId ? Number(itemId) : null })}
              />
              
              <WarehouseSelector
                label={isArabic ? 'المستودع' : 'Warehouse'}
                value={filters.warehouse_id}
                onChange={(warehouseId) => setFilters({ ...filters, warehouse_id: warehouseId })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'أقل من الحد الأدنى' : 'Below Min Stock'}
                </label>
                <input
                  type="checkbox"
                  checked={filters.below_min}
                  onChange={(e) => setFilters({ ...filters, below_min: e.target.checked })}
                  className="h-5 w-5 mt-2 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'الحالة' : 'Status'}
                </label>
                <select
                  value={filters.is_active}
                  onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg 
                    bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{isArabic ? 'الكل' : 'All'}</option>
                  <option value="true">{isArabic ? 'نشط' : 'Active'}</option>
                  <option value="false">{isArabic ? 'غير نشط' : 'Inactive'}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <MasterDataTable
          columns={columns}
          data={rules}
          loading={loading}
          onEdit={
            canEdit
              ? (id) => {
                  const rule = rules.find((r) => r.id === id);
                  if (rule) handleEdit(rule);
                }
              : undefined
          }
          onDelete={
            canDelete
              ? (id) => {
                  const rule = rules.find((r) => r.id === id);
                  if (rule) handleDelete(rule);
                }
              : undefined
          }
          pagination={{
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            pageSize: pagination.pageSize,
            totalItems: pagination.totalItems,
            onPageChange: (page) => fetchList({ ...filters, page })
          }}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem 
          ? (isArabic ? 'تعديل قاعدة إعادة الطلب' : 'Edit Reorder Rule')
          : (isArabic ? 'قاعدة إعادة طلب جديدة' : 'New Reorder Rule')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={isArabic ? 'رمز القاعدة' : 'Rule Code'}
              value={formData.rule_code}
              onChange={(e) => setFormData({ ...formData, rule_code: e.target.value })}
              error={formErrors.rule_code}
              required
            />

            <ItemSelector
              label={isArabic ? 'الصنف' : 'Item'}
              value={formData.item_id ? String(formData.item_id) : ''}
              onChange={(itemId) => setFormData({ ...formData, item_id: itemId ? Number(itemId) : null })}
              error={formErrors.item_id}
              required
            />

            <WarehouseSelector
              label={isArabic ? 'المستودع' : 'Warehouse'}
              value={formData.warehouse_id}
              onChange={(warehouseId) => setFormData({ ...formData, warehouse_id: warehouseId })}
              error={formErrors.warehouse_id}
              required
            />

            <Input
              type="number"
              step="0.01"
              label={isArabic ? 'الكمية الدنيا' : 'Min Quantity'}
              value={formData.min_quantity}
              onChange={(e) => setFormData({ ...formData, min_quantity: parseFloat(e.target.value) || 0 })}
              error={formErrors.min_quantity}
              required
            />

            <Input
              type="number"
              step="0.01"
              label={isArabic ? 'الكمية القصوى' : 'Max Quantity'}
              value={formData.max_quantity}
              onChange={(e) => setFormData({ ...formData, max_quantity: parseFloat(e.target.value) || 0 })}
              error={formErrors.max_quantity}
              required
            />

            <Input
              type="number"
              step="0.01"
              label={isArabic ? 'كمية إعادة الطلب' : 'Reorder Quantity'}
              value={formData.reorder_quantity}
              onChange={(e) => setFormData({ ...formData, reorder_quantity: parseFloat(e.target.value) || 0 })}
              error={formErrors.reorder_quantity}
              required
            />

            <Input
              type="number"
              label={isArabic ? 'مدة التسليم (أيام)' : 'Lead Time (days)'}
              value={formData.lead_time_days}
              onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })}
              error={formErrors.lead_time_days}
              required
            />

            <Input
              type="number"
              step="0.01"
              label={isArabic ? 'المخزون الآمن' : 'Safety Stock'}
              value={formData.safety_stock}
              onChange={(e) => setFormData({ ...formData, safety_stock: parseFloat(e.target.value) || 0 })}
              error={formErrors.safety_stock}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_generate_po}
                onChange={(e) => setFormData({ ...formData, auto_generate_po: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {isArabic ? 'إنشاء أمر شراء تلقائياً' : 'Auto-generate Purchase Order'}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {isArabic ? 'نشط' : 'Active'}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              loading={submitting}
            >
              {editingItem 
                ? (isArabic ? 'حفظ التغييرات' : 'Save Changes')
                : (isArabic ? 'إنشاء قاعدة' : 'Create Rule')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={isArabic ? 'حذف قاعدة إعادة الطلب' : 'Delete Reorder Rule'}
        message={isArabic 
          ? `هل أنت متأكد من حذف قاعدة "${deletingItem?.rule_code}"؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Are you sure you want to delete rule "${deletingItem?.rule_code}"? This action cannot be undone.`}
        confirmText={isArabic ? 'حذف' : 'Delete'}
        variant="danger"
      />
    </MainLayout>
  );
}
