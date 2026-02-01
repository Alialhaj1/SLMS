/**
 * 💰 VENDOR PAYMENT FORM MODAL
 * ============================
 * Comprehensive payment form with invoice allocation system
 * 
 * ✨ FEATURES:
 * ✅ 4 sections: General Info, Payment Details, Invoice Allocation, Totals
 * ✅ Outstanding invoices table with allocation amounts
 * ✅ Auto-calculation of total allocated vs. payment amount
 * ✅ Validation for matching amounts
 * ✅ Full/Partial payment support
 * ✅ Visual warnings when amounts don't match
 */

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import CurrencySelector from '../shared/CurrencySelector';
import CostCenterDropdown from '../shared/CostCenterDropdown';
import ProjectDropdown from '../shared/ProjectDropdown';
import PaymentMethodSelector from '../shared/PaymentMethodSelector';
import ExchangeRateField from '../ui/ExchangeRateField';
import { useTranslation } from '../../hooks/useTranslation';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface OutstandingInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  invoice_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  is_selected?: boolean;
  allocated_amount: number;
}

interface Vendor {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  outstanding_balance: number;
}

interface PaymentFormData {
  vendor_id: number;
  payment_date: string;
  payment_method_id: number;
  bank_account_id?: number;
  currency_id: number;
  exchange_rate: number;
  payment_amount: number;
  cost_center_id?: number;
  project_id?: number;
  reference_number?: string;
  notes?: string;
  invoices: any[];
  total_allocated: number;
}

interface VendorPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  formData: Partial<PaymentFormData>;
  setFormData: (data: Partial<PaymentFormData>) => void;
  formErrors: Record<string, string>;
  editingPayment: any | null;
  onSubmit: () => void;
  submitting: boolean;
  companyId: number;
  vendors: Vendor[];
  outstandingInvoices: OutstandingInvoice[];
  setOutstandingInvoices: (invoices: OutstandingInvoice[]) => void;
  onVendorChange: (vendorId: number) => void;
  loadingInvoices: boolean;
  onInvoiceToggle: (invoice: OutstandingInvoice) => void;
  onAllocationChange: (invoiceId: number, amount: number) => void;
  /** Optional: Pass the currency code directly for edit mode */
  initialCurrencyCode?: string | null;
}

