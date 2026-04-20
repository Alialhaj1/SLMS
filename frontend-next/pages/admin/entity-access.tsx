import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useLocale } from '../../contexts/LocaleContext';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  BuildingOfficeIcon,
  CubeIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EntityPermissions {
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_endorse: boolean;
}

interface EntityAccessRecord extends EntityPermissions {
  id: number;
  user_id: number;
  entity_type: string;
  entity_id: number;
  entity_name?: string;
  entity_name_ar?: string;
  entity_code?: string;
  is_active: boolean;
  is_home_branch?: boolean;
  assigned_by_name?: string;
  created_at: string;
}

interface UserInfo {
  id: number;
  email: string;
  full_name: string;
  username?: string;
  is_active: boolean;
  is_tenant_admin: boolean;
  role_name?: string;
}

interface EntityInfo {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  type?: string;
  is_active: boolean;
  branch_name?: string;
  warehouse_type?: string;
  level?: number;
}

interface UserAccessSummary {
  user_id: number;
  email: string;
  full_name: string;
  branches: EntityAccessRecord[];
  warehouses: EntityAccessRecord[];
  cost_centers: EntityAccessRecord[];
}

type EntityType = 'branch' | 'warehouse' | 'cost_center';
type TabType = 'branches' | 'warehouses' | 'cost_centers';

const DEFAULT_PERMISSIONS: EntityPermissions = {
  can_read: false,
  can_create: false,
  can_update: false,
  can_delete: false,
  can_approve: false,
  can_reject: false,
  can_endorse: false,
};

