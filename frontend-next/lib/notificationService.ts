/**
 * Notification Service - Notifications API calls
 * Handles in-app notifications with real-time updates
 */

import { apiClient } from './apiClient';

// ===========================
// Types
// ===========================

export interface Notification {
  id: number;
  user_id: number;
  role_id: number | null;
  type: string;
  category: 'security' | 'admin' | 'user' | 'system';
  // Direct title/message (if pre-translated)
  title?: string;
  message?: string;
  // i18n keys (for frontend translation)
  title_key?: string;
  message_key?: string;
  // Payload for i18n interpolation
  payload?: Record<string, any>;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  read_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

// ===========================
// Notification Service
// ===========================

class NotificationService {
  /**
   * Get notifications for current user
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unread_only?: boolean;
    type?: string;
    category?: string;
  }): Promise<NotificationsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unread_only) queryParams.append('unread_only', 'true');
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);

    const response = await apiClient.get<NotificationsResponse>(
      `/api/notifications?${queryParams.toString()}`
    );
    return response;
  }

  /**
   * Get unread notification count (for badge)
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>(
      '/api/notifications/unread-count'
    );
    return response.data.count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<void> {
    await apiClient.post(`/api/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.post('/api/notifications/read-all');
  }

  /**
   * Dismiss notification (hide from user)
   */
  async dismiss(notificationId: number): Promise<void> {
    await apiClient.post(`/api/notifications/${notificationId}/dismiss`);
  }

  /**
   * Delete notification (admin only)
   */
  async delete(notificationId: number): Promise<void> {
    await apiClient.delete(`/api/notifications/${notificationId}`);
  }

  /**
   * Get notification by ID
   */
  async getById(notificationId: number): Promise<Notification> {
    const response = await apiClient.get<{ success: boolean; data: Notification }>(
      `/api/notifications/${notificationId}`
    );
    return response.data;
  }
}

export const notificationService = new NotificationService();
