import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLocale } from '../../contexts/LocaleContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface ReferenceItem {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  color?: string;
  is_active: boolean;
  sort_order?: number;
  [key: string]: any;
}

interface ProcurementReferenceDataPageProps {
  type: 'purchase-order-types' | 'purchase-order-statuses' | 'supply-terms';
  title: string;
  apiEndpoint: string;
  fields: FieldConfig[];
}

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'color' | 'textarea';
  required?: boolean;
}

export default function ProcurementReferenceDataPage({ type, title, apiEndpoint, fields }: ProcurementReferenceDataPageProps) {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const { t } = useTranslation();

  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReferenceItem | null>(null);
  const [formData, setFormData] = useState<Partial<ReferenceItem>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ReferenceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canView = hasPermission('procurement:purchase_orders:view');
  const canCreate = hasPermission('procurement:purchase_orders:create');
  const canEdit = hasPermission('procurement:purchase_orders:edit');
  const canDelete = hasPermission('procurement:purchase_orders:delete');

  useEffect(() => {
    if (canView) {
      fetchItems();
    }
  }, [canView]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/procurement/reference/${apiEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch items');

      const result = await response.json();
      setItems(result.data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ is_active: true, sort_order: 0 });
    setModalOpen(true);
  };

  const openEditModal = (item: ReferenceItem) => {
    setEditingItem(item);
    setFormData(item);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem
        ? `http://localhost:4000/api/procurement/reference/${apiEndpoint}/${editingItem.id}`
        : `http://localhost:4000/api/procurement/reference/${apiEndpoint}`;

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      showToast(editingItem ? 'Updated successfully' : 'Created successfully', 'success');
      setModalOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error('Error saving:', error);
      showToast(error.message || 'Failed to save', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (item: ReferenceItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `http://localhost:4000/api/procurement/reference/${apiEndpoint}/${itemToDelete.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to delete');

      showToast('Deleted successfully', 'success');
      setDeleteDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error('Error deleting:', error);
      showToast(error.message || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (!canView) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Access denied</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{title} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {canCreate && (
            <Button onClick={openCreateModal}>Add New</Button>
          )}
        </div>

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No items found</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name (AR)</th>
                    {type === 'purchase-order-types' || type === 'purchase-order-statuses' ? (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Color</th>
                    ) : null}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.name_ar || '-'}</td>
                      {type === 'purchase-order-types' || type === 'purchase-order-statuses' ? (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.color ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></span>
                              <span className="text-gray-600 dark:text-gray-300">{item.color}</span>
                            </span>
                          ) : '-'}
                        </td>
                      ) : null}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {canEdit && (
                            <Button size="sm" variant="secondary" onClick={() => openEditModal(item)}>Edit</Button>
                          )}
                          {canDelete && (
                            <Button size="sm" variant="danger" onClick={() => openDeleteDialog(item)}>Delete</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editingItem ? `Edit ${title}` : `Add New ${title}`}
        size="md"
      >
        <div className="space-y-4">
          {fields.map((field) => {
            if (field.type === 'textarea') {
              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    rows={3}
                    value={formData[field.key] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    required={field.required}
                  />
                </div>
              );
            }
            return (
              <Input
                key={field.key}
                label={field.label}
                type={field.type === 'checkbox' ? 'checkbox' : field.type === 'color' ? 'text' : field.type}
                value={formData[field.key] ?? ''}
                onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'checkbox' ? e.target.checked : field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                required={field.required}
              />
            );
          })}

          <div className="flex gap-2">
            <Button onClick={handleSubmit} loading={submitting}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}
