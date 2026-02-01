import VendorReferenceDataPage from '../../components/pages/VendorReferenceDataPage';

export default function MasterVendorTypesPage() {
  return (
    <VendorReferenceDataPage
      type="vendor-types"
      title="Vendor Types"
      apiEndpoint="vendor-types"
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
