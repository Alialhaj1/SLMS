import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { KeyIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PasswordResetRequest {
  id: number;
  userName: string;
  email: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
  ipAddress: string;
}

export default function PasswordResets() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/password-reset-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequests(data.data ?? []);
    } catch {
      showToast('error', 'Failed to load password reset requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'deny') => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/password-reset-requests/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', `Request ${action === 'approve' ? 'approved' : 'denied'}`);
      fetchRequests();
    } catch {
      showToast('error', `Failed to ${action} request`);
    }
  };

  const statusBadge = (status: PasswordResetRequest['status']) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      denied: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${map[status]}`}>{status}</span>;
  };

  return (
    <MainLayout>
      <Head>
        <title>Password Reset Requests - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password Reset Requests</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review and manage password reset requests from users.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['User', 'Email', 'Requested At', 'Status', 'IP Address', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <KeyIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No password reset requests.</p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{req.userName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{req.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(req.requestedAt).toLocaleString()}</td>
                    <td className="px-6 py-4">{statusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{req.ipAddress}</td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(req.id, 'approve')}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            aria-label="Approve"
                          >
                            <CheckIcon className="h-3 w-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleAction(req.id, 'deny')}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            aria-label="Deny"
                          >
                            <XMarkIcon className="h-3 w-3" /> Deny
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
