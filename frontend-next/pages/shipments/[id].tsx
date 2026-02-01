import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../lib/apiClient';
import ItemSelector from '../../components/common/ItemSelector';
import WarehouseSelector from '../../components/common/WarehouseSelector';
import ShipmentExpensesTabV2 from '../../components/shipments/ShipmentExpensesTabV2';

type ShipmentHeader = {
  id: number;
  shipment_number: string;
  shipment_type_id: number;
  shipment_type_code?: string;
  shipment_type_name_en?: string;
  shipment_type_name_ar?: string;
  incoterm: string;
  bl_no?: string | null;
  awb_no?: string | null;
  origin_location_id: number;
  destination_location_id: number;
  expected_arrival_date: string;
  warehouse_id?: number | null;
  locked_at?: string | null;
  project_id: number;
  // Project info (resolved from PO if not set)
  project_id_resolved?: number;
  project_code?: string;
  project_name?: string;
  project_name_ar?: string;
  // Procurement fields
  vendor_id?: number | null;
  vendor_name?: string;
  vendor_code?: string;
  purchase_order_id?: number | null;
  purchase_order_number?: string;
  vendor_contract_number?: string; // رقم امر شراء المورد
  contract_id?: number | null;
  // PO currency info
  po_currency_id?: number | null;
  po_currency_code?: string;
  po_currency_symbol?: string;
  po_total_amount?: number | null;
  po_exchange_rate?: number | null;
  // Shipment currency
  shipment_currency_id?: number | null;
  shipment_currency_code?: string;
  shipment_currency_symbol?: string;
  exchange_rate?: number | null;
  // Port and logistics fields
  port_of_loading_id?: number | null;
  port_of_loading_text?: string | null;
  port_of_loading_name?: string;
  port_of_discharge_id?: number | null;
  port_of_discharge_name?: string;
  // Payment and financial fields
  payment_method?: string | null;
  lc_number?: string | null;
  total_amount?: number | null;
  // Other fields
  stage_code?: string | null;
  status_code?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ShipmentItem = {
  id: number;
  shipment_id: number;
  item_id: number;
  sku: string;
  item_code?: string;
  name: string;
  name_ar?: string;
  quantity: number;
  unit_name?: string;
  unit_code?: string;
  unit_cost: number | null;
  currency_code?: string;
  currency_symbol?: string;
  total_cost?: number;
  received_qty: number;
  remaining_qty: number;
  po_unit_price?: number | null;
  po_total_cost?: number | null;
};

type ShipmentCost = {
  id: number;
  shipment_id: number;
  cost_type_code: string;
  cost_type_name?: string;
  cost_type_name_ar?: string;
  amount: number;
  amount_before_vat?: number;
  vat_amount?: number;
  currency_id: number;
  currency_code?: string;
  currency_symbol?: string;
  description: string | null;
  journal_entry_id: number | null;
  distribution_method?: string;
  exchange_rate?: number | null;
  amount_in_base_currency?: number | null;
  source?: 'legacy' | 'expense_v2';
  is_allocated?: boolean;
  is_distributed?: boolean;
  created_at: string;
};

// Shipping Bill type
type ShippingBill = {
  id: number;
  bill_number: string;
  bill_type_id: number;
  bill_type_code?: string;
  bill_type_name?: string;
  bill_type_name_ar?: string;
  booking_number?: string;
  bill_date?: string;
  shipment_id?: number;
  carrier_id?: number;
  carrier_name?: string;
  vessel_name?: string;
  voyage_number?: string;
  port_of_loading_name?: string;
  port_of_discharge_name?: string;
  containers_count?: number;
  container_type?: string;
  cargo_description?: string;
  gross_weight?: number;
  gross_weight_unit?: string;
  shipped_on_board_date?: string;
  eta_date?: string;
  ata_date?: string;
  status: string;
  is_original?: boolean;
  freight_terms?: string;
  tracking_url?: string;
  created_at?: string;
  updated_at?: string;
};

// Distribution types
type DistributionMode = 'all_items' | 'selected_items';
type ExpenseSelectionMode = 'all_expenses' | 'selected_expenses' | 'all_except';
type DistributionMethod = 'VALUE' | 'QTY' | 'WEIGHT' | 'EQUAL' | 'MANUAL';

export default withPermission(MenuPermissions.Logistics.Shipments.View, function ShipmentDetailPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { id, mode, tab } = router.query as { id?: string; mode?: string; tab?: string };

  // Support legacy list page links that used `tab=receiving|costs`
  const effectiveMode = (mode || tab) ?? undefined;

  // Tab state (overview, items, receiving, costs, expenses, shipping-bills)
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Handle tab from query parameter
  useEffect(() => {
    if (effectiveMode) {
      const validTabs = ['overview', 'items', 'receiving', 'expenses', 'shipping-bills', 'costs'];
      if (validTabs.includes(effectiveMode)) {
        setActiveTab(effectiveMode);
      }
    }
  }, [effectiveMode]);

  const [loading, setLoading] = useState(true);
  const [shipment, setShipment] = useState<ShipmentHeader | null>(null);
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [costs, setCosts] = useState<ShipmentCost[]>([]);
  const [shippingBills, setShippingBills] = useState<ShippingBill[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [locking, setLocking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Shipping Bill delete
  const [deleteBillOpen, setDeleteBillOpen] = useState(false);
  const [deletingBill, setDeletingBill] = useState(false);
  const [billToDelete, setBillToDelete] = useState<number | null>(null);

  // Item upsert
  const [itemId, setItemId] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemUnitCost, setItemUnitCost] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // Receive
  const [receiveWarehouseId, setReceiveWarehouseId] = useState<number | null>(null);
  const [receiveAt, setReceiveAt] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiving, setReceiving] = useState(false);

  // Costs
  const [costTypeCode, setCostTypeCode] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costCurrencyId, setCostCurrencyId] = useState('');
  const [costDescription, setCostDescription] = useState('');
  const [savingCost, setSavingCost] = useState(false);

  // Cost Distribution
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('all_items');
  const [expenseSelectionMode, setExpenseSelectionMode] = useState<ExpenseSelectionMode>('all_expenses');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<number[]>([]);
  const [excludedExpenses, setExcludedExpenses] = useState<number[]>([]);
  const [distributionMethod, setDistributionMethod] = useState<DistributionMethod>('VALUE');
  const [manualPercentages, setManualPercentages] = useState<Record<number, number>>({});
  const [baseCurrency, setBaseCurrency] = useState<{ id: number; code: string; rate: number } | null>(null);
  const [distributing, setDistributing] = useState(false);
  const [showDistributionPreview, setShowDistributionPreview] = useState(false);

  const isLocked = !!shipment?.locked_at;
  const canEditLocked = true; // Allow admins to edit even locked shipments
  const pageTitle = useMemo(() => {
    if (!shipment) return 'Shipment - SLMS';
    return `Shipment ${shipment.shipment_number} - SLMS`;
  }, [shipment]);

  useEffect(() => {
    if (!id) return;
    void fetchShipment();
    void fetchShippingBills();
  }, [id]);

  const fetchShipment = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: { shipment: ShipmentHeader; items: ShipmentItem[]; costs: ShipmentCost[] } }>(
        `/api/logistics-shipments/${id}`,
        { cache: 'no-store' }
      );
      setShipment(res.data.shipment);
      setItems(res.data.items || []);
      setCosts(res.data.costs || []);
      setReceiveWarehouseId(res.data.shipment.warehouse_id ?? null);
    } catch (e: any) {
      showToast(e?.message || 'Failed to load shipment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchShippingBills = async () => {
    if (!id) return;
    setLoadingBills(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: ShippingBill[]; total: number }>(
        `/api/shipping-bills/by-shipment/${id}`,
        { cache: 'no-store' }
      );
      setShippingBills(res.data || []);
    } catch (e: any) {
      console.error('Failed to load shipping bills:', e);
      // Don't show error toast - the endpoint might not exist yet
    } finally {
      setLoadingBills(false);
    }
  };

  const handleDeleteBill = async () => {
    if (!billToDelete) return;
    setDeletingBill(true);
    try {
      await apiClient.delete(`/api/shipping-bills/${billToDelete}`);
      showToast('تم حذف بوليصة الشحن بنجاح • Shipping bill deleted successfully', 'success');
      await fetchShippingBills();
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete shipping bill', 'error');
    } finally {
      setDeletingBill(false);
      setDeleteBillOpen(false);
      setBillToDelete(null);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/logistics-shipments/${id}`);
      showToast('Shipment deleted', 'success');
      router.push('/shipments');
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete shipment', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleLock = async () => {
    if (!id) return;
    setLocking(true);
    try {
      await apiClient.post(`/api/logistics-shipments/${id}/lock`, {});
      showToast('Shipment locked', 'success');
      await fetchShipment();
    } catch (e: any) {
      showToast(e?.message || 'Failed to lock shipment', 'error');
    } finally {
      setLocking(false);
    }
  };

  const handleUnlock = async () => {
    if (!id) return;
    setUnlocking(true);
    try {
      await apiClient.post(`/api/logistics-shipments/${id}/unlock`, {});
      showToast('Shipment unlocked - you can now edit it', 'success');
      await fetchShipment();
    } catch (e: any) {
      showToast(e?.message || 'Failed to unlock shipment', 'error');
    } finally {
      setUnlocking(false);
    }
  };

  const handleUpsertItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const parsedItemId = Number(itemId);
    const parsedQty = Number(itemQty);
    const parsedUnitCost = itemUnitCost.trim() ? Number(itemUnitCost) : undefined;

    if (!Number.isFinite(parsedItemId) || parsedItemId <= 0) {
      showToast('Select an item', 'error');
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      showToast('Quantity must be > 0', 'error');
      return;
    }

    setSavingItem(true);
    try {
      await apiClient.post(`/api/logistics-shipments/${id}/items`, [
        {
          item_id: parsedItemId,
          quantity: parsedQty,
          ...(parsedUnitCost !== undefined && Number.isFinite(parsedUnitCost)
            ? { unit_cost: parsedUnitCost }
            : {}),
        },
      ]);
      showToast('Item saved', 'success');
      setItemId('');
      setItemQty('');
      setItemUnitCost('');
      await fetchShipment();
    } catch (e: any) {
      showToast(e?.message || 'Failed to save item', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const handleReceiveRemaining = async () => {
    if (!id) return;
    if (!receiveWarehouseId) {
      showToast('Select a warehouse', 'error');
      return;
    }

    setReceiving(true);
    try {
      await apiClient.post(`/api/logistics-shipments/${id}/receive`, {
        warehouse_id: receiveWarehouseId,
        ...(receiveAt ? { received_at: receiveAt } : {}),
        ...(receiveNotes.trim() ? { notes: receiveNotes.trim() } : {}),
      });
      showToast('Shipment received into inventory', 'success');
      setReceiveNotes('');
      await fetchShipment();
    } catch (e: any) {
      showToast(e?.message || 'Failed to receive shipment', 'error');
    } finally {
      setReceiving(false);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const amount = Number(costAmount);
    const currencyId = Number(costCurrencyId);
    const code = costTypeCode.trim();

    if (!code) {
      showToast('Cost type code is required', 'error');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Amount must be > 0', 'error');
      return;
    }
    if (!Number.isFinite(currencyId) || currencyId <= 0) {
      showToast('Currency ID must be a positive number', 'error');
      return;
    }

    setSavingCost(true);
    try {
      await apiClient.post(`/api/logistics-shipments/${id}/costs`, {
        cost_type_code: code,
        amount,
        currency_id: currencyId,
        description: costDescription.trim() || null,
      });
      showToast('Cost added', 'success');
      setCostTypeCode('');
      setCostAmount('');
      setCostCurrencyId('');
      setCostDescription('');
      await fetchShipment();
    } catch (e: any) {
      showToast(e?.message || 'Failed to add cost', 'error');
    } finally {
      setSavingCost(false);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{pageTitle}</title>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white; }
            .card { box-shadow: none; border: 1px solid #ccc; }
          }
          .print-only { display: none; }
        `}</style>
      </Head>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shipment Details</h1>
            {shipment && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {shipment.shipment_number} {isLocked ? '• Locked' : ''}
                {effectiveMode ? ` • Mode: ${effectiveMode}` : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="primary" 
              onClick={() => router.push(`/shipments/${id}/edit`)}
              disabled={loading || !shipment}
              title="تعديل الشحنة • Edit Shipment"
            >
              ✏️ {isLocked ? 'Edit (Locked)' : 'Edit'}
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => window.print()}
              disabled={loading || !shipment}
            >
              Print
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                // Export to CSV
                const csv = [
                  ['Field', 'Value'],
                  ['Shipment Number', shipment?.shipment_number || ''],
                  ['Incoterm', shipment?.incoterm || ''],
                  ['BL No', shipment?.bl_no || ''],
                  ['AWB No', shipment?.awb_no || ''],
                  ['Expected Arrival', shipment?.expected_arrival_date || ''],
                ].map(row => row.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `shipment-${shipment?.shipment_number}.csv`;
                a.click();
                showToast('Exported successfully', 'success');
              }}
              disabled={loading || !shipment}
            >
              Export CSV
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => router.push('/shipments')}
            >
              Back to List
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={loading || !shipment}>
              Delete
            </Button>
          </div>
        </div>

        {loading && (
          <div className="card p-6 text-gray-600 dark:text-gray-400">Loading...</div>
        )}

        {!loading && shipment && (
          <>
            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex space-x-1 p-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('items')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === 'items'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Items
                </button>
                <button
                  onClick={() => setActiveTab('receiving')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === 'receiving'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Receiving
                </button>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === 'expenses'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Expenses
                </button>
                <button
                  onClick={() => setActiveTab('shipping-bills')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === 'shipping-bills'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  📄 بوليصات الشحن • Shipping Bills
                  {shippingBills.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                      {shippingBills.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('costs')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === 'costs'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Costs (Legacy)
                </button>
              </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">معلومات أساسية • Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">رقم الشحنة • Shipment Number</div>
                    <div className="text-gray-900 dark:text-white font-medium">{shipment.shipment_number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">النوع • Type</div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {shipment.shipment_type_name_en || shipment.shipment_type_code || shipment.shipment_type_id}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Incoterm</div>
                    <div className="text-gray-900 dark:text-white font-medium">{shipment.incoterm}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">رقم البوليصة • BL No</div>
                    <div className="text-gray-900 dark:text-white font-medium">{shipment.bl_no || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">رقم بوليصة الشحن الجوي • AWB No</div>
                    <div className="text-gray-900 dark:text-white font-medium">{shipment.awb_no || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">تاريخ الوصول المتوقع • Expected Arrival</div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {shipment.expected_arrival_date ? new Date(shipment.expected_arrival_date).toLocaleDateString('ar-SA') : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier/Vendor Information */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">معلومات المورد • Supplier Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">اسم المورد • Supplier Name</div>
                    <div className="text-gray-900 dark:text-white font-medium">{shipment.vendor_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">كود المورد • Supplier Code</div>
                    <div className="text-gray-900 dark:text-white font-medium">{shipment.vendor_code || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">رقم أمر الشراء • PO Number</div>
                    <div className="text-gray-900 dark:text-white font-medium">{shipment.purchase_order_number || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Port Information */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">معلومات الموانئ • Port Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">ميناء الشحن • Port of Loading</div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {shipment.port_of_loading_text || shipment.port_of_loading_id || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">ميناء الوصول • Port of Discharge</div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {shipment.port_of_discharge_name || shipment.port_of_discharge_id || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">المعلومات المالية • Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">مبلغ أمر الشراء • PO Total Amount</div>
                    <div className="text-gray-900 dark:text-white font-medium text-lg">
                      {shipment.po_total_amount ? `${Number(shipment.po_total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${shipment.po_currency_code || 'SAR'}` : '-'}
                    </div>
                    {shipment.po_currency_code && shipment.po_currency_code !== 'SAR' && shipment.po_exchange_rate && (
                      <div className="text-xs text-gray-400 mt-1">
                        ≈ {(Number(shipment.po_total_amount || 0) * Number(shipment.po_exchange_rate)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                        <span className="mr-1">(1 {shipment.po_currency_code} = {Number(shipment.po_exchange_rate).toFixed(4)} SAR)</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">طريقة الدفع • Payment Method</div>
                    <div className="text-gray-900 dark:text-white font-medium">{shipment.payment_method || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">رقم الاعتماد المستندي • LC Number</div>
                    <div className="text-gray-900 dark:text-white font-medium">{shipment.lc_number || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ملخص الأصناف • Items Summary</h3>
                {shipment.po_currency_code && shipment.po_currency_code !== 'SAR' && (
                  <div className="mb-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-bold">{shipment.po_currency_code}</span>
                    <span>الأسعار بعملة أمر الشراء | Prices in PO Currency</span>
                    <span className="text-xs text-gray-400">(1 {shipment.po_currency_code} = {Number(shipment.po_exchange_rate || 1).toFixed(4)} SAR)</span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr className="text-left text-gray-600 dark:text-gray-300">
                        <th className="py-2 px-3">الكود • SKU</th>
                        <th className="py-2 px-3">الاسم • Name</th>
                        <th className="py-2 px-3">الكمية • Qty</th>
                        <th className="py-2 px-3">تكلفة الوحدة • Unit Cost ({shipment?.po_currency_code || 'SAR'})</th>
                        <th className="py-2 px-3">الإجمالي • Total ({shipment?.po_currency_code || 'SAR'})</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900 dark:text-white divide-y divide-gray-200 dark:divide-gray-700">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-gray-600 dark:text-gray-400">لا توجد أصناف • No items</td>
                        </tr>
                      ) : (
                        items.map((it) => {
                          const currencyCode = shipment?.po_currency_code || 'SAR';
                          // Use PO unit price if available, fallback to unit_cost
                          const displayUnitCost = it.po_unit_price ?? it.unit_cost;
                          const displayTotal = it.po_total_cost ?? (it.quantity * (displayUnitCost || 0));
                          return (
                            <tr key={it.id}>
                              <td className="py-2 px-3">{it.sku}</td>
                              <td className="py-2 px-3">{it.name}</td>
                              <td className="py-2 px-3">{it.quantity.toLocaleString()}</td>
                              <td className="py-2 px-3">
                                {displayUnitCost ? `${Number(displayUnitCost).toFixed(4)} ${currencyCode}` : '-'}
                              </td>
                              <td className="py-2 px-3 font-medium">
                                {displayUnitCost ? `${Number(displayTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}` : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                      {items.length > 0 && items.some(it => it.po_unit_price || it.unit_cost) && (
                        <tr className="bg-gray-50 dark:bg-gray-700 font-bold">
                          <td colSpan={4} className="py-2 px-3 text-right">الإجمالي • Total:</td>
                          <td className="py-2 px-3">
                            {items.reduce((sum, it) => sum + Number(it.po_total_cost || (it.quantity * (it.po_unit_price ?? it.unit_cost ?? 0))), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {shipment?.po_currency_code || 'SAR'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Costs Summary */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ملخص التكاليف • Costs Summary</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr className="text-left text-gray-600 dark:text-gray-300">
                        <th className="py-2 px-3">نوع التكلفة • Cost Type</th>
                        <th className="py-2 px-3">المبلغ • Amount</th>
                        <th className="py-2 px-3">الوصف • Description</th>
                        <th className="py-2 px-3">التاريخ • Date</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900 dark:text-white divide-y divide-gray-200 dark:divide-gray-700">
                      {costs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-gray-600 dark:text-gray-400">لا توجد تكاليف • No costs</td>
                        </tr>
                      ) : (
                        costs.map((c) => (
                          <tr key={c.id}>
                            <td className="py-2 px-3 font-medium">{c.cost_type_code}</td>
                            <td className="py-2 px-3">{Number(c.amount).toFixed(2)}</td>
                            <td className="py-2 px-3">{c.description || '-'}</td>
                            <td className="py-2 px-3">{new Date(c.created_at).toLocaleDateString('ar-SA')}</td>
                          </tr>
                        ))
                      )}
                      {costs.length > 0 && (
                        <tr className="bg-gray-50 dark:bg-gray-700 font-bold">
                          <td className="py-2 px-3 text-right">الإجمالي • Total:</td>
                          <td className="py-2 px-3">
                            {costs.reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {shipment.notes && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ملاحظات • Notes</h3>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {shipment.notes}
                  </div>
                </div>
              )}

              {/* Shipping Bills Summary */}
              <div className="card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📄 بوليصات الشحن • Shipping Bills</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push(`/shipping-bills/new?shipment_id=${id}&shipment_number=${shipment.shipment_number}`)}
                  >
                    + إضافة بوليصة • Add Bill
                  </Button>
                </div>
                {loadingBills ? (
                  <div className="text-center py-4 text-gray-500">جارٍ التحميل... • Loading...</div>
                ) : shippingBills.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    لا توجد بوليصات شحن مرتبطة بهذه الشحنة • No shipping bills linked to this shipment
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr className="text-left text-gray-600 dark:text-gray-300">
                          <th className="py-2 px-3">رقم البوليصة • Bill Number</th>
                          <th className="py-2 px-3">النوع • Type</th>
                          <th className="py-2 px-3">الناقل • Carrier</th>
                          <th className="py-2 px-3">الحالة • Status</th>
                          <th className="py-2 px-3">إجراءات • Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-900 dark:text-white divide-y divide-gray-200 dark:divide-gray-700">
                        {shippingBills.map((bill) => (
                          <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-2 px-3 font-medium">{bill.bill_number}</td>
                            <td className="py-2 px-3">{bill.bill_type_code || bill.bill_type_name || '-'}</td>
                            <td className="py-2 px-3">{bill.carrier_name || bill.vessel_name || '-'}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                bill.status === 'delivered' || bill.status === 'completed' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : bill.status === 'in_transit' || bill.status === 'shipped'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                  : bill.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {bill.status}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => router.push(`/shipping-bills/${bill.id}`)}
                                >
                                  👁 عرض
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => router.push(`/shipping-bills/${bill.id}/edit`)}
                                >
                                  ✏️ تعديل
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="card p-6">
                <div className="flex gap-2">
                  {!isLocked ? (
                    <Button variant="secondary" onClick={handleLock} loading={locking} disabled={locking}>
                      🔒 قفل الشحنة • Lock Shipment
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={handleUnlock} loading={unlocking} disabled={unlocking}>
                      🔓 فتح الشحنة • Unlock Shipment
                    </Button>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Items Tab */}
            {activeTab === 'items' && (
            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">أصناف الشحنة • Shipment Items</h2>
                  <div className="flex gap-2">
                    {shipment?.purchase_order_id && canEditLocked && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await apiClient.post(`/api/logistics-shipments/${id}/sync-items-from-po`, {});
                            if (res.success) {
                              showToast(`تم مزامنة الأصناف: ${res.data.added} جديد، ${res.data.updated} محدث`, 'success');
                              fetchShipment(); // Refresh the page data
                            }
                          } catch (e: any) {
                            showToast(e?.message || 'فشل مزامنة الأصناف', 'error');
                          }
                        }}
                      >
                        🔄 مزامنة من أمر الشراء • Sync from PO
                      </Button>
                    )}
                    {canEditLocked && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/shipments/${id}/edit`)}
                      >
                        ✏️ تعديل الأصناف • Edit Items
                      </Button>
                    )}
                  </div>
                </div>

                {/* Currency indicator */}
                {shipment?.po_currency_code && shipment.po_currency_code !== 'SAR' && (
                  <div className="mb-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-bold">{shipment.po_currency_code}</span>
                    <span>الأسعار بعملة أمر الشراء | Prices in PO Currency</span>
                    <span className="text-xs text-gray-400">(1 {shipment.po_currency_code} = {Number(shipment.po_exchange_rate || 1).toFixed(4)} SAR)</span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr className="text-left text-gray-600 dark:text-gray-300">
                        <th className="py-3 px-4 font-semibold">كود الصنف • Item Code</th>
                        <th className="py-3 px-4 font-semibold">اسم الصنف • Item Name</th>
                        <th className="py-3 px-4 font-semibold text-center">الكمية • Quantity</th>
                        <th className="py-3 px-4 font-semibold">الوحدة • Unit</th>
                        <th className="py-3 px-4 font-semibold text-right">سعر الوحدة • Unit Price ({shipment?.po_currency_code || 'SAR'})</th>
                        <th className="py-3 px-4 font-semibold">العملة • Currency</th>
                        <th className="py-3 px-4 font-semibold text-right">الإجمالي • Total ({shipment?.po_currency_code || 'SAR'})</th>
                        <th className="py-3 px-4 font-semibold text-center">المستلم • Received</th>
                        <th className="py-3 px-4 font-semibold text-center">المتبقي • Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900 dark:text-white divide-y divide-gray-200 dark:divide-gray-700">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-gray-500 dark:text-gray-400">
                            لا توجد أصناف • No items found
                          </td>
                        </tr>
                      ) : (
                        items.map((it) => {
                          // Use PO unit price for display
                          const poUnitPrice = Number(it.po_unit_price ?? it.unit_cost ?? 0);
                          const totalCost = it.quantity * poUnitPrice;
                          const currencyCode = shipment?.po_currency_code || it.currency_code || 'SAR';
                          return (
                            <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">
                                {it.item_code || it.sku}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium">{it.name}</div>
                                {it.name_ar && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {it.name_ar}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center font-semibold">
                                {it.quantity.toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                {it.unit_name || it.unit_code || '-'}
                              </td>
                              <td className="py-3 px-4 text-right font-medium">
                                {poUnitPrice > 0 ? (
                                  <span className="text-green-600 dark:text-green-400">
                                    {poUnitPrice.toFixed(4)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {currencyCode}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-lg">
                                {poUnitPrice > 0 ? (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                  {it.received_qty.toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  it.remaining_qty > 0 
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {it.remaining_qty.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                      {items.length > 0 && items.some(it => it.po_unit_price || it.unit_cost) && (
                        <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold text-lg">
                          <td colSpan={6} className="py-3 px-4 text-right">
                            الإجمالي الكلي • Grand Total:
                          </td>
                          <td className="py-3 px-4 text-right text-blue-700 dark:text-blue-300">
                            {(() => {
                              const total = items.reduce((sum, it) => {
                                const price = it.po_unit_price ?? it.unit_cost ?? 0;
                                return sum + (it.quantity * price);
                              }, 0);
                              const currencyCode = shipment?.po_currency_code || 'SAR';
                              const exchangeRate = Number(shipment?.po_exchange_rate || 1);
                              return (
                                <div>
                                  <div className="text-lg font-bold">
                                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyCode}
                                  </div>
                                  {currencyCode !== 'SAR' && exchangeRate > 1 && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                                      ≈ {(total * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <form onSubmit={handleUpsertItem} className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <ItemSelector value={itemId} onChange={(v) => setItemId(v)} label="Item" disabled={savingItem || isLocked} />
                <Input
                  label="Quantity"
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  required
                  disabled={savingItem || isLocked}
                />
                <Input
                  label="Unit Cost (optional)"
                  type="number"
                  value={itemUnitCost}
                  onChange={(e) => setItemUnitCost(e.target.value)}
                  disabled={savingItem || isLocked}
                />
                <div className="flex items-end">
                  <Button type="submit" variant="primary" loading={savingItem} disabled={savingItem || isLocked}>
                    Save Item
                  </Button>
                </div>
              </form>
            </div>
            )}

            {/* Receiving Tab */}
            {activeTab === 'receiving' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Receiving</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <WarehouseSelector
                  value={receiveWarehouseId}
                  onChange={setReceiveWarehouseId}
                  label="Warehouse *"
                  disabled={receiving || isLocked}
                />
                <Input
                  label="Received At (optional)"
                  type="datetime-local"
                  value={receiveAt}
                  onChange={(e) => setReceiveAt(e.target.value)}
                  disabled={receiving || isLocked}
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Notes (optional)"
                  multiline
                  rows={3}
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  disabled={receiving || isLocked}
                />
              </div>
              <div className="mt-4">
                <Button
                  variant="primary"
                  onClick={handleReceiveRemaining}
                  loading={receiving}
                  disabled={receiving || isLocked}
                >
                  Receive Remaining
                </Button>
              </div>
            </div>
            )}

            {/* Expenses Tab (New) */}
            {activeTab === 'expenses' && shipment && (
              <ShipmentExpensesTabV2
                shipmentId={shipment.id}
                isLocked={isLocked}
              />
            )}

            {/* Shipping Bills Tab */}
            {activeTab === 'shipping-bills' && (
            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    📄 بوليصات الشحن • Shipping Bills
                  </h2>
                  <Button
                    variant="primary"
                    onClick={() => router.push(`/shipping-bills/new?shipment_id=${id}&shipment_number=${shipment?.shipment_number}`)}
                  >
                    + إضافة بوليصة جديدة • Add New Bill
                  </Button>
                </div>

                {loadingBills ? (
                  <div className="text-center py-8 text-gray-500">جارٍ التحميل... • Loading...</div>
                ) : shippingBills.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-4">📄</div>
                    <p>لا توجد بوليصات شحن مرتبطة بهذه الشحنة</p>
                    <p className="text-sm">No shipping bills linked to this shipment</p>
                    <Button
                      variant="primary"
                      className="mt-4"
                      onClick={() => router.push(`/shipping-bills/new?shipment_id=${id}&shipment_number=${shipment?.shipment_number}`)}
                    >
                      + إضافة أول بوليصة • Add First Bill
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr className="text-left text-gray-600 dark:text-gray-300">
                          <th className="py-3 px-4">رقم البوليصة • Bill Number</th>
                          <th className="py-3 px-4">النوع • Type</th>
                          <th className="py-3 px-4">الناقل/السفينة • Carrier/Vessel</th>
                          <th className="py-3 px-4">تاريخ الإصدار • Bill Date</th>
                          <th className="py-3 px-4">الحالة • Status</th>
                          <th className="py-3 px-4">إجراءات • Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-900 dark:text-white divide-y divide-gray-200 dark:divide-gray-700">
                        {shippingBills.map((bill) => (
                          <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-3 px-4">
                              <span className="font-medium">{bill.bill_number}</span>
                              {bill.booking_number && (
                                <div className="text-xs text-gray-500 mt-1">Booking: {bill.booking_number}</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                {bill.bill_type_code || bill.bill_type_name || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {bill.carrier_name || '-'}
                              {bill.vessel_name && (
                                <div className="text-xs text-gray-500 mt-1">🚢 {bill.vessel_name}</div>
                              )}
                              {bill.voyage_number && (
                                <div className="text-xs text-gray-500">Voyage: {bill.voyage_number}</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('ar-SA') : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                bill.status === 'delivered' || bill.status === 'completed' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : bill.status === 'in_transit' || bill.status === 'shipped'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                  : bill.status === 'arrived'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : bill.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : bill.status === 'issued'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {bill.status === 'draft' ? 'مسودة • Draft' :
                                 bill.status === 'issued' ? 'صادر • Issued' :
                                 bill.status === 'shipped' ? 'تم الشحن • Shipped' :
                                 bill.status === 'in_transit' ? 'قيد الشحن • In Transit' :
                                 bill.status === 'arrived' ? 'وصلت • Arrived' :
                                 bill.status === 'delivered' ? 'تم التسليم • Delivered' :
                                 bill.status === 'completed' ? 'مكتمل • Completed' :
                                 bill.status === 'cancelled' ? 'ملغي • Cancelled' :
                                 bill.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => router.push(`/shipping-bills/${bill.id}`)}
                                >
                                  👁 عرض
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => router.push(`/shipping-bills/${bill.id}/edit`)}
                                >
                                  ✏️ تعديل
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => {
                                    setBillToDelete(bill.id);
                                    setDeleteBillOpen(true);
                                  }}
                                >
                                  🗑
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quick Info Cards */}
              {shippingBills.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{shippingBills.length}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي البوليصات • Total Bills</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {shippingBills.filter(b => ['delivered', 'completed'].includes(b.status)).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">مكتملة • Completed</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {shippingBills.filter(b => ['draft', 'issued', 'shipped', 'in_transit', 'arrived'].includes(b.status)).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">قيد التنفيذ • In Progress</div>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Costs Tab (Legacy) - Enhanced Professional View */}
            {activeTab === 'costs' && (
            <div className="space-y-6">
              {/* Purchase Order & Currency Info Card */}
              {shipment && (
                <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                  <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                    📋 معلومات أمر الشراء | Purchase Order Info
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                      <span className="text-gray-500 dark:text-gray-400 block">رقم الأمر (النظام)</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{shipment.purchase_order_number || '-'}</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                      <span className="text-gray-500 dark:text-gray-400 block">رقم أمر المورد</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{shipment.vendor_contract_number || '-'}</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                      <span className="text-gray-500 dark:text-gray-400 block">المشروع | Project</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {shipment.project_code ? `${shipment.project_code} - ${shipment.project_name}` : '-'}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                      <span className="text-gray-500 dark:text-gray-400 block">عملة الأمر | PO Currency</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {shipment.po_currency_code || shipment.shipment_currency_code || '-'}
                        {shipment.po_total_amount ? ` (${Number(shipment.po_total_amount).toLocaleString()})` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Card with Costs Distribution */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📦 أصناف الشحنة وتوزيع التكاليف | Items & Cost Distribution
                </h2>
                
                {/* Currency indicator */}
                {shipment?.po_currency_code && shipment.po_currency_code !== 'SAR' && (
                  <div className="mb-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-bold">{shipment.po_currency_code}</span>
                    <span>الأسعار بعملة أمر الشراء | Prices in PO Currency</span>
                    <span className="text-xs text-gray-400">(1 {shipment.po_currency_code} = {Number(shipment.po_exchange_rate || 1).toFixed(4)} SAR)</span>
                  </div>
                )}
                
                {/* Items Table with Unit Cost Calculation */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <th className="py-3 px-3 font-semibold">#</th>
                        <th className="py-3 px-3 font-semibold">الكود | Code</th>
                        <th className="py-3 px-3 font-semibold">الصنف | Item</th>
                        <th className="py-3 px-3 font-semibold">الوحدة | UOM</th>
                        <th className="py-3 px-3 font-semibold text-right">الكمية | Qty</th>
                        <th className="py-3 px-3 font-semibold text-right">سعر الوحدة ({shipment?.po_currency_code || 'SAR'}) | Unit Price</th>
                        <th className="py-3 px-3 font-semibold text-right">إجمالي الصنف ({shipment?.po_currency_code || 'SAR'}) | Total</th>
                        <th className="py-3 px-3 font-semibold text-right">حصة التكاليف (SAR) | Cost Share</th>
                        <th className="py-3 px-3 font-semibold text-right bg-green-100 dark:bg-green-900/30">تكلفة الوحدة | Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900 dark:text-white divide-y divide-gray-200 dark:divide-gray-700">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            لا توجد أصناف | No items
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          // Get exchange rate
                          const poCurrencyCode = shipment?.po_currency_code || 'SAR';
                          const poToBaseRate = Number(shipment?.po_exchange_rate) || 1;
                          
                          // Calculate totals for cost distribution using PO unit price
                          const totalItemsValue = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.po_unit_price ?? item.unit_cost ?? 0)), 0);
                          const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0);
                          
                          // Calculate costs in base currency (SAR)
                          const totalCostsBase = costs.reduce((sum, c) => {
                            const amountBeforeVat = Number(c.amount_before_vat || c.amount);
                            const rate = Number(c.exchange_rate || 1);
                            return sum + (amountBeforeVat * rate);
                          }, 0);
                          
                          return items.map((item, idx) => {
                            // Use PO unit price for original price display
                            const poUnitPrice = Number(item.po_unit_price ?? item.unit_cost ?? 0);
                            const itemValue = Number(item.quantity) * poUnitPrice;
                            const itemValueBase = itemValue * poToBaseRate;
                            
                            // Cost share by value proportion (default distribution method) - in SAR
                            const totalItemsValueBase = totalItemsValue * poToBaseRate;
                            const costShare = totalItemsValueBase > 0 
                              ? (itemValueBase / totalItemsValueBase) * totalCostsBase 
                              : (totalQty > 0 ? (Number(item.quantity) / totalQty) * totalCostsBase : 0);
                            
                            // Total unit cost in base currency (SAR) = original price in SAR + distributed cost per unit
                            const totalUnitCostBase = poUnitPrice * poToBaseRate + (Number(item.quantity) > 0 ? costShare / Number(item.quantity) : 0);
                            // Convert to PO currency
                            const totalUnitCostPO = poToBaseRate > 0 ? totalUnitCostBase / poToBaseRate : totalUnitCostBase;
                            
                            return (
                              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="py-3 px-3 text-gray-500">{idx + 1}</td>
                                <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400">{item.sku || item.item_code}</td>
                                <td className="py-3 px-3">
                                  <div>{item.name}</div>
                                  {item.name_ar && <div className="text-xs text-gray-500">{item.name_ar}</div>}
                                </td>
                                <td className="py-3 px-3">{item.unit_code || item.unit_name || '-'}</td>
                                <td className="py-3 px-3 text-right font-medium">{Number(item.quantity).toLocaleString()}</td>
                                <td className="py-3 px-3 text-right">
                                  {poUnitPrice.toFixed(4)} {poCurrencyCode}
                                </td>
                                <td className="py-3 px-3 text-right font-medium">
                                  {itemValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {poCurrencyCode}
                                </td>
                                <td className="py-3 px-3 text-right text-orange-600 dark:text-orange-400">
                                  {costShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                                </td>
                                <td className="py-3 px-3 text-right bg-green-50 dark:bg-green-900/20">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-green-700 dark:text-green-300">
                                      {totalUnitCostBase.toFixed(4)} <span className="text-xs">SAR</span>
                                    </span>
                                    {poCurrencyCode !== 'SAR' && (
                                      <span className="text-purple-600 dark:text-purple-400 text-xs">
                                        {totalUnitCostPO.toFixed(4)} {poCurrencyCode}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                    {items.length > 0 && (
                      <tfoot className="bg-gray-100 dark:bg-gray-700 font-semibold">
                        <tr>
                          <td colSpan={4} className="py-3 px-3 text-right">الإجمالي | Total:</td>
                          <td className="py-3 px-3 text-right">{items.reduce((sum, i) => sum + Number(i.quantity), 0).toLocaleString()}</td>
                          <td className="py-3 px-3 text-right">-</td>
                          <td className="py-3 px-3 text-right">
                            {items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_cost || 0)), 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right text-orange-600 dark:text-orange-400">
                            {costs.reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right bg-green-50 dark:bg-green-900/20">-</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                
                {/* Exchange Rate Note */}
                {shipment?.po_currency_code && costs.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">⚠️ ملاحظة سعر الصرف:</span>
                    <span className="text-yellow-700 dark:text-yellow-300 mr-2">
                      {' '}عملة أمر الشراء: {shipment.po_currency_code}
                      {shipment.shipment_currency_code && shipment.shipment_currency_code !== shipment.po_currency_code && 
                        ` | عملة المصاريف: ${shipment.shipment_currency_code}`}
                      {shipment.exchange_rate && shipment.exchange_rate !== 1 && 
                        ` | سعر الصرف: ${shipment.exchange_rate}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Costs Card */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  💰 بطاقة المصاريف | Cost Card
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <th className="py-3 px-3 font-semibold">النوع | Type</th>
                        <th className="py-3 px-3 font-semibold text-right">قبل الضريبة | Before VAT</th>
                        <th className="py-3 px-3 font-semibold text-right">الضريبة | VAT</th>
                        <th className="py-3 px-3 font-semibold text-right">الإجمالي | Total</th>
                        <th className="py-3 px-3 font-semibold">العملة | Currency</th>
                        <th className="py-3 px-3 font-semibold">الحالة | Status</th>
                        <th className="py-3 px-3 font-semibold">المصدر | Source</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900 dark:text-white divide-y divide-gray-200 dark:divide-gray-700">
                      {costs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            لا توجد مصاريف | No costs
                          </td>
                        </tr>
                      ) : (
                        costs.map((c) => {
                          const amountBeforeVat = c.source === 'expense_v2' ? Number(c.amount_before_vat || c.amount) : Number(c.amount);
                          const vatAmount = c.source === 'expense_v2' ? Number(c.vat_amount || 0) : 0;
                          const totalAmount = Number(c.amount);
                          
                          return (
                            <tr key={`${c.source || 'legacy'}-${c.id}`} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${c.is_distributed ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                              <td className="py-3 px-3 font-medium">
                                <div>{c.cost_type_name || c.cost_type_code}</div>
                                {c.cost_type_name_ar && <div className="text-xs text-gray-500">{c.cost_type_name_ar}</div>}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="font-semibold text-blue-600 dark:text-blue-400">
                                  {amountBeforeVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                {c.exchange_rate && c.exchange_rate !== 1 && (
                                  <div className="text-xs text-orange-500">
                                    × {c.exchange_rate} = {(amountBeforeVat * Number(c.exchange_rate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right text-gray-500">
                                {vatAmount > 0 ? vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                              </td>
                              <td className="py-3 px-3 text-right font-medium">
                                {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3">{c.currency_code || '-'}</td>
                              <td className="py-3 px-3">
                                {c.is_distributed ? (
                                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                                    ✓ موزع | Distributed
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                                    غير موزع | Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {c.source === 'expense_v2' ? (
                                  <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded text-xs">
                                    V2
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                                    Legacy
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {costs.length > 0 && (
                      <tfoot className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                        <tr>
                          <td className="py-3 px-3">
                            <div>إجمالي المصاريف | Total Costs</div>
                            <div className="text-xs font-normal text-gray-500">(بالعملة الأساسية SAR)</div>
                          </td>
                          <td className="py-3 px-3 text-right text-blue-700 dark:text-blue-300">
                            {costs.reduce((sum, c) => {
                              const amountBeforeVat = Number(c.amount_before_vat || c.amount);
                              const rate = Number(c.exchange_rate || 1);
                              return sum + (amountBeforeVat * rate);
                            }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-500">
                            {costs.reduce((sum, c) => {
                              const vatAmount = Number(c.vat_amount || 0);
                              const rate = Number(c.exchange_rate || 1);
                              return sum + (vatAmount * rate);
                            }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-bold">
                            {costs.reduce((sum, c) => {
                              const totalAmount = Number(c.amount);
                              const rate = Number(c.exchange_rate || 1);
                              return sum + (totalAmount * rate);
                            }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Professional Cost Distribution Card */}
                <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-6 flex items-center gap-2">
                    <span>📊</span>
                    توزيع المصاريف على الأصناف | Cost Distribution to Items
                  </h3>

                  {/* Warning: VAT not included */}
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm">
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">⚠️ ملاحظة هامة:</span>
                    <span className="text-yellow-700 dark:text-yellow-300 mr-2">
                      {' '}يتم احتساب المصاريف قبل الضريبة فقط - الضريبة لا تدخل ضمن تكلفة البضاعة
                    </span>
                    <span className="text-yellow-600 dark:text-yellow-400 block mt-1 text-xs">
                      Note: Only pre-VAT amounts are distributed - VAT is NOT included in item cost
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Expense Selection */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white border-b pb-2">
                        1️⃣ اختيار المصاريف | Select Expenses
                      </h4>
                      
                      {/* Expense Selection Mode */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setExpenseSelectionMode('all_expenses')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            expenseSelectionMode === 'all_expenses'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          جميع المصاريف | All Expenses
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseSelectionMode('selected_expenses')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            expenseSelectionMode === 'selected_expenses'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          مصاريف محددة | Selected
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseSelectionMode('all_except')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            expenseSelectionMode === 'all_except'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          الكل ماعدا | All Except
                        </button>
                      </div>

                      {/* Expense Checkboxes */}
                      {(expenseSelectionMode === 'selected_expenses' || expenseSelectionMode === 'all_except') && (
                        <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-white dark:bg-gray-800">
                          {costs.filter(c => c.source === 'expense_v2').length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">
                              لا توجد مصاريف من تاب المصاريف | No expenses from Expenses tab
                            </p>
                          ) : (
                            costs.filter(c => c.source === 'expense_v2').map(cost => {
                              const isSelected = expenseSelectionMode === 'selected_expenses'
                                ? selectedExpenses.includes(cost.id)
                                : excludedExpenses.includes(cost.id);
                              const amountBeforeVat = cost.amount_before_vat || cost.amount;
                              
                              return (
                                <label key={cost.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (expenseSelectionMode === 'selected_expenses') {
                                        setSelectedExpenses(prev =>
                                          e.target.checked ? [...prev, cost.id] : prev.filter(id => id !== cost.id)
                                        );
                                      } else {
                                        setExcludedExpenses(prev =>
                                          e.target.checked ? [...prev, cost.id] : prev.filter(id => id !== cost.id)
                                        );
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{cost.cost_type_name || cost.cost_type_code}</div>
                                    <div className="text-xs text-gray-500">
                                      {Number(amountBeforeVat).toLocaleString()} {cost.currency_code}
                                      {cost.exchange_rate && cost.exchange_rate !== 1 && (
                                        <span className="text-orange-500 mr-2">
                                          (سعر الصرف: {cost.exchange_rate})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Selected Expenses Summary */}
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                          المصاريف المحددة للتوزيع | Selected for Distribution:
                        </div>
                        <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                          {(() => {
                            let expensesToDistribute = costs.filter(c => c.source === 'expense_v2');
                            if (expenseSelectionMode === 'selected_expenses') {
                              expensesToDistribute = expensesToDistribute.filter(c => selectedExpenses.includes(c.id));
                            } else if (expenseSelectionMode === 'all_except') {
                              expensesToDistribute = expensesToDistribute.filter(c => !excludedExpenses.includes(c.id));
                            }
                            // Use amount_before_vat (VAT not included in cost)
                            const total = expensesToDistribute.reduce((sum, c) => {
                              const amountBeforeVat = Number(c.amount_before_vat || c.amount);
                              const rate = Number(c.exchange_rate || 1);
                              return sum + (amountBeforeVat * rate);
                            }, 0);
                            return `${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} (بالعملة الأساسية)`;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Item Selection & Distribution Method */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white border-b pb-2">
                        2️⃣ اختيار الأصناف وطريقة التوزيع | Items & Method
                      </h4>

                      {/* Item Distribution Mode */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => { setDistributionMode('all_items'); setSelectedItems([]); }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            distributionMode === 'all_items'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          جميع الأصناف | All Items
                        </button>
                        <button
                          type="button"
                          onClick={() => setDistributionMode('selected_items')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            distributionMode === 'selected_items'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          أصناف محددة | Selected Items
                        </button>
                      </div>

                      {/* Item Checkboxes */}
                      {distributionMode === 'selected_items' && (
                        <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-white dark:bg-gray-800">
                          {items.map(item => (
                            <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={(e) => {
                                  setSelectedItems(prev =>
                                    e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id)
                                  );
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{item.sku || item.item_code} - {item.name}</div>
                                <div className="text-xs text-gray-500">
                                  الكمية: {item.quantity} | القيمة: {(Number(item.quantity) * Number(item.unit_cost || 0)).toLocaleString()}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Distribution Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          طريقة التوزيع | Distribution Method
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'VALUE', label: 'حسب القيمة', labelEn: 'By Value', desc: 'نسبة قيمة الصنف من الإجمالي' },
                            { value: 'QTY', label: 'حسب الكمية', labelEn: 'By Quantity', desc: 'نسبة كمية الصنف من الإجمالي' },
                            { value: 'WEIGHT', label: 'حسب الوزن', labelEn: 'By Weight', desc: 'نسبة وزن الصنف من الإجمالي' },
                            { value: 'EQUAL', label: 'بالتساوي', labelEn: 'Equal', desc: 'توزيع متساوي على الأصناف' },
                            { value: 'MANUAL', label: 'يدوي', labelEn: 'Manual', desc: 'تحديد النسبة لكل صنف' },
                          ].map(method => (
                            <button
                              key={method.value}
                              type="button"
                              onClick={() => setDistributionMethod(method.value as DistributionMethod)}
                              className={`p-2 rounded-lg text-sm font-medium transition-colors border ${
                                distributionMethod === method.value
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                              }`}
                              title={method.desc}
                            >
                              <div>{method.label}</div>
                              <div className="text-xs opacity-75">{method.labelEn}</div>
                            </button>
                          ))}
                        </div>
                        {distributionMethod === 'MANUAL' && (
                          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 rounded text-xs text-amber-700 dark:text-amber-300">
                            💡 التوزيع اليدوي: أدخل النسبة المئوية لكل صنف في جدول المعاينة أدناه
                          </div>
                        )}
                      </div>

                      {/* Distribution Preview */}
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <div className="text-sm font-medium text-green-800 dark:text-green-200">
                          الأصناف المستهدفة | Target Items:
                        </div>
                        <div className="text-lg font-bold text-green-900 dark:text-green-100">
                          {distributionMode === 'all_items' ? items.length : selectedItems.length} صنف
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Distribution Preview Table */}
                  <div className="mt-6 border-t pt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <span>👁️</span>
                      معاينة التوزيع | Distribution Preview
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            <th className="py-2 px-3 text-right">الصنف | Item</th>
                            <th className="py-2 px-3 text-right">الكمية | Qty</th>
                            <th className="py-2 px-3 text-right">القيمة الأصلية ({shipment?.po_currency_code || 'SAR'}) | Original Value</th>
                            <th className="py-2 px-3 text-right">
                              {distributionMethod === 'MANUAL' ? 'أدخل النسبة | Enter %' : 'نسبة التوزيع | Share %'}
                            </th>
                            <th className="py-2 px-3 text-right">حصة المصاريف (SAR) | Cost Share</th>
                            <th className="py-2 px-3 text-right bg-green-100 dark:bg-green-900/30">
                              تكلفة الوحدة الجديدة | New Unit Cost
                              <div className="text-xs font-normal text-gray-500">(SAR / {shipment?.po_currency_code || 'PO'})</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {(() => {
                            // Get PO exchange rate
                            const poCurrencyCode = shipment?.po_currency_code || 'SAR';
                            const poToBaseRate = Number(shipment?.po_exchange_rate) || 1;
                            
                            // Get expenses to distribute (before VAT only)
                            let expensesToDistribute = costs.filter(c => c.source === 'expense_v2');
                            if (expenseSelectionMode === 'selected_expenses') {
                              expensesToDistribute = expensesToDistribute.filter(c => selectedExpenses.includes(c.id));
                            } else if (expenseSelectionMode === 'all_except') {
                              expensesToDistribute = expensesToDistribute.filter(c => !excludedExpenses.includes(c.id));
                            }
                            
                            // Calculate total expenses in base currency (before VAT)
                            const totalExpensesBase = expensesToDistribute.reduce((sum, c) => {
                              const amountBeforeVat = Number(c.amount_before_vat || c.amount);
                              const rate = Number(c.exchange_rate || 1);
                              return sum + (amountBeforeVat * rate);
                            }, 0);

                            // Get items to distribute to
                            const targetItems = distributionMode === 'all_items'
                              ? items
                              : items.filter(item => selectedItems.includes(item.id));

                            if (targetItems.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="py-4 text-center text-gray-500">
                                    اختر الأصناف للتوزيع | Select items to distribute
                                  </td>
                                </tr>
                              );
                            }

                            // Calculate distribution base using PO unit price (original value)
                            const totalValue = targetItems.reduce((sum, item) => 
                              sum + (Number(item.quantity) * Number(item.po_unit_price ?? item.unit_cost ?? 0)), 0);
                            const totalQty = targetItems.reduce((sum, item) => sum + Number(item.quantity), 0);

                            return targetItems.map(item => {
                              // Use PO unit price for original value display
                              const poUnitPrice = Number(item.po_unit_price ?? item.unit_cost ?? 0);
                              const itemValue = Number(item.quantity) * poUnitPrice;
                              const itemQty = Number(item.quantity);
                              
                              // Calculate share based on distribution method
                              let sharePercent = 0;
                              if (distributionMethod === 'MANUAL') {
                                // Use manual percentage (stored as whole number, divide by 100)
                                sharePercent = (manualPercentages[item.id] || 0) / 100;
                              } else if (distributionMethod === 'VALUE' && totalValue > 0) {
                                sharePercent = itemValue / totalValue;
                              } else if (distributionMethod === 'QTY' && totalQty > 0) {
                                sharePercent = itemQty / totalQty;
                              } else if (distributionMethod === 'EQUAL') {
                                sharePercent = 1 / targetItems.length;
                              } else if (distributionMethod === 'WEIGHT') {
                                // Weight-based: use quantity as proxy (or actual weight if available)
                                sharePercent = totalQty > 0 ? itemQty / totalQty : 0;
                              }

                              const costShare = totalExpensesBase * sharePercent;
                              // Use PO unit price for base calculation
                              const newUnitCostBase = itemQty > 0 
                                ? poUnitPrice * poToBaseRate + (costShare / itemQty)
                                : poUnitPrice * poToBaseRate;
                              
                              // Convert to PO currency
                              const newUnitCostPO = poToBaseRate > 0 ? newUnitCostBase / poToBaseRate : newUnitCostBase;

                              // Calculate total manual percentages for validation
                              const totalManualPercent = Object.values(manualPercentages).reduce((sum, p) => sum + (p || 0), 0);
                              const isManualValid = distributionMethod === 'MANUAL' && Math.abs(totalManualPercent - 100) < 0.01;

                              return (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                  <td className="py-2 px-3">
                                    <span className="font-mono text-blue-600">{item.sku || item.item_code}</span>
                                    <span className="text-gray-600 dark:text-gray-400 mr-2">{item.name}</span>
                                  </td>
                                  <td className="py-2 px-3 text-right">{itemQty.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right">{itemValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="py-2 px-3 text-right">
                                    {distributionMethod === 'MANUAL' ? (
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={manualPercentages[item.id] || ''}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          setManualPercentages(prev => ({
                                            ...prev,
                                            [item.id]: Math.min(100, Math.max(0, val))
                                          }));
                                        }}
                                        className="w-20 px-2 py-1 text-right border rounded focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="0.00"
                                      />
                                    ) : (
                                      <span className="text-purple-600">{(sharePercent * 100).toFixed(2)}%</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right text-orange-600">{costShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="py-2 px-3 text-right bg-green-50 dark:bg-green-900/20">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-xs text-blue-500 font-medium">SAR</span>
                                        <span className="font-bold text-green-700 dark:text-green-400">
                                          {newUnitCostBase.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                                        </span>
                                      </div>
                                      {poCurrencyCode !== 'SAR' && (
                                        <div className="flex items-center justify-end gap-1">
                                          <span className="text-xs text-purple-500 font-medium">{poCurrencyCode}</span>
                                          <span className="font-bold text-purple-700 dark:text-purple-400">
                                            {newUnitCostPO.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Manual Distribution Validation */}
                    {distributionMethod === 'MANUAL' && (
                      <div className="mt-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-800">
                        {(() => {
                          const totalManualPercent = Object.values(manualPercentages).reduce((sum, p) => sum + (p || 0), 0);
                          const isValid = Math.abs(totalManualPercent - 100) < 0.01;
                          return (
                            <div className={`flex items-center gap-2 ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                              <span>{isValid ? '✅' : '⚠️'}</span>
                              <span className="font-medium">
                                مجموع النسب | Total Percentages: {totalManualPercent.toFixed(2)}%
                                {!isValid && (
                                  <span className="text-sm mr-2">
                                    (يجب أن يكون المجموع 100% | Must equal 100%)
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Apply Distribution Button */}
                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedExpenses([]);
                        setExcludedExpenses([]);
                        setSelectedItems([]);
                        setDistributionMode('all_items');
                        setExpenseSelectionMode('all_expenses');
                        setDistributionMethod('VALUE');
                        setManualPercentages({});
                      }}
                    >
                      إعادة تعيين | Reset
                    </Button>
                    <Button
                      variant="primary"
                      loading={distributing}
                      disabled={distributing || isLocked || costs.filter(c => c.source === 'expense_v2').length === 0}
                      onClick={async () => {
                        // Validate manual percentages if MANUAL method
                        if (distributionMethod === 'MANUAL') {
                          const totalManualPercent = Object.values(manualPercentages).reduce((sum, p) => sum + (p || 0), 0);
                          if (Math.abs(totalManualPercent - 100) >= 0.01) {
                            showToast(`مجموع النسب يجب أن يكون 100% (الحالي: ${totalManualPercent.toFixed(2)}%)`, 'error');
                            return;
                          }
                        }
                        
                        setDistributing(true);
                        try {
                          // Get selected expenses
                          let expenseIds: number[] = [];
                          const v2Expenses = costs.filter(c => c.source === 'expense_v2');
                          
                          if (expenseSelectionMode === 'all_expenses') {
                            expenseIds = v2Expenses.map(c => c.id);
                          } else if (expenseSelectionMode === 'selected_expenses') {
                            expenseIds = selectedExpenses;
                          } else {
                            expenseIds = v2Expenses.filter(c => !excludedExpenses.includes(c.id)).map(c => c.id);
                          }

                          // Get selected items
                          const itemIds = distributionMode === 'all_items'
                            ? items.map(i => i.id)
                            : selectedItems;

                          if (expenseIds.length === 0) {
                            showToast('الرجاء اختيار مصاريف للتوزيع', 'error');
                            return;
                          }
                          if (itemIds.length === 0) {
                            showToast('الرجاء اختيار أصناف للتوزيع', 'error');
                            return;
                          }

                          // Prepare manual percentages for API (only for MANUAL method)
                          const manualData = distributionMethod === 'MANUAL' 
                            ? Object.entries(manualPercentages).map(([itemId, percent]) => ({
                                item_id: parseInt(itemId),
                                percentage: percent / 100 // Convert to decimal
                              }))
                            : undefined;

                          // Call distribution API
                          await apiClient.post(`/api/logistics-shipments/${id}/distribute-costs`, {
                            expense_ids: expenseIds,
                            item_ids: itemIds,
                            distribution_method: distributionMethod,
                            manual_percentages: manualData,
                          });

                          showToast('تم توزيع المصاريف بنجاح | Costs distributed successfully', 'success');
                          await fetchShipment();
                        } catch (error: any) {
                          showToast(error?.message || 'فشل في توزيع المصاريف', 'error');
                        } finally {
                          setDistributing(false);
                        }
                      }}
                    >
                      تطبيق التوزيع | Apply Distribution
                    </Button>
                  </div>
                </div>
              </div>

              {/* Summary Card - Dual Currency View */}
              {items.length > 0 && (
                <div className="card p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                  <h2 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">
                    📊 ملخص تكلفة الوحدة | Unit Cost Summary
                  </h2>
                  
                  {(() => {
                    // Items are in PO currency (original purchase order currency) - use po_unit_price
                    const totalItemsValuePO = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.po_unit_price ?? item.unit_cost ?? 0)), 0);
                    const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0);
                    
                    // PO to Base currency exchange rate
                    const poCurrencyCode = shipment?.po_currency_code || 'SAR';
                    const poToBaseRate = Number(shipment?.po_exchange_rate) || 1;
                    
                    // Convert items value to base currency (SAR)
                    const totalItemsValueBase = totalItemsValuePO * poToBaseRate;
                    
                    // Calculate costs in base currency (SAR) - each expense has its own exchange rate
                    const totalCostsBase = costs.reduce((sum, c) => {
                      const amountBeforeVat = Number(c.amount_before_vat || c.amount);
                      const rate = Number(c.exchange_rate || 1);
                      return sum + (amountBeforeVat * rate);
                    }, 0);
                    
                    // Convert costs from base currency to PO currency
                    const totalCostsInPO = poToBaseRate > 0 ? totalCostsBase / poToBaseRate : totalCostsBase;
                    
                    // Grand totals
                    const grandTotalBase = totalItemsValueBase + totalCostsBase;
                    const grandTotalPO = totalItemsValuePO + totalCostsInPO;
                    
                    // Average cost per unit (total costs / total quantity)
                    const avgCostPerUnitBase = totalQty > 0 ? grandTotalBase / totalQty : 0;
                    const avgCostPerUnitPO = totalQty > 0 ? grandTotalPO / totalQty : 0;
                    
                    return (
                      <div className="space-y-4">
                        {/* Base Currency (SAR) Summary */}
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-bold">SAR</span>
                            العملة الأساسية | Base Currency
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
                              <div className="text-xl font-bold text-gray-900 dark:text-white">{totalItemsValueBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                              <div className="text-xs text-gray-500">قيمة الأصناف | Items Value</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
                              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{totalCostsBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                              <div className="text-xs text-gray-500">المصاريف (قبل الضريبة) | Expenses</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
                              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{grandTotalBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                              <div className="text-xs text-gray-500">الإجمالي الكلي | Grand Total</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center border-2 border-green-400">
                              <div className="text-xl font-bold text-green-600 dark:text-green-400">{avgCostPerUnitBase.toLocaleString(undefined, { minimumFractionDigits: 4 })}</div>
                              <div className="text-xs text-gray-500">متوسط تكلفة الوحدة | Avg Unit Cost</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* PO Currency Summary - Always show if different from SAR */}
                        {poCurrencyCode && poCurrencyCode !== 'SAR' && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-bold">{poCurrencyCode}</span>
                              عملة أمر الشراء | PO Currency
                              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                1 {poCurrencyCode} = {poToBaseRate.toLocaleString(undefined, { minimumFractionDigits: 4 })} SAR
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{totalItemsValuePO.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                <div className="text-xs text-gray-500">قيمة الأصناف | Items Value</div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
                                <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{totalCostsInPO.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                <div className="text-xs text-gray-500">المصاريف (قبل الضريبة) | Expenses</div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
                                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{grandTotalPO.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                <div className="text-xs text-gray-500">الإجمالي الكلي | Grand Total</div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center border-2 border-purple-400">
                                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{avgCostPerUnitPO.toLocaleString(undefined, { minimumFractionDigits: 4 })}</div>
                                <div className="text-xs text-gray-500">متوسط تكلفة الوحدة | Avg Unit Cost</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show message if PO currency is SAR */}
                        {poCurrencyCode === 'SAR' && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex items-center gap-2">
                            <span>ℹ️</span>
                            <span>عملة أمر الشراء هي SAR - لا حاجة لتحويل العملة | PO currency is SAR - no conversion needed</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            )}

            <ConfirmDialog
              isOpen={deleteOpen}
              onClose={() => setDeleteOpen(false)}
              onConfirm={handleDelete}
              title="Delete Shipment"
              message="This action cannot be undone."
              confirmText="Delete"
              variant="danger"
              loading={deleting}
            />

            <ConfirmDialog
              isOpen={deleteBillOpen}
              onClose={() => { setDeleteBillOpen(false); setBillToDelete(null); }}
              onConfirm={handleDeleteBill}
              title="حذف بوليصة الشحن • Delete Shipping Bill"
              message="هل أنت متأكد من حذف هذه البوليصة؟ هذا الإجراء لا يمكن التراجع عنه. • Are you sure you want to delete this shipping bill? This action cannot be undone."
              confirmText="حذف • Delete"
              variant="danger"
              loading={deletingBill}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
});
