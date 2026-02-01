/**
 * Profile Service - User profile and preferences API
 * Handles profile info, language preferences, and login history
 */

import { apiClient } from './apiClient';
import { authService, UserProfile } from './authService';

// Re-export UserProfile for convenience
export type { UserProfile } from './authService';

export interface LoginHistoryEntry {
  id: number;
  user_id: number;
  activity_type: 'login_success' | 'login_failed' | 'logout' | 'password_changed' | 'account_locked';
  ip_address: string;
  user_agent: string;
  failed_reason: string | null;
  is_suspicious: boolean;
  created_at: string;
}

export interface LoginHistoryResponse {
  success: boolean;
  data: LoginHistoryEntry[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateProfileRequest {
  full_name?: string;
  language?: 'ar' | 'en';
}

// ===========================
// Profile Service
// ===========================

class ProfileService {
  /**
   * Get current user profile (uses authService)
   */
  async getProfile(): Promise<UserProfile> {
    return authService.getProfile();
  }

  /**
   * Update user language preference
   */
  async updateLanguage(language: 'ar' | 'en'): Promise<void> {
    await authService.updateLanguage(language);
  }

  /**
   * Update profile information
   */
  async updateProfile(data: UpdateProfileRequest): Promise<void> {
    await apiClient.patch('/api/auth/me', data);
  }

  /**
   * Get user login history
   */
  async getLoginHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<LoginHistoryResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<LoginHistoryResponse>(
      `/api/users/me/login-history?${queryParams.toString()}`
    );
    return response;
  }

  /**
   * Get login statistics
   */
  async getLoginStats(): Promise<{
    total_logins: number;
    failed_attempts: number;
    last_login: string | null;
    suspicious_logins: number;
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        total_logins: number;
        failed_attempts: number;
        last_login: string | null;
        suspicious_logins: number;
      };
    }>('/api/users/me/login-stats');
    return response.data;
  }

  /**
   * Get user sessions (active tokens)
   */
  async getSessions(): Promise<Array<{
    id: number;
    device: string;
    ip_address: string;
    created_at: string;
    expires_at: string;
  }>> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: Array<{
          id: number;
          device: string;
          ip_address: string;
          created_at: string;
          expires_at: string;
        }>;
      }>('/api/auth/sessions');
      return response.data;
    } catch (error) {
      // Endpoint might not exist yet
      console.warn('Sessions endpoint not available:', error);
      return [];
    }
  }

  // ===========================
  // Profile Image Methods
  // ===========================

  /**
   * Upload profile image (base64)
   */
  async uploadProfileImage(imageBase64: string): Promise<{ url: string }> {
    const response = await apiClient.post<{
      success: boolean;
      data: { url: string };
    }>('/api/profile/image', { image: imageBase64 });
    return response.data;
  }

  /**
   * Remove profile image
   */
  async removeProfileImage(): Promise<void> {
    await apiClient.delete('/api/profile/image');
  }

  /**
   * Upload cover image (base64)
   */
  async uploadCoverImage(imageBase64: string): Promise<{ url: string }> {
    const response = await apiClient.post<{
      success: boolean;
      data: { url: string };
    }>('/api/profile/cover', { image: imageBase64 });
    return response.data;
  }

  /**
   * Remove cover image
   */
  async removeCoverImage(): Promise<void> {
    await apiClient.delete('/api/profile/cover');
  }

  // ===========================
  // Admin Image Methods (for managing other users)
  // ===========================

  /**
   * Upload profile image for a user (admin only)
   */
  async uploadUserProfileImage(userId: number, imageBase64: string): Promise<{ url: string }> {
    const response = await apiClient.post<{
      success: boolean;
      data: { url: string };
    }>(`/api/profile/users/${userId}/image`, { image: imageBase64 });
    return response.data;
  }

  /**
   * Remove profile image for a user (admin only)
   */
  async removeUserProfileImage(userId: number): Promise<void> {
    await apiClient.delete(`/api/profile/users/${userId}/image`);
  }

  /**
   * Upload cover image for a user (admin only)
   */
  async uploadUserCoverImage(userId: number, imageBase64: string): Promise<{ url: string }> {
    const response = await apiClient.post<{
      success: boolean;
      data: { url: string };
    }>(`/api/profile/users/${userId}/cover`, { image: imageBase64 });
    return response.data;
  }

  /**
   * Remove cover image for a user (admin only)
   */
  async removeUserCoverImage(userId: number): Promise<void> {
    await apiClient.delete(`/api/profile/users/${userId}/cover`);
  }
}

export const profileService = new ProfileService();
