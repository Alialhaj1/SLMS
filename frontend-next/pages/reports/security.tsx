import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import { ShieldCheckIcon, EyeIcon, ArrowDownTrayIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

type SecurityEventType = 'login' | 'failed_login' | 'permission_change' | 'data_export';
type SecuritySeverity = 'low' | 'medium' | 'high';

interface SecurityEvent {
  id: number;
  time: string;
  user: string;
  userAr: string;
  ip: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  description: string;
  descriptionAr: string;
}

const mockEvents: SecurityEvent[] = [
  { id: 1, time: '2025-12-20 09:12', user: 'admin@slms.local', userAr: 'admin@slms.local', ip: '10.0.0.12', type: 'login', severity: 'low', description: 'Successful login', descriptionAr: 'تسجيل دخول ناجح' },
  { id: 2, time: '2025-12-20 09:45', user: 'user1@slms.local', userAr: 'user1@slms.local', ip: '10.0.0.20', type: 'failed_login', severity: 'medium', description: 'Failed login attempts (3)', descriptionAr: 'محاولات دخول فاشلة (3)' },
  { id: 3, time: '2025-12-21 11:03', user: 'security@slms.local', userAr: 'security@slms.local', ip: '10.0.0.15', type: 'permission_change', severity: 'high', description: 'Role permissions updated', descriptionAr: 'تم تحديث صلاحيات الدور' },
  { id: 4, time: '2025-12-23 14:26', user: 'auditor@slms.local', userAr: 'auditor@slms.local', ip: '10.0.0.18', type: 'data_export', severity: 'medium', description: 'Exported audit logs', descriptionAr: 'تم تصدير سجلات التدقيق' },
];

export default function SecurityReportsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Reports.Security.View]);
  const canExport = hasAnyPermission([MenuPermissions.Reports.Security.Export]);

  const [items] = useState<SecurityEvent[]>(mockEvents);
  const [from, setFrom] = useState('2025-12-01');
  const [to, setTo] = useState('2025-12-31');
  const [type, setType] = useState<'all' | SecurityEventType>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SecurityEvent | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((e) => {
      const typeOk = type === 'all' || e.type === type;
      const qOk = !q || e.user.toLowerCase().includes(q) || e.ip.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.descriptionAr.toLowerCase().includes(q);
      return typeOk && qOk;
    });
  }, [items, type, search]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const failed = filtered.filter((e) => e.type === 'failed_login').length;
    const perm = filtered.filter((e) => e.type === 'permission_change').length;
    const exports = filtered.filter((e) => e.type === 'data_export').length;
    return { total, failed, perm, exports };
  }, [filtered]);

  const typeBadge = (t: SecurityEventType) => {
    const styles: Record<SecurityEventType, string> = {
      login: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      failed_login: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      permission_change: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      data_export: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };
    const labels: Record<SecurityEventType, { en: string; ar: string }> = {
      login: { en: 'Login', ar: 'دخول' },
      failed_login: { en: 'Failed Login', ar: 'دخول فاشل' },
      permission_change: { en: 'Permission Change', ar: 'تغيير صلاحيات' },
      data_export: { en: 'Data Export', ar: 'تصدير بيانات' },
    };
    return <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[t])}>{locale === 'ar' ? labels[t].ar : labels[t].en}</span>;
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'تقارير الأمان - SLMS' : 'Security Reports - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <LockClosedIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض تقارير الأمان.' : "You don't have permission to view security reports."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير الأمان - SLMS' : 'Security Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'تقارير الأمان' : 'Security Reports'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'أحداث الأمان والتغييرات الحساسة' : 'Security events and sensitive changes'}</p>
            </div>
          </div>
          {canExport && (
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input label={locale === 'ar' ? 'من' : 'From'} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label={locale === 'ar' ? 'إلى' : 'To'} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="login">{locale === 'ar' ? 'دخول' : 'Login'}</option>
                <option value="failed_login">{locale === 'ar' ? 'دخول فاشل' : 'Failed Login'}</option>
                <option value="permission_change">{locale === 'ar' ? 'تغيير صلاحيات' : 'Permission Change'}</option>
                <option value="data_export">{locale === 'ar' ? 'تصدير بيانات' : 'Data Export'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالمستخدم أو IP...' : 'Search by user or IP...'} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'دخول فاشل' : 'Failed Logins'}</p>
            <p className="text-2xl font-bold text-amber-600">{kpis.failed}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تغييرات صلاحيات' : 'Permission Changes'}</p>
            <p className="text-2xl font-bold text-red-600">{kpis.perm}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عمليات التصدير' : 'Exports'}</p>
            <p className="text-2xl font-bold text-blue-600">{kpis.exports}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? `الفترة: ${from} إلى ${to}` : `Period: ${from} to ${to}`}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوقت' : 'Time'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المستخدم' : 'User'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-gray-500">{e.time}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locale === 'ar' ? e.userAr : e.user}</td>
                    <td className="px-4 py-3 text-gray-500">{e.ip}</td>
                    <td className="px-4 py-3">{typeBadge(e.type)}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? e.descriptionAr : e.description}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(e)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الحدث' : 'Event Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.time}</h3>
              <p className="text-sm text-gray-500">{locale === 'ar' ? selected.userAr : selected.user} — {selected.ip}</p>
            </div>
            <div className="flex gap-2">
              {typeBadge(selected.type)}
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'الوصف' : 'Description'}</p>
              <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.descriptionAr : selected.description}</p>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
