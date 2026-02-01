import ProcurementReferenceDataPage from '../../components/pages/ProcurementReferenceDataPage';

export default function PurchaseOrderTypesPage() {
  return (
    <ProcurementReferenceDataPage
      type="purchase-order-types"
      title="Purchase Order Types"
      apiEndpoint="purchase-order-types"
      fields={[
        { key: 'code', label: 'Code', type: 'text', required: true },
        { key: 'name', label: 'Name (EN)', type: 'text', required: true },
        { key: 'name_ar', label: 'Name (AR)', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'color', label: 'Color', type: 'color' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
        { key: 'is_active', label: 'Active', type: 'checkbox' }
      ]}
    />
  );
}
