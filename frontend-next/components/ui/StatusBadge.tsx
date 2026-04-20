import React from 'react';
import clsx from 'clsx';

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'active'
  | 'inactive'
  | 'draft'
  | 'approved'
  | 'rejected';

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const variantClasses: Record<StatusVariant, string> = {
  success: 'slms-badge-success',
  warning: 'slms-badge-warning', 
  error: 'slms-badge-error',
  info: 'slms-badge-info',
  pending: 'slms-badge-warning',
  active: 'slms-badge-success',
  inactive: 'slms-badge-neutral',
  draft: 'slms-badge-neutral',
  approved: 'slms-badge-success',
  rejected: 'slms-badge-error',
};

const dotClasses: Record<StatusVariant, string> = {
  success: 'bg-feedback-success-500',
  warning: 'bg-feedback-warning-500',
  error: 'bg-feedback-error-500',
  info: 'bg-primary-600',
  pending: 'bg-feedback-warning-500',
  active: 'bg-feedback-success-500',
  inactive: 'bg-neutral-500',
  draft: 'bg-neutral-500',
  approved: 'bg-feedback-success-500',
  rejected: 'bg-feedback-error-500',
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  label,
  size = 'md',
  dot = false,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size]
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            dotClasses[variant]
          )}
        />
      )}
      {label}
    </span>
  );
};
