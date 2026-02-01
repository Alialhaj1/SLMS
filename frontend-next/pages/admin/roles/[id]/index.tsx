/**
 * Role Details Page
 * Path: /admin/roles/[id]
 * Shows complete role information
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layout/MainLayout';
import { withPermission } from '../../../../utils/withPermission';
import { MenuPermissions } from '../../../../config/menu.permissions';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { useAuth } from '../../../../hooks/useAuth';
import { hasPermission } from '../../../../utils/permissionHelpers';
import { apiClient } from '../../../../lib/apiClient';
import { useToast } from '../../../../contexts/ToastContext';

interface RoleDetails {
  id: number;
  name: string;
  permissions: string[];
  company_id: number | null;
  company_name: string | null;
  permission_count: number;
  user_count: number;
  created_at: string;
  updated_at: string;
}

function RoleDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user: currentUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState<RoleDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const canView = hasPermission('roles:view', currentUser?.roles, currentUser?.permissions);
  const canEdit = hasPermission('roles:edit', currentUser?.roles, currentUser?.permissions);

  useEffect(() => {
    if (authLoading || !id) return;

    if (!canView) {
      showToast('You do not have permission to view role details', 'error');
      router.push('/admin/roles');
      return;
    }

    fetchRoleDetails();
  }, [authLoading, canView, id]);

  const fetchRoleDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<any>(`/api/roles/${id}`);
      setRole(response.role || response);
    } catch (error: any) {
      console.error('Error fetching role details:', error);
      showToast('Failed to load role details', 'error');
      router.push('/admin/roles');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading role details...</div>
        </div>
      </MainLayout>
    );
  }

  if (!role) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Role not found</div>
        </div>
      </MainLayout>
    );
  }

  // Group permissions by resource
  const groupedPermissions = role.permissions.reduce((acc, perm) => {
    const [resource] = perm.split(':');
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Role Details</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Complete information for {role.name}
            </p>
          </div>
          <div className="flex gap-3">
            {canEdit && (
              <Button
                variant="primary"
                onClick={() => router.push(`/admin/roles/${id}/edit`)}
              >
                Edit Role
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/roles')}
            >
              ← Back
            </Button>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Role ID</label>
              <p className="text-gray-900 dark:text-white font-mono">{role.id}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Role Name</label>
              <p className="text-gray-900 dark:text-white font-semibold">{role.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Company</label>
              <p className="text-gray-900 dark:text-white">{role.company_name || 'Global'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Assigned Users</label>
              <p className="text-gray-900 dark:text-white">{role.user_count} users</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Total Permissions</label>
              <p className="text-gray-900 dark:text-white">{role.permission_count} permissions</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Created At</label>
              <p className="text-gray-900 dark:text-white">
                {new Date(role.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Last Updated</label>
              <p className="text-gray-900 dark:text-white">
                {new Date(role.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Permissions */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">
            Permissions ({role.permissions.length})
          </h2>
          <div className="space-y-4">
            {Object.keys(groupedPermissions).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No permissions assigned</p>
            ) : (
              Object.keys(groupedPermissions).sort().map(resource => (
                <div key={resource} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white capitalize mb-2">
                    {resource}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {groupedPermissions[resource].map((perm, idx) => {
                      const [, action] = perm.split(':');
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="capitalize">{action.replace(/_/g, ' ')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Raw Permissions (for debugging/admin) */}
        <Card>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">
              Raw Permission Codes (Developer View)
            </summary>
            <div className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
                {JSON.stringify(role.permissions, null, 2)}
              </code>
            </div>
          </details>
        </Card>
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Roles.View, RoleDetailsPage);
