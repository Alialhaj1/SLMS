/**
 * Redirect /approvals to /approvals/pending
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ApprovalsIndexRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/approvals/pending');
  }, [router]);
  
  return null;
}
