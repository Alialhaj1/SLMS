import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type Props = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      // not authenticated — redirect to login
      router.replace('/');
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) return <div style={{ padding: 20 }}>Redirecting to login...</div>;
  return <>{children}</>;
}
