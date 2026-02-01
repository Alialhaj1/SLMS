/**
 * 🪝 USE MASTER DATA HOOK
 * ======================
 * 
 * Generic hook للـ CRUD operations على Master Data
 * 
 * Features:
 * ✅ Fetch list with pagination & filters
 * ✅ Fetch single item
 * ✅ Create new item
 * ✅ Update existing item
 * ✅ Delete item
 * ✅ Loading states
 * ✅ Error handling
 * ✅ Toast notifications
 * ✅ Auto-refresh after mutations
 * 
 * @example
 * const {
 *   data,
 *   loading,
 *   error,
 *   fetchList,
 *   fetchById,
 *   create,
 *   update,
 *   remove
 * } = useMasterData('/api/batch-numbers');
 */

/* @refresh reset */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from './useTranslation';
import { useToast } from '../contexts/ToastContext';
import { companyStore } from '../lib/companyStore';

interface UseMasterDataOptions {
  /** Base URL للـ API endpoint */
  endpoint: string;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Default page size */
  pageSize?: number;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

interface FetchListParams {
  page?: number;
  pageSize?: number;
  // Backwards-compatible alias used by some pages
  limit?: number;
  search?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

type UseMasterDataArg = UseMasterDataOptions | string;

function normalizeOptions(arg: UseMasterDataArg): UseMasterDataOptions {
  if (typeof arg === 'string') {
    // Backward compatible signature used widely across pages.
    // These legacy pages expect the hook to load data immediately.
    return { endpoint: arg, autoFetch: true };
  }
  return arg;
}

export function useMasterData<T = any>(arg: UseMasterDataArg) {
  const options = normalizeOptions(arg);
  const { endpoint, autoFetch = false, pageSize: defaultPageSize = 10 } = options;
  const { t } = useTranslation();
  const { showToast } = useToast();

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
    .replace(/\/$/, '')
    .replace(/\/api$/, '');

  const [data, setData] = useState<T[]>([]);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: defaultPageSize,
  });

  // Keep the latest pagination available without forcing fetchList identity changes.
  const paginationRef = useRef<PaginationState>(pagination);
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  /**
   * Get authorization token
   */
  const getToken = () => {
    return localStorage.getItem('accessToken');
  };

  const getCompanyId = () => {
    return companyStore.getActiveCompanyId();
  };

  const handleAuthFailure = (status: number) => {
    if (status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
    }
  };

  /**
   * Build query string from params
   */
  const buildQueryString = (params: Record<string, any>): string => {
    const filtered = Object.entries(params).filter(([_, value]) => value !== undefined && value !== null && value !== '');
    if (filtered.length === 0) return '';
    
    const query = new URLSearchParams();
    filtered.forEach(([key, value]) => {
      query.append(key, String(value));
    });
    return `?${query.toString()}`;
  };

  /**
   * Fetch list of items
   */
  const fetchList = useCallback(async (params: (FetchListParams & Record<string, any>) = {}) => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Support both the documented shape (filters) and the legacy shape
      // where extra query params were passed at the top-level.
      const {
        page,
        pageSize,
        limit,
        search,
        sortBy,
        sortOrder,
        filters,
        ...rest
      } = params as any;

      const effectiveFilters = (filters && typeof filters === 'object') ? filters : rest;

      const currentPagination = paginationRef.current;
      const effectivePage = Number(page) || currentPagination.currentPage || 1;
      const effectiveLimit = Number(pageSize ?? limit) || currentPagination.pageSize || defaultPageSize;

      const queryParams: Record<string, any> = {
        page: effectivePage,
        limit: effectiveLimit,
        search,
        sortBy,
        sortOrder,
        ...effectiveFilters,
      };

      const queryString = buildQueryString(queryParams);
      const apiUrl = `${apiBaseUrl}${endpoint}${queryString}`;

      const companyId = getCompanyId();

      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (response.status === 401) {
        handleAuthFailure(401);
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || 'Forbidden');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error?.message || 'Failed to fetch data');
      }

      setData(result.data || []);
      
      // Update pagination if provided
      if (result.pagination) {
        setPagination((prev) => ({
          currentPage: result.pagination.currentPage || 1,
          totalPages: result.pagination.totalPages || 1,
          totalItems: result.pagination.totalItems || result.total || 0,
          pageSize: result.pagination.pageSize || prev.pageSize,
        }));
      } else if (result.meta) {
        // Support backend utils/response.sendPaginated format
        setPagination((prev) => ({
          currentPage: result.meta.page || 1,
          totalPages: result.meta.totalPages || 1,
          totalItems: result.meta.total || 0,
          pageSize: result.meta.limit || prev.pageSize,
        }));
      } else if (result.total !== undefined) {
        setPagination(prev => ({
          ...prev,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / prev.pageSize),
        }));
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      showToast(message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [defaultPageSize, endpoint, showToast]);

  const refresh = useCallback(async () => {
    return fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!autoFetch) return;
    // Ensure an initial load when used via legacy string signature.
    fetchList({ page: 1, pageSize: defaultPageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, endpoint]);

  /**
   * Fetch single item by ID
   */
  const fetchById = useCallback(async (id: number | string) => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = `${apiBaseUrl}${endpoint}/${id}`;

      const companyId = getCompanyId();

      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (response.status === 401) {
        handleAuthFailure(401);
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || 'Forbidden');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error?.message || 'Failed to fetch item');
      }

      setSelectedItem(result.data);
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch item';
      setError(message);
      showToast(message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, showToast]);

  /**
   * Create new item
   */
  const create = useCallback(async (payload: Partial<T>) => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = `${apiBaseUrl}${endpoint}`;

      const companyId = getCompanyId();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        handleAuthFailure(401);
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || 'Forbidden');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error?.message || 'Failed to create item');
      }

      showToast(t('common.createSuccess'), 'success');
      
      // Refresh list
      await fetchList();

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      setError(message);
      showToast(message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, fetchList, showToast, t]);

  /**
   * Update existing item
   */
  const update = useCallback(async (id: number | string, payload: Partial<T>) => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = `${apiBaseUrl}${endpoint}/${id}`;

      const companyId = getCompanyId();

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        handleAuthFailure(401);
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || 'Forbidden');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error?.message || 'Failed to update item');
      }

      showToast(t('common.updateSuccess'), 'success');
      
      // Refresh list
      await fetchList();

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update item';
      setError(message);
      showToast(message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, fetchList, showToast, t]);

  /**
   * Delete item
   */
  const remove = useCallback(async (id: number | string) => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = `${apiBaseUrl}${endpoint}/${id}`;

      const companyId = getCompanyId();

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (response.status === 401) {
        handleAuthFailure(401);
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || 'Forbidden');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error?.message || 'Failed to delete item');
      }

      showToast(t('common.deleteSuccess'), 'success');
      
      // Refresh list
      await fetchList();

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete item';
      setError(message);
      showToast(message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [endpoint, fetchList, showToast, t]);

  return {
    data,
    selectedItem,
    loading,
    error,
    pagination,
    fetchList,
    fetchById,
    create,
    update,
    remove,
    refresh,
    setSelectedItem,
  };
}
