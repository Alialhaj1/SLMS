/**
 * Redirect /shipping-bills/create to /shipping-bills/new
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ShippingBillsCreateRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/shipping-bills/new');
  }, [router]);
  
  return null;
}
