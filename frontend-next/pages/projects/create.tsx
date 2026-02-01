/**
 * Redirect /projects/create to /projects/new
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ProjectsCreateRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/projects/new');
  }, [router]);
  
  return null;
}
