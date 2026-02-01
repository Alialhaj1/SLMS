import ProcurementReferenceDataPage from '../../components/pages/ProcurementReferenceDataPage';

export default function MasterDeliveryTermsPage() {
  return (
    <ProcurementReferenceDataPage
      type="supply-terms"
      title="Delivery Terms"
      apiEndpoint="delivery-terms"
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
