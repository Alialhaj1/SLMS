/**
 * UserStatusActions Component
 * Phase 4B Feature 3: Action buttons for user status management (Disable/Enable/Unlock)
 */

import { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import apiClient from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import DisableUserModal from './DisableUserModal';

interface UserStatusActionsProps {
  userId: number;
  username: string;
  email: string;
  status: 'active' | 'disabled' | 'locked';
  onStatusChange: () => void;
}

export default function UserStatusActions({
  userId,
  username,
  email,
  status,
  onStatusChange
}: UserStatusActionsProps) {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'disable' | 'enable' | 'unlock' | null>(null);

  // RBAC check
  const canManageStatus = hasPermission('users:manage_status');

  if (!canManageStatus) {
    return null; // Hide buttons if no permission
  }

  const handleDisable = async (userId: number, reason: string) => {
    setLoadingAction('disable');
    try {
      await apiClient.patch(`/api/users/${userId}/disable`, { reason });
      onStatusChange();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEnable = async () => {
    if (!confirm(`Are you sure you want to enable user "${username}"?\n\nThis will allow them to log in again.`)) {
      return;
    }

    setLoadingAction('enable');
    try {
      await apiClient.patch(`/api/users/${userId}/enable`);
      showToast('User enabled successfully', 'success');
      onStatusChange();
    } catch (error: any) {
      console.error('Error enabling user:', error);
      const message = error.response?.data?.error || 'Failed to enable user';
      showToast(message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUnlock = async () => {
    if (!confirm(`Are you sure you want to unlock user "${username}"?\n\nThis will reset failed login attempts and allow them to log in.`)) {
      return;
    }

    setLoadingAction('unlock');
    try {
      await apiClient.patch(`/api/users/${userId}/unlock`);
      showToast('User unlocked successfully', 'success');
      onStatusChange();
    } catch (error: any) {
      console.error('Error unlocking user:', error);
      const message = error.response?.data?.error || 'Failed to unlock user';
      showToast(message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Determine which buttons to show based on status
  const showDisable = status === 'active';
  const showEnable = status === 'disabled';
  const showUnlock = status === 'locked';

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Disable Button */}
        {showDisable && (
          <button
            onClick={() => setIsDisableModalOpen(true)}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Disable user account"
          >
            {loadingAction === 'disable' ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
            <span>Disable</span>
          </button>
        )}

        {/* Enable Button */}
        {showEnable && (
          <button
            onClick={handleEnable}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Enable user account"
          >
            {loadingAction === 'enable' ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>Enable</span>
          </button>
        )}

        {/* Unlock Button */}
        {showUnlock && (
          <button
            onClick={handleUnlock}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Unlock user account"
          >
            {loadingAction === 'unlock' ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            )}
            <span>Unlock</span>
          </button>
        )}
      </div>

      {/* Disable User Modal */}
      <DisableUserModal
        userId={userId}
        username={username}
        email={email}
        isOpen={isDisableModalOpen}
        onClose={() => setIsDisableModalOpen(false)}
        onSuccess={() => {}}
        onDisable={handleDisable}
      />
    </>
  );
}
