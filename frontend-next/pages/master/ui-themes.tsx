/**
 * 🎨 UI THEMES PAGE (Enterprise Edition)
 * =========================================
 *
 * Master data page for managing interface themes and color palettes.
 * Users select their preferred theme from this list.
 * Supports dark, light, and auto (system-following) themes.
 *
 * Uses EnterpriseMasterPage with uiThemesConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { uiThemesConfig, type UITheme } from '@/config/pages/master/uiThemes.config';

function UIThemesPage() {
  return (
    <EnterpriseMasterPage<UITheme>
      config={uiThemesConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Type', value: `${record.type === 'dark' ? '🌙' : record.type === 'light' ? '☀️' : '🔄'} ${record.type}` },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Main Colors / الألوان الرئيسية',
          fields: [
            { label: 'Primary', value: record.primary_color || '—' },
            { label: 'Secondary', value: record.secondary_color || '—' },
            { label: 'Accent', value: record.accent_color || '—' },
            { label: 'Border', value: record.border_color || '—' },
          ],
        },
        {
          title: 'Surface & Background / الخلفية والأسطح',
          fields: [
            { label: 'Background', value: record.background_color || '—' },
            { label: 'Surface', value: record.surface_color || '—' },
            { label: 'Sidebar', value: record.sidebar_color || '—' },
            { label: 'Header', value: record.header_color || '—' },
          ],
        },
        {
          title: 'Text Colors / ألوان النص',
          fields: [
            { label: 'Primary Text', value: record.text_primary || '—' },
            { label: 'Secondary Text', value: record.text_secondary || '—' },
          ],
        },
        {
          title: 'Status & Settings / الحالة والإعدادات',
          fields: [
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
            { label: 'Default', value: record.is_default ? '★ Yes' : 'No' },
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

export default withPermission(MenuPermissions.MasterData.UIThemes.View, UIThemesPage);
