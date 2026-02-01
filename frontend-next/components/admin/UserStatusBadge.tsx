/**
 * UserStatusBadge Component
 * Phase 4B Feature 3: Display user account status with live countdown for locked accounts
 */

import { useState, useEffect } from 'react';

interface UserStatusBadgeProps {
  status: 'active' | 'disabled' | 'locked';
  lockedUntil?: string | null;
  className?: string;
}

export default function UserStatusBadge({ status, lockedUntil, className = '' }: UserStatusBadgeProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (status === 'locked' && lockedUntil) {
      const updateCountdown = () => {
        const now = new Date();
        const lockExpiry = new Date(lockedUntil);
        const diffMs = lockExpiry.getTime() - now.getTime();

        if (diffMs <= 0) {
          // Lock expired - trigger soft reload
          setTimeRemaining('Expired');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }

        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };

      // Initial update
      updateCountdown();

      // Update every second
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    }
  }, [status, lockedUntil]);

  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-green-100 dark:bg-green-900',
          text: 'text-green-800 dark:text-green-200',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Active'
        };
      case 'disabled':
        return {
          bg: 'bg-red-100 dark:bg-red-900',
          text: 'text-red-800 dark:text-red-200',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Disabled'
        };
      case 'locked':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          ),
          label: timeRemaining ? `Locked (${timeRemaining})` : 'Locked'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-800 dark:text-gray-200',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
      title={`Account status: ${status}${lockedUntil ? ` until ${new Date(lockedUntil).toLocaleString()}` : ''}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
