/**
 * 💰 COST CENTER DROPDOWN COMPONENT
 * ==================================
 * Dropdown for selecting cost centers with real-time API integration
 * 
 * Features:
 * ✅ Real-time cost center fetching
 * ✅ AR/EN support
 * ✅ Loading states
 * ✅ Active/Inactive filtering
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import clsx from 'clsx';

interface CostCenter {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  is_active?: boolean;
}

interface CostCenterDropdownProps {
  value: number | string;
  onChange: (costCenterId: number | null) => void;
  companyId: number;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  allowNull?: boolean;
}

export default function CostCenterDropdown({
  value,
  onChange,
  companyId,
  label,
  required = false,
  error,
  disabled = false,
  allowNull = true,
}: CostCenterDropdownProps) {
  const { locale } = useTranslation();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCostCenters = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`http://localhost:4000/api/finance/cost-centers?company_id=${companyId}&is_active=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setCostCenters(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch cost centers:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchCostCenters();
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
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
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
            : (locale === 'ar' ? 'اختر مركز التكلفة' : 'Select Cost Center')}
        </option>
        {allowNull && (
          <option value="">{locale === 'ar' ? 'بدون مركز تكلفة' : 'No Cost Center'}</option>
        )}
        {costCenters.map((cc) => (
          <option key={cc.id} value={cc.id}>
            {cc.code} - {locale === 'ar' && cc.name_ar ? cc.name_ar : cc.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
