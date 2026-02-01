/**
 * ITEM SEARCH SELECT COMPONENT
 * Purpose: Searchable item dropdown with UOM selection
 * Features: Code/name search, UOM variants, stock info, type filtering
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface ItemUOM {
  id: number;
  uom_id: number;
  uom_code: string;
  uom_name: string;
  conversion_factor: number;
  is_base_uom: boolean;
  is_purchase_uom: boolean;
  default_purchase_price?: number;
}

interface Item {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  item_type: 'stock' | 'service' | 'expense';
  category_id?: number;
  category_name?: string;
  base_uom_id: number;
  base_uom_code: string;
  base_uom_name: string;
  purchase_price?: number;
  stock_quantity?: number;
  tax_rate_id?: number;
  is_active: boolean;
  uoms?: ItemUOM[];
}

interface SelectedItem {
  item: Item;
  uom: ItemUOM;
}

interface ItemSearchSelectProps {
  value: number | null;
  items: Item[];
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  allowServices?: boolean;
  placeholder?: string;
  onChange: (itemId: number | null, uomId?: number) => void;
  onItemSelect?: (selection: SelectedItem | null) => void;
}

export const ItemSearchSelect: React.FC<ItemSearchSelectProps> = ({
  value,
  items,
  loading = false,
  disabled = false,
  error,
  allowServices = true,
  placeholder = 'Search item by code or name...',
  onChange,
  onItemSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedItemExpanded, setSelectedItemExpanded] = useState<number | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected item
  const selectedItem = items.find(i => i.id === value);

  // Filter items based on search and type
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Type filter
      if (activeTypeFilter !== 'all' && item.item_type !== activeTypeFilter) {
        return false;
      }
      
      // Don't show services if not allowed
      if (!allowServices && item.item_type === 'service') {
        return false;
      }

      // Search filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        (item.name_ar && item.name_ar.includes(searchTerm)) ||
        (item.category_name && item.category_name.toLowerCase().includes(term))
      );
    });
  }, [items, searchTerm, activeTypeFilter, allowServices]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedItem) {
          setSearchTerm(`${selectedItem.code} - ${selectedItem.name}`);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedItem]);

  // Update search term when value changes externally
  useEffect(() => {
    if (selectedItem) {
      setSearchTerm(`${selectedItem.code} - ${selectedItem.name}`);
    } else {
      setSearchTerm('');
    }
  }, [selectedItem]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => 
            Math.min(prev + 1, filteredItems.length - 1)
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredItems[highlightedIndex]) {
          handleSelectItem(filteredItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelectItem = (item: Item, uom?: ItemUOM) => {
    // If item has multiple UOMs and no UOM specified, expand for selection
    if (!uom && item.uoms && item.uoms.length > 1) {
      setSelectedItemExpanded(selectedItemExpanded === item.id ? null : item.id);
      return;
    }

    // Use provided UOM or default
    const selectedUom = uom || (item.uoms?.find(u => u.is_purchase_uom || u.is_base_uom)) || {
      id: 0,
      uom_id: item.base_uom_id,
      uom_code: item.base_uom_code,
      uom_name: item.base_uom_name,
      conversion_factor: 1,
      is_base_uom: true,
      is_purchase_uom: false,
    };

    onChange(item.id, selectedUom.uom_id);
    onItemSelect?.({
      item,
      uom: selectedUom,
    });
    setSearchTerm(`${item.code} - ${item.name}`);
    setIsOpen(false);
    setSelectedItemExpanded(null);
    setHighlightedIndex(0);
  };

  const handleClear = () => {
    onChange(null);
    onItemSelect?.(null);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    
    if (!e.target.value.trim()) {
      onChange(null);
      onItemSelect?.(null);
    }
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      inputRef.current?.select();
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'stock': return '📦';
      case 'service': return '🔧';
      case 'expense': return '💰';
      default: return '📋';
    }
  };

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case 'stock': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'service': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'expense': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-16 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
            error ? 'border-red-500' : 'border-slate-300'
          } ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
          {loading && (
            <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
          
          {value && !disabled && (
            <button type="button" onClick={handleClear} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
          >
            <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Type Filter Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {['all', 'stock', 'service', 'expense'].map(type => (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type)}
                className={`flex-1 px-3 py-2 text-xs font-medium capitalize ${
                  activeTypeFilter === type
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                {type === 'all' ? 'All Items' : `${getItemTypeIcon(type)} ${type}`}
              </button>
            ))}
          </div>

          {/* Items List */}
          <div className="max-h-60 overflow-auto">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                {searchTerm ? 'No items found matching your search' : 'No items available'}
              </div>
            ) : (
              <ul>
                {filteredItems.map((item, index) => (
                  <li key={item.id}>
                    <div
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`px-4 py-2 cursor-pointer ${
                        index === highlightedIndex 
                          ? 'bg-blue-50 dark:bg-blue-900/30' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                      } ${value === item.id ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {item.code}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getItemTypeBadge(item.item_type)}`}>
                              {item.item_type}
                            </span>
                            {item.uoms && item.uoms.length > 1 && (
                              <span className="text-xs text-slate-500">
                                ({item.uoms.length} units)
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-900 dark:text-white">
                            {item.name}
                            {item.name_ar && (
                              <span className="text-slate-500 dark:text-slate-400 mr-1"> ({item.name_ar})</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4">
                            <span>📏 {item.base_uom_name}</span>
                            {item.purchase_price && <span>💵 {Number(item.purchase_price).toFixed(2)}</span>}
                            {item.item_type === 'stock' && item.stock_quantity !== undefined && (
                              <span className={item.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                📊 {item.stock_quantity} in stock
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {value === item.id && (
                          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    {/* UOM Selection (expanded) */}
                    {selectedItemExpanded === item.id && item.uoms && item.uoms.length > 1 && (
                      <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 border-t border-slate-200 dark:border-slate-600">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                          Select Unit of Measure:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.uoms.map(uom => (
                            <button
                              key={uom.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectItem(item, uom);
                              }}
                              className={`px-3 py-1 text-sm rounded-full border ${
                                uom.is_purchase_uom 
                                  ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400'
                                  : 'bg-white border-slate-300 text-slate-700 dark:bg-slate-600 dark:border-slate-500 dark:text-slate-200'
                              } hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                            >
                              {uom.uom_code} - {uom.uom_name}
                              {uom.conversion_factor !== 1 && (
                                <span className="text-xs ml-1 text-slate-500">
                                  (×{uom.conversion_factor})
                                </span>
                              )}
                              {uom.is_purchase_uom && <span className="ml-1">✓</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemSearchSelect;
