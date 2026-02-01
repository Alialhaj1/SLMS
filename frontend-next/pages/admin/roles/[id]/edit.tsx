/**
 * Edit Role Page
 * Path: /admin/roles/[id]/edit
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layout/MainLayout';
import { withPermission } from '../../../../utils/withPermission';
import { MenuPermissions } from '../../../../config/menu.permissions';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import { useAuth } from '../../../../hooks/useAuth';
import { hasPermission } from '../../../../utils/permissionHelpers';
import { apiClient } from '../../../../lib/apiClient';
import { useToast } from '../../../../contexts/ToastContext';

interface Permission {
  id: number;
  permission_code: string;
  resource: string;
  action: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
}

function EditRolePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check permission
  const canEdit = hasPermission('roles:edit', user?.roles, user?.permissions);

  useEffect(() => {
    if (authLoading || !id) return;

    if (!canEdit) {
      showToast('You do not have permission to edit roles', 'error');
      router.push('/admin/roles');
      return;
    }

    fetchRoleAndPermissions();
  }, [authLoading, canEdit, id]);

  const fetchRoleAndPermissions = async () => {
    try {
      setPageLoading(true);
      
      // Fetch all permissions
      const permissionsResponse = await apiClient.get<Permission[]>('/api/roles/permissions');
      setAllPermissions(permissionsResponse || []);

      // Fetch role details
      const roleResponse = await apiClient.get<any>(`/api/roles/${id}`);
      const roleData = roleResponse.success ? roleResponse.role : roleResponse;
      
      setFormData({
        name: roleData.name,
        description: roleData.description || '',
      });

      // Backend returns permissions as JSONB array of codes (strings)
      // Convert to IDs for frontend state
      const permissionCodes = roleData.permissions || [];
      const permissionIds = permissionsResponse
        .filter(p => permissionCodes.includes(p.permission_code))
        .map(p => p.id);
      
      setSelectedPermissions(permissionIds);

    } catch (error: any) {
      console.error('Error fetching role:', error);
      showToast(error.message || 'Failed to load role', 'error');
      router.push('/admin/roles');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }
    if (selectedPermissions.length === 0) {
      newErrors.permissions = 'Select at least one permission';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Convert permission IDs to permission codes
      const permissionCodes = allPermissions
        .filter(p => selectedPermissions.includes(p.id))
        .map(p => p.permission_code);

      await apiClient.put(`/api/roles/${id}`, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissions: permissionCodes,
      });

      showToast('Role updated successfully', 'success');
      router.push('/admin/roles');
    } catch (error: any) {
      console.error('Error updating role:', error);
      const message = error.message || 'Failed to update role';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
    setErrors(prev => ({ ...prev, permissions: '' }));
  };

  const selectAllInResource = (resource: string) => {
    const resourcePermissions = allPermissions
      .filter(p => p.resource === resource)
      .map(p => p.id);

    const allSelected = resourcePermissions.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !resourcePermissions.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...resourcePermissions])]);
    }
  };

  // Group permissions by resource
  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (authLoading || pageLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Role</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Update role permissions and details
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => router.push('/admin/roles')}
          >
            ← Back
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <Input
                label="Role Name"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setErrors({ ...errors, name: '' });
                }}
                error={errors.name}
                placeholder="e.g., Sales Manager"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief description of this role's responsibilities"
                />
              </div>
            </div>
          </Card>

          {/* Permissions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Permissions</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedPermissions.length} selected
              </span>
            </div>

            {errors.permissions && (
              <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                {errors.permissions}
              </div>
            )}

            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                <div key={resource} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                      {resource.replace('_', ' ')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => selectAllInResource(resource)}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      {permissions.every(p => selectedPermissions.includes(p.id))
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {perm.action}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/roles')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Role'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Roles.Edit, EditRolePage);
