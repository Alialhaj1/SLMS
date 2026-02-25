/**
 * 📋 REQUEST STATUS PAGE (Enterprise Edition)
 * =============================================
 *
 * Master data page for managing workflow request statuses.
 * Used for purchase orders, invoices, expense requests, etc.
 *
 * Uses EnterpriseMasterPage with requestStatusConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { requestStatusConfig, type RequestStatus } from '@/config/pages/master/requestStatuses.config';

function RequestStatusPage() {
  return (
    <EnterpriseMasterPage<RequestStatus>
      config={requestStatusConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
            { label: 'Category', value: record.category || '—' },
          ],
        },
        {
          title: 'Badge Appearance / مظهر الشارة',
          fields: [
            { label: 'Text Color', value: record.color || '—' },
            { label: 'Background Color', value: record.bg_color || '—' },
            { label: 'Icon', value: record.icon || '—' },
          ],
        },
        {
          title: 'Workflow Behavior / سلوك سير العمل',
          fields: [
            { label: 'Editable', value: record.is_editable ? '✅ Yes' : 'No' },
            { label: 'Deletable', value: record.is_deletable ? '✅ Yes' : 'No' },
            { label: 'Final State', value: record.is_final ? '✅ Yes' : 'No' },
            { label: 'Requires Approval', value: record.requires_approval ? '✅ Yes' : 'No' },
            { label: 'Applies To', value: record.applies_to || 'all' },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
            { label: 'System', value: record.is_system ? '🔒 Yes' : 'No' },
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

export default withPermission(MenuPermissions.MasterData.RequestStatuses.View, RequestStatusPage);
