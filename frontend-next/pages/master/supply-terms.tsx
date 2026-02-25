/**
 * 📦 SUPPLY TERMS PAGE (Enterprise Edition)
 * ==========================================
 *
 * Master data page for managing supply term classifications.
 * Defines supply patterns like JIT, Blanket Order, Consignment,
 * lead time ranges, forecast/contract requirements, and scheduling.
 *
 * Uses EnterpriseMasterPage with supplyTermConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { supplyTermConfig, type SupplyTerm } from '@/config/pages/master/supplyTerms.config';

function SupplyTermsPage() {
  return (
    <EnterpriseMasterPage<SupplyTerm>
      config={supplyTermConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
            { label: 'Icon', value: record.icon || '—' },
          ],
        },
        {
          title: 'Supply Rules / قواعد التوريد',
          fields: [
            { label: 'Min Lead Days', value: record.min_lead_days?.toString() || '—' },
            { label: 'Max Lead Days', value: record.max_lead_days?.toString() || '—' },
            {
              label: 'Lead Time Range',
              value:
                record.min_lead_days != null && record.max_lead_days != null
                  ? `${record.min_lead_days} – ${record.max_lead_days} days`
                  : '—',
            },
            { label: 'Requires Forecast', value: record.requires_forecast ? '✅ Yes' : 'No' },
            { label: 'Requires Contract', value: record.requires_contract ? '✅ Yes' : 'No' },
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

export default withPermission(MenuPermissions.MasterData.SupplyTerms.View, SupplyTermsPage);
