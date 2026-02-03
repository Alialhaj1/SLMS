/**
 * 💵 CURRENCY SELECTOR COMPONENT
 * ===============================
 * Dropdown for selecting currencies with real-time API integration
 * 
 * Features:
 * ✅ Real-time currency fetching
 * ✅ Display currency code + symbol
 * ✅ AR/EN support
 * ✅ Loading states
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import clsx from 'clsx';

interface Currency {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  symbol: string;
  exchange_rate: number;
  is_active?: boolean;
}

interface CurrencySelectorProps {
  value: number | string;
  onChange: (currencyId: number, currencyCode?: string) => void;
  companyId?: number;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  /** Callback to receive the selected currency code (for exchange rate lookup) */
  onCurrencyCodeChange?: (code: string | null) => void;
}

export default function CurrencySelector({
  value,
  onChange,
  companyId,
  label,
  required = false,
  error,
  disabled = false,
  onCurrencyCodeChange,
}: CurrencySelectorProps) {
  const { locale } = useTranslation();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCurrencies = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const url = companyId 
          ? `${API_BASE_URL}/api/finance/currencies?company_id=${companyId}&is_active=true`
          : `${API_BASE_URL}/api/finance/currencies?is_active=true`;
          
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setCurrencies(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch currencies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrencies();
  }, [companyId]);

  // Notify parent of selected currency code on mount/change
  useEffect(() => {
    if (onCurrencyCodeChange && value && currencies.length > 0) {
      const selected = currencies.find(c => c.id === Number(value));
      onCurrencyCodeChange(selected?.code || null);
    }
  }, [value, currencies, onCurrencyCodeChange]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value);
    const selectedCurrency = currencies.find(c => c.id === selectedId);
    onChange(selectedId, selectedCurrency?.code);
    if (onCurrencyCodeChange) {
      onCurrencyCodeChange(selectedCurrency?.code || null);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || loading}
        className={clsx(
          'w-full px-4 py-3 border rounded-lg',
          'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed',
          'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
          error ? 'border-red-500' : 'border-gray-300'
        )}
      >
        <option value="">
          {loading
            ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...')
            : (locale === 'ar' ? 'اختر العملة' : 'Select Currency')}
        </option>
        {currencies.map((currency) => (
          <option key={currency.id} value={currency.id}>
            {currency.code} ({currency.symbol}) - {locale === 'ar' && currency.name_ar ? currency.name_ar : currency.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
