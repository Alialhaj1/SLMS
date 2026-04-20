import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../hooks/useToast';
import { useLocale } from '../../contexts/LocaleContext';
import {
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  XMarkIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

// Types
interface PendingShipment {
  id: number;
  shipment_number: string;
  supplier_name: string;
  supplier_name_ar?: string;
  status: 'arrived' | 'in_transit' | 'customs_clearance';
  arrival_date: string;
  total_value: number;
  item_count: number;
  notes?: string;
}

interface ShipmentItem {
  id: number;
  po_item_id: number;
  product_code: string;
  product_name: string;
  product_name_ar?: string;
  ordered_quantity: number;
  shipped_quantity: number;
  pending_quantity: number;
  unit_name: string;
  unit_price: number;
  total_value: number;
}

interface ReceiptItem {
  po_item_id: number;
  received_quantity: number;
  quality_check: 'passed' | 'failed' | 'conditional' | '';
  quality_notes: string;
  warehouse_location: string;
  discrepancy_quantity: number;
  discrepancy_reason: string;
}

interface ReceiptData {
  shipment_id: number;
  receipt_date: string;
  warehouse_id: number;
  items: ReceiptItem[];
  overall_quality_check: boolean;
  quality_notes: string;
  receipt_notes: string;
  photos: File[];
}

interface Warehouse {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_name_ar?: string;
}

export default function ShipmentReceivingNew() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const showToast = useToast();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  // State
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [pendingShipments, setPendingShipments] = useState<PendingShipment[]>([]);
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<PendingShipment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    shipment_id: 0,
    receipt_date: new Date().toISOString().split('T')[0],
    warehouse_id: 0,
    items: [],
    overall_quality_check: true,
    quality_notes: '',
    receipt_notes: '',
    photos: []
  });

  // Fetch data
  useEffect(() => {
    fetchPendingShipments();
    fetchWarehouses();
  }, []);

  const fetchPendingShipments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        showToast({ type: 'error', message: isArabic ? 'غير مصرح بالوصول' : 'Access denied' });
        return;
      }

      const response = await fetch('http://localhost:4000/api/inventory/shipments/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setPendingShipments(result.data || []);
      } else {
        // Fallback sample data
        const sampleShipments: PendingShipment[] = [
          {
            id: 1,
            shipment_number: 'SHP-2024-001',
            supplier_name: 'Office Equipment Co.',
            supplier_name_ar: 'شركة المعدات المكتبية',
            status: 'arrived',
            arrival_date: '2024-01-15',
            total_value: 28000,
            item_count: 2,
            notes: 'Urgent delivery - priority handling required'
          },
          {
            id: 2,
            shipment_number: 'SHP-2024-002',
            supplier_name: 'Tech Solutions Ltd.',
            supplier_name_ar: 'شركة الحلول التقنية المحدودة',
            status: 'customs_clearance',
            arrival_date: '2024-01-16',
            total_value: 45000,
            item_count: 5,
            notes: 'Awaiting customs documentation'
          }
        ];
        setPendingShipments(sampleShipments);
      }
    } catch (error) {
      console.error('Error fetching pending shipments:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل في تحميل الشحنات' : 'Failed to load shipments' });
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/warehouses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setWarehouses(result.data || []);
      } else {
        // Fallback sample data
        const sampleWarehouses: Warehouse[] = [
          {
            id: 1,
            warehouse_code: 'WH-001',
            warehouse_name: 'Main Warehouse',
            warehouse_name_ar: 'المستودع الرئيسي'
          },
          {
            id: 2,
            warehouse_code: 'WH-002',
            warehouse_name: 'Secondary Warehouse',
            warehouse_name_ar: 'المستودع الثانوي'
          }
        ];
        setWarehouses(sampleWarehouses);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchShipmentItems = async (shipmentId: number) => {
    try {
      setItemsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        showToast({ type: 'error', message: isArabic ? 'غير مصرح بالوصول' : 'Access denied' });
        return;
      }

      const response = await fetch(`http://localhost:4000/api/inventory/shipments/${shipmentId}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const items = result.data || [];
        setShipmentItems(items);
        
        // Initialize receipt data items
        const receiptItems = items.map((item: ShipmentItem) => ({
          po_item_id: item.po_item_id,
          received_quantity: item.pending_quantity, // Default to full pending quantity
          quality_check: 'passed' as const,
          quality_notes: '',
          warehouse_location: '',
          discrepancy_quantity: 0,
          discrepancy_reason: ''
        }));

        setReceiptData(prev => ({
          ...prev,
          shipment_id: shipmentId,
          items: receiptItems
        }));
      } else {
        // Fallback sample data
        const sampleItems: ShipmentItem[] = [
          {
            id: 1,
            po_item_id: 1,
            product_code: 'ITM-001',
            product_name: 'Office Desk',
            product_name_ar: 'مكتب مكتبي',
            ordered_quantity: 10,
            shipped_quantity: 10,
            pending_quantity: 10,
            unit_name: 'PC',
            unit_price: 1200,
            total_value: 12000
          },
          {
            id: 2,
            po_item_id: 2,
            product_code: 'ITM-002',
            product_name: 'Office Chair',
            product_name_ar: 'كرسي مكتبي',
            ordered_quantity: 20,
            shipped_quantity: 20,
            pending_quantity: 20,
            unit_name: 'PC',
            unit_price: 800,
            total_value: 16000
          }
        ];

        setShipmentItems(sampleItems);
        
        const receiptItems = sampleItems.map(item => ({
          po_item_id: item.po_item_id,
          received_quantity: item.pending_quantity,
          quality_check: 'passed' as const,
          quality_notes: '',
          warehouse_location: '',
          discrepancy_quantity: 0,
          discrepancy_reason: ''
        }));

        setReceiptData(prev => ({
          ...prev,
          shipment_id: shipmentId,
          items: receiptItems
        }));
      }
    } catch (error) {
      console.error('Error fetching shipment items:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل في تحميل أصناف الشحنة' : 'Failed to load shipment items' });
    } finally {
      setItemsLoading(false);
    }
  };

  const startReceiving = async (shipment: PendingShipment) => {
    setSelectedShipment(shipment);
    setReceiptData({
      shipment_id: shipment.id,
      receipt_date: new Date().toISOString().split('T')[0],
      warehouse_id: 0,
      items: [],
      overall_quality_check: true,
      quality_notes: '',
      receipt_notes: '',
      photos: []
    });
    
    await fetchShipmentItems(shipment.id);
    setShowReceiptModal(true);
  };

  const updateItemQuantity = (poItemId: number, receivedQuantity: number) => {
    setReceiptData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.po_item_id === poItemId 
          ? { ...item, received_quantity: receivedQuantity }
          : item
      )
    }));
  };

  const updateItemQuality = (poItemId: number, qualityCheck: 'passed' | 'failed' | 'conditional', notes?: string) => {
    setReceiptData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.po_item_id === poItemId 
          ? { ...item, quality_check: qualityCheck, quality_notes: notes || '' }
          : item
      )
    }));
  };

  const updateItemDiscrepancy = (poItemId: number, discrepancyQuantity: number, reason?: string) => {
    setReceiptData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.po_item_id === poItemId 
          ? { ...item, discrepancy_quantity: discrepancyQuantity, discrepancy_reason: reason || '' }
          : item
      )
    }));
  };

  const processReceipt = async () => {
    if (!receiptData.warehouse_id) {
      showToast({ type: 'warning', message: isArabic ? 'يرجى اختيار المستودع' : 'Please select warehouse' });
      return;
    }

    if (receiptData.items.some(item => item.received_quantity <= 0)) {
      showToast({ type: 'warning', message: isArabic ? 'يرجى إدخال الكميات المستلمة' : 'Please enter received quantities' });
      return;
    }

    try {
      setProcessLoading(true);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showToast({ type: 'error', message: isArabic ? 'غير مصرح بالوصول' : 'Access denied' });
        return;
      }

      // Prepare form data for file uploads
      const formData = new FormData();
      formData.append('receipt_data', JSON.stringify({
        shipment_id: receiptData.shipment_id,
        receipt_date: receiptData.receipt_date,
        warehouse_id: receiptData.warehouse_id,
        items: receiptData.items,
        overall_quality_check: receiptData.overall_quality_check,
        quality_notes: receiptData.quality_notes,
        receipt_notes: receiptData.receipt_notes
      }));

      // Append photos
      receiptData.photos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });

      const response = await fetch('http://localhost:4000/api/inventory/shipments/receive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        showToast({ 
          type: 'success', 
          message: isArabic 
            ? 'تم استلام الشحنة بنجاح وتحديث المخزون' 
            : 'Shipment received successfully and inventory updated' 
        });
        
        setShowReceiptModal(false);
        fetchPendingShipments(); // Refresh the list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Receipt processing failed');
      }

    } catch (error) {
      console.error('Error processing receipt:', error);
      showToast({ 
        type: 'error', 
        message: isArabic ? 'فشل في معالجة الاستلام' : 'Failed to process receipt' 
      });
    } finally {
      setProcessLoading(false);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string = 'SAR') => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currencyCode}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'customs_clearance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'arrived': isArabic ? 'وصلت' : 'Arrived',
      'in_transit': isArabic ? 'في الطريق' : 'In Transit',
      'customs_clearance': isArabic ? 'المعاينة الجمركية' : 'Customs Clearance'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'passed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'conditional':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClipboardDocumentCheckIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const warehouseOptions = warehouses.map(warehouse => ({
    value: warehouse.id.toString(),
    label: `${warehouse.warehouse_code} - ${isArabic ? (warehouse.warehouse_name_ar || warehouse.warehouse_name) : warehouse.warehouse_name}`,
    searchText: `${warehouse.warehouse_code} ${warehouse.warehouse_name} ${warehouse.warehouse_name_ar || ''}`
  }));

  if (!hasPermission('inventory:receive')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {isArabic ? 'غير مصرح بالوصول' : 'Access Denied'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {isArabic ? 'ليس لديك صلاحية لاستلام الشحنات' : 'You do not have permission to receive shipments'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'استلام الشحنات - نظام اللوجستيك الذكي' : 'Shipment Receiving - SLMS'}</title>
      </Head>
      
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isArabic ? 'استلام الشحنات' : 'Shipment Receiving'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isArabic 
              ? 'إدارة وتتبع استلام الشحنات الواردة مع فحص الجودة' 
              : 'Manage and track incoming shipment receipts with quality inspection'
            }
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <TruckIcon className="w-10 h-10 text-blue-600" />
              <div className="mr-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isArabic ? 'الشحنات المنتظرة' : 'Pending Shipments'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingShipments.length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="w-10 h-10 text-green-600" />
              <div className="mr-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isArabic ? 'تم الاستلام اليوم' : 'Received Today'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-10 h-10 text-yellow-600" />
              <div className="mr-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isArabic ? 'مشاكل الجودة' : 'Quality Issues'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <ClipboardDocumentCheckIcon className="w-10 h-10 text-purple-600" />
              <div className="mr-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isArabic ? 'في الانتظار' : 'Awaiting Receipt'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingShipments.filter(s => s.status === 'arrived').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Shipments List */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isArabic ? 'الشحنات المنتظرة للاستلام' : 'Pending Shipments for Receipt'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isArabic 
                ? 'قائمة بالشحنات التي وصلت ومتاحة للاستلام' 
                : 'List of shipments that have arrived and are available for receipt'
              }
            </p>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="animate-pulse border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-48"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                      </div>
                      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingShipments.length === 0 ? (
              <div className="text-center py-12">
                <TruckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {isArabic ? 'لا توجد شحنات منتظرة' : 'No Pending Shipments'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {isArabic 
                    ? 'جميع الشحنات تم استلامها أو لا توجد شحنات واصلة بعد' 
                    : 'All shipments received or no arrived shipments yet'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingShipments.map((shipment) => (
                  <div 
                    key={shipment.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            #{shipment.shipment_number}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(shipment.status)}`}>
                            {getStatusLabel(shipment.status)}
                          </span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {isArabic ? 'المورد' : 'Supplier'}
                            </p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {isArabic && shipment.supplier_name_ar 
                                ? shipment.supplier_name_ar 
                                : shipment.supplier_name
                              }
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {isArabic ? 'تاريخ الوصول' : 'Arrival Date'}
                            </p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {formatDate(shipment.arrival_date)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {isArabic ? 'قيمة الشحنة' : 'Shipment Value'}
                            </p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(shipment.total_value)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {isArabic ? 'عدد الأصناف' : 'Item Count'}
                            </p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {shipment.item_count} {isArabic ? 'صنف' : 'items'}
                            </p>
                          </div>
                        </div>
                        
                        {shipment.notes && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <DocumentTextIcon className="w-4 h-4 inline ml-1" />
                              {shipment.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => startReceiving(shipment)}
                          disabled={shipment.status !== 'arrived'}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {isArabic ? 'بدء الاستلام' : 'Start Receipt'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Receipt Processing Modal */}
      <Modal 
        isOpen={showReceiptModal} 
        onClose={() => setShowReceiptModal(false)}
        size="xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {isArabic ? 'استلام الشحنة' : 'Process Shipment Receipt'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                #{selectedShipment?.shipment_number} - {selectedShipment?.supplier_name}
              </p>
            </div>
            <button
              onClick={() => setShowReceiptModal(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Receipt Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isArabic ? 'تاريخ الاستلام' : 'Receipt Date'}
                </label>
                <input
                  type="date"
                  value={receiptData.receipt_date}
                  onChange={(e) => setReceiptData(prev => ({ ...prev, receipt_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isArabic ? 'المستودع المستقبل' : 'Receiving Warehouse'} *
                </label>
                <SearchableSelect
                  options={warehouseOptions}
                  value={receiptData.warehouse_id.toString()}
                  onChange={(value) => setReceiptData(prev => ({ ...prev, warehouse_id: parseInt(value) }))}
                  placeholder={isArabic ? 'اختر المستودع...' : 'Select warehouse...'}
                  noResultsText={isArabic ? 'لا توجد نتائج' : 'No results found'}
                />
              </div>
            </div>

            {/* Items List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {isArabic ? 'أصناف الشحنة' : 'Shipment Items'}
              </h3>
              
              {itemsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="animate-pulse border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                        </div>
                        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {receiptData.items.map((receiptItem) => {
                    const item = shipmentItems.find(si => si.po_item_id === receiptItem.po_item_id);
                    if (!item) return null;
                    
                    return (
                      <div key={receiptItem.po_item_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Item Info */}
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {isArabic && item.product_name_ar ? item.product_name_ar : item.product_name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {isArabic ? 'الكود' : 'Code'}: {item.product_code}
                                </p>
                              </div>
                              {getQualityIcon(receiptItem.quality_check)}
                            </div>
                            
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              <p>
                                {isArabic ? 'الكمية المطلوبة' : 'Expected'}: {item.ordered_quantity} {item.unit_name}
                              </p>
                              <p>
                                {isArabic ? 'الكمية المشحونة' : 'Shipped'}: {item.shipped_quantity} {item.unit_name}
                              </p>
                            </div>
                          </div>

                          {/* Receipt Controls */}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {isArabic ? 'الكمية المستلمة' : 'Received Quantity'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={item.shipped_quantity}
                                value={receiptItem.received_quantity}
                                onChange={(e) => updateItemQuantity(receiptItem.po_item_id, parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {isArabic ? 'فحص الجودة' : 'Quality Check'}
                              </label>
                              <select
                                value={receiptItem.quality_check}
                                onChange={(e) => updateItemQuality(receiptItem.po_item_id, e.target.value as 'passed' | 'failed' | 'conditional')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              >
                                <option value="">{isArabic ? 'اختر النتيجة...' : 'Select result...'}</option>
                                <option value="passed">{isArabic ? 'نجح' : 'Passed'}</option>
                                <option value="conditional">{isArabic ? 'بشروط' : 'Conditional'}</option>
                                <option value="failed">{isArabic ? 'فشل' : 'Failed'}</option>
                              </select>
                            </div>

                            {receiptItem.quality_check === 'failed' || receiptItem.quality_check === 'conditional' ? (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {isArabic ? 'ملاحظات الجودة' : 'Quality Notes'}
                                </label>
                                <textarea
                                  value={receiptItem.quality_notes}
                                  onChange={(e) => updateItemQuality(receiptItem.po_item_id, receiptItem.quality_check, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  rows={2}
                                  placeholder={isArabic ? 'اذكر سبب المشكلة...' : 'Describe the issue...'}
                                />
                              </div>
                            ) : null}

                            {receiptItem.received_quantity !== item.shipped_quantity && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {isArabic ? 'سبب الاختلاف' : 'Discrepancy Reason'}
                                </label>
                                <input
                                  type="text"
                                  value={receiptItem.discrepancy_reason}
                                  onChange={(e) => updateItemDiscrepancy(
                                    receiptItem.po_item_id, 
                                    item.shipped_quantity - receiptItem.received_quantity,
                                    e.target.value
                                  )}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  placeholder={isArabic ? 'اذكر سبب الاختلاف في الكمية...' : 'Explain quantity difference...'}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Overall Quality & Photos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {isArabic ? 'التقييم العام' : 'Overall Assessment'}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <input
                      type="checkbox"
                      id="overall-quality"
                      checked={receiptData.overall_quality_check}
                      onChange={(e) => setReceiptData(prev => ({ ...prev, overall_quality_check: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="overall-quality" className="text-sm text-gray-700 dark:text-gray-300">
                      {isArabic ? 'الجودة العامة مقبولة' : 'Overall quality acceptable'}
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {isArabic ? 'ملاحظات الاستلام' : 'Receipt Notes'}
                    </label>
                    <textarea
                      value={receiptData.receipt_notes}
                      onChange={(e) => setReceiptData(prev => ({ ...prev, receipt_notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      rows={3}
                      placeholder={isArabic ? 'ملاحظات إضافية...' : 'Additional notes...'}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {isArabic ? 'صور الاستلام' : 'Receipt Photos'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          setReceiptData(prev => ({
                            ...prev,
                            photos: [...prev.photos, ...Array.from(e.target.files!)]
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {isArabic ? 'يمكن رفع عدة صور' : 'Multiple photos allowed'}
                    </p>
                  </div>
                  
                  {receiptData.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {receiptData.photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Receipt ${index + 1}`}
                            className="w-full h-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                          />
                          <button
                            onClick={() => setReceiptData(prev => ({
                              ...prev,
                              photos: prev.photos.filter((_, i) => i !== index)
                            }))}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowReceiptModal(false)}
                disabled={processLoading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={processReceipt}
                disabled={processLoading || !receiptData.warehouse_id}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 rtl:space-x-reverse"
              >
                {processLoading && (
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{isArabic ? 'تأكيد الاستلام' : 'Confirm Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
};