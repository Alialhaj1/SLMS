/**
 * 📞 CONTACT METHODS PAGE (Enterprise Edition)
 * ===============================================
 *
 * Master data page for managing communication channels.
 * Phone, email, WhatsApp, social media, fax, etc.
 *
 * Uses EnterpriseMasterPage with contactMethodsConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { contactMethodsConfig, type ContactMethod } from '@/config/pages/master/contactMethods.config';

function ContactMethodsPage() {
  return (
    <EnterpriseMasterPage<ContactMethod>
      config={contactMethodsConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Input Type', value: record.input_type || '—' },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Icon & Appearance / الأيقونة والمظهر',
          fields: [
            { label: 'Icon', value: record.icon || '—' },
            { label: 'Icon Color', value: record.icon_color || '—' },
          ],
        },
        {
          title: 'Input & Validation / التنسيق والتحقق',
          fields: [
            { label: 'Input Format', value: record.input_format || '—' },
            { label: 'Validation Regex', value: record.validation_regex || '—' },
            { label: 'Placeholder (EN)', value: record.placeholder_en || '—' },
            { label: 'Placeholder (AR)', value: record.placeholder_ar || '—' },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'Primary', value: record.is_primary ? '✅ Yes' : 'No' },
            { label: 'Notification Channel', value: record.is_notification_channel ? '🔔 Yes' : 'No' },
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
            { label: 'System', value: record.is_system ? '🔒 Yes' : 'No' },
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

export default withPermission(MenuPermissions.MasterData.ContactMethods.View, ContactMethodsPage);
