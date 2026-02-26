import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface AlertRule {
  id: number;
  name: string;
  event: string;
  condition: string;
  channel: string;
  recipients: string;
  severity: 'critical' | 'warning' | 'info';
  is_active: boolean;
  last_triggered?: string;
}

const MOCK_ALERTS: AlertRule[] = [
  { id: 1, name: 'Shipment Delay', event: 'shipment.delayed', condition: 'Delay > 24h', channel: 'Email + In-App', recipients: 'Operations Team', severity: 'warning', is_active: true, last_triggered: '2026-02-25T14:30:00Z' },
  { id: 2, name: 'Invoice Overdue', event: 'invoice.overdue', condition: 'Days > 30', channel: 'Email', recipients: 'Finance Team', severity: 'critical', is_active: true, last_triggered: '2026-02-26T09:00:00Z' },
  { id: 3, name: 'Low Inventory', event: 'inventory.low', condition: 'Qty < Min Level', channel: 'In-App + SMS', recipients: 'Warehouse Manager', severity: 'warning', is_active: true },
  { id: 4, name: 'New User Registration', event: 'user.created', condition: 'Always', channel: 'Email', recipients: 'Admin', severity: 'info', is_active: false },
  { id: 5, name: 'System Error', event: 'system.error', condition: 'Error Rate > 5%', channel: 'Email + SMS', recipients: 'IT Team', severity: 'critical', is_active: true, last_triggered: '2026-02-24T03:15:00Z' },
];

function SmartAlertsSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partial<AlertRule>>({});
  const [testingId, setTestingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setAlerts(MOCK_ALERTS); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a));
    showToast('success', t('common.updated') || 'Alert updated');
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      await new Promise(r => setTimeout(r, 1200));
      showToast('success', t('settings.testNotificationSent') || 'Test notification sent');
    } finally {
      setTestingId(null);
    }
  };

  const handleSave = () => {
    if (!editing.name || !editing.event) {
      showToast('error', t('common.requiredFields') || 'Fill required fields');
      return;
    }
    if (editing.id) {
      setAlerts(prev => prev.map(a => a.id === editing.id ? { ...a, ...editing } as AlertRule : a));
    } else {
      setAlerts(prev => [...prev, { ...editing, id: Date.now(), is_active: true, severity: (editing.severity || 'info') } as AlertRule]);
    }
    setShowForm(false);
    setEditing({});
    showToast('success', t('common.savedSuccessfully') || 'Alert saved');
  };

  const severityBadge = (s: AlertRule['severity']) => {
    const styles = { critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[s]}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
  };

  return (
    <MainLayout>
      <Head><title>{t('settings.smartAlerts') || 'Smart Alerts'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.smartAlerts') || 'Smart Alerts'}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.smartAlertsDesc') || 'Configure event-driven alert rules, channels, and recipients.'}</p>
          </div>
          <button onClick={() => { setEditing({}); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            {t('settings.createAlert') || 'Create Alert'}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('common.name') || 'Name'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.event') || 'Event'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.condition') || 'Condition'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.channel') || 'Channel'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('settings.severity') || 'Severity'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('common.status') || 'Status'}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {alerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-slate-750">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{alert.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{alert.event}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{alert.condition}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{alert.channel}</td>
                    <td className="px-4 py-3 text-center">{severityBadge(alert.severity)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(alert.id)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${alert.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {alert.is_active ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => { setEditing(alert); setShowForm(true); }} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">{t('common.edit') || 'Edit'}</button>
                      <button onClick={() => handleTest(alert.id)} disabled={testingId === alert.id} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 text-sm disabled:opacity-50">
                        {testingId === alert.id ? (t('settings.testing') || 'Testing...') : (t('settings.test') || 'Test')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing.id ? (t('settings.editAlert') || 'Edit Alert') : (t('settings.createAlert') || 'Create Alert')}</h3>
              <div className="space-y-3">
                {[
                  { field: 'name', label: t('common.name') || 'Name', required: true },
                  { field: 'event', label: t('settings.event') || 'Event', required: true },
                  { field: 'condition', label: t('settings.condition') || 'Condition' },
                  { field: 'channel', label: t('settings.channel') || 'Channel' },
                  { field: 'recipients', label: t('settings.recipients') || 'Recipients' },
                ].map(f => (
                  <div key={f.field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label} {f.required && '*'}</label>
                    <input value={(editing as any)[f.field] || ''} onChange={e => setEditing(p => ({ ...p, [f.field]: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.severity') || 'Severity'}</label>
                  <select value={editing.severity || 'info'} onChange={e => setEditing(p => ({ ...p, severity: e.target.value as any }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm">
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditing({}); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{t('common.cancel') || 'Cancel'}</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">{t('common.save') || 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('system_policies:view', SmartAlertsSettingsPage);
