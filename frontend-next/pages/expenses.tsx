import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import axios from 'axios';
import AuthGuard from '../components/AuthGuard';

type Expense = {
  id: number;
  description?: string;
  amount?: number;
  currency?: string;
  shipment_id?: number;
  created_at?: string;
  shipment_reference?: string;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const resp = await axios.get(`${api}/api/shipments`, { headers: { Authorization: `Bearer ${token}` } });
      const shipments = resp.data || [];
      const all: Expense[] = [];
      shipments.forEach((s: any) => {
        if (s.expenses && Array.isArray(s.expenses)) {
          s.expenses.forEach((e: any) => all.push({ ...e, shipment_reference: s.reference }));
        }
      });
      setExpenses(all);
    } catch (err: any) {
      setError(err?.response?.data || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div>
        <Nav />
        <main style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
          <h2>Expenses (aggregated by shipment)</h2>
          {error && <div style={{ color: 'red' }}>{String(error)}</div>}
          {loading ? <p>Loading...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Shipment</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Description</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td style={{ padding: 8 }}>{e.id}</td>
                    <td style={{ padding: 8 }}>{e.shipment_reference}</td>
                    <td style={{ padding: 8 }}>{e.description}</td>
                    <td style={{ padding: 8 }}>{e.amount} {e.currency}</td>
                    <td style={{ padding: 8 }}>{e.created_at || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
