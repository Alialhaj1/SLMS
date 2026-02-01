/**
 * Notifications Page
 * Full notifications list with pagination and filters
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from '../hooks/useTranslation';
import { useNotifications } from '../contexts/NotificationsContext';
import { notificationService, Notification } from '../lib/notificationService';
import { useToast } from '../contexts/ToastContext';
import AuthGuard from '../components/AuthGuard';
import MainLayout from '../components/layout/MainLayout';
import {
  BellIcon,
  FunnelIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { markAsRead, markAllAsRead, dismiss, refreshUnreadCount } = useNotifications();
  const { showToast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    unread_only: false,
    category: '',
    type: ''
  });

  // Load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({
        page,
        limit: 20,
        unread_only: filters.unread_only || undefined,
        category: filters.category || undefined,
        type: filters.type || undefined
      });

      setNotifications(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotal(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      showToast(t('notifications.errors.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [page, filters]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      await refreshUnreadCount();
    } catch (error) {
      showToast(t('notifications.errors.markReadFailed'), 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      await refreshUnreadCount();
      showToast(t('notifications.success.markedAllRead'), 'success');
    } catch (error) {
      showToast(t('notifications.errors.markReadFailed'), 'error');
    }
  };

  const handleDismiss = async (notificationId: number) => {
    try {
      await dismiss(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await refreshUnreadCount();
      showToast(t('notifications.success.dismissed'), 'success');
    } catch (error) {
      showToast(t('notifications.errors.dismissFailed'), 'error');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate if action URL exists
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AuthGuard>
      <Head>
        <title>Notifications - SLMS</title>
      </Head>
      <MainLayout>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('notifications.title')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {total} total notifications
                  {unreadCount > 0 && ` • ${unreadCount} unread`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadNotifications}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  disabled={loading}
                >
                  <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <CheckIcon className="w-4 h-4 inline-block mr-1" />
                    {t('notifications.markAllRead')}
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setFilters(prev => ({ ...prev, unread_only: !prev.unread_only }))}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filters.unread_only
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <FunnelIcon className="w-4 h-4 inline-block mr-1" />
                {t('notifications.unreadOnly')}
              </button>

              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('notifications.categories.all')}</option>
                <option value="security">{t('notifications.categories.security')}</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="system">{t('notifications.categories.system')}</option>
              </select>
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('notifications.errors.loadFailed')}...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <BellIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('notifications.noNotifications')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filters.unread_only || filters.category
                  ? t('notifications.noNotifications')
                  : t('notifications.noNotificationsDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  onDismiss={() => handleDismiss(notification.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
      </MainLayout>
    </AuthGuard>
  );
}

// ===========================
// Notification Card Component
// ===========================

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDismiss: () => void;
}

function NotificationCard({ notification, onClick, onMarkAsRead, onDismiss }: NotificationCardProps) {
  const { t } = useTranslation();
  const categoryColors = {
    security: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    admin: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    user: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    system: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700'
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
      className={`p-6 bg-white dark:bg-gray-800 rounded-2xl border transition-all hover:shadow-lg cursor-pointer ${
        !notification.is_read
          ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
          : 'border-gray-200 dark:border-gray-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Unread Indicator */}
        <div className="flex-shrink-0 pt-1">
          {!notification.is_read && (
            <div className="w-3 h-3 bg-blue-600 rounded-full" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${categoryColor}`}>
              {t(`notifications.categories.${notification.category}`)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-500 whitespace-nowrap">
              {formatTimeAgo(notification.created_at, t)}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {getTitle()}
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-3">
            {getMessage()}
          </p>

          {notification.action_label && (
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {notification.action_label} →
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {!notification.is_read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
              className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Mark as read"
            >
              <CheckIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Dismiss"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
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
