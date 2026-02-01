/**
 * Role Templates Page
 * Phase 4B Feature 1: Display and use role templates for quick role creation
 * Path: /admin/roles/templates
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { hasPermission } from '../../../utils/permissionHelpers';
import { apiClient } from '../../../lib/apiClient';
import { useToast } from '../../../contexts/ToastContext';

interface RoleTemplate {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  category: string;
  is_system: boolean;
  permission_count: number;
  created_at: string;
}

function RoleTemplatesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);
  const [roleName, setRoleName] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Permission check
  const canViewRoles = hasPermission('roles:view', user?.roles, user?.permissions);
  const canCreateRoles = hasPermission('roles:create', user?.roles, user?.permissions);

  useEffect(() => {
    if (authLoading) return;

    if (!canViewRoles) {
      showToast('You do not have permission to view roles', 'error');
      router.push('/dashboard');
      return;
    }
    fetchTemplates();
  }, [authLoading, canViewRoles]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<any>('/api/roles/templates');
      setTemplates(response.templates || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      showToast('Failed to load role templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: RoleTemplate) => {
    if (!canCreateRoles) {
      showToast('You do not have permission to create roles', 'error');
      return;
    }
    setSelectedTemplate(template);
    setRoleName(`${template.name} - Copy`);
    setShowModal(true);
  };

  const handleCreateRole = async () => {
    if (!roleName.trim()) {
      showToast('Please enter a role name', 'error');
      return;
    }

    try {
      setCreatingRole(true);
      await apiClient.post('/api/roles/from-template', {
        template_id: selectedTemplate!.id,
        role_name: roleName.trim(),
        company_id: (user as any)?.company_id || null
      });

      showToast('Role created successfully from template', 'success');
      setShowModal(false);
      setSelectedTemplate(null);
      setRoleName('');
      
      // Redirect to roles list
      router.push('/admin/roles');
    } catch (error: any) {
      console.error('Error creating role:', error);
      const message = error.response?.data?.error || 'Failed to create role';
      showToast(message, 'error');
    } finally {
      setCreatingRole(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'administrative': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'operational': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'financial': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'readonly': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading templates...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Role Templates</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Quick start with predefined role templates
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => router.push('/admin/roles')}
          >
            View All Roles
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 min-h-[60px]">
                  {template.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{template.permission_count} permissions</span>
                  </div>
                  {template.is_system && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-blue-600 dark:text-blue-400">System</span>
                    </div>
                  )}
                </div>

                {/* Permissions Preview */}
                <div className="border-t dark:border-gray-700 pt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sample permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.permissions.slice(0, 3).map((perm, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {perm}
                      </span>
                    ))}
                    {template.permissions.length > 3 && (
                      <span className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400">
                        +{template.permissions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => handleSelectTemplate(template)}
                  disabled={!canCreateRoles}
                  className="w-full"
                  variant="primary"
                >
                  Use This Template
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No role templates available</p>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Create Role from Template
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Template: {selectedTemplate.name}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Role Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Role Name *
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Enter role name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Permissions Preview */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Included Permissions ({selectedTemplate.permission_count}):
              </p>
              <div className="border dark:border-gray-700 rounded-md p-3 max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.permissions.map((perm, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                You can edit permissions after creating the role
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={creatingRole}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateRole}
                disabled={creatingRole || !roleName.trim()}
              >
                {creatingRole ? 'Creating...' : 'Create Role'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Roles.View, RoleTemplatesPage);
