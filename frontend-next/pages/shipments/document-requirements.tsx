/**
 * Shipment Document Requirements Page (Enterprise Edition)
 * Manages required documents per shipment type and stage.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { documentRequirementsConfig, type ShipmentDocumentRequirement } from '@/config/pages/shipments/documentRequirements.config';

function DocumentRequirementsPage() {
  return (
    <EnterpriseMasterPage<ShipmentDocumentRequirement>
      config={documentRequirementsConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Code', value: record.requirement_code || '\u2014' },
            { label: 'Name (EN)', value: record.name_en || '\u2014' },
            { label: 'Name (AR)', value: record.name_ar || '\u2014' },
            { label: 'Category', value: record.document_category || '\u2014' },
            { label: 'Shipment Type', value: record.shipment_type_name_en || '\u2014' },
          ],
        },
        {
          title: 'Requirements',
          fields: [
            { label: 'Stage', value: record.stage || '\u2014' },
            { label: 'Applies To', value: record.applies_to || '\u2014' },
            { label: 'Mandatory', value: record.is_mandatory ? 'Yes' : 'No' },
            { label: 'Issuing Authority', value: record.issuing_authority || '\u2014' },
            { label: 'Validity (Days)', value: record.valid_days?.toString() || 'No expiry' },
            { label: 'Template URL', value: record.template_url || '\u2014' },
          ],
        },
        {
          title: 'Descriptions',
          fields: [
            { label: 'Description (EN)', value: record.description_en || '\u2014' },
            { label: 'Description (AR)', value: record.description_ar || '\u2014' },
          ],
        },
        {
          title: 'Status',
          fields: [
            { label: 'Active', value: record.is_active ? 'Yes' : 'No' },
            { label: 'Sort Order', value: record.sort_order?.toString() || '\u2014' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.Logistics.ShipmentDocumentRequirements.View, DocumentRequirementsPage);
