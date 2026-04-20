/**
 * 🏦 INVOICE FINANCIALS TAB
 * =========================
 * Currency, payment terms, and payment method for Purchase Invoice
 */

import React, { useState, useEffect } from 'react';
import Input from '../../ui/Input';
import CurrencySelector from '../../shared/CurrencySelector';
import PaymentMethodSelector from '../../shared/PaymentMethodSelector';
import type { PaymentBehaviorInfo } from '../../shared/PaymentMethodSelector';
import ExchangeRateField from '../../ui/ExchangeRateField';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import type { InvoiceFormData, PaymentTermRef } from './types';

interface InvoiceFinancialsProps {
  formData: InvoiceFormData;
  paymentTerms: PaymentTermRef[];
  companyId: number;
  locale: string;
  onFormChange: (updates: Partial<InvoiceFormData>) => void;
  /** Optional: Pass the currency code directly for edit mode */
  initialCurrencyCode?: string | null;
}

export function InvoiceFinancials({
  formData,
  paymentTerms,
  companyId,
  locale,
  onFormChange,
  initialCurrencyCode
}: InvoiceFinancialsProps) {
  const isArabic = locale === 'ar';
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(initialCurrencyCode || null);

  // Update selectedCurrencyCode when initialCurrencyCode changes (for edit mode)
  useEffect(() => {
    if (initialCurrencyCode) {
      setSelectedCurrencyCode(initialCurrencyCode);
    }
  }, [initialCurrencyCode]);

  return (
    <div className="space-y-6">
      {/* Currency & Payment Terms */}
      <div className="grid grid-cols-2 gap-6">
        <CurrencySelector
          companyId={companyId}
          value={formData.currency_id}
          onChange={(val) => onFormChange({ currency_id: val })}
          onCurrencyCodeChange={setSelectedCurrencyCode}
          label={isArabic ? 'العملة' : 'Currency'}
        />

        {/* Exchange Rate - only shows when currency differs from base */}
        <ExchangeRateField
          currencyCode={selectedCurrencyCode}
          value={formData.exchange_rate}
          onChange={(value) => onFormChange({ exchange_rate: value })}
          hideWhenBaseCurrency={true}
          label={isArabic ? 'سعر الصرف' : 'Exchange Rate'}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            {isArabic ? 'شروط الدفع' : 'Payment Terms'}
          </label>
          <select
            className="input w-full dark:bg-slate-700 dark:border-slate-600"
            value={formData.payment_terms_id || ''}
            onChange={e => onFormChange({ payment_terms_id: Number(e.target.value) || null })}
          >
            <option value="">{isArabic ? 'بدون' : 'None'}</option>
            {paymentTerms.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.due_days} {isArabic ? 'يوم' : 'days'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payment Method Section */}
      <div className="border-t pt-4 dark:border-gray-700">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <BanknotesIcon className="w-5 h-5 text-green-600" />
          {isArabic ? 'وسيلة الدفع' : 'Payment Method'}
        </h4>

        <PaymentMethodSelector
          paymentMethodId={formData.payment_method_id}
          bankAccountId={formData.bank_account_id}
          cashBoxId={formData.cash_box_id}
          chequeNumber={formData.cheque_number}
          chequeDate={formData.cheque_date}
          onPaymentMethodChange={(methodId, _type, _beh) => onFormChange({
            payment_method_id: methodId
          })}
          onBankAccountChange={(id) => onFormChange({ bank_account_id: id })}
          onCashBoxChange={(id) => onFormChange({ cash_box_id: id })}
          onChequeNumberChange={(v) => onFormChange({ cheque_number: v })}
          onChequeDateChange={(v) => onFormChange({ cheque_date: v })}
          companyId={companyId}
          locale={locale}
          showInlineFields={true}
        />
      </div>
    </div>
  );
}

export default InvoiceFinancials;
