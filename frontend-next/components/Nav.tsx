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
      <Link href="/">
        <a style={{ marginRight: 12 }}>Login</a>
      </Link>
      <Link href="/me">
        <a style={{ marginRight: 12 }}>Me</a>
      </Link>
      <Link href="/shipments">
        <a style={{ marginRight: 12 }}>Shipments</a>
      </Link>
      <Link href="/expenses">
        <a style={{ marginRight: 12 }}>Expenses</a>
      </Link>
      {hasToken && (
        <button onClick={logout} style={{ marginLeft: 12, padding: '6px 10px' }}>Logout</button>
      )}
    </nav>
  );
}
