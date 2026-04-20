/**
 * Enhanced Locale Context with JSON-based I18n Support
 * Manages language preference, text direction, and translations
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';
import { companyStore } from '../lib/companyStore';
import { 
  loadAllTranslations,
  createTranslationFunction,
  getValidationMessage,
  getTooltip,
  formatNumber,
  formatCurrency,
  formatDate,
  pluralize,
  type TranslationContext
} from '../lib/i18n';

export type Locale = 'en' | 'ar';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  loading: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  tv: (field: string, rule: string, values?: Record<string, string | number>) => string; // validation
  tt: (key: string) => string; // tooltip
  tn: (number: number) => string; // number formatting
  tc: (amount: number, currency?: string) => string; // currency formatting
  td: (date: Date | string) => string; // date formatting
  tp: (count: number, singular: string, plural: string, dual?: string) => string; // pluralization
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState<Record<string, any>>({});

  // Create translation context
  const translationContext: TranslationContext = {
    translations,
    locale
  };

  // Detect browser language
  const detectBrowserLanguage = (): Locale => {
    if (typeof window === 'undefined') return 'en';
    
    const browserLang = navigator.language || (navigator as any).userLanguage;
    
    // Check for Arabic language codes
    if (browserLang.startsWith('ar')) {
      return 'ar';
    }
    
    // Default to English
    return 'en';
  };

  // Load translations for current locale
  const loadTranslations = useCallback(async (targetLocale: Locale) => {
    setLoading(true);
    try {
      const newTranslations = await loadAllTranslations(targetLocale);
      setTranslations(newTranslations);
    } catch (error) {
      console.error(`Failed to load translations for ${targetLocale}:`, error);
      // Fallback to empty translations
      setTranslations({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize locale and translations on mount
  useEffect(() => {
    setMounted(true);
    
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    const bootstrap = async () => {
      // Local preference (fast path)
      const savedLocale = localStorage.getItem('locale') as Locale | null;
      if (savedLocale && (savedLocale === 'en' || savedLocale === 'ar')) {
        setLocaleState(savedLocale);
        updateHtmlAttributes(savedLocale);
        await loadTranslations(savedLocale);
        return;
      }

      // Prefer company default language from backend (persistent)
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      if (token && companyId) {
        try {
          const result = await apiClient.get<{ success: boolean; data: Array<{ code: string; is_default: boolean }> }>(
            '/api/settings/languages',
            { cache: 'no-store' }
          );
          const defaultLang = result.data?.find((x) => x.is_default)?.code;
          if (defaultLang === 'en' || defaultLang === 'ar') {
            setLocaleState(defaultLang);
            localStorage.setItem('locale', defaultLang);
            updateHtmlAttributes(defaultLang);
            await loadTranslations(defaultLang);
            return;
          }
        } catch {
          // Ignore (permissions/network) and fallback
        }
      }

      // Browser detection fallback
      const detectedLocale = detectBrowserLanguage();
      setLocaleState(detectedLocale);
      localStorage.setItem('locale', detectedLocale);
      updateHtmlAttributes(detectedLocale);
      await loadTranslations(detectedLocale);
    };

    bootstrap();
  }, [loadTranslations]);

  // Update HTML attributes for RTL/LTR
  const updateHtmlAttributes = (newLocale: Locale) => {
    if (typeof window === 'undefined') return;
    
    const html = document.documentElement;
    const dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    
    html.setAttribute('lang', newLocale);
    html.setAttribute('dir', dir);
    
    // Update body class for RTL-specific styling
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(dir);
  };

  const setLocale = async (newLocale: Locale) => {
    if (newLocale === locale) return; // Avoid unnecessary updates
    
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    updateHtmlAttributes(newLocale);
    await loadTranslations(newLocale);
  };

  // Translation functions
  const t = createTranslationFunction(translationContext);
  
  const tv = (field: string, rule: string, values?: Record<string, string | number>) =>
    getValidationMessage(translationContext, field, rule, values);
  
  const tt = (key: string) => getTooltip(translationContext, key);
  
  const tn = (number: number) => formatNumber(locale, number);
  
  const tc = (amount: number, currency?: string) => formatCurrency(locale, amount, currency);
  
  const td = (date: Date | string) => formatDate(locale, date);
  
  const tp = (count: number, singular: string, plural: string, dual?: string) =>
    pluralize(locale, count, singular, plural, dual);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const isRTL = locale === 'ar';

  // Prevent flash of wrong direction during SSR
  if (!mounted) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ 
      locale, 
      setLocale, 
      dir, 
      isRTL, 
      loading,
      t, 
      tv, 
      tt, 
      tn, 
      tc, 
      td, 
      tp 
    }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    // Return default values for SSR compatibility
    return {
      locale: 'en' as Locale,
      setLocale: async () => {},
      dir: 'ltr' as const,
      isRTL: false,
      loading: false,
      t: (key: string) => key,
      tv: (field: string, rule: string) => `${field}: ${rule}`,
      tt: (key: string) => '',
      tn: (number: number) => number.toString(),
      tc: (amount: number, currency?: string) => `${currency || 'SAR'} ${amount}`,
      td: (date: Date | string) => new Date(date).toLocaleDateString(),
      tp: (count: number, singular: string, plural: string) => count === 1 ? singular : plural,
    };
  }
  return context;
};

/**
 * Hook for validation messages with better ergonomics
 */
export const useValidation = () => {
  const { tv } = useLocale();
  
  return {
    /**
     * Get validation message for a field
     * @param field Field name
     * @param rule Validation rule (required, email, minLength, etc.)
     * @param values Optional values for placeholders
     */
    getMessage: tv,
    
    /**
     * Common validation messages
     */
    required: (field: string) => tv(field, 'required'),
    email: (field: string = 'email') => tv(field, 'invalid'),
    minLength: (field: string, min: number) => tv(field, 'minLength', { min }),
    maxLength: (field: string, max: number) => tv(field, 'maxLength', { max }),
    positive: (field: string) => tv(field, 'positive'),
    invalid: (field: string) => tv(field, 'invalid'),
  };
};

/**
 * Hook for formatting utilities
 */
export const useFormatter = () => {
  const { tn, tc, td, tp, locale } = useLocale();
  
  return {
    number: tn,
    currency: tc,
    date: td,
    pluralize: tp,
    locale,
    
    /**
     * Format percentage
     */
    percentage: (value: number) => `${tn(value)}%`,
    
    /**
     * Format file size
     */
    fileSize: (bytes: number) => {
      const sizes = locale === 'ar' 
        ? ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت']
        : ['B', 'KB', 'MB', 'GB'];
      
      if (bytes === 0) return `0 ${sizes[0]}`;
      
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      const size = (bytes / Math.pow(1024, i)).toFixed(1);
      
      return `${tn(parseFloat(size))} ${sizes[i]}`;
    },
    
    /**
     * Format relative time (e.g., "2 days ago")
     */
    relativeTime: (date: Date | string) => {
      const now = new Date();
      const targetDate = new Date(date);
      const diffMs = now.getTime() - targetDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (locale === 'ar') {
        if (diffDays === 0) return 'اليوم';
        if (diffDays === 1) return 'أمس';
        if (diffDays < 7) return `منذ ${tn(diffDays)} أيام`;
        if (diffDays < 30) return `منذ ${tn(Math.floor(diffDays / 7))} أسابيع`;
        return td(date);
      } else {
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${tn(diffDays)} days ago`;
        if (diffDays < 30) return `${tn(Math.floor(diffDays / 7))} weeks ago`;
        return td(date);
      }
    }
  };
};
