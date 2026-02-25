/**
 * 🔵 PURCHASE ORDER STATUSES PAGE (Enterprise Edition)
 * ================================================
 * Phase C — Screen 8: PO lifecycle statuses with workflow capability flags.
 * Controls: can_edit, can_cancel, can_receive, can_invoice.
 * Accounting integration: triggers_accounting, accounting_entry_type.
 *
 * FK: request_status_id → request_statuses (required).
 * Uses EnterpriseMasterPage + poStatusConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { poStatusConfig, type PoStatus } from '@/config/pages/master/poStatuses.config';

function PoStatusesPage() {
  return (
    <EnterpriseMasterPage<PoStatus>
      config={poStatusConfig}
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
            { label: 'Request Status', value: record.request_status_name_en || '—' },
          ],
        },
        {
          title: 'Workflow Capabilities / صلاحيات سير العمل',
          fields: [
            { label: 'Can Edit', value: record.can_edit ? '✅ Yes' : '❌ No' },
            { label: 'Can Cancel', value: record.can_cancel ? '✅ Yes' : '❌ No' },
            { label: 'Can Receive', value: record.can_receive ? '✅ Yes' : '❌ No' },
            { label: 'Can Invoice', value: record.can_invoice ? '✅ Yes' : '❌ No' },
            { label: 'Final Status', value: record.is_final ? '🔒 Final — No further transitions' : 'Not Final' },
          ],
        },
        {
          title: 'Accounting Integration / التكامل المحاسبي',
          fields: [
            { label: 'Triggers Accounting', value: record.triggers_accounting ? '✅ Yes — Creates accounting entry' : '❌ No' },
            { label: 'Entry Type', value: record.accounting_entry_type || '—' },
          ],
        },
        {
          title: 'Audit Trail / سجل التدقيق',
          fields: [
            { label: 'System', value: record.is_system ? '🔒 System' : 'Custom' },
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.PoStatuses.View, PoStatusesPage);

