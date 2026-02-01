/**
 * DisableUserModal Component
 * Phase 4B Feature 3: Modal for disabling users with mandatory reason
 */

import { useState } from 'react';
import Button from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface DisableUserModalProps {
  userId: number;
  username: string;
  email: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDisable: (userId: number, reason: string) => Promise<void>;
}

export default function DisableUserModal({
  userId,
  username,
  email,
  isOpen,
  onClose,
  onSuccess,
  onDisable
}: DisableUserModalProps) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MIN_REASON_LENGTH = 10;

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (reason.trim().length < MIN_REASON_LENGTH) {
      showToast(`Reason must be at least ${MIN_REASON_LENGTH} characters`, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await onDisable(userId, reason.trim());
      showToast('User disabled successfully', 'success');
      setReason('');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error disabling user:', error);
      const message = error.response?.data?.error || 'Failed to disable user';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      onClose();
    }
  };

  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Disable User Account</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This action requires a reason</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* User Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">User to be disabled:</p>
            <p className="font-medium text-gray-900 dark:text-white">{username}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{email}</p>
          </div>

          {/* Warning */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-red-800 dark:text-red-300">
                <p className="font-medium">Warning: This will prevent the user from logging in</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>User will be immediately logged out</li>
                  <li>All active sessions will be terminated</li>
                  <li>User cannot log in until re-enabled</li>
                  <li>Action will be logged in audit trail</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Disabling * 
              <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                (min {MIN_REASON_LENGTH} characters)
              </span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Policy violation, security concern, temporary suspension..."
              disabled={isSubmitting}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {reason.trim().length} / {MIN_REASON_LENGTH} characters
              </p>
              {reason.trim().length > 0 && reason.trim().length < MIN_REASON_LENGTH && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {MIN_REASON_LENGTH - reason.trim().length} more needed
                </p>
              )}
              {isReasonValid && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Valid
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 p-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !isReasonValid}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Disabling...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Disable User
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
