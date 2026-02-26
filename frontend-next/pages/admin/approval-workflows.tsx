import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { CogIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

interface WorkflowStep {
  order: number;
  role: string;
  action: string;
}

interface Workflow {
  id: number;
  name: string;
  module: string;
  steps: WorkflowStep[];
  is_active: boolean;
  created_at: string;
}

export default function ApprovalWorkflowsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formModule, setFormModule] = useState('');
  const [formSteps, setFormSteps] = useState<WorkflowStep[]>([{ order: 1, role: '', action: 'approve' }]);

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/approval-workflows', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setWorkflows(data.data || []);
    } catch {
      showToast('error', t('errors.load') || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormModule('');
    setFormSteps([{ order: 1, role: '', action: 'approve' }]);
    setShowForm(true);
  };

  const openEdit = (wf: Workflow) => {
    setEditing(wf);
    setFormName(wf.name);
    setFormModule(wf.module);
    setFormSteps(wf.steps.length ? wf.steps : [{ order: 1, role: '', action: 'approve' }]);
    setShowForm(true);
  };

  const addStep = () => setFormSteps([...formSteps, { order: formSteps.length + 1, role: '', action: 'approve' }]);
  const removeStep = (i: number) => setFormSteps(formSteps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));

  const handleSave = async () => {
    if (!formName || !formModule) { showToast('error', 'Name and module are required'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const method = editing ? 'PUT' : 'POST';
      const url = editing
        ? `http://localhost:4000/api/approval-workflows/${editing.id}`
        : 'http://localhost:4000/api/approval-workflows';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, module: formModule, steps: formSteps }),
      });
      if (!res.ok) throw new Error('Failed to save');
      showToast('success', editing ? 'Workflow updated' : 'Workflow created');
      setShowForm(false);
      fetchWorkflows();
    } catch {
      showToast('error', 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" /></td>
      ))}
    </tr>
  );

  return (
    <MainLayout>
      <Head><title>{t('approvalWorkflows.title') || 'Approval Workflows'} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CogIcon className="w-7 h-7 text-blue-500" />
              {t('approvalWorkflows.title') || 'Approval Workflows'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('approvalWorkflows.subtitle') || 'Configure multi-step approval logic per module'}</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
            <PlusIcon className="w-4 h-4" /> {t('common.create') || 'Create Workflow'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? 'Edit Workflow' : 'New Workflow'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Workflow Name" className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
              <input value={formModule} onChange={(e) => setFormModule(e.target.value)} placeholder="Module (e.g. purchase_orders)" className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Steps</p>
              {formSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-6">{step.order}.</span>
                  <input value={step.role} onChange={(e) => { const s = [...formSteps]; s[i].role = e.target.value; setFormSteps(s); }} placeholder="Role" className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm" />
                  <select value={step.action} onChange={(e) => { const s = [...formSteps]; s[i].action = e.target.value; setFormSteps(s); }} className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm">
                    <option value="approve">Approve</option><option value="review">Review</option><option value="sign">Sign</option>
                  </select>
                  {formSteps.length > 1 && <button onClick={() => removeStep(i)} className="text-red-500 hover:text-red-700 text-sm">✕</button>}
                </div>
              ))}
              <button onClick={addStep} className="text-blue-600 hover:text-blue-700 text-sm font-medium">+ Add Step</button>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                {['Name', 'Module', 'Steps', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />) : workflows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">No workflows configured</td></tr>
              ) : workflows.map((wf) => (
                <tr key={wf.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{wf.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{wf.module}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{wf.steps?.length || 0} steps</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${wf.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'}`}>
                      {wf.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(wf)} className="text-blue-600 hover:text-blue-700"><PencilSquareIcon className="w-4 h-4" /></button>
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
