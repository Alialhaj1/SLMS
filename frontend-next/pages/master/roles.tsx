import React, { useState, useEffect, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Card from '@/components/ui/Card';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from '@/hooks/useTranslation';
import { companyStore } from '@/lib/companyStore';
import { useTenantInfo } from '@/hooks/useTenantInfo';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  ArrowPathIcon,
  EyeIcon,
  PlayIcon,
  Square2StackIcon,
  ClipboardDocumentIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  company_id?: number;
  company_name?: string;
  tenant_id?: number | null;
  tenant_name?: string | null;
  user_count?: number;
  permission_count?: number;
  created_at: string;
}

interface RoleTemplate {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  category: string;
  permission_count: number;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

function RolesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  const { isTenantUser } = useTenantInfo();

  // *** CRITICAL: Tenant users use /api/tenant-roles, platform admins use /api/roles ***
  const rolesBase = isTenantUser ? `${API_BASE_URL}/tenant-roles` : `${API_BASE_URL}/roles`;

  const [roles, setRoles] = useState<Role[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSourceRole, setCloneSourceRole] = useState<Role | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [cloneFormData, setCloneFormData] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRoles();
    fetchTemplates();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
    };
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch(rolesBase, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.data || []);
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles/templates`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      // Templates are optional — fail silently
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = t('master.roles.validation.required') || 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = t('master.roles.validation.nameLength') || 'Name must be at least 2 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = editingId
        ? `${rolesBase}/${editingId}`
        : rolesBase;

      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        permissions: editingId ? formData.permissions : (formData.permissions.length > 0 ? formData.permissions : []),
      };

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        if (editingId) {
          setRoles(roles.map((r) => (r.id === editingId ? (result.role || result.data) : r)));
          showToast(t('master.roles.messages.updated') || 'Role updated successfully', 'success');
        } else {
          setRoles([...roles, result.role || result.data]);
          showToast(t('master.roles.messages.created') || 'Role created successfully', 'success');
        }
        closeModal();
      } else {
        const err = await response.json().catch(() => ({}));
        const errorMessage = err.error || err.message || t('messages.error');
        showToast(errorMessage, 'error');
        
        // Handle specific validation errors
        if (err.error === 'Role name already exists') {
          setErrors({ name: t('master.roles.validation.nameExists') || 'Role name already exists' });
        }
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const response = await fetch(`${rolesBase}/${deleteId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (response.ok) {
        setRoles(roles.filter((r) => r.id !== deleteId));
        showToast(t('master.roles.messages.deleted') || 'Role deleted successfully', 'success');
        setDeleteId(null);
      } else {
        const err = await response.json().catch(() => ({}));
        let errorMessage = err.error || err.message || t('messages.error');
        
        // Handle specific error: role has users assigned
        if (response.status === 409 || errorMessage.includes('assigned users') || errorMessage.includes('Cannot delete')) {
          errorMessage = t('master.roles.messages.cannotDeleteWithUsers') || 'Cannot delete role with assigned users. Please remove all users from this role first.';
        }
        
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', description: '', permissions: [] });
    setErrors({});
  };

  // ── Clone Role ──
  const openCloneModal = (role: Role) => {
    setCloneSourceRole(role);
    setCloneFormData({ name: `${role.name} (Copy)`, description: `Cloned from ${role.name}` });
    setShowCloneModal(true);
  };

  const handleClone = async () => {
    if (!cloneSourceRole || !cloneFormData.name.trim()) return;
    setCloning(true);
    try {
      const response = await fetch(`${rolesBase}/${cloneSourceRole.id}/clone`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: cloneFormData.name.trim(),
          description: cloneFormData.description?.trim() || null,
        }),
      });
      if (response.ok) {
        showToast(t('master.roles.messages.cloned') || 'Role cloned successfully', 'success');
        setShowCloneModal(false);
        setCloneSourceRole(null);
        fetchRoles();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setCloning(false);
    }
  };

  // ── Create from Template ──
  const createFromTemplate = async (template: RoleTemplate) => {
    setShowTemplatesModal(false);
    setFormData({
      name: template.name,
      description: template.description,
      permissions: template.permissions || [],
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setEditingId(role.id);
    setErrors({});
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', permissions: [] });
    setErrors({});
    setIsModalOpen(true);
  };

  const navigateToPermissionMatrix = (roleId: number) => {
    router.push(`/admin/permission-matrix?role=${roleId}`);
  };

  if (!hasPermission('roles:view')) {
    return (
      <MainLayout>
        <div className="p-6 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-red-600">{t('messages.accessDenied')}</h2>
        </div>
      </MainLayout>
    );
  }

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: Role) => {
    if (role.name.toLowerCase().includes('super') || role.name.toLowerCase().includes('admin')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    }
    if (role.name.toLowerCase().includes('manager')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <MainLayout>
      <Head><title>{t('master.roles.title')} - SLMS</title></Head>
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('master.roles.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('master.roles.subtitle') || 'Manage system roles and their permissions'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => { fetchRoles(); fetchTemplates(); }} disabled={loading}>
              <ArrowPathIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
              {t('common.refresh')}
            </Button>
            {templates.length > 0 && hasPermission('roles:create') && (
              <Button variant="secondary" onClick={() => setShowTemplatesModal(true)}>
                <SparklesIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                {t('admin.roles.fromTemplate') || 'From Template'}
              </Button>
            )}
            {hasPermission('roles:create') && (
              <Button onClick={openCreateModal}>
                <PlusIcon className="w-5 h-5 ltr:mr-1 rtl:ml-1" />
                {t('master.roles.buttons.create') || 'Create Role'}
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <Card className="!p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search') || 'Search roles...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
        </Card>

        {/* Roles Grid */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-gray-500">{t('common.loading')}</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('common.noData') || 'No roles found'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? (t('common.tryDifferentSearch') || 'Try a different search term') : (t('master.roles.noRolesHint') || 'Create your first role to get started')}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role) => (
              <Card key={role.id} className="hover:shadow-lg transition-shadow">
                <div className="p-4">
                  {/* Role Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                        {role.name}
                      </span>
                      {/* Company Scope Badge */}
                      {role.tenant_name ? (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                            <BuildingOfficeIcon className="w-3 h-3" />
                            {role.tenant_name}
                          </span>
                        </div>
                      ) : role.company_name ? (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                            <BuildingOfficeIcon className="w-3 h-3" />
                            {role.company_name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                            <GlobeAltIcon className="w-3 h-3" />
                            {t('master.roles.globalRole') || 'Global'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {hasPermission('roles:create') && role.name.toLowerCase() !== 'super_admin' && (
                        <button
                          onClick={() => openCloneModal(role)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                          title={t('admin.roles.clone') || 'Clone Role'}
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('roles:edit') && (
                        <button
                          onClick={() => openEditModal(role)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('roles:delete') && role.name.toLowerCase() !== 'super_admin' && (
                        <button
                          onClick={() => setDeleteId(role.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 min-h-[2.5rem]">
                    {role.description || t('common.noDescription') || 'No description'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheckIcon className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{role.permissions?.length || role.permission_count || 0}</span>
                      <span className="hidden sm:inline">{t('common.permissions') || 'permissions'}</span>
                    </div>
                    {role.user_count !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <UsersIcon className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{role.user_count}</span>
                        <span className="hidden sm:inline">{t('common.users') || 'users'}</span>
                      </div>
                    )}
                  </div>

                  {/* Permission progress bar */}
                  {(role.permissions?.length || 0) > 0 && (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((role.permissions?.length || 0) / Math.max(1, roles.reduce((max, r) => Math.max(max, r.permissions?.length || 0), 1))) * 100)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {hasPermission('roles:edit') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => navigateToPermissionMatrix(role.id)}
                    >
                      <ShieldCheckIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                      {t('master.roles.managePermissions') || 'Manage Permissions'}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? (t('master.roles.editRole') || 'Edit Role') : (t('master.roles.createRole') || 'Create Role')}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t('master.roles.fields.name') || 'Role Name'}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder={t('master.roles.placeholders.name') || 'Enter role name'}
            required
          />
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              {t('master.roles.fields.description') || 'Description'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              rows={3}
              placeholder={t('master.roles.placeholders.description') || 'Enter role description (optional)'}
            />
          </div>

          {!editingId && formData.permissions.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
              <p>✨ {t('master.roles.hints.templatePermissions') || `${formData.permissions.length} permissions from template will be applied.`}</p>
            </div>
          )}

          {!editingId && formData.permissions.length === 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <p>💡 {t('master.roles.hints.permissionsLater') || 'You can assign permissions after creating the role using the Permission Matrix.'}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingId ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title={t('master.roles.confirmDelete') || 'Delete Role'}
        message={t('master.roles.messages.deleteConfirm') || 'Are you sure you want to delete this role? This action cannot be undone.'}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        variant="danger"
        loading={deleting}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />

      {/* Clone Modal */}
      <Modal
        isOpen={showCloneModal}
        onClose={() => { setShowCloneModal(false); setCloneSourceRole(null); }}
        title={t('admin.roles.cloneRole') || 'Clone Role'}
        size="md"
      >
        <div className="space-y-4">
          {cloneSourceRole && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <DocumentDuplicateIcon className="w-5 h-5" />
                <span>{t('admin.roles.cloningFrom') || 'Cloning from'}: <strong>{cloneSourceRole.name}</strong></span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {cloneSourceRole.permissions?.length || 0} {t('common.permissions') || 'permissions'} {t('admin.roles.willBeCopied') || 'will be copied'}
              </p>
            </div>
          )}
          <Input
            label={t('master.roles.fields.name') || 'Role Name'}
            value={cloneFormData.name}
            onChange={(e) => setCloneFormData({ ...cloneFormData, name: e.target.value })}
            placeholder={t('master.roles.placeholders.cloneName') || 'Enter name for cloned role'}
            required
          />
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              {t('master.roles.fields.description') || 'Description'}
            </label>
            <textarea
              value={cloneFormData.description}
              onChange={(e) => setCloneFormData({ ...cloneFormData, description: e.target.value })}
              className="input w-full"
              rows={2}
              placeholder={t('master.roles.placeholders.description') || 'Description (optional)'}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
            <Button variant="secondary" onClick={() => setShowCloneModal(false)} disabled={cloning}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleClone} loading={cloning} disabled={!cloneFormData.name.trim()}>
              <DocumentDuplicateIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
              {t('admin.roles.clone') || 'Clone'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Templates Modal */}
      <Modal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        title={t('admin.roles.templates') || 'Role Templates'}
        size="lg"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {templates.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t('common.noTemplates') || 'No templates available'}</p>
          ) : templates.map(tmpl => (
            <div key={tmpl.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">{tmpl.name}</h4>
                  {tmpl.category && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 mt-1 inline-block">
                      {tmpl.category}
                    </span>
                  )}
                </div>
                <Button size="sm" onClick={() => createFromTemplate(tmpl)}>
                  <PlayIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" /> {t('common.use') || 'Use'}
                </Button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tmpl.description}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span>{tmpl.permission_count || tmpl.permissions?.length || 0} {t('common.permissions') || 'permissions'}</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Roles.View, RolesPage);
