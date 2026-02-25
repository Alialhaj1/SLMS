/**
 * 🌍 COUNTRIES PAGE (Enterprise Edition)
 * ========================================
 * 
 * Master data page for managing world countries.
 * Full ISO 3166-1 support with all fields, filters, stats bar,
 * table/cards views, bulk operations, export, and audit trail.
 * 
 * Uses EnterpriseMasterPage with countriesConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { countriesConfig, type Country } from '@/config/pages/master/countries.config';

function CountriesPage() {
  const formatNumber = (val: number | null | undefined): string => {
    if (val == null) return '—';
    return val.toLocaleString();
  };

  return (
    <EnterpriseMasterPage<Country>
      config={countriesConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Flag', value: record.flag_emoji || '🏳️' },
            { label: 'ISO Alpha-2', value: record.code_2 || '—' },
            { label: 'ISO Alpha-3', value: record.code3 || record.code || '—' },
            { label: 'Numeric Code', value: record.numeric_code || '—' },
            { label: 'Name (English)', value: record.name },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
          ],
        },
        {
          title: 'Contact & Currency / الاتصال والعملة',
          fields: [
            { label: 'Phone Code', value: record.phone_code || '—' },
            { label: 'Currency', value: record.currency_code || '—' },
            { label: 'Capital (English)', value: record.capital_en || '—' },
            { label: 'Capital (Arabic)', value: record.capital_ar || '—' },
          ],
        },
        {
          title: 'Geography & Classification / الجغرافيا والتصنيف',
          fields: [
            { label: 'Region', value: record.region || '—' },
            { label: 'Sub-Region', value: record.sub_region || '—' },
            { label: 'Tax Zone', value: record.tax_zone || '—' },
            { label: 'EU Member', value: record.is_eu_member ? 'Yes ✓' : 'No ✗' },
            { label: 'Population', value: formatNumber(record.population) },
            { label: 'Area (km²)', value: formatNumber(record.area_km2) },
          ],
        },
        {
          title: 'Status & Settings / الحالة والإعدادات',
          fields: [
            { label: 'Status', value: record.status || (record.is_active ? 'active' : 'inactive'), type: 'badge' as const },
            { label: 'Favorite', value: record.is_favorite ? '★ Yes' : '☆ No' },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
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

export default withPermission(MenuPermissions.MasterData.Countries.View, CountriesPage);
