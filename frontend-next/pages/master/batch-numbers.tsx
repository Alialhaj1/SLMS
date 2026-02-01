/**
 * 📦 BATCH NUMBERS PAGE
 * ====================
 * 
 * Batch/Lot tracking for inventory items
 * 
 * Features:
 * ✅ List view with filters (item, warehouse, expired, expiring soon)
 * ✅ Create/Edit form with item selection
 * ✅ Date validation (expiry > manufacturing)
 * ✅ QR code support
 * ✅ Expiry alerts (color-coded)
 * ✅ RBAC (view/create/edit/delete permissions)
 * ✅ Bilingual support
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable, { TableColumn } from '../../components/common/MasterDataTable';
import ItemSelector from '../../components/common/ItemSelector';
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
  XMarkIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface BatchNumber {
  id: number;
  batch_number: string;
  item_id: number;
  item_name_en: string;
  item_name_ar: string;
  item_code: string;
  warehouse_id?: number;
  warehouse_name_en?: string;
  warehouse_name_ar?: string;
  manufacturing_date?: string;
  expiry_date?: string;
  received_date?: string;
  quantity: number;
  supplier_id?: number;
  supplier_name_en?: string;
  supplier_name_ar?: string;
  purchase_order_number?: string;
  qr_code?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  batch_number: string;
  item_id: string;
  warehouse_id: string;
  manufacturing_date: string;
  expiry_date: string;
  received_date: string;
  quantity: string;
  supplier_id: string;
  purchase_order_number: string;
  qr_code: string;
  notes: string;
  is_active: boolean;
}

export default function BatchNumbersPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();

  // Permissions
  const canView = hasPermission('batch_numbers:view');
  const canCreate = hasPermission('batch_numbers:create');
  const canEdit = hasPermission('batch_numbers:edit');
  const canDelete = hasPermission('batch_numbers:delete');

  // Redirect if no view permission
  useEffect(() => {
    if (!canView) {
      router.push('/dashboard');
    }
  }, [canView, router]);

  // Master data hook
  const {
    data,
    loading,
    pagination,
    fetchList,
    create,
    update,
    remove,
  } = useMasterData<BatchNumber>({
    endpoint: '/api/batch-numbers',
    pageSize: 10,
  });

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<BatchNumber | null>(null);
  const [deletingItem, setDeletingItem] = useState<BatchNumber | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    item_id: '',
    warehouse_id: '',
    expired: false,
    expiring_soon: false,
    is_active: '',
  });

  // Form state
  const [formData, setFormData] = useState<FormData>({
    batch_number: '',
    item_id: '',
    warehouse_id: '',
    manufacturing_date: '',
    expiry_date: '',
    received_date: '',
    quantity: '',
    supplier_id: '',
    purchase_order_number: '',
    qr_code: '',
    notes: '',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch data on mount and when filters change
  useEffect(() => {
    if (canView) {
      fetchList({ filters });
    }
  }, [canView, filters, fetchList]);

  // Table columns
  const columns: TableColumn<BatchNumber>[] = [
    {
      key: 'batch_number',
      label: locale === 'ar' ? 'رقم الدفعة' : 'Batch Number',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}</span>
          {row.qr_code && (
            <QrCodeIcon className="w-4 h-4 text-gray-400" title={locale === 'ar' ? 'يحتوي على QR Code' : 'Has QR Code'} />
          )}
        </div>
      ),
    },
    {
      key: 'item',
      label: locale === 'ar' ? 'الصنف' : 'Item',
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-medium">{locale === 'ar' ? row.item_name_ar : row.item_name_en}</div>
          <div className="text-xs text-gray-500">{row.item_code}</div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      label: locale === 'ar' ? 'المخزن' : 'Warehouse',
      hideOnMobile: true,
      render: (_, row) => (
        <span>{row.warehouse_id ? (locale === 'ar' ? row.warehouse_name_ar : row.warehouse_name_en) : '-'}</span>
      ),
    },
    {
      key: 'quantity',
      label: locale === 'ar' ? 'الكمية' : 'Quantity',
      align: 'right',
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'expiry_date',
      label: locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date',
      sortable: true,
      render: (value, row) => {
        if (!value) return <span className="text-gray-400">-</span>;

        const expiryDate = new Date(value);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let colorClass = 'text-gray-900 dark:text-gray-100';
        let icon = null;

        if (daysUntilExpiry < 0) {
          // Expired
          colorClass = 'text-red-600 dark:text-red-400 font-medium';
          icon = <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />;
        } else if (daysUntilExpiry <= 30) {
          // Expiring soon
          colorClass = 'text-yellow-600 dark:text-yellow-400 font-medium';
          icon = <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
        }

        return (
          <div className="flex items-center gap-2">
            {icon}
            <span className={colorClass}>
              {new Date(value).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'is_active',
      label: locale === 'ar' ? 'الحالة' : 'Status',
      hideOnMobile: true,
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

  // Handle create
  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      batch_number: '',
      item_id: '',
      warehouse_id: '',
      manufacturing_date: '',
      expiry_date: '',
      received_date: '',
      quantity: '',
      supplier_id: '',
      purchase_order_number: '',
      qr_code: '',
      notes: '',
      is_active: true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Handle edit
  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (!item) return;
    setEditingItem(item);
    setFormData({
      batch_number: item.batch_number,
      item_id: String(item.item_id),
      warehouse_id: item.warehouse_id ? String(item.warehouse_id) : '',
      manufacturing_date: item.manufacturing_date || '',
      expiry_date: item.expiry_date || '',
      received_date: item.received_date || '',
      quantity: String(item.quantity),
      supplier_id: item.supplier_id ? String(item.supplier_id) : '',
      purchase_order_number: item.purchase_order_number || '',
      qr_code: item.qr_code || '',
      notes: item.notes || '',
      is_active: item.is_active,
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Handle delete
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

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.batch_number.trim()) {
      errors.batch_number = locale === 'ar' ? 'رقم الدفعة مطلوب' : 'Batch number is required';
    }

    if (!formData.item_id) {
      errors.item_id = locale === 'ar' ? 'الصنف مطلوب' : 'Item is required';
    }

    if (!formData.quantity || parseFloat(formData.quantity) < 0) {
      errors.quantity = locale === 'ar' ? 'الكمية يجب أن تكون رقم موجب' : 'Quantity must be a positive number';
    }

    if (formData.manufacturing_date && formData.expiry_date) {
      const mfgDate = new Date(formData.manufacturing_date);
      const expDate = new Date(formData.expiry_date);

      if (expDate <= mfgDate) {
        errors.expiry_date = locale === 'ar' ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ التصنيع' : 'Expiry date must be after manufacturing date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = {
      batch_number: formData.batch_number.trim(),
      item_id: parseInt(formData.item_id),
      warehouse_id: formData.warehouse_id ? parseInt(formData.warehouse_id) : undefined,
      manufacturing_date: formData.manufacturing_date || undefined,
      expiry_date: formData.expiry_date || undefined,
      received_date: formData.received_date || undefined,
      quantity: parseFloat(formData.quantity),
      supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : undefined,
      purchase_order_number: formData.purchase_order_number || undefined,
      qr_code: formData.qr_code || undefined,
      notes: formData.notes || undefined,
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
        <title>{locale === 'ar' ? 'أرقام الدفعات - SLMS' : 'Batch Numbers - SLMS'}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {locale === 'ar' ? 'أرقام الدفعات' : 'Batch Numbers'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'إدارة أرقام الدفعات وتواريخ الانتهاء' : 'Manage batch numbers and expiry dates'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon className="w-5 h-5 me-2" />
              {locale === 'ar' ? 'فلترة' : 'Filters'}
            </Button>
            {canCreate && (
              <Button variant="primary" onClick={handleCreate}>
                <PlusIcon className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'إضافة دفعة' : 'Add Batch'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label={locale === 'ar' ? 'بحث' : 'Search'}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder={locale === 'ar' ? 'بحث برقم الدفعة...' : 'Search by batch number...'}
              />
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
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.expired}
                    onChange={(e) => setFilters({ ...filters, expired: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{locale === 'ar' ? 'منتهي' : 'Expired'}</span>
                </label>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.expiring_soon}
                    onChange={(e) => setFilters({ ...filters, expiring_soon: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">{locale === 'ar' ? 'سينتهي قريباً' : 'Expiring Soon'}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
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
            emptyMessage={locale === 'ar' ? 'لا توجد دفعات' : 'No batches found'}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? (locale === 'ar' ? 'تعديل الدفعة' : 'Edit Batch') : (locale === 'ar' ? 'إضافة دفعة' : 'Add Batch')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'رقم الدفعة' : 'Batch Number'}
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              error={formErrors.batch_number}
              required
            />
            <ItemSelector
              label={locale === 'ar' ? 'الصنف' : 'Item'}
              value={formData.item_id}
              onChange={(itemId) => setFormData({ ...formData, item_id: itemId })}
              error={formErrors.item_id}
              required
            />
            <Input
              label={locale === 'ar' ? 'الكمية' : 'Quantity'}
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              error={formErrors.quantity}
              required
            />
            <Input
              label={locale === 'ar' ? 'تاريخ التصنيع' : 'Manufacturing Date'}
              type="date"
              value={formData.manufacturing_date}
              onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value })}
            />
            <Input
              label={locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              error={formErrors.expiry_date}
            />
            <Input
              label={locale === 'ar' ? 'QR Code' : 'QR Code'}
              value={formData.qr_code}
              onChange={(e) => setFormData({ ...formData, qr_code: e.target.value })}
            />
            <div className="flex items-center">
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={locale === 'ar' ? 'حذف الدفعة' : 'Delete Batch'}
        message={locale === 'ar' ? `هل أنت متأكد من حذف الدفعة "${deletingItem?.batch_number}"؟` : `Are you sure you want to delete batch "${deletingItem?.batch_number}"?`}
        variant="danger"
        loading={loading}
      />
    </MainLayout>
  );
}
