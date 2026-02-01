import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LineItem } from '../LineItemsTable';
import type {
  PurchaseOrderFormModel,
  PurchaseOrderItemRef,
  PurchaseOrderReferenceOption,
  TaxRef,
  UnitOfMeasureRef,
  VendorRef,
} from './types';
import { companyStore } from '../../../lib/companyStore';
import { apiClient } from '../../../lib/apiClient';
import { useAuth } from '../../../hooks/useAuth';

type Locale = 'en' | 'ar';

export function safeParseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

const todayIso = () => new Date().toISOString().split('T')[0];

function defaultForm(): PurchaseOrderFormModel {
  return {
    vendor_id: '',
    vendor_contract_number: '',
    vendor_contract_date: '',
    status_id: '',
    order_type_id: '',
    order_date: todayIso(),
    expected_date: '',
    warehouse_id: '',
    currency_id: '',
    exchange_rate: '1',
    payment_terms_id: '',
    payment_method_id: '',
    project_id: '',
    delivery_terms_id: '',
    supply_terms_id: '',
    origin_country_id: '',
    origin_city_id: '',
    destination_country_id: '1',
    destination_city_id: '2',
    port_of_loading_text: '',
    port_of_discharge_id: '',
    ship_to_address: '',
    notes: '',
    internal_notes: '',
    discount_amount: '0',
    freight_amount: '0',
    cost_center_id: '',
    meta: {},
  };
}

function hasAnyAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
}

