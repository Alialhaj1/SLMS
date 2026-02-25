/**
 * � BRANCHES PAGE (Enterprise Edition)
 * ========================================
 * 
 * Master data page for managing company branches, offices, and operational locations.
 * Supports hierarchical structures (HQ → Regional → Branch → Warehouse / Sales Point).
 * Uses EnterpriseMasterPage with branchesConfig for SAP/Oracle-level governance.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { branchesConfig, type Branch } from '@/config/pages/master/branches.config';
import { companyStore } from '@/lib/companyStore';

type RefOption = { value: any; label: string };

const BRANCH_TYPE_LABELS: Record<string, string> = {
  headquarters: '🏛️ Headquarters',
  regional_office: '🏢 Regional Office',
  branch: '🏗️ Branch',
  warehouse_only: '🏭 Warehouse Only',
  sales_point: '🏪 Sales Point',
};

function BranchesPage() {
  const [companiesRef, setCompaniesRef] = useState<RefOption[]>([]);
  const [countriesRef, setCountriesRef] = useState<RefOption[]>([]);
  const [citiesRef, setCitiesRef] = useState<RefOption[]>([]);
  const [regionsRef, setRegionsRef] = useState<RefOption[]>([]);
  const [currenciesRef, setCurrenciesRef] = useState<RefOption[]>([]);
  const [timezonesRef, setTimezonesRef] = useState<RefOption[]>([]);
  const [languagesRef, setLanguagesRef] = useState<RefOption[]>([]);
  const [branchesRef, setBranchesRef] = useState<RefOption[]>([]);

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
        { url: `${apiUrl}/api/master/companies?limit=500`, setter: setCompaniesRef, fmt: (c: any) => ({ value: c.id, label: `${c.name} (${c.code})` }) },
        { url: `${apiUrl}/api/master/countries?limit=500&is_active=true`, setter: setCountriesRef, fmt: (c: any) => ({ value: c.id, label: `${c.flag || ''} ${c.name} (${c.code})`.trim() }) },
        { url: `${apiUrl}/api/master/cities?limit=1000&is_active=true`, setter: setCitiesRef, fmt: (c: any) => ({ value: c.id, label: `${c.name}${c.code ? ' (' + c.code + ')' : ''}` }) },
        { url: `${apiUrl}/api/master/regions?limit=500&is_active=true`, setter: setRegionsRef, fmt: (c: any) => ({ value: c.id, label: c.name }) },
        { url: `${apiUrl}/api/master/currencies?limit=500&is_active=true`, setter: setCurrenciesRef, fmt: (c: any) => ({ value: c.id, label: `${c.code} — ${c.name}` }) },
        { url: `${apiUrl}/api/master/timezones?limit=500&is_active=true`, setter: setTimezonesRef, fmt: (c: any) => ({ value: c.id, label: `${c.identifier || c.name}` }) },
        { url: `${apiUrl}/api/master/languages?limit=500&is_active=true`, setter: setLanguagesRef, fmt: (c: any) => ({ value: c.id, label: `${c.name}${c.native_name ? ' / ' + c.native_name : ''}` }) },
        { url: `${apiUrl}/api/branches?limit=500&is_active=true`, setter: setBranchesRef, fmt: (c: any) => ({ value: c.id, label: `${c.code} — ${c.name}` }) },
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
      console.error('Failed to load reference data:', err);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  return (
    <EnterpriseMasterPage<Branch>
      config={branchesConfig}
      referenceData={{
        company_id: companiesRef,
        country_id: countriesRef,
        city_id: citiesRef,
        region_id: regionsRef,
        currency_id: currenciesRef,
        timezone_id: timezonesRef,
        language_id: languagesRef,
        parent_branch_id: branchesRef,
      }}
      buildDetailSections={(record) => [
        {
          title: 'Branch Identity',
          fields: [
            { label: 'Code', value: record.code },
            { label: 'Name (English)', value: record.name_en || record.name },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Type', value: BRANCH_TYPE_LABELS[record.type] || record.type, type: 'badge' },
            { label: 'Headquarters', value: record.is_headquarters ? '✅ Yes' : 'No' },
            { label: 'Default Branch', value: record.is_default ? '⭐ Yes' : 'No' },
          ],
        },
        {
          title: 'Organization',
          fields: [
            { label: 'Company', value: record.company_name || '—' },
            { label: 'Parent Branch', value: record.parent_branch_name ? `${record.parent_branch_code} — ${record.parent_branch_name}` : '— (Top-level)' },
            ...(record.child_branches_count !== undefined ? [{ label: 'Child Branches', value: String(record.child_branches_count) }] : []),
          ],
        },
        {
          title: 'Location',
          fields: [
            { label: 'Country', value: record.country_flag ? `${record.country_flag} ${record.country_name}` : (record.country_name || '—') },
            { label: 'City', value: record.city_name || '—' },
            { label: 'Region', value: record.region_name || '—' },
            { label: 'Address', value: record.address || '—' },
            { label: 'Postal Code', value: record.postal_code || '—' },
            ...(record.latitude ? [{ label: 'Coordinates', value: `${record.latitude}, ${record.longitude}` }] : []),
          ],
        },
        {
          title: 'Default Settings',
          fields: [
            { label: 'Currency', value: record.currency_code ? `${record.currency_code} — ${record.currency_name}` : '—' },
            { label: 'Timezone', value: record.timezone_identifier || record.timezone_name || '—' },
            { label: 'Language', value: record.language_name ? `${record.language_name}${record.language_native_name ? ' / ' + record.language_native_name : ''}` : '—' },
          ],
        },
        {
          title: 'Contact',
          fields: [
            { label: 'Phone', value: record.phone || '—' },
            { label: 'Email', value: record.email || '—' },
            { label: 'Manager', value: record.manager_name || '—' },
          ],
        },
        {
          title: 'Registration & Tax',
          fields: [
            { label: 'Tax Number', value: record.tax_number || '—' },
            { label: 'Commercial Registration (CR)', value: record.cr_number || '—' },
            { label: 'Cost Center', value: record.cost_center_code || '—' },
            { label: 'Profit Center', value: record.profit_center_code || '—' },
          ],
        },
        {
          title: 'Metadata',
          fields: [
            { label: 'Active', value: record.is_active ? '✅ Yes' : '❌ No', type: 'badge' },
            { label: 'Created By', value: record.created_by_name || '—' },
            { label: 'Created', value: record.created_at, type: 'date' },
            { label: 'Updated By', value: record.updated_by_name || '—' },
            { label: 'Updated', value: record.updated_at, type: 'date' },
          ],
        },
      ]}
      buildRelations={(record) => [
        {
          type: 'branches',
          label: 'Child Branches',
          count: record.child_branches_count || 0,
          href: `/master/branches?parent_branch_id=${record.id}`,
        },
        {
          type: 'users',
          label: 'Users in this branch',
          count: 0,
          href: `/admin/users?branch_id=${record.id}`,
        },
        {
          type: 'warehouses',
          label: 'Warehouses',
          count: 0,
          href: `/master/warehouses?branch_id=${record.id}`,
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.System.Branches.View, BranchesPage);
