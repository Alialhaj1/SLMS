/**
 * 🚦 SUPPLIER STATUSES PAGE (Enterprise Edition)
 * ================================================
 * Phase C — Screen 6: Supplier operational statuses.
 * Controls procurement workflow capabilities:
 *   can_create_po, can_receive_goods, can_process_payment.
 *
 * FK: base_status_id → record_statuses (optional parent).
 * Uses EnterpriseMasterPage + supplierStatusConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { supplierStatusConfig, type SupplierStatus } from '@/config/pages/master/supplierStatuses.config';

function SupplierStatusesPage() {
  return (
    <EnterpriseMasterPage<SupplierStatus>
      config={supplierStatusConfig}
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
          title: 'Procurement Capabilities / صلاحيات المشتريات',
          fields: [
            { label: 'Can Create PO', value: record.can_create_po ? '✅ Yes' : '❌ No' },
            { label: 'Can Receive Goods', value: record.can_receive_goods ? '✅ Yes' : '❌ No' },
            { label: 'Can Process Payment', value: record.can_process_payment ? '✅ Yes' : '❌ No' },
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

export default withPermission(MenuPermissions.MasterData.SupplierStatuses.View, SupplierStatusesPage);
