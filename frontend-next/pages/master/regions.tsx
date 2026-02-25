/**
 * 🗺️ REGIONS PAGE (Enterprise Edition)
 * =====================================
 * 
 * Master data page for managing regions, provinces, states, 
 * emirates, and governorates.
 * Depends on: Countries ✅
 * 
 * Features:
 * - Full CRUD with all enterprise fields
 * - Country-linked cascading data
 * - Hierarchical support (parent_region_id)
 * - Stats bar (total, active, free zones, countries, top-level)
 * - Filters: country, type, status, free zones
 * - Detail panel with classification badges and tax info
 * - Bulk operations (status change, bulk delete)
 * - Export Excel/CSV
 * 
 * Uses EnterpriseMasterPage with regionsConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { regionsConfig, type Region } from '@/config/pages/master/regions.config';
import { companyStore } from '@/lib/companyStore';

// Region type labels
const regionTypeLabels: Record<string, string> = {
  region: 'Region (منطقة)',
  province: 'Province (محافظة)',
  state: 'State (ولاية)',
  emirate: 'Emirate (إمارة)',
  governorate: 'Governorate (محافظة)',
  administrative: 'Administrative (إداري)',
  free_zone: 'Free Zone (منطقة حرة)',
};

function RegionsPage() {
  const [countriesRef, setCountriesRef] = useState<Array<{ value: any; label: string }>>([]);

  // Load reference data for country select
  const loadCountries = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '').replace(/\/api$/, '');
      const companyId = companyStore.getActiveCompanyId();
      
      const res = await fetch(`${apiUrl}/api/master/countries?limit=500&status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });
      
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json || [];
        setCountriesRef(
          items.map((c: any) => ({
            value: c.id,
            label: `${c.flag_emoji || ''} ${c.name}${c.code_2 ? ` (${c.code_2})` : ''}`.trim(),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load countries reference:', err);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  return (
    <EnterpriseMasterPage<Region>
      config={regionsConfig}
      referenceData={{
        country_id: countriesRef,
      }}
      buildDetailSections={(record) => {
        const typeLabel = regionTypeLabels[record.region_type] || record.region_type;

        return [
          {
            title: 'Basic Information / البيانات الأساسية',
            fields: [
              { label: 'Code (ISO 3166-2)', value: record.code || '—' },
              { label: 'Name (English)', value: record.name_en || record.name },
              { label: 'Name (Arabic)', value: record.name_ar || '—' },
              { label: 'Country', value: `${record.country_flag || ''} ${record.country_name || '—'}`.trim() },
              { label: 'Region Type', value: typeLabel, type: 'badge' as const },
            ],
          },
          {
            title: 'Administrative Details / التفاصيل الإدارية',
            fields: [
              { label: 'Capital / Center', value: record.capital_city || '—' },
              { label: 'Parent Region', value: record.parent_name || '— (Top-level)' },
              ...(record.parent_name_ar ? [{ label: 'Parent (Arabic)', value: record.parent_name_ar }] : []),
              { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
            ],
          },
          {
            title: 'Tax & Trade Classification / التصنيف الضريبي والتجاري',
            fields: [
              { label: 'Free Trade Zone', value: record.is_free_zone ? '🏭 Yes — Free Zone' : 'No', type: 'badge' as const },
              { label: 'Tax Zone Override', value: record.tax_zone_override || '— (Inherits country tax zone)' },
              ...(record.is_free_zone ? [{
                label: '⚠️ Tax Notice',
                value: 'This region is flagged as a Free Trade Zone. Different customs and tax rules may apply.',
              }] : []),
            ],
          },
          {
            title: 'Status & Audit / الحالة والتدقيق',
            fields: [
              { label: 'Status', value: record.status || (record.is_active ? 'active' : 'inactive'), type: 'badge' as const },
              { label: 'Created', value: record.created_at, type: 'date' as const },
              { label: 'Updated', value: record.updated_at, type: 'date' as const },
            ],
          },
        ];
      }}
      buildRelations={(record) => [
        {
          type: 'cities',
          label: 'Cities in this region',
          count: 0,
          href: `/master/cities?state_province=${encodeURIComponent(record.name_en || record.name)}`,
        },
        {
          type: 'sub-regions',
          label: 'Sub-regions',
          count: record.child_regions_count || 0,
          href: `/master/regions?parent_region_id=${record.id}`,
        },
        {
          type: 'branches',
          label: 'Branches in this region',
          count: 0,
          href: `/master/branches?region_id=${record.id}`,
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.Regions.View, RegionsPage);
