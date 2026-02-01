import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { useTranslation } from '../../hooks/useTranslation.enhanced';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string; // Optional subtitle below the value
  icon: React.ReactNode;
  change?: number; // Percentage change (positive or negative)
  changeLabel?: string;
  iconBgColor?: string; // Tailwind class for icon background
  iconColor?: string; // Tailwind class for icon color
  color?: string; // Alternative prop for backward compatibility
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  change,
  changeLabel,
  iconBgColor = 'bg-blue-100 dark:bg-blue-900',
  iconColor = 'text-blue-600 dark:text-blue-400',
  color,
  onClick,
}) => {
  const { formatNumber } = useTranslation();

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const hasChange = change !== undefined && change !== 0;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-400' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        {/* Icon */}
        <div className={`${iconBgColor} ${iconColor} rounded-lg p-3`}>
          {icon}
        </div>

        {/* Change Indicator */}
        {hasChange && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              isPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? (
              <ArrowUpIcon className="w-4 h-4" />
            ) : (
              <ArrowDownIcon className="w-4 h-4" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Change Label */}
      {changeLabel && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          {changeLabel}
        </p>
      )}
    </div>
  );
};

export default StatCard;
