/**
 * 📦 ITEM SELECTOR COMPONENT
 * ==========================
 * Searchable item/product picker with real-time API integration
 * 
 * Features:
 * ✅ Search by code/name/barcode
 * ✅ Display item details (code, name, unit, current stock)
 * ✅ AR/EN support
 * ✅ Keyboard navigation
 * ✅ Loading states
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Item {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  barcode?: string;
  unit_id?: number;
  unit_code?: string;
  unit_name?: string;
  current_stock?: number;
  unit_price?: number;
}

interface ItemSelectorProps {
  selectedItem: Item | null;
  onSelect: (item: Item | null) => void;
  companyId: number;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  warehouseId?: number; // Filter items available in this warehouse
}

export default function ItemSelector({
  selectedItem,
  onSelect,
  companyId,
  label,
  required = false,
  error,
  disabled = false,
  warehouseId,
}: ItemSelectorProps) {
  const { locale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch items when search query changes
  useEffect(() => {
    const fetchItems = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const url = new URL('http://localhost:4000/api/master/items');
        url.searchParams.set('page', '1');
        url.searchParams.set('limit', '20');
        url.searchParams.set('search', searchQuery);
        if (warehouseId) url.searchParams.set('warehouse_id', warehouseId.toString());

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setItems(result.data || []);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error('Failed to fetch items:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchItems, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery, warehouseId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (items[highlightedIndex]) {
          handleSelect(items[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (item: Item) => {
    onSelect(item);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected Item Display */}
      {selectedItem && !isOpen && (
        <div className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">
              {selectedItem.code} - {locale === 'ar' && selectedItem.name_ar ? selectedItem.name_ar : selectedItem.name}
            </p>
            {selectedItem.unit_name && (
              <p className="text-xs text-gray-500">
                {locale === 'ar' ? 'الوحدة' : 'Unit'}: {selectedItem.unit_name}
                {typeof selectedItem.current_stock === 'number' && (
                  <span className="ml-2">
                    {locale === 'ar' ? 'المخزون' : 'Stock'}: {selectedItem.current_stock}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Search Input */}
      {(!selectedItem || isOpen) && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={locale === 'ar' ? 'ابحث عن صنف (الكود، الاسم، الباركود)' : 'Search item (code, name, barcode)'}
            className={clsx(
              'w-full px-4 py-3 pr-10 border rounded-lg',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed',
              'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
              error ? 'border-red-500' : 'border-gray-300'
            )}
          />
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      )}

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Dropdown Results */}
      {isOpen && searchQuery.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm">{locale === 'ar' ? 'جاري البحث...' : 'Searching...'}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>{locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}</p>
            </div>
          ) : (
            <ul>
              {items.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={clsx(
                      'w-full px-4 py-3 text-left transition-colors',
                      'hover:bg-blue-50 dark:hover:bg-gray-700',
                      highlightedIndex === index && 'bg-blue-50 dark:bg-gray-700'
                    )}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.code} - {locale === 'ar' && item.name_ar ? item.name_ar : item.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      {item.barcode && <span>{locale === 'ar' ? 'الباركود' : 'Barcode'}: {item.barcode}</span>}
                      {item.unit_name && <span>{locale === 'ar' ? 'الوحدة' : 'Unit'}: {item.unit_name}</span>}
                      {typeof item.current_stock === 'number' && (
                        <span className={clsx(item.current_stock > 0 ? 'text-green-600' : 'text-red-600')}>
                          {locale === 'ar' ? 'المخزون' : 'Stock'}: {item.current_stock}
                        </span>
                      )}
                      {typeof item.unit_price === 'number' && (
                        <span>{locale === 'ar' ? 'السعر' : 'Price'}: {item.unit_price.toFixed(2)}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
