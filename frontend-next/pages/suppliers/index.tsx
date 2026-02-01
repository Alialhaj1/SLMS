import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      showToast('Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const url = editingSupplier
        ? `http://localhost:4000/api/suppliers/${editingSupplier.id}`
        : 'http://localhost:4000/api/suppliers';

      const res = await fetch(url, {
        method: editingSupplier ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(`Supplier ${editingSupplier ? 'updated' : 'created'} successfully`, 'success');
        setModalOpen(false);
        resetForm();
        fetchSuppliers();
      } else {
        showToast('Failed to save supplier', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteSupplier) return;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/suppliers/${deleteSupplier.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast('Supplier deleted successfully', 'success');
        setDeleteSupplier(null);
        fetchSuppliers();
      } else {
        showToast('Failed to delete supplier', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', contact_person: '', email: '', phone: '', address: '' });
    setEditingSupplier(null);
    setErrors({});
  };

  return (
    <MainLayout>
      <Head>
        <title>Suppliers - SLMS</title>
      </Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Suppliers</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your supplier network and contacts
            </p>
          </div>

          {hasPermission('suppliers:create' as any) && (
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              <PlusIcon className="w-5 h-5" />
              Add Supplier
            </Button>
          )}
        </div>

        {/* Suppliers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <UsersIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No suppliers found</p>
              <Button variant="primary" className="mt-4" onClick={() => setModalOpen(true)}>
                Add your first supplier
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => (
              <Card key={supplier.id} hoverable>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <UsersIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{supplier.name}</h3>
                        {supplier.contact_person && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {supplier.contact_person}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                        <a
                          href={`mailto:${supplier.email}`}
                          className="text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {supplier.email}
                        </a>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <a
                          href={`tel:${supplier.phone}`}
                          className="text-gray-700 dark:text-gray-300 hover:underline"
                        >
                          {supplier.phone}
                        </a>
                      </div>
                    )}
                    {supplier.address && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {supplier.address}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {hasPermission('suppliers:edit' as any) && (
                    <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        size="sm"
                        variant="secondary"
                        fullWidth
                        onClick={() => openEditModal(supplier)}
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </Button>
                      {hasPermission('suppliers:delete' as any) && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteSupplier(supplier)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Supplier Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="e.g., ABC Logistics"
          />

          <Input
            label="Contact Person"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            placeholder="e.g., John Doe"
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            placeholder="e.g., contact@supplier.com"
          />

          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="e.g., +1 (555) 123-4567"
          />

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g., 123 Main St, City, State"
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              {editingSupplier ? 'Update' : 'Create'} Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteSupplier}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteSupplier?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Suppliers.View, SuppliersPage);
