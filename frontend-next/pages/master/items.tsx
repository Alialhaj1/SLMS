import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
import { useCompany } from '../../hooks/useCompany';
import apiClient from '../../lib/apiClient';
import { useLocale } from '../../contexts/LocaleContext';
import Link from 'next/link';
import { useMasterData } from '../../hooks/useMasterData';
// 📦 Shared Types - Single Source of Truth
import type { 
  ItemType as SharedItemType, 
  Vendor as SharedVendor, 
  Country as SharedCountry, 
  HarvestSchedule as SharedHarvestSchedule,
  ItemGroup as SharedItemGroup,
  Unit as SharedUnit
} from '@/shared/types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ArchiveBoxXMarkIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import ItemProfileSlideOver from '../../components/master/ItemProfileSlideOver';

interface Item {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  hs_code?: string | null;
  category_name?: string;
  group_id?: number | null;
  group_code?: string;
  group_name?: string;
  group_name_ar?: string;
  base_uom_id?: number | null;
  base_uom_code?: string;
  base_uom_name?: string;
  base_uom_name_ar?: string;
  standard_cost?: number;
  base_selling_price?: number;
  barcode?: string;
  sku?: string;
  track_inventory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // New fields
  item_type_id?: number | null;
  item_type_code?: string;
  item_type_name?: string;
  item_type_name_ar?: string;
  default_vendor_id?: number | null;
  default_vendor_code?: string;
  default_vendor_name?: string;
  default_vendor_name_ar?: string;
  country_of_origin?: number | null;
  country_code?: string;
  country_name?: string;
  country_name_ar?: string;
  harvest_schedule_id?: number | null;
  harvest_schedule_code?: string;
  harvest_schedule_name?: string;
  harvest_schedule_name_ar?: string;
  expected_harvest_date?: string;
  image_url?: string;
  shelf_life_days?: number;
  min_order_qty?: number;
  manufacturer?: string;
  warranty_months?: number;
}

// Reference data types - Extending shared types with local field mappings
type ItemTypeRef = SharedItemType & {
  name_en?: string;  // API returns name_en
};

type VendorRef = SharedVendor;

type CountryRef = SharedCountry;

type HarvestScheduleRef = SharedHarvestSchedule & {
  season?: string;
};

type ItemGroup = SharedItemGroup & {
  parent_group_id?: number | null;
  group_type?: 'main' | 'sub';
  is_active: boolean;
};

type UnitType = SharedUnit & {
  unit_category?: string;
  is_active: boolean;
};

type ItemUomRow = {
  id: number | null;
  uom_id: number;
  code?: string;
  name?: string;
  name_ar?: string;
  conversion_factor: number;
  is_base: boolean;
  is_active: boolean;
};

type HSCode = {
  id: number;
  code: string;
  description_en: string;
  description_ar: string;
  is_active: boolean;
};

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  description: string;
  hs_code: string;
  main_group_id: number | '';
  sub_group_id: number | '';
  base_uom_id: number | '';
  standard_cost: number;
  base_selling_price: number;
  barcode: string;
  sku: string;
  track_inventory: boolean;
  is_active: boolean;
  // New fields
  item_type_id: number | '';
  default_vendor_id: number | '';
  country_of_origin: number | '';
  harvest_schedule_id: number | '';
  expected_harvest_date: string;
  image_url: string;
  shelf_life_days: number | '';
  min_order_qty: number | '';
  manufacturer: string;
  warranty_months: number | '';
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  description: '',
  hs_code: '',
  main_group_id: '',
  sub_group_id: '',
  base_uom_id: '',
  standard_cost: 0,
  base_selling_price: 0,
  barcode: '',
  sku: '',
  track_inventory: true,
  is_active: true,
  // New fields
  item_type_id: '',
  default_vendor_id: '',
  country_of_origin: '',
  harvest_schedule_id: '',
  expected_harvest_date: '',
  image_url: '',
  shelf_life_days: '',
  min_order_qty: '',
  manufacturer: '',
  warranty_months: '',
};

