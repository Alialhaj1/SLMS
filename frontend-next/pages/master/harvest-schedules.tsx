/**
 * Harvest Schedules Page (Enterprise Edition)
 * ===============================================
 * Phase D — Screen 17: Harvest Schedules (مواعيد الحصاد)
 * Manage harvest seasons/schedules for agricultural/seasonal products.
 * Depends on: Item Groups (Screen 13).
 *
 * Uses EnterpriseMasterPage + harvestScheduleConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { harvestScheduleConfig, type HarvestSchedule } from '@/config/pages/master/harvestSchedules.config';

const MONTH_LABELS: Record<number, string> = {
  1: 'January (يناير)', 2: 'February (فبراير)', 3: 'March (مارس)',
  4: 'April (أبريل)', 5: 'May (مايو)', 6: 'June (يونيو)',
  7: 'July (يوليو)', 8: 'August (أغسطس)', 9: 'September (سبتمبر)',
  10: 'October (أكتوبر)', 11: 'November (نوفمبر)', 12: 'December (ديسمبر)',
};

const seasonLabels: Record<string, string> = {
  spring: '🌸 Spring (ربيع)',
  summer: '☀️ Summer (صيف)',
  autumn: '🍂 Autumn (خريف)',
  winter: '❄️ Winter (شتاء)',
  year_round: '🔄 Year Round (على مدار السنة)',
};

function HarvestSchedulesPage() {
  return (
    <EnterpriseMasterPage<HarvestSchedule>
      config={harvestScheduleConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Icon', value: record.icon || '🌾' },
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Crop Type', value: record.crop_type_ar || '—' },
            { label: 'Description', value: record.description || '—' },
          ],
        },
        {
          title: 'Season & Schedule',
          fields: [
            { label: 'Season', value: seasonLabels[record.season] || record.season || '—' },
            { label: 'Start Month', value: record.start_month ? MONTH_LABELS[record.start_month] || `Month ${record.start_month}` : '—' },
            { label: 'End Month', value: record.end_month ? MONTH_LABELS[record.end_month] || `Month ${record.end_month}` : '—' },
            { label: 'Peak Month', value: record.peak_month ? MONTH_LABELS[record.peak_month] || `Month ${record.peak_month}` : '—' },
            { label: 'Duration (Days)', value: record.harvest_duration_days?.toString() || '—' },
          ],
        },
        {
          title: 'Quantity & Grouping',
          fields: [
            { label: 'Estimated Quantity', value: record.estimated_quantity ? record.estimated_quantity.toLocaleString() : '—' },
            { label: 'Unit', value: record.unit_name_en || (record.unit_symbol ? `${record.unit_symbol}` : '—') },
            { label: 'Item Group', value: record.item_group_name || '—' },
            { label: 'Item Group (AR)', value: record.item_group_name_ar || '—' },
          ],
        },
        {
          title: 'Location & Origin',
          fields: [
            { label: 'Region', value: record.region || '—' },
            { label: 'Country', value: record.country_name_en || '—' },
            { label: 'Country (AR)', value: record.country_name_ar || '—' },
          ],
        },
        {
          title: 'Notes',
          fields: [
            { label: 'Notes (English)', value: record.notes || '—' },
            { label: 'Notes (Arabic)', value: record.notes_ar || '—' },
          ],
        },
        {
          title: 'Audit Trail',
          fields: [
            { label: 'System', value: record.is_system ? 'System' : 'Custom' },
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
            { label: 'Usage (Items)', value: (record.usage_count || 0).toString() },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.HarvestSchedules?.View || 'harvest_schedules:view', HarvestSchedulesPage);

