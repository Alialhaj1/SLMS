/**
 * Redirect /finance/vendor-payments to /procurement/payments
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function VendorPaymentsIndexRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Preserve query params (due=today, due=week, due=overdue)
    const query = router.query;
    const queryString = Object.keys(query).length > 0 
      ? '?' + new URLSearchParams(query as Record<string, string>).toString()
      : '';
    router.replace('/procurement/payments' + queryString);
  }, [router]);
  
  return null;
}
