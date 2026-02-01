/**
 * Redirect /finance/transfer-requests/create to /requests?tab=transfer
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TransferRequestsCreateRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/requests?tab=transfer&action=create');
  }, [router]);
  
  return null;
}
