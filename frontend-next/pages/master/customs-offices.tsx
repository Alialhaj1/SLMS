/**
 * 🏛️ CUSTOMS OFFICES PAGE (Enterprise Edition — E-18)
 * =====================================================
 *
 * Government customs clearance offices at ports, airports, and borders.
 * Used in customs declarations, import/export docs, e-customs integration.
 *
 * DB: customs_offices (migration 016 + 030 + 347)
 * Dependencies: countries + cities + ports
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  customsOfficesConfig,
  type CustomsOffice,
} from '@/config/pages/master/customsOffices.config';

const OFFICE_TYPE_LABELS: Record<string, string> = {
  sea_port: '🚢 Sea Port',
  airport: '✈ Airport',
  land_border: '🛃 Land Border',
  dry_port: '📦 Dry Port',
  inland: '🏭 Inland',
};

function CustomsOfficesPage() {
  // ──── DETAIL SECTIONS ─────────────────────────────────────────────────
  const buildDetailSections = (row: CustomsOffice) => {
    const services: string[] = [];
    if (row.handles_imports) services.push('📥 Imports');
    if (row.handles_exports) services.push('📤 Exports');
    if (row.handles_transit) services.push('🔄 Transit');

    return [
      {
        title: 'Office Identity',
        fields: [
          { label: 'Office Code', value: row.code },
          { label: 'Name (EN)', value: row.name_en || row.name },
          { label: 'Name (AR)', value: row.name_ar },
          { label: 'Type', value: OFFICE_TYPE_LABELS[row.office_type] || row.office_type },
          { label: 'Authority Code', value: row.authority_code },
          { label: 'E-Customs System', value: row.e_customs_system },
        ],
      },
      {
        title: 'Location',
        fields: [
          { label: 'Country', value: row.country_name },
          { label: 'Country (AR)', value: row.country_name_ar },
          { label: 'City', value: row.city_name },
          { label: 'Port / Airport', value: row.port_name ? `${row.port_name} (${row.port_code})` : null },
        ],
      },
      {
        title: 'Capabilities',
        fields: [
          { label: 'Services', value: services.length > 0 ? services.join('  ·  ') : 'None' },
          { label: 'Imports', value: row.handles_imports ? '✔ Yes' : '✖ No' },
          { label: 'Exports', value: row.handles_exports ? '✔ Yes' : '✖ No' },
          { label: 'Transit', value: row.handles_transit ? '✔ Yes' : '✖ No' },
          { label: 'Working Hours', value: row.working_hours },
        ],
      },
      {
        title: 'Contact Information',
        fields: [
          { label: 'Phone', value: row.phone },
          { label: 'Email', value: row.email },
          { label: 'Website', value: row.website },
          { label: 'Address (EN)', value: row.address_en || row.address },
          { label: 'Address (AR)', value: row.address_ar },
        ],
      },
      {
        title: 'Status & Metadata',
        fields: [
          { label: 'Active', value: row.is_active ? '✔ Active' : '✖ Inactive' },
          { label: 'Created', value: row.created_at ? new Date(row.created_at).toLocaleString() : null },
          { label: 'Created By', value: row.created_by_name },
          { label: 'Updated', value: row.updated_at ? new Date(row.updated_at).toLocaleString() : null },
        ],
      },
    ];
  };

  return (
    <EnterpriseMasterPage<CustomsOffice>
      config={customsOfficesConfig}
      buildDetailSections={buildDetailSections}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.CustomsOffices.View,
  CustomsOfficesPage
);
