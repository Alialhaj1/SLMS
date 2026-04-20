/**
 * ============================================================================
 * §17.4 — useUnsavedChanges Hook
 * ============================================================================
 * Warning when leaving page with unsaved changes.
 * Covers both browser navigation (beforeunload) and Next.js client-side routing.
 *
 * Usage:
 *   useUnsavedChanges(formIsDirty, 'You have unsaved changes. Are you sure?');
 * ============================================================================
 */

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

/**
 * Shows a confirmation dialog when the user tries to leave the page
 * with unsaved changes (both browser back/close and Next.js routing).
 *
 * @param isDirty - Whether there are unsaved changes
 * @param message - Custom warning message (optional)
 */
export function useUnsavedChanges(
  isDirty: boolean,
  message: string = 'لديك تغييرات غير محفوظة. هل تريد المغادرة؟'
): void {
  const router = useRouter();

  // Browser navigation (close tab, refresh, browser back)
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // Next.js client-side routing
  const handleRouteChange = useCallback(
    (url: string) => {
      if (!isDirty) return;

      // Don't warn when navigating to the same page
      if (url === router.asPath) return;

      const confirmed = window.confirm(message);
      if (!confirmed) {
        // Cancel the route change
        router.events.emit('routeChangeError');
        throw 'Route change aborted by user (unsaved changes). This is expected.';
      }
    },
    [isDirty, message, router]
  );

  useEffect(() => {
    if (!isDirty) return;

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [isDirty, handleRouteChange, router.events]);
}

export default useUnsavedChanges;
