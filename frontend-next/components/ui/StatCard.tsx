import React from 'react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  MinusIcon 
} from '@heroicons/react/24/outline';

export type StatCardColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'orange';
export type TrendDirection = 'up' | 'down' | 'stable';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: StatCardColor;
  loading?: boolean;
  onClick?: () => void;
  trend?: TrendDirection;
  trendValue?: number;
  subtitle?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const colorClasses: Record<StatCardColor, {
  background: string;
  icon: string;
  text: string;
  border: string;
  hover: string;
}> = {
  blue: {
    background: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-900 dark:text-blue-100',
    border: 'border-blue-200 dark:border-blue-800',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
  },
  green: {
    background: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    text: 'text-green-900 dark:text-green-100',
    border: 'border-green-200 dark:border-green-800',
    hover: 'hover:bg-green-100 dark:hover:bg-green-900/30'
  },
  yellow: {
    background: 'bg-yellow-50 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
    text: 'text-yellow-900 dark:text-yellow-100',
    border: 'border-yellow-200 dark:border-yellow-800',
    hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
  },
  red: {
    background: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-900 dark:text-red-100',
    border: 'border-red-200 dark:border-red-800',
    hover: 'hover:bg-red-100 dark:hover:bg-red-900/30'
  },
  purple: {
    background: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    text: 'text-purple-900 dark:text-purple-100',
    border: 'border-purple-200 dark:border-purple-800',
    hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
  },
  indigo: {
    background: 'bg-indigo-50 dark:bg-indigo-900/20',
    icon: 'text-indigo-600 dark:text-indigo-400',
    text: 'text-indigo-900 dark:text-indigo-100',
    border: 'border-indigo-200 dark:border-indigo-800',
    hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
  },
  orange: {
    background: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
    text: 'text-orange-900 dark:text-orange-100',
    border: 'border-orange-200 dark:border-orange-800',
    hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30'
  }
};

const sizeClasses = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6'
};

const TrendIndicator = ({ trend, value }: { trend: TrendDirection; value?: number }) => {
  if (!value || trend === 'stable') {
    return (
      <div className="flex items-center text-gray-500 dark:text-gray-400">
        <MinusIcon className="h-4 w-4 mr-1" />
        <span className="text-xs">Stable</span>
      </div>
    );
  }

  const isPositive = trend === 'up';
  const colorClass = isPositive 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400';
  
  const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className={`flex items-center ${colorClass}`}>
      <Icon className="h-4 w-4 mr-1" />
      <span className="text-xs font-medium">
        {value.toFixed(1)}%
      </span>
    </div>
  );
};

const LoadingSkeleton = ({ size }: { size: StatCardProps['size'] }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${sizeClasses[size || 'md']}`}>
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
    </div>
  </div>
);

export default function StatCard({
  title,
  value,
  icon,
  color = 'blue',
  loading = false,
  onClick,
  trend,
  trendValue,
  subtitle,
  className = '',
  size = 'md'
}: StatCardProps) {
  if (loading) {
    return <LoadingSkeleton size={size} />;
  }

  const colors = colorClasses[color];
  const isClickable = !!onClick;
  
  const baseClasses = `
    bg-white dark:bg-gray-800 
    rounded-lg 
    border border-gray-200 dark:border-gray-700 
    shadow-sm
    transition-all duration-200
    ${sizeClasses[size]}
    ${className}
  `;

  const clickableClasses = isClickable 
    ? `cursor-pointer hover:shadow-md transform hover:-translate-y-0.5 ${colors.hover}`
    : '';

  const cardContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 line-clamp-2">
          {title}
        </h3>
        {icon && (
          <div className={`flex-shrink-0 ${colors.icon}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Main value */}
      <div className="mb-2">
        <div className={`text-2xl font-bold ${colors.text}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        {subtitle && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {subtitle}
          </div>
        )}
      </div>

      {/* Trend indicator */}
      {trend && (
        <div className="flex items-center justify-between">
          <TrendIndicator trend={trend} value={trendValue} />
        </div>
      )}

      {/* Click indicator */}
      {isClickable && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 bg-current rounded-full"></div>
        </div>
      )}
    </>
  );

  if (isClickable) {
    return (
      <div 
        className={`${baseClasses} ${clickableClasses} relative group`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {cardContent}
    </div>
  );
}

// Variant for more complex stat cards with multiple metrics
interface MultiStatCardProps {
  title: string;
  stats: Array<{
    label: string;
    value: string | number;
    trend?: TrendDirection;
    trendValue?: number;
    color?: StatCardColor;
  }>;
  icon?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

export function MultiStatCard({ 
  title, 
  stats, 
  icon, 
  onClick, 
  loading = false 
}: MultiStatCardProps) {
  if (loading) {
    return <LoadingSkeleton size="lg" />;
  }

  const isClickable = !!onClick;

  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 
        rounded-lg 
        border border-gray-200 dark:border-gray-700 
        shadow-sm 
        p-6
        transition-all duration-200
        ${isClickable ? 'cursor-pointer hover:shadow-md transform hover:-translate-y-0.5' : ''}
      `}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {icon && (
          <div className="text-gray-600 dark:text-gray-400">
            {icon}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
            </div>
            {stat.trend && (
              <TrendIndicator trend={stat.trend} value={stat.trendValue} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}