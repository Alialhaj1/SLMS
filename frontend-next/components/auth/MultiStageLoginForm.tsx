/**
 * ============================================================================
 * MULTI-STAGE LOGIN FORM - Arabic Specification Implementation
 * ============================================================================
 * Implements the 3-stage login flow as per Arabic specification:
 * Stage 1: Company ID input (HAJ-001 format)
 * Stage 2: Email + Password (appears after company verification)
 * Stage 3: MFA/2FA (if required)
 * 
 * Features:
 * - Arabic design system with gradient background
 * - Company verification with uppercase formatting  
 * - JWT-based authentication with tenant isolation
 * - RBAC permission system integration
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../lib/authService';
import { companyStore } from '../../lib/companyStore';
import { 
  BuildingOffice2Icon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface CompanyVerificationResponse {
  success: boolean;
  data: {
    tenant_id: number;
    company_code: string;
    company_name: string;
    company_name_ar?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    status: 'active' | 'suspended' | 'inactive';
  };
  error?: string;
}

interface CredentialsFormData {
  email: string;
  password: string;
  remember_me: boolean;
}

type LoginStage = 'company' | 'credentials' | 'mfa';

// ============================================================================
// Multi-Stage Login Form Component
// ============================================================================

export default function MultiStageLoginForm({ mode = 'tenant' }: { mode?: 'tenant' | 'admin' }) {
  const router = useRouter();
  const { login } = useAuth();
  const { locale, t } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';
  const isAdminMode = mode === 'admin';

  // Form state
  const [currentStage, setCurrentStage] = useState<LoginStage>(isAdminMode ? 'credentials' : 'company');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Stage 1: Company verification
  const [companyCode, setCompanyCode] = useState('');
  const [companyInfo, setCompanyInfo] = useState<CompanyVerificationResponse['data'] | null>(null);
  const [companyError, setCompanyError] = useState('');
  
  // Stage 2: Credentials
  const [credentials, setCredentials] = useState<CredentialsFormData>({
    email: '',
    password: '',
    remember_me: false,
  });
  const [credentialsError, setCredentialsError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Stage 3: MFA (if required)
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaError, setMfaError] = useState('');

  // Contact support modal
  const [showContactModal, setShowContactModal] = useState(false);

  // ============================================================================
  // Company Code Formatting & Validation
  // ============================================================================
  
  const formatCompanyCode = (value: string): string => {
    // Convert to uppercase, allow 3-10 alphanumeric characters
    // Company codes are created as plain uppercase strings (e.g., DARKHAWLAN, ALHAJ)
    return value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 10);
  };

  const handleCompanyCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCompanyCode(e.target.value);
    setCompanyCode(formatted);
    setCompanyError('');
  };

  // ============================================================================
  // Stage 1: Company Verification
  // ============================================================================
  
  const handleCompanyVerification = async () => {
    if (!companyCode || companyCode.length < 3) {
      setCompanyError(isRTL ? 'يرجى إدخال رقم معرف الشركة (3-10 أحرف، مثال: DARKHAWLAN)' : 'Please enter company ID (3-10 characters, e.g., DARKHAWLAN)');
      return;
    }

    setLoading(true);
    setCompanyError('');

    try {
      const response = await fetch(`http://localhost:4000/api/tenants/validate/${encodeURIComponent(companyCode)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        if (result.data.status !== 'active') {
          throw new Error(isRTL ? 'هذه الشركة غير نشطة حالياً' : 'This company is currently inactive');
        }
        
        // Map backend response fields to frontend CompanyVerificationResponse format
        const mapped: CompanyVerificationResponse['data'] = {
          tenant_id: result.data.id,
          company_code: result.data.tenant_code || result.data.code || companyCode,
          company_name: result.data.name,
          company_name_ar: result.data.name_ar,
          logo_url: result.data.logo_url,
          primary_color: result.data.primary_color,
          secondary_color: result.data.secondary_color,
          status: result.data.status,
        };

        setCompanyInfo(mapped);
        setCurrentStage('credentials');
        
        showToast({ type: 'success', message: isRTL ? 
          `تم التحقق من الشركة: ${mapped.company_name_ar || mapped.company_name}` : 
          `Company verified: ${mapped.company_name}`
        });
      } else {
        throw new Error(result.error || (isRTL ? 'رقم معرف الشركة غير صحيح' : 'Invalid company ID'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (isRTL ? 'حدث خطأ في التحقق من الشركة' : 'Company verification failed');
      setCompanyError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Stage 2: Credentials Submission
  // ============================================================================
  
  const handleCredentialsSubmit = async () => {
    const newFieldErrors: Record<string, string> = {};

    if (!credentials.email) {
      newFieldErrors.email = isRTL ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      newFieldErrors.email = isRTL ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format';
    }

    if (!credentials.password) {
      newFieldErrors.password = isRTL ? 'كلمة المرور مطلوبة' : 'Password is required';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setFieldErrors({});

    if (!isAdminMode && !companyInfo) {
      setCredentialsError(isRTL ? 'خطأ في معلومات الشركة' : 'Company information error');
      return;
    }

    setLoading(true);
    setCredentialsError('');

    try {
      let response;
      if (isAdminMode) {
        response = await authService.platformLogin({
          email: credentials.email,
          password: credentials.password,
          rememberMe: credentials.remember_me,
        });
      } else {
        const loginRequest = {
          email: credentials.email,
          password: credentials.password,
          tenant_code: companyInfo!.company_code,
          rememberMe: credentials.remember_me,
        };
        response = await authService.login(loginRequest);
      }
      
      if (response.mfa_required) {
        setMfaToken(response.mfa_token || '');
        setCurrentStage('mfa');
        showToast({ type: 'info', message: isRTL ? 'يرجى إدخال رمز التحقق المرسل إليك' : 'Please enter the verification code sent to you' });
      } else if (response.success && response.data?.must_change_password) {
        authService.saveTokens(response.data.temp_token || '', response.data.refreshToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify({
            email: credentials.email,
            tenant_id: companyInfo?.tenant_id,
            must_change_password: true,
            login_context: isAdminMode ? 'platform' : 'tenant',
            roles: [],
            permissions: [],
          }));
          window.dispatchEvent(new Event('auth:login'));
        }

        showToast({
          type: 'info',
          message: response.data.message || (isRTL ? 'يجب تغيير كلمة المرور قبل الدخول' : 'You must change your password before continuing'),
        });

        router.replace(response.data.redirect_to || '/auth/change-password');
      } else if (response.success && response.data) {
        // Clear stale company selection from previous session
        companyStore.clear();
        // Save tokens and user state so auth context recognizes the session
        authService.saveTokens(response.data.accessToken, response.data.refreshToken);
        if (response.data.user && typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          window.dispatchEvent(new Event('auth:login'));
        }
        
        showToast({ type: 'success', message: isRTL ? 'تم تسجيل الدخول بنجاح' : 'Login successful' });
        // Navigation is handled by the parent login page's useEffect when auth state updates
      } else {
        throw new Error(isRTL ? 'خطأ في تسجيل الدخول' : 'Login failed');
      }
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : '';
      if (errorCode === 'USER_EMAIL_NOT_FOUND') {
        setCredentialsError(isRTL
          ? 'هذا البريد الإلكتروني غير موجود حالياً في بيانات المستخدمين. يرجى التواصل مع إدارة المنصة لمزيد من المعلومات.'
          : 'This email does not currently exist in the system. Please contact platform administration for more information.');
        setShowContactModal(true);
      } else {
        const errorMessage = errorCode || (isRTL ? 'خطأ في تسجيل الدخول' : 'Login failed');
        setCredentialsError(errorMessage);
        showToast({ type: 'error', message: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Stage 3: MFA Verification (if required)
  // ============================================================================
  
  const handleMfaVerification = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      setMfaError(isRTL ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام' : 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setMfaError('');

    try {
      const response = await authService.verifyMFA({
        mfa_token: mfaToken,
        mfa_code: mfaCode,
      });

      if (response.success && response.data) {
        // Ensure tokens and user are saved to auth context
        authService.saveTokens(response.data.accessToken, response.data.refreshToken);
        if (response.data.user && typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          window.dispatchEvent(new Event('auth:login'));
        }
        
        showToast({ type: 'success', message: isRTL ? 'تم تسجيل الدخول بنجاح' : 'Login successful' });
        // Navigation is handled by the parent login page's useEffect when auth state updates
      } else {
        throw new Error(isRTL ? 'رمز التحقق غير صحيح' : 'Invalid verification code');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (isRTL ? 'خطأ في التحقق' : 'Verification failed');
      setMfaError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Keyboard Events
  // ============================================================================
  
  const handleKeyDown = (e: React.KeyboardEvent, submitFunction: () => void) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      submitFunction();
    }
  };

  // ============================================================================
  // Render Methods
  // ============================================================================

  const renderStageIndicator = () => {
    if (isAdminMode) {
      return (
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`slms-stage-indicator ${currentStage === 'credentials' ? 'active' : 'completed'}`}>
            {currentStage === 'mfa' ? <CheckCircleIcon className="w-5 h-5" /> : '1'}
          </div>
          <div className="w-8 h-0.5 bg-primary-200 dark:bg-primary-800" />
          <div className={`slms-stage-indicator ${currentStage === 'mfa' ? 'active' : 'pending'}`}>
            2
          </div>
        </div>
      );
    }
    return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <div className={`slms-stage-indicator ${currentStage === 'company' ? 'active' : 'completed'}`}>
        {currentStage !== 'company' ? <CheckCircleIcon className="w-5 h-5" /> : '1'}
      </div>
      <div className="w-8 h-0.5 bg-primary-200 dark:bg-primary-800" />
      <div className={`slms-stage-indicator ${
        currentStage === 'credentials' ? 'active' : 
        currentStage === 'mfa' ? 'completed' : 'pending'
      }`}>
        {currentStage === 'mfa' ? <CheckCircleIcon className="w-5 h-5" /> : '2'}
      </div>
      <div className="w-8 h-0.5 bg-primary-200 dark:bg-primary-800" />
      <div className={`slms-stage-indicator ${currentStage === 'mfa' ? 'active' : 'pending'}`}>
        3
      </div>
    </div>
    );
  };

  const renderCompanyStage = () => (
    <div className="space-y-6 slms-fade-in">
      <div className="text-center">
        <BuildingOffice2Icon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          {isRTL ? 'تحديد الشركة' : 'Company Identification'}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          {isRTL ? 'أدخل رقم معرف الشركة للمتابعة' : 'Enter your company ID to continue'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="companyCode" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {isRTL ? 'رقم معرف الشركة' : 'Company ID'}
          </label>
          <div className="relative">
            <input
              id="companyCode"
              type="text"
              value={companyCode}
              onChange={handleCompanyCodeChange}
              onKeyDown={(e) => handleKeyDown(e, handleCompanyVerification)}
              className={`slms-input ${companyError ? 'error' : ''}`}
              maxLength={10}
              autoComplete="organization"
              disabled={loading}
            />
            {companyError && (
              <div className="absolute inset-y-0 end-0 flex items-center pe-3">
                <ExclamationCircleIcon className="w-5 h-5 text-feedback-error-500" />
              </div>
            )}
          </div>
          {companyError && (
            <p className="mt-2 text-sm text-feedback-error-600 dark:text-feedback-error-400 flex items-center gap-2">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              {companyError}
            </p>
          )}
        </div>

        <button
          onClick={handleCompanyVerification}
          disabled={loading || !companyCode}
          className="slms-btn-primary w-full"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isRTL ? 'جاري التحقق...' : 'Verifying...'}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {isRTL ? 'تحقق من الشركة' : 'Verify Company'}
              <ArrowRightIcon className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </div>
          )}
        </button>
      </div>
    </div>
  );

  const renderCredentialsStage = () => (
    <div className="space-y-6 slms-fade-in">
      {isAdminMode ? (
        <div className="text-center pb-4 border-b border-neutral-200 dark:border-neutral-700">
          <ShieldCheckIcon className="w-12 h-12 text-purple-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
            {isRTL ? 'تسجيل دخول مدير المنصة' : 'Platform Admin Login'}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {isRTL ? 'أدخل بيانات الاعتماد للوصول إلى لوحة تحكم المنصة' : 'Enter credentials to access the platform dashboard'}
          </p>
        </div>
      ) : companyInfo && (
        <div className="text-center pb-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CheckCircleIcon className="w-6 h-6 text-feedback-success-500" />
            <span className="text-lg font-semibold text-neutral-900 dark:text-white">
              {isRTL ? (companyInfo.company_name_ar || companyInfo.company_name) : companyInfo.company_name}
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {companyInfo.company_code}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
          </label>
          <input
            id="email"
            type="email"
            value={credentials.email}
            onChange={(e) => { setCredentials({ ...credentials, email: e.target.value }); setFieldErrors(prev => { const { email, ...rest } = prev; return rest; }); }}
            onKeyDown={(e) => handleKeyDown(e, handleCredentialsSubmit)}
            placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
            className={`slms-input ${fieldErrors.email || credentialsError ? 'error' : ''}`}
            dir="ltr"
            autoComplete="username"
            disabled={loading}
          />
          {fieldErrors.email && (
            <p className="mt-2 text-sm text-feedback-error-600 dark:text-feedback-error-400 flex items-center gap-2">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {isRTL ? 'كلمة المرور' : 'Password'}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
              onChange={(e) => { setCredentials({ ...credentials, password: e.target.value }); setFieldErrors(prev => { const { password, ...rest } = prev; return rest; }); }}
              onKeyDown={(e) => handleKeyDown(e, handleCredentialsSubmit)}
              placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
              className={`slms-input ${fieldErrors.password || credentialsError ? 'error' : ''}`}
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
              title={showPassword ? (isRTL ? 'إخفاء كلمة المرور' : 'Hide password') : (isRTL ? 'إظهار كلمة المرور' : 'Show password')}
              disabled={loading}
            >
              {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-2 text-sm text-feedback-error-600 dark:text-feedback-error-400 flex items-center gap-2">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="flex items-center">
          <input
            id="rememberMe"
            type="checkbox"
            checked={credentials.remember_me}
            onChange={(e) => setCredentials({ ...credentials, remember_me: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700"
            disabled={loading}
          />
          <label htmlFor="rememberMe" className="ms-2 text-sm text-neutral-700 dark:text-neutral-300">
            {isRTL ? 'تذكرني (30 يوم)' : 'Remember me (30 days)'}
          </label>
        </div>

        {credentialsError && (
          <p className="text-sm text-feedback-error-600 dark:text-feedback-error-400 flex items-center gap-2">
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            {credentialsError}
          </p>
        )}

        <button
          onClick={handleCredentialsSubmit}
          disabled={loading || !credentials.email || !credentials.password}
          className="slms-btn-primary w-full"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isRTL ? 'جاري تسجيل الدخول...' : 'Signing in...'}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {isRTL ? 'تسجيل الدخول' : 'Sign In'}
              <ArrowRightIcon className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </div>
          )}
        </button>

        <div className="text-center">
          <button
            onClick={() => router.push(isAdminMode ? '/forgot-password' : `/forgot-password?tenant=${companyInfo?.company_code || companyCode}`)}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            disabled={loading}
          >
            {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderMfaStage = () => (
    <div className="space-y-6 slms-fade-in">
      <div className="text-center">
        <ShieldCheckIcon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          {isRTL ? 'التحقق الثنائي' : 'Two-Factor Authentication'}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          {isRTL ? 'أدخل الرمز المرسل إلى جهازك' : 'Enter the code sent to your device'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="mfaCode" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {isRTL ? 'رمز التحقق' : 'Verification Code'}
          </label>
          <input
            id="mfaCode"
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => handleKeyDown(e, handleMfaVerification)}
            placeholder="000000"
            className={`slms-input text-center tracking-widest ${mfaError ? 'error' : ''}`}
            maxLength={6}
            autoComplete="one-time-code"
            disabled={loading}
            dir="ltr"
          />
          {mfaError && (
            <p className="mt-2 text-sm text-feedback-error-600 dark:text-feedback-error-400 flex items-center gap-2">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              {mfaError}
            </p>
          )}
        </div>

        <button
          onClick={handleMfaVerification}
          disabled={loading || mfaCode.length !== 6}
          className="slms-btn-primary w-full"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isRTL ? 'جاري التحقق...' : 'Verifying...'}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {isRTL ? 'تحقق' : 'Verify'}
              <CheckCircleIcon className="w-4 h-4" />
            </div>
          )}
        </button>

        <div className="text-center">
          <button
            onClick={() => setCurrentStage('credentials')}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors flex items-center justify-center gap-2 mx-auto"
            disabled={loading}
          >
            <ArrowLeftIcon className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {isRTL ? 'العودة إلى تسجيل الدخول' : 'Back to login'}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <>
      <div className="slms-login-card">
        {renderStageIndicator()}
        
        {currentStage === 'company' && !isAdminMode && renderCompanyStage()}
        {currentStage === 'credentials' && renderCredentialsStage()}
        {currentStage === 'mfa' && renderMfaStage()}
      </div>

      {/* Contact Support Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setShowContactModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-6"
            dir={isRTL ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 end-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                <ExclamationCircleIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                {isRTL ? 'البريد الإلكتروني غير موجود' : 'Email Not Found'}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {isRTL
                  ? 'هذا البريد الإلكتروني غير موجود حالياً في بيانات المستخدمين. قد يكون تم تحديثه من قبل إدارة المنصة. يرجى التواصل معنا للحصول على معلومات تسجيل الدخول الجديدة.'
                  : 'This email does not currently exist in the system. It may have been updated by the platform administration. Please contact us to get your new login information.'}
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              {/* Email */}
              <a
                href="mailto:info@alhajco.com"
                className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {isRTL ? 'البريد الإلكتروني' : 'Email'}
                  </p>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 truncate" dir="ltr">
                    info@alhajco.com
                  </p>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/966533845104"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {isRTL ? 'واتساب' : 'WhatsApp'}
                  </p>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200" dir="ltr">
                    +966 533 845 104
                  </p>
                </div>
              </a>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}