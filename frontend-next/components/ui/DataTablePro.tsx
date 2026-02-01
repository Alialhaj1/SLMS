import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  show?: (row: T) => boolean;
}

interface DataTableProProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  actions?: RowAction<T>[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}

export function DataTablePro<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyMessage = 'No data available',
  searchable = false,
  searchPlaceholder = 'Search...',
  actions,
  pagination,
  onSort,
}: DataTableProProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery) return data;

    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery, searchable]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (!columns.find((col) => col.key === key)?.sortable) return;

    const newDirection =
      sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortKey(key);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(key, newDirection);
    }
  };

  const visibleData = pagination ? sortedData : sortedData;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {searchable && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width }}
                  className={clsx(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUpIcon
                          className={clsx(
                            'w-3 h-3 -mb-1',
                            sortKey === column.key && sortDirection === 'asc'
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          )}
                        />
                        <ChevronDownIcon
                          className={clsx(
                            'w-3 h-3',
                            sortKey === column.key && sortDirection === 'desc'
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th scope="col" className="relative px-6 py-3 w-20">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                </td>
              </tr>
            ) : visibleData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              visibleData.map((row, index) => {
                const rowKey = keyExtractor(row, index);
                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                      >
                        {column.render
                          ? column.render(row, index)
                          : row[column.key]}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                        <button
                          onClick={() =>
                            setActionMenuOpen(actionMenuOpen === String(rowKey) ? null : String(rowKey))
                          }
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </button>
                        
                        {actionMenuOpen === String(rowKey) && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              {actions
                                .filter((action) => !action.show || action.show(row))
                                .map((action, actionIndex) => (
                                  <button
                                    key={actionIndex}
                                    onClick={() => {
                                      action.onClick(row);
                                      setActionMenuOpen(null);
                                    }}
                                    className={clsx(
                                      'flex items-center gap-2 w-full px-4 py-2 text-sm text-left',
                                      action.variant === 'danger'
                                        ? 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                    )}
                                  >
                                    {action.icon}
                                    {action.label}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing{' '}
            <span className="font-medium">
              {pagination.total > 0 ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.pageSize, pagination.total || 0)}
            </span>{' '}
            of{' '}
            <span className="font-medium">{pagination.total || 0}</span> results
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
