import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { companyStore } from '../../lib/companyStore';
import { withPermission } from '../../utils/withPermission';
import { ChevronDownIcon, ChevronRightIcon, CheckIcon, XMarkIcon, EyeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Role {
  id: number;
  name: string;
  description?: string | null;
  permissions: string[];
}

interface PermissionRow {
  id: number;
  permission_code: string;
  resource: string;
  action: string;
  description?: string | null;
}

// Action type colors
const ACTION_COLORS: Record<string, string> = {
  view: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  edit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  approve: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  manage: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  export: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

function PermissionsMatrixPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  // Helper to translate resource names
  const translateResource = (resource: string): string => {
    const key = `permissionResources.${resource}`;
    const translated = t(key);
    return translated !== key ? translated : resource.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Helper to translate action names
  const translateAction = (action: string): string => {
    const key = `permissionActions.${action}`;
    const translated = t(key);
    return translated !== key ? translated : action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const canEdit = hasPermission('roles:edit') || hasPermission('permissions:edit');

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    if (!selectedRoleId) {
      setSelectedRole(null);
      setHasChanges(false);
      return;
    }
    void loadRole(Number(selectedRoleId));
  }, [selectedRoleId]);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
    };
  };

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const [rolesRes, permsRes] = await Promise.all([
        fetch(`${baseUrl}/api/roles?limit=500&page=1`, { headers: authHeaders() }),
        fetch(`${baseUrl}/api/roles/permissions`, { headers: authHeaders() }),
      ]);

      if (!rolesRes.ok) throw new Error('Failed to load roles');
      if (!permsRes.ok) throw new Error('Failed to load permissions');

      const rolesJson = await rolesRes.json();
      const permsJson = await permsRes.json();

      setRoles(rolesJson.data || []);
      setPermissions(Array.isArray(permsJson) ? permsJson : permsJson.data || []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRole = async (roleId: number) => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/roles/${roleId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load role');
      const json = await res.json();
      setSelectedRole(json.role);
      setHasChanges(false);
      // Expand all resources by default
      const allResources = new Set(permissions.map((p) => p.resource));
      setExpandedResources(allResources);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedCodes = useMemo(() => {
    return new Set(selectedRole?.permissions || []);
  }, [selectedRole]);

  const resources = useMemo(() => {
    return Array.from(new Set(permissions.map((p) => p.resource))).sort();
  }, [permissions]);

  const actions = useMemo(() => {
    return Array.from(new Set(permissions.map((p) => p.action))).sort();
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permissions.filter((p) => {
      const matchesSearch =
        !q ||
        p.permission_code.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q);
      const matchesResource = resourceFilter === 'all' || p.resource === resourceFilter;
      const matchesAction = actionFilter === 'all' || p.action === actionFilter;
      return matchesSearch && matchesResource && matchesAction;
    });
  }, [permissions, search, resourceFilter, actionFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const p of filteredPermissions) {
      const arr = map.get(p.resource) || [];
      arr.push(p);
      map.set(p.resource, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.permission_code.localeCompare(b.permission_code));
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredPermissions]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredPermissions.length;
    const enabled = filteredPermissions.filter((p) => selectedCodes.has(p.permission_code)).length;
    const viewOnly = filteredPermissions.filter((p) => p.action === 'view' && selectedCodes.has(p.permission_code)).length;
    const totalView = filteredPermissions.filter((p) => p.action === 'view').length;
    return { total, enabled, viewOnly, totalView };
  }, [filteredPermissions, selectedCodes]);

  const toggle = (code: string) => {
    if (!canEdit || !selectedRole) return;
    const next = new Set(selectedRole.permissions || []);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelectedRole({ ...selectedRole, permissions: Array.from(next) });
    setHasChanges(true);
  };

  const toggleResource = (resource: string) => {
    const next = new Set(expandedResources);
    if (next.has(resource)) next.delete(resource);
    else next.add(resource);
    setExpandedResources(next);
  };

  // Select/Deselect all for a resource
  const selectAllInResource = (resource: string, select: boolean) => {
    if (!canEdit || !selectedRole) return;
    const resourcePerms = permissions.filter((p) => p.resource === resource);
    const next = new Set(selectedRole.permissions || []);
    for (const p of resourcePerms) {
      if (select) next.add(p.permission_code);
      else next.delete(p.permission_code);
    }
    setSelectedRole({ ...selectedRole, permissions: Array.from(next) });
    setHasChanges(true);
  };

  // Select only view permissions for a resource
  const selectViewOnlyInResource = (resource: string) => {
    if (!canEdit || !selectedRole) return;
    const resourcePerms = permissions.filter((p) => p.resource === resource);
    const next = new Set(selectedRole.permissions || []);
    for (const p of resourcePerms) {
      if (p.action === 'view') next.add(p.permission_code);
      else next.delete(p.permission_code);
    }
    setSelectedRole({ ...selectedRole, permissions: Array.from(next) });
    setHasChanges(true);
  };

  // Global actions
  const selectAll = () => {
    if (!canEdit || !selectedRole) return;
    const allCodes = filteredPermissions.map((p) => p.permission_code);
    setSelectedRole({ ...selectedRole, permissions: allCodes });
    setHasChanges(true);
  };

  const deselectAll = () => {
    if (!canEdit || !selectedRole) return;
    const filteredCodes = new Set(filteredPermissions.map((p) => p.permission_code));
    const remaining = (selectedRole.permissions || []).filter((p) => !filteredCodes.has(p));
    setSelectedRole({ ...selectedRole, permissions: remaining });
    setHasChanges(true);
  };

  const selectViewOnly = () => {
    if (!canEdit || !selectedRole) return;
    const viewCodes = filteredPermissions.filter((p) => p.action === 'view').map((p) => p.permission_code);
    const nonFilteredCodes = (selectedRole.permissions || []).filter(
      (p) => !filteredPermissions.some((fp) => fp.permission_code === p)
    );
    setSelectedRole({ ...selectedRole, permissions: [...nonFilteredCodes, ...viewCodes] });
    setHasChanges(true);
  };

  const expandAll = () => {
    setExpandedResources(new Set(resources));
  };

  const collapseAll = () => {
    setExpandedResources(new Set());
  };

  const save = async () => {
    if (!canEdit || !selectedRole) return;
    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/roles/${selectedRole.id}`, {
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
        throw new Error(err.error || err.message || 'Failed');
      }

      showToast(t('messages.saved') || 'Saved successfully', 'success');
      setHasChanges(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (!selectedRole) return;
    const rows = permissions.map((p) => ({
      permission_code: p.permission_code,
      resource: p.resource,
      action: p.action,
      enabled: selectedCodes.has(p.permission_code) ? '1' : '0',
    }));

    const headers = ['permission_code', 'resource', 'action', 'enabled'];
    const lines = [headers.join(',')].concat(
      rows.map((r) =>
        headers
          .map((h) => `"${String((r as Record<string, string>)[h]).replace(/\"/g, '""')}"`)
          .join(',')
      )
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission-matrix-role-${selectedRole.id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getResourceStats = (resource: string) => {
    const resourcePerms = permissions.filter((p) => p.resource === resource);
    const enabled = resourcePerms.filter((p) => selectedCodes.has(p.permission_code)).length;
    return { total: resourcePerms.length, enabled };
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('settingsAdmin.permissionMatrix.title')} - SLMS</title>
      </Head>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('settingsAdmin.permissionMatrix.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('settingsAdmin.permissionMatrix.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadBaseData} disabled={loading}>
              {t('common.refresh')}
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!selectedRole}>
              {t('common.export')}
            </Button>
            {canEdit && selectedRole && (
              <Button 
                onClick={save} 
                loading={saving} 
                disabled={!hasChanges}
                className={hasChanges ? 'animate-pulse' : ''}
              >
                {t('common.save')} {hasChanges && '•'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters Card */}
        <Card className="!p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Role Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settingsAdmin.permissionMatrix.selectRole')}
              </label>
              <select
                className="input w-full"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">{t('settingsAdmin.permissionMatrix.selectRole')}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.permissions?.length || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.search')}
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="input w-full pl-9"
                  placeholder={t('settingsAdmin.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Resource Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.resource') || 'Resource'}
              </label>
              <select
                className="input w-full"
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
              >
                <option value="all">{t('common.all')} ({permissions.length})</option>
                {resources.map((r) => (
                  <option key={r} value={r}>
                    {translateResource(r)} ({permissions.filter((p) => p.resource === r).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.action') || 'Action'}
              </label>
              <select
                className="input w-full"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="all">{t('common.all')}</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {translateAction(a)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Quick Actions & Stats */}
        {selectedRole && (
          <Card className="!p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.total') || 'Total'}:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.enabled') || 'Enabled'}:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{stats.enabled}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.viewOnly') || 'View Only'}:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.viewOnly}/{stats.totalView}</span>
                </div>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${stats.total > 0 ? (stats.enabled / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">{t('common.quickActions') || 'Quick Actions'}:</span>
                  <Button variant="secondary" size="sm" onClick={selectAll}>
                    <CheckIcon className="w-4 h-4 mr-1" />
                    {t('common.selectAll') || 'Select All'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={deselectAll}>
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    {t('common.deselectAll') || 'Deselect All'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={selectViewOnly}>
                    <EyeIcon className="w-4 h-4 mr-1" />
                    {t('common.viewOnly') || 'View Only'}
                  </Button>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                  <Button variant="secondary" size="sm" onClick={expandAll}>
                    {t('common.expandAll') || 'Expand All'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={collapseAll}>
                    {t('common.collapseAll') || 'Collapse All'}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Permissions Matrix */}
        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-2 text-gray-500">{t('common.loading')}</p>
            </div>
          ) : !selectedRole ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">🔐</div>
              <h3 className="text-lg font-medium mb-2">{t('settingsAdmin.permissionMatrix.selectRole')}</h3>
              <p className="text-sm">{t('settingsAdmin.permissionMatrix.subtitle')}</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium mb-2">{t('common.noResults') || 'No Results'}</h3>
              <p className="text-sm">{t('common.tryDifferentSearch') || 'Try a different search term'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {grouped.map(([resource, perms]) => {
                const isExpanded = expandedResources.has(resource);
                const resourceStats = getResourceStats(resource);
                const allSelected = perms.every((p) => selectedCodes.has(p.permission_code));
                const someSelected = perms.some((p) => selectedCodes.has(p.permission_code));

                return (
                  <div key={resource}>
                    {/* Resource Header */}
                    <div
                      className="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                      onClick={() => toggleResource(resource)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{translateResource(resource)}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({resourceStats.enabled}/{resourceStats.total})
                        </span>
                        {/* Progress bar for resource */}
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 hidden sm:block">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${resourceStats.total > 0 ? (resourceStats.enabled / resourceStats.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      
                      {canEdit && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => selectViewOnlyInResource(resource)}
                            title={t('common.viewOnly') || 'View Only'}
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => selectAllInResource(resource, !allSelected)}
                            title={allSelected ? (t('common.deselectAll') || 'Deselect All') : (t('common.selectAll') || 'Select All')}
                          >
                            {allSelected ? <XMarkIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
                          </Button>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={() => selectAllInResource(resource, !allSelected)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={saving}
                          />
                        </div>
                      )}
                    </div>

                    {/* Permissions List */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {perms.map((p) => {
                          const checked = selectedCodes.has(p.permission_code);
                          return (
                            <label
                              key={p.permission_code}
                              className={`px-4 py-3 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(p.action)}`}>
                                  {translateAction(p.action)}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {p.permission_code}
                                  </div>
                                  {p.description && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {p.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(p.permission_code)}
                                disabled={!canEdit || saving}
                                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                              />
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

        {/* Floating Save Button */}
        {canEdit && selectedRole && hasChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={save}
              loading={saving}
              className="shadow-lg shadow-blue-500/30 animate-bounce"
              size="lg"
            >
              {t('common.save')} ({stats.enabled} {t('common.permissions') || 'permissions'})
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('permissions:view', PermissionsMatrixPage);

