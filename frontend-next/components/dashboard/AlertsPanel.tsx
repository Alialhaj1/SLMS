/**
 * ⚠️ AlertsPanel Component - Alerts & Risks Widget
 * ================================================
 * 
 * Displays:
 * - Active alerts with severity levels
 * - System health indicator
 * - Click-through to related resources
 * 
 * Features:
 * - Color-coded severity (critical, warning, info)
 * - Auto-refresh capability
 * - Bilingual messages (EN/AR)
 * - Dark mode support
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  XMarkIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useLocale } from '../../contexts/LocaleContext';
import type { AlertsData } from '../../lib/dashboardService';

interface AlertsPanelProps {
  data: AlertsData | null;
  loading?: boolean;
  onDismiss?: (alertId: string) => void;
}

// Severity configuration
const SEVERITY_CONFIG = {
  critical: {
    icon: ExclamationCircleIcon,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-700 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
    dotColor: 'bg-red-500',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    dotColor: 'bg-yellow-500',
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
    dotColor: 'bg-blue-500',
  },
};

// System health configuration
const HEALTH_CONFIG = {
  healthy: {
    icon: CheckCircleIcon,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-300',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  critical: {
    icon: ExclamationCircleIcon,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

// Resource type to route mapping
const RESOURCE_ROUTES: Record<string, string> = {
  shipment: '/shipments',
  payment: '/finance/vendor-payments',
  project: '/projects',
  purchase_order: '/purchasing/orders',
  letter_of_credit: '/finance/letters-of-credit',
  customs_declaration: '/customs/declarations',
};

// Alert Item Component
const AlertItem: React.FC<{
  alert: AlertsData['alerts'][0];
  onDismiss?: () => void;
  onClick?: () => void;
}> = ({ alert, onDismiss, onClick }) => {
  const { locale } = useLocale();
  const config = SEVERITY_CONFIG[alert.severity];
  const Icon = config.icon;

  const message = locale === 'ar' && alert.messageAr ? alert.messageAr : alert.message;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor} group transition-all hover:shadow-sm`}
    >
      {/* Severity Icon */}
      <div className={`flex-shrink-0 ${config.iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${config.textColor}`}>
          {message}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {new Date(alert.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onClick && (
          <button
            onClick={onClick}
            className={`p-1 rounded hover:bg-white dark:hover:bg-gray-700 ${config.textColor}`}
            title="View details"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        )}
        {onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className={`p-1 rounded hover:bg-white dark:hover:bg-gray-700 ${config.textColor}`}
            title="Dismiss"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// System Health Indicator
const SystemHealthIndicator: React.FC<{
  health: 'healthy' | 'warning' | 'critical';
}> = ({ health }) => {
  const { t } = useTranslation();
  const config = HEALTH_CONFIG[health];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${config.bgColor}`}>
      <Icon className={`w-4 h-4 ${config.iconColor}`} />
      <span className={`text-sm font-medium ${config.textColor}`}>
        {t(`dashboard.alerts.${health}`)}
      </span>
    </div>
  );
};

// Skeleton loader
const AlertsPanelSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
      ))}
    </div>
  </div>
);

const AlertsPanel: React.FC<AlertsPanelProps> = ({ data, loading = false, onDismiss }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  if (loading) {
    return <AlertsPanelSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { alerts, systemHealth } = data;

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  // Handle alert dismissal
  const handleDismiss = (alertId: string) => {
    setDismissedIds(prev => new Set([...prev, alertId]));
    onDismiss?.(alertId);
  };

  // Handle alert click - navigate to resource
  const handleAlertClick = (alert: AlertsData['alerts'][0]) => {
    const baseRoute = RESOURCE_ROUTES[alert.resourceType] || '/dashboard';
    router.push(`${baseRoute}/${alert.resourceId}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BellIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          {t('dashboard.alerts.title')}
          {visibleAlerts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-full">
              {visibleAlerts.length}
            </span>
          )}
        </h2>
        <SystemHealthIndicator health={systemHealth} />
      </div>

      {/* Alerts List */}
      {visibleAlerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">
            {t('dashboard.alerts.noAlerts')}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {/* Critical alerts first, then warning, then info */}
          {['critical', 'warning', 'info'].map(severity => {
            const severityAlerts = visibleAlerts.filter(a => a.severity === severity);
            return severityAlerts.map(alert => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onDismiss={() => handleDismiss(alert.id)}
                onClick={() => handleAlertClick(alert)}
              />
            ));
          })}
        </div>
      )}

      {/* View All Link */}
      {visibleAlerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => router.push('/notifications')}
            className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('dashboard.alerts.viewAll')}
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
