/**
 * Shipping Companies Page (Enterprise Edition)
 * Uses EnterpriseMasterPage with shippingCompaniesConfig.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { shippingCompanyConfig, type ShippingCompany } from '@/config/pages/master/shippingCompanies.config';

function ShippingCompaniesPage() {
  return (
    <EnterpriseMasterPage<ShippingCompany>
      config={shippingCompanyConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name', value: record.name || '—' },
            { label: 'Name (EN)', value: record.name_en || '—' },
            { label: 'Name (AR)', value: record.name_ar || '—' },
            { label: 'Company Type', value: record.company_type || '—' },
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
            { label: 'License', value: record.license_number || '—' },
            { label: 'Tax Number', value: record.tax_number || '—' },
            { label: 'Rating', value: record.rating?.toString() || '—' },
            { label: 'Contract Start', value: record.contract_start, type: 'date' as const },
            { label: 'Contract End', value: record.contract_end, type: 'date' as const },
          ],
        },
        {
          title: 'Integration',
          fields: [
            { label: 'Tracking URL', value: record.tracking_url_template || '—' },
            { label: 'API Endpoint', value: record.api_endpoint || '—' },
            { label: 'Integration Enabled', value: record.integration_enabled ? 'Yes' : 'No' },
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

export default withPermission(MenuPermissions.Logistics.ShippingCompanies.View, ShippingCompaniesPage);
