/**
 * Transport Companies Page (Enterprise Edition)
 * Uses EnterpriseMasterPage with transportCompaniesConfig.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { transportCompanyConfig, type TransportCompany } from '@/config/pages/master/transportCompanies.config';

function TransportCompaniesPage() {
  return (
    <EnterpriseMasterPage<TransportCompany>
      config={transportCompanyConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (EN)', value: record.name_en || '—' },
            { label: 'Name (AR)', value: record.name_ar || '—' },
            { label: 'Company Type', value: record.company_type || '—' },
            { label: 'License', value: record.license_number || '—' },
          ],
        },
        {
          title: 'Contact / الاتصال',
          fields: [
            { label: 'Contact Person', value: record.contact_person || '—' },
            { label: 'Phone', value: record.phone || '—' },
            { label: 'Mobile', value: record.mobile || '—' },
            { label: 'Email', value: record.email || '—' },
            { label: 'Website', value: record.website || '—' },
          ],
        },
        {
          title: 'Business / الأعمال',
          fields: [
            { label: 'Fleet Size', value: record.fleet_size?.toString() || '—' },
            { label: 'Service Coverage', value: record.service_coverage || '—' },
            { label: 'Rating', value: record.rating?.toString() || '—' },
            { label: 'Reliability', value: record.reliability_score?.toString() || '—' },
            { label: 'Payment Terms', value: record.payment_terms_days ? record.payment_terms_days + ' days' : '—' },
            { label: 'Credit Limit', value: record.credit_limit?.toString() || '—' },
          ],
        },
        {
          title: 'Contract & Insurance',
          fields: [
            { label: 'Contract Start', value: record.contract_start, type: 'date' as const },
            { label: 'Contract End', value: record.contract_end, type: 'date' as const },
            { label: 'Insurance Policy', value: record.insurance_policy_number || '—' },
            { label: 'Insurance Expiry', value: record.insurance_expiry, type: 'date' as const },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'Status', value: record.is_active ? 'Active' : 'Inactive', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.TransportCompanies.View, TransportCompaniesPage);
