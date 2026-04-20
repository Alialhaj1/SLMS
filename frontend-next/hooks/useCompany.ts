/**
 * useCompany Hook
 * Manages company selection, context switching, and permission reload
 * 
 * Critical: When switching company, this hook:
 *   1. Calls backend POST /api/company-context/switch
 *   2. Updates local company store
 *   3. Triggers permission/menu reload via AuthContext.refreshUser()
 *   4. Clears branch selection
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { companyStore, Company } from '../lib/companyStore';
import { branchStore } from '../lib/branchStore';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../lib/authService';

interface SwitchResult {
  success: boolean;
  company_id: number;
  company_name: string;
  permissions: string[];
  roles: string[];
  enabled_modules: string[];
}

export function useCompany() {
  const { isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(
    companyStore.getActiveCompanyId()
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Subscribe to company changes
  useEffect(() => {
    const unsubscribe = companyStore.subscribe(setActiveCompanyId);
    return unsubscribe;
  }, []);

  const hasFetched = useRef(false);

  // Load available companies only when authenticated
  useEffect(() => {
    if (authLoading) return;

    // Some sessions can have a valid token while the user profile is still loading
    // (or temporarily unavailable). Company context is critical, so load companies
    // whenever a token exists.
    const hasToken = authService.isAuthenticated();

    if (!isAuthenticated && !hasToken) {
      hasFetched.current = false;
      setCompanies([]);
      setLoading(false);
      return;
    }

    if (!hasFetched.current) {
      hasFetched.current = true;
      loadCompanies();
    }
  }, [authLoading, isAuthenticated]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: Company[] }>('/api/companies');
      const companyList = response.data || [];
      setCompanies(companyList);
      
      // Validate active company — clear stale IDs from previous sessions
      const currentId = companyStore.getActiveCompanyId();
      const isValid = currentId && companyList.some(c => c.id === currentId);

      if (companyList.length > 0 && !isValid) {
        companyStore.setActiveCompany(companyList[0].id);
      } else if (companyList.length === 0 && currentId) {
        companyStore.setActiveCompany(null);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch company with full backend context reload.
   * This is the SECURE way to switch companies — calls backend to:
   *   1. Validate user has access to the target company
   *   2. Update user's default company in DB
   *   3. Invalidate permission caches
   *   4. Return fresh permissions + roles + modules
   */
  const selectCompany = useCallback(async (companyId: number) => {
    // Skip if already on this company
    if (companyId === activeCompanyId) return;

    setSwitching(true);
    try {
      // Call backend switch endpoint
      const response = await apiClient.post<{ success: boolean; data: SwitchResult }>(
        '/api/company-context/switch',
        { company_id: companyId }
      );

      if (response.success) {
        // Update local store
        companyStore.setActiveCompany(companyId);
        
        // Clear branch selection
        branchStore.clear();
        
        // Reload user profile (permissions, enabled_modules, company context)
        // This triggers re-render of sidebar, permission checks, etc.
        if (refreshUser) {
          await refreshUser();
        }
      }
    } catch (error: any) {
      console.error('Failed to switch company:', error);
      // Fallback: still set locally but warn
      companyStore.setActiveCompany(companyId);
      branchStore.clear();
    } finally {
      setSwitching(false);
    }
  }, [activeCompanyId, refreshUser]);

  const clearCompany = () => {
    companyStore.clear();
  };

  const activeCompany = companies.find(c => c.id === activeCompanyId) || null;

  return {
    activeCompanyId,
    activeCompany,
    companies,
    loading,
    switching,
    selectCompany,
    clearCompany,
    hasCompany: activeCompanyId !== null,
    reloadCompanies: loadCompanies,
  };
}