export function usePurchaseOrderForm(params: {
  locale: Locale;
  orderId?: number;
}) {
  const { locale, orderId } = params;

  // We need to avoid firing any requests while auth is still initializing.
  // This hook is used unconditionally by the form component, so it must be safe.
  const { loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<PurchaseOrderFormModel>(() => defaultForm());
  const [items, setItems] = useState<LineItem[]>([]);

  const [vendors, setVendors] = useState<VendorRef[]>([]);
  const [orderTypes, setOrderTypes] = useState<PurchaseOrderReferenceOption[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<PurchaseOrderReferenceOption[]>([]);
  const [warehouses, setWarehouses] = useState<PurchaseOrderReferenceOption[]>([]);
  const [currencies, setCurrencies] = useState<PurchaseOrderReferenceOption[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PurchaseOrderReferenceOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PurchaseOrderReferenceOption[]>([]);
  const [projects, setProjects] = useState<PurchaseOrderReferenceOption[]>([]);
  const [deliveryTerms, setDeliveryTerms] = useState<PurchaseOrderReferenceOption[]>([]);
  const [supplyTerms, setSupplyTerms] = useState<PurchaseOrderReferenceOption[]>([]);
  const [costCenters, setCostCenters] = useState<PurchaseOrderReferenceOption[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);

  const [itemOptions, setItemOptions] = useState<PurchaseOrderItemRef[]>([]);
  const [uomOptions, setUomOptions] = useState<UnitOfMeasureRef[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxRef[]>([]);

  const hasFetchedRef = useRef(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + (Number(it.ordered_qty) || 0) * (Number(it.unit_price) || 0), 0);
    const itemDiscount = items.reduce((sum, it) => sum + (Number(it.discount_amount) || 0), 0);
    const discountAmount = (Number(form.discount_amount) || 0) + itemDiscount;
    const itemTax = items.reduce((sum, it) => sum + (Number(it.tax_amount) || 0), 0);
    const freightAmount = Number(form.freight_amount) || 0;
    const total = subtotal - discountAmount + itemTax + freightAmount;

    return {
      subtotal,
      discountAmount,
      itemTax,
      freightAmount,
      total,
    };
  }, [items, form.discount_amount, form.freight_amount]);

  const loadReferenceData = useCallback(async () => {
    const [
      vendorsJson,
      typesJson,
      statusesJson,
      warehousesJson,
      currenciesJson,
      paymentTermsJson,
      paymentMethodsJson,
      projectsJson,
      deliveryTermsJson,
      supplyTermsJson,
      costCentersJson,
      countriesJson,
      citiesJson,
      portsJson,
      itemsJson,
      uomsJson,
      taxRatesJson,
    ] = await Promise.all([
      // Vendors endpoint is paginated; default limit is small (e.g. 20). Fetch a larger page for better dropdown UX.
      apiClient.get(`/api/procurement/vendors?page=1&limit=500`),
      apiClient.get(`/api/procurement/purchase-orders/order-types`),
      apiClient.get(`/api/procurement/purchase-orders/order-statuses`),
      apiClient.get(`/api/master/warehouses`),
      apiClient.get(`/api/master/currencies`),
      apiClient.get(`/api/procurement/vendors/payment-terms`),
      apiClient.get(`/api/payment-methods?limit=100`),
      apiClient.get(`/api/projects?limit=500`),
      apiClient.get(`/api/procurement/vendors/delivery-terms`),
      apiClient.get(`/api/procurement/reference/supply-terms`),
      apiClient.get(`/api/master/cost-centers`),
      apiClient.get(`/api/countries?limit=1000`),
      apiClient.get(`/api/cities?limit=10000`),
      apiClient.get(`/api/ports?limit=1000&country_id=1`),
      apiClient.get(`/api/master/items/for-invoice?is_active=true&limit=5000`),
      apiClient.get(`/api/unit-types?is_active=true`),
      // Keep consistent with master/tax-rates UI
      apiClient.get(`/api/tax-rates?is_active=true`),
    ]);

    setVendors(((vendorsJson as any)?.data || []) as VendorRef[]);
    setOrderTypes(((typesJson as any)?.data || []) as PurchaseOrderReferenceOption[]);
    setOrderStatuses(((statusesJson as any)?.data || []) as PurchaseOrderReferenceOption[]);
    setWarehouses(((warehousesJson as any)?.data || []) as PurchaseOrderReferenceOption[]);
    setCurrencies(((currenciesJson as any)?.data || []) as PurchaseOrderReferenceOption[]);
    setPaymentTerms(
      (((paymentTermsJson as any)?.data || (paymentTermsJson as any)?.data?.data || []) as PurchaseOrderReferenceOption[])
    );
    setPaymentMethods(((paymentMethodsJson as any)?.data || []) as PurchaseOrderReferenceOption[]);
    setProjects(((projectsJson as any)?.data || []) as PurchaseOrderReferenceOption[]);
    setDeliveryTerms(
      (((deliveryTermsJson as any)?.data || (deliveryTermsJson as any)?.data?.data || []) as PurchaseOrderReferenceOption[])
    );
    setSupplyTerms(((supplyTermsJson as any)?.data || []) as PurchaseOrderReferenceOption[]);
    setCostCenters(((costCentersJson as any)?.data || []) as PurchaseOrderReferenceOption[]);

    setCountries(((countriesJson as any)?.data || []) as any[]);
    setCities(((citiesJson as any)?.data || []) as any[]);
    setPorts(((portsJson as any)?.data || []) as any[]);

    setItemOptions(((itemsJson as any)?.data || []) as PurchaseOrderItemRef[]);
    setUomOptions(((uomsJson as any)?.data || []) as UnitOfMeasureRef[]);

    const taxRates = (((taxRatesJson as any)?.data || []) as any[]).filter(Boolean);
    setTaxOptions(
      taxRates.map((tr) => ({
        id: Number(tr.id),
        code: String(tr.code ?? tr.id),
        name: String(tr.name ?? tr.code ?? 'Tax'),
        rate: Number(tr.rate ?? 0),
      }))
    );
  }, []);

  const loadExistingOrder = useCallback(async () => {
    if (!orderId) return;
    const json = await apiClient.get(`/api/procurement/purchase-orders/${orderId}`);
    const po = (json as any)?.data;

    const parsedMeta = safeParseJson<any>(po?.internal_notes);

    setForm((prev) => ({
      ...prev,
      vendor_id: po?.vendor_id ? String(po.vendor_id) : '',
      vendor_contract_number: po?.vendor_contract_number ? String(po.vendor_contract_number) : '',
      vendor_contract_date: po?.vendor_contract_date ? String(po.vendor_contract_date).split('T')[0] : '',
      status_id: po?.status_id ? String(po.status_id) : prev.status_id || '',
      order_type_id: po?.order_type_id ? String(po.order_type_id) : '',
      order_date: po?.order_date ? String(po.order_date).split('T')[0] : todayIso(),
      expected_date: po?.expected_date ? String(po.expected_date).split('T')[0] : '',
      warehouse_id: po?.warehouse_id ? String(po.warehouse_id) : '',
      currency_id: po?.currency_id ? String(po.currency_id) : '',
      exchange_rate: po?.exchange_rate != null ? String(po.exchange_rate) : '1',
      payment_terms_id: po?.payment_terms_id ? String(po.payment_terms_id) : '',
      payment_method_id: po?.payment_method_id ? String(po.payment_method_id) : '',
      project_id: po?.project_id ? String(po.project_id) : '',
      delivery_terms_id: po?.delivery_terms_id ? String(po.delivery_terms_id) : '',
      supply_terms_id: po?.supply_terms_id ? String(po.supply_terms_id) : '',
      origin_country_id: po?.origin_country_id ? String(po.origin_country_id) : '',
      origin_city_id: po?.origin_city_id ? String(po.origin_city_id) : '',
      destination_country_id: po?.destination_country_id ? String(po.destination_country_id) : '1',
      destination_city_id: po?.destination_city_id ? String(po.destination_city_id) : '2',
      port_of_loading_text: po?.port_of_loading_text ? String(po.port_of_loading_text) : '',
      port_of_discharge_id: po?.port_of_discharge_id ? String(po.port_of_discharge_id) : '',
      ship_to_address: po?.ship_to_address || '',
      notes: po?.notes || '',
      internal_notes: (parsedMeta?.notes ?? po?.internal_notes ?? '') as string,
      discount_amount: po?.discount_amount != null ? String(po.discount_amount) : '0',
      freight_amount: po?.freight_amount != null ? String(po.freight_amount) : '0',
      cost_center_id: po?.cost_center_id ? String(po.cost_center_id) : '',
      meta: parsedMeta?.meta || prev.meta || {},
    }));

    const poItems = (po?.items || []) as any[];
    const mapped: LineItem[] = poItems.map((it, index) => ({
      id: it.id,
      line_number: it.line_number ?? index + 1,
      item_id: Number(it.item_id),
      item_code: String(it.item_code || ''),
      item_name: String(it.item_name || ''),
      item_name_ar: it.item_name_ar || undefined,
      uom_id: Number(it.uom_id || 0),
      uom_code: it.uom_code || undefined,
      ordered_qty: Number(it.ordered_qty || it.quantity || 0),
      unit_price: Number(it.unit_price || 0),
      discount_percent: Number(it.discount_percent || 0),
      discount_amount: Number(it.discount_amount || 0),
      tax_rate_id: it.tax_rate_id ?? undefined,
      tax_rate: Number(it.tax_rate || it.tax_percent || 0),
      tax_amount: Number(it.tax_amount || 0),
      line_total: Number(it.line_total || 0),
      warehouse_id: it.warehouse_id ?? undefined,
      notes: it.notes || undefined,
    }));

    setItems(mapped);
  }, [orderId]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    if (authLoading) return;
    if (!hasAnyAuthToken()) {
      setLoading(false);
      return;
    }

    hasFetchedRef.current = true;

    (async () => {
      try {
        setLoading(true);
        await loadReferenceData();
        if (orderId) {
          await loadExistingOrder();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, loadReferenceData, loadExistingOrder, orderId]);

  const validate = useCallback(() => {
    const next: Record<string, string> = {};

    if (!form.vendor_id) next.vendor_id = locale === 'ar' ? 'المورد مطلوب' : 'Vendor is required';
    if (!form.order_date) next.order_date = locale === 'ar' ? 'تاريخ الطلب مطلوب' : 'Order date is required';
    if (!items.length) next.items = locale === 'ar' ? 'أضف بند واحد على الأقل' : 'Add at least one item';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form.vendor_id, form.order_date, items.length, locale]);

  const buildPayload = useCallback(() => {
    const internalMeta = {
      meta: form.meta,
      notes: form.internal_notes,
      saved_at: new Date().toISOString(),
      version: 1,
    };

    return {
      order_date: form.order_date,
      expected_date: form.expected_date || null,
      vendor_id: Number(form.vendor_id),
      vendor_contract_number: form.vendor_contract_number || null,
      vendor_contract_date: form.vendor_contract_date || null,
      status_id: form.status_id ? Number(form.status_id) : null,
      order_type_id: form.order_type_id ? Number(form.order_type_id) : null,
      warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
      currency_id: form.currency_id ? Number(form.currency_id) : null,
      exchange_rate: form.exchange_rate ? Number(form.exchange_rate) : 1,
      payment_terms_id: form.payment_terms_id ? Number(form.payment_terms_id) : null,
      payment_method_id: form.payment_method_id ? Number(form.payment_method_id) : null,
      project_id: form.project_id ? Number(form.project_id) : null,
      delivery_terms_id: form.delivery_terms_id ? Number(form.delivery_terms_id) : null,
      supply_terms_id: form.supply_terms_id ? Number(form.supply_terms_id) : null,
      origin_country_id: form.origin_country_id ? Number(form.origin_country_id) : null,
      origin_city_id: form.origin_city_id ? Number(form.origin_city_id) : null,
      destination_country_id: form.destination_country_id ? Number(form.destination_country_id) : null,
      destination_city_id: form.destination_city_id ? Number(form.destination_city_id) : null,
      port_of_loading_text: form.port_of_loading_text || null,
      port_of_discharge_id: form.port_of_discharge_id ? Number(form.port_of_discharge_id) : null,
      discount_amount: form.discount_amount ? Number(form.discount_amount) : 0,
      freight_amount: form.freight_amount ? Number(form.freight_amount) : 0,
      ship_to_address: form.ship_to_address || null,
      notes: form.notes || null,
      internal_notes: JSON.stringify(internalMeta),
      cost_center_id: form.cost_center_id ? Number(form.cost_center_id) : null,
      items: items.map((it) => ({
        item_id: it.item_id,
        item_code: it.item_code,
        item_name: it.item_name,
        item_name_ar: it.item_name_ar,
        uom_id: it.uom_id,
        quantity: it.ordered_qty,
        unit_price: it.unit_price,
        discount_percent: it.discount_percent || 0,
        discount_amount: it.discount_amount || 0,
        tax_rate_id: it.tax_rate_id,
        tax_rate: it.tax_rate || 0,
        warehouse_id: it.warehouse_id,
        notes: it.notes,
      })),
    };
  }, [form, items]);

  const save = useCallback(async () => {
    if (!validate()) return { ok: false as const, error: 'validation' as const };

    setSaving(true);
    try {
      const payload = buildPayload();

      try {
        const json = orderId
          ? await apiClient.put(`/api/procurement/purchase-orders/${orderId}`, payload)
          : await apiClient.post(`/api/procurement/purchase-orders`, payload);

        return { ok: true as const, data: (json as any)?.data };
      } catch (error: any) {
        const code = error?.data?.error?.code || error?.data?.code || error?.response?.data?.error?.code;
        const message =
          error?.data?.error?.message ||
          error?.data?.error ||
          error?.response?.data?.error?.message ||
          error?.message ||
          'Save failed';
        const combined = code ? `(${String(code)}) ${String(message)}` : String(message);

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('Purchase order save failed', {
            orderId,
            companyId: companyStore.getActiveCompanyId(),
            error,
          });
        }

        return { ok: false as const, error: combined };
      }
    } finally {
      setSaving(false);
    }
  }, [orderId, validate, buildPayload]);

  return {
    loading,
    saving,
    errors,
    form,
    setForm,
    items,
    setItems,
    totals,

    vendors,
    orderTypes,
    orderStatuses,
    warehouses,
    currencies,
    paymentTerms,
    paymentMethods,
    projects,
    deliveryTerms,
    supplyTerms,
    costCenters,
    countries,
    cities,
    ports,

    itemOptions,
    uomOptions,
    taxOptions,

    save,
  };
}
