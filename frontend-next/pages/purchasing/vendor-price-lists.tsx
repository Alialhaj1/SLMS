import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  TagIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type VendorPriceListStatus = 'active' | 'inactive' | 'archived';
type VendorPriceListType = 'standard' | 'contract' | 'seasonal';

interface VendorPriceList {
  id: number;
  code: string;
  vendor_id: number;
  vendor: string;
  vendorAr: string;
  name: string;
  nameAr: string;
  type: VendorPriceListType;
  status: VendorPriceListStatus;
  currency_id?: number;
  currency: 'SAR' | 'USD' | 'EUR';
  validFrom: string;
  validTo: string | null;
  items: number;
  avgDiscountPct: number;
  price_tiers?: PriceTier[];
}

interface PriceTier {
  id?: number;
  min_quantity: number;
  max_quantity?: number;
  unit_price: number;
  discount_percent: number;
}

interface VendorPriceListItem {
  id?: number;
  item_id: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  uom_code: string;
  base_price: number;
  discount_percent: number;
  final_price: number;
  effective_from: string;
  effective_to?: string;
  min_order_qty?: number;
  price_tiers?: PriceTier[];
}

const mockVendorPriceLists: VendorPriceList[] = [
  { id: 1, code: 'VPL-001', vendor_id: 1, vendor: 'Gulf Supplies', vendorAr: 'إمدادات الخليج', name: 'General Supplies', nameAr: 'توريدات عامة', type: 'standard', status: 'active', currency: 'SAR', validFrom: '2025-01-01', validTo: null, items: 88, avgDiscountPct: 6 },
  { id: 2, code: 'VPL-014', vendor_id: 2, vendor: 'Blue Freight Co.', vendorAr: 'شركة الشحن الأزرق', name: 'Transport Contract Rates', nameAr: 'أسعار عقد النقل', type: 'contract', status: 'active', currency: 'SAR', validFrom: '2025-06-01', validTo: '2025-12-31', items: 24, avgDiscountPct: 10 },
  { id: 3, code: 'VPL-Q4', vendor_id: 3, vendor: 'Warehouse Partners', vendorAr: 'شركاء المستودعات', name: 'Q4 Seasonal Pricing', nameAr: 'تسعير موسمي Q4', type: 'seasonal', status: 'inactive', currency: 'SAR', validFrom: '2025-10-01', validTo: '2025-12-31', items: 15, avgDiscountPct: 8 },
  { id: 4, code: 'VPL-USD-02', vendor_id: 4, vendor: 'International Parts', vendorAr: 'قطع دولية', name: 'USD Spare Parts', nameAr: 'قطع غيار بالدولار', type: 'standard', status: 'active', currency: 'USD', validFrom: '2025-03-01', validTo: null, items: 30, avgDiscountPct: 4 },
  { id: 5, code: 'VPL-ARC-03', vendor_id: 5, vendor: 'Legacy Vendor', vendorAr: 'مورد قديم', name: 'Legacy Pricing', nameAr: 'تسعير قديم', type: 'standard', status: 'archived', currency: 'SAR', validFrom: '2023-01-01', validTo: '2024-12-31', items: 60, avgDiscountPct: 3 },
];

