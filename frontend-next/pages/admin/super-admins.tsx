/**
 * ============================================================================
 * SUPER ADMINS - Protected System Admin Display
 * ============================================================================
 * Red-themed shield display showing super_admin accounts with absolute
 * permissions. No edit/delete — these are protected foundational accounts.
 *
 * @module pages/admin/super-admins
 * @version 2.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

/* ── Types ── */
interface SuperAdmin {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  two_factor_enabled?: boolean;
  last_login_at?: string;
  created_at: string;
}

export default function SuperAdminsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setLoading(false); return; }
      const res = await fetch('/api/platform/users?role=super_admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      setAdmins(list);
    } catch {
      // Use demo data
      setAdmins([
        {
          id: 1, email: 'ali@alhajco.com', first_name: 'Ali', last_name: 'Al-Haj',
          phone: '+966 50 123 4567',
          is_active: true, two_factor_enabled: true, created_at: '2024-01-01T00:00:00Z',
          last_login_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const getInitials = (admin: SuperAdmin) => {
    if (admin.first_name || admin.last_name) {
      return `${(admin.first_name || '')[0] || ''}${(admin.last_name || '')[0] || ''}`.toUpperCase();
    }
    return admin.email.substring(0, 2).toUpperCase();
  };

  /* ── Absolute Permissions List ── */
  const PERMISSIONS = [
    isRTL ? 'إدارة جميع المستأجرين' : 'Manage all tenants',
    isRTL ? 'إنشاء/حذف الشركات' : 'Create/delete companies',
    isRTL ? 'تعديل خطط الاشتراك' : 'Modify subscription plans',
    isRTL ? 'الوصول لجميع البيانات' : 'Access all data',
    isRTL ? 'انتحال شخصية المستخدمين' : 'Impersonate any user',
    isRTL ? 'إدارة إعدادات المنصة' : 'Platform settings management',
    isRTL ? 'تشغيل/إيقاف الوحدات' : 'Enable/disable modules',
    isRTL ? 'إدارة النسخ الاحتياطية' : 'Backup management',
    isRTL ? 'مراجعة سجلات التدقيق' : 'Audit log review',
    isRTL ? 'إعادة تعيين كلمات المرور' : 'Reset passwords',
  ];

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'المسؤولون الأعلى' : 'Super Admins'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="h-7 w-7 text-red-600" />
              {isRTL ? 'المسؤولون الأعلى' : 'Super Administrators'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRTL ? 'حسابات مؤمّنة بصلاحيات مطلقة — للقراءة فقط' : 'Protected accounts with absolute privileges — read only'}
            </p>
          </div>
          <button
            onClick={fetchAdmins}
            className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Protection Warning Banner */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex gap-3">
          <LockClosedIcon className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-700 dark:text-red-400">
              {isRTL ? '🔒 حسابات محميّة — لا يمكن تعديلها أو حذفها' : '🔒 Protected Accounts — Cannot be edited or deleted'}
            </h3>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              {isRTL
                ? 'هذه الحسابات لها صلاحيات مطلقة على المنصة بالكامل. أي تغيير يتطلب الوصول المباشر لقاعدة البيانات.'
                : 'These accounts have absolute privileges across the entire platform. Any changes require direct database access.'}
            </p>
          </div>
        </div>

        {/* Admin Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-slate-600 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-32" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheckIcon className="h-14 w-14 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
              {isRTL ? 'لا يوجد مسؤولون أعلى' : 'No super admins found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {admins.map(admin => (
              <div key={admin.id}
                className="bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-red-900/10 rounded-xl border-2 border-red-200 dark:border-red-900/50 p-6 relative overflow-hidden"
              >
                {/* Shield watermark */}
                <ShieldCheckIcon className="absolute -bottom-4 -right-4 rtl:-left-4 rtl:right-auto h-32 w-32 text-red-100 dark:text-red-900/20 pointer-events-none" />

                <div className="relative z-10">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xl font-extrabold shadow-lg ring-4 ring-red-200 dark:ring-red-900/50">
                      {getInitials(admin)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {admin.full_name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || admin.email.split('@')[0]}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono" dir="ltr">{admin.email}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-bold uppercase">
                        <ShieldCheckIcon className="h-3 w-3" />
                        super_admin
                      </span>
                    </div>
                  </div>

                  {/* Status Row (QA 05) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    <div className="text-center p-2.5 bg-white/60 dark:bg-slate-700/50 rounded-lg">
                      <p className="text-[10px] text-gray-400 mb-0.5">{isRTL ? 'الحالة' : 'Status'}</p>
                      <p className="text-xs font-bold">
                        {admin.is_active ? (
                          <span className="text-green-600 dark:text-green-400">✅ {isRTL ? 'نشط' : 'Active'}</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">{isRTL ? 'معطّل' : 'Inactive'}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-center p-2.5 bg-white/60 dark:bg-slate-700/50 rounded-lg">
                      <p className="text-[10px] text-gray-400 mb-0.5">{isRTL ? 'الجوال' : 'Phone'}</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300" dir="ltr">
                        {admin.phone || '—'}
                      </p>
                    </div>
                    <div className="text-center p-2.5 bg-white/60 dark:bg-slate-700/50 rounded-lg">
                      <p className="text-[10px] text-gray-400 mb-0.5">2FA</p>
                      <p className="text-xs font-bold">
                        {admin.two_factor_enabled ? (
                          <span className="text-green-600 dark:text-green-400">🔐 {isRTL ? 'مفعّل' : 'Enabled'}</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">⚠️ {isRTL ? 'معطّل' : 'Disabled'}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-center p-2.5 bg-white/60 dark:bg-slate-700/50 rounded-lg">
                      <p className="text-[10px] text-gray-400 mb-0.5">{isRTL ? 'آخر دخول' : 'Last Login'}</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {admin.last_login_at
                          ? new Date(admin.last_login_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Account Age */}
                  <div className="text-xs text-gray-400 mb-3">
                    {isRTL ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(admin.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                  </div>

                  {/* Per-card Protection Text (QA 03) */}
                  <div className="p-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg">
                    <p className="text-[11px] font-semibold text-red-700 dark:text-red-400">
                      {isRTL ? '🔒 هذا الحساب لا يمكن حذفه أو تعديله من واجهة المنصة' : '🔒 This account cannot be deleted or edited from the platform UI'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Absolute Permissions Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <LockClosedIcon className="h-4 w-4 text-red-600" />
            {isRTL ? 'الصلاحيات المطلقة' : 'Absolute Permissions'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERMISSIONS.map((perm, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-red-50/50 dark:bg-red-900/10 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-[10px] font-bold shrink-0">✓</span>
                <span className="text-xs text-gray-700 dark:text-gray-300">{perm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {isRTL ? 'ملاحظات أمنية' : 'Security Notes'}
              </h3>
              <ul className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 space-y-0.5 list-disc list-inside">
                <li>{isRTL ? 'يتم تجاوز جميع فحوصات الصلاحيات لحسابات super_admin' : 'All RBAC permission checks are bypassed for super_admin accounts'}</li>
                <li>{isRTL ? 'جميع إجراءات super_admin مسجّلة في سجل التدقيق' : 'All super_admin actions are logged in the audit trail'}</li>
                <li>{isRTL ? 'يُنصح بتفعيل المصادقة الثنائية (2FA) لجميع الحسابات' : '2FA is strongly recommended for all super_admin accounts'}</li>
                <li>{isRTL ? 'يُمنع مشاركة بيانات الدخول بأي شكل' : 'Credentials must never be shared under any circumstances'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
