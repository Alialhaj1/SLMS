import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { XMarkIcon, PlusIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Modal from '../ui/Modal';

interface ExpenseType {
  code: string;
  name: string;
  name_ar?: string;
}

interface Shipment {
  id: number;
  shipment_number: string;
  bl_no?: string;
  items_count?: number;
  total_quantity?: number;
  total_weight?: number;
  total_volume?: number;
  total_value?: number;
}

interface ExpenseAllocationProps {
  expenses: any[];
  items: any[];
  onAllocationsChange: (allocations: any[]) => void;
  currencySymbol: string;
  companyId: number;
}

export default function ExpenseAllocationAndDistribution({
  expenses,
  items,
  onAllocationsChange,
  currencySymbol,
  companyId
}: ExpenseAllocationProps) {
  const { locale } = useTranslation();
  const [allocationMethod, setAllocationMethod] = useState<'value' | 'quantity' | 'weight' | 'volume' | 'manual'>('value');
  const [allocations, setAllocations] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  // Recalculate allocations when method, expenses, or items change
  useEffect(() => {
    if (!items.length || !expenses.length) {
      setAllocations([]);
      return;
    }

    const totalExpenseAmount = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    
    if (totalExpenseAmount === 0) {
      setAllocations([]);
      return;
    }

    let newAllocations = [];

    if (allocationMethod === 'manual') {
      // Keep existing manual allocations if possible, otherwise reset
      // For now, simple logic: reset to spread evenly if switching to manual
      return; 
    }

    // Calculate totals for distribution basis
    const totalValue = items.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);
    const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    // Assuming weight/volume fields might exist on items or product definition
    // For this implementation, we'll check if they exist on the item object
    const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 0), 0);
    const totalVolume = items.reduce((sum, item) => sum + (Number(item.volume) || 0) * (Number(item.quantity) || 0), 0);

    newAllocations = items.map(item => {
      let ratio = 0;
      
      switch (allocationMethod) {
        case 'value':
          ratio = totalValue > 0 ? (Number(item.line_total) || 0) / totalValue : 0;
          break;
        case 'quantity':
          ratio = totalQty > 0 ? (Number(item.quantity) || 0) / totalQty : 0;
          break;
        case 'weight':
          ratio = totalWeight > 0 ? ((Number(item.weight) || 0) * (Number(item.quantity) || 0)) / totalWeight : 0;
          break;
        case 'volume':
          ratio = totalVolume > 0 ? ((Number(item.volume) || 0) * (Number(item.quantity) || 0)) / totalVolume : 0;
          break;
      }

      const allocatedAmount = totalExpenseAmount * ratio;
      
      return {
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        ratio: ratio,
        allocated_amount: allocatedAmount,
        cost_per_unit: (item.quantity > 0) ? (allocatedAmount / item.quantity) : 0
      };
    });

    setAllocations(newAllocations);
    onAllocationsChange(newAllocations);

  }, [allocationMethod, expenses, items]);

  const methods = [
    { id: 'value', name: locale === 'ar' ? 'حسب القيمة' : 'By Value' },
    { id: 'quantity', name: locale === 'ar' ? 'حسب الكمية' : 'By Quantity' },
    { id: 'weight', name: locale === 'ar' ? 'حسب الوزن' : 'By Weight' },
    { id: 'volume', name: locale === 'ar' ? 'حسب الحجم' : 'By Volume' },
    { id: 'manual', name: locale === 'ar' ? 'يدوي' : 'Manual' }
  ];

  if (!expenses.length || !items.length) return null;

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-900/50 mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalculatorIcon className="h-5 w-5 text-blue-600" />
            {locale === 'ar' ? 'توزيع المصاريف' : 'Expenses Distribution'}
          </h4>
          <p className="text-sm text-gray-500">
            {locale === 'ar' 
              ? `إجمالي المصاريف: ${totalExpenses.toFixed(2)} ${currencySymbol}` 
              : `Total Expenses: ${currencySymbol} ${totalExpenses.toFixed(2)}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {locale === 'ar' ? 'طريقة التوزيع:' : 'Method:'}
          </span>
          <select
            value={allocationMethod}
            onChange={(e) => setAllocationMethod(e.target.value as any)}
            className="text-sm border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            {methods.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => setShowDetails(!showDetails)}>
            {showDetails 
              ? (locale === 'ar' ? 'إخفاء التفاصيل' : 'Hide Details') 
              : (locale === 'ar' ? 'عرض التفاصيل' : 'Show Details')}
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="overflow-x-auto border rounded-md border-gray-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {locale === 'ar' ? 'الصنف' : 'Item'}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {locale === 'ar' ? 'قيمة السطر' : 'Line Value'}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {locale === 'ar' ? 'النسبة' : 'Ratio'}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {locale === 'ar' ? 'المبلغ الموزع' : 'Allocated Amt'}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {locale === 'ar' ? 'التكلفة / وحدة' : 'Cost / Unit'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {allocations.map((alloc, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                    {alloc.item_code} - {alloc.item_name}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-500">
                    {Number(items.find(i => i.item_id === alloc.item_id)?.line_total || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-500">
                    {(alloc.ratio * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-medium text-blue-600">
                    {alloc.allocated_amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-500">
                    {alloc.cost_per_unit.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-sm font-bold text-gray-900 dark:text-white text-right">
                  {locale === 'ar' ? 'الإجمالي' : 'Total'}
                </td>
                <td className="px-3 py-2 text-sm font-bold text-blue-600 text-right">
                  {allocations.reduce((sum, a) => sum + a.allocated_amount, 0).toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
