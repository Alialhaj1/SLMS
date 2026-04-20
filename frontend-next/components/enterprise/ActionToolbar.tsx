/**
 * 🔧 ACTION TOOLBAR
 * ===================
 * Permission-aware toolbar for master data pages.
 * Renders action buttons (Create, Refresh, Export), filter/column toggles,
 * and bulk operation indicators.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
  ViewColumnsIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import type { ActionMeta } from '../../lib/governance/types';

interface ActionToolbarProps {
  /** Configured actions from PageConfig */
  actions: ActionMeta[];
  /** Callback when an action is triggered */
  onAction: (actionKey: string) => void;
  /** Number of currently selected records (for bulk ops) */
  selectedCount?: number;
  /** Whether the data grid is loading */
  loading?: boolean;
  /** Permission prefix, e.g. 'master:countries' */
  permissionPrefix: string;
  /** Whether to show the filter toggle button */
  showFilterToggle?: boolean;
  /** Whether the filter panel is currently active/open */
  filtersActive?: boolean;
  /** Callback to toggle the filter panel */
  onToggleFilters?: () => void;
  /** Whether to show the column visibility toggle */
  showColumnToggle?: boolean;
  /** Callback to toggle column picker */
  onToggleColumns?: () => void;
}

export default function ActionToolbar({
  actions,
  onAction,
  selectedCount = 0,
  loading = false,
  permissionPrefix,
  showFilterToggle = false,
  filtersActive = false,
  onToggleFilters,
  showColumnToggle = false,
  onToggleColumns,
}: ActionToolbarProps) {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    if (exportOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  const canCreate = hasPermission(`${permissionPrefix}:create`);
  const canEdit = hasPermission(`${permissionPrefix}:edit`);
  const canExport = hasPermission(`${permissionPrefix}:view`);
  const canDelete = hasPermission(`${permissionPrefix}:delete`);

  // Separate toolbar actions from row-level or bulk-only actions
  const toolbarActions = actions.filter(
    (a) => a.position.includes('toolbar') && (!a.permission || hasPermission(a.permission))
  );

  const bulkActions = actions.filter(
    (a) => a.position.includes('bulk') && (!a.permission || hasPermission(a.permission))
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm px-4 py-3">
      {/* Left side: primary actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Create button */}
        {canCreate && (
          <button
            onClick={() => onAction('create')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg
              bg-primary-600 text-white hover:bg-primary-700
              dark:bg-primary-500 dark:hover:bg-primary-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              dark:focus:ring-offset-slate-800"
            aria-label={t('common.create') || 'Create'}
            title={`${t('common.create') || 'Create'} (Ctrl+N)`}
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.create') || 'Create'}</span>
          </button>
        )}

        {/* Refresh button */}
        <button
          onClick={() => onAction('refresh')}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
            text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700
            hover:bg-gray-200 dark:hover:bg-slate-600
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
            dark:focus:ring-offset-slate-800"
          aria-label={t('common.refresh') || 'Refresh'}
          title={`${t('common.refresh') || 'Refresh'} (Ctrl+R)`}
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{t('common.refresh') || 'Refresh'}</span>
        </button>

        {/* Export dropdown */}
        {canExport && (
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700
                hover:bg-gray-200 dark:hover:bg-slate-600
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                dark:focus:ring-offset-slate-800"
              aria-label={t('common.export') || 'Export'}
              title={t('common.export') || 'Export data'}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.export') || 'Export'}</span>
              <ChevronDownIcon className="w-3 h-3" />
            </button>
            {exportOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-20">
                <button
                  onClick={() => { onAction('export-xlsx'); setExportOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <TableCellsIcon className="w-4 h-4" />
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => { onAction('export-csv'); setExportOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  CSV (.csv)
                </button>
                <button
                  onClick={() => { onAction('export-json'); setExportOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <CodeBracketIcon className="w-4 h-4" />
                  JSON (.json)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Import button - visible if user can create OR edit */}
        {(canCreate || canEdit) && (
          <button
            onClick={() => onAction('import')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
              text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20
              hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2
              dark:focus:ring-offset-slate-800"
            aria-label={t('common.import') || 'Import'}
            title={t('import.importTooltip') || 'Import data from Excel/CSV file'}
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.import') || 'Import'}</span>
          </button>
        )}

        {/* Custom toolbar actions */}
        {toolbarActions
          .filter((a) => a.key !== 'create' && a.key !== 'refresh' && !a.key.startsWith('export'))
          .map((action) => (
            <button
              key={action.key}
              onClick={() => onAction(action.key)}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed
                ${action.variant === 'danger'
                  ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 focus:ring-red-500'
                  : action.variant === 'primary'
                  ? 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:ring-primary-500'
                  : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 focus:ring-gray-400'
                }`}
              aria-label={(action.labelKey ? t(action.labelKey) : '') || action.label}
            >
              <span>{(action.labelKey ? t(action.labelKey) : '') || action.label}</span>
            </button>
          ))}

        {/* Bulk selection indicator */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-slate-600">
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {selectedCount} {t('common.selected') || 'selected'}
            </span>
            {bulkActions.map((action) => (
              <button
                key={action.key}
                onClick={() => onAction(action.key)}
                disabled={loading}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md
                  transition-colors disabled:opacity-50
                  ${action.isDangerous || action.variant === 'danger'
                    ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40'
                    : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
              >
                {(action.labelKey ? t(action.labelKey) : '') || action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right side: toggle buttons */}
      <div className="flex items-center gap-2">
        {/* Filter toggle */}
        {showFilterToggle && (
          <button
            onClick={onToggleFilters}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
              transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
              dark:focus:ring-offset-slate-800
              ${filtersActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 ring-1 ring-primary-300 dark:ring-primary-700'
                : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            aria-label={t('common.filters') || 'Filters'}
            aria-pressed={filtersActive}
            title={`${t('common.filters') || 'Filters'} (Ctrl+F)`}
          >
            <FunnelIcon className="w-4 h-4" />
            <span className="hidden md:inline">{t('common.filters') || 'Filters'}</span>
          </button>
        )}

        {/* Column visibility toggle */}
        {showColumnToggle && (
          <button
            onClick={onToggleColumns}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
              text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700
              hover:bg-gray-200 dark:hover:bg-slate-600
              transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
              dark:focus:ring-offset-slate-800"
            aria-label={t('common.columns', 'Columns')}
            title={t('common.columns', 'Columns')}
          >
            <ViewColumnsIcon className="w-4 h-4" />
            <span className="hidden md:inline">{t('common.columns', 'Columns')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
