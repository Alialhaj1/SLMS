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
  tenant_code?: string;
  rememberMe?: boolean;
}

export interface CompanyVerificationRequest {
  company_code: string;
}

export interface CompanyVerificationResponse {
  success: boolean;
  data?: {
    tenant_id: number;
    company_code: string;
    company_name: string;
    company_name_ar?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    status: 'active' | 'suspended' | 'inactive';
  };
  error?: string;
}

export interface MfaVerificationRequest {
  mfa_token: string;
  mfa_code: string;
}

export interface MfaVerificationResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    user: EnhancedUserProfile;
  };
  error?: string;
}

export interface PlatformLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
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
}

// Enhanced User Profile with RBAC integration
export interface EnhancedUserProfile extends UserProfile {
  // JWT Standard Claims
  sub?: string; // user_id
  iat?: number; // issued at
  exp?: number; // expires at
  
  // SLMS Custom Claims
  login_context?: 'platform' | 'tenant';
  tenant_code?: string;
  company_name?: string;
  company_name_ar?: string;
  
  // Permission System
  role_hierarchy?: string[]; // ordered by priority
  effective_permissions?: string[]; // computed permissions
  
  // Security
  session_id?: string;
  login_ip?: string;
  login_user_agent?: string;
  mfa_enabled?: boolean;
  mfa_verified?: boolean;
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
   * Platform Admin Login - Direct login for Super Admin/Platform Admin
   * As per specification: Platform users login with email+password directly
   * @param data Platform login credentials
   */
  async platformLogin(data: PlatformLoginRequest): Promise<LoginResponse> {
    // Platform login explicitly excludes tenant_id/tenant_code
    const payload = {
      email: data.email,
      password: data.password,
      // No tenant context for platform login
    };

    return this._performLogin(payload, 'platform');
  }

  /**
   * Tenant Login - Step-by-step login for tenant users  
   * As per specification: Tenant users must provide Company ID first, then credentials
   * @param data Tenant login credentials with company identification
   */
  async tenantLogin(data: LoginRequest): Promise<LoginResponse> {
    // Tenant login requires either tenant_id or tenant_code
    if (!data.tenant_id && !data.tenant_code) {
      throw new Error('TENANT_IDENTIFICATION_REQUIRED');
    }

    return this._performLogin(data, 'tenant');
  }

  /**
   * Legacy login method - maintains backward compatibility
   * @deprecated Use platformLogin() or tenantLogin() for better clarity
   */
  async login(email: string, password: string, tenantId?: number): Promise<LoginResponse> {
    const payload: LoginRequest = { email, password };
    if (tenantId) {
      payload.tenant_id = tenantId;
      return this.tenantLogin(payload);
    } else {
      return this.platformLogin({ email, password });
    }
  }

  /**
   * Internal method to perform the actual login API call
   */
  private async _performLogin(payload: any, context: 'platform' | 'tenant'): Promise<LoginResponse> {
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
      
      // Enhanced error handling for specification compliance
      if (context === 'platform') {
        if (errObj.code === 'TENANT_LOGIN_REQUIRED') {
          throw new Error('TENANT_USER_ADMIN_ACCESS');
        }
        if (errObj.code === 'TENANT_ACCESS_DENIED') {
          throw new Error('INSUFFICIENT_PLATFORM_PRIVILEGES');
        }
      } else if (context === 'tenant') {
        if (errObj.code === 'USER_EMAIL_NOT_FOUND') {
          throw new Error('USER_EMAIL_NOT_FOUND');
        }
        if (errObj.code === 'INVALID_TENANT') {
          throw new Error('COMPANY_NOT_FOUND');
        }
        if (errObj.code === 'TENANT_LOCKED') {
          throw new Error('COMPANY_LOCKED');
        }
        if (errObj.code === 'TENANT_TERMINATED') {
          throw new Error('COMPANY_TERMINATED');
        }
      }
      
      throw new Error(
        errObj.message || data?.message || `Login failed (HTTP ${res.status})`
      );
    }

