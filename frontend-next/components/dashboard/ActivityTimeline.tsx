import React from 'react';
import {
  ArrowRightCircleIcon,
  ArrowLeftCircleIcon,
  LockClosedIcon,
  UserCircleIcon,
  BellIcon,
  UserPlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useLocale } from '../../contexts/LocaleContext';
import type { ActivityItem } from '../../lib/dashboardService';

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
  onViewAll?: () => void;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  loading = false,
  onViewAll,
}) => {
  const { t, formatRelativeTime } = useTranslation();
  const { isRTL } = useLocale();

  const getActivityIcon = (type: ActivityItem['type']) => {
    const iconClass = 'w-5 h-5';
    switch (type) {
      case 'login':
        return <ArrowRightCircleIcon className={iconClass} />;
      case 'logout':
        return <ArrowLeftCircleIcon className={iconClass} />;
      case 'passwordChange':
        return <LockClosedIcon className={iconClass} />;
      case 'profileUpdate':
        return <UserCircleIcon className={iconClass} />;
      case 'notification':
        return <BellIcon className={iconClass} />;
      case 'userCreated':
        return <UserPlusIcon className={iconClass} />;
      case 'userUpdated':
        return <PencilSquareIcon className={iconClass} />;
      case 'userDeleted':
        return <TrashIcon className={iconClass} />;
      case 'roleChanged':
        return <ShieldCheckIcon className={iconClass} />;
      default:
        return <UserCircleIcon className={iconClass} />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'login':
        return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400';
      case 'logout':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
      case 'passwordChange':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400';
      case 'profileUpdate':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400';
      case 'notification':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400';
      case 'userCreated':
        return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400';
      case 'userUpdated':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400';
      case 'userDeleted':
        return 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400';
      case 'roleChanged':
        return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('dashboard.activity.title')}
        </h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('dashboard.activity.title')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          {t('dashboard.activity.noActivity')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('dashboard.activity.title')}
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            {t('dashboard.activity.viewAll')}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`flex items-start gap-4 ${
              index !== activities.length - 1
                ? 'pb-4 border-b border-gray-200 dark:border-gray-700'
                : ''
            }`}
          >
            {/* Icon */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(
                activity.type
              )}`}
            >
              {getActivityIcon(activity.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activity.userName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(`dashboard.activity.types.${activity.type}`)}
                {activity.metadata?.role && ` - ${activity.metadata.role}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {formatRelativeTime(new Date(activity.timestamp))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
