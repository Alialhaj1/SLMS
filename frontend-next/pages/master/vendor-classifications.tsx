import VendorReferenceDataPage from '../../components/pages/VendorReferenceDataPage';

export default function MasterVendorClassificationsPage() {
  return (
    <VendorReferenceDataPage
      type="vendor-categories"
      title="Vendor Classifications"
      apiEndpoint="vendor-categories"
      fields={[
        { key: 'code', label: 'Code', type: 'text', required: true },
        { key: 'name', label: 'Name (EN)', type: 'text', required: true },
        { key: 'name_ar', label: 'Name (AR)', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
        { key: 'is_active', label: 'Active', type: 'checkbox' }
      ]}
    />
  );
}
