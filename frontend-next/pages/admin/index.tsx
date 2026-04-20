/**
 * ============================================================================
 * PLATFORM ADMIN LOGIN - Direct Access Route
 * ============================================================================
 * Dedicated login page for platform administrators as per specification:
 * - Super Admin login directly with email+password  
 * - Platform Admin login directly with email+password
 * - No company selection required (bypassed automatically)
 * - Redirects to /admin/platform after authentication
 * 
 * Route: https://slms.sa/admin
 * Access: Platform users only (Super Admin, Platform Admin)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../lib/authService';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  SunIcon,
  MoonIcon,
  GlobeAltIcon,
  ServerStackIcon,
  CheckIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// Platform Admin Login Component
// ============================================================================

export default function PlatformAdminLogin() {
  const router = useRouter();
  const { login, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  // State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-redirect if already authenticated as platform user
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.must_change_password) {
        router.replace('/auth/change-password');
        return;
      }

      // Check if user is platform admin
      const isPlatformUser = !user.tenant_id && (
        user.roles?.includes('super_admin') || 
        user.roles?.includes('platform_admin') ||
        (user as any).is_platform_admin
      );
      
      if (isPlatformUser) {
        router.replace('/admin/platform');
        return;
      }
      
      // If tenant user accidentally accessed admin route, redirect to tenant login
      if (user.tenant_id) {
        showToast({ type: 'warning', message: isRTL ? 'يرجى استخدام مدخل العملاء' : 'Please use the tenant login portal' });
        router.replace('/auth/login');
        return;
      }
    }
  }, [isAuthenticated, user, authLoading, router, showToast, isRTL]);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = isRTL ? 'الإيميل مطلوب' : 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = isRTL ? 'إيميل غير صحيح' : 'Invalid email format';
    }

    if (!password) {
      newErrors.password = isRTL ? 'كلمة المرور مطلوبة' : 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Platform login - no tenant_id required
      const result = await authService.platformLogin({
        email,
        password,
        rememberMe,
      });

      if (result.success && result.data?.must_change_password) {
        authService.saveTokens(result.data.temp_token || '', result.data.refreshToken);
        localStorage.setItem('user', JSON.stringify({
          email,
          tenant_id: null,
          must_change_password: true,
          login_context: 'platform',
          roles: [],
          permissions: [],
        }));
        window.dispatchEvent(new Event('auth:login'));

        showToast({
          type: 'info',
          message: result.data.message || (isRTL ? 'يجب تغيير كلمة المرور قبل الدخول' : 'You must change your password before continuing'),
        });

        router.replace(result.data.redirect_to || '/auth/change-password');
        return;
      }

      // Save tokens from login response
      if (result.success && result.data) {
        authService.saveTokens(result.data.accessToken, result.data.refreshToken);

        // Also cache user info immediately
        if (result.data.user) {
          localStorage.setItem('user', JSON.stringify(result.data.user));
        }

        // Notify AuthorizationContext of the login
        window.dispatchEvent(new Event('auth:login'));

        // Refresh user profile in AuthContext so LayoutWrapper sees authenticated state
        await refreshUser();
      }
      
      showToast({ type: 'success', message: isRTL ? 'تم تسجيل الدخول بنجاح' : 'Login successful' });
      
      // Redirect to redirect_url if provided, otherwise platform admin dashboard
      const redirectUrl = typeof router.query.redirect_url === 'string' ? router.query.redirect_url : null;
      router.replace(redirectUrl || '/admin/platform');

    } catch (error: any) {
      console.error('Platform login error:', error);
      
      // Handle specific error cases
      if (error.message === 'TENANT_USER_ADMIN_ACCESS') {
        showToast({ type: 'error', message: isRTL ? 'هذا الحساب للعملاء وليس لإدارة المنصة' : 'This account is for tenant users, not platform administration' });
        setErrors({ email: isRTL ? 'حساب عملاء - استخدم بوابة العملاء' : 'Tenant account - use tenant portal' });
      } else if (error.message === 'INSUFFICIENT_PLATFORM_PRIVILEGES') {
        showToast({ type: 'error', message: isRTL ? 'ليس لديك صلاحيات إدارة المنصة' : 'You do not have platform administration privileges' });
        setErrors({ email: isRTL ? 'ليس لديك صلاحيات المطلوبة' : 'Insufficient privileges for platform access' });
      } else if (error.message === 'INVALID_CREDENTIALS') {
        showToast({ type: 'error', message: isRTL ? 'إيميل أو كلمة مرور خاطئة' : 'Invalid email or password' });
        setErrors({ password: isRTL ? 'إيميل أو كلمة مرور خاطئة' : 'Invalid email or password' });
      } else {
        showToast({ type: 'error', message: isRTL ? 'فشل تسجيل الدخول' : 'Login failed' });
        setErrors({ password: isRTL ? 'حدث خطأ في تسجيل الدخول' : 'Login error occurred' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't render if still checking auth or if already authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Platform Administration - SLMS</title>
        <meta name="description" content="SLMS Platform Administration Login" />
        <meta name="robots" content="noindex, nofollow" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        {/* Header Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className="p-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={isRTL ? 'English' : 'العربية'}
          >
            <GlobeAltIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            
            {/* Platform Badge */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30">
                <ShieldCheckIcon className="w-6 h-6 text-blue-400" />
                <span className="text-white font-semibold">
                  {isRTL ? 'إدارة المنصة' : 'Platform Administration'}
                </span>
              </div>
            </div>

            {/* Login Card */}
            <div className="platform-admin-card p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl">
              
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 mb-4">
                  <ServerStackIcon className="w-8 h-8 text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {isRTL ? 'دخول المديرين' : 'Administrator Login'}
                </h1>
                <p className="text-white/60 text-sm">
                  {isRTL 
                    ? 'للمديرين والإداريين فقط - دخول مباشر' 
                    : 'For administrators only - Direct access'
                  }
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isRTL ? 'admin@example.com' : 'admin@example.com'}
                      className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                        errors.email ? 'border-red-500/50' : 'border-white/10'
                      } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all`}
                      autoComplete="email"
                      autoFocus
                      dir="ltr"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-4 h-4" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {isRTL ? 'كلمة المرور' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
                      className={`w-full px-4 py-3 pe-12 rounded-xl bg-white/5 border ${
                        errors.password ? 'border-red-500/50' : 'border-white/10'
                      } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all`}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5 text-white/40" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-white/40" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-4 h-4" />
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      rememberMe 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-white/30 group-hover:border-white/50'
                    }`}>
                      {rememberMe && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-sm text-white/70">
                      {isRTL ? 'تذكرني' : 'Remember me'}
                    </span>
                  </label>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                    loading
                      ? 'bg-white/10 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{isRTL ? 'جاري تسجيل الدخول...' : 'Logging in...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      <span>{isRTL ? 'دخول' : 'Login'}</span>
                    </div>
                  )}
                </button>
              </form>

              {/* Tenant Login Link */}
              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-white/60 text-sm mb-3">
                  {isRTL ? 'هل أنت مستخدم عادي؟' : 'Are you a regular user?'}
                </p>
                <Link 
                  href="/auth/login" 
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
                >
                  <BuildingOffice2Icon className="w-4 h-4" />
                  {isRTL ? 'دخول العملاء' : 'Tenant Login Portal'}
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-white/40 text-xs">
                {isRTL 
                  ? 'نظام إدارة اللوجستيات الذكي - إدارة المنصة' 
                  : 'Smart Logistics Management System - Platform Administration'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .platform-admin-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.3),
            0 10px 10px -5px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </>
  );
}

// Add BuildingOffice2Icon import if missing
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';