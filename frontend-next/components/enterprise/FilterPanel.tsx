/**
 * 🔍 FILTER PANEL
 * ================
 * Smart, collapsible filter panel for enterprise master data pages.
 * Renders a search input (always visible), plus advanced filter fields
 * driven by FieldMeta definitions.
 */

import React from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation';
import type { FieldMeta } from '../../lib/governance/types';

interface FilterPanelProps {
  /** Filter field definitions from PageConfig */
  fields: FieldMeta[];
  /** Current filter values keyed by field key */
  values: Record<string, any>;
  /** Callback when filter values change */
  onChange: (values: Record<string, any>) => void;
  /** Current search input value */
  searchValue: string;
  /** Callback when search value changes */
  onSearchChange: (value: string) => void;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Whether the advanced filter section is expanded */
  isExpanded: boolean;
  /** Whether to show the active/inactive toggle */
  showActiveToggle?: boolean;
  /** Current value of the active-only toggle */
  activeOnly?: boolean;
  /** Callback when active-only toggle changes */
  onActiveOnlyChange?: (value: boolean) => void;
  /** Reference data for select fields (from parent or API) */
  referenceData?: Record<string, Array<{ value: any; label: string; labelAr?: string; code?: string }>>;
}

export default function FilterPanel({
  fields,
  values,
  onChange,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  isExpanded,
  showActiveToggle = false,
  activeOnly = true,
  onActiveOnlyChange,
  referenceData = {},
}: FilterPanelProps) {
  const { t, locale } = useTranslation();

  const hasActiveFilters = Object.values(values).some(
    (v) => v !== undefined && v !== null && v !== ''
  );

  const handleFieldChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value });
  };

  const handleClearFilters = () => {
    const cleared: Record<string, any> = {};
    fields.forEach((f) => { cleared[f.key] = ''; });
    onChange(cleared);
  };

  const resolveOptions = (field: FieldMeta): Array<{ value: any; label: string }> => {
    // Check reference data first
    if (referenceData[field.key]) {
      return referenceData[field.key].map((opt) => ({
        value: opt.value,
        label: locale === 'ar' && opt.labelAr ? opt.labelAr : opt.label,
      }));
    }
    // Static options
    if (field.options) {
      return field.options.map((opt) => ({
        value: opt.value,
        label: locale === 'ar' && opt.labelAr ? opt.labelAr : opt.label,
      }));
    }
    if (field.dataSource?.options) {
      return field.dataSource.options.map((opt) => ({
        value: opt.value,
        label: locale === 'ar' && opt.labelAr ? opt.labelAr : opt.label,
      }));
    }
    return [];
  };

  const renderFilterField = (field: FieldMeta) => {
    const fieldValue = values[field.key] ?? '';
    const resolvedLabel = (field.labelKey ? t(field.labelKey) : '') || field.label;

    switch (field.type) {
      case 'select':
      case 'searchable-select':
      case 'reference': {
        const options = resolveOptions(field);
        return (
          <div key={field.key} className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {resolvedLabel}
            </label>
            <select
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700
                text-sm text-gray-900 dark:text-gray-100 px-3 py-2
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                dark:focus:ring-primary-400 dark:focus:border-primary-400
                transition-colors"
            >
              <option value="">{t('common.all') || 'All'}</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      }

      case 'date':
      case 'datetime':
        return (
          <div key={field.key} className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {resolvedLabel}
            </label>
            <input
              type="date"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700
                text-sm text-gray-900 dark:text-gray-100 px-3 py-2
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                dark:focus:ring-primary-400 dark:focus:border-primary-400
                transition-colors"
            />
          </div>
        );

      case 'number':
      case 'decimal':
      case 'currency':
      case 'percentage':
        return (
          <div key={field.key} className="min-w-[120px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {resolvedLabel}
            </label>
            <input
              type="number"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={(field.placeholderKey ? t(field.placeholderKey) : '') || field.placeholder || ''}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700
                text-sm text-gray-900 dark:text-gray-100 px-3 py-2
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                dark:focus:ring-primary-400 dark:focus:border-primary-400
                transition-colors"
            />
          </div>
        );

      case 'checkbox':
      case 'toggle':
        return (
          <div key={field.key} className="flex items-end min-w-[120px] pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!fieldValue}
                onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{resolvedLabel}</span>
            </label>
          </div>
        );

      default:
        return (
          <div key={field.key} className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {resolvedLabel}
            </label>
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={(field.placeholderKey ? t(field.placeholderKey) : '') || field.placeholder || ''}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700
                text-sm text-gray-900 dark:text-gray-100 px-3 py-2
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                dark:focus:ring-primary-400 dark:focus:border-primary-400
                transition-colors"
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Always-visible search row ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder || t('common.search') || 'Search...'}
            className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600
              bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              dark:focus:ring-primary-400 dark:focus:border-primary-400
              transition-colors"
            aria-label={t('common.search') || 'Search'}
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600
                dark:text-gray-500 dark:hover:text-gray-300"
              aria-label={t('common.clearSearch') || 'Clear search'}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Active only toggle */}
        {showActiveToggle && onActiveOnlyChange && (
          <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
            <div className="relative">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => onActiveOnlyChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 dark:bg-slate-600 rounded-full peer
                peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500
                peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800
                transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
                peer-checked:translate-x-4 transition-transform" />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('common.activeOnly') || 'Active only'}
            </span>
          </label>
        )}
      </div>

      {/* ── Collapsible advanced filters ── */}
      {isExpanded && fields.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              {t('common.advancedFilters') || 'Advanced Filters'}
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline focus:outline-none"
              >
                {t('common.clearAll') || 'Clear all'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {fields.map((field) => renderFilterField(field))}
          </div>
        </div>
      )}
    </div>
  );
}
