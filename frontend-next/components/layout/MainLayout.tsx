import { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { useMenu } from '../../hooks/useMenu';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import clsx from 'clsx';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const router = useRouter();
  const { menu } = useMenu();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { t } = useTranslation();

  // ── Breadcrumb helper (QA 13.10) ──
  const getBreadcrumb = () => {
    const path = router.pathname;
    const segments = path.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [];
    let accumulated = '';
    for (const seg of segments) {
      if (seg.startsWith('[')) continue; // skip dynamic
      accumulated += '/' + seg;
      const label = seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      crumbs.push({ label, path: accumulated });
    }
    return crumbs;
  };

  // ── Auth Guard: redirect unauthenticated users to login ──
  useEffect(() => {
    if (authLoading) return; // still checking – wait

    if (!isAuthenticated) {
      // Determine the correct login page based on route
      const isAdminRoute = router.asPath.startsWith('/admin');
      const loginPath = isAdminRoute ? '/admin' : '/auth/login';
      const redirectUrl = encodeURIComponent(router.asPath);
      router.replace(`${loginPath}?redirect_url=${redirectUrl}`);
    }
  }, [isAuthenticated, authLoading, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [router.pathname]);

  // Handle page transition animation
  useEffect(() => {
    const handleStart = () => setIsPageTransitioning(true);
    const handleComplete = () => {
      setTimeout(() => setIsPageTransitioning(false), 100);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  // Close mobile sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track scroll position for header effects
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    setScrollY(target.scrollTop);
  }, []);

  // Auth guard: show spinner while auth resolves.
  // IMPORTANT: This must be AFTER all hooks to satisfy Rules of Hooks
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-primary-50/30 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-primary-50/30 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      {/* Desktop sidebar with smooth transition */}
      <div className={clsx(
        'hidden lg:block transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}>
        <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      </div>

      {/* Mobile sidebar with backdrop blur */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 start-0 z-50 lg:hidden animate-slide-in">
            <Sidebar
              collapsed={false}
              onCollapse={() => {}}
              mobile={true}
            />
          </div>
        </>
      )}

      {/* Main content with animations */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with scroll shadow effect */}
        <div className={clsx(
          'relative z-30 transition-shadow duration-300 h-header',
          scrollY > 10 && 'shadow-md shadow-neutral-200/50 dark:shadow-neutral-900/50'
        )}>
          <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        </div>

        {/* Page content with fade transition */}
        <main 
          className="flex-1 overflow-y-auto scroll-smooth"
          onScroll={handleScroll}
        >
          {/* Decorative gradient orbs for visual depth */}
          <div className="fixed top-1/4 -end-20 w-96 h-96 bg-primary-400/10 dark:bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed bottom-1/4 -start-20 w-96 h-96 bg-secondary-400/10 dark:bg-secondary-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className={clsx(
            'relative z-10 p-6 lg:p-8 transition-opacity duration-300',
            isPageTransitioning ? 'opacity-50' : 'opacity-100'
          )}>
            {/* Breadcrumb (QA 13.10) */}
            {getBreadcrumb().length > 1 && (
              <nav className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
                {getBreadcrumb().map((crumb, i, arr) => (
                  <span key={crumb.path} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
                    {i === arr.length - 1 ? (
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{crumb.label}</span>
                    ) : (
                      <a href={crumb.path} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{crumb.label}</a>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>

        {/* §17.4 — Global Command Palette (Ctrl+K) */}
        <CommandPalette menuItems={menu as any} />

        {/* Enhanced footer */}
        <footer className="relative z-20 h-14 border-t border-neutral-200/50 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm flex items-center justify-between px-6 text-sm text-neutral-500 dark:text-neutral-400">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-feedback-success-500 animate-pulse" />
            <span>نظام متصل</span>
          </p>
          <p>&copy; {new Date().getFullYear()} SLMS - نظام إدارة اللوجستيات الذكي</p>
        </footer>
      </div>
    </div>
  );
}
