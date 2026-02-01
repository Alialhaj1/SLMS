/**
 * 📄 CREATE LETTER OF CREDIT PAGE
 * Redirect to main LC page with create modal
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CreateLetterOfCreditRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/finance/letters-of-credit?action=create');
  }, [router]);
  
  return null;
}
