/**
 * Redirect: supplier-classifications -> vendor-classifications
 * The enterprise version lives at /master/vendor-classifications.
 * This page exists only for backward compatibility.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SupplierClassificationsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/master/vendor-classifications'); }, [router]);
  return null;
}
