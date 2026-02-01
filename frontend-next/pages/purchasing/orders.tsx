/**
 * 🛒 PURCHASE ORDERS PAGE
 * =======================
 * Production-ready purchase orders management connected to real API
 * 
 * Features:
 * ✅ Full CRUD operations
 * ✅ Real-time vendor dropdown (blocks suspended vendors)
 * ✅ Status-based workflows (approve, receive)
 * ✅ Pagination & search
 * ✅ AR/EN support
 * ✅ RBAC integration
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExchangeRateField from '../../components/ui/ExchangeRateField';
import CurrencySelector from '../../components/shared/CurrencySelector';
import SearchableSelect from '../../components/ui/SearchableSelect';
import type { SelectOption } from '../../components/ui/SearchableSelect';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { companyStore } from '../../lib/companyStore';
// 📦 Shared Types
import type { Vendor as SharedVendor } from '@/shared/types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface PurchaseOrder {
  id: number;
  order_number: string;
  vendor_contract_number?: string | null;
  vendor_contract_date?: string | null;
  vendor_contract_number_resolved?: string | null;
  vendor_contract_date_resolved?: string | null;
  vendor_id: number;
  vendor_name?: string;
  vendor_name_ar?: string;
  vendor_display_name?: string;
  vendor_display_name_ar?: string;
  order_type_id?: number;
  order_type_name?: string;
  order_type_name_ar?: string;
  status_id?: number;
  status_name?: string;
  status_name_ar?: string;
  status_code?: string;
  status_color?: string;
  allows_edit?: boolean;
  allows_delete?: boolean;
  allows_receive?: boolean;
  allows_invoice?: boolean;
  allows_approve?: boolean;
  order_date: string;
  expected_delivery_date?: string;
  currency_id?: number;
  currency_code?: string;
  currency_symbol?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  item_count?: number;
  item_names?: string | null;
  item_names_ar?: string | null;
  single_uom_code?: string | null;
  single_qty?: number | null;
  single_unit_price?: number | null;
  payment_terms_id?: number;
  payment_terms_name?: string;
  delivery_terms_id?: number;
  delivery_terms_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  notes?: string;
  created_at: string;
  items?: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id?: number;
  item_id?: number;
  master_item_id?: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  uom?: string;
  uom_id?: number;
  uom_code?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
  tax_rate?: number;
  line_total?: number;
  total?: number;
}

// Extending shared types with local API-specific fields
interface Vendor extends SharedVendor {
  status_code?: string;
  vendor_code?: string;
}

interface OrderType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface OrderStatus {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  color?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function PurchaseOrdersPage() {
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { isAuthenticated, loading: authLoading, user } = useAuth();

  // Data states
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [deliveryTerms, setDeliveryTerms] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [saudiCities, setSaudiCities] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Item management states
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemUomOptions, setItemUomOptions] = useState<any[]>([]);
  const [itemFormData, setItemFormData] = useState({
    master_item_id: '',
    item_name: '',
    item_name_ar: '',
    item_code: '',
    quantity: '',
    uom_id: '',
    uom: '',
    unit_price: '',
    tax_rate: '15',
    total: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    vendor_id: '',
    order_type_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    warehouse_id: '',
    payment_method_id: '',
    delivery_terms_id: '',
    project_id: '',
    currency_id: '',
    exchange_rate: '1',
    vendor_contract_number: '',
    vendor_contract_date: '',
    ship_to_address: '',
    internal_notes: '',
    origin_country_id: '',
    origin_city_id: '',
    destination_country_id: '1', // Saudi Arabia default
    destination_city_id: '2', // Riyadh default
    port_of_loading_id: '',
    port_of_loading_text: '',
    port_of_discharge_id: '',
    shipping_address: '',
    shipping_instructions: '',
    notes: '',
    items: [] as PurchaseOrderItem[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);

  // Filter cities based on selected origin country
  const originCities = cities.filter(c => c.country_id === Number(formData.origin_country_id));

  // Filter projects based on selected vendor
  const filteredProjects = useMemo(() => {
    if (!formData.vendor_id) return [];
    const vendorId = parseInt(formData.vendor_id, 10);
    return (projects || []).filter((p: any) => p.vendor_id === vendorId);
  }, [projects, formData.vendor_id]);

  const getToken = () => localStorage.getItem('accessToken');
  const getCompanyId = () => companyStore.getActiveCompanyId();

  const getHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    'X-Company-Id': String(getCompanyId() || ''),
  });

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const headers = getHeaders();

      const [vendorsRes, typesRes, statusesRes, paymentsRes, deliveryTermsRes, projectsRes, countriesRes, citiesRes, portsRes, itemsRes] = await Promise.all([
        fetch(`${API_BASE}/api/procurement/vendors?limit=10000`, { headers }),
        fetch(`${API_BASE}/api/procurement/purchase-orders/order-types`, { headers }),
        fetch(`${API_BASE}/api/procurement/purchase-orders/order-statuses`, { headers }),
        fetch(`${API_BASE}/api/payment-methods?limit=100`, { headers }),
        fetch(`${API_BASE}/api/procurement/reference/delivery-terms`, { headers }),
        fetch(`${API_BASE}/api/projects?limit=500`, { headers }),
        fetch(`${API_BASE}/api/countries?limit=1000`, { headers }),
        fetch(`${API_BASE}/api/cities?limit=10000`, { headers }),
        fetch(`${API_BASE}/api/ports?limit=1000&country_id=1`, { headers }), // Saudi Arabia ports (country_id=1)
        fetch(`${API_BASE}/api/master/items/for-invoice?is_active=true&limit=10000`, { headers }),
      ]);

      if (vendorsRes.ok) {
        const result = await vendorsRes.json();
        setVendors(result.data || []);
      }
      if (typesRes.ok) {
        const result = await typesRes.json();
        setOrderTypes(result.data || []);
      }
      if (statusesRes.ok) {
        const result = await statusesRes.json();
        setOrderStatuses(result.data || []);
      }
      if (paymentsRes.ok) {
        const result = await paymentsRes.json();
        console.log('Payment Methods loaded:', result.data?.length || 0, 'items');
        setPaymentMethods(result.data || []);
      } else {
        console.error('Failed to fetch payment methods:', paymentsRes.status);
      }
      if (deliveryTermsRes.ok) {
        const result = await deliveryTermsRes.json();
        console.log('Delivery Terms (Incoterms) loaded:', result.data?.length || 0, 'items');
        setDeliveryTerms(result.data || []);
      } else {
        console.error('Failed to fetch delivery terms:', deliveryTermsRes.status);
      }
      if (projectsRes.ok) {
        const result = await projectsRes.json();
        console.log('Projects loaded:', result.data?.length || 0, 'items');
        setProjects(result.data || []);
      } else {
        console.error('Failed to fetch projects:', projectsRes.status);
      }
      if (countriesRes.ok) {
        const result = await countriesRes.json();
        setCountries(result.data || []);
      }
      if (citiesRes.ok) {
        const result = await citiesRes.json();
        const allCities = result.data || [];
        setCities(allCities);
        // Filter Saudi cities (country_id = 1 for Saudi Arabia)
        setSaudiCities(allCities.filter((c: any) => c.country_id === 1));
      }
      if (portsRes.ok) {
        const result = await portsRes.json();
        setPorts(result.data || []);
      }
      if (itemsRes.ok) {
        const result = await itemsRes.json();
        console.log('Master items loaded:', result.data?.length || 0, 'items');
        setMasterItems(result.data || []);
      } else {
        console.error('Failed to fetch master items:', itemsRes.status);
      }
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_id', statusFilter);

      const res = await fetch(`${API_BASE}/api/procurement/purchase-orders?${params}`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const result = await res.json();
        setOrders(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } else if (res.status === 401 || res.status === 403) {
        console.error('Access denied');
      } else {
        console.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  // Fetch order details
  const fetchOrderDetails = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/procurement/purchase-orders/${id}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        return result.data;
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    }
    return null;
  };

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchReferenceData();
      fetchOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // Refetch orders when filters change (after initial load)
  useEffect(() => {
    if (hasFetchedRef.current && isAuthenticated) {
      fetchOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.vendor_id) errors.vendor_id = locale === 'ar' ? 'المورد مطلوب' : 'Vendor is required';
    if (!formData.order_date) errors.order_date = locale === 'ar' ? 'تاريخ الطلب مطلوب' : 'Order date is required';    if (!formData.project_id) errors.project_id = locale === 'ar' ? 'رقم المشروع مطلوب للاعتماد' : 'Project is required for approval';    if (formData.items.length === 0) errors.items = locale === 'ar' ? 'أضف بند واحد على الأقل' : 'Add at least one item';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create/update
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = editingOrder
        ? `${API_BASE}/api/procurement/purchase-orders/${editingOrder.id}`
        : `${API_BASE}/api/procurement/purchase-orders`;
      const method = editingOrder ? 'PUT' : 'POST';

      const body = {
        vendor_id: parseInt(formData.vendor_id),
        order_type_id: formData.order_type_id ? parseInt(formData.order_type_id) : null,
        order_date: formData.order_date,
        expected_date: formData.expected_delivery_date || null,
        warehouse_id: formData.warehouse_id ? parseInt(formData.warehouse_id) : null,
        payment_method_id: formData.payment_method_id ? parseInt(formData.payment_method_id) : null,
        delivery_terms_id: formData.delivery_terms_id ? parseInt(formData.delivery_terms_id) : null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        currency_id: formData.currency_id ? parseInt(formData.currency_id) : null,
        exchange_rate: parseFloat(formData.exchange_rate) || 1,
        vendor_contract_number: formData.vendor_contract_number || null,
        vendor_contract_date: formData.vendor_contract_date || null,
        ship_to_address: formData.ship_to_address || null,
        internal_notes: formData.internal_notes || null,
        // Location fields
        origin_country_id: formData.origin_country_id ? parseInt(formData.origin_country_id) : null,
        origin_city_id: formData.origin_city_id ? parseInt(formData.origin_city_id) : null,
        destination_country_id: formData.destination_country_id ? parseInt(formData.destination_country_id) : null,
        destination_city_id: formData.destination_city_id ? parseInt(formData.destination_city_id) : null,
        port_of_loading_id: formData.port_of_loading_id ? parseInt(formData.port_of_loading_id) : null,
        port_of_loading_text: formData.port_of_loading_text || null,
        port_of_discharge_id: formData.port_of_discharge_id ? parseInt(formData.port_of_discharge_id) : null,
        notes: formData.notes,
        items: formData.items.map(item => ({
          item_id: item.master_item_id,
          item_code: item.item_code,
          item_name: item.item_name,
          item_name_ar: item.item_name_ar,
          uom_id: item.uom_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          tax_rate: item.tax_rate || item.tax_percent || 0,
        })),
      };

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(
          editingOrder
            ? (locale === 'ar' ? 'تم تحديث الطلب' : 'Order updated')
            : (locale === 'ar' ? 'تم إنشاء الطلب' : 'Order created'),
          'success'
        );
        setModalOpen(false);
        fetchOrders();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Operation failed', 'error');
      }
    } catch (error) {
      showToast('Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle approve
  const handleApprove = async (order: PurchaseOrder) => {
    try {
      const res = await fetch(`${API_BASE}/api/procurement/purchase-orders/${order.id}/approve`, {
        method: 'PUT',
        headers: getHeaders(),
      });

      if (res.ok) {
        showToast(locale === 'ar' ? 'تم اعتماد الطلب' : 'Order approved', 'success');
        fetchOrders();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Approval failed', 'error');
      }
    } catch (error) {
      showToast('Approval failed', 'error');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!orderToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/purchase-orders/${orderToDelete.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        showToast(locale === 'ar' ? 'تم حذف الطلب' : 'Order deleted', 'success');
        setDeleteConfirmOpen(false);
        setOrderToDelete(null);
        fetchOrders();
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast('Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Open create modal
  const handleOpenCreate = () => {
    setEditingOrder(null);
    setFormData({
      vendor_id: '',
      order_type_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      warehouse_id: '',
      payment_method_id: '',
      delivery_terms_id: '',
      project_id: '',
      currency_id: '',
      exchange_rate: '1',
      vendor_contract_number: '',
      vendor_contract_date: '',
      ship_to_address: '',
      internal_notes: '',
      origin_country_id: '',
      origin_city_id: '',
      destination_country_id: '1',
      destination_city_id: '2', // Riyadh default
      port_of_loading_id: '',
      port_of_loading_text: '',
      port_of_discharge_id: '',
      shipping_address: '',
      shipping_instructions: '',
      notes: '',
      items: [],
    });
    setSelectedCurrencyCode(null);
    setFormErrors({});
    setModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = async (order: PurchaseOrder) => {
    const details = await fetchOrderDetails(order.id);
    if (details) {
      setEditingOrder(details);
      setFormData({
        vendor_id: String(details.vendor_id),
        order_type_id: details.order_type_id ? String(details.order_type_id) : '',
        order_date: details.order_date?.split('T')[0] || '',
        expected_delivery_date: details.expected_delivery_date?.split('T')[0] || '',
        warehouse_id: details.warehouse_id ? String(details.warehouse_id) : '',
        payment_method_id: (details as any).payment_method_id ? String((details as any).payment_method_id) : '',
        delivery_terms_id: (details as any).delivery_terms_id ? String((details as any).delivery_terms_id) : '',
        project_id: (details as any).project_id ? String((details as any).project_id) : '',
        currency_id: details.currency_id ? String(details.currency_id) : '',
        exchange_rate: (details as any).exchange_rate ? String((details as any).exchange_rate) : '1',
        vendor_contract_number: (details as any).vendor_contract_number || '',
        vendor_contract_date: (details as any).vendor_contract_date?.split('T')[0] || '',
        ship_to_address: (details as any).ship_to_address || '',
        internal_notes: (details as any).internal_notes || '',
        origin_country_id: (details as any).origin_country_id ? String((details as any).origin_country_id) : '',
        origin_city_id: (details as any).origin_city_id ? String((details as any).origin_city_id) : '',
        destination_country_id: (details as any).destination_country_id ? String((details as any).destination_country_id) : '1',
        destination_city_id: (details as any).destination_city_id ? String((details as any).destination_city_id) : '2', // Default to Riyadh
        port_of_loading_id: (details as any).port_of_loading_id ? String((details as any).port_of_loading_id) : '',
        port_of_loading_text: (details as any).port_of_loading_text || '',
        port_of_discharge_id: (details as any).port_of_discharge_id ? String((details as any).port_of_discharge_id) : '',
        shipping_address: (details as any).shipping_address || '',
        shipping_instructions: (details as any).shipping_instructions || '',
        notes: details.notes || '',
        items: details.items || [],
      });
      setSelectedCurrencyCode(details.currency_code || null);
      setFormErrors({});
      setModalOpen(true);
    }
  };

  // Open view modal
  const handleOpenView = async (order: PurchaseOrder) => {
    const details = await fetchOrderDetails(order.id);
    if (details) {
      setViewingOrder(details);
      setViewModalOpen(true);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, symbol?: string) => {
    return `${symbol || 'SAR'} ${amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}`;
  };

  const renderItemsCell = (order: PurchaseOrder) => {
    const preferred = locale === 'ar' ? order.item_names_ar : order.item_names;
    const raw = String(preferred || order.item_names || '').trim();
    if (!raw) return <span className="text-gray-400">—</span>;
    // Backend sends newline-separated items
    return <div className="whitespace-pre-line text-sm text-gray-900 dark:text-white">{raw}</div>;
  };

  // Get status badge
  const getStatusBadge = (order: PurchaseOrder) => {
    const color = order.status_color || 'gray';
    const name = locale === 'ar' ? order.status_name_ar : order.status_name;
    return (
      <span 
        className={clsx(
          'px-2 py-0.5 text-xs font-medium rounded-full',
          `bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-300`
        )}
        style={{ backgroundColor: `${color}20`, color }}
      >
        {name || order.status_code}
      </span>
    );
  };

  // Check if order can be edited
  const canEdit = (order: PurchaseOrder) => {
    if (typeof order.allows_edit === 'boolean') return order.allows_edit;
    const status = String(order.status_code || (order as any).status || '').toUpperCase();
    return ['DRAFT', 'PENDING', 'PENDING_APPROVAL'].includes(status);
  };

  // Check if order can be deleted
  const canDelete = (order: PurchaseOrder) => {
    // Allow super_admin and admin to delete any order regardless of status
    const userRoles = user?.roles || [];
    const isSuperAdminOrAdmin = userRoles.includes('super_admin') || userRoles.includes('admin');
    
    if (isSuperAdminOrAdmin) {
      return true; // Super admin and admin can delete any order
    }
    
    // For other users, check allows_delete from backend or status
    if (typeof order.allows_delete === 'boolean') return order.allows_delete;
    const status = String(order.status_code || (order as any).status || '').toUpperCase();
    // DB constraint (prevent_delete_received_po): only draft/pending_approval can be soft-deleted
    return ['DRAFT', 'PENDING', 'PENDING_APPROVAL'].includes(status);
  };

  // Check if order can be approved
  const canApprove = (order: PurchaseOrder) => {
    if (typeof order.allows_approve === 'boolean') return order.allows_approve;
    const status = String(order.status_code || (order as any).status || '').toUpperCase();
    return ['PENDING_APPROVAL'].includes(status);
  };

  // Item management functions
  const handleOpenItemModal = (index: number | null = null) => {
    if (index !== null) {
      const item = formData.items[index];
      setEditingItemIndex(index);

      const selectedMaster = masterItems.find((mi) => String(mi.id) === String(item.master_item_id || item.item_id));
      const masterUoms = Array.isArray(selectedMaster?.uoms) ? selectedMaster?.uoms : [];
      const baseUomId = selectedMaster?.base_uom_id;
      const baseUomCode = selectedMaster?.base_uom_code || selectedMaster?.base_uom || '';
      const normalizedUoms = masterUoms.length
        ? masterUoms
        : baseUomId
        ? [{ uom_id: baseUomId, uom_code: baseUomCode, uom_name: selectedMaster?.base_uom_name, is_base_uom: true }]
        : [];
      setItemUomOptions(normalizedUoms);

      setItemFormData({
        master_item_id: item.master_item_id ? String(item.master_item_id) : '',
        item_name: item.item_name || '',
        item_name_ar: item.item_name_ar || '',
        item_code: item.item_code || '',
        quantity: String(item.quantity || ''),
        uom_id: item.uom_id ? String(item.uom_id) : '',
        uom: item.uom || item.uom_code || '',
        unit_price: String(item.unit_price || ''),
        tax_rate: String(item.tax_rate || '15'),
        total: String(item.total || ''),
      });
    } else {
      setEditingItemIndex(null);
      setItemUomOptions([]);
      setItemFormData({
        master_item_id: '',
        item_name: '',
        item_name_ar: '',
        item_code: '',
        quantity: '',
        uom_id: '',
        uom: '',
        unit_price: '',
        tax_rate: '15',
        total: '',
      });
    }
    setItemSearch('');
    setItemModalOpen(true);
  };

  const handleSelectItem = (item: any) => {
    console.log('Selected item:', item);
    const uoms = Array.isArray(item.uoms) ? item.uoms : [];
    const baseUomId = item.base_uom_id;
    const baseUomCode = item.base_uom_code || item.base_uom || '';
    const normalizedUoms = uoms.length
      ? uoms
      : baseUomId
      ? [{ uom_id: baseUomId, uom_code: baseUomCode, uom_name: item.base_uom_name, is_base_uom: true }]
      : [];
    setItemUomOptions(normalizedUoms);

    const baseUom = normalizedUoms.find((u: any) => u.is_base_uom) || normalizedUoms[0];
    const uomCode = baseUom?.uom_code || baseUom?.code || item.base_uom_code || item.base_uom || '';
    const uomId = baseUom?.uom_id ? String(baseUom.uom_id) : '';

    setItemFormData({
      ...itemFormData,
      master_item_id: String(item.id),
      item_name: item.name || '',
      item_name_ar: item.name_ar || '',
      item_code: item.code || item.item_code || '',
      uom_id: uomId,
      uom: uomCode,
      unit_price: item.purchase_price ? String(item.purchase_price) : itemFormData.unit_price,
    });
    setItemSearch('');
  };

  const calculateItemTotal = (qty: string, price: string, taxRate: string) => {
    const q = parseFloat(qty) || 0;
    const p = parseFloat(price) || 0;
    const t = parseFloat(taxRate) || 0;
    const subtotal = q * p;
    const taxAmount = subtotal * (t / 100);
    return (subtotal + taxAmount).toFixed(2);
  };

  const calculateUnitPrice = (qty: string, total: string, taxRate: string) => {
    const q = parseFloat(qty) || 0;
    const tot = parseFloat(total) || 0;
    const t = parseFloat(taxRate) || 0;
    if (q === 0) return '0';
    const subtotal = tot / (1 + t / 100);
    return (subtotal / q).toFixed(2);
  };

  const handleItemQuantityChange = (value: string) => {
    setItemFormData({ ...itemFormData, quantity: value });
    if (itemFormData.unit_price) {
      const newTotal = calculateItemTotal(value, itemFormData.unit_price, itemFormData.tax_rate);
      setItemFormData(prev => ({ ...prev, quantity: value, total: newTotal }));
    }
  };

  const handleItemPriceChange = (value: string) => {
    setItemFormData({ ...itemFormData, unit_price: value });
    if (itemFormData.quantity) {
      const newTotal = calculateItemTotal(itemFormData.quantity, value, itemFormData.tax_rate);
      setItemFormData(prev => ({ ...prev, unit_price: value, total: newTotal }));
    }
  };

  const handleItemTotalChange = (value: string) => {
    setItemFormData({ ...itemFormData, total: value });
    if (itemFormData.quantity) {
      const newPrice = calculateUnitPrice(itemFormData.quantity, value, itemFormData.tax_rate);
      setItemFormData(prev => ({ ...prev, total: value, unit_price: newPrice }));
    }
  };

  const handleSaveItem = () => {
    if (!itemFormData.item_name || !itemFormData.quantity || !itemFormData.unit_price) {
      showToast(locale === 'ar' ? 'يرجى إدخال جميع الحقول المطلوبة' : 'Please fill all required fields', 'error');
      return;
    }

    const newItem: PurchaseOrderItem = {
      master_item_id: itemFormData.master_item_id ? parseInt(itemFormData.master_item_id) : undefined,
      item_name: itemFormData.item_name,
      item_name_ar: itemFormData.item_name_ar,
      item_code: itemFormData.item_code,
      quantity: parseFloat(itemFormData.quantity),
      uom_id: itemFormData.uom_id ? parseInt(itemFormData.uom_id) : undefined,
      uom_code: itemFormData.uom || undefined,
      uom: itemFormData.uom,
      unit_price: parseFloat(itemFormData.unit_price),
      tax_rate: parseFloat(itemFormData.tax_rate),
      total: parseFloat(itemFormData.total),
      discount_percent: 0,
      tax_percent: parseFloat(itemFormData.tax_rate),
      line_total: parseFloat(itemFormData.total),
    };

    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items];
      updatedItems[editingItemIndex] = newItem;
      setFormData({ ...formData, items: updatedItems });
    } else {
      setFormData({ ...formData, items: [...formData.items, newItem] });
    }

    setItemModalOpen(false);
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const filteredItems = masterItems.filter(item => {
    if (!itemSearch) return false;
    const search = itemSearch.toLowerCase();
    const name = (locale === 'ar' ? (item.name_ar || item.name) : item.name || '').toLowerCase();
    const code = (item.item_code || '').toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'أوامر الشراء' : 'Purchase Orders'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'أوامر الشراء' : 'Purchase Orders'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? `${total} طلب` : `${total} orders`}
              </p>
            </div>
          </div>

          {hasPermission('purchase_orders:create') && (
            <Button onClick={handleOpenCreate}>
              <PlusIcon className="h-5 w-5 mr-1" />
              {locale === 'ar' ? 'إنشاء أمر شراء جديد' : 'New Purchase Order'}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
              {orderStatuses.map(status => (
                <option key={status.id} value={status.id}>
                  {locale === 'ar' ? status.name_ar : status.name}
                </option>
              ))}
            </select>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value={20}>20 {locale === 'ar' ? 'لكل صفحة' : 'per page'}</option>
              <option value={50}>50 {locale === 'ar' ? 'لكل صفحة' : 'per page'}</option>
              <option value={100}>100 {locale === 'ar' ? 'لكل صفحة' : 'per page'}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {locale === 'ar' ? 'لا توجد طلبات' : 'No orders found'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'رقم الطلب' : 'Order #'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'رقم عقد المورد' : 'Vendor Contract #'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'المورد' : 'Vendor'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الأصناف' : 'Items'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الوحدة' : 'UOM'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الكمية' : 'Qty'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'السعر' : 'Price'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الإجمالي' : 'Total'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {(order.vendor_contract_number || order.vendor_contract_number_resolved)
                        ? String(order.vendor_contract_number || order.vendor_contract_number_resolved)
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {locale === 'ar'
                        ? (order.vendor_display_name_ar || order.vendor_name_ar || order.vendor_display_name || order.vendor_name)
                        : (order.vendor_display_name || order.vendor_name || order.vendor_display_name_ar || order.vendor_name_ar)}
                    </td>
                    <td className="px-4 py-3">
                      {renderItemsCell(order)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {order.item_count === 1 ? (order.single_uom_code || '—') : (order.item_count && order.item_count > 1 ? (locale === 'ar' ? 'متعدد' : 'Multiple') : '—')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {order.item_count === 1 && order.single_qty != null ? Number(order.single_qty).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US') : (order.item_count && order.item_count > 1 ? (locale === 'ar' ? 'متعدد' : 'Multiple') : '—')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {order.item_count === 1 && order.single_unit_price != null ? formatCurrency(Number(order.single_unit_price), order.currency_symbol) : (order.item_count && order.item_count > 1 ? (locale === 'ar' ? 'متعدد' : 'Multiple') : '—')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(order.total_amount, order.currency_symbol)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(order)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/purchasing/orders/${order.id}?mode=view`)}
                          className="p-1 text-gray-500 hover:text-blue-600"
                          title={locale === 'ar' ? 'عرض' : 'View'}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => router.push(`/purchasing/orders/${order.id}?mode=view&print=1`)}
                          className="p-1 text-gray-500 hover:text-slate-800 dark:hover:text-white"
                          title={locale === 'ar' ? 'طباعة' : 'Print'}
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </button>
                        {(hasPermission('purchase_orders:edit') || hasPermission('purchase_orders:update')) && (isSuperAdmin || canEdit(order)) && (
                          <button
                            onClick={() => router.push(`/purchasing/orders/${order.id}`)}
                            className="p-1 text-gray-500 hover:text-yellow-600"
                            title={locale === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                        {hasPermission('purchase_orders:delete') && canDelete(order) && (
                          <button
                            onClick={() => { setOrderToDelete(order); setDeleteConfirmOpen(true); }}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title={locale === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' 
                  ? `صفحة ${currentPage} من ${totalPages}`
                  : `Page ${currentPage} of ${totalPages}`
                }
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  {locale === 'ar' ? 'السابق' : 'Previous'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  {locale === 'ar' ? 'التالي' : 'Next'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingOrder 
          ? (locale === 'ar' ? 'تعديل طلب الشراء' : 'Edit Purchase Order')
          : (locale === 'ar' ? 'طلب شراء جديد' : 'New Purchase Order')
        }
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المورد' : 'Vendor'} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={vendors.filter(v => v.status_code !== 'SUSPENDED').map(vendor => ({
                  value: vendor.id,
                  label: vendor.name,
                  labelAr: vendor.name_ar,
                  code: vendor.vendor_code,
                  searchText: `${vendor.vendor_code} ${vendor.name} ${vendor.name_ar || ''}`
                }))}
                value={formData.vendor_id}
                onChange={(value) => setFormData({ ...formData, vendor_id: value, project_id: '' })}
                placeholder={locale === 'ar' ? 'اختر المورد' : 'Select Vendor'}
                searchPlaceholder={locale === 'ar' ? 'ابحث برقم أو اسم المورد' : 'Search by vendor code or name'}
                locale={locale}
                error={formErrors.vendor_id}
              />
              {formErrors.vendor_id && (
                <p className="text-red-500 text-xs mt-1">{formErrors.vendor_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'نوع الطلب' : 'Order Type'}
              </label>
              <select
                value={formData.order_type_id}
                onChange={(e) => setFormData({ ...formData, order_type_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">{locale === 'ar' ? 'اختر النوع' : 'Select Type'}</option>
                {orderTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {locale === 'ar' ? type.name_ar || type.name : type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ الطلب' : 'Order Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className={clsx(
                  "w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white",
                  formErrors.order_date ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                )}
              />
              {formErrors.order_date && (
                <p className="text-red-500 text-xs mt-1">{formErrors.order_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ التسليم المتوقع' : 'Expected Delivery'}
              </label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* رقم أمر شراء المورد • Vendor PO Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'رقم أمر شراء المورد' : 'Vendor PO Number'}
              </label>
              <input
                type="text"
                value={formData.vendor_contract_number}
                onChange={(e) => setFormData({ ...formData, vendor_contract_number: e.target.value })}
                placeholder={locale === 'ar' ? 'أدخل رقم أمر الشراء من المورد' : 'Enter vendor PO number'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* تاريخ أمر المورد • Vendor PO Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ أمر المورد' : 'Vendor PO Date'}
              </label>
              <input
                type="date"
                value={formData.vendor_contract_date}
                onChange={(e) => setFormData({ ...formData, vendor_contract_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المشروع' : 'Project'} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={filteredProjects.map(proj => ({
                  value: proj.id,
                  label: `${proj.code} - ${proj.name}`,
                  labelAr: `${proj.code} - ${proj.name_ar || proj.name}`,
                  code: proj.code,
                  searchText: `${proj.code} ${proj.name} ${proj.name_ar || ''}`
                }))}
                value={formData.project_id}
                onChange={(value) => setFormData({ ...formData, project_id: value })}
                placeholder={!formData.vendor_id 
                  ? (locale === 'ar' ? 'اختر المورد أولاً' : 'Select Vendor First')
                  : filteredProjects.length === 0
                    ? (locale === 'ar' ? 'لا توجد مشاريع لهذا المورد' : 'No projects for this vendor')
                    : (locale === 'ar' ? 'اختر المشروع' : 'Select Project')
                }
                searchPlaceholder={locale === 'ar' ? 'ابحث برقم أو اسم المشروع' : 'Search by project code or name'}
                locale={locale}
                error={formErrors.project_id}
              />
              {formErrors.project_id && (
                <p className="text-red-500 text-xs mt-1">{formErrors.project_id}</p>
              )}
            </div>
          </div>

          {/* Ports & Locations Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {locale === 'ar' ? 'الموانئ والمواقع • Ports & Locations' : 'Ports & Locations • الموانئ والمواقع'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Origin Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'بلد الشحن' : 'Shipping Country'}
                </label>
                <SearchableSelect
                  options={countries.map(country => ({
                    value: country.id,
                    label: country.name,
                    labelAr: country.name_ar,
                    code: country.iso_code,
                    searchText: `${country.name} ${country.name_ar || ''} ${country.iso_code || ''}`
                  }))}
                  value={formData.origin_country_id}
                  onChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      origin_country_id: value,
                      origin_city_id: '' // Reset city when country changes
                    });
                  }}
                  placeholder={locale === 'ar' ? 'اختر الدولة' : 'Select Country'}
                  searchPlaceholder={locale === 'ar' ? 'ابحث عن الدولة' : 'Search for country'}
                  locale={locale}
                />
              </div>

              {/* Origin City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'مدينة الشحن' : 'Shipping City'}
                </label>
                <select
                  value={formData.origin_city_id}
                  onChange={(e) => setFormData({ ...formData, origin_city_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  disabled={!formData.origin_country_id}
                >
                  <option value="">{locale === 'ar' ? 'اختر المدينة' : 'Select City'}</option>
                  {originCities.map(city => (
                    <option key={city.id} value={city.id}>
                      {locale === 'ar' ? city.name_ar || city.name : city.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Country (defaults to Saudi Arabia) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'بلد الوصول' : 'Destination Country'}
                </label>
                <SearchableSelect
                  options={countries.map(country => ({
                    value: country.id,
                    label: country.name,
                    labelAr: country.name_ar,
                    code: country.iso_code,
                    searchText: `${country.name} ${country.name_ar || ''} ${country.iso_code || ''}`
                  }))}
                  value={formData.destination_country_id}
                  onChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      destination_country_id: value,
                      destination_city_id: '' // Reset city when country changes
                    });
                  }}
                  placeholder={locale === 'ar' ? 'اختر الدولة' : 'Select Country'}
                  searchPlaceholder={locale === 'ar' ? 'ابحث عن الدولة' : 'Search for country'}
                  locale={locale}
                />
              </div>

              {/* Destination City (defaults to Riyadh) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'الوجهة (افتراضي: الرياض)' : 'Destination (Default: Riyadh)'}
                </label>
                <select
                  value={formData.destination_city_id}
                  onChange={(e) => setFormData({ ...formData, destination_city_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  disabled={!formData.destination_country_id}
                >
                  <option value="">{locale === 'ar' ? 'اختر المدينة' : 'Select City'}</option>
                  {(formData.destination_country_id === '1' ? saudiCities : cities.filter(c => c.country_id === Number(formData.destination_country_id))).map((city: any) => (
                    <option key={city.id} value={city.id}>
                      {locale === 'ar' ? city.name_ar || city.name : city.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Port of Loading - Free text field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'ميناء الشحن (اختياري)' : 'Port of Loading (Optional)'}
                </label>
                <input
                  type="text"
                  value={formData.port_of_loading_text}
                  onChange={(e) => setFormData({ ...formData, port_of_loading_text: e.target.value, port_of_loading_id: '' })}
                  placeholder={locale === 'ar' ? 'أدخل اسم الميناء' : 'Enter port name'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Port of Discharge - Saudi ports only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'ميناء/مطار الوصول' : 'Port/Airport of Discharge'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.port_of_discharge_id}
                  onChange={(e) => setFormData({ ...formData, port_of_discharge_id: e.target.value })}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white",
                    formErrors.port_of_discharge_id ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  )}
                >
                  <option value="">{locale === 'ar' ? 'اختر الميناء/المطار' : 'Select Port/Airport'}</option>
                  {ports.map(port => (
                    <option key={port.id} value={port.id}>
                      {locale === 'ar' ? port.name_ar || port.name : port.name}
                    </option>
                  ))}
                </select>
                {formErrors.port_of_discharge_id && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.port_of_discharge_id}</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment & Currency Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {locale === 'ar' ? 'الدفع والعملة • Payment & Currency' : 'Payment & Currency • الدفع والعملة'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
              </label>
              <select
                value={formData.payment_method_id}
                onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">{locale === 'ar' ? 'اختر طريقة الدفع' : 'Select Payment Method'}</option>
                {paymentMethods.map(pm => (
                  <option key={pm.id} value={pm.id}>
                    {locale === 'ar' ? pm.name_ar || pm.name : pm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Incoterm / Delivery Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'شروط التسليم (Incoterm)' : 'Delivery Terms (Incoterm)'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.delivery_terms_id}
                onChange={(e) => setFormData({ ...formData, delivery_terms_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">{locale === 'ar' ? 'اختر شروط التسليم' : 'Select Delivery Terms'}</option>
                {deliveryTerms.map(dt => (
                  <option key={dt.id} value={dt.id}>
                    {dt.incoterm_code ? `${dt.incoterm_code} - ` : ''}{locale === 'ar' ? dt.name_ar || dt.name : dt.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {locale === 'ar' ? 'مثال: FOB, CIF, EXW' : 'e.g., FOB, CIF, EXW'}
              </p>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'العملة' : 'Currency'}
              </label>
              <CurrencySelector
                value={formData.currency_id ? parseInt(formData.currency_id) : null}
                onChange={(id) => setFormData({ ...formData, currency_id: id ? String(id) : '' })}
                onCurrencyCodeChange={setSelectedCurrencyCode}
                companyId={getCompanyId()}
              />
            </div>

            {/* Exchange Rate - only shows when currency differs from base */}
            <ExchangeRateField
              currencyCode={selectedCurrencyCode}
              value={formData.exchange_rate}
              onChange={(value) => setFormData({ ...formData, exchange_rate: value })}
              hideWhenBaseCurrency={true}
              date={formData.order_date}
              label={locale === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
            />
          </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Shipping Details Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {locale === 'ar' ? 'تفاصيل الشحن • Shipping Details' : 'Shipping Details • تفاصيل الشحن'}
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'عنوان الشحن' : 'Shipping Address'}
                </label>
                <textarea
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  rows={2}
                  placeholder={locale === 'ar' ? 'أدخل عنوان الشحن الكامل' : 'Enter full shipping address'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {locale === 'ar' ? 'تعليمات الشحن' : 'Shipping Instructions'}
                </label>
                <textarea
                  value={formData.shipping_instructions}
                  onChange={(e) => setFormData({ ...formData, shipping_instructions: e.target.value })}
                  rows={2}
                  placeholder={locale === 'ar' ? 'أدخل أي تعليمات خاصة بالشحن' : 'Enter any special shipping instructions'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'ملاحظات عامة' : 'General Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder={locale === 'ar' ? 'أدخل أي ملاحظات إضافية' : 'Enter any additional notes'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* عنوان الشحن والملاحظات الداخلية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'عنوان الشحن' : 'Shipping Address'}
              </label>
              <textarea
                value={formData.ship_to_address}
                onChange={(e) => setFormData({ ...formData, ship_to_address: e.target.value })}
                rows={2}
                placeholder={locale === 'ar' ? 'أدخل عنوان الشحن' : 'Enter shipping address'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'ملاحظات داخلية' : 'Internal Notes'}
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={2}
                placeholder={locale === 'ar' ? 'ملاحظات داخلية (لا تظهر للمورد)' : 'Internal notes (not visible to vendor)'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Items section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {locale === 'ar' ? 'البنود • Items' : 'Items • البنود'}
              </h3>
              <Button size="sm" onClick={() => handleOpenItemModal()}>
                <PlusIcon className="h-4 w-4 mr-1" />
                {locale === 'ar' ? 'إضافة صنف' : 'Add Item'}
              </Button>
            </div>
            {formErrors.items && (
              <p className="text-red-500 text-xs mb-2">{formErrors.items}</p>
            )}
            {formData.items && formData.items.length > 0 ? (
              <div className="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                        {locale === 'ar' ? 'الرمز' : 'Code'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                        {locale === 'ar' ? 'الصنف' : 'Item'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                        {locale === 'ar' ? 'الكمية' : 'Qty'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                        {locale === 'ar' ? 'الوحدة' : 'Unit'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                        {locale === 'ar' ? 'السعر' : 'Price'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                        {locale === 'ar' ? 'الضريبة' : 'Tax'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                        {locale === 'ar' ? 'الإجمالي' : 'Total'}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                        {locale === 'ar' ? 'إجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
                    {formData.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                          {item.item_code || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                          {item.item_name || item.description || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                          {item.quantity || 0}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                          {item.uom || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                          {(item.unit_price || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                          {item.tax_rate || 0}%
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                          {(item.total || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenItemModal(idx)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                              title={locale === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(idx)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400"
                              title={locale === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                        {locale === 'ar' ? 'الإجمالي الكلي' : 'Grand Total'}
                      </td>
                      <td className="px-3 py-2 text-sm font-bold text-gray-900 dark:text-white text-right">
                        {formData.items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                {locale === 'ar' ? 'لا توجد بنود. انقر على "إضافة صنف" للبدء' : 'No items yet. Click "Add Item" to start'}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingOrder
                ? (locale === 'ar' ? 'تحديث' : 'Update')
                : (locale === 'ar' ? 'إنشاء' : 'Create')
              }
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={locale === 'ar' ? 'تفاصيل طلب الشراء' : 'Purchase Order Details'}
        size="xl"
      >
        {viewingOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'رقم الطلب' : 'Order #'}</span>
                <p className="font-medium">{viewingOrder.order_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'المورد' : 'Vendor'}</span>
                <p className="font-medium">
                  {locale === 'ar' ? viewingOrder.vendor_name_ar : viewingOrder.vendor_name}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'التاريخ' : 'Date'}</span>
                <p className="font-medium">
                  {new Date(viewingOrder.order_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                <p className="font-medium text-lg">
                  {formatCurrency(viewingOrder.total_amount, viewingOrder.currency_symbol)}
                </p>
              </div>
            </div>

            {viewingOrder.items && viewingOrder.items.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">{locale === 'ar' ? 'البنود' : 'Items'}</h3>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        {locale === 'ar' ? 'الصنف' : 'Item'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        {locale === 'ar' ? 'الكمية' : 'Qty'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        {locale === 'ar' ? 'السعر' : 'Price'}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        {locale === 'ar' ? 'الإجمالي' : 'Total'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {viewingOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm">{item.item_name}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.unit_price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right font-medium">{item.line_total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Item Modal */}
      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItemIndex !== null 
          ? (locale === 'ar' ? 'تعديل الصنف' : 'Edit Item')
          : (locale === 'ar' ? 'إضافة صنف' : 'Add Item')
        }
        size="lg"
      >
        <div className="space-y-4">
          {/* Item Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Name with integrated search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'اسم الصنف' : 'Item Name'} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={masterItems.map(item => ({
                  value: String(item.id),
                  label: item.name,
                  labelAr: item.name_ar,
                  code: item.code || item.item_code,
                  searchText: `${item.code || item.item_code || ''} ${item.name || ''} ${item.name_ar || ''}`
                }))}
                value={itemFormData.master_item_id || ''}
                onChange={(value) => {
                  const selectedItem = masterItems.find(item => String(item.id) === String(value));
                  if (selectedItem) {
                    handleSelectItem(selectedItem);
                  }
                }}
                placeholder={locale === 'ar' ? 'اختر الصنف' : 'Select Item'}
                searchPlaceholder={locale === 'ar' ? 'ابحث برقم الصنف أو الاسم' : 'Search by item code or name'}
                locale={locale}
              />
              {masterItems.length === 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  {locale === 'ar' ? 'جاري تحميل قائمة الأصناف...' : 'Loading items list...'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'رمز الصنف' : 'Item Code'}
              </label>
              <input
                type="text"
                value={itemFormData.item_code}
                onChange={(e) => setItemFormData({ ...itemFormData, item_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white"
                placeholder={locale === 'ar' ? 'رمز الصنف' : 'Item code'}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الكمية' : 'Quantity'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={itemFormData.quantity}
                onChange={(e) => handleItemQuantityChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الوحدة' : 'Unit of Measure'}
              </label>
              <select
                value={itemFormData.uom_id || ''}
                onChange={(e) => {
                  const selected = itemUomOptions.find((u: any) => String(u.uom_id) === e.target.value);
                  setItemFormData({
                    ...itemFormData,
                    uom_id: e.target.value,
                    uom: selected?.uom_code || selected?.code || itemFormData.uom,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                disabled={itemUomOptions.length === 0}
              >
                <option value="">{locale === 'ar' ? 'اختر الوحدة' : 'Select UOM'}</option>
                {itemUomOptions.map((u: any) => (
                  <option key={u.uom_id} value={u.uom_id}>
                    {u.uom_code || u.code} {u.uom_name ? `- ${u.uom_name}` : ''}
                  </option>
                ))}
              </select>
              {itemUomOptions.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {locale === 'ar' ? 'لا توجد وحدات مرتبطة لهذا الصنف' : 'No linked units for this item'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'سعر الوحدة' : 'Unit Price'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={itemFormData.unit_price}
                onChange={(e) => handleItemPriceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'نسبة الضريبة %' : 'Tax Rate %'}
              </label>
              <input
                type="number"
                value={itemFormData.tax_rate}
                onChange={(e) => {
                  setItemFormData({ ...itemFormData, tax_rate: e.target.value });
                  if (itemFormData.quantity && itemFormData.unit_price) {
                    const newTotal = calculateItemTotal(itemFormData.quantity, itemFormData.unit_price, e.target.value);
                    setItemFormData(prev => ({ ...prev, tax_rate: e.target.value, total: newTotal }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="15"
                min="0"
                max="100"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الإجمالي (شامل الضريبة)' : 'Total (Incl. Tax)'}
              </label>
              <input
                type="number"
                value={itemFormData.total}
                onChange={(e) => handleItemTotalChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setItemModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveItem}>
              {editingItemIndex !== null
                ? (locale === 'ar' ? 'تحديث' : 'Update')
                : (locale === 'ar' ? 'إضافة' : 'Add')
              }
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setOrderToDelete(null); }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف طلب الشراء' : 'Delete Purchase Order'}
        message={locale === 'ar' 
          ? `هل أنت متأكد من حذف الطلب ${orderToDelete?.order_number}؟ لا يمكن التراجع عن هذا الإجراء.`
          : `Are you sure you want to delete order ${orderToDelete?.order_number}? This action cannot be undone.`
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}

export default withPermission('purchase_orders:view', PurchaseOrdersPage);
