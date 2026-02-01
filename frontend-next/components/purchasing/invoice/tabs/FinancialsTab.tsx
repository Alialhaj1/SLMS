/**
 * FINANCIALS TAB - Purchase Invoice
 * Purpose: Payment details + Withholding tax + Accounting preview
 * Features: Bank/Cash/Cheque payment methods, Dr/Cr journal preview
 */

import React, { useMemo } from 'react';
import { InvoiceFormData } from '../hooks/useInvoiceForm';
import { InvoiceMasterData } from '../hooks/useInvoiceMasterData';

interface FinancialsTabProps {
  formData: InvoiceFormData;
  masterData: InvoiceMasterData;
  canEdit: boolean;
  onFieldChange: (field: keyof InvoiceFormData, value: any) => void;
}

interface AccountingEntry {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
}

export const FinancialsTab: React.FC<FinancialsTabProps> = ({
  formData,
  masterData,
  canEdit,
  onFieldChange,
}) => {
  
  // =============================================
  // DERIVED STATE
  // =============================================
  const selectedPaymentMethod = useMemo(() => 
    masterData.paymentMethods.find(pm => pm.id === formData.payment_method_id),
    [masterData.paymentMethods, formData.payment_method_id]
  );

  const requiresBankAccount = useMemo(() => 
    selectedPaymentMethod?.payment_type === 'BANK' || selectedPaymentMethod?.requires_bank_account,
    [selectedPaymentMethod]
  );

  const requiresCashBox = useMemo(() => 
    selectedPaymentMethod?.payment_type === 'CASH',
    [selectedPaymentMethod]
  );

  const requiresChequeDetails = useMemo(() => 
    selectedPaymentMethod?.requires_cheque_details,
    [selectedPaymentMethod]
  );

  const netPayable = useMemo(() => 
    formData.total_amount - formData.withholding_tax_amount,
    [formData.total_amount, formData.withholding_tax_amount]
  );

  // =============================================
  // ACCOUNTING PREVIEW CALCULATION
  // =============================================
  const accountingEntries = useMemo((): AccountingEntry[] => {
    const entries: AccountingEntry[] = [];

    if (formData.items.length === 0) return entries;

    // Dr: Inventory / Expense Account (subtotal - discount)
    const inventoryAmount = formData.subtotal - formData.total_discount;
    if (inventoryAmount > 0) {
      entries.push({
        account_code: '1500',
        account_name: 'Inventory / Purchases',
        debit: inventoryAmount,
        credit: 0,
        description: 'Purchase invoice items',
      });
    }

    // Dr: VAT Input Account (tax)
    if (formData.total_tax > 0) {
      entries.push({
        account_code: '1250',
        account_name: 'VAT Input',
        debit: formData.total_tax,
        credit: 0,
        description: 'Input tax on purchases',
      });
    }

    // Dr: Additional Expenses (freight, customs, etc.)
    if (formData.total_expenses > 0) {
      entries.push({
        account_code: '5100',
        account_name: 'Freight & Customs',
        debit: formData.total_expenses,
        credit: 0,
        description: 'Additional purchase expenses',
      });
    }

    // Cr: Withholding Tax Payable (if applicable)
    if (formData.withholding_tax_amount > 0) {
      entries.push({
        account_code: '2300',
        account_name: 'Withholding Tax Payable',
        debit: 0,
        credit: formData.withholding_tax_amount,
        description: `Withholding tax ${formData.withholding_tax_rate}%`,
      });
    }

    // Cr: Vendor Payable (net amount)
    if (netPayable > 0) {
      entries.push({
        account_code: '2100',
        account_name: 'Accounts Payable - Vendors',
        debit: 0,
        credit: netPayable,
        description: 'Amount due to vendor',
      });
    }

    return entries;
  }, [formData, netPayable]);

  const totalDebits = useMemo(() => 
    accountingEntries.reduce((sum, entry) => sum + entry.debit, 0),
    [accountingEntries]
  );

  const totalCredits = useMemo(() => 
    accountingEntries.reduce((sum, entry) => sum + entry.credit, 0),
    [accountingEntries]
  );

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  // =============================================
  // HANDLERS
  // =============================================
  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const methodId = parseInt(e.target.value);
    onFieldChange('payment_method_id', methodId);
    
    // Reset dependent fields
    const method = masterData.paymentMethods.find(pm => pm.id === methodId);
    if (method?.payment_type !== 'BANK') {
      onFieldChange('bank_account_id', null);
    }
    if (method?.payment_type !== 'CASH') {
      onFieldChange('cash_box_id', null);
    }
    if (!method?.requires_cheque_details) {
      onFieldChange('cheque_number', '');
      onFieldChange('cheque_date', '');
    }
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="space-y-6">
      
      {/* PAYMENT DETAILS */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Payment Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Payment Method
            </label>
            <select
              value={formData.payment_method_id || ''}
              onChange={handlePaymentMethodChange}
              disabled={!canEdit || masterData.loading.paymentMethods}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">-- Select Method --</option>
              {masterData.paymentMethods.map(method => (
                <option key={method.id} value={method.id}>
                  {method.name} ({method.payment_type})
                </option>
              ))}
            </select>
          </div>

          {/* Expected Payment Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Expected Payment Date
            </label>
            <input
              type="date"
              value={formData.expected_payment_date}
              onChange={(e) => onFieldChange('expected_payment_date', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            />
            <p className="mt-1 text-xs text-slate-500">
              Calculated from due date: {formData.due_date}
            </p>
          </div>

          {/* Bank Account (if required) */}
          {requiresBankAccount && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Bank Account <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.bank_account_id || ''}
                onChange={(e) => onFieldChange('bank_account_id', parseInt(e.target.value))}
                disabled={!canEdit || masterData.loading.bankAccounts}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                  !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
              >
                <option value="">-- Select Bank Account --</option>
                {masterData.bankAccounts.map(ba => (
                  <option key={ba.id} value={ba.id}>
                    {ba.bank_name} - {ba.account_number}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cash Box (if required) */}
          {requiresCashBox && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Cash Box <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.cash_box_id || ''}
                onChange={(e) => onFieldChange('cash_box_id', parseInt(e.target.value))}
                disabled={!canEdit || masterData.loading.cashBoxes}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                  !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
              >
                <option value="">-- Select Cash Box --</option>
                {masterData.cashBoxes.map(cb => (
                  <option key={cb.id} value={cb.id}>
                    {cb.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cheque Number (if required) */}
          {requiresChequeDetails && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Cheque Number
                </label>
                <input
                  type="text"
                  value={formData.cheque_number}
                  onChange={(e) => onFieldChange('cheque_number', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Enter cheque number"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                    !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Cheque Date
                </label>
                <input
                  type="date"
                  value={formData.cheque_date}
                  onChange={(e) => onFieldChange('cheque_date', e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                    !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* WITHHOLDING TAX */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Withholding Tax</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Withholding Tax Rate */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Withholding Tax Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.withholding_tax_rate}
              onChange={(e) => onFieldChange('withholding_tax_rate', parseFloat(e.target.value) || 0)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            />
            <p className="mt-1 text-xs text-slate-500">Usually 0%, 5%, or 10% in Saudi Arabia</p>
          </div>

          {/* Withholding Tax Amount (Calculated) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Withholding Tax Amount
            </label>
            <input
              type="text"
              value={formData.withholding_tax_amount.toFixed(2)}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-slate-100 dark:bg-slate-700 dark:border-slate-600 font-semibold text-slate-900 dark:text-white cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-500">Calculated automatically</p>
          </div>

          {/* Net Payable */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Net Payable to Vendor
            </label>
            <input
              type="text"
              value={netPayable.toFixed(2)}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-slate-600 font-bold text-green-900 dark:text-green-300 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-500">Total - Withholding Tax</p>
          </div>
        </div>

        {formData.withholding_tax_amount > 0 && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              ℹ️ Withholding tax of <strong>{formData.withholding_tax_amount.toFixed(2)} SAR</strong> will be 
              withheld and remitted to tax authority. Vendor receives net amount of <strong>{netPayable.toFixed(2)} SAR</strong>.
            </p>
          </div>
        )}
      </section>

      {/* ACCOUNTING PREVIEW */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Accounting Preview</h3>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isBalanced 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {isBalanced ? '✓ Balanced' : '⚠ Unbalanced'}
          </div>
        </div>

        {accountingEntries.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No items to preview</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700 border-b-2 border-slate-300 dark:border-slate-600">
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Account Code</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Account Name</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Description</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Debit</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                {accountingEntries.map((entry, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-2 text-sm font-mono text-slate-900 dark:text-white">{entry.account_code}</td>
                    <td className="px-4 py-2 text-sm text-slate-900 dark:text-white">{entry.account_name}</td>
                    <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">{entry.description}</td>
                    <td className="px-4 py-2 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                      {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-semibold text-green-600 dark:text-green-400">
                      {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-600">
                <tr className="bg-slate-50 dark:bg-slate-700 font-bold">
                  <td colSpan={3} className="px-4 py-2 text-sm text-slate-900 dark:text-white">TOTALS</td>
                  <td className="px-4 py-2 text-sm text-right text-blue-600 dark:text-blue-400">{totalDebits.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400">{totalCredits.toFixed(2)}</td>
                </tr>
                {!isBalanced && (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center">
                      <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                        ⚠ Difference: {Math.abs(totalDebits - totalCredits).toFixed(2)} SAR
                      </span>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}

        {accountingEntries.length > 0 && (
          <div className="mt-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Journal Entry Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-400">Invoice Total:</span>
                <div className="font-semibold text-slate-900 dark:text-white">{formData.total_amount.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Withholding Tax:</span>
                <div className="font-semibold text-red-600">-{formData.withholding_tax_amount.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Net Payable:</span>
                <div className="font-semibold text-green-600 dark:text-green-400">{netPayable.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Balance Status:</span>
                <div className={`font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {isBalanced ? 'Balanced ✓' : 'Unbalanced ✗'}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

    </div>
  );
};
