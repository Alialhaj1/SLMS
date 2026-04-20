import '../styles/globals.css';
import '../styles/rtl.css';
import '../styles/permission-components.css';
import '../styles/enhanced-components.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import { AuthProvider } from '../contexts/AuthContext';
import { AuthorizationProvider } from '../contexts/AuthorizationContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { PolicyProvider } from '../hooks/usePolicies';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LayoutWrapper } from '../components/layout/LayoutWrapper';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <LocaleProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AuthorizationProvider>
                <NotificationsProvider>
                  <PolicyProvider>
                    <LayoutWrapper>
                      <Component {...pageProps} />
                    </LayoutWrapper>
                  </PolicyProvider>
                </NotificationsProvider>
              </AuthorizationProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </LocaleProvider>
    </ErrorBoundary>
  );
}
