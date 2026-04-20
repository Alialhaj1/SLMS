import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import {
  BellAlertIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

interface SmartAlertsProps {
  alerts: Alert[];
  loading: boolean;
}

const AlertIcon = ({ type }: { type: Alert['type'] }) => {
  const iconClass = "h-5 w-5";
  
  switch (type) {
    case 'info':
      return <InformationCircleIcon className={`${iconClass} text-blue-500`} />;
    case 'warning':
      return <ExclamationTriangleIcon className={`${iconClass} text-yellow-500`} />;
    case 'error':
      return <XCircleIcon className={`${iconClass} text-red-500`} />;
    case 'success':
      return <CheckCircleIcon className={`${iconClass} text-green-500`} />;
    default:
      return <BellAlertIcon className={`${iconClass} text-gray-500`} />;
  }
};

const getAlertStyles = (type: Alert['type']) => {
  switch (type) {
    case 'info':
      return {
        container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
        title: 'text-blue-900 dark:text-blue-100',
        message: 'text-blue-700 dark:text-blue-200',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
        buttonSecondary: 'text-blue-600 hover:text-blue-700 dark:text-blue-400'
      };
    case 'warning':
      return {
        container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
        title: 'text-yellow-900 dark:text-yellow-100',
        message: 'text-yellow-700 dark:text-yellow-200',
        button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        buttonSecondary: 'text-yellow-600 hover:text-yellow-700 dark:text-yellow-400'
      };
    case 'error':
      return {
        container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        title: 'text-red-900 dark:text-red-100',
        message: 'text-red-700 dark:text-red-200',
        button: 'bg-red-600 hover:bg-red-700 text-white',
        buttonSecondary: 'text-red-600 hover:text-red-700 dark:text-red-400'
      };
    case 'success':
      return {
        container: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        title: 'text-green-900 dark:text-green-100',
        message: 'text-green-700 dark:text-green-200',
        button: 'bg-green-600 hover:bg-green-700 text-white',
        buttonSecondary: 'text-green-600 hover:text-green-700 dark:text-green-400'
      };
    default:
      return {
        container: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        title: 'text-gray-900 dark:text-gray-100',
        message: 'text-gray-700 dark:text-gray-200',
        button: 'bg-gray-600 hover:bg-gray-700 text-white',
        buttonSecondary: 'text-gray-600 hover:text-gray-700 dark:text-gray-400'
      };
  }
};

export default function SmartAlerts({ alerts, loading }: SmartAlertsProps) {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Load dismissed alerts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedAlerts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDismissedAlerts(new Set(parsed));
      } catch (error) {
        console.error('Error parsing dismissed alerts:', error);
      }
    }
  }, []);

  const handleDismiss = (alertId: string) => {
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(alertId);
    setDismissedAlerts(newDismissed);
    
    // Save to localStorage
    localStorage.setItem('dismissedAlerts', JSON.stringify(Array.from(newDismissed)));
  };

  const handleAction = (url: string) => {
    window.location.href = url;
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (isRTL) {
      if (diffInMinutes < 60) {
        return `منذ ${diffInMinutes} دقيقة`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `منذ ${hours} ساعة`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `منذ ${days} يوم`;
      }
    } else {
      if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours}h ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days}d ago`;
      }
    }
  };

  // Filter out dismissed alerts and sort by priority
  const visibleAlerts = alerts
    .filter(alert => !dismissedAlerts.has(alert.id))
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-20 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
          <div className="text-green-900 dark:text-green-100 font-medium">
            {isRTL ? 'لا توجد تنبيهات جديدة' : 'No active alerts'}
          </div>
        </div>
        <p className="text-green-700 dark:text-green-200 text-sm mt-1">
          {isRTL 
            ? 'جميع عملياتك تسير بسلاسة'
            : 'All your operations are running smoothly'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <BellAlertIcon className="h-5 w-5 mr-2" />
          {isRTL ? 'التنبيهات الذكية' : 'Smart Alerts'}
          {visibleAlerts.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {visibleAlerts.length}
            </span>
          )}
        </h2>
      </div>

      <div className="space-y-3">
        {visibleAlerts.slice(0, 5).map((alert) => {
          const styles = getAlertStyles(alert.type);
          
          return (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 relative ${styles.container}`}
            >
              <button
                onClick={() => handleDismiss(alert.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="flex-shrink-0">
                  <AlertIcon type={alert.type} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${styles.title}`}>
                      {alert.title}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(alert.timestamp)}
                    </span>
                  </div>
                  
                  <p className={`text-sm mt-1 ${styles.message}`}>
                    {alert.message}
                  </p>
                  
                  {alert.actionUrl && alert.actionLabel && (
                    <div className="mt-3 flex space-x-2 rtl:space-x-reverse">
                      <button
                        onClick={() => handleAction(alert.actionUrl!)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${styles.button}`}
                      >
                        {alert.actionLabel}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more alerts indicator */}
      {visibleAlerts.length > 5 && (
        <div className="text-center">
          <button
            onClick={() => window.location.href = '/alerts'}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {isRTL 
              ? `عرض جميع التنبيهات (${visibleAlerts.length})`
              : `View all alerts (${visibleAlerts.length})`
            }
          </button>
        </div>
      )}
    </div>
  );
}

// Sample data for development/testing
export const sampleAlerts: Alert[] = [
  {
    id: '1',
    type: 'info',
    title: 'شحنة ستصل قريباً',
    message: 'الشحنة رقم SH-2024-001 ستصل خلال 48 ساعة إلى مطار الملك فهد الدولي',
    actionUrl: '/shipments/SH-2024-001',
    actionLabel: 'عرض التفاصيل',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    priority: 'medium'
  },
  {
    id: '2',
    type: 'error',
    title: 'شحنة متأخرة',
    message: 'الشحنة رقم SH-2024-002 متأخرة أكثر من 3 أيام عن الموعد المحدد',
    actionUrl: '/shipments/SH-2024-002',
    actionLabel: 'اتخاذ إجراء',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    priority: 'high'
  },
  {
    id: '3',
    type: 'warning',
    title: 'رسوم جمركية مستحقة',
    message: 'يجب دفع رسوم جمركية بقيمة 1,250 ريال للشحنة SH-2024-003',
    actionUrl: '/customs/payments',
    actionLabel: 'دفع الرسوم',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    priority: 'high'
  },
  {
    id: '4',
    type: 'warning',
    title: 'اعتماد دفعة مطلوب',
    message: 'أمر الشراء PO-2024-015 بحاجة لموافقة المدير العام قبل المعالجة',
    actionUrl: '/purchase-orders/PO-2024-015',
    actionLabel: 'مراجعة الأمر',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    priority: 'medium'
  }
];