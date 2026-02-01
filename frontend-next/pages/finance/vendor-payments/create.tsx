/**
 * Redirect /finance/vendor-payments/create to /procurement/payments/new
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function VendorPaymentsCreateRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/procurement/payments/new');
  }, [router]);
  
  return null;
}
