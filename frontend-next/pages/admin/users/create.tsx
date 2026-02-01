/**
 * Create User Page
 * Path: /admin/users/create
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useAuth } from '../../../hooks/useAuth';
import { hasPermission } from '../../../utils/permissionHelpers';
import { apiClient } from '../../../lib/apiClient';
import { useToast } from '../../../contexts/ToastContext';

interface Role {
  id: number;
  name: string;
  permissions: string[];
}

function CreateUserPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role_ids: [] as number[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const canCreate = hasPermission('users:create', user?.roles, user?.permissions);

  useEffect(() => {
    if (authLoading) return;

    if (!canCreate) {
      showToast('You do not have permission to create users', 'error');
      router.push('/admin/users');
      return;
    }

    fetchRoles();
  }, [authLoading, canCreate]);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await apiClient.get<{success: boolean; data: any[]; meta?: any}>('/api/roles');
      setRoles(response.data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showToast('Failed to load roles', 'error');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (formData.role_ids.length === 0) {
      newErrors.role_ids = 'Select at least one role';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/users', {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        role_ids: formData.role_ids,
      });

      showToast('User created successfully', 'success');
      router.push('/admin/users');
    } catch (error: any) {
      console.error('Error creating user:', error);
      const message = error.message || 'Failed to create user';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId: number) => {
    setFormData(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId]
    }));
    setErrors(prev => ({ ...prev, role_ids: '' }));
  };

  if (authLoading || rolesLoading) {
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New User</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Add a new user to the system
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => router.push('/admin/users')}
          >
            ← Back
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setErrors({ ...errors, email: '' });
                }}
                error={errors.email}
                placeholder="user@example.com"
              />

              <Input
                label="Full Name"
                required
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value });
                  setErrors({ ...errors, full_name: '' });
                }}
                error={errors.full_name}
                placeholder="John Doe"
              />

              <Input
                label="Password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setErrors({ ...errors, password: '' });
                }}
                error={errors.password}
                placeholder="Minimum 8 characters"
              />

              <Input
                label="Confirm Password"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  setErrors({ ...errors, confirmPassword: '' });
                }}
                error={errors.confirmPassword}
                placeholder="Re-enter password"
              />
            </div>
          </Card>

          {/* Roles */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Assign Roles</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formData.role_ids.length} selected
              </span>
            </div>

            {errors.role_ids && (
              <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                {errors.role_ids}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={formData.role_ids.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {role.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {(role.permissions?.length || (role as any).permission_count || 0)} permissions
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/users')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Users.Create, CreateUserPage);
