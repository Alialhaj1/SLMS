import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import apiClient from '../../lib/apiClient';
import { companyStore } from '../../lib/companyStore';
import CurrencySelector from '../../components/shared/CurrencySelector';
import PaymentMethodSelector from '../../components/shared/PaymentMethodSelector';
import { ExchangeRateField } from '../../components/ui/ExchangeRateField';
import WarehouseSelector from '../../components/common/WarehouseSelector';
import {
  TruckIcon, DocumentTextIcon, ShoppingCartIcon, DocumentDuplicateIcon,
  BriefcaseIcon, PencilSquareIcon, CheckCircleIcon, ArrowLeftIcon,
  ExclamationTriangleIcon, InformationCircleIcon, ChevronDownIcon,
  ChevronUpIcon, GlobeAltIcon, CurrencyDollarIcon, MapPinIcon,
  ClipboardDocumentListIcon, CubeIcon, ArrowPathIcon,
  MagnifyingGlassIcon, PlusIcon, TrashIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */
interface ShipmentType { id: number; code: string; name_en: string; name_ar: string; mode?: string; is_active: boolean }
interface City { id: number; code: string; name: string; name_ar?: string; name_en?: string; country_id?: number; is_active: boolean }
interface Port { id: number; code: string; name: string; name_en: string; name_ar: string; port_type: 'sea' | 'air' | 'land'; country_id?: number }
interface Country { id: number; code: string; name: string; name_ar?: string; name_en?: string; is_active?: boolean }
interface Project { id: number; code: string; name: string; name_en?: string; name_ar?: string; project_level?: string; parent_project_id?: number }
interface Vendor { id: number; code: string; name: string; name_ar?: string }
interface Incoterm { id: number; code: string; name: string; name_ar: string; description?: string; is_active: boolean }
interface ShippingAgent { id: number; code: string; name: string; name_ar: string; is_active?: boolean }
interface TaxRate { id: number; code: string; name: string; name_ar?: string; rate: string; tax_type_code: string; is_active?: boolean }
interface MasterItem { id: number; code: string; name: string; name_en?: string; name_ar?: string; base_uom_id?: number; base_uom_code?: string; purchase_price?: number; default_tax_rate?: number }
interface SourceDoc { id: number; number: string; vendor_id: number; vendor_name: string; vendor_name_ar?: string; vendor_code?: string; total_amount: number; currency_id?: number; currency_code?: string; project_id?: number; items: SourceItem[] }
interface SourceItem { id: number; item_id: number; item_code: string; item_name?: string; item_display_name?: string; item_display_name_ar?: string; item_name_ar?: string; quantity: number; ordered_qty?: number; contracted_qty?: number; unit_price: number; uom_id?: number; uom_code?: string; line_total?: number; tax_rate?: number | string; tax_amount?: number | string; discount_pct?: number | string }

interface ShipmentItem {
  _key: string;
  item_id: number | '';
  item_code: string;
  item_name: string;
  item_name_ar: string;
  quantity: number | '';
  unit_cost: number | '';
  uom_id: number | null;
  uom_code: string;
  line_total: number;
  has_tax: boolean;
  tax_rate_id: number | null;
  tax_rate: number;
  tax_amount: number;
  has_customs: boolean;
  customs_rate_id: number | null;
  customs_rate: number;
  customs_amount: number;
  total_with_tax: number;
  source_type: string | null;
  source_id: number | null;
}

type SourceType = 'manual' | 'purchase_order' | 'rfq' | 'contract';

/* ═══════════════════════════════════════════════════════════
   Helper Components
   ═══════════════════════════════════════════════════════════ */
function Section({ icon: Icon, title, subtitle, defaultOpen = true, badge, children }: {
  icon: any; title: string; subtitle?: string; defaultOpen?: boolean; badge?: string; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
            {badge && <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">{badge}</span>}
          </div>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
      <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
      <span>{children}</span>
    </p>
  );
}

function CompletionBar({ percent }: { percent: number }) {
  const color = percent < 30 ? 'bg-red-500' : percent < 60 ? 'bg-amber-500' : percent < 90 ? 'bg-blue-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">{percent}%</span>
    </div>
  );
}

/* ── Vendor Search with Debounce ─────────────────────────── */
function VendorSearch({ vendors, value, onChange }: { vendors: Vendor[]; value: number | null; onChange: (id: number | null) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = vendors.find(v => v.id === value);
  const filtered = useMemo(() => {
    if (!search.trim()) return vendors.slice(0, 50);
    const s = search.toLowerCase();
    return vendors.filter(v =>
      v.name?.toLowerCase().includes(s) || v.name_ar?.toLowerCase().includes(s) || v.code?.toLowerCase().includes(s)
    ).slice(0, 50);
  }, [vendors, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        <input type="text" placeholder={selected ? `${selected.code} — ${selected.name_ar || selected.name}` : 'ابحث باسم أو رقم المورد...'}
          value={search} onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
          className="w-full pl-3 pr-9 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
        {value && (
          <button type="button" onClick={() => { onChange(null); setSearch(''); }}
            className="absolute left-3 top-2.5 text-gray-400 hover:text-red-500">
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
          {filtered.map(v => (
            <button key={v.id} type="button"
              onClick={() => { onChange(v.id); setSearch(''); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 text-left ${v.id === value ? 'bg-blue-50 dark:bg-gray-700' : ''}`}>
              <span className="text-gray-400 font-mono text-xs min-w-[60px]">{v.code}</span>
              <span className="text-gray-900 dark:text-white truncate">{v.name_ar || v.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Item Search Dropdown ────────────────────────────────── */
function ItemSearch({ items, value, onChange, disabled }: {
  items: MasterItem[]; value: number | ''; onChange: (item: MasterItem | null) => void; disabled?: boolean
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = items.find(i => i.id === value);
  const filtered = useMemo(() => {
    if (!search.trim()) return items.slice(0, 30);
    const s = search.toLowerCase();
    return items.filter(i =>
      i.name?.toLowerCase().includes(s) || i.name_ar?.toLowerCase().includes(s) ||
      i.name_en?.toLowerCase().includes(s) || i.code?.toLowerCase().includes(s)
    ).slice(0, 30);
  }, [items, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input type="text" disabled={disabled}
        placeholder={selected ? `${selected.code} — ${selected.name_ar || selected.name}` : 'ابحث عن الصنف بالاسم أو الكود...'}
        value={search} onFocus={() => !disabled && setOpen(true)}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-44 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
          {filtered.map(i => (
            <button key={i.id} type="button"
              onClick={() => { onChange(i); setSearch(''); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 text-left">
              <span className="text-gray-400 font-mono text-xs min-w-[55px]">{i.code}</span>
              <span className="text-gray-900 dark:text-white truncate">{i.name_ar || i.name_en || i.name}</span>
              <span className="text-gray-400 text-xs mr-auto">{i.base_uom_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Source Config & Helpers
   ═══════════════════════════════════════════════════════════ */
const SOURCE_TYPES: { value: SourceType; icon: any; label: string; labelAr: string; desc: string; ready: boolean }[] = [
  { value: 'purchase_order', icon: ShoppingCartIcon, label: 'Purchase Order', labelAr: 'أمر شراء', desc: 'يملأ البيانات تلقائياً من أمر الشراء', ready: true },
  { value: 'manual', icon: PencilSquareIcon, label: 'Manual Entry', labelAr: 'إدخال يدوي', desc: 'إدخال جميع البيانات يدوياً', ready: true },
  { value: 'rfq', icon: DocumentDuplicateIcon, label: 'Price Quotation', labelAr: 'عرض سعر', desc: 'إنشاء من عرض سعر مُعتمد', ready: true },
  { value: 'contract', icon: BriefcaseIcon, label: 'Vendor Contract', labelAr: 'عقد مورد', desc: 'إنشاء من عقد توريد قائم', ready: true },
];

const safeArray = (data: any): any[] => Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
const genKey = () => Math.random().toString(36).slice(2, 10);
const emptyItem = (): ShipmentItem => ({
  _key: genKey(), item_id: '', item_code: '', item_name: '', item_name_ar: '',
  quantity: '', unit_cost: '', uom_id: null, uom_code: '', line_total: 0,
  has_tax: false, tax_rate_id: null, tax_rate: 0, tax_amount: 0,
  has_customs: false, customs_rate_id: null, customs_rate: 0, customs_amount: 0,
  total_with_tax: 0, source_type: null, source_id: null,
});

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
function CreateShipmentPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newShipmentId, setNewShipmentId] = useState<number | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);

  // Lookups
  const [shipmentTypes, setShipmentTypes] = useState<ShipmentType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [originCities, setOriginCities] = useState<City[]>([]);
  const [destinationCities, setDestinationCities] = useState<City[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [incoterms, setIncoterms] = useState<Incoterm[]>([]);
  const [shippingAgents, setShippingAgents] = useState<ShippingAgent[]>([]);
  const [shipmentStatuses, setShipmentStatuses] = useState<{ id: number; code: string; name_en: string; name_ar: string }[]>([]);
  const [shipmentStages, setShipmentStages] = useState<{ id: number; code: string; name_en: string; name_ar: string }[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  const [selectedSource, setSelectedSource] = useState<SourceDoc | null>(null);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const getCompanyId = () => companyStore.getActiveCompanyId();

  // Form state
  const [sourceType, setSourceType] = useState<SourceType>('purchase_order');
  const [sourceDocId, setSourceDocId] = useState<number | null>(null);
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [shipmentTypeId, setShipmentTypeId] = useState<number | ''>('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [incoterm, setIncoterm] = useState('FOB');
  const [originCountryId, setOriginCountryId] = useState<number | ''>('');
  const [destCountryId, setDestCountryId] = useState<number | ''>('');
  const [originCityId, setOriginCityId] = useState<number | ''>('');
  const [destCityId, setDestCityId] = useState<number | ''>('');
  const [portOfLoadingId, setPortOfLoadingId] = useState<number | ''>('');
  const [portOfLoadingText, setPortOfLoadingText] = useState('');
  const [portOfDischargeId, setPortOfDischargeId] = useState<number | ''>('');
  const [blNo, setBlNo] = useState('');
  const [awbNo, setAwbNo] = useState('');
  const [expectedArrival, setExpectedArrival] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [currencyId, setCurrencyId] = useState<number | ''>('');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [paymentMethodType, setPaymentMethodType] = useState('');
  const [lcNumber, setLcNumber] = useState('');
  const [letterOfCreditId, setLetterOfCreditId] = useState<number | null>(null);
  const [shippingAgentId, setShippingAgentId] = useState<number | ''>('');
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [cargoDesc, setCargoDesc] = useState('');
  const [totalWeightKg, setTotalWeightKg] = useState('');
  const [totalVolumeCbm, setTotalVolumeCbm] = useState('');
  const [packagesCount, setPackagesCount] = useState('');
  const [statusCode, setStatusCode] = useState('draft');
  const [stageCode, setStageCode] = useState('');
  const [notes, setNotes] = useState('');

  // Computed
  const isFromSource = sourceType !== 'manual' && !!selectedSource;
  const selectedShipmentType = shipmentTypes.find(t => t.id === shipmentTypeId);
  const stCode = (selectedShipmentType?.code || selectedShipmentType?.mode || '').toLowerCase();

  const filteredPorts = useMemo(() => {
    if (stCode.includes('sea') || stCode.includes('ocean')) return ports.filter(p => p.port_type === 'sea');
    if (stCode.includes('air')) return ports.filter(p => p.port_type === 'air');
    if (stCode.includes('land') || stCode.includes('road')) return ports.filter(p => p.port_type === 'land');
    return ports;
  }, [ports, stCode]);

  // Tax rates split
  const vatRates = useMemo(() => taxRates.filter(t => t.tax_type_code?.startsWith('VAT')), [taxRates]);
  const customsRates = useMemo(() => taxRates.filter(t => t.tax_type_code?.startsWith('CUST')), [taxRates]);

  // Totals
  const totals = useMemo(() => {
    let subtotal = 0, tax = 0, customs = 0;
    items.forEach(it => { subtotal += it.line_total; tax += it.tax_amount; customs += it.customs_amount; });
    return { subtotal, tax, customs, grand: subtotal + tax + customs };
  }, [items]);

  const completionPercent = useMemo(() => {
    const c = [!!shipmentNumber, !!shipmentTypeId, !!projectId, !!incoterm, !!originCountryId && !!originCityId,
      !!destCountryId && !!destCityId, !!portOfDischargeId, !!vendorId, !!currencyId, items.length > 0 || isFromSource];
    return Math.round((c.filter(Boolean).length / c.length) * 100);
  }, [shipmentNumber, shipmentTypeId, projectId, incoterm, originCountryId, originCityId, destCountryId, destCityId, portOfDischargeId, vendorId, currencyId, items, isFromSource]);

  /* ── Load lookups ─────────────────────────────────────── */
  useEffect(() => { fetchLookups(); previewShipmentNumber(); }, []);

  const previewShipmentNumber = async () => {
    try {
      const res = await apiClient.get<any>('/api/logistics-shipments/preview-number');
      if (res.number) setShipmentNumber(res.number);
    } catch { }
  };

  const fetchLookups = async () => {
    setLookupLoading(true);
    try {
      const [typesR, countriesR, portsR, vendorsR, posR, statusR, stageR, incR, agentsR, taxR, itemsR, quotR, conR] = await Promise.all([
        apiClient.get('/api/master/shipment-types?limit=100&is_active=true').catch(() => ({ data: [] })),
        apiClient.get('/api/master/countries?limit=300').catch(() => ({ data: [] })),
        apiClient.get('/api/ports?limit=500').catch(() => ({ data: [] })),
        apiClient.get('/api/master/vendors?limit=500&is_active=true').catch(() => ({ data: [] })),
        apiClient.get('/api/procurement/purchase-orders?limit=200&exclude_with_shipments=true').catch(() => ({ data: [] })),
        apiClient.get('/api/shipment-lifecycle-statuses?limit=100').catch(() => ({ data: [] })),
        apiClient.get('/api/shipment-stages?limit=100').catch(() => ({ data: [] })),
        apiClient.get('/api/master/incoterms?limit=50').catch(() => ({ data: [] })),
        apiClient.get('/api/shipping-agents?limit=100').catch(() => ({ data: [] })),
        apiClient.get('/api/tax-rates?limit=100&is_active=true').catch(() => ({ data: [] })),
        apiClient.get('/api/master/items?limit=5000&is_active=true').catch(() => ({ data: [] })),
        apiClient.get('/api/procurement/quotations?limit=200&exclude_with_shipments=true').catch(() => ({ data: [] })),
        apiClient.get('/api/procurement/contracts?limit=200&exclude_with_shipments=true').catch(() => ({ data: [] })),
      ]);

      setShipmentTypes(safeArray(typesR.data));
      const cList = safeArray(countriesR.data);
      setCountries(cList);
      setPorts(safeArray(portsR.data));
      setVendors(safeArray(vendorsR.data));
      setPurchaseOrders(safeArray(posR.data));
      setShipmentStatuses(safeArray(statusR.data));
      setShipmentStages(safeArray(stageR.data));
      setIncoterms(safeArray(incR.data));
      setShippingAgents(safeArray(agentsR.data));
      setTaxRates(safeArray(taxR.data));
      setMasterItems(safeArray(itemsR.data));
      setQuotations(safeArray(quotR.data));
      setContracts(safeArray(conR.data));

      // Load available projects (no vendor filter initially)
      loadAvailableProjects();

      // Default destination = company country (SAU) + auto load cities
      const companyCountryCode = 'SAU';
      const dest = cList.find((c: Country) => c.code === companyCountryCode);
      if (dest) { setDestCountryId(dest.id); loadCitiesFor('destination', dest.id); }
    } catch (e: any) {
      showToast(e?.message || 'Failed to load data', 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  /* ── Load available projects (filtered by vendor, excluding used) ── */
  const loadAvailableProjects = async (forVendorId?: number | null) => {
    setProjectsLoading(true);
    try {
      let url = '/api/logistics-shipments/available-projects';
      if (forVendorId) url += `?vendor_id=${forVendorId}`;
      const res = await apiClient.get(url);
      setProjects(safeArray(res.data));
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  /* ── City cascading ───────────────────────────────────── */
  const loadCitiesFor = async (which: 'origin' | 'destination', countryId: number) => {
    if (!countryId) { which === 'origin' ? setOriginCities([]) : setDestinationCities([]); return; }
    try {
      const res = await apiClient.get(`/api/master/cities?country_id=${countryId}&limit=200`);
      const list = safeArray(res.data);
      which === 'origin' ? setOriginCities(list) : setDestinationCities(list);
    } catch { which === 'origin' ? setOriginCities([]) : setDestinationCities([]); }
  };

  /* ── Source document selection ─────────────────────────── */
  const handleSourceDocSelection = async (type: SourceType, docId: number) => {
    if (!docId) { setSelectedSource(null); setItems([]); setSourceDocId(null); return; }
    try {
      let endpoint = '';
      if (type === 'purchase_order') endpoint = `/api/procurement/purchase-orders/${docId}`;
      else if (type === 'rfq') endpoint = `/api/procurement/quotations/${docId}`;
      else if (type === 'contract') endpoint = `/api/procurement/contracts/${docId}`;
      else return;

      const res = await apiClient.get(endpoint);
      const doc = res.data;
      setSourceDocId(docId);

      // Normalize items from different sources
      const rawItems: SourceItem[] = doc.items || [];
      const mappedItems: ShipmentItem[] = rawItems.map((si: SourceItem) => {
        const qty = Number(si.ordered_qty || si.contracted_qty || si.quantity || 0);
        const price = Number(si.unit_price || 0);
        const lt = qty * price;
        const taxR = Number(si.tax_rate || 0);
        const taxAmt = taxR > 0 ? lt * taxR / 100 : 0;
        return {
          _key: genKey(),
          item_id: si.item_id,
          item_code: si.item_code || si.item_display_name || '',
          item_name: si.item_display_name || si.item_name || '',
          item_name_ar: si.item_display_name_ar || si.item_name_ar || '',
          quantity: qty,
          unit_cost: price,
          uom_id: si.uom_id || null,
          uom_code: si.uom_code || '',
          line_total: lt,
          has_tax: taxR > 0,
          tax_rate_id: null,
          tax_rate: taxR,
          tax_amount: taxAmt,
          has_customs: false,
          customs_rate_id: null,
          customs_rate: 0,
          customs_amount: 0,
          total_with_tax: lt + taxAmt,
          source_type: type,
          source_id: si.id,
        };
      });
      setItems(mappedItems);

      // Auto-fill header
      const sd: SourceDoc = {
        id: doc.id,
        number: doc.order_number || doc.quotation_number || doc.contract_number || '',
        vendor_id: doc.vendor_id,
        vendor_name: doc.vendor_name || doc.vendor_display_name || '',
        vendor_name_ar: doc.vendor_name_ar,
        vendor_code: doc.vendor_code,
        total_amount: Number(doc.total_amount || doc.total_value || 0),
        currency_id: doc.currency_id,
        currency_code: doc.currency_code,
        project_id: doc.project_id,
        items: rawItems,
      };
      setSelectedSource(sd);
      setVendorId(sd.vendor_id);
      // Load projects for this vendor
      loadAvailableProjects(sd.vendor_id);
      if (sd.project_id) setProjectId(sd.project_id);
      if (sd.currency_id) setCurrencyId(sd.currency_id);
      if (sd.currency_code) setSelectedCurrencyCode(sd.currency_code);
      if (doc.incoterm || doc.delivery_terms_name) setIncoterm(doc.incoterm || doc.delivery_terms_name);
      if (doc.payment_method_id) setPaymentMethodId(doc.payment_method_id);

      // Load origin cities if PO has them
      if (doc.origin_country_id) { setOriginCountryId(doc.origin_country_id); loadCitiesFor('origin', doc.origin_country_id); }
      if (doc.origin_city_id) setOriginCityId(doc.origin_city_id);
      if (doc.destination_country_id) { setDestCountryId(doc.destination_country_id); loadCitiesFor('destination', doc.destination_country_id); }
      if (doc.destination_city_id) setDestCityId(doc.destination_city_id);
      if (doc.port_of_loading_id) setPortOfLoadingId(doc.port_of_loading_id);
      if (doc.port_of_discharge_id) setPortOfDischargeId(doc.port_of_discharge_id);
      if (doc.warehouse_id) setWarehouseId(doc.warehouse_id);

      const srcName = type === 'purchase_order' ? 'أمر الشراء' : type === 'rfq' ? 'عرض السعر' : 'العقد';
      showToast(`تم تحميل بيانات ${srcName} بنجاح مع ${mappedItems.length} صنف`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل البيانات', 'error');
    }
  };

  /* ── Item management ──────────────────────────────────── */
  const recalcItem = (item: ShipmentItem): ShipmentItem => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_cost) || 0;
    const lt = qty * price;
    const taxAmt = item.has_tax ? lt * (Number(item.tax_rate) || 0) / 100 : 0;
    const custAmt = item.has_customs ? lt * (Number(item.customs_rate) || 0) / 100 : 0;
    return { ...item, line_total: lt, tax_amount: taxAmt, customs_amount: custAmt, total_with_tax: lt + taxAmt + custAmt };
  };

  const updateItem = (key: string, field: string, value: any) => {
    setItems(prev => prev.map(it => {
      if (it._key !== key) return it;
      const updated = { ...it, [field]: value };
      // When changing tax rate dropdown
      if (field === 'tax_rate_id') {
        const tr = taxRates.find(r => r.id === value);
        if (tr) { updated.tax_rate = Number(tr.rate); updated.has_tax = true; }
        else { updated.tax_rate = 0; updated.has_tax = false; }
      }
      if (field === 'customs_rate_id') {
        const cr = taxRates.find(r => r.id === value);
        if (cr) { updated.customs_rate = Number(cr.rate); updated.has_customs = true; }
        else { updated.customs_rate = 0; updated.has_customs = false; }
      }
      return recalcItem(updated);
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (key: string) => setItems(prev => prev.filter(it => it._key !== key));

  const selectMasterItem = (key: string, mi: MasterItem | null) => {
    if (!mi) return;
    setItems(prev => prev.map(it => {
      if (it._key !== key) return it;
      return recalcItem({
        ...it,
        item_id: mi.id,
        item_code: mi.code,
        item_name: mi.name_en || mi.name || '',
        item_name_ar: mi.name_ar || '',
        uom_id: mi.base_uom_id || null,
        uom_code: mi.base_uom_code || '',
        unit_cost: mi.purchase_price || it.unit_cost || '',
      } as ShipmentItem);
    }));
  };

  /* ── Validation ───────────────────────────────────────── */
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!shipmentNumber.trim()) e.shipment_number = 'رقم الشحنة مطلوب';
    if (!shipmentTypeId) e.shipment_type_id = 'نوع الشحنة مطلوب';
    if (!projectId) e.project_id = 'المشروع مطلوب';
    if (!incoterm.trim()) e.incoterm = 'شروط التسليم مطلوبة';
    if (!originCountryId) e.origin_country_id = 'بلد المنشأ مطلوب';
    if (!originCityId) e.origin_location_id = 'مدينة المنشأ مطلوبة';
    if (!destCountryId) e.destination_country_id = 'بلد الوصول مطلوب';
    if (!destCityId) e.destination_location_id = 'مدينة الوصول مطلوبة';
    if (!portOfDischargeId) e.port_of_discharge_id = 'ميناء الوصول مطلوب';
    if (sourceType === 'manual' && items.length === 0) e.items = 'يجب إضافة صنف واحد على الأقل';
    for (const it of items) {
      if (!it.item_id) { e.items = 'يوجد أصناف بدون تحديد'; break; }
      if (!it.quantity || Number(it.quantity) <= 0) { e.items = 'يوجد أصناف بدون كمية'; break; }
    }
    if (paymentMethodType?.toLowerCase().includes('lc') || paymentMethodType?.toLowerCase().includes('letter')) {
      if (!lcNumber.trim()) e.lc_number = 'رقم الاعتماد المستندي مطلوب';
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Submit ───────────────────────────────────────────── */
  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) { showToast('يرجى تعبئة الحقول المطلوبة', 'error'); return; }
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        shipment_number: shipmentNumber.trim(),
        shipment_type_id: Number(shipmentTypeId),
        project_id: Number(projectId),
        incoterm: incoterm.trim().toUpperCase(),
        origin_location_id: Number(originCityId),
        destination_location_id: Number(destCityId),
        port_of_discharge_id: Number(portOfDischargeId),
        bl_no: blNo.trim() || null,
        awb_no: awbNo.trim() || null,
        expected_arrival_date: expectedArrival || null,
        departure_date: departureDate || null,
        port_of_loading_id: portOfLoadingId ? Number(portOfLoadingId) : null,
        port_of_loading_text: portOfLoadingText.trim() || null,
        currency_id: currencyId ? Number(currencyId) : null,
        exchange_rate: parseFloat(exchangeRate) || 1,
        payment_method_id: paymentMethodId || null,
        lc_number: lcNumber.trim() || null,
        letter_of_credit_id: letterOfCreditId || null,
        total_amount: totals.grand || null,
        shipping_agent_id: shippingAgentId ? Number(shippingAgentId) : null,
        warehouse_id: warehouseId ?? null,
        vendor_id: vendorId ?? null,
        purchase_order_id: sourceType === 'purchase_order' ? sourceDocId : null,
        quotation_id: sourceType === 'rfq' ? sourceDocId : null,
        contract_id: sourceType === 'contract' ? sourceDocId : null,
        cargo_description: cargoDesc.trim() || null,
        total_weight_kg: totalWeightKg ? parseFloat(totalWeightKg) : null,
        total_volume_cbm: totalVolumeCbm ? parseFloat(totalVolumeCbm) : null,
        packages_count: packagesCount ? parseInt(packagesCount) : null,
        status_code: statusCode || 'draft',
        stage_code: stageCode || null,
        notes: notes.trim() || null,
        items: items.filter(it => it.item_id).map(it => ({
          item_id: Number(it.item_id),
          item_code: it.item_code || null,
          item_name: it.item_name || null,
          item_name_ar: it.item_name_ar || null,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost) || 0,
          uom_id: it.uom_id || null,
          has_tax: it.has_tax,
          tax_rate_id: it.tax_rate_id || null,
          tax_rate: it.tax_rate || 0,
          has_customs: it.has_customs,
          customs_rate_id: it.customs_rate_id || null,
          customs_rate: it.customs_rate || 0,
          source_type: it.source_type || null,
          source_id: it.source_id || null,
        })),
      };

      let res: any;
      if (sourceType === 'purchase_order' && sourceDocId) {
        res = await apiClient.post(`/api/logistics-shipments/from-purchase-order/${sourceDocId}`, payload);
      } else {
        res = await apiClient.post('/api/logistics-shipments', payload);
      }
      const d = res.data || res;
      setNewShipmentId(d?.id ?? d?.shipment?.id ?? null);
      showToast(`تم إنشاء الشحنة بنجاح مع ${items.length} صنف`, 'success');
      setSuccess(true);
    } catch (err: any) {
      let msg = err.message || 'فشل إنشاء الشحنة';
      if (err?.data?.error?.details) msg = err.data.error.details.map((d: any) => `${d.path?.join('.') || ''}: ${d.message}`).join('; ');
      showToast(msg, 'error');
    } finally { setLoading(false); }
  };

  /* ═══════════════════════════════════════════════════════
     Success Screen
     ═══════════════════════════════════════════════════════ */
  if (success && newShipmentId) {
    return (
      <MainLayout><Head><title>تم إنشاء الشحنة - SLMS</title></Head>
        <div className="max-w-lg mx-auto py-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircleIcon className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">تم إنشاء الشحنة بنجاح</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-3">الشحنة جاهزة. أصناف: {items.length} — الإجمالي: {totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-8 inline-block">
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">#{newShipmentId}</span>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push(`/shipments/${newShipmentId}`)} variant="primary">عرض التفاصيل</Button>
              <Button onClick={() => router.reload()} variant="secondary">شحنة جديدة</Button>
              <Button onClick={() => router.push('/shipments')} variant="secondary">القائمة</Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  /* ═══════════════════════════════════════════════════════
     Source doc list for dropdown
     ═══════════════════════════════════════════════════════ */
  const sourceList = sourceType === 'purchase_order' ? purchaseOrders
    : sourceType === 'rfq' ? quotations
    : sourceType === 'contract' ? contracts : [];
  const sourceLabel = (doc: any) => {
    const num = doc.order_number || doc.quotation_number || doc.contract_number || '';
    const vendor = doc.vendor_display_name || doc.vendor_name || '';
    const amt = Number(doc.total_amount || doc.total_value || 0);
    return `${num} — ${vendor} (${amt.toLocaleString()} ${doc.currency_code || ''})`;
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <MainLayout>
      <Head><title>إنشاء شحنة جديدة - SLMS</title></Head>

      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/shipments')} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3">
          <ArrowLeftIcon className="w-4 h-4" /> العودة للقائمة
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إنشاء شحنة جديدة</h1>
              <p className="text-sm text-gray-500">Create a new shipment</p>
            </div>
          </div>
          <div className="hidden md:block w-48">
            <div className="text-xs text-gray-500 mb-1 text-right">اكتمال النموذج</div>
            <CompletionBar percent={completionPercent} />
          </div>
        </div>
      </div>

      {lookupLoading ? (
        <div className="flex items-center justify-center py-20">
          <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-5xl space-y-4 pb-12">

          {/* ═══ Section 1: Data Source ═══════════════════ */}
          <Section icon={ClipboardDocumentListIcon} title="مصدر البيانات | Data Source" subtitle="اختر مصدر البيانات لإنشاء الشحنة">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SOURCE_TYPES.map((src) => {
                const SrcIcon = src.icon;
                const active = sourceType === src.value;
                return (
                  <button key={src.value} type="button"
                    onClick={() => { setSourceType(src.value); setSelectedSource(null); setSourceDocId(null); if (src.value === 'manual') setItems([emptyItem()]); else setItems([]); }}
                    className={`relative p-4 rounded-xl border-2 text-center transition-all ${active ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                    <SrcIcon className={`w-7 h-7 mx-auto mb-2 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className={`text-xs font-semibold ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{src.labelAr}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{src.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Source document selection (PO / Quotation / Contract) */}
            {sourceType !== 'manual' && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {sourceType === 'purchase_order' ? 'أمر الشراء' : sourceType === 'rfq' ? 'عرض السعر' : 'عقد المورد'} *
                  </label>
                  <select value={sourceDocId || ''} onChange={(e) => { const id = Number(e.target.value); if (id) handleSourceDocSelection(sourceType, id); else { setSelectedSource(null); setItems([]); setSourceDocId(null); } }}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                    <option value="">-- اختر لتحميل البيانات تلقائياً --</option>
                    {sourceList.map((d: any) => <option key={d.id} value={d.id}>{sourceLabel(d)}</option>)}
                  </select>
                  <Hint>سيتم ملء المورد والعملة والأصناف تلقائياً</Hint>
                </div>
                {selectedSource && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">تم تحميل البيانات</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {[
                        { l: 'الرقم', v: selectedSource.number },
                        { l: 'المورد', v: selectedSource.vendor_name_ar || selectedSource.vendor_name },
                        { l: 'الإجمالي', v: `${selectedSource.total_amount.toLocaleString()} ${selectedSource.currency_code || ''}` },
                        { l: 'الأصناف', v: `${items.length} صنف` },
                      ].map(({ l, v }) => (
                        <div key={l} className="bg-white/70 dark:bg-gray-800/50 rounded-lg p-2">
                          <div className="text-gray-500">{l}</div>
                          <div className="font-semibold text-gray-900 dark:text-white truncate">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual: Vendor search */}
            {sourceType === 'manual' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المورد | Vendor</label>
                <VendorSearch vendors={vendors} value={vendorId} onChange={(id) => { setVendorId(id); setProjectId(''); loadAvailableProjects(id); }} />
                <Hint>ابحث بالاسم أو رقم المورد — يتم فلترة المشاريع حسب المورد</Hint>
              </div>
            )}
          </Section>

          {/* ═══ Section 2: Core Info ════════════════════= */}
          <Section icon={DocumentTextIcon} title="المعلومات الأساسية | Core Information" subtitle="الحقول المطلوبة لإنشاء الشحنة">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input label="رقم الشحنة *" placeholder="SHP-2024-001" value={shipmentNumber} onChange={(e) => setShipmentNumber(e.target.value)} error={formErrors.shipment_number} />
                <Hint>رقم تسلسلي تلقائي — يمكنك تعديله</Hint>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الشحنة *</label>
                <select value={shipmentTypeId} onChange={(e) => setShipmentTypeId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-sm ${formErrors.shipment_type_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">اختر نوع الشحنة</option>
                  {shipmentTypes.filter(x => x.is_active).map(st => (
                    <option key={st.id} value={st.id}>
                      {(st.mode || st.code || '').includes('SEA') ? '🚢' : (st.mode || st.code || '').includes('AIR') ? '✈️' : '🚛'} {st.name_ar} ({st.name_en})
                    </option>
                  ))}
                </select>
                {formErrors.shipment_type_id && <p className="mt-1 text-xs text-red-500">{formErrors.shipment_type_id}</p>}
                <Hint>يحدد نوع الموانئ المتاحة (بحري ← موانئ، جوي ← مطارات)</Hint>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المشروع الفرعي * {projectsLoading && <span className="text-blue-500 text-xs animate-pulse">جاري التحميل...</span>}</label>
                <select value={projectId} disabled={isFromSource && !!projectId}
                  onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-sm disabled:opacity-50 ${formErrors.project_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">{projects.length === 0 ? (vendorId ? 'لا توجد مشاريع متاحة لهذا المورد' : 'اختر المورد أولاً') : 'اختر المشروع الفرعي'}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {(p as any).name_ar || p.name}</option>)}
                </select>
                {formErrors.project_id && <p className="mt-1 text-xs text-red-500">{formErrors.project_id}</p>}
                <Hint>يظهر فقط المشاريع الفرعية المرتبطة بالمورد والغير مستخدمة في شحنات أخرى</Hint>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شروط التسليم (Incoterm) *</label>
                <select value={incoterm} disabled={isFromSource} onChange={(e) => setIncoterm(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-sm disabled:opacity-50 ${formErrors.incoterm ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">اختر شروط التسليم</option>
                  {incoterms.filter(i => i.is_active).map(inc => <option key={inc.id} value={inc.code}>{inc.code} — {inc.name_ar} ({inc.name})</option>)}
                </select>
                {formErrors.incoterm && <p className="mt-1 text-xs text-red-500">{formErrors.incoterm}</p>}
                <Hint>الافتراضي FOB — التسليم على ظهر السفينة</Hint>
              </div>
            </div>
          </Section>

          {/* ═══ Section 3: Origin & Destination ══════════ */}
          <Section icon={MapPinIcon} title="المنشأ والوجهة | Origin & Destination" subtitle="حدد بلد ومدينة المنشأ والوجهة وميناء الوصول">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بلد المنشأ *</label>
                <select value={originCountryId} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : 0; setOriginCountryId(v || ''); setOriginCityId(''); if (v) loadCitiesFor('origin', v); }}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-sm ${formErrors.origin_country_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">اختر بلد المنشأ</option>
                  {countries.filter(c => c.is_active !== false).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name_en || c.name}</option>)}
                </select>
                {formErrors.origin_country_id && <p className="mt-1 text-xs text-red-500">{formErrors.origin_country_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مدينة المنشأ *</label>
                <select value={originCityId} disabled={!originCountryId} onChange={(e) => setOriginCityId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-sm disabled:opacity-40 ${formErrors.origin_location_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">{originCountryId ? 'اختر المدينة' : 'اختر البلد أولاً'}</option>
                  {originCities.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name_en || c.name} ({c.name_ar || ''})</option>)}
                </select>
                {formErrors.origin_location_id && <p className="mt-1 text-xs text-red-500">{formErrors.origin_location_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بلد الوصول * <span className="text-blue-500 text-xs">(الافتراضي: بلد الشركة)</span></label>
                <select value={destCountryId} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : 0; setDestCountryId(v || ''); setDestCityId(''); if (v) loadCitiesFor('destination', v); }}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-sm ${formErrors.destination_country_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">اختر بلد الوصول</option>
                  {countries.filter(c => c.is_active !== false).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name_en || c.name}</option>)}
                </select>
                {formErrors.destination_country_id && <p className="mt-1 text-xs text-red-500">{formErrors.destination_country_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مدينة الوصول *</label>
                <select value={destCityId} disabled={!destCountryId} onChange={(e) => setDestCityId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-sm disabled:opacity-40 ${formErrors.destination_location_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">{destCountryId ? 'اختر المدينة' : 'اختر البلد أولاً'}</option>
                  {destinationCities.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name_en || c.name} ({c.name_ar || ''})</option>)}
                </select>
                {formErrors.destination_location_id && <p className="mt-1 text-xs text-red-500">{formErrors.destination_location_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ميناء الشحن <span className="text-gray-400 text-xs">(اختياري)</span></label>
                <select value={portOfLoadingId} onChange={(e) => { setPortOfLoadingId(e.target.value ? Number(e.target.value) : ''); setPortOfLoadingText(''); }}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  <option value="">اختر أو اكتب أدناه</option>
                  {filteredPorts.map(p => <option key={p.id} value={p.id}>{p.port_type === 'sea' ? '🚢' : p.port_type === 'air' ? '✈️' : '🚛'} {p.name_ar} ({p.name_en})</option>)}
                </select>
                {!portOfLoadingId && (
                  <input type="text" placeholder="أو اكتب اسم الميناء يدوياً" value={portOfLoadingText}
                    onChange={(e) => { setPortOfLoadingText(e.target.value); setPortOfLoadingId(''); }}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-sm" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ميناء الوصول *</label>
                <select value={portOfDischargeId} onChange={(e) => setPortOfDischargeId(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-sm ${formErrors.port_of_discharge_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">اختر ميناء الوصول</option>
                  {filteredPorts.map(p => <option key={p.id} value={p.id}>{p.port_type === 'sea' ? '🚢' : p.port_type === 'air' ? '✈️' : '🚛'} {p.name_ar} ({p.name_en})</option>)}
                </select>
                {formErrors.port_of_discharge_id && <p className="mt-1 text-xs text-red-500">{formErrors.port_of_discharge_id}</p>}
                <Hint>يتم فلترة الموانئ حسب نوع الشحنة</Hint>
              </div>
            </div>
          </Section>

          {/* ═══ Section 4: Items ═════════════════════════ */}
          <Section icon={CubeIcon} title={`أصناف الشحنة (${items.length}) | Shipment Items`}
            subtitle={isFromSource ? 'تم تحميل الأصناف من المستند المصدر — للقراءة فقط' : 'أضف أصناف الشحنة يدوياً مع الضريبة والجمارك'}>

            {isFromSource && items.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">بيانات الأصناف للقراءة فقط</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                      لتعديل الكميات أو الأسعار، يرجى تعديلها من {sourceType === 'purchase_order' ? 'أمر الشراء' : sourceType === 'rfq' ? 'عرض السعر' : 'العقد'} الأصلي ثم إعادة تحميل البيانات.
                      يمكنك فقط تعيين الضريبة والجمارك لكل صنف.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {items.length > 0 && (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-8">#</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 min-w-[200px]">الصنف</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-20">الكمية</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-14">الوحدة</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-24">السعر</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-24">المجموع</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-36">ضريبة</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-36">جمارك</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 w-24">الصافي</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {items.map((it, idx) => (
                      <tr key={it._key} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 align-top">
                        <td className="px-2 py-2 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-2 py-2">
                          {sourceType === 'manual' ? (
                            <ItemSearch items={masterItems} value={it.item_id}
                              onChange={(mi) => selectMasterItem(it._key, mi)} />
                          ) : (
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{it.item_name_ar || it.item_name}</div>
                              <div className="text-xs text-gray-400">{it.item_code}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="0" step="0.01" value={it.quantity}
                            disabled={isFromSource}
                            onChange={(e) => updateItem(it._key, 'quantity', e.target.value ? Number(e.target.value) : '')}
                            className={`w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 ${isFromSource ? 'opacity-60 cursor-not-allowed' : ''}`} />
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500">{it.uom_code || '-'}</td>
                        <td className="px-2 py-2">
                          <input type="number" min="0" step="0.01" value={it.unit_cost}
                            disabled={isFromSource}
                            onChange={(e) => updateItem(it._key, 'unit_cost', e.target.value ? Number(e.target.value) : '')}
                            className={`w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 ${isFromSource ? 'opacity-60 cursor-not-allowed' : ''}`} />
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-sm">{it.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-2">
                          <select value={it.tax_rate_id || ''}
                            onChange={(e) => updateItem(it._key, 'tax_rate_id', e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700">
                            <option value="">بدون ضريبة</option>
                            {vatRates.filter(r => r.is_active !== false).map(r => <option key={r.id} value={r.id}>{r.name_ar || r.name} ({Number(r.rate)}%)</option>)}
                          </select>
                          {it.tax_amount > 0 && <div className="text-[10px] text-emerald-600 mt-0.5 text-right">+{it.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>}
                        </td>
                        <td className="px-2 py-2">
                          <select value={it.customs_rate_id || ''}
                            onChange={(e) => updateItem(it._key, 'customs_rate_id', e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700">
                            <option value="">بدون جمارك</option>
                            {customsRates.filter(r => r.is_active !== false).map(r => <option key={r.id} value={r.id}>{r.name_ar || r.name} ({Number(r.rate)}%)</option>)}
                          </select>
                          {it.customs_amount > 0 && <div className="text-[10px] text-orange-600 mt-0.5 text-right">+{it.customs_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>}
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-sm text-blue-700 dark:text-blue-300">{it.total_with_tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-2">
                          {!isFromSource && (
                            <button type="button" onClick={() => removeItem(it._key)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {formErrors.items && <p className="text-xs text-red-500 mt-1">{formErrors.items}</p>}

            {/* Add item button for manual mode only */}
            <div className="flex items-center justify-between">
              {!isFromSource ? (
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  <PlusIcon className="w-4 h-4" /> إضافة صنف
                </button>
              ) : (
                <div />
              )}
              {items.length > 0 && (
                <div className="text-right space-y-1">
                  <div className="text-xs text-gray-500">المجموع: <span className="font-semibold text-gray-900 dark:text-white">{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  {totals.tax > 0 && <div className="text-xs text-emerald-600">الضريبة: +{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>}
                  {totals.customs > 0 && <div className="text-xs text-orange-600">الجمارك: +{totals.customs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>}
                  <div className="text-sm font-bold text-blue-700 dark:text-blue-300 border-t pt-1">
                    الإجمالي: {totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ═══ Section 5: Financial ════════════════════= */}
          <Section icon={CurrencyDollarIcon} title="المعلومات المالية | Financial" subtitle="العملة وسعر الصرف وطريقة الدفع"
            defaultOpen={!!selectedSource || sourceType === 'manual'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العملة</label>
                <CurrencySelector value={currencyId ? Number(currencyId) : null}
                  onChange={(id) => setCurrencyId(id || '')} onCurrencyCodeChange={setSelectedCurrencyCode}
                  companyId={getCompanyId()} />
                <Hint>مرتبط بجدول العملات — الافتراضي الريال السعودي (SAR)</Hint>
              </div>
              <ExchangeRateField currencyCode={selectedCurrencyCode} value={exchangeRate}
                onChange={(v) => setExchangeRate(v)} hideWhenBaseCurrency={true} label="سعر الصرف" />
              <div className="md:col-span-2">
                <PaymentMethodSelector paymentMethodId={paymentMethodId}
                  onPaymentMethodChange={(id, type) => { setPaymentMethodId(id); setPaymentMethodType(type); }}
                  onBankAccountChange={() => {}} companyId={getCompanyId() || 0}
                  label="طريقة الدفع" disabled={isFromSource} showInlineFields={true}
                  locale="ar" />
              </div>
              {(paymentMethodType?.toLowerCase().includes('lc') || paymentMethodType?.toLowerCase().includes('letter')) && (
                <div>
                  <Input label="رقم الاعتماد المستندي *" placeholder="LC-2024-001"
                    value={lcNumber} onChange={(e) => setLcNumber(e.target.value)} error={formErrors.lc_number} />
                  <Hint>مطلوب عند اختيار الاعتماد المستندي كطريقة دفع</Hint>
                </div>
              )}
            </div>
          </Section>

          {/* ═══ Section 6: Shipping & Logistics ═════════ */}
          <Section icon={TruckIcon} title="الشحن والخدمات اللوجستية" subtitle="وكيل الشحن والمستودع وتفاصيل البضاعة" defaultOpen={false} badge="اختياري">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وكيل الشحن</label>
                <select value={shippingAgentId} onChange={(e) => setShippingAgentId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  <option value="">اختر وكيل الشحن</option>
                  {shippingAgents.filter(a => a.is_active !== false).map(a => <option key={a.id} value={a.id}>{a.code} — {a.name_ar} ({a.name})</option>)}
                </select>
              </div>
              <WarehouseSelector value={warehouseId} onChange={setWarehouseId} label="المستودع المُستلم" />
              <Input label="وصف البضاعة" placeholder="مثال: معدات، قطع غيار..." value={cargoDesc} onChange={(e) => setCargoDesc(e.target.value)} />
              <Input label="الوزن (كجم)" type="number" placeholder="0" value={totalWeightKg} onChange={(e) => setTotalWeightKg(e.target.value)} />
              <Input label="الحجم (م³)" type="number" placeholder="0" value={totalVolumeCbm} onChange={(e) => setTotalVolumeCbm(e.target.value)} />
              <Input label="عدد الطرود" type="number" placeholder="0" value={packagesCount} onChange={(e) => setPackagesCount(e.target.value)} />
            </div>
          </Section>

          {/* ═══ Section 7: Documents & Dates ════════════ */}
          <Section icon={DocumentTextIcon} title="المستندات والتواريخ" subtitle="رقم البوليصة والتواريخ — يمكن إضافتها لاحقاً" defaultOpen={false} badge="اختياري">
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">أرقام بوالص الشحن والتواريخ ليست مطلوبة عند الإنشاء. يمكنك إضافتها لاحقاً.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="رقم بوليصة الشحن (B/L)" placeholder="BOL-XXXX" value={blNo} onChange={(e) => setBlNo(e.target.value)} />
              <Input label="رقم بوليصة الشحن الجوي (AWB)" placeholder="AWB-XXXX" value={awbNo} onChange={(e) => setAwbNo(e.target.value)} />
              <Input label="تاريخ المغادرة" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
              <Input label="تاريخ الوصول المتوقع" type="date" value={expectedArrival} onChange={(e) => setExpectedArrival(e.target.value)} />
            </div>
          </Section>

          {/* ═══ Section 8: Status & Notes ═══════════════ */}
          <Section icon={GlobeAltIcon} title="الحالة والملاحظات" subtitle="الحالة الابتدائية وملاحظات" defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة الابتدائية</label>
                <select value={statusCode} onChange={(e) => setStatusCode(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  <option value="draft">مسودة (Draft)</option>
                  {shipmentStatuses.filter(s => s.code !== 'draft').map(s => <option key={s.id} value={s.code}>{s.name_ar} ({s.name_en})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المرحلة</label>
                <select value={stageCode} onChange={(e) => setStageCode(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  <option value="">بدون تحديد</option>
                  {shipmentStages.map(s => <option key={s.id} value={s.code}>{s.name_ar} ({s.name_en})</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Input label="ملاحظات" multiline rows={3} placeholder="أي ملاحظات إضافية..."
                  value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </Section>

          {/* ═══ Validation Summary ══════════════════════ */}
          {Object.keys(formErrors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                <span className="text-sm font-semibold text-red-700">يرجى تصحيح الأخطاء التالية</span>
              </div>
              <ul className="space-y-1">
                {Object.values(formErrors).map((err, i) => (<li key={i} className="text-xs text-red-600">• {err}</li>))}
              </ul>
            </div>
          )}

          {/* ═══ Submit ══════════════════════════════════ */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => router.push('/shipments')} disabled={loading}>إلغاء</Button>
            <div className="flex items-center gap-3">
              {items.length > 0 && (
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300 hidden md:block">
                  الإجمالي: {totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedCurrencyCode || ''}
                </span>
              )}
              <Button type="submit" variant="primary" loading={loading} disabled={loading}>
                {sourceType !== 'manual' && sourceDocId ? `إنشاء من ${sourceType === 'purchase_order' ? 'أمر الشراء' : sourceType === 'rfq' ? 'عرض السعر' : 'العقد'}` : 'إنشاء الشحنة'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Logistics.Shipments.Create, CreateShipmentPage);
