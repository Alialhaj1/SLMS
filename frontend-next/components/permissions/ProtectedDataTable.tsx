/**
 * 🔐 PROTECTED DATA TABLE - جدول بيانات محمي بالصلاحيات
 * =====================================================
 * 
 * جدول بيانات متقدم مع دعم كامل للصلاحيات:
 * - إخفاء الأعمدة حسب الصلاحيات
 * - إخفاء إجراءات الصفوف حسب الصلاحيات
 * - التحكم في الحقول الحساسة
 * 
 * @example
 * <ProtectedDataTable
 *   data={shipments}
 *   columns={[
 *     { key: 'number', label: 'رقم الشحنة' },
 *     { key: 'cost', label: 'التكلفة', permission: 'shipments:view_cost' },
 *     { key: 'profit', label: 'الربح', permission: 'finance:view' },
 *   ]}
 *   actions={[
 *     { label: 'عرض', permission: 'shipments:view', onClick: handleView },
 *     { label: 'تعديل', permission: 'shipments:edit', onClick: handleEdit },
 *     { label: 'حذف', permission: 'shipments:delete', onClick: handleDelete, variant: 'danger' },
 *   ]}
 * />
 */

import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';

export interface ProtectedColumn<T> {
  key: string;
  label: string;
  /** الصلاحية المطلوبة لعرض هذا العمود */
  permission?: string;
  /** أي صلاحية من القائمة */
  anyPermission?: string[];
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** قيمة بديلة للعمود المخفي (مثل "****") */
  maskedValue?: string;
  /** إظهار قيمة مخفية بدلاً من إخفاء العمود */
  showMasked?: boolean;
}

export interface ProtectedRowAction<T> {
  key: string;
  label: string;
  /** الصلاحية المطلوبة */
  permission?: string;
  /** أي صلاحية من القائمة */
  anyPermission?: string[];
  onClick: (row: T) => void | Promise<void>;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  /** شرط إضافي لإظهار الإجراء */
  show?: (row: T) => boolean;
  /** تعطيل الإجراء */
  disabled?: (row: T) => boolean;
  /** طلب تأكيد */
  requireConfirm?: boolean;
  /** رسالة التأكيد */
  confirmMessage?: string;
}

interface ProtectedDataTableProps<T> {
  data: T[];
  columns: ProtectedColumn<T>[];
  keyExtractor: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  actions?: ProtectedRowAction<T>[];
  /** صلاحية عرض الجدول بالكامل */
  viewPermission?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  /** فئات CSS للجدول */
  className?: string;
  /** إخفاء أعمدة الإجراءات إذا لم يكن هناك إجراءات متاحة */
  hideActionsColumnIfEmpty?: boolean;
}

const variantClasses = {
  default: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
  danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
  success: 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
  warning: 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
};

