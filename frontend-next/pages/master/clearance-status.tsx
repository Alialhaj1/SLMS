/**
 * 🛃 CUSTOMS CLEARANCE STATUSES PAGE (Enterprise Edition)
 * ========================================================
 * Phase E — Screen 10: Customs clearance statuses with ZATCA compliance.
 * Controls: blocks_release, requires_document, required_document_type,
 *           customs_authority_code, triggers_duty_calculation,
 *           triggers_vat_calculation, estimated_days, is_final.
 *
 * FK: request_status_id → request_statuses (required).
 * Uses EnterpriseMasterPage + customsStatusConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { customsStatusConfig, type CustomsStatus } from '@/config/pages/master/customsStatuses.config';

function CustomsStatusesPage() {
  return (
    <EnterpriseMasterPage<CustomsStatus>
      config={customsStatusConfig}
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
            { label: 'Authority Code', value: record.customs_authority_code || '—' },
          ],
        },
        {
          title: 'Compliance Controls / ضوابط الامتثال',
          fields: [
            { label: 'Blocks Release', value: record.blocks_release ? '🚫 Yes — Blocks cargo release' : '✅ No — Release allowed' },
            { label: 'Requires Document', value: record.requires_document ? '📄 Yes — Document required' : '❌ No' },
            { label: 'Document Type', value: record.required_document_type || '—' },
            { label: 'Final Status', value: record.is_final ? '🔒 Final — No further transitions' : 'Not Final' },
          ],
        },
        {
          title: 'Customs & Tax Triggers / الرسوم والضرائب',
          fields: [
            { label: 'Triggers Duty', value: record.triggers_duty_calculation ? '💰 Yes — Duty calculation triggered' : '❌ No' },
            { label: 'Triggers VAT', value: record.triggers_vat_calculation ? '💰 Yes — VAT calculation triggered' : '❌ No' },
            { label: 'Estimated Days', value: record.estimated_days ? `${record.estimated_days} days` : '—' },
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

export default withPermission(MenuPermissions.MasterData.CustomsStatuses.View, CustomsStatusesPage);
