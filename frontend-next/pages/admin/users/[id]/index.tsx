/**
 * User Details Page
 * Path: /admin/users/[id]
 * Shows full user information including password hash for super admin
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layout/MainLayout';
import { withPermission } from '../../../../utils/withPermission';
import { MenuPermissions } from '../../../../config/menu.permissions';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import UserStatusBadge from '../../../../components/admin/UserStatusBadge';
import { useAuth } from '../../../../hooks/useAuth';
import { hasPermission, isSuperAdmin } from '../../../../utils/permissionHelpers';
import { apiClient } from '../../../../lib/apiClient';
import { useToast } from '../../../../contexts/ToastContext';

interface UserDetails {
  id: number;
  email: string;
  full_name: string;
  password?: string; // Only visible to super admin
  status: 'active' | 'disabled' | 'locked';
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
  failed_login_count: number;
  locked_until: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  last_login_user_agent: string | null;
  disabled_at: string | null;
  disabled_by_email: string | null;
  disable_reason: string | null;
  created_at: string;
}

interface LoginHistoryEntry {
  id: number;
  login_at: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason: string | null;
}

function UserDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user: currentUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordHash, setShowPasswordHash] = useState(false);

  const canView = hasPermission('users:view_activity', currentUser?.roles, currentUser?.permissions);
  const isUserSuperAdmin = isSuperAdmin(currentUser?.roles);
  const canEdit = hasPermission('users:edit', currentUser?.roles, currentUser?.permissions);

  useEffect(() => {
    if (authLoading || !id) return;

    if (!canView) {
      showToast('You do not have permission to view user details', 'error');
      router.push('/admin/users');
      return;
    }

    fetchUserDetails();
  }, [authLoading, canView, id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch user details
      const userResponse = await apiClient.get<any>(`/api/users/${id}`);
      setUser(userResponse.user || userResponse);

      // Fetch login history
      try {
        const historyResponse = await apiClient.get<any>(`/api/users/${id}/login-history`);
        setLoginHistory(historyResponse.history || []);
      } catch (error) {
        console.warn('Could not load login history:', error);
      }
    } catch (error: any) {
      console.error('Error fetching user details:', error);
      showToast('Failed to load user details', 'error');
      router.push('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading user details...</div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">User not found</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Details</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Complete information for {user.full_name || user.email}
            </p>
          </div>
          <div className="flex gap-3">
            {canEdit && (
              <Button
                variant="primary"
                onClick={() => router.push(`/admin/users/${id}/edit`)}
              >
                Edit User
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/users')}
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
              <label className="text-sm text-gray-600 dark:text-gray-400">User ID</label>
              <p className="text-gray-900 dark:text-white font-mono">{user.id}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Status</label>
              <div className="mt-1">
                <UserStatusBadge status={user.status} lockedUntil={user.locked_until} />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
              <p className="text-gray-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Full Name</label>
              <p className="text-gray-900 dark:text-white">{user.full_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Created At</label>
              <p className="text-gray-900 dark:text-white">
                {new Date(user.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Failed Login Attempts</label>
              <p className="text-gray-900 dark:text-white">{user.failed_login_count}</p>
            </div>
          </div>
        </Card>

        {/* Password Hash (Super Admin Only) */}
        {isUserSuperAdmin && user.password && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Password Hash (Super Admin Only)</h2>
              <Button
                variant="secondary"
                onClick={() => setShowPasswordHash(!showPasswordHash)}
              >
                {showPasswordHash ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showPasswordHash && (
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
                  {user.password}
                </code>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  ⚠️ This is a bcrypt hash. The original password cannot be recovered.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Roles & Permissions */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Roles & Permissions</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Assigned Roles</label>
              <div className="flex flex-wrap gap-2">
                {user.roles.length > 0 ? (
                  user.roles.map(role => (
                    <span
                      key={role.id}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                    >
                      {role.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">No roles assigned</span>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                Permissions ({user.permissions.length})
              </label>
              <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {user.permissions.map((perm, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-gray-700 dark:text-gray-300 font-mono"
                    >
                      • {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Last Login Info */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Last Login Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Last Login Time</label>
              <p className="text-gray-900 dark:text-white">
                {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">IP Address</label>
              <p className="text-gray-900 dark:text-white font-mono">
                {user.last_login_ip || 'N/A'}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">User Agent</label>
              <p className="text-gray-900 dark:text-white text-sm break-all">
                {user.last_login_user_agent || 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        {/* Disable Information */}
        {user.status === 'disabled' && (
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">
              Account Disabled
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Disabled At</label>
                <p className="text-gray-900 dark:text-white">
                  {user.disabled_at ? new Date(user.disabled_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Disabled By</label>
                <p className="text-gray-900 dark:text-white">
                  {user.disabled_by_email || 'System'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Reason</label>
                <p className="text-gray-900 dark:text-white">
                  {user.disable_reason || 'No reason provided'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Login History */}
        {loginHistory.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold mb-4">Recent Login History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">IP Address</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loginHistory.slice(0, 10).map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {new Date(entry.login_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-mono">
                        {entry.ip_address}
                      </td>
                      <td className="px-4 py-2">
                        {entry.success ? (
                          <span className="text-green-600 dark:text-green-400 text-sm">✓ Success</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 text-sm">
                            ✗ Failed: {entry.failure_reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
export default withPermission(MenuPermissions.Users.View, UserDetailsPage);