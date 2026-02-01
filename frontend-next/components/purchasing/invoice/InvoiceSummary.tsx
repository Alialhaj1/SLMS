/**
 * 📊 INVOICE SUMMARY
 * ==================
 * Footer with totals and action buttons for Purchase Invoice
 */

import React from 'react';
import Button from '../../ui/Button';
import type { InvoiceFormData } from './types';

interface InvoiceSummaryProps {
  formData: InvoiceFormData;
  locale: string;
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function InvoiceSummary({
  formData,
  locale,
  isLoading,
  onCancel,
  onSubmit
}: InvoiceSummaryProps) {
  const isArabic = locale === 'ar';
  const isLocal = formData.invoice_type === 'local';

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        {/* Totals */}
        <div className="text-sm space-y-1 sm:space-y-0 sm:flex sm:items-center">
          <span className="text-gray-500">
            {isArabic ? 'المجموع الفرعي:' : 'Subtotal:'}
          </span>
          <span className="font-bold mx-2">{Number(formData.subtotal || 0).toFixed(2)}</span>

          {isLocal && (
            <>
              <span className="hidden sm:inline mx-2 text-gray-300">|</span>
              <span className="text-gray-500">
                {isArabic ? 'الضريبة:' : 'Tax:'}
              </span>
              <span className="font-bold mx-2">{Number(formData.tax_amount || 0).toFixed(2)}</span>
            </>
          )}

          <span className="hidden sm:inline mx-2 text-gray-300">|</span>
          <span className="text-gray-500 text-lg">
            {isArabic ? 'الإجمالي:' : 'Total:'}
          </span>
          <span className="text-xl font-bold text-blue-600 mx-2">
            {Number(formData.total_amount || 0).toFixed(2)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={onSubmit} loading={isLoading}>
            {isArabic ? 'حفظ الفاتورة' : 'Save Invoice'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default InvoiceSummary;
