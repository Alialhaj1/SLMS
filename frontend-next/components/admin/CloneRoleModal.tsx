/**
 * Clone Role Modal Component
 * Phase 4B Feature 2: Allow admins to clone existing roles with all permissions
 */

import { useState } from 'react';
import Button from '../ui/Button';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';

interface CloneRoleModalProps {
  roleId: number;
  roleName: string;
  permissions: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CloneRoleModal({
  roleId,
  roleName,
  permissions,
  isOpen,
  onClose,
  onSuccess
}: CloneRoleModalProps) {
  const { showToast } = useToast();
  const [newRoleName, setNewRoleName] = useState(`${roleName} (Copy)`);
  const [description, setDescription] = useState(`Cloned from ${roleName}`);
  const [isCloning, setIsCloning] = useState(false);

  if (!isOpen) return null;

  const handleClone = async () => {
    if (!newRoleName.trim()) {
      showToast('Role name is required', 'error');
      return;
    }

    try {
      setIsCloning(true);
      await apiClient.post(`/api/roles/${roleId}/clone`, {
        name: newRoleName.trim(),
        description: description.trim() || undefined
      });

      showToast('Role cloned successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error cloning role:', error);
      const message = error.response?.data?.error || 'Failed to clone role';
      showToast(message, 'error');
    } finally {
      setIsCloning(false);
    }
  };

  const handleClose = () => {
    if (!isCloning) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Clone Role</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Source: <span className="font-medium">{roleName}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isCloning}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* New Role Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Role Name *
            </label>
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Enter role name..."
              disabled={isCloning}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter role description..."
              disabled={isCloning}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Permissions Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Permissions to be Copied
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="border dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-900 max-h-60 overflow-y-auto">
              {permissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {permissions.map((perm, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {perm}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  No permissions defined
                </p>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ℹ️ All permissions will be copied to the new role. You can edit them after creation.
            </p>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-300">Important Notes:</p>
                <ul className="list-disc list-inside mt-1 text-yellow-700 dark:text-yellow-400 space-y-1">
                  <li>Users are NOT copied (assign users manually for security)</li>
                  <li>This action will be logged in the audit trail</li>
                  <li>New role will inherit the same company scope</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 p-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleClone}
            disabled={isCloning || !newRoleName.trim()}
          >
            {isCloning ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Cloning...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Clone Role
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
