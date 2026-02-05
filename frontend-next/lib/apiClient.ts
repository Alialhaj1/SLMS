/**
 * API Client - Centralized HTTP requests with security features
 * 
 * Features:
 * - Automatic token management
 * - Auto token refresh on 401
 * - Global 403 handling
 * - Request/response interceptors
 * - Environment-aware base URL
 * - Company context injection (X-Company-Id header)
 * - Request tracing via X-Request-ID header
 */

import { companyStore } from './companyStore';

// Simple UUID v4 generator for request tracing (no external dependency)
function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Normalize base URL: strip trailing slashes and a trailing '/api' so we can always prefix endpoints with '/api/...'
const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_URL = rawBase.replace(/\/$/, '').replace(/\/api$/, '');

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class APIClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get access token from localStorage
   */
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    // Guard against legacy tokens that were too large (e.g., permissions embedded in JWT)
    // which can cause HTTP 431 (Request Header Fields Too Large) and cascade into CORS errors.
    // Modern tokens in this app should be small.
    if (token.length > 6000) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Clearing oversized access token (likely legacy)');
      }
      this.clearTokens();
      return null;
    }

    // Basic JWT shape check (three dot-separated parts). If invalid, clear to avoid noisy failures.
    if (token.split('.').length !== 3) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Clearing invalid access token (unexpected format)');
      }
      this.clearTokens();
      return null;
    }

    return token;
  }

  /**
   * Get refresh token from localStorage
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  /**
   * Set tokens in localStorage
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Clear tokens (logout)
   */
  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          this.logout();
          return false;
        }

        const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          this.logout();
          return false;
        }

        const result = await response.json();
        // Backend returns: { success: true, data: { accessToken, refreshToken } }
        if (result.success && result.data) {
          this.setTokens(result.data.accessToken, result.data.refreshToken);
          return true;
        } else {
          this.logout();
          return false;
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.logout();
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Logout user (clear tokens and redirect)
   */
  private logout(): void {
    this.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  /**
   * Show toast notification (integrate with your toast context)
   */
  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'error'): void {
    // TODO: Integrate with ToastContext
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Temporary: Use browser alert
    if (typeof window !== 'undefined' && type === 'error') {
      // Only show critical errors
      if (message.includes('permission')) {
        alert(message);
      }
    }
  }

  /**
   * Main request method
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    // Generate unique request ID for tracing
    const requestId = generateRequestId();

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...fetchOptions.headers,
    };

    // Add Authorization header if not skipped
    if (!skipAuth) {
      const token = this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    // Add Company Context Header only if companyId is set and endpoint is not /auth/login or /auth/refresh
    const companyId = companyStore.getActiveCompanyId();
    const isAuthEndpoint = endpoint.startsWith('/api/auth/login') || endpoint.startsWith('/api/auth/refresh');
    if (companyId && !isAuthEndpoint) {
      headers['X-Company-Id'] = companyId.toString();
    }

    // Make request
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 (Unauthorized - token expired)
      if (response.status === 401 && !skipAuth) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry original request with new token
          return this.request<T>(endpoint, options);
        } else {
          throw new Error('Authentication failed');
        }
      }

      // Handle 403 (Forbidden - insufficient permissions or account disabled)
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || errorData?.message || 'You do not have permission to perform this action';
        
        this.showToast(message, 'error');
        
        const err: any = new Error(message);
        err.status = 403;
        err.response = { data: errorData };
        throw err;
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = typeof errorData === 'string'
          ? errorData
          : errorData?.error?.message || errorData?.message || errorData?.error || `HTTP ${response.status}`;
        const err: any = new Error(message);
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      // Parse response
      const data = await response.json();
      return data;
    } catch (error) {
      const anyErr = error as any;
      const status = Number(anyErr?.status);
      if (Number.isFinite(status) && status >= 400 && status < 500) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('API request failed:', anyErr?.message || `HTTP ${status}`);
        }
      } else {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient(API_URL);

// Export as default for convenience
export default apiClient;

// Export class for testing
export { APIClient };

// Export convenience methods
export const api = {
  get: <T = any>(endpoint: string) => apiClient.get<T>(endpoint),
  post: <T = any>(endpoint: string, body?: any) => apiClient.post<T>(endpoint, body),
  put: <T = any>(endpoint: string, body?: any) => apiClient.put<T>(endpoint, body),
  delete: <T = any>(endpoint: string) => apiClient.delete<T>(endpoint),
  patch: <T = any>(endpoint: string, body?: any) => apiClient.patch<T>(endpoint, body),
};
