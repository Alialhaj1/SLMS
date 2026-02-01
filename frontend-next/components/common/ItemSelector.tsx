/**
 * 🔍 ITEM SELECTOR - Searchable dropdown for items
 * ================================================
 * 
 * Features:
 * ✅ Search by code or name
 * ✅ Lazy loading
 * ✅ Bilingual display
 * ✅ RBAC-aware
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { companyStore } from '../../lib/companyStore';

interface Item {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
}

interface ItemSelectorProps {
  value: string;
  onChange: (itemId: string, item: Item | null) => void;
  error?: string;
  required?: boolean;
  label?: string;
  disabled?: boolean;
}

export default function ItemSelector({
  value,
  onChange,
  error,
  required,
  label,
  disabled,
}: ItemSelectorProps) {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch items
  const fetchItems = async (searchTerm = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const companyId = companyStore.getActiveCompanyId();

      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/master/items?search=${searchTerm}&limit=20`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (response.ok) {
        const result = await response.json();
        setItems(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load selected item details
  useEffect(() => {
    if (value && !selectedItem) {
      const fetchSelected = async () => {
        try {
          const token = localStorage.getItem('accessToken');
          const companyId = companyStore.getActiveCompanyId();
          if (!token) return;

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/master/items/${value}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            setSelectedItem(result.data);
          }
        } catch (err) {
          console.error('Failed to fetch item:', err);
        }
      };

      fetchSelected();
    }
  }, [value, selectedItem]);

  // Fetch items on search
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchItems(search);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search, isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: Item) => {
    setSelectedItem(item);
    onChange(String(item.id), item);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedItem(null);
    onChange('', null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}

      <div
        className={clsx(
          'relative w-full px-3 py-2 border rounded-lg cursor-pointer transition-colors',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
          disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          {selectedItem ? (
            <div className="flex-1">
              <div className="font-medium">{locale === 'ar' ? selectedItem.name_ar : selectedItem.name_en}</div>
              <div className="text-xs text-gray-500">{selectedItem.code}</div>
            </div>
          ) : (
            <span className="text-gray-400">{locale === 'ar' ? 'اختر صنف' : 'Select item'}</span>
          )}
          <div className="flex items-center gap-1">
            {selectedItem && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              autoFocus
            />
          </div>

          {/* Items list */}
          <div className="overflow-y-auto max-h-48">
            {loading ? (
              <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-gray-500">{t('common.noResults')}</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <div className="font-medium">{locale === 'ar' ? item.name_ar : item.name_en}</div>
                  <div className="text-xs text-gray-500">{item.code}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
