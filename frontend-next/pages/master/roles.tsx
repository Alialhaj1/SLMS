import React, { useState, useEffect } from 'react';
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
import { PlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon, UsersIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  user_count?: number;
  permission_count?: number;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function RolesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRoles();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/roles`, {
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
        ? `${API_BASE_URL}/api/roles/${editingId}`
        : `${API_BASE_URL}/api/roles`;

      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        permissions: editingId ? formData.permissions : [], // New roles start with no permissions
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
      const response = await fetch(`${API_BASE_URL}/api/roles/${deleteId}`, {
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
            <Button variant="secondary" onClick={fetchRoles} disabled={loading}>
              {t('common.refresh')}
            </Button>
            {hasPermission('roles:create') && (
              <Button onClick={openCreateModal}>
                <PlusIcon className="w-5 h-5 mr-1" />
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
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                        {role.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
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
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>{role.permissions?.length || role.permission_count || 0} {t('common.permissions') || 'permissions'}</span>
                    </div>
                    {role.user_count !== undefined && (
                      <div className="flex items-center gap-1">
                        <UsersIcon className="w-4 h-4" />
                        <span>{role.user_count} {t('common.users') || 'users'}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {hasPermission('roles:edit') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => navigateToPermissionMatrix(role.id)}
                    >
                      <ShieldCheckIcon className="w-4 h-4 mr-1" />
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

          {!editingId && (
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
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Roles.View, RolesPage);
