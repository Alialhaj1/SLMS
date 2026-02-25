/**
 * usePolicies Hook & PolicyProvider
 * Provides policy/feature-flag context for the application
 * 
 * Policies control feature visibility and behavior settings
 * that can be configured per-company or globally.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

interface Policy {
  key: string;
  value: string | boolean | number;
  scope: 'global' | 'company' | 'user';
}

interface PolicyContextType {
  policies: Record<string, any>;
  loading: boolean;
  getPolicy: (key: string, defaultValue?: any) => any;
  isFeatureEnabled: (featureKey: string) => boolean;
  refreshPolicies: () => Promise<void>;
}

const PolicyContext = createContext<PolicyContextType | undefined>(undefined);

interface PolicyProviderProps {
  children: ReactNode;
}

export function PolicyProvider({ children }: PolicyProviderProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [policies, setPolicies] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: Policy[] }>('/api/settings/policies');
      if (response.success && response.data) {
        const policyMap: Record<string, any> = {};
        response.data.forEach((p: Policy) => {
          policyMap[p.key] = p.value;
        });
        setPolicies(policyMap);
      }
    } catch (error) {
      // Policies are optional - fail silently
      console.debug('Failed to load policies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadPolicies();
    } else if (!isAuthenticated) {
      setPolicies({});
    }
  }, [authLoading, isAuthenticated, loadPolicies]);

  const getPolicy = useCallback((key: string, defaultValue: any = null) => {
    return policies[key] !== undefined ? policies[key] : defaultValue;
  }, [policies]);

  const isFeatureEnabled = useCallback((featureKey: string) => {
    const value = policies[featureKey];
    if (value === undefined) return true; // Features enabled by default
    return value === true || value === 'true' || value === 1 || value === '1';
  }, [policies]);

  const value: PolicyContextType = {
    policies,
    loading,
    getPolicy,
    isFeatureEnabled,
    refreshPolicies: loadPolicies,
  };

  return (
    <PolicyContext.Provider value={value}>
      {children}
    </PolicyContext.Provider>
  );
}

export function usePolicies(): PolicyContextType {
  const context = useContext(PolicyContext);
  if (context === undefined) {
    throw new Error('usePolicies must be used within a PolicyProvider');
  }
  return context;
}
