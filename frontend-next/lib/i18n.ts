/**
 * Translation Utilities
 * Functions for loading and managing JSON translation files
 */

import { Locale } from '../contexts/LocaleContext';

// Static imports — avoids webpack dynamic-import cache staleness
import enCommon from '../locales/en/common.json';
import enShipments from '../locales/en/shipments.json';
import enAccounting from '../locales/en/accounting.json';
import enErrors from '../locales/en/errors.json';
import enTooltips from '../locales/en/tooltips.json';
import arCommon from '../locales/ar/common.json';
import arShipments from '../locales/ar/shipments.json';
import arAccounting from '../locales/ar/accounting.json';
import arErrors from '../locales/ar/errors.json';
import arTooltips from '../locales/ar/tooltips.json';

// Translation file types
type TranslationFile = 'common' | 'shipments' | 'accounting' | 'errors' | 'tooltips';

// Pre-built translation map (no async loading needed)
const staticTranslations: Record<Locale, Record<TranslationFile, any>> = {
  en: {
    common: enCommon,
    shipments: enShipments,
    accounting: enAccounting,
    errors: enErrors,
    tooltips: enTooltips,
  },
  ar: {
    common: arCommon,
    shipments: arShipments,
    accounting: arAccounting,
    errors: arErrors,
    tooltips: arTooltips,
  },
};

/**
 * Load a specific translation file for a locale
 */
export async function loadTranslationFile(locale: Locale, file: TranslationFile): Promise<any> {
  return staticTranslations[locale]?.[file] ?? {};
}

/**
 * Load all translation files for a locale
 */
export async function loadAllTranslations(locale: Locale): Promise<Record<string, any>> {
  return { ...staticTranslations[locale] };
}

/**
 * Get a nested value from an object using dot notation
 */
export function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Replace placeholders in a string with values
 * Example: "Hello {{name}}" with {name: "John"} becomes "Hello John"
 */
export function replacePlaceholders(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key]?.toString() || match;
  });
}

/**
 * Pluralization helper for Arabic and English
 */
export function pluralize(
  locale: Locale,
  count: number,
  singular: string,
  plural: string,
  dual?: string
): string {
  if (locale === 'ar') {
    // Arabic pluralization rules
    if (count === 0) return plural;
    if (count === 1) return singular;
    if (count === 2 && dual) return dual;
    if (count >= 3 && count <= 10) return plural;
    return plural;
  } else {
    // English pluralization
    return count === 1 ? singular : plural;
  }
}

/**
 * Format numbers according to locale conventions
 */
export function formatNumber(locale: Locale, number: number): string {
  if (locale === 'ar') {
    // Arabic number formatting
    return new Intl.NumberFormat('ar-SA').format(number);
  } else {
    // English number formatting
    return new Intl.NumberFormat('en-US').format(number);
  }
}

/**
 * Format currency according to locale conventions
 */
export function formatCurrency(locale: Locale, amount: number, currency: string = 'SAR'): string {
  if (locale === 'ar') {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}

/**
 * Format date according to locale conventions
 */
export function formatDate(locale: Locale, date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (locale === 'ar') {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } else {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  }
}

/**
 * Enhanced translation function with context support
 */
export interface TranslationContext {
  translations: Record<string, any>;
  locale: Locale;
}

export function createTranslationFunction(context: TranslationContext) {
  return function t(key: string, values?: Record<string, string | number>): string {
    // Try to get the value from loaded translations (only accept string results)
    let value = getNestedValue(context.translations, key);
    if (value !== undefined && typeof value !== 'string') {
      value = undefined; // Skip non-string values (e.g., entire translation file objects)
    }
    
    // If not found, try to parse the key as file.path
    if (!value) {
      const parts = key.split('.');
      if (parts.length >= 2) {
        const [file, ...pathParts] = parts;
        const filePath = pathParts.join('.');
        const found = getNestedValue(context.translations[file], filePath);
        if (typeof found === 'string') value = found;
      }
    }

    // If still not found, search within each translation file's content
    if (!value) {
      for (const fileKey of Object.keys(context.translations)) {
        const fileData = context.translations[fileKey];
        if (fileData && typeof fileData === 'object') {
          const found = getNestedValue(fileData, key);
          if (typeof found === 'string') {
            value = found;
            break;
          }
        }
      }
    }
    
    // If still not found, return the key
    if (!value) {
      console.warn(`Translation key not found: ${key} for locale: ${context.locale}`);
      return key;
    }
    
    // Replace placeholders if values are provided
    if (values && typeof value === 'string') {
      return replacePlaceholders(value, values);
    }
    
    return typeof value === 'string' ? value : key;
  };
}

/**
 * Validation message helper
 */
export function getValidationMessage(
  context: TranslationContext,
  field: string,
  rule: string,
  values?: Record<string, string | number>
): string {
  // Try specific field validation message first
  let key = `errors.validation.${field}.${rule}`;
  let message = getNestedValue(context.translations, key);
  
  // If not found, try generic validation message
  if (!message) {
    key = `errors.validation.${rule}`;
    message = getNestedValue(context.translations, key);
  }
  
  if (!message) {
    return `Validation error: ${field} ${rule}`;
  }
  
  // Replace field name and other values
  const allValues = { field, ...values };
  return typeof message === 'string' ? replacePlaceholders(message, allValues) : message;
}

/**
 * Tooltip helper
 */
export function getTooltip(context: TranslationContext, key: string): string {
  const tooltipKey = `tooltips.${key}`;
  const tooltip = getNestedValue(context.translations, tooltipKey);
  return typeof tooltip === 'string' ? tooltip : '';
}