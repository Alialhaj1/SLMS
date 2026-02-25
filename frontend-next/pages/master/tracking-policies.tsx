/**
 * 🔍 TRACKING POLICIES PAGE (Enterprise Edition)
 * ================================================
 *
 * Master data page for managing item tracking policies.
 * Defines how items are tracked: serial numbers, batches,
 * expiry dates, manufacture dates, or no tracking.
 *
 * 6 seeded policies: none, batch, serial, expiry, serial_expiry, full.
 *
 * Uses EnterpriseMasterPage with trackingPolicyConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { trackingPolicyConfig, type TrackingPolicy } from '@/config/pages/master/trackingPolicies.config';

function TrackingPoliciesPage() {
  return (
    <EnterpriseMasterPage<TrackingPolicy>
      config={trackingPolicyConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Icon', value: record.icon || '—' },
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Tracking Capabilities / إمكانيات التتبع',
          fields: [
            { label: 'Serial Numbers', value: record.tracks_serial ? '🔢 Yes' : 'No' },
            { label: 'Batches', value: record.tracks_batch ? '🗂️ Yes' : 'No' },
            { label: 'Expiry Dates', value: record.tracks_expiry ? '⏰ Yes' : 'No' },
            { label: 'Manufacture Date', value: record.tracks_manufacture_date ? '🏭 Yes' : 'No' },
          ],
        },
        {
          title: 'Input Requirements / متطلبات الإدخال',
          fields: [
            { label: 'Required on Receipt', value: record.requires_input_on_receipt ? '📥 Yes' : 'No' },
            { label: 'Required on Issue', value: record.requires_input_on_issue ? '📤 Yes' : 'No' },
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

export default withPermission(MenuPermissions.MasterData.TrackingPolicies.View, TrackingPoliciesPage);
