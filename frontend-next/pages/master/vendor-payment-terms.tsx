import VendorReferenceDataPage from '../../components/pages/VendorReferenceDataPage';

export default function MasterVendorPaymentTermsPage() {
  return (
    <VendorReferenceDataPage
      type="payment-terms"
      title="Vendor Payment Terms"
      apiEndpoint="payment-terms"
      fields={[
        { key: 'code', label: 'Code', type: 'text', required: true },
        { key: 'name', label: 'Name (EN)', type: 'text', required: true },
        { key: 'name_ar', label: 'Name (AR)', type: 'text' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
        { key: 'is_active', label: 'Active', type: 'checkbox' }
      ]}
    />
  );
}
