/**
 * Vendor Payment Create - Redirect to main payment page
 * This page redirects to /procurement/payments/new with the vendor pre-selected
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function VendorPaymentCreateRedirect() {
  const router = useRouter();
  const { vendor_id, vendorId, from, return_url } = router.query;

  useEffect(() => {
    // Build query string preserving all params
    const params = new URLSearchParams();
    const vid = vendor_id || vendorId;
    if (vid) params.append('vendor_id', String(vid));
    if (from) params.append('from', String(from));
    if (return_url) params.append('return_url', String(return_url));
    
    const queryString = params.toString();
    router.replace(`/procurement/payments/new${queryString ? '?' + queryString : ''}`);
  }, [router, vendor_id, vendorId, from, return_url]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
