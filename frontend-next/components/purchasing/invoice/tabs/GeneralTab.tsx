/**
 * GENERAL TAB - Purchase Invoice
 * Purpose: Basic info, vendor, dates, classification
 * Business Rules: Invoice type determines required fields
 */

import React, { useMemo, useState, useEffect } from 'react';
import { InvoiceFormData } from '../hooks/useInvoiceForm';
import { InvoiceMasterData } from '../hooks/useInvoiceMasterData';
import { VendorSearchSelect } from '../components/VendorSearchSelect';
import ExchangeRateField from '../../../ui/ExchangeRateField';

interface GeneralTabProps {
  formData: InvoiceFormData;
  masterData: InvoiceMasterData;
  errors: Record<string, string | undefined>;
  canEdit: boolean;
  onFieldChange: (field: keyof InvoiceFormData, value: any) => void;
  onDueDateCalculation: (invoiceDate: string, dueDays: number) => string;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  formData,
  masterData,
  errors,
  canEdit,
  onFieldChange,
  onDueDateCalculation,
}) => {
  
  // State for currency code (for exchange rate field)
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  
  // =============================================
  // DERIVED STATE
  // =============================================
  const selectedInvoiceType = useMemo(() => 
    masterData.invoiceTypes.find(t => t.id === formData.invoice_type_id),
    [masterData.invoiceTypes, formData.invoice_type_id]
  );

  const selectedPaymentTerm = useMemo(() => 
    masterData.paymentTerms.find(pt => pt.id === formData.payment_term_id),
    [masterData.paymentTerms, formData.payment_term_id]
  );

  const selectedCurrency = useMemo(() => 
    masterData.currencies.find(c => c.id === formData.currency_id),
    [masterData.currencies, formData.currency_id]
  );

  const isForeignCurrency = useMemo(() => {
    return selectedCurrency && !selectedCurrency.is_base_currency;
  }, [selectedCurrency]);

  const requiresWarehouse = useMemo(() => {
    return selectedInvoiceType?.requires_warehouse || false;
  }, [selectedInvoiceType]);

  const requiresCustoms = useMemo(() => {
    return selectedInvoiceType?.requires_customs || false;
  }, [selectedInvoiceType]);

  // Update currency code when currency selection changes
  useEffect(() => {
    if (selectedCurrency) {
      setSelectedCurrencyCode(selectedCurrency.code);
    } else {
      setSelectedCurrencyCode(null);
    }
  }, [selectedCurrency]);

  // =============================================
  // EVENT HANDLERS
  // =============================================
  const handleInvoiceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const typeId = parseInt(e.target.value);
    onFieldChange('invoice_type_id', typeId);
    
    // Update invoice type code
    const type = masterData.invoiceTypes.find(t => t.id === typeId);
    if (type) {
      onFieldChange('invoice_type_code', type.code);
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const currencyId = parseInt(e.target.value);
    onFieldChange('currency_id', currencyId);
    
    // Reset exchange rate for base currency
    const currency = masterData.currencies.find(c => c.id === currencyId);
    if (currency?.is_base_currency) {
      onFieldChange('exchange_rate', 1.0);
    }
  };

  const handlePaymentTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termId = parseInt(e.target.value);
    onFieldChange('payment_term_id', termId);
    
    // Calculate due date
    const term = masterData.paymentTerms.find(pt => pt.id === termId);
    if (term) {
      const dueDate = onDueDateCalculation(formData.invoice_date, term.due_days);
      onFieldChange('due_date', dueDate);
      onFieldChange('expected_payment_date', dueDate);
    }
  };

  const handleInvoiceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    onFieldChange('invoice_date', newDate);
    
    // Recalculate due date if payment term exists
    if (selectedPaymentTerm) {
      const dueDate = onDueDateCalculation(newDate, selectedPaymentTerm.due_days);
      onFieldChange('due_date', dueDate);
      onFieldChange('expected_payment_date', dueDate);
    }
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="space-y-6">
      
      {/* VENDOR SELECTION */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Vendor Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Vendor <span className="text-red-500">*</span>
            </label>
            <VendorSearchSelect
              value={formData.vendor_id || null}
              vendors={masterData.vendors}
              loading={masterData.loading.vendors}
              disabled={!canEdit}
              error={errors.vendor_id}
              placeholder="Search by code, name, or phone..."
              onChange={(vendorId) => onFieldChange('vendor_id', vendorId)}
              onVendorSelect={(vendor) => {
                onFieldChange('vendor_id', vendor?.id || null);
                // Auto-fill payment term if vendor has default
                if (vendor?.payment_term_id && !formData.payment_term_id) {
                  onFieldChange('payment_term_id', vendor.payment_term_id);
                  // Calculate due date based on vendor's payment term
                  const term = masterData.paymentTerms.find(pt => pt.id === vendor.payment_term_id);
                  if (term) {
                    const dueDate = onDueDateCalculation(formData.invoice_date, term.due_days);
                    onFieldChange('due_date', dueDate);
                    onFieldChange('expected_payment_date', dueDate);
                  }
                }
              }}
            />
            {errors.vendor_id && (
              <p className="mt-1 text-sm text-red-500">{errors.vendor_id}</p>
            )}
          </div>

          {/* Vendor Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Vendor Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.vendor_invoice_number}
              onChange={(e) => onFieldChange('vendor_invoice_number', e.target.value)}
              disabled={!canEdit}
              placeholder="Enter vendor invoice number"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                errors.vendor_invoice_number ? 'border-red-500' : 'border-slate-300'
              } ${!canEdit ? 'bg-slate-100 cursor-not-allowed' : ''}`}
            />
            {errors.vendor_invoice_number && (
              <p className="mt-1 text-sm text-red-500">{errors.vendor_invoice_number}</p>
            )}
          </div>

          {/* Vendor Invoice Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Vendor Invoice Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.vendor_invoice_date}
              onChange={(e) => onFieldChange('vendor_invoice_date', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>
      </section>

      {/* INVOICE CLASSIFICATION */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Invoice Classification
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* System Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              System Invoice Number
            </label>
            <input
              type="text"
              value={formData.invoice_number}
              disabled
              placeholder="Auto-generated"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-500">Auto-generated on save</p>
          </div>

          {/* Invoice Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Invoice Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.invoice_type_id || ''}
              onChange={handleInvoiceTypeChange}
              disabled={!canEdit || masterData.loading.invoiceTypes}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                errors.invoice_type_id ? 'border-red-500' : 'border-slate-300'
              } ${!canEdit ? 'bg-slate-100 cursor-not-allowed' : ''}`}
            >
              <option value="">-- Select Type --</option>
              {masterData.invoiceTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {errors.invoice_type_id && (
              <p className="mt-1 text-sm text-red-500">{errors.invoice_type_id}</p>
            )}
            {selectedInvoiceType && (
              <p className="mt-1 text-xs text-slate-500">{selectedInvoiceType.description}</p>
            )}
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Invoice Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={handleInvoiceDateChange}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Posting Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Posting Date
            </label>
            <input
              type="date"
              value={formData.posting_date}
              onChange={(e) => onFieldChange('posting_date', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>
      </section>

      {/* FINANCIAL INFO */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Financial Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Currency <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.currency_id || ''}
              onChange={handleCurrencyChange}
              disabled={!canEdit || masterData.loading.currencies}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                errors.currency_id ? 'border-red-500' : 'border-slate-300'
              } ${!canEdit ? 'bg-slate-100 cursor-not-allowed' : ''}`}
            >
              <option value="">-- Select Currency --</option>
              {masterData.currencies.map(currency => (
                <option key={currency.id} value={currency.id}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
            {errors.currency_id && (
              <p className="mt-1 text-sm text-red-500">{errors.currency_id}</p>
            )}
          </div>

          {/* Exchange Rate (for foreign currencies) */}
          {isForeignCurrency && (
            <ExchangeRateField
              currencyCode={selectedCurrencyCode}
              value={String(formData.exchange_rate)}
              onChange={(value) => onFieldChange('exchange_rate', parseFloat(value) || 1)}
              hideWhenBaseCurrency={true}
              disabled={!canEdit}
              label="Exchange Rate"
              helperText={`1 ${selectedCurrency?.code} = ${formData.exchange_rate} SAR`}
            />
          )}

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Payment Terms
            </label>
            <select
              value={formData.payment_term_id || ''}
              onChange={handlePaymentTermChange}
              disabled={!canEdit || masterData.loading.paymentTerms}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">-- Select Terms --</option>
              {masterData.paymentTerms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name} ({term.due_days} days)
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => onFieldChange('due_date', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>
      </section>

      {/* COSTING & WAREHOUSE */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Costing & Warehouse
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cost Center */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cost Center
            </label>
            <select
              value={formData.cost_center_id || ''}
              onChange={(e) => onFieldChange('cost_center_id', parseInt(e.target.value))}
              disabled={!canEdit || masterData.loading.costCenters}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">-- Select Cost Center --</option>
              {masterData.costCenters.map(cc => (
                <option key={cc.id} value={cc.id}>
                  {cc.code} - {cc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Project
            </label>
            <select
              value={formData.project_id || ''}
              onChange={(e) => onFieldChange('project_id', parseInt(e.target.value))}
              disabled={!canEdit || masterData.loading.projects}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">-- Select Project --</option>
              {masterData.projects.map(proj => (
                <option key={proj.id} value={proj.id}>
                  {proj.code} - {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Default Warehouse (if required by invoice type) */}
          {requiresWarehouse && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Default Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.default_warehouse_id || ''}
                onChange={(e) => onFieldChange('default_warehouse_id', parseInt(e.target.value))}
                disabled={!canEdit || masterData.loading.warehouses}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                  !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
              >
                <option value="">-- Select Warehouse --</option>
                {masterData.warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* DESCRIPTION & NOTES */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Description & Notes
        </h3>
        
        <div className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onFieldChange('description', e.target.value)}
              disabled={!canEdit}
              rows={3}
              placeholder="Enter invoice description or statement"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Internal Notes
            </label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => onFieldChange('internal_notes', e.target.value)}
              disabled={!canEdit}
              rows={2}
              placeholder="Internal notes (not visible to vendor)"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                !canEdit ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>
      </section>

    </div>
  );
};
