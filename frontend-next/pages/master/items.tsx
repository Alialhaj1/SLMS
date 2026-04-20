/**
 *  ITEMS PAGE — Enterprise Edition
 * ═══════════════════════════════════════
 *
 * Professional master data page for managing items / product catalog.
 * Uses EnterpriseMasterPage with itemsConfig for full governance.
 *
 * Features:
 * ─ Cascading group hierarchy (Main ▸ Sub ▸ Sub-Sub ▸ Similar ▸ Auxiliary)
 * ─ All dropdown fields are searchable (SearchableSelect)
 * ─ Multi-unit conversions with clear base-unit logic (factor=1)
 * ─ Image URL with live preview
 * ─ Default vendor in classification & dedicated vendor section
 * ─ Harvest date, shelf-life, expiry alerts
 * ─ Detail panel: Identity, Classification, Units, Pricing,
 *                  Inventory, Vendor & Mfg, Agriculture, Physical, Settings, Metadata
 * ─ Related records: Barcodes, Unit Conversions, Item Groups
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlusIcon, TrashIcon, PhotoIcon, ArrowTopRightOnSquareIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { itemsConfig, type Item } from '@/config/pages/master/items.config';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemBarcodeDialog } from './item-barcodes';

// ─── Types ────────────────────────────────────────────────────────────
interface GroupOption {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  parent_group_id?: number | null;
  level?: number | null;
}

interface UomConvRow {
  uom_id: number | '';
  conversion_factor: number | '';
  is_active: boolean;
}

// ─── Group level IDs (from group_levels table) ──────────────────────
const LEVEL = { MAIN: 1, SUB: 2, SUB_SUB: 3, SIMILAR: 4, DETAILED: 5, AUXILIARY: 6 };

function ItemsPage() {
  const { t, locale } = useTranslation();
  const isAr = locale === 'ar';

  // ─── State ───────────────────────────────────────────────────────
  const [allGroups, setAllGroups] = useState<GroupOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<Array<{ value: number; label: string; labelAr?: string; code?: string; isBase?: boolean }>>([]);
  const [vendorOptions, setVendorOptions] = useState<Array<{ value: number; label: string; labelAr?: string; code?: string }>>([]);
  const [uomRows, setUomRows] = useState<UomConvRow[]>([]);
  const [barcodeDialogItem, setBarcodeDialogItem] = useState<{ id: number; code: string; name: string } | null>(null);

  // Fetch group hierarchy + unit data once
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/master/items/filters`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || json;
        if (data.item_groups) setAllGroups(data.item_groups);
        if (data.units) {
          setUnitOptions(
            data.units.map((u: any) => ({
              value: u.id,
              label: u.name_en || u.name || u.code,
              labelAr: u.name_ar || u.name_en || u.name || u.code,
              code: u.code,
              isBase: u.is_base === true,
            }))
          );
        }
        if (data.vendors) {
          setVendorOptions(
            data.vendors.map((v: any) => ({
              value: v.id,
              label: v.name || v.code,
              labelAr: v.name_ar,
              code: v.code,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // ─── Helper: filter groups by level and parent ───────────────────
  const getGroupsByLevel = useCallback(
    (levelId: number, parentId?: number | null) => {
      return allGroups.filter((g) => {
        if (g.level !== levelId) return false;
        if (parentId !== undefined && parentId !== null) {
          return g.parent_group_id === parentId;
        }
        return levelId === LEVEL.MAIN ? (!g.parent_group_id) : true;
      });
    },
    [allGroups]
  );

  // Check if groups have actual parent-child hierarchy structure
  const hasGroupHierarchy = useMemo(() => {
    return allGroups.some((g) => g.parent_group_id != null);
  }, [allGroups]);

  const toSelectOpts = useCallback(
    (groups: GroupOption[]) =>
      groups.map((g) => ({
        value: g.id,
        label: g.name_en || g.code,
        labelAr: g.name_ar,
        code: g.code,
      })),
    []
  );

  // ─── Helper: Format numbers ──────────────────────────────────────
  const fmtNum = (v: any, decimals = 2) => {
    if (v == null || v === '' || v === 0) return null;
    return Number(v).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // ════════════════════════════════════════════════════════════════════
  //  CLASSIFICATION SECTION OVERRIDE (cascading groups)
  // ════════════════════════════════════════════════════════════════════
  const renderFormSectionOverride = useCallback(
    (
      sectionKey: string,
      formData: Record<string, any>,
      setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
      options: {
        editingRecord: Item | null;
        apiSelectData: Record<string, Array<{ value: any; label: string; labelAr?: string; code?: string }>>;
        locale: string;
        t: (key: string, fallback?: string) => string;
        formErrors: Record<string, string>;
        submitting: boolean;
      }
    ): React.ReactNode | undefined => {
      const { apiSelectData, formErrors, submitting } = options;
      const loc = options.locale;
      const tr = options.t;

      // ── Classification override ──
      if (sectionKey === 'classification') {
        const typeOpts = apiSelectData['item_type_id'] || [];
        // Use ALL vendors from /filters (not limited apiSelectData)
        const vendorOpts = vendorOptions.length > 0 ? vendorOptions : (apiSelectData['default_vendor_id'] || []);

        // All groups as flat select options
        const allGroupOpts = toSelectOpts(allGroups);

        // Group hierarchy (only relevant if groups have parent/level structure)
        const mainGroups = hasGroupHierarchy ? toSelectOpts(getGroupsByLevel(LEVEL.MAIN)) : [];
        const subGroups = hasGroupHierarchy && formData._main_group_id
          ? toSelectOpts(getGroupsByLevel(LEVEL.SUB, Number(formData._main_group_id)))
          : [];
        const subSubGroups = hasGroupHierarchy && formData._sub_group_id
          ? toSelectOpts(getGroupsByLevel(LEVEL.SUB_SUB, Number(formData._sub_group_id)))
          : [];

        const handleGroupChange = (level: string, value: string) => {
          const numVal = value ? Number(value) : '';
          setFormData((prev) => {
            const next = { ...prev };
            if (level === 'main') {
              next._main_group_id = numVal;
              next._sub_group_id = '';
              next._sub_sub_group_id = '';
              next.item_group_id = numVal;
            } else if (level === 'sub') {
              next._sub_group_id = numVal;
              next._sub_sub_group_id = '';
              next.item_group_id = numVal || next._main_group_id;
            } else if (level === 'sub_sub') {
              next._sub_sub_group_id = numVal;
              next.item_group_id = numVal || next._sub_group_id || next._main_group_id;
            } else if (level === 'flat') {
              // Flat mode — single group select
              next.item_group_id = numVal;
              next.group_id = numVal;
            }
            return next;
          });
        };

        return (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              {tr('items.sections.classification', loc === 'ar' ? 'التصنيف' : 'Classification')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Item Type */}
              <div>
                <SearchableSelect
                  options={typeOpts}
                  value={formData.item_type_id || ''}
                  onChange={(v) => setFormData((p) => ({ ...p, item_type_id: v ? Number(v) : '' }))}
                  placeholder={`${tr('common.select', 'Select')} ${tr('items.fields.itemType', loc === 'ar' ? 'نوع الصنف' : 'Item Type')}...`}
                  searchPlaceholder={tr('common.search', 'Search...')}
                  label={tr('items.fields.itemType', loc === 'ar' ? 'نوع الصنف' : 'Item Type')}
                  locale={loc}
                  disabled={submitting}
                  error={formErrors.item_type_id}
                />
              </div>

              {/* Default Vendor (all vendors from /filters) */}
              <div>
                <SearchableSelect
                  options={vendorOpts}
                  value={formData.default_vendor_id || ''}
                  onChange={(v) => setFormData((p) => ({ ...p, default_vendor_id: v ? Number(v) : '' }))}
                  placeholder={`${tr('common.select', 'Select')} ${loc === 'ar' ? 'المورد' : 'Vendor'}...`}
                  searchPlaceholder={tr('common.search', 'Search...')}
                  label={loc === 'ar' ? 'المورد الافتراضي' : 'Default Vendor'}
                  locale={loc}
                  disabled={submitting}
                  error={formErrors.default_vendor_id}
                />
              </div>

              {/* Groups: Flat mode (no hierarchy) OR cascading mode */}
              {!hasGroupHierarchy ? (
                // ── Flat groups: single dropdown with all groups ──
                <div>
                  <SearchableSelect
                    options={allGroupOpts}
                    value={formData.item_group_id || formData.group_id || ''}
                    onChange={(v) => handleGroupChange('flat', v)}
                    placeholder={`${tr('common.select', 'Select')} ${loc === 'ar' ? 'المجموعة' : 'Group'}...`}
                    searchPlaceholder={tr('common.search', 'Search...')}
                    label={loc === 'ar' ? 'مجموعة الصنف' : 'Item Group'}
                    required
                    locale={loc}
                    disabled={submitting}
                    error={formErrors.item_group_id || formErrors.group_id}
                  />
                </div>
              ) : (
                <>
                  {/* Main Group */}
                  <div>
                    <SearchableSelect
                      options={mainGroups}
                      value={formData._main_group_id || ''}
                      onChange={(v) => handleGroupChange('main', v)}
                      placeholder={`${tr('common.select', 'Select')} ${loc === 'ar' ? 'المجموعة الرئيسية' : 'Main Group'}...`}
                      searchPlaceholder={tr('common.search', 'Search...')}
                      label={loc === 'ar' ? 'المجموعة الرئيسية' : 'Main Group'}
                      required
                      locale={loc}
                      disabled={submitting}
                      error={formErrors.item_group_id || formErrors._main_group_id}
                    />
                  </div>

                  {/* Sub Group */}
                  {formData._main_group_id && subGroups.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <SearchableSelect
                        options={subGroups}
                        value={formData._sub_group_id || ''}
                        onChange={(v) => handleGroupChange('sub', v)}
                        placeholder={`${tr('common.select', 'Select')} ${loc === 'ar' ? 'المجموعة الفرعية' : 'Sub Group'}...`}
                        searchPlaceholder={tr('common.search', 'Search...')}
                        label={loc === 'ar' ? 'المجموعة الفرعية' : 'Sub Group'}
                        locale={loc}
                        disabled={submitting}
                      />
                    </div>
                  )}

                  {/* Sub-Sub Group */}
                  {formData._sub_group_id && subSubGroups.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <SearchableSelect
                        options={subSubGroups}
                        value={formData._sub_sub_group_id || ''}
                        onChange={(v) => handleGroupChange('sub_sub', v)}
                        placeholder={`${tr('common.select', 'Select')} ${loc === 'ar' ? 'المجموعة الفرعية الدقيقة' : 'Sub-Sub Group'}...`}
                        searchPlaceholder={tr('common.search', 'Search...')}
                        label={loc === 'ar' ? 'المجموعة الفرعية الدقيقة' : 'Sub-Sub Group'}
                        locale={loc}
                        disabled={submitting}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      }

      // ── Media section override (image preview) ──
      if (sectionKey === 'media') {
        const imageUrl = formData.image_url || '';
        return (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
              {loc === 'ar' ? 'صورة المنتج' : 'Product Image'}
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {/* Image preview */}
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-slate-800 flex-shrink-0 transition-all duration-300">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Product"
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="text-center p-2">
                    <PhotoIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto" />
                    <p className="text-xs text-gray-400 mt-1">{loc === 'ar' ? 'لا توجد صورة' : 'No image'}</p>
                  </div>
                )}
              </div>
              {/* URL input */}
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {loc === 'ar' ? 'رابط الصورة' : 'Image URL'}
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))}
                  placeholder={loc === 'ar' ? 'https://... أو الصق رابط الصورة' : 'https://... paste image URL'}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  disabled={submitting}
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {loc === 'ar' ? 'ادخل رابط صورة المنتج (PNG, JPG, WebP)' : 'Enter product image URL (PNG, JPG, WebP)'}
                </p>
              </div>
            </div>
          </div>
        );
      }

      // ── Vendor section override (to avoid duplicate with classification) ──
      if (sectionKey === 'vendor') {
        const vendorOpts = vendorOptions.length > 0 ? vendorOptions : (apiSelectData['default_vendor_id'] || []);
        return (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {loc === 'ar' ? 'المورد والتصنيع' : 'Vendor & Manufacturing'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <SearchableSelect
                  options={vendorOpts}
                  value={formData.default_vendor_id || ''}
                  onChange={(v) => setFormData((p) => ({ ...p, default_vendor_id: v ? Number(v) : '' }))}
                  placeholder={loc === 'ar' ? 'اختر المورد...' : 'Select vendor...'}
                  searchPlaceholder={tr('common.search', 'Search...')}
                  label={loc === 'ar' ? 'المورد الافتراضي' : 'Default Vendor'}
                  locale={loc}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {loc === 'ar' ? 'الشركة المصنعة' : 'Manufacturer'}
                </label>
                <input
                  type="text"
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, manufacturer: e.target.value }))}
                  placeholder={loc === 'ar' ? 'اسم الشركة المصنعة' : 'Manufacturer name'}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {loc === 'ar' ? 'رقم القطعة' : 'Mfg Part No.'}
                </label>
                <input
                  type="text"
                  value={formData.manufacturer_part_no || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, manufacturer_part_no: e.target.value }))}
                  placeholder={loc === 'ar' ? 'رقم القطعة من المصنع' : 'Part number'}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {loc === 'ar' ? 'أقل كمية طلب' : 'Min Order Qty'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_order_qty || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, min_order_qty: e.target.value ? Number(e.target.value) : '' }))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {loc === 'ar' ? 'الضمان (أشهر)' : 'Warranty (months)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.warranty_months || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, warranty_months: e.target.value ? Number(e.target.value) : '' }))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        );
      }

      return undefined; // default rendering for other sections
    },
    [allGroups, getGroupsByLevel, toSelectOpts, vendorOptions, hasGroupHierarchy]
  );

  // ════════════════════════════════════════════════════════════════════
  //  onFormOpen: Load UOM rows for editing
  // ════════════════════════════════════════════════════════════════════
  const onFormOpen = useCallback(
    (record: Item | null) => {
      if (!record) {
        setUomRows([]);
        return;
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setUomRows([]); return; }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const companyId = typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null;
      fetch(`${apiUrl}/api/master/items/${record.id}/uoms`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': companyId } : {}),
        },
      })
        .then((r) => r.json())
        .then((json) => {
          const rows = (json.data || [])
            .filter((r: any) => !r.is_base)
            .map((r: any) => ({
              uom_id: r.uom_id,
              conversion_factor: r.conversion_factor ? Number(r.conversion_factor) : '',
              is_active: r.is_active !== false,
            }));
          setUomRows(rows);
        })
        .catch(() => setUomRows([]));
    },
    []
  );

  // ─── onFieldChange placeholder ───────────────────────────────────
  const onFieldChange = useCallback(
    (_key: string, _value: any, _formData: Record<string, any>, _setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>) => {},
    []
  );

  // ─── Group hierarchy resolution ──────────────────────────────────
  const resolveGroupHierarchy = useCallback(
    (itemGroupId: number | null | undefined): Record<string, any> => {
      if (!itemGroupId || allGroups.length === 0) return {};
      const group = allGroups.find((g) => g.id === itemGroupId);
      if (!group) return { _main_group_id: itemGroupId };

      const chain: GroupOption[] = [group];
      let current = group;
      while (current.parent_group_id) {
        const parent = allGroups.find((g) => g.id === current.parent_group_id);
        if (!parent) break;
        chain.unshift(parent);
        current = parent;
      }

      const result: Record<string, any> = {};
      for (const g of chain) {
        switch (g.level) {
          case LEVEL.MAIN: result._main_group_id = g.id; break;
          case LEVEL.SUB: result._sub_group_id = g.id; break;
          case LEVEL.SUB_SUB: result._sub_sub_group_id = g.id; break;
          case LEVEL.SIMILAR: result._similar_group_id = g.id; break;
          case LEVEL.AUXILIARY: result._auxiliary_group_id = g.id; break;
          default: result._main_group_id = g.id; break;
        }
      }
      return result;
    },
    [allGroups]
  );

  // ════════════════════════════════════════════════════════════════════
  //  FORM FOOTER — Unit Conversions
  // ════════════════════════════════════════════════════════════════════
  const formFooter = useCallback(
    (_isEditing: boolean, formData: Record<string, any>) => {
      if (!formData.base_uom_id) return null;
      const baseUom = unitOptions.find((u) => u.value === Number(formData.base_uom_id));
      const baseUomLabel = isAr ? (baseUom?.labelAr || baseUom?.label) : baseUom?.label;

      return (
        <div className="mt-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {isAr ? 'تحويلات الوحدات' : 'Unit Conversions'}
          </h3>

          {/* Base unit info badge */}
          <div className="mb-4 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
              {isAr
                ? `الوحدة الأساسية: ${baseUomLabel || '—'}  •  معامل التحويل = 1`
                : `Base unit: ${baseUomLabel || '—'}  •  Conversion factor = 1`}
            </p>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-0.5">
              {isAr
                ? 'أضف وحدات إضافية مع معامل التحويل. مثال: كيس 10 كجم → المعامل = 10، ربع كيلو → المعامل = 0.25'
                : 'Add additional units with their conversion factor. Example: Bag 10kg → factor = 10, Quarter kg → factor = 0.25'}
            </p>
          </div>

          {/* Conversion rows */}
          {uomRows.map((row, idx) => (
            <div key={idx} className="flex items-end gap-3 mb-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 transition-all duration-200 hover:shadow-sm">
              <div className="flex-1">
                <SearchableSelect
                  options={unitOptions.filter((u) => u.value !== Number(formData.base_uom_id))}
                  value={row.uom_id}
                  onChange={(v) => {
                    setUomRows((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], uom_id: v ? Number(v) : '' };
                      return next;
                    });
                  }}
                  label={idx === 0 ? (isAr ? 'الوحدة' : 'Unit') : undefined}
                  placeholder={isAr ? 'اختر وحدة...' : 'Select unit...'}
                  searchPlaceholder={isAr ? 'بحث...' : 'Search...'}
                  locale={locale}
                />
              </div>
              <div className="w-36">
                <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${idx > 0 ? 'sr-only' : ''}`}>
                  {isAr ? 'معامل التحويل' : 'Factor'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  value={row.conversion_factor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUomRows((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], conversion_factor: val ? Number(val) : '' };
                      return next;
                    });
                  }}
                  placeholder={isAr ? 'مثال: 10' : 'e.g. 10'}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>
              {/* Factor description */}
              <div className="w-40 text-xs text-gray-500 dark:text-gray-400 pb-2.5">
                {row.uom_id && row.conversion_factor ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {isAr
                      ? `1 ${unitOptions.find(u => u.value === Number(row.uom_id))?.labelAr || unitOptions.find(u => u.value === Number(row.uom_id))?.label || ''} = ${row.conversion_factor} ${baseUomLabel || ''}`
                      : `1 ${unitOptions.find(u => u.value === Number(row.uom_id))?.label || ''} = ${row.conversion_factor} ${baseUomLabel || ''}`}
                  </span>
                ) : (
                  <span className="italic">{isAr ? 'اختر الوحدة والمعامل' : 'Select unit & factor'}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setUomRows((prev) => prev.filter((_, i) => i !== idx))}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 mb-0.5"
                title={isAr ? 'حذف' : 'Remove'}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            onClick={() => setUomRows((prev) => [...prev, { uom_id: '', conversion_factor: '', is_active: true }])}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all duration-200 border border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-400 dark:hover:border-indigo-600"
          >
            <PlusIcon className="h-4 w-4" />
            {isAr ? 'إضافة وحدة تحويل' : 'Add Unit Conversion'}
          </button>

          {/* ─── Barcode Quick Access ──────────────────────────────── */}
          {formData.id && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {isAr ? 'باركود الصنف' : 'Item Barcodes'}
              </h3>
              <button
                type="button"
                onClick={() => setBarcodeDialogItem({
                  id: formData.id,
                  code: formData.code || '',
                  name: isAr ? formData.name_ar || formData.name_en || '' : formData.name_en || formData.name || '',
                })}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200 border border-dashed border-emerald-300 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-600 w-full justify-center"
              >
                <QrCodeIcon className="h-4 w-4" />
                {isAr ? 'عرض وإدارة الباركودات' : 'View & Manage Barcodes'}
              </button>
            </div>
          )}
        </div>
      );
    },
    [t, locale, isAr, unitOptions, uomRows]
  );

  // ════════════════════════════════════════════════════════════════════
  //  TRANSFORM FUNCTIONS
  // ════════════════════════════════════════════════════════════════════
  const transformBeforeSubmit = useCallback(
    (data: Record<string, any>, _isEditing: boolean) => {
      const payload = { ...data };
      if (payload.item_group_id && !payload.group_id) {
        payload.group_id = payload.item_group_id;
      }
      delete payload.item_group_id;
      delete payload._main_group_id;
      delete payload._sub_group_id;
      delete payload._sub_sub_group_id;
      delete payload._similar_group_id;
      delete payload._auxiliary_group_id;
      return payload;
    },
    []
  );

  const transformAfterFetch = useCallback(
    (data: Item[]) => {
      return data.map((item) => {
        const groupId = item.group_id || item.item_group_id;
        const hierarchy = resolveGroupHierarchy(groupId);
        return { ...item, item_group_id: groupId, ...hierarchy };
      });
    },
    [resolveGroupHierarchy]
  );

  // ─── onAfterSave: persist UOM conversion rows ───────────────────
  const onAfterSave = useCallback(
    async (savedData: any, _isEditing: boolean) => {
      const itemId = savedData?.id;
      if (!itemId) return;
      const validUoms = uomRows.filter(
        (r) => r.uom_id && r.conversion_factor && Number(r.conversion_factor) > 0
      );
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const companyId = typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null;
      await fetch(`${apiUrl}/api/master/items/${itemId}/uoms`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': companyId } : {}),
        },
        body: JSON.stringify({
          rows: validUoms.map((r) => ({
            uom_id: Number(r.uom_id),
            conversion_factor: Number(r.conversion_factor),
            is_active: r.is_active,
          })),
        }),
      });
    },
    [uomRows]
  );

  // ════════════════════════════════════════════════════════════════════
  //  DETAIL SECTIONS (Side Panel)
  // ════════════════════════════════════════════════════════════════════
  const buildDetailSections = (item: Item) => {
    const sections = [
      {
        title: isAr ? 'بيانات الصنف' : 'Identity',
        fields: [
          { label: isAr ? 'الكود' : 'Code', value: item.code },
          { label: 'SKU', value: item.sku },
          { label: isAr ? 'الباركود' : 'Barcode', value: item.barcode },
          { label: isAr ? 'الاسم' : 'Name', value: item.name },
          { label: isAr ? 'الاسم بالعربي' : 'Name (AR)', value: item.name_ar },
          { label: isAr ? 'الوصف' : 'Description', value: item.description },
        ],
      },
      {
        title: isAr ? 'التصنيف' : 'Classification',
        fields: [
          { label: isAr ? 'نوع الصنف' : 'Item Type', value: isAr ? item.item_type_name_ar : item.item_type_name || item.item_type },
          { label: isAr ? 'المجموعة' : 'Group', value: isAr ? item.group_name_ar : item.group_name },
          { label: isAr ? 'المورد' : 'Default Vendor', value: isAr ? item.default_vendor_name_ar : item.default_vendor_name },
          { label: isAr ? 'قابل للتخزين' : 'Stockable', value: item.is_stockable ? '✔ ' + (isAr ? 'نعم' : 'Yes') : '✖ ' + (isAr ? 'لا' : 'No') },
          { label: isAr ? 'قابل للشراء' : 'Purchasable', value: item.is_purchasable ? '✔ ' + (isAr ? 'نعم' : 'Yes') : '✖ ' + (isAr ? 'لا' : 'No') },
          { label: isAr ? 'قابل للبيع' : 'Sellable', value: item.is_sellable ? '✔ ' + (isAr ? 'نعم' : 'Yes') : '✖ ' + (isAr ? 'لا' : 'No') },
        ],
      },
      {
        title: isAr ? 'وحدات القياس' : 'Units of Measure',
        fields: [
          { label: isAr ? 'الوحدة الأساسية' : 'Base Unit', value: item.base_uom_code ? `${item.base_uom_name || ''} (${item.base_uom_code})` : item.base_uom_name },
          { label: isAr ? 'وحدة الشراء' : 'Purchase Unit', value: item.purchase_uom_name },
          { label: isAr ? 'وحدة البيع' : 'Sales Unit', value: item.sales_uom_name },
        ],
      },
      {
        title: isAr ? 'التسعير والتكلفة' : 'Pricing & Costing',
        fields: [
          { label: isAr ? 'سعر التكلفة' : 'Standard Cost', value: fmtNum(item.standard_cost) },
          { label: isAr ? 'سعر البيع' : 'Selling Price', value: fmtNum(item.base_selling_price) },
          { label: isAr ? 'أقل سعر بيع' : 'Min Sell Price', value: fmtNum(item.min_selling_price) },
          { label: isAr ? 'آخر سعر شراء' : 'Last Purchase', value: fmtNum(item.last_purchase_cost) },
          { label: isAr ? 'متوسط التكلفة' : 'Average Cost', value: fmtNum(item.average_cost) },
          { label: isAr ? 'أقصى خصم' : 'Max Discount %', value: item.max_discount_percent != null ? `${item.max_discount_percent}%` : null },
          { label: isAr ? 'طريقة التقييم' : 'Valuation', value: item.valuation_method?.replace(/_/g, ' ').toUpperCase() },
        ],
      },
      {
        title: isAr ? 'المخزون' : 'Inventory Controls',
        fields: [
          { label: isAr ? 'سياسة التتبع' : 'Tracking Policy', value: item.tracking_policy },
          { label: isAr ? 'أقل مخزون' : 'Min Stock', value: fmtNum(item.min_stock_level, 0) },
          { label: isAr ? 'أعلى مخزون' : 'Max Stock', value: fmtNum(item.max_stock_level, 0) },
          { label: isAr ? 'حد إعادة الطلب' : 'Reorder Level', value: fmtNum(item.reorder_level, 0) },
          { label: isAr ? 'كمية إعادة الطلب' : 'Reorder Qty', value: fmtNum(item.reorder_qty, 0) },
          { label: isAr ? 'مهلة التوريد' : 'Lead Time', value: item.lead_time_days ? `${item.lead_time_days} ${isAr ? 'يوم' : 'days'}` : null },
        ],
      },
      {
        title: isAr ? 'المورد والتصنيع' : 'Vendor & Manufacturing',
        fields: [
          { label: isAr ? 'المورد' : 'Vendor', value: isAr ? item.default_vendor_name_ar : item.default_vendor_name },
          { label: isAr ? 'الشركة المصنعة' : 'Manufacturer', value: item.manufacturer },
          { label: isAr ? 'رقم القطعة' : 'Part No.', value: item.manufacturer_part_no },
          { label: isAr ? 'أقل كمية طلب' : 'Min Order Qty', value: item.min_order_qty ? String(item.min_order_qty) : null },
          { label: isAr ? 'الضمان' : 'Warranty', value: item.warranty_months ? `${item.warranty_months} ${isAr ? 'شهر' : 'months'}` : null },
        ],
      },
    ];

    // Agriculture section (only show if relevant data exists)
    if (item.expected_harvest_date || item.shelf_life_days || item.expiry_alert_days) {
      sections.push({
        title: isAr ? 'الحصاد والصلاحية' : 'Harvest & Shelf Life',
        fields: [
          { label: isAr ? 'موعد الحصاد' : 'Harvest Date', value: item.expected_harvest_date ? new Date(item.expected_harvest_date).toLocaleDateString() : null },
          { label: isAr ? 'مدة الصلاحية' : 'Shelf Life', value: item.shelf_life_days ? `${item.shelf_life_days} ${isAr ? 'يوم' : 'days'}` : null },
          { label: isAr ? 'تنبيه الانتهاء' : 'Expiry Alert', value: item.expiry_alert_days ? `${item.expiry_alert_days} ${isAr ? 'يوم قبل' : 'days before'}` : null },
        ],
      });
    }

    // Physical & Trade
    sections.push({
      title: isAr ? 'الفيزيائية والتجارية' : 'Physical & Trade',
      fields: [
        { label: isAr ? 'الوزن' : 'Weight', value: item.weight ? `${item.weight} kg` : null },
        { label: isAr ? 'الحجم' : 'Volume', value: item.volume ? String(item.volume) : null },
        { label: isAr ? 'الرمز الجمركي' : 'HS Code', value: item.hs_code },
        { label: isAr ? 'بلد المنشأ' : 'Country', value: item.country_name },
        { label: isAr ? 'شامل الضريبة' : 'Tax Inclusive', value: item.is_tax_inclusive ? '✔' : null },
      ],
    });

    // Settings & Metadata
    sections.push(
      {
        title: isAr ? 'الإعدادات' : 'Settings',
        fields: [
          { label: isAr ? 'الحالة' : 'Status', value: item.is_active ? '✔ ' + (isAr ? 'نشط' : 'Active') : '✖ ' + (isAr ? 'غير نشط' : 'Inactive') },
          { label: isAr ? 'صورة المنتج' : 'Image', value: item.image_url, type: 'link' as any },
        ],
      },
      {
        title: isAr ? 'البيانات الوصفية' : 'Metadata',
        fields: [
          { label: isAr ? 'تاريخ الإنشاء' : 'Created', value: item.created_at ? new Date(item.created_at).toLocaleString() : null },
          { label: isAr ? 'أنشئ بواسطة' : 'Created By', value: item.created_by_name },
          { label: isAr ? 'آخر تحديث' : 'Updated', value: item.updated_at ? new Date(item.updated_at).toLocaleString() : null },
          { label: isAr ? 'حُدث بواسطة' : 'Updated By', value: item.updated_by_name },
          { label: isAr ? 'حركات مخزنية' : 'Has Movements', value: item.has_movement ? '✔ ' + (isAr ? 'نعم' : 'Yes') : '✖ ' + (isAr ? 'لا' : 'No') },
        ],
      }
    );

    return sections;
  };

  // ════════════════════════════════════════════════════════════════════
  //  RELATIONS (linked records with navigation)
  // ════════════════════════════════════════════════════════════════════
  const buildRelations = (item: Item) => {
    const relations: Array<{ type: string; label: string; count: number; href?: string }> = [];

    // Barcodes
    relations.push({
      type: 'barcodes',
      label: isAr ? 'باركودات الصنف' : 'Item Barcodes',
      count: item.barcode ? 1 : 0,
      href: `/master/item-barcodes?item_id=${item.id}`,
    });

    // Unit conversions
    const uomCount = item.item_units?.length || 0;
    relations.push({
      type: 'uom_conversions',
      label: isAr ? 'تحويلات الوحدات' : 'Unit Conversions',
      count: uomCount,
    });

    // Group
    if (item.group_name || item.group_id) {
      relations.push({
        type: 'item_group',
        label: isAr ? 'مجموعة الصنف' : 'Item Group',
        count: 1,
        href: `/master/item-groups`,
      });
    }

    // Vendor
    if (item.default_vendor_name || item.default_vendor_id) {
      relations.push({
        type: 'vendor',
        label: isAr ? 'المورد' : 'Vendor',
        count: 1,
        href: `/master/vendors`,
      });
    }

    return relations;
  };

  // ════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      <EnterpriseMasterPage<Item>
        config={itemsConfig}
        buildDetailSections={buildDetailSections}
        buildRelations={buildRelations}
        renderFormSectionOverride={renderFormSectionOverride}
        formFooter={formFooter}
        transformBeforeSubmit={transformBeforeSubmit}
        transformAfterFetch={transformAfterFetch}
        onFieldChange={onFieldChange}
        onAfterSave={onAfterSave}
        onFormOpen={onFormOpen}
        onRelationClick={(rel, item) => {
          if (rel.type === 'barcodes') {
            setBarcodeDialogItem({
              id: item.id,
              code: item.code,
              name: isAr ? item.name_ar || item.name_en || item.name : item.name_en || item.name,
            });
            return true;
          }
          return false;
        }}
      />
      {barcodeDialogItem && (
        <ItemBarcodeDialog
          itemId={barcodeDialogItem.id}
          itemCode={barcodeDialogItem.code}
          itemName={barcodeDialogItem.name}
          isOpen={true}
          onClose={() => setBarcodeDialogItem(null)}
        />
      )}
    </>
  );
}

export default withPermission(MenuPermissions.MasterData.Items.View, ItemsPage);
