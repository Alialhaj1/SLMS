/**
 * ============================================================================
 * ENTERPRISE PERMISSION MATRIX — Module → Resource → Action Hierarchy
 * ============================================================================
 * Features:
 *   - 3-level hierarchy: Module → Resource → Action
 *   - Filtered by tenant's enabled modules (tenant users)
 *   - Interactive checkboxes with indeterminate states
 *   - Module-level / Resource-level / Global quick actions
 *   - Progress bars at every level
 *   - Role cloning, templates, CSV export
 *   - Permission simulation (preview user access)
 *   - RTL + Dark Mode + Responsive + WCAG AA
 *
 * @module pages/admin/permissions-matrix-v2
 * @version 3.0.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { companyStore } from '@/lib/companyStore';
import { withPermission } from '@/utils/withPermission';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  CubeIcon,
  AdjustmentsHorizontalIcon,
  UserIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  FunnelIcon,
  ArrowPathIcon,
  Square2StackIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import {
  ShieldCheckIcon as ShieldCheckSolidIcon,
  CheckCircleIcon as CheckCircleSolidIcon,
} from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

interface Role {
  id: number;
  name: string;
  description?: string | null;
  permissions: string[];
  user_count?: number;
  permission_count?: number;
  tenant_id?: number | null;
  tenant_name?: string | null;
}

interface PermissionAction {
  id: number;
  permission_code: string;
  action: string;
  description: string | null;
  domain: string;
}

interface PermissionResource {
  resource: string;
  actions: PermissionAction[];
}

interface PermissionModule {
  module_code: string;
  module_name: string;
  module_category: string;
  module_icon: string;
  is_core: boolean;
  resources: PermissionResource[];
}

interface RoleTemplate {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  category: string;
  permission_count: number;
}

// ============================================================================
// Constants
// ============================================================================

const ACTION_COLORS: Record<string, string> = {
  view: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  edit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  update: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  approve: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  manage: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  export: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  import: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  assign: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
};

const MODULE_CATEGORY_COLORS: Record<string, string> = {
  core: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  accounting: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  operations: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  logistics: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  hr: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300',
  crm: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '') + '/api';

// ============================================================================
// Component
// ============================================================================

function PermissionsMatrixV2Page() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const router = useRouter();
  const canEdit = hasPermission('roles:edit') || hasPermission('permissions:edit');
  const isTenant = !!(user as any)?.tenant_id;

  // Data
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selection
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);

  // UI State
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationUser, setSimulationUser] = useState<string>('');

  // ============================================================================
  // Auth Headers
  // ============================================================================
  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
    };
  }, []);

  // ============================================================================
  // Data Loading
  // ============================================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch roles, grouped permissions, and templates in parallel
      // Tenant users: always filter by enabled modules, use tenant-roles endpoint
      const moduleFilterParam = isTenant ? '&module_filter=enabled' : '';
      const rolesEndpoint = isTenant ? `${API_BASE}/tenant-roles` : `${API_BASE}/roles`;
      const permsEndpoint = isTenant 
        ? `${API_BASE}/tenant-roles/permissions?grouped=true`
        : `${API_BASE}/roles/permissions?grouped=true${moduleFilterParam}`;
      const [rolesRes, permsRes, templatesRes] = await Promise.all([
        fetch(`${rolesEndpoint}?limit=500&page=1`, { headers: authHeaders() }),
        fetch(permsEndpoint, { headers: authHeaders() }),
        fetch(`${API_BASE}/roles/templates`, { headers: authHeaders() }).catch(() => null),
      ]);

      if (!rolesRes.ok) throw new Error('Failed to load roles');
      if (!permsRes.ok) throw new Error('Failed to load permissions');

      const rolesJson = await rolesRes.json();
      const permsJson = await permsRes.json();

      setRoles(rolesJson.data || []);
      // Normalize modules: ensure resources is always an array of objects with actions arrays
      // Also deduplicate modules with the same module_code (can happen due to inconsistent data)
      const rawModules = permsJson.data || [];
      const moduleMap = new Map<string, PermissionModule>();
      for (const m of rawModules) {
        const code = (m.module_code || 'general').toLowerCase();
        const resources = Array.isArray(m.resources)
          ? m.resources.map((r: any) => ({ ...r, actions: Array.isArray(r.actions) ? r.actions : [] }))
          : Object.values(m.resources || {}).map((r: any) => ({ ...r, actions: Array.isArray(r.actions) ? r.actions : [] }));
        if (moduleMap.has(code)) {
          // Merge resources into existing module
          const existing = moduleMap.get(code)!;
          for (const res of resources) {
            const existingRes = (existing.resources || []).find((er: any) => er.resource === res.resource);
            if (existingRes) {
              // Merge actions, avoiding duplicates by permission_code
              const existingCodes = new Set((existingRes.actions || []).map((a: any) => a.permission_code));
              for (const action of res.actions || []) {
                if (!existingCodes.has(action.permission_code)) {
                  existingRes.actions.push(action);
                }
              }
            } else {
              (existing.resources as any[]).push(res);
            }
          }
        } else {
          moduleMap.set(code, { ...m, module_code: code, resources });
        }
      }
      setModules(Array.from(moduleMap.values()));

      if (templatesRes?.ok) {
        const templatesJson = await templatesRes.json();
        setTemplates(templatesJson.templates || []);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, isTenant, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-select role from query param
  useEffect(() => {
    const roleId = router.query.role;
    if (roleId && roles.length > 0 && !selectedRoleId) {
      const id = Number(roleId);
      if (roles.some(r => r.id === id)) {
        setSelectedRoleId(id);
      }
    }
  }, [router.query.role, roles, selectedRoleId]);

  // Load specific role when selected
  useEffect(() => {
    if (!selectedRoleId) {
      setSelectedRole(null);
      setHasChanges(false);
      return;
    }
    const loadRole = async () => {
      try {
        const res = await fetch(`${API_BASE}/roles/${selectedRoleId}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to load role');
        const json = await res.json();
        setSelectedRole(json.role);
        setHasChanges(false);
        // Auto-expand all modules
        const allModCodes = modules.map(m => m.module_code);
        setExpandedModules(new Set(allModCodes));
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Error', 'error');
      }
    };
    loadRole();
  }, [selectedRoleId, authHeaders, modules, showToast]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const selectedCodes = useMemo(() => new Set(selectedRole?.permissions || []), [selectedRole]);

  // All unique permission codes across all modules
  const allPermCodes = useMemo(() => {
    const codes: string[] = [];
    modules.forEach(m => (m.resources || []).forEach(r => (r.actions || []).forEach(a => codes.push(a.permission_code))));
    return codes;
  }, [modules]);

  // All unique actions (normalize compound actions like 'warehouses:view' → 'view')
  const allActions = useMemo(() => {
    const actions = new Set<string>();
    modules.forEach(m => (m.resources || []).forEach(r => (r.actions || []).forEach(a => {
      const simple = a.action.includes(':') ? a.action.split(':').pop()! : a.action;
      actions.add(simple);
    })));
    return Array.from(actions).sort();
  }, [modules]);

  // Filtered modules based on search + filters
  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules
      .filter(m => moduleFilter === 'all' || m.module_code === moduleFilter)
      .map(m => ({
        ...m,
        resources: (m.resources || [])
          .map(r => ({
            ...r,
            actions: (r.actions || []).filter(a => {
              const matchesSearch = !q ||
                a.permission_code.toLowerCase().includes(q) ||
                r.resource.toLowerCase().includes(q) ||
                (a.description || '').toLowerCase().includes(q);
              const simpleAct = a.action.includes(':') ? a.action.split(':').pop()! : a.action;
              const matchesAction = actionFilter === 'all' || simpleAct === actionFilter;
              const matchesEnabled = !showEnabledOnly || selectedCodes.has(a.permission_code);
              return matchesSearch && matchesAction && matchesEnabled;
            }),
          }))
          .filter(r => r.actions.length > 0),
      }))
      .filter(m => (m.resources || []).length > 0);
  }, [modules, search, moduleFilter, actionFilter, showEnabledOnly, selectedCodes]);

  // Global stats
  const stats = useMemo(() => {
    const total = allPermCodes.length;
    const enabled = allPermCodes.filter(c => selectedCodes.has(c)).length;
    const filteredTotal = filteredModules.reduce((sum, m) =>
      sum + (m.resources || []).reduce((s, r) => s + (r.actions || []).length, 0), 0);
    const filteredEnabled = filteredModules.reduce((sum, m) =>
      sum + (m.resources || []).reduce((s, r) =>
        s + (r.actions || []).filter(a => selectedCodes.has(a.permission_code)).length, 0), 0);
    return { total, enabled, filteredTotal, filteredEnabled };
  }, [allPermCodes, selectedCodes, filteredModules]);

  // ============================================================================
  // Permission Toggle Helpers
  // ============================================================================
  const updatePermissions = useCallback((newPerms: string[]) => {
    if (!selectedRole) return;
    setSelectedRole({ ...selectedRole, permissions: newPerms });
    setHasChanges(true);
  }, [selectedRole]);

  const togglePermission = useCallback((code: string) => {
    if (!canEdit || !selectedRole) return;
    const next = new Set(selectedRole.permissions || []);
    if (next.has(code)) next.delete(code); else next.add(code);
    updatePermissions(Array.from(next));
  }, [canEdit, selectedRole, updatePermissions]);

  const toggleResourceAll = useCallback((resource: PermissionResource, select: boolean) => {
    if (!canEdit || !selectedRole) return;
    const next = new Set(selectedRole.permissions || []);
    (resource.actions || []).forEach(a => select ? next.add(a.permission_code) : next.delete(a.permission_code));
    updatePermissions(Array.from(next));
  }, [canEdit, selectedRole, updatePermissions]);

  const toggleModuleAll = useCallback((mod: PermissionModule, select: boolean) => {
    if (!canEdit || !selectedRole) return;
    const next = new Set(selectedRole.permissions || []);
    (mod.resources || []).forEach(r => (r.actions || []).forEach(a =>
      select ? next.add(a.permission_code) : next.delete(a.permission_code)));
    updatePermissions(Array.from(next));
  }, [canEdit, selectedRole, updatePermissions]);

  const setModuleViewOnly = useCallback((mod: PermissionModule) => {
    if (!canEdit || !selectedRole) return;
    const next = new Set(selectedRole.permissions || []);
    (mod.resources || []).forEach(r => (r.actions || []).forEach(a => {
      if (a.action === 'view') next.add(a.permission_code); else next.delete(a.permission_code);
    }));
    updatePermissions(Array.from(next));
  }, [canEdit, selectedRole, updatePermissions]);

  // Global quick actions
  const selectAllFiltered = () => {
    if (!canEdit || !selectedRole) return;
    const next = new Set(selectedRole.permissions || []);
    filteredModules.forEach(m => (m.resources || []).forEach(r =>
      (r.actions || []).forEach(a => next.add(a.permission_code))));
    updatePermissions(Array.from(next));
  };
  const deselectAllFiltered = () => {
    if (!canEdit || !selectedRole) return;
    const filteredCodes = new Set<string>();
    filteredModules.forEach(m => (m.resources || []).forEach(r =>
      (r.actions || []).forEach(a => filteredCodes.add(a.permission_code))));
    updatePermissions((selectedRole.permissions || []).filter(p => !filteredCodes.has(p)));
  };
  const selectViewOnlyFiltered = () => {
    if (!canEdit || !selectedRole) return;
    const filteredCodes = new Set<string>();
    const viewCodes = new Set<string>();
    filteredModules.forEach(m => (m.resources || []).forEach(r => (r.actions || []).forEach(a => {
      filteredCodes.add(a.permission_code);
      if (a.action === 'view') viewCodes.add(a.permission_code);
    })));
    const remaining = (selectedRole.permissions || []).filter(p => !filteredCodes.has(p));
    updatePermissions([...remaining, ...Array.from(viewCodes)]);
  };

  // Expand/Collapse
  const expandAll = () => {
    const allMods = filteredModules.map(m => m.module_code);
    const allRes = filteredModules.flatMap(m => (m.resources || []).map(r => `${m.module_code}:${r.resource}`));
    setExpandedModules(new Set(allMods));
    setExpandedResources(new Set(allRes));
  };
  const collapseAll = () => { setExpandedModules(new Set()); setExpandedResources(new Set()); };

  // ============================================================================
  // Save
  // ============================================================================
  const save = async () => {
    if (!canEdit || !selectedRole) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: selectedRole.name,
          description: selectedRole.description ?? null,
          permissions: selectedRole.permissions,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      showToast(t('messages.saved') || 'Permissions saved successfully', 'success');
      setHasChanges(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // Clone Role
  // ============================================================================
  const cloneRole = async () => {
    if (!selectedRole) return;
    const name = prompt(t('admin.roles.cloneName') || 'Enter name for cloned role:', `${selectedRole.name} (Copy)`);
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/roles/${selectedRole.id}/clone`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, description: `Cloned from ${selectedRole.name}` }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to clone');
      }
      showToast(t('messages.cloned') || 'Role cloned successfully', 'success');
      loadData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  // Apply template
  const applyTemplate = (template: RoleTemplate) => {
    if (!canEdit || !selectedRole) return;
    updatePermissions([...template.permissions]);
    setShowTemplates(false);
    showToast(`Applied template: ${template.name}`, 'success');
  };

  // CSV export
  const exportCsv = () => {
    if (!selectedRole) return;
    const rows: string[] = ['Module,Resource,Action,Permission Code,Enabled'];
    modules.forEach(m => (m.resources || []).forEach(r => (r.actions || []).forEach(a => {
      rows.push(`"${m.module_name}","${r.resource}","${a.action}","${a.permission_code}","${selectedCodes.has(a.permission_code) ? 'Yes' : 'No'}"`);  
    })));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `permissions-${selectedRole.name}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // Stat Helpers
  // ============================================================================
  const getModuleStats = (mod: PermissionModule) => {
    const total = (mod.resources || []).reduce((s, r) => s + (r.actions || []).length, 0);
    const enabled = (mod.resources || []).reduce((s, r) =>
      s + (r.actions || []).filter(a => selectedCodes.has(a.permission_code)).length, 0);
    return { total, enabled, pct: total > 0 ? Math.round((enabled / total) * 100) : 0 };
  };

  const getResourceStats = (resource: PermissionResource) => {
    const total = (resource.actions || []).length;
    const enabled = (resource.actions || []).filter(a => selectedCodes.has(a.permission_code)).length;
    return { total, enabled, pct: total > 0 ? Math.round((enabled / total) * 100) : 0 };
  };

  const getActionColor = (action: string) => {
    const simple = action.includes(':') ? action.split(':').pop()! : action;
    return ACTION_COLORS[simple] || ACTION_COLORS[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getCategoryColor = (cat: string) =>
    MODULE_CATEGORY_COLORS[cat] || 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  const translateResource = (resource: string): string => {
    const key = `permissionResources.${resource}`;
    const translated = t(key);
    return translated !== key ? translated : resource.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getSimpleAction = useCallback((action: string): string => {
    // Handle compound actions like "warehouses:view" → "view"
    return action.includes(':') ? action.split(':').pop()! : action;
  }, []);

  const translateAction = (action: string): string => {
    const simple = getSimpleAction(action);
    const key = `permissionActions.${simple}`;
    const translated = t(key);
    return translated !== key ? translated : simple.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <MainLayout>
      <Head>
        <title>{t('settingsAdmin.permissionMatrix.title') || 'Permission Matrix'} - SLMS</title>
      </Head>

      <div className="space-y-4">
        {/* ─── Header ─── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <ShieldCheckSolidIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              {t('settingsAdmin.permissionMatrix.title') || 'Permission Matrix'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('settingsAdmin.permissionMatrix.subtitle') || 'Module → Resource → Action permission management'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
              <ArrowPathIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
              {t('common.refresh') || 'Refresh'}
            </Button>
            {selectedRole && (
              <>
                <Button variant="secondary" size="sm" onClick={exportCsv}>
                  <ArrowDownTrayIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                  {t('common.export') || 'Export'}
                </Button>
                <Button variant="secondary" size="sm" onClick={cloneRole}>
                  <DocumentDuplicateIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                  {t('admin.roles.clone') || 'Clone'}
                </Button>
                {templates.length > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => setShowTemplates(true)}>
                    <SparklesIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                    {t('admin.roles.templates') || 'Templates'}
                  </Button>
                )}
              </>
            )}
            {canEdit && selectedRole && (
              <Button onClick={save} loading={saving} disabled={!hasChanges}
                className={hasChanges ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900' : ''}>
                <CheckIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                {t('common.save') || 'Save'} {hasChanges && `(${stats.enabled})`}
              </Button>
            )}
          </div>
        </div>

        {/* ─── Filters ─── */}
        <Card className="!p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Role Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settingsAdmin.permissionMatrix.selectRole') || 'Select Role'}
              </label>
              <select className="input w-full" value={selectedRoleId}
                onChange={e => setSelectedRoleId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">{t('settingsAdmin.permissionMatrix.selectRole') || '— Select Role —'}</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.tenant_name ? ` [${r.tenant_name}]` : ''} ({r.permissions?.length || 0} perms{r.user_count ? `, ${r.user_count} users` : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.search') || 'Search'}
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" className="input w-full ltr:pl-9 rtl:pr-9"
                  placeholder={t('settingsAdmin.searchPlaceholder') || 'Search permissions...'}
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Module Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <CubeIcon className="w-4 h-4 inline ltr:mr-1 rtl:ml-1" />
                {t('common.module') || 'Module'}
              </label>
              <select className="input w-full" value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value)}>
                <option value="all">{t('common.all') || 'All Modules'} ({modules.length})</option>
                {modules.map((m, idx) => (
                  <option key={m.module_code || `mod-${idx}`} value={m.module_code}>
                    {m.module_name} ({(m.resources || []).reduce((s, r) => s + (r.actions || []).length, 0)})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.action') || 'Action'}
              </label>
              <select className="input w-full" value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}>
                <option value="all">{t('common.all') || 'All Actions'}</option>
                {allActions.map(a => <option key={a} value={a}>{translateAction(a)}</option>)}
              </select>
            </div>

            {/* Toggle: Show Enabled Only */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <input type="checkbox" checked={showEnabledOnly} onChange={e => setShowEnabledOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('common.enabledOnly') || 'Enabled Only'}
                </span>
              </label>
            </div>
          </div>
        </Card>

        {/* ─── Quick Actions & Stats ─── */}
        {selectedRole && (
          <Card className="!p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.total') || 'Total'}:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{stats.filteredTotal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.enabled') || 'Enabled'}:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{stats.filteredEnabled}</span>
                </div>
                <div className="text-sm text-gray-400">
                  ({stats.filteredTotal > 0 ? Math.round((stats.filteredEnabled / stats.filteredTotal) * 100) : 0}%)
                </div>
                <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-blue-500 to-green-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.filteredTotal > 0 ? (stats.filteredEnabled / stats.filteredTotal) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Quick Actions */}
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={selectAllFiltered}>
                    <CheckIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />{t('common.selectAll') || 'All'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={deselectAllFiltered}>
                    <XMarkIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />{t('common.deselectAll') || 'None'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={selectViewOnlyFiltered}>
                    <EyeIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" />{t('common.viewOnly') || 'View Only'}
                  </Button>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                  <Button variant="secondary" size="sm" onClick={expandAll}>
                    {t('common.expandAll') || 'Expand'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={collapseAll}>
                    {t('common.collapseAll') || 'Collapse'}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ─── Module → Resource → Action Tree ─── */}
        <div className="space-y-3">
          {loading ? (
            <Card className="!p-8">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                <p className="text-gray-500">{t('common.loading') || 'Loading permissions...'}</p>
              </div>
            </Card>
          ) : !selectedRole ? (
            <Card className="!p-12">
              <div className="text-center">
                <ShieldCheckIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('settingsAdmin.permissionMatrix.selectRole') || 'Select a Role'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {t('settingsAdmin.permissionMatrix.selectRoleDesc') ||
                    'Choose a role from the dropdown above to view and manage its permissions across all modules.'}
                </p>
              </div>
            </Card>
          ) : filteredModules.length === 0 ? (
            <Card className="!p-12">
              <div className="text-center">
                <FunnelIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('common.noResults') || 'No Results'}
                </h3>
                <p className="text-sm text-gray-500">{t('common.tryDifferentSearch') || 'Try adjusting your filters.'}</p>
              </div>
            </Card>
          ) : (
            filteredModules.map(mod => {
              const isModExpanded = expandedModules.has(mod.module_code);
              const modStats = getModuleStats(mod);
              const allModSelected = modStats.enabled === modStats.total && modStats.total > 0;
              const someModSelected = modStats.enabled > 0 && !allModSelected;

              return (
                <Card key={mod.module_code} className="!p-0 overflow-hidden">
                  {/* ── Module Header ── */}
                  <div
                    className={`px-5 py-4 flex items-center justify-between cursor-pointer transition-colors
                      ${isModExpanded ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' :
                        'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750'}`}
                    onClick={() => {
                      const next = new Set(expandedModules);
                      if (next.has(mod.module_code)) next.delete(mod.module_code); else next.add(mod.module_code);
                      setExpandedModules(next);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {isModExpanded
                        ? <ChevronDownIcon className="w-5 h-5 text-blue-500" />
                        : <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
                      <CubeIcon className={`w-6 h-6 ${isModExpanded ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                            {mod.module_name}
                          </span>
                          {mod.is_core && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              Core
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(mod.module_category)}`}>
                            {mod.module_category}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(mod.resources || []).length} {t('common.resources') || 'resources'} · {modStats.total} {t('common.permissions') || 'permissions'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                      {/* Module progress */}
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {modStats.enabled}/{modStats.total}
                        </span>
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all duration-300 ${modStats.pct === 100 ? 'bg-green-500' : modStats.pct > 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            style={{ width: `${modStats.pct}%` }} />
                        </div>
                      </div>

                      {/* Module-level actions */}
                      {canEdit && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => setModuleViewOnly(mod)}
                            title={t('common.viewOnly') || 'View Only'}>
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <input type="checkbox" checked={allModSelected}
                            ref={el => { if (el) el.indeterminate = someModSelected; }}
                            onChange={() => toggleModuleAll(mod, !allModSelected)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Resources (Level 2) ── */}
                  {isModExpanded && (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(mod.resources || []).map(resource => {
                        const resKey = `${mod.module_code}:${resource.resource}`;
                        const isResExpanded = expandedResources.has(resKey);
                        const resStats = getResourceStats(resource);
                        const allResSelected = resStats.enabled === resStats.total && resStats.total > 0;
                        const someResSelected = resStats.enabled > 0 && !allResSelected;

                        return (
                          <div key={resKey}>
                            {/* Resource Header */}
                            <div
                              className="ltr:pl-10 rtl:pr-10 ltr:pr-5 rtl:pl-5 py-3 flex items-center justify-between cursor-pointer
                                bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                              onClick={() => {
                                const next = new Set(expandedResources);
                                if (next.has(resKey)) next.delete(resKey); else next.add(resKey);
                                setExpandedResources(next);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {isResExpanded
                                  ? <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                                  : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {translateResource(resource.resource)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  ({resStats.enabled}/{resStats.total})
                                </span>
                                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 hidden sm:block">
                                  <div className={`h-1.5 rounded-full transition-all ${resStats.pct === 100 ? 'bg-green-500' : resStats.pct > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                                    style={{ width: `${resStats.pct}%` }} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                {canEdit && (
                                  <input type="checkbox" checked={allResSelected}
                                    ref={el => { if (el) el.indeterminate = someResSelected; }}
                                    onChange={() => toggleResourceAll(resource, !allResSelected)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                )}
                              </div>
                            </div>

                            {/* ── Actions (Level 3) ── */}
                            {isResExpanded && (
                              <div className="ltr:pl-16 rtl:pr-16 divide-y divide-gray-100 dark:divide-gray-800">
                                {(resource.actions || []).map(action => {
                                  const checked = selectedCodes.has(action.permission_code);
                                  return (
                                    <label key={action.permission_code}
                                      className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer transition-colors
                                        ${checked
                                          ? 'bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100/50 dark:hover:bg-green-900/20'
                                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${getActionColor(action.action)}`}>
                                          {translateAction(action.action)}
                                        </span>
                                        <div className="min-w-0">
                                          <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                                            {action.permission_code}
                                          </span>
                                          {action.description && (
                                            <p className="text-xs text-gray-400 truncate">{action.description}</p>
                                          )}
                                        </div>
                                      </div>
                                      <input type="checkbox" checked={checked}
                                        onChange={() => togglePermission(action.permission_code)}
                                        disabled={!canEdit || saving}
                                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer flex-shrink-0" />
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* ─── Floating Save Button ─── */}
        {canEdit && selectedRole && hasChanges && (
          <div className="fixed bottom-6 ltr:right-6 rtl:left-6 z-50">
            <Button onClick={save} loading={saving} size="lg"
              className="shadow-xl shadow-blue-500/30">
              <CheckCircleSolidIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
              {t('common.save') || 'Save Changes'} ({stats.enabled} {t('common.permissions') || 'permissions'})
            </Button>
          </div>
        )}

        {/* ─── Templates Modal ─── */}
        {showTemplates && (
          <Modal isOpen={showTemplates} onClose={() => setShowTemplates(false)} title={t('admin.roles.templates') || 'Role Templates'} size="lg">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('common.noTemplates') || 'No templates available'}</p>
              ) : templates.map(tmpl => (
                <div key={tmpl.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{tmpl.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(tmpl.category)}`}>{tmpl.category}</span>
                    </div>
                    <Button size="sm" onClick={() => applyTemplate(tmpl)}>
                      <PlayIcon className="w-4 h-4 ltr:mr-1 rtl:ml-1" /> {t('common.apply') || 'Apply'}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tmpl.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{tmpl.permission_count} permissions</p>
                </div>
              ))}
            </div>
          </Modal>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('permissions:view', PermissionsMatrixV2Page);
