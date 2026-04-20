/**
 * 📊 COST CENTERS PAGE (Enterprise Edition)
 * ==========================================
 * 
 * Master data page for managing cost centers hierarchy.
 * Supports parent/child relationships for financial tracking and budgeting.
 * 
 * Uses EnterpriseMasterPage with costCentersConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { costCentersConfig, type CostCenter } from '@/config/pages/master/costCenters.config';

function CostCentersPage() {
  return (
    <EnterpriseMasterPage<CostCenter>
      config={costCentersConfig}
      renderCustomColumn={(key, value, record) => {
        if (key === 'parent_name') {
          if (!record.parent_id) {
            return (
              <span className="text-xs text-slate-400 dark:text-slate-500 italic">Top Level</span>
            );
          }
          return (
            <div>
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {record.parent_code ? `${record.parent_code} — ` : ''}{value || '—'}
              </span>
              {record.parent_name_ar && (
                <div className="text-xs text-slate-400 dark:text-slate-500">{record.parent_name_ar}</div>
              )}
            </div>
          );
        }
        return undefined;
      }}
      buildDetailSections={(record) => [
        {
          title: 'Identity / الهوية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
          ],
        },
        {
          title: 'Hierarchy / التسلسل',
          fields: [
            { label: 'Parent Code', value: record.parent_code || '— (Top Level)' },
            { label: 'Parent Name', value: record.parent_name || '— (Top Level)' },
            { label: 'Parent Name (AR)', value: record.parent_name_ar || '—' },
          ],
        },
        {
          title: 'Details / التفاصيل',
          fields: [
            { label: 'Description', value: record.description || '—' },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'Status', value: record.is_active ? 'active' : 'inactive', type: 'badge' as const },
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

export default withPermission(MenuPermissions.MasterData.CostCenters.View, CostCentersPage);
