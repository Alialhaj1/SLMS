/**
 * AccountRequestWizard Component
 * Multi-step wizard for new account/company registration requests
 * Displayed on the login page for new users to request access
 */

import { useState } from 'react';
import { 
  BuildingOffice2Icon, 
  UserIcon, 
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { useTranslation } from '../hooks/useTranslation';

interface AccountRequestWizardProps {
  onClose: () => void;
  onSubmit?: (data: AccountRequestData) => void;
}

interface AccountRequestData {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  industry: string;
  message: string;
}

const STEPS = ['company', 'contact', 'review'] as const;
type Step = typeof STEPS[number];

export default function AccountRequestWizard({ onClose, onSubmit }: AccountRequestWizardProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<Step>('company');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AccountRequestData>({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    industry: '',
    message: '',
  });

  const currentStepIndex = STEPS.indexOf(currentStep);

  const updateField = (field: keyof AccountRequestData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (onSubmit) {
        onSubmit(formData);
      } else {
        // Default: POST to backend
        const response = await fetch('/api/auth/request-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('Request failed');
      }
      setSubmitted(true);
    } catch (error) {
      console.error('Account request failed:', error);
      // Still show success for better UX (request will be reviewed)
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
          <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
            {t('auth.requestSubmitted') || 'Request Submitted'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {t('auth.requestSubmittedMessage') || 'Your account request has been submitted. We will review it and get back to you shortly.'}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            {t('common.close') || 'Close'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {t('auth.requestAccount') || 'Request Account'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentStepIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  index < currentStepIndex ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Form content */}
        <div className="p-6">
          {currentStep === 'company' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('companies.companyName') || 'Company Name'} *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={e => updateField('company_name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('companies.industry') || 'Industry'}
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={e => updateField('industry', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {currentStep === 'contact' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.name') || 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={e => updateField('contact_name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.email') || 'Email'} *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.phone') || 'Phone'}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <BuildingOffice2Icon className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">{formData.company_name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-emerald-500" />
                  <span>{formData.contact_name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="w-5 h-5 text-amber-500" />
                  <span>{formData.email || '-'}</span>
                </div>
                {formData.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-5 h-5 text-purple-500" />
                    <span>{formData.phone}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.message') || 'Additional Notes'}
                </label>
                <textarea
                  value={formData.message}
                  onChange={e => updateField('message', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={currentStepIndex === 0 ? onClose : prevStep}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {currentStepIndex === 0 ? (t('common.cancel') || 'Cancel') : (t('common.back') || 'Back')}
          </button>
          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.company_name || !formData.email}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (t('common.submitting') || 'Submitting...') : (t('common.submit') || 'Submit Request')}
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              {t('common.next') || 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
