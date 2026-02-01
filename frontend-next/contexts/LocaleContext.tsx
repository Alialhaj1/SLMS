/**
 * Locale Context with RTL/LTR Support
 * Manages language preference and text direction
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { companyStore } from '../lib/companyStore';
import { translations } from '../locales/translations';

export type Locale = 'en' | 'ar';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

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

  // Initialize locale on mount
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
    };

    bootstrap();
  }, []);

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

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    updateHtmlAttributes(newLocale);
  };

  // Translation function with nested key support
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const isRTL = locale === 'ar';

  // Prevent flash of wrong direction during SSR
  if (!mounted) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir, isRTL, t }}>
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
      setLocale: () => {},
      dir: 'ltr' as const,
      isRTL: false,
      t: (key: string) => key,
    };
  }
  return context;
};
