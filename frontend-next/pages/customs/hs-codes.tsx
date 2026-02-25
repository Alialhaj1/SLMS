// Deprecated: This page has been moved to /master/hs-codes
// This file redirects to the new enterprise HS Codes page
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function HSCodesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/master/hs-codes');
  }, [router]);
  return null;
}
