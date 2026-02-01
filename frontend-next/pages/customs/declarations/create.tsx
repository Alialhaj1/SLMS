/**
 * 📄 CREATE CUSTOMS DECLARATION PAGE
 * Redirect to main declarations page with create action
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CreateCustomsDeclarationRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/customs/declarations?action=create');
  }, [router]);
  
  return null;
}
