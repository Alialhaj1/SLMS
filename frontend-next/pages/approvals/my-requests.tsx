/**
 * My Requests - Redirects to unified /requests page
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MyRequestsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/requests'); }, [router]);
  return null;
}
