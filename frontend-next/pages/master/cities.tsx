/**
 * 🏙️ CITIES PAGE (Enterprise Edition)
 * =====================================
 * 
 * Master data page for managing cities.
 * Depends on: Countries ✅
 * 
 * Features:
 * - Full CRUD with all enterprise fields
 * - Country-linked cascading data
 * - Stats bar (total, active, ports, customs, capitals)
 * - Filters: country, status, major cities, ports, customs, capitals
 * - Detail panel with map link when coordinates available
 * - Bulk operations (status change, bulk delete)
 * - Export Excel/CSV
 * 
 * Uses EnterpriseMasterPage with citiesConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { citiesConfig, type City } from '@/config/pages/master/cities.config';
import { companyStore } from '@/lib/companyStore';

const formatNumber = (val: number | null | undefined): string => {
  if (val == null) return '—';
  return val.toLocaleString();
};

function CitiesPage() {
  const [countriesRef, setCountriesRef] = useState<Array<{ value: any; label: string }>>([]);

  // Load reference data for country select
  const loadCountries = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '').replace(/\/api$/, '');
      const companyId = companyStore.getActiveCompanyId();
      
      const res = await fetch(`${apiUrl}/api/master/countries?limit=500&is_active=true`, {
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
    <EnterpriseMasterPage<City>
      config={citiesConfig}
      referenceData={{
        country_id: countriesRef,
      }}
      buildDetailSections={(record) => {
        const hasCoordinates = record.latitude && record.longitude;
        const mapUrl = hasCoordinates
          ? `https://www.google.com/maps?q=${record.latitude},${record.longitude}`
          : null;

        return [
          {
            title: 'Basic Information / البيانات الأساسية',
            fields: [
              { label: 'Code', value: record.code || '—' },
              { label: 'Name (English)', value: record.name },
              { label: 'Name (Arabic)', value: record.name_ar || '—' },
              { label: 'Country', value: `${record.country_flag || ''} ${record.country_name || '—'}`.trim() },
            ],
          },
          {
            title: 'Region & Location / الموقع والمنطقة',
            fields: [
              { label: 'State/Province (EN)', value: record.state_province_en || record.state_province || '—' },
              { label: 'State/Province (AR)', value: record.state_province_ar || '—' },
              { label: 'Postal Code Prefix', value: record.postal_code_prefix || '—' },
              { label: 'Timezone', value: record.timezone || '—' },
              { label: 'Latitude', value: record.latitude?.toString() || '—' },
              { label: 'Longitude', value: record.longitude?.toString() || '—' },
              ...(mapUrl ? [{
                label: '🗺️ View on Map',
                value: mapUrl,
                type: 'link' as const,
              }] : []),
            ],
          },
          {
            title: 'Classification / التصنيف',
            fields: [
              { label: 'Capital City', value: record.is_capital ? '⭐ Yes' : 'No', type: 'badge' as const },
              { label: 'Port City', value: record.is_port_city ? '⚓ Yes' : 'No', type: 'badge' as const },
              { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
            ],
          },
          {
            title: 'Status & Audit / الحالة والتدقيق',
            fields: [
              { label: 'Status', value: record.is_active ? 'active' : 'inactive', type: 'badge' as const },
              { label: 'Created', value: record.created_at, type: 'date' as const },
              { label: 'Updated', value: record.updated_at, type: 'date' as const },
            ],
          },
        ];
      }}
      buildRelations={(record) => [
        {
          type: 'branches',
          label: 'Branches in this city',
          count: 0,
          href: `/master/branches?city_id=${record.id}`,
        },
        {
          type: 'warehouses',
          label: 'Warehouses in this city',
          count: 0,
          href: `/master/warehouses?city_id=${record.id}`,
        },
        {
          type: 'suppliers',
          label: 'Suppliers in this city',
          count: 0,
          href: `/master/suppliers?city_id=${record.id}`,
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.Cities.View, CitiesPage);
