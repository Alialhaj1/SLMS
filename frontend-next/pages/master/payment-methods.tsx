/**
 * ðŸ’³ PAYMENT METHODS PAGE (Enterprise Edition â€” B-14)
 * =====================================================
 *
 * Master data page for payment methods / instruments.
 * Uses EnterpriseMasterPage with paymentMethodsConfig.
 *
 * Manages: Cash, Bank Transfer, Cheque, Credit Card,
 *          Debit Card, Digital Wallet, Letter of Credit.
 *
 * Linked to: Chart of Accounts (GL), ZATCA e-invoicing codes.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  paymentMethodsConfig,
  type PaymentMethod,
} from '@/config/pages/master/paymentMethods.config';

const TYPE_LABELS: Record<string, string> = {
  cash:              'Cash',
  bank_transfer:     'Bank Transfer',
  check:             'Cheque',
  credit_card:       'Credit Card',
  debit_card:        'Debit Card',
  digital_wallet:    'Digital Wallet',
  letter_of_credit:  'Letter of Credit',
};

function PaymentMethodsPage() {
  // â”€â”€â”€â”€ DETAIL SECTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const buildDetailSections = (method: PaymentMethod) => {
    // Build fees summary
    const fees: string[] = [];
    if (method.transaction_fee_percent) fees.push(`${method.transaction_fee_percent}%`);
    if (method.transaction_fee_fixed) fees.push(`${method.transaction_fee_fixed} fixed`);
    const feeSummary = fees.length > 0 ? fees.join(' + ') : 'No fees';

    return [
      {
        title: 'Method Identity',
        fields: [
          { label: 'Code', value: method.code },
          { label: 'Icon', value: method.icon },
          { label: 'Name (EN)', value: method.name_en || method.name },
          { label: 'Name (AR)', value: method.name_ar },
          { label: 'Type', value: TYPE_LABELS[method.payment_type] || method.payment_type },
          { label: 'Description', value: method.description },
        ],
      },
      {
        title: 'Requirements',
        fields: [
          { label: 'Requires Reference #', value: method.requires_reference ? 'âœ” Yes' : 'âœ– No' },
          { label: 'Requires Bank Account', value: method.requires_bank_account ? 'âœ” Yes' : 'âœ– No' },
          { label: 'Requires Due Date', value: method.requires_due_date ? 'âœ” Yes' : 'âœ– No' },
        ],
      },
      {
        title: 'Processing & Fees',
        fields: [
          { label: 'Clearing Days', value: method.clearing_days === 0 ? 'Instant' : `${method.clearing_days} days` },
          { label: 'Fee %', value: method.transaction_fee_percent ? `${method.transaction_fee_percent}%` : null },
          { label: 'Fixed Fee', value: method.transaction_fee_fixed ? `${method.transaction_fee_fixed}` : null },
          { label: 'Total Fee', value: feeSummary },
        ],
      },
      {
        title: 'Accounting & ZATCA',
        fields: [
          { label: 'GL Account Code', value: method.gl_account_code },
          { label: 'ZATCA Code', value: method.zatca_code },
        ],
      },
      {
        title: 'Availability',
        fields: [
          { label: 'Available for Sales', value: method.is_available_for_sales ? 'âœ” Yes' : 'âœ– No' },
          { label: 'Available for Purchases', value: method.is_available_for_purchases ? 'âœ” Yes' : 'âœ– No' },
          { label: 'Sort Order', value: method.sort_order != null ? `${method.sort_order}` : null },
        ],
      },
      {
        title: 'Status',
        fields: [
          { label: 'Active', value: method.is_active ? 'âœ” Active' : 'âœ– Inactive' },
          { label: 'Default', value: method.is_default ? 'â˜… Default Method' : null },
        ],
      },
      {
        title: 'Metadata',
        fields: [
          { label: 'Created', value: method.created_at ? new Date(method.created_at).toLocaleString() : null },
          { label: 'Created By', value: method.created_by_name },
          { label: 'Updated', value: method.updated_at ? new Date(method.updated_at).toLocaleString() : null },
          { label: 'Updated By', value: method.updated_by_name },
        ],
      },
    ];
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
