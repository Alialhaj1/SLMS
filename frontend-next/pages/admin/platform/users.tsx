import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface PlatformUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function PlatformUsersPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(search && { search }),
      });
      const res = await fetch(`http://localhost:4000/api/platform/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const json = await res.json();
      setUsers(json.data || []);
      setTotal(json.total || 0);
    } catch (err) {
      showToast('error', t('platform.users.fetchError') || 'Failed to load platform users');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const totalPages = Math.ceil(total / pageSize);

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );

  return (
    <MainLayout>
      <Head>
        <title>{t('platform.users.title') || 'Platform Users'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('platform.users.title') || 'Platform Users'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('platform.users.subtitle') || 'Manage platform-level admin users'}
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <PlusIcon className="h-5 w-5" />
            {t('platform.users.addUser') || 'Add User'}
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('platform.users.searchPlaceholder') || 'Search by name or email...'}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-sm">
            {t('common.search') || 'Search'}
          </button>
        </form>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('common.name') || 'Name'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('common.email') || 'Email'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('common.role') || 'Role'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('common.status') || 'Status'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{t('platform.users.lastLogin') || 'Last Login'}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <UserCircleIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">{t('platform.users.empty') || 'No platform users found'}</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-gray-700 dark:text-gray-300">{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[u.status] || ''}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" title="Edit">
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" title="Delete">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.showing') || 'Showing'} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {t('common.of') || 'of'} {total}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {t('common.previous') || 'Previous'}
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {t('common.next') || 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
