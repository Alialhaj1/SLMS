/**
 * ============================================================================
 * TENANT LOGIN FORM - Enhanced Company-Specific Login
 * ============================================================================
 * Handles tenant login with optional pre-filled company information
 * Supports both standalone use and company slug pre-filling
 * 
 * Features:
 * - Company branding (colors, logo)
 * - Step-by-step login flow (company → credentials → MFA)
 * - Company validation and status checking
 * - Responsive design with dark mode
 * - Arabic/English support
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../lib/authService';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { 
  BuildingOffice2Icon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  SunIcon,
  MoonIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

// Types
interface CompanyInfo {
  id: number;
  tenant_code: string;
  name: string;
  name_ar?: string;
  slug?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  status: string;
}

interface CompanyBranding {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

interface TenantLoginFormProps {
  prefilledCompany?: CompanyInfo;
  companyBranding?: CompanyBranding;
  prefilledCompanyCode?: string;
}

type LoginStep = 'company' | 'credentials' | 'mfa';

// ============================================================================
// Step Indicator Component
// ============================================================================

interface StepIndicatorProps {
  currentStep: LoginStep;
  isRTL: boolean;
}

function StepIndicator({ currentStep, isRTL }: StepIndicatorProps) {
  const steps = ['company', 'credentials', 'mfa'];
  const stepLabels = {
    company: isRTL ? 'الشركة' : 'Company',
    credentials: isRTL ? 'الدخول' : 'Credentials',
    mfa: isRTL ? 'التحقق' : 'Verification',
  };

  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={`step-indicator ${
            index < currentIndex ? 'completed' : 
            index === currentIndex ? 'active' : 'pending'
          }`}>
            {index < currentIndex ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          <span className={`mx-2 text-sm ${
            index <= currentIndex ? 'text-white' : 'text-white/40'
          }`}>
            {stepLabels[step as keyof typeof stepLabels]}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-2 ${
              index < currentIndex ? 'bg-green-500' : 'bg-white/20'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Tenant Login Form
// ============================================================================

export default function TenantLoginForm({ prefilledCompany, companyBranding, prefilledCompanyCode }: TenantLoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  // State
  const [currentStep, setCurrentStep] = useState<LoginStep>(prefilledCompany ? 'credentials' : 'company');
  const [selectedCompany, setSelectedCompany] = useState<CompanyInfo | null>(prefilledCompany || null);
  const [companyCode, setCompanyCode] = useState(prefilledCompany?.tenant_code || prefilledCompanyCode || '');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Apply company branding
  useEffect(() => {
    if (companyBranding?.primary_color) {
      document.documentElement.style.setProperty('--company-primary', companyBranding.primary_color);
    }
    if (companyBranding?.secondary_color) {
      document.documentElement.style.setProperty('--company-secondary', companyBranding.secondary_color);
    }
    
    return () => {
      document.documentElement.style.removeProperty('--company-primary');
      document.documentElement.style.removeProperty('--company-secondary');
    };
  }, [companyBranding]);

  // Validate prefilled company code on mount
  useEffect(() => {
    if (prefilledCompanyCode && !prefilledCompany) {
      handleCompanyCodeChange(prefilledCompanyCode);
    }
  }, [prefilledCompanyCode, prefilledCompany]);

  // Company validation
  const validateCompany = async (code: string) => {
    if (!code) return false;
    
    try {
      const res = await fetch(`/api/tenants/validate/${encodeURIComponent(code.toUpperCase())}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCompany(data.data);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Handle company code change
  const handleCompanyCodeChange = async (code: string) => {
    setCompanyCode(code.toUpperCase());
    setErrors(prev => ({ ...prev, company: '' }));
    
    if (code.length >= 3) {
      const isValid = await validateCompany(code);
      if (!isValid) {
        setErrors(prev => ({ ...prev, company: isRTL ? 'رمز الشركة غير صحيح' : 'Invalid company code' }));
        setSelectedCompany(null);
      }
    } else {
      setSelectedCompany(null);
    }
  };

  // Proceed to credentials step
  const handleCompanyNext = () => {
    if (!selectedCompany) {
      setErrors(prev => ({ ...prev, company: isRTL ? 'يرجى إدخال رمز شركة صحيح' : 'Please enter a valid company code' }));
      return;
    }
    
    setCurrentStep('credentials');
  };

  // Go back to company step
  const handleBackToCompany = () => {
    setCurrentStep('company');
    setErrors({});
  };

  // Validate credentials form
  const validateCredentials = () => {
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

  // Handle credentials submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCredentials() || !selectedCompany) return;

    setLoading(true);
    setErrors({});

    try {
      const result = await authService.tenantLogin({
        email,
        password,
        tenant_code: selectedCompany.tenant_code,
        rememberMe,
      });

      // Handle MFA if required
      if (result.mfa_required || result.mfa_setup_required) {
        setCurrentStep('mfa');
        // Store MFA token for next step
        return;
      }

      if (result.success && result.data?.must_change_password) {
        authService.saveTokens(result.data.temp_token || '', result.data.refreshToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify({
            email,
            tenant_id: selectedCompany.id,
            must_change_password: true,
            login_context: 'tenant',
            roles: [],
            permissions: [],
          }));
          window.dispatchEvent(new Event('auth:login'));
        }

        showToast({
          type: 'info',
          message: result.data.message || (isRTL ? 'يجب تغيير كلمة المرور قبل الدخول' : 'You must change your password before continuing'),
        });

        router.replace(result.data.redirect_to || '/auth/change-password');
        return;
      }

      // Login successful - tokens already saved by authService
      // User will be loaded automatically by AuthContext
      
      showToast({ type: 'success', message: isRTL ? 'تم تسجيل الدخول بنجاح' : 'Login successful' });
      
      // Redirect to tenant dashboard
      router.replace('/dashboard');

    } catch (error: any) {
      console.error('Tenant login error:', error);
      
      if (error.message === 'COMPANY_NOT_FOUND') {
        setErrors({ company: isRTL ? 'الشركة غير موجودة' : 'Company not found' });
        setCurrentStep('company');
      } else if (error.message === 'COMPANY_LOCKED') {
        showToast({ type: 'error', message: isRTL ? 'حساب الشركة مقفل' : 'Company account is locked' });
      } else if (error.message === 'COMPANY_TERMINATED') {
        showToast({ type: 'error', message: isRTL ? 'حساب الشركة منتهي' : 'Company account is terminated' });
      } else if (error.message === 'INVALID_CREDENTIALS') {
        setErrors({ password: isRTL ? 'إيميل أو كلمة مرور خاطئة' : 'Invalid email or password' });
      } else {
        showToast({ type: 'error', message: isRTL ? 'فشل تسجيل الدخول' : 'Login failed' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>
          {selectedCompany 
            ? `${isRTL ? selectedCompany.name_ar || selectedCompany.name : selectedCompany.name} - SLMS`
            : (isRTL ? 'دخول الشركات - SLMS' : 'Company Login - SLMS')
          }
        </title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        {/* Header Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          >
            <GlobeAltIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            
            {/* Company Branding */}
            {selectedCompany && (
              <div className="text-center mb-8">
                {companyBranding?.logo_url && (
                  <img 
                    src={companyBranding.logo_url} 
                    alt={selectedCompany.name}
                    className="w-16 h-16 mx-auto mb-4 rounded-lg object-contain bg-white/10 p-2"
                  />
                )}
                <h2 className="text-xl font-bold text-white mb-2">
                  {isRTL ? selectedCompany.name_ar || selectedCompany.name : selectedCompany.name}
                </h2>
                <p className="text-white/60 text-sm">
                  {isRTL ? 'نظام إدارة اللوجستيات' : 'Logistics Management System'}
                </p>
              </div>
            )}

            {/* Login Card */}
            <div className="tenant-login-card p-8 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
              
              {/* Step Indicator */}
              <StepIndicator currentStep={currentStep} isRTL={isRTL} />

              {/* Company Selection Step */}
              {currentStep === 'company' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <BuildingOffice2Icon className="w-12 h-12 text-white/60 mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-white mb-2">
                      {isRTL ? 'تحديد الشركة' : 'Company Identification'}
                    </h1>
                    <p className="text-white/60 text-sm">
                      {isRTL ? 'أدخل رمز شركتك للمتابعة' : 'Enter your company code to continue'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      {isRTL ? 'رمز الشركة' : 'Company Code'}
                    </label>
                    <div className="relative">
                      <BuildingOffice2Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="text"
                        value={companyCode}
                        onChange={(e) => handleCompanyCodeChange(e.target.value)}
                        placeholder={isRTL ? 'مثال: ALHAJCO' : 'e.g. ALHAJCO'}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border ${
                          errors.company ? 'border-red-500/50' : 'border-white/10'
                        } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 uppercase tracking-widest font-mono`}
                        autoFocus
                      />
                    </div>
                    {errors.company && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="w-4 h-4" />
                        {errors.company}
                      </p>
                    )}
                  </div>

                  {/* Selected Company Display */}
                  {selectedCompany && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-400" />
                        <div>
                          <p className="text-green-400 font-medium">
                            {isRTL ? 'تم التحقق من الشركة' : 'Company Verified'}
                          </p>
                          <p className="text-white font-semibold">
                            {isRTL ? selectedCompany.name_ar || selectedCompany.name : selectedCompany.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCompanyNext}
                    disabled={!selectedCompany}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                      selectedCompany
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                        : 'bg-white/10 cursor-not-allowed'
                    }`}
                  >
                    {isRTL ? 'متابعة' : 'Continue'}
                  </button>
                </div>
              )}

              {/* Credentials Step */}
              {currentStep === 'credentials' && (
                <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <button
                        type="button"
                        onClick={handleBackToCompany}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <ArrowLeftIcon className="w-5 h-5 text-white/70" />
                      </button>
                      <h1 className="text-2xl font-bold text-white">
                        {isRTL ? 'تسجيل الدخول' : 'Login'}
                      </h1>
                    </div>
                    {selectedCompany && (
                      <p className="text-white/60 text-sm">
                        {isRTL ? selectedCompany.name_ar || selectedCompany.name : selectedCompany.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isRTL ? 'user@example.com' : 'user@example.com'}
                      className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                        errors.email ? 'border-red-500/50' : 'border-white/10'
                      } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                      autoFocus
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="w-4 h-4" />
                        {errors.email}
                      </p>
                    )}
                  </div>

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
                        className={`w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border ${
                          errors.password ? 'border-red-500/50' : 'border-white/10'
                        } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors"
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

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                      loading
                        ? 'bg-white/10 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
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
              )}

              {/* MFA Step - Placeholder */}
              {currentStep === 'mfa' && (
                <div className="text-center">
                  <p className="text-white/70">
                    {isRTL ? 'التحقق الثنائي قيد التطوير' : 'MFA verification coming soon'}
                  </p>
                </div>
              )}

              {/* Admin Login Link */}
              <div className="mt-8 pt-6 border-t border-white/20 text-center">
                <p className="text-white/60 text-sm mb-3">
                  {isRTL ? 'هل أنت مدير منصة؟' : 'Are you a platform administrator?'}
                </p>
                <Link 
                  href="/admin" 
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  {isRTL ? 'دخول الإدارة' : 'Admin Login'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tenant-login-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.05);
        }
        
        .step-indicator {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s ease;
        }
        
        .step-indicator.pending {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .step-indicator.active {
          background: #3b82f6;
          color: white;
          border: 2px solid #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
        }
        
        .step-indicator.completed {
          background: #10b981;
          color: white;
          border: 2px solid #10b981;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}