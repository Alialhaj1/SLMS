import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AccountingIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/accounting/journals');
  }, []);
  return null;
}
