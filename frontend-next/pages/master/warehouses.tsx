import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Warehouse {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  // Legacy field kept for backward compatibility
  warehouse_type: string;
  warehouse_type_id?: number | null;
  cost_center_id?: number | null;
  warehouse_type_code?: string | null;
  warehouse_type_name?: string | null;
  warehouse_type_name_ar?: string | null;
  warehouse_type_category?: string | null;
  cost_center_code?: string | null;
  cost_center_name?: string | null;
  cost_center_name_ar?: string | null;
  location: string;
  city?: string;
  country?: string;
  manager_name?: string;
  manager_phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  warehouse_type_id: number | '';
  cost_center_id: number | '';
  location: string;
  manager_name: string;
  manager_phone: string;
  email: string;
  is_active: boolean;
}

interface WarehouseTypeOption {
  id: number;
  code: string;
  name: string;
  name_ar?: string | null;
  warehouse_category: string;
  is_default?: boolean;
  is_active?: boolean;
}

interface CostCenterOption {
  id: number;
  code: string;
  name: string;
  name_ar?: string | null;
  is_active?: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  warehouse_type_id: '',
  cost_center_id: '',
  location: '',
  manager_name: '',
  manager_phone: '',
  email: '',
  is_active: true,
};

function WarehousesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseTypes, setWarehouseTypes] = useState<WarehouseTypeOption[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getApiErrorMessage = async (res: Response, fallback: string) => {
    try {
      const text = await res.text();
      if (!text) return fallback;

      try {
        const parsed: unknown = JSON.parse(text);
        if (typeof parsed === 'string' && parsed.trim()) return parsed;
        if (parsed && typeof parsed === 'object') {
          const maybeError = (parsed as any).error ?? (parsed as any).message;
          if (typeof maybeError === 'string' && maybeError.trim()) return maybeError;
        }
      } catch {
        // Not JSON; fall through.
      }

      const trimmed = text.trim();
      if (trimmed.startsWith('<')) return fallback;
      return trimmed || fallback;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    fetchWarehouseTypes();
    fetchCostCenters();
    fetchWarehouses();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      if (!token || !companyId) return;

      const res = await fetch('http://localhost:4000/api/master/cost-centers', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });
      if (!res.ok) return;

      const payload = await res.json();
      setCostCenters(payload.data || []);
    } catch {
      // Non-blocking
    }
  };

  const fetchWarehouseTypes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();

      const tryFetch = async (url: string) => {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
          },
        });
        return res;
      };

      // Prefer master route; fall back to alias if needed
      let res = await tryFetch('http://localhost:4000/api/master/warehouse-types');
      if (res.status === 404) {
        res = await tryFetch('http://localhost:4000/api/warehouse-types');
      }

      if (!res.ok) return;

      const payload = await res.json();
      const types: WarehouseTypeOption[] = payload.data || [];
      setWarehouseTypes(types);

      // Set default selection for create flow
      const defaultType = types.find((t) => t.is_default) || types[0];
      if (defaultType && formData.warehouse_type_id === '') {
        setFormData((prev) => ({ ...prev, warehouse_type_id: defaultType.id }));
      }
    } catch {
      // Non-blocking: Warehouses page can still work with legacy type.
    }
  };

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const res = await fetch('http://localhost:4000/api/master/warehouses', {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });
      if (res.ok) {
        const result = await res.json();
        setWarehouses(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast('Failed to load warehouses', 'error');
      }
    } catch (error) {
      showToast('Failed to load warehouses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Warehouse code is required';
    if (!formData.name.trim()) errors.name = 'Warehouse name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        name_ar: warehouse.name_ar || '',
        warehouse_type_id: warehouse.warehouse_type_id ?? '',
        cost_center_id: warehouse.cost_center_id ?? '',
        location: warehouse.location || '',
        manager_name: warehouse.manager_name || '',
        manager_phone: warehouse.manager_phone || '',
        email: warehouse.email || '',
        is_active: warehouse.is_active,
      });
    } else {
      setEditingWarehouse(null);
      // For create: keep previously selected type if available
      setFormData((prev) => ({
        ...initialFormData,
        warehouse_type_id: prev.warehouse_type_id || initialFormData.warehouse_type_id,
        cost_center_id: prev.cost_center_id || initialFormData.cost_center_id,
      }));
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingWarehouse(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      showToast('Please log in again', 'error');
      return;
    }

    const companyId = companyStore.getActiveCompanyId();
    if (!companyId) {
      showToast('Please select a company first', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingWarehouse
        ? `http://localhost:4000/api/master/warehouses/${editingWarehouse.id}`
        : 'http://localhost:4000/api/master/warehouses';
      const res = await fetch(url, {
        method: editingWarehouse ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
        body: JSON.stringify({
          ...formData,
          // Backend accepts either `warehouse_type_id` (preferred) or legacy `warehouse_type`.
          warehouse_type_id: formData.warehouse_type_id === '' ? null : formData.warehouse_type_id,
          cost_center_id: formData.cost_center_id === '' ? null : formData.cost_center_id,
        }),
      });
      if (res.ok) {
        showToast(editingWarehouse ? 'Warehouse updated successfully' : 'Warehouse created successfully', 'success');
        handleCloseModal();
        fetchWarehouses();
      } else {
        const message = await getApiErrorMessage(res, 'Failed to save warehouse');
        showToast(message, 'error');
      }
    } catch (error) {
      showToast('Failed to save warehouse', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!warehouseToDelete) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      showToast('Please log in again', 'error');
      return;
    }

    const companyId = companyStore.getActiveCompanyId();
    if (!companyId) {
      showToast('Please select a company first', 'error');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:4000/api/master/warehouses/${warehouseToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });
      if (res.ok) {
        showToast('Warehouse deleted successfully', 'success');
        fetchWarehouses();
      } else {
        const message = await getApiErrorMessage(res, 'Failed to delete warehouse');
        showToast(message, 'error');
      }
    } catch (error) {
      showToast('Failed to delete warehouse', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setWarehouseToDelete(null);
    }
  };

  const getWarehouseTypeLabel = (type: string) => {
    switch (type) {
      case 'transit':
        return 'Transit Warehouse';
      case 'production':
        return 'Production Warehouse';
      case 'scrap':
        return 'Scrap Warehouse';
      case 'storage':
      default:
        return 'Storage Warehouse';
    }
  };

  const getWarehouseTypeBadge = (type: string) => {
    const colors = {
      storage: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      production: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      transit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      scrap: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[type as keyof typeof colors] || colors.storage;
  };

  const filteredWarehouses = warehouses.filter((wh) => {
    const matchesSearch =
      wh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wh.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wh.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = !showActiveOnly || wh.is_active;
    return matchesSearch && matchesActive;
  });

  if (!hasPermission('master:warehouses:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <BuildingStorefrontIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view warehouses.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Warehouses Management - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Warehouses</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage warehouses and storage locations
            </p>
          </div>
          {hasPermission('master:warehouses:create') && (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Warehouse
            </Button>
          )}
        </div>
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, code or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activeOnly"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="activeOnly" className="text-sm text-gray-700 dark:text-gray-300">
                Active only
              </label>
            </div>
          </div>
        </div>
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading warehouses...</p>
            </div>
          ) : filteredWarehouses.length === 0 ? (
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No warehouses found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new warehouse'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cost Center
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredWarehouses.map((wh) => (
                    <tr key={wh.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {wh.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {wh.name}
                          </div>
                          {wh.name_ar && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{wh.name_ar}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWarehouseTypeBadge(wh.warehouse_type)}`}>
                          {wh.warehouse_type_name || getWarehouseTypeLabel(wh.warehouse_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {wh.cost_center_name ? (
                          <div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {wh.cost_center_code ? `${wh.cost_center_code} - ` : ''}{wh.cost_center_name}
                            </div>
                            {wh.cost_center_name_ar && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{wh.cost_center_name_ar}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{wh.location || '—'}</div>
                        {wh.city && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {wh.city}{wh.country && `, ${wh.country}`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {wh.manager_name ? (
                          <div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">{wh.manager_name}</div>
                            {wh.manager_phone && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{wh.manager_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            wh.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {wh.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission('master:warehouses:edit') && (
                            <button
                              onClick={() => handleOpenModal(wh)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )}
                          {hasPermission('master:warehouses:delete') && (
                            <button
                              onClick={() => handleDeleteClick(wh)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingWarehouse ? 'Edit Warehouse' : 'Create Warehouse'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Warehouse Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={formErrors.code}
              disabled={!!editingWarehouse}
            />
            <Input
              label="Warehouse Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />
          </div>
          <Input
            label="Warehouse Name (Arabic)"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Warehouse Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.warehouse_type_id}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({ ...formData, warehouse_type_id: value === '' ? '' : Number(value) });
              }}
              className="input w-full"
            >
              {warehouseTypes.length === 0 ? (
                <>
                  <option value="">Default</option>
                  <option value="" disabled>
                    (Warehouse types not loaded)
                  </option>
                </>
              ) : (
                <>
                  <option value="">Select type...</option>
                  {warehouseTypes
                    .filter((t) => t.is_active !== false)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cost Center
            </label>
            <select
              value={formData.cost_center_id}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({ ...formData, cost_center_id: value === '' ? '' : Number(value) });
              }}
              className="input w-full"
            >
              <option value="">—</option>
              {costCenters
                .filter((cc) => cc.is_active !== false)
                .map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code ? `${cc.code} - ` : ''}{cc.name}
                  </option>
                ))}
            </select>
          </div>
          <Input
            label="Location Address"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Manager Name"
              value={formData.manager_name}
              onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
            />
            <Input
              label="Manager Phone"
              value={formData.manager_phone}
              onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
            />
          </div>
          <Input
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {editingWarehouse ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setWarehouseToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Warehouse"
        message={`Are you sure you want to delete "${warehouseToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.Warehouses.View, WarehousesPage);
