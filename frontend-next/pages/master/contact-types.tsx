/**
 * 👤 CONTACT TYPES PAGE (Enterprise Edition)
 * ============================================
 *
 * Master data page for managing contact type classifications.
 * Defines primary, invoices, orders, and notifications flags
 * per contact category for suppliers, customers, and partners.
 *
 * Uses EnterpriseMasterPage with contactTypeConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { contactTypeConfig, type ContactType } from '@/config/pages/master/contactTypes.config';

function ContactTypesPage() {
  return (
    <EnterpriseMasterPage<ContactType>
      config={contactTypeConfig}
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
          title: 'Communication Settings / إعدادات التواصل',
          fields: [
            { label: 'Primary Contact', value: record.is_primary ? '⭐ Primary' : 'No' },
            { label: 'Receives Invoices', value: record.receives_invoices ? '✅ Yes' : 'No' },
            { label: 'Receives Orders', value: record.receives_orders ? '✅ Yes' : 'No' },
            { label: 'Receives Notifications', value: record.receives_notifications ? '✅ Yes' : 'No' },
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

export default withPermission(MenuPermissions.MasterData.ContactTypes.View, ContactTypesPage);
