/**
 * Redirect /finance/vendor-payments/[id] to /procurement/payments/[id]
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function VendorPaymentDetailRedirect() {
  const router = useRouter();
  const { id } = router.query;
  
  useEffect(() => {
    if (id) {
      router.replace(`/procurement/payments/${id}`);
    }
  }, [router, id]);
  
  return null;
}
