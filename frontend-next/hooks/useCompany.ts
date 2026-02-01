/**
 * useCompany Hook
 * Manages company selection and context
 */

import { useState, useEffect, useRef } from 'react';
import { companyStore, Company } from '../lib/companyStore';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../lib/authService';

export function useCompany() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(
    companyStore.getActiveCompanyId()
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      // Auto-select if only one company or if no company selected
      if (companyList.length > 0 && !activeCompanyId) {
        companyStore.setActiveCompany(companyList[0].id);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (companyId: number) => {
    companyStore.setActiveCompany(companyId);
  };

  const clearCompany = () => {
    companyStore.clear();
  };

  const activeCompany = companies.find(c => c.id === activeCompanyId) || null;

  return {
    activeCompanyId,
    activeCompany,
    companies,
    loading,
    selectCompany,
    clearCompany,
    hasCompany: activeCompanyId !== null,
  };
}