function ItemsPage() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { activeCompanyId, loading: companyLoading } = useCompany();

  const canPickHsCodes = hasAnyPermission([MenuPermissions.Logistics.HSCodes.View]);
  const { data: hsCodes, loading: hsLoading, fetchList: fetchHsCodes, pagination: hsPagination } = useMasterData<HSCode>({
    endpoint: '/api/hs-codes',
  });

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Item Profile SlideOver state
  const [profileSlideOverOpen, setProfileSlideOverOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const [hsPickerOpen, setHsPickerOpen] = useState(false);
  const [hsSearch, setHsSearch] = useState('');
  const [hsPageSize, setHsPageSize] = useState<number>(20);

  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [itemUoms, setItemUoms] = useState<ItemUomRow[]>([]);
  const [uomsLoading, setUomsLoading] = useState(false);

  // New reference data for enhanced fields
  const [itemTypes, setItemTypes] = useState<ItemTypeRef[]>([]);
  const [vendors, setVendors] = useState<VendorRef[]>([]);
  const [countries, setCountries] = useState<CountryRef[]>([]);
  const [harvestSchedules, setHarvestSchedules] = useState<HarvestScheduleRef[]>([]);

  // Computed stats for KPI cards
  const stats = {
    total: items.length,
    active: items.filter(i => i.is_active).length,
    inactive: items.filter(i => !i.is_active).length,
    withHarvestSchedule: items.filter(i => i.harvest_schedule_id).length,
  };

  useEffect(() => {
    if (companyLoading) return;
    if (!activeCompanyId) {
      // Company context is required by backend. Keep empty until selected.
      setItems([]);
      setLoading(false);
      return;
    }
    fetchItems(activeCompanyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, companyLoading]);

  useEffect(() => {
    if (!hsPickerOpen || !canPickHsCodes) return;
    const timeout = setTimeout(() => {
      fetchHsCodes({ search: hsSearch, page: 1, pageSize: hsPageSize, filters: { is_active: true } });
    }, 250);
    return () => clearTimeout(timeout);
  }, [canPickHsCodes, fetchHsCodes, hsPageSize, hsPickerOpen, hsSearch]);

  const fetchItems = async (companyIdFromHook?: number) => {
    setLoading(true);
    setLoadError(null);
    setLastStatus(null);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setItems([]);
        setLoadError('Not authenticated. Please login again.');
        return;
      }

      const companyId = companyIdFromHook ?? companyStore.getActiveCompanyId();
      if (!companyId) {
        setItems([]);
        setLoadError('Company context is required. Please select a company.');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/master/items`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': companyId.toString(),
        },
      });
      setLastStatus(res.status);
      if (res.ok) {
        const result = await res.json();
        setItems(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        const payload = await res.json().catch(() => null);
        const message =
          payload?.error?.message || payload?.message || payload?.error || 'Access denied';
        setLoadError(message);
        showToast(message, 'error');
      } else {
        const payload = await res.json().catch(() => null);
        const message =
          payload?.error?.message || payload?.message || payload?.error || 'Failed to load items';
        setLoadError(message);
        showToast(message, 'error');
      }
    } catch (error) {
      setLoadError('Failed to load items');
      showToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRefs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      // apiClient injects X-Company-Id automatically.
      const [groupsRes, unitsRes, itemTypesRes, vendorsRes, countriesRes, harvestRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: ItemGroup[] }>('/api/master/item-groups'),
        // Use the same dataset behind the Unit Types screen (/master/unit-types).
        // This is served from the units-of-measure table via the legacy alias endpoint.
        apiClient.get<{ success: boolean; data: UnitType[] }>('/api/unit-types?is_active=true'),
        apiClient.get<{ success: boolean; data: ItemTypeRef[] }>('/api/reference-data/item_types'),
        apiClient.get<{ success: boolean; data: VendorRef[] }>('/api/master/vendors?is_active=true'),
        apiClient.get<{ success: boolean; data: CountryRef[] }>('/api/master/countries'),
        apiClient.get<{ success: boolean; data: HarvestScheduleRef[] }>('/api/master/harvest-schedules?is_active=true'),
      ]);

      setItemGroups(Array.isArray(groupsRes?.data) ? groupsRes.data : []);
      setUnitTypes(Array.isArray(unitsRes?.data) ? unitsRes.data : []);
      setItemTypes(Array.isArray(itemTypesRes?.data) ? itemTypesRes.data : []);
      setVendors(Array.isArray(vendorsRes?.data) ? vendorsRes.data : []);
      setCountries(Array.isArray(countriesRes?.data) ? countriesRes.data : []);
      setHarvestSchedules(Array.isArray(harvestRes?.data) ? harvestRes.data : []);
    } catch (e) {
      // Keep the page usable even if reference endpoints fail.
    }
  };

  const fetchItemUoms = async (itemId: number) => {
    setUomsLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: ItemUomRow[] }>(
        `/api/master/items/${itemId}/uoms`
      );
      setItemUoms(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setItemUoms([]);
    } finally {
      setUomsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Item code is required';
    if (!formData.name.trim()) errors.name = 'Item name is required';
    if (!formData.base_uom_id) errors.base_uom_id = 'Base unit is required';
    if (!Number.isFinite(formData.standard_cost) || formData.standard_cost < 0) {
      errors.standard_cost = 'Cost price must be a valid positive number';
    }
    if (!Number.isFinite(formData.base_selling_price) || formData.base_selling_price < 0) {
      errors.base_selling_price = 'Selling price must be a valid positive number';
    }

    // Validate additional unit conversions (only for rows that are not base)
    const additional = itemUoms.filter((r) => !r.is_base);
    const badFactor = additional.some((r) => {
      const factor = Number(r.conversion_factor);
      return !Number.isFinite(factor) || factor <= 0 || factor === 1;
    });
    const seenUoms = new Set<number>();
    const hasDupUom = additional.some((r) => {
      if (!r.uom_id) return false;
      if (seenUoms.has(r.uom_id)) return true;
      seenUoms.add(r.uom_id);
      return false;
    });
    if (hasDupUom) errors.item_uoms = 'Additional units cannot be duplicated for the same item';
    else if (badFactor) errors.item_uoms = 'Additional unit factors must be > 0 and cannot equal 1';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = async (item?: Item) => {
    // Fetch refs first so we can determine group hierarchy
    await fetchRefs();
    
    if (item) {
      setEditingItem(item);
      
      // Determine main_group_id and sub_group_id from item.group_id
      let mainGroupId: number | '' = '';
      let subGroupId: number | '' = '';
      
      if (item.group_id) {
        // Find the group to check if it's main or sub
        const group = itemGroups.find(g => g.id === item.group_id);
        if (group) {
          if (group.group_type === 'sub' && group.parent_group_id) {
            // It's a sub-group
            mainGroupId = group.parent_group_id;
            subGroupId = item.group_id;
          } else {
            // It's a main group
            mainGroupId = item.group_id;
          }
        }
      }
      
      setFormData({
        code: item.code,
        name: item.name,
        name_ar: item.name_ar || '',
        description: item.description || '',
        hs_code: item.hs_code || '',
        main_group_id: mainGroupId,
        sub_group_id: subGroupId,
        base_uom_id: item.base_uom_id ? Number(item.base_uom_id) : '',
        standard_cost: item.standard_cost || 0,
        base_selling_price: item.base_selling_price || 0,
        barcode: item.barcode || '',
        sku: item.sku || '',
        track_inventory: item.track_inventory,
        is_active: item.is_active,
        // New fields
        item_type_id: item.item_type_id ? Number(item.item_type_id) : '',
        default_vendor_id: item.default_vendor_id ? Number(item.default_vendor_id) : '',
        country_of_origin: item.country_of_origin ? Number(item.country_of_origin) : '',
        harvest_schedule_id: item.harvest_schedule_id ? Number(item.harvest_schedule_id) : '',
        expected_harvest_date: item.expected_harvest_date || '',
        image_url: item.image_url || '',
        shelf_life_days: item.shelf_life_days ?? '',
        min_order_qty: item.min_order_qty ?? '',
        manufacturer: item.manufacturer || '',
        warranty_months: item.warranty_months ?? '',
      });
    } else {
      setEditingItem(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setModalOpen(true);
    if (item?.id) {
      void fetchItemUoms(item.id);
    } else {
      setItemUoms([]);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormData(initialFormData);
    setFormErrors({});
    setItemUoms([]);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showToast('Access denied', 'error');
        return;
      }

      const companyId = companyStore.getActiveCompanyId();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const url = editingItem
        ? `${apiUrl}/api/master/items/${editingItem.id}`
        : `${apiUrl}/api/master/items`;

      // Use sub_group_id if selected, otherwise use main_group_id
      const effectiveGroupId = formData.sub_group_id 
        ? Number(formData.sub_group_id) 
        : (formData.main_group_id ? Number(formData.main_group_id) : null);

      const payload: any = {
        code: formData.code,
        name: formData.name,
        name_ar: formData.name_ar || null,
        description: formData.description || null,
        hs_code: formData.hs_code.trim() ? formData.hs_code.trim() : null,
        barcode: formData.barcode || null,
        sku: formData.sku || null,
        group_id: effectiveGroupId,
        base_uom_id: Number(formData.base_uom_id),
        track_inventory: formData.track_inventory,
        is_active: formData.is_active,
        standard_cost: formData.standard_cost,
        base_selling_price: formData.base_selling_price,
        // New fields
        item_type_id: formData.item_type_id ? Number(formData.item_type_id) : null,
        default_vendor_id: formData.default_vendor_id ? Number(formData.default_vendor_id) : null,
        country_of_origin: formData.country_of_origin ? Number(formData.country_of_origin) : null,
        harvest_schedule_id: formData.harvest_schedule_id ? Number(formData.harvest_schedule_id) : null,
        expected_harvest_date: formData.expected_harvest_date || null,
        image_url: formData.image_url || null,
        shelf_life_days: formData.shelf_life_days ? Number(formData.shelf_life_days) : null,
        min_order_qty: formData.min_order_qty ? Number(formData.min_order_qty) : null,
        manufacturer: formData.manufacturer || null,
        warranty_months: formData.warranty_months ? Number(formData.warranty_months) : null,
      };

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': companyId.toString() } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json().catch(() => null);
        const savedId: number | null = editingItem?.id ?? saved?.data?.id ?? null;

        // Persist item-specific additional UOMs (optional)
        if (savedId && itemUoms.length > 0) {
          const base = itemUoms.find((r) => r.is_base);
          const baseUomId = base?.uom_id ?? Number(formData.base_uom_id);
          const additional = itemUoms
            .filter((r) => !r.is_base)
            .filter((r) => r.uom_id && r.uom_id !== baseUomId)
            .map((r) => ({
              uom_id: r.uom_id,
              conversion_factor: Number(r.conversion_factor),
              is_active: r.is_active,
            }));

          try {
            await apiClient.put(`/api/master/items/${savedId}/uoms`, { rows: additional });
          } catch (e) {
            showToast('Failed to save additional units', 'error');
          }
        }

        showToast(editingItem ? 'Item updated successfully' : 'Item created successfully', 'success');
        handleCloseModal();
        fetchItems();
      } else {
        const payload = await res.json().catch(() => null);
        const message =
          typeof payload === 'string'
            ? payload
            : payload?.error?.message || payload?.message || (typeof payload?.error === 'string' ? payload.error : null) || 'Failed to save item';
        showToast(message, 'error');
      }
    } catch (error) {
      showToast('Failed to save item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (item: Item) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleViewProfile = (itemId: number) => {
    setSelectedItemId(itemId);
    setProfileSlideOverOpen(true);
  };

  const handleProfileClose = () => {
    setProfileSlideOverOpen(false);
    setSelectedItemId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showToast('Access denied', 'error');
        return;
      }

      const companyId = companyStore.getActiveCompanyId();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/master/items/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': companyId.toString() } : {}),
        },
      });
      if (res.ok) {
        showToast('Item deleted successfully', 'success');
        fetchItems();
      } else {
        const payload = await res.json().catch(() => null);
        const message =
          typeof payload === 'string'
            ? payload
            : payload?.error?.message || payload?.message || (typeof payload?.error === 'string' ? payload.error : null) || 'Failed to delete item';
        showToast(message, 'error');
      }
    } catch (error) {
      showToast('Failed to delete item', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hs_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = !showActiveOnly || item.is_active;
    return matchesSearch && matchesActive;
  });

  const displayGroupName = (item: Item) => {
    const ar = item.group_name_ar || '';
    const en = item.group_name || '';
    return (locale === 'ar' ? ar || en : en || ar) || '—';
  };

  const displayUomName = (item: Item) => {
    const ar = item.base_uom_name_ar || '';
    const en = item.base_uom_name || '';
    return (locale === 'ar' ? ar || en : en || ar) || '';
  };

  if (!hasPermission('master:items:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <CubeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view items.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Items Management - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Items</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage inventory items and pricing
            </p>
          </div>
          {hasPermission('master:items:create') && (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Item
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CubeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.totalItems') || 'Total Items'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CubeIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.active') || 'Active'}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <ArchiveBoxXMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.inactive') || 'Inactive'}</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.inactive}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <SunIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.seasonal') || 'Seasonal'}</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.withHarvestSchedule}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, barcode, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activeOnly"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="activeOnly" className="text-sm text-gray-700 dark:text-gray-300">
                Active only
              </label>
            </div>
          </div>
        </div>
        <div className="card overflow-hidden">
          {!companyLoading && !activeCompanyId && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
              Company context is required. Please select a company from the header.
            </div>
          )}
          {loadError && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 text-sm text-red-700 dark:text-red-300">
              {loadError}
              {lastStatus ? <span className="ml-2 text-xs opacity-80">(HTTP {lastStatus})</span> : null}
            </div>
          )}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <CubeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No items found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new item'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.itemType') || 'Type'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      HS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cost Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Selling Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {item.item_type_code || item.item_type_name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-8 h-8 rounded object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.name}
                            </div>
                            {item.name_ar && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{item.name_ar}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {item.hs_code || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {displayGroupName(item)}
                          </div>
                          {item.group_code && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.group_code}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {item.base_uom_code || '—'}
                          </div>
                          {displayUomName(item) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{displayUomName(item)}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {typeof item.standard_cost === 'number' ? item.standard_cost.toLocaleString() : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {typeof item.base_selling_price === 'number' ? item.base_selling_price.toLocaleString() : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewProfile(item.id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title={t('View Profile')}
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          {hasPermission('master:items:edit') && (
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )}
                          {hasPermission('master:items:delete') && (
                            <button
                              onClick={() => handleDeleteClick(item)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Item' : 'Create Item'}
        size="xl"
      >
        <div className="space-y-4">
          {/* Item Type - FIRST FIELD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.itemType') || 'Item Type'} <span className="text-red-500">*</span>
              </label>
              <select
                value={String(formData.item_type_id)}
                onChange={(e) => setFormData({ ...formData, item_type_id: e.target.value ? Number(e.target.value) : '' })}
                className="input w-full"
              >
                <option value="">{t('common.selectItemType') || 'Select Item Type'}</option>
                {itemTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.code} - {locale === 'ar' && type.name_ar ? type.name_ar : type.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المجموعة الرئيسية' : 'Main Group'}
              </label>
              <select
                value={String(formData.main_group_id)}
                onChange={(e) => {
                  const v = e.target.value;
                  // Reset sub_group_id when main group changes
                  setFormData({ ...formData, main_group_id: v ? Number(v) : '', sub_group_id: '' });
                }}
                className="input w-full"
              >
                <option value="">{locale === 'ar' ? 'بدون مجموعة' : 'No group'}</option>
                {itemGroups
                  .filter((g) => g.is_active && g.group_type === 'main')
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} - {(locale === 'ar' ? g.name_ar || g.name : g.name || g.name_ar) || g.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Sub-group dropdown - only shown when main group is selected */}
          {formData.main_group_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المجموعة الفرعية' : 'Sub Group'}
              </label>
              <select
                value={String(formData.sub_group_id)}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData({ ...formData, sub_group_id: v ? Number(v) : '' });
                }}
                className="input w-full"
              >
                <option value="">{locale === 'ar' ? 'بدون مجموعة فرعية' : 'No sub-group'}</option>
                {itemGroups
                  .filter((g) => g.is_active && g.group_type === 'sub' && g.parent_group_id === formData.main_group_id)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} - {(locale === 'ar' ? g.name_ar || g.name : g.name || g.name_ar) || g.name}
                    </option>
                  ))}
              </select>
              {itemGroups.filter((g) => g.is_active && g.group_type === 'sub' && g.parent_group_id === formData.main_group_id).length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {locale === 'ar' ? 'لا توجد مجموعات فرعية لهذه المجموعة الرئيسية' : 'No sub-groups available for this main group'}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Item Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={formErrors.code}
              disabled={!!editingItem}
            />
            <Input
              label="Item Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />
            <Input
              label="Item Name (Arabic)"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            />
          </div>
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            />
            <Input
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label={locale === 'ar' ? 'رمز HS' : 'HS Code'}
                    value={formData.hs_code}
                    onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                    placeholder={locale === 'ar' ? 'مثال: 01012100' : 'Example: 01012100'}
                  />
                </div>
                {canPickHsCodes && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setHsSearch(formData.hs_code || '');
                      setHsPickerOpen(true);
                    }}
                  >
                    {locale === 'ar' ? 'اختيار' : 'Pick'}
                  </Button>
                )}
              </div>

              {formData.hs_code.trim() ? (
                <div className="pt-2 flex flex-wrap gap-3 text-sm">
                  <Link
                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                    href={{ pathname: '/customs/tariff-rates', query: { hs_code: formData.hs_code.trim() } }}
                  >
                    {locale === 'ar' ? 'عرض التعرفة' : 'View tariffs'}
                  </Link>
                  <Link
                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                    href={{ pathname: '/customs/duty-calculation', query: { hs_code: formData.hs_code.trim(), country_code: 'SA' } }}
                  >
                    {locale === 'ar' ? 'احتساب الرسوم' : 'Calculate duty'}
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 self-end">
              {locale === 'ar'
                ? 'يستخدم لربط الصنف بالتعرفة والرسوم الجمركية.'
                : 'Used to link the item to tariffs and customs duty.'}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Unit <span className="text-red-500">*</span>
              </label>
              <select
                value={String(formData.base_uom_id)}
                onChange={(e) => {
                  const v = e.target.value;
                  const nextBase = v ? Number(v) : '';
                  setFormData({ ...formData, base_uom_id: nextBase });

                  if (editingItem && nextBase) {
                    setItemUoms((prev) => {
                      const withoutDup = prev.filter((r) => !r.is_base && r.uom_id !== Number(nextBase));
                      return [
                        {
                          id: null,
                          uom_id: Number(nextBase),
                          conversion_factor: 1,
                          is_base: true,
                          is_active: true,
                        },
                        ...withoutDup,
                      ];
                    });
                  }
                }}
                className="input w-full"
                aria-invalid={!!formErrors.base_uom_id}
              >
                <option value="">Select unit...</option>
                {unitTypes
                  .filter(u => u.is_active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} - {(locale === 'ar' ? u.name_ar || u.name : u.name || u.name_ar) || u.name}
                    </option>
                  ))}
              </select>
              {formErrors.base_uom_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.base_uom_id}</p>
              )}
              {formErrors.item_uoms && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.item_uoms}</p>
              )}
            </div>
            <Input
              label="Cost Price"
              type="number"
              step="0.01"
              value={formData.standard_cost}
              onChange={(e) => {
                const raw = e.target.value;
                setFormData({
                  ...formData,
                  standard_cost: raw === '' ? 0 : Number(raw),
                });
              }}
              error={formErrors.standard_cost}
            />
            <Input
              label="Selling Price"
              type="number"
              step="0.01"
              value={formData.base_selling_price}
              onChange={(e) => {
                const raw = e.target.value;
                setFormData({
                  ...formData,
                  base_selling_price: raw === '' ? 0 : Number(raw),
                });
              }}
              error={formErrors.base_selling_price}
            />
          </div>

          {/* Supplier, Country, Harvest Section */}
          <div className="border-t pt-4 mt-4 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('common.supplierAndOrigin') || 'Supplier & Origin'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.defaultVendor') || 'Default Vendor'}
                </label>
                <select
                  value={String(formData.default_vendor_id)}
                  onChange={(e) => setFormData({ ...formData, default_vendor_id: e.target.value ? Number(e.target.value) : '' })}
                  className="input w-full"
                >
                  <option value="">{t('common.selectVendor') || 'Select Vendor'}</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.code} - {locale === 'ar' && v.name_ar ? v.name_ar : v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.countryOfOrigin') || 'Country of Origin'}
                </label>
                <select
                  value={String(formData.country_of_origin)}
                  onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value ? Number(e.target.value) : '' })}
                  className="input w-full"
                >
                  <option value="">{t('common.selectCountry') || 'Select Country'}</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {locale === 'ar' && c.name_ar ? c.name_ar : c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label={t('common.manufacturer') || 'Manufacturer'}
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </div>
          </div>

          {/* Agricultural/Harvest Section */}
          <div className="border-t pt-4 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('common.harvestInfo') || 'Harvest Information'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.harvestSchedule') || 'Harvest Schedule'}
                </label>
                <select
                  value={String(formData.harvest_schedule_id)}
                  onChange={(e) => setFormData({ ...formData, harvest_schedule_id: e.target.value ? Number(e.target.value) : '' })}
                  className="input w-full"
                >
                  <option value="">{t('common.selectHarvestSchedule') || 'Select Harvest Schedule'}</option>
                  {harvestSchedules.map((hs) => (
                    <option key={hs.id} value={hs.id}>
                      {hs.code} - {locale === 'ar' && hs.name_ar ? hs.name_ar : hs.name}
                      {hs.season && ` (${hs.season})`}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label={t('common.expectedHarvestDate') || 'Expected Harvest Date'}
                type="date"
                value={formData.expected_harvest_date}
                onChange={(e) => setFormData({ ...formData, expected_harvest_date: e.target.value })}
              />
              <Input
                label={t('common.shelfLifeDays') || 'Shelf Life (days)'}
                type="number"
                value={formData.shelf_life_days}
                onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value ? Number(e.target.value) : '' })}
                min={0}
              />
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="border-t pt-4 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('common.additionalInfo') || 'Additional Information'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label={t('common.minOrderQty') || 'Min Order Qty'}
                type="number"
                value={formData.min_order_qty}
                onChange={(e) => setFormData({ ...formData, min_order_qty: e.target.value ? Number(e.target.value) : '' })}
                min={0}
                step="0.01"
              />
              <Input
                label={t('common.warrantyMonths') || 'Warranty (months)'}
                type="number"
                value={formData.warranty_months}
                onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value ? Number(e.target.value) : '' })}
                min={0}
              />
              <Input
                label={t('common.imageUrl') || 'Image URL'}
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            {formData.image_url && (
              <div className="mt-3 flex items-center gap-4">
                <img
                  src={formData.image_url}
                  alt="Item preview"
                  className="w-20 h-20 object-cover rounded-lg border dark:border-gray-600"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('imagePreview') || 'Image Preview'}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="track_inventory"
                checked={formData.track_inventory}
                onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="track_inventory" className="text-sm text-gray-700 dark:text-gray-300">
                Track Inventory
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {locale === 'ar' ? 'وحدات القياس الإضافية' : 'Additional Units'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {locale === 'ar' 
                ? 'الوحدة الأساسية دائماً = 1. أضف وحدات أخرى مع معامل التحويل بالنسبة للوحدة الأساسية.'
                : 'Base unit is always 1. Add other units with a conversion factor relative to the base unit.'}
            </p>

            {!formData.base_uom_id ? (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {locale === 'ar' ? 'اختر الوحدة الأساسية أولاً' : 'Select base unit first to add additional units.'}
              </div>
            ) : uomsLoading ? (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {locale === 'ar' ? 'جاري تحميل الوحدات...' : 'Loading units...'}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Factor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Active</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {itemUoms
                        .slice()
                        .sort((a, b) => Number(b.is_base) - Number(a.is_base))
                        .map((row, idx) => (
                          <tr key={`${row.uom_id}-${idx}`}>
                            <td className="px-3 py-2">
                              <select
                                value={row.uom_id}
                                disabled={row.is_base}
                                onChange={(e) => {
                                  const uomId = Number(e.target.value);
                                  setItemUoms((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, uom_id: uomId } : r))
                                  );
                                }}
                                className="input w-full"
                              >
                                {unitTypes
                                  .filter((u) => {
                                    if (!u.is_active) return false;
                                    const baseUomId = Number(formData.base_uom_id);
                                    const alreadyUsed = itemUoms.some((r, i) => i !== idx && r.uom_id === u.id);

                                    // Always keep the currently selected option visible.
                                    if (u.id === row.uom_id) return true;

                                    // Additional rows cannot select base unit or a duplicated unit.
                                    if (!row.is_base && u.id === baseUomId) return false;
                                    if (!row.is_base && alreadyUsed) return false;
                                    return true;
                                  })
                                  .map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.code} - {(locale === 'ar' ? u.name_ar || u.name : u.name || u.name_ar) || u.name}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.0001"
                                min={0}
                                disabled={row.is_base}
                                value={row.is_base ? 1 : row.conversion_factor}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setItemUoms((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, conversion_factor: v } : r))
                                  );
                                }}
                                className="input w-full"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={row.is_active}
                                disabled={row.is_base}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setItemUoms((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, is_active: checked } : r))
                                  );
                                }}
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              {!row.is_base && (
                                <button
                                  type="button"
                                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                                  onClick={() => setItemUoms((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  {locale === 'ar' ? 'حذف' : 'Remove'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const baseUomId = Number(formData.base_uom_id);
                      const usedIds = new Set(itemUoms.map((r) => r.uom_id));
                      const candidate = unitTypes.find((u) => u.is_active && u.id !== baseUomId && !usedIds.has(u.id));
                      if (!candidate) {
                        showToast(locale === 'ar' ? 'لا توجد وحدات متاحة للإضافة' : 'No available units to add', 'error');
                        return;
                      }
                      setItemUoms((prev) => [
                        ...prev,
                        {
                          id: null,
                          uom_id: candidate.id,
                          conversion_factor: 2,
                          is_base: false,
                          is_active: true,
                        },
                      ]);
                    }}
                  >
                    {locale === 'ar' ? 'إضافة وحدة' : 'Add Unit'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
            {locale === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {editingItem ? (locale === 'ar' ? 'تحديث' : 'Update') : (locale === 'ar' ? 'إنشاء' : 'Create')}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={hsPickerOpen}
        onClose={() => setHsPickerOpen(false)}
        title={locale === 'ar' ? 'اختيار رمز HS' : 'Pick HS Code'}
        size="lg"
      >
        <div className="space-y-3">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={hsSearch}
            onChange={(e) => setHsSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'رمز أو وصف...' : 'Code or description...'}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {locale === 'ar' ? 'عدد الصفوف' : 'Rows'}
              </div>
              <select
                className="input"
                value={String(hsPageSize)}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setHsPageSize(next);
                  fetchHsCodes({ search: hsSearch, page: 1, pageSize: next, filters: { is_active: true } });
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {locale === 'ar'
                ? `الصفحة ${hsPagination.currentPage} من ${hsPagination.totalPages}`
                : `Page ${hsPagination.currentPage} of ${hsPagination.totalPages}`}
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">HS</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {hsLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                    </td>
                  </tr>
                ) : hsCodes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'لا توجد نتائج' : 'No results'}
                    </td>
                  </tr>
                ) : (
                  hsCodes.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{r.code}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                        {locale === 'ar' ? r.description_ar : r.description_en}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, hs_code: r.code }));
                            setHsPickerOpen(false);
                          }}
                        >
                          {locale === 'ar' ? 'اختيار' : 'Select'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={hsLoading || hsPagination.currentPage <= 1}
              onClick={() =>
                fetchHsCodes({
                  search: hsSearch,
                  page: hsPagination.currentPage - 1,
                  pageSize: hsPageSize,
                  filters: { is_active: true },
                })
              }
            >
              {locale === 'ar' ? 'السابق' : 'Prev'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={hsLoading || hsPagination.currentPage >= hsPagination.totalPages}
              onClick={() =>
                fetchHsCodes({
                  search: hsSearch,
                  page: hsPagination.currentPage + 1,
                  pageSize: hsPageSize,
                  filters: { is_active: true },
                })
              }
            >
              {locale === 'ar' ? 'التالي' : 'Next'}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Item"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />

      {/* Item Profile SlideOver */}
      {selectedItemId && (
        <ItemProfileSlideOver
          itemId={selectedItemId}
          isOpen={profileSlideOverOpen}
          onClose={handleProfileClose}
        />
      )}
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.Items.View, ItemsPage);
