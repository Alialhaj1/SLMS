/**
 * 🏢 CUSTOMER TYPES PAGE (Enterprise Edition)
 * ============================================
 *
 * Master data page for managing customer type classifications.
 * Defines business rules like VAT requirements, commercial
 * registration, B2B/B2C flags, and default tax treatment.
 *
 * Uses EnterpriseMasterPage with customerTypeConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { customerTypeConfig, type CustomerType } from '@/config/pages/master/customerTypes.config';

function CustomerTypesPage() {
  return (
    <EnterpriseMasterPage<CustomerType>
      config={customerTypeConfig}
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
          title: 'Business Rules / القواعد التجارية',
          fields: [
            { label: 'Requires VAT Number', value: record.requires_vat_number ? '✅ Yes' : 'No' },
            { label: 'Requires CR', value: record.requires_cr ? '✅ Yes' : 'No' },
            { label: 'B2B', value: record.is_b2b ? '✅ B2B' : 'No' },
            { label: 'B2C', value: record.is_b2c ? '✅ B2C' : 'No' },
            { label: 'Local', value: record.is_local ? '🏠 Local' : '🌍 International' },
            { label: 'Tax Treatment', value: record.default_tax_treatment || 'standard' },
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

export default withPermission(MenuPermissions.MasterData.CustomerTypes.View, CustomerTypesPage);
