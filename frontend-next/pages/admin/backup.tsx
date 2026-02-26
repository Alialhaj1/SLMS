import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { ServerStackIcon, ArrowDownTrayIcon, ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline';

interface BackupRecord {
  id: number;
  date: string;
  size_mb: number;
  status: 'completed' | 'failed' | 'running';
  duration_seconds: number;
  type: string;
}

interface BackupSettings {
  auto_backup: boolean;
  schedule_cron: string;
  retention_days: number;
  last_backup: string | null;
}

export default function BackupPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const [settingsRes, backupsRes] = await Promise.all([
        fetch('http://localhost:4000/api/backup-settings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:4000/api/backups', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (settingsRes.ok) { const d = await settingsRes.json(); setSettings(d.data || d); }
      if (backupsRes.ok) { const d = await backupsRes.json(); setBackups(d.data || []); }
    } catch {
      showToast('error', t('errors.load') || 'Failed to load backup data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/backups', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'full' }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'Backup started');
      fetchData();
    } catch {
      showToast('error', 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id: number) => {
    setRestoring(id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/backups/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', 'Restore initiated');
    } catch {
      showToast('error', 'Failed to restore backup');
    } finally {
      setRestoring(null);
    }
  };

  const handleExport = async (id: number) => {
    const token = localStorage.getItem('accessToken');
    window.open(`http://localhost:4000/api/backups/${id}/download?token=${token}`, '_blank');
  };

  const formatDuration = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
      running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${map[s] || 'bg-gray-100 text-gray-500'}`}>{s}</span>;
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
      <Head><title>{t('backup.title') || 'System Backup'} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ServerStackIcon className="w-7 h-7 text-blue-500" />
              {t('backup.title') || 'System Backup'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('backup.subtitle') || 'Manage database backups, restore points, and exports'}</p>
          </div>
          <button onClick={handleCreateBackup} disabled={creating} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50">
            {creating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ServerStackIcon className="w-4 h-4" />}
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
        </div>

        {/* Schedule Config Summary */}
        {settings && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Auto Backup</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{settings.auto_backup ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Retention</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{settings.retention_days} days</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Last Backup</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{settings.last_backup ? new Date(settings.last_backup).toLocaleDateString() : 'Never'}</p>
            </div>
          </div>
        )}

        {/* Backups Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                {['Date', 'Size', 'Status', 'Duration', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />) : backups.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
                  <ClockIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                  <p className="text-gray-400 dark:text-gray-500">No backups found</p>
                </td></tr>
              ) : backups.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{new Date(b.date).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.size_mb.toFixed(1)} MB</td>
                  <td className="px-4 py-3">{statusBadge(b.status)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDuration(b.duration_seconds)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {b.status === 'completed' && (
                        <>
                          <button onClick={() => handleRestore(b.id)} disabled={restoring === b.id} className="text-blue-600 hover:text-blue-700 disabled:opacity-50" title="Restore">
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleExport(b.id)} className="text-green-600 hover:text-green-700" title="Export">
                            <ArrowDownTrayIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
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
