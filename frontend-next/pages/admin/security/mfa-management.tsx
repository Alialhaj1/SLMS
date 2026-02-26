import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  DevicePhoneMobileIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface MfaUser {
  id: number;
  email: string;
  name: string;
  mfaEnabled: boolean;
  mfaMethod: string | null;
  enrolledAt: string | null;
}

interface MfaStats {
  totalUsers: number;
  mfaEnabledCount: number;
  methods: { method: string; count: number }[];
}

export default function MfaManagement() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [stats, setStats] = useState<MfaStats | null>(null);
  const [users, setUsers] = useState<MfaUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMfaData();
  }, []);

  const fetchMfaData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/security/mfa', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data.data?.stats ?? null);
      setUsers(data.data?.users ?? []);
    } catch {
      showToast('error', 'Failed to load MFA data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnforce = async (userId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/security/mfa/${userId}/enforce`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'MFA enforcement enabled for user');
      fetchMfaData();
    } catch {
      showToast('error', 'Failed to enforce MFA');
    }
  };

  const handleReset = async (userId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/security/mfa/${userId}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'MFA reset for user');
      fetchMfaData();
    } catch {
      showToast('error', 'Failed to reset MFA');
    }
  };

  const adoptionPct = stats && stats.totalUsers > 0 ? Math.round((stats.mfaEnabledCount / stats.totalUsers) * 100) : 0;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: UserGroupIcon, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
    { label: 'MFA Enabled', value: stats?.mfaEnabledCount ?? '—', icon: ShieldCheckIcon, color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
    { label: 'Adoption %', value: `${adoptionPct}%`, icon: DevicePhoneMobileIcon, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
    { label: 'Methods', value: stats?.methods?.length ?? '—', icon: KeyIcon, color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>MFA Management - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MFA Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage multi-factor authentication settings and user enrollment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className={`rounded-lg border border-gray-200 dark:border-gray-700 p-5 ${card.color}`}>
              <div className="flex items-center gap-3">
                <card.icon className="h-6 w-6" />
                <div>
                  <p className="text-xs font-medium opacity-75">{card.label}</p>
                  {loading ? (
                    <div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{card.value}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['User', 'MFA Status', 'Method', 'Enrolled', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <DevicePhoneMobileIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No users found.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${u.mfaEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {u.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{u.mfaMethod ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{u.enrolledAt ? new Date(u.enrolledAt).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {!u.mfaEnabled && (
                          <button onClick={() => handleEnforce(u.id)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Enforce</button>
                        )}
                        {u.mfaEnabled && (
                          <button onClick={() => handleReset(u.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Reset</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
