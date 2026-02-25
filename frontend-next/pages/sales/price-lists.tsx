/**
 * 💰 PRICE LISTS PAGE (Enterprise Edition — C-11)
 * =================================================
 *
 * Master data page for price lists.
 * Uses EnterpriseMasterPage with priceListsConfig.
 *
 * Flexible multi-tier pricing: fixed price, markup %,
 * or discount from standard — per currency, customer
 * category, and date range.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  priceListsConfig,
  type PriceList,
} from '@/config/pages/sales/priceLists.config';

const PRICE_TYPE_LABELS: Record<string, string> = {
  fixed_price:            'Fixed Price',
  markup_pct:             'Markup %',
  discount_from_standard: 'Discount from Standard',
};

const formatDate = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-CA');
};

function PriceListsPage() {
  // ──── DETAIL SECTIONS ─────────────────────────────────────────────────
  const buildDetailSections = (pl: PriceList) => {
    const expired = pl.valid_to && new Date(pl.valid_to) < new Date();

    return [
      {
        title: 'List Identity',
        fields: [
          { label: 'Code', value: pl.code },
          { label: 'List Name', value: pl.name },
          { label: 'List Name (AR)', value: pl.name_ar },
          { label: 'Description', value: pl.description },
        ],
      },
      {
        title: 'Scope & Currency',
        fields: [
          { label: 'Currency', value: pl.currency_code ? `${pl.currency_symbol || ''} ${pl.currency_code}` : null },
          { label: 'Customer Category', value: pl.customer_category_name || 'All (Manual)' },
        ],
      },
      {
        title: 'Validity Period',
        fields: [
          { label: 'Valid From', value: formatDate(pl.valid_from) },
          { label: 'Valid To', value: pl.valid_to ? formatDate(pl.valid_to) : '∞ Open-ended' },
          { label: 'Status', value: expired ? '⏱ Expired' : (pl.is_active ? '✔ Active' : '✖ Inactive') },
        ],
      },
      {
        title: 'Pricing Rules',
        fields: [
          { label: 'Price Type', value: PRICE_TYPE_LABELS[pl.base_price_type] || pl.base_price_type },
          { label: 'Markup %', value: pl.markup_pct != null ? `${Number(pl.markup_pct).toFixed(2)}%` : null },
          { label: 'Discount %', value: pl.discount_pct != null ? `${Number(pl.discount_pct).toFixed(2)}%` : null },
          { label: 'Default List', value: pl.is_default ? '★ Yes' : 'No' },
          { label: 'Items Count', value: pl.items_count != null ? String(pl.items_count) : null },
        ],
      },
      {
        title: 'Metadata',
        fields: [
          { label: 'Created', value: pl.created_at ? new Date(pl.created_at).toLocaleString() : null },
          { label: 'Created By', value: pl.created_by_name },
          { label: 'Updated', value: pl.updated_at ? new Date(pl.updated_at).toLocaleString() : null },
          { label: 'Updated By', value: pl.updated_by_name },
        ],
      },
    ];
  };

  return (
    <EnterpriseMasterPage<PriceList>
      config={priceListsConfig}
      buildDetailSections={buildDetailSections}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.PriceLists.View,
  PriceListsPage
);
