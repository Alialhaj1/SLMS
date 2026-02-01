/**
 * Translation Hook
 * Provides translation function with nested key support
 */

import { useLocale } from '../contexts/LocaleContext';
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';

type TranslationKeys = typeof enTranslations;
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<TranslationKeys>;

interface TranslationParams {
  [key: string]: string | number;
}

const translations = {
  en: enTranslations,
  ar: arTranslations,
};

function normalizeTranslationKey(key: string): string {
  // Defensive: strip common BiDi control marks + trim whitespace.
  // These can accidentally get introduced when copying Arabic text.
  return key.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
}

/**
 * Get nested value from object using dot notation
 * Supports both flattened keys (menu.dashboard.overview) and nested traversal
 * Example: "auth.login.title" => translations.auth.login.title
 */
function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj) return undefined;

  // Try direct flattened key first (e.g., "menu.dashboard.overview" as single key)
  if (Object.prototype.hasOwnProperty.call(obj, path)) {
    return obj[path];
  }

  // Try nested traversal, but check for keys with dots at each level
  // For "menu.dashboard.overview", try:
  // 1. obj.menu["dashboard.overview"]
  // 2. obj.menu.dashboard["overview"]
  // 3. obj.menu.dashboard.overview
  const parts = path.split('.');
  let current: any = obj;
  
  for (let i = 0; i < parts.length; i++) {
    if (!current) return undefined;
    
    // Try remaining path as a single key with dots
    const remainingPath = parts.slice(i).join('.');
    if (Object.prototype.hasOwnProperty.call(current, remainingPath)) {
      return current[remainingPath];
    }
    
    // Otherwise continue with next part
    const key = parts[i];
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Replace template variables in translation string
 * Example: "Hello {{name}}" with {name: "John"} => "Hello John"
 */
function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text;

  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }, text);
}

/**
 * Translation hook
 * Usage: const t = useTranslation();
 *        t('auth.login.title')
 *        t('profile.overview.permissionsCount', { count: 5 })
 */
export function useTranslation() {
  const { locale } = useLocale();

  function t(key: TranslationKey | string): string;
  function t(key: TranslationKey | string, params: TranslationParams): string;
  function t(key: TranslationKey | string, fallback: string): string;
  function t(key: TranslationKey | string, params: TranslationParams, fallback: string): string;
  function t(
    key: TranslationKey | string,
    arg2?: TranslationParams | string,
    arg3?: string
  ): string {
    const normalizedKey = typeof key === 'string' ? normalizeTranslationKey(key) : key;
    const params = typeof arg2 === 'string' ? undefined : arg2;
    const explicitFallback = typeof arg2 === 'string' ? arg2 : arg3;

    const localized = getNestedValue(translations[locale], normalizedKey);
    const localizedViaMasterNamespace =
      localized === undefined &&
      locale === 'ar' &&
      typeof normalizedKey === 'string' &&
      !normalizedKey.startsWith('master.')
        ? getNestedValue(translations[locale], `master.${normalizedKey}`)
        : undefined;
    const english = locale !== 'en' ? getNestedValue(translations.en, normalizedKey) : undefined;

    if (localized !== undefined) {
      return interpolate(localized, params);
    }

    if (localizedViaMasterNamespace !== undefined) {
      return interpolate(localizedViaMasterNamespace, params);
    }

    if (english !== undefined) {
      console.warn(`Translation missing for key "${normalizedKey}" in locale "${locale}"`);
      return interpolate(english, params);
    }

    if (explicitFallback) {
      console.warn(`Translation missing for key "${normalizedKey}"; using explicit fallback`);
      return interpolate(explicitFallback, params);
    }

    console.warn(`Translation missing for key "${normalizedKey}"`);
    return normalizedKey;
  }

  return { t, locale };
}

export default useTranslation;

