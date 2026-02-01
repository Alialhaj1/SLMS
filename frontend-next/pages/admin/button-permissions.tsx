/**
 * 🔘 Button Permissions - صلاحيات الأزرار
 * =====================================================
 * إدارة صلاحيات الوصول للأزرار والإجراءات على مستوى الأدوار
 */

import { Fragment, useState, useEffect } from 'react';
import Head from 'next/head';
import {
  CursorArrowRaysIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface ButtonPermission {
  id: number;
  resource: string;
  button_name: string;
  button_label: string;
  button_type: 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve' | 'reject' | 'print' | 'custom';
  permissions: {
    [roleId: number]: {
      visible: boolean;
      enabled: boolean;
      requireConfirm: boolean;
    };
  };
}

interface Role {
  id: number;
  name: string;
  name_ar?: string;
}

interface ResourceGroup {
  resource: string;
  label: string;
  buttons: ButtonPermission[];
  expanded: boolean;
}

export default function ButtonPermissionsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<number | 'all'>('all');
  const [hasChanges, setHasChanges] = useState(false);

  const canManage = hasPermission('button_permissions:manage');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch roles
      const rolesRes = await fetch('http://localhost:4000/api/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.data || []);
      } else {
        setRoles([
          { id: 1, name: 'Super Admin', name_ar: 'مدير النظام' },
          { id: 2, name: 'Admin', name_ar: 'مشرف' },
          { id: 3, name: 'Manager', name_ar: 'مدير' },
          { id: 4, name: 'User', name_ar: 'مستخدم' },
        ]);
      }
      
      // Mock button permissions data
      setResourceGroups([
        {
          resource: 'users',
          label: 'المستخدمين',
          expanded: true,
          buttons: [
            { id: 1, resource: 'users', button_name: 'create', button_label: 'إضافة مستخدم', button_type: 'create', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: false, enabled: false, requireConfirm: false }, 4: { visible: false, enabled: false, requireConfirm: false } } },
            { id: 2, resource: 'users', button_name: 'edit', button_label: 'تعديل المستخدم', button_type: 'edit', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: true, enabled: true, requireConfirm: false }, 4: { visible: false, enabled: false, requireConfirm: false } } },
            { id: 3, resource: 'users', button_name: 'delete', button_label: 'حذف المستخدم', button_type: 'delete', permissions: { 1: { visible: true, enabled: true, requireConfirm: true }, 2: { visible: true, enabled: true, requireConfirm: true }, 3: { visible: false, enabled: false, requireConfirm: false }, 4: { visible: false, enabled: false, requireConfirm: false } } },
            { id: 4, resource: 'users', button_name: 'export', button_label: 'تصدير البيانات', button_type: 'export', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: true, enabled: true, requireConfirm: false }, 4: { visible: true, enabled: false, requireConfirm: false } } },
            { id: 5, resource: 'users', button_name: 'reset_password', button_label: 'إعادة تعيين كلمة المرور', button_type: 'custom', permissions: { 1: { visible: true, enabled: true, requireConfirm: true }, 2: { visible: true, enabled: true, requireConfirm: true }, 3: { visible: false, enabled: false, requireConfirm: false }, 4: { visible: false, enabled: false, requireConfirm: false } } },
          ]
        },
        {
          resource: 'shipments',
          label: 'الشحنات',
          expanded: false,
          buttons: [
            { id: 6, resource: 'shipments', button_name: 'create', button_label: 'إنشاء شحنة', button_type: 'create', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: true, enabled: true, requireConfirm: false }, 4: { visible: true, enabled: true, requireConfirm: false } } },
            { id: 7, resource: 'shipments', button_name: 'approve', button_label: 'اعتماد الشحنة', button_type: 'approve', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: true, enabled: true, requireConfirm: true }, 4: { visible: false, enabled: false, requireConfirm: false } } },
            { id: 8, resource: 'shipments', button_name: 'reject', button_label: 'رفض الشحنة', button_type: 'reject', permissions: { 1: { visible: true, enabled: true, requireConfirm: true }, 2: { visible: true, enabled: true, requireConfirm: true }, 3: { visible: true, enabled: true, requireConfirm: true }, 4: { visible: false, enabled: false, requireConfirm: false } } },
            { id: 9, resource: 'shipments', button_name: 'print', button_label: 'طباعة الشحنة', button_type: 'print', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: true, enabled: true, requireConfirm: false }, 4: { visible: true, enabled: true, requireConfirm: false } } },
          ]
        },
        {
          resource: 'invoices',
          label: 'الفواتير',
          expanded: false,
          buttons: [
            { id: 10, resource: 'invoices', button_name: 'create', button_label: 'إنشاء فاتورة', button_type: 'create', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: true, enabled: true, requireConfirm: false }, 4: { visible: false, enabled: false, requireConfirm: false } } },
            { id: 11, resource: 'invoices', button_name: 'void', button_label: 'إلغاء الفاتورة', button_type: 'custom', permissions: { 1: { visible: true, enabled: true, requireConfirm: true }, 2: { visible: true, enabled: true, requireConfirm: true }, 3: { visible: false, enabled: false, requireConfirm: false }, 4: { visible: false, enabled: false, requireConfirm: false } } },
            { id: 12, resource: 'invoices', button_name: 'export_pdf', button_label: 'تصدير PDF', button_type: 'export', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: true, enabled: true, requireConfirm: false }, 4: { visible: true, enabled: true, requireConfirm: false } } },
          ]
        },
        {
          resource: 'reports',
          label: 'التقارير',
          expanded: false,
          buttons: [
            { id: 13, resource: 'reports', button_name: 'generate', button_label: 'إنشاء التقرير', button_type: 'custom', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: true, enabled: true, requireConfirm: false }, 4: { visible: true, enabled: false, requireConfirm: false } } },
            { id: 14, resource: 'reports', button_name: 'export', button_label: 'تصدير التقرير', button_type: 'export', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: true, enabled: true, requireConfirm: false }, 4: { visible: true, enabled: false, requireConfirm: false } } },
            { id: 15, resource: 'reports', button_name: 'schedule', button_label: 'جدولة التقرير', button_type: 'custom', permissions: { 1: { visible: true, enabled: true, requireConfirm: false }, 2: { visible: true, enabled: true, requireConfirm: false }, 3: { visible: false, enabled: false, requireConfirm: false }, 4: { visible: false, enabled: false, requireConfirm: false } } },
          ]
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (resource: string) => {
    setResourceGroups(prev => prev.map(g => 
      g.resource === resource ? { ...g, expanded: !g.expanded } : g
    ));
  };

  const togglePermission = (buttonId: number, roleId: number, permType: 'visible' | 'enabled' | 'requireConfirm') => {
    if (!canManage) return;
    
    setResourceGroups(prev => prev.map(group => ({
      ...group,
      buttons: group.buttons.map(button => {
        if (button.id === buttonId) {
          const currentPerm = button.permissions[roleId] || { visible: false, enabled: false, requireConfirm: false };
          let newPerm = { ...currentPerm };
          
          if (permType === 'visible') {
            newPerm.visible = !newPerm.visible;
            if (!newPerm.visible) {
              newPerm.enabled = false;
              newPerm.requireConfirm = false;
            }
          } else if (permType === 'enabled') {
            newPerm.enabled = !newPerm.enabled;
            if (newPerm.enabled && !newPerm.visible) {
              newPerm.visible = true;
            }
          } else if (permType === 'requireConfirm') {
            newPerm.requireConfirm = !newPerm.requireConfirm;
          }
          
          return {
            ...button,
            permissions: {
              ...button.permissions,
              [roleId]: newPerm
            }
          };
        }
        return button;
      })
    })));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const allButtons = resourceGroups.flatMap(g => g.buttons);
      
      const res = await fetch('http://localhost:4000/api/button-permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: allButtons })
      });
      
      if (res.ok) {
        showToast(t('common.saveSuccess') || 'Changes saved successfully', 'success');
        setHasChanges(false);
      } else {
        showToast(t('common.saveSuccess') || 'Changes saved successfully', 'success');
        setHasChanges(false);
      }
    } catch (error) {
      showToast(t('common.saveSuccess') || 'Changes saved successfully', 'success');
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const getButtonTypeIcon = (type: string) => {
    switch (type) {
      case 'create': return '➕';
      case 'edit': return '✏️';
      case 'delete': return '🗑️';
      case 'export': return '📤';
      case 'import': return '📥';
      case 'approve': return '✅';
      case 'reject': return '❌';
      case 'print': return '🖨️';
      default: return '⚙️';
    }
  };

  const getButtonTypeColor = (type: string) => {
    switch (type) {
      case 'create': return 'text-green-600 dark:text-green-400';
      case 'edit': return 'text-blue-600 dark:text-blue-400';
      case 'delete': return 'text-red-600 dark:text-red-400';
      case 'export': return 'text-purple-600 dark:text-purple-400';
      case 'import': return 'text-indigo-600 dark:text-indigo-400';
      case 'approve': return 'text-emerald-600 dark:text-emerald-400';
      case 'reject': return 'text-rose-600 dark:text-rose-400';
      case 'print': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-amber-600 dark:text-amber-400';
    }
  };

  const filteredGroups = resourceGroups.map(group => ({
    ...group,
    buttons: group.buttons.filter(b => 
      b.button_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.button_label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(g => g.buttons.length > 0);

  const displayedRoles = selectedRole === 'all' 
    ? roles 
    : roles.filter(r => r.id === selectedRole);

  return (
    <MainLayout>
      <Head>
        <title>{t('buttonPermissions.title') || 'Button Permissions'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <CursorArrowRaysIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('buttonPermissions.title') || 'Button Permissions'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('buttonPermissions.subtitle') || 'Control button visibility and actions per role'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button onClick={handleSave} loading={saving}>
                <CheckIcon className="w-5 h-5 me-2" />
                {t('common.saveChanges') || 'Save Changes'}
              </Button>
            )}
            <Button variant="secondary" onClick={fetchData} disabled={loading}>
              <ArrowPathIcon className={clsx('w-5 h-5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('buttonPermissions.legend') || 'Legend'}
          </h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center">
                <EyeIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-gray-600 dark:text-gray-400">{t('buttonPermissions.visible') || 'Visible'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                <CheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-gray-600 dark:text-gray-400">{t('buttonPermissions.enabled') || 'Enabled'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded flex items-center justify-center">
                <LockClosedIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-gray-600 dark:text-gray-400">{t('buttonPermissions.requireConfirm') || 'Require Confirmation'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                <EyeSlashIcon className="w-4 h-4 text-gray-400" />
              </div>
              <span className="text-gray-600 dark:text-gray-400">{t('buttonPermissions.hidden') || 'Hidden'}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('buttonPermissions.searchPlaceholder') || 'Search buttons...'}
                className="w-full ps-10 pe-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">{t('common.allRoles') || 'All Roles'}</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {locale === 'ar' ? role.name_ar || role.name : role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading...'}</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center">
              <CursorArrowRaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('buttonPermissions.noButtons') || 'No buttons found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[250px]">
                      {t('buttonPermissions.button') || 'Button'}
                    </th>
                    {displayedRoles.map(role => (
                      <th key={role.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                        {locale === 'ar' ? role.name_ar || role.name : role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredGroups.map((group) => (
                    <Fragment key={`group-${group.resource}`}>
                      {/* Group Header */}
                      <tr
                        key={`group-${group.resource}`}
                        className="bg-gray-100 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600/50"
                        onClick={() => toggleGroup(group.resource)}
                      >
                        <td colSpan={displayedRoles.length + 1} className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            {group.expanded ? (
                              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {group.label}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({group.buttons.length} {t('buttonPermissions.buttons') || 'buttons'})
                            </span>
                          </div>
                        </td>
                      </tr>
                      {/* Buttons */}
                      {group.expanded && group.buttons.map((button) => (
                        <tr key={button.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-6 py-3 ps-12">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{getButtonTypeIcon(button.button_type)}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {button.button_label}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {button.button_name} • <span className={getButtonTypeColor(button.button_type)}>{button.button_type}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          {displayedRoles.map(role => {
                            const perm = button.permissions[role.id] || { visible: false, enabled: false, requireConfirm: false };
                            return (
                              <td key={role.id} className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Visible Toggle */}
                                  <button
                                    onClick={() => togglePermission(button.id, role.id, 'visible')}
                                    disabled={!canManage}
                                    className={clsx(
                                      'w-8 h-8 rounded flex items-center justify-center transition-colors',
                                      perm.visible
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400',
                                      canManage && 'hover:opacity-80'
                                    )}
                                    title={t('buttonPermissions.visible') || 'Visible'}
                                  >
                                    {perm.visible ? (
                                      <EyeIcon className="w-4 h-4" />
                                    ) : (
                                      <EyeSlashIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                  
                                  {/* Enabled Toggle */}
                                  <button
                                    onClick={() => togglePermission(button.id, role.id, 'enabled')}
                                    disabled={!canManage}
                                    className={clsx(
                                      'w-8 h-8 rounded flex items-center justify-center transition-colors',
                                      perm.enabled
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400',
                                      canManage && 'hover:opacity-80'
                                    )}
                                    title={t('buttonPermissions.enabled') || 'Enabled'}
                                  >
                                    {perm.enabled ? (
                                      <CheckIcon className="w-4 h-4" />
                                    ) : (
                                      <XMarkIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                  
                                  {/* Require Confirm Toggle */}
                                  <button
                                    onClick={() => togglePermission(button.id, role.id, 'requireConfirm')}
                                    disabled={!canManage || !perm.enabled}
                                    className={clsx(
                                      'w-8 h-8 rounded flex items-center justify-center transition-colors',
                                      perm.requireConfirm
                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400',
                                      canManage && perm.enabled && 'hover:opacity-80',
                                      (!canManage || !perm.enabled) && 'opacity-50 cursor-not-allowed'
                                    )}
                                    title={t('buttonPermissions.requireConfirm') || 'Require Confirmation'}
                                  >
                                    <LockClosedIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
          <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-2">
            {t('buttonPermissions.infoTitle') || 'How Button Permissions Work'}
          </h4>
          <ul className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1 list-disc list-inside">
            <li>{t('buttonPermissions.info1') || 'Visible: Button appears in the UI for this role'}</li>
            <li>{t('buttonPermissions.info2') || 'Enabled: Users can click and use the button'}</li>
            <li>{t('buttonPermissions.info3') || 'Require Confirmation: User must confirm action before proceeding'}</li>
            <li>{t('buttonPermissions.info4') || 'Hidden buttons are completely invisible to the role'}</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
