/**
 * ðŸ“¦ CONTAINER TYPES PAGE (Enterprise Edition)
 * ================================================
 *
 * Master data page for managing ISO standard container types.
 * Defines container specifications: dimensions, weight capacity,
 * volume, and special features (reefer, open top, flat rack).
 *
 * Includes:
 *   - Container dimension diagram in detail panel
 *   - Auto-calculated net payload (max_payload - tare_weight)
 *
 * Uses EnterpriseMasterPage with containerTypeConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { containerTypeConfig, type ContainerType } from '@/config/pages/master/containerTypes.config';

/** Miniature container dimension diagram */
function ContainerDiagram({ record }: { record: ContainerType }) {
  const ft = record.length_ft || record.size_ft || 20;
  const w = Math.min(200, ft === 20 ? 120 : ft === 40 ? 180 : 200);
  const h = record.height_type === 'HC' || (record.name_en || '').includes('High') ? 70 : 55;
  const isReefer = record.is_refrigerated;
  const isOpen = record.is_open_top;
  const isFR = record.is_flat_rack;

  const bg = isReefer ? '#dbeafe' : isOpen ? '#fef3c7' : isFR ? '#fce7f3' : '#f3f4f6';
  const border = isReefer ? '#3b82f6' : isOpen ? '#f59e0b' : isFR ? '#ec4899' : '#9ca3af';

  return React.createElement('div', { className: 'flex flex-col items-center gap-1' },
    React.createElement('svg', { width: w + 40, height: h + 30, viewBox: `0 0 ${w + 40} ${h + 30}` },
      // Container body
      React.createElement('rect', { x: 10, y: 5, width: w, height: h, rx: 3, fill: bg, stroke: border, strokeWidth: 2 }),
      // Door lines
      React.createElement('line', { x1: w + 10, y1: 10, x2: w + 10, y2: h, stroke: border, strokeWidth: 1.5, strokeDasharray: '4,3' }),
      // Open top indicator
      isOpen && React.createElement('line', { x1: 12, y1: 5, x2: w + 8, y2: 5, stroke: '#f59e0b', strokeWidth: 3, strokeDasharray: '6,4' }),
      // Reefer indicator
      isReefer && React.createElement('text', { x: w / 2 + 10, y: h / 2 + 8, textAnchor: 'middle', fontSize: 18 }, 'â„ï¸'),
      // FR indicator
      isFR && React.createElement('text', { x: w / 2 + 10, y: h / 2 + 8, textAnchor: 'middle', fontSize: 14, fill: '#ec4899' }, 'FLAT'),
      // Width label
      React.createElement('text', { x: w / 2 + 10, y: h + 22, textAnchor: 'middle', fontSize: 10, fill: '#6b7280' }, `${ft}ft`),
    ),
    record.icon && React.createElement('span', { className: 'text-2xl' }, record.icon),
  );
}

function ContainerTypesPage() {
  return (
    <EnterpriseMasterPage<ContainerType>
      config={containerTypeConfig}
      buildDetailSections={(record) => {
        const netPayload = (record.max_payload_kg && record.tare_weight_kg)
          ? Number(record.max_payload_kg) - Number(record.tare_weight_kg)
          : record.net_payload_kg;

        return [
          {
            title: 'Container Diagram / Ù…Ø®Ø·Ø· Ø§Ù„Ø­Ø§ÙˆÙŠØ©',
            fields: [
              { label: '', value: '' },
            ],
            customContent: React.createElement(ContainerDiagram, { record }),
          } as any,
          {
            title: 'Basic Information / Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©',
            fields: [
              { label: 'Icon', value: record.icon || 'ðŸ“¦' },
              { label: 'Code', value: record.code || 'â€”' },
              { label: 'Name (English)', value: record.name_en || record.name || 'â€”' },
              { label: 'Name (Arabic)', value: record.name_ar || 'â€”' },
              { label: 'Category', value: (record.container_category || 'dry').toUpperCase() },
              { label: 'ISO Code', value: record.iso_code || 'â€”' },
              { label: 'TEU', value: record.teu?.toString() || 'â€”' },
            ],
          },
          {
            title: 'Dimensions / Ø§Ù„Ø£Ø¨Ø¹Ø§Ø¯',
            fields: [
              { label: 'Length', value: record.length_ft ? `${record.length_ft} ft` : 'â€”' },
              { label: 'Ext. Length', value: record.external_length_mm ? `${record.external_length_mm} mm` : 'â€”' },
              { label: 'Ext. Width', value: record.external_width_mm ? `${record.external_width_mm} mm` : 'â€”' },
              { label: 'Ext. Height', value: record.external_height_mm ? `${record.external_height_mm} mm` : 'â€”' },
              { label: 'Internal Volume', value: record.internal_volume_m3 ? `${record.internal_volume_m3} mÂ³` : (record.cubic_capacity_m3 ? `${record.cubic_capacity_m3} mÂ³` : 'â€”') },
            ],
          },
          {
            title: 'Weight & Payload / Ø§Ù„ÙˆØ²Ù† ÙˆØ§Ù„Ø­Ù…ÙˆÙ„Ø©',
            fields: [
              { label: 'Max Payload', value: record.max_payload_kg ? `${Number(record.max_payload_kg).toLocaleString()} kg` : 'â€”' },
              { label: 'Tare Weight', value: record.tare_weight_kg ? `${Number(record.tare_weight_kg).toLocaleString()} kg` : 'â€”' },
              { label: 'ðŸ“Š Net Payload', value: netPayload ? `${Number(netPayload).toLocaleString()} kg` : 'â€”' },
            ],
          },
          {
            title: 'Features / Ø§Ù„Ù…ÙŠØ²Ø§Øª',
            fields: [
              { label: 'Refrigerated', value: record.is_refrigerated ? 'â„ï¸ Yes' : 'No' },
              { label: 'Open Top', value: record.is_open_top ? 'ðŸ“­ Yes' : 'No' },
              { label: 'Flat Rack', value: record.is_flat_rack ? 'ðŸ”² Yes' : 'No' },
            ],
          },
          {
            title: 'Settings / Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª',
            fields: [
              { label: 'System', value: record.is_system ? 'ðŸ”’ System' : 'Custom' },
              { label: 'Status', value: record.status || 'active', type: 'badge' as const },
              { label: 'Sort Order', value: record.sort_order?.toString() || 'â€”' },
            ],
          },
          {
            title: 'Audit Trail / Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚',
            fields: [
              { label: 'Created', value: record.created_at, type: 'date' as const },
              { label: 'Updated', value: record.updated_at, type: 'date' as const },
            ],
          },
        ];
      }}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.ContainerTypes.View, ContainerTypesPage);

