import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

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

  const tabs: Tab[] = useMemo(
    () => [
      { id: 'general', label: 'General', label_ar: 'عام' },
      { id: 'items', label: 'Items', label_ar: 'البنود', badge: items.length, badgeColor: 'primary' },
      { id: 'shipping', label: 'Shipping', label_ar: 'الشحن' },
      { id: 'payment', label: 'Payment', label_ar: 'الدفع' },
      { id: 'bank', label: 'Bank', label_ar: 'البنك' },
      { id: 'history', label: 'History', label_ar: 'السجل', disabled: mode === 'create' },
    ],
    [items.length, mode]
  );

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
    return selected?.code || 'SAR';
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mode === 'create'
                ? activeLocale === 'ar'
                  ? 'إنشاء أمر شراء'
                  : 'Create Purchase Order'
                : mode === 'view'
                  ? activeLocale === 'ar'
                    ? 'عرض أمر شراء'
                    : 'View Purchase Order'
                : activeLocale === 'ar'
                  ? 'تعديل أمر شراء'
                  : 'Edit Purchase Order'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeLocale === 'ar'
                ? 'نموذج احترافي متعدد الأقسام'
                : 'Professional multi-section form'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push('/purchasing/orders')}>
            {activeLocale === 'ar' ? 'رجوع' : 'Back'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} loading={saving} disabled={!canRender || loading}>
              {activeLocale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {!canRender ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-slate-600 dark:text-slate-300">
          {activeLocale === 'ar' ? 'جاري التحقق من تسجيل الدخول...' : 'Checking authentication...'}
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-slate-600 dark:text-slate-300">
          {activeLocale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as TabKey)}
                locale={activeLocale}
                variant="underline"
              />
            </div>

            {/* General */}
            {activeTab === 'general' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SearchableSelect
                    label={activeLocale === 'ar' ? 'المورد' : 'Vendor'}
                    required
                    options={vendorOptions}
                    value={form.vendor_id}
                    onChange={(v) => setForm((p) => ({ 
                      ...p, 
                      vendor_id: v,
                      // Clear project when vendor changes (project is vendor-specific)
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

                  <Input
                    label={activeLocale === 'ar' ? 'تاريخ عقد المورد' : 'Vendor Contract Date'}
                    type="date"
                    value={form.vendor_contract_date || ''}
                    onChange={(e) => setForm((p) => ({ ...p, vendor_contract_date: e.target.value }))}
                    disabled={readOnly}
                  />

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

                  <SearchableSelect
                    label={activeLocale === 'ar' ? 'المستودع' : 'Warehouse'}
                    options={toSelectOptions(warehouses, activeLocale)}
                    value={form.warehouse_id}
                    onChange={(v) => setForm((p) => ({ ...p, warehouse_id: v }))}
                    placeholder={activeLocale === 'ar' ? 'اختر المستودع' : 'Select warehouse'}
                    locale={activeLocale}
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

                  <SearchableSelect
                    label={activeLocale === 'ar' ? 'مركز التكلفة' : 'Cost Center'}
                    options={toSelectOptions(costCenters, activeLocale)}
                    value={form.cost_center_id}
                    onChange={(v) => setForm((p) => ({ ...p, cost_center_id: v }))}
                    placeholder={activeLocale === 'ar' ? 'اختياري' : 'Optional'}
                    locale={activeLocale}
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
                    helperText={activeLocale === 'ar' ? 'يتم حفظ النص + بيانات التبويبات ضمن internal_notes' : 'Saved together with tab meta in internal_notes'}
                    disabled={readOnly}
                  />
                </div>

                <Input
                  label={activeLocale === 'ar' ? 'ملاحظات' : 'Notes'}
                  multiline
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  disabled={readOnly}
                />
              </div>
            )}

            {/* Items */}
            {activeTab === 'items' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
                {errors.items && (
                  <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
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
            )}

            {/* Shipping */}
            {activeTab === 'shipping' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-6">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {activeLocale === 'ar' ? 'الموانئ والمواقع • Ports & Locations' : 'Ports & Locations • الموانئ والمواقع'}
                  </h3>
                </div>

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
                    label={activeLocale === 'ar' ? 'الوجهة (افتراضي: الرياض)' : 'Destination (Default: Riyadh)'}
                    options={destinationCityOptions}
                    value={form.destination_city_id || ''}
                    onChange={(v) => setForm((p) => ({ ...p, destination_city_id: v }))}
                    placeholder={activeLocale === 'ar' ? 'اختر المدينة' : 'Select City'}
                    locale={activeLocale}
                    disabled={readOnly || !form.destination_country_id}
                  />

                  <Input
                    label={activeLocale === 'ar' ? 'ميناء الشحن (اختياري)' : 'Port of Loading (Optional)'}
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
                  rows={4}
                  value={form.meta.shipping?.vessel || ''}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      meta: { ...p.meta, shipping: { ...(p.meta.shipping || {}), vessel: e.target.value } },
                    }))
                  }
                  helperText={activeLocale === 'ar' ? 'سيتم حفظ هذه البيانات ضمن الحقول الداخلية' : 'Stored in internal meta'}
                  disabled={readOnly}
                />
              </div>
            )}

            {/* Payment */}
            {activeTab === 'payment' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-6">
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
                    onChange={(v) => setForm((p) => ({ ...p, payment_method_id: v }))}
                    placeholder={activeLocale === 'ar' ? 'اختياري' : 'Optional'}
                    locale={activeLocale}
                    disabled={readOnly}
                  />

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
                </div>

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
                    label={activeLocale === 'ar' ? 'الشحن (Freight)' : 'Freight'}
                    type="number"
                    inputMode="decimal"
                    value={form.freight_amount}
                    onChange={(e) => setForm((p) => ({ ...p, freight_amount: e.target.value }))}
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}

            {/* Bank */}
            {activeTab === 'bank' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-6">
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
                    label={activeLocale === 'ar' ? 'IBAN' : 'IBAN'}
                    value={form.meta.bank?.iban || ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        meta: { ...p.meta, bank: { ...(p.meta.bank || {}), iban: e.target.value } },
                      }))
                    }
                    disabled={readOnly}
                  />
                  <Input
                    label={activeLocale === 'ar' ? 'SWIFT' : 'SWIFT'}
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

                <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4 text-sm text-slate-600 dark:text-slate-300">
                  {activeLocale === 'ar'
                    ? 'ملاحظة: تفاصيل البنك يتم حفظها ضمن الحقول الداخلية (internal_notes) لحين إضافة أعمدة مخصصة في قاعدة البيانات.'
                    : 'Note: bank details are stored in internal_notes JSON until dedicated DB columns are added.'}
                </div>
              </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {activeLocale === 'ar'
                    ? 'سجل التغييرات سيتم ربطه بجدول audit_logs لاحقًا.'
                    : 'Change history will be connected to audit_logs later.'}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-4 space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  {activeLocale === 'ar' ? 'ملخص' : 'Summary'}
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{activeLocale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatMoney(totals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{activeLocale === 'ar' ? 'الخصم' : 'Discount'}</span>
                    <span className="font-medium text-slate-900 dark:text-white">-{formatMoney(totals.discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{activeLocale === 'ar' ? 'الضريبة' : 'Tax'}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatMoney(totals.itemTax)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{activeLocale === 'ar' ? 'الشحن' : 'Freight'}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatMoney(totals.freightAmount)}</span>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-900 dark:text-white font-semibold">{activeLocale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className={clsx('font-bold', 'text-slate-900 dark:text-white')}>{formatMoney(totals.total)}</span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  {activeLocale === 'ar'
                    ? 'يتم حساب الإجمالي من البنود + الضريبة + الشحن - الخصم.'
                    : 'Total = items + tax + freight - discount.'}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  {activeLocale === 'ar' ? 'ملاحظات' : 'Quick Tips'}
                </h3>
                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-5">
                  <li>{activeLocale === 'ar' ? 'أضف البنود أولاً للحصول على حسابات دقيقة.' : 'Add items first for accurate totals.'}</li>
                  <li>{activeLocale === 'ar' ? 'بيانات البنك/الشحن المتقدمة تُحفظ داخلياً مؤقتاً.' : 'Advanced bank/shipping is stored internally for now.'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
