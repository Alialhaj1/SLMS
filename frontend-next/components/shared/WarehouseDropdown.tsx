/**
 * 🏭 WAREHOUSE DROPDOWN COMPONENT
 * ================================
 * Dropdown for selecting warehouses with real-time API integration
 * 
 * Features:
 * ✅ Real-time warehouse fetching
 * ✅ AR/EN support
 * ✅ Loading states
 * ✅ Error handling
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import clsx from 'clsx';

interface Warehouse {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  warehouse_type_code?: string;
  is_active?: boolean;
}

interface WarehouseDropdownProps {
  value: number | string;
  onChange: (warehouseId: number) => void;
  companyId: number;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  showAllOption?: boolean;
}

export default function WarehouseDropdown({
  value,
  onChange,
  companyId,
  label,
  required = false,
  error,
  disabled = false,
  showAllOption = false,
}: WarehouseDropdownProps) {
  const { locale } = useTranslation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`http://localhost:4000/api/inventory/warehouses?company_id=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setWarehouses(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch warehouses:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchWarehouses();
    }
  }, [companyId]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled || loading}
        className={clsx(
          'w-full px-4 py-3 border rounded-lg',
          'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed',
          'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
          error ? 'border-red-500' : 'border-gray-300'
        )}
      >
        <option value="">
          {loading
            ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...')
            : (locale === 'ar' ? 'اختر المخزن' : 'Select Warehouse')}
        </option>
        {showAllOption && (
          <option value="0">{locale === 'ar' ? 'جميع المخازن' : 'All Warehouses'}</option>
        )}
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.code} - {locale === 'ar' && warehouse.name_ar ? warehouse.name_ar : warehouse.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
