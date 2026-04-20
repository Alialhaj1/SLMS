/**
 * Insurance Companies Page (Enterprise Edition)
 * Uses EnterpriseMasterPage with insuranceCompaniesConfig.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { insuranceCompanyConfig, type InsuranceCompany } from '@/config/pages/master/insuranceCompanies.config';

function InsuranceCompaniesPage() {
  return (
    <EnterpriseMasterPage<InsuranceCompany>
      config={insuranceCompanyConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name', value: record.name || '—' },
            { label: 'Name (EN)', value: record.name_en || '—' },
            { label: 'Name (AR)', value: record.name_ar || '—' },
          ],
        },
        {
          title: 'Contact',
          fields: [
            { label: 'Contact Person', value: record.contact_person || '—' },
            { label: 'Phone', value: record.phone || '—' },
            { label: 'Email', value: record.email || '—' },
            { label: 'Website', value: record.website || '—' },
            { label: 'Address', value: record.address || '—' },
          ],
        },
        {
          title: 'Business Details',
          fields: [
            { label: 'License Number', value: record.license_number || '—' },
            { label: 'Policy Prefix', value: record.policy_number_prefix || '—' },
            { label: 'Rating', value: record.rating?.toString() || '—' },
          ],
        },
        {
          title: 'Settings',
          fields: [
            { label: 'Status', value: record.is_active ? 'Active' : 'Inactive', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.InsuranceCompanies.View, InsuranceCompaniesPage);
