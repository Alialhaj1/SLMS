import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import Button from '../../../components/ui/Button';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { useCompany } from '../../../hooks/useCompany';
import apiClient from '../../../lib/apiClient';
import { useLocale } from '../../../contexts/LocaleContext';
import {
  ArrowLeftIcon,
  PencilIcon,
  CubeIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

interface ItemDetails {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  barcode?: string;
  sku?: string;
  base_uom_name?: string;
  base_uom_name_ar?: string;
  group_name?: string;
  group_name_ar?: string;
  standard_cost?: number;
  base_selling_price?: number;
  track_inventory: boolean;
  is_active: boolean;
  is_blocked?: boolean;
  item_type_name?: string;
  item_type_name_ar?: string;
  default_vendor_name?: string;
  default_vendor_name_ar?: string;
  country_name?: string;
  country_name_ar?: string;
  harvest_schedule_id?: number;
  harvest_schedule_name?: string;
  harvest_schedule_name_ar?: string;
  harvest_season?: string;
  harvest_start_month?: number;
  harvest_end_month?: number;
  expected_harvest_date?: string;
  image_url?: string;
  shelf_life_days?: number;
  min_order_qty?: number;
  manufacturer?: string;
  warranty_months?: number;
  reorder_point?: number;
  reorder_qty?: number;
  min_qty?: number;
  max_qty?: number;
  created_at: string;
  updated_at: string;
}

interface StockSummary {
  total_stock: number;
  movement_count: number;
  by_warehouse: Array<{ warehouse_id: number; warehouse_name: string; stock_qty: number }>;
}

interface StockMovement {
  id: number;
  base_qty: number;
  reference_type: string;
  reference_no: string;
  warehouse_name: string;
  created_at: string;
  created_by_name: string;
}

type TabKey = 'basic' | 'stock' | 'movements' | 'pricing' | 'harvest';

function ItemProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const { activeCompanyId, loading: companyLoading } = useCompany();

  const [item, setItem] = useState<ItemDetails | null>(null);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && activeCompanyId && !companyLoading) fetchItem();
  }, [id, activeCompanyId, companyLoading]);

  useEffect(() => {
    if (item && activeTab === 'stock') fetchStockSummary();
    if (item && activeTab === 'movements') fetchMovements();
  }, [item, activeTab]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/master/items/${id}`);
      if (res.success) setItem(res.data);
      else { setError(res.error?.message || 'Failed'); showToast('Failed to load item', 'error'); }
    } catch { setError('Failed'); showToast('Failed to load item', 'error'); }
    finally { setLoading(false); }
  };

  const fetchStockSummary = async () => {
    if (!item) return;
    try {
      const res = await apiClient.get(`/api/inventory/stock-movements/summary/${item.id}`);
      if (res.success) setStockSummary(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchMovements = async () => {
    if (!item) return;
    setLoadingMovements(true);
    try {
      const res = await apiClient.get(`/api/inventory/stock-movements/item/${item.id}?limit=50`);
      if (res.success) setMovements(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingMovements(false); }
  };

  const getLocalizedName = (en?: string, ar?: string) => (locale === 'ar' && ar) ? ar : (en || ar || '—');
  const formatNumber = (n?: number) => n != null ? n.toLocaleString() : '—';
  const formatCurrency = (n?: number) => n != null ? n.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—';
  const formatDateTime = (d?: string) => d ? new Date(d).toLocaleString() : '—';
  const getMonthName = (m?: number) => {
    if (!m || m < 1 || m > 12) return '—';
    const months = locale === 'ar' ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'] : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[m - 1];
  };
  const getReferenceTypeLabel = (t: string) => {
    const map: Record<string, { label: string; color: string }> = {
      PURCHASE: { label: locale === 'ar' ? 'شراء' : 'Purchase', color: 'bg-green-100 text-green-800' },
      SALE: { label: locale === 'ar' ? 'بيع' : 'Sale', color: 'bg-blue-100 text-blue-800' },
      TRANSFER_IN: { label: locale === 'ar' ? 'وارد' : 'In', color: 'bg-cyan-100 text-cyan-800' },
      TRANSFER_OUT: { label: locale === 'ar' ? 'صادر' : 'Out', color: 'bg-pink-100 text-pink-800' },
      ADJUSTMENT_IN: { label: '+', color: 'bg-lime-100 text-lime-800' },
      ADJUSTMENT_OUT: { label: '-', color: 'bg-red-100 text-red-800' },
      WASTAGE: { label: locale === 'ar' ? 'تالف' : 'Waste', color: 'bg-red-100 text-red-800' },
    };
    return map[t] || { label: t, color: 'bg-gray-100 text-gray-800' };
  };

  const tabs: Array<{ key: TabKey; label: string; icon: typeof CubeIcon }> = [
    { key: 'basic', label: locale === 'ar' ? 'أساسية' : 'Basic', icon: DocumentTextIcon },
    { key: 'stock', label: locale === 'ar' ? 'المخزون' : 'Stock', icon: BuildingStorefrontIcon },
    { key: 'movements', label: locale === 'ar' ? 'الحركات' : 'Moves', icon: ArrowsRightLeftIcon },
    { key: 'pricing', label: locale === 'ar' ? 'الأسعار' : 'Pricing', icon: ChartBarIcon },
    { key: 'harvest', label: locale === 'ar' ? 'الزراعة' : 'Harvest', icon: CalendarDaysIcon },
  ];

  if (loading) return <MainLayout><Head><title>Loading...</title></Head><div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div></MainLayout>;
  if (error || !item) return <MainLayout><Head><title>Error</title></Head><div className="text-center py-12"><p className="text-red-600 mb-4">{error}</p><Link href="/master/items"><Button variant="secondary"><ArrowLeftIcon className="h-5 w-5 mr-2" />Back</Button></Link></div></MainLayout>;

  return (
    <MainLayout>
      <Head><title>{getLocalizedName(item.name, item.name_ar)} - SLMS</title></Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
              {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : <CubeIcon className="h-10 w-10 text-gray-400" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getLocalizedName(item.name, item.name_ar)}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">{item.code}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_blocked ? 'bg-red-100 text-red-800' : item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {item.is_blocked ? 'Blocked' : item.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/master/items"><Button variant="secondary"><ArrowLeftIcon className="h-4 w-4 mr-2" />Back</Button></Link>
            <Link href={`/master/items?edit=${item.id}`}><Button variant="primary"><PencilIcon className="h-4 w-4 mr-2" />Edit</Button></Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm"><ShoppingCartIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'شراء' : 'Purchase'}</Button>
          <Button variant="secondary" size="sm"><ArrowsRightLeftIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'تحويل' : 'Transfer'}</Button>
          <Button variant="secondary" size="sm"><ClipboardDocumentListIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'تسوية' : 'Adjust'}</Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="h-5 w-5" />{tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="pb-8">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">{locale === 'ar' ? 'معلومات أساسية' : 'Basic Info'}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Code</dt><dd className="font-medium">{item.code}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{getLocalizedName(item.name, item.name_ar)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Type</dt><dd className="font-medium">{getLocalizedName(item.item_type_name, item.item_type_name_ar)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Group</dt><dd className="font-medium">{getLocalizedName(item.group_name, item.group_name_ar)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Unit</dt><dd className="font-medium">{getLocalizedName(item.base_uom_name, item.base_uom_name_ar)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Barcode</dt><dd className="font-medium">{item.barcode || '—'}</dd></div>
                </dl>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">{locale === 'ar' ? 'المورد والمنشأ' : 'Supplier & Origin'}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Vendor</dt><dd className="font-medium">{getLocalizedName(item.default_vendor_name, item.default_vendor_name_ar)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Country</dt><dd className="font-medium">{getLocalizedName(item.country_name, item.country_name_ar)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Manufacturer</dt><dd className="font-medium">{item.manufacturer || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Warranty</dt><dd className="font-medium">{item.warranty_months ? `${item.warranty_months} mo` : '—'}</dd></div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4"><div className="text-sm text-gray-500 mb-1">Total Stock</div><div className="text-2xl font-bold">{formatNumber(stockSummary?.total_stock || 0)}</div></div>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4"><div className="text-sm text-gray-500 mb-1">Reorder Point</div><div className="text-2xl font-bold text-yellow-600">{formatNumber(item.reorder_point || item.min_qty)}</div></div>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4"><div className="text-sm text-gray-500 mb-1">Max Level</div><div className="text-2xl font-bold text-blue-600">{formatNumber(item.max_qty)}</div></div>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4"><div className="text-sm text-gray-500 mb-1">Movements</div><div className="text-2xl font-bold text-purple-600">{formatNumber(stockSummary?.movement_count)}</div></div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
                <div className="p-4 border-b"><h3 className="font-semibold">Stock by Warehouse</h3></div>
                <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50 dark:bg-slate-700"><tr><th className="px-4 py-3 text-left text-xs uppercase">Warehouse</th><th className="px-4 py-3 text-right text-xs uppercase">Qty</th></tr></thead>
                  <tbody>{stockSummary?.by_warehouse.length ? stockSummary.by_warehouse.map(w => <tr key={w.warehouse_id}><td className="px-4 py-3">{w.warehouse_name}</td><td className="px-4 py-3 text-right font-medium">{formatNumber(w.stock_qty)}</td></tr>) : <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500">No stock</td></tr>}</tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'movements' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center"><h3 className="font-semibold">Last 50 Movements</h3><Button variant="secondary" size="sm" onClick={fetchMovements}><ArrowPathIcon className={`h-4 w-4 ${loadingMovements ? 'animate-spin' : ''}`} /></Button></div>
              <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50 dark:bg-slate-700"><tr><th className="px-4 py-3 text-left text-xs uppercase">Date</th><th className="px-4 py-3 text-left text-xs uppercase">Type</th><th className="px-4 py-3 text-left text-xs uppercase">Ref</th><th className="px-4 py-3 text-left text-xs uppercase">Warehouse</th><th className="px-4 py-3 text-right text-xs uppercase">Qty</th></tr></thead>
                <tbody>{movements.length ? movements.map(m => { const lbl = getReferenceTypeLabel(m.reference_type); return <tr key={m.id}><td className="px-4 py-3 text-sm">{formatDateTime(m.created_at)}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${lbl.color}`}>{lbl.label}</span></td><td className="px-4 py-3 text-sm">{m.reference_no || '—'}</td><td className="px-4 py-3 text-sm">{m.warehouse_name}</td><td className={`px-4 py-3 text-sm text-right font-medium ${m.base_qty > 0 ? 'text-green-600' : 'text-red-600'}`}>{m.base_qty > 0 ? '+' : ''}{formatNumber(m.base_qty)}</td></tr>; }) : <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No movements</td></tr>}</tbody>
              </table>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Pricing</h3>
                <dl className="space-y-4">
                  <div className="flex justify-between py-2 border-b"><dt className="text-gray-500">Cost</dt><dd className="text-xl font-bold">{formatCurrency(item.standard_cost)}</dd></div>
                  <div className="flex justify-between py-2 border-b"><dt className="text-gray-500">Selling</dt><dd className="text-xl font-bold text-blue-600">{formatCurrency(item.base_selling_price)}</dd></div>
                  {item.standard_cost && item.base_selling_price && <div className="flex justify-between py-2"><dt className="text-gray-500">Margin</dt><dd className="text-xl font-bold text-green-600">{((item.base_selling_price - item.standard_cost) / item.base_selling_price * 100).toFixed(1)}%</dd></div>}
                </dl>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Order Settings</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Min Order</dt><dd className="font-medium">{formatNumber(item.min_order_qty)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Reorder Qty</dt><dd className="font-medium">{formatNumber(item.reorder_qty)}</dd></div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'harvest' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center"><CalendarDaysIcon className="h-5 w-5 mr-2 text-green-600" />Harvest Info</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Schedule</dt><dd className="font-medium">{getLocalizedName(item.harvest_schedule_name, item.harvest_schedule_name_ar)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Season</dt><dd className="font-medium">{item.harvest_season || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Start</dt><dd className="font-medium">{getMonthName(item.harvest_start_month)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">End</dt><dd className="font-medium">{getMonthName(item.harvest_end_month)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Shelf Life</dt><dd className="font-medium">{item.shelf_life_days ? `${item.shelf_life_days}d` : '—'}</dd></div>
                </dl>
              </div>
              {!item.harvest_schedule_id && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-6 flex items-center">
                  <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mr-4" />
                  <div><h4 className="font-semibold text-yellow-800">No Harvest Schedule</h4><p className="text-sm text-yellow-700 mt-1">Not linked to a harvest schedule.</p></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.Items?.View || 'master:items:view', ItemProfilePage);
