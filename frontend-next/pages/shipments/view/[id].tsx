/**
 * Shipment Detail View Page  Comprehensive
 * Tabs: Overview | Items | Expenses | Containers | Parties | Documents & Compliance
 * Fetches from multiple APIs and interconnects with all related pages.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import MainLayout from '../../../components/layout/MainLayout';
import { useLocale } from '../../../contexts/LocaleContext';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';

/*  Interfaces matching real backend responses  */

interface ShipmentDetail {
  id: number;
  shipment_number: string;
  status_code: string;
  stage_code: string;
  bl_no?: string;
  awb_no?: string;
  incoterm?: string;
  total_amount?: number;
  expected_arrival_date?: string;
  notes?: string;
  shipment_type_name_en?: string;
  shipment_type_name_ar?: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor_code?: string;
  purchase_order_id?: number;
  po_number?: string;
  po_total_amount?: number;
  po_paid_amount?: number;
  po_remaining_amount?: number;
  po_currency_code?: string;
  po_currency_symbol?: string;
  actual_currency_code?: string;
  actual_currency_symbol?: string;
  exchange_rate?: number;
  total_expenses_sar?: number;
  project_id?: number;
  project_name?: string;
  project_code?: string;
  port_of_loading_name?: string;
  port_of_discharge_name?: string;
  warehouse_name?: string;
  payment_method?: string;
  lc_number?: string;
  locked_at?: string;
  created_at?: string;
  updated_at?: string;
  items?: ShipmentItem[];
}

interface ShipmentItem {
  item_id: number;
  item_name: string;
  item_name_ar?: string;
  item_code?: string;
  quantity: number;
  unit_code?: string;
  unit_cost?: number;
  total_cost?: number;
  received_quantity?: number;
}

interface Container {
  id: number;
  container_number: string;
  seal_number?: string;
  bl_number?: string;
  status: string;
  container_type_name?: string;
  size_feet?: number;
  gross_weight_kg?: number;
  net_weight_kg?: number;
  volume_cbm?: number;
  packages_count?: number;
  is_hazardous?: boolean;
  loading_date?: string;
  discharge_date?: string;
  location?: string;
}

interface Party {
  id: number;
  party_type: string;
  party_name: string;
  party_name_ar?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  country_name?: string;
  tax_number?: string;
  is_primary?: boolean;
}

interface Compliance {
  id: number;
  requirement_type: string;
  requirement_name: string;
  requirement_name_ar?: string;
  status: string;
  authority?: string;
  reference_number?: string;
  due_date?: string;
  completed_date?: string;
  is_mandatory?: boolean;
  priority?: string;
  cost?: number;
  currency_code?: string;
}

interface ExpenseBreakdown {
  category: string;
  expense_type_name: string;
  expense_type_name_ar?: string;
  count: number;
  total_before_vat: number;
  total_vat: number;
  total_amount: number;
  total_base_currency: number;
}

/*  Status & Stage Maps  */

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_transit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  at_port: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  customs_clearance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const COMPLIANCE_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  waived: 'bg-gray-100 text-gray-800',
  expired: 'bg-orange-100 text-orange-800',
};

const CONTAINER_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  loaded: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-indigo-100 text-indigo-800',
  discharged: 'bg-purple-100 text-purple-800',
  released: 'bg-green-100 text-green-800',
};

const PARTY_COLORS: Record<string, string> = {
  importer: 'bg-blue-100 text-blue-800',
  exporter: 'bg-green-100 text-green-800',
  consignee: 'bg-purple-100 text-purple-800',
  notify_party: 'bg-yellow-100 text-yellow-800',
  broker: 'bg-orange-100 text-orange-800',
  shipping_agent: 'bg-cyan-100 text-cyan-800',
  freight_forwarder: 'bg-indigo-100 text-indigo-800',
  customs_broker: 'bg-red-100 text-red-800',
};

type TabKey = 'overview' | 'items' | 'expenses' | 'containers' | 'parties' | 'documents';

