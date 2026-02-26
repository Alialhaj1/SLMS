import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface AutomationRule {
  id: number;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  is_active: boolean;
  last_run?: string;
  run_count: number;
}

const MOCK_RULES: AutomationRule[] = [
  { id: 1, name: 'Auto-assign shipments', trigger: 'Shipment Created', condition: 'Weight > 100kg', action: 'Assign to Heavy Team', is_active: true, last_run: '2026-02-25T14:30:00Z', run_count: 142 },
  { id: 2, name: 'Expense approval routing', trigger: 'Expense Submitted', condition: 'Amount > 5000', action: 'Route to Manager', is_active: true, last_run: '2026-02-26T09:15:00Z', run_count: 87 },
  { id: 3, name: 'Overdue invoice alert', trigger: 'Invoice Past Due', condition: 'Days > 30', action: 'Send Email Reminder', is_active: false, run_count: 0 },
  { id: 4, name: 'Low stock notification', trigger: 'Inventory Updated', condition: 'Qty < Min Level', action: 'Notify Procurement', is_active: true, last_run: '2026-02-24T11:00:00Z', run_count: 53 },
];

function AutomationSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<AutomationRule>>({});

  useEffect(() => {
    const timer = setTimeout(() => { setRules(MOCK_RULES); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = (id: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
    showToast('success', t('common.updated') || 'Rule updated');
  };

  const handleSave = () => {
    if (!editingRule.name || !editingRule.trigger) {
      showToast('error', t('common.requiredFields') || 'Please fill required fields');
      return;
    }
    if (editingRule.id) {
      setRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, ...editingRule } as AutomationRule : r));
    } else {
      setRules(prev => [...prev, { ...editingRule, id: Date.now(), is_active: true, run_count: 0 } as AutomationRule]);
    }
    setShowForm(false);
    setEditingRule({});
    showToast('success', t('common.savedSuccessfully') || 'Rule saved');
  };

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  return (
    <MainLayout>
      <Head><title>{t('settings.automation') || 'Automation Rules'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.automation') || 'Automation Rules'}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.automationDesc') || 'Create and manage workflow automation rules.'}</p>
          </div>
          <button onClick={() => { setEditingRule({}); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            {t('common.create') || 'Create Rule'}
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
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.trigger') || 'Trigger'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.condition') || 'Condition'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.action') || 'Action'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('common.status') || 'Status'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('settings.runs') || 'Runs'}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rules.map(rule => (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-slate-750">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{rule.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{rule.trigger}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{rule.condition}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{rule.action}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(rule.id)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {rule.is_active ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{rule.run_count}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(rule)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">{t('common.edit') || 'Edit'}</button>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingRule.id ? (t('common.editRule') || 'Edit Rule') : (t('common.createRule') || 'Create Rule')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.name') || 'Name'} *</label>
                  <input value={editingRule.name || ''} onChange={e => setEditingRule(p => ({ ...p, name: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.trigger') || 'Trigger'} *</label>
                  <input value={editingRule.trigger || ''} onChange={e => setEditingRule(p => ({ ...p, trigger: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.condition') || 'Condition'}</label>
                  <input value={editingRule.condition || ''} onChange={e => setEditingRule(p => ({ ...p, condition: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.action') || 'Action'}</label>
                  <input value={editingRule.action || ''} onChange={e => setEditingRule(p => ({ ...p, action: e.target.value }))} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingRule({}); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800">{t('common.cancel') || 'Cancel'}</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">{t('common.save') || 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('system_policies:view', AutomationSettingsPage);
