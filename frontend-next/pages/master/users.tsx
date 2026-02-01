/**
 * Users Management Page - Professional Enterprise Version
 * Features:
 * - User CRUD with roles assignment
 * - Card-based grid layout with avatar
 * - Status management (enable/disable/unlock)
 * - Search and filter by status/role
 * - Role badges with colors
 * - Activity info (last login, account status)
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from '@/hooks/useTranslation';
import { companyStore } from '@/lib/companyStore';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  LockOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  ClockIcon,
  UserPlusIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  username?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'disabled' | 'locked';
  roles: string[];
  role_ids?: number[];
  last_login_at?: string;
  failed_login_attempts?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

// Role color mapping
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  accountant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  default: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

// Status color mapping
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: <CheckCircleIcon className="w-4 h-4" />, label: 'active' },
  inactive: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: <XCircleIcon className="w-4 h-4" />, label: 'inactive' },
  disabled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: <LockClosedIcon className="w-4 h-4" />, label: 'disabled' },
  locked: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: <ExclamationTriangleIcon className="w-4 h-4" />, label: 'locked' },
};

export default function UsersPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [disableUserId, setDisableUserId] = useState<number | null>(null);
  const [disableReason, setDisableReason] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Reset password form state
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmNewPassword: '',
  });
  const [resetPasswordErrors, setResetPasswordErrors] = useState<Record<string, string>>({});

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'disabled' | 'locked',
    role_ids: [] as number[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Permissions
  const canCreate = hasPermission('users:create');
  const canEdit = hasPermission('users:edit');
  const canDelete = hasPermission('users:delete');
  const canManageStatus = hasPermission('users:manage_status');
  const canAssignRoles = hasPermission('users:assign_roles');
  const canResetPassword = hasPermission('users:edit') || hasPermission('password_requests:approve');

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
    };
  };

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${baseUrl}/api/users?limit=500&page=1`, { headers: authHeaders() }),
        fetch(`${baseUrl}/api/roles?limit=500&page=1`, { headers: authHeaders() }),
      ]);

      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        setUsers(usersJson.data || []);
      }

      if (rolesRes.ok) {
        const rolesJson = await rolesRes.json();
        setRoles(rolesJson.data || []);
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      const matchesRole = roleFilter === 'all' || (u.roles || []).includes(roleFilter);
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  // Get role color
  const getRoleColor = (roleName: string): string => {
    const key = roleName.toLowerCase().replace(/\s+/g, '_');
    return ROLE_COLORS[key] || ROLE_COLORS.default;
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email?.trim()) {
      newErrors.email = t('master.users.validation.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('master.users.validation.invalidEmail');
    }

    if (!formData.full_name?.trim()) {
      newErrors.full_name = t('master.users.validation.required');
    }

    if (!editingUser) {
      if (!formData.password?.trim()) {
        newErrors.password = t('master.users.validation.required');
      } else if (formData.password.length < 8) {
        newErrors.password = t('master.users.validation.passwordLength');
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('master.users.validation.passwordMismatch');
      }
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = t('master.users.validation.passwordLength');
    }

    if (formData.role_ids.length === 0) {
      newErrors.role_ids = t('master.users.validation.roleRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      password: '',
      confirmPassword: '',
      phone: '',
      status: 'active',
      role_ids: [],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = async (user: User) => {
    try {
      // Fetch full user details including role_ids
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/users/${user.id}`, { headers: authHeaders() });
      if (res.ok) {
        const json = await res.json();
        const userData = json.user || json;
        setEditingUser(userData);
        setFormData({
          email: userData.email || '',
          full_name: userData.full_name || '',
          password: '',
          confirmPassword: '',
          phone: userData.phone || '',
          status: userData.status || 'active',
          role_ids: userData.role_ids || [],
        });
      } else {
        setEditingUser(user);
        setFormData({
          email: user.email || '',
          full_name: user.full_name || '',
          password: '',
          confirmPassword: '',
          phone: user.phone || '',
          status: user.status || 'active',
          role_ids: [],
        });
      }
    } catch {
      setEditingUser(user);
      setFormData({
        email: user.email || '',
        full_name: user.full_name || '',
        password: '',
        confirmPassword: '',
        phone: user.phone || '',
        status: user.status || 'active',
        role_ids: [],
      });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const url = editingUser
        ? `${baseUrl}/api/users/${editingUser.id}`
        : `${baseUrl}/api/users`;

      const payload: any = {
        email: formData.email,
        full_name: formData.full_name,
        role_ids: formData.role_ids,
      };

      if (formData.phone) payload.phone = formData.phone;
      if (formData.password) payload.password = formData.password;

      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          editingUser ? t('master.users.messages.updated') : t('master.users.messages.created'),
          'success'
        );
        setIsModalOpen(false);
        await loadData();
      } else {
        const json = await res.json();
        showToast(json.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteUserId) return;
    setSaving(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/users/${deleteUserId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.ok) {
        showToast(t('master.users.messages.deleted'), 'success');
        setDeleteUserId(null);
        await loadData();
      } else {
        const json = await res.json();
        showToast(json.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle disable user
  const handleDisable = async () => {
    if (!disableUserId || !disableReason.trim()) return;
    setSaving(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/users/${disableUserId}/disable`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ reason: disableReason }),
      });

      if (res.ok) {
        showToast(t('master.users.messages.disabled'), 'success');
        setDisableUserId(null);
        setDisableReason('');
        await loadData();
      } else {
        const json = await res.json();
        showToast(json.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle enable user
  const handleEnable = async (userId: number) => {
    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/users/${userId}/enable`, {
        method: 'PATCH',
        headers: authHeaders(),
      });

      if (res.ok) {
        showToast(t('master.users.messages.enabled'), 'success');
        await loadData();
      } else {
        const json = await res.json();
        showToast(json.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle unlock user
  const handleUnlock = async (userId: number) => {
    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/users/${userId}/unlock`, {
        method: 'PATCH',
        headers: authHeaders(),
      });

      if (res.ok) {
        showToast(t('master.users.messages.unlocked'), 'success');
        await loadData();
      } else {
        const json = await res.json();
        showToast(json.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    if (!resetPasswordUserId) return;

    // Validate
    const newErrors: Record<string, string> = {};
    if (!resetPasswordData.newPassword) {
      newErrors.newPassword = t('master.users.validation.required');
    } else if (resetPasswordData.newPassword.length < 8) {
      newErrors.newPassword = t('master.users.validation.passwordLength');
    }
    if (resetPasswordData.newPassword !== resetPasswordData.confirmNewPassword) {
      newErrors.confirmNewPassword = t('master.users.validation.passwordMismatch');
    }
    setResetPasswordErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/users/${resetPasswordUserId}/reset-password`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ password: resetPasswordData.newPassword, must_change_password: true }),
      });

      if (res.ok) {
        showToast(t('master.users.messages.passwordReset'), 'success');
        setResetPasswordUserId(null);
        setResetPasswordData({ newPassword: '', confirmNewPassword: '' });
        setResetPasswordErrors({});
      } else {
        const json = await res.json();
        showToast(json.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle role selection
  const toggleRole = (roleId: number) => {
    setFormData((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  // Get user initials for avatar
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  if (!hasPermission('users:view')) {
    return (
      <MainLayout>
        <div className="p-6 text-center text-red-600">{t('messages.accessDenied')}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{t('master.users.title')} - SLMS</title>
      </Head>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('master.users.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('master.users.subtitle')}
            </p>
          </div>
          {canCreate && (
            <Button onClick={openCreateModal}>
              <UserPlusIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
              {t('master.users.buttons.create')}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="!p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                className="input w-full pl-10 rtl:pr-10 rtl:pl-3"
                placeholder={t('master.users.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              className="input w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('master.users.filters.allStatuses')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
              <option value="disabled">{t('master.users.status.disabled')}</option>
              <option value="locked">{t('master.users.status.locked')}</option>
            </select>

            {/* Role Filter */}
            <select
              className="input w-full"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">{t('master.users.filters.allRoles')}</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{users.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('master.users.stats.total')}</div>
          </Card>
          <Card className="!p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{users.filter((u) => u.status === 'active').length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('master.users.stats.active')}</div>
          </Card>
          <Card className="!p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{users.filter((u) => u.status === 'disabled').length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('master.users.stats.disabled')}</div>
          </Card>
          <Card className="!p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{users.filter((u) => u.status === 'locked').length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('master.users.stats.locked')}</div>
          </Card>
        </div>

        {/* Users Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-3 text-gray-500">{t('common.loading')}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="text-center py-12">
            <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('master.users.noUsers')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('master.users.noUsersHint')}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => {
              const statusConfig = getStatusConfig(user.status);
              return (
                <Card
                  key={user.id}
                  className="!p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg flex-shrink-0">
                      {getInitials(user.full_name || user.email)}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {user.full_name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {t(`master.users.status.${statusConfig.label}`)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <EnvelopeIcon className="w-4 h-4" />
                        <span className="truncate">{user.email}</span>
                      </div>

                      {user.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
                          <PhoneIcon className="w-4 h-4" />
                          <span>{user.phone}</span>
                        </div>
                      )}

                      {/* Roles */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(user.roles || []).map((role) => (
                          <span
                            key={role}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getRoleColor(role)}`}
                          >
                            <ShieldCheckIcon className="w-3 h-3" />
                            {role}
                          </span>
                        ))}
                        {(!user.roles || user.roles.length === 0) && (
                          <span className="text-xs text-gray-400 italic">
                            {t('master.users.noRoles')}
                          </span>
                        )}
                      </div>

                      {/* Last Login */}
                      {user.last_login_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                          <ClockIcon className="w-3 h-3" />
                          {t('master.users.lastLogin')}: {formatDate(user.last_login_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditModal(user)}
                        title={t('common.edit')}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                    )}

                    {canManageStatus && user.status === 'active' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDisableUserId(user.id)}
                        title={t('master.users.actions.disable')}
                      >
                        <LockClosedIcon className="w-4 h-4" />
                      </Button>
                    )}

                    {canManageStatus && user.status === 'disabled' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEnable(user.id)}
                        title={t('master.users.actions.enable')}
                      >
                        <LockOpenIcon className="w-4 h-4" />
                      </Button>
                    )}

                    {canManageStatus && user.status === 'locked' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUnlock(user.id)}
                        title={t('master.users.actions.unlock')}
                      >
                        <LockOpenIcon className="w-4 h-4" />
                      </Button>
                    )}

                    {canResetPassword && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setResetPasswordUserId(user.id)}
                        title={t('master.users.actions.resetPassword')}
                      >
                        <KeyIcon className="w-4 h-4" />
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleteUserId(user.id)}
                        title={t('common.delete')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? t('master.users.editUser') : t('master.users.createUser')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('master.users.fields.email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              required
              disabled={!!editingUser}
            />
            <Input
              label={t('master.users.fields.fullName')}
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              error={errors.full_name}
              required
            />
          </div>

          <Input
            label={t('master.users.fields.phone')}
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password Field with Toggle */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {editingUser ? t('master.users.fields.newPassword') : t('master.users.fields.password')}
                {!editingUser && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input w-full pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? t('master.users.hints.leaveBlank') : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              {editingUser && !errors.password && (
                <p className="text-xs text-gray-500 mt-1">{t('master.users.hints.leaveBlank')}</p>
              )}
            </div>

            {/* Confirm Password Field with Toggle */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('master.users.fields.confirmPassword')}
                {!editingUser && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input w-full pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          {/* Roles Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('master.users.fields.roles')} <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto">
              {roles.length === 0 ? (
                <p className="text-sm text-gray-500">{t('master.users.noRolesAvailable')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        formData.role_ids.includes(role.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.role_ids.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!canAssignRoles && !canEdit}
                      />
                      <span className={`text-sm ${getRoleColor(role.name)} px-2 py-0.5 rounded`}>
                        {role.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {errors.role_ids && (
              <p className="text-sm text-red-500 mt-1">{errors.role_ids}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingUser ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteUserId}
        title={t('common.confirmDelete')}
        message={t('master.users.messages.deleteConfirm')}
        onConfirm={handleDelete}
        onClose={() => setDeleteUserId(null)}
        variant="danger"
        loading={saving}
      />

      {/* Disable User Modal */}
      <Modal
        isOpen={!!disableUserId}
        onClose={() => {
          setDisableUserId(null);
          setDisableReason('');
        }}
        title={t('master.users.disableUser')}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('master.users.messages.disableConfirm')}
          </p>
          <Input
            label={t('master.users.fields.reason')}
            value={disableReason}
            onChange={(e) => setDisableReason(e.target.value)}
            required
            placeholder={t('master.users.placeholders.reason')}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDisableUserId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDisable}
              loading={saving}
              disabled={!disableReason.trim()}
            >
              {t('master.users.actions.disable')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetPasswordUserId}
        onClose={() => {
          setResetPasswordUserId(null);
          setResetPasswordData({ newPassword: '', confirmNewPassword: '' });
          setResetPasswordErrors({});
          setShowNewPassword(false);
          setShowConfirmNewPassword(false);
        }}
        title={t('master.users.resetPasswordTitle')}
      >
        <div className="space-y-4">
          {/* Warning Message */}
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t('master.users.messages.resetPasswordWarning')}
            </p>
          </div>

          {/* New Password Field */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('master.users.fields.newPassword')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                className={`input w-full pr-10 ${resetPasswordErrors.newPassword ? 'border-red-500' : ''}`}
                value={resetPasswordData.newPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                placeholder={t('master.users.placeholders.enterNewPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNewPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {resetPasswordErrors.newPassword && (
              <p className="text-sm text-red-500 mt-1">{resetPasswordErrors.newPassword}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{t('master.users.hints.passwordRequirements')}</p>
          </div>

          {/* Confirm New Password Field */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('master.users.fields.confirmNewPassword')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmNewPassword ? 'text' : 'password'}
                className={`input w-full pr-10 ${resetPasswordErrors.confirmNewPassword ? 'border-red-500' : ''}`}
                value={resetPasswordData.confirmNewPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmNewPassword: e.target.value })}
                placeholder={t('master.users.placeholders.confirmNewPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmNewPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {resetPasswordErrors.confirmNewPassword && (
              <p className="text-sm text-red-500 mt-1">{resetPasswordErrors.confirmNewPassword}</p>
            )}
          </div>

          {/* Must Change Password Note */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            {t('master.users.hints.mustChangePassword')}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => {
                setResetPasswordUserId(null);
                setResetPasswordData({ newPassword: '', confirmNewPassword: '' });
                setResetPasswordErrors({});
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleResetPassword}
              loading={saving}
              disabled={!resetPasswordData.newPassword || !resetPasswordData.confirmNewPassword}
            >
              <KeyIcon className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {t('master.users.actions.resetPassword')}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
