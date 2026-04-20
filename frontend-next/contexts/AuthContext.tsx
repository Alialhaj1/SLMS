/**
 * Auth Context - Global authentication state management
 * Manages user session, login/logout, and authentication checks
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { authService, UserProfile } from '../lib/authService';
import { useToast } from './ToastContext';

// ===========================
// Types
// ===========================

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  /** True once the fresh profile from /api/me has been loaded (not just cached user) */
  profileReady: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantId?: number) => Promise<LoginResult>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface LoginResult {
  success: boolean;
  must_change_password?: boolean;
  redirect_to?: string;
  message?: string;
  user?: UserProfile;
  login_context?: 'platform' | 'tenant';
  // MFA fields
  mfa_required?: boolean;
  mfa_setup_required?: boolean;
  mfa_code?: string;
  mfa_token?: string;
}

// ===========================
// Context
// ===========================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===========================
// Provider
// ===========================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe defaults: both server and client start with the same values
  // so React hydration matches. loadUser() then reads from localStorage
  // synchronously (one frame) before doing the background API refresh.
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  /**
   * Load user profile on mount
   */
  const loadUser = useCallback(async () => {
    try {
      if (!authService.isAuthenticated()) {
        setUser(null);
        setProfileReady(true);
        setLoading(false);
        return;
      }
      // Step 1: Synchronously read cached user from localStorage.
      // setUser + setProfileReady + setLoading are batched by React into
      // a single re-render, giving the page its auth state in ONE frame.
      const cachedUserRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (cachedUserRaw) {
        try {
          const cachedUser = JSON.parse(cachedUserRaw) as UserProfile;
          setUser(cachedUser);
          setProfileReady(true);
          setLoading(false);
        } catch (e) {
          localStorage.removeItem('user');
        }
      }

      // Step 2: Background API refresh. Only update state if profile data
      // actually changed, to avoid cascading re-renders through the
      // permission/menu/sidebar chain.
      try {
        const profile = await authService.getProfile();
        setUser(prev => {
          if (prev && JSON.stringify(prev) === JSON.stringify(profile)) return prev;
          return profile;
        });
        setProfileReady(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(profile));
        }
      } catch (err: any) {
        console.error('Failed to load user profile:', err);
        if (!cachedUserRaw) {
          setUser(null);
          authService.clearLocalAuth();
        }
        setProfileReady(true);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setUser(null);
      setProfileReady(true);
      authService.clearLocalAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Listen for auth:login events from components that login outside AuthContext
  useEffect(() => {
    const handleAuthLogin = () => {
      loadUser();
    };
    window.addEventListener('auth:login', handleAuthLogin);
    return () => window.removeEventListener('auth:login', handleAuthLogin);
  }, [loadUser]);

  /**
   * Login user
   * @param tenantId Optional tenant ID for tenant-scoped logins
   */
  const login = useCallback(async (email: string, password: string, tenantId?: number): Promise<LoginResult> => {
    try {
      const response = await authService.login(email, password, tenantId);

      // Pass MFA responses directly to login page (don't throw)
      if (response.mfa_required || response.mfa_setup_required) {
        return {
          success: false,
          mfa_required: response.mfa_required,
          mfa_setup_required: response.mfa_setup_required,
          mfa_code: response.mfa_code,
          mfa_token: response.mfa_token,
        };
      }

      if (!response.success) {
        throw new Error('Login failed');
      }

      const { data } = response;

      // Check if user must change password
      if (data.must_change_password) {
        // Save temporary token for password change
        if (data.temp_token) {
          authService.saveTokens(data.temp_token, data.refreshToken);
        }

        return {
          success: true,
          must_change_password: true,
          redirect_to: data.redirect_to || '/auth/change-password',
          message: data.message
        };
      }

      // Normal login - save tokens and load user
      authService.saveTokens(data.accessToken, data.refreshToken);

      // Notify AuthorizationContext (same-tab; StorageEvent only fires cross-tab)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:login'));
      }

      // Use user info from login response immediately to avoid blocking on /api/me
      const loginUser = (data as any).user as UserProfile | undefined;
      if (loginUser) {
        setUser(loginUser);
        setProfileReady(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(loginUser));
        }
      }

      // Try to refresh profile in background (non-blocking)
      authService.getProfile()
        .then((profile) => {
          setUser(profile);
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(profile));
          }
        })
        .catch((err) => {
          console.error('Failed to load user after login:', err);
        });

      // Don't show toast here - let the login page handle it
      // showToast('Login successful!', 'success');

      return {
        success: true,
        must_change_password: false,
        user: loginUser,
        login_context: (data as any).login_context || undefined
      };
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.response?.data?.error?.message || 
                          error?.message || 
                          'Login failed. Please check your credentials.';
      // Don't show toast here - let the login page handle it
      // showToast(errorMessage, 'error');
      
      throw error;
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      const refreshToken = authService.getRefreshToken();
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setProfileReady(false);
      authService.clearLocalAuth();

      if (typeof window !== 'undefined') {
        window.location.assign('/auth/login');
      }
    }
  }, []);

  /**
   * Change password
   */
  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      showToast({
        type: 'success',
        message: 'Password changed successfully. Please login again.',
      });

      // Logout and redirect to login
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error: any) {
      console.error('Change password error:', error);
      const errorMessage = error?.response?.data?.error?.message || 
                          error?.message || 
                          'Failed to change password';
      showToast({
        type: 'error',
        message: errorMessage,
      });
      throw error;
    }
  }, [showToast, logout]);

  /**
   * Refresh user profile
   */
  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    token: authService.getAccessToken(),
    loading,
    profileReady,
    isAuthenticated: !!user && authService.isAuthenticated(),
    login,
    logout,
    changePassword,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ===========================
// Hook
// ===========================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
