/**
 * 📐 UNITS OF MEASURE PAGE (Enterprise Edition)
 * ===============================================
 * 
 * Master data page for managing measurement units, conversion factors,
 * and usage classifications (purchase, sales, inventory).
 * Depends on: Unit Types ✅
 * 
 * Features:
 * - Full CRUD with all enterprise fields
 * - Unit type categorization with color badges
 * - Base unit / derived unit hierarchy with conversion factor display
 * - Usage classification flags (purchase, sales, inventory)
 * - Stats bar (total, active, base units, purchase, sales, inventory)
 * - Filters: unit type, base/derived, status, usage flags
 * - Detail panel with conversion info and usage badges
 * - Bulk operations (status change, bulk delete)
 * - Export Excel/CSV
 * 
 * Uses EnterpriseMasterPage with unitsConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { unitsConfig, type Unit } from '@/config/pages/master/units.config';
import { companyStore } from '@/lib/companyStore';

// Unit type labels for detail panel
const unitTypeLabels: Record<string, string> = {
  weight: '⚖️ Weight (الوزن)',
  volume: '🧪 Volume (الحجم)',
  length: '📏 Length (الطول)',
  piece:  '📦 Count (العدد)',
  other:  '📐 Other (أخرى)',
};

function UnitsPage() {
  const [unitTypesRef, setUnitTypesRef] = useState<Array<{ value: any; label: string }>>([]);
  const [baseUnitsRef, setBaseUnitsRef] = useState<Array<{ value: any; label: string }>>([]);

  // Load reference data for unit type select
  const loadUnitTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '').replace(/\/api$/, '');
      const companyId = companyStore.getActiveCompanyId();
      
      const res = await fetch(`${apiUrl}/api/master/unit-types?limit=500&status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });
      
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json || [];
        setUnitTypesRef(
          items.map((t: any) => ({
            value: t.code,
            label: `${t.name_en || t.name}${t.name_ar ? ` (${t.name_ar})` : ''}`,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load unit types reference:', err);
    }
  }, []);

  // Load base units for base_unit_id select
  const loadBaseUnits = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '').replace(/\/api$/, '');
      const companyId = companyStore.getActiveCompanyId();
      
      const res = await fetch(`${apiUrl}/api/master/units?is_base_unit=true&status=active&limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });
      
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json || [];
        setBaseUnitsRef(
          items.map((u: any) => ({
            value: u.id,
            label: `${u.name_en || u.name} (${u.symbol || u.code})`,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load base units reference:', err);
    }
  }, []);

  useEffect(() => {
    loadUnitTypes();
    loadBaseUnits();
  }, [loadUnitTypes, loadBaseUnits]);

  return (
    <EnterpriseMasterPage<Unit>
      config={unitsConfig}
      referenceData={{
        unit_type: unitTypesRef,
        base_unit_id: baseUnitsRef,
      }}
      buildDetailSections={(record) => {
        const typeLabel = unitTypeLabels[record.unit_type] || record.unit_type_name || record.unit_type;

        return [
          {
            title: 'Basic Information / البيانات الأساسية',
            fields: [
              { label: 'Code', value: record.code || '—' },
              { label: 'Name (English)', value: record.name_en || record.name },
              { label: 'Name (Arabic)', value: record.name_ar || '—' },
              { label: 'Plural (Arabic)', value: record.name_plural_ar || '—' },
              { label: 'Symbol', value: record.symbol || '—' },
              { label: 'Unit Type', value: typeLabel, type: 'badge' as const },
            ],
          },
          {
            title: 'Conversion Settings / إعدادات التحويل',
            fields: [
              { 
                label: 'Classification', 
                value: record.is_base_unit ? '🔵 Base Unit — Reference unit for its type' : '🔗 Derived Unit — Converts to base unit',
                type: 'badge' as const,
              },
              ...(record.is_base_unit ? [] : [
                {
                  label: 'Base Unit',
                  value: `${record.base_unit_name_en || record.base_unit_name || '—'} (${record.base_unit_symbol || record.base_unit_code || ''})`,
                },
                {
                  label: 'Conversion Factor',
                  value: record.conversion_factor 
                    ? `1 ${record.code} = ${record.conversion_factor} ${record.base_unit_symbol || record.base_unit_code || ''}` 
                    : '—',
                },
              ]),
              { label: 'Decimal Places', value: String(record.decimal_places ?? 2) },
            ],
          },
          {
            title: 'Usage Classification / تصنيف الاستخدام',
            fields: [
              { label: 'Purchase Unit', value: record.is_purchase_unit ? '✅ Yes — Available in purchase orders' : '❌ No' },
              { label: 'Sales Unit', value: record.is_sales_unit ? '✅ Yes — Available in sales invoices' : '❌ No' },
              { label: 'Inventory Unit', value: record.is_inventory_unit ? '✅ Yes — Used for stock keeping' : '❌ No' },
            ],
          },
          {
            title: 'Status & Audit / الحالة والتدقيق',
            fields: [
              { label: 'Status', value: record.status || (record.is_active ? 'active' : 'inactive'), type: 'badge' as const },
              { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
              { label: 'Created', value: record.created_at, type: 'date' as const },
              { label: 'Updated', value: record.updated_at, type: 'date' as const },
            ],
          },
        ];
      }}
      buildRelations={(record) => [
        ...(record.is_base_unit ? [{
          type: 'derived-units',
          label: 'Derived units using this as base',
          count: record.derived_units_count || 0,
          href: `/master/units?base_unit_id=${record.id}`,
        }] : []),
        ...(record.base_unit_id && !record.is_base_unit ? [{
          type: 'base-unit',
          label: 'Base unit reference',
          count: 1,
          href: `/master/units?is_base_unit=true`,
        }] : []),
        {
          type: 'items',
          label: 'Items using this unit',
          count: 0,
          href: `/master/items?unit_id=${record.id}`,
        },
        {
          type: 'purchase-orders',
          label: 'Purchase orders',
          count: 0,
          href: '#',
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.Units.View, UnitsPage);
