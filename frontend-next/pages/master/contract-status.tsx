/**
 * 🔵 CONTRACT STATUSES PAGE (Enterprise Edition)
 * ================================================
 * Phase C — Screen 9: Contract lifecycle statuses with workflow flags.
 * Controls: can_edit, can_create_po, allows_invoicing, requires_renewal_action,
 *           send_expiry_alert, expiry_alert_days, is_final.
 *
 * FK: request_status_id → request_statuses (required).
 * Uses EnterpriseMasterPage + contractStatusConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { contractStatusConfig, type ContractStatus } from '@/config/pages/master/contractStatuses.config';

function ContractStatusesPage() {
  return (
    <EnterpriseMasterPage<ContractStatus>
      config={contractStatusConfig}
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
          title: 'Workflow Controls / أدوات التحكم',
          fields: [
            { label: 'Can Edit', value: record.can_edit ? '✅ Yes' : '❌ No' },
            { label: 'Can Create PO', value: record.can_create_po ? '✅ Yes — Allows purchase order creation' : '❌ No' },
            { label: 'Allows Invoicing', value: record.allows_invoicing ? '✅ Yes — Invoicing enabled' : '❌ No' },
            { label: 'Final Status', value: record.is_final ? '🔒 Final — No further transitions' : 'Not Final' },
          ],
        },
        {
          title: 'Expiry & Renewal / الانتهاء والتجديد',
          fields: [
            { label: 'Requires Renewal', value: record.requires_renewal_action ? '✅ Yes — Needs renewal action' : '❌ No' },
            { label: 'Send Expiry Alert', value: record.send_expiry_alert ? '🔔 Yes — Alerts enabled' : '❌ No' },
            { label: 'Alert Days Before', value: record.expiry_alert_days ? `${record.expiry_alert_days} days` : '—' },
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

export default withPermission(MenuPermissions.MasterData.ContractStatuses.View, ContractStatusesPage);
