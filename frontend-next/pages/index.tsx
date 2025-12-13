import { useState } from 'react';
import axios from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('Logging in...');
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const resp = await axios.post(`${api}/api/auth/login`, { email, password });
      const { accessToken, refreshToken } = resp.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setStatus('Login successful — tokens stored in localStorage');
    } catch (err: any) {
      setStatus(err?.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '5rem auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>SLMS — Login</h1>
      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 8 }} />
        <label style={{ display: 'block', margin: '12px 0 8px' }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 8 }} />
        <button type="submit" style={{ marginTop: 12, padding: '8px 12px' }}>Login</button>
      </form>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
      <p style={{ marginTop: 24, fontSize: 12, color: '#666' }}>This page stores tokens in localStorage for demo purposes only.</p>
    </div>
  );
}
