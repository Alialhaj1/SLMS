/**
 * 📊 CYCLE COUNT POLICIES PAGE (Enterprise Edition)
 * ===================================================
 *
 * Master data page for cycle count policies.
 * Uses EnterpriseMasterPage with cycleCountPoliciesConfig.
 *
 * Defines counting schedules, ABC frequencies,
 * tolerance levels, and count methods per warehouse.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  cycleCountPoliciesConfig,
  type CycleCountPolicy,
} from '@/config/pages/master/cycleCountPolicies.config';

function CycleCountPoliciesPage() {
  // ──── DETAIL SECTIONS ─────────────────────────────────────────────────────
  const buildDetailSections = (policy: CycleCountPolicy) => {
    const POLICY_TYPE_LABELS: Record<string, string> = {
      abc_rotation: 'ABC Rotation',
      full_annual: 'Full Annual',
      location_based: 'Location Based',
      item_group: 'Item Group',
    };
    const COUNT_METHOD_LABELS: Record<string, string> = {
      manual: 'Manual',
      barcode_scan: 'Barcode Scan',
      rfid: 'RFID',
    };

    return [
      {
        title: 'Policy Identity',
        fields: [
          { label: 'Policy Name (EN)', value: policy.name_en },
          { label: 'Policy Name (AR)', value: policy.name_ar },
          { label: 'Warehouse', value: policy.warehouse_name },
          { label: 'Warehouse Code', value: policy.warehouse_code },
          { label: 'Policy Type', value: POLICY_TYPE_LABELS[policy.policy_type] || policy.policy_type },
        ],
      },
      {
        title: 'ABC Frequency Schedule',
        fields: [
          { label: 'A-Items Frequency', value: policy.abc_a_frequency_days != null ? `${policy.abc_a_frequency_days} days` : null },
          { label: 'B-Items Frequency', value: policy.abc_b_frequency_days != null ? `${policy.abc_b_frequency_days} days` : null },
          { label: 'C-Items Frequency', value: policy.abc_c_frequency_days != null ? `${policy.abc_c_frequency_days} days` : null },
        ],
      },
      {
        title: 'Tolerance & Count Settings',
        fields: [
          { label: 'Tolerance %', value: policy.tolerance_pct != null ? `${Number(policy.tolerance_pct).toFixed(2)}%` : null },
          { label: 'Count Method', value: COUNT_METHOD_LABELS[policy.count_method] || policy.count_method },
          { label: 'Requires Approval', value: policy.requires_approval_for_adjustment ? '✔ Yes' : '✖ No' },
          { label: 'Allow Negative Adjustment', value: policy.allow_negative_adjustment ? '✔ Yes' : '✖ No' },
        ],
      },
      {
        title: 'Status',
        fields: [
          { label: 'Active', value: policy.is_active ? '✔ Active' : '✖ Inactive' },
        ],
      },
      {
        title: 'Metadata',
        fields: [
          { label: 'Created', value: policy.created_at ? new Date(policy.created_at).toLocaleString() : null },
          { label: 'Created By', value: policy.created_by_name },
          { label: 'Updated', value: policy.updated_at ? new Date(policy.updated_at).toLocaleString() : null },
          { label: 'Updated By', value: policy.updated_by_name },
        ],
      },
    ];
  };

  return (
    <EnterpriseMasterPage<CycleCountPolicy>
      config={cycleCountPoliciesConfig}
      buildDetailSections={buildDetailSections}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.CycleCountPolicies.View,
  CycleCountPoliciesPage
);
