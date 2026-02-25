/**
 * 💳 PAYMENT TERMS PAGE (Enterprise Edition — B-13)
 * ==================================================
 *
 * Master data page for payment terms.
 * Uses EnterpriseMasterPage with paymentTermsConfig.
 *
 * Manages invoice due-date schedules:
 *   - Net 30/60/90 standard terms
 *   - Installment plans with payment schedule lines
 *   - Early payment discounts (e.g. 2%/10 net 30)
 *   - Advance payment requirements
 *   - Late-payment penalty rates
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  paymentTermsConfig,
  type PaymentTerm,
} from '@/config/pages/master/paymentTerms.config';

const DUE_CALC_LABELS: Record<string, string> = {
  from_invoice_date:  'From Invoice Date',
  from_month_end:     'From Month End',
  from_delivery_date: 'From Delivery Date',
  specific_day:       'Specific Day',
};

function PaymentTermsPage() {
  // ──── DETAIL SECTIONS ─────────────────────────────────────────────────────
  const buildDetailSections = (term: PaymentTerm) => {
    return [
      {
        title: 'Term Identity',
        fields: [
          { label: 'Code', value: term.code },
          { label: 'Name (EN)', value: term.name_en || term.name },
          { label: 'Name (AR)', value: term.name_ar },
          { label: 'Description', value: term.description },
        ],
      },
      {
        title: 'Due Date Rules',
        fields: [
          { label: 'Due Days', value: term.days === 0 ? 'Immediate' : `${term.days} days` },
          { label: 'Calculation Basis', value: DUE_CALC_LABELS[term.due_calculation] || term.due_calculation },
        ],
      },
      {
        title: 'Early Payment Discount',
        fields: [
          { label: 'Discount %', value: term.early_payment_discount_pct ? `${term.early_payment_discount_pct}%` : null },
          { label: 'Within Days', value: term.early_payment_days ? `${term.early_payment_days} days` : null },
          { label: 'Summary', value: term.early_payment_discount_pct
            ? `${term.early_payment_discount_pct}% discount if paid within ${term.early_payment_days} days`
            : 'No early payment discount' },
        ],
      },
      {
        title: 'Installment Schedule',
        fields: [
          { label: 'Installment Plan', value: term.is_installment ? '✔ Yes' : '✖ No' },
          { label: 'Number of Installments', value: term.is_installment && term.installment_count ? `${term.installment_count} payments` : null },
          { label: 'Schedule Lines', value: term.lines_count ? `${term.lines_count} line(s)` : null },
        ],
      },
      {
        title: 'Advance Payment',
        fields: [
          { label: 'Requires Advance', value: term.requires_advance ? '✔ Yes' : '✖ No' },
          { label: 'Advance %', value: term.requires_advance && term.advance_pct ? `${term.advance_pct}%` : null },
        ],
      },
      {
        title: 'Late Penalty',
        fields: [
          { label: 'Penalty Rate', value: term.penalty_pct_per_month ? `${term.penalty_pct_per_month}% per month` : 'No penalty' },
        ],
      },
      {
        title: 'Status',
        fields: [
          { label: 'Active', value: term.is_active ? '✔ Active' : '✖ Inactive' },
          { label: 'Default', value: term.is_default ? '★ Default Term' : null },
        ],
      },
      {
        title: 'Metadata',
        fields: [
          { label: 'Created', value: term.created_at ? new Date(term.created_at).toLocaleString() : null },
          { label: 'Created By', value: term.created_by_name },
          { label: 'Updated', value: term.updated_at ? new Date(term.updated_at).toLocaleString() : null },
          { label: 'Updated By', value: term.updated_by_name },
        ],
      },
    ];
  };

  return (
    <EnterpriseMasterPage<PaymentTerm>
      config={paymentTermsConfig}
      buildDetailSections={buildDetailSections}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.PaymentTerms.View,
  PaymentTermsPage
);
