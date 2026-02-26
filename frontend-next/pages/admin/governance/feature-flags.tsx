import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { FlagIcon, PlusIcon } from '@heroicons/react/24/outline';

interface FeatureFlag {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercent: number;
  targetGroups: string[];
  updatedAt: string;
}

export default function FeatureFlags() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', enabled: false, rolloutPercent: 100, targetGroups: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/system-policies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFlags(data.data ?? []);
    } catch {
      showToast('error', 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flag: FeatureFlag) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/system-policies/${flag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...flag, enabled: !flag.enabled }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', `Flag "${flag.name}" ${!flag.enabled ? 'enabled' : 'disabled'}`);
      fetchFlags();
    } catch {
      showToast('error', 'Failed to update flag');
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Flag name is required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/system-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          targetGroups: form.targetGroups.split(',').map((g) => g.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'Feature flag created');
      setShowForm(false);
      setForm({ name: '', description: '', enabled: false, rolloutPercent: 100, targetGroups: '' });
      fetchFlags();
    } catch {
      showToast('error', 'Failed to create flag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>Feature Flags - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feature Flags</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage feature rollouts and target groups.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            New Flag
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Feature Flag</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="e.g. new_dashboard" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rollout %</label>
                <input type="number" min={0} max={100} value={form.rolloutPercent} onChange={(e) => setForm({ ...form, rolloutPercent: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Groups (comma-separated)</label>
                <input type="text" value={form.targetGroups} onChange={(e) => setForm({ ...form, targetGroups: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="e.g. beta_testers, admins" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">{saving ? 'Creating…' : 'Create Flag'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Flag', 'Status', 'Rollout %', 'Target Groups', 'Updated'].map((h) => (
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
              ) : flags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FlagIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No feature flags configured.</p>
                  </td>
                </tr>
              ) : (
                flags.map((flag) => (
                  <tr key={flag.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{flag.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{flag.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleFlag(flag)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flag.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        aria-label={`Toggle ${flag.name}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${flag.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{flag.rolloutPercent}%</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {flag.targetGroups.length > 0 ? flag.targetGroups.map((g) => (
                          <span key={g} className="inline-flex px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">{g}</span>
                        )) : <span className="text-xs text-gray-400">All users</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(flag.updatedAt).toLocaleDateString()}</td>
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
