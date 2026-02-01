/**
 * Reusable Language Selector Component
 * Can be used in Header, Profile, or any other page
 */

import { useState, useRef, useEffect } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { useTranslation } from '../../hooks/useTranslation';
import { GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'inline' | 'compact';
  showLabel?: boolean;
  onLanguageChange?: (locale: 'en' | 'ar') => void;
}

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
] as const;

export default function LanguageSelector({ 
  variant = 'dropdown', 
  showLabel = false,
  onLanguageChange 
}: LanguageSelectorProps) {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageChange = (newLocale: 'en' | 'ar') => {
    setLocale(newLocale);
    setIsOpen(false);
    onLanguageChange?.(newLocale);
  };

  const currentLanguage = languages.find(lang => lang.code === locale)!;

  // Dropdown variant (for header)
  if (variant === 'dropdown') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
          aria-label={t('common.settings')}
          aria-expanded={isOpen}
        >
          <GlobeAltIcon className="w-5 h-5" />
          {showLabel && (
            <span className="text-sm font-medium hidden sm:inline">
              {currentLanguage.code.toUpperCase()}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                  locale === lang.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="font-medium flex-1">{lang.nativeName}</span>
                {locale === lang.code && (
                  <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Compact variant (toggle button)
  if (variant === 'compact') {
    const otherLanguage = languages.find(lang => lang.code !== locale)!;
    return (
      <button
        onClick={() => handleLanguageChange(otherLanguage.code)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
        title={`Switch to ${otherLanguage.name}`}
      >
        <span>{otherLanguage.flag}</span>
        <span>{otherLanguage.code.toUpperCase()}</span>
      </button>
    );
  }

  // Inline variant (for profile/settings pages)
  return (
    <div className="space-y-3">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
            locale === lang.code
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {lang.nativeName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {lang.name}
                </div>
              </div>
            </div>
            {locale === lang.code && (
              <CheckIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
