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
import { companyStore } from '../../lib/companyStore';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  FolderOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface ItemCategory {
  id: number;
  name: string;
  name_ar?: string;
  name_en?: string;
  description_en?: string;
  description_ar?: string;
  description?: string;
  code?: string;
  parent_id?: number;
  parent_name?: string;
  item_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  name_ar: string;
  code: string;
  parent_id?: number | null;
  description: string;
  is_active: boolean;
}

function ItemCategoriesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    name_ar: '',
    code: '',
    parent_id: null,
    description: '',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current && hasPermission('master:items:view')) {
      hasFetched.current = true;
      fetchCategories();
    }
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const response = await fetch('http://localhost:4000/api/master/item-categories', {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': companyId.toString() } : {}),
        },
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = t('validation.required');
    if (!formData.code.trim()) errors.code = t('validation.required');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `http://localhost:4000/api/master/item-categories/${editingId}`
        : 'http://localhost:4000/api/master/item-categories';

      const payload: any = {
        ...formData,
        description_en: formData.description || undefined,
      };

      if (!payload.parent_id) {
        delete payload.parent_id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': companyId.toString() } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save category');
      showToast(editingId ? t('common.updated') : t('common.created'), 'success');
      setIsModalOpen(false);
      resetForm();
      fetchCategories();
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const response = await fetch(`http://localhost:4000/api/master/item-categories/${deletingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': companyId.toString() } : {}),
        },
      });
      if (!response.ok) throw new Error('Failed to delete category');
      showToast(t('common.deleted'), 'success');
      setConfirmOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', name_ar: '', code: '', parent_id: null, description: '', is_active: true });
    setFormErrors({});
    setEditingId(null);
  };

  const openEditModal = (category: ItemCategory) => {
    setFormData({
      name: category.name,
      name_ar: category.name_ar || '',
      code: category.code || '',
      description: category.description_en || category.description || '',
      is_active: category.is_active,
    });
    setEditingId(category.id);
    setIsModalOpen(true);
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.code && cat.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!hasPermission('master:items:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Access denied</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Item Categories - SLMS</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Item Categories
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                فئات الأصناف - Manage product categories
              </p>
            </div>
          </div>
          {hasPermission('master:items:create') && (
            <Button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              variant="primary"
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center">
            <FolderIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No categories found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {category.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <div>{category.name}</div>
                      {category.name_ar && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {category.name_ar}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {category.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          category.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {hasPermission('categories:edit') && (
                        <button
                          onClick={() => openEditModal(category)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 inline-block"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      )}
                      {hasPermission('categories:delete') && (
                        <button
                          onClick={() => {
                            setDeletingId(category.id);
                            setConfirmOpen(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 inline-block"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingId ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Code *"
            type="text"
            placeholder="e.g., CAT-001"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            error={formErrors.code}
          />

          <Input
            label="Name (English) *"
            type="text"
            placeholder="e.g., Electronics"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
          />

          <Input
            label="Name (Arabic)"
            type="text"
            placeholder="e.g., إلكترونيات"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />

          <Input
            label="Description"
            type="textarea"
            placeholder="Category description..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {editingId ? 'Update' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={isSubmitting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.Items.View, ItemCategoriesPage);
