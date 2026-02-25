/**
 * ⚓ PORTS & AIRPORTS PAGE (Enterprise Edition — E-16)
 * =====================================================
 *
 * Seaports, airports, dry ports, and land border crossings.
 * Used in shipping documents, bills of lading, customs declarations.
 *
 * DB: ports (migration 016 + 344)
 * Dependencies: countries, cities
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  portsAirportsConfig,
  type PortAirport,
} from '@/config/pages/master/portsAirports.config';

const TYPE_LABELS: Record<string, string> = {
  sea: 'Seaport',
  air: 'Airport',
  land: 'Land Border',
  dry_port: 'Dry Port',
  rail: 'Rail Terminal',
  multi: 'Multi-modal',
};

function PortsAirportsPage() {
  // ──── DETAIL SECTIONS ─────────────────────────────────────────────────
  const buildDetailSections = (row: PortAirport) => {
    return [
      {
        title: 'Port / Airport Identity',
        fields: [
          { label: 'Code', value: row.code },
          { label: 'Type', value: TYPE_LABELS[row.port_type] || row.port_type },
          { label: 'Name (EN)', value: row.name_en || row.name },
          { label: 'Name (AR)', value: row.name_ar },
        ],
      },
      {
        title: 'Location',
        fields: [
          { label: 'Country', value: row.country_name },
          { label: 'Country (AR)', value: row.country_name_ar },
          { label: 'City', value: row.city_name_en },
          { label: 'City (AR)', value: row.city_name_ar },
          { label: 'Latitude', value: row.latitude != null ? `${row.latitude}` : null },
          { label: 'Longitude', value: row.longitude != null ? `${row.longitude}` : null },
          { label: 'Address', value: row.address },
        ],
      },
      {
        title: 'Capabilities',
        fields: [
          { label: 'Full Container Load (FCL)', value: row.handles_fcl ? '✔ Yes' : '✖ No' },
          { label: 'Less Container Load (LCL)', value: row.handles_lcl ? '✔ Yes' : '✖ No' },
          { label: 'Dangerous Goods (DG)', value: row.handles_dangerous ? '⚠ Certified' : '✖ No' },
          { label: 'International', value: row.is_international ? '✔ Yes' : '✖ No' },
          { label: 'Free Zone', value: row.free_zone ? '✔ Yes' : '— No' },
        ],
      },
      {
        title: 'Codes & Authority',
        fields: [
          { label: 'UN/LOCODE', value: row.un_locode },
          { label: 'IATA Code', value: row.iata_code },
          { label: 'Customs Office Code', value: row.customs_office_code },
          { label: 'Authority (EN)', value: row.authority_name_en },
          { label: 'Authority (AR)', value: row.authority_name_ar },
          { label: 'Operator', value: row.operator },
        ],
      },
      {
        title: 'Infrastructure',
        fields: [
          { label: 'Max Vessel Size', value: row.max_vessel_size },
          { label: 'Annual Capacity (TEU)', value: row.annual_capacity_teu != null ? `${row.annual_capacity_teu}` : null },
          { label: 'Draft (m)', value: row.draft_m != null ? `${row.draft_m}` : null },
          { label: 'Berths', value: row.berths != null ? `${row.berths}` : null },
        ],
      },
      {
        title: 'Status',
        fields: [
          { label: 'Active', value: row.is_active ? '✔ Active' : '✖ Inactive' },
          { label: 'Sort Order', value: row.sort_order != null ? `${row.sort_order}` : null },
          { label: 'Notes (EN)', value: row.description },
          { label: 'Notes (AR)', value: row.description_ar },
        ],
      },
      {
        title: 'Metadata',
        fields: [
          { label: 'Created', value: row.created_at ? new Date(row.created_at).toLocaleString() : null },
          { label: 'Created By', value: row.created_by_name },
          { label: 'Updated', value: row.updated_at ? new Date(row.updated_at).toLocaleString() : null },
          { label: 'Updated By', value: row.updated_by_name },
        ],
      },
    ];
  };

  return (
    <EnterpriseMasterPage<PortAirport>
      config={portsAirportsConfig}
      buildDetailSections={buildDetailSections}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.Ports.View,
  PortsAirportsPage
);
