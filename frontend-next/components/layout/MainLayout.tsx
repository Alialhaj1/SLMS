import { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useRouter } from 'next/router';
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

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Desktop sidebar with smooth transition */}
      <div className={clsx(
        'hidden lg:block transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-20' : 'w-64'
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
          <div className="fixed inset-y-0 start-0 z-50 lg:hidden animate-slide-down">
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
          'relative z-30 transition-shadow duration-300',
          scrollY > 10 && 'shadow-md shadow-slate-200/50 dark:shadow-slate-900/50'
        )}>
          <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        </div>

        {/* Page content with fade transition */}
        <main 
          className="flex-1 overflow-y-auto scroll-smooth"
          onScroll={handleScroll}
        >
          {/* Decorative gradient orbs for visual depth */}
          <div className="fixed top-1/4 -end-20 w-96 h-96 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed bottom-1/4 -start-20 w-96 h-96 bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className={clsx(
            'relative z-10 p-6 lg:p-8 transition-all duration-300',
            isPageTransitioning ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'
          )}>
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>

        {/* Enhanced footer */}
        <footer className="relative z-20 h-14 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-between px-6 text-sm text-slate-500 dark:text-slate-400">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>نظام متصل</span>
          </p>
          <p>&copy; {new Date().getFullYear()} SLMS - نظام إدارة اللوجستيات الذكي</p>
        </footer>
      </div>
    </div>
  );
}
