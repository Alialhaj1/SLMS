import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { ArrowsRightLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Delegation {
  id: number;
  delegator_name: string;
  delegator_email: string;
  delegate_name: string;
  delegate_email: string;
  module: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'revoked';
}

export default function DelegationsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formDelegateId, setFormDelegateId] = useState('');
  const [formModule, setFormModule] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');

  useEffect(() => { fetchDelegations(); }, []);

  const fetchDelegations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/approval-delegations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setDelegations(data.data || []);
    } catch {
      showToast('error', t('errors.load') || 'Failed to load delegations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formDelegateId || !formModule || !formStart || !formEnd) {
      showToast('error', 'All fields are required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/approval-delegations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegate_user_id: Number(formDelegateId), module: formModule, start_date: formStart, end_date: formEnd }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'Delegation created');
      setShowForm(false);
      setFormDelegateId('');
      setFormModule('');
      setFormStart('');
      setFormEnd('');
      fetchDelegations();
    } catch {
      showToast('error', 'Failed to create delegation');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/approval-delegations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'Delegation revoked');
      fetchDelegations();
    } catch {
      showToast('error', 'Failed to revoke delegation');
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
      expired: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
      revoked: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${map[s] || map.expired}`}>{s}</span>;
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" /></td>
      ))}
    </tr>
  );

  return (
    <MainLayout>
      <Head><title>{t('delegations.title') || 'Approval Delegations'} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowsRightLeftIcon className="w-7 h-7 text-blue-500" />
              {t('delegations.title') || 'Approval Delegations'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('delegations.subtitle') || 'Delegate your approval authority to another user'}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
            <PlusIcon className="w-4 h-4" /> New Delegation
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Delegation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <input value={formDelegateId} onChange={(e) => setFormDelegateId(e.target.value)} placeholder="Delegate User ID" type="number" className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
              <input value={formModule} onChange={(e) => setFormModule(e.target.value)} placeholder="Module (e.g. purchase_orders)" className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
              <input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
              <input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Create'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                {['Delegator', 'Delegate', 'Module', 'Start', 'End', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />) : delegations.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <ArrowsRightLeftIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                  <p className="text-gray-400 dark:text-gray-500">No delegations configured</p>
                </td></tr>
              ) : delegations.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-white">{d.delegator_name}</p><p className="text-xs text-gray-400">{d.delegator_email}</p></td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-white">{d.delegate_name}</p><p className="text-xs text-gray-400">{d.delegate_email}</p></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{d.module}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(d.start_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(d.end_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{statusBadge(d.status)}</td>
                  <td className="px-4 py-3 text-right">
                    {d.status === 'active' && (
                      <button onClick={() => handleRevoke(d.id)} className="text-red-500 hover:text-red-700" title="Revoke">
                        <TrashIcon className="w-4 h-4" />
                      </button>
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
