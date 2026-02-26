import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';

interface Container {
  id: number;
  container_number: string;
  shipment_id: number;
  shipment_reference?: string;
  size: '20ft' | '40ft' | '40ftHC';
  type: 'Dry' | 'Reefer' | 'Open';
  seal_number: string;
  status: string;
  weight: number;
}

const SIZES = ['20ft', '40ft', '40ftHC'] as const;
const TYPES = ['Dry', 'Reefer', 'Open'] as const;
const STATUSES = ['Empty', 'Loaded', 'In Transit', 'Delivered', 'Returned'];

export default function ShipmentContainersPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();

  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterShipment, setFilterShipment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ container_number: '', shipment_id: '', size: '20ft', type: 'Dry', seal_number: '', status: 'Empty', weight: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/shipping/containers`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setContainers(json.data || []);
    } catch { showToast('error', 'Failed to load containers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchContainers(); }, []);

  const resetForm = () => { setForm({ container_number: '', shipment_id: '', size: '20ft', type: 'Dry', seal_number: '', status: 'Empty', weight: '' }); setEditId(null); setShowForm(false); };

  const handleEdit = (c: Container) => {
    setForm({ container_number: c.container_number, shipment_id: String(c.shipment_id), size: c.size, type: c.type, seal_number: c.seal_number, status: c.status, weight: String(c.weight) });
    setEditId(c.id); setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this container?')) return;
    try {
      const res = await fetch(`${API}/api/shipping/containers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      showToast('success', 'Container deleted'); fetchContainers();
    } catch { showToast('error', 'Failed to delete container'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.container_number || !form.shipment_id) { showToast('error', 'Container number and shipment are required'); return; }
    setSaving(true);
    try {
      const url = editId ? `${API}/api/shipping/containers/${editId}` : `${API}/api/shipping/containers`;
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, shipment_id: Number(form.shipment_id), weight: Number(form.weight) || 0 }),
      });
      if (!res.ok) throw new Error();
      showToast('success', editId ? 'Container updated' : 'Container created');
      resetForm(); fetchContainers();
    } catch { showToast('error', 'Failed to save container'); }
    finally { setSaving(false); }
  };

  const filtered = containers.filter(c =>
    (!filterShipment || String(c.shipment_id).includes(filterShipment) || (c.shipment_reference || '').toLowerCase().includes(filterShipment.toLowerCase())) &&
    (!filterStatus || c.status === filterStatus)
  );

  return (
    <MainLayout>
      <Head><title>Shipment Containers - SLMS</title></Head>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shipment Containers</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">+ Add Container</button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input placeholder="Filter by shipment..." value={filterShipment} onChange={e => setFilterShipment(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm w-full sm:w-64" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => resetForm()}>
            <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-lg space-y-4">
              <h2 className="text-lg font-semibold dark:text-white">{editId ? 'Edit' : 'Add'} Container</h2>
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Container Number *" value={form.container_number} onChange={e => setForm({ ...form, container_number: e.target.value })} className="col-span-2 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                <input required placeholder="Shipment ID *" value={form.shipment_id} onChange={e => setForm({ ...form, shipment_id: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                <input placeholder="Seal Number" value={form.seal_number} onChange={e => setForm({ ...form, seal_number: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                <select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="number" placeholder="Weight (kg)" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
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
                <th className="px-4 py-3">Container #</th><th className="px-4 py-3">Shipment</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Seal #</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-slate-600 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">No containers found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-750 dark:text-slate-200">
                  <td className="px-4 py-3 font-medium">{c.container_number}</td>
                  <td className="px-4 py-3">{c.shipment_reference || c.shipment_id}</td>
                  <td className="px-4 py-3">{c.size}</td>
                  <td className="px-4 py-3">{c.type}</td>
                  <td className="px-4 py-3">{c.seal_number || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : c.status === 'In Transit' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-300'}`}>{c.status}</span></td>
                  <td className="px-4 py-3">{c.weight ? `${c.weight} kg` : '—'}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => handleEdit(c)} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline text-xs">Delete</button>
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
