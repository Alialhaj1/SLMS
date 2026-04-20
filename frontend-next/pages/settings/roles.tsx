import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withAnyPermission } from '../../utils/withPermission';
import PermissionMatrix, { PermissionModule } from '../../components/settings/PermissionMatrix';
import Tabs from '../../components/ui/Tabs';
import {
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  KeyIcon,
  DocumentDuplicateIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

interface Role {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  permission_count?: number;
  user_count?: number;
  is_system?: boolean;
  role_type?: string;
  created_at?: string;
  tenant_id?: number | null;
  module_gates?: string[];
}

interface Permission {
  id: number;
  permission_code: string;
  resource: string;
  action: string;
  description?: string;
}

function RolesSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '' });
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // New: Grouped permissions for matrix
  const [groupedPermissions, setGroupedPermissions] = useState<PermissionModule[]>([]);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [permissionTab, setPermissionTab] = useState('matrix');

  // Clone
  const [showClone, setShowClone] = useState(false);
  const [cloneRole, setCloneRole] = useState<Role | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneDisplayName, setCloneDisplayName] = useState('');
  const [cloning, setCloning] = useState(false);

  // Compare
  const [showCompare, setShowCompare] = useState(false);
  const [compareRoleA, setCompareRoleA] = useState<Role | null>(null);
  const [compareRoleB, setCompareRoleB] = useState<Role | null>(null);
  const [comparePermsA, setComparePermsA] = useState<string[]>([]);
  const [comparePermsB, setComparePermsB] = useState<string[]>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Module Gates
  const [allModules, setAllModules] = useState<{ code: string; name: string; category: string; is_core: boolean }[]>([]);
  const [roleModuleGates, setRoleModuleGates] = useState<string[]>([]);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tenant-roles`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setRoles(data.data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      showToast('error', 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, showToast]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const fetchPermissions = useCallback(async () => {
    setLoadingPermissions(true);
    try {
      // Fetch grouped permissions for matrix view
      const [flatRes, groupedRes] = await Promise.all([
        fetch(`${API_BASE}/tenant-roles/permissions?module_filter=enabled&grouped=false`, { headers: authHeaders() }),
        fetch(`${API_BASE}/tenant-roles/permissions?module_filter=enabled&grouped=true`, { headers: authHeaders() }),
      ]);
      if (!flatRes.ok) throw new Error('Failed to fetch permissions');
      const flatData = await flatRes.json();
      setAllPermissions(flatData.data || []);

      if (groupedRes.ok) {
        const groupedData = await groupedRes.json();
        setGroupedPermissions(groupedData.data || []);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    } finally {
      setLoadingPermissions(false);
    }
  }, [authHeaders]);

  const fetchRolePermissions = useCallback(async (roleId: number) => {
    try {
      const res = await fetch(`${API_BASE}/tenant-roles/${roleId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch role');
      const data = await res.json();
      const role = data.data || data.role || data;
      const perms = role.permissions || [];
      setRolePermissions(perms.map((p: any) => typeof p === 'string' ? p : p.permission_code));
    } catch (err) {
      console.error('Error fetching role permissions:', err);
      setRolePermissions([]);
    }
  }, [authHeaders]);

  const validateCreate = () => {
    const e: Record<string, string> = {};
    if (!newRole.name.trim()) e.name = t('common.required') || 'Required';
    else if (!/^[a-z][a-z0-9_]*$/.test(newRole.name)) e.name = 'Must start with letter, only lowercase, numbers, underscores';
    if (!newRole.display_name.trim()) e.display_name = t('common.required') || 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/tenant-roles`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: newRole.name.trim(),
          name_en: newRole.display_name.trim(),
          description: newRole.description.trim(),
          permissions: [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error?.message || 'Failed to create role');
      }
      showToast('success', t('common.created') || 'Role created successfully');
      setNewRole({ name: '', display_name: '', description: '' });
      setShowCreate(false);
      setErrors({});
      fetchRoles();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/tenant-roles/${selectedRole.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ reason: 'Deleted by tenant admin' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error?.message || 'Failed to delete role');
      }
      showToast('success', t('common.deleted') || 'Role deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  };

  const openPermissions = async (role: Role) => {
    setSelectedRole(role);
    setShowPermissions(true);
    setPermissionTab('matrix');
    await Promise.all([fetchPermissions(), fetchRolePermissions(role.id)]);
    // Fetch modules for module gates tab
    try {
      const res = await fetch(`${API_BASE}/modules`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const mods = (data.data || data || []).map((m: any) => ({
          code: m.code || m.module_code,
          name: m.name || m.module_name,
          category: m.category || '',
          is_core: m.is_core || false,
        }));
        setAllModules(mods);
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
    // Fetch role module_gates
    try {
      const res = await fetch(`${API_BASE}/tenant-roles/${role.id}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const gates = data.data?.module_gates || data.role?.module_gates || [];
        setRoleModuleGates(gates);
      }
    } catch (err) {
      console.error('Error fetching role module gates:', err);
      setRoleModuleGates([]);
    }
  };

  const togglePermission = (code: string) => {
    setRolePermissions(prev =>
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/tenant-roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: selectedRole.name,
          permissions: rolePermissions,
          module_gates: roleModuleGates,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error?.message || 'Failed to update permissions');
      }
      showToast('success', t('common.saved') || 'Permissions updated');
      setShowPermissions(false);
      fetchRoles();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // ── Clone Role ──
  const handleClone = async () => {
    if (!cloneRole || !cloneName.trim()) return;
    setCloning(true);
    try {
      const res = await fetch(`${API_BASE}/tenant-roles/${cloneRole.id}/clone`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: cloneName.trim(),
          name_en: cloneDisplayName.trim() || cloneName.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error?.message || 'Failed to clone role');
      }
      showToast('success', t('settings.roles.cloned') || 'Role cloned successfully');
      setShowClone(false);
      setCloneRole(null);
      setCloneName('');
      setCloneDisplayName('');
      fetchRoles();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to clone role');
    } finally {
      setCloning(false);
    }
  };

  const openClone = (role: Role) => {
    setCloneRole(role);
    setCloneName(role.name + '_copy');
    setCloneDisplayName((role.display_name || role.name) + ' (Copy)');
    setShowClone(true);
  };

  // ── Compare Roles ──
  const openCompare = async (roleA: Role, roleB: Role) => {
    setCompareRoleA(roleA);
    setCompareRoleB(roleB);
    setShowCompare(true);
    setLoadingCompare(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`${API_BASE}/tenant-roles/${roleA.id}`, { headers: authHeaders() }),
        fetch(`${API_BASE}/tenant-roles/${roleB.id}`, { headers: authHeaders() }),
      ]);
      const dataA = await resA.json();
      const dataB = await resB.json();
      const permsA = (dataA.data?.permissions || dataA.role?.permissions || []).map((p: any) => typeof p === 'string' ? p : p.permission_code);
      const permsB = (dataB.data?.permissions || dataB.role?.permissions || []).map((p: any) => typeof p === 'string' ? p : p.permission_code);
      setComparePermsA(permsA);
      setComparePermsB(permsB);
    } catch (err) {
      showToast('error', 'Failed to load role permissions for comparison');
      setShowCompare(false);
    } finally {
      setLoadingCompare(false);
    }
  };

  // ── Compare data derived ──
  const compareData = useMemo(() => {
    if (!showCompare) return { onlyA: [], onlyB: [], both: [] };
    const setA = new Set(comparePermsA);
    const setB = new Set(comparePermsB);
    const all = new Set([...comparePermsA, ...comparePermsB]);
    const onlyA: string[] = [];
    const onlyB: string[] = [];
    const both: string[] = [];
    for (const code of all) {
      if (setA.has(code) && setB.has(code)) both.push(code);
      else if (setA.has(code)) onlyA.push(code);
      else onlyB.push(code);
    }
    return { onlyA: onlyA.sort(), onlyB: onlyB.sort(), both: both.sort() };
  }, [showCompare, comparePermsA, comparePermsB]);

  const permissionsByResource = allPermissions.reduce((acc, p) => {
    const resource = p.resource || (p.permission_code ? p.permission_code.split(':')[0] : 'unknown');
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filtered = roles.filter(r => {
    // Hide system roles from tenant view — tenants only see their own custom roles
    if (r.is_system) return false;
    const q = search.toLowerCase();
    return (r.display_name || r.name || '').toLowerCase().includes(q) ||
           (r.name || '').toLowerCase().includes(q) ||
           (r.description || '').toLowerCase().includes(q);
  });

  return (
    <MainLayout>
      <Head><title>{t('settings.roles.title') || 'Role Management'} - SLMS</title></Head>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.roles.title') || 'Role Management'}</h1>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t('settings.roles.subtitle') || 'Manage roles and their associated permissions for your organization.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {roles.length >= 2 && (
              <CompareSelector roles={roles} onCompare={openCompare} t={t} />
            )}
            <button
              onClick={() => { setShowCreate(true); setErrors({}); setNewRole({ name: '', display_name: '', description: '' }); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              {t('settings.roles.createRole') || 'Create Role'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('common.search') || 'Search roles...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Roles Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow">
            <ShieldCheckIcon className="mx-auto w-12 h-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">{search ? (t('common.noResults') || 'No roles match your search.') : (t('common.empty') || 'No roles found. Create one to get started.')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.roles.roleName') || 'Role'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">{t('common.description') || 'Description'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">
                    <span className="hidden sm:inline">{t('settings.roles.title') || 'Permissions'}</span>
                    <KeyIcon className="w-4 h-4 mx-auto sm:hidden" />
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">
                    <span className="hidden sm:inline">{t('settings.roles.users') || 'Users'}</span>
                    <UsersIcon className="w-4 h-4 mx-auto sm:hidden" />
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('common.type') || 'Type'}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(role => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{role.display_name || role.name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{role.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate hidden md:table-cell">{role.description || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{role.permission_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{role.user_count ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        role.is_system
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {role.is_system ? (t('settings.roles.system') || 'System') : (t('common.custom') || 'Custom')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPermissions(role)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium transition-colors"
                          title={t('settings.roles.permissionsUpdated') || 'Manage Permissions'}
                        >
                          <KeyIcon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('settings.roles.title') || 'Permissions'}</span>
                        </button>
                        <button
                          onClick={() => openClone(role)}
                          className="inline-flex items-center gap-1 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 text-xs transition-colors"
                          title={t('settings.roles.clone') || 'Clone Role'}
                        >
                          <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">{t('settings.roles.clone') || 'Clone'}</span>
                        </button>
                        {!role.is_system && (
                          <button
                            onClick={() => { setSelectedRole(role); setShowDeleteConfirm(true); }}
                            className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 text-xs transition-colors"
                            title={t('common.delete') || 'Delete'}
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('common.delete') || 'Delete'}</span>
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

        {/* Summary */}
        {!loading && (
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{t('common.total') || 'Total'}: {roles.length} {t('settings.roles.title') || 'roles'}</span>
            <span>•</span>
            <span>{t('settings.roles.system') || 'System'}: {roles.filter(r => r.is_system).length}</span>
            <span>•</span>
            <span>{t('common.custom') || 'Custom'}: {roles.filter(r => !r.is_system).length}</span>
          </div>
        )}

        {/* Create Role Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 animate-modal-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <PlusIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.roles.createRole') || 'Create New Role'}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.roles.roleName') || 'Role Name (key)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newRole.name}
                    onChange={e => {
                      setNewRole(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') }));
                      if (errors.name) setErrors(p => { const n = { ...p }; delete n.name; return n; });
                    }}
                    placeholder="e.g. quality_inspector"
                    className={`w-full rounded-lg border ${errors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.roles.roleNameAr') || 'Display Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newRole.display_name}
                    onChange={e => {
                      setNewRole(p => ({ ...p, display_name: e.target.value }));
                      if (errors.display_name) setErrors(p => { const n = { ...p }; delete n.display_name; return n; });
                    }}
                    placeholder="e.g. Quality Inspector"
                    className={`w-full rounded-lg border ${errors.display_name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.display_name && <p className="text-xs text-red-500 mt-1">{errors.display_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.description') || 'Description'}</label>
                  <textarea
                    value={newRole.description}
                    onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    placeholder={t('settings.roles.description') || 'Brief description of this role...'}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => { setShowCreate(false); setErrors({}); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors">{t('common.cancel') || 'Cancel'}</button>
                <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors">
                  {creating ? (t('common.creating') || 'Creating...') : (t('common.create') || 'Create')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedRole && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto space-y-4 animate-modal-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('common.confirmDelete') || 'Delete Role'}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.roles.deleteMessage') || 'Are you sure you want to delete the role'}{' '}
                <strong className="text-gray-900 dark:text-white">{selectedRole.display_name || selectedRole.name}</strong>?{' '}
                {t('common.actionCannotBeUndone') || 'This action cannot be undone.'}
              </p>
              {(selectedRole.user_count ?? 0) > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    {t('settings.roles.systemRoleWarning') || 'This role has'} {selectedRole.user_count} {t('settings.roles.users') || 'assigned users. They must be reassigned first.'}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => { setShowDeleteConfirm(false); setSelectedRole(null); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 transition-colors">{t('common.cancel') || 'Cancel'}</button>
                <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors">
                  {deleting ? (t('common.deleting') || 'Deleting...') : (t('common.delete') || 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permissions Assignment Modal — Full-width with Matrix */}
        {showPermissions && selectedRole && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPermissions(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-[95vw] xl:max-w-7xl max-h-[90vh] flex flex-col animate-modal-in" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <KeyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.roles.selectRole') || 'Manage Permissions'}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedRole.display_name || selectedRole.name}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {rolePermissions.length} {t('common.selected') || 'selected'}
                </span>
              </div>

              {/* Tabs: Matrix / List View */}
              <div className="px-5 pt-3 flex-shrink-0">
                <Tabs
                  tabs={[
                    { id: 'matrix', label: t('settings.roles.matrixView') || 'Matrix View' },
                    { id: 'list', label: t('settings.roles.listView') || 'List View' },
                    { id: 'gates', label: t('settings.roles.moduleGates') || 'Module Gates', badge: roleModuleGates.includes('*') ? '∞' : String(roleModuleGates.length) },
                  ]}
                  activeTab={permissionTab}
                  onTabChange={setPermissionTab}
                  variant="pills"
                  size="sm"
                />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {permissionTab === 'matrix' ? (
                  <PermissionMatrix
                    modules={groupedPermissions}
                    selected={rolePermissions}
                    onChange={setRolePermissions}
                    disabledModules={disabledModules}
                    loading={loadingPermissions}
                  />
                ) : permissionTab === 'list' ? (
                  /* Legacy list view */
                  <div className="space-y-6">
                    {loadingPermissions ? (
                      <div className="space-y-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
                    ) : Object.keys(permissionsByResource).length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('common.noPermissions') || 'No permissions available.'}</p>
                    ) : (
                      Object.entries(permissionsByResource).sort(([a], [b]) => a.localeCompare(b)).map(([resource, perms]) => (
                        <div key={resource} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">{resource.replace(/_/g, ' ')}</h4>
                            <button
                              onClick={() => {
                                const resourceCodes = perms.map(p => p.permission_code);
                                const allSelected = resourceCodes.every(c => rolePermissions.includes(c));
                                if (allSelected) {
                                  setRolePermissions(prev => prev.filter(p => !resourceCodes.includes(p)));
                                } else {
                                  setRolePermissions(prev => [...new Set([...prev, ...resourceCodes])]);
                                }
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {perms.every(p => rolePermissions.includes(p.permission_code)) ? (t('common.deselectAll') || 'Deselect All') : (t('common.selectAll') || 'Select All')}
                            </button>
                          </div>
                          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {perms.sort((a, b) => a.action.localeCompare(b.action)).map(perm => (
                              <label key={perm.permission_code} className="flex items-start gap-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={rolePermissions.includes(perm.permission_code)}
                                  onChange={() => togglePermission(perm.permission_code)}
                                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{perm.action.replace(/_/g, ' ')}</span>
                                  <span className="block text-[10px] text-gray-400 font-mono">{perm.permission_code}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Module Gates tab */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.roles.moduleGatesDescription') || 'Select which modules users with this role can access. Users will only see menu items for allowed modules.'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRoleModuleGates(['*'])}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            roleModuleGates.includes('*')
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {t('settings.roles.allModules') || 'All Modules (*)'}
                        </button>
                        <button
                          onClick={() => setRoleModuleGates([])}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          {t('common.clearAll') || 'Clear'}
                        </button>
                      </div>
                    </div>

                    {/* All Modules indicator */}
                    {roleModuleGates.includes('*') && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                        <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                          {t('settings.roles.allModulesEnabled') || 'This role has access to ALL modules, including future modules.'}
                        </p>
                      </div>
                    )}

                    {/* Module checkboxes */}
                    {!roleModuleGates.includes('*') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allModules.map(mod => {
                          const isSelected = roleModuleGates.includes(mod.code);
                          return (
                            <label
                              key={mod.code}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setRoleModuleGates(prev => prev.filter(g => g !== mod.code));
                                  } else {
                                    setRoleModuleGates(prev => [...prev, mod.code]);
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{mod.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{mod.code}</p>
                              </div>
                              {mod.is_core && (
                                <span className="px-1.5 py-0.5 text-[9px] rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                                  CORE
                                </span>
                              )}
                            </label>
                          );
                        })}
                        {allModules.length === 0 && (
                          <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                            {t('common.noModules') || 'No modules available.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                <button onClick={() => setRolePermissions([])} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">{t('common.clearAll') || 'Clear All'}</button>
                <div className="flex gap-3">
                  <button onClick={() => setShowPermissions(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 transition-colors">{t('common.cancel') || 'Cancel'}</button>
                  <button onClick={savePermissions} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors">
                    {saving ? (t('common.saving') || 'Saving...') : (t('common.saveChanges') || 'Save Changes')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clone Role Modal */}
        {showClone && cloneRole && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowClone(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 animate-modal-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DocumentDuplicateIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.roles.cloneRole') || 'Clone Role'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.roles.cloneFrom') || 'From'}: {cloneRole.display_name || cloneRole.name}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.roles.roleName') || 'Role Name (key)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={cloneName}
                    onChange={e => setCloneName(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.roles.roleNameAr') || 'Display Name'}
                  </label>
                  <input
                    value={cloneDisplayName}
                    onChange={e => setCloneDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => { setShowClone(false); setCloneRole(null); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 transition-colors">{t('common.cancel') || 'Cancel'}</button>
                <button onClick={handleClone} disabled={cloning || !cloneName.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors">
                  {cloning ? (t('common.cloning') || 'Cloning...') : (t('settings.roles.clone') || 'Clone')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare Roles Modal */}
        {showCompare && compareRoleA && compareRoleB && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCompare(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-modal-in" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <ArrowsRightLeftIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.roles.compareRoles') || 'Compare Roles'}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {compareRoleA.display_name || compareRoleA.name} vs {compareRoleB.display_name || compareRoleB.name}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowCompare(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {loadingCompare ? (
                  <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />)}</div>
                ) : (
                  <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{compareData.both.length}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.roles.shared') || 'Shared Permissions'}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{compareData.onlyA.length}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t('settings.roles.onlyIn') || 'Only in'} {compareRoleA.display_name || compareRoleA.name}
                        </p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{compareData.onlyB.length}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t('settings.roles.onlyIn') || 'Only in'} {compareRoleB.display_name || compareRoleB.name}
                        </p>
                      </div>
                    </div>

                    {/* Differences */}
                    {compareData.onlyA.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                          {t('settings.roles.onlyIn') || 'Only in'} {compareRoleA.display_name || compareRoleA.name}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {compareData.onlyA.map(code => (
                            <span key={code} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">{code}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {compareData.onlyB.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">
                          {t('settings.roles.onlyIn') || 'Only in'} {compareRoleB.display_name || compareRoleB.name}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {compareData.onlyB.map(code => (
                            <span key={code} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">{code}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {compareData.both.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
                          {t('settings.roles.shared') || 'Shared'} ({compareData.both.length})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {compareData.both.map(code => (
                            <span key={code} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{code}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {compareData.onlyA.length === 0 && compareData.onlyB.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <ArrowsRightLeftIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>{t('settings.roles.identical') || 'These roles have identical permissions.'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

/* ──────────── Compare Selector (inline dropdown) ──────────── */
function CompareSelector({ roles, onCompare, t }: { roles: Role[]; onCompare: (a: Role, b: Role) => void; t: (key: string) => string | undefined }) {
  const [open, setOpen] = useState(false);
  const [roleA, setRoleA] = useState<Role | null>(null);
  const [roleB, setRoleB] = useState<Role | null>(null);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
      >
        <ArrowsRightLeftIcon className="w-4 h-4" />
        {t('settings.roles.compare') || 'Compare'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-72 space-y-3" onClick={e => e.stopPropagation()}>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('settings.roles.selectTwoRoles') || 'Select two roles to compare'}</p>
          <select
            value={roleA?.id || ''}
            onChange={e => setRoleA(roles.find(r => r.id === Number(e.target.value)) || null)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm"
          >
            <option value="">{t('settings.roles.selectRole') || 'Role A...'}</option>
            {roles.map(r => (
              <option key={r.id} value={r.id} disabled={r.id === roleB?.id}>{r.display_name || r.name}</option>
            ))}
          </select>
          <select
            value={roleB?.id || ''}
            onChange={e => setRoleB(roles.find(r => r.id === Number(e.target.value)) || null)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm"
          >
            <option value="">{t('settings.roles.selectRole') || 'Role B...'}</option>
            {roles.map(r => (
              <option key={r.id} value={r.id} disabled={r.id === roleA?.id}>{r.display_name || r.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setOpen(false); setRoleA(null); setRoleB(null); }} className="text-xs text-gray-500 hover:text-gray-700">{t('common.cancel') || 'Cancel'}</button>
            <button
              onClick={() => {
                if (roleA && roleB) {
                  onCompare(roleA, roleB);
                  setOpen(false);
                  setRoleA(null);
                  setRoleB(null);
                }
              }}
              disabled={!roleA || !roleB}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {t('settings.roles.compare') || 'Compare'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAnyPermission(['roles:view', 'tenant_roles:view'], RolesSettingsPage);
