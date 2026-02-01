/**
 * Auth Service - Authentication API calls
 * Handles login, logout, token refresh, and password operations
 */

import { apiClient } from './apiClient';

// ===========================
// Types
// ===========================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    user: {
      id: number;
      email: string;
      full_name: string;
      roles: string[];
      permissions?: string[];
    };
    must_change_password?: boolean;
    message?: string;
    redirect_to?: string;
    temp_token?: string;
  };
}

type ApiSuccess<T> = {
  success: boolean;
  data: T;
};

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  data: {
    message: string;
  };
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  language?: string;
  preferred_language?: string;
  roles: string[];
  permissions: string[];
  created_at?: string;
  must_change_password?: boolean;
  status?: 'active' | 'disabled' | 'locked';
  last_login_at?: string | null;
  failed_login_count?: number;
  locked_until?: string | null;
  profile_image?: string | null;
  cover_image?: string | null;
}

// ===========================
// Auth Service
// ===========================

class AuthService {
  /**
   * Login user
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/api/auth/login',
      { email, password },
      { skipAuth: true }
    );
    return response;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>(
      '/api/auth/refresh',
      { refreshToken },
      { skipAuth: true }
    );
    return response;
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout', { refreshToken });
    } catch (error) {
      // Ignore errors - clear local state anyway
      console.error('Logout API call failed:', error);
    } finally {
      this.clearLocalAuth();
    }
  }

  /**
   * Change password (forced or voluntary)
   */
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await apiClient.post<ChangePasswordResponse>(
      '/api/auth/change-password',
      data
    );
    return response;
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    // Backend may return either:
    // 1) { success: true, data: UserProfile }
    // 2) UserProfile (legacy)
    const response = await apiClient.get<ApiSuccess<UserProfile> | UserProfile>('/api/me');
    if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
      return (response as ApiSuccess<UserProfile>).data;
    }
    return response as UserProfile;
  }

  /**
   * Update user language preference
   */
  async updateLanguage(language: 'ar' | 'en'): Promise<void> {
    await apiClient.patch('/api/auth/me/language', { language });
  }

  /**
   * Save auth tokens to localStorage
   */
  saveTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  /**
   * Clear all auth data from localStorage
   */
  clearLocalAuth(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const authService = new AuthService();
