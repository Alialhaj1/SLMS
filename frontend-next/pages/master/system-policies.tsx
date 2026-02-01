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

interface SystemPolicy {
  id: number;
  policy_key: string;
  policy_value: string;
  data_type: string;
  description_en?: string;
  description_ar?: string;
  is_system_policy: boolean;
  is_active: boolean;
  category?: string;
  created_at: string;
  updated_at: string;
}

export default function SystemPoliciesPage() {
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
  } = useMasterData<SystemPolicy>({ 
    endpoint: '/api/system-policies',
    pageSize: 20
  });

  const [filters, setFilters] = useState({ category: '', is_active: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemPolicy | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    policy_key: '',
    policy_value: '',
    data_type: 'string',
    description_en: '',
    description_ar: '',
    is_editable: true,
    is_active: true,
    is_system_policy: false,
    category: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchList();
  }, []);

  const handleFilter = () => {
    const params: any = {};
    if (filters.category) params.category = filters.category;
    if (filters.is_active) params.is_active = filters.is_active;
    fetchList(params);
  };

  const handleResetFilters = () => {
    setFilters({ category: '', is_active: '' });
    fetchList();
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      policy_key: '',
      policy_value: '',
      data_type: 'string',
      description_en: '',
      description_ar: '',
      is_editable: true,
      is_system_policy: false,
      is_active: true,
      category: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = async (id: number) => {
    const item = await fetchById(id);
    if (item) {
      setEditingItem(item);
      setFormData({
        policy_key: item.policy_key || '',
        policy_value: item.policy_value || '',
        data_type: item.data_type || 'string',
        description_en: item.description_en || '',
        description_ar: item.description_ar || '',
        is_editable: item.is_editable ?? true,
        is_system_policy: item.is_system_policy ?? false,
        is_active: item.is_active ?? true,
        category: item.category || '',
      });
      setErrors({});
      setIsModalOpen(true);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.policy_key.trim()) {
      newErrors.policy_key = 'Policy key is required';
    }

    if (!formData.policy_value.trim()) {
      newErrors.policy_value = 'Policy value is required';
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
        showToast('Policy updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Policy created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchList();
    } catch (error: any) {
      showToast(error.response?.data?.error?.message || 'Failed to save policy', 'error');
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
      showToast('Policy deleted successfully', 'success');
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
      fetchList();
    } catch (error: any) {
      showToast(error.response?.data?.error?.message || 'Failed to delete policy', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = hasPermission('system_policies:create');
  const canEdit = hasPermission('system_policies:edit');
  const canDelete = hasPermission('system_policies:delete');

  const columns: TableColumn<SystemPolicy>[] = [
    {
      key: 'policy_key',
      label: 'Policy Key',
      render: (item) => (
        <div className="space-y-1">
          <span className="font-mono font-medium text-gray-900 dark:text-white">
            {item.policy_key}
          </span>
          {item.category && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {item.category}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'policy_value',
      label: 'Value',
      render: (item) => (
        <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
          {item.policy_value}
        </span>
      ),
    },
    {
      key: 'data_type',
      label: 'Type',
      render: (item) => (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {item.data_type}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (item) => (
        <div className="space-y-1">
          {item.description_en && (
            <div className="text-sm text-gray-900 dark:text-white">
              {item.description_en}
            </div>
          )}
          {item.description_ar && (
            <div className="text-sm text-gray-500 dark:text-gray-400" dir="rtl">
              {item.description_ar}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'is_system_policy',
      label: 'System',
      render: (item) => (
        item.is_system_policy ? (
          <CheckIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        ) : (
          <XMarkIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
        )
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (item) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.is_active 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <MainLayout>
      <Head>
        <title>System Policies - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              System Policies
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage system-wide configuration policies
            </p>
          </div>
          {canCreate && (
            <Button onClick={handleCreate}>
              Add Policy
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Category"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              placeholder="Search by category..."
            />
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
          title={editingItem ? 'Edit Policy' : 'Add Policy'}
        >
          <div className="space-y-4">
            <Input
              label="Policy Key"
              value={formData.policy_key}
              onChange={(e) => setFormData({ ...formData, policy_key: e.target.value })}
              error={errors.policy_key}
              required
              placeholder="e.g., session_timeout, max_login_attempts"
              disabled={!!editingItem}
            />

            <Input
              label="Policy Value"
              value={formData.policy_value}
              onChange={(e) => setFormData({ ...formData, policy_value: e.target.value })}
              error={errors.policy_value}
              required
              placeholder="e.g., 30, true, admin@example.com"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.data_type}
                onChange={(e) => setFormData({ ...formData, data_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <Input
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Security, Performance, Email"
            />

            <Input
              label="Description (English)"
              value={formData.description_en}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              placeholder="Description in English"
            />

            <Input
              label="Description (Arabic)"
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              placeholder="الوصف بالعربية"
              dir="rtl"
            />

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_system_policy"
                  checked={formData.is_system_policy}
                  onChange={(e) => setFormData({ ...formData, is_system_policy: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_system_policy" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  System Policy (read-only)
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
          title="Delete Policy"
          message="Are you sure you want to delete this policy? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
          loading={submitting}
        />
      </div>
    </MainLayout>
  );
}
