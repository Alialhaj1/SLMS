/**
 * ============================================================================
 * ENHANCED DATA TABLE - Arabic Specification Implementation
 * ============================================================================
 * Features:
 * - Sortable columns with visual indicators
 * - Advanced filtering (text, select, date, number ranges)
 * - Row selection (single/multi) with bulk actions
 * - Pagination with customizable page sizes
 * - Loading states and empty states
 * - Responsive design with mobile card view
 * - RTL support with proper Arabic typography
 * - Row-level actions with permission checking
 * - Export functionality
 * - Column visibility controls
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { usePermissions } from '../../hooks/usePermissions.enhanced';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TableColumn<T = any> {
  key: string;
  label: string;
  label_ar?: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'status' | 'custom';
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
  filter?: {
    type: 'text' | 'select' | 'date-range' | 'number-range' | 'boolean';
    options?: { value: any; label: string; label_ar?: string }[];
    placeholder?: string;
    placeholder_ar?: string;
  };
  hidden?: boolean;
  exportable?: boolean;
  required?: boolean;
  permission?: string; // Permission required to view this column
}

export interface TableAction<T = any> {
  id: string;
  label: string;
  label_ar?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: T, index: number) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  permission?: string;
  condition?: (row: T) => boolean;
  tooltip?: string;
  tooltip_ar?: string;
  loading?: boolean;
}

export interface BulkAction<T = any> {
  id: string;
  label: string;
  label_ar?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (selectedRows: T[]) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  permission?: string;
  condition?: (selectedRows: T[]) => boolean;
  confirmMessage?: string;
  confirmMessage_ar?: string;
}

export interface TableFilter {
  [key: string]: any;
}

export interface TableSort {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
}

interface EnhancedTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  error_ar?: string;
  
  // Selection
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selectedRows: T[]) => void;
  rowKey?: keyof T | ((row: T) => string | number);
  
  // Actions
  actions?: TableAction<T>[];
  bulkActions?: BulkAction<T>[];
  
  // Filtering & Sorting
  filters?: TableFilter;
  onFiltersChange?: (filters: TableFilter) => void;
  sort?: TableSort;
  onSortChange?: (sort: TableSort) => void;
  
  // Pagination
  pagination?: TablePagination;
  onPaginationChange?: (pagination: TablePagination) => void;
  pageSizeOptions?: number[];
  
  // Export
  exportable?: boolean;
  onExport?: (data: T[], columns: TableColumn<T>[]) => void;
  exportPermission?: string;
  
  // Customization
  title?: string;
  title_ar?: string;
  emptyMessage?: string;
  emptyMessage_ar?: string;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  maxHeight?: string | number;
  stickyHeader?: boolean;
  
  // Advanced
  virtualScroll?: boolean;
  expandableRows?: boolean;
  renderExpandedRow?: (row: T, index: number) => React.ReactNode;
}

// ============================================================================
// Main Component
// ============================================================================

export default function EnhancedTable<T = any>({
  data,
  columns,
  loading = false,
  error,
  error_ar,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowKey = 'id',
  actions = [],
  bulkActions = [],
  filters = {},
  onFiltersChange,
  sort,
  onSortChange,
  pagination,
  onPaginationChange,
  pageSizeOptions = [10, 25, 50, 100],
  exportable = false,
  onExport,
  exportPermission,
  title,
  title_ar,
  emptyMessage = 'No data available',
  emptyMessage_ar = 'لا توجد بيانات متاحة',
  className = '',
  rowClassName,
  maxHeight,
  stickyHeader = false,
  virtualScroll = false,
  expandableRows = false,
  renderExpandedRow,
}: EnhancedTableProps<T>) {
  const { locale, t } = useLocale();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';
  
  // Local state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [localFilters, setLocalFilters] = useState<TableFilter>(filters);
  
  // Helper functions
  const getRowKey = useCallback((row: T): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return row[rowKey] as string | number;
  }, [rowKey]);
  
  const isRowSelected = useCallback((row: T): boolean => {
    const key = getRowKey(row);
    return selectedRows.some(selectedRow => getRowKey(selectedRow) === key);
  }, [selectedRows, getRowKey]);
  
  // Filter visible columns based on permissions
  const visibleColumns = useMemo(() => {
    return columns
      .filter(column => !column.hidden)
      .filter(column => !column.permission || hasPermission(column.permission))
      .filter(column => columnVisibility[column.key] !== false);
  }, [columns, hasPermission, columnVisibility]);
  
  // Filter visible actions based on permissions
  const visibleActions = useMemo(() => {
    return actions.filter(action => !action.permission || hasPermission(action.permission));
  }, [actions, hasPermission]);
  
  // Filter visible bulk actions based on permissions and conditions
  const visibleBulkActions = useMemo(() => {
    return bulkActions.filter(action => {
      if (action.permission && !hasPermission(action.permission)) return false;
      if (action.condition && !action.condition(selectedRows)) return false;
      return true;
    });
  }, [bulkActions, hasPermission, selectedRows]);
  
  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    
    if (selectedRows.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data);
    }
  }, [data, selectedRows, onSelectionChange]);
  
  const handleSelectRow = useCallback((row: T) => {
    if (!onSelectionChange) return;
    
    const key = getRowKey(row);
    const isSelected = selectedRows.some(selectedRow => getRowKey(selectedRow) === key);
    
    if (isSelected) {
      onSelectionChange(selectedRows.filter(selectedRow => getRowKey(selectedRow) !== key));
    } else {
      onSelectionChange([...selectedRows, row]);
    }
  }, [selectedRows, onSelectionChange, getRowKey]);
  
  // Sorting handler
  const handleSort = useCallback((column: string) => {
    if (!onSortChange) return;
    
    const newDirection = sort?.column === column && sort?.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column, direction: newDirection });
  }, [sort, onSortChange]);
  
  // Filter handlers
  const handleFilterChange = useCallback((columnKey: string, value: any) => {
    const newFilters = { ...localFilters, [columnKey]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [localFilters, onFiltersChange]);
  
  // Export handler
  const handleExport = useCallback(() => {
    if (!onExport) return;
    onExport(data, visibleColumns);
  }, [data, visibleColumns, onExport]);
  
  // Render error state
  if (error || error_ar) {
    const displayError = isRTL ? (error_ar || error) : error;
    return (
      <div className="slms-table-error">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            {t('error.loadingData', 'Error loading data')}
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400">{displayError}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`slms-enhanced-table ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Table Header Actions */}
      <div className="slms-table-header">
        <div className="flex items-center justify-between mb-4">
          {/* Title & Selection Info */}
          <div className="flex items-center gap-4">
            {title && (
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {isRTL ? (title_ar || title) : title}
              </h3>
            )}
            
            {selectable && selectedRows.length > 0 && (
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('table.selectedCount', `${selectedRows.length} selected`, { count: selectedRows.length })}
              </span>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Bulk Actions */}
            {visibleBulkActions.length > 0 && selectedRows.length > 0 && (
              <div className="flex items-center gap-2 mr-4 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                {visibleBulkActions.map(action => {
                  const ActionIcon = action.icon;
                  const displayLabel = isRTL ? (action.label_ar || action.label) : action.label;
                  
                  return (
                    <Button
                      key={action.id}
                      onClick={() => action.onClick(selectedRows)}
                      variant={action.variant || 'primary'}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      {ActionIcon && <ActionIcon className="w-4 h-4" />}
                      {displayLabel}
                    </Button>
                  );
                })}
              </div>
            )}
            
            {/* Export Button */}
            {exportable && (!exportPermission || hasPermission(exportPermission)) && (
              <Button
                onClick={handleExport}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {t('table.export', 'Export')}
              </Button>
            )}
            
            {/* Column Settings */}
            <Button
              onClick={() => setShowColumnSettings(true)}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <EyeIcon className="w-4 h-4" />
              {t('table.columns', 'Columns')}
            </Button>
          </div>
        </div>
        
        {/* Filters Row */}
        {visibleColumns.some(col => col.filterable) && (
          <div className="slms-table-filters">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              {visibleColumns
                .filter(col => col.filterable)
                .map(column => (
                  <TableFilter
                    key={column.key}
                    column={column}
                    value={localFilters[column.key]}
                    onChange={(value) => handleFilterChange(column.key, value)}
                    locale={locale}
                  />
                ))
              }
            </div>
          </div>
        )}
      </div>
      
      {/* Table Container */}
      <div className="slms-table-container" style={{ maxHeight }}>
        <div className="overflow-x-auto">
          <table className="slms-table">
            {/* Table Head */}
            <thead className={stickyHeader ? 'sticky top-0' : ''}>
              <tr>
                {/* Selection Column */}
                {selectable && (
                  <th className="slms-table-header-cell w-12">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="slms-checkbox"
                        checked={selectedRows.length === data.length && data.length > 0}
                        onChange={handleSelectAll}
                      />
                    </div>
                  </th>
                )}
                
                {/* Data Columns */}
                {visibleColumns.map(column => (
                  <th
                    key={column.key}
                    className={`slms-table-header-cell ${
                      column.sortable ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800' : ''
                    }`}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                      textAlign: column.align || 'left',
                    }}
                    onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {isRTL ? (column.label_ar || column.label) : column.label}
                      </span>
                      
                      {column.sortable && (
                        <div className="flex flex-col">
                          <ChevronUpIcon
                            className={`w-3 h-3 ${
                              sort?.column === column.key && sort?.direction === 'asc'
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-neutral-400'
                            }`}
                          />
                          <ChevronDownIcon
                            className={`w-3 h-3 -mt-1 ${
                              sort?.column === column.key && sort?.direction === 'desc'
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-neutral-400'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                
                {/* Actions Column */}
                {visibleActions.length > 0 && (
                  <th className="slms-table-header-cell w-20 text-center">
                    {t('table.actions', 'Actions')}
                  </th>
                )}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody>
              {loading ? (
                // Loading State
                Array.from({ length: pagination?.pageSize || 10 }).map((_, index) => (
                  <tr key={index}>
                    {selectable && (
                      <td className="slms-table-cell">
                        <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                      </td>
                    )}
                    {visibleColumns.map(column => (
                      <td key={column.key} className="slms-table-cell">
                        <div className="w-full h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                      </td>
                    ))}
                    {visibleActions.length > 0 && (
                      <td className="slms-table-cell">
                        <div className="w-8 h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mx-auto" />
                      </td>
                    )}
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty State
                <tr>
                  <td
                    colSpan={visibleColumns.length + (selectable ? 1 : 0) + (visibleActions.length > 0 ? 1 : 0)}
                    className="slms-table-cell text-center py-12"
                  >
                    <div className="text-neutral-500 dark:text-neutral-400">
                      <div className="text-6xl mb-4">📋</div>
                      <p className="text-lg">
                        {isRTL ? (emptyMessage_ar || emptyMessage) : emptyMessage}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data Rows
                data.map((row, index) => {
                  const key = getRowKey(row);
                  const isSelected = isRowSelected(row);
                  const isExpanded = expandedRows.has(key);
                  const customRowClass = rowClassName ? rowClassName(row, index) : '';
                  
                  return (
                    <React.Fragment key={key}>
                      <tr
                        className={`slms-table-row ${
                          isSelected ? 'selected' : ''
                        } ${customRowClass}`}
                      >
                        {/* Selection */}
                        {selectable && (
                          <td className="slms-table-cell">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                className="slms-checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectRow(row)}
                              />
                            </div>
                          </td>
                        )}
                        
                        {/* Data Cells */}
                        {visibleColumns.map(column => (
                          <td
                            key={column.key}
                            className="slms-table-cell"
                            style={{ textAlign: column.align || 'left' }}
                          >
                            <TableCell
                              column={column}
                              value={row[column.key]}
                              row={row}
                              index={index}
                              locale={locale}
                            />
                          </td>
                        ))}
                        
                        {/* Actions */}
                        {visibleActions.length > 0 && (
                          <td className="slms-table-cell">
                            <TableRowActions
                              actions={visibleActions}
                              row={row}
                              index={index}
                              locale={locale}
                            />
                          </td>
                        )}
                      </tr>
                      
                      {/* Expandable Row */}
                      {expandableRows && isExpanded && renderExpandedRow && (
                        <tr>
                          <td
                            colSpan={visibleColumns.length + (selectable ? 1 : 0) + (visibleActions.length > 0 ? 1 : 0)}
                            className="slms-table-cell bg-neutral-50 dark:bg-neutral-900"
                          >
                            {renderExpandedRow(row, index)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {pagination && (
        <TablePagination
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          pageSizeOptions={pageSizeOptions}
          locale={locale}
        />
      )}
      
      {/* Column Settings Modal */}
      <Modal
        isOpen={showColumnSettings}
        onClose={() => setShowColumnSettings(false)}
        title={t('table.columnSettings', 'Column Settings')}
        size="md"
      >
        <ColumnSettings
          columns={columns}
          visibility={columnVisibility}
          onVisibilityChange={setColumnVisibility}
          locale={locale}
        />
      </Modal>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Individual Table Cell Component
 */
interface TableCellProps {
  column: TableColumn;
  value: any;
  row: any;
  index: number;
  locale: string;
}

function TableCell({ column, value, row, index, locale }: TableCellProps) {
  if (column.render) {
    return <>{column.render(value, row, index)}</>;
  }
  
  // Type-specific rendering
  switch (column.type) {
    case 'currency':
      return (
        <span className="font-mono">
          {new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
          }).format(value || 0)}
        </span>
      );
      
    case 'date':
      return (
        <span>
          {value ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(new Date(value)) : '-'}
        </span>
      );
      
    case 'boolean':
      return (
        <span className={`inline-flex items-center gap-1 ${
          value ? 'text-green-600' : 'text-red-600'
        }`}>
          {value ? <CheckIconSolid className="w-4 h-4" /> : '✕'}
          {value ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No')}
        </span>
      );
      
    case 'status':
      return <StatusBadge status={value} locale={locale} />;
      
    case 'number':
      return (
        <span className="font-mono">
          {new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(value || 0)}
        </span>
      );
      
    default:
      return <span>{value || '-'}</span>;
  }
}

/**
 * Status Badge Component
 */
interface StatusBadgeProps {
  status: string;
  locale: string;
}

function StatusBadge({ status, locale }: StatusBadgeProps) {
  const statusConfig = {
    active: { 
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', 
      label: locale === 'ar' ? 'نشط' : 'Active' 
    },
    inactive: { 
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', 
      label: locale === 'ar' ? 'غير نشط' : 'Inactive' 
    },
    pending: { 
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', 
      label: locale === 'ar' ? 'معلق' : 'Pending' 
    },
    completed: { 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', 
      label: locale === 'ar' ? 'مكتمل' : 'Completed' 
    },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-400',
    label: status
  };
  
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}

/**
 * Table Filter Component
 */
interface TableFilterProps {
  column: TableColumn;
  value: any;
  onChange: (value: any) => void;
  locale: string;
}

function TableFilter({ column, value, onChange, locale }: TableFilterProps) {
  const isRTL = locale === 'ar';
  const placeholder = isRTL 
    ? (column.filter?.placeholder_ar || column.filter?.placeholder || `البحث في ${column.label_ar || column.label}`)
    : (column.filter?.placeholder || `Search ${column.label}`);
  
  if (!column.filter) return null;
  
  switch (column.filter.type) {
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="slms-select"
        >
          <option value="">{placeholder}</option>
          {column.filter.options?.map(option => (
            <option key={option.value} value={option.value}>
              {isRTL ? (option.label_ar || option.label) : option.label}
            </option>
          ))}
        </select>
      );
      
    case 'boolean':
      return (
        <select
          value={value === undefined ? '' : value.toString()}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
          className="slms-select"
        >
          <option value="">{placeholder}</option>
          <option value="true">{locale === 'ar' ? 'نعم' : 'Yes'}</option>
          <option value="false">{locale === 'ar' ? 'لا' : 'No'}</option>
        </select>
      );
      
    case 'date-range':
      // TODO: Implement date range picker
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="slms-input"
          placeholder={placeholder}
        />
      );
      
    case 'number-range':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          className="slms-input"
          placeholder={placeholder}
        />
      );
      
    default: // text
      return (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="slms-input pl-10"
            placeholder={placeholder}
          />
        </div>
      );
  }
}

/**
 * Table Row Actions Component
 */
interface TableRowActionsProps {
  actions: TableAction[];
  row: any;
  index: number;
  locale: string;
}

function TableRowActions({ actions, row, index, locale }: TableRowActionsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const isRTL = locale === 'ar';
  
  // Filter actions based on conditions
  const availableActions = actions.filter(action => 
    !action.condition || action.condition(row)
  );
  
  if (availableActions.length === 0) return null;
  
  if (availableActions.length === 1) {
    const action = availableActions[0];
    const ActionIcon = action.icon || PencilIcon;
    
    return (
      <div className="flex justify-center">
        <button
          onClick={() => action.onClick(row, index)}
          className="slms-icon-button"
        >
          <ActionIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }
  
  return (
    <div className="relative flex justify-center">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="slms-icon-button"
      >
        <EllipsisVerticalIcon className="w-4 h-4" />
      </button>
      
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className={`absolute top-8 z-20 slms-dropdown ${
            isRTL ? 'right-0' : 'left-0'
          }`}>
            {availableActions.map(action => {
              const ActionIcon = action.icon;
              const displayLabel = isRTL ? (action.label_ar || action.label) : action.label;
              
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    action.onClick(row, index);
                    setShowDropdown(false);
                  }}
                  className={`slms-dropdown-item ${
                    action.variant === 'danger' ? 'text-red-600 hover:text-red-700' : ''
                  }`}
                >
                  {ActionIcon && <ActionIcon className="w-4 h-4" />}
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Table Pagination Component
 */
interface TablePaginationProps {
  pagination: TablePagination;
  onPaginationChange?: (pagination: TablePagination) => void;
  pageSizeOptions: number[];
  locale: string;
}

function TablePagination({ 
  pagination, 
  onPaginationChange, 
  pageSizeOptions, 
  locale 
}: TablePaginationProps) {
  const isRTL = locale === 'ar';
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  
  const handlePageChange = (newPage: number) => {
    onPaginationChange?.({ ...pagination, page: newPage });
  };
  
  const handlePageSizeChange = (newPageSize: number) => {
    onPaginationChange?.({ ...pagination, pageSize: newPageSize, page: 1 });
  };
  
  return (
    <div className="slms-table-pagination">
      <div className="flex items-center justify-between">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {isRTL ? 'عرض:' : 'Show:'}
          </span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="slms-select"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {isRTL ? 'عنصر' : 'items'}
          </span>
        </div>
        
        {/* Page Info */}
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {isRTL 
            ? `${startItem}-${endItem} من ${total}`
            : `${startItem}-${endItem} of ${total}`
          }
        </div>
        
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="slms-icon-button"
          >
            {isRTL ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
          </button>
          
          {/* Page Numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
            if (pageNum > totalPages) return null;
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-3 py-1 text-sm rounded ${
                  pageNum === page
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="slms-icon-button"
          >
            {isRTL ? <ChevronLeftIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Column Settings Component
 */
interface ColumnSettingsProps {
  columns: TableColumn[];
  visibility: Record<string, boolean>;
  onVisibilityChange: (visibility: Record<string, boolean>) => void;
  locale: string;
}

function ColumnSettings({ columns, visibility, onVisibilityChange, locale }: ColumnSettingsProps) {
  const isRTL = locale === 'ar';
  
  const handleToggle = (columnKey: string) => {
    onVisibilityChange({
      ...visibility,
      [columnKey]: visibility[columnKey] !== false ? false : true,
    });
  };
  
  return (
    <div className="space-y-3">
      {columns.map(column => {
        const isVisible = visibility[column.key] !== false;
        const displayLabel = isRTL ? (column.label_ar || column.label) : column.label;
        
        return (
          <div key={column.key} className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {displayLabel}
              {column.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </span>
            
            <button
              onClick={() => handleToggle(column.key)}
              disabled={column.required}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isVisible
                  ? 'bg-primary-600'
                  : 'bg-neutral-200 dark:bg-neutral-700'
              } ${column.required ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isVisible ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Export Components and Utilities
// ============================================================================

export {
  TableCell,
  TableFilter,
  TableRowActions,
  TablePagination,
  ColumnSettings,
  StatusBadge,
};

export type {
  EnhancedTableProps,
  TableColumn,
  TableAction,
  BulkAction,
  TableFilter as TableFilterType,
  TableSort,
  TablePagination as TablePaginationType,
};