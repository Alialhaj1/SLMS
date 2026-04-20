/**
 * Vehicles Page (Enterprise Edition)
 * Uses EnterpriseMasterPage with vehiclesConfig.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { vehicleConfig, type Vehicle } from '@/config/pages/master/vehicles.config';

function VehiclesPage() {
  return (
    <EnterpriseMasterPage<Vehicle>
      config={vehicleConfig}
      buildDetailSections={(record) => [
        {
          title: 'Vehicle Identity',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Plate Number', value: record.plate_number || '—' },
            { label: 'Plate Type', value: record.plate_type || '—' },
            { label: 'Brand', value: record.brand || '—' },
            { label: 'Model', value: record.model || '—' },
            { label: 'Year', value: record.year?.toString() || '—' },
            { label: 'Color', value: record.color || '—' },
            { label: 'VIN', value: record.vin_number || '—' },
          ],
        },
        {
          title: 'Assignment',
          fields: [
            { label: 'Vehicle Type', value: record.vehicle_type_name || record.vehicle_type_id?.toString() || '—' },
            { label: 'Transport Company', value: record.transport_company_name || record.transport_company_id?.toString() || '—' },
            { label: 'Assigned Driver', value: record.assigned_driver_name || record.assigned_driver_id?.toString() || '—' },
            { label: 'Current Status', value: record.current_status || '—' },
            { label: 'Location', value: record.current_location_text || '—' },
          ],
        },
        {
          title: 'Registration & Insurance',
          fields: [
            { label: 'Registration No.', value: record.registration_number || '—' },
            { label: 'Registration Expiry', value: record.registration_expiry, type: 'date' as const },
            { label: 'Insurance Policy', value: record.insurance_policy_number || '—' },
            { label: 'Insurance Expiry', value: record.insurance_expiry, type: 'date' as const },
            { label: 'Inspection Expiry', value: record.inspection_expiry, type: 'date' as const },
          ],
        },
        {
          title: 'Specifications',
          fields: [
            { label: 'Max Weight', value: record.max_weight_tons ? record.max_weight_tons + ' tons' : '—' },
            { label: 'Max Volume', value: record.max_volume_cbm ? record.max_volume_cbm + ' m³' : '—' },
            { label: 'Fuel Capacity', value: record.fuel_capacity_liters ? record.fuel_capacity_liters + ' L' : '—' },
            { label: 'Odometer', value: record.odometer_km ? Number(record.odometer_km).toLocaleString() + ' km' : '—' },
          ],
        },
        {
          title: 'GPS & Tracking',
          fields: [
            { label: 'GPS Enabled', value: record.gps_enabled ? 'Yes' : 'No' },
            { label: 'Tracker ID', value: record.gps_tracker_id || '—' },
          ],
        },
        {
          title: 'Rates',
          fields: [
            { label: 'Daily Rate', value: record.daily_rate?.toString() || '—' },
            { label: 'Per KM Rate', value: record.per_km_rate?.toString() || '—' },
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

export default withPermission(MenuPermissions.MasterData.Vehicles.View, VehiclesPage);
