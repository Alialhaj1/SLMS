/**
 * Drivers Page (Enterprise Edition)
 * Uses EnterpriseMasterPage with driversConfig.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { driverConfig, type Driver } from '@/config/pages/master/drivers.config';

function DriversPage() {
  return (
    <EnterpriseMasterPage<Driver>
      config={driverConfig}
      buildDetailSections={(record) => [
        {
          title: 'Personal Information',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (EN)', value: record.full_name_en || '—' },
            { label: 'Name (AR)', value: record.full_name_ar || '—' },
            { label: 'ID Type', value: record.id_type || '—' },
            { label: 'ID Number', value: record.id_number || '—' },
            { label: 'Blood Type', value: record.blood_type || '—' },
          ],
        },
        {
          title: 'Contact',
          fields: [
            { label: 'Phone', value: record.phone || '—' },
            { label: 'Phone 2', value: record.phone2 || '—' },
            { label: 'Email', value: record.email || '—' },
            { label: 'Emergency Contact', value: record.emergency_contact_name || '—' },
            { label: 'Emergency Phone', value: record.emergency_contact_phone || '—' },
          ],
        },
        {
          title: 'License Details',
          fields: [
            { label: 'License Number', value: record.license_number || '—' },
            { label: 'License Type', value: record.license_type || '—' },
            { label: 'License Expiry', value: record.license_expiry, type: 'date' as const },
            { label: 'Medical Clearance Expiry', value: record.medical_clearance_expiry, type: 'date' as const },
          ],
        },
        {
          title: 'Employment',
          fields: [
            { label: 'Company', value: record.transport_company_name || record.transport_company_id?.toString() || '—' },
            { label: 'Vehicle', value: record.assigned_vehicle_plate || record.assigned_vehicle_id?.toString() || '—' },
            { label: 'Status', value: record.current_status || '—' },
            { label: 'Hire Date', value: record.hire_date, type: 'date' as const },
            { label: 'Contract End', value: record.contract_end, type: 'date' as const },
          ],
        },
        {
          title: 'Performance',
          fields: [
            { label: 'Rating', value: record.rating?.toString() || '—' },
            { label: 'Total Trips', value: record.total_trips?.toString() || '—' },
            { label: 'Total KM', value: record.total_km ? Number(record.total_km).toLocaleString() : '—' },
            { label: 'Violations', value: record.violations_count?.toString() || '0' },
            { label: 'Daily Rate', value: record.daily_rate?.toString() || '—' },
            { label: 'Per Trip Rate', value: record.per_trip_rate?.toString() || '—' },
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

export default withPermission(MenuPermissions.MasterData.Drivers.View, DriversPage);
