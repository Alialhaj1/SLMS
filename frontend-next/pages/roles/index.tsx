import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Role {
  id: number;
  name: string;
  user_count?: number;
}

interface Permission {
  key: string;
  label: string;
  description: string;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  { key: 'view_shipments', label: 'View Shipments', description: 'Can view all shipments' },
  { key: 'create_shipment', label: 'Create Shipment', description: 'Can create new shipments' },
  { key: 'edit_shipment', label: 'Edit Shipment', description: 'Can edit existing shipments' },
  { key: 'delete_shipment', label: 'Delete Shipment', description: 'Can delete shipments' },
  { key: 'view_expenses', label: 'View Expenses', description: 'Can view all expenses' },
  { key: 'create_expense', label: 'Create Expense', description: 'Can create new expenses' },
  { key: 'edit_expense', label: 'Edit Expense', description: 'Can edit existing expenses' },
  { key: 'delete_expense', label: 'Delete Expense', description: 'Can delete expenses' },
  { key: 'view_users', label: 'View Users', description: 'Can view all users' },
  { key: 'create_user', label: 'Create User', description: 'Can create new users' },
  { key: 'edit_user', label: 'Edit User', description: 'Can edit existing users' },
  { key: 'delete_user', label: 'Delete User', description: 'Can delete users' },
  { key: 'view_audit', label: 'View Audit Logs', description: 'Can view system audit logs' },
  { key: 'view_settings', label: 'View Settings', description: 'Can view system settings' },
];

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const [formData, setFormData] = useState({
    name: '',
    selectedPermissions: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasPermission('roles:view' as any)) {
      router.push('/dashboard');
      return;
    }

    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRoles(data.data || data || []);
      }
    } catch (error) {
      showToast('Failed to load roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const url = editingRole
        ? `http://localhost:4000/api/roles/${editingRole.id}`
        : 'http://localhost:4000/api/roles';

      const res = await fetch(url, {
        method: editingRole ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          permissions: formData.selectedPermissions,
        }),
      });

      if (res.ok) {
        showToast(`Role ${editingRole ? 'updated' : 'created'} successfully`, 'success');
        setModalOpen(false);
        resetForm();
        fetchRoles();
      } else {
        const error = await res.json();
        showToast(error.message || 'Failed to save role', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteRole) return;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/roles/${deleteRole.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast('Role deleted successfully', 'success');
        setDeleteRole(null);
        fetchRoles();
      } else {
        const error = await res.json();
        showToast(error.message || 'Failed to delete role', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      selectedPermissions: [],
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', selectedPermissions: [] });
    setEditingRole(null);
    setErrors({});
  };

  const togglePermission = (permissionKey: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permissionKey)
        ? prev.selectedPermissions.filter((p) => p !== permissionKey)
        : [...prev.selectedPermissions, permissionKey],
    }));
  };

  const getRoleBadgeColor = (roleName: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[roleName] || colors.user;
  };

  if (!hasPermission('roles:view' as any)) {
    return null;
  }

  return (
    <MainLayout>
      <Head>
        <title>Roles Management - SLMS</title>
      </Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Roles Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Define roles and their permissions
            </p>
          </div>

          {hasPermission('roles:create' as any) && (
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              <PlusIcon className="w-5 h-5" />
              Add Role
            </Button>
          )}
        </div>

        {/* Roles Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : roles.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <ShieldCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No roles found</p>
              {hasPermission('roles:create' as any) && (
                <Button variant="primary" className="mt-4" onClick={() => setModalOpen(true)}>
                  <PlusIcon className="w-5 h-5" />
                  Create First Role
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id} className="hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <ShieldCheckIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {role.name.replace('_', ' ').toUpperCase()}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(role.name)}`}>
                          {role.user_count || 0} users
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {hasPermission('roles:edit' as any) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        fullWidth
                        onClick={() => openEditModal(role)}
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </Button>
                    )}
                    {hasPermission('roles:delete' as any) && role.name !== 'super_admin' && (
                      <Button
                        size="sm"
                        variant="danger"
                        fullWidth
                        onClick={() => setDeleteRole(role)}
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>
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
        title={editingRole ? 'Edit Role' : 'Create Role'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Role Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="e.g., warehouse_manager"
            helperText="Use lowercase with underscores"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Permissions
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <div
                  key={permission.key}
                  className="flex items-start gap-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => togglePermission(permission.key)}
                >
                  <div className="flex-shrink-0 pt-0.5">
                    <div
                      className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                        formData.selectedPermissions.includes(permission.key)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {formData.selectedPermissions.includes(permission.key) && (
                        <CheckIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{permission.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {permission.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
              {editingRole ? 'Update' : 'Create'} Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        onConfirm={handleDelete}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${deleteRole?.name}"? This action cannot be undone and will affect ${
          deleteRole?.user_count || 0
        } users.`}
        confirmText="Delete"
        variant="danger"
      />
    </MainLayout>
  );
}
