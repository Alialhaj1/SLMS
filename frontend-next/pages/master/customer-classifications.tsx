/**
 * 🏅 CUSTOMER CLASSIFICATIONS PAGE (Enterprise Edition)
 * ======================================================
 *
 * Master data page for managing customer sub-classifications.
 * Depends on: Customer Types (customer_type_id FK).
 * Used for: Pricing policies, discount agreements, CRM, sales reports.
 *
 * Uses EnterpriseMasterPage with customerCategoryConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { customerCategoryConfig, type CustomerCategory } from '@/config/pages/master/customerCategories.config';

function CustomerClassificationsPage() {
  return (
    <EnterpriseMasterPage<CustomerCategory>
      config={customerCategoryConfig}
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
            { label: 'Customer Type', value: record.customer_type_name_en || 'All Types' },
          ],
        },
        {
          title: 'Classification & Defaults / التصنيف والقيم الافتراضية',
          fields: [
            { label: 'ABC Class', value: record.abc_class ? `${record.abc_class} — ${record.abc_class === 'A' ? 'Top Revenue' : record.abc_class === 'B' ? 'Medium' : 'Low'}` : '—' },
            { label: 'Default Discount', value: record.default_discount_pct !== null && record.default_discount_pct !== undefined ? `${record.default_discount_pct}%` : '—' },
            { label: 'Credit Limit', value: record.default_credit_limit ? Number(record.default_credit_limit).toLocaleString() : 'Unlimited' },
            { label: 'Payment Days', value: record.default_payment_days && record.default_payment_days > 0 ? `${record.default_payment_days} days` : 'Cash Only' },
            { label: 'Periodic Review', value: record.requires_periodic_review ? '✅ Yes' : 'No' },
            { label: 'Min Annual Revenue', value: record.min_annual_revenue ? Number(record.min_annual_revenue).toLocaleString() : '—' },
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

export default withPermission(MenuPermissions.MasterData.CustomerCategories.View, CustomerClassificationsPage);
