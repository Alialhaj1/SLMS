/**
 * 💰 INVOICE EXPENSES TAB
 * =======================
 * Expense allocation and distribution for Purchase Invoice
 */

import React from 'react';
import ExpenseAllocationAndDistribution from '../ExpenseAllocationAndDistribution';
import type { InvoiceFormData, InvoiceItem, InvoiceExpense } from './types';

interface InvoiceExpensesProps {
  formData: InvoiceFormData;
  companyId: number;
  locale: string;
  onAllocationsChange: (items: InvoiceItem[], expenses: InvoiceExpense[]) => void;
}

export function InvoiceExpenses({
  formData,
  companyId,
  locale,
  onAllocationsChange
}: InvoiceExpensesProps) {
  const isArabic = locale === 'ar';

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 italic mb-2">
        {isArabic
          ? 'توزيع المصاريف (الشحن، الجمارك، إلخ) على أصناف الفاتورة لتحديد التكلفة النهائية'
          : 'Distribute Landing Costs (Freight, Customs, etc.) to items to determine Final Cost'}
      </p>
      
      <ExpenseAllocationAndDistribution
        items={formData.items}
        expenses={formData.expenses}
        onAllocationsChange={(allocations) => {
          console.log('Allocations updated:', allocations);
        }}
        currencySymbol={formData.currency_id ? 'SAR' : 'SAR'}
        companyId={companyId}
      />
    </div>
  );
}

export default InvoiceExpenses;
