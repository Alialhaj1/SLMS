/**
 * 🏷️ SHIPMENT CLASSIFICATIONS PAGE (Enterprise Edition) — E-17
 * =============================================================
 *
 * Cargo classification by special handling requirements.
 * Manages standard classifications: general, hazmat, perishable,
 * fragile, oversized, valuable, live_animals, radioactive, etc.
 *
 * Features:
 *   - Requirement indicator badges (handling, docs, temperature)
 *   - UN Code display for hazardous materials
 *   - Color-coded severity icons
 *   - Max stacking layers for fragile cargo
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { shipmentClassificationConfig, type ShipmentClassification } from '@/config/pages/master/shipmentClassifications.config';

function ShipmentClassificationsPage() {
  return (
    <EnterpriseMasterPage<ShipmentClassification>
      config={shipmentClassificationConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Icon', value: record.icon || '📦' },
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Icon Color', value: record.icon_color ? `● ${record.icon_color}` : '—' },
            { label: 'UN Code', value: record.un_code || '—' },
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
          title: 'Handling Requirements / متطلبات التعامل',
          fields: [
            { label: 'Special Handling / تعامل خاص', value: record.requires_special_handling ? '⚠️ Required' : '✅ Not Required' },
            { label: 'Special Documentation / مستندات خاصة', value: record.requires_special_documentation ? '⚠️ Required (MSDS, DGD, etc.)' : '✅ Standard' },
            { label: 'Temperature Control / تحكم حراري', value: record.requires_temperature_control ? '🌡️ Required' : '✅ Not Required' },
            { label: 'Max Stack Layers / حد التكديس', value: record.max_stack_layers !== null && record.max_stack_layers !== undefined ? `⬆ ${record.max_stack_layers} layer(s)` : 'No limit' },
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

export default withPermission(MenuPermissions.MasterData.ShipmentClassifications.View, ShipmentClassificationsPage);
