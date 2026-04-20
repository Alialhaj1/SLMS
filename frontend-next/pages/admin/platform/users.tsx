/**
 * ============================================================================
 * PLATFORM USERS - Admin User Management
 * ============================================================================
 * Full CRUD for platform-level users with roles, 2FA, impersonate toggle,
 * protected super_admin accounts, search, and pagination.
 *
 * @module pages/admin/platform/users
 * @version 2.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  XMarkIcon,
  EyeIcon,
  KeyIcon,
  FingerPrintIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

/* ── Types ── */
interface PlatformUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  two_factor_enabled?: boolean;
  can_impersonate?: boolean;
  last_login: string | null;
  created_at: string;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  two_factor_enabled: boolean;
  can_impersonate: boolean;
}

/* ── Constants ── */
const ROLES = [
  { value: 'super_admin', label: 'Super Admin', labelAr: 'مشرف رئيسي', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'platform_admin', label: 'Platform Admin', labelAr: 'مدير المنصة', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'platform_support', label: 'Support', labelAr: 'دعم فني', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
];

const STATUS_MAP: Record<string, { label: string; labelAr: string; color: string }> = {
  active: { label: 'Active', labelAr: 'نشط', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  inactive: { label: 'Inactive', labelAr: 'غير نشط', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400' },
  suspended: { label: 'Suspended', labelAr: 'معلّق', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const emptyForm: UserFormData = {
  name: '', email: '', phone: '', role: 'platform_admin',
  password: '', two_factor_enabled: false, can_impersonate: false,
};

/* ── Main Page ── */
export default function PlatformUsersPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [viewUser, setViewUser] = useState<PlatformUser | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PlatformUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setLoading(false); return; }
      const params = new URLSearchParams({
        page: String(page), limit: String(pageSize),
        ...(search && { search }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      });
      const res = await fetch(`http://localhost:4000/api/platform/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setUsers(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total || json.meta?.total || json.pagination?.total || 0);
    } catch {
      // Silently fail on loading
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(total / pageSize);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (u: PlatformUser) => {
    setEditingUser(u);
    setForm({
      name: u.name || '', email: u.email || '', phone: u.phone || '',
      role: u.role || 'user', password: '', two_factor_enabled: u.two_factor_enabled || false,
      can_impersonate: u.can_impersonate || false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!(form.name || '').trim() || !(form.email || '').trim()) {
      showToast('error', isRTL ? 'الاسم والبريد مطلوبان' : 'Name and email are required');
      return;
    }
    if (!editingUser && !form.password) {
      showToast('error', isRTL ? 'كلمة المرور مطلوبة للمستخدم الجديد' : 'Password is required for new user');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `http://localhost:4000/api/platform/users/${editingUser.id}` : 'http://localhost:4000/api/platform/users';
      const body: any = { ...form };
      if (editingUser && !body.password) delete body.password;
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', editingUser
        ? (isRTL ? 'تم تحديث المستخدم' : 'User updated')
        : (isRTL ? 'تم إنشاء المستخدم' : 'User created'));
      setShowModal(false);
      fetchUsers();
    } catch {
      showToast('error', isRTL ? 'فشل في الحفظ' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.role === 'super_admin') {
      showToast('error', isRTL ? 'لا يمكن حذف المشرف الرئيسي' : 'Cannot delete super admin');
      setConfirmDelete(null);
      return;
    }
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/platform/users/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', isRTL ? 'تم حذف المستخدم' : 'User deleted');
      setConfirmDelete(null);
      fetchUsers();
    } catch {
      showToast('error', isRTL ? 'فشل في الحذف' : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[2];

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'مستخدمو المنصة' : 'Platform Users'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {isRTL ? '👤 مستخدمو المنصة' : '👤 Platform Users'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRTL ? 'إدارة فريق المنصة — المشرفون والدعم الفني' : 'Manage platform team — admins and support staff'}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            {isRTL ? 'مستخدم جديد' : 'Add User'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={isRTL ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
              className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
            {[{ value: 'all', label: isRTL ? 'الكل' : 'All' }, ...ROLES.map(r => ({ value: r.value, label: isRTL ? r.labelAr : r.label }))].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setRoleFilter(opt.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${roleFilter === opt.value ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-5 py-3 text-start font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isRTL ? 'المستخدم' : 'User'}</th>
                  <th className="px-5 py-3 text-start font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isRTL ? 'الدور' : 'Role'}</th>
                  <th className="px-5 py-3 text-start font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="px-5 py-3 text-center font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">2FA</th>
                  <th className="px-5 py-3 text-center font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isRTL ? 'الانتحال' : 'Impersonate'}</th>
                  <th className="px-5 py-3 text-start font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isRTL ? 'آخر دخول' : 'Last Login'}</th>
                  <th className="px-5 py-3 text-end font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isRTL ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-gray-200 dark:bg-slate-600 rounded-full" /><div><div className="h-3.5 bg-gray-200 dark:bg-slate-600 rounded w-24 mb-1.5" /><div className="h-2.5 bg-gray-200 dark:bg-slate-600 rounded w-32" /></div></div></td>
                      <td className="px-5 py-4"><div className="h-5 bg-gray-200 dark:bg-slate-600 rounded w-20" /></td>
                      <td className="px-5 py-4"><div className="h-5 bg-gray-200 dark:bg-slate-600 rounded w-14" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-8 mx-auto" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-8 mx-auto" /></td>
                      <td className="px-5 py-4"><div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-20" /></td>
                      <td className="px-5 py-4"><div className="h-7 bg-gray-200 dark:bg-slate-600 rounded w-16 ms-auto" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <UserCircleIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{isRTL ? 'لا يوجد مستخدمون' : 'No platform users found'}</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const roleInfo = getRoleInfo(u.role);
                    const statusInfo = STATUS_MAP[u.status] || STATUS_MAP.inactive;
                    const isSuperAdmin = u.role === 'super_admin';
                    const avatarColors: Record<string, string> = {
                      super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-2 ring-red-300 dark:ring-red-700',
                      platform_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                      platform_support: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
                    };
                    return (
                      <tr key={u.id} className={`transition-colors ${isSuperAdmin ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                        {/* User info */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColors[u.role] || avatarColors.platform_support}`}>
                              {u.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                                {u.name}
                                {isSuperAdmin && <ShieldCheckIcon className="h-4 w-4 text-red-500 shrink-0" />}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        {/* Role */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleInfo.color}`}>
                            {isRTL ? roleInfo.labelAr : roleInfo.label}
                          </span>
                          {isSuperAdmin && (
                            <span className="ms-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                              {isRTL ? 'محمي' : 'PROTECTED'}
                            </span>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                            {isRTL ? statusInfo.labelAr : statusInfo.label}
                          </span>
                        </td>
                        {/* 2FA */}
                        <td className="px-5 py-3.5 text-center">
                          {u.two_factor_enabled ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" title={isRTL ? 'مفعّل' : 'Enabled'} />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-300 dark:text-slate-600 mx-auto" title={isRTL ? 'غير مفعّل' : 'Disabled'} />
                          )}
                        </td>
                        {/* Impersonation */}
                        <td className="px-5 py-3.5 text-center">
                          {u.can_impersonate ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              {isRTL ? 'مسموح' : 'YES'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        {/* Last Login */}
                        <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                          {u.last_login ? new Date(u.last_login).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '—'}
                        </td>
                        {/* Actions — HIDDEN for super_admin */}
                        <td className="px-5 py-3.5">
                          {isSuperAdmin ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              🛡 {isRTL ? 'محمي' : 'Protected'}
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewUser(u)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title={isRTL ? 'عرض' : 'View'}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEdit(u)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                title={isRTL ? 'تعديل' : 'Edit'}
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(u)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title={isRTL ? 'حذف' : 'Delete'}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-gray-500">{isRTL ? `${total} مستخدم` : `${total} users`}</span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── View Details Modal ── */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewUser(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isRTL ? 'تفاصيل المستخدم' : 'User Details'}</h3>
              <button onClick={() => setViewUser(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl ${viewUser.role === 'super_admin' ? 'bg-red-100 text-red-700 ring-2 ring-red-300' : 'bg-blue-50 text-blue-600'}`}>
                  {viewUser.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {viewUser.name}
                    {viewUser.role === 'super_admin' && <ShieldCheckIcon className="h-5 w-5 text-red-500" />}
                  </h4>
                  <p className="text-sm text-gray-400">{viewUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  [isRTL ? 'الدور' : 'Role', getRoleInfo(viewUser.role)[isRTL ? 'labelAr' : 'label']],
                  [isRTL ? 'الحالة' : 'Status', STATUS_MAP[viewUser.status]?.[isRTL ? 'labelAr' : 'label'] || viewUser.status],
                  ['2FA', viewUser.two_factor_enabled ? '✅' : '❌'],
                  [isRTL ? 'الهاتف' : 'Phone', viewUser.phone || '—'],
                  [isRTL ? 'آخر دخول' : 'Last Login', viewUser.last_login ? new Date(viewUser.last_login).toLocaleString(isRTL ? 'ar-SA' : 'en-US') : '—'],
                  [isRTL ? 'تاريخ الإنشاء' : 'Created', new Date(viewUser.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')],
                ].map(([label, val], i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{val}</p>
                  </div>
                ))}
              </div>
              {viewUser.role === 'super_admin' && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                  🛡 {isRTL ? 'هذا الحساب محمي — لا يمكن حذفه أو تعطيله من واجهة المنصة' : 'This account is protected and cannot be deleted from the platform'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingUser ? (isRTL ? '✏️ تعديل المستخدم' : '✏️ Edit User') : (isRTL ? '➕ مستخدم جديد' : '➕ New User')}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'الاسم' : 'Full Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'البريد' : 'Email'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{isRTL ? 'الهاتف' : 'Phone'}</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{isRTL ? 'الدور' : 'Role'} <span className="text-red-500">*</span></label>
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{isRTL ? r.labelAr : r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  {isRTL ? 'كلمة المرور' : 'Password'} {!editingUser && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={editingUser ? (isRTL ? 'اتركها فارغة لعدم التغيير' : 'Leave blank to keep unchanged') : ''}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FingerPrintIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{isRTL ? 'المصادقة الثنائية 2FA' : 'Two-Factor Auth (2FA)'}</p>
                      <p className="text-xs text-gray-400">{isRTL ? 'تفعيل المصادقة الثنائية للحماية الإضافية' : 'Enable 2FA for extra security'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setForm(p => ({ ...p, two_factor_enabled: !p.two_factor_enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.two_factor_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${form.two_factor_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <KeyIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{isRTL ? 'صلاحية الانتحال' : 'Can Impersonate'}</p>
                      <p className="text-xs text-gray-400">{isRTL ? 'السماح بالدخول كأحد المستأجرين' : 'Allow logging in as tenant users'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setForm(p => ({ ...p, can_impersonate: !p.can_impersonate }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.can_impersonate ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${form.can_impersonate ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {editingUser ? (isRTL ? 'حفظ' : 'Save') : (isRTL ? 'إنشاء' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{isRTL ? 'حذف المستخدم' : 'Delete User'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? `هل أنت متأكد من حذف "${confirmDelete.name}"؟` : `Delete "${confirmDelete.name}"?`}
              </p>
              <p className="text-xs text-gray-400 mt-1">{isRTL ? 'هذا الإجراء لا يمكن التراجع عنه' : 'This action cannot be undone'}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {deleting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isRTL ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
