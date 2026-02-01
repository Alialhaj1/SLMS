/**
 * Login Page
 * Modern, secure login with must_change_password handling
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { 
  ArrowRightOnRectangleIcon, 
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  SunIcon,
  MoonIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = t('auth.login.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('auth.login.errors.emailInvalid');
    }

    if (!password) {
      newErrors.password = t('auth.login.errors.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const result = await login(email, password);

      if (result.must_change_password) {
        // User must change password - redirect to change password page
        router.replace(result.redirect_to || '/auth/change-password');
        return;
      }

      // Show welcome message
      const userName = result.user?.full_name || result.user?.email?.split('@')[0] || '';
      showToast(t('auth.login.welcomeBack', { name: userName }), 'success');

      // Normal login success - redirect to dashboard
      // Use replace to prevent back button going to login
      await router.replace('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Extract error message
      let errorMessage = t('auth.login.errors.invalidCredentials');
      
      if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>{t('auth.login.title')} - {t('common.appName')}</title>
        <meta name="description" content="Secure login to SLMS" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        {/* Top Right Controls: Language & Theme */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 flex items-center gap-2"
            title={locale === 'en' ? 'العربية' : 'English'}
          >
            <GlobeAltIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {locale === 'en' ? 'AR' : 'EN'}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200"
            title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          >
            {theme === 'dark' ? (
              <SunIcon className="w-5 h-5 text-yellow-500" />
            ) : (
              <MoonIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl mb-4 shadow-2xl shadow-blue-500/30">
              <span className="text-3xl font-bold text-white">S</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('common.appName')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Supply Chain Logistics Management System
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('auth.login.title')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('auth.login.subtitle')}
              </p>
            </div>

            {/* General Error Message */}
            {errors.general && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="email"
                name="email"
                label={t('auth.login.email')}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({});
                }}
                error={errors.email}
                disabled={loading}
                placeholder={t('auth.login.emailPlaceholder')}
              />

              {/* Password Field with Show/Hide Toggle */}
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  label={t('auth.login.password')}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({});
                  }}
                  error={errors.password}
                  disabled={loading}
                  placeholder={t('auth.login.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="flex items-center justify-end">
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 me-2" />
                {loading ? t('auth.login.loggingIn') : t('auth.login.loginButton')}
              </Button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                🔒 Secure login with encryption
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 SLMS. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
