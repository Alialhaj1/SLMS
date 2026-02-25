/**
 * 🗣️ LANGUAGES PAGE (Enterprise Edition)
 * ========================================
 * 
 * Master data page for managing supported languages.
 * ISO 639-1 language database with RTL/LTR direction,
 * date/number/currency formats, system language flags,
 * document language support, stats bar, table/cards views,
 * bulk operations, export, and audit trail.
 * 
 * Uses EnterpriseMasterPage with languagesConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { languagesConfig, type Language } from '@/config/pages/master/languages.config';

function LanguagesPage() {
  return (
    <EnterpriseMasterPage<Language>
      config={languagesConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Flag', value: record.flag_icon || '🌐' },
            { label: 'Code (ISO 639)', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Native Name', value: record.name_native || '—' },
            { label: 'Direction', value: record.direction === 'rtl' ? 'RTL — Right to Left' : 'LTR — Left to Right' },
          ],
        },
        {
          title: 'Date & Number Formats / صيغ التاريخ والأرقام',
          fields: [
            { label: 'Date Format', value: record.date_format || '—' },
            { label: 'Time Format', value: record.time_format || '—' },
            { label: 'Number Format', value: record.number_format || '—' },
            { label: 'Decimal Separator', value: record.decimal_separator || '—' },
            { label: 'Thousands Separator', value: record.thousands_separator || '—' },
            { label: 'Currency Position', value: record.currency_position || '—' },
          ],
        },
        {
          title: 'Usage & Scope / الاستخدام والنطاق',
          fields: [
            { label: 'System Language (UI)', value: record.is_system_language ? 'Yes ✓' : 'No' },
            { label: 'Document Language', value: record.is_document_language ? 'Yes ✓' : 'No' },
            { label: 'Protected', value: record.is_protected ? '🔒 Protected' : 'No' },
          ],
        },
        {
          title: 'Status & Settings / الحالة والإعدادات',
          fields: [
            { label: 'Status', value: record.status || (record.is_active ? 'active' : 'inactive'), type: 'badge' as const },
            { label: 'Favorite', value: record.is_favorite ? '★ Yes' : '☆ No' },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
            { label: 'Global', value: record.is_global ? 'Yes' : 'No' },
            { label: 'System', value: record.is_system ? 'Yes' : 'No' },
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

export default withPermission(MenuPermissions.MasterData.Languages.View, LanguagesPage);

