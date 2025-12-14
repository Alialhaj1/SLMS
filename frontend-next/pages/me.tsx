import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import AuthGuard from '../components/AuthGuard';
import axios from 'axios';

export default function MePage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const resp = await axios.get(`${api}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
        setUser(resp.data);
      } catch (err: any) {
        setError(err?.response?.data || 'Failed to load /api/me');
      }
    };
    load();
  }, []);

  return (
    <AuthGuard>
      <div>
        <Nav />
        <main style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
          <h2>My Account</h2>
          {error && <div style={{ color: 'red' }}>{String(error)}</div>}
          {user ? (
            <div>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Full name:</strong> {user.full_name}</p>
              <p><strong>Roles:</strong> {user.roles ? user.roles.join(', ') : '—'}</p>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
