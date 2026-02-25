/**
 * ============================================================================
 * ULTRA PREMIUM LOGIN EXPERIENCE
 * Enterprise Banking Grade Multi-Tenant Authentication
 * ============================================================================
 * Features:
 * - Animated gradient background with particles
 * - Glass morphism card design
 * - Platform vs Tenant login modes
 * - Company identification with logo/branding
 * - MFA support
 * - Session management
 * - Premium micro-interactions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../lib/authService';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  ArrowRightOnRectangleIcon, 
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  SunIcon,
  MoonIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  CheckCircleIcon,
  LockClosedIcon,
  UserIcon,
  KeyIcon,
  ArrowLeftIcon,
  SparklesIcon,
  FingerPrintIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import AccountRequestWizard from '../../components/AccountRequestWizard';

// ============================================================================
// Types
// ============================================================================

type LoginMode = 'platform' | 'tenant';
type LoginStep = 'mode' | 'company' | 'credentials' | 'mfa';

interface Tenant {
  id: number;
  tenant_code: string;
  name: string;
  name_ar: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

// ============================================================================
// Particle Background Component
// ============================================================================

function ParticleBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="login-particle bg-blue-400/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
    </div>
  );
}

// ============================================================================
// Mode Selector Component
// ============================================================================

interface ModeSelectorProps {
  mode: LoginMode;
  onChange: (mode: LoginMode) => void;
  isRTL: boolean;
}

function ModeSelector({ mode, onChange, isRTL }: ModeSelectorProps) {
  return (
    <div className="mode-toggle-premium">
      <button
        type="button"
        onClick={() => onChange('tenant')}
        className={`mode-toggle-btn ${mode === 'tenant' ? 'active' : ''}`}
      >
        <BuildingOffice2Icon className="w-5 h-5" />
        <span>{isRTL ? 'دخول العملاء' : 'Tenant Login'}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('platform')}
        className={`mode-toggle-btn ${mode === 'platform' ? 'active platform' : ''}`}
      >
        <ShieldCheckIcon className="w-5 h-5" />
        <span>{isRTL ? 'إدارة المنصة' : 'Platform Admin'}</span>
      </button>
    </div>
  );
}

// ============================================================================
// Step Indicator Component
// ============================================================================

interface StepIndicatorProps {
  currentStep: LoginStep;
  mode: LoginMode;
  isRTL: boolean;
}

function StepIndicator({ currentStep, mode, isRTL }: StepIndicatorProps) {
  const steps = mode === 'tenant' 
    ? ['company', 'credentials', 'mfa'] 
    : ['credentials', 'mfa'];
  
  const stepLabels = {
    company: isRTL ? 'الشركة' : 'Company',
    credentials: isRTL ? 'الدخول' : 'Login',
    mfa: isRTL ? 'التحقق' : 'Verify',
  };

  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
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
// Company Search Component
// ============================================================================

interface CompanySearchProps {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  tenantCode: string;
  onCodeChange: (code: string) => void;
  onSelect: (tenant: Tenant) => void;
  loading: boolean;
  isRTL: boolean;
}

function CompanySearch({ 
  tenants, 
  selectedTenant, 
  tenantCode, 
  onCodeChange, 
  onSelect,
  loading,
  isRTL 
}: CompanySearchProps) {
  const [showQRScanner, setShowQRScanner] = useState(false);

  return (
    <div className="space-y-6">
      {/* Company Code Input - PRIMARY METHOD */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          {isRTL ? 'رمز الشركة' : 'Company Code'}
        </label>
        <p className="text-xs text-white/40 mb-3">
          {isRTL ? 'أدخل رمز الشركة المقدم من مدير حسابك' : 'Enter the company code provided by your account administrator'}
        </p>
        <div className="relative">
          <BuildingOffice2Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={tenantCode}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            placeholder={isRTL ? 'مثال: ALHAJCO' : 'e.g. ALHAJCO'}
            className="login-input-premium pl-12 uppercase tracking-widest font-mono text-lg"
            style={{ letterSpacing: '0.2em' }}
            autoFocus
          />
        </div>
      </div>

      {/* Selected Company Display */}
      {selectedTenant && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-green-400 font-medium">
                {isRTL ? 'تم اختيار الشركة' : 'Company Selected'}
              </p>
              <p className="text-white font-semibold">
                {isRTL ? selectedTenant.name_ar || selectedTenant.name : selectedTenant.name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div 
          className="qr-scanner-overlay animate-fade-in"
          onClick={() => setShowQRScanner(false)}
        >
          <div className="text-center">
            <div className="w-64 h-64 border-2 border-dashed border-white/30 rounded-2xl flex items-center justify-center mb-4">
              <QrCodeIcon className="w-24 h-24 text-white/30" />
            </div>
            <p className="text-white/70">{isRTL ? 'امسح رمز QR للشركة' : 'Scan company QR code'}</p>
            <button
              onClick={() => setShowQRScanner(false)}
              className="mt-4 px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Credentials Form Component
// ============================================================================

interface CredentialsFormProps {
  email: string;
  password: string;
  rememberMe: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (value: boolean) => void;
  errors: Record<string, string>;
  mode: LoginMode;
  selectedTenant: Tenant | null;
  isRTL: boolean;
}

function CredentialsForm({
  email,
  password,
  rememberMe,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  errors,
  mode,
  selectedTenant,
  isRTL,
}: CredentialsFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-5">
      {/* Company Badge (for tenant mode) */}
      {mode === 'tenant' && selectedTenant && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-6">
          <div className="company-logo-premium w-12 h-12 text-lg">
            {selectedTenant.logo_url ? (
              <img src={selectedTenant.logo_url} alt={selectedTenant.name} className="w-8 h-8 object-contain" />
            ) : (
              selectedTenant.name.charAt(0)
            )}
          </div>
          <div>
            <p className="text-white font-medium">
              {isRTL ? selectedTenant.name_ar || selectedTenant.name : selectedTenant.name}
            </p>
            <p className="text-white/50 text-sm font-mono">{selectedTenant.tenant_code}</p>
          </div>
        </div>
      )}

      {/* Platform Admin Badge */}
      {mode === 'platform' && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <ShieldCheckIcon className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-purple-400 font-medium">
              {isRTL ? 'دخول مدير المنصة' : 'Platform Administrator'}
            </p>
            <p className="text-white/50 text-sm">
              {isRTL ? 'وصول كامل للمنصة' : 'Full platform access'}
            </p>
          </div>
        </div>
      )}

      {/* Email Input */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
        </label>
        <div className="relative">
          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
            className={`login-input-premium pl-12 ${errors.email ? 'border-red-500/50' : ''}`}
            autoComplete="email"
          />
        </div>
        {errors.email && (
          <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
            <ExclamationCircleIcon className="w-4 h-4" />
            {errors.email}
          </p>
        )}
      </div>

      {/* Password Input */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          {isRTL ? 'كلمة المرور' : 'Password'}
        </label>
        <div className="relative">
          <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
            className={`login-input-premium pl-12 pr-12 ${errors.password ? 'border-red-500/50' : ''}`}
            autoComplete="current-password"
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

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
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
            onChange={(e) => onRememberMeChange(e.target.checked)}
            className="sr-only"
          />
          <span className="text-sm text-white/70">{isRTL ? 'تذكرني' : 'Remember me'}</span>
        </label>
        
        <Link 
          href="/auth/forgot-password" 
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
        </Link>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 animate-fade-in">
          <p className="text-red-400 flex items-center gap-2">
            <ExclamationCircleIcon className="w-5 h-5" />
            {errors.general}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MFA Form Component
// ============================================================================

interface MFAFormProps {
  code: string;
  onCodeChange: (value: string) => void;
  error?: string;
  isRTL: boolean;
  useRecoveryCode: boolean;
  onToggleRecoveryCode: () => void;
  recoveryCode: string;
  onRecoveryCodeChange: (value: string) => void;
}

function MFAForm({ code, onCodeChange, error, isRTL, useRecoveryCode, onToggleRecoveryCode, recoveryCode, onRecoveryCodeChange }: MFAFormProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const codeDigits = Array.from({ length: 6 }, (_, i) => code[i] || '');

  const handleInput = (index: number, value: string) => {
    if (value.length > 1) value = value.charAt(0);
    if (!/^\d*$/.test(value)) return;

    const digits = [...codeDigits];
    digits[index] = value || '';
    const newCode = digits.join('').replace(/\s/g, '');
    onCodeChange(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      onCodeChange(pasted);
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* MFA Icon */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 mb-4">
          <FingerPrintIcon className="w-10 h-10 text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {isRTL ? 'التحقق بخطوتين' : 'Two-Factor Authentication'}
        </h3>
        <p className="text-white/60 text-sm">
          {useRecoveryCode
            ? (isRTL ? 'أدخل أحد رموز الاسترداد' : 'Enter one of your recovery codes')
            : (isRTL ? 'أدخل الرمز من تطبيق المصادقة' : 'Enter the code from your authenticator app')
          }
        </p>
      </div>

      {useRecoveryCode ? (
        /* Recovery Code Input */
        <div className="px-4">
          <input
            type="text"
            value={recoveryCode}
            onChange={(e) => onRecoveryCodeChange(e.target.value.toUpperCase())}
            placeholder={isRTL ? 'أدخل رمز الاسترداد' : 'Enter recovery code'}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg tracking-widest font-mono placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            autoFocus
          />
        </div>
      ) : (
        /* MFA Code Inputs */
        <div className="flex justify-center gap-3" dir="ltr" onPaste={handlePaste}>
          {Array.from({ length: 6 }).map((_, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={codeDigits[index] || ''}
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="mfa-input"
              autoFocus={index === 0}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}

      {/* Toggle between OTP and Recovery Code */}
      <div className="pt-4 border-t border-white/10">
        <div className="text-center">
          <button
            type="button"
            onClick={onToggleRecoveryCode}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {useRecoveryCode
              ? (isRTL ? 'استخدام رمز التحقق' : 'Use authenticator code')
              : (isRTL ? 'استخدام رمز الاسترداد' : 'Use a recovery code')
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Login Page Component
// ============================================================================

export default function LoginPage() {
  const router = useRouter();
  const { login, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  // State
  const [loginMode, setLoginMode] = useState<LoginMode>('tenant');
  const [currentStep, setCurrentStep] = useState<LoginStep>('mode');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantCode, setTenantCode] = useState('');
  const [loadingTenants, setLoadingTenants] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAccountRequest, setShowAccountRequest] = useState(false);

  // Fetch tenants on mount (with deduplication to prevent StrictMode double-call)
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchTenants();
  }, []);

  // Handle URL tenant parameter
  useEffect(() => {
    const { tenant } = router.query;
    if (tenant && typeof tenant === 'string') {
      setTenantCode(tenant.toUpperCase());
      setLoginMode('tenant');
      lookupTenant(tenant.toUpperCase());
    }
  }, [router.query]);

  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const res = await fetch('/api/tenants/public');
      if (res.ok) {
        const data = await res.json();
        setTenants(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoadingTenants(false);
    }
  };

  const lookupTenant = async (code: string) => {
    if (code.length < 4) {
      setSelectedTenant(null);
      return;
    }
    try {
      const res = await fetch(`/api/tenants/public/lookup/${code}`);
      if (res.ok) {
        const result = await res.json();
        setSelectedTenant(result.data);
      } else {
        setSelectedTenant(null);
      }
    } catch (error) {
      console.error('Error looking up tenant:', error);
      setSelectedTenant(null);
    }
  };

  const handleTenantCodeChange = (code: string) => {
    setTenantCode(code);
    lookupTenant(code);
  };

  const handleTenantSelect = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setTenantCode(tenant.tenant_code);
  };

  const handleModeChange = (mode: LoginMode) => {
    setLoginMode(mode);
    setCurrentStep(mode === 'tenant' ? 'company' : 'credentials');
    setErrors({});
  };

  const handleBack = () => {
    if (currentStep === 'credentials') {
      setCurrentStep(loginMode === 'tenant' ? 'company' : 'mode');
    } else if (currentStep === 'company') {
      setCurrentStep('mode');
    } else if (currentStep === 'mfa') {
      setCurrentStep('credentials');
      setRequiresMFA(false);
      setMfaToken('');
      setMfaSetupRequired(false);
      setUseRecoveryCode(false);
      setRecoveryCode('');
      setMfaCode('');
    }
  };

  const handleContinue = () => {
    if (currentStep === 'mode') {
      setCurrentStep(loginMode === 'tenant' ? 'company' : 'credentials');
    } else if (currentStep === 'company') {
      if (!selectedTenant) {
        setErrors({ tenant: isRTL ? 'يرجى اختيار شركة' : 'Please select a company' });
        return;
      }
      setCurrentStep('credentials');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = isRTL ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = isRTL ? 'بريد إلكتروني غير صالح' : 'Invalid email format';
    }

    if (!password) {
      newErrors.password = isRTL ? 'كلمة المرور مطلوبة' : 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== 'credentials' && currentStep !== 'mfa') {
      handleContinue();
      return;
    }

    if (currentStep === 'credentials' && !validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // MFA verification step
      if (currentStep === 'mfa' && mfaToken) {
        let mfaResult;
        if (useRecoveryCode) {
          mfaResult = await authService.verifyMFARecovery(mfaToken, recoveryCode.trim());
        } else {
          mfaResult = await authService.verifyMFA(mfaToken, mfaCode);
        }

        if (mfaResult.success && mfaResult.data) {
          // Save tokens from MFA verification
          authService.saveTokens(mfaResult.data.accessToken, mfaResult.data.refreshToken);

          // Cache user from MFA response for immediate access
          if (mfaResult.data.user && typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(mfaResult.data.user));
          }

          // Notify AuthorizationContext (re-fetches /api/me)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth:login'));
          }

          // CRITICAL: Load user profile into AuthContext so usePermissions/useMenu work.
          // Without this, AuthContext.user stays null after MFA login, causing empty sidebar.
          try {
            await refreshUser();
          } catch (e) {
            console.warn('Failed to refresh user profile after MFA:', e);
          }

          const userName = mfaResult.data.user?.full_name || mfaResult.data.user?.email?.split('@')[0] || '';
          showToast(
            isRTL ? `مرحباً ${userName}` : `Welcome back, ${userName}!`,
            'success'
          );

          const loginCtx = mfaResult.data.login_context || 'platform';
          if (loginCtx === 'platform') {
            await router.replace('/admin/platform');
          } else {
            await router.replace('/tenant/dashboard');
          }
        }
        return;
      }

      // Normal credentials step
      const tenantId = loginMode === 'tenant' ? selectedTenant?.id : undefined;
      const result = await login(email, password, tenantId);

      // ---- MFA responses come back as normal return values (not thrown) ----
      if (result.mfa_code === 'MFA_REQUIRED') {
        setRequiresMFA(true);
        setMfaToken(result.mfa_token || '');
        setMfaSetupRequired(false);
        setCurrentStep('mfa');
        setLoading(false);
        return;
      }

      if (result.mfa_code === 'MFA_SETUP_REQUIRED' || result.mfa_setup_required) {
        // Store token for setup page
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('mfa_setup_token', result.mfa_token || '');
          sessionStorage.setItem('mfa_setup_email', email);
        }
        showToast(
          isRTL ? 'يجب إعداد التحقق بخطوتين قبل المتابعة' : 'You must set up two-factor authentication before continuing',
          'warning'
        );
        await router.push('/auth/mfa-setup');
        setLoading(false);
        return;
      }

      if (result.must_change_password) {
        router.replace(result.redirect_to || '/auth/change-password');
        return;
      }

      // Success
      const userName = result.user?.full_name || result.user?.email?.split('@')[0] || '';
      showToast(
        isRTL ? `مرحباً ${userName}` : `Welcome back, ${userName}!`,
        'success'
      );

      // Redirect based on login context (not user role)
      const loginCtx = result.login_context || (tenantId ? 'tenant' : 'platform');

      if (loginCtx === 'platform') {
        await router.replace('/admin/platform');
      } else {
        await router.replace('/tenant/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = isRTL ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials';

      // Extract error code for non-MFA errors (MFA is handled above via return values)
      const errCode = error?.code
        || error?.response?.data?.error?.code
        || error?.data?.error?.code
        || '';

      // Handle specific error codes
      if (errCode === 'TENANT_ACCESS_DENIED') {
        errorMessage = isRTL 
          ? 'ليس لديك صلاحية الوصول إلى هذه الشركة. يرجى التواصل مع مدير المنصة.'
          : 'You do not have access to this company. Contact your administrator.';
      } else if (errCode === 'TENANT_LOGIN_REQUIRED') {
        errorMessage = isRTL 
          ? 'يرجى اختيار شركة لتسجيل الدخول'
          : 'Please select a company to login';
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // For MFA step errors, show in the MFA form
      if (currentStep === 'mfa') {
        setErrors({ mfa: isRTL ? 'رمز التحقق غير صحيح' : 'Invalid verification code' });
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{isRTL ? 'تسجيل الدخول' : 'Login'} - SLMS</title>
        <meta name="description" content="Secure enterprise login to SLMS" />
      </Head>

      <div 
        className="min-h-screen login-gradient-bg flex items-center justify-center p-4 relative overflow-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Particle Background */}
        <ParticleBackground />

        {/* Top Controls */}
        <div className="fixed top-6 right-6 flex items-center gap-3 z-50">
          {/* Language Toggle */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-300"
            title={locale === 'en' ? 'العربية' : 'English'}
          >
            <GlobeAltIcon className="w-5 h-5 text-white" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-300"
          >
            {theme === 'dark' ? (
              <SunIcon className="w-5 h-5 text-yellow-400" />
            ) : (
              <MoonIcon className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-md relative z-10 animate-slide-up-fade" style={{ animationDuration: '0.6s' }}>
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <SparklesIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">SLMS</h1>
            <p className="text-white/60">
              {isRTL ? 'نظام إدارة اللوجستيات الذكية' : 'Smart Logistics Management System'}
            </p>
          </div>

          {/* Glass Card */}
          <div className="login-card-glass rounded-3xl p-8">
            {/* Mode Selection Step */}
            {currentStep === 'mode' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {isRTL ? 'مرحباً بك' : 'Welcome'}
                  </h2>
                  <p className="text-white/60">
                    {isRTL ? 'اختر طريقة الدخول' : 'Select your login method'}
                  </p>
                </div>

                <ModeSelector 
                  mode={loginMode} 
                  onChange={handleModeChange}
                  isRTL={isRTL}
                />

                <div className="space-y-3 pt-4">
                  {/* Tenant Login Option */}
                  <button
                    onClick={() => handleModeChange('tenant')}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
                      loginMode === 'tenant'
                        ? 'bg-blue-500/20 border-2 border-blue-500/50'
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <BuildingOffice2Icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {isRTL ? 'دخول العملاء' : 'Tenant Login'}
                      </p>
                      <p className="text-white/50 text-sm">
                        {isRTL ? 'للشركات والمؤسسات' : 'For companies and organizations'}
                      </p>
                    </div>
                    {loginMode === 'tenant' && (
                      <CheckCircleIcon className="w-6 h-6 text-blue-400" />
                    )}
                  </button>

                  {/* Platform Login Option */}
                  <button
                    onClick={() => handleModeChange('platform')}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
                      loginMode === 'platform'
                        ? 'bg-purple-500/20 border-2 border-purple-500/50'
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <ShieldCheckIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {isRTL ? 'إدارة المنصة' : 'Platform Admin'}
                      </p>
                      <p className="text-white/50 text-sm">
                        {isRTL ? 'للمشرفين والإداريين' : 'For supervisors and administrators'}
                      </p>
                    </div>
                    {loginMode === 'platform' && (
                      <CheckCircleIcon className="w-6 h-6 text-purple-400" />
                    )}
                  </button>
                </div>

                <button
                  onClick={handleContinue}
                  className="login-btn-premium w-full mt-6"
                >
                  {isRTL ? 'متابعة' : 'Continue'}
                  <ArrowRightOnRectangleIcon className="w-5 h-5 inline-block ml-2 rtl:mr-2 rtl:ml-0" />
                </button>
              </div>
            )}

            {/* Company Selection Step */}
            {currentStep === 'company' && (
              <div className="animate-fade-in">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" />
                  {isRTL ? 'رجوع' : 'Back'}
                </button>

                <StepIndicator 
                  currentStep={currentStep} 
                  mode={loginMode}
                  isRTL={isRTL}
                />

                <CompanySearch
                  tenants={tenants}
                  selectedTenant={selectedTenant}
                  tenantCode={tenantCode}
                  onCodeChange={handleTenantCodeChange}
                  onSelect={handleTenantSelect}
                  loading={loadingTenants}
                  isRTL={isRTL}
                />

                {errors.tenant && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <ExclamationCircleIcon className="w-4 h-4" />
                    {errors.tenant}
                  </p>
                )}

                <button
                  onClick={handleContinue}
                  disabled={!selectedTenant}
                  className="login-btn-premium w-full mt-6"
                >
                  {isRTL ? 'متابعة' : 'Continue'}
                </button>
              </div>
            )}

            {/* Credentials Step */}
            {currentStep === 'credentials' && (
              <div className="animate-fade-in">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" />
                  {isRTL ? 'رجوع' : 'Back'}
                </button>

                <StepIndicator 
                  currentStep={currentStep} 
                  mode={loginMode}
                  isRTL={isRTL}
                />

                <form onSubmit={handleSubmit}>
                  <CredentialsForm
                    email={email}
                    password={password}
                    rememberMe={rememberMe}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onRememberMeChange={setRememberMe}
                    errors={errors}
                    mode={loginMode}
                    selectedTenant={selectedTenant}
                    isRTL={isRTL}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="login-btn-premium w-full mt-6 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {isRTL ? 'جاري الدخول...' : 'Signing in...'}
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="w-5 h-5" />
                        {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* MFA Step */}
            {currentStep === 'mfa' && (
              <div className="animate-fade-in">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" />
                  {isRTL ? 'رجوع' : 'Back'}
                </button>

                <StepIndicator 
                  currentStep={currentStep} 
                  mode={loginMode}
                  isRTL={isRTL}
                />

                <form onSubmit={handleSubmit}>
                  <MFAForm
                    code={mfaCode}
                    onCodeChange={setMfaCode}
                    error={errors.mfa}
                    isRTL={isRTL}
                    useRecoveryCode={useRecoveryCode}
                    onToggleRecoveryCode={() => {
                      setUseRecoveryCode(!useRecoveryCode);
                      setMfaCode('');
                      setRecoveryCode('');
                      setErrors({});
                    }}
                    recoveryCode={recoveryCode}
                    onRecoveryCodeChange={setRecoveryCode}
                  />

                  <button
                    type="submit"
                    disabled={loading || (useRecoveryCode ? recoveryCode.length < 8 : mfaCode.length !== 6)}
                    className="login-btn-premium w-full mt-6"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {isRTL ? 'جاري التحقق...' : 'Verifying...'}
                      </span>
                    ) : (
                      isRTL ? 'تأكيد' : 'Verify'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Request Account CTA */}
          <div className="text-center mt-6">
            <button
              onClick={() => setShowAccountRequest(true)}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <span className="text-sm">
                {isRTL ? 'ليس لديك حساب؟' : "Don't have an account?"}
              </span>
              <span className="text-sm font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                {isRTL ? 'اطلب إنشاء حساب' : 'Request one'}
              </span>
            </button>
          </div>

          {/* Security Badge */}
          <div className="text-center mt-4">
            <div className="security-badge inline-flex">
              <LockClosedIcon className="w-4 h-4" />
              <span>{isRTL ? 'اتصال آمن ومشفر' : 'Secure encrypted connection'}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-4">
            <p className="text-white/40 text-sm">
              © 2026 SLMS. {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
            </p>
          </div>
        </div>
      </div>

      {/* Account Request Wizard */}
      <AccountRequestWizard
        isOpen={showAccountRequest}
        onClose={() => setShowAccountRequest(false)}
        isRTL={isRTL}
      />

      {/* Custom Keyframe Animation Style */}
      <style jsx>{`
        @keyframes slide-up-fade {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up-fade {
          animation: slide-up-fade 0.6s ease-out forwards;
        }
      `}</style>
    </>
  );
}
