import VendorReferenceDataPage from '../../components/pages/VendorReferenceDataPage';

export default function MasterVendorStatusPage() {
  return (
    <VendorReferenceDataPage
      type="vendor-statuses"
      title="Vendor Status"
      apiEndpoint="vendor-statuses"
      fields={[
        { key: 'code', label: 'Code', type: 'text', required: true },
        { key: 'name', label: 'Name (EN)', type: 'text', required: true },
        { key: 'name_ar', label: 'Name (AR)', type: 'text' },
        { key: 'color', label: 'Color', type: 'text' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
        { key: 'is_active', label: 'Active', type: 'checkbox' }
      ]}
    />
  );
}
