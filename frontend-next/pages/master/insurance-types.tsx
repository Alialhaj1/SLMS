/**
 * 🛡️ INSURANCE TYPES PAGE (Enterprise Edition) — E-15
 * ================================================
 *
 * Cargo insurance coverage types.
 * Manages standard ICC clauses: ICC A, ICC B, ICC C,
 * War Risk, All Risk, FPA, WA, Open Cover, Single Voyage, SRCC.
 *
 * Features:
 *   - Coverage level grouping (comprehensive/partial/minimal)
 *   - Per-risk coverage flags with ✅/❌ indicators
 *   - ICC standard compliance indicator
 *   - Coverage comparison table in detail panel
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { insuranceTypeConfig, type InsuranceType } from '@/config/pages/master/insuranceTypes.config';

function InsuranceTypesPage() {
  return (
    <EnterpriseMasterPage<InsuranceType>
      config={insuranceTypeConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Icon', value: record.icon || '🛡️' },
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            {
              label: 'Coverage Level',
              value: ({
                comprehensive: '🛡️ Comprehensive / شامل',
                partial: '🔶 Partial / جزئي',
                minimal: '🔵 Minimal / أساسي',
              } as Record<string, string>)[record.coverage_level] || record.coverage_level || '—',
            },
            { label: 'ICC Standard', value: record.is_standard_icc ? '🏛️ ICC Standard' : 'Custom' },
          ],
        },
        {
          title: 'Description / الوصف',
          fields: [
            { label: 'English', value: record.description_en || '—' },
            { label: 'Arabic', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Coverage Comparison / مقارنة التغطية',
          fields: [
            { label: 'Covers Theft / السرقة', value: record.covers_theft ? '✅ Covered' : '❌ Not Covered' },
            { label: 'Covers Damage / الأضرار', value: record.covers_damage ? '✅ Covered' : '❌ Not Covered' },
            { label: 'Covers Total Loss / الفقد الكلي', value: record.covers_total_loss ? '✅ Covered' : '❌ Not Covered' },
            { label: 'Covers War Risk / مخاطر الحرب', value: record.covers_war_risk ? '✅ Covered' : '❌ Not Covered' },
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

export default withPermission(MenuPermissions.MasterData.InsuranceTypes.View, InsuranceTypesPage);
