import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { companyStore } from '../../lib/companyStore';

interface Warehouse {
  id: number;
  warehouse_code?: string;
  name_en?: string;
  name_ar?: string;
  // Back-compat / alternate shapes
  name?: string;
  warehouse_name?: string;
}

interface WarehouseSelectorProps {
  value?: number | null;
  onChange: (warehouseId: number | null) => void;
  error?: string;
  required?: boolean;
  label?: string;
  disabled?: boolean;
}

export default function WarehouseSelector({
  value,
  onChange,
  error,
  required,
  label,
  disabled
}: WarehouseSelectorProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedWarehouse = warehouses.find(w => w.id === value);

  // Fetch warehouses when dropdown opens
  useEffect(() => {
    if (isOpen && warehouses.length === 0) {
      fetchWarehouses();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const companyId = companyStore.getActiveCompanyId();
      
      const response = await fetch(`${API_URL}/api/master/warehouses?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setWarehouses(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWarehouses = warehouses.filter(warehouse => {
    const search = (searchTerm || '').toLowerCase();
    const code = (warehouse.warehouse_code ?? '').toString();
    const nameEn = (warehouse.name_en ?? warehouse.name ?? warehouse.warehouse_name ?? '').toString();
    const nameAr = (warehouse.name_ar ?? '').toString();
    return (
      code.toLowerCase().includes(search) ||
      nameEn.toLowerCase().includes(search) ||
      nameAr.toLowerCase().includes(search)
    );
  });

  const handleSelect = (warehouseId: number) => {
    onChange(warehouseId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selector Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
          ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-900 cursor-pointer'}
          ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}
          hover:border-gray-400 dark:hover:border-gray-600 transition-colors`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedWarehouse ? (
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">
                  {selectedWarehouse.warehouse_code || '-'}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                  {selectedWarehouse.name_en || selectedWarehouse.name || selectedWarehouse.warehouse_name || '-'}
                </span>
              </div>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">Select warehouse...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedWarehouse && !disabled && (
              <XMarkIcon
                className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={handleClear}
              />
            )}
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search warehouses..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                  bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Warehouse List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading warehouses...
              </div>
            ) : filteredWarehouses.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No warehouses found
              </div>
            ) : (
              filteredWarehouses.map((warehouse) => (
                <button
                  key={warehouse.id}
                  type="button"
                  onClick={() => handleSelect(warehouse.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                    ${value === warehouse.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {warehouse.warehouse_code || '-'}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {warehouse.name_en || warehouse.name || warehouse.warehouse_name || '-'}
                  </div>
                  {warehouse.name_ar && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {warehouse.name_ar}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
