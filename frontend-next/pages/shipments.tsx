import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import AuthGuard from '../components/AuthGuard';
import axios from 'axios';

type Shipment = {
  id: number;
  reference: string;
  origin?: string;
  destination?: string;
  created_at?: string;
  expenses?: any[];
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reference, setReference] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  useEffect(() => {
    fetchShipments();
  }, []);

  async function fetchShipments() {
    setLoading(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const resp = await axios.get(`${api}/api/shipments`, { headers: { Authorization: `Bearer ${token}` } });
      setShipments(resp.data || []);
    } catch (err: any) {
      setError(err?.response?.data || 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  }

  async function createShipment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      await axios.post(`${api}/api/shipments`, { reference, origin, destination }, { headers: { Authorization: `Bearer ${token}` } });
      setReference(''); setOrigin(''); setDestination('');
      fetchShipments();
    } catch (err: any) {
      setError(err?.response?.data || 'Failed to create shipment');
    }
  }

  return (
    <AuthGuard>
      <div>
        <Nav />
        <main style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
          <h2>Shipments</h2>
          <form onSubmit={createShipment} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <input placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} style={{ padding: 8, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input placeholder="Origin" value={origin} onChange={(e) => setOrigin(e.target.value)} style={{ padding: 8, flex: 1 }} />
              <input placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} style={{ padding: 8, flex: 1 }} />
            </div>
            <button type="submit" style={{ padding: '8px 12px' }}>Create Shipment</button>
          </form>

          {error && <div style={{ color: 'red' }}>{String(error)}</div>}

          {loading ? <p>Loading...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Reference</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Origin</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Destination</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s.id}>
                    <td style={{ padding: 8 }}>{s.id}</td>
                    <td style={{ padding: 8 }}>{s.reference}</td>
                    <td style={{ padding: 8 }}>{s.origin}</td>
                    <td style={{ padding: 8 }}>{s.destination}</td>
                    <td style={{ padding: 8 }}>{s.created_at || ''}</td>
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
