/**
 * 📋 PURCHASE ORDER TYPES PAGE (Enterprise Edition)
 * ===================================================
 * 
 * Master data page for managing purchase order types.
 * Controls inventory behavior, GRN requirements, and asset creation rules.
 * 
 * Uses EnterpriseMasterPage with purchaseOrderTypesConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { purchaseOrderTypesConfig, type PurchaseOrderType } from '@/config/pages/master/purchaseOrderTypes.config';

function PurchaseOrderTypesPage() {
  return (
    <EnterpriseMasterPage<PurchaseOrderType>
      config={purchaseOrderTypesConfig}
      renderCustomColumn={(key, value) => {
        if (key === 'affects_inventory' || key === 'requires_grn' || key === 'creates_asset') {
          return (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              value
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {value ? '✓ Yes' : '✗ No'}
            </span>
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
          title: 'Description / الوصف',
          fields: [
            { label: 'Description (EN)', value: record.description || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Behavior & Rules / السلوك والقواعد',
          fields: [
            { label: 'Affects Inventory', value: record.affects_inventory ? '✓ Yes — Updates stock levels' : '✗ No' },
            { label: 'Requires GRN', value: record.requires_grn ? '✓ Yes — Must create goods receipt' : '✗ No' },
            { label: 'Creates Asset', value: record.creates_asset ? '✓ Yes — Auto-creates fixed asset' : '✗ No' },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
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

export default withPermission(MenuPermissions.MasterData.PurchaseOrderTypes.View, PurchaseOrderTypesPage);
