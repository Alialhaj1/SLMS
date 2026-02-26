import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  permissions_count: number;
  users_count: number;
  is_system: boolean;
  created_at: string;
}

const MOCK_ROLES: Role[] = [
  { id: 1, name: 'super_admin', display_name: 'Super Admin', description: 'Full system access with all permissions', permissions_count: 128, users_count: 2, is_system: true, created_at: '2024-01-01' },
  { id: 2, name: 'admin', display_name: 'Admin', description: 'Company administrator with broad access', permissions_count: 95, users_count: 5, is_system: true, created_at: '2024-01-01' },
  { id: 3, name: 'manager', display_name: 'Manager', description: 'Department manager with approval rights', permissions_count: 62, users_count: 12, is_system: true, created_at: '2024-01-01' },
  { id: 4, name: 'user', display_name: 'Standard User', description: 'Regular user with basic access', permissions_count: 28, users_count: 45, is_system: true, created_at: '2024-01-01' },
  { id: 5, name: 'accountant', display_name: 'Accountant', description: 'Financial operations and reporting', permissions_count: 42, users_count: 8, is_system: false, created_at: '2024-06-15' },
  { id: 6, name: 'warehouse_staff', display_name: 'Warehouse Staff', description: 'Inventory and warehouse operations', permissions_count: 18, users_count: 15, is_system: false, created_at: '2024-08-20' },
  { id: 7, name: 'viewer', display_name: 'Viewer (Read-Only)', description: 'Read-only access to all modules', permissions_count: 14, users_count: 10, is_system: false, created_at: '2025-01-10' },
];

function RolesSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '' });

  useEffect(() => {
    const timer = setTimeout(() => { setRoles(MOCK_ROLES); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleCreate = () => {
    if (!newRole.name || !newRole.display_name) {
      showToast('error', t('common.requiredFields') || 'Please fill required fields');
      return;
    }
    setRoles(prev => [...prev, { ...newRole, id: Date.now(), permissions_count: 0, users_count: 0, is_system: false, created_at: new Date().toISOString().split('T')[0] }]);
    setNewRole({ name: '', display_name: '', description: '' });
    setShowCreate(false);
    showToast('success', t('common.created') || 'Role created');
  };

  const filtered = roles.filter(r => r.display_name.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <MainLayout>
      <Head><title>{t('settings.roles') || 'Role Management'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.roles') || 'Role Management'}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.rolesDesc') || 'Manage roles and their associated permissions.'}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            {t('settings.createRole') || 'Create Role'}
          </button>
        </div>

        <div>
          <input type="text" placeholder={t('common.search') || 'Search roles...'} value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.role') || 'Role'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('common.description') || 'Description'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('settings.permissions') || 'Permissions'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('settings.users') || 'Users'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('common.type') || 'Type'}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(role => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-slate-750">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{role.display_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{role.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">{role.description}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{role.permissions_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{role.users_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${role.is_system ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {role.is_system ? (t('settings.system') || 'System') : (t('settings.custom') || 'Custom')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm mr-3">{t('settings.editPermissions') || 'Permissions'}</button>
                      {!role.is_system && <button className="text-gray-400 hover:text-red-600 dark:text-gray-500 text-sm">{t('common.delete') || 'Delete'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.createRole') || 'Create New Role'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.roleName') || 'Role Name (key)'} <span className="text-red-500">*</span></label>
                  <input value={newRole.name} onChange={e => setNewRole(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} placeholder="e.g. quality_inspector" className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.displayName') || 'Display Name'} <span className="text-red-500">*</span></label>
                  <input value={newRole.display_name} onChange={e => setNewRole(p => ({ ...p, display_name: e.target.value }))} placeholder="e.g. Quality Inspector" className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.description') || 'Description'}</label>
                  <textarea value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowCreate(false); setNewRole({ name: '', display_name: '', description: '' }); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800">{t('common.cancel') || 'Cancel'}</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">{t('common.create') || 'Create'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('roles:view', RolesSettingsPage);
