/**
 * 📍 ADDRESS TYPES PAGE (Enterprise Edition)
 * ============================================
 *
 * Master data page for managing address type classifications.
 * Defines billing, shipping, and invoice-default flags per address category.
 *
 * Uses EnterpriseMasterPage with addressTypeConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { addressTypeConfig, type AddressType } from '@/config/pages/master/addressTypes.config';

function AddressTypesPage() {
  return (
    <EnterpriseMasterPage<AddressType>
      config={addressTypeConfig}
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
          title: 'Address Behavior / سلوك العنوان',
          fields: [
            { label: 'Billing', value: record.is_billing ? '✅ Used for billing' : 'No' },
            { label: 'Shipping', value: record.is_shipping ? '✅ Used for shipping' : 'No' },
            { label: 'Default for Invoices', value: record.is_default_for_invoices ? '✅ Default' : 'No' },
            { label: 'Applies To', value: record.applies_to || 'all' },
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

export default withPermission(MenuPermissions.MasterData.AddressTypes.View, AddressTypesPage);
