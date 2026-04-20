/**
 * Landed Cost Settings Page (Enterprise Edition)
 * Manages default debit/credit accounts for landed cost types.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { landedCostSettingsConfig, type LandedCostSetting } from '@/config/pages/shipments/landedCostSettings.config';

function LandedCostSettingsPage() {
  return (
    <EnterpriseMasterPage<LandedCostSetting>
      config={landedCostSettingsConfig}
      buildDetailSections={(record) => [
        {
          title: 'Account Mapping',
          fields: [
            { label: 'Cost Type', value: record.cost_type_code || '\u2014' },
            { label: 'Debit Account', value: record.debit_account_code ? record.debit_account_code + ' - ' + (record.debit_account_name || '') : '\u2014' },
            { label: 'Credit Account', value: record.credit_account_code ? record.credit_account_code + ' - ' + (record.credit_account_name || '') : '\u2014' },
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

export default withPermission(MenuPermissions.Logistics.LandedCostSettings.View, LandedCostSettingsPage);