/*  Helpers  */

const Badge = ({ text, colors }: { text: string; colors: Record<string, string> }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[text] || 'bg-gray-100 text-gray-600'}`}>
    {text?.replace(/_/g, ' ').toUpperCase()}
  </span>
);

const Field = ({ label, value, href }: { label: string; value?: string | number | null; href?: string }) => (
  <div className="py-2">
    <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-sm font-medium text-gray-900 dark:text-white">
      {href && value ? (
        <Link href={href} className="text-blue-600 hover:underline">{value}</Link>
      ) : (
        value ?? '\u2014'
      )}
    </dd>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12 text-gray-400 dark:text-gray-500">{message}</div>
);

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2 dark:border-gray-700">{title}</h3>
    {children}
  </div>
);

/*  Main Component  */

export default function ShipmentViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale } = useLocale();
  const { token } = useAuth();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [compliance, setCompliance] = useState<Compliance[]>([]);
  const [expenses, setExpenses] = useState<ExpenseBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : undefined;

  const fetchShipment = useCallback(async () => {
    if (!id || !headers) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/logistics-shipments/${id}`, { headers });
      if (!res.ok) { showToast(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0634\u062d\u0646\u0629' : 'Failed to load shipment', 'error'); return; }
      const json = await res.json();
      if (json.success) setShipment(json.data);
    } catch { showToast(isAr ? '\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644' : 'Connection error', 'error'); }
    finally { setLoading(false); }
  }, [id, token]);

  const fetchRelated = useCallback(async () => {
    if (!id || !headers) return;
    const shipmentId = id;
    const [cRes, pRes, compRes, expRes] = await Promise.allSettled([
      fetch(`${apiBase}/api/shipment-containers?shipment_id=${shipmentId}&limit=100`, { headers }),
      fetch(`${apiBase}/api/shipment-parties?shipment_id=${shipmentId}&limit=100`, { headers }),
      fetch(`${apiBase}/api/shipment-compliance?shipment_id=${shipmentId}&limit=100`, { headers }),
      fetch(`${apiBase}/api/shipment-accounting/expense-breakdown/${shipmentId}`, { headers }),
    ]);
    if (cRes.status === 'fulfilled' && cRes.value.ok) {
      const j = await cRes.value.json(); setContainers(j.data || []);
    }
    if (pRes.status === 'fulfilled' && pRes.value.ok) {
      const j = await pRes.value.json(); setParties(j.data || []);
    }
    if (compRes.status === 'fulfilled' && compRes.value.ok) {
      const j = await compRes.value.json(); setCompliance(j.data || []);
    }
    if (expRes.status === 'fulfilled' && expRes.value.ok) {
      const j = await expRes.value.json(); setExpenses(j.data || []);
    }
  }, [id, token]);

  useEffect(() => { fetchShipment(); fetchRelated(); }, [fetchShipment, fetchRelated]);

  const items = shipment?.items || [];
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.total_amount || 0), 0);
  const currency = shipment?.actual_currency_code || shipment?.po_currency_code || '';

  const tabs: { key: TabKey; label: string; labelAr: string; count?: number }[] = [
    { key: 'overview',   label: 'Overview',               labelAr: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' },
    { key: 'items',      label: `Items (${items.length})`,  labelAr: `\u0627\u0644\u0623\u0635\u0646\u0627\u0641 (${items.length})` },
    { key: 'expenses',   label: `Expenses (${expenses.length})`, labelAr: `\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a (${expenses.length})` },
    { key: 'containers', label: `Containers (${containers.length})`, labelAr: `\u0627\u0644\u062d\u0627\u0648\u064a\u0627\u062a (${containers.length})` },
    { key: 'parties',    label: `Parties (${parties.length})`, labelAr: `\u0627\u0644\u0623\u0637\u0631\u0627\u0641 (${parties.length})` },
    { key: 'documents',  label: `Compliance (${compliance.length})`, labelAr: `\u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644 (${compliance.length})` },
  ];

  return (
    <MainLayout>
      <Head><title>{shipment ? shipment.shipment_number : isAr ? '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0634\u062d\u0646\u0629' : 'Shipment Detail'}</title></Head>
      <div className="max-w-7xl mx-auto p-4 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>

        {/*  Header with actions  */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button onClick={() => router.push('/shipments')} className="text-sm text-blue-600 hover:underline mb-1 flex items-center gap-1">
              <span>{isAr ? '\u2192' : '\u2190'}</span> {isAr ? '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0634\u062d\u0646\u0627\u062a' : 'All Shipments'}
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? (isAr ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...' : 'Loading...') : shipment?.shipment_number || 'Shipment'}
            </h1>
            {shipment && (
              <p className="text-sm text-gray-500 mt-0.5">
                {isAr ? shipment.shipment_type_name_ar : shipment.shipment_type_name_en}
                {shipment.stage_code && <span className="mx-2">&middot;</span>}
                {shipment.stage_code && <span className="capitalize">{shipment.stage_code.replace(/_/g, ' ')}</span>}
              </p>
            )}
          </div>
          {shipment && (
            <div className="flex items-center gap-3">
              <Badge text={shipment.status_code} colors={STATUS_COLORS} />
              <Link href={`/shipments/create`} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {isAr ? '\u0634\u062d\u0646\u0629 \u062c\u062f\u064a\u062f\u0629' : '+ New Shipment'}
              </Link>
              <Link href="/shipments/tracking" className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
                {isAr ? '\u062a\u062a\u0628\u0639' : 'Track'}
              </Link>
            </div>
          )}
        </div>

        {/*  Summary Cards  */}
        {shipment && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
              <p className="text-xs text-gray-500">{isAr ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0634\u062d\u0646\u0629' : 'Shipment Total'}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{Number(shipment.total_amount || shipment.po_total_amount || 0).toLocaleString()} <span className="text-xs text-gray-400">{currency}</span></p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
              <p className="text-xs text-gray-500">{isAr ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a' : 'Total Expenses'}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{Number(shipment.total_expenses_sar || totalExpenses || 0).toLocaleString()} <span className="text-xs text-gray-400">SAR</span></p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
              <p className="text-xs text-gray-500">{isAr ? '\u0627\u0644\u0623\u0635\u0646\u0627\u0641' : 'Items'}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
              <p className="text-xs text-gray-500">{isAr ? '\u0627\u0644\u062d\u0627\u0648\u064a\u0627\u062a' : 'Containers'}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{containers.length}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : shipment ? (
          <>
            {/*  Tabs  */}
            <div className="border-b dark:border-gray-700 flex gap-1 overflow-x-auto">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-4 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {isAr ? t.labelAr : t.label}
                </button>
              ))}
            </div>

            {/*  OVERVIEW TAB  */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SectionCard title={isAr ? '\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629' : 'Basic Information'}>
                  <dl>
                    <Field label={isAr ? '\u0631\u0642\u0645 \u0627\u0644\u0634\u062d\u0646\u0629' : 'Shipment #'} value={shipment.shipment_number} />
                    <Field label={isAr ? '\u0627\u0644\u0646\u0648\u0639' : 'Type'} value={isAr ? shipment.shipment_type_name_ar : shipment.shipment_type_name_en} />
                    <Field label={isAr ? '\u0627\u0644\u0645\u0631\u062d\u0644\u0629' : 'Stage'} value={shipment.stage_code?.replace(/_/g, ' ')} />
                    <Field label="Incoterm" value={shipment.incoterm} />
                    <Field label="BL #" value={shipment.bl_no} />
                    <Field label="AWB #" value={shipment.awb_no} />
                    <Field label={isAr ? '\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639' : 'Payment Method'} value={shipment.payment_method} />
                    {shipment.lc_number && <Field label={isAr ? '\u0631\u0642\u0645 \u062e\u0637\u0627\u0628 \u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f' : 'LC Number'} value={shipment.lc_number} />}
                  </dl>
                </SectionCard>

                <SectionCard title={isAr ? '\u0627\u0644\u0623\u0637\u0631\u0627\u0641 \u0648\u0627\u0644\u0645\u0631\u0627\u062c\u0639' : 'References'}>
                  <dl>
                    <Field label={isAr ? '\u0627\u0644\u0645\u0648\u0631\u062f' : 'Vendor'} value={shipment.vendor_name ? `${shipment.vendor_code} - ${shipment.vendor_name}` : undefined} />
                    <Field label={isAr ? '\u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621' : 'Purchase Order'} value={shipment.po_number} />
                    {shipment.po_total_amount != null && (
                      <>
                        <Field label={isAr ? '\u0642\u064a\u0645\u0629 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621' : 'PO Value'} value={`${Number(shipment.po_total_amount).toLocaleString()} ${shipment.po_currency_code || ''}`} />
                        <Field label={isAr ? '\u0627\u0644\u0645\u062f\u0641\u0648\u0639' : 'Paid'} value={`${Number(shipment.po_paid_amount || 0).toLocaleString()} ${shipment.po_currency_code || ''}`} />
                        <Field label={isAr ? '\u0627\u0644\u0645\u062a\u0628\u0642\u064a' : 'Remaining'} value={`${Number(shipment.po_remaining_amount || 0).toLocaleString()} ${shipment.po_currency_code || ''}`} />
                      </>
                    )}
                    <Field label={isAr ? '\u0627\u0644\u0639\u0645\u0644\u0629' : 'Currency'} value={currency} />
                    {shipment.exchange_rate && shipment.exchange_rate !== 1 && (
                      <Field label={isAr ? '\u0633\u0639\u0631 \u0627\u0644\u0635\u0631\u0641' : 'Exchange Rate'} value={shipment.exchange_rate} />
                    )}
                  </dl>
                </SectionCard>

                <SectionCard title={isAr ? '\u0627\u0644\u0645\u0648\u0627\u0646\u0626 \u0648\u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e' : 'Ports & Dates'}>
                  <dl>
                    <Field label={isAr ? '\u0645\u064a\u0646\u0627\u0621 \u0627\u0644\u0634\u062d\u0646' : 'Port of Loading'} value={shipment.port_of_loading_name} />
                    <Field label={isAr ? '\u0645\u064a\u0646\u0627\u0621 \u0627\u0644\u062a\u0641\u0631\u064a\u063a' : 'Port of Discharge'} value={shipment.port_of_discharge_name} />
                    <Field label={isAr ? '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0645\u062a\u0648\u0642\u0639' : 'Expected Arrival'} value={shipment.expected_arrival_date ? new Date(shipment.expected_arrival_date).toLocaleDateString() : undefined} />
                    <Field label={isAr ? '\u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639' : 'Warehouse'} value={shipment.warehouse_name} />
                    <Field label={isAr ? '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621' : 'Created'} value={shipment.created_at ? new Date(shipment.created_at).toLocaleString() : undefined} />
                    <Field label={isAr ? '\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b' : 'Updated'} value={shipment.updated_at ? new Date(shipment.updated_at).toLocaleString() : undefined} />
                  </dl>
                </SectionCard>

                {shipment.notes && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 col-span-full">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{isAr ? '\u0645\u0644\u0627\u062d\u0638\u0627\u062a' : 'Notes'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{shipment.notes}</p>
                  </div>
                )}

                {/* Quick Links */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 col-span-full">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{isAr ? '\u0631\u0648\u0627\u0628\u0637 \u0633\u0631\u064a\u0639\u0629' : 'Quick Links'}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/shipments/cost-types" className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100">{isAr ? '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641' : 'Cost Types'}</Link>
                    <Link href="/shipments/landed-cost-allocation" className="px-3 py-1.5 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100">{isAr ? '\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641' : 'Cost Allocation'}</Link>
                    <Link href="/shipments/landed-cost-settings" className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100">{isAr ? '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062a\u0643\u0644\u0641\u0629' : 'Cost Settings'}</Link>
                    <Link href="/shipments/document-requirements" className="px-3 py-1.5 text-xs bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100">{isAr ? '\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a' : 'Document Requirements'}</Link>
                    <Link href="/shipments/alerts" className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100">{isAr ? '\u0642\u0648\u0627\u0639\u062f \u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a' : 'Alert Rules'}</Link>
                    <Link href="/shipments/tracking" className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100">{isAr ? '\u062a\u062a\u0628\u0639 \u0627\u0644\u0634\u062d\u0646\u0629' : 'Track Shipment'}</Link>
                  </div>
                </div>
              </div>
            )}

            {/*  ITEMS TAB  */}
            {activeTab === 'items' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                {items.length === 0 ? <EmptyState message={isAr ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0635\u0646\u0627\u0641' : 'No items found'} /> : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {[isAr ? '\u0643\u0648\u062f' : 'Code', isAr ? '\u0627\u0644\u0635\u0646\u0641' : 'Item', isAr ? '\u0627\u0644\u0643\u0645\u064a\u0629' : 'Qty', isAr ? '\u0627\u0644\u0648\u062d\u062f\u0629' : 'Unit', isAr ? '\u0633\u0639\u0631 \u0627\u0644\u0648\u062d\u062f\u0629' : 'Unit Cost', isAr ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'Total', isAr ? '\u0645\u0633\u062a\u0644\u0645' : 'Received'].map((h) => (
                          <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((it, idx) => (
                        <tr key={it.item_id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm font-mono">{it.item_code || '\u2014'}</td>
                          <td className="px-4 py-3 text-sm">{isAr ? it.item_name_ar || it.item_name : it.item_name}</td>
                          <td className="px-4 py-3 text-sm text-right">{Number(it.quantity).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">{it.unit_code || '\u2014'}</td>
                          <td className="px-4 py-3 text-sm text-right">{it.unit_cost != null ? Number(it.unit_cost).toLocaleString() : '\u2014'}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{it.total_cost != null ? Number(it.total_cost).toLocaleString() : '\u2014'}</td>
                          <td className="px-4 py-3 text-sm text-right">{it.received_quantity ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-right">{isAr ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'Total'}</td>
                        <td className="px-4 py-3 text-sm font-bold text-right">{items.reduce((s, i) => s + Number(i.total_cost || 0), 0).toLocaleString()} {currency}</td>
                        <td className="px-4 py-3 text-sm text-right">{items.reduce((s, i) => s + Number(i.received_quantity || 0), 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {/*  EXPENSES TAB  */}
            {activeTab === 'expenses' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{isAr ? '\u062a\u0641\u0635\u064a\u0644 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u0646\u0648\u0639' : 'Expenses by Type'}</h3>
                  <Link href="/shipments/cost-types" className="text-sm text-blue-600 hover:underline">{isAr ? '\u0625\u062f\u0627\u0631\u0629 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641' : 'Manage Cost Types \u2192'}</Link>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                  {expenses.length === 0 ? <EmptyState message={isAr ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0635\u0631\u0648\u0641\u0627\u062a' : 'No expenses recorded'} /> : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          {[isAr ? '\u0627\u0644\u0641\u0626\u0629' : 'Category', isAr ? '\u0627\u0644\u0646\u0648\u0639' : 'Type', isAr ? '\u0627\u0644\u0639\u062f\u062f' : 'Count', isAr ? '\u0642\u0628\u0644 \u0627\u0644\u0636\u0631\u064a\u0628\u0629' : 'Before VAT', isAr ? '\u0627\u0644\u0636\u0631\u064a\u0628\u0629' : 'VAT', isAr ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'Total', isAr ? '\u0628\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629' : 'Base Currency'].map((h) => (
                            <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {expenses.map((e, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-sm"><span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 capitalize">{e.category}</span></td>
                            <td className="px-4 py-3 text-sm">{isAr ? e.expense_type_name_ar || e.expense_type_name : e.expense_type_name}</td>
                            <td className="px-4 py-3 text-sm text-center">{e.count}</td>
                            <td className="px-4 py-3 text-sm text-right">{Number(e.total_before_vat).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">{Number(e.total_vat).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{Number(e.total_amount).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right">{Number(e.total_base_currency).toLocaleString()} SAR</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-right">{isAr ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'Total'}</td>
                          <td className="px-4 py-3 text-sm font-bold text-right">{expenses.reduce((s, e) => s + Number(e.total_before_vat), 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-bold text-right text-red-600">{expenses.reduce((s, e) => s + Number(e.total_vat), 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-bold text-right">{totalExpenses.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-bold text-right">{expenses.reduce((s, e) => s + Number(e.total_base_currency), 0).toLocaleString()} SAR</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <Link href="/shipments/landed-cost-allocation" className="text-sm text-blue-600 hover:underline">{isAr ? '\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0635\u0646\u0627\u0641' : 'View Cost Allocations \u2192'}</Link>
                  <Link href="/shipments/landed-cost-settings" className="text-sm text-blue-600 hover:underline">{isAr ? '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a' : 'Account Settings \u2192'}</Link>
                </div>
              </div>
            )}

            {/*  CONTAINERS TAB  */}
            {activeTab === 'containers' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                {containers.length === 0 ? <EmptyState message={isAr ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u0627\u0648\u064a\u0627\u062a' : 'No containers found'} /> : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {[isAr ? '\u0631\u0642\u0645 \u0627\u0644\u062d\u0627\u0648\u064a\u0629' : 'Container #', isAr ? '\u0627\u0644\u0646\u0648\u0639' : 'Type', isAr ? '\u0631\u0642\u0645 \u0627\u0644\u062e\u062a\u0645' : 'Seal #', isAr ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status', isAr ? '\u0627\u0644\u0648\u0632\u0646' : 'Weight (kg)', isAr ? '\u0627\u0644\u062d\u062c\u0645' : 'Volume (CBM)', isAr ? '\u0627\u0644\u0637\u0631\u0648\u062f' : 'Packages', isAr ? '\u0627\u0644\u0645\u0648\u0642\u0639' : 'Location'].map((h) => (
                          <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {containers.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm font-mono font-medium">{c.container_number}</td>
                          <td className="px-4 py-3 text-sm">{c.container_type_name || '\u2014'} {c.size_feet ? `(${c.size_feet}ft)` : ''}</td>
                          <td className="px-4 py-3 text-sm">{c.seal_number || '\u2014'}</td>
                          <td className="px-4 py-3 text-sm"><Badge text={c.status} colors={CONTAINER_COLORS} /></td>
                          <td className="px-4 py-3 text-sm text-right">{c.gross_weight_kg ? Number(c.gross_weight_kg).toLocaleString() : '\u2014'}</td>
                          <td className="px-4 py-3 text-sm text-right">{c.volume_cbm ? Number(c.volume_cbm).toLocaleString() : '\u2014'}</td>
                          <td className="px-4 py-3 text-sm text-center">{c.packages_count ?? '\u2014'}</td>
                          <td className="px-4 py-3 text-sm">{c.location || '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-right">{isAr ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'Total'}</td>
                        <td className="px-4 py-3 text-sm font-bold text-right">{containers.reduce((s, c) => s + Number(c.gross_weight_kg || 0), 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-bold text-right">{containers.reduce((s, c) => s + Number(c.volume_cbm || 0), 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-bold text-center">{containers.reduce((s, c) => s + Number(c.packages_count || 0), 0)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {/*  PARTIES TAB  */}
            {activeTab === 'parties' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                {parties.length === 0 ? <EmptyState message={isAr ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0637\u0631\u0627\u0641' : 'No parties found'} /> : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {[isAr ? '\u0627\u0644\u0646\u0648\u0639' : 'Role', isAr ? '\u0627\u0644\u0627\u0633\u0645' : 'Name', isAr ? '\u0634\u062e\u0635 \u0627\u0644\u0627\u062a\u0635\u0627\u0644' : 'Contact', isAr ? '\u0627\u0644\u0647\u0627\u062a\u0641' : 'Phone', isAr ? '\u0627\u0644\u0628\u0631\u064a\u062f' : 'Email', isAr ? '\u0627\u0644\u062f\u0648\u0644\u0629' : 'Country', isAr ? '\u0623\u0633\u0627\u0633\u064a' : 'Primary'].map((h) => (
                          <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {parties.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm"><Badge text={p.party_type} colors={PARTY_COLORS} /></td>
                          <td className="px-4 py-3 text-sm font-medium">{isAr ? p.party_name_ar || p.party_name : p.party_name}</td>
                          <td className="px-4 py-3 text-sm">{p.contact_person || '\u2014'}</td>
                          <td className="px-4 py-3 text-sm">{p.phone || '\u2014'}</td>
                          <td className="px-4 py-3 text-sm">{p.email || '\u2014'}</td>
                          <td className="px-4 py-3 text-sm">{p.country_name || '\u2014'}</td>
                          <td className="px-4 py-3 text-sm text-center">{p.is_primary ? '\u2705' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/*  DOCUMENTS & COMPLIANCE TAB  */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{isAr ? '\u0641\u062d\u0648\u0635\u0627\u062a \u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644' : 'Compliance Checks'}</h3>
                  <Link href="/shipments/document-requirements" className="text-sm text-blue-600 hover:underline">{isAr ? '\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a' : 'Document Requirements \u2192'}</Link>
                </div>
                {/* Summary cards */}
                {compliance.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['passed','pending','in_progress','failed'] as const).map(s => {
                      const count = compliance.filter(c => c.status === s).length;
                      return (
                        <div key={s} className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                          <Badge text={s} colors={COMPLIANCE_COLORS} />
                          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{count}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                  {compliance.length === 0 ? <EmptyState message={isAr ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0641\u062d\u0648\u0635\u0627\u062a' : 'No compliance checks'} /> : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          {[isAr ? '\u0627\u0644\u0646\u0648\u0639' : 'Type', isAr ? '\u0627\u0644\u0645\u062a\u0637\u0644\u0628' : 'Requirement', isAr ? '\u0627\u0644\u062c\u0647\u0629' : 'Authority', isAr ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status', isAr ? '\u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629' : 'Priority', isAr ? '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u062d\u0642\u0627\u0642' : 'Due Date', isAr ? '\u0627\u0644\u062a\u0643\u0644\u0641\u0629' : 'Cost'].map((h) => (
                            <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {compliance.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-sm capitalize">{c.requirement_type?.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 text-sm font-medium">{isAr ? c.requirement_name_ar || c.requirement_name : c.requirement_name}{c.is_mandatory && <span className="text-red-500 ml-1">*</span>}</td>
                            <td className="px-4 py-3 text-sm">{c.authority || '\u2014'}</td>
                            <td className="px-4 py-3 text-sm"><Badge text={c.status} colors={COMPLIANCE_COLORS} /></td>
                            <td className="px-4 py-3 text-sm capitalize">{c.priority || '\u2014'}</td>
                            <td className="px-4 py-3 text-sm">{c.due_date ? new Date(c.due_date).toLocaleDateString() : '\u2014'}</td>
                            <td className="px-4 py-3 text-sm text-right">{c.cost ? `${Number(c.cost).toLocaleString()} ${c.currency_code || ''}` : '\u2014'}</td>
                          </tr>
                        ))}
                      </tbody>
                      {compliance.some(c => c.cost) && (
                        <tfoot className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-right">{isAr ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641' : 'Total Cost'}</td>
                            <td className="px-4 py-3 text-sm font-bold text-right">{compliance.reduce((s, c) => s + Number(c.cost || 0), 0).toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState message={isAr ? '\u0627\u0644\u0634\u062d\u0646\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629' : 'Shipment not found'} />
        )}
      </div>
    </MainLayout>
  );
}