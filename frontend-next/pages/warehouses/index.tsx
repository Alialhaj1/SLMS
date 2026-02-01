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
import { PlusIcon, PencilIcon, TrashIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

interface Warehouse {
  id: number;
  name: string;
  location: string;
  capacity: number;
  current_stock: number;
  manager_name?: string;
  created_at: string;
}

function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(null);
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: '',
    manager_name: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/warehouses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        // Handle both { data: [...] } and [...] response formats
        const warehouseList = Array.isArray(data) ? data : (data.data || []);
        setWarehouses(warehouseList);
      }
    } catch (error) {
      showToast('Failed to load warehouses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Warehouse name is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.capacity || parseFloat(formData.capacity) <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const url = editingWarehouse
        ? `http://localhost:4000/api/warehouses/${editingWarehouse.id}`
        : 'http://localhost:4000/api/warehouses';

      const res = await fetch(url, {
        method: editingWarehouse ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          capacity: parseFloat(formData.capacity),
        }),
      });

      if (res.ok) {
        showToast(`Warehouse ${editingWarehouse ? 'updated' : 'created'} successfully`, 'success');
        setModalOpen(false);
        resetForm();
        fetchWarehouses();
      } else {
        showToast('Failed to save warehouse', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteWarehouse) return;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/warehouses/${deleteWarehouse.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast('Warehouse deleted successfully', 'success');
        setDeleteWarehouse(null);
        fetchWarehouses();
      } else {
        showToast('Failed to delete warehouse', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const openEditModal = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location,
      capacity: warehouse.capacity.toString(),
      manager_name: warehouse.manager_name || '',
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', capacity: '', manager_name: '' });
    setEditingWarehouse(null);
    setErrors({});
  };

  return (
    <MainLayout>
      <Head>
        <title>Warehouses - SLMS</title>
      </Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Warehouses</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your warehouse locations and inventory
            </p>
          </div>

          {hasPermission('warehouses:create' as any) && (
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              <PlusIcon className="w-5 h-5" />
              Add Warehouse
            </Button>
          )}
        </div>

        {/* Warehouses Grid */}
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
        ) : warehouses.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No warehouses found</p>
              <Button variant="primary" className="mt-4" onClick={() => setModalOpen(true)}>
                Create your first warehouse
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warehouses.map((warehouse) => (
              <Card key={warehouse.id} hoverable>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <BuildingStorefrontIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{warehouse.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{warehouse.location}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                      <span className="font-medium">{warehouse.capacity.toLocaleString()} units</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Current Stock:</span>
                      <span className="font-medium">{warehouse.current_stock?.toLocaleString() || 0} units</span>
                    </div>
                    {warehouse.manager_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Manager:</span>
                        <span className="font-medium">{warehouse.manager_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Utilization</span>
                      <span>
                        {warehouse.current_stock && warehouse.capacity
                          ? Math.round((warehouse.current_stock / warehouse.capacity) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                        style={{
                          width: `${
                            warehouse.current_stock && warehouse.capacity
                              ? Math.min((warehouse.current_stock / warehouse.capacity) * 100, 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  {hasPermission('warehouses:edit' as any) && (
                    <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        size="sm"
                        variant="secondary"
                        fullWidth
                        onClick={() => openEditModal(warehouse)}
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </Button>
                      {hasPermission('warehouses:delete' as any) && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteWarehouse(warehouse)}
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
        title={editingWarehouse ? 'Edit Warehouse' : 'Create Warehouse'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Warehouse Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="e.g., Main Distribution Center"
          />

          <Input
            label="Location"
            required
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            error={errors.location}
            placeholder="e.g., New York, NY"
          />

          <Input
            label="Capacity (units)"
            type="number"
            required
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            error={errors.capacity}
            placeholder="e.g., 10000"
          />

          <Input
            label="Manager Name"
            value={formData.manager_name}
            onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
            placeholder="Optional"
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
              {editingWarehouse ? 'Update' : 'Create'} Warehouse
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteWarehouse}
        onClose={() => setDeleteWarehouse(null)}
        onConfirm={handleDelete}
        title="Delete Warehouse"
        message={`Are you sure you want to delete "${deleteWarehouse?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Warehouses.View, WarehousesPage);
