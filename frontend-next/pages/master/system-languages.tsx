import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import MasterDataTable, { TableColumn } from '@/components/common/MasterDataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useMasterData } from '@/hooks/useMasterData';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SystemLanguage {
  id: number;
  code: string;
  name_en: string;
  name_native: string;
  direction: 'ltr' | 'rtl';
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function SystemLanguagesPage() {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const { 
    data, 
    loading, 
    pagination, 
    fetchList, 
    fetchById, 
    create, 
    update, 
    remove 
  } = useMasterData<SystemLanguage>({ 
    endpoint: '/api/system-languages',
    pageSize: 20
  });

  // States
  const [filters, setFilters] = useState({ is_active: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemLanguage | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_native: '',
    direction: 'ltr' as 'ltr' | 'rtl',
    is_default: false,
    is_active: true,
    sort_order: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchList();
  }, []);

  const handleFilter = () => {
    const params: any = {};
    if (filters.is_active) params.is_active = filters.is_active;
    fetchList(params);
  };

  const handleResetFilters = () => {
    setFilters({ is_active: '' });
    fetchList();
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name_en: '',
      name_native: '',
      direction: 'ltr',
      is_default: false,
      is_active: true,
      sort_order: 0,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = async (id: number) => {
    const item = await fetchById(id);
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code || '',
        name_en: item.name_en || '',
        name_native: item.name_native || '',
        direction: item.direction || 'ltr',
        is_default: item.is_default ?? false,
        is_active: item.is_active ?? true,
        sort_order: item.sort_order || 0,
      });
      setErrors({});
      setIsModalOpen(true);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim() || formData.code.length !== 2 || !/^[a-z]{2}$/.test(formData.code)) {
      newErrors.code = 'Code must be 2 lowercase letters (e.g., en, ar)';
    }

    if (!formData.name_en.trim()) {
      newErrors.name_en = 'English name is required';
    }

    if (!formData.name_native.trim()) {
      newErrors.name_native = 'Native name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Language updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Language created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchList();
    } catch (error: any) {
      showToast(error.response?.data?.error?.message || 'Failed to save language', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setSubmitting(true);
    try {
      await remove(deletingId);
      showToast('Language deleted successfully', 'success');
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
      fetchList();
    } catch (error: any) {
      showToast(error.response?.data?.error?.message || 'Failed to delete language', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = hasPermission('system_languages:create');
  const canEdit = hasPermission('system_languages:edit');
  const canDelete = hasPermission('system_languages:delete');

  const columns: TableColumn<SystemLanguage>[] = [
    {
      key: 'code',
      label: 'Code',
      render: (item) => (
        <span className="font-mono font-medium text-gray-900 dark:text-white uppercase">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        return (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {item.name_en}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400" dir="rtl">
              {item.name_native}
            </div>
          </div>
        );
      },
    },
    {
      key: 'direction',
      label: 'Direction',
      render: (item) => {
        if (!item || !item.direction) return <span className="text-gray-400">-</span>;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.direction === 'rtl'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}>
            {item.direction.toUpperCase()}
          </span>
        );
      },
    },
    {
      key: 'is_default',
      label: 'Default',
      render: (item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        return item.is_default ? (
          <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <XMarkIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
        );
      },
    },
    {
      key: 'sort_order',
      label: 'Order',
      render: (item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        return (
          <span className="text-gray-900 dark:text-white">
            {item.sort_order}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.is_active 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {item.is_active ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
  ];

  return (
    <MainLayout>
      <Head>
        <title>System Languages - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              System Languages
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage available languages for the system
            </p>
          </div>
          {canCreate && (
            <Button onClick={handleCreate}>
              Add Language
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.is_active}
                onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFilter} variant="secondary">
              Apply Filters
            </Button>
            <Button onClick={handleResetFilters} variant="secondary">
              Reset
            </Button>
          </div>
        </div>

        <MasterDataTable
          columns={columns}
          data={data}
          loading={loading}
          pagination={{
            ...pagination,
            onPageChange: (page: number) => fetchList({ page }),
          }}
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canDelete ? handleDeleteClick : undefined}
          canEdit={canEdit}
          canDelete={canDelete}
        />

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Edit Language' : 'Add Language'}
        >
          <div className="space-y-4">
            <Input
              label="Language Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
              error={errors.code}
              required
              placeholder="e.g., en, ar, fr"
              maxLength={2}
              disabled={!!editingItem}
            />

            <Input
              label="Name (English)"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              error={errors.name_en}
              required
              placeholder="e.g., English, Arabic"
            />

            <Input
              label="Native Name"
              value={formData.name_native}
              onChange={(e) => setFormData({ ...formData, name_native: e.target.value })}
              error={errors.name_native}
              required
              placeholder="e.g., English, العربية, Français"
              dir="rtl"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Direction <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value as 'ltr' | 'rtl' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="ltr">Left to Right (LTR)</option>
                <option value="rtl">Right to Left (RTL)</option>
              </select>
            </div>

            <Input
              label="Sort Order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              min={0}
            />

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Set as Default
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                loading={submitting}
              >
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title="Delete Language"
          message="Are you sure you want to delete this language? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
          loading={submitting}
        />
      </div>
    </MainLayout>
  );
}
