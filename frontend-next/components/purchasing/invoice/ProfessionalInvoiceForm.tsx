/**
 * 🧾 PROFESSIONAL INVOICE FORM (REFACTORED)
 * ==========================================
 * Main component that composes all invoice sub-components
 * 
 * Components:
 * - InvoiceHeader: Vendor, dates, references
 * - InvoiceItems: Line items management
 * - InvoiceExpenses: Cost allocation
 * - InvoiceFinancials: Currency, payment
 * - InvoiceSummary: Totals and actions
 * 
 * Hook:
 * - useInvoiceForm: Centralized state management
 */

import React from 'react';
import Modal from '../../ui/Modal';
import clsx from 'clsx';
import { 
  DocumentTextIcon, 
  ArchiveBoxIcon, 
  CalculatorIcon, 
  BanknotesIcon 
} from '@heroicons/react/24/outline';

// Sub-components
import { InvoiceHeader } from './InvoiceHeader';
import { InvoiceItems } from './InvoiceItems';
import { InvoiceExpenses } from './InvoiceExpenses';
import { InvoiceFinancials } from './InvoiceFinancials';
import { InvoiceSummary } from './InvoiceSummary';

// Hook
import { useInvoiceForm } from './useInvoiceForm';

// Types
import type { InvoiceFormData, TabKey } from './types';

interface ProfessionalInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;  // Allow flexible input from different page types
  onSubmit: (data: any) => void;  // Allow flexible output
  isLoading?: boolean;
  companyId: number;
  locale: string;
}

export function ProfessionalInvoiceForm({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isLoading = false,
  companyId,
  locale
}: ProfessionalInvoiceFormProps) {
  
  const {
    formData,
    activeTab,
    vendors,
    vendorSearch,
    filteredVendors,
    paymentTerms,
    purchaseOrders,
    quotations,
    newItem,
    
    setActiveTab,
    updateFormData,
    setVendorSearch,
    setNewItem,
    addItem,
    removeItem,
    updateExpenses,
    validate
  } = useInvoiceForm({ isOpen, initialData, companyId });

  const isArabic = locale === 'ar';

  const handleSubmit = () => {
    const { isValid, errors } = validate();
    if (!isValid) {
      alert(errors.join('\n'));
      return;
    }
    onSubmit(formData);
  };

  const tabs: { id: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'general', label: isArabic ? 'عام' : 'General', icon: DocumentTextIcon },
    { id: 'lines', label: isArabic ? 'الأصناف' : 'Lines', icon: ArchiveBoxIcon },
    { id: 'expenses', label: isArabic ? 'توزيع المصاريف' : 'Expenses', icon: CalculatorIcon },
    { id: 'financials', label: isArabic ? 'المالية' : 'Financials', icon: BanknotesIcon },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id
        ? (isArabic ? 'تعديل فاتورة شراء' : 'Edit Purchase Invoice')
        : (isArabic ? 'فاتورة شراء مهنية' : 'Professional Purchase Invoice')}
      size="xl"
    >
      <div className="flex flex-col h-[80vh]">
        {/* Tabs Header */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 bg-gray-50 dark:bg-slate-800/50 -mx-6 px-6 pt-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-1">
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <InvoiceHeader
              formData={formData}
              vendors={vendors}
              vendorSearch={vendorSearch}
              filteredVendors={filteredVendors}
              purchaseOrders={purchaseOrders}
              quotations={quotations}
              companyId={companyId}
              locale={locale}
              onFormChange={updateFormData}
              onVendorSearchChange={setVendorSearch}
            />
          )}

          {/* TAB: LINES */}
          {activeTab === 'lines' && (
            <InvoiceItems
              formData={formData}
              newItem={newItem}
              companyId={companyId}
              locale={locale}
              onNewItemChange={setNewItem}
              onAddItem={addItem}
              onRemoveItem={removeItem}
            />
          )}

          {/* TAB: EXPENSES */}
          {activeTab === 'expenses' && (
            <InvoiceExpenses
              formData={formData}
              companyId={companyId}
              locale={locale}
              onAllocationsChange={updateExpenses}
            />
          )}

          {/* TAB: FINANCIALS */}
          {activeTab === 'financials' && (
            <InvoiceFinancials
              formData={formData}
              paymentTerms={paymentTerms}
              companyId={companyId}
              locale={locale}
              onFormChange={updateFormData}
            />
          )}
        </div>

        {/* Footer */}
        <InvoiceSummary
          formData={formData}
          locale={locale}
          isLoading={isLoading}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      </div>
    </Modal>
  );
}

export default ProfessionalInvoiceForm;