export default function VendorPriceListsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [lists] = useState<VendorPriceList[]>(mockVendorPriceLists);
  const [selectedStatus, setSelectedStatus] = useState<'all' | VendorPriceListStatus>('all');
  const [selectedType, setSelectedType] = useState<'all' | VendorPriceListType>('all');
  const [selected, setSelected] = useState<VendorPriceList | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    vendor: '',
    vendorAr: '',
    name: '',
    nameAr: '',
    type: 'standard' as VendorPriceListType,
    status: 'active' as VendorPriceListStatus,
    currency: 'SAR' as VendorPriceList['currency'],
    validFrom: '',
    validTo: '',
    items: '0',
    avgDiscountPct: '0',
  });

  const filtered = useMemo(() => {
    return lists.filter(l => {
      const sOk = selectedStatus === 'all' || l.status === selectedStatus;
      const tOk = selectedType === 'all' || l.type === selectedType;
      return sOk && tOk;
    });
  }, [lists, selectedStatus, selectedType]);

  const getStatusBadge = (status: VendorPriceListStatus) => {
    const styles: Record<VendorPriceListStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<VendorPriceListStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشطة' },
      inactive: { en: 'Inactive', ar: 'غير نشطة' },
      archived: { en: 'Archived', ar: 'مؤرشفة' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const getTypeBadge = (type: VendorPriceListType) => {
    const styles: Record<VendorPriceListType, string> = {
      standard: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      contract: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      seasonal: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    };
    const labels: Record<VendorPriceListType, { en: string; ar: string }> = {
      standard: { en: 'Standard', ar: 'قياسية' },
      contract: { en: 'Contract', ar: 'عقد' },
      seasonal: { en: 'Seasonal', ar: 'موسمية' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[type])}>
        {locale === 'ar' ? labels[type].ar : labels[type].en}
      </span>
    );
  };

  const activeCount = lists.filter(l => l.status === 'active').length;
  const vendorCount = new Set(lists.map(l => l.vendor)).size;
  const totalItems = filtered.reduce((sum, l) => sum + l.items, 0);
  const avgDiscount = filtered.length ? Math.round(filtered.reduce((sum, l) => sum + l.avgDiscountPct, 0) / filtered.length) : 0;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الحفظ (تجريبي)' : 'Saved (demo)', 'success');
    setCreateOpen(false);
    setFormData({
      code: '',
      vendor: '',
      vendorAr: '',
      name: '',
      nameAr: '',
      type: 'standard',
      status: 'active',
      currency: 'SAR',
      validFrom: '',
      validTo: '',
      items: '0',
      avgDiscountPct: '0',
    });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'قوائم أسعار الموردين - SLMS' : 'Vendor Price Lists - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'قوائم أسعار الموردين' : 'Vendor Price Lists'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة التسعير حسب المورد والفترة والعقود' : 'Manage pricing by vendor, period, and contracts'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'قائمة جديدة' : 'New List'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'النشطة' : 'Active'}</p>
                <p className="text-xl font-semibold text-green-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><TagIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'القوائم' : 'Lists'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{filtered.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><ClipboardDocumentListIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الموردون' : 'Vendors'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{vendorCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط الخصم' : 'Avg Discount'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{avgDiscount}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="active">{locale === 'ar' ? 'نشطة' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشطة' : 'Inactive'}</option>
                <option value="archived">{locale === 'ar' ? 'مؤرشفة' : 'Archived'}</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
                <option value="standard">{locale === 'ar' ? 'قياسية' : 'Standard'}</option>
                <option value="contract">{locale === 'ar' ? 'عقد' : 'Contract'}</option>
                <option value="seasonal">{locale === 'ar' ? 'موسمية' : 'Seasonal'}</option>
              </select>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? `إجمالي البنود: ${totalItems}` : `Total items: ${totalItems}`}
            </div>

            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المورد' : 'Vendor'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفترة' : 'Validity'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'بنود' : 'Items'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'خصم' : 'Discount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? l.vendorAr : l.vendor}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{locale === 'ar' ? l.nameAr : l.name}</p>
                      <p className="text-xs text-gray-500">{l.currency}</p>
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(l.type)}</td>
                    <td className="px-4 py-3 text-gray-500">{l.validFrom} → {l.validTo || (locale === 'ar' ? 'مفتوحة' : 'Open')}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{l.items}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{l.avgDiscountPct}%</td>
                    <td className="px-4 py-3">{getStatusBadge(l.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(l)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل (تجريبي)' : 'Edit (demo)', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل قائمة المورد' : 'Vendor Price List Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.vendorAr : selected.vendor} • {locale === 'ar' ? selected.nameAr : selected.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {getTypeBadge(selected.type)}
                {getStatusBadge(selected.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفترة' : 'Validity'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.validFrom} → {selected.validTo || (locale === 'ar' ? 'مفتوحة' : 'Open')}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'العملة' : 'Currency'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.currency}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'البنود' : 'Items'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.items}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'متوسط الخصم' : 'Avg Discount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.avgDiscountPct}%</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التفعيل (تجريبي)' : 'Activated (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تفعيل' : 'Activate'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإيقاف (تجريبي)' : 'Deactivated (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إيقاف' : 'Deactivate'}
              </Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'قائمة أسعار مورد جديدة' : 'New Vendor Price List'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="VPL-..." />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة' : 'Currency'}</label>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })} className="input">
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'المورد (EN)' : 'Vendor (EN)'} value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} />
            <Input label={locale === 'ar' ? 'المورد (AR)' : 'Vendor (AR)'} value={formData.vendorAr} onChange={(e) => setFormData({ ...formData, vendorAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} className="input">
                <option value="standard">{locale === 'ar' ? 'قياسية' : 'Standard'}</option>
                <option value="contract">{locale === 'ar' ? 'عقد' : 'Contract'}</option>
                <option value="seasonal">{locale === 'ar' ? 'موسمية' : 'Seasonal'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشطة' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشطة' : 'Inactive'}</option>
                <option value="archived">{locale === 'ar' ? 'مؤرشفة' : 'Archived'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'سارية من' : 'Valid From'} value={formData.validFrom} onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'سارية حتى' : 'Valid To'} value={formData.validTo} onChange={(e) => setFormData({ ...formData, validTo: e.target.value })} placeholder={locale === 'ar' ? 'فارغة = مفتوحة' : 'Blank = open'} />
            <Input label={locale === 'ar' ? 'عدد البنود' : 'Items'} value={formData.items} onChange={(e) => setFormData({ ...formData, items: e.target.value })} inputMode="numeric" />
            <Input label={locale === 'ar' ? 'متوسط الخصم %' : 'Avg Discount %'} value={formData.avgDiscountPct} onChange={(e) => setFormData({ ...formData, avgDiscountPct: e.target.value })} inputMode="numeric" />
          </div>

          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