const PERMISSION_LABELS: Record<keyof EntityPermissions, { en: string; ar: string; color: string }> = {
  can_read:    { en: 'Read',    ar: 'قراءة',   color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  can_create:  { en: 'Create',  ar: 'إنشاء',   color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  can_update:  { en: 'Update',  ar: 'تعديل',   color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  can_delete:  { en: 'Delete',  ar: 'حذف',     color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  can_approve: { en: 'Approve', ar: 'موافقة',   color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  can_reject:  { en: 'Reject',  ar: 'رفض',     color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  can_endorse: { en: 'Endorse', ar: 'اعتماد',   color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
};

const ROLE_PRESETS: Record<string, { label_en: string; label_ar: string; permissions: EntityPermissions }> = {
  accountant: {
    label_en: 'Accountant',
    label_ar: 'محاسب',
    permissions: { can_read: true, can_create: true, can_update: true, can_delete: false, can_approve: false, can_reject: false, can_endorse: false },
  },
  reviewer: {
    label_en: 'Reviewer',
    label_ar: 'مراجع',
    permissions: { can_read: true, can_create: false, can_update: true, can_delete: false, can_approve: true, can_reject: true, can_endorse: false },
  },
  financial_manager: {
    label_en: 'Financial Manager',
    label_ar: 'مدير مالي',
    permissions: { can_read: true, can_create: false, can_update: false, can_delete: false, can_approve: true, can_reject: true, can_endorse: true },
  },
  full_access: {
    label_en: 'Full Access',
    label_ar: 'صلاحية كاملة',
    permissions: { can_read: true, can_create: true, can_update: true, can_delete: true, can_approve: true, can_reject: true, can_endorse: true },
  },
  read_only: {
    label_en: 'Read Only',
    label_ar: 'قراءة فقط',
    permissions: { can_read: true, can_create: false, can_update: false, can_delete: false, can_approve: false, can_reject: false, can_endorse: false },
  },
};

const ENTITY_TYPE_MAP: Record<TabType, EntityType> = {
  branches: 'branch',
  warehouses: 'warehouse',
  cost_centers: 'cost_center',
};

// ─── Component ──────────────────────────────────────────────────────────────

function EntityAccessPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { locale, dir } = useLocale();
  const isAr = locale === 'ar';

  // Data state
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [availableEntities, setAvailableEntities] = useState<{
    branches: EntityInfo[];
    warehouses: EntityInfo[];
    cost_centers: EntityInfo[];
  }>({ branches: [], warehouses: [], cost_centers: [] });

  // Selection state
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userAccess, setUserAccess] = useState<UserAccessSummary | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('branches');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);

  // Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EntityAccessRecord | null>(null);
  const [formEntityId, setFormEntityId] = useState<number | ''>('');
  const [formPermissions, setFormPermissions] = useState<EntityPermissions>({ ...DEFAULT_PERMISSIONS });
  const [formIsHome, setFormIsHome] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ entityType: EntityType; entityId: number; userId: number } | null>(null);

  const canManage = hasPermission('entity_access:manage');

  // ─── API Helpers ──────────────────────────────────────────────────────────

  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`/api${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.error_ar || 'Request failed');
    return data;
  }, []);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, entitiesRes] = await Promise.all([
        apiCall('/entity-access/users'),
        apiCall('/entity-access/available-entities'),
      ]);
      setUsers(usersRes.data || []);
      setAvailableEntities(entitiesRes.data || { branches: [], warehouses: [], cost_centers: [] });
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [apiCall, showToast]);

  const loadUserAccess = useCallback(async (userId: number) => {
    setAccessLoading(true);
    try {
      const res = await apiCall(`/entity-access/user/${userId}`);
      setUserAccess(res.data);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setAccessLoading(false);
    }
  }, [apiCall, showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (selectedUser) {
      loadUserAccess(selectedUser.id);
    } else {
      setUserAccess(null);
    }
  }, [selectedUser, loadUserAccess]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAssignNew = () => {
    setEditingRecord(null);
    setFormEntityId('');
    setFormPermissions({ ...DEFAULT_PERMISSIONS });
    setFormIsHome(false);
    setAssignModalOpen(true);
  };

  const handleEditAccess = (record: EntityAccessRecord) => {
    setEditingRecord(record);
    setFormEntityId(record.entity_id);
    setFormPermissions({
      can_read: record.can_read,
      can_create: record.can_create,
      can_update: record.can_update,
      can_delete: record.can_delete,
      can_approve: record.can_approve,
      can_reject: record.can_reject,
      can_endorse: record.can_endorse,
    });
    setFormIsHome(record.is_home_branch ?? false);
    setAssignModalOpen(true);
  };

  const handleSubmitAccess = async () => {
    if (!selectedUser || !formEntityId) return;

    try {
      await apiCall(editingRecord ? '/entity-access/update' : '/entity-access/assign', {
        method: editingRecord ? 'PUT' : 'POST',
        body: JSON.stringify({
          user_id: selectedUser.id,
          entity_type: ENTITY_TYPE_MAP[activeTab],
          entity_id: formEntityId,
          permissions: formPermissions,
          is_home_branch: activeTab === 'branches' ? formIsHome : undefined,
        }),
      });
      showToast({ type: 'success', message: isAr ? 'تم حفظ الصلاحية بنجاح' : 'Access saved successfully' });
      setAssignModalOpen(false);
      loadUserAccess(selectedUser.id);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    }
  };

  const handleRemoveAccess = async () => {
    if (!deleteConfirm) return;
    try {
      await apiCall(
        `/entity-access/${deleteConfirm.entityType}/${deleteConfirm.entityId}/user/${deleteConfirm.userId}`,
        { method: 'DELETE' }
      );
      showToast({ type: 'success', message: isAr ? 'تم إزالة الصلاحية' : 'Access removed' });
      setDeleteConfirm(null);
      if (selectedUser) loadUserAccess(selectedUser.id);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = ROLE_PRESETS[presetKey];
    if (preset) {
      setFormPermissions({ ...preset.permissions });
    }
  };

  // ─── Filtered Data ────────────────────────────────────────────────────────

  const filteredUsers = users.filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term)
    );
  });

  const currentAccessList = userAccess
    ? activeTab === 'branches' ? userAccess.branches
      : activeTab === 'warehouses' ? userAccess.warehouses
      : userAccess.cost_centers
    : [];

  const assignedEntityIds = new Set(currentAccessList.map(r => r.entity_id));
  const entityOptions = (
    activeTab === 'branches' ? availableEntities.branches
      : activeTab === 'warehouses' ? availableEntities.warehouses
      : availableEntities.cost_centers
  ).filter(e => !assignedEntityIds.has(e.id) || editingRecord?.entity_id === e.id);

  // ─── Render ───────────────────────────────────────────────────────────────

  const tabs: { key: TabType; label_en: string; label_ar: string; icon: typeof BuildingStorefrontIcon; count: number }[] = [
    { key: 'branches', label_en: 'Branches', label_ar: 'الفروع', icon: BuildingStorefrontIcon, count: userAccess?.branches?.length || 0 },
    { key: 'warehouses', label_en: 'Warehouses', label_ar: 'المخازن', icon: CubeIcon, count: userAccess?.warehouses?.length || 0 },
    { key: 'cost_centers', label_en: 'Cost Centers', label_ar: 'مراكز التكلفة', icon: BuildingOfficeIcon, count: userAccess?.cost_centers?.length || 0 },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{isAr ? 'صلاحيات الكيانات' : 'Entity Access Control'}</title>
      </Head>

      <div className="space-y-6" dir={dir}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isAr ? 'صلاحيات الفروع والكيانات' : 'Entity Access Control'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isAr
                ? 'إدارة صلاحيات المستخدمين للفروع والمخازن ومراكز التكلفة'
                : 'Manage user access to branches, warehouses, and cost centers'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel: User List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <UserGroupIcon className="h-5 w-5 text-gray-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {isAr ? 'المستخدمون' : 'Users'}
                  </h2>
                </div>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute top-2.5 left-3 text-gray-400 rtl:left-auto rtl:right-3" />
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث...' : 'Search...'}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-400">
                    <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    {isAr ? 'لا يوجد مستخدمون' : 'No users found'}
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left rtl:text-right px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        selectedUser?.id === user.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 rtl:border-l-0 rtl:border-r-4 border-l-indigo-500 rtl:border-r-indigo-500'
                          : ''
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {user.full_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {user.role_name && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                            {user.role_name}
                          </span>
                        )}
                        {user.is_tenant_admin && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            {isAr ? 'مدير' : 'Admin'}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Access Management */}
          <div className="lg:col-span-3">
            {!selectedUser ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <ShieldCheckIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {isAr ? 'اختر مستخدم لإدارة صلاحياته' : 'Select a user to manage their access'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* User Info Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedUser.full_name}
                      </h2>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                      {selectedUser.is_tenant_admin && (
                        <span className="inline-block mt-1 text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          {isAr ? '⚡ مدير النظام — لديه صلاحية كاملة لجميع الكيانات' : '⚡ Tenant Admin — Full access to all entities'}
                        </span>
                      )}
                    </div>
                    {/* Summary Badges */}
                    <div className="flex gap-3">
                      {tabs.map(tab => (
                        <div key={tab.key} className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{tab.count}</div>
                          <div className="text-xs text-gray-500">{isAr ? tab.label_ar : tab.label_en}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex">
                      {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === tab.key
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {isAr ? tab.label_ar : tab.label_en}
                            <span className="ml-1 rtl:mr-1 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                              {tab.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tab Header + Add Button */}
                  <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {isAr
                        ? `صلاحيات ${activeTab === 'branches' ? 'الفروع' : activeTab === 'warehouses' ? 'المخازن' : 'مراكز التكلفة'}`
                        : `${activeTab === 'branches' ? 'Branch' : activeTab === 'warehouses' ? 'Warehouse' : 'Cost Center'} Access`}
                    </h3>
                    {canManage && !selectedUser.is_tenant_admin && (
                      <button
                        onClick={handleAssignNew}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                      >
                        <PlusIcon className="h-4 w-4" />
                        {isAr ? 'إضافة' : 'Add'}
                      </button>
                    )}
                  </div>

                  {/* Access Table */}
                  <div className="overflow-x-auto">
                    {accessLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                      </div>
                    ) : currentAccessList.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">
                        {selectedUser.is_tenant_admin
                          ? (isAr ? 'مدير النظام لديه صلاحية كاملة تلقائياً' : 'Tenant admin has full access automatically')
                          : (isAr ? 'لا توجد صلاحيات محددة' : 'No access records')}
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700/50">
                            <th className="px-4 py-2.5 text-start font-medium text-gray-600 dark:text-gray-300">
                              {isAr ? 'الكيان' : 'Entity'}
                            </th>
                            {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                              <th key={key} className="px-2 py-2.5 text-center font-medium text-gray-600 dark:text-gray-300">
                                <span className="text-xs">{isAr ? label.ar : label.en}</span>
                              </th>
                            ))}
                            {canManage && (
                              <th className="px-3 py-2.5 text-center font-medium text-gray-600 dark:text-gray-300">
                                {isAr ? 'إجراءات' : 'Actions'}
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {currentAccessList.map(record => (
                            <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {isAr ? record.entity_name_ar || record.entity_name : record.entity_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {record.entity_code}
                                  {record.is_home_branch && (
                                    <span className="ml-2 rtl:mr-2 px-1 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                                      {isAr ? 'الفرع الرئيسي' : 'Home'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {(Object.keys(PERMISSION_LABELS) as Array<keyof EntityPermissions>).map(perm => (
                                <td key={perm} className="px-2 py-3 text-center">
                                  {record[perm] ? (
                                    <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />
                                  ) : (
                                    <XMarkIcon className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                                  )}
                                </td>
                              ))}
                              {canManage && (
                                <td className="px-3 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleEditAccess(record)}
                                      className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                      title={isAr ? 'تعديل' : 'Edit'}
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm({
                                        entityType: ENTITY_TYPE_MAP[activeTab],
                                        entityId: record.entity_id,
                                        userId: record.user_id,
                                      })}
                                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                      title={isAr ? 'حذف' : 'Remove'}
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign/Edit Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" dir={dir}>
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingRecord
                  ? (isAr ? 'تعديل الصلاحية' : 'Edit Access')
                  : (isAr ? 'إضافة صلاحية جديدة' : 'Add New Access')}
              </h3>
            </div>

            <div className="p-5 space-y-5">
              {/* Entity Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isAr
                    ? activeTab === 'branches' ? 'الفرع' : activeTab === 'warehouses' ? 'المخزن' : 'مركز التكلفة'
                    : activeTab === 'branches' ? 'Branch' : activeTab === 'warehouses' ? 'Warehouse' : 'Cost Center'}
                </label>
                <select
                  value={formEntityId}
                  onChange={e => setFormEntityId(e.target.value ? parseInt(e.target.value, 10) : '')}
                  disabled={!!editingRecord}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                >
                  <option value="">{isAr ? '— اختر —' : '— Select —'}</option>
                  {entityOptions.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.code ? `[${e.code}] ` : ''}{isAr ? (e.name_ar || e.name) : e.name}
                      {e.branch_name ? ` (${e.branch_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Home Branch Toggle (branches only) */}
              {activeTab === 'branches' && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formIsHome}
                    onChange={e => setFormIsHome(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {isAr ? 'تعيين كفرع رئيسي' : 'Set as Home Branch'}
                </label>
              )}

              {/* Role Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isAr ? 'قوالب جاهزة' : 'Quick Presets'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {isAr ? preset.label_ar : preset.label_en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission Toggles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isAr ? 'الصلاحيات' : 'Permissions'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(PERMISSION_LABELS) as [keyof EntityPermissions, typeof PERMISSION_LABELS[keyof EntityPermissions]][]).map(([key, label]) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        formPermissions[key]
                          ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formPermissions[key]}
                        onChange={e => setFormPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={`text-sm font-medium px-1.5 py-0.5 rounded ${label.color}`}>
                        {isAr ? label.ar : label.en}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSubmitAccess}
                disabled={!formEntityId || !Object.values(formPermissions).some(v => v)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isAr ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" dir={dir}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {isAr ? 'تأكيد الحذف' : 'Confirm Removal'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {isAr
                ? 'هل أنت متأكد من إزالة هذه الصلاحية؟ لن يتمكن المستخدم من الوصول لهذا الكيان.'
                : 'Are you sure you want to remove this access? The user will no longer be able to access this entity.'}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleRemoveAccess}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                {isAr ? 'حذف' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.System.EntityAccess.View, EntityAccessPage);
