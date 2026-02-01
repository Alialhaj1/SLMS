/**
 * Customs Declarations Page - Enhanced Version
 * صفحة البيانات الجمركية - النسخة المحسنة
 * 
 * Features:
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - One declaration per shipment validation
 * - Saudi ports dropdown
 * - Items management with cost allocation
 * - Fee distribution logic (direct fees vs shared fees)
 * - Matched fields with expense form
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import apiClient from '../../../lib/apiClient';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// =====================================================
// INTERFACES
// =====================================================
interface CustomsDeclaration {
  id: number;
  declaration_number: string;
  declaration_type_id: number;
  type_name_en?: string;
  type_name_ar?: string;
  type_direction?: string;
  status_id: number;
  status_name_en?: string;
  status_name_ar?: string;
  status_color?: string;
  declaration_date: string;
  submission_date?: string;
  clearance_date?: string;
  shipment_id?: number;
  shipment_number?: string;
  project_id?: number;
  project_code?: string;
  project_name?: string;
  customs_office_id?: number;
  customs_office_name?: string;
  port_id?: number;
  port_name?: string;
  port_name_ar?: string;
  entry_point_name?: string;
  transport_mode?: string;
  bl_number?: string;
  origin_country_id?: number;
  origin_country_name?: string;
  destination_country_id?: number;
  destination_country_name?: string;
  currency_id?: number;
  currency_code?: string;
  exchange_rate: number;
  total_cif_value: number;
  total_fob_value: number;
  freight_value: number;
  insurance_value: number;
  other_charges: number;
  total_customs_duty: number;
  total_vat: number;
  total_fees: number;
  handling_fees: number;
  ground_fees: number;
  total_gross_weight: number;
  total_net_weight: number;
  total_packages: number;
  notes?: string;
  items?: DeclarationItem[];
}

interface DeclarationItem {
  id?: number;
  item_number: number;
  hs_code: string;
  description_en: string;
  description_ar: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_value: number;
  duty_rate: number;
  duty_type: 'percentage' | 'fixed' | 'exempt';
  duty_amount: number;
  vat_rate: number;
  vat_amount: number;
  allocated_shared_fees: number;
  total_cost: number;
  unit_cost: number;
}

interface DeclarationType {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  direction: string;
}

interface DeclarationStatus {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  color: string;
  is_initial: boolean;
  is_final: boolean;
}

interface Port {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  port_type?: string;
}

interface Shipment {
  id: number;
  shipment_number: string;
  bl_no?: string;
  project_id?: number;
  project_code?: string;
  project_name?: string;
  shipment_type_id?: number;
  shipment_type_name_en?: string;
  shipment_type_name_ar?: string;
  port_of_discharge_id?: number;
  port_of_loading_id?: number;
  origin_country_id?: number;
  destination_country_id?: number;
  currency_id?: number;
  currency_code?: string;
  has_declaration?: boolean;
}

// Default exchange rate SAR
const DEFAULT_EXCHANGE_RATE = '3.75';

// =====================================================
// FEE DISTRIBUTION METHODS
// =====================================================
type DistributionMethod = 'by_value' | 'by_quantity' | 'equal';

const calculateFeeDistribution = (
  items: DeclarationItem[],
  sharedFees: number,
  method: DistributionMethod = 'by_value'
): DeclarationItem[] => {
  if (items.length === 0 || sharedFees === 0) return items;

  let totalBasis = 0;
  
  switch (method) {
    case 'by_value':
      totalBasis = items.reduce((sum, item) => sum + item.total_value, 0);
      break;
    case 'by_quantity':
      totalBasis = items.reduce((sum, item) => sum + item.quantity, 0);
      break;
    case 'equal':
      totalBasis = items.length;
      break;
  }

  if (totalBasis === 0) return items;

  return items.map(item => {
    let itemBasis = 0;
    switch (method) {
      case 'by_value':
        itemBasis = item.total_value;
        break;
      case 'by_quantity':
        itemBasis = item.quantity;
        break;
      case 'equal':
        itemBasis = 1;
        break;
    }

    const itemShare = (itemBasis / totalBasis) * sharedFees;
    const totalCost = item.total_value + item.duty_amount + item.vat_amount + itemShare;
    const unitCost = item.quantity > 0 ? totalCost / item.quantity : 0;

    return {
      ...item,
      allocated_shared_fees: Math.round(itemShare * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      unit_cost: Math.round(unitCost * 100) / 100,
    };
  });
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function CustomsDeclarationsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  // Data
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [types, setTypes] = useState<DeclarationType[]>([]);
  const [statuses, setStatuses] = useState<DeclarationStatus[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [saudiPorts, setSaudiPorts] = useState<Port[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  
  // Loading
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<CustomsDeclaration | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  
  // Delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [declarationToDelete, setDeclarationToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Distribution method
  const [distributionMethod, setDistributionMethod] = useState<DistributionMethod>('by_value');
  
  // Form
  const [formData, setFormData] = useState({
    declaration_type_id: '',
    status_id: '',
    declaration_date: new Date().toISOString().split('T')[0],
    shipment_id: '',
    project_id: '',
    project_code: '',
    project_name: '',
    customs_office_name: '',
    port_id: '',
    entry_point_name: '',
    transport_mode: 'sea',
    bl_number: '',
    awb_number: '',
    manifest_number: '',
    vessel_name: '',
    voyage_number: '',
    origin_country_id: '',
    destination_country_id: '',
    currency_id: '',
    shipment_currency_code: '',
    exchange_rate: DEFAULT_EXCHANGE_RATE,
    total_fob_value: '0',
    freight_value: '0',
    insurance_value: '0',
    handling_fees: '0',
    ground_fees: '0',
    other_charges: '0',
    customs_duty: '0',
    vat_amount: '0',
    notes: '',
  });

  // Items
  const [items, setItems] = useState<DeclarationItem[]>([]);
  const [currentItem, setCurrentItem] = useState<DeclarationItem | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  
  // Permissions
  const canCreate = hasPermission('customs_declarations:create');
  const canUpdate = hasPermission('customs_declarations:update');
  const canDelete = hasPermission('customs_declarations:delete');

  // =====================================================
  // DATA FETCHING
  // =====================================================
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    try {
      const [
        declarationsRes,
        typesRes,
        statusesRes,
        shipmentsRes,
        currenciesRes,
        portsRes,
        countriesRes,
      ] = await Promise.all([
        apiClient.get('/api/customs-declarations'),
        apiClient.get('/api/customs-declarations/types'),
        apiClient.get('/api/customs-declarations/statuses'),
        apiClient.get('/api/logistics-shipments?limit=1000'),
        apiClient.get('/api/finance/currencies'),
        apiClient.get('/api/shipment-expenses/ref/saudi-ports').catch(() => ({ success: false })),
        apiClient.get('/api/countries').catch(() => ({ success: false })),
      ]);
      
      if (declarationsRes.success) setDeclarations(declarationsRes.data || []);
      if (typesRes.success) setTypes(typesRes.data || []);
      if (statusesRes.success) setStatuses(statusesRes.data || []);
      
      // Mark shipments that already have declarations
      if (shipmentsRes.success) {
        const declaredShipmentIds = new Set(
          (declarationsRes.data || []).map((d: CustomsDeclaration) => d.shipment_id).filter(Boolean)
        );
        const shipmentsWithFlag = (shipmentsRes.data || []).map((s: Shipment) => ({
          ...s,
          has_declaration: declaredShipmentIds.has(s.id),
        }));
        setShipments(shipmentsWithFlag);
      }
      
      if (currenciesRes.success) {
        setCurrencies(currenciesRes.data || []);
        const baseCurrency = currenciesRes.data?.find((c: any) => c.is_base_currency);
        if (baseCurrency && !formData.currency_id) {
          setFormData(prev => ({ ...prev, currency_id: baseCurrency.id.toString() }));
        }
      }
      
      if (portsRes.success) setSaudiPorts(portsRes.data || []);
      if (countriesRes.success) setCountries(countriesRes.data || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast(locale === 'ar' ? 'خطأ في تحميل البيانات' : 'Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =====================================================
  // COMPUTED VALUES
  // =====================================================
  
  // Filter available shipments (exclude those with existing declarations in create mode)
  const availableShipments = useMemo(() => {
    if (editMode && selectedDeclaration) {
      return shipments.filter(s => 
        !s.has_declaration || s.id === selectedDeclaration.shipment_id
      );
    }
    return shipments.filter(s => !s.has_declaration);
  }, [shipments, editMode, selectedDeclaration]);

  // Calculate shared fees
  const totalSharedFees = useMemo(() => {
    return (
      parseFloat(formData.handling_fees || '0') +
      parseFloat(formData.ground_fees || '0') +
      parseFloat(formData.other_charges || '0')
    );
  }, [formData.handling_fees, formData.ground_fees, formData.other_charges]);

  // Calculate CIF value
  const calculatedCIF = useMemo(() => {
    return (
      parseFloat(formData.total_fob_value || '0') +
      parseFloat(formData.freight_value || '0') +
      parseFloat(formData.insurance_value || '0')
    );
  }, [formData.total_fob_value, formData.freight_value, formData.insurance_value]);

  // Items with distributed fees
  const itemsWithDistribution = useMemo(() => {
    return calculateFeeDistribution(items, totalSharedFees, distributionMethod);
  }, [items, totalSharedFees, distributionMethod]);

  // Total duties and fees from items
  const itemsTotals = useMemo(() => {
    return itemsWithDistribution.reduce(
      (acc, item) => ({
        totalValue: acc.totalValue + item.total_value,
        totalDuty: acc.totalDuty + item.duty_amount,
        totalVAT: acc.totalVAT + item.vat_amount,
        totalAllocated: acc.totalAllocated + item.allocated_shared_fees,
        totalCost: acc.totalCost + item.total_cost,
      }),
      { totalValue: 0, totalDuty: 0, totalVAT: 0, totalAllocated: 0, totalCost: 0 }
    );
  }, [itemsWithDistribution]);

  // Filter declarations
  const filteredDeclarations = declarations.filter(d => {
    const matchesSearch = !searchTerm || 
      d.declaration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.shipment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.bl_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || d.declaration_type_id?.toString() === selectedType;
    const matchesStatus = selectedStatus === 'all' || d.status_id?.toString() === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Stats
  const totalDeclarations = declarations.length;
  const clearedDeclarations = declarations.filter(d => d.status_name_en?.toLowerCase() === 'cleared').length;
  const pendingDeclarations = declarations.filter(d => 
    ['submitted', 'under_review', 'pending_payment'].includes(d.status_name_en?.toLowerCase() || '')
  ).length;
  const totalFees = declarations.reduce((sum, d) => sum + Number(d.total_fees || 0), 0);

  // =====================================================
  // HELPERS
  // =====================================================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { 
      style: 'currency', 
      currency: 'SAR',
      minimumFractionDigits: 2 
    }).format(amount || 0);
  };

  const getStatusColor = (color?: string) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    };
    return colorMap[color || 'gray'] || colorMap.gray;
  };

  const getDirectionBadge = (direction?: string) => {
    const styles: Record<string, string> = {
      import: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      export: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      transit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      import: { en: 'Import', ar: 'استيراد' },
      export: { en: 'Export', ar: 'تصدير' },
      transit: { en: 'Transit', ar: 'ترانزيت' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[direction || 'import'])}>
        {locale === 'ar' ? labels[direction || 'import']?.ar : labels[direction || 'import']?.en}
      </span>
    );
  };

  // =====================================================
  // HANDLERS
  // =====================================================
  
  const handleOpenCreate = () => {
    const initialStatus = statuses.find(s => s.code === 'DRAFT') || statuses[0];
    setFormData({
      declaration_type_id: types[0]?.id?.toString() || '',
      status_id: initialStatus?.id?.toString() || '',
      declaration_date: new Date().toISOString().split('T')[0],
      shipment_id: '',
      project_id: '',
      project_code: '',
      project_name: '',
      customs_office_name: '',
      port_id: '',
      entry_point_name: '',
      transport_mode: 'sea',
      bl_number: '',
      awb_number: '',
      manifest_number: '',
      vessel_name: '',
      voyage_number: '',
      origin_country_id: '',
      destination_country_id: '',
      currency_id: currencies.find(c => c.is_base_currency)?.id?.toString() || '',
      exchange_rate: DEFAULT_EXCHANGE_RATE,
      total_fob_value: '0',
      freight_value: '0',
      insurance_value: '0',
      handling_fees: '0',
      ground_fees: '0',
      other_charges: '0',
      customs_duty: '0',
      vat_amount: '0',
      shipment_currency_code: '',
      notes: '',
    });
    setItems([]);
    setEditMode(false);
    setSelectedDeclaration(null);
    setModalOpen(true);
  };

  const handleOpenEdit = async (declaration: CustomsDeclaration) => {
    // Fetch full declaration details including items
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/customs-declarations/${declaration.id}`);
      
      if (!response.success || !response.data) {
        showToast(locale === 'ar' ? 'فشل في تحميل تفاصيل البيان' : 'Failed to load declaration details', 'error');
        setLoading(false);
        return;
      }
      
      const fullDeclaration = response.data;
      
      setFormData({
        declaration_type_id: fullDeclaration.declaration_type_id?.toString() || '',
        status_id: fullDeclaration.status_id?.toString() || '',
        declaration_date: fullDeclaration.declaration_date?.split('T')[0] || '',
        shipment_id: fullDeclaration.shipment_id?.toString() || '',
        project_id: fullDeclaration.project_id?.toString() || '',
        project_code: '',
        project_name: fullDeclaration.project_name || '',
        customs_office_name: fullDeclaration.customs_office_name || '',
        port_id: fullDeclaration.port_id?.toString() || '',
        entry_point_name: fullDeclaration.entry_point_name || '',
        transport_mode: fullDeclaration.transport_mode || 'sea',
        bl_number: fullDeclaration.bl_number || '',
        awb_number: fullDeclaration.awb_number || '',
        manifest_number: fullDeclaration.manifest_number || '',
        vessel_name: fullDeclaration.vessel_name || '',
        voyage_number: fullDeclaration.voyage_number || '',
        origin_country_id: fullDeclaration.origin_country_id?.toString() || '',
        destination_country_id: fullDeclaration.destination_country_id?.toString() || '',
        currency_id: fullDeclaration.currency_id?.toString() || '',
        exchange_rate: fullDeclaration.exchange_rate?.toString() || DEFAULT_EXCHANGE_RATE,
        total_fob_value: fullDeclaration.total_fob_value?.toString() || '0',
        freight_value: fullDeclaration.freight_value?.toString() || '0',
        insurance_value: fullDeclaration.insurance_value?.toString() || '0',
        handling_fees: fullDeclaration.handling_fees?.toString() || '0',
        ground_fees: fullDeclaration.ground_fees?.toString() || '0',
        other_charges: fullDeclaration.other_charges?.toString() || '0',
        customs_duty: fullDeclaration.total_customs_duty?.toString() || '0',
        vat_amount: fullDeclaration.total_vat?.toString() || '0',
        shipment_currency_code: fullDeclaration.currency_code || '',
        notes: fullDeclaration.notes || '',
      });
      
      // Map items from API response to DeclarationItem format
      const declarationItems: DeclarationItem[] = (fullDeclaration.items || []).map((item: any, index: number) => ({
        item_number: item.line_number || index + 1,
        hs_code: item.hs_code || '',
        description_ar: item.item_description || item.item_description_resolved || '',
        description_en: item.item_description || item.item_description_resolved || '',
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit_code || item.unit_name || 'PCS',
        unit_price: parseFloat(item.unit_price) || 0,
        total_value: parseFloat(item.cif_value) || parseFloat(item.fob_value) || 0,
        duty_type: item.duty_type || 'percentage',
        duty_rate: parseFloat(item.duty_rate) || 5,
        duty_amount: parseFloat(item.duty_amount) || 0,
        vat_amount: parseFloat(item.vat_amount) || 0,
        allocated_shared_fees: parseFloat(item.other_fees) || 0,
        total_cost: parseFloat(item.total_fees) || 0,
        unit_cost: 0,
      }));
      
      setItems(declarationItems);
      setSelectedDeclaration(fullDeclaration);
      setEditMode(true);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching declaration details:', error);
      showToast(locale === 'ar' ? 'خطأ في تحميل البيان' : 'Error loading declaration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [loadingShipment, setLoadingShipment] = useState(false);

  const handleShipmentChange = async (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === Number(shipmentId));
    
    if (shipment?.has_declaration && !editMode) {
      showToast(
        locale === 'ar' 
          ? 'هذه الشحنة لديها بيان جمركي بالفعل' 
          : 'This shipment already has a customs declaration',
        'warning'
      );
      return;
    }
    
    // Reset if no shipment selected
    if (!shipmentId) {
      setFormData(prev => ({ 
        ...prev, 
        shipment_id: '',
        project_id: '',
        project_code: '',
        project_name: '',
        bl_number: '',
        port_id: '',
        origin_country_id: '',
        destination_country_id: '',
        shipment_currency_code: '',
      }));
      setItems([]);
      return;
    }

    setFormData(prev => ({ ...prev, shipment_id: shipmentId }));
    setLoadingShipment(true);

    try {
      // Fetch full shipment details including items
      const response = await apiClient.get(`/api/logistics-shipments/${shipmentId}`);
      
      if (response.success && response.data) {
        const shipmentData = response.data;
        
        // Determine declaration type based on shipment type (import/export/transit)
        // Default to import type (first type with direction='import')
        let declarationTypeId = formData.declaration_type_id;
        if (shipmentData.shipment_type_code) {
          const shipmentTypeCode = shipmentData.shipment_type_code?.toLowerCase();
          if (shipmentTypeCode.includes('import') || shipmentTypeCode.includes('استيراد')) {
            const importType = types.find(t => t.direction === 'import');
            if (importType) declarationTypeId = importType.id.toString();
          } else if (shipmentTypeCode.includes('export') || shipmentTypeCode.includes('تصدير')) {
            const exportType = types.find(t => t.direction === 'export');
            if (exportType) declarationTypeId = exportType.id.toString();
          } else if (shipmentTypeCode.includes('transit') || shipmentTypeCode.includes('ترانزيت')) {
            const transitType = types.find(t => t.direction === 'transit');
            if (transitType) declarationTypeId = transitType.id.toString();
          }
        }
        
        // Auto-populate form fields from shipment data
        setFormData(prev => ({
          ...prev,
          shipment_id: shipmentId,
          // Declaration type based on shipment type
          declaration_type_id: declarationTypeId || prev.declaration_type_id,
          // Project info
          project_id: (shipmentData.project_id_resolved || shipmentData.project_id)?.toString() || '',
          project_code: shipmentData.project_code || '',
          project_name: shipmentData.project_name || '',
          // Transport details
          bl_number: shipmentData.bl_no || shipmentData.bl_number || '',
          transport_mode: shipmentData.transport_mode || prev.transport_mode,
          vessel_name: shipmentData.vessel_name || '',
          voyage_number: shipmentData.voyage_number || '',
          // Port of discharge (destination port for imports)
          port_id: shipmentData.port_of_discharge_id?.toString() || '',
          // Currency from PO
          currency_id: (shipmentData.shipment_currency_id || shipmentData.po_currency_id)?.toString() || prev.currency_id,
          shipment_currency_code: shipmentData.shipment_currency_code || shipmentData.po_currency_code || '',
          // Exchange rate - use PO rate or default to 3.75
          exchange_rate: shipmentData.po_exchange_rate?.toString() || DEFAULT_EXCHANGE_RATE,
          // Countries
          origin_country_id: shipmentData.origin_country_id?.toString() || '',
          destination_country_id: shipmentData.destination_country_id?.toString() || '',
        }));

        // Auto-populate items from shipment items
        if (shipmentData.items && Array.isArray(shipmentData.items) && shipmentData.items.length > 0) {
          const declarationItems: DeclarationItem[] = shipmentData.items.map((item: any, index: number) => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.po_unit_price || item.unit_cost) || 0;
            const totalValue = parseFloat(item.po_total_cost || item.total_cost) || (quantity * unitPrice);
            
            return {
              item_number: index + 1,
              hs_code: item.hs_code || '',
              description_en: item.name || item.item_display_name || '',
              description_ar: item.name_ar || item.item_display_name_ar || '',
              quantity: quantity,
              unit: item.unit_code || item.uom_code || 'PCS',
              unit_price: unitPrice,
              total_value: totalValue,
              duty_rate: 0, // Default, user will set based on HS code
              duty_type: 'percentage' as const,
              duty_amount: 0,
              vat_rate: 15, // Default VAT rate
              vat_amount: 0,
              allocated_shared_fees: 0,
              total_cost: totalValue,
              unit_cost: unitPrice,
            };
          });
          
          setItems(declarationItems);
          
          // Calculate FOB value from items
          const totalFOB = declarationItems.reduce((sum, item) => sum + item.total_value, 0);
          setFormData(prev => ({
            ...prev,
            total_fob_value: totalFOB.toFixed(2),
          }));
          
          showToast(
            locale === 'ar' 
              ? `تم تحميل ${declarationItems.length} صنف من الشحنة` 
              : `Loaded ${declarationItems.length} items from shipment`,
            'success'
          );
        }
      }
    } catch (error) {
      console.error('Error fetching shipment details:', error);
      showToast(
        locale === 'ar' 
          ? 'خطأ في تحميل بيانات الشحنة' 
          : 'Error loading shipment data',
        'error'
      );
    } finally {
      setLoadingShipment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Shipment is required
    if (!formData.shipment_id) {
      showToast(
        locale === 'ar' 
          ? 'يجب اختيار الشحنة المرتبطة' 
          : 'Linked shipment is required',
        'error'
      );
      return;
    }
    
    // Calculate total fees for validation
    const totalFeesAmount = itemsTotals.totalDuty + itemsTotals.totalVAT + totalSharedFees;
    
    // Validation: Fees must be greater than 0
    if (totalFeesAmount <= 0) {
      showToast(
        locale === 'ar' 
          ? 'لا يمكن حفظ البيان الجمركي بدون رسوم أو بمبلغ 0 ريال' 
          : 'Cannot save declaration with 0 fees. Please add customs duties or fees.',
        'error'
      );
      return;
    }
    
    if (!editMode) {
      const existingDeclaration = declarations.find(
        d => d.shipment_id === parseInt(formData.shipment_id)
      );
      if (existingDeclaration) {
        showToast(
          locale === 'ar' 
            ? 'لا يمكن إضافة أكثر من بيان جمركي لنفس الشحنة' 
            : 'Cannot add more than one declaration per shipment',
          'error'
        );
        return;
      }
    }
    
    setSaving(true);
    
    try {
      const endpoint = editMode 
        ? `/api/customs-declarations/${selectedDeclaration?.id}`
        : '/api/customs-declarations';
      
      const payload = {
        declaration_type_id: parseInt(formData.declaration_type_id),
        status_id: formData.status_id ? parseInt(formData.status_id) : null,
        declaration_date: formData.declaration_date,
        shipment_id: formData.shipment_id ? parseInt(formData.shipment_id) : null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        customs_office_name: formData.customs_office_name || null,
        port_id: formData.port_id ? parseInt(formData.port_id) : null,
        entry_point_name: formData.entry_point_name || null,
        transport_mode: formData.transport_mode || null,
        bl_number: formData.bl_number || null,
        awb_number: formData.awb_number || null,
        manifest_number: formData.manifest_number || null,
        vessel_name: formData.vessel_name || null,
        voyage_number: formData.voyage_number || null,
        origin_country_id: formData.origin_country_id ? parseInt(formData.origin_country_id) : null,
        destination_country_id: formData.destination_country_id ? parseInt(formData.destination_country_id) : null,
        currency_id: formData.currency_id ? parseInt(formData.currency_id) : null,
        exchange_rate: parseFloat(formData.exchange_rate) || 1,
        total_fob_value: parseFloat(formData.total_fob_value) || 0,
        freight_value: parseFloat(formData.freight_value) || 0,
        insurance_value: parseFloat(formData.insurance_value) || 0,
        total_cif_value: calculatedCIF,
        handling_fees: parseFloat(formData.handling_fees) || 0,
        ground_fees: parseFloat(formData.ground_fees) || 0,
        other_charges: parseFloat(formData.other_charges) || 0,
        total_customs_duty: itemsTotals.totalDuty,
        total_vat: itemsTotals.totalVAT,
        total_fees: itemsTotals.totalDuty + itemsTotals.totalVAT + totalSharedFees,
        notes: formData.notes || null,
        items: itemsWithDistribution.map(item => ({
          ...item,
          id: item.id || undefined,
        })),
        distribution_method: distributionMethod,
      };
      
      const data = editMode 
        ? await apiClient.put(endpoint, payload)
        : await apiClient.post(endpoint, payload);
      
      if (data.success) {
        showToast(
          locale === 'ar' 
            ? (editMode ? 'تم تحديث البيان بنجاح' : 'تم إنشاء البيان بنجاح')
            : (editMode ? 'Declaration updated successfully' : 'Declaration created successfully'),
          'success'
        );
        setModalOpen(false);
        fetchData();
      } else {
        showToast(data.error?.message || 'Error', 'error');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      showToast(error.message || (locale === 'ar' ? 'خطأ في الحفظ' : 'Error saving'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!declarationToDelete) return;
    setDeleting(true);
    
    try {
      const data = await apiClient.delete(`/api/customs-declarations/${declarationToDelete}`);
      
      if (data.success) {
        showToast(locale === 'ar' ? 'تم حذف البيان' : 'Declaration deleted', 'success');
        fetchData();
      } else {
        showToast(data.error?.message || 'Error', 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'خطأ في الحذف' : 'Error deleting', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeclarationToDelete(null);
    }
  };

  const handleView = (declaration: CustomsDeclaration) => {
    setSelectedDeclaration(declaration);
    setViewModalOpen(true);
  };

  // =====================================================
  // ITEM HANDLERS
  // =====================================================
  const handleAddItem = () => {
    setCurrentItem({
      item_number: items.length + 1,
      hs_code: '',
      description_en: '',
      description_ar: '',
      quantity: 1,
      unit: 'PCS',
      unit_price: 0,
      total_value: 0,
      duty_rate: 0,
      duty_type: 'percentage',
      duty_amount: 0,
      vat_rate: 15,
      vat_amount: 0,
      allocated_shared_fees: 0,
      total_cost: 0,
      unit_cost: 0,
    });
    setEditingItemIndex(null);
    setItemFormOpen(true);
  };

  const handleEditItem = (index: number) => {
    setCurrentItem({ ...items[index] });
    setEditingItemIndex(index);
    setItemFormOpen(true);
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveItem = () => {
    if (!currentItem) return;

    let dutyAmount = 0;
    if (currentItem.duty_type === 'percentage') {
      dutyAmount = (currentItem.total_value * currentItem.duty_rate) / 100;
    } else if (currentItem.duty_type === 'fixed') {
      dutyAmount = currentItem.duty_rate;
    }

    const vatBase = currentItem.total_value + dutyAmount;
    const vatAmount = (vatBase * currentItem.vat_rate) / 100;

    const updatedItem: DeclarationItem = {
      ...currentItem,
      duty_amount: Math.round(dutyAmount * 100) / 100,
      vat_amount: Math.round(vatAmount * 100) / 100,
    };

    if (editingItemIndex !== null) {
      setItems(prev => prev.map((item, i) => i === editingItemIndex ? updatedItem : item));
    } else {
      setItems(prev => [...prev, updatedItem]);
    }

    setItemFormOpen(false);
    setCurrentItem(null);
    setEditingItemIndex(null);
  };

  const handleItemFieldChange = (field: keyof DeclarationItem, value: any) => {
    if (!currentItem) return;
    
    const updated = { ...currentItem, [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      updated.total_value = updated.quantity * updated.unit_price;
    }
    
    setCurrentItem(updated);
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'البيانات الجمركية - SLMS' : 'Customs Declarations - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'البيانات الجمركية' : 'Customs Declarations'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة البيانات والتخليص الجمركي' : 'Manage customs declarations and clearance'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchData} disabled={loading}>
              <ArrowPathIcon className={clsx('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            {canCreate && (
              <Button onClick={handleOpenCreate}>
                <PlusIcon className="h-4 w-4 mr-1" />
                {locale === 'ar' ? 'بيان جديد' : 'New Declaration'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي البيانات' : 'Total'}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalDeclarations}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مُفسَّح' : 'Cleared'}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{clearedDeclarations}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <ClockIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد المراجعة' : 'Pending'}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{pendingDeclarations}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الرسوم' : 'Total Fees'}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalFees)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="all">{locale === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
              {types.map(type => (
                <option key={type.id} value={type.id}>
                  {locale === 'ar' ? type.name_ar : type.name_en}
                </option>
              ))}
            </Select>
            <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="all">{locale === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
              {statuses.map(status => (
                <option key={status.id} value={status.id}>
                  {locale === 'ar' ? status.name_ar : status.name_en}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
              </div>
            ) : filteredDeclarations.length === 0 ? (
              <div className="p-8 text-center">
                <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">{locale === 'ar' ? 'لا توجد بيانات' : 'No declarations found'}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{locale === 'ar' ? 'رقم البيان' : 'Declaration #'}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{locale === 'ar' ? 'إجمالي الرسوم' : 'Total Fees'}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDeclarations.map(declaration => (
                    <tr key={declaration.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">{declaration.declaration_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getDirectionBadge(declaration.type_direction)}
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {locale === 'ar' ? declaration.type_name_ar : declaration.type_name_en}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{declaration.shipment_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{declaration.declaration_date?.split('T')[0]}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor(declaration.status_color))}>
                          {locale === 'ar' ? declaration.status_name_ar : declaration.status_name_en}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{formatCurrency(declaration.total_fees)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onClick={() => handleView(declaration)}><EyeIcon className="h-4 w-4" /></Button>
                          {canUpdate && <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(declaration)}><PencilIcon className="h-4 w-4" /></Button>}
                          {canDelete && <Button size="sm" variant="danger" onClick={() => { setDeclarationToDelete(declaration.id); setDeleteConfirmOpen(true); }}><TrashIcon className="h-4 w-4" /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={locale === 'ar' ? (editMode ? 'تعديل البيان الجمركي' : 'بيان جمركي جديد') : (editMode ? 'Edit Declaration' : 'New Declaration')} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* STEP 1: Select Shipment (FIRST) */}
          <div className="border-b dark:border-gray-700 pb-4 bg-blue-50 dark:bg-blue-900/20 -mx-6 px-6 py-4 -mt-4">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">
              {locale === 'ar' ? '1. اختر الشحنة المرتبطة *' : '1. Select Linked Shipment *'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Select 
                  label={locale === 'ar' ? 'الشحنة المرتبطة *' : 'Linked Shipment *'} 
                  value={formData.shipment_id} 
                  onChange={(e) => handleShipmentChange(e.target.value)} 
                  disabled={loadingShipment}
                  required
                >
                  <option value="">{locale === 'ar' ? '-- اختر الشحنة --' : '-- Select Shipment --'}</option>
                  {availableShipments.map(shipment => (
                    <option key={shipment.id} value={shipment.id}>
                      {shipment.shipment_number} {shipment.project_code ? `(${shipment.project_code})` : ''}
                    </option>
                  ))}
                </Select>
                {loadingShipment && (
                  <div className="absolute left-2 top-8">
                    <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-500" />
                  </div>
                )}
                {shipments.length > availableShipments.length && !editMode && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    <ExclamationTriangleIcon className="h-3 w-3 inline mr-1" />
                    {locale === 'ar' 
                      ? `${shipments.length - availableShipments.length} شحنة لديها بيانات جمركية سابقة` 
                      : `${shipments.length - availableShipments.length} shipments already have declarations`}
                  </p>
                )}
              </div>
              
              {/* Project info (auto-populated) */}
              {formData.project_code && (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'رقم المشروع' : 'Project'}</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.project_code} - {formData.project_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: Auto-populated Shipment Details (show only if shipment selected) */}
          {formData.shipment_id && (
            <div className="border-b dark:border-gray-700 pb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {locale === 'ar' ? '2. بيانات الشحنة (تلقائية)' : '2. Shipment Details (Auto-filled)'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Declaration Type */}
                <Select 
                  label={locale === 'ar' ? 'نوع البيان *' : 'Declaration Type *'} 
                  value={formData.declaration_type_id} 
                  onChange={(e) => setFormData({ ...formData, declaration_type_id: e.target.value })} 
                  required
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {types.map(type => (
                    <option key={type.id} value={type.id}>
                      {locale === 'ar' ? type.name_ar : type.name_en}
                    </option>
                  ))}
                </Select>
                
                {/* Status */}
                <Select 
                  label={locale === 'ar' ? 'حالة البيان *' : 'Status *'} 
                  value={formData.status_id} 
                  onChange={(e) => setFormData({ ...formData, status_id: e.target.value })} 
                  required
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {statuses.map(status => (
                    <option key={status.id} value={status.id}>
                      {locale === 'ar' ? status.name_ar : status.name_en}
                    </option>
                  ))}
                </Select>
                
                {/* Declaration Date */}
                <Input 
                  label={locale === 'ar' ? 'تاريخ البيان *' : 'Declaration Date *'} 
                  type="date" 
                  value={formData.declaration_date} 
                  onChange={(e) => setFormData({ ...formData, declaration_date: e.target.value })} 
                  required 
                />
                
                {/* BL Number */}
                <Input 
                  label={locale === 'ar' ? 'رقم البوليصة' : 'BL Number'} 
                  value={formData.bl_number} 
                  onChange={(e) => setFormData({ ...formData, bl_number: e.target.value })} 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                {/* Port */}
                <Select 
                  label={locale === 'ar' ? 'ميناء الوصول' : 'Port of Discharge'} 
                  value={formData.port_id} 
                  onChange={(e) => setFormData({ ...formData, port_id: e.target.value })}
                >
                  <option value="">{locale === 'ar' ? '-- اختر الميناء --' : '-- Select Port --'}</option>
                  {saudiPorts.map(port => (
                    <option key={port.id} value={port.id}>
                      {locale === 'ar' ? port.name_ar || port.name : port.name}
                    </option>
                  ))}
                </Select>
                
                {/* Origin Country */}
                <Select 
                  label={locale === 'ar' ? 'بلد المنشأ' : 'Origin Country'} 
                  value={formData.origin_country_id} 
                  onChange={(e) => setFormData({ ...formData, origin_country_id: e.target.value })}
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {countries.map((country: any) => (
                    <option key={country.id} value={country.id}>
                      {locale === 'ar' ? country.name_ar || country.name : country.name}
                    </option>
                  ))}
                </Select>
                
                {/* Destination Country */}
                <Select 
                  label={locale === 'ar' ? 'بلد الوصول' : 'Destination Country'} 
                  value={formData.destination_country_id} 
                  onChange={(e) => setFormData({ ...formData, destination_country_id: e.target.value })}
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {countries.map((country: any) => (
                    <option key={country.id} value={country.id}>
                      {locale === 'ar' ? country.name_ar || country.name : country.name}
                    </option>
                  ))}
                </Select>
                
                {/* Transport Mode */}
                <Select 
                  label={locale === 'ar' ? 'طريقة النقل' : 'Transport Mode'} 
                  value={formData.transport_mode} 
                  onChange={(e) => setFormData({ ...formData, transport_mode: e.target.value })}
                >
                  <option value="sea">{locale === 'ar' ? 'بحري' : 'Sea'}</option>
                  <option value="air">{locale === 'ar' ? 'جوي' : 'Air'}</option>
                  <option value="land">{locale === 'ar' ? 'بري' : 'Land'}</option>
                </Select>
              </div>
            </div>
          )}
          
          {/* Show loaded shipment info */}
          {formData.shipment_id && items.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="font-medium">
                  {locale === 'ar' 
                    ? `تم تحميل ${items.length} صنف من الشحنة بعملة ${formData.shipment_currency_code || 'SAR'}` 
                    : `${items.length} items loaded from shipment (${formData.shipment_currency_code || 'SAR'})`}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Values & Currency (show only if shipment selected) */}
          {formData.shipment_id && (
          <div className="border-b dark:border-gray-700 pb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {locale === 'ar' ? '3. القيم والعملة' : '3. Values & Currency'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select label={locale === 'ar' ? 'العملة *' : 'Currency *'} value={formData.currency_id} onChange={(e) => setFormData({ ...formData, currency_id: e.target.value })} required>
                <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                {currencies.map(currency => <option key={currency.id} value={currency.id}>{currency.code} - {locale === 'ar' ? currency.name_ar : currency.name}</option>)}
              </Select>
              <Input 
                label={locale === 'ar' ? 'سعر الصرف (ر.س)' : 'Exchange Rate (SAR)'} 
                type="number" 
                step="0.0001" 
                value={formData.exchange_rate} 
                onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })} 
                helperText={locale === 'ar' ? 'افتراضي: 3.75' : 'Default: 3.75'}
              />
              <Input label={locale === 'ar' ? 'قيمة FOB' : 'FOB Value'} type="number" step="0.01" value={formData.total_fob_value} onChange={(e) => setFormData({ ...formData, total_fob_value: e.target.value })} />
              <Input label={locale === 'ar' ? 'قيمة الشحن' : 'Freight'} type="number" step="0.01" value={formData.freight_value} onChange={(e) => setFormData({ ...formData, freight_value: e.target.value })} />
              <Input label={locale === 'ar' ? 'التأمين' : 'Insurance'} type="number" step="0.01" value={formData.insurance_value} onChange={(e) => setFormData({ ...formData, insurance_value: e.target.value })} />
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-800 dark:text-blue-300">{locale === 'ar' ? 'قيمة CIF المحسوبة' : 'Calculated CIF Value'}</span>
                <span className="text-lg font-bold text-blue-800 dark:text-blue-300">{formatCurrency(calculatedCIF)}</span>
              </div>
            </div>
          </div>
          )}

          {/* STEP 4: Shared Fees (show only if shipment selected) */}
          {formData.shipment_id && (
          <div className="border-b dark:border-gray-700 pb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {locale === 'ar' ? '4. الرسوم الجمركية والضريبة' : '4. Customs Duties & VAT'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input label={locale === 'ar' ? 'رسوم المناولة' : 'Handling Fees'} type="number" step="0.01" value={formData.handling_fees} onChange={(e) => setFormData({ ...formData, handling_fees: e.target.value })} />
              <Input label={locale === 'ar' ? 'رسوم الأرضيات' : 'Ground Fees'} type="number" step="0.01" value={formData.ground_fees} onChange={(e) => setFormData({ ...formData, ground_fees: e.target.value })} />
              <Input label={locale === 'ar' ? 'رسوم أخرى' : 'Other Charges'} type="number" step="0.01" value={formData.other_charges} onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })} />
              <Select label={locale === 'ar' ? 'طريقة التوزيع' : 'Distribution Method'} value={distributionMethod} onChange={(e) => setDistributionMethod(e.target.value as DistributionMethod)}>
                <option value="by_value">{locale === 'ar' ? 'حسب القيمة' : 'By Value'}</option>
                <option value="by_quantity">{locale === 'ar' ? 'حسب الكمية' : 'By Quantity'}</option>
                <option value="equal">{locale === 'ar' ? 'بالتساوي' : 'Equal'}</option>
              </Select>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-yellow-800 dark:text-yellow-300">{locale === 'ar' ? 'إجمالي الرسوم المشتركة' : 'Total Shared Fees'}</span>
                  <span className="text-lg font-bold text-yellow-800 dark:text-yellow-300">{formatCurrency(totalSharedFees)}</span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-purple-800 dark:text-purple-300">{locale === 'ar' ? 'إجمالي الرسوم الكلية' : 'Total All Fees'}</span>
                  <span className="text-lg font-bold text-purple-800 dark:text-purple-300">{formatCurrency(itemsTotals.totalDuty + itemsTotals.totalVAT + totalSharedFees)}</span>
                </div>
              </div>
            </div>
            {(itemsTotals.totalDuty + itemsTotals.totalVAT + totalSharedFees) <= 0 && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                <p className="text-sm text-red-800 dark:text-red-300">
                  <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                  {locale === 'ar' 
                    ? 'لا يمكن حفظ البيان الجمركي بدون رسوم أو بمبلغ 0 ريال' 
                    : 'Cannot save declaration with 0 fees'}
                </p>
              </div>
            )}
          </div>
          )}

          {/* STEP 5: Items (show only if shipment selected) */}
          {formData.shipment_id && (
          <div className="border-b dark:border-gray-700 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {locale === 'ar' ? '5. أصناف البيان' : '5. Declaration Items'}
              </h3>
              <Button type="button" size="sm" onClick={handleAddItem}><PlusIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'إضافة صنف' : 'Add Item'}</Button>
            </div>
            {itemsWithDistribution.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <CubeIcon className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">{locale === 'ar' ? 'لا توجد أصناف - أضف أصنافاً لحساب التكلفة' : 'No items - Add items to calculate costs'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-right">#</th>
                      <th className="px-2 py-2 text-right">{locale === 'ar' ? 'البند' : 'HS Code'}</th>
                      <th className="px-2 py-2 text-right">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                      <th className="px-2 py-2 text-right">{locale === 'ar' ? 'الكمية' : 'Qty'}</th>
                      <th className="px-2 py-2 text-right">{locale === 'ar' ? 'القيمة' : 'Value'}</th>
                      <th className="px-2 py-2 text-right">{locale === 'ar' ? 'نوع الرسم' : 'Duty Type'}</th>
                      <th className="px-2 py-2 text-right">{locale === 'ar' ? 'الرسم' : 'Duty'}</th>
                      <th className="px-2 py-2 text-right">{locale === 'ar' ? 'الضريبة' : 'VAT'}</th>
                      <th className="px-2 py-2 text-right">{locale === 'ar' ? 'نصيب المشترك' : 'Shared'}</th>
                      <th className="px-2 py-2 text-right">{locale === 'ar' ? 'التكلفة' : 'Total Cost'}</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsWithDistribution.map((item, index) => (
                      <tr key={index} className="border-b dark:border-gray-700">
                        <td className="px-2 py-2">{item.item_number}</td>
                        <td className="px-2 py-2">{item.hs_code}</td>
                        <td className="px-2 py-2 max-w-[150px] truncate">{locale === 'ar' ? item.description_ar : item.description_en}</td>
                        <td className="px-2 py-2">{item.quantity} {item.unit}</td>
                        <td className="px-2 py-2">{formatCurrency(item.total_value)}</td>
                        <td className="px-2 py-2">
                          <span className={clsx('px-1.5 py-0.5 text-xs rounded', item.duty_type === 'exempt' ? 'bg-green-100 text-green-800' : item.duty_type === 'fixed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800')}>
                            {item.duty_type === 'exempt' ? (locale === 'ar' ? 'معفى' : 'Exempt') : item.duty_type === 'fixed' ? (locale === 'ar' ? 'قطعي' : 'Fixed') : `${item.duty_rate}%`}
                          </span>
                        </td>
                        <td className="px-2 py-2">{formatCurrency(item.duty_amount)}</td>
                        <td className="px-2 py-2">{formatCurrency(item.vat_amount)}</td>
                        <td className="px-2 py-2 text-yellow-600">{formatCurrency(item.allocated_shared_fees)}</td>
                        <td className="px-2 py-2 font-medium">{formatCurrency(item.total_cost)}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button type="button" onClick={() => handleEditItem(index)} className="text-blue-600 hover:text-blue-800"><PencilIcon className="h-4 w-4" /></button>
                            <button type="button" onClick={() => handleDeleteItem(index)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 dark:bg-gray-700 font-medium">
                    <tr>
                      <td colSpan={4} className="px-2 py-2 text-right">{locale === 'ar' ? 'الإجمالي' : 'Total'}</td>
                      <td className="px-2 py-2">{formatCurrency(itemsTotals.totalValue)}</td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2">{formatCurrency(itemsTotals.totalDuty)}</td>
                      <td className="px-2 py-2">{formatCurrency(itemsTotals.totalVAT)}</td>
                      <td className="px-2 py-2 text-yellow-600">{formatCurrency(itemsTotals.totalAllocated)}</td>
                      <td className="px-2 py-2">{formatCurrency(itemsTotals.totalCost)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button type="submit" loading={saving}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </form>
      </Modal>

      {/* Item Form Modal */}
      <Modal isOpen={itemFormOpen} onClose={() => setItemFormOpen(false)} title={locale === 'ar' ? (editingItemIndex !== null ? 'تعديل الصنف' : 'إضافة صنف') : (editingItemIndex !== null ? 'Edit Item' : 'Add Item')} size="lg">
        {currentItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={locale === 'ar' ? 'رمز البند الجمركي' : 'HS Code'} value={currentItem.hs_code} onChange={(e) => handleItemFieldChange('hs_code', e.target.value)} required />
              <Input label={locale === 'ar' ? 'الكمية' : 'Quantity'} type="number" value={currentItem.quantity} onChange={(e) => handleItemFieldChange('quantity', parseFloat(e.target.value) || 0)} required />
              <Input label={locale === 'ar' ? 'الوصف بالعربية' : 'Description (Arabic)'} value={currentItem.description_ar} onChange={(e) => handleItemFieldChange('description_ar', e.target.value)} />
              <Input label={locale === 'ar' ? 'الوصف بالإنجليزية' : 'Description (English)'} value={currentItem.description_en} onChange={(e) => handleItemFieldChange('description_en', e.target.value)} />
              <Input label={locale === 'ar' ? 'سعر الوحدة' : 'Unit Price'} type="number" step="0.01" value={currentItem.unit_price} onChange={(e) => handleItemFieldChange('unit_price', parseFloat(e.target.value) || 0)} />
              <Input label={locale === 'ar' ? 'القيمة الإجمالية' : 'Total Value'} type="number" step="0.01" value={currentItem.total_value} onChange={(e) => handleItemFieldChange('total_value', parseFloat(e.target.value) || 0)} />
              <Select label={locale === 'ar' ? 'نوع الرسم' : 'Duty Type'} value={currentItem.duty_type} onChange={(e) => handleItemFieldChange('duty_type', e.target.value)}>
                <option value="percentage">{locale === 'ar' ? 'نسبة مئوية' : 'Percentage'}</option>
                <option value="fixed">{locale === 'ar' ? 'قطعي (مبلغ ثابت)' : 'Fixed Amount'}</option>
                <option value="exempt">{locale === 'ar' ? 'معفى' : 'Exempt'}</option>
              </Select>
              {currentItem.duty_type !== 'exempt' && (
                <Input label={currentItem.duty_type === 'percentage' ? (locale === 'ar' ? 'نسبة الرسم %' : 'Duty Rate %') : (locale === 'ar' ? 'مبلغ الرسم' : 'Duty Amount')} type="number" step="0.01" value={currentItem.duty_rate} onChange={(e) => handleItemFieldChange('duty_rate', parseFloat(e.target.value) || 0)} />
              )}
              <Input label={locale === 'ar' ? 'نسبة الضريبة %' : 'VAT Rate %'} type="number" step="0.01" value={currentItem.vat_rate} onChange={(e) => handleItemFieldChange('vat_rate', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button type="button" onClick={handleSaveItem}>{locale === 'ar' ? 'حفظ الصنف' : 'Save Item'}</Button>
              <Button type="button" variant="secondary" onClick={() => setItemFormOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={locale === 'ar' ? 'تفاصيل البيان الجمركي' : 'Declaration Details'} size="xl">
        {selectedDeclaration && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{selectedDeclaration.declaration_number}</h3>
              <div className="flex gap-2">
                {getDirectionBadge(selectedDeclaration.type_direction)}
                <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor(selectedDeclaration.status_color))}>
                  {locale === 'ar' ? selectedDeclaration.status_name_ar : selectedDeclaration.status_name_en}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'قيمة CIF' : 'CIF Value'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedDeclaration.total_cif_value)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الرسوم الجمركية' : 'Customs Duty'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedDeclaration.total_customs_duty)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الضريبة' : 'VAT'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedDeclaration.total_vat)}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-xs text-blue-500">{locale === 'ar' ? 'إجمالي الرسوم' : 'Total Fees'}</p>
                <p className="font-bold text-blue-800 dark:text-blue-300">{formatCurrency(selectedDeclaration.total_fees)}</p>
              </div>
            </div>
            {selectedDeclaration.items && selectedDeclaration.items.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">{locale === 'ar' ? 'الأصناف' : 'Items'}</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border dark:border-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-2 py-1 text-right">{locale === 'ar' ? 'البند' : 'HS Code'}</th>
                        <th className="px-2 py-1 text-right">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                        <th className="px-2 py-1 text-right">{locale === 'ar' ? 'القيمة' : 'Value'}</th>
                        <th className="px-2 py-1 text-right">{locale === 'ar' ? 'الرسم' : 'Duty'}</th>
                        <th className="px-2 py-1 text-right">{locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDeclaration.items.map((item, i) => (
                        <tr key={i} className="border-t dark:border-gray-700">
                          <td className="px-2 py-1">{item.hs_code}</td>
                          <td className="px-2 py-1">{locale === 'ar' ? item.description_ar : item.description_en}</td>
                          <td className="px-2 py-1">{formatCurrency(item.total_value)}</td>
                          <td className="px-2 py-1">{formatCurrency(item.duty_amount)}</td>
                          <td className="px-2 py-1">{formatCurrency(item.unit_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} onConfirm={handleDelete} title={locale === 'ar' ? 'حذف البيان' : 'Delete Declaration'} message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا البيان؟' : 'Are you sure you want to delete this declaration?'} confirmText={locale === 'ar' ? 'حذف' : 'Delete'} variant="danger" loading={deleting} />
    </MainLayout>
  );
}
