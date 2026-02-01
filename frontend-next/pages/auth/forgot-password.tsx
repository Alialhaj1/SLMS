/**
 * Forgot Password Page
 * Allows users to request password reset
 * Admin-controlled password reset system
 */

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from '../../hooks/useTranslation';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { 
  ArrowLeftIcon, 
  ShieldExclamationIcon,
  UserGroupIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('auth.forgotPassword.errors.emailRequired'));
      return;
    }

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('auth.forgotPassword.errors.emailInvalid'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:4000/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(),
          reason: reason.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        showToast(t('auth.forgotPassword.success.requestSent'), 'success');
      } else if (response.status === 404) {
        // Email not found in system
        setError(t('auth.forgotPassword.errors.emailNotFound'));
      } else {
        setError(data.error?.message || t('auth.forgotPassword.errors.requestFailed'));
      }
    } catch (err) {
      console.error('Password reset request failed:', err);
      setError(t('auth.forgotPassword.errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('auth.forgotPassword.title')} - SLMS</title>
        <meta name="description" content="Password recovery" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mb-4 shadow-2xl shadow-indigo-500/30">
              <ShieldExclamationIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('auth.forgotPassword.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('auth.forgotPassword.subtitle')}
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            
            {submitted ? (
              /* Success State */
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
                  <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {t('auth.forgotPassword.success.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {t('auth.forgotPassword.success.description')}
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {t('auth.forgotPassword.success.nextSteps')}
                  </p>
                </div>
                <Link href="/auth/login">
                  <Button variant="primary" size="lg">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    {t('auth.forgotPassword.backToLogin')}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Security Notice */}
                <div className="mb-8 p-5 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <ShieldExclamationIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        🔒 {t('auth.forgotPassword.adminControlled')}
                      </h3>
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        {t('auth.forgotPassword.description')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Request Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      {t('auth.forgotPassword.requestForm.title')}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      {t('auth.forgotPassword.requestForm.description')}
                    </p>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('auth.forgotPassword.requestForm.emailLabel')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.forgotPassword.requestForm.emailPlaceholder')}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Reason Input (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('auth.forgotPassword.requestForm.reasonLabel')} <span className="text-gray-400">({t('common.optional')})</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('auth.forgotPassword.requestForm.reasonPlaceholder')}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      disabled={loading}
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {t('auth.forgotPassword.requestForm.submitting')}
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                        {t('auth.forgotPassword.requestForm.submitButton')}
                      </>
                    )}
                  </Button>
                </form>

                {/* How It Works */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('auth.forgotPassword.instructions.title')}
                  </h3>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {step}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">
                          {t(`auth.forgotPassword.instructions.step${step}`)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-3 mb-3">
                    <UserGroupIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('auth.forgotPassword.contactInfo.title')}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t('auth.forgotPassword.contactInfo.description')}
                  </p>
                </div>

                {/* Back to Login */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Link href="/auth/login">
                    <Button
                      variant="secondary"
                      size="lg"
                      fullWidth
                    >
                      <ArrowLeftIcon className="w-5 h-5 me-2" />
                      {t('auth.forgotPassword.backToLogin')}
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
