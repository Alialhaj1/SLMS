import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import { 
  ShieldExclamationIcon, 
  EnvelopeIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

export default function HelpPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    type: (router.query.type as string) || 'access_request',
    subject: (router.query.subject as string) || '',
    message: '',
    requested_permission: (router.query.permission as string) || '',
    requested_page: (router.query.page as string) || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/help-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to submit request');
      }

      setSubmitted(true);
      showToast('Your request has been submitted successfully!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <MainLayout>
        <Head>
          <title>Request Submitted - SLMS</title>
        </Head>

        <div className="max-w-2xl mx-auto py-12">
          <Card>
            <div className="text-center py-12">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Request Submitted!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your request has been sent to the system administrators.
                You will be notified once it is reviewed.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.push('/dashboard')} variant="primary">
                  Go to Dashboard
                </Button>
                <Button onClick={() => router.back()} variant="secondary">
                  Go Back
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Help & Support - SLMS</title>
      </Head>

      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Help & Support
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Need access to a page or feature? Submit a request to the administrators.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Request Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="access_request">Access Request</option>
                <option value="permission_request">Permission Request</option>
                <option value="general_support">General Support</option>
              </select>
            </div>

            {/* Subject */}
            <Input
              label="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              error={errors.subject}
              required
              placeholder="Brief description of your request"
            />

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Please explain why you need this access or permission..."
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.message}</p>
              )}
            </div>

            {/* Additional Info */}
            {formData.type !== 'general_support' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Requested Permission"
                  value={formData.requested_permission}
                  onChange={(e) => setFormData({ ...formData, requested_permission: e.target.value })}
                  placeholder="e.g., dashboard:view"
                />
                <Input
                  label="Page URL"
                  value={formData.requested_page}
                  onChange={(e) => setFormData({ ...formData, requested_page: e.target.value })}
                  placeholder="e.g., /dashboard"
                />
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex">
                <ShieldExclamationIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Your request will be reviewed by:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>System Administrators</li>
                    <li>Super Admins</li>
                  </ul>
                  <p className="mt-2">
                    You will receive a notification once your request is processed.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={submitting}
              >
                <EnvelopeIcon className="w-5 h-5 mr-2" />
                Submit Request
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}
