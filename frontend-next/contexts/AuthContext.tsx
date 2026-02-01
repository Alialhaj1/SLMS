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
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
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
}

// ===========================
// Context
// ===========================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===========================
// Provider
// ===========================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { showToast } = useToast();

  /**
   * Load user profile on mount
   */
  const loadUser = useCallback(async () => {
    try {
      if (!authService.isAuthenticated()) {
        setUser(null);
        return;
      }
      // Prefer cached user first to avoid hard-failing when /api/me is unavailable
      const cachedUserRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (cachedUserRaw) {
        try {
          const cachedUser = JSON.parse(cachedUserRaw) as UserProfile;
          setUser(cachedUser);
        } catch (e) {
          localStorage.removeItem('user');
        }
      }

      // Try to refresh user from API; tolerate 404 by keeping cached user
      try {
        const profile = await authService.getProfile();
        setUser(profile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(profile));
        }
      } catch (err: any) {
        console.error('Failed to load user profile:', err);
        // If API missing, keep cached user; otherwise clear auth
        if (!cachedUserRaw) {
          setUser(null);
          authService.clearLocalAuth();
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setUser(null);
      authService.clearLocalAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /**
   * Login user
   */
  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await authService.login(email, password);

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

      // Use user info from login response immediately to avoid blocking on /api/me
      const loginUser = (data as any).user as UserProfile | undefined;
      if (loginUser) {
        setUser(loginUser);
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
        user: loginUser
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
      authService.clearLocalAuth();
      router.push('/');
    }
  }, [router]);

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

      showToast('Password changed successfully. Please login again.', 'success');

      // Logout and redirect to login
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error: any) {
      console.error('Change password error:', error);
      const errorMessage = error?.response?.data?.error?.message || 
                          error?.message || 
                          'Failed to change password';
      showToast(errorMessage, 'error');
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
    loading,
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
