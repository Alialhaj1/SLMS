/**
 * Enhanced Translation Utilities
 * Pluralization, Date/Time formatting, and Number formatting
 */

import { useLocale } from '../contexts/LocaleContext';
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';

const translations = {
  en: enTranslations,
  ar: arTranslations,
};

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Replace template variables in translation string
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;

  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }, text);
}

/**
 * Pluralization rules
 * English: 1 = singular, other = plural
 * Arabic: 0, 1, 2, 3-10, 11+ have different forms
 */
function getPluralForm(count: number, locale: 'en' | 'ar'): string {
  if (locale === 'en') {
    return count === 1 ? 'one' : 'other';
  }

  // Arabic pluralization rules
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  if (count === 2) return 'two';
  if (count >= 3 && count <= 10) return 'few';
  if (count >= 11 && count <= 99) return 'many';
  return 'other';
}

/**
 * Enhanced translation hook with utilities
 */
export function useTranslation() {
  const { locale } = useLocale();

  /**
   * Basic translation function
   */
  const t = (
    key: string,
    paramsOrFallback?: Record<string, string | number> | string,
    maybeParams?: Record<string, string | number>
  ): string => {
    const fallbackText = typeof paramsOrFallback === 'string' ? paramsOrFallback : undefined;
    const params = (typeof paramsOrFallback === 'object' ? paramsOrFallback : maybeParams) as
      | Record<string, string | number>
      | undefined;

    const translation = getNestedValue(translations[locale], key);

    if (!translation && locale !== 'en') {
      const fallbackTranslation = getNestedValue(translations.en, key);
      if (fallbackTranslation) {
        return interpolate(fallbackTranslation, params);
      }
    }

    if (!translation) {
      return fallbackText ?? key;
    }

    return interpolate(translation, params);
  };

  /**
   * Pluralization function
   * Usage: tp('items', 5) -> "5 items" or "5 عناصر"
   */
  const tp = (key: string, count: number, params?: Record<string, string | number>): string => {
    const pluralForm = getPluralForm(count, locale);
    const pluralKey = `${key}.${pluralForm}`;
    
    return t(pluralKey, { count, ...params });
  };

  /**
   * Format date according to locale
   */
  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    };

    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', defaultOptions).format(dateObj);
  };

  /**
   * Format time according to locale
   */
  const formatTime = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    };

    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', defaultOptions).format(dateObj);
  };

  /**
   * Format date and time together
   */
  const formatDateTime = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    };

    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', defaultOptions).format(dateObj);
  };

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  const formatRelativeTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return t('common.timeAgo.justNow');
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return t('common.timeAgo.minutesAgo', { count: diffInMinutes });
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return t('common.timeAgo.hoursAgo', { count: diffInHours });
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return t('common.timeAgo.daysAgo', { count: diffInDays });
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return t('common.timeAgo.weeksAgo', { count: diffInWeeks });
    }

    // For longer periods, show formatted date
    return formatDate(dateObj);
  };

  /**
   * Format numbers according to locale
   */
  const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', options).format(num);
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  /**
   * Format percentage
   */
  const formatPercent = (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  };

  return {
    t,
    tp,
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    formatNumber,
    formatCurrency,
    formatPercent,
    locale,
  };
}

export default useTranslation;
