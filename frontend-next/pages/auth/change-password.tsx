/**
 * Change Password Page
 * Mandatory when temp_password is set
 * Also accessible from user profile for voluntary password change
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { 
  LockClosedIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, changePassword, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
  }>({ score: 0, label: '', color: '' });

  const isMandatory = user?.must_change_password === true;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // Check password strength
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength({ score: 0, label: '', color: '' });
      return;
    }

    let score = 0;
    let label = '';
    let color = '';

    // Length check
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;

    // Character variety
    if (/[a-z]/.test(newPassword)) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;

    // Determine label and color
    if (score <= 2) {
      label = t('auth.changePassword.strength.weak');
      color = 'text-red-600 dark:text-red-400';
    } else if (score <= 4) {
      label = t('auth.changePassword.strength.medium');
      color = 'text-yellow-600 dark:text-yellow-400';
    } else {
      label = t('auth.changePassword.strength.strong');
      color = 'text-green-600 dark:text-green-400';
    }

    setPasswordStrength({ score, label, color });
  }, [newPassword]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = t('auth.changePassword.errors.currentRequired');
    }

    if (!newPassword) {
      newErrors.newPassword = t('auth.changePassword.errors.newRequired');
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t('auth.changePassword.errors.tooWeak');
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = t('auth.changePassword.errors.tooWeak');
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = t('auth.changePassword.errors.tooWeak');
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = t('auth.changePassword.errors.tooWeak');
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('auth.changePassword.errors.confirmRequired');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('auth.changePassword.errors.mismatch');
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.newPassword = t('auth.changePassword.errors.sameAsOld');
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
      await changePassword(currentPassword, newPassword, confirmPassword);
      // Success - context will handle logout and redirect
    } catch (error: any) {
      console.error('Change password error:', error);
      
      let errorMessage = t('auth.changePassword.errors.tooWeak');
      
      if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <>
      <Head>
        <title>{t('auth.changePassword.title')} - SLMS</title>
        <meta name="description" content="Change your password" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl mb-4 shadow-2xl shadow-orange-500/30">
              <ShieldCheckIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('auth.changePassword.title')}
            </h1>
            {isMandatory && (
              <p className="text-orange-600 dark:text-orange-400 mt-2 font-medium">
                ⚠️ {t('auth.changePassword.requiredNotice')}
              </p>
            )}
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            {/* Mandatory Notice */}
            {isMandatory && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>{t('auth.changePassword.requiredNotice')}</strong>
                </p>
              </div>
            )}

            {/* General Error */}
            {errors.general && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="currentPassword"
                name="currentPassword"
                label={t('auth.changePassword.currentPassword')}
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrors({});
                }}
                error={errors.currentPassword}
                disabled={loading}
                placeholder="••••••••"
              />

              <div>
                <Input
                  id="newPassword"
                  name="newPassword"
                  label={t('auth.changePassword.newPassword')}
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrors({});
                  }}
                  error={errors.newPassword}
                  disabled={loading}
                  placeholder="••••••••"
                />
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t('auth.changePassword.strength.label')}:
                      </span>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.score <= 2 
                            ? 'bg-red-500' 
                            : passwordStrength.score <= 4 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Password Requirements */}
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('auth.changePassword.requirements.title')}:</p>
                  <RequirementItem met={newPassword.length >= 8}>{t('auth.changePassword.requirements.minLength')}</RequirementItem>
                  <RequirementItem met={/[A-Z]/.test(newPassword)}>{t('auth.changePassword.requirements.uppercase')}</RequirementItem>
                  <RequirementItem met={/[a-z]/.test(newPassword)}>{t('auth.changePassword.requirements.lowercase')}</RequirementItem>
                  <RequirementItem met={/[0-9]/.test(newPassword)}>{t('auth.changePassword.requirements.number')}</RequirementItem>
                </div>
              </div>

              <Input
                id="confirmPassword"
                name="confirmPassword"
                label={t('auth.changePassword.confirmPassword')}
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors({});
                }}
                error={errors.confirmPassword}
                disabled={loading}
                placeholder="••••••••"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                <LockClosedIcon className="w-5 h-5 me-2" />
                {loading ? t('auth.changePassword.changing') : t('auth.changePassword.changeButton')}
              </Button>
            </form>
          </div>

          {/* Note */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.changePassword.subtitle')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper component for password requirements
function RequirementItem({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <CheckCircleIcon 
        className={`w-4 h-4 ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`} 
      />
      <span className={met ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}>
        {children}
      </span>
    </div>
  );
}
