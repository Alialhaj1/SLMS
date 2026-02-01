import ProcurementReferenceDataPage from '../../components/pages/ProcurementReferenceDataPage';

export default function MasterOrderStatusPage() {
  return (
    <ProcurementReferenceDataPage
      type="purchase-order-statuses"
      title="Purchase Order Status"
      apiEndpoint="purchase-order-statuses"
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
