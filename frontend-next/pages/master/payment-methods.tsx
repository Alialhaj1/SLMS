/**
 * PAYMENT METHODS PAGE (Enterprise Edition - Enhanced)
 * ====================================================
 *
 * Full accounting-aware payment methods management.
 * Dynamic detail sections based on payment_behavior:
 *   cash | bank | check | credit | digital | lc | sadad | offset | barter | bg
 *
 * Linked to: Chart of Accounts (GL), Cash Boxes, Bank Accounts, ZATCA codes.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  paymentMethodsConfig,
  type PaymentMethod,
} from '@/config/pages/master/paymentMethods.config';

/* --- Behavior labels ------------------------------------------------ */

const BEHAVIOR_LABELS: Record<string, { en: string; ar: string }> = {
  cash:    { en: 'Cash',             ar: 'نقدي' },
  bank:    { en: 'Bank Transfer',    ar: 'تحويل بنكي' },
  check:   { en: 'Cheque',           ar: 'شيك' },
  credit:  { en: 'Card Payment',     ar: 'بطاقة' },
  digital: { en: 'Digital Wallet',   ar: 'محفظة رقمية' },
  lc:      { en: 'Letter of Credit', ar: 'اعتماد مستندي' },
  sadad:   { en: 'SADAD',            ar: 'سداد' },
  offset:  { en: 'Offset / Netting', ar: 'مقاصة' },
  barter:  { en: 'Barter',           ar: 'مقايضة' },
  bg:      { en: 'Bank Guarantee',   ar: 'ضمان بنكي' },
  crypto:  { en: 'Cryptocurrency',   ar: 'عملة رقمية' },
};

const TYPE_LABELS: Record<string, string> = {
  cash: 'Cash', bank: 'Bank', bank_transfer: 'Bank Transfer', wire: 'Wire Transfer',
  check: 'Cheque', credit_card: 'Credit Card', debit_card: 'Debit Card',
  digital_wallet: 'Digital Wallet', letter_of_credit: 'Letter of Credit',
};

/* --- Accounting Rule Descriptions ----------------------------------- */

const ACCOUNTING_RULES: Record<string, { debit: string; credit: string; note?: string }> = {
  cash:    { debit: 'Cash Box / الصندوق',            credit: 'Customer or Vendor / العميل أو المورد' },
  bank:    { debit: 'Bank Account / البنك',           credit: 'Customer or Vendor / العميل أو المورد' },
  check:   { debit: 'Notes Receivable / أوراق قبض',   credit: 'Customer / العميل', note: 'On collection: Dr. Bank, Cr. Notes Receivable' },
  credit:  { debit: 'Bank or Gateway / البنك',        credit: 'Customer / العميل', note: 'Optional: processing fee expense deducted' },
  digital: { debit: 'Digital Wallet / محفظة رقمية',   credit: 'Customer / العميل' },
  lc:      { debit: 'Inventory or Expense',           credit: 'LC Obligations / التزامات خطاب اعتماد' },
  sadad:   { debit: 'Bank Account / البنك',           credit: 'Customer / العميل' },
  offset:  { debit: 'Payable / ذمم دائنة',            credit: 'Receivable / ذمم مدينة', note: 'No cash movement - settlement only' },
  barter:  { debit: 'Goods/Services received',        credit: 'Goods/Services given' },
  bg:      { debit: 'Guarantee Deposit',              credit: 'Bank Account' },
  crypto:  { debit: 'Crypto Wallet',                  credit: 'Revenue or Vendor' },
};

/* --- Helpers -------------------------------------------------------- */

const yn = (v: any) => v ? 'Yes' : 'No';
const dash = (v: any) => v ?? '-';

