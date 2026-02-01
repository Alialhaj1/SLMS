/**
 * Notifications Context - Global notifications state
 * Manages notification list, unread count, and real-time updates
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService, Notification } from '../lib/notificationService';
import { useAuth } from './AuthContext';

// ===========================
// Types
// ===========================

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (notificationId: number) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

// ===========================
// Context
// ===========================

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// ===========================
// Provider
// ===========================

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /**
   * Load notifications (first 10 for dropdown)
   */
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const response = await notificationService.getNotifications({
        limit: 10,
        page: 1
      });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Load unread count
   */
  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, [isAuthenticated]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
      throw error;
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: now }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  }, []);

  /**
   * Dismiss notification
   */
  const dismiss = useCallback(async (notificationId: number) => {
    try {
      await notificationService.dismiss(notificationId);
      
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if it was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      throw error;
    }
  }, [notifications]);

  /**
   * Refresh notifications
   */
  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  /**
   * Refresh unread count
   */
  const refreshUnreadCount = useCallback(async () => {
    await loadUnreadCount();
  }, [loadUnreadCount]);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      loadUnreadCount();

      // Poll for updates every 30 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadNotifications, loadUnreadCount]);

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismiss,
    refreshNotifications,
    refreshUnreadCount
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ===========================
// Hook
// ===========================

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
