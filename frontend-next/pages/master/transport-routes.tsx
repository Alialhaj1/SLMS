/**
 * Transport Routes Page (Enterprise Edition)
 * Uses EnterpriseMasterPage with transportRoutesConfig.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { transportRouteConfig, type TransportRoute } from '@/config/pages/master/transportRoutes.config';

function TransportRoutesPage() {
  return (
    <EnterpriseMasterPage<TransportRoute>
      config={transportRouteConfig}
      buildDetailSections={(record) => [
        {
          title: 'Route Identity',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (EN)', value: record.name_en || '—' },
            { label: 'Name (AR)', value: record.name_ar || '—' },
            { label: 'Route Type', value: record.route_type || '—' },
            { label: 'Transport Mode', value: record.transport_mode || '—' },
          ],
        },
        {
          title: 'Origin',
          fields: [
            { label: 'Origin Type', value: record.origin_type || '—' },
            { label: 'Description', value: record.origin_description || '—' },
          ],
        },
        {
          title: 'Destination',
          fields: [
            { label: 'Destination Type', value: record.destination_type || '—' },
            { label: 'Description', value: record.destination_description || '—' },
          ],
        },
        {
          title: 'Logistics',
          fields: [
            { label: 'Distance', value: record.distance_km ? record.distance_km + ' km' : '—' },
            { label: 'Est. Hours', value: record.estimated_hours?.toString() || '—' },
            { label: 'Est. Days', value: record.estimated_days?.toString() || '—' },
            { label: 'Max Weight', value: record.max_weight_tons ? record.max_weight_tons + ' tons' : '—' },
            { label: 'Frequency', value: record.frequency || '—' },
            { label: 'Risk Level', value: record.risk_level || '—' },
            { label: 'Requires Customs', value: record.requires_customs_clearance ? 'Yes' : 'No' },
          ],
        },
        {
          title: 'Cost',
          fields: [
            { label: 'Cost per Trip', value: record.cost_per_trip?.toString() || '—' },
            { label: 'Cost per Ton-KM', value: record.cost_per_ton_km?.toString() || '—' },
            { label: 'Currency', value: record.currency_code || '—' },
          ],
        },
        {
          title: 'Settings',
          fields: [
            { label: 'Status', value: record.is_active ? 'Active' : 'Inactive', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.TransportRoutes.View, TransportRoutesPage);
