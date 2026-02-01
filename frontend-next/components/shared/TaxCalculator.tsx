/**
 * 📊 TAX CALCULATOR COMPONENT
 * ============================
 * Tax calculation component with real-time tax rate integration
 * 
 * Features:
 * ✅ Multiple tax rates support
 * ✅ Automatic tax calculation
 * ✅ Tax breakdown display
 * ✅ AR/EN support
 * ✅ Customs duties support
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import clsx from 'clsx';

interface TaxRate {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  rate_percentage: number;
  is_default?: boolean;
  is_active?: boolean;
}

interface TaxCalculation {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  customsDuty: number;
  total: number;
}

interface TaxCalculatorProps {
  subtotal: number;
  taxRateId: number | string;
  customsDuty: number;
  onCalculate: (calculation: TaxCalculation) => void;
  companyId: number;
  disabled?: boolean;
}

export default function TaxCalculator({
  subtotal,
  taxRateId,
  customsDuty,
  onCalculate,
  companyId,
  disabled = false,
}: TaxCalculatorProps) {
  const { locale } = useTranslation();
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculation, setCalculation] = useState<TaxCalculation>({
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    customsDuty: 0,
    total: 0,
  });

  // Fetch tax rates
  useEffect(() => {
    const fetchTaxRates = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`http://localhost:4000/api/finance/tax-rates?company_id=${companyId}&is_active=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setTaxRates(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch tax rates:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchTaxRates();
    }
  }, [companyId]);

  // Calculate tax
  useEffect(() => {
    const selectedTaxRate = taxRates.find((tr) => tr.id === Number(taxRateId));
    const taxRate = selectedTaxRate ? selectedTaxRate.rate_percentage : 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount + customsDuty;

    const newCalculation: TaxCalculation = {
      subtotal,
      taxRate,
      taxAmount,
      customsDuty,
      total,
    };

    setCalculation(newCalculation);
    onCalculate(newCalculation);
  }, [subtotal, taxRateId, customsDuty, taxRates, onCalculate]);

  return (
    <div className={clsx('space-y-4', disabled && 'opacity-50 pointer-events-none')}>
      {/* Tax Rate Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {locale === 'ar' ? 'معدل الضريبة' : 'Tax Rate'}
        </label>
        <select
          value={taxRateId}
          onChange={(e) => {
            // Parent component should handle this
          }}
          disabled={disabled || loading}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
        >
          <option value="">
            {loading
              ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...')
              : (locale === 'ar' ? 'بدون ضريبة' : 'No Tax')}
          </option>
          {taxRates.map((taxRate) => (
            <option key={taxRate.id} value={taxRate.id}>
              {taxRate.code} - {locale === 'ar' && taxRate.name_ar ? taxRate.name_ar : taxRate.name} ({taxRate.rate_percentage}%)
            </option>
          ))}
        </select>
      </div>

      {/* Tax Breakdown */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
          <span className="font-medium text-gray-900 dark:text-white">{calculation.subtotal.toFixed(2)}</span>
        </div>

        {calculation.customsDuty > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{locale === 'ar' ? 'الجمارك' : 'Customs Duty'}</span>
            <span className="font-medium text-gray-900 dark:text-white">{calculation.customsDuty.toFixed(2)}</span>
          </div>
        )}

        {calculation.taxAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {locale === 'ar' ? 'الضريبة' : 'Tax'} ({calculation.taxRate}%)
            </span>
            <span className="font-medium text-gray-900 dark:text-white">{calculation.taxAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between text-base font-bold">
          <span className="text-gray-900 dark:text-white">{locale === 'ar' ? 'المجموع الإجمالي' : 'Total'}</span>
          <span className="text-blue-600 dark:text-blue-400">{calculation.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
