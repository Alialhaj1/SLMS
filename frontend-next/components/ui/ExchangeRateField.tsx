/**
 * ExchangeRateField Component
 * ===========================
 * حقل سعر الصرف القابل للتعديل مع الجلب التلقائي من API
 * 
 * @example
 * <ExchangeRateField
 *   currencyCode={selectedCurrency?.code}
 *   value={exchangeRate}
 *   onChange={setExchangeRate}
 *   label="سعر الصرف"
 * />
 */

import React, { useEffect, useRef } from 'react';
import { ArrowsRightLeftIcon, ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { useLocale } from '../../contexts/LocaleContext';

export interface ExchangeRateFieldProps {
  /** كود العملة المختارة (مثال: USD, EUR) */
  currencyCode: string | undefined | null;
  /** القيمة الحالية لسعر الصرف */
  value: string;
  /** دالة تغيير القيمة */
  onChange: (value: string) => void;
  /** تسمية الحقل */
  label?: string;
  /** تاريخ سعر الصرف */
  date?: string;
  /** نوع السعر */
  rateType?: 'standard' | 'buying' | 'selling' | 'customs';
  /** القيمة الافتراضية */
  defaultRate?: number;
  /** هل الحقل مطلوب */
  required?: boolean;
  /** هل الحقل معطل */
  disabled?: boolean;
  /** رسالة الخطأ */
  error?: string;
  /** نص المساعدة */
  helperText?: string;
  /** CSS classes إضافية */
  className?: string;
  /** إظهار العملة الأساسية */
  showBaseCurrency?: boolean;
  /** دالة تُستدعى عند تحميل السعر */
  onRateLoaded?: (rate: number | null, baseCurrency: string | null) => void;
  /** إخفاء الحقل إذا كانت العملة هي العملة الافتراضية للشركة */
  hideWhenBaseCurrency?: boolean;
}

export function ExchangeRateField({
  currencyCode,
  value,
  onChange,
  label,
  date,
  rateType = 'standard',
  defaultRate = 1,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  showBaseCurrency = true,
  onRateLoaded,
  hideWhenBaseCurrency = false,
}: ExchangeRateFieldProps) {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  
  const {
    rate,
    loading,
    error: apiError,
    data,
    baseCurrency,
    isBaseCurrency,
    refetch,
  } = useExchangeRate(currencyCode, {
    date,
    rateType,
    defaultRate,
    skip: !currencyCode,
  });

  // Track previous values to detect changes
  const prevCurrencyRef = useRef<string | null | undefined>(null);
  const prevRateRef = useRef<number | null>(null);

  // تحديث القيمة عند تحميل سعر الصرف من API
  useEffect(() => {
    // Only update if we have a new rate and it's different from previous
    if (rate !== null && rate !== prevRateRef.current && !loading) {
      prevRateRef.current = rate;
      onChange(rate.toString());
      
      // استدعاء callback
      if (onRateLoaded) {
        onRateLoaded(rate, baseCurrency);
      }
    }
  }, [rate, loading, onChange, onRateLoaded, baseCurrency]);

  // تعيين القيمة لـ 1 إذا كانت العملة الأساسية
  useEffect(() => {
    if (isBaseCurrency && !loading && currencyCode !== prevCurrencyRef.current) {
      prevCurrencyRef.current = currencyCode;
      onChange('1');
      if (onRateLoaded) {
        onRateLoaded(1, baseCurrency);
      }
    }
  }, [isBaseCurrency, loading, currencyCode, onChange, onRateLoaded, baseCurrency]);

  // تعيين القيمة لـ 1 عندما يكون hideWhenBaseCurrency مفعّل والعملة هي الأساسية
  useEffect(() => {
    if (hideWhenBaseCurrency && isBaseCurrency && value !== '1') {
      onChange('1');
    }
  }, [hideWhenBaseCurrency, isBaseCurrency, value, onChange]);

  // Labels
  const labels = {
    exchangeRate: isRTL ? 'سعر الصرف' : 'Exchange Rate',
    baseCurrency: isRTL ? 'العملة الأساسية' : 'Base Currency',
    loading: isRTL ? 'جاري التحميل...' : 'Loading...',
    noRate: isRTL ? 'لا يوجد سعر صرف، أدخل يدوياً' : 'No rate found, enter manually',
    refresh: isRTL ? 'تحديث' : 'Refresh',
    sameCurrency: isRTL ? 'نفس العملة الأساسية' : 'Same as base currency',
    fromApi: isRTL ? 'من النظام' : 'From system',
    reverse: isRTL ? 'محسوب عكسياً' : 'Reverse calculated',
  };

  const displayLabel = label || labels.exchangeRate;

  // إذا لم يتم اختيار عملة، لا نعرض الحقل
  if (!currencyCode) {
    return null;
  }

  // إذا كانت العملة هي العملة الافتراضية وتم تفعيل الإخفاء، لا نعرض الحقل
  if (hideWhenBaseCurrency && isBaseCurrency) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {displayLabel}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>

      {/* Input with icons */}
      <div className="relative">
        <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
          <ArrowsRightLeftIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="number"
          step="0.000001"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className={`
            block w-full rounded-lg border shadow-sm
            ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}
            ${error || apiError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-600'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
            }
            ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-1
            text-sm py-2
          `}
          placeholder={loading ? labels.loading : '1.0000'}
        />

        {/* Refresh button */}
        <div className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-2' : 'right-0 pr-2'} flex items-center`}>
          <button
            type="button"
            onClick={refetch}
            disabled={loading || disabled}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            title={labels.refresh}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info row */}
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        {/* Base currency badge */}
        {showBaseCurrency && baseCurrency && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            {labels.baseCurrency}: {baseCurrency}
          </span>
        )}

        {/* Same currency badge */}
        {isBaseCurrency && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            {labels.sameCurrency}
          </span>
        )}

        {/* Source badge */}
        {data?.source && !isBaseCurrency && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {data.is_reverse ? labels.reverse : labels.fromApi}
          </span>
        )}

        {/* No rate warning */}
        {!loading && rate === null && !isBaseCurrency && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <ExclamationCircleIcon className="h-3.5 w-3.5" />
            {labels.noRate}
          </span>
        )}
      </div>

      {/* Error message */}
      {(error || apiError) && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error || apiError}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && !apiError && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
}

export default ExchangeRateField;
