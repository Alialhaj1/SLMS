import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className,
  padding = true,
  hoverable = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={clsx(
        'slms-card',
        padding && 'p-6',
        hoverable && 'slms-hover-card cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  loading = false,
  onClick,
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
    green: 'bg-accent-green-50 dark:bg-accent-green-900/20 text-accent-green-600 dark:text-accent-green-400',
    yellow: 'bg-accent-gold-50 dark:bg-accent-gold-900/20 text-accent-gold-600 dark:text-accent-gold-400',
    red: 'bg-feedback-error-50 dark:bg-feedback-error-900/20 text-feedback-error-600 dark:text-feedback-error-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };

  if (loading) {
    return (
      <Card hoverable={!!onClick} onClick={onClick}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card hoverable={!!onClick} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {trend && (
            <p
              className={clsx(
                'text-sm font-medium mt-2',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', colorClasses[color])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
