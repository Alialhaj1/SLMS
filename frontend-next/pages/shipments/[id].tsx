import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Nav from '../../components/Nav';
import AuthGuard from '../../components/AuthGuard';
import axios from 'axios';
import Alert from '../../components/Alert';

type Shipment = any;
type Expense = any;

export default function ShipmentDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchShipment();
  }, [id]);

  async function fetchShipment() {
    setLoading(true);
    setError(null);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const resp = await axios.get(`${api}/api/shipments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setShipment(resp.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load shipment');
    } finally { setLoading(false); }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const resp = await axios.post(`${api}/api/shipments/${id}/expenses`, { amount: Number(amount), currency, description }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Expense added');
      setAmount(''); setDescription(''); setCurrency('USD');
      fetchShipment();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to add expense');
    }
  }

  async function deleteShipment() {
    if (!confirm('Delete this shipment?')) return;
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      await axios.delete(`${api}/api/shipments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Shipment deleted');
      setTimeout(() => router.push('/shipments'), 800);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to delete shipment');
    }
  }

  async function deleteExpense(expenseId: number) {
    if (!confirm('Delete this expense?')) return;
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      await axios.delete(`${api}/api/expenses/${expenseId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Expense deleted');
      fetchShipment();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to delete expense');
    }
  }

  async function editExpense(expense: Expense) {
    const newDesc = prompt('Description', expense.description || '');
    if (newDesc === null) return; // cancelled
    const newAmount = prompt('Amount', String(expense.amount || ''));
    if (newAmount === null) return;
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      await axios.put(`${api}/api/expenses/${expense.id}`, { description: newDesc, amount: Number(newAmount), currency: expense.currency }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Expense updated');
      fetchShipment();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to update expense');
    }
  }

  return (
    <AuthGuard>
      <div>
        <Nav />
        <main style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
          <h2>Shipment Details</h2>
          {error && <Alert type="error">{error}</Alert>}
          {message && <Alert type="success">{message}</Alert>}
          {loading && <p>Loading...</p>}
          {!loading && shipment && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p><strong>Reference:</strong> {shipment.reference}</p>
                  <p><strong>Origin:</strong> {shipment.origin}</p>
                  <p><strong>Destination:</strong> {shipment.destination}</p>
                  <p><strong>Status:</strong> {shipment.status}</p>
                </div>
                <div>
                  <button onClick={() => router.push(`/shipments`)} style={{ marginRight: 8 }}>Back</button>
                  <button onClick={deleteShipment} style={{ background: '#f8d7da', border: '1px solid #f5c2c7', padding: '6px 10px' }}>Delete Shipment</button>
                </div>
              </div>

              <hr style={{ margin: '16px 0' }} />

              <h3>Expenses</h3>
              <form onSubmit={addExpense} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: 8, width: 120 }} />
                  <input placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: 8, width: 120 }} />
                  <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: 8, flex: 1 }} />
                  <button type="submit" style={{ padding: '8px 12px' }}>Add</button>
                </div>
              </form>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Description</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Created</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(shipment.expenses) && shipment.expenses.map((e: Expense) => (
                    <tr key={e.id}>
                      <td style={{ padding: 8 }}>{e.id}</td>
                      <td style={{ padding: 8 }}>{e.description}</td>
                      <td style={{ padding: 8 }}>{e.amount} {e.currency}</td>
                      <td style={{ padding: 8 }}>{e.created_at}</td>
                      <td style={{ padding: 8 }}>
                        <button onClick={() => editExpense(e)} style={{ marginRight: 8 }}>Edit</button>
                        <button onClick={() => deleteExpense(e.id)} style={{ background: '#f8d7da', border: '1px solid #f5c2c7' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
