/**
 * Redirect /finance/transfer-requests to /requests?tab=transfer
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TransferRequestsIndexRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/requests?tab=transfer');
  }, [router]);
  
  return null;
}
