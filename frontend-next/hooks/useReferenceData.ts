/**
 * useReferenceData Hook
 * Provides hooks for fetching common reference data (currencies, countries, container types)
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';

interface Currency {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  symbol?: string;
  exchange_rate?: number;
}

interface Country {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface ContainerType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  size?: string;
}

/**
 * Hook to fetch currencies
 */
export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ data: Currency[] }>('/api/currencies');
      setCurrencies(response.data || []);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  return { currencies, loading, refetch: loadCurrencies };
}

/**
 * Get currency symbol by ID
 */
export function getCurrencySymbol(currencies: Currency[], currencyId: number): string {
  const currency = currencies.find(c => c.id === currencyId);
  return currency?.symbol || currency?.code || '';
}

/**
 * Hook to fetch countries
 */
export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ data: Country[] }>('/api/countries');
      setCountries(response.data || []);
    } catch (error) {
      console.error('Failed to load countries:', error);
    } finally {
      setLoading(false);
    }
  };

  return { countries, loading, refetch: loadCountries };
}

/**
 * Hook to fetch container types
 */
export function useContainerTypes() {
  const [containerTypes, setContainerTypes] = useState<ContainerType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContainerTypes();
  }, []);

  const loadContainerTypes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ data: ContainerType[] }>('/api/container-types');
      setContainerTypes(response.data || []);
    } catch (error) {
      console.error('Failed to load container types:', error);
    } finally {
      setLoading(false);
    }
  };

  return { containerTypes, loading, refetch: loadContainerTypes };
}
