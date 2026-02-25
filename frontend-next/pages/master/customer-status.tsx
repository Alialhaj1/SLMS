/**
 * 🟢 CUSTOMER STATUSES PAGE (Enterprise Edition)
 * ================================================
 * Phase C — Screen 7: Customer operational statuses.
 * Controls sales workflow capabilities:
 *   can_create_order, can_create_invoice, credit_hold.
 *
 * FK: base_status_id → record_statuses (optional parent).
 * Uses EnterpriseMasterPage + customerStatusConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { customerStatusConfig, type CustomerStatus } from '@/config/pages/master/customerStatuses.config';

function CustomerStatusesPage() {
  return (
    <EnterpriseMasterPage<CustomerStatus>
      config={customerStatusConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
            { label: 'Icon', value: record.icon || '—' },
            { label: 'Text Color', value: record.color || '—' },
            { label: 'Background Color', value: record.bg_color || '—' },
            { label: 'Base Status', value: record.base_status_name_en || '—' },
          ],
        },
        {
          title: 'Sales Controls / ضوابط المبيعات',
          fields: [
            { label: 'Can Create Sales Order', value: record.can_create_order ? '✅ Yes' : '❌ No' },
            { label: 'Can Create Invoice', value: record.can_create_invoice ? '✅ Yes' : '❌ No' },
            { label: 'Credit Hold', value: record.credit_hold ? '🔒 Frozen — Cash Only' : '— No Hold' },
            { label: 'Requires Approval to Change', value: record.requires_approval_to_change ? '⚠️ Yes — Approval Required' : 'No' },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'System', value: record.is_system ? '🔒 System' : 'Custom' },
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
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

export default withPermission(MenuPermissions.MasterData.CustomerStatuses.View, CustomerStatusesPage);
