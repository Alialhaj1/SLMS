/**
 * 🌐 INCOTERMS PAGE (Enterprise Edition) — E-13
 * ================================================
 *
 * International Commercial Terms (ICC Incoterms 2020).
 * Manages the 11 standard trade terms: EXW, FCA, CPT,
 * CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF.
 *
 * Features:
 *   - Category grouping (E/F/C/D)
 *   - Transport mode visualization (any vs sea-only)
 *   - Seller/buyer obligations detail
 *   - Risk & cost transfer points
 *   - Link to delivery_terms for cross-referencing
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { incotermConfig, type Incoterm } from '@/config/pages/master/incoterms.config';

function IncotermsPage() {
  return (
    <EnterpriseMasterPage<Incoterm>
      config={incotermConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Icon', value: record.icon || '🌐' },
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Full Name', value: record.full_name_en || '—' },
            { label: 'Category', value: ({ E: 'E — Departure', F: 'F — Main Carriage Unpaid', C: 'C — Main Carriage Paid', D: 'D — Arrival' } as Record<string, string>)[record.category] || record.category || '—' },
            { label: 'Version', value: `Incoterms ${record.version_year || 2020}` },
            { label: 'Transport Mode', value: record.transport_mode?.includes('sea') ? '🚢 Sea & Inland Waterway Only' : '🌐 Any Mode of Transport' },
            { label: 'Insurance', value: record.insurance_required ? '🛡️ Required' : 'Optional' },
          ],
        },
        {
          title: 'Description / الوصف',
          fields: [
            { label: 'English', value: record.description_en || record.description || '—' },
            { label: 'Arabic', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Risk & Cost Transfer / انتقال الخطر والتكلفة',
          fields: [
            { label: 'Risk Transfer (AR)', value: record.risk_transfer_ar || record.risk_transfer_point || '—' },
            { label: 'Cost Transfer (AR)', value: record.cost_transfer_ar || record.cost_responsibility || '—' },
          ],
        },
        {
          title: 'Seller Obligations / التزامات البائع',
          fields: [
            { label: 'Obligations (AR)', value: record.seller_obligations_ar || '—' },
          ],
        },
        {
          title: 'Buyer Obligations / التزامات المشتري',
          fields: [
            { label: 'Obligations (AR)', value: record.buyer_obligations_ar || '—' },
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

export default withPermission(MenuPermissions.MasterData.Incoterms.View, IncotermsPage);