    // Password-change enforcement responses intentionally omit data.user.
    // Return early so login callers can route to the change-password flow.
    if (data?.success && data?.data?.must_change_password) {
      return data as LoginResponse;
    }

    // Validate response matches expected context
    if (data.success && data.data) {
      const user = data.data.user;
      
      if (context === 'platform') {
        // Platform login validation
        if (user.tenant_id) {
          throw new Error('TENANT_USER_ADMIN_ACCESS');
        }
        if (!user.roles?.some((r: string) => ['super_admin', 'platform_admin', 'system_admin'].includes(r))) {
          throw new Error('INSUFFICIENT_PLATFORM_PRIVILEGES');
        }
        // Set platform context
        data.data.login_context = 'platform';
        user.login_context = 'platform';
      } else if (context === 'tenant') {
        // Tenant login validation
        if (!user.tenant_id) {
          throw new Error('PLATFORM_USER_TENANT_ACCESS');
        }
        // Set tenant context
        data.data.login_context = 'tenant';
        user.login_context = 'tenant';
      }
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
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
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

  // ===========================
  // Multi-Stage Login System - Arabic Specification
  // ===========================

  /**
   * Stage 1: Company Verification
   * Verifies company code (HAJ-001 format) and returns company info
   * @param data Company verification request
   */
  async verifyCompany(data: CompanyVerificationRequest): Promise<CompanyVerificationResponse> {
    try {
      const response = await fetch('/api/auth/verify-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Company verification failed');
      }

      return result;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Company verification failed');
    }
  }

  /**
   * Stage 2: Tenant Login with Company Context
   * Enhanced tenant login with verified company information
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    // Determine login flow based on tenant context
    if (data.tenant_id || data.tenant_code) {
      return this.tenantLogin(data);
    } else {
      // Assume platform login if no tenant context
      return this.platformLogin({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
    }
  }

  /**
   * Stage 3: MFA Verification (Enhanced)
   * Verifies MFA code and returns complete authentication tokens
   */
  async verifyMFA(request: MfaVerificationRequest): Promise<MfaVerificationResponse> {
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'MFA verification failed');
      }

      // Store tokens if successful
      if (result.success && result.data) {
        this.storeTokens(result.data.accessToken, result.data.refreshToken);
        this.storeUser(result.data.user);
      }

      return result;
    } catch (error) {
      throw error instanceof Error ? error : new Error('MFA verification failed');
    }
  }

  /**
   * Enhanced User Profile Fetch with RBAC
   * Fetches user profile with computed permissions and role hierarchy
   */
  async getUserProfile(): Promise<ApiSuccess<EnhancedUserProfile>> {
    const response = await apiClient.get<ApiSuccess<EnhancedUserProfile>>('/api/auth/me');
    return response;
  }

  /**
   * Platform Context Check
   * Determines if current session is in platform context
   */
  isPlatformContext(): boolean {
    const user = this.getCurrentUser();
    return user ? !user.tenant_id : false;
  }

  /**
   * Tenant Context Check  
   * Determines if current session is in tenant context
   */
  isTenantContext(): boolean {
    return !this.isPlatformContext();
  }

  /**
   * Get Current User Context
   * Returns enhanced user profile from localStorage or null
   */
  getCurrentUser(): EnhancedUserProfile | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Enhanced Token Storage with Context
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Enhanced User Storage with RBAC Data
   */
  private storeUser(user: EnhancedUserProfile): void {
    if (typeof window === 'undefined') return;
    
    // Enhance user object with computed fields
    const enhancedUser: EnhancedUserProfile = {
      ...user,
      is_platform_user: !user.tenant_id,
      is_platform_admin: !user.tenant_id && (
        user.roles?.includes('super_admin') || 
        user.roles?.includes('platform_admin')
      ),
      is_tenant_admin: !!user.tenant_id && user.roles?.includes('tenant_admin'),
      effective_permissions: user.permissions || [],
    };
    
    localStorage.setItem('user', JSON.stringify(enhancedUser));
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
