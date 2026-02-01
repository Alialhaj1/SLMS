/**
 * SearchableSelect Component
 * ==========================
 * A select dropdown with search/filter capability.
 * Supports Arabic and English with RTL/LTR.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface SelectOption {
  value: string | number;
  label: string;
  labelAr?: string;
  code?: string;
  searchText?: string; // Additional text to search in
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  locale?: string;
  className?: string;
  name?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  label,
  required,
  disabled,
  error,
  locale = 'en',
  className,
  name,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter((opt) => {
      const label = (locale === 'ar' && opt.labelAr ? opt.labelAr : opt.label).toLowerCase();
      const code = (opt.code || '').toLowerCase();
      const extra = (opt.searchText || '').toLowerCase();
      return label.includes(lowerSearch) || code.includes(lowerSearch) || extra.includes(lowerSearch);
    });
  }, [options, search, locale]);

  // Get selected option label
  const selectedOption = options.find((o) => String(o.value) === String(value));
  const displayLabel = selectedOption
    ? (locale === 'ar' && selectedOption.labelAr ? selectedOption.labelAr : selectedOption.label)
    : placeholder;

  const handleSelect = (optValue: string | number) => {
    onChange(String(optValue));
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main trigger */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={clsx(
          'w-full px-3 py-2 text-left border rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer',
          'bg-white dark:bg-slate-700 text-slate-900 dark:text-white',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-indigo-500'
        )}
      >
        <span className={clsx(!selectedOption && 'text-slate-400')}>
          {selectedOption?.code ? `${selectedOption.code} - ${displayLabel}` : displayLabel}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
            >
              <XMarkIcon className="h-4 w-4 text-slate-400" />
            </button>
          )}
          <ChevronDownIcon className={clsx('h-4 w-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-72 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                {locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const optLabel = locale === 'ar' && opt.labelAr ? opt.labelAr : opt.label;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={clsx(
                      'w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                      isSelected && 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    )}
                  >
                    {opt.code && (
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 min-w-[60px]">
                        {opt.code}
                      </span>
                    )}
                    <span className="flex-1 truncate">{optLabel}</span>
                    {isSelected && (
                      <span className="text-indigo-600 dark:text-indigo-400">✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
