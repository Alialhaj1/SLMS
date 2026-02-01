import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Nav() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setHasToken(!!t);
  }, []);

  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    router.push('/');
  }

  return (
    <nav style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #eee' }}>
      <Link href="/" style={{ marginRight: 12, cursor: 'pointer', textDecoration: 'none', color: '#0070f3' }}>
        Login
      </Link>
      <Link href="/me" style={{ marginRight: 12, cursor: 'pointer', textDecoration: 'none', color: '#0070f3' }}>
        Me
      </Link>
      <Link href="/shipments" style={{ marginRight: 12, cursor: 'pointer', textDecoration: 'none', color: '#0070f3' }}>
        Shipments
      </Link>
      <Link href="/expenses" style={{ marginRight: 12, cursor: 'pointer', textDecoration: 'none', color: '#0070f3' }}>
        Expenses
      </Link>
      {hasToken && (
        <button onClick={logout} style={{ marginLeft: 12, padding: '6px 10px' }}>Logout</button>
      )}
    </nav>
  );
}