export default function VendorPaymentForm({
  isOpen,
  onClose,
  formData,
  setFormData,
  formErrors,
  editingPayment,
  onSubmit,
  submitting,
  companyId,
  vendors,
  outstandingInvoices,
  setOutstandingInvoices,
  onVendorChange,
  loadingInvoices,
  onInvoiceToggle,
  onAllocationChange,
  initialCurrencyCode,
}: VendorPaymentFormProps) {
  const { locale } = useTranslation();
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(initialCurrencyCode || null);

  // Update selectedCurrencyCode when initialCurrencyCode changes (for edit mode)
  useEffect(() => {
    if (initialCurrencyCode) {
      setSelectedCurrencyCode(initialCurrencyCode);
    }
  }, [initialCurrencyCode]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const selectedVendor = vendors.find(v => v.id === formData.vendor_id);
  const allocationMatch = formData.payment_amount === formData.total_allocated;
  const hasUnallocated = (formData.payment_amount || 0) > (formData.total_allocated || 0);
  const hasOverAllocation = (formData.total_allocated || 0) > (formData.payment_amount || 0);

  const handlePaymentMethodChange = (methodId: number, type: string) => {
    // BANK and CHEQUE types require bank account selection
    const requiresBankAccount = type === 'BANK' || type === 'CHEQUE';
    setFormData({
      ...formData,
      payment_method_id: methodId,
      bank_account_id: requiresBankAccount ? formData.bank_account_id : undefined,
    });
  };

  const handleAllocateAll = () => {
    const paymentAmount = formData.payment_amount || 0;
    let remaining = paymentAmount;

    const updatedInvoices = outstandingInvoices.map(inv => {
      if (remaining <= 0) {
        return { ...inv, is_selected: false, allocated_amount: 0 };
      }

      const allocate = Math.min(inv.outstanding_amount, remaining);
      remaining -= allocate;

      return {
        ...inv,
        is_selected: allocate > 0,
        allocated_amount: allocate,
      };
    });

    setOutstandingInvoices(updatedInvoices);
  };

  const handleClearAllocations = () => {
    const clearedInvoices = outstandingInvoices.map(inv => ({
      ...inv,
      is_selected: false,
      allocated_amount: 0,
    }));
    setOutstandingInvoices(clearedInvoices);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        editingPayment
          ? (locale === 'ar' ? 'تعديل الدفعة' : 'Edit Payment')
          : (locale === 'ar' ? 'دفعة جديدة' : 'New Payment')
      }
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto">
        {/* Section 1: General Information */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
            {locale === 'ar' ? 'المعلومات العامة' : 'General Information'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المورد' : 'Vendor'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={formData.vendor_id || ''}
                onChange={(e) => onVendorChange(Number(e.target.value))}
                disabled={!!editingPayment}
                className={clsx(
                  'w-full px-4 py-3 border rounded-lg',
                  'focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                  'disabled:bg-gray-100 dark:disabled:bg-gray-700',
                  'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
                  formErrors.vendor_id ? 'border-red-500' : 'border-gray-300'
                )}
              >
                <option value="">{locale === 'ar' ? 'اختر المورد' : 'Select Vendor'}</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.code} - {locale === 'ar' && vendor.name_ar ? vendor.name_ar : vendor.name}
                  </option>
                ))}
              </select>
              {formErrors.vendor_id && <p className="mt-1 text-sm text-red-600">{formErrors.vendor_id}</p>}
              
              {selectedVendor && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {locale === 'ar' ? 'الرصيد المستحق: ' : 'Outstanding Balance: '}
                  <span className="font-bold text-red-600">
                    {formatCurrency(selectedVendor.outstanding_balance)}
                  </span>
                </div>
              )}
            </div>

            <Input
              label={locale === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}
              type="date"
              value={formData.payment_date || ''}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
              error={formErrors.payment_date}
            />

            <Input
              label={locale === 'ar' ? 'رقم المرجع' : 'Reference Number'}
              value={formData.reference_number || ''}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder={locale === 'ar' ? 'رقم الشيك أو الحوالة' : 'Cheque # or transfer #'}
            />
          </div>
        </div>

        {/* Section 2: Payment Details */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
            {locale === 'ar' ? 'تفاصيل الدفع' : 'Payment Details'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PaymentMethodSelector
              paymentMethodId={formData.payment_method_id || 0}
              bankAccountId={formData.bank_account_id}
              onPaymentMethodChange={handlePaymentMethodChange}
              onBankAccountChange={(accountId) => setFormData({ ...formData, bank_account_id: accountId || undefined })}
              companyId={companyId}
              label={locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
              required
              error={formErrors.payment_method_id}
            />

            <CurrencySelector
              value={formData.currency_id || 0}
              onChange={(currencyId) => setFormData({ ...formData, currency_id: currencyId })}
              onCurrencyCodeChange={setSelectedCurrencyCode}
              companyId={companyId}
              label={locale === 'ar' ? 'العملة' : 'Currency'}
              required
              error={formErrors.currency_id}
            />

            <ExchangeRateField
              currencyCode={selectedCurrencyCode}
              value={String(formData.exchange_rate || 1)}
              onChange={(value) => setFormData({ ...formData, exchange_rate: parseFloat(value) || 1 })}
              label={locale === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
              date={formData.payment_date}
              required
            />

            <Input
              label={locale === 'ar' ? 'مبلغ الدفع' : 'Payment Amount'}
              type="number"
              step="0.01"
              value={formData.payment_amount || ''}
              onChange={(e) => setFormData({ ...formData, payment_amount: parseFloat(e.target.value) || 0 })}
              required
              error={formErrors.payment_amount}
            />

            <CostCenterDropdown
              value={formData.cost_center_id}
              onChange={(ccId) => setFormData({ ...formData, cost_center_id: ccId || undefined })}
              companyId={companyId}
              label={locale === 'ar' ? 'مركز التكلفة' : 'Cost Center'}
              allowNull
            />

            <ProjectDropdown
              value={formData.project_id}
              onChange={(projId) => setFormData({ ...formData, project_id: projId || undefined })}
              companyId={companyId}
              label={locale === 'ar' ? 'المشروع' : 'Project'}
              allowNull
            />
          </div>
        </div>

        {/* Section 3: Invoice Allocation */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
              {locale === 'ar' ? 'تخصيص الفواتير' : 'Invoice Allocation'}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAllocateAll}
                disabled={!formData.payment_amount || !outstandingInvoices.length}
              >
                {locale === 'ar' ? 'توزيع تلقائي' : 'Auto-allocate'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearAllocations}
                disabled={!outstandingInvoices.some(inv => inv.is_selected)}
              >
                {locale === 'ar' ? 'إلغاء التخصيص' : 'Clear'}
              </Button>
            </div>
          </div>

          {!formData.vendor_id ? (
            <div className="text-center py-8 text-gray-500">
              {locale === 'ar' ? 'اختر المورد أولاً' : 'Select a vendor first'}
            </div>
          ) : loadingInvoices ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">{locale === 'ar' ? 'جاري تحميل الفواتير...' : 'Loading invoices...'}</p>
            </div>
          ) : outstandingInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {locale === 'ar' ? 'لا توجد فواتير مستحقة لهذا المورد' : 'No outstanding invoices for this vendor'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-2 py-2 text-center w-12">
                      <input type="checkbox" className="rounded" disabled />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                      {locale === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                      {locale === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                      {locale === 'ar' ? 'إجمالي الفاتورة' : 'Invoice Amount'}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                      {locale === 'ar' ? 'المبلغ المستحق' : 'Outstanding'}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                      {locale === 'ar' ? 'المبلغ المخصص' : 'Allocated Amount'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {outstandingInvoices.map(invoice => (
                    <tr
                      key={invoice.id}
                      className={clsx(
                        'hover:bg-gray-50 dark:hover:bg-gray-700/30',
                        invoice.is_selected && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={invoice.is_selected || false}
                          onChange={() => onInvoiceToggle(invoice)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(invoice.invoice_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-white">
                        {formatCurrency(invoice.invoice_amount)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right font-medium text-red-600">
                        {formatCurrency(invoice.outstanding_amount)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={invoice.outstanding_amount}
                          value={invoice.allocated_amount || ''}
                          onChange={(e) => {
                            const amount = parseFloat(e.target.value) || 0;
                            onAllocationChange(invoice.id, amount);
                          }}
                          disabled={!invoice.is_selected}
                          className={clsx(
                            'w-full px-2 py-1 text-sm text-right border rounded',
                            'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
                            'focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                            invoice.is_selected ? 'bg-white' : 'bg-gray-100 dark:bg-gray-700'
                          )}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {formErrors.invoices && (
            <p className="mt-2 text-sm text-red-600">{formErrors.invoices}</p>
          )}
        </div>

        {/* Section 4: Totals Summary */}
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
            {locale === 'ar' ? 'ملخص المبالغ' : 'Amount Summary'}
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-base">
              <span className="text-gray-700 dark:text-gray-300">
                {locale === 'ar' ? 'مبلغ الدفع:' : 'Payment Amount:'}
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(formData.payment_amount || 0)}
              </span>
            </div>

            <div className="flex justify-between items-center text-base">
              <span className="text-gray-700 dark:text-gray-300">
                {locale === 'ar' ? 'المبلغ المخصص:' : 'Total Allocated:'}
              </span>
              <span className={clsx(
                'font-bold',
                allocationMatch ? 'text-green-600' : 'text-red-600'
              )}>
                {formatCurrency(formData.total_allocated || 0)}
              </span>
            </div>

            {hasUnallocated && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  {locale === 'ar'
                    ? `يوجد مبلغ غير مخصص: ${formatCurrency((formData.payment_amount || 0) - (formData.total_allocated || 0))}`
                    : `Unallocated amount: ${formatCurrency((formData.payment_amount || 0) - (formData.total_allocated || 0))}`
                  }
                </span>
              </div>
            )}

            {hasOverAllocation && (
              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-700 dark:text-red-300">
                  {locale === 'ar'
                    ? `التخصيص أكبر من المبلغ المدفوع بمقدار: ${formatCurrency((formData.total_allocated || 0) - (formData.payment_amount || 0))}`
                    : `Over-allocation by: ${formatCurrency((formData.total_allocated || 0) - (formData.payment_amount || 0))}`
                  }
                </span>
              </div>
            )}

            {allocationMatch && formData.payment_amount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  {locale === 'ar' ? 'المبالغ متطابقة ✓' : 'Amounts match ✓'}
                </span>
              </div>
            )}
          </div>

          {formErrors.allocation && (
            <p className="mt-2 text-sm text-red-600">{formErrors.allocation}</p>
          )}
        </div>

        {/* Section 5: Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {locale === 'ar' ? 'ملاحظات' : 'Notes'}
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            placeholder={locale === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          {locale === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button onClick={onSubmit} loading={submitting} disabled={!allocationMatch || submitting}>
          {editingPayment
            ? (locale === 'ar' ? 'تحديث' : 'Update')
            : (locale === 'ar' ? 'حفظ' : 'Save')
          }
        </Button>
      </div>
    </Modal>
  );
}
