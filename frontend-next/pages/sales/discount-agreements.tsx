/**
 * 🏷️ DISCOUNT AGREEMENTS PAGE (Enterprise Edition — C-12)
 * =========================================================
 *
 * Master data page for discount agreements.
 * Uses EnterpriseMasterPage with discountAgreementsConfig.
 *
 * Customer-specific and category-wide discount rules
 * layered on top of price lists with priority control.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  discountAgreementsConfig,
  type DiscountAgreement,
} from '@/config/pages/sales/discountAgreements.config';

const COMBINATION_LABELS: Record<string, string> = {
  replace:    'Replace',
  cumulative: 'Cumulative',
  best_of:    'Best Of',
};

const formatDate = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-CA');
};

function DiscountAgreementsPage() {
  const buildDetailSections = (da: DiscountAgreement) => {
    const expired = da.valid_to && new Date(da.valid_to) < new Date();

    // Determine scope display
    let scopeValue = '🌐 All Customers (Global)';
    if (da.customer_name) scopeValue = `👤 ${da.customer_name}`;
    else if (da.customer_category_name) scopeValue = `📁 ${da.customer_category_name}`;

    return [
      {
        title: 'Agreement Identity',
        fields: [
          { label: 'Code', value: da.code },
          { label: 'Agreement Name', value: da.name },
          { label: 'Agreement Name (AR)', value: da.name_ar },
          { label: 'Description', value: da.description },
        ],
      },
      {
        title: 'Customer Scope',
        fields: [
          { label: 'Target', value: scopeValue },
          { label: 'Customer', value: da.customer_name },
          { label: 'Customer Category', value: da.customer_category_name },
        ],
      },
      {
        title: 'Validity Period',
        fields: [
          { label: 'Valid From', value: formatDate(da.valid_from) },
          { label: 'Valid To', value: da.valid_to ? formatDate(da.valid_to) : '∞ Open-ended' },
          { label: 'Status', value: expired ? '⏱ Expired' : (da.is_active ? '✔ Active' : '✖ Inactive') },
        ],
      },
      {
        title: 'Priority & Combination',
        fields: [
          { label: 'Priority', value: da.priority != null ? String(da.priority) : null },
          { label: 'Combination Method', value: COMBINATION_LABELS[da.combination_method] || da.combination_method },
          { label: 'Discount Lines', value: da.lines_count != null ? String(da.lines_count) : null },
        ],
      },
      {
        title: 'Metadata',
        fields: [
          { label: 'Created', value: da.created_at ? new Date(da.created_at).toLocaleString() : null },
          { label: 'Created By', value: da.created_by_name },
          { label: 'Updated', value: da.updated_at ? new Date(da.updated_at).toLocaleString() : null },
          { label: 'Updated By', value: da.updated_by_name },
        ],
      },
    ];
  };

  return (
    <EnterpriseMasterPage<DiscountAgreement>
      config={discountAgreementsConfig}
      buildDetailSections={buildDetailSections}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.DiscountAgreements.View,
  DiscountAgreementsPage
);
