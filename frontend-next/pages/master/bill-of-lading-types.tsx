/**
 * 📄 BILL OF LADING TYPES PAGE (Enterprise Edition) — E-14
 * ================================================
 *
 * Bill of Lading / Waybill document types.
 * Manages standard B/L types: MBL, HBL, SWB, MAWB, HAWB,
 * CMR, CIM, FBL, FCR, TNBL, and custom types.
 *
 * Features:
 *   - Transport mode grouping (sea/air/road/rail/multimodal)
 *   - Document kind visualization (master/house/other)
 *   - Negotiability & original-document flags
 *   - Copies required tracking
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { billOfLadingTypeConfig, type BillOfLadingType } from '@/config/pages/master/billOfLadingTypes.config';

function BillOfLadingTypesPage() {
  return (
    <EnterpriseMasterPage<BillOfLadingType>
      config={billOfLadingTypeConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Icon', value: record.icon || '📄' },
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Transport Mode', value: ({ sea: '🚢 Sea', air: '✈️ Air', road: '🚛 Road', rail: '🚂 Rail', multimodal: '🌐 Multimodal' } as Record<string, string>)[record.transport_mode] || record.transport_mode || '—' },
            { label: 'Document Kind', value: ({ master: 'Master', house: 'House', other: 'Other' } as Record<string, string>)[record.document_kind] || record.document_kind || '—' },
          ],
        },
        {
          title: 'Description / الوصف',
          fields: [
            { label: 'English', value: record.description_en || '—' },
            { label: 'Arabic', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Document Properties / خصائص المستند',
          fields: [
            { label: 'Negotiable', value: record.is_negotiable ? '✅ Negotiable' : 'Non-negotiable' },
            { label: 'Requires Original', value: record.requires_original ? '✅ Yes' : 'No' },
            { label: 'Copies Required', value: record.copies_required > 0 ? String(record.copies_required) : '—' },
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

export default withPermission(MenuPermissions.MasterData.BillOfLadingTypes.View, BillOfLadingTypesPage);
