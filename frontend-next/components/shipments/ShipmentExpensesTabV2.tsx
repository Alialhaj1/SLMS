/**
 * 📦 SHIPMENT EXPENSES TAB V2
 * ===========================
 * Enhanced shipment expenses with dynamic fields based on expense type
 * 
 * Features:
 * - 17 expense types with dynamic field rendering
 * - Auto-fill project ID and BL number from shipment
 * - Currency conversion (original → shipment → base)
 * - Reference data dropdowns (insurance, clearance, labs, agents)
 * - Approval workflow (draft → approved → posted)
 * - Cost summary with unit cost calculation
 */

import React, { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import CurrencySelector from '@/components/shared/CurrencySelector';
import ExchangeRateField from '@/components/ui/ExchangeRateField';
import { amountToWords } from '@/utils/numberToWords';
import { 
  PlusIcon, 
  CheckIcon, 
  XMarkIcon,
  LockClosedIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import apiClient from '@/lib/apiClient';

// =====================================================
// TYPES
// =====================================================
interface ShipmentExpense {
  id: number;
  expense_request_id?: number;
  expense_type_id: number;
  expense_type_code: string;
  expense_type_name_en: string;
  expense_type_name_ar: string;
  expense_category: string;
  account_id?: number;
  account_code?: string;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  currency_code: string;
  currency_id: number;
  currency_symbol: string;
  exchange_rate: number;
  total_in_base_currency: number;
  expense_date: string;
  approval_status: string;
  is_posted: boolean;
  distribution_method?: string;
  
  // Optional linked entities
  insurance_company_name?: string;
  clearance_office_name?: string;
  laboratory_name?: string;
  shipping_agent_name?: string;
  port_name?: string;
  
  // LC fields
  lc_id?: number;
  lc_number?: string;
  bank_id?: number;
  lc_bank_name?: string;
  
  // Insurance
  insurance_company_id?: number;
  insurance_policy_number?: string;
  
  // Shipping
  shipping_agent_id?: number;
  
  // Clearance
  clearance_office_id?: number;
  port_id?: number;
  
  // Laboratory
  laboratory_id?: number;
  certificate_number?: string;
  
  // Customs
  customs_declaration_number?: string;
  declaration_type?: string;
  declaration_date?: string;
  
  // Transport
  transport_from?: string;
  transport_to?: string;
  container_count?: number;
  driver_name?: string;
  receiver_name?: string;
  
  // References
  invoice_number?: string;
  receipt_number?: string;
  payment_reference?: string;
  description?: string;
  notes?: string;
}

interface ExpenseType {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  category: string;
  analytic_account_code: string;
  requires_lc: boolean;
  requires_insurance_company: boolean;
  requires_shipping_agent: boolean;
  requires_clearance_office: boolean;
  requires_laboratory: boolean;
  requires_customs_declaration: boolean;
  requires_port: boolean;
  default_vat_rate: number;
  is_vat_exempt: boolean;
  required_fields: string[];
  optional_fields: string[];
}

// Expense account from Chart of Accounts linked to expense types
interface ExpenseAccount {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  level: number;
  is_active: boolean;
  is_group: boolean;
  allow_posting: boolean;
  expense_type_id: number | null;
  expense_type_code: string | null;
  expense_type_name: string | null;
  expense_type_name_ar: string | null;
  expense_category: string | null;
  requires_lc: boolean;
  requires_insurance_company: boolean;
  requires_shipping_agent: boolean;
  requires_clearance_office: boolean;
  requires_laboratory: boolean;
  requires_customs_declaration: boolean;
  requires_port: boolean;
  default_vat_rate: number | null;
  is_vat_exempt: boolean;
  required_fields: string[];
  optional_fields: string[];
}

interface ParentAccount {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  level: number;
  children_count: number;
  is_default: boolean;
}

interface ExpenseAccountsData {
  parent: { id: number; code: string; name: string; name_ar: string; level: number; } | null;
  children: ExpenseAccount[];
}

interface CostSummary {
  total_cost_before_vat: number;
  total_vat: number;
  total_cost: number;
  total_approved_cost: number;
  total_pending_cost: number;
  expense_count: number;
  approved_count: number;
  posted_count: number;
}

interface ShipmentInfo {
  id: number;
  shipment_number: string;
  bl_number?: string;
  bl_no?: string;
  project_id: number;
  project_code: string;
  project_name: string;
  currency_code: string;
  exchange_rate: number;
  // Extended fields for customs declaration auto-population
  shipment_type_id?: number;
  shipment_type_code?: string;
  shipment_type_name?: string;
  port_of_discharge_id?: number;
  port_of_discharge_name?: string;
  port_of_discharge_name_ar?: string;
  port_of_loading_id?: number;
  port_of_loading_name?: string;
  origin_country_id?: number;
  origin_country_name?: string;
  destination_country_id?: number;
  destination_country_name?: string;
  currency_id?: number;
  currency_symbol?: string;
  total_value?: number;
  freight_charges?: number;
  insurance_value?: number;
  // PO linked data
  po_total_value?: number;
  po_currency_id?: number;
  po_currency_code?: string;
}

interface ReferenceData {
  id: number;
  code: string;
  name: string;
  name_ar: string;
}

// Customs duty breakdown per item
interface CustomsDutyItem {
  po_item_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  item_name_ar: string;
  hs_code: string | null;
  hs_description_en: string | null;
  hs_description_ar: string | null;
  quantity: number;
  unit_price: number;
  item_total: number;
  // Computed/enriched fields (calculated client-side for display)
  item_value_local?: number;
  currency_code: string;
  duty_rate_percent: number;
  is_exempt: boolean;
  duty_amount: number;
  duty_amount_local: number;
  additional_fees_share?: number;
  total_duty_share?: number;
  total_item_cost?: number;
  tariff_notes_en: string | null;
  tariff_notes_ar: string | null;
}

interface CustomsDutyBreakdown {
  items: CustomsDutyItem[];
  summary: {
    total_goods_value: number;
    total_duty: number;
    total_duty_local: number;
    currency_code: string;
    exchange_rate: number;
    total_additional_fees?: number;
    grand_total_local?: number;
  };
}

// =====================================================
// COMPONENT
// =====================================================
export default function ShipmentExpensesTabV2({ 
  shipmentId, 
  isLocked 
}: { 
  shipmentId: number; 
  isLocked: boolean;
}) {
  const { locale, t } = useLocale();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  
  // State
  const [shipment, setShipment] = useState<ShipmentInfo | null>(null);
  const [expenses, setExpenses] = useState<ShipmentExpense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  const [baseCurrencyId, setBaseCurrencyId] = useState<string>('');
  const [baseCurrencyCode, setBaseCurrencyCode] = useState<string>('');
  
  // Parent Accounts (configurable: 1151010003, 2111010001, 3221020002)
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [selectedParentCode, setSelectedParentCode] = useState<string>('1151010003');
  
  // Expense Accounts from Chart of Accounts (children of selected parent)
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccountsData>({ parent: null, children: [] });
  const [selectedAccount, setSelectedAccount] = useState<ExpenseAccount | null>(null);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  
  // Reference data
  const [banks, setBanks] = useState<ReferenceData[]>([]);
  const [letterOfCredits, setLetterOfCredits] = useState<any[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<ReferenceData[]>([]);
  const [clearanceOffices, setClearanceOffices] = useState<ReferenceData[]>([]);
  const [laboratories, setLaboratories] = useState<ReferenceData[]>([]);
  const [shippingAgents, setShippingAgents] = useState<ReferenceData[]>([]);
  const [freightAgents, setFreightAgents] = useState<ReferenceData[]>([]);
  const [forwarders, setForwarders] = useState<ReferenceData[]>([]);
  const [transportCompanies, setTransportCompanies] = useState<ReferenceData[]>([]);
  const [saudiPorts, setSaudiPorts] = useState<ReferenceData[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [declarationTypes, setDeclarationTypes] = useState<any[]>([]);
  
  // Customs duty breakdown state
  const [dutyBreakdown, setDutyBreakdown] = useState<CustomsDutyBreakdown | null>(null);
  const [loadingDutyBreakdown, setLoadingDutyBreakdown] = useState(false);
  const [showDutyBreakdown, setShowDutyBreakdown] = useState(false);
  const [feeDistributionMethod, setFeeDistributionMethod] = useState<'quantity' | 'value'>('quantity');
  const [dutyCalculationMode, setDutyCalculationMode] = useState<'auto' | 'manual'>('auto');
  const [isExchangeRateManuallySet, setIsExchangeRateManuallySet] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<any>({
    expense_type_id: '',
    account_id: '',  // Add account_id to form data
    account_code: '',
    parent_account_code: '1151010003', // Default parent account
    amount_before_vat: '',
    vat_rate: '15',
    vat_amount: '',
    currency_id: '',
    exchange_rate: '3.75', // Default exchange rate for foreign currencies
    expense_date: new Date().toISOString().split('T')[0],
    distribution_method: 'value',
    
    // LC fields
    lc_id: '',
    lc_number: '',
    bank_id: '',
    lc_bank_name: '',
    
    // Insurance
    insurance_company_id: '',
    insurance_policy_number: '',
    
    // Shipping
    shipping_agent_id: '',
    entity_type: '', // freight_agent, forwarder, transport_company, clearing_agent
    entity_id: '',
    
    // Clearance
    clearance_office_id: '',
    port_id: '',
    
    // Laboratory
    laboratory_id: '',
    certificate_number: '',
    
    // Customs Declaration fields (for expense 8005)
    customs_declaration_number: '',
    declaration_type: '',
    declaration_type_id: '',
    declaration_date: '',
    customs_duty: '',
    total_fob_value: '',
    freight_value: '',
    insurance_value: '',
    handling_fees: '',
    ground_fees: '',
    other_charges: '',
    origin_country_id: '',
    destination_country_id: '',
    
    // Transport
    transport_from: '',
    transport_to: '',
    container_count: '',
    driver_name: '',
    receiver_name: '',
    
    // References
    invoice_number: '',
    receipt_number: '',
    description: '',
    notes: ''
  });
  
  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);
  
  // Permissions
  const canCreate = hasPermission('shipment_expenses:create') && !isLocked;
  const canUpdate = hasPermission('shipment_expenses:update') && !isLocked;
  const canDelete = hasPermission('shipment_expenses:delete') && !isLocked;
  const canApprove = hasPermission('shipment_expenses:approve');
  
  // =====================================================
  // EFFECTS
  // =====================================================
  useEffect(() => {
    fetchData();
  }, [shipmentId]);
  
  // Fetch child accounts when parent changes
  useEffect(() => {
    if (selectedParentCode) {
      fetchExpenseAccounts(selectedParentCode);
    }
  }, [selectedParentCode]);
  
  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchExpenses(),
      fetchExpenseTypes(),
      fetchParentAccounts(),
      fetchExpenseAccounts('1151010003'),
      fetchReferenceData(),
      fetchBaseCurrency()
    ]);
    setLoading(false);
  };
  
  const fetchExpenses = async () => {
    try {
      const data = await apiClient.get(`/api/shipment-expenses/shipment/${shipmentId}`);
      
      if (data.success) {
        setShipment(data.data.shipment);
        setExpenses(data.data.expenses || []);
        setCostSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showToast(t('failed_to_load_expenses'), 'error');
    }
  };
  
  // Fetch parent accounts (1151010003, 2111010001, 3221020002)
  const fetchParentAccounts = async () => {
    try {
      const data = await apiClient.get(`/api/shipment-expenses/parent-accounts`);
      
      if (data.success && data.data) {
        setParentAccounts(data.data);
        // Set default parent
        const defaultParent = data.data.find((p: ParentAccount) => p.is_default);
        if (defaultParent) {
          setSelectedParentCode(defaultParent.code);
        }
      }
    } catch (error) {
      console.error('Error fetching parent accounts:', error);
    }
  };
  
  // Fetch expense accounts from Chart of Accounts (children of selected parent)
  const fetchExpenseAccounts = async (parentCode: string = '1151010003') => {
    try {
      const data = await apiClient.get(`/api/shipment-expenses/expense-accounts?parent_code=${parentCode}`);
      
      if (data.success && data.data) {
        setExpenseAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching expense accounts:', error);
    }
  };
  
  const fetchExpenseTypes = async () => {
    try {
      const data = await apiClient.get(`/api/shipment-expenses/types`);
      
      if (data.success) {
        setExpenseTypes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching expense types:', error);
    }
  };
  
  const fetchReferenceData = async () => {
    try {
      await Promise.all([
        apiClient.get(`/api/shipment-expenses/ref/insurance-companies`)
          .then(d => d.success && setInsuranceCompanies(d.data)).catch(() => {}),
        
        apiClient.get(`/api/shipment-expenses/ref/clearance-offices`)
          .then(d => d.success && setClearanceOffices(d.data)).catch(() => {}),
        
        apiClient.get(`/api/shipment-expenses/ref/laboratories`)
          .then(d => d.success && setLaboratories(d.data)).catch(() => {}),
        
        apiClient.get(`/api/shipment-expenses/ref/shipping-agents`)
          .then(d => d.success && setShippingAgents(d.data)).catch(() => {}),
        
        // Freight Agents (shipping lines)
        apiClient.get(`/api/shipment-expenses/ref/freight-agents`)
          .then(d => d.success && setFreightAgents(d.data || [])).catch(() => setFreightAgents([])),
        
        // Forwarders
        apiClient.get(`/api/shipment-expenses/ref/forwarders`)
          .then(d => d.success && setForwarders(d.data || [])).catch(() => setForwarders([])),
        
        // Transport Companies
        apiClient.get(`/api/shipment-expenses/ref/transport-companies`)
          .then(d => d.success && setTransportCompanies(d.data || [])).catch(() => setTransportCompanies([])),
        
        apiClient.get(`/api/shipment-expenses/ref/saudi-ports`)
          .then(d => d.success && setSaudiPorts(d.data)).catch(() => {}),
        
        // Countries for customs declarations
        apiClient.get(`/api/countries`)
          .then(d => d.success && setCountries(d.data || [])).catch(() => setCountries([])),
        
        // Declaration types for customs declarations
        apiClient.get(`/api/customs-declarations/types`)
          .then(d => d.success && setDeclarationTypes(d.data || [])).catch(() => setDeclarationTypes([])),
        
        apiClient.get(`/api/finance/bank-accounts`)
          .then(d => d.success && setBanks(d.data)).catch(() => setBanks([])),
        
        // Fetch Letters of Credit for LC expenses (e.g., 8001)
        apiClient.get(`/api/letters-of-credit`)
          .then(d => {
            if (d.success && d.data) {
              // Map LC data to include bank name and project_id for filtering
              const lcs = d.data.map((lc: any) => ({
                id: lc.id,
                lc_number: lc.lc_number,
                bank_id: lc.issuing_bank_id,
                bank_name: lc.issuing_bank_name_display || lc.issuing_bank_name || '',
                beneficiary_name: lc.beneficiary_name,
                original_amount: lc.original_amount,
                currency_code: lc.currency_code,
                status: lc.status_name,
                project_id: lc.project_id // Include project_id for filtering
              }));
              setLetterOfCredits(lcs);
            }
          }).catch(() => setLetterOfCredits([]))
      ]);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };
  
  const fetchBaseCurrency = async () => {
    try {
      const data = await apiClient.get('/api/finance/currencies?is_base_currency=true');
      console.log('Base currency response:', data);
      
      if (data.success && data.data && data.data.length > 0) {
        const baseCurrency = data.data[0];
        const currencyId = baseCurrency.id.toString();
        const currencyCode = baseCurrency.code;
        
        console.log('Setting base currency:', { currencyId, currencyCode });
        
        setBaseCurrencyId(currencyId);
        setBaseCurrencyCode(currencyCode);
        setFormData((prev: any) => ({
          ...prev,
          currency_id: currencyId
        }));
        setSelectedCurrencyCode(currencyCode);
      } else {
        console.error('No base currency found in response');
      }
    } catch (error) {
      console.error('Error fetching base currency:', error);
    }
  };
  
  // =====================================================
  // HANDLERS
  // =====================================================
  
  // Fetch customs duty breakdown for shipment items
  const fetchDutyBreakdown = async (exchangeRate: number = 3.75) => {
    if (!shipmentId) return;
    
    setLoadingDutyBreakdown(true);
    try {
      const data = await apiClient.get(
        `/api/shipment-expenses/shipment/${shipmentId}/customs-duty-breakdown?exchange_rate=${exchangeRate}`
      );
      
      if (data.success && data.data) {
        const breakdown = data.data;
        
        // Check if currency is SAR (base currency) - no conversion needed
        const isBaseCurrency = breakdown.summary.currency_code === 'SAR';
        
        // Use the passed exchange rate (which may be manually set)
        // Only use backend rate if not manually set and not base currency
        const actualExchangeRate = isBaseCurrency ? 1 : exchangeRate;
        console.log('Duty Breakdown - Currency:', breakdown.summary.currency_code, '| Exchange Rate:', actualExchangeRate, '| Manual:', isExchangeRateManuallySet);
        
        // Only update formData exchange rate if NOT manually set by user
        if (!isExchangeRateManuallySet) {
          if (!isBaseCurrency) {
            const dbRate = breakdown.summary.exchange_rate || 3.75;
            setFormData((prev: any) => ({ ...prev, exchange_rate: dbRate.toString() }));
          } else {
            setFormData((prev: any) => ({ ...prev, exchange_rate: '1' }));
          }
        }
        
        // Additional fees are ALREADY in local currency (SAR)
        const handlingFees = parseFloat(formData.handling_fees) || 0;
        const groundFees = parseFloat(formData.ground_fees) || 0;
        const otherCharges = parseFloat(formData.other_charges) || 0;
        const totalAdditionalFees = handlingFees + groundFees + otherCharges;
        
        // Calculate totals for distribution
        const totalQuantity = breakdown.items.reduce((sum: number, item: CustomsDutyItem) => sum + (item.quantity || 0), 0);
        const totalGoodsValue = breakdown.summary.total_goods_value || 0;
        
        // Update items with fee distribution based on selected method
        const itemsWithFees = breakdown.items.map((item: CustomsDutyItem) => {
          // Calculate distribution ratio based on method
          let distributionRatio = 0;
          if (feeDistributionMethod === 'quantity') {
            distributionRatio = totalQuantity > 0 ? (item.quantity || 0) / totalQuantity : 0;
          } else {
            distributionRatio = totalGoodsValue > 0 ? (item.item_total || 0) / totalGoodsValue : 0;
          }
          
          // Additional fees share for this item
          const additionalFeesShare = totalAdditionalFees * distributionRatio;
          
          // Item value in local currency (SAR)
          // For SAR: same value, For foreign currency: value × exchange rate
          const itemValueLocal = (item.item_total || 0) * actualExchangeRate;
          
          // Total duty share = customs duty (local) + additional fees share
          // Exempt items: only pay additional fees, no customs duty
          const totalDutyShare = item.duty_amount_local + additionalFeesShare;
          
          // Total item cost = item value (local) + total duty share
          const totalItemCost = itemValueLocal + totalDutyShare;
          
          return {
            ...item,
            item_value_local: Math.round(itemValueLocal * 100) / 100,
            additional_fees_share: Math.round(additionalFeesShare * 100) / 100,
            total_duty_share: Math.round(totalDutyShare * 100) / 100,
            total_item_cost: Math.round(totalItemCost * 100) / 100
          };
        });
        
        // Calculate grand total in local currency
        const totalDutyLocal = breakdown.summary.total_duty_local;
        const grandTotalLocal = totalDutyLocal + totalAdditionalFees;
        
        setDutyBreakdown({
          items: itemsWithFees,
          summary: {
            ...breakdown.summary,
            total_additional_fees: totalAdditionalFees,
            grand_total_local: grandTotalLocal
          }
        });
        setShowDutyBreakdown(true);
        
        // Auto-fill the customs duty field with GRAND TOTAL (duties + additional fees) in local currency
        if (grandTotalLocal > 0) {
          const vatAmount = calculateVAT(grandTotalLocal.toString(), formData.vat_rate);
          setFormData((prev: any) => ({
            ...prev,
            customs_duty: grandTotalLocal.toFixed(2),
            amount_before_vat: grandTotalLocal.toFixed(2),
            vat_amount: vatAmount
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching duty breakdown:', error);
      showToast(locale === 'ar' ? 'فشل في جلب تفاصيل الرسوم الجمركية' : 'Failed to fetch duty breakdown', 'error');
    } finally {
      setLoadingDutyBreakdown(false);
    }
  };
  
  // Fetch PO details for auto-population
  const fetchPODetails = async () => {
    if (!shipmentId) return;
    
    try {
      const data = await apiClient.get(`/api/shipment-expenses/shipment/${shipmentId}/po-details`);
      
      if (data.success && data.data) {
        const details = data.data;
        
        // Auto-populate form fields
        setFormData((prev: any) => ({
          ...prev,
          total_fob_value: details.fob_value?.toFixed(2) || prev.total_fob_value,
          freight_value: details.freight_charges?.toFixed(2) || prev.freight_value,
          insurance_value: details.insurance_value?.toFixed(2) || prev.insurance_value,
          port_id: details.port_of_discharge?.id?.toString() || prev.port_id,
          origin_country_id: details.origin_country?.id?.toString() || prev.origin_country_id,
          destination_country_id: details.destination_country?.id?.toString() || prev.destination_country_id,
          // Set PO currency and exchange rate
          currency_id: details.purchase_order?.currency?.id?.toString() || prev.currency_id,
          exchange_rate: details.exchange_rate?.toString() || '3.75',
          // Default declaration type to Import for expense 8005
          declaration_type_id: prev.declaration_type_id || declarationTypes.find((dt: any) => dt.direction === 'import')?.id?.toString() || ''
        }));
        
        // Update selected currency code for display
        if (details.purchase_order?.currency?.code) {
          setSelectedCurrencyCode(details.purchase_order.currency.code);
        }
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
    }
  };
  
  // Calculate VAT when amount or rate changes
  const calculateVAT = (amountBeforeVat: string, vatRate: string) => {
    const amount = parseFloat(amountBeforeVat || '0');
    const rate = parseFloat(vatRate || '0');
    return (amount * rate / 100).toFixed(2);
  };
  
  // Calculate VAT rate when VAT amount changes
  const calculateVATRate = (amountBeforeVat: string, vatAmount: string) => {
    const amount = parseFloat(amountBeforeVat || '0');
    const vat = parseFloat(vatAmount || '0');
    if (amount === 0) return '0';
    return ((vat / amount) * 100).toFixed(2);
  };
  
  // Generate auto description based on shipment data and expense type
  // Format: نوع المصروف - للشحنة رقم X - الخاصة بمشروع رقم Y
  const generateAutoDescription = (expenseType?: ExpenseType | null) => {
    if (!shipment) return '';
    
    const typeToUse = expenseType || selectedExpenseType;
    const expenseTypeName = typeToUse?.name_ar || typeToUse?.name || '';
    
    // Build description in the format: expense_type - shipment - project
    let parts: string[] = [];
    
    // Add expense type
    if (expenseTypeName) {
      parts.push(expenseTypeName);
    }
    
    // Add shipment number
    parts.push(`للشحنة رقم ${shipment.shipment_number}`);
    
    // Add project if available
    if (shipment.project_code && shipment.project_name) {
      parts.push(`الخاصة بمشروع: ${shipment.project_code} - ${shipment.project_name}`);
    } else if (shipment.project_code) {
      parts.push(`الخاصة بمشروع رقم ${shipment.project_code}`);
    }
    
    return parts.join(' - ');
  };
  
  // Generate description for an account (when selecting from Chart of Accounts)
  const generateAccountDescription = (account: ExpenseAccount | null) => {
    if (!shipment || !account) return '';
    
    const accountName = account.expense_type_name_ar || account.expense_type_name || account.name_ar || account.name;
    
    let parts: string[] = [];
    
    if (accountName) {
      parts.push(accountName);
    }
    
    parts.push(`للشحنة رقم ${shipment.shipment_number}`);
    
    if (shipment.project_code && shipment.project_name) {
      parts.push(`الخاصة بمشروع: ${shipment.project_code} - ${shipment.project_name}`);
    } else if (shipment.project_code) {
      parts.push(`الخاصة بمشروع رقم ${shipment.project_code}`);
    }
    
    return parts.join(' - ');
  };
  
  // Handle edit expense
  const handleEditExpense = (expense: ShipmentExpense) => {
    setEditMode(true);
    setEditingExpenseId(expense.id);
    
    // Set selected account if exists
    if (expense.account_id) {
      const account = expenseAccounts.children.find(a => a.id === expense.account_id);
      setSelectedAccount(account || null);
    } else {
      setSelectedAccount(null);
    }
    
    // Populate form with expense data
    setFormData({
      expense_type_id: expense.expense_type_id.toString(),
      account_id: expense.account_id?.toString() || '',
      account_code: expense.account_code || '',
      amount_before_vat: expense.amount_before_vat.toString(),
      vat_rate: expense.vat_rate.toString(),
      vat_amount: expense.vat_amount.toString(),
      currency_id: expense.currency_id.toString(),
      exchange_rate: expense.exchange_rate.toString(),
      expense_date: expense.expense_date.split('T')[0],
      distribution_method: expense.distribution_method || 'value',
      lc_id: expense.lc_id || '',
      lc_number: expense.lc_number || '',
      bank_id: expense.bank_id || '',
      lc_bank_name: expense.lc_bank_name || '',
      insurance_company_id: expense.insurance_company_id || '',
      insurance_policy_number: expense.insurance_policy_number || '',
      shipping_agent_id: expense.shipping_agent_id || '',
      clearance_office_id: expense.clearance_office_id || '',
      port_id: expense.port_id || '',
      laboratory_id: expense.laboratory_id || '',
      certificate_number: expense.certificate_number || '',
      customs_declaration_number: expense.customs_declaration_number || '',
      declaration_type: expense.declaration_type || '',
      declaration_date: expense.declaration_date || '',
      transport_from: expense.transport_from || '',
      transport_to: expense.transport_to || '',
      container_count: expense.container_count || '',
      driver_name: expense.driver_name || '',
      receiver_name: expense.receiver_name || '',
      invoice_number: expense.invoice_number || '',
      receipt_number: expense.receipt_number || '',
      description: expense.description || '',
      notes: expense.notes || ''
    });
    
    setSelectedCurrencyCode(expense.currency_code);
    const type = expenseTypes.find(t => t.id === expense.expense_type_id);
    setSelectedExpenseType(type || null);
    setModalOpen(true);
    
    // For expense 8005, fetch PO details to get goods value
    if (type?.code === '8005' || expense.account_code?.includes('8005')) {
      fetchPODetails();
    }
  };
  
  const handleExpenseTypeChange = (typeId: string) => {
    const type = expenseTypes.find(t => t.id === Number(typeId));
    setSelectedExpenseType(type || null);
    
    // Auto-generate description with the new expense type
    const autoDesc = type ? generateAutoDescription(type) : '';
    
    // For expense 8005 (Customs Declaration), auto-populate fields from shipment
    const isExpense8005 = type?.code === '8005';
    
    let additionalFields: any = {};
    if (isExpense8005 && shipment) {
      // Auto-detect declaration type from shipment type
      let autoDeclarationType = '';
      const shipmentTypeCode = shipment.shipment_type_code?.toLowerCase() || '';
      if (shipmentTypeCode.includes('import') || shipmentTypeCode === 'imp') {
        autoDeclarationType = 'import';
      } else if (shipmentTypeCode.includes('export') || shipmentTypeCode === 'exp') {
        autoDeclarationType = 'export';
      } else if (shipmentTypeCode.includes('re-export') || shipmentTypeCode === 'reexp') {
        autoDeclarationType = 're-export';
      } else if (shipmentTypeCode.includes('transit') || shipmentTypeCode === 'trans') {
        autoDeclarationType = 'transit';
      }
      
      // Find matching declaration type
      const matchingDeclType = declarationTypes.find((dt: any) => 
        dt.direction?.toLowerCase() === autoDeclarationType
      );
      
      // Calculate goods value from PO or shipment
      const goodsValue = shipment.po_total_value || shipment.total_value || 0;
      
      additionalFields = {
        declaration_type_id: matchingDeclType?.id?.toString() || '',
        declaration_type: autoDeclarationType,
        declaration_date: new Date().toISOString().split('T')[0],
        port_id: shipment.port_of_discharge_id?.toString() || '',
        origin_country_id: shipment.origin_country_id?.toString() || '',
        destination_country_id: shipment.destination_country_id?.toString() || '',
        total_fob_value: goodsValue.toString(),
        freight_value: (shipment.freight_charges || 0).toString(),
        insurance_value: (shipment.insurance_value || 0).toString(),
        // Invoice number = Declaration number (will be auto-generated)
        invoice_number: ''
      };
    }
    
    const vatRateStr = String(type?.default_vat_rate ?? (type?.is_vat_exempt ? 0 : 15));

    setFormData((prev: any) => ({
      ...prev,
      expense_type_id: typeId,
      vat_rate: vatRateStr,
      vat_amount: calculateVAT(prev.amount_before_vat, vatRateStr),
      description: autoDesc,
      ...additionalFields
    }));
    
    // For expense 8005, also fetch PO details and duty breakdown
    if (isExpense8005) {
      fetchPODetails();
      // Reset duty breakdown when changing expense type
      setDutyBreakdown(null);
      setShowDutyBreakdown(false);
    }
  };
  
  // Handle parent account change
  const handleParentAccountChange = (parentCode: string) => {
    setSelectedParentCode(parentCode);
    setSelectedAccount(null);
    setAccountSearchQuery('');
    setFormData((prev: any) => ({
      ...prev,
      parent_account_code: parentCode,
      account_id: '',
      account_code: ''
    }));
    // fetchExpenseAccounts will be triggered by useEffect
  };
  
  // Handle account selection from Chart of Accounts
  const handleAccountSelect = (accountId: string) => {
    const account = expenseAccounts.children.find(a => a.id === Number(accountId));
    setSelectedAccount(account || null);
    
    if (account && account.expense_type_id) {
      // If account is linked to an expense type, auto-select it
      const type = expenseTypes.find(t => t.id === account.expense_type_id);
      setSelectedExpenseType(type || null);
      
      // Auto-generate description with the expense type
      const autoDesc = type ? generateAutoDescription(type) : generateAccountDescription(account);
      
      const vatRateStr = account.default_vat_rate?.toString() || (account.is_vat_exempt ? '0' : '15');

      setFormData((prev: any) => ({
        ...prev,
        account_id: accountId,
        account_code: account.code,
        expense_type_id: account.expense_type_id?.toString() || '',
        vat_rate: vatRateStr,
        vat_amount: calculateVAT(prev.amount_before_vat, vatRateStr),
        description: autoDesc
      }));
    } else {
      // Just set the account, generate description from account name
      const autoDesc = generateAccountDescription(account || null);
      
      setFormData((prev: any) => ({
        ...prev,
        account_id: accountId,
        account_code: account?.code || '',
        description: autoDesc || prev.description
      }));
    }
  };
  
  const handleAmountChange = (amount: string) => {
    const vatAmount = calculateVAT(amount, formData.vat_rate);
    setFormData((prev: any) => ({
      ...prev,
      amount_before_vat: amount,
      vat_amount: vatAmount
    }));
  };
  
  const handleVATRateChange = (rate: string) => {
    const vatAmount = calculateVAT(formData.amount_before_vat, rate);
    setFormData((prev: any) => ({
      ...prev,
      vat_rate: rate,
      vat_amount: vatAmount
    }));
  };
  
  const handleVATAmountChange = (amount: string) => {
    const vatRate = calculateVATRate(formData.amount_before_vat, amount);
    setFormData((prev: any) => ({
      ...prev,
      vat_amount: amount,
      vat_rate: vatRate
    }));
  };
  
  const handleLCChange = (lcId: string) => {
    const lc = letterOfCredits.find(l => l.id === Number(lcId));
    if (lc) {
      setFormData((prev: any) => ({
        ...prev,
        lc_id: lcId,
        lc_number: lc.lc_number,
        bank_id: lc.bank_id,
        lc_bank_name: lc.bank_name
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!formData.currency_id || formData.currency_id === '') {
        showToast(locale === 'ar' ? 'الرجاء اختيار العملة' : 'Please select a currency', 'error');
        return;
      }
      
      // Validate account is selected if accounts are available
      if (expenseAccounts.parent && !formData.account_id) {
        showToast(locale === 'ar' ? 'الرجاء اختيار حساب المصروف' : 'Please select expense account', 'error');
        return;
      }
      
      if (!formData.expense_type_id) {
        showToast(locale === 'ar' ? 'الرجاء اختيار نوع المصروف' : 'Please select expense type', 'error');
        return;
      }
      
      if (!formData.amount_before_vat || parseFloat(formData.amount_before_vat) <= 0) {
        showToast(locale === 'ar' ? 'الرجاء إدخال المبلغ' : 'Please enter amount', 'error');
        return;
      }
      
      // Validation for expense type 8005 (Customs Declaration)
      if (selectedExpenseType?.code === '8005') {
        // Declaration number is required
        if (!formData.customs_declaration_number || formData.customs_declaration_number.trim() === '') {
          showToast(locale === 'ar' ? 'رقم البيان الجمركي مطلوب' : 'Customs declaration number is required', 'error');
          return;
        }
        
        // Port is required
        if (!formData.port_id) {
          showToast(locale === 'ar' ? 'الميناء / المنفذ مطلوب' : 'Port / Entry point is required', 'error');
          return;
        }
        
        // Check if expense 8005 already exists for this shipment (unless editing)
        if (!editMode) {
          const existing8005 = expenses.find(exp => {
            const expType = expenseTypes.find(t => t.id === exp.expense_type_id);
            return expType?.code === '8005';
          });
          if (existing8005) {
            showToast(
              locale === 'ar' 
                ? 'لا يمكن إضافة أكثر من بيان جمركي لنفس الشحنة' 
                : 'Cannot add more than one customs declaration per shipment',
              'error'
            );
            return;
          }
        }
      }
      
      // Build payload with only relevant fields
      const payload: any = {
        shipment_id: shipmentId,
        expense_type_id: parseInt(formData.expense_type_id),
        account_id: formData.account_id ? parseInt(formData.account_id) : null,
        account_code: formData.account_code || null,
        amount_before_vat: parseFloat(formData.amount_before_vat),
        vat_rate: parseFloat(formData.vat_rate || '0'),
        currency_id: parseInt(formData.currency_id),
        exchange_rate: parseFloat(formData.exchange_rate || '1'),
        expense_date: formData.expense_date,
        distribution_method: formData.distribution_method,
        invoice_number: formData.invoice_number,
        receipt_number: formData.receipt_number,
        description: formData.description,
        notes: formData.notes
      };
      
      // Add conditional fields based on expense type
      if (selectedExpenseType) {
        if (selectedExpenseType.requires_lc) {
          payload.lc_number = formData.lc_number;
          payload.lc_bank_name = formData.lc_bank_name;
        }
        
        if (selectedExpenseType.requires_insurance_company) {
          payload.insurance_company_id = formData.insurance_company_id;
          payload.insurance_policy_number = formData.insurance_policy_number;
        }
        
        if (selectedExpenseType.requires_shipping_agent) {
          payload.shipping_agent_id = formData.shipping_agent_id;
        }
        
        if (selectedExpenseType.requires_clearance_office) {
          payload.clearance_office_id = formData.clearance_office_id;
        }
        
        if (selectedExpenseType.requires_laboratory) {
          payload.laboratory_id = formData.laboratory_id;
          payload.certificate_number = formData.certificate_number;
        }
        
        if (selectedExpenseType.requires_port) {
          payload.port_id = formData.port_id;
        }
        
        if (selectedExpenseType.requires_customs_declaration) {
          payload.customs_declaration_number = formData.customs_declaration_number;
          payload.declaration_type = formData.declaration_type;
          payload.declaration_type_id = formData.declaration_type_id;
          payload.declaration_date = formData.declaration_date;
          payload.port_id = formData.port_id;
          
          // Additional customs declaration fields for expense 8005
          if (selectedExpenseType.code === '8005') {
            payload.origin_country_id = formData.origin_country_id;
            payload.destination_country_id = formData.destination_country_id;
            payload.total_fob_value = formData.total_fob_value;
            payload.freight_value = formData.freight_value;
            payload.insurance_value = formData.insurance_value;
            payload.customs_duty = formData.customs_duty;
            payload.handling_fees = formData.handling_fees;
            payload.ground_fees = formData.ground_fees;
            payload.other_charges = formData.other_charges;
          }
        }
        
        // Transport fields
        if (selectedExpenseType.category === 'transport') {
          payload.transport_from = formData.transport_from;
          payload.transport_to = formData.transport_to;
          payload.container_count = formData.container_count;
          payload.driver_name = formData.driver_name;
          payload.receiver_name = formData.receiver_name;
        }
      }
      
      console.log('Submitting expense with payload:', payload);
      
      const endpoint = editMode 
        ? `/api/shipment-expenses/${editingExpenseId}`
        : `/api/shipment-expenses`;
      
      const data = editMode 
        ? await apiClient.put(endpoint, payload)
        : await apiClient.post(endpoint, payload);
      
      console.log('Submit expense response:', data);
      
      if (data.success) {
        const message = editMode 
          ? (locale === 'ar' ? 'تم تحديث المصروف بنجاح' : 'Expense updated successfully')
          : (locale === 'ar' ? 'تم إضافة المصروف بنجاح' : 'Expense added successfully');
        showToast(message, 'success');
        setModalOpen(false);
        setEditMode(false);
        setEditingExpenseId(null);
        resetForm();
        fetchExpenses();
      } else {
        showToast(data.error?.message || t('failed_to_add_expense'), 'error');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      showToast(t('failed_to_add_expense'), 'error');
    }
  };
  
  const handleApprove = async (expenseId: number) => {
    try {
      const data = await apiClient.post(`/api/shipment-expenses/${expenseId}/approve`);
      
      if (data.success) {
        showToast(t('expense_approved'), 'success');
        fetchExpenses();
      } else {
        showToast(data.error?.message || t('failed_to_approve'), 'error');
      }
    } catch (error) {
      console.error('Error approving expense:', error);
      showToast(t('failed_to_approve'), 'error');
    }
  };
  
  const handleDelete = async () => {
    if (!expenseToDelete) return;
    
    setDeleting(true);
    try {
      const data = await apiClient.delete(`/api/shipment-expenses/${expenseToDelete}`);
      
      if (data.success) {
        showToast(t('expense_deleted'), 'success');
        fetchExpenses();
      } else {
        showToast(data.error?.message || t('failed_to_delete'), 'error');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      showToast(t('failed_to_delete'), 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setExpenseToDelete(null);
    }
  };
  
  const handlePrint = (expense: any) => {
    // Create a print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showToast(locale === 'ar' ? 'فشل فتح نافذة الطباعة' : 'Failed to open print window', 'error');
      return;
    }
    
    // Get shipment details
    const shipmentRef = expense.shipment_reference || '';
    const shipmentBL = expense.bl_number || '';
    
    // Format the print content
    const printContent = `
      <!DOCTYPE html>
      <html dir="${locale === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${locale === 'ar' ? 'طباعة المصروف' : 'Print Expense'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: ${locale === 'ar' ? 'Tahoma, Arial' : 'Arial, sans-serif'};
            padding: 20mm;
            line-height: 1.6;
            direction: ${locale === 'ar' ? 'rtl' : 'ltr'};
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
          }
          .header p {
            font-size: 14px;
            color: #666;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            background: #f0f0f0;
            padding: 8px 12px;
            margin-bottom: 12px;
            border-${locale === 'ar' ? 'right' : 'left'}: 4px solid #333;
          }
          .row {
            display: flex;
            margin-bottom: 10px;
            padding: 5px 0;
          }
          .label {
            font-weight: bold;
            min-width: 200px;
            color: #555;
          }
          .value {
            flex: 1;
            color: #000;
          }
          .amount-box {
            background: #f9f9f9;
            border: 2px solid #333;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          .amount-number {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .amount-words {
            font-size: 14px;
            font-style: italic;
            color: #555;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { padding: 10mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${locale === 'ar' ? 'مستند مصروف شحنة' : 'Shipment Expense Document'}</h1>
          <p>${locale === 'ar' ? 'نظام إدارة اللوجستيات الذكي' : 'Smart Logistics Management System'}</p>
        </div>
        
        <div class="section">
          <div class="section-title">${locale === 'ar' ? 'معلومات المصروف' : 'Expense Information'}</div>
          <div class="row">
            <div class="label">${locale === 'ar' ? 'نوع المصروف:' : 'Expense Type:'}</div>
            <div class="value">${locale === 'ar' ? expense.expense_type_name_ar : expense.expense_type_name_en} (${expense.expense_type_code})</div>
          </div>
          <div class="row">
            <div class="label">${locale === 'ar' ? 'التاريخ:' : 'Date:'}</div>
            <div class="value">${new Date(expense.expense_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}</div>
          </div>
          <div class="row">
            <div class="label">${locale === 'ar' ? 'الحالة:' : 'Status:'}</div>
            <div class="value">${expense.approval_status === 'approved' 
              ? (locale === 'ar' ? 'معتمد' : 'Approved') 
              : (locale === 'ar' ? 'مسودة' : 'Draft')
            }</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">${locale === 'ar' ? 'معلومات الشحنة' : 'Shipment Information'}</div>
          <div class="row">
            <div class="label">${locale === 'ar' ? 'رقم الشحنة:' : 'Shipment Reference:'}</div>
            <div class="value">${shipmentRef}</div>
          </div>
          <div class="row">
            <div class="label">${locale === 'ar' ? 'رقم البوليصة:' : 'BL Number:'}</div>
            <div class="value">${shipmentBL}</div>
          </div>
          ${expense.description ? `
          <div class="row">
            <div class="label">${locale === 'ar' ? 'الوصف:' : 'Description:'}</div>
            <div class="value">${expense.description}</div>
          </div>
          ` : ''}
        </div>
        
        <div class="amount-box">
          <div class="amount-number">
            ${Number(expense.total_amount || 0).toFixed(2)} ${expense.currency_symbol || ''}
          </div>
          <div style="font-size: 12px; color: #666; margin: 5px 0;">
            ${locale === 'ar' ? 'المبلغ بالعملة الأساسية:' : 'Amount in Base Currency:'} 
            ${Number(expense.total_in_base_currency || 0).toFixed(2)} SAR
          </div>
          ${expense.amount_in_words || expense.amount_in_words_ar ? `
          <div class="amount-words">
            ${locale === 'ar' ? expense.amount_in_words_ar : expense.amount_in_words}
          </div>
          ` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">${locale === 'ar' ? 'تفاصيل المبلغ' : 'Amount Details'}</div>
          <div class="row">
            <div class="label">${locale === 'ar' ? 'المبلغ قبل الضريبة:' : 'Amount Before VAT:'}</div>
            <div class="value">${Number(expense.amount_before_vat || 0).toFixed(2)} ${expense.currency_symbol || ''}</div>
          </div>
          <div class="row">
            <div class="label">${locale === 'ar' ? 'نسبة الضريبة:' : 'VAT Rate:'}</div>
            <div class="value">${expense.vat_rate || 0}%</div>
          </div>
          <div class="row">
            <div class="label">${locale === 'ar' ? 'مبلغ الضريبة:' : 'VAT Amount:'}</div>
            <div class="value">${(Number(expense.total_amount || 0) - Number(expense.amount_before_vat || 0)).toFixed(2)} ${expense.currency_symbol || ''}</div>
          </div>
          <div class="row">
            <div class="label">${locale === 'ar' ? 'سعر الصرف:' : 'Exchange Rate:'}</div>
            <div class="value">${expense.exchange_rate || 1}</div>
          </div>
        </div>
        
        ${expense.invoice_number || expense.reference_number ? `
        <div class="section">
          <div class="section-title">${locale === 'ar' ? 'المراجع' : 'References'}</div>
          ${expense.invoice_number ? `
          <div class="row">
            <div class="label">${locale === 'ar' ? 'رقم الفاتورة:' : 'Invoice Number:'}</div>
            <div class="value">${expense.invoice_number}</div>
          </div>
          ` : ''}
          ${expense.reference_number ? `
          <div class="row">
            <div class="label">${locale === 'ar' ? 'رقم المرجع:' : 'Reference Number:'}</div>
            <div class="value">${expense.reference_number}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <div class="footer">
          <p>${locale === 'ar' ? 'طُبع في:' : 'Printed on:'} ${new Date().toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</p>
          <p>${locale === 'ar' ? 'هذا المستند تم إنشاؤه آلياً' : 'This document was generated automatically'}</p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">
            ${locale === 'ar' ? 'طباعة' : 'Print'}
          </button>
          <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; margin-${locale === 'ar' ? 'right' : 'left'}: 10px;">
            ${locale === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Auto print after a small delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
  
  const resetForm = () => {
    setEditMode(false);
    setEditingExpenseId(null);
    setSelectedAccount(null);
    setAccountSearchQuery('');
    setSelectedParentCode('1151010003'); // Reset to default parent
    setFormData({
      expense_type_id: '',
      account_id: '',
      account_code: '',
      parent_account_code: '1151010003',
      amount_before_vat: '',
      vat_rate: '15',
      vat_amount: '',
      currency_id: baseCurrencyId,
      exchange_rate: '1',
      expense_date: new Date().toISOString().split('T')[0],
      distribution_method: 'value',
      lc_id: '',
      lc_number: '',
      bank_id: '',
      lc_bank_name: '',
      insurance_company_id: '',
      insurance_policy_number: '',
      shipping_agent_id: '',
      clearance_office_id: '',
      port_id: '',
      laboratory_id: '',
      certificate_number: '',
      customs_declaration_number: '',
      declaration_type: '',
      declaration_type_id: '',
      declaration_date: '',
      customs_duty: '',
      total_fob_value: '',
      freight_value: '',
      insurance_value: '',
      handling_fees: '',
      ground_fees: '',
      other_charges: '',
      origin_country_id: '',
      destination_country_id: '',
      transport_from: '',
      transport_to: '',
      container_count: '',
      driver_name: '',
      receiver_name: '',
      invoice_number: '',
      receipt_number: '',
      description: '',
      notes: '',
      entity_type: '',
      entity_id: ''
    });
    setSelectedExpenseType(null);
    setSelectedCurrencyCode(baseCurrencyCode);
  };
  
  // Open modal for adding a new expense
  const handleOpenAddModal = () => {
    resetForm();
    setModalOpen(true);
  };
  
  // =====================================================
  // RENDER HELPERS
  // =====================================================
  const renderDynamicFields = () => {
    // Check requires_lc from either selectedExpenseType or selectedAccount
    const requiresLC = selectedExpenseType?.requires_lc || selectedAccount?.requires_lc;
    const requiresInsurance = selectedExpenseType?.requires_insurance_company || selectedAccount?.requires_insurance_company;
    const requiresShippingAgent = selectedExpenseType?.requires_shipping_agent || selectedAccount?.requires_shipping_agent;
    const requiresClearanceOffice = selectedExpenseType?.requires_clearance_office || selectedAccount?.requires_clearance_office;
    const requiresLaboratory = selectedExpenseType?.requires_laboratory || selectedAccount?.requires_laboratory;
    const requiresPort = selectedExpenseType?.requires_port || selectedAccount?.requires_port;
    const requiresCustomsDeclaration = selectedExpenseType?.requires_customs_declaration || selectedAccount?.requires_customs_declaration;
    
    // If no requirements, return null
    if (!requiresLC && !requiresInsurance && !requiresShippingAgent && 
        !requiresClearanceOffice && !requiresLaboratory && !requiresPort && !requiresCustomsDeclaration) {
      return null;
    }
    
    const fields = [];
    
    // LC Fields
    if (requiresLC) {
      // Filter LCs by project_id - only show LCs linked to the same project as the shipment
      const filteredLCs = shipment?.project_id 
        ? letterOfCredits.filter(lc => lc.project_id === shipment.project_id)
        : letterOfCredits;
      
      fields.push(
        <Select
          key="lc_id"
          label={locale === 'ar' ? 'رقم الاعتماد المستندي' : 'Letter of Credit'}
          value={formData.lc_id}
          onChange={(e) => handleLCChange(e.target.value)}
          required
          helperText={shipment?.project_id 
            ? (locale === 'ar' 
              ? `الاعتمادات المرتبطة بالمشروع: ${shipment.project_code || shipment.project_id}` 
              : `LCs linked to project: ${shipment.project_code || shipment.project_id}`)
            : undefined
          }
        >
          <option value="">{locale === 'ar' ? '-- اختر الاعتماد المستندي --' : '-- Select LC --'}</option>
          {filteredLCs.length === 0 ? (
            <option value="" disabled>
              {locale === 'ar' ? 'لا توجد اعتمادات مرتبطة بهذا المشروع' : 'No LCs linked to this project'}
            </option>
          ) : (
            filteredLCs.map(lc => (
              <option key={lc.id} value={lc.id}>
                {lc.lc_number} | {lc.bank_name} | {lc.beneficiary_name} | {Number(lc.original_amount).toLocaleString()} {lc.currency_code}
              </option>
            ))
          )}
        </Select>,
        <Input
          key="bank_name_display"
          label={locale === 'ar' ? 'البنك' : 'Bank'}
          value={formData.lc_bank_name || ''}
          disabled
          readOnly
          helperText={locale === 'ar' ? 'يتم تعبئته تلقائياً من الاعتماد المختار' : 'Auto-filled from selected LC'}
        />
      );
    }
    
    // Insurance Fields
    if (requiresInsurance) {
      fields.push(
        <Select
          key="insurance_company_id"
          label={locale === 'ar' ? 'شركة التأمين' : 'Insurance Company'}
          value={formData.insurance_company_id}
          onChange={(e) => setFormData({ ...formData, insurance_company_id: e.target.value })}
          required
        >
          <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
          {insuranceCompanies.map(ic => (
            <option key={ic.id} value={ic.id}>
              {locale === 'ar' ? ic.name_ar : ic.name}
            </option>
          ))}
        </Select>,
        <Input
          key="insurance_policy_number"
          label={locale === 'ar' ? 'رقم البوليصة' : 'Policy Number'}
          value={formData.insurance_policy_number}
          onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
        />
      );
    }
    
    // Shipping Agent with Entity Type Selection
    if (requiresShippingAgent) {
      // Get entity list based on selected entity_type
      const getEntityList = () => {
        switch (formData.entity_type) {
          case 'freight_agent':
            return freightAgents;
          case 'forwarder':
            return forwarders;
          case 'transport_company':
            return transportCompanies;
          case 'clearing_agent':
            return clearanceOffices;
          default:
            return shippingAgents;
        }
      };
      
      const entityList = getEntityList();
      
      fields.push(
        <Select
          key="entity_type"
          label={locale === 'ar' ? 'نوع الجهة' : 'Entity Type'}
          value={formData.entity_type}
          onChange={(e) => setFormData({ ...formData, entity_type: e.target.value, entity_id: '', shipping_agent_id: '' })}
          required
        >
          <option value="">{locale === 'ar' ? '-- اختر نوع الجهة --' : '-- Select Entity Type --'}</option>
          <option value="freight_agent">{locale === 'ar' ? 'وكيل شحن' : 'Freight Agent'}</option>
          <option value="forwarder">{locale === 'ar' ? 'شركة شحن' : 'Forwarder'}</option>
          <option value="transport_company">{locale === 'ar' ? 'شركة نقل' : 'Transport Company'}</option>
          <option value="clearing_agent">{locale === 'ar' ? 'وكيل تخليص' : 'Clearing Agent'}</option>
        </Select>
      );
      
      // Show entity selection dropdown if entity type is selected
      if (formData.entity_type) {
        const entityLabel = {
          freight_agent: locale === 'ar' ? 'وكيل الشحن' : 'Freight Agent',
          forwarder: locale === 'ar' ? 'شركة الشحن' : 'Forwarder',
          transport_company: locale === 'ar' ? 'شركة النقل' : 'Transport Company',
          clearing_agent: locale === 'ar' ? 'وكيل التخليص' : 'Clearing Agent',
        }[formData.entity_type] || (locale === 'ar' ? 'الجهة' : 'Entity');
        
        fields.push(
          <Select
            key="entity_id"
            label={entityLabel}
            value={formData.entity_id || formData.shipping_agent_id}
            onChange={(e) => setFormData({ ...formData, entity_id: e.target.value, shipping_agent_id: e.target.value })}
            required
          >
            <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
            {entityList.map(entity => (
              <option key={entity.id} value={entity.id}>
                {entity.code ? `${entity.code} - ` : ''}{locale === 'ar' ? (entity.name_ar || entity.name) : entity.name}
              </option>
            ))}
          </Select>
        );
      }
    }
    
    // Clearance Office
    if (requiresClearanceOffice) {
      fields.push(
        <Select
          key="clearance_office_id"
          label={locale === 'ar' ? 'مكتب التخليص' : 'Clearance Office'}
          value={formData.clearance_office_id}
          onChange={(e) => setFormData({ ...formData, clearance_office_id: e.target.value })}
          required
        >
          <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
          {clearanceOffices.map(co => (
            <option key={co.id} value={co.id}>
              {locale === 'ar' ? co.name_ar : co.name}
            </option>
          ))}
        </Select>
      );
    }
    
    // Port (skip if expense 8005 which has its own port field)
    const isExpense8005Check = selectedExpenseType?.code === '8005' || selectedAccount?.expense_type_code === '8005';
    if (requiresPort && !isExpense8005Check) {
      fields.push(
        <Select
          key="port_id"
          label={locale === 'ar' ? 'الميناء' : 'Port'}
          value={formData.port_id}
          onChange={(e) => setFormData({ ...formData, port_id: e.target.value })}
          required
        >
          <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
          {saudiPorts.map(port => (
            <option key={port.id} value={port.id}>
              {locale === 'ar' ? port.name_ar : port.name}
            </option>
          ))}
        </Select>
      );
    }
    
    // Laboratory
    if (requiresLaboratory) {
      fields.push(
        <Select
          key="laboratory_id"
          label={locale === 'ar' ? 'المختبر' : 'Laboratory'}
          value={formData.laboratory_id}
          onChange={(e) => setFormData({ ...formData, laboratory_id: e.target.value })}
          required
        >
          <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
          {laboratories.map(lab => (
            <option key={lab.id} value={lab.id}>
              {locale === 'ar' ? lab.name_ar : lab.name}
            </option>
          ))}
        </Select>,
        <Input
          key="certificate_number"
          label={locale === 'ar' ? 'رقم الشهادة' : 'Certificate Number'}
          value={formData.certificate_number}
          onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
        />
      );
    }
    
    // Customs Declaration - Enhanced fields for expense 8005
    if (requiresCustomsDeclaration) {
      // Check if this is expense 8005 (full customs declaration form)
      const isExpense8005 = selectedExpenseType?.code === '8005' || selectedAccount?.expense_type_code === '8005';
      
      // For expense 8005, return a completely custom organized section
      if (isExpense8005) {
        // Calculate CIF and totals for display
        const fobValue = parseFloat(formData.total_fob_value) || 0;
        const freightValue = parseFloat(formData.freight_value) || 0;
        const insuranceValue = parseFloat(formData.insurance_value) || 0;
        const cifValue = fobValue + freightValue + insuranceValue;
        const customsDuty = parseFloat(formData.customs_duty) || 0;
        const handlingFees = parseFloat(formData.handling_fees) || 0;
        const groundFees = parseFloat(formData.ground_fees) || 0;
        const otherCharges = parseFloat(formData.other_charges) || 0;
        const totalFees = handlingFees + groundFees + otherCharges;
        
        return (
          <div className="space-y-6">
            {/* Section 1: Declaration Info */}
            <div className="border border-blue-200 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
                {locale === 'ar' ? '1. معلومات البيان الجمركي' : '1. Customs Declaration Info'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label={locale === 'ar' ? 'رقم البيان الجمركي *' : 'Declaration Number *'}
                  value={formData.customs_declaration_number}
                  onChange={(e) => setFormData({ ...formData, customs_declaration_number: e.target.value, invoice_number: e.target.value })}
                  required
                  placeholder={locale === 'ar' ? 'أدخل رقم البيان الجمركي' : 'Enter declaration number'}
                />
                <Select
                  label={locale === 'ar' ? 'نوع البيان *' : 'Declaration Type *'}
                  value={formData.declaration_type_id}
                  onChange={(e) => {
                    const type = declarationTypes.find((t: any) => t.id === Number(e.target.value));
                    setFormData({ ...formData, declaration_type_id: e.target.value, declaration_type: type?.direction || '' });
                  }}
                  required
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {declarationTypes.map((type: any) => (
                    <option key={type.id} value={type.id}>
                      {locale === 'ar' ? type.name_ar : type.name_en}
                    </option>
                  ))}
                </Select>
                <Select
                  label={locale === 'ar' ? 'الميناء / المنفذ *' : 'Port / Entry Point *'}
                  value={formData.port_id}
                  onChange={(e) => setFormData({ ...formData, port_id: e.target.value })}
                  required
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {saudiPorts.map(port => (
                    <option key={port.id} value={port.id}>{locale === 'ar' ? port.name_ar : port.name}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Select
                  label={locale === 'ar' ? 'بلد المنشأ' : 'Origin Country'}
                  value={formData.origin_country_id}
                  onChange={(e) => setFormData({ ...formData, origin_country_id: e.target.value })}
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {countries.map((c: any) => (
                    <option key={c.id} value={c.id}>{locale === 'ar' ? c.name_ar || c.name : c.name}</option>
                  ))}
                </Select>
                <Select
                  label={locale === 'ar' ? 'بلد الوجهة' : 'Destination Country'}
                  value={formData.destination_country_id}
                  onChange={(e) => setFormData({ ...formData, destination_country_id: e.target.value })}
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {countries.map((c: any) => (
                    <option key={c.id} value={c.id}>{locale === 'ar' ? c.name_ar || c.name : c.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Section 2: Goods Values & Duty Calculation Mode */}
            <div className="border border-green-200 dark:border-green-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">
                  {locale === 'ar' ? '2. قيم البضاعة والرسوم' : '2. Goods Values & Duties'}
                  {shipment?.po_currency_code && (
                    <span className="text-xs font-normal mr-2">
                      ({locale === 'ar' ? 'عملة الشحنة' : 'Currency'}: {shipment.po_currency_code || shipment.currency_code})
                    </span>
                  )}
                </h4>
                {/* Calculation Mode Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {locale === 'ar' ? 'طريقة الاحتساب:' : 'Calculation:'}
                  </span>
                  <select
                    className="text-xs border border-green-400 dark:border-green-600 rounded px-2 py-1 bg-white dark:bg-gray-700 font-medium"
                    value={dutyCalculationMode}
                    onChange={(e) => setDutyCalculationMode(e.target.value as 'auto' | 'manual')}
                  >
                    <option value="auto">{locale === 'ar' ? 'تلقائي (حسب الأصناف)' : 'Auto (Per Item)'}</option>
                    <option value="manual">{locale === 'ar' ? 'يدوي (إجمالي)' : 'Manual (Total)'}</option>
                  </select>
                </div>
              </div>
              
              {/* Goods Value - Read Only from PO */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {locale === 'ar' ? 'إجمالي قيمة البضاعة (من أمر الشراء)' : 'Total Goods Value (From PO)'}
                  </div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {Number(formData.total_fob_value || 0).toLocaleString()} {shipment?.po_currency_code || 'USD'}
                  </div>
                </div>
                
                {/* Currency & Exchange Rate - Only for foreign currencies */}
                {shipment?.po_currency_code && shipment.po_currency_code !== 'SAR' && (
                  <>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {locale === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          className="w-24 text-lg font-bold text-center border border-green-400 dark:border-green-600 rounded px-2 py-1 bg-green-50 dark:bg-green-900/30"
                          value={formData.exchange_rate}
                          onChange={(e) => {
                            setIsExchangeRateManuallySet(true);
                            setFormData({ ...formData, exchange_rate: e.target.value });
                          }}
                        />
                        <span className="text-xs text-gray-500">{shipment.po_currency_code} → SAR</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {locale === 'ar' ? 'القيمة بالريال السعودي' : 'Value in SAR'}
                      </div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {(Number(formData.total_fob_value || 0) * Number(formData.exchange_rate || 1)).toLocaleString()} SAR
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Manual Mode: Simple duty input */}
              {dutyCalculationMode === 'manual' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Input
                    label={locale === 'ar' ? 'نسبة الرسوم الجمركية %' : 'Duty Rate %'}
                    type="number"
                    step="0.01"
                    value={formData.manual_duty_rate || ''}
                    onChange={(e) => {
                      const rate = e.target.value;
                      const goodsValue = Number(formData.total_fob_value || 0);
                      const dutyAmount = (goodsValue * Number(rate || 0) / 100);
                      const dutyAmountLocal = dutyAmount * Number(formData.exchange_rate || 1);
                      setFormData({ 
                        ...formData, 
                        manual_duty_rate: rate,
                        customs_duty: dutyAmountLocal.toFixed(2),
                        amount_before_vat: dutyAmountLocal.toFixed(2),
                        vat_amount: calculateVAT(dutyAmountLocal.toString(), formData.vat_rate)
                      });
                    }}
                  />
                  <Input
                    label={locale === 'ar' ? 'إجمالي الرسوم الجمركية (ر.س)' : 'Total Customs Duty (SAR)'}
                    type="number"
                    step="0.01"
                    value={formData.customs_duty}
                    onChange={(e) => {
                      const duty = e.target.value;
                      const vatAmount = calculateVAT(duty, formData.vat_rate);
                      setFormData({ ...formData, customs_duty: duty, amount_before_vat: duty, vat_amount: vatAmount });
                    }}
                  />
                  <div className="flex flex-col justify-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {locale === 'ar' ? 'إجمالي مع الضريبة' : 'Total with VAT'}
                    </div>
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {(Number(formData.customs_duty || 0) + Number(formData.vat_amount || 0)).toLocaleString()} SAR
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Customs Duty - Auto Calculation (only in auto mode) */}
            {dutyCalculationMode === 'auto' && (
            <div className="border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                  {locale === 'ar' ? '3. الرسوم الجمركية (تلقائي)' : '3. Customs Duty (Auto)'}
                </h4>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchDutyBreakdown(parseFloat(formData.exchange_rate) || 3.75)}
                  loading={loadingDutyBreakdown}
                >
                  {locale === 'ar' ? 'حساب الرسوم' : 'Calculate Duties'}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={locale === 'ar' ? 'الرسوم الجمركية (المبلغ قبل الضريبة) *' : 'Customs Duty (Amount Before VAT) *'}
                  type="number"
                  step="0.01"
                  value={formData.customs_duty}
                  onChange={(e) => {
                    const duty = e.target.value;
                    const vatAmount = calculateVAT(duty, formData.vat_rate);
                    setFormData({ ...formData, customs_duty: duty, amount_before_vat: duty, vat_amount: vatAmount });
                  }}
                  required
                  helperText={locale === 'ar' ? 'اضغط على "حساب الرسوم" لجلب التفاصيل' : 'Click "Calculate Duties" to fetch details'}
                />
                <div className="flex flex-col justify-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {locale === 'ar' ? 'ملاحظة: يتم احتساب الرسوم بناء على رمز HS لكل صنف' : 'Note: Duties calculated per item HS code'}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    {dutyBreakdown ? 
                      (locale === 'ar' 
                        ? `${dutyBreakdown.items.length} صنف | العملة: ${dutyBreakdown.summary.currency_code} | سعر الصرف: ${formData.exchange_rate}`
                        : `${dutyBreakdown.items.length} items | Currency: ${dutyBreakdown.summary.currency_code} | Rate: ${formData.exchange_rate}`)
                      : (locale === 'ar' ? 'سيتم تحديث المبلغ قبل الضريبة تلقائياً' : 'Amount Before VAT will be synced automatically')
                    }
                  </p>
                </div>
              </div>
              
              {/* Duty Breakdown Table */}
              {showDutyBreakdown && dutyBreakdown && dutyBreakdown.items.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  {/* Distribution method selector and exchange rate input */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 p-2 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {locale === 'ar' ? 'توزيع الرسوم الإضافية:' : 'Additional Fees Distribution:'}
                      </span>
                      <select
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                        value={feeDistributionMethod}
                        onChange={(e) => {
                          setFeeDistributionMethod(e.target.value as 'quantity' | 'value');
                          // Recalculate when method changes
                          fetchDutyBreakdown(parseFloat(formData.exchange_rate) || 3.75);
                        }}
                      >
                        <option value="quantity">{locale === 'ar' ? 'حسب الكمية' : 'By Quantity'}</option>
                        <option value="value">{locale === 'ar' ? 'حسب القيمة' : 'By Value'}</option>
                      </select>
                    </div>
                    
                    {/* Editable Exchange Rate - Only show for foreign currencies */}
                    {dutyBreakdown.summary.currency_code && dutyBreakdown.summary.currency_code !== 'SAR' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {locale === 'ar' ? 'سعر الصرف:' : 'Exchange Rate:'}
                        </span>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          className="w-20 text-xs text-center border border-yellow-400 dark:border-yellow-600 rounded px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 font-medium"
                          value={formData.exchange_rate}
                          onChange={(e) => {
                            const newRate = e.target.value;
                            setFormData({ ...formData, exchange_rate: newRate });
                          }}
                          onBlur={() => {
                            // Recalculate duties when exchange rate changes
                            const rate = parseFloat(formData.exchange_rate) || 3.75;
                            if (rate > 0) {
                              fetchDutyBreakdown(rate);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const rate = parseFloat(formData.exchange_rate) || 3.75;
                              if (rate > 0) {
                                fetchDutyBreakdown(rate);
                              }
                            }
                          }}
                        />
                        <span className="text-xs text-gray-500">
                          {dutyBreakdown.summary.currency_code} → SAR
                        </span>
                      </div>
                    )}
                    {/* Show direct currency for SAR */}
                    {dutyBreakdown.summary.currency_code === 'SAR' && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {locale === 'ar' ? 'العملة الأساسية (ر.س)' : 'Base Currency (SAR)'}
                      </div>
                    )}
                  </div>
                  
                  <table className="min-w-full divide-y divide-yellow-200 dark:divide-yellow-700 text-xs">
                    <thead className="bg-yellow-100 dark:bg-yellow-900/30">
                      <tr>
                        <th className="px-1.5 py-2 text-start">{locale === 'ar' ? 'الصنف' : 'Item'}</th>
                        <th className="px-1.5 py-2 text-center">{locale === 'ar' ? 'الكمية' : 'Qty'}</th>
                        {/* Show single value column for SAR, two columns for foreign currency */}
                        {dutyBreakdown.summary.currency_code === 'SAR' ? (
                          <th className="px-1.5 py-2 text-end">{locale === 'ar' ? 'القيمة (ر.س)' : 'Value (SAR)'}</th>
                        ) : (
                          <>
                            <th className="px-1.5 py-2 text-end">{locale === 'ar' ? `القيمة (${dutyBreakdown.summary.currency_code})` : `Value (${dutyBreakdown.summary.currency_code})`}</th>
                            <th className="px-1.5 py-2 text-end">{locale === 'ar' ? 'القيمة (ر.س)' : 'Value (SAR)'}</th>
                          </>
                        )}
                        <th className="px-1.5 py-2 text-center">{locale === 'ar' ? 'نسبة الرسم' : 'Rate %'}</th>
                        <th className="px-1.5 py-2 text-end">{locale === 'ar' ? 'رسوم جمركية (ر.س)' : 'Duty (SAR)'}</th>
                        <th className="px-1.5 py-2 text-end">{locale === 'ar' ? 'رسوم إضافية (ر.س)' : 'Add. Fees (SAR)'}</th>
                        <th className="px-1.5 py-2 text-end bg-yellow-200 dark:bg-yellow-800">{locale === 'ar' ? 'إجمالي الرسوم' : 'Total Fees'}</th>
                        <th className="px-1.5 py-2 text-end bg-blue-100 dark:bg-blue-900 font-bold">{locale === 'ar' ? 'إجمالي التكلفة' : 'Total Cost'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-yellow-100 dark:divide-yellow-800">
                      {dutyBreakdown.items.map((item, idx) => (
                        <tr key={idx} className={item.is_exempt ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                          <td className="px-1.5 py-1">
                            <div className="font-medium text-xs">{locale === 'ar' ? item.item_name_ar || item.item_name : item.item_name}</div>
                            <div className="text-[10px] text-gray-500">{item.item_code} {item.hs_code && `| HS: ${item.hs_code}`}</div>
                          </td>
                          <td className="px-1.5 py-1 text-center">{item.quantity?.toLocaleString() || 0}</td>
                          {/* Show single value for SAR, two values for foreign currency */}
                          {dutyBreakdown.summary.currency_code === 'SAR' ? (
                            <td className="px-1.5 py-1 text-end">{item.item_total?.toLocaleString()}</td>
                          ) : (
                            <>
                              <td className="px-1.5 py-1 text-end">{item.item_total?.toLocaleString()}</td>
                              <td className="px-1.5 py-1 text-end">{(item.item_value_local || 0).toLocaleString()}</td>
                            </>
                          )}
                          <td className="px-1.5 py-1 text-center">
                            {item.is_exempt 
                              ? <span className="text-green-600 text-[10px]">{locale === 'ar' ? 'معفى' : 'Exempt'}</span>
                              : `${item.duty_rate_percent || 0}%`
                            }
                          </td>
                          <td className="px-1.5 py-1 text-end">{(item.duty_amount_local || 0).toLocaleString()}</td>
                          <td className="px-1.5 py-1 text-end">{(item.additional_fees_share || 0).toLocaleString()}</td>
                          <td className="px-1.5 py-1 text-end bg-yellow-50 dark:bg-yellow-900/20 font-medium">
                            {(item.total_duty_share || 0).toLocaleString()}
                          </td>
                          <td className="px-1.5 py-1 text-end bg-blue-50 dark:bg-blue-900/20 font-bold text-blue-700 dark:text-blue-400">
                            {(item.total_item_cost || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-yellow-100 dark:bg-yellow-900/30 font-semibold text-xs">
                      <tr>
                        <td className="px-1.5 py-2">{locale === 'ar' ? 'الإجمالي' : 'Total'}</td>
                        <td className="px-1.5 py-2 text-center">{dutyBreakdown.items.reduce((sum, item) => sum + (item.quantity || 0), 0).toLocaleString()}</td>
                        {/* Show single value for SAR, two values for foreign currency */}
                        {dutyBreakdown.summary.currency_code === 'SAR' ? (
                          <td className="px-1.5 py-2 text-end">{dutyBreakdown.summary.total_goods_value?.toLocaleString()}</td>
                        ) : (
                          <>
                            <td className="px-1.5 py-2 text-end">{dutyBreakdown.summary.total_goods_value?.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-end">{(dutyBreakdown.summary.total_goods_value * dutyBreakdown.summary.exchange_rate).toLocaleString()}</td>
                          </>
                        )}
                        <td></td>
                        <td className="px-1.5 py-2 text-end">{dutyBreakdown.summary.total_duty_local?.toLocaleString()}</td>
                        <td className="px-1.5 py-2 text-end">{totalFees.toLocaleString()}</td>
                        <td className="px-1.5 py-2 text-end bg-yellow-200 dark:bg-yellow-800">
                          {(dutyBreakdown.summary.grand_total_local || (dutyBreakdown.summary.total_duty_local + totalFees)).toLocaleString()}
                        </td>
                        <td className="px-1.5 py-2 text-end bg-blue-100 dark:bg-blue-900 font-bold text-blue-700 dark:text-blue-400">
                          {(() => {
                            const totalValueLocal = dutyBreakdown.summary.currency_code === 'SAR' 
                              ? dutyBreakdown.summary.total_goods_value 
                              : dutyBreakdown.summary.total_goods_value * dutyBreakdown.summary.exchange_rate;
                            const totalDuties = dutyBreakdown.summary.grand_total_local || (dutyBreakdown.summary.total_duty_local + totalFees);
                            return (totalValueLocal + totalDuties).toLocaleString();
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  
                  {/* Audit Trail - Verification */}
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {locale === 'ar' ? '✓ التحقق من الحسابات:' : '✓ Calculation Verification:'}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-gray-600 dark:text-gray-400">
                      <div>
                        {locale === 'ar' ? 'إجمالي القيمة:' : 'Total Value:'} {dutyBreakdown.summary.total_goods_value?.toLocaleString()} {dutyBreakdown.summary.currency_code} 
                        → {(dutyBreakdown.summary.total_goods_value * dutyBreakdown.summary.exchange_rate).toLocaleString()} ر.س
                      </div>
                      <div>
                        {locale === 'ar' ? 'رسوم جمركية:' : 'Customs Duty:'} {dutyBreakdown.summary.total_duty_local?.toLocaleString()} ر.س
                      </div>
                      <div>
                        {locale === 'ar' ? 'رسوم إضافية:' : 'Additional Fees:'} {totalFees.toLocaleString()} ر.س
                      </div>
                    </div>
                    <div className="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600 font-semibold text-yellow-700 dark:text-yellow-400">
                      {locale === 'ar' 
                        ? `إجمالي رسوم البيان الجمركي = ${dutyBreakdown.summary.total_duty_local?.toLocaleString()} + ${totalFees.toLocaleString()} = ${(dutyBreakdown.summary.grand_total_local || (dutyBreakdown.summary.total_duty_local + totalFees)).toLocaleString()} ر.س`
                        : `Total Declaration Fees = ${dutyBreakdown.summary.total_duty_local?.toLocaleString()} + ${totalFees.toLocaleString()} = ${(dutyBreakdown.summary.grand_total_local || (dutyBreakdown.summary.total_duty_local + totalFees)).toLocaleString()} SAR`
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Section 4: Other Fees */}
            <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
              <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-3">
                {locale === 'ar' ? '4. الرسوم الإضافية' : '4. Additional Fees'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label={locale === 'ar' ? 'رسوم المناولة' : 'Handling Fees'}
                  type="number"
                  step="0.01"
                  value={formData.handling_fees}
                  onChange={(e) => setFormData({ ...formData, handling_fees: e.target.value })}
                />
                <Input
                  label={locale === 'ar' ? 'رسوم الأرضيات' : 'Ground Fees'}
                  type="number"
                  step="0.01"
                  value={formData.ground_fees}
                  onChange={(e) => setFormData({ ...formData, ground_fees: e.target.value })}
                />
                <Input
                  label={locale === 'ar' ? 'رسوم أخرى' : 'Other Charges'}
                  type="number"
                  step="0.01"
                  value={formData.other_charges}
                  onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })}
                />
                <div className="flex flex-col justify-end">
                  <div className="text-sm text-gray-600 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الرسوم' : 'Total Fees'}</div>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{totalFees.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Summary Box */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-100 dark:bg-gray-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيمة CIF' : 'CIF Value'}</div>
                  <div className="text-sm font-medium">{cifValue.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرسوم الجمركية' : 'Customs Duty'}</div>
                  <div className="text-sm font-medium">{customsDuty.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رسوم إضافية' : 'Add. Fees'}</div>
                  <div className="text-sm font-medium">{totalFees.toLocaleString()}</div>
                </div>
                <div className="border-l dark:border-gray-600 pl-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{(customsDuty + totalFees).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      // For non-8005 customs declaration (just basic fields)
      fields.push(
        <Input
          key="customs_declaration_number"
          label={locale === 'ar' ? 'رقم البيان الجمركي' : 'Customs Declaration Number'}
          value={formData.customs_declaration_number}
          onChange={(e) => setFormData({ ...formData, customs_declaration_number: e.target.value })}
          helperText={locale === 'ar' ? 'سيتم إنشاؤه تلقائياً إذا تُرك فارغاً' : 'Will be auto-generated if left empty'}
        />
      );
    }
    
    // Transport Fields
    const isTransport = selectedExpenseType?.category === 'transport' || selectedAccount?.expense_category === 'transport';
    if (isTransport) {
      fields.push(
        <Input
          key="transport_from"
          label={locale === 'ar' ? 'من' : 'From'}
          value={formData.transport_from}
          onChange={(e) => setFormData({ ...formData, transport_from: e.target.value })}
        />,
        <Input
          key="transport_to"
          label={locale === 'ar' ? 'إلى' : 'To'}
          value={formData.transport_to}
          onChange={(e) => setFormData({ ...formData, transport_to: e.target.value })}
        />,
        <Input
          key="container_count"
          label={locale === 'ar' ? 'عدد الحاويات' : 'Container Count'}
          type="number"
          value={formData.container_count}
          onChange={(e) => setFormData({ ...formData, container_count: e.target.value })}
        />,
        <Input
          key="driver_name"
          label={locale === 'ar' ? 'اسم السائق' : 'Driver Name'}
          value={formData.driver_name}
          onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
        />,
        <Input
          key="receiver_name"
          label={locale === 'ar' ? 'اسم المستلم' : 'Receiver Name'}
          value={formData.receiver_name}
          onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
        />
      );
    }
    
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{fields}</div>;
  };
  
  const getStatusBadge = (expense: ShipmentExpense) => {
    if (expense.is_posted) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <LockClosedIcon className="w-3 h-3 mr-1" />
          {locale === 'ar' ? 'مرحّل' : 'Posted'}
        </span>
      );
    }
    
    if (expense.approval_status === 'approved') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <CheckIcon className="w-3 h-3 mr-1" />
          {locale === 'ar' ? 'معتمد' : 'Approved'}
        </span>
      );
    }
    
    if (expense.approval_status === 'rejected') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XMarkIcon className="w-3 h-3 mr-1" />
          {locale === 'ar' ? 'مرفوض' : 'Rejected'}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        {locale === 'ar' ? 'معلق' : 'Draft'}
      </span>
    );
  };
  
  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {locale === 'ar' ? 'مصاريف الشحنة' : 'Shipment Expenses'}
          </h3>
          {shipment && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {locale === 'ar' ? 'رقم الشحنة:' : 'Shipment:'} <strong>{shipment.shipment_number}</strong>
              {shipment.bl_number && <> • BL: <strong>{shipment.bl_number}</strong></>}
              {shipment.project_code && <> • {locale === 'ar' ? 'مشروع:' : 'Project:'} <strong>{shipment.project_code}</strong></>}
            </p>
          )}
        </div>
        {canCreate && (
          <Button onClick={handleOpenAddModal}>
            <PlusIcon className="w-5 h-5 mr-2" />
            {locale === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {costSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
              {locale === 'ar' ? 'إجمالي التكاليف' : 'Total Cost'}
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {Number(costSummary.total_cost || 0).toFixed(2)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {locale === 'ar' ? `${costSummary.expense_count || 0} مصروف` : `${costSummary.expense_count || 0} expenses`}
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="text-sm text-green-600 dark:text-green-400 mb-1">
              {locale === 'ar' ? 'المعتمد' : 'Approved'}
            </div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {Number(costSummary.total_approved_cost || 0).toFixed(2)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              {locale === 'ar' ? `${costSummary.approved_count || 0} مصروف` : `${costSummary.approved_count || 0} expenses`}
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">
              {locale === 'ar' ? 'معلق' : 'Pending'}
            </div>
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {Number(costSummary.total_pending_cost || 0).toFixed(2)}
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">
              {locale === 'ar' ? 'مرحّل' : 'Posted'}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {locale === 'ar' ? `${costSummary.posted_count || 0} مصروف` : `${costSummary.posted_count || 0} expenses`}
            </div>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'نوع المصروف' : 'Expense Type'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'المبلغ' : 'Amount'}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'التاريخ' : 'Date'}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الحالة' : 'Status'}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'لا توجد مصاريف' : 'No expenses found'}
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {locale === 'ar' ? expense.expense_type_name_ar : expense.expense_type_name_en}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {expense.expense_type_code}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {Number(expense.total_amount || 0).toFixed(2)} {expense.currency_symbol || ''}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {Number(expense.total_in_base_currency || 0).toFixed(2)} SAR
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                      {new Date(expense.expense_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(expense)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Print Button - available for all */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePrint(expense)}
                          title={locale === 'ar' ? 'طباعة' : 'Print'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </Button>
                        
                        {/* Print Request Button - only if request exists */}
                        {expense.expense_request_id && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(`/requests/expense/${expense.expense_request_id}/print`, '_blank')}
                            title={locale === 'ar' ? 'طباعة الطلب' : 'Print Request'}
                            className="!bg-blue-100 hover:!bg-blue-200 dark:!bg-blue-900 dark:hover:!bg-blue-800"
                          >
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </Button>
                        )}
                        
                        {canUpdate && !expense.is_posted && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditExpense(expense)}
                            title={locale === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        )}
                        
                        {canApprove && expense.approval_status === 'draft' && !expense.is_posted && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleApprove(expense.id)}
                            title={locale === 'ar' ? 'اعتماد' : 'Approve'}
                          >
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {canDelete && !expense.is_posted && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setExpenseToDelete(expense.id);
                              setDeleteConfirmOpen(true);
                            }}
                            title={locale === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editMode 
          ? (locale === 'ar' ? 'تعديل المصروف' : 'Edit Expense')
          : (locale === 'ar' ? 'إضافة مصروف جديد' : 'Add New Expense')
        }
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Selection Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {locale === 'ar' ? 'اختيار الحساب من شجرة الحسابات' : 'Select Account from Chart of Accounts'}
            </h3>
            
            {/* Parent Account Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {locale === 'ar' ? 'الحساب الرئيسي' : 'Parent Account'}
                </label>
                <select
                  value={selectedParentCode}
                  onChange={(e) => handleParentAccountChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                >
                  {parentAccounts.map(acc => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {locale === 'ar' ? acc.name_ar : acc.name} 
                      {acc.is_default ? (locale === 'ar' ? ' (افتراضي)' : ' (Default)') : ''}
                      {acc.children_count > 0 ? ` (${acc.children_count})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Current Parent Info */}
              {expenseAccounts.parent && (
                <div className="flex items-center">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {locale === 'ar' ? 'الحساب المحدد:' : 'Selected Parent:'}
                    </div>
                    <div className="font-semibold text-blue-800 dark:text-blue-200">
                      {expenseAccounts.parent.code}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {locale === 'ar' ? expenseAccounts.parent.name_ar : expenseAccounts.parent.name}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Child Account Selector with Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {locale === 'ar' ? 'حساب المصروف الفرعي' : 'Expense Sub-Account'}
                <span className="text-red-500 mx-1">*</span>
              </label>
              
              {/* Search Input */}
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder={locale === 'ar' ? '🔍 ابحث بالرقم أو الاسم...' : '🔍 Search by code or name...'}
                  value={accountSearchQuery}
                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Account List */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-white dark:bg-gray-800">
                {expenseAccounts.children.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'لا توجد حسابات فرعية' : 'No sub-accounts found'}
                  </div>
                ) : (
                  expenseAccounts.children
                    .filter(acc => {
                      if (!accountSearchQuery) return true;
                      const query = accountSearchQuery.toLowerCase();
                      return acc.code.toLowerCase().includes(query) ||
                             acc.name.toLowerCase().includes(query) ||
                             (acc.name_ar && acc.name_ar.toLowerCase().includes(query));
                    })
                    .map(acc => (
                      <div
                        key={acc.id}
                        onClick={() => handleAccountSelect(acc.id.toString())}
                        className={`p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
                          formData.account_id === acc.id.toString() 
                            ? 'bg-blue-100 dark:bg-blue-900/50 border-l-4 border-l-blue-500' 
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{acc.code}</span>
                            <span className="mx-2 text-gray-400">|</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {locale === 'ar' ? (acc.name_ar || acc.name) : acc.name}
                            </span>
                          </div>
                          {formData.account_id === acc.id.toString() && (
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {acc.expense_type_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {locale === 'ar' ? 'نوع المصروف:' : 'Expense Type:'} {locale === 'ar' ? acc.expense_type_name_ar : acc.expense_type_name}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
              
              {/* Selected Account Info */}
              {selectedAccount && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="font-semibold text-green-800 dark:text-green-200">
                        {selectedAccount.code} - {locale === 'ar' ? (selectedAccount.name_ar || selectedAccount.name) : selectedAccount.name}
                      </div>
                      {selectedAccount.expense_type_name && (
                        <div className="text-sm text-green-600 dark:text-green-400">
                          {locale === 'ar' ? 'نوع المصروف المرتبط:' : 'Linked Expense Type:'} {locale === 'ar' ? selectedAccount.expense_type_name_ar : selectedAccount.expense_type_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Fallback: Original Expense Type Selector (if no accounts loaded) */}
          {!expenseAccounts.parent && parentAccounts.length === 0 && (
            <Select
              label={locale === 'ar' ? 'نوع المصروف' : 'Expense Type'}
              value={formData.expense_type_id}
              onChange={(e) => handleExpenseTypeChange(e.target.value)}
              required
            >
              <option value="">{locale === 'ar' ? '-- اختر نوع المصروف --' : '-- Select Expense Type --'}</option>
              {expenseTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {locale === 'ar' ? type.name_ar : type.name} ({type.code})
                </option>
              ))}
            </Select>
          )}

          {/* Amount & VAT */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label={locale === 'ar' ? 'المبلغ قبل الضريبة' : 'Amount Before VAT'}
              type="number"
              step="0.01"
              value={formData.amount_before_vat}
              onChange={(e) => handleAmountChange(e.target.value)}
              required
            />
            
            <Input
              label={locale === 'ar' ? 'نسبة الضريبة %' : 'VAT Rate %'}
              type="number"
              step="0.01"
              value={formData.vat_rate}
              onChange={(e) => handleVATRateChange(e.target.value)}
            />
            
            <Input
              label={locale === 'ar' ? 'مبلغ الضريبة' : 'VAT Amount'}
              type="number"
              step="0.01"
              value={formData.vat_amount}
              onChange={(e) => handleVATAmountChange(e.target.value)}
              className="bg-blue-50 dark:bg-blue-900/20"
            />
            
            <Input
              label={locale === 'ar' ? 'الإجمالي شامل الضريبة' : 'Total Including VAT'}
              type="number"
              step="0.01"
              value={formData.amount_before_vat ? (
                parseFloat(formData.amount_before_vat) + 
                parseFloat(formData.vat_amount || '0')
              ).toFixed(2) : '0.00'}
              disabled
              className="bg-gray-100 dark:bg-gray-700"
            />
          </div>

          {/* Expense Date */}
          <Input
            label={locale === 'ar' ? 'تاريخ المصروف' : 'Expense Date'}
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            required
          />

          {/* Currency & Exchange Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencySelector
              label={locale === 'ar' ? 'العملة' : 'Currency'}
              value={formData.currency_id}
              onChange={(currencyId, currencyCode) => {
                setFormData({ ...formData, currency_id: currencyId });
                setSelectedCurrencyCode(currencyCode);
              }}
              required
            />
            
            <ExchangeRateField
              currencyCode={selectedCurrencyCode}
              value={formData.exchange_rate}
              onChange={(rate) => setFormData({ ...formData, exchange_rate: rate })}
            />
          </div>

          {/* Amount in Words (Auto-generated display) */}
          {formData.amount_before_vat && formData.currency_id && selectedCurrencyCode && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                {locale === 'ar' ? 'المبلغ كتابة:' : 'Amount in Words:'}
              </div>
              <div 
                className="text-base font-semibold text-blue-800 dark:text-blue-300" 
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
              >
                {(() => {
                  const totalAmount = parseFloat(formData.amount_before_vat) + 
                    (parseFloat(formData.amount_before_vat) * (parseFloat(formData.vat_rate || '0') / 100));
                  return amountToWords(totalAmount, selectedCurrencyCode, locale as 'en' | 'ar');
                })()}
              </div>
            </div>
          )}

          {/* Dynamic Fields Based on Expense Type */}
          {renderDynamicFields()}

          {/* References */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            />
            
            <Input
              label={locale === 'ar' ? 'رقم الإيصال' : 'Receipt Number'}
              value={formData.receipt_number}
              onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
            />
          </div>

          {/* Description & Notes */}
          <Input
            label={locale === 'ar' ? 'الوصف' : 'Description'}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          
          <Input
            label={locale === 'ar' ? 'ملاحظات' : 'Notes'}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit">
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setExpenseToDelete(null);
        }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف المصروف' : 'Delete Expense'}
        message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this expense? This action cannot be undone.'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
