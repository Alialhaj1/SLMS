/**
 * 🏭 WAREHOUSES PAGE (Enterprise Edition)
 * ==========================================
 *
 * Master data page for managing warehouses and storage facilities.
 * Uses EnterpriseMasterPage with warehousesConfig for full governance.
 *
 * Sub-tables: storage_locations
 * Detail sections: Identity, Classification, Location, Contact,
 *                  Capacity & Temperature, Settings, Storage Locations, Metadata
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { warehousesConfig, type Warehouse } from '@/config/pages/master/warehouses.config';
import { companyStore } from '@/lib/companyStore';

type RefOption = { value: any; label: string };

function WarehousesPage() {
  const [companiesRef, setCompaniesRef] = useState<RefOption[]>([]);
  const [branchesRef, setBranchesRef] = useState<RefOption[]>([]);
  const [warehouseTypesRef, setWarehouseTypesRef] = useState<RefOption[]>([]);
  const [countriesRef, setCountriesRef] = useState<RefOption[]>([]);
  const [citiesRef, setCitiesRef] = useState<RefOption[]>([]);
  const [costCentersRef, setCostCentersRef] = useState<RefOption[]>([]);

  const loadReferenceData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '').replace(/\/api$/, '');
      const companyId = companyStore.getActiveCompanyId();
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token || ''}`,
        'Content-Type': 'application/json',
        ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
      };

      const endpoints = [
        { url: `${apiUrl}/api/master/companies?limit=500`,                    setter: setCompaniesRef,      fmt: (c: any) => ({ value: c.id, label: `${c.name} (${c.code})` }) },
        { url: `${apiUrl}/api/master/branches?limit=500`,                     setter: setBranchesRef,       fmt: (c: any) => ({ value: c.id, label: `${c.name_en || c.name}${c.code ? ' (' + c.code + ')' : ''}` }) },
        { url: `${apiUrl}/api/master/warehouse-types?limit=500`,              setter: setWarehouseTypesRef,  fmt: (c: any) => ({ value: c.id, label: `${c.name_en || c.name}` }) },
        { url: `${apiUrl}/api/master/countries?limit=500&is_active=true`,     setter: setCountriesRef,      fmt: (c: any) => ({ value: c.id, label: `${c.flag || c.flag_emoji || ''} ${c.name} (${c.code})`.trim() }) },
        { url: `${apiUrl}/api/master/cities?limit=1000&is_active=true`,       setter: setCitiesRef,         fmt: (c: any) => ({ value: c.id, label: `${c.name}${c.code ? ' (' + c.code + ')' : ''}` }) },
        { url: `${apiUrl}/api/master/cost-centers?limit=500`,                 setter: setCostCentersRef,    fmt: (c: any) => ({ value: c.id, label: `${c.code ? c.code + ' — ' : ''}${c.name}` }) },
      ];

      const responses = await Promise.all(endpoints.map(e => fetch(e.url, { headers })));

      for (let i = 0; i < responses.length; i++) {
        if (responses[i].ok) {
          const json = await responses[i].json();
          const items = json.data || json || [];
          endpoints[i].setter(items.map(endpoints[i].fmt));
        }
      }
    } catch (err) {
      console.error('Failed to load warehouse reference data:', err);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // ──── TEMPERATURE DISPLAY ──────────────────────────────────────────────

  const tempDisplay = (min?: number, max?: number) => {
    if (min == null && max == null) return null;
    return `${min != null ? min + '°C' : '?'} ~ ${max != null ? max + '°C' : '?'}`;
  };

  // ──── DETAIL SECTIONS ─────────────────────────────────────────────────

  const buildDetailSections = (wh: Warehouse) => [
    {
      title: 'Identity',
      fields: [
        { label: 'Code', value: wh.code },
        { label: 'Name (EN)', value: wh.name_en || wh.name },
        { label: 'Name (AR)', value: wh.name_ar },
        { label: 'Short Name', value: wh.short_name },
      ],
    },
    {
      title: 'Classification',
      fields: [
        { label: 'Branch', value: wh.branch_name_en || wh.branch_name },
        { label: 'Warehouse Type', value: wh.warehouse_type_name || wh.warehouse_type },
        { label: 'Cost Center', value: wh.cost_center_name },
        { label: 'Temp Controlled', value: wh.type_requires_temp ? '✔ Yes' : 'No' },
      ],
    },
    {
      title: 'Location',
      fields: [
        { label: 'Country', value: wh.country_flag ? `${wh.country_flag} ${wh.country_name}` : wh.country_name },
        { label: 'City', value: wh.city_name },
        { label: 'Address', value: wh.address },
        { label: 'Coordinates', value: wh.latitude && wh.longitude ? `${wh.latitude}, ${wh.longitude}` : null },
      ],
    },
    {
      title: 'Contact',
      fields: [
        { label: 'Manager', value: wh.manager_name },
        { label: 'Phone', value: wh.phone },
        { label: 'Email', value: wh.email },
      ],
    },
    {
      title: 'Capacity & Temperature',
      fields: [
        { label: 'Capacity (m³)', value: wh.capacity_m3 ? `${Number(wh.capacity_m3).toLocaleString()} m³` : null },
        { label: 'Capacity (tons)', value: wh.capacity_tons ? `${Number(wh.capacity_tons).toLocaleString()} tons` : null },
        { label: 'Temperature Range', value: tempDisplay(wh.min_temp_celsius, wh.max_temp_celsius) },
      ],
    },
    {
      title: 'Settings',
      fields: [
        { label: 'Default Warehouse', value: wh.is_default ? '★ Yes' : 'No' },
        { label: 'Allows Negative Stock', value: (wh.allows_negative_stock || wh.allow_negative_stock) ? '⚠ Yes' : 'No' },
        { label: 'Active', value: wh.is_active ? '✔ Active' : '✖ Inactive' },
      ],
    },
    {
      title: 'Metadata',
      fields: [
        { label: 'Created', value: wh.created_at ? new Date(wh.created_at).toLocaleString() : null },
        { label: 'Created By', value: wh.created_by_name },
        { label: 'Updated', value: wh.updated_at ? new Date(wh.updated_at).toLocaleString() : null },
        { label: 'Updated By', value: wh.updated_by_name },
      ],
    },
  ];

  // ──── RELATIONS (Storage Locations sub-table) ────────────────────────

  const buildRelations = (wh: Warehouse) => {
    const relations: any[] = [];

    if (wh.storage_locations && wh.storage_locations.length > 0) {
      relations.push({
        key: 'storage_locations',
        title: 'Storage Locations',
        titleKey: 'warehouses.storageLocations',
        columns: [
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'location_type_name', label: 'Type' },
          { key: 'is_active', label: 'Active', render: (v: boolean) => v ? 'Yes' : 'No' },
        ],
        data: wh.storage_locations,
      });
    }

    return relations;
  };

  return (
    <EnterpriseMasterPage<Warehouse>
      config={warehousesConfig}
      buildDetailSections={buildDetailSections}
      buildRelations={buildRelations}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.Warehouses.View, WarehousesPage);
