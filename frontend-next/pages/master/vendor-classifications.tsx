/**
 * 🏷️ VENDOR CLASSIFICATIONS PAGE (Enterprise Edition)
 * =====================================================
 *
 * Master data page for managing supplier sub-classifications.
 * Depends on: Supplier Types (supplier_type_id FK).
 * Used in: ABC analysis, evaluation scheduling, procurement reports.
 *
 * Uses EnterpriseMasterPage with supplierCategoryConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { supplierCategoryConfig, type SupplierCategory } from '@/config/pages/master/supplierCategories.config';

function VendorClassificationsPage() {
  return (
    <EnterpriseMasterPage<SupplierCategory>
      config={supplierCategoryConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
            { label: 'Icon', value: record.icon || '—' },
            { label: 'Color', value: record.color || '—' },
            { label: 'Supplier Type', value: record.supplier_type_name_en || 'All Types' },
          ],
        },
        {
          title: 'Classification & Evaluation / التصنيف والتقييم',
          fields: [
            { label: 'ABC Class', value: record.abc_class ? `${record.abc_class} — ${record.abc_class === 'A' ? 'Critical' : record.abc_class === 'B' ? 'Important' : 'Normal'}` : '—' },
            { label: 'Evaluation Required', value: record.evaluation_required ? '✅ Yes' : 'No' },
            { label: 'Evaluation Frequency', value: record.evaluation_frequency_months ? `${record.evaluation_frequency_months} months` : '—' },
            { label: 'Requires Contract', value: record.requires_contract ? '✅ Yes' : 'No' },
            { label: 'Spending Limit', value: record.spending_limit ? record.spending_limit.toLocaleString() : '—' },
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

export default withPermission(MenuPermissions.MasterData.SupplierCategories.View, VendorClassificationsPage);
