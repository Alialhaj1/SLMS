/**
 * 🏢 COMPANIES PAGE (Enterprise Edition)
 * ========================================
 * 
 * Master data page for managing companies.
 * Uses EnterpriseMasterPage with companiesConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React, { useEffect, useState, useCallback } from 'react';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { companiesConfig, type Company } from '@/config/pages/master/companies.config';
import { companyStore } from '@/lib/companyStore';

export default function CompaniesPage() {
  const [countriesRef, setCountriesRef] = useState<Array<{ value: any; label: string }>>([]);
  const [citiesRef, setCitiesRef] = useState<Array<{ value: any; label: string }>>([]);

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

      const [countriesRes, citiesRes] = await Promise.all([
        fetch(`${apiUrl}/api/master/countries?limit=500&is_active=true`, { headers }),
        fetch(`${apiUrl}/api/master/cities?limit=1000&is_active=true`, { headers }),
      ]);

      if (countriesRes.ok) {
        const json = await countriesRes.json();
        const items = json.data || json || [];
        setCountriesRef(items.map((c: any) => ({ value: c.id, label: `${c.name} (${c.code})` })));
      }

      if (citiesRes.ok) {
        const json = await citiesRes.json();
        const items = json.data || json || [];
        setCitiesRef(items.map((c: any) => ({ value: c.id, label: `${c.name} (${c.code || ''})`.trim() })));
      }
    } catch (err) {
      console.error('Failed to load reference data:', err);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  return (
    <EnterpriseMasterPage<Company>
      config={companiesConfig}
      referenceData={{
        country_id: countriesRef,
        city_id: citiesRef,
      }}
      buildDetailSections={(record) => [
        {
          title: 'Identity',
          fields: [
            { label: 'Code', value: record.code },
            { label: 'Name (English)', value: record.name },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Industry', value: record.industry || '—' },
          ],
        },
        {
          title: 'Legal',
          fields: [
            { label: 'Tax ID', value: record.tax_id || '—' },
            { label: 'Registration #', value: record.registration_number || '—' },
          ],
        },
        {
          title: 'Contact',
          fields: [
            { label: 'Email', value: record.email || '—' },
            { label: 'Phone', value: record.phone || '—' },
            { label: 'Website', value: record.website || '—' },
          ],
        },
        {
          title: 'Location',
          fields: [
            { label: 'Country', value: record.country_name || '—' },
            { label: 'City', value: record.city_name || '—' },
            { label: 'Address', value: record.address || '—' },
          ],
        },
      ]}
      buildRelations={(record) => [
        {
          type: 'branches',
          label: 'Branches',
          count: 0,
          href: `/master/branches?company_id=${record.id}`,
        },
        {
          type: 'users',
          label: 'Users',
          count: 0,
          href: `/admin/users?company_id=${record.id}`,
        },
      ]}
    />
  );
}