function PaymentMethodsPage() {
  const buildDetailSections = (m: PaymentMethod) => {
    const beh = m.payment_behavior || 'bank';
    const behInfo = BEHAVIOR_LABELS[beh] || BEHAVIOR_LABELS.bank;
    const rules = ACCOUNTING_RULES[beh];

    // Build fees summary
    const fees: string[] = [];
    if (m.transaction_fee_percent) fees.push(`${m.transaction_fee_percent}%`);
    if (m.transaction_fee_fixed) fees.push(`${m.transaction_fee_fixed} fixed`);
    const feeSummary = fees.length > 0 ? fees.join(' + ') : 'No fees';

    const sections = [
      {
        title: 'Method Identity',
        fields: [
          { label: 'Code', value: m.code },
          { label: 'Icon', value: m.icon || '-' },
          { label: 'Name (EN)', value: m.name_en || m.name },
          { label: 'Name (AR)', value: m.name_ar },
          { label: 'Payment Type', value: TYPE_LABELS[m.payment_type] || m.payment_type },
          { label: 'Accounting Behavior', value: `${behInfo.en} (${behInfo.ar})` },
          { label: 'Description', value: m.description },
        ],
      },
      {
        title: 'Accounting Rule',
        fields: [
          { label: 'Debit (Dr.)', value: rules?.debit || '-' },
          { label: 'Credit (Cr.)', value: rules?.credit || '-' },
          ...(rules?.note ? [{ label: 'Note', value: rules.note }] : []),
          { label: 'GL Account', value: m.gl_account_code_resolved ? `${m.gl_account_code_resolved} - ${m.gl_account_name || ''}` : m.gl_account_code || '-' },
          { label: 'Default Debit Account', value: m.debit_account_code ? `${m.debit_account_code} - ${m.debit_account_name || ''}` : '-' },
          { label: 'Default Credit Account', value: m.credit_account_code ? `${m.credit_account_code} - ${m.credit_account_name || ''}` : '-' },
        ],
      },
      {
        title: 'Requirements',
        fields: [
          { label: 'Requires Reference #', value: yn(m.requires_reference) },
          { label: 'Requires Bank Account', value: yn(m.requires_bank_account) },
          { label: 'Requires Cheque #', value: yn(m.requires_cheque_number) },
          { label: 'Requires Due Date', value: yn(m.requires_due_date) },
        ],
      },
      {
        title: 'Processing & Fees',
        fields: [
          { label: 'Clearing Days', value: m.clearing_days === 0 ? 'Instant' : `${m.clearing_days} days` },
          { label: 'Payment Terms', value: m.default_payment_terms ? `${m.default_payment_terms} days` : '-' },
          { label: 'Fee %', value: m.transaction_fee_percent ? `${m.transaction_fee_percent}%` : '-' },
          { label: 'Fixed Fee', value: m.transaction_fee_fixed != null ? `${m.transaction_fee_fixed}` : '-' },
          { label: 'Total Fee', value: feeSummary },
          { label: 'Min Amount', value: m.min_amount ? Number(m.min_amount).toLocaleString() : '0' },
          { label: 'Max Amount', value: m.max_amount ? Number(m.max_amount).toLocaleString() : 'No limit' },
        ],
      },
      {
        title: 'ZATCA & Compliance',
        fields: [
          { label: 'ZATCA Code', value: dash(m.zatca_code) },
          { label: 'ZATCA Payment Code', value: dash(m.zatca_payment_code) },
        ],
      },
      {
        title: 'Availability',
        fields: [
          { label: 'Sales', value: yn(m.is_available_for_sales) },
          { label: 'Purchases', value: yn(m.is_available_for_purchases) },
          { label: 'Expenses', value: yn(m.is_available_for_expenses) },
          { label: 'Receipts', value: yn(m.is_available_for_receipts) },
          { label: 'Payments', value: yn(m.is_available_for_payments) },
          { label: 'Sort Order', value: `${m.sort_order ?? 0}` },
        ],
      },
      {
        title: 'Status',
        fields: [
          { label: 'Active', value: m.is_active ? 'Active' : 'Inactive' },
          { label: 'Default', value: m.is_default ? 'Default Method' : '-' },
        ],
      },
      {
        title: 'Metadata',
        fields: [
          { label: 'Created', value: m.created_at ? new Date(m.created_at).toLocaleString() : null },
          { label: 'Created By', value: m.created_by_name },
          { label: 'Updated', value: m.updated_at ? new Date(m.updated_at).toLocaleString() : null },
          { label: 'Updated By', value: m.updated_by_name },
        ],
      },
    ];

    return sections;
  };

  return (
    <EnterpriseMasterPage<PaymentMethod>
      config={paymentMethodsConfig}
      buildDetailSections={buildDetailSections}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.PaymentMethods.View,
  PaymentMethodsPage
);
