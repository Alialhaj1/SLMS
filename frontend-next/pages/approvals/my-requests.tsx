import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { ClipboardDocumentListIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface ApprovalRequest {
  id: number;
  document_type: string;
  document_number: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  notes: string | null;
}

export default function MyRequestsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/approval-requests?mine=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRequests(data.data || []);
    } catch {
      showToast('error', t('errors.load') || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const filtered = requests.filter((r) => statusFilter === 'all' || r.status === statusFilter);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${map[s] || 'bg-gray-100 text-gray-500'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
  };

  const statusCounts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" /></td>
      ))}
    </tr>
  );

  return (
    <MainLayout>
      <Head><title>{t('myRequests.title') || 'My Approval Requests'} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-7 h-7 text-blue-500" />
              {t('myRequests.title') || 'My Approval Requests'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('myRequests.subtitle') || 'Track your submitted approval requests'}</p>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                {['Document', 'Type', 'Amount', 'Status', 'Submitted', 'Decision'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                  <p className="text-gray-400 dark:text-gray-500">{statusFilter === 'all' ? 'No requests submitted yet' : `No ${statusFilter} requests`}</p>
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.document_number}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.document_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-mono">{r.amount?.toLocaleString()} {r.currency}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(r.submitted_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {r.decided_at ? (
                      <span>{new Date(r.decided_at).toLocaleDateString()} by {r.decided_by}</span>
                    ) : (
                      <span className="text-gray-400 italic">Awaiting</span>
                    )}
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
