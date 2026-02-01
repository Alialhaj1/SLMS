/**
 * EXPENSES TAB - Purchase Invoice
 * Purpose: Additional costs (freight, customs, insurance) + Distribution to items
 * Business Logic: Distributes expenses based on quantity/value/weight/volume/manual
 */

import React, { useState, useMemo, useEffect } from 'react';
import { InvoiceFormData, InvoiceExpense } from '../hooks/useInvoiceForm';
import { InvoiceMasterData } from '../hooks/useInvoiceMasterData';
import ExchangeRateField from '../../../ui/ExchangeRateField';

interface ExpensesTabProps {
  formData: InvoiceFormData;
  masterData: InvoiceMasterData;
  canEdit: boolean;
  onAddExpense: (expense: InvoiceExpense) => void;
  onUpdateExpense: (index: number, updates: Partial<InvoiceExpense>) => void;
  onRemoveExpense: (index: number) => void;
}

interface ExpenseFormData {
  expense_type_id: number | null;
  expense_type_code: string;
  expense_type_name: string;
  distribution_base: 'quantity' | 'value' | 'weight' | 'volume' | 'manual';
  amount: number;
  currency_id: number | null;
  exchange_rate: number;
  vendor_id: number | null;
  reference_number: string;
  notes: string;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  formData,
  masterData,
  canEdit,
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense,
}) => {
  
  // =============================================
  // STATE
  // =============================================
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState<number | null>(null);
  const [selectedExpenseCurrencyCode, setSelectedExpenseCurrencyCode] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>({
    expense_type_id: null,
    expense_type_code: '',
    expense_type_name: '',
    distribution_base: 'value',
    amount: 0,
    currency_id: formData.currency_id,
    exchange_rate: formData.exchange_rate,
    vendor_id: null,
    reference_number: '',
    notes: '',
  });
  const [expenseFormErrors, setExpenseFormErrors] = useState<Record<string, string>>({});
  const [showDistributionPreview, setShowDistributionPreview] = useState(false);

  // =============================================
  // CALCULATED VALUES
  // =============================================
  const totalExpensesInBaseCurrency = useMemo(() => 
    formData.expenses.reduce((sum, exp) => sum + exp.base_amount, 0),
    [formData.expenses]
  );

  const calculateExpenseDistribution = (
    distributionBase: 'quantity' | 'value' | 'weight' | 'volume' | 'manual',
    expenseAmount: number
  ) => {
    if (formData.items.length === 0) return [];

    let allocations: { item_index: number; item_code: string; item_name: string; basis_value: number; allocated_amount: number }[] = [];

    if (distributionBase === 'quantity') {
      // Distribute by quantity
      const totalQty = formData.items.reduce((sum, item) => sum + item.quantity, 0);
      allocations = formData.items.map((item, index) => {
        const basisValue = item.quantity;
        const percentage = totalQty > 0 ? basisValue / totalQty : 0;
        return {
          item_index: index,
          item_code: item.item_code,
          item_name: item.item_name,
          basis_value: basisValue,
          allocated_amount: expenseAmount * percentage,
        };
      });
    } else if (distributionBase === 'value') {
      // Distribute by line value (qty * price)
      const totalValue = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      allocations = formData.items.map((item, index) => {
        const basisValue = item.quantity * item.unit_price;
        const percentage = totalValue > 0 ? basisValue / totalValue : 0;
        return {
          item_index: index,
          item_code: item.item_code,
          item_name: item.item_name,
          basis_value: basisValue,
          allocated_amount: expenseAmount * percentage,
        };
      });
    } else if (distributionBase === 'manual') {
      // Manual allocation - distribute equally for now
      const amountPerItem = expenseAmount / formData.items.length;
      allocations = formData.items.map((item, index) => ({
        item_index: index,
        item_code: item.item_code,
        item_name: item.item_name,
        basis_value: 1,
        allocated_amount: amountPerItem,
      }));
    }
    // TODO: 'weight' and 'volume' require item master data with weight/volume fields

    return allocations;
  };

  const distributionPreview = useMemo(() => {
    if (!showDistributionPreview || !expenseForm.expense_type_id) return [];
    
    const baseAmount = expenseForm.amount * expenseForm.exchange_rate;
    return calculateExpenseDistribution(expenseForm.distribution_base, baseAmount);
  }, [showDistributionPreview, expenseForm, formData.items]);

  // =============================================
  // VALIDATION
  // =============================================
  const validateExpenseForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!expenseForm.expense_type_id) {
      newErrors.expense_type_id = 'Expense type is required';
    }

    if (expenseForm.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!expenseForm.currency_id) {
      newErrors.currency_id = 'Currency is required';
    }

    setExpenseFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================
  // HANDLERS
  // =============================================
  const handleExpenseTypeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const typeId = parseInt(e.target.value);
    const expenseType = masterData.expenseTypes.find(et => et.id === typeId);
    
    if (expenseType) {
      setExpenseForm(prev => ({
        ...prev,
        expense_type_id: expenseType.id,
        expense_type_code: expenseType.code,
        expense_type_name: expenseType.name,
        distribution_base: expenseType.distribution_base as any,
      }));
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const currencyId = parseInt(e.target.value);
    const currency = masterData.currencies.find(c => c.id === currencyId);
    
    setSelectedExpenseCurrencyCode(currency?.code || null);
    setExpenseForm(prev => ({
      ...prev,
      currency_id: currencyId,
      exchange_rate: currency?.is_base_currency ? 1.0 : prev.exchange_rate,
    }));
  };

  const handleAddExpense = () => {
    if (!validateExpenseForm()) return;
    
    const newExpense: InvoiceExpense = {
      temp_id: Math.random().toString(36).substr(2, 9),
      expense_type_id: expenseForm.expense_type_id!,
      expense_type_code: expenseForm.expense_type_code,
      expense_type_name: expenseForm.expense_type_name,
      amount: expenseForm.amount,
      currency_id: expenseForm.currency_id,
      exchange_rate: expenseForm.exchange_rate,
      base_amount: expenseForm.amount * expenseForm.exchange_rate,
      distribution_base: expenseForm.distribution_base,
      is_distributed: false,
      vendor_id: expenseForm.vendor_id,
      reference_number: expenseForm.reference_number,
      notes: expenseForm.notes,
    };
    
    onAddExpense(newExpense);
    resetExpenseForm();
    setIsAddingExpense(false);
    setShowDistributionPreview(false);
  };

  const handleEditExpense = (index: number) => {
    const expense = formData.expenses[index];
    setExpenseForm({
      expense_type_id: expense.expense_type_id,
      expense_type_code: expense.expense_type_code || '',
      expense_type_name: expense.expense_type_name || '',
      distribution_base: expense.distribution_base || 'value',
      amount: expense.amount,
      currency_id: expense.currency_id || null,
      exchange_rate: expense.exchange_rate || 1,
      vendor_id: expense.vendor_id || null,
      reference_number: expense.reference_number || '',
      notes: expense.notes || '',
    });
    // Set currency code for exchange rate field
    if (expense.currency_id) {
      const currency = masterData.currencies.find(c => c.id === expense.currency_id);
      if (currency) {
        setSelectedExpenseCurrencyCode(currency.code);
      }
    }
    setEditingExpenseIndex(index);
    setIsAddingExpense(true);
  };

  const handleUpdateExpense = () => {
    if (!validateExpenseForm() || editingExpenseIndex === null) return;
    
    onUpdateExpense(editingExpenseIndex, {
      expense_type_id: expenseForm.expense_type_id!,
      expense_type_code: expenseForm.expense_type_code,
      expense_type_name: expenseForm.expense_type_name,
      amount: expenseForm.amount,
      currency_id: expenseForm.currency_id,
      exchange_rate: expenseForm.exchange_rate,
      base_amount: expenseForm.amount * expenseForm.exchange_rate,
      distribution_base: expenseForm.distribution_base,
      vendor_id: expenseForm.vendor_id,
      reference_number: expenseForm.reference_number,
      notes: expenseForm.notes,
    });
    
    resetExpenseForm();
    setEditingExpenseIndex(null);
    setIsAddingExpense(false);
    setShowDistributionPreview(false);
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      expense_type_id: null,
      expense_type_code: '',
      expense_type_name: '',
      distribution_base: 'value',
      amount: 0,
      currency_id: formData.currency_id,
      exchange_rate: formData.exchange_rate,
      vendor_id: null,
      reference_number: '',
      notes: '',
    });
    setExpenseFormErrors({});
    setSelectedExpenseCurrencyCode(null);
  };

  const handleCancelAdd = () => {
    resetExpenseForm();
    setEditingExpenseIndex(null);
    setIsAddingExpense(false);
    setShowDistributionPreview(false);
  };

  // =============================================
  // RENDER - Expenses Table
  // =============================================
  const renderExpensesTable = () => {
    if (formData.expenses.length === 0) {
      return (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No additional expenses</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Freight, customs, insurance, etc.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Expense Type</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Amount</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Currency</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Exchange Rate</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Base Amount</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Distribution</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">Status</th>
              {canEdit && <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
            {formData.expenses.map((expense, index) => (
              <tr key={expense.temp_id || expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-3 py-2 text-sm">
                  <div className="font-medium text-slate-900 dark:text-white">{expense.expense_type_code}</div>
                  <div className="text-xs text-slate-500">{expense.expense_type_name}</div>
                  {expense.reference_number && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Ref: {expense.reference_number}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-right font-semibold text-slate-900 dark:text-white">
                  {expense.amount.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                  {masterData.currencies.find(c => c.id === expense.currency_id)?.code || 'SAR'}
                </td>
                <td className="px-3 py-2 text-sm text-right text-slate-700 dark:text-slate-300">
                  {expense.exchange_rate.toFixed(4)}
                </td>
                <td className="px-3 py-2 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                  {expense.base_amount.toFixed(2)} SAR
                </td>
                <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700">
                    {expense.distribution_base}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {expense.is_distributed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Distributed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      Pending
                    </span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleEditExpense(index)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mr-2"
                      title="Edit"
                    >
                      <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onRemoveExpense(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                      title="Delete"
                    >
                      <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // =============================================
  // RENDER - Expense Form
  // =============================================
  const renderExpenseForm = () => {
    if (!isAddingExpense) return null;

    const selectedCurrency = masterData.currencies.find(c => c.id === expenseForm.currency_id);
    const isForeignCurrency = selectedCurrency && !selectedCurrency.is_base_currency;

    return (
      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4 border border-slate-200 dark:border-slate-600">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          {editingExpenseIndex !== null ? 'Edit Additional Expense' : 'Add Additional Expense'}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {/* Expense Type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Expense Type <span className="text-red-500">*</span>
            </label>
            <select
              value={expenseForm.expense_type_id || ''}
              onChange={handleExpenseTypeSelect}
              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                expenseFormErrors.expense_type_id ? 'border-red-500' : ''
              }`}
            >
              <option value="">-- Select Expense Type --</option>
              {masterData.expenseTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </select>
            {expenseFormErrors.expense_type_id && (
              <p className="text-xs text-red-500 mt-0.5">{expenseFormErrors.expense_type_id}</p>
            )}
          </div>

          {/* Distribution Base */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Distribution Basis</label>
            <select
              value={expenseForm.distribution_base}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, distribution_base: e.target.value as any }))}
              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="quantity">By Quantity</option>
              <option value="value">By Value</option>
              <option value="weight">By Weight</option>
              <option value="volume">By Volume</option>
              <option value="manual">Manual</option>
            </select>
            <p className="text-xs text-slate-500 mt-0.5">How to distribute to items</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                expenseFormErrors.amount ? 'border-red-500' : ''
              }`}
            />
            {expenseFormErrors.amount && <p className="text-xs text-red-500 mt-0.5">{expenseFormErrors.amount}</p>}
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Currency <span className="text-red-500">*</span>
            </label>
            <select
              value={expenseForm.currency_id || ''}
              onChange={handleCurrencyChange}
              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                expenseFormErrors.currency_id ? 'border-red-500' : ''
              }`}
            >
              <option value="">-- Select --</option>
              {masterData.currencies.map(currency => (
                <option key={currency.id} value={currency.id}>
                  {currency.code}
                </option>
              ))}
            </select>
          </div>

          {/* Exchange Rate (if foreign currency) */}
          {isForeignCurrency ? (
            <ExchangeRateField
              currencyCode={selectedExpenseCurrencyCode}
              value={String(expenseForm.exchange_rate)}
              onChange={(value) => setExpenseForm(prev => ({ ...prev, exchange_rate: parseFloat(value) || 1 }))}
              hideWhenBaseCurrency={true}
              label="Exchange Rate"
            />
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Base Amount</label>
              <input
                type="text"
                value={(expenseForm.amount * expenseForm.exchange_rate).toFixed(2) + ' SAR'}
                disabled
                className="w-full px-2 py-1.5 text-sm border rounded bg-blue-50 dark:bg-blue-900/20 dark:border-slate-600 font-semibold text-blue-900 dark:text-blue-300"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {/* Vendor (Optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Expense Vendor (Optional)</label>
            <select
              value={expenseForm.vendor_id || ''}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, vendor_id: parseInt(e.target.value) }))}
              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="">-- Same as invoice vendor --</option>
              {masterData.vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.code} - {vendor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Reference Number</label>
            <input
              type="text"
              value={expenseForm.reference_number}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, reference_number: e.target.value }))}
              placeholder="Bill number, receipt, etc."
              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
          <input
            type="text"
            value={expenseForm.notes}
            onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional notes"
            className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
        </div>

        {/* Distribution Preview Toggle */}
        {formData.items.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowDistributionPreview(!showDistributionPreview)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {showDistributionPreview ? 'Hide' : 'Preview'} Distribution
            </button>
          </div>
        )}

        {/* Distribution Preview Table */}
        {showDistributionPreview && distributionPreview.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded p-3 mb-3">
            <h5 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">Distribution Preview</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600">
                    <th className="text-left py-1 text-slate-700 dark:text-slate-300">Item</th>
                    <th className="text-right py-1 text-slate-700 dark:text-slate-300">Basis</th>
                    <th className="text-right py-1 text-slate-700 dark:text-slate-300">Allocated</th>
                  </tr>
                </thead>
                <tbody>
                  {distributionPreview.map((alloc, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-1 text-slate-900 dark:text-white">{alloc.item_code}</td>
                      <td className="py-1 text-right text-slate-600 dark:text-slate-400">{alloc.basis_value.toFixed(2)}</td>
                      <td className="py-1 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {alloc.allocated_amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={editingExpenseIndex !== null ? handleUpdateExpense : handleAddExpense}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-medium"
          >
            {editingExpenseIndex !== null ? 'Update Expense' : 'Add Expense'}
          </button>
          <button
            onClick={handleCancelAdd}
            className="px-3 py-1.5 text-sm bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-400 dark:hover:bg-slate-500"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // =============================================
  // MAIN RENDER
  // =============================================
  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Additional Expenses</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formData.expenses.length} expense(s) • Total: {totalExpensesInBaseCurrency.toFixed(2)} SAR
          </p>
        </div>
        
        {canEdit && !isAddingExpense && (
          <button
            onClick={() => setIsAddingExpense(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <p className="font-medium mb-1">About Additional Expenses</p>
            <p className="text-xs">
              Freight, customs, insurance, and other costs will be distributed to items based on quantity, value, weight, or volume.
              This affects the <strong>landed cost per unit</strong> for accurate inventory valuation.
            </p>
          </div>
        </div>
      </div>

      {/* Expense Form */}
      {renderExpenseForm()}

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
        {renderExpensesTable()}
      </div>

      {/* Warning if no items */}
      {formData.expenses.length > 0 && formData.items.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Expenses cannot be distributed without invoice items. Add items first.
          </p>
        </div>
      )}

    </div>
  );
};
