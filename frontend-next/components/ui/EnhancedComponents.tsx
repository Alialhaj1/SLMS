/**
 * 🎨 Enhanced Master Data Page Template
 * قالب صفحة البيانات الأساسية المحسّن
 * 
 * هذا القالب يوفر:
 * ✅ تحسينات بصرية متقدمة
 * ✅ حالات تحميل محسّنة
 * ✅ شارات حالة متقدمة
 * ✅ تأثيرات تفاعلية
 * ✅ دعم الوضع الليلي/النهاري الكامل
 * ✅ استجابة كاملة للهواتف الذكية
 */

import { ReactNode, useState } from 'react';
import { enhancementConfig, formatNumber, formatCurrency, formatPercentage, formatDate } from '../../utils/enhancementConfig';

// ═══════════════════════════════════════════════════════════
// 🎭 Enhanced Status Badge Component
// ═══════════════════════════════════════════════════════════
export const EnhancedStatusBadge = ({
  isActive,
  isPending = false,
  isApproved = false,
  isRejected = false,
}: {
  isActive?: boolean;
  isPending?: boolean;
  isApproved?: boolean;
  isRejected?: boolean;
}) => {
  let badge = enhancementConfig.statusBadges.inactive;
  
  if (isRejected) {
    badge = enhancementConfig.statusBadges.rejected;
  } else if (isApproved) {
    badge = enhancementConfig.statusBadges.approved;
  } else if (isPending) {
    badge = enhancementConfig.statusBadges.pending;
  } else if (isActive) {
    badge = enhancementConfig.statusBadges.active;
  }

  return (
    <span className={`${badge.className} inline-flex items-center gap-1.5`}>
      <span className="text-sm">{badge.icon}</span>
      <span className="text-xs font-semibold">{badge.label}</span>
    </span>
  );
};

// ═══════════════════════════════════════════════════════════
// 💫 Enhanced Color Indicator Component
// ═══════════════════════════════════════════════════════════
export const ColorIndicator = ({
  color,
  size = 'w-6 h-6',
  label,
}: {
  color: string;
  size?: string;
  label?: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${size} rounded-md border-2 border-gray-300 dark:border-gray-600 shadow-sm transition-transform hover:scale-110`}
        style={{ backgroundColor: color }}
        title={label || color}
      />
      {label && <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// 📊 Enhanced Data Cell Component
// ═══════════════════════════════════════════════════════════
export const DataCell = ({
  value,
  type = 'text',
  format = 'default',
  icon,
  color = 'text-gray-900 dark:text-gray-100',
}: {
  value: any;
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'date';
  format?: 'default' | 'code' | 'badge' | 'highlight';
  icon?: ReactNode;
  color?: string;
}) => {
  let formattedValue = value;

  if (!value && value !== 0) {
    return <span className="text-gray-400 dark:text-gray-600">-</span>;
  }

  // Format based on type
  switch (type) {
    case 'number':
      formattedValue = formatNumber(value);
      break;
    case 'currency':
      formattedValue = formatCurrency(value);
      break;
    case 'percentage':
      formattedValue = formatPercentage(value);
      break;
    case 'date':
      formattedValue = formatDate(value);
      break;
    default:
      formattedValue = value;
  }

  // Apply formatting class
  let className = color;
  if (format === 'code') {
    className = 'font-mono text-sm text-blue-600 dark:text-blue-400';
  } else if (format === 'badge') {
    className = `${enhancementConfig.dataVisualization.colorCode.primary} px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5`;
  } else if (format === 'highlight') {
    className = 'font-semibold text-blue-600 dark:text-blue-400';
  }

  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
      <span className={className}>{formattedValue}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// 🎪 Skeleton Loader Component
// ═══════════════════════════════════════════════════════════
export const SkeletonLoader = ({
  count = 5,
  height = 'h-12',
}: {
  count?: number;
  height?: string;
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} ${enhancementConfig.loadingStates.skeleton} rounded-lg`}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// 📢 Enhanced Info Banner Component
// ═══════════════════════════════════════════════════════════
export const InfoBanner = ({
  type = 'info',
  message,
  dismissible = false,
}: {
  type?: 'info' | 'warning' | 'success' | 'error';
  message: string;
  dismissible?: boolean;
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const styles = {
    info: 'bg-blue-50 border-l-4 border-blue-500 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
    warning: 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    success: 'bg-green-50 border-l-4 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    error: 'bg-red-50 border-l-4 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200',
  };

  return (
    <div className={`${styles[type]} p-4 rounded-r-lg flex items-start justify-between gap-3 mb-4`}>
      <p className="text-sm font-medium">{message}</p>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="text-xl leading-none opacity-70 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// 🏷️ Badge List Component
// ═══════════════════════════════════════════════════════════
export const BadgeList = ({
  items,
  type = 'primary',
}: {
  items: Array<{ label: string; icon?: ReactNode }>;
  type?: 'primary' | 'success' | 'warning' | 'danger';
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`${enhancementConfig.dataVisualization.badge[type]} inline-flex items-center gap-1`}>
          {item.icon && <span>{item.icon}</span>}
          {item.label}
        </span>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// 📊 Statistics Card Component
// ═══════════════════════════════════════════════════════════
export const StatCard = ({
  label,
  value,
  icon,
  color = 'blue',
  trend,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border-2 ${colorClasses[color]} transition-all hover:shadow-lg ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl opacity-50">{icon}</span>
        {trend && (
          <span
            className={`text-xs font-bold ${
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};

export default {
  EnhancedStatusBadge,
  ColorIndicator,
  DataCell,
  SkeletonLoader,
  InfoBanner,
  BadgeList,
  StatCard,
};
