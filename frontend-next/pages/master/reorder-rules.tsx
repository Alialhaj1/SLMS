/**
 * ðŸ”„ REORDER RULES PAGE (Enterprise Edition)
 * =============================================
 *
 * Master data page for inventory reorder rules.
 * Uses EnterpriseMasterPage with reorderRulesConfig.
 *
 * Defines min/max stock levels, reorder points,
 * safety stock, and auto-PO triggers per item+warehouse.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  reorderRulesConfig,
  type ReorderRule,
} from '@/config/pages/master/reorderRules.config';

function ReorderRulesPage() {
  // â”€â”€â”€â”€ DETAIL SECTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const buildDetailSections = (rule: ReorderRule) => [
    {
      title: 'Item & Location',
      fields: [
        { label: 'Item', value: rule.item_name },
        { label: 'Item Code', value: rule.item_code },
        { label: 'Item (AR)', value: rule.item_name_ar },
        { label: 'Warehouse', value: rule.warehouse_name },
        { label: 'Warehouse Code', value: rule.warehouse_code },
      ],
    },
    {
      title: 'Stock Levels',
      fields: [
        { label: 'Minimum Qty', value: rule.min_qty != null ? Number(rule.min_qty).toLocaleString() : null },
        { label: 'Reorder Point', value: rule.reorder_point != null ? Number(rule.reorder_point).toLocaleString() : null },
        { label: 'Maximum Qty', value: rule.max_qty != null ? Number(rule.max_qty).toLocaleString() : null },
        { label: 'Safety Stock', value: rule.safety_stock != null ? Number(rule.safety_stock).toLocaleString() : null },
        { label: 'Current On Hand', value: rule.current_qty != null ? Number(rule.current_qty).toLocaleString() : null },
        { label: 'Stock Status', value: rule.stock_status },
      ],
    },
    {
      title: 'Reorder Configuration',
      fields: [
        { label: 'Reorder Quantity', value: rule.reorder_qty != null ? Number(rule.reorder_qty).toLocaleString() : null },
        { label: 'Lead Time (days)', value: rule.lead_time_days != null ? String(rule.lead_time_days) : null },
        { label: 'Preferred Supplier', value: rule.supplier_name },
        { label: 'Auto Create PO', value: rule.auto_create_purchase_order ? 'âœ” Yes' : 'âœ– No' },
        { label: 'PO Approval Required', value: rule.po_approval_required ? 'âœ” Yes' : 'âœ– No' },
      ],
    },
    {
      title: 'Status',
      fields: [
        { label: 'Active', value: rule.is_active ? 'âœ” Active' : 'âœ– Inactive' },
        { label: 'Last Triggered', value: rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleString() : 'Never' },
      ],
    },
    {
      title: 'Metadata',
      fields: [
        { label: 'Created', value: rule.created_at ? new Date(rule.created_at).toLocaleString() : null },
        { label: 'Created By', value: rule.created_by_name },
        { label: 'Updated', value: rule.updated_at ? new Date(rule.updated_at).toLocaleString() : null },
        { label: 'Updated By', value: rule.updated_by_name },
      ],
    },
  ];

  // â”€â”€â”€â”€ TRANSFORM: map reorder_point â†’ reorder_level for backend â”€â”€â”€â”€â”€
  const transformBeforeSubmit = (data: Record<string, any>): Record<string, any> => {
    const payload = { ...data };
    // Backend expects reorder_level OR reorder_point (it accepts both)
    // No transformation needed â€” the backend normalizes field names
    return payload;
  };

  return (
    <EnterpriseMasterPage<ReorderRule>
      config={reorderRulesConfig}
      buildDetailSections={buildDetailSections}
      transformBeforeSubmit={transformBeforeSubmit}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.ReorderRules.View,
  ReorderRulesPage
);
