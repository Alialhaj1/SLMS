/**
 * 🔍 ITEMS PICKER DIALOG
 * ======================
 * Server-side search, multi-select, bulk add to purchasing documents
 * Used by: Quotations, Contracts, Purchase Orders
 * 
 * Features:
 * ✅ Server-side search with debounce (300ms)
 * ✅ Filter by category, item type
 * ✅ Multi-select with checkbox
 * ✅ Bulk add with default qty=1
 * ✅ Shows stock, last purchase price, UOM
 * ✅ AR/EN bilingual
 * ✅ Keyboard: Escape to close
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PlusIcon,
  CheckIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { companyStore } from '../../lib/companyStore';

export interface PickerItem {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  item_type?: string;
  category_id?: number;
  category_name?: string;
  base_uom_id?: number;
  base_uom_code?: string;
  base_uom_name?: string;
  purchase_uom_id?: number;
  purchase_uom_code?: string;
  purchase_uom_name?: string;
  purchase_price?: number;
  last_purchase_cost?: number;
  standard_cost?: number;
  base_selling_price?: number;
  stock_quantity?: number;
  tax_code?: string;
  default_tax_rate?: number;
  tax_rate_id?: number;
  is_active?: boolean;
  barcode?: string;
  brand_id?: number;
  group_code?: string;
  group_name?: string;
  uoms?: Array<{
    uom_id: number;
    uom_code: string;
    uom_name: string;
    conversion_factor?: number;
    is_base_uom?: boolean;
    is_active?: boolean;
  }>;
}

export interface SelectedPickerItem extends PickerItem {
  quantity: number;
  unit_price: number;
  uom_id: number;
  uom_code: string;
  uoms?: PickerItem['uoms'];
}

interface ItemsPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: SelectedPickerItem[]) => void;
  /** Already-added item IDs to show as disabled/grey */
  excludeItemIds?: number[];
  locale?: 'en' | 'ar';
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

export default function ItemsPickerDialog({
  isOpen,
  onClose,
  onAdd,
  excludeItemIds = [],
  locale = 'en',
}: ItemsPickerDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [typeFilter, setTypeFilter] = useState('');
  const [total, setTotal] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isAr = locale === 'ar';

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearchTerm('');
      setDebouncedSearch('');
      setTypeFilter('');
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const params = new URLSearchParams({
        limit: '50',
        is_active: 'true',
        is_purchasable: 'true',
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (typeFilter) params.append('item_type', typeFilter);

      const res = await fetch(`${API_BASE}/master/items?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (res.ok) {
        const result = await res.json();
        setItems(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter]);

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen, fetchItems]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Toggle selection
  const toggleItem = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all visible (not excluded)
  const toggleSelectAll = () => {
    const selectableItems = items.filter(i => !excludeItemIds.includes(i.id));
    if (selectedIds.size === selectableItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableItems.map(i => i.id)));
    }
  };

  // Handle add
  const handleAdd = () => {
    const selectedItems: SelectedPickerItem[] = items
      .filter(i => selectedIds.has(i.id))
      .map(item => ({
        ...item,
        quantity: 1,
        unit_price: item.last_purchase_cost || item.purchase_price || item.standard_cost || 0,
        uom_id: item.purchase_uom_id || item.base_uom_id || 0,
        uom_code: item.purchase_uom_code || item.base_uom_code || '',
        uoms: item.uoms,
      }));
    onAdd(selectedItems);
    onClose();
  };

  const getItemName = (item: PickerItem) => {
    if (isAr) return item.name_ar || item.name_en || item.name;
    return item.name_en || item.name || item.name_ar;
  };

  const selectableCount = items.filter(i => !excludeItemIds.includes(i.id)).length;

  if (!isOpen) return null;

  const dialogContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <CubeIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isAr ? 'اختيار الأصناف' : 'Select Items'}
            </h2>
            {selectedIds.size > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                {selectedIds.size} {isAr ? 'محدد' : 'selected'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-700/50">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className={clsx(
                "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400",
                isAr ? 'right-3' : 'left-3'
              )} />
              <input
                ref={searchRef}
                type="text"
                placeholder={isAr ? 'بحث بالكود أو الاسم أو الباركود...' : 'Search by code, name, or barcode...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={clsx(
                  "w-full py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                  isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
                )}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">{isAr ? 'كل الأنواع' : 'All Types'}</option>
              <option value="stock">{isAr ? 'مخزون' : 'Stock'}</option>
              <option value="service">{isAr ? 'خدمة' : 'Service'}</option>
              <option value="non_stock">{isAr ? 'غير مخزون' : 'Non-Stock'}</option>
            </select>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {isAr ? `${total} صنف` : `${total} items found`}
            </span>
            {selectableCount > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                {selectedIds.size === selectableCount
                  ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All')
                  : (isAr ? 'تحديد الكل' : 'Select All')
                }
              </button>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <CubeIcon className="h-12 w-12 mb-2 text-gray-300" />
              <p>{isAr ? 'لا توجد أصناف' : 'No items found'}</p>
              <p className="text-xs mt-1">{isAr ? 'جرب كلمات بحث مختلفة' : 'Try different search terms'}</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-slate-900/50 sticky top-0">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === selectableCount}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">
                    {isAr ? 'الكود' : 'Code'}
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">
                    {isAr ? 'الصنف' : 'Item'}
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">
                    {isAr ? 'النوع' : 'Type'}
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">
                    {isAr ? 'الوحدة' : 'UOM'}
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-end">
                    {isAr ? 'آخر سعر شراء' : 'Last Price'}
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-end">
                    {isAr ? 'المخزون' : 'Stock'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {items.map(item => {
                  const isExcluded = excludeItemIds.includes(item.id);
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => !isExcluded && toggleItem(item.id)}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isExcluded
                          ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-slate-800'
                          : isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isExcluded}
                          onChange={() => toggleItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-sm font-mono text-gray-600 dark:text-gray-300">
                        {item.code}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getItemName(item)}
                        </div>
                        {item.group_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.group_name}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={clsx(
                          'px-1.5 py-0.5 text-xs rounded font-medium',
                          item.item_type === 'stock' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : item.item_type === 'service' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        )}>
                          {item.item_type || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">
                        {item.purchase_uom_name || item.base_uom_name || item.purchase_uom_code || item.base_uom_code || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-end font-medium text-gray-900 dark:text-white">
                        {(item.last_purchase_cost || item.purchase_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-end text-gray-600 dark:text-gray-300">
                        {item.stock_quantity != null ? Number(item.stock_quantity).toLocaleString() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedIds.size === 0}
            className={clsx(
              'flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors',
              selectedIds.size > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
            )}
          >
            <PlusIcon className="h-4 w-4" />
            {isAr
              ? `إضافة ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`
              : `Add ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : dialogContent;
}
