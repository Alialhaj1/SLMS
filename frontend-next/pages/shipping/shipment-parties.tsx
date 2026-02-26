import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';

interface Party {
  id: number;
  name: string;
  role: 'Shipper' | 'Consignee' | 'Notify' | 'Agent';
  contact_email: string;
  contact_phone: string;
  shipment_id: number;
  shipment_reference?: string;
  country: string;
}

const ROLES = ['Shipper', 'Consignee', 'Notify', 'Agent'] as const;

export default function ShipmentPartiesPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', role: 'Shipper', contact_email: '', contact_phone: '', shipment_id: '', country: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchParties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/shipping/parties`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setParties(json.data || []);
    } catch { showToast('error', 'Failed to load parties'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParties(); }, []);

  const resetForm = () => { setForm({ name: '', role: 'Shipper', contact_email: '', contact_phone: '', shipment_id: '', country: '' }); setEditId(null); setShowForm(false); };

  const handleEdit = (p: Party) => {
    setForm({ name: p.name, role: p.role, contact_email: p.contact_email, contact_phone: p.contact_phone, shipment_id: String(p.shipment_id), country: p.country });
    setEditId(p.id); setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this party?')) return;
    try {
      const res = await fetch(`${API}/api/shipping/parties/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      showToast('success', 'Party deleted'); fetchParties();
    } catch { showToast('error', 'Failed to delete party'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.shipment_id) { showToast('error', 'Name and shipment are required'); return; }
    setSaving(true);
    try {
      const url = editId ? `${API}/api/shipping/parties/${editId}` : `${API}/api/shipping/parties`;
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, shipment_id: Number(form.shipment_id) }),
      });
      if (!res.ok) throw new Error();
      showToast('success', editId ? 'Party updated' : 'Party created');
      resetForm(); fetchParties();
    } catch { showToast('error', 'Failed to save party'); }
    finally { setSaving(false); }
  };

  const filtered = parties.filter(p => !filterRole || p.role === filterRole);

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      Shipper: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Consignee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Notify: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Agent: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-700'}`}>{role}</span>;
  };

  return (
    <MainLayout>
      <Head><title>Shipment Parties - SLMS</title></Head>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shipment Parties</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">+ Add Party</button>
        </div>

        {/* Filter */}
        <div className="flex gap-3">
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => resetForm()}>
            <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-lg space-y-4">
              <h2 className="text-lg font-semibold dark:text-white">{editId ? 'Edit' : 'Add'} Party</h2>
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Party Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="col-span-2 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input required placeholder="Shipment ID *" value={form.shipment_id} onChange={e => setForm({ ...form, shipment_id: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                <input type="email" placeholder="Email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                <input placeholder="Phone" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                <input placeholder="Country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="col-span-2 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm rounded-lg border dark:border-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Party Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th><th className="px-4 py-3">Shipment</th><th className="px-4 py-3">Country</th><th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-slate-600 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">No parties found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-750 dark:text-slate-200">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{roleBadge(p.role)}</td>
                  <td className="px-4 py-3">{p.contact_email || '—'}</td>
                  <td className="px-4 py-3">{p.contact_phone || '—'}</td>
                  <td className="px-4 py-3">{p.shipment_reference || p.shipment_id}</td>
                  <td className="px-4 py-3">{p.country || '—'}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => handleEdit(p)} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-xs">Delete</button>
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
