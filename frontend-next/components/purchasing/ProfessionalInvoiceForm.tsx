/**
 * 📄 PROFESSIONAL INVOICE FORM
 * ============================
 * 
 * Re-export from refactored modular version.
 * 
 * Components are now organized in: ./invoice/
 * - ProfessionalInvoiceForm.tsx (main component)
 * - InvoiceHeader.tsx
 * - InvoiceItems.tsx
 * - InvoiceExpenses.tsx
 * - InvoiceFinancials.tsx
 * - InvoiceSummary.tsx
 * - useInvoiceForm.ts (hook)
 * - types.ts
 */

// Re-export everything from modular version
export { 
  ProfessionalInvoiceForm,
  InvoiceHeader,
  InvoiceItems,
  InvoiceExpenses,
  InvoiceFinancials,
  InvoiceSummary,
  useInvoiceForm
} from './invoice';

export type {
  InvoiceItem,
  InvoiceExpense,
  InvoiceFormData,
  VendorRef,
  PaymentTermRef,
  PurchaseOrderRef,
  QuotationRef,
  TabKey
} from './invoice';

// Default export
export { default } from './invoice';
