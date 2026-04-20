import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import {
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  TruckIcon,
  CreditCardIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentDuplicateIcon,
  PrinterIcon,
  ChevronRightIcon,
  HomeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShoppingCartIcon,
  CalendarDaysIcon,
  MapPinIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

import Tabs, { Tab } from '../../ui/Tabs';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import SearchableSelect, { SelectOption } from '../../ui/SearchableSelect';
import LineItemsTable from '../LineItemsTable';
import CurrencySelector from '../../shared/CurrencySelector';
import ExchangeRateField from '../../ui/ExchangeRateField';

import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../hooks/useAuth';
import { companyStore } from '../../../lib/companyStore';

import { usePurchaseOrderForm } from './usePurchaseOrderForm';

type Locale = 'en' | 'ar';

type TabKey = 'general' | 'items' | 'shipping' | 'payment' | 'bank' | 'history';

function toSelectOptions(
  rows: Array<{ id: number; code?: string; name: string; name_ar?: string }>,
  locale: Locale
): SelectOption[] {
  return (rows || []).map((r) => ({
    value: r.id,
    code: r.code,
    label: r.name,
    labelAr: r.name_ar,
    searchText: r.code,
  }));
}

// ============================================
// Import Vendor Bank Button (for PO bank tab)
// ============================================
function ImportVendorBankButton({
  vendorId,
  isArabic,
  onImport,
}: {
  vendorId: string;
  isArabic: boolean;
  onImport: (data: {
    beneficiary_name?: string;
    beneficiary_address?: string;
    bank_name?: string;
    branch_name?: string;
    bank_address?: string;
    account_no?: string;
    iban?: string;
    swift?: string;
  }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const handleImport = async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/procurement/vendors/${vendorId}/bank-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const accs = data.data || [];
      if (accs.length === 0) {
        return; // No accounts
      }
      if (accs.length === 1) {
        applyAccount(accs[0]);
      } else {
        setAccounts(accs);
        setShowPicker(true);
      }
    } catch {} finally { setLoading(false); }
  };

  const applyAccount = (acc: any) => {
    onImport({
      beneficiary_name: acc.account_name || '',
      beneficiary_address: acc.beneficiary_address || '',
      bank_name: acc.bank_name || acc.bank_name_lookup || '',
      branch_name: acc.branch_name || '',
      bank_address: acc.branch_address || '',
      account_no: acc.account_number || '',
      iban: acc.iban || '',
      swift: acc.swift_code || acc.bank_swift_code || '',
    });
    setShowPicker(false);
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={handleImport} loading={loading}>
        <ArrowRightIcon className="h-4 w-4 mr-1 rtl:rotate-180" />
        {isArabic ? 'استيراد من المورد' : 'Import from Vendor'}
      </Button>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-5">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              {isArabic ? 'اختر الحساب البنكي' : 'Select Bank Account'}
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {accounts.map((acc, idx) => (
                <button
                  key={acc.id || idx}
                  onClick={() => applyAccount(acc)}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      {acc.bank_name || acc.bank_name_lookup || (isArabic ? 'بنك' : 'Bank')}
                    </span>
                    {acc.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {isArabic ? 'افتراضي' : 'Default'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {acc.account_name} • {acc.iban || acc.account_number}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setShowPicker(false)}>
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ProfessionalPurchaseOrderForm(props: {
  orderId?: number;
  mode: 'create' | 'edit' | 'view';
}) {
  const { orderId, mode } = props;
  const router = useRouter();
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const readOnly = mode === 'view';

  const activeLocale = (locale === 'ar' ? 'ar' : 'en') as Locale;

  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('');

  const {
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
  } = usePurchaseOrderForm({ locale: activeLocale, orderId });

  const tabIcons: Record<TabKey, React.ReactNode> = {
    general: <ClipboardDocumentListIcon className="h-4 w-4" />,
    items: <CubeIcon className="h-4 w-4" />,
    shipping: <TruckIcon className="h-4 w-4" />,
    payment: <CreditCardIcon className="h-4 w-4" />,
    bank: <BanknotesIcon className="h-4 w-4" />,
    history: <ClockIcon className="h-4 w-4" />,
  };

  const tabs: Tab[] = useMemo(
    () => [
      { id: 'general', label: 'General', label_ar: 'عام', icon: tabIcons.general },
      { id: 'items', label: 'Items', label_ar: 'البنود', icon: tabIcons.items, badge: items.length || undefined, badgeColor: items.length ? 'primary' : undefined },
      { id: 'shipping', label: 'Shipping', label_ar: 'الشحن', icon: tabIcons.shipping },
      { id: 'payment', label: 'Payment', label_ar: 'الدفع', icon: tabIcons.payment },
      { id: 'bank', label: 'Bank', label_ar: 'البنك', icon: tabIcons.bank },
      { id: 'history', label: 'History', label_ar: 'السجل', icon: tabIcons.history, disabled: mode === 'create' },
    ],
    [items.length, mode]
  );

  // Track which tabs have data filled
  const tabCompletion = useMemo(() => {
    const general = !!(form.vendor_id && form.order_date);
    const itemsTab = items.length > 0;
    const shipping = !!(form.origin_country_id || form.destination_country_id);
    const payment = !!(form.payment_terms_id || form.payment_method_id);
    const bank = !!(form.meta?.bank?.beneficiary_name || form.meta?.bank?.bank_name);
    return { general, items: itemsTab, shipping, payment, bank, history: false };
  }, [form, items.length]);

  const completedSteps = Object.values(tabCompletion).filter(Boolean).length;
  const totalSteps = 5; // exclude history

  const vendorOptions = useMemo(
    () =>
      (vendors || [])
        .filter((v) => v.status_code !== 'SUSPENDED')
        .filter((v) => v.allows_purchase_orders !== false)
        .map((v) => ({
          value: v.id,
          code: v.code,
          label: v.name,
          labelAr: v.name_ar,
          searchText: [v.code, v.name, v.name_ar].filter(Boolean).join(' '),
        })),
    [vendors]
  );

  const itemOpts = useMemo(
    () =>
      (itemOptions || []).map((it) => ({
        id: it.id,
        code: it.code,
        name: it.name,
        name_ar: it.name_ar,
        base_uom_id: it.base_uom_id,
        base_uom_code: it.base_uom_code,
        base_uom_name: it.base_uom_name || it.base_uom_name_ar,
        purchase_price: it.purchase_price,
        tax_rate_id: it.tax_rate_id,
        default_tax_rate: it.default_tax_rate,
        uoms: it.uoms,
      })),
    [itemOptions]
  );

  const uomOpts = useMemo(
    () =>
      (uomOptions || []).map((u) => ({
        id: u.id,
        code: u.code,
        name: activeLocale === 'ar' ? u.name_ar || u.name : u.name,
      })),
    [uomOptions, activeLocale]
  );

  const taxRateOpts = useMemo(
    () =>
      (taxOptions || []).map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        rate: t.rate,
      })),
    [taxOptions]
  );

  const countryOptions = useMemo(
    () =>
      (countries || []).map((c: any) => ({
        value: c.id,
        code: c.iso_code,
        label: c.name,
        labelAr: c.name_ar,
        searchText: [c.iso_code, c.name, c.name_ar].filter(Boolean).join(' '),
      })),
    [countries]
  );

  // Filter projects by selected vendor (show master/sub projects linked to vendor)
  const filteredProjects = useMemo(() => {
    if (!form.vendor_id) return projects; // Show all if no vendor selected
    const vendorId = parseInt(form.vendor_id, 10);
    return (projects || []).filter((p: any) => {
      // Show projects that are directly linked to this vendor
      // or are sub-projects under a master project linked to this vendor
      return p.vendor_id === vendorId;
    });
  }, [projects, form.vendor_id]);

  const originCities = useMemo(
    () => (cities || []).filter((c: any) => String(c.country_id) === String(form.origin_country_id)),
    [cities, form.origin_country_id]
  );

  const destinationCities = useMemo(
    () => (cities || []).filter((c: any) => String(c.country_id) === String(form.destination_country_id || '1')),
    [cities, form.destination_country_id]
  );

  const originCityOptions = useMemo(
    () =>
      originCities.map((c: any) => ({
        value: c.id,
        label: c.name,
        labelAr: c.name_ar,
        searchText: [c.name, c.name_ar].filter(Boolean).join(' '),
      })),
    [originCities]
  );

  const destinationCityOptions = useMemo(
    () =>
      destinationCities.map((c: any) => ({
        value: c.id,
        label: c.name,
        labelAr: c.name_ar,
        searchText: [c.name, c.name_ar].filter(Boolean).join(' '),
      })),
    [destinationCities]
  );

  const portOptions = useMemo(
    () =>
      (ports || []).map((p: any) => ({
        value: p.id,
        label: p.name,
        labelAr: p.name_ar,
        searchText: [p.code, p.name, p.name_ar].filter(Boolean).join(' '),
      })),
    [ports]
  );

  const currencySymbol = useMemo(() => {
    const selected = currencies.find((c) => String(c.id) === String(form.currency_id));
    return (selected as any)?.symbol || selected?.code || 'SAR';
  }, [currencies, form.currency_id]);

  // Set selectedCurrencyCode when form.currency_id changes (for edit mode initial load)
  // This ensures ExchangeRateField gets the currency code when editing an existing order
  useEffect(() => {
    if (form.currency_id && currencies.length > 0) {
      const selected = currencies.find((c) => String(c.id) === String(form.currency_id));
      if (selected?.code && selected.code !== selectedCurrencyCode) {
        setSelectedCurrencyCode(selected.code);
      }
    }
  }, [form.currency_id, currencies]);

  const formatMoney = (value: number) => {
    const fmtLocale = activeLocale === 'ar' ? 'ar-SA' : 'en-US';
    return `${currencySymbol} ${Number(value || 0).toLocaleString(fmtLocale, { minimumFractionDigits: 2 })}`;
  };

  const canRender = !authLoading && isAuthenticated;

  const statusOptions = useMemo(
    () =>
      (orderStatuses || [])
        .map((s) => ({
          value: s.id,
          code: s.code,
          label: s.name,
          labelAr: s.name_ar,
          searchText: [s.code, s.name, s.name_ar].filter(Boolean).join(' '),
        })),
    [orderStatuses]
  );

  const handleSave = async () => {
    if (readOnly) {
      showToast(activeLocale === 'ar' ? 'وضع العرض فقط' : 'View-only mode', 'info');
      return;
    }
    const result = await save();
    if (!result.ok) {
      if (result.error === 'validation') {
        showToast(activeLocale === 'ar' ? 'يرجى تصحيح الأخطاء' : 'Please fix validation errors', 'error');
        return;
      }
      showToast(typeof result.error === 'string' ? result.error : 'Save failed', 'error');
      return;
    }

    showToast(activeLocale === 'ar' ? 'تم حفظ أمر الشراء' : 'Purchase order saved', 'success');

    // After create or edit, return to the Purchase Orders list
    router.push('/purchasing/orders');
  };

  return (
    <div className="space-y-6" dir={activeLocale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <button onClick={() => router.push('/')} className="hover:text-blue-600 transition-colors">
          <HomeIcon className="h-4 w-4" />
        </button>
        <ChevronRightIcon className={clsx('h-3 w-3', activeLocale === 'ar' && 'rotate-180')} />
        <button onClick={() => router.push('/purchasing/orders')} className="hover:text-blue-600 transition-colors">
          {activeLocale === 'ar' ? 'أوامر الشراء' : 'Purchase Orders'}
        </button>
        <ChevronRightIcon className={clsx('h-3 w-3', activeLocale === 'ar' && 'rotate-180')} />
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {mode === 'create'
            ? activeLocale === 'ar' ? 'إنشاء جديد' : 'Create New'
            : mode === 'view'
              ? activeLocale === 'ar' ? 'عرض' : 'View'
              : activeLocale === 'ar' ? 'تعديل' : 'Edit'}
        </span>
      </nav>

      {/* Professional Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 shadow-lg">
              <ShoppingCartIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {mode === 'create'
                  ? activeLocale === 'ar'
                    ? 'إنشاء أمر شراء جديد'
                    : 'Create Purchase Order'
                  : mode === 'view'
                    ? activeLocale === 'ar'
                      ? 'عرض أمر الشراء'
                      : 'View Purchase Order'
                    : activeLocale === 'ar'
                      ? 'تعديل أمر الشراء'
                      : 'Edit Purchase Order'}
              </h1>
              <p className="mt-1 text-sm text-blue-100">
                {activeLocale === 'ar'
                  ? 'نموذج احترافي متعدد الأقسام لإدارة أوامر الشراء'
                  : 'Professional multi-section purchase order management'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step progress indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 ring-1 ring-white/20">
              <div className="flex items-center gap-1">
                {(['general', 'items', 'shipping', 'payment', 'bank'] as TabKey[]).map((key) => (
                  <div
                    key={key}
                    className={clsx(
                      'h-2 w-2 rounded-full transition-all duration-300',
                      tabCompletion[key] ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-white/30'
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-blue-100 font-medium ml-2">
                {completedSteps}/{totalSteps}
              </span>
            </div>

            <button
              onClick={() => router.push('/purchasing/orders')}
              className="flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/20 hover:bg-white/20 transition-all"
            >
              {activeLocale === 'ar' ? <ArrowRightIcon className="h-4 w-4" /> : <ArrowLeftIcon className="h-4 w-4" />}
              {activeLocale === 'ar' ? 'رجوع' : 'Back'}
            </button>
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={saving || !canRender || loading}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-lg transition-all',
                  saving || !canRender || loading
                    ? 'bg-white/20 text-white/50 cursor-not-allowed'
                    : 'bg-white text-blue-700 hover:bg-blue-50 hover:shadow-xl active:scale-[0.98]'
                )}
              >
                {saving ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <CheckCircleIcon className="h-4 w-4" />
                )}
                {saving
                  ? activeLocale === 'ar' ? 'جاري الحفظ...' : 'Saving...'
                  : activeLocale === 'ar' ? 'حفظ أمر الشراء' : 'Save Order'}
              </button>
            )}
          </div>
        </div>
      </div>

      {!canRender ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="animate-spin h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {activeLocale === 'ar' ? 'جاري التحقق من تسجيل الدخول...' : 'Checking authentication...'}
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            {/* Skeleton tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
            {/* Skeleton form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
              {[1, 2, 3].map((row) => (
                <div key={row} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1">
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as TabKey)}
                locale={activeLocale}
                variant="pills"
                size="sm"
              />
            </div>

            {/* General */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* Section: Vendor & Contract */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 border-b border-slate-200 dark:border-slate-700">
                    <BuildingStorefrontIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'بيانات المورد والعقد' : 'Vendor & Contract Info'}
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'المورد' : 'Vendor'}
                        required
                        options={vendorOptions}
                        value={form.vendor_id}
                        onChange={(v) => setForm((p) => ({ 
                          ...p, 
                          vendor_id: v,
                          project_id: v !== p.vendor_id ? '' : p.project_id
                        }))}
                        placeholder={activeLocale === 'ar' ? 'اختر المورد' : 'Select vendor'}
                        searchPlaceholder={activeLocale === 'ar' ? 'بحث...' : 'Search...'}
                        locale={activeLocale}
                        disabled={readOnly}
                        error={errors.vendor_id}
                      />

                      <Input
                        label={activeLocale === 'ar' ? 'رقم عقد المورد' : 'Vendor Contract #'}
                        value={form.vendor_contract_number || ''}
                        onChange={(e) => setForm((p) => ({ ...p, vendor_contract_number: e.target.value }))}
                        placeholder={activeLocale === 'ar' ? 'اختياري' : 'Optional'}
                        disabled={readOnly}
                      />

                      <Input
                        label={activeLocale === 'ar' ? 'تاريخ عقد المورد' : 'Vendor Contract Date'}
                        type="date"
                        value={form.vendor_contract_date || ''}
                        onChange={(e) => setForm((p) => ({ ...p, vendor_contract_date: e.target.value }))}
                        disabled={readOnly}
                      />

                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'المشروع' : 'Project'}
                        options={toSelectOptions(filteredProjects, activeLocale)}
                        value={form.project_id}
                        onChange={(v) => setForm((p) => ({ ...p, project_id: v }))}
                        placeholder={
                          !form.vendor_id 
                            ? (activeLocale === 'ar' ? 'اختر المورد أولاً' : 'Select vendor first')
                            : filteredProjects.length === 0
                              ? (activeLocale === 'ar' ? 'لا توجد مشاريع لهذا المورد' : 'No projects for this vendor')
                              : (activeLocale === 'ar' ? 'اختر المشروع' : 'Select project')
                        }
                        locale={activeLocale}
                        disabled={readOnly || !form.vendor_id}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Order Details */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-900/20 border-b border-slate-200 dark:border-slate-700">
                    <DocumentTextIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'تفاصيل الأمر' : 'Order Details'}
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'نوع الأمر' : 'Order Type'}
                        options={toSelectOptions(orderTypes, activeLocale)}
                        value={form.order_type_id}
                        onChange={(v) => setForm((p) => ({ ...p, order_type_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختر النوع' : 'Select type'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />

                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'الحالة' : 'Status'}
                        options={statusOptions}
                        value={form.status_id || ''}
                        onChange={(v) => setForm((p) => ({ ...p, status_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختر الحالة' : 'Select status'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />

                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'المستودع' : 'Warehouse'}
                        options={toSelectOptions(warehouses, activeLocale)}
                        value={form.warehouse_id}
                        onChange={(v) => setForm((p) => ({ ...p, warehouse_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختر المستودع' : 'Select warehouse'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Dates & Currency */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20 border-b border-slate-200 dark:border-slate-700">
                    <CalendarDaysIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'التواريخ والعملة' : 'Dates & Currency'}
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Input
                        label={activeLocale === 'ar' ? 'تاريخ الطلب' : 'Order Date'}
                        required
                        type="date"
                        value={form.order_date}
                        onChange={(e) => setForm((p) => ({ ...p, order_date: e.target.value }))}
                        error={errors.order_date}
                        disabled={readOnly}
                      />

                      <Input
                        label={activeLocale === 'ar' ? 'التاريخ المتوقع' : 'Expected Date'}
                        type="date"
                        value={form.expected_date}
                        onChange={(e) => setForm((p) => ({ ...p, expected_date: e.target.value }))}
                        disabled={readOnly}
                      />

                      <CurrencySelector
                        label={activeLocale === 'ar' ? 'العملة' : 'Currency'}
                        value={form.currency_id}
                        onChange={(v) => setForm((p) => ({ ...p, currency_id: String(v) }))}
                        onCurrencyCodeChange={(code) => setSelectedCurrencyCode(code || '')}
                        companyId={companyStore.getActiveCompanyId() || 0}
                        disabled={readOnly}
                      />

                      <ExchangeRateField
                        label={activeLocale === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
                        currencyCode={selectedCurrencyCode}
                        date={form.order_date || undefined}
                        value={form.exchange_rate}
                        onChange={(v) => setForm((p) => ({ ...p, exchange_rate: v }))}
                        disabled={readOnly}
                        hideWhenBaseCurrency={true}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'مركز التكلفة' : 'Cost Center'}
                        options={toSelectOptions(costCenters, activeLocale)}
                        value={form.cost_center_id}
                        onChange={(v) => setForm((p) => ({ ...p, cost_center_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختياري' : 'Optional'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Notes */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-700/30 border-b border-slate-200 dark:border-slate-700">
                    <DocumentTextIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'ملاحظات' : 'Notes'}
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={activeLocale === 'ar' ? 'عنوان الشحن' : 'Ship To Address'}
                        multiline
                        rows={3}
                        value={form.ship_to_address}
                        onChange={(e) => setForm((p) => ({ ...p, ship_to_address: e.target.value }))}
                        disabled={readOnly}
                      />

                      <Input
                        label={activeLocale === 'ar' ? 'ملاحظات داخلية' : 'Internal Notes'}
                        multiline
                        rows={3}
                        value={form.internal_notes}
                        onChange={(e) => setForm((p) => ({ ...p, internal_notes: e.target.value }))}
                        helperText={activeLocale === 'ar' ? 'ملاحظات داخلية لا تظهر في المستندات المطبوعة' : 'Internal notes not shown on printed documents'}
                        disabled={readOnly}
                      />
                    </div>

                    <Input
                      label={activeLocale === 'ar' ? 'ملاحظات عامة' : 'General Notes'}
                      multiline
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            {activeTab === 'items' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <CubeIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'بنود أمر الشراء' : 'Order Line Items'}
                    </h3>
                    {items.length > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                        {items.length} {activeLocale === 'ar' ? 'بند' : 'items'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {errors.items && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                      <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                      {errors.items}
                    </div>
                  )}

                  <LineItemsTable
                    items={items}
                    onChange={setItems}
                    itemOptions={itemOpts}
                    uomOptions={uomOpts}
                    taxRateOptions={taxRateOpts}
                    currencySymbol={currencySymbol}
                    locale={activeLocale}
                    readOnly={readOnly}
                    showNotes
                    showWarehouse
                  />
                </div>
              </div>
            )}

            {/* Shipping */}
            {activeTab === 'shipping' && (
              <div className="space-y-4">
                {/* Ports & Locations */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-50 to-transparent dark:from-teal-900/20 border-b border-slate-200 dark:border-slate-700">
                    <MapPinIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'الموانئ والمواقع' : 'Ports & Locations'}
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'بلد الشحن' : 'Shipping Country'}
                        options={countryOptions}
                        value={form.origin_country_id || ''}
                        onChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            origin_country_id: v,
                            origin_city_id: '',
                          }))
                        }
                        placeholder={activeLocale === 'ar' ? 'اختر الدولة' : 'Select Country'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />

                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'مدينة الشحن' : 'Shipping City'}
                        options={originCityOptions}
                        value={form.origin_city_id || ''}
                        onChange={(v) => setForm((p) => ({ ...p, origin_city_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختر المدينة' : 'Select City'}
                        locale={activeLocale}
                        disabled={readOnly || !form.origin_country_id}
                      />

                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'بلد الوصول' : 'Destination Country'}
                        options={countryOptions}
                        value={form.destination_country_id || '1'}
                        onChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            destination_country_id: v,
                            destination_city_id: '',
                          }))
                        }
                        placeholder={activeLocale === 'ar' ? 'اختر الدولة' : 'Select Country'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />

                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'الوجهة' : 'Destination City'}
                        options={destinationCityOptions}
                        value={form.destination_city_id || ''}
                        onChange={(v) => setForm((p) => ({ ...p, destination_city_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختر المدينة' : 'Select City'}
                        locale={activeLocale}
                        disabled={readOnly || !form.destination_country_id}
                      />

                      <Input
                        label={activeLocale === 'ar' ? 'ميناء الشحن' : 'Port of Loading'}
                        value={form.port_of_loading_text || ''}
                        onChange={(e) => setForm((p) => ({ ...p, port_of_loading_text: e.target.value }))}
                        placeholder={activeLocale === 'ar' ? 'أدخل اسم الميناء' : 'Enter port name'}
                        disabled={readOnly}
                      />

                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'ميناء/مطار الوصول' : 'Port/Airport of Discharge'}
                        options={portOptions}
                        value={form.port_of_discharge_id || ''}
                        onChange={(v) => setForm((p) => ({ ...p, port_of_discharge_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختر الميناء/المطار' : 'Select Port/Airport'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery & Supply Terms */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-900/20 border-b border-slate-200 dark:border-slate-700">
                    <TruckIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'شروط التسليم والتوريد' : 'Delivery & Supply Terms'}
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'شروط التسليم' : 'Delivery Terms'}
                        options={toSelectOptions(deliveryTerms, activeLocale)}
                        value={form.delivery_terms_id}
                        onChange={(v) => setForm((p) => ({ ...p, delivery_terms_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختياري' : 'Optional'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />
                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'شروط التوريد' : 'Supply Terms'}
                        options={toSelectOptions(supplyTerms, activeLocale)}
                        value={form.supply_terms_id}
                        onChange={(v) => setForm((p) => ({ ...p, supply_terms_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختياري' : 'Optional'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />
                    </div>

                    <Input
                      label={activeLocale === 'ar' ? 'ملاحظات الشحن' : 'Shipping Notes'}
                      multiline
                      rows={3}
                      value={form.meta.shipping?.vessel || ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          meta: { ...p.meta, shipping: { ...(p.meta.shipping || {}), vessel: e.target.value } },
                        }))
                      }
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            {activeTab === 'payment' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-900/20 border-b border-slate-200 dark:border-slate-700">
                    <CreditCardIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'طريقة وشروط الدفع' : 'Payment Method & Terms'}
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'شروط الدفع' : 'Payment Terms'}
                        options={toSelectOptions(paymentTerms, activeLocale)}
                        value={form.payment_terms_id}
                        onChange={(v) => setForm((p) => ({ ...p, payment_terms_id: v }))}
                        placeholder={activeLocale === 'ar' ? 'اختياري' : 'Optional'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />

                      <SearchableSelect
                        label={activeLocale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                        options={toSelectOptions(paymentMethods, activeLocale)}
                        value={form.payment_method_id}
                        onChange={(v) => {
                          const method = paymentMethods.find((m: any) => m.id === v);
                          const beh = (method as any)?.payment_behavior || '';
                          setForm((p) => ({
                            ...p,
                            payment_method_id: v,
                            meta: {
                              ...p.meta,
                              payment: {
                                ...(p.meta.payment || {}),
                                // Clear LC if not LC behavior
                                lc_no: beh === 'lc' ? (p.meta.payment?.lc_no || '') : '',
                                // Clear due date if not needed
                                due_date: (beh === 'check' || beh === 'lc' || beh === 'bg')
                                  ? (p.meta.payment?.due_date || '')
                                  : '',
                                // Clear cheque if not check
                                cheque_number: beh === 'check' ? (p.meta.payment?.cheque_number || '') : '',
                                cheque_date: beh === 'check' ? (p.meta.payment?.cheque_date || '') : '',
                                // Clear reference if not needed
                                reference_number: (beh === 'bank' || beh === 'sadad' || beh === 'digital')
                                  ? (p.meta.payment?.reference_number || '')
                                  : '',
                              },
                              _payment_behavior: beh,
                            },
                          }));
                        }}
                        placeholder={activeLocale === 'ar' ? 'اختياري' : 'Optional'}
                        locale={activeLocale}
                        disabled={readOnly}
                      />

                      {/* LC Number - only for LC behavior */}
                      {((paymentMethods.find((m: any) => m.id === form.payment_method_id) as any)?.payment_behavior === 'lc' ||
                        (form.meta as any)?._payment_behavior === 'lc') && (
                        <Input
                          label={activeLocale === 'ar' ? 'رقم الاعتماد المستندي' : 'LC No.'}
                          value={form.meta.payment?.lc_no || ''}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              meta: { ...p.meta, payment: { ...(p.meta.payment || {}), lc_no: e.target.value } },
                            }))
                          }
                          disabled={readOnly}
                        />
                      )}

                      {/* Due Date - for check, LC, BG behaviors */}
                      {(() => {
                        const beh = (paymentMethods.find((m: any) => m.id === form.payment_method_id) as any)?.payment_behavior
                          || (form.meta as any)?._payment_behavior || '';
                        return beh === 'check' || beh === 'lc' || beh === 'bg';
                      })() && (
                        <Input
                          label={activeLocale === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                          type="date"
                          value={form.meta.payment?.due_date || ''}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              meta: { ...p.meta, payment: { ...(p.meta.payment || {}), due_date: e.target.value } },
                            }))
                          }
                          disabled={readOnly}
                        />
                      )}

                      {/* Cheque fields - for check behavior */}
                      {((paymentMethods.find((m: any) => m.id === form.payment_method_id) as any)?.payment_behavior === 'check' ||
                        (form.meta as any)?._payment_behavior === 'check') && (
                        <>
                          <Input
                            label={activeLocale === 'ar' ? 'رقم الشيك' : 'Cheque Number'}
                            value={form.meta.payment?.cheque_number || ''}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                meta: { ...p.meta, payment: { ...(p.meta.payment || {}), cheque_number: e.target.value } },
                              }))
                            }
                            disabled={readOnly}
                          />
                          <Input
                            label={activeLocale === 'ar' ? 'تاريخ الشيك' : 'Cheque Date'}
                            type="date"
                            value={form.meta.payment?.cheque_date || ''}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                meta: { ...p.meta, payment: { ...(p.meta.payment || {}), cheque_date: e.target.value } },
                              }))
                            }
                            disabled={readOnly}
                          />
                        </>
                      )}

                      {/* Reference Number - for bank, sadad, digital */}
                      {(() => {
                        const beh = (paymentMethods.find((m: any) => m.id === form.payment_method_id) as any)?.payment_behavior
                          || (form.meta as any)?._payment_behavior || '';
                        return beh === 'bank' || beh === 'sadad' || beh === 'digital';
                      })() && (
                        <Input
                          label={activeLocale === 'ar' ? 'رقم المرجع / الحوالة' : 'Reference / Transfer No.'}
                          value={form.meta.payment?.reference_number || ''}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              meta: { ...p.meta, payment: { ...(p.meta.payment || {}), reference_number: e.target.value } },
                            }))
                          }
                          disabled={readOnly}
                        />
                      )}
                    </div>

                    {/* Behavior indicator */}
                    {form.payment_method_id && (() => {
                      const beh = (paymentMethods.find((m: any) => m.id === form.payment_method_id) as any)?.payment_behavior || '';
                      if (!beh) return null;
                      const behLabels: Record<string, string> = {
                        cash: '💵 Cash', bank: '🏦 Bank Transfer', check: '📝 Cheque',
                        credit: '💳 Card', digital: '📱 Digital', lc: '📜 Letter of Credit',
                        sadad: '🔵 SADAD', offset: '⚖️ Offset', barter: '🔄 Barter', bg: '🛡️ Bank Guarantee',
                      };
                      return (
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          {activeLocale === 'ar' ? 'نوع السلوك: ' : 'Behavior: '}
                          <span className="font-medium text-gray-700 dark:text-gray-300">{behLabels[beh] || beh}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-50 to-transparent dark:from-rose-900/20 border-b border-slate-200 dark:border-slate-700">
                    <BanknotesIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'الخصومات والشحن' : 'Discounts & Freight'}
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={activeLocale === 'ar' ? 'خصم على مستوى الأمر' : 'Order Discount'}
                        type="number"
                        inputMode="decimal"
                        value={form.discount_amount}
                        onChange={(e) => setForm((p) => ({ ...p, discount_amount: e.target.value }))}
                        helperText={activeLocale === 'ar' ? 'خصم إضافي غير خصومات البنود' : 'Additional discount besides item discounts'}
                        disabled={readOnly}
                      />

                      <Input
                        label={activeLocale === 'ar' ? 'تكلفة الشحن' : 'Freight Cost'}
                        type="number"
                        inputMode="decimal"
                        value={form.freight_amount}
                        onChange={(e) => setForm((p) => ({ ...p, freight_amount: e.target.value }))}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bank */}
            {activeTab === 'bank' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-cyan-50 to-transparent dark:from-cyan-900/20 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <BanknotesIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeLocale === 'ar' ? 'التفاصيل المصرفية' : 'Bank Details'}
                    </h3>
                  </div>
                  {!readOnly && form.vendor_id && (
                    <ImportVendorBankButton
                      vendorId={form.vendor_id}
                      isArabic={activeLocale === 'ar'}
                      onImport={(bankData) => {
                        setForm((p) => ({
                          ...p,
                          meta: { ...p.meta, bank: { ...(p.meta.bank || {}), ...bankData } },
                        }));
                      }}
                    />
                  )}
                </div>
                <div className="p-5 space-y-4">
                  {/* Beneficiary Section */}
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                      {activeLocale === 'ar' ? 'بيانات المستفيد' : 'Beneficiary'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={activeLocale === 'ar' ? 'اسم المستفيد' : 'Beneficiary Name'}
                        value={form.meta.bank?.beneficiary_name || ''}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            meta: { ...p.meta, bank: { ...(p.meta.bank || {}), beneficiary_name: e.target.value } },
                          }))
                        }
                        disabled={readOnly}
                      />
                      <Input
                        label={activeLocale === 'ar' ? 'عنوان المستفيد' : 'Beneficiary Address'}
                        value={form.meta.bank?.beneficiary_address || ''}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            meta: { ...p.meta, bank: { ...(p.meta.bank || {}), beneficiary_address: e.target.value } },
                          }))
                        }
                        disabled={readOnly}
                      />
                    </div>
                  </div>

                  {/* Bank Section */}
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                      {activeLocale === 'ar' ? 'بيانات البنك' : 'Bank'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={activeLocale === 'ar' ? 'اسم البنك' : 'Bank Name'}
                        value={form.meta.bank?.bank_name || ''}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            meta: { ...p.meta, bank: { ...(p.meta.bank || {}), bank_name: e.target.value } },
                          }))
                        }
                        disabled={readOnly}
                      />
                      <Input
                        label={activeLocale === 'ar' ? 'الفرع' : 'Branch'}
                        value={form.meta.bank?.branch_name || ''}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            meta: { ...p.meta, bank: { ...(p.meta.bank || {}), branch_name: e.target.value } },
                          }))
                        }
                        disabled={readOnly}
                      />
                      <Input
                        label={activeLocale === 'ar' ? 'عنوان البنك' : 'Bank Address'}
                        value={form.meta.bank?.bank_address || ''}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            meta: { ...p.meta, bank: { ...(p.meta.bank || {}), bank_address: e.target.value } },
                          }))
                        }
                        disabled={readOnly}
                      />
                      <Input
                        label="SWIFT"
                        value={form.meta.bank?.swift || ''}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            meta: { ...p.meta, bank: { ...(p.meta.bank || {}), swift: e.target.value } },
                          }))
                        }
                        disabled={readOnly}
                      />
                    </div>
                  </div>

                  {/* Account Section */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                      {activeLocale === 'ar' ? 'بيانات الحساب' : 'Account'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={activeLocale === 'ar' ? 'رقم الحساب' : 'Account Number'}
                        value={form.meta.bank?.account_no || ''}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            meta: { ...p.meta, bank: { ...(p.meta.bank || {}), account_no: e.target.value } },
                          }))
                        }
                        disabled={readOnly}
                      />
                      <Input
                        label="IBAN"
                        value={form.meta.bank?.iban || ''}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            meta: { ...p.meta, bank: { ...(p.meta.bank || {}), iban: e.target.value } },
                          }))
                        }
                        disabled={readOnly}
                      />
                    </div>
                  </div>

                  {!form.vendor_id && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                      <InformationCircleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {activeLocale === 'ar'
                          ? 'اختر المورد أولاً لتتمكن من استيراد بيانات البنك الخاصة به.'
                          : 'Select a vendor first to import their bank details.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-700/30 border-b border-slate-200 dark:border-slate-700">
                  <ClockIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {activeLocale === 'ar' ? 'سجل التغييرات' : 'Change History'}
                  </h3>
                </div>
                <div className="p-10 text-center">
                  <ClockIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {activeLocale === 'ar'
                      ? 'سجل التغييرات سيتم ربطه بجدول audit_logs لاحقاً.'
                      : 'Change history will be connected to audit_logs later.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Summary Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-4 space-y-4">
              {/* Completion Progress */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {activeLocale === 'ar' ? 'اكتمال النموذج' : 'Form Completion'}
                  </h3>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {completedSteps}/{totalSteps}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                  />
                </div>
                <div className="mt-3 space-y-1.5">
                  {([
                    { key: 'general' as TabKey, label: activeLocale === 'ar' ? 'البيانات الأساسية' : 'General Info', icon: <ClipboardDocumentListIcon className="h-3.5 w-3.5" /> },
                    { key: 'items' as TabKey, label: activeLocale === 'ar' ? 'البنود' : 'Line Items', icon: <CubeIcon className="h-3.5 w-3.5" /> },
                    { key: 'shipping' as TabKey, label: activeLocale === 'ar' ? 'الشحن' : 'Shipping', icon: <TruckIcon className="h-3.5 w-3.5" /> },
                    { key: 'payment' as TabKey, label: activeLocale === 'ar' ? 'الدفع' : 'Payment', icon: <CreditCardIcon className="h-3.5 w-3.5" /> },
                    { key: 'bank' as TabKey, label: activeLocale === 'ar' ? 'البنك' : 'Bank', icon: <BanknotesIcon className="h-3.5 w-3.5" /> },
                  ]).map((step) => (
                    <button
                      key={step.key}
                      onClick={() => setActiveTab(step.key)}
                      className={clsx(
                        'w-full flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md transition-all',
                        activeTab === step.key
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      )}
                    >
                      {tabCompletion[step.key] ? (
                        <CheckCircleSolid className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">{step.icon}</span>
                      )}
                      <span>{step.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Summary / Totals */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <BanknotesIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  {activeLocale === 'ar' ? 'ملخص المبالغ' : 'Order Summary'}
                </h3>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{activeLocale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{formatMoney(totals.subtotal)}</span>
                  </div>

                  {totals.discountAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-red-500 dark:text-red-400">{activeLocale === 'ar' ? 'الخصم' : 'Discount'}</span>
                      <span className="font-medium text-red-600 dark:text-red-400">-{formatMoney(totals.discountAmount)}</span>
                    </div>
                  )}

                  {totals.itemTax > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{activeLocale === 'ar' ? 'الضريبة' : 'Tax'}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{formatMoney(totals.itemTax)}</span>
                    </div>
                  )}

                  {totals.freightAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{activeLocale === 'ar' ? 'الشحن' : 'Freight'}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{formatMoney(totals.freightAmount)}</span>
                    </div>
                  )}

                  <div className="pt-3 mt-3 border-t-2 border-slate-200 dark:border-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900 dark:text-white">{activeLocale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatMoney(totals.total)}</span>
                    </div>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{activeLocale === 'ar' ? 'عدد البنود' : 'Line Items'}</span>
                      <span className="font-medium">{items.length}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Validation Errors */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
                      {activeLocale === 'ar' ? 'أخطاء التحقق' : 'Validation Errors'}
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    {Object.entries(errors).map(([key, msg]) => (
                      <li key={key} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-red-400 flex-shrink-0" />
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick Actions */}
              {!readOnly && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    {activeLocale === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab('items')}
                      className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <CubeIcon className="h-4 w-4 text-purple-500" />
                      {activeLocale === 'ar' ? 'إضافة بنود' : 'Add Line Items'}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !canRender || loading}
                      className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      {activeLocale === 'ar' ? 'حفظ الأمر' : 'Save Order'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
