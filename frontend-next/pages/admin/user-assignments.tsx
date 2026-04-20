import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { UserGroupIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface UserAssignment {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  company_id: number;
  company_name: string;
  role_name: string;
  assigned_at: string;
}

export default function UserAssignmentsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [formUserId, setFormUserId] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAssignments(); }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/user-company-roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      setAssignments(list);
    } catch {
      showToast('error', t('adminUserAssignments.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!formUserId || !formCompanyId) { showToast('error', t('adminUserAssignments.userCompanyRequired')); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/user-company-roles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(formUserId), company_id: Number(formCompanyId), role: formRole }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', t('adminUserAssignments.assignmentCreated'));
      setShowForm(false);
      setFormUserId('');
      setFormCompanyId('');
      setFormRole('user');
      fetchAssignments();
    } catch {
      showToast('error', t('adminUserAssignments.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    setRemoving(id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/user-company-roles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', t('adminUserAssignments.assignmentRemoved'));
      fetchAssignments();
    } catch {
      showToast('error', t('adminUserAssignments.removeFailed'));
    } finally {
      setRemoving(null);
    }
  };

  const filtered = assignments.filter((a) =>
    a.user_email.toLowerCase().includes(search.toLowerCase()) ||
    a.company_name.toLowerCase().includes(search.toLowerCase()) ||
    a.role_name.toLowerCase().includes(search.toLowerCase())
  );

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" /></td>
      ))}
    </tr>
  );

  return (
    <MainLayout>
      <Head><title>{t('adminUserAssignments.title')} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UserGroupIcon className="w-7 h-7 text-blue-500" />
              {t('adminUserAssignments.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('adminUserAssignments.subtitle')}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
            <PlusIcon className="w-4 h-4" /> {t('adminUserAssignments.assignUser')}
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('adminUserAssignments.newAssignment')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input value={formUserId} onChange={(e) => setFormUserId(e.target.value)} placeholder={t('adminUserAssignments.userId')} type="number" className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
              <input value={formCompanyId} onChange={(e) => setFormCompanyId(e.target.value)} placeholder={t('adminUserAssignments.companyId')} type="number" className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
              <select value={formRole} onChange={(e) => setFormRole(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                <option value="user">{t('adminUserAssignments.userRole')}</option><option value="manager">{t('adminUserAssignments.managerRole')}</option><option value="admin">{t('adminUserAssignments.adminRole')}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAssign} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">{saving ? t('adminUserAssignments.saving') : t('adminUserAssignments.assign')}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">{t('adminUserAssignments.cancel')}</button>
            </div>
          </div>
        )}

        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder={t('adminUserAssignments.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                {[t('adminUserAssignments.user'), t('adminUserAssignments.company'), t('adminUserAssignments.role'), t('adminUserAssignments.assigned'), t('adminUserAssignments.actions')].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
                  <UserGroupIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                  <p className="text-gray-400 dark:text-gray-500">{t('adminUserAssignments.noAssignments')}</p>
                </td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-white">{a.user_name || a.user_email}</p><p className="text-xs text-gray-400">{a.user_email}</p></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.company_name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">{a.role_name}</span></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(a.assigned_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleRemove(a.id)} disabled={removing === a.id} className="text-red-500 hover:text-red-700 disabled:opacity-50" title={t('adminUserAssignments.remove')}>
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
