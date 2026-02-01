/**
 * VENDOR SEARCH SELECT COMPONENT
 * Purpose: Searchable vendor dropdown with code/name search
 * Features: Real-time search, recent vendors, keyboard navigation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Vendor {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  credit_limit?: number;
  balance?: number;
  payment_term_id?: number;
  is_active: boolean;
}

interface VendorSearchSelectProps {
  value: number | null;
  vendors: Vendor[];
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  onChange: (vendorId: number | null) => void;
  onVendorSelect?: (vendor: Vendor | null) => void;
}

export const VendorSearchSelect: React.FC<VendorSearchSelectProps> = ({
  value,
  vendors,
  loading = false,
  disabled = false,
  error,
  placeholder = 'Search vendor by code or name...',
  onChange,
  onVendorSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected vendor
  const selectedVendor = vendors.find(v => v.id === value);

  // Filter vendors based on search
  const filteredVendors = vendors.filter(vendor => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      vendor.code.toLowerCase().includes(term) ||
      vendor.name.toLowerCase().includes(term) ||
      (vendor.name_ar && vendor.name_ar.includes(searchTerm)) ||
      (vendor.phone && vendor.phone.includes(term))
    );
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedVendor) {
          setSearchTerm(`${selectedVendor.code} - ${selectedVendor.name}`);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedVendor]);

  // Update search term when value changes externally
  useEffect(() => {
    if (selectedVendor) {
      setSearchTerm(`${selectedVendor.code} - ${selectedVendor.name}`);
    } else {
      setSearchTerm('');
    }
  }, [selectedVendor]);

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
            Math.min(prev + 1, filteredVendors.length - 1)
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredVendors[highlightedIndex]) {
          handleSelect(filteredVendors[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (vendor: Vendor) => {
    onChange(vendor.id);
    onVendorSelect?.(vendor);
    setSearchTerm(`${vendor.code} - ${vendor.name}`);
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleClear = () => {
    onChange(null);
    onVendorSelect?.(null);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    
    // If search is cleared, clear selection
    if (!e.target.value.trim()) {
      onChange(null);
      onVendorSelect?.(null);
    }
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      // Select all text on focus for easy replacement
      inputRef.current?.select();
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
        
        {/* Icons */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
          {loading && (
            <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          )}
          
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
            >
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

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredVendors.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              {searchTerm ? 'No vendors found matching your search' : 'No vendors available'}
            </div>
          ) : (
            <ul>
              {filteredVendors.map((vendor, index) => (
                <li
                  key={vendor.id}
                  onClick={() => handleSelect(vendor)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-2 cursor-pointer ${
                    index === highlightedIndex 
                      ? 'bg-blue-50 dark:bg-blue-900/30' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                  } ${value === vendor.id ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {vendor.code}
                      </span>
                      <span className="mx-2 text-slate-400">|</span>
                      <span className="text-slate-900 dark:text-white">
                        {vendor.name}
                      </span>
                      {vendor.name_ar && (
                        <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">
                          ({vendor.name_ar})
                        </span>
                      )}
                    </div>
                    {value === vendor.id && (
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {vendor.phone && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      📞 {vendor.phone}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorSearchSelect;
