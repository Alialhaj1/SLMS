import '../styles/globals.css';
import '../styles/rtl.css';
import '../styles/permission-components.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <LocaleProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <NotificationsProvider>
                <Component {...pageProps} />
              </NotificationsProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </LocaleProvider>
    </ErrorBoundary>
  );
}
