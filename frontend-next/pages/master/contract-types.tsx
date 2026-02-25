/**
 * 📋 CONTRACT TYPES PAGE (Enterprise Edition)
 * ============================================================
 *
 * Master data page for managing contract types with
 * duration types, renewal rules, and approval requirements.
 * Uses EnterpriseMasterPage with contractTypeConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { contractTypeConfig, type ContractType } from '@/config/pages/master/contractTypes.config';

function ContractTypesPage() {
  return (
    <EnterpriseMasterPage<ContractType>
      config={contractTypeConfig}
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
          title: 'Duration & Renewal / المدة والتجديد',
          fields: [
            { label: 'Duration Type', value: record.duration_type === 'fixed' ? '📅 Fixed' : record.duration_type === 'open' ? '🔄 Open-Ended' : '🏗️ Milestone' },
            { label: 'Default Duration', value: record.default_duration_months ? `${record.default_duration_months} months` : '—' },
            { label: 'Renewable', value: record.is_renewable ? '✅ Yes' : '✗ No' },
            { label: 'Renewal Notice', value: record.renewal_notice_days ? `${record.renewal_notice_days} days` : '—' },
          ],
        },
        {
          title: 'Rules & Scope / القواعد والنطاق',
          fields: [
            { label: 'Requires Approval', value: record.requires_approval ? '✅ Required' : '✗ Not required' },
            { label: 'Approval Workflow', value: record.approval_workflow_code || '—' },
            { label: 'Applies To', value: record.applies_to || '—' },
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

export default withPermission(MenuPermissions.MasterData.ContractTypes.View, ContractTypesPage);
