/**
 * 🗂️ MASTER DATA TABLE - Generic Reusable Table Component
 * ========================================================
 * 
 * Config-driven table للبيانات الأساسية مع:
 * ✅ Pagination
 * ✅ Sorting
 * ✅ Filtering
 * ✅ Actions (Edit/Delete) مع RBAC
 * ✅ Loading states
 * ✅ Empty states
 * ✅ Responsive (mobile cards)
 * ✅ Bilingual support
 * 
 * @example
 * <MasterDataTable
 *   columns={[
 *     { key: 'code', label: 'Code', sortable: true },
 *     { key: 'name_en', label: 'Name (EN)', sortable: true },
 *   ]}
 *   data={items}
 *   loading={loading}
 *   onEdit={(item) => handleEdit(item)}
 *   onDelete={(item) => handleDelete(item)}
 *   canEdit={hasPermission('items:edit')}
 *   canDelete={hasPermission('items:delete')}
 * />
 */

import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { PencilIcon, TrashIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import clsx from 'clsx';

export interface TableColumn<T = any> {
  /** مفتاح العمود (يطابق property في البيانات) */
  key: string;
  /** تسمية العمود */
  label: string;
  /** قابل للترتيب */
  sortable?: boolean;
  /** Custom render function */
  render?: ((value: any, row: T) => React.ReactNode) | ((row: T) => React.ReactNode);
  /** عرض العمود (responsive) */
  width?: string;
  /** إخفاء في mobile */
  hideOnMobile?: boolean;
  /** محاذاة النص */
  align?: 'left' | 'center' | 'right';
}

export interface MasterDataTableProps<T = any> {
  /** أعمدة الجدول */
  columns: TableColumn<T>[];
  /** البيانات */
  data: T[];
  /** حالة التحميل */
  loading?: boolean;
  /** Error message (optional; typically rendered by parent) */
  error?: string | null;
  /** رسالة Empty State */
  emptyMessage?: string;
  /** دالة التعديل */
  onEdit?: (id: number) => void;
  /** دالة الحذف */
  onDelete?: (id: number) => void;
  /** صلاحية التعديل */
  canEdit?: boolean;
  /** صلاحية الحذف */
  canDelete?: boolean;
  /** إظهار عمود Actions */
  showActions?: boolean;
  /** الـ key الفريد للصف */
  rowKey?: string;
  /** Custom row className */
  rowClassName?: (row: T) => string;
  /** Pagination */
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  /** Sort state */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export default function MasterDataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  showActions = true,
  rowKey = 'id',
  rowClassName,
  pagination,
  sortBy,
  sortOrder,
  onSort,
}: MasterDataTableProps<T>) {
  const { t, locale } = useTranslation();

  const hasSequenceDisplay = Array.isArray(data) && data.some((row) => row && 'sequence_display' in row);
  const effectiveColumns: TableColumn<T>[] = hasSequenceDisplay && !columns.some((c) => c.key === 'sequence_display')
    ? [
        {
          key: 'sequence_display',
          label: t('common.sequence'),
          sortable: false,
          width: '180px',
        },
        ...columns,
      ]
    : columns;

  const renderCell = (col: TableColumn<T>, row: T) => {
    if (!col.render) return row[col.key];

    // Backward-compatibility: many pages implement `render(row)` instead of
    // the documented `render(value, row)`.
    if (col.render.length >= 2) {
      return (col.render as (value: any, row: T) => React.ReactNode)(row[col.key], row);
    }

    return (col.render as (row: T) => React.ReactNode)(row);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {effectiveColumns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              {showActions && (canEdit || canDelete) && (
                <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, idx) => (
              <tr key={idx}>
                {effectiveColumns.map((col, colIdx) => (
                  <td key={colIdx} className="px-6 py-4 whitespace-nowrap">
                    <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </td>
                ))}
                {showActions && (canEdit || canDelete) && (
                  <td className="px-6 py-4 whitespace-nowrap text-end">
                    <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 inline-block"></div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          {emptyMessage || t('common.noData')}
        </h3>
      </div>
    );
  }

  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key);
  };

  const showActionsColumn = showActions && (canEdit || canDelete);

  const getRowId = (row: T): number => {
    const value = row[rowKey];
    return typeof value === 'number' ? value : Number(value);
  };

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {effectiveColumns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-end',
                    !col.align && 'text-start',
                    col.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <ChevronUpDownIcon
                        className={clsx(
                          'w-4 h-4',
                          sortBy === col.key ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                        )}
                      />
                    )}
                  </div>
                </th>
              ))}
              {showActionsColumn && (
                <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row) => (
              <tr
                key={row[rowKey]}
                className={clsx(
                  'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                  rowClassName && rowClassName(row)
                )}
              >
                {effectiveColumns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-6 py-4 whitespace-nowrap text-sm',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-end',
                      !col.align && 'text-start'
                    )}
                  >
                      {renderCell(col, row)}
                  </td>
                ))}
                {showActionsColumn && (
                  <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && onEdit && (
                        <button
                          onClick={() => onEdit(getRowId(row))}
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      )}
                      {canDelete && onDelete && (
                        <button
                          onClick={() => onDelete(getRowId(row))}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((row) => (
          <div
            key={row[rowKey]}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3"
          >
            {effectiveColumns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {col.label}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {renderCell(col, row)}
                  </span>
                </div>
              ))}
            {showActionsColumn && (
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {canEdit && onEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(getRowId(row))}
                    className="flex-1"
                  >
                    <PencilIcon className="w-4 h-4 me-2" />
                    {t('common.edit')}
                  </Button>
                )}
                {canDelete && onDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(getRowId(row))}
                    className="flex-1"
                  >
                    <TrashIcon className="w-4 h-4 me-2" />
                    {t('common.delete')}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('common.showing')} <span className="font-medium">{(pagination.currentPage - 1) * pagination.pageSize + 1}</span> - <span className="font-medium">{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)}</span> {t('common.of')} <span className="font-medium">{pagination.totalItems}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
