/**
 * useExchangeRate Hook
 * ====================
 * جلب سعر الصرف تلقائياً بناءً على العملة الافتراضية للشركة
 * 
 * @example
 * const { rate, loading, error, baseCurrency, refetch } = useExchangeRate('USD');
 * const { rate: euroRate } = useExchangeRate('EUR', { date: '2024-01-15' });
 */

import { useState, useEffect, useCallback } from 'react';

export interface ExchangeRateData {
  rate: number | null;
  from_currency_code: string;
  from_currency?: {
    id: number;
    code: string;
    symbol: string;
    name: string;
    name_ar: string;
  };
  to_currency_code: string;
  to_currency?: {
    id: number;
    code: string;
    symbol: string;
    name: string;
    name_ar: string;
  };
  rate_date: string;
  rate_type?: string;
  source?: string;
  is_reverse?: boolean;
  is_base_currency?: boolean;
  message?: string;
}

interface UseExchangeRateOptions {
  /** تاريخ سعر الصرف (YYYY-MM-DD)، الافتراضي: اليوم */
  date?: string;
  /** نوع السعر: standard, buying, selling, customs */
  rateType?: 'standard' | 'buying' | 'selling' | 'customs';
  /** تجاهل الجلب التلقائي */
  skip?: boolean;
  /** القيمة الافتراضية إذا لم يوجد سعر */
  defaultRate?: number;
}

interface UseExchangeRateResult {
  /** سعر الصرف */
  rate: number | null;
  /** سعر الصرف القابل للاستخدام (يستخدم القيمة الافتراضية إذا لم يوجد سعر) */
  effectiveRate: number;
  /** تحميل */
  loading: boolean;
  /** خطأ */
  error: string | null;
  /** بيانات كاملة */
  data: ExchangeRateData | null;
  /** العملة الأساسية للشركة */
  baseCurrency: string | null;
  /** هل هي نفس العملة الأساسية */
  isBaseCurrency: boolean;
  /** إعادة الجلب */
  refetch: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useExchangeRate(
  currencyCode: string | undefined | null,
  options: UseExchangeRateOptions = {}
): UseExchangeRateResult {
  const {
    date,
    rateType = 'standard',
    skip = false,
    defaultRate = 1,
  } = options;

  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExchangeRateData | null>(null);

  const fetchRate = useCallback(async () => {
    if (!currencyCode || skip) {
      setRate(null);
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams();
      if (date) params.set('date', date);
      params.set('rate_type', rateType);

      const response = await fetch(
        `${API_URL}/api/exchange-rates/rate-for-company/${currencyCode}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch exchange rate');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
        setRate(result.data.rate);
      } else {
        setData(null);
        setRate(null);
      }
    } catch (err: any) {
      console.error('Error fetching exchange rate:', err);
      setError(err.message || 'Failed to fetch exchange rate');
      setRate(null);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currencyCode, date, rateType, skip]);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  return {
    rate,
    effectiveRate: rate ?? defaultRate,
    loading,
    error,
    data,
    baseCurrency: data?.from_currency_code || null,
    isBaseCurrency: data?.is_base_currency || false,
    refetch: fetchRate,
  };
}

/**
 * Hook للحصول على سعر الصرف عند تغيير العملة في النموذج
 * يتضمن حالة editable للسعر
 */
export interface UseExchangeRateFieldResult extends UseExchangeRateResult {
  /** قيمة سعر الصرف في الحقل (قد تكون معدلة من المستخدم) */
  fieldValue: string;
  /** تعيين قيمة الحقل */
  setFieldValue: (value: string) => void;
  /** إعادة تعيين الحقل للقيمة الافتراضية من API */
  resetToDefault: () => void;
  /** هل تم تعديل القيمة من المستخدم */
  isModified: boolean;
}

export function useExchangeRateField(
  currencyCode: string | undefined | null,
  options: UseExchangeRateOptions = {}
): UseExchangeRateFieldResult {
  const baseResult = useExchangeRate(currencyCode, options);
  const [fieldValue, setFieldValue] = useState<string>('1');
  const [isModified, setIsModified] = useState(false);

  // تحديث الحقل عند تغيير سعر الصرف من API
  useEffect(() => {
    if (!isModified && baseResult.rate !== null) {
      setFieldValue(baseResult.rate.toString());
    } else if (!isModified && baseResult.rate === null) {
      setFieldValue(options.defaultRate?.toString() || '1');
    }
  }, [baseResult.rate, isModified, options.defaultRate]);

  const handleSetFieldValue = useCallback((value: string) => {
    setFieldValue(value);
    setIsModified(true);
  }, []);

  const resetToDefault = useCallback(() => {
    setIsModified(false);
    if (baseResult.rate !== null) {
      setFieldValue(baseResult.rate.toString());
    } else {
      setFieldValue(options.defaultRate?.toString() || '1');
    }
  }, [baseResult.rate, options.defaultRate]);

  return {
    ...baseResult,
    fieldValue,
    setFieldValue: handleSetFieldValue,
    resetToDefault,
    isModified,
  };
}

export default useExchangeRate;