export function ProtectedDataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyMessage,
  searchable = false,
  searchPlaceholder,
  actions = [],
  viewPermission,
  pagination,
  onSort,
  className,
  hideActionsColumnIfEmpty = true,
}: ProtectedDataTableProps<T>) {
  const { can, canAny, isSuperAdmin } = usePermissions();
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | number | null>(null);

  // التحقق من صلاحية عرض الجدول
  if (viewPermission && !isSuperAdmin && !can(viewPermission)) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {t('common.noPermissionToView')}
        </p>
      </div>
    );
  }

  // فلترة الأعمدة حسب الصلاحيات
  const visibleColumns = useMemo(() => {
    return columns.filter(col => {
      if (isSuperAdmin) return true;
      if (!col.permission && !col.anyPermission) return true;
      if (col.permission && can(col.permission)) return true;
      if (col.anyPermission && canAny(col.anyPermission)) return true;
      // إذا كان showMasked=true، نعرض العمود بقيمة مخفية
      if (col.showMasked) return true;
      return false;
    });
  }, [columns, can, canAny, isSuperAdmin]);

  // الأعمدة التي يجب إخفاء قيمتها
  const maskedColumns = useMemo(() => {
    return columns.filter(col => {
      if (isSuperAdmin) return false;
      if (!col.showMasked) return false;
      if (col.permission && !can(col.permission)) return true;
      if (col.anyPermission && !canAny(col.anyPermission)) return true;
      return false;
    }).map(col => col.key);
  }, [columns, can, canAny, isSuperAdmin]);

  // فلترة الإجراءات حسب الصلاحيات
  const getVisibleActions = (row: T): ProtectedRowAction<T>[] => {
    return actions.filter(action => {
      // التحقق من الصلاحية
      let hasPermission = true;
      if (!isSuperAdmin) {
        if (action.permission) {
          hasPermission = can(action.permission);
        } else if (action.anyPermission) {
          hasPermission = canAny(action.anyPermission);
        }
      }
      if (!hasPermission) return false;
      
      // التحقق من شرط الإظهار
      if (action.show && !action.show(row)) return false;
      
      return true;
    });
  };

  // هل هناك أي إجراءات متاحة؟
  const hasAnyActions = useMemo(() => {
    if (!hideActionsColumnIfEmpty) return actions.length > 0;
    return data.some(row => getVisibleActions(row).length > 0);
  }, [data, actions, hideActionsColumnIfEmpty]);

  // البحث
  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery) return data;

    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery, searchable]);

  // الترتيب
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

  const handleActionClick = async (action: ProtectedRowAction<T>, row: T) => {
    setActionMenuOpen(null);
    
    if (action.requireConfirm) {
      const confirmed = window.confirm(action.confirmMessage || t('common.confirmAction'));
      if (!confirmed) return;
    }
    
    await action.onClick(row);
  };

  // حساب الصفحات
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  const renderCellValue = (row: T, col: ProtectedColumn<T>, index: number) => {
    // إذا كان العمود مخفياً، نعرض القيمة المخفية
    if (maskedColumns.includes(col.key)) {
      return col.maskedValue || '••••';
    }
    
    if (col.render) {
      return col.render(row, index);
    }
    
    return row[col.key] ?? '-';
  };

  return (
    <div className={clsx('bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden', className)}>
      {/* شريط البحث */}
      {searchable && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder || t('common.search')}
              className="w-full ps-10 pe-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* الجدول */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={clsx(
                    'px-6 py-3 text-xs font-medium uppercase tracking-wider',
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-end' : 'text-start',
                    col.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600',
                    'text-gray-700 dark:text-gray-300'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDirection === 'asc' 
                        ? <ChevronUpIcon className="w-4 h-4" />
                        : <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </div>
                </th>
              ))}
              {hasAnyActions && (
                <th className="px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider text-end">
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + (hasAnyActions ? 1 : 0)} className="px-6 py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (hasAnyActions ? 1 : 0)} className="px-6 py-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {emptyMessage || t('common.noData')}
                  </p>
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => {
                const rowKey = keyExtractor(row, index);
                const rowActions = getVisibleActions(row);
                
                return (
                  <tr 
                    key={rowKey}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={clsx(
                          'px-6 py-4 text-sm text-gray-900 dark:text-gray-100',
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-end' : 'text-start'
                        )}
                      >
                        {renderCellValue(row, col, index)}
                      </td>
                    ))}
                    {hasAnyActions && (
                      <td className="px-6 py-4 text-end relative">
                        {rowActions.length > 0 && (
                          <div className="relative inline-block">
                            <button
                              onClick={() => setActionMenuOpen(actionMenuOpen === rowKey ? null : rowKey)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                            >
                              <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
                            </button>
                            
                            {actionMenuOpen === rowKey && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10"
                                  onClick={() => setActionMenuOpen(null)}
                                />
                                <div className="absolute end-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                  {rowActions.map((action) => (
                                    <button
                                      key={action.key}
                                      onClick={() => handleActionClick(action, row)}
                                      disabled={action.disabled?.(row)}
                                      className={clsx(
                                        'w-full px-4 py-2 text-start text-sm flex items-center gap-2',
                                        variantClasses[action.variant || 'default'],
                                        action.disabled?.(row) && 'opacity-50 cursor-not-allowed'
                                      )}
                                    >
                                      {action.icon}
                                      {action.label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
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

      {/* الصفحات */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('common.showing')} {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} {t('common.of')} {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {pagination.page} / {totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProtectedDataTable;
