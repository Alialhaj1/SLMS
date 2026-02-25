/**
 * 💰 CURRENCIES PAGE (Enterprise Edition)
 * =========================================
 * 
 * Master data page for managing ISO 4217 currencies.
 * Full currency database support with symbols, decimal places,
 * sub-units, base currency enforcement, exchange rate sync,
 * stats bar, table/cards views, bulk operations, export, and audit trail.
 * 
 * Uses EnterpriseMasterPage with currenciesConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { currenciesConfig, type Currency } from '@/config/pages/master/currencies.config';

// ── Country-code → flag emoji helper ─────────────────────────────────────
const countryFlag = (cc?: string): string => {
  if (!cc || cc.length !== 2) return '💱';
  const offset = 127397;
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => c.charCodeAt(0) + offset));
};

function CurrenciesPage() {
  return (
    <EnterpriseMasterPage<Currency>
      config={currenciesConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Flag', value: `${countryFlag(record.country_code)} ${record.country_code || ''}` },
            { label: 'Code (ISO 4217)', value: record.code || '—' },
            { label: 'Numeric Code', value: record.numeric_code || '—' },
            { label: 'Name (English)', value: record.name_en || record.name || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
          ],
        },
        {
          title: 'Symbol & Format / الرمز والتنسيق',
          fields: [
            { label: 'Symbol', value: record.symbol || '—' },
            { label: 'Symbol Position', value: record.symbol_position === 'after' ? 'After (100$)' : 'Before ($100)' },
            { label: 'Decimal Places', value: String(record.decimal_places ?? 2) },
            { label: 'Decimal Separator', value: record.decimal_separator || '.' },
            { label: 'Thousands Separator', value: record.thousands_separator === ' ' ? '(space)' : (record.thousands_separator || ',') },
            { label: 'Base Currency', value: record.is_base_currency ? '★ Yes' : 'No' },
            { label: 'Exchange Rate', value: record.exchange_rate ? parseFloat(String(record.exchange_rate)).toFixed(4) : '—' },
          ],
        },
        {
          title: 'Sub-Unit / الوحدة الفرعية',
          fields: [
            { label: 'Sub-unit (English)', value: record.subunit_en || '—' },
            { label: 'Sub-unit (Arabic)', value: record.subunit_ar || '—' },
            { label: 'Sub-unit Ratio', value: record.subunit_ratio ? `${record.subunit_ratio} = 1 ${record.code}` : '—' },
          ],
        },
        {
          title: 'Status & Settings / الحالة والإعدادات',
          fields: [
            { label: 'Status', value: record.status || (record.is_active ? 'active' : 'inactive'), type: 'badge' as const },
            { label: 'Favorite', value: record.is_favorite ? '★ Yes' : '☆ No' },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
            { label: 'Global', value: record.is_global ? 'Yes' : 'No' },
            { label: 'System', value: record.is_system ? 'Yes' : 'No' },
          ],
        },
        {
          title: 'Audit Trail / سجل التدقيق',
          fields: [
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.Currencies.Manage, CurrenciesPage);
