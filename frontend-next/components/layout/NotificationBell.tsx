/**
 * Notifications Bell Component
 * Bell icon with badge + dropdown preview
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useNotifications } from '../../contexts/NotificationsContext';
import { 
  BellIcon, 
  CheckIcon,
  XMarkIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

export default function NotificationBell() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate if action URL exists
    if (notification.action_url) {
      router.push(notification.action_url);
    }

    // Close dropdown
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    try {
      await dismiss(notificationId);
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="w-6 h-6" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-gray-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('notifications.title')}
              {unreadCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({unreadCount} unread)
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.noNotifications')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    onDismiss={(e) => handleDismiss(e, notification.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <Link 
              href="/notifications"
              className="block w-full text-center py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {t('notifications.viewAll')}
              <ArrowRightIcon className="inline-block w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================
// Notification Item Component
// ===========================

interface NotificationItemProps {
  notification: any;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}

function NotificationItem({ notification, onClick, onDismiss }: NotificationItemProps) {
  const { t } = useTranslation();
  const categoryColors = {
    security: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    system: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
  };

  const categoryColor = categoryColors[notification.category as keyof typeof categoryColors] || categoryColors.system;

  // Get title: use title if available, otherwise translate title_key with payload
  const getTitle = () => {
    if (notification.title) return notification.title;
    if (notification.title_key) {
      return t(notification.title_key, notification.payload || {});
    }
    return t('notifications.untitled');
  };

  // Get message: use message if available, otherwise translate message_key with payload
  const getMessage = () => {
    if (notification.message) return notification.message;
    if (notification.message_key) {
      return t(notification.message_key, notification.payload || {});
    }
    return '';
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors relative ${
        !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
    >
      {/* Unread Indicator */}
      {!notification.is_read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full" />
      )}

      <div className="pl-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor}`}>
            {t(`notifications.categories.${notification.category}`)}
          </span>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
          {getTitle()}
        </h4>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {getMessage()}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {formatTimeAgo(notification.created_at, t)}
          </span>
          {notification.action_label && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {notification.action_label} →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================
// Helper Functions
// ===========================

function formatTimeAgo(dateString: string, t: (key: string, params?: any) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t('notifications.timeAgo.justNow');
  if (diffInSeconds < 3600) return t('notifications.timeAgo.minutesAgo', { minutes: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400) return t('notifications.timeAgo.hoursAgo', { hours: Math.floor(diffInSeconds / 3600) });
  if (diffInSeconds < 604800) return t('notifications.timeAgo.daysAgo', { days: Math.floor(diffInSeconds / 86400) });
  
  return date.toLocaleDateString();
}
