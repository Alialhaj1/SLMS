import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Old tariff-rates page  redirects to the new enterprise tariffs page at /master/tariffs
 */
export default function TariffRatesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/master/tariffs');
  }, [router]);
  return null;
}
