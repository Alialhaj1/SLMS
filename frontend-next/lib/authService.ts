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
  tenant_id?: number;
}

export interface LoginResponse {
  success: boolean;
  // MFA fields (present when login returns 403 with MFA code)
  mfa_required?: boolean;
  mfa_setup_required?: boolean;
  mfa_code?: 'MFA_REQUIRED' | 'MFA_SETUP_REQUIRED';
  mfa_token?: string;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    login_context?: 'platform' | 'tenant';
    user: {
      id: number;
      email: string;
      full_name: string;
      roles: string[];
      permissions?: string[];
      login_context?: 'platform' | 'tenant';
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
  tenant_id?: number | null;
  is_platform_admin?: boolean;
  is_platform_user?: boolean;
  is_tenant_admin?: boolean;
  enabled_modules?: string[];
  company_id?: number | null;
  company_name?: string | null;
  tenant_role?: string | null;
  login_context?: 'platform' | 'tenant';
}

// ===========================
// Auth Service
// ===========================

class AuthService {
  /**
   * Login user
   * @param email User email
   * @param password User password
   * @param tenantId Optional tenant ID for tenant-scoped login
   */
  async login(email: string, password: string, tenantId?: number): Promise<LoginResponse> {
    const payload: LoginRequest = { email, password };
    if (tenantId) {
      payload.tenant_id = tenantId;
    }

    // Use raw fetch for login to properly handle MFA 403 responses.
    // MFA responses are returned as normal result objects (not thrown errors)
    // to avoid dynamic Error property loss through async catch chains.
    const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    const url = `${baseURL.replace(/\/$/, '').replace(/\/api$/, '')}/api/auth/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    // Handle MFA-related 403s as return values, not errors
    if (res.status === 403) {
      const errObj = data?.error || {};
      if (errObj.code === 'MFA_REQUIRED') {
        return {
          success: false,
          mfa_required: true,
          mfa_code: 'MFA_REQUIRED',
          mfa_token: errObj.mfa_token || '',
          data: {} as any,
        };
      }
      if (errObj.code === 'MFA_SETUP_REQUIRED') {
        return {
          success: false,
          mfa_setup_required: true,
          mfa_code: 'MFA_SETUP_REQUIRED',
          mfa_token: errObj.mfa_token || '',
          data: {} as any,
        };
      }
    }

    if (!res.ok) {
      const errObj = data?.error || {};
      throw new Error(
        errObj.message || data?.message || `Login failed (HTTP ${res.status})`
      );
    }

    return data as LoginResponse;
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

  // ===========================
  // MFA (Two-Factor Authentication)
  // ===========================

  /**
   * Verify MFA code during login (uses mfa_token, no auth required)
   */
  async verifyMFA(mfaToken: string, code: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/api/auth/mfa/verify',
      { mfa_token: mfaToken, code },
      { skipAuth: true }
    );
    return response;
  }

  /**
   * Verify MFA recovery code during login (uses mfa_token, no auth required)
   */
  async verifyMFARecovery(mfaToken: string, recoveryCode: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/api/auth/mfa/recovery',
      { mfa_token: mfaToken, recovery_code: recoveryCode },
      { skipAuth: true }
    );
    return response;
  }

  /**
   * Get MFA status for current user (authenticated)
   */
  async getMFAStatus(): Promise<MFAStatusResponse> {
    const response = await apiClient.get<MFAStatusResponse>('/api/auth/mfa/status');
    return response;
  }

  /**
   * Setup MFA - generates secret and QR code URI.
   * Supports both authenticated (JWT) and pre-auth (mfa_setup_token) flows.
   */
  async setupMFA(): Promise<MFASetupResponse> {
    const mfaSetupToken = typeof window !== 'undefined' ? sessionStorage.getItem('mfa_setup_token') : null;

    if (mfaSetupToken && !this.isAuthenticated()) {
      // Pre-auth flow: use MFA setup token instead of JWT
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const url = `${baseURL.replace(/\/$/, '').replace(/\/api$/, '')}/api/auth/mfa/setup`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MFA-Setup-Token': mfaSetupToken,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to start MFA setup');
      return data as MFASetupResponse;
    }

    // Normal authenticated flow
    const response = await apiClient.post<MFASetupResponse>('/api/auth/mfa/setup', {});
    return response;
  }

  /**
   * Enable MFA after verifying setup code.
   * Supports both authenticated (JWT) and pre-auth (mfa_setup_token) flows.
   */
  async enableMFA(code: string): Promise<MFAEnableResponse> {
    const mfaSetupToken = typeof window !== 'undefined' ? sessionStorage.getItem('mfa_setup_token') : null;

    if (mfaSetupToken && !this.isAuthenticated()) {
      // Pre-auth flow
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const url = `${baseURL.replace(/\/$/, '').replace(/\/api$/, '')}/api/auth/mfa/enable`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MFA-Setup-Token': mfaSetupToken,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to enable MFA');
      return data as MFAEnableResponse;
    }

    // Normal authenticated flow
    const response = await apiClient.post<MFAEnableResponse>('/api/auth/mfa/enable', { code });
    return response;
  }

  /**
   * Disable MFA (authenticated, requires password)
   */
  async disableMFA(password: string): Promise<{ success: boolean; data: { message: string } }> {
    const response = await apiClient.post<{ success: boolean; data: { message: string } }>(
      '/api/auth/mfa/disable',
      { password }
    );
    return response;
  }

  /**
   * Regenerate recovery codes (authenticated, requires password)
   */
  async regenerateRecoveryCodes(password: string): Promise<MFAEnableResponse> {
    const response = await apiClient.post<MFAEnableResponse>(
      '/api/auth/mfa/regenerate',
      { password }
    );
    return response;
  }

  /**
   * Confirm backup codes have been saved.
   * Supports both authenticated (JWT) and pre-auth (mfa_setup_token) flows.
   */
  async confirmBackupSaved(): Promise<{ success: boolean; data: { message: string } }> {
    const mfaSetupToken = typeof window !== 'undefined' ? sessionStorage.getItem('mfa_setup_token') : null;

    if (mfaSetupToken && !this.isAuthenticated()) {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const url = `${baseURL.replace(/\/$/, '').replace(/\/api$/, '')}/api/auth/mfa/confirm-backup`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MFA-Setup-Token': mfaSetupToken,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to confirm backup');
      return data;
    }

    const response = await apiClient.post<{ success: boolean; data: { message: string } }>(
      '/api/auth/mfa/confirm-backup',
      {}
    );
    return response;
  }

  /**
   * Get MFA events/audit log (authenticated)
   */
  async getMFAEvents(limit?: number): Promise<{ success: boolean; data: { events: any[] } }> {
    const url = limit ? `/api/auth/mfa/events?limit=${limit}` : '/api/auth/mfa/events';
    const response = await apiClient.get<{ success: boolean; data: { events: any[] } }>(url);
    return response;
  }
}

// ===========================
// MFA Types
// ===========================

export interface MFAStatusResponse {
  success: boolean;
  data: {
    mfa_enabled: boolean;
    mfa_enforced: boolean;
    mfa_backup_verified: boolean;
    mfa_enabled_at: string | null;
  };
}

export interface MFASetupResponse {
  success: boolean;
  data: {
    secret: string;
    otpauthUri: string;
    qrCodeDataUrl?: string;
  };
}

export interface MFAEnableResponse {
  success: boolean;
  data: {
    message: string;
    recovery_codes: string[];
  };
}

// ===========================
// Admin MFA Types
// ===========================

export interface AdminMFAUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  mfa_enabled: boolean;
  mfa_enforced: boolean;
  is_system_account: boolean;
  mfa_enabled_at: string | null;
  roles: string[];
  recovery_codes_remaining: number;
}

export interface AdminMFAPolicy {
  policy: {
    scope: string;
    enforce_for_roles: string[];
    enforce_for_all: boolean;
    grace_period_hours: number;
  } | null;
  roles: { id: number; name: string; requires_mfa: boolean }[];
}

export interface AdminMFAEvent {
  id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  event_type: string;
  ip_address: string;
  created_at: string;
}

// ===========================
// Admin MFA Service
// ===========================

class AdminMFAService {
  async getUsers(): Promise<{ success: boolean; data: { users: AdminMFAUser[] } }> {
    return apiClient.get('/api/auth/mfa/admin/users');
  }

  async enforceMFA(userId: number, enforce: boolean): Promise<{ success: boolean; data: { message: string } }> {
    return apiClient.post('/api/auth/mfa/admin/enforce', { userId, enforce });
  }

  async getPolicy(): Promise<{ success: boolean; data: AdminMFAPolicy }> {
    return apiClient.get('/api/auth/mfa/admin/policy');
  }

  async updatePolicy(data: {
    roles?: { roleId: number; requiresMfa: boolean }[];
    enforceForAll?: boolean;
    gracePeriodHours?: number;
  }): Promise<{ success: boolean; data: { message: string } }> {
    return apiClient.put('/api/auth/mfa/admin/policy', data);
  }

  async getEvents(limit?: number): Promise<{ success: boolean; data: { events: AdminMFAEvent[] } }> {
    const url = limit ? `/api/auth/mfa/admin/events?limit=${limit}` : '/api/auth/mfa/admin/events';
    return apiClient.get(url);
  }
}

export const adminMFAService = new AdminMFAService();
export const authService = new AuthService();
