/**
 * Shipment Alert Rules Page (Enterprise Edition)
 * Manages automatic alert rules for shipment monitoring.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { shipmentAlertRulesConfig, type ShipmentAlertRule } from '@/config/pages/shipments/alertRules.config';

const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-blue-600 bg-blue-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
};

function ShipmentAlertsPage() {
  return (
    <EnterpriseMasterPage<ShipmentAlertRule>
      config={shipmentAlertRulesConfig}
      buildDetailSections={(record) => [
        {
          title: 'Rule Details',
          fields: [
            { label: 'Name', value: record.name || '\u2014' },
            { label: 'Rule Type', value: record.rule_type || '\u2014' },
            { label: 'Severity', value: record.severity || '\u2014', type: 'badge' as const },
          ],
        },
        {
          title: 'Threshold',
          fields: [
            { label: 'Threshold Value', value: record.threshold_value?.toString() || '\u2014' },
            { label: 'Threshold Unit', value: record.threshold_unit || '\u2014' },
          ],
        },
        {
          title: 'Status',
          fields: [
            { label: 'Active', value: record.is_active ? 'Yes' : 'No' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.Logistics.ShipmentAlertRules.View, ShipmentAlertsPage);
