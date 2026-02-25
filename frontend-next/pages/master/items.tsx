/**
 *  ITEMS PAGE (Enterprise Edition)
 * ======================================
 *
 * Master data page for managing items / product catalog.
 * Uses EnterpriseMasterPage with itemsConfig for full governance.
 *
 * Features:
 * - Cascading group hierarchy (Main > Sub > Sub-Sub > Similar > Auxiliary)
 * - All dropdown fields are searchable (SearchableSelect)
 * - Multi-unit conversions management inline in form
 * - Detail sections: Identity, Classification, Units, Pricing,
 *                    Inventory, Physical & Trade, Settings, Metadata
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { itemsConfig, type Item } from '@/config/pages/master/items.config';
import { useTranslation } from '@/hooks/useTranslation';

// ─── Types ────────────────────────────────────────────────────────────
interface GroupOption {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  parent_group_id?: number | null;
  group_level_id?: number | null;
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

  // ─── State for raw group data (fetched once) ─────────────────────
  const [allGroups, setAllGroups] = useState<GroupOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<Array<{ value: number; label: string; labelAr?: string; code?: string; isBase?: boolean }>>([]);
  const [uomRows, setUomRows] = useState<UomConvRow[]>([]);

  // Fetch group hierarchy data once
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
              label: u.name_en || u.code,
              labelAr: u.name_ar,
              code: u.code,
              isBase: u.is_base === true,
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
        if (g.group_level_id !== levelId) return false;
        if (parentId !== undefined && parentId !== null) {
          return g.parent_group_id === parentId;
        }
        // For MAIN level, show groups with no parent or with null parent_group_id
        return levelId === LEVEL.MAIN ? (!g.parent_group_id) : true;
      });
    },
    [allGroups]
  );

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

  // ─── Helper: Format currency ─────────────────────────────────────
  const fmtNum = (v: any, decimals = 2) => {
    if (v == null || v === '' || v === 0) return null;
    return Number(v).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // ─── Classification section override ─────────────────────────────
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
      if (sectionKey !== 'classification') return undefined;

      const { apiSelectData, formErrors, submitting } = options;
      const loc = options.locale;
      const tr = options.t;

      // Get options for non-group fields from apiSelectData
      const typeOpts = apiSelectData['item_type_id'] || [];
      const gradeOpts = apiSelectData['item_grade_id'] || [];
      const policyOpts = apiSelectData['tracking_policy_id'] || [];

      // Group hierarchy options
      const mainGroups = toSelectOpts(getGroupsByLevel(LEVEL.MAIN));
      const subGroups = formData._main_group_id
        ? toSelectOpts(getGroupsByLevel(LEVEL.SUB, Number(formData._main_group_id)))
        : [];
      const subSubGroups = formData._sub_group_id
        ? toSelectOpts(getGroupsByLevel(LEVEL.SUB_SUB, Number(formData._sub_group_id)))
        : [];
      const similarGroups = formData._main_group_id
        ? toSelectOpts(getGroupsByLevel(LEVEL.SIMILAR, Number(formData._main_group_id)))
        : [];
      const auxiliaryGroups = formData._main_group_id
        ? toSelectOpts(getGroupsByLevel(LEVEL.AUXILIARY, Number(formData._main_group_id)))
        : [];

      const handleGroupChange = (level: string, value: string) => {
        const numVal = value ? Number(value) : '';
        setFormData((prev) => {
          const next = { ...prev };
          if (level === 'main') {
            next._main_group_id = numVal;
            next._sub_group_id = '';
            next._sub_sub_group_id = '';
            next._similar_group_id = '';
            next._auxiliary_group_id = '';
            // Set item_group_id to main group
            next.item_group_id = numVal;
          } else if (level === 'sub') {
            next._sub_group_id = numVal;
            next._sub_sub_group_id = '';
            // If sub selected, use it as item_group_id
            next.item_group_id = numVal || next._main_group_id;
          } else if (level === 'sub_sub') {
            next._sub_sub_group_id = numVal;
            // Deepest selected becomes item_group_id
            next.item_group_id = numVal || next._sub_group_id || next._main_group_id;
          } else if (level === 'similar') {
            next._similar_group_id = numVal;
          } else if (level === 'auxiliary') {
            next._auxiliary_group_id = numVal;
          }
          return next;
        });
      };

      return (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
            {tr('items.sections.classification', 'Classification')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Type */}
            <div>
              <SearchableSelect
                options={typeOpts}
                value={formData.item_type_id || ''}
                onChange={(v) => setFormData((p) => ({ ...p, item_type_id: v ? Number(v) : '' }))}
                placeholder={`${tr('common.select', 'Select')} ${tr('items.fields.itemType', 'Item Type')}...`}
                searchPlaceholder={tr('common.search', 'Search...')}
                label={tr('items.fields.itemType', 'Item Type')}
                locale={loc}
                disabled={submitting}
                error={formErrors.item_type_id}
              />
            </div>

            {/* Main Group (Required) */}
            <div>
              <SearchableSelect
                options={mainGroups}
                value={formData._main_group_id || ''}
                onChange={(v) => handleGroupChange('main', v)}
                placeholder={`${tr('common.select', 'Select')} ${tr('items.fields.mainGroup', 'Main Group')}...`}
                searchPlaceholder={tr('common.search', 'Search...')}
                label={tr('items.fields.mainGroup', 'Main Group')}
                required
                locale={loc}
                disabled={submitting}
                error={formErrors.item_group_id || formErrors._main_group_id}
              />
            </div>

            {/* Sub Group (optional, shows when main selected) */}
            {formData._main_group_id && subGroups.length > 0 && (
              <div>
                <SearchableSelect
                  options={subGroups}
                  value={formData._sub_group_id || ''}
                  onChange={(v) => handleGroupChange('sub', v)}
                  placeholder={`${tr('common.select', 'Select')} ${tr('items.fields.subGroup', 'Sub Group')}...`}
                  searchPlaceholder={tr('common.search', 'Search...')}
                  label={tr('items.fields.subGroup', 'Sub Group')}
                  locale={loc}
                  disabled={submitting}
                />
              </div>
            )}

            {/* Sub-Sub Group */}
            {formData._sub_group_id && subSubGroups.length > 0 && (
              <div>
                <SearchableSelect
                  options={subSubGroups}
                  value={formData._sub_sub_group_id || ''}
                  onChange={(v) => handleGroupChange('sub_sub', v)}
                  placeholder={`${tr('common.select', 'Select')} ${tr('items.fields.subSubGroup', 'Sub-Sub Group')}...`}
                  searchPlaceholder={tr('common.search', 'Search...')}
                  label={tr('items.fields.subSubGroup', 'Sub-Sub Group')}
                  locale={loc}
                  disabled={submitting}
                />
              </div>
            )}

            {/* Similar Group */}
            {formData._main_group_id && (
              <div>
                <SearchableSelect
                  options={similarGroups.length > 0 ? similarGroups : toSelectOpts(getGroupsByLevel(LEVEL.SIMILAR))}
                  value={formData._similar_group_id || ''}
                  onChange={(v) => handleGroupChange('similar', v)}
                  placeholder={`${tr('common.select', 'Select')} ${tr('items.fields.similarGroup', 'Similar Group')}...`}
                  searchPlaceholder={tr('common.search', 'Search...')}
                  label={tr('items.fields.similarGroup', 'Similar Group')}
                  locale={loc}
                  disabled={submitting}
                />
              </div>
            )}

            {/* Auxiliary Group */}
            {formData._main_group_id && (
              <div>
                <SearchableSelect
                  options={auxiliaryGroups.length > 0 ? auxiliaryGroups : toSelectOpts(getGroupsByLevel(LEVEL.AUXILIARY))}
                  value={formData._auxiliary_group_id || ''}
                  onChange={(v) => handleGroupChange('auxiliary', v)}
                  placeholder={`${tr('common.select', 'Select')} ${tr('items.fields.auxiliaryGroup', 'Auxiliary Group')}...`}
                  searchPlaceholder={tr('common.search', 'Search...')}
                  label={tr('items.fields.auxiliaryGroup', 'Auxiliary Group')}
                  locale={loc}
                  disabled={submitting}
                />
              </div>
            )}

            {/* Grade */}
            <div>
              <SearchableSelect
                options={gradeOpts}
                value={formData.item_grade_id || ''}
                onChange={(v) => setFormData((p) => ({ ...p, item_grade_id: v ? Number(v) : '' }))}
                placeholder={`${tr('common.select', 'Select')} ${tr('items.fields.itemGrade', 'Grade')}...`}
                searchPlaceholder={tr('common.search', 'Search...')}
                label={tr('items.fields.itemGrade', 'Grade')}
                locale={loc}
                disabled={submitting}
                error={formErrors.item_grade_id}
              />
            </div>

            {/* Tracking Policy */}
            <div>
              <SearchableSelect
                options={policyOpts}
                value={formData.tracking_policy_id || ''}
                onChange={(v) => setFormData((p) => ({ ...p, tracking_policy_id: v ? Number(v) : '' }))}
                placeholder={`${tr('common.select', 'Select')} ${tr('items.fields.trackingPolicy', 'Tracking Policy')}...`}
                searchPlaceholder={tr('common.search', 'Search...')}
                label={tr('items.fields.trackingPolicy', 'Tracking Policy')}
                locale={loc}
                disabled={submitting}
                error={formErrors.tracking_policy_id}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {tr('items.fields.trackingPolicyHelper', 'Locked after first transaction')}
              </p>
            </div>
          </div>
        </div>
      );
    },
    [allGroups, getGroupsByLevel, toSelectOpts]
  );

  // ─── onFormOpen: Load UOM rows for editing ────────────────────────
  const onFormOpen = useCallback(
    (record: Item | null) => {
      if (!record) {
        // Creating new item — clear UOM rows
        setUomRows([]);
        return;
      }
      // Editing — fetch existing UOM conversions for this item
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
            .filter((r: any) => !r.is_base) // exclude base unit
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

  // ─── onFieldChange: Resolve group hierarchy when editing ─────────
  const onFieldChange = useCallback(
    (key: string, value: any, formData: Record<string, any>, setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>) => {
      // When opening an edit record, resolve the item_group_id back to hierarchy
      // This is handled in transformBeforeSubmit and initial form load
    },
    []
  );

  // ─── Transform: populate _main_group_id etc. from item_group_id when editing
  const resolveGroupHierarchy = useCallback(
    (itemGroupId: number | null | undefined): Record<string, any> => {
      if (!itemGroupId || allGroups.length === 0) return {};
      const group = allGroups.find((g) => g.id === itemGroupId);
      if (!group) return { _main_group_id: itemGroupId };

      // Walk up the parent chain
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
        switch (g.group_level_id) {
          case LEVEL.MAIN: result._main_group_id = g.id; break;
          case LEVEL.SUB: result._sub_group_id = g.id; break;
          case LEVEL.SUB_SUB: result._sub_sub_group_id = g.id; break;
          case LEVEL.SIMILAR: result._similar_group_id = g.id; break;
          case LEVEL.AUXILIARY: result._auxiliary_group_id = g.id; break;
        }
      }
      return result;
    },
    [allGroups]
  );

  // ─── Form footer: Unit Conversions ───────────────────────────────
  const formFooter = useCallback(
    (isEditing: boolean, formData: Record<string, any>) => {
      if (!formData.base_uom_id) return null;
      const baseUomName = unitOptions.find((u) => u.value === Number(formData.base_uom_id));

      return (
        <div className="mt-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
            {t('items.sections.unitConversions', 'Unit Conversions')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {locale === 'ar'
              ? `الوحدة الأساسية: ${baseUomName?.labelAr || baseUomName?.label || '—'} (معامل = 1)`
              : `Base unit: ${baseUomName?.label || '—'} (factor = 1)`}
          </p>

          {/* Existing rows */}
          {uomRows.map((row, idx) => (
            <div key={idx} className="flex items-end gap-3 mb-3">
              <div className="flex-1">
                <SearchableSelect
                  options={unitOptions.filter((u) => !u.isBase && u.value !== Number(formData.base_uom_id))}
                  value={row.uom_id}
                  onChange={(v) => {
                    setUomRows((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], uom_id: v ? Number(v) : '' };
                      return next;
                    });
                  }}
                  label={idx === 0 ? (locale === 'ar' ? 'الوحدة' : 'Unit') : undefined}
                  placeholder={locale === 'ar' ? 'اختر وحدة...' : 'Select unit...'}
                  searchPlaceholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                  locale={locale}
                />
              </div>
              <div className="w-32">
                <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${idx > 0 ? 'sr-only' : ''}`}>
                  {locale === 'ar' ? 'المعامل' : 'Factor'}
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
                  placeholder="e.g. 12"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setUomRows((prev) => prev.filter((_, i) => i !== idx))}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mb-0.5"
                title={locale === 'ar' ? 'حذف' : 'Remove'}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            onClick={() => setUomRows((prev) => [...prev, { uom_id: '', conversion_factor: '', is_active: true }])}
            className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'إضافة وحدة تحويل' : 'Add Unit Conversion'}
          </button>
        </div>
      );
    },
    [t, locale, unitOptions, uomRows]
  );

  // ─── transformBeforeSubmit: inject group hierarchy + uom rows ────
  const transformBeforeSubmit = useCallback(
    (data: Record<string, any>, isEditing: boolean) => {
      // Remove internal hierarchy fields
      const payload = { ...data };
      delete payload._main_group_id;
      delete payload._sub_group_id;
      delete payload._sub_sub_group_id;
      delete payload._similar_group_id;
      delete payload._auxiliary_group_id;
      // _uom_rows are saved separately via onAfterSave

      return payload;
    },
    []
  );

  // ─── onAfterSave: persist UOM conversion rows ───────────────────
  const onAfterSave = useCallback(
    async (savedData: any, isEditing: boolean) => {
      const itemId = savedData?.id;
      if (!itemId) return;
      const validUoms = uomRows.filter(
        (r) => r.uom_id && r.conversion_factor && Number(r.conversion_factor) > 0
      );
      // Always call the endpoint (even with 0 rows, to clear deleted conversions)
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

  // ─── transformAfterFetch: Inject hierarchy fields on record load
  const transformAfterFetch = useCallback(
    (data: Item[]) => {
      // Enrich each item with hierarchy for proper editing
      return data.map((item) => {
        const hierarchy = resolveGroupHierarchy(item.item_group_id);
        return { ...item, ...hierarchy };
      });
    },
    [resolveGroupHierarchy]
  );

  //  DETAIL SECTIONS 

  const buildDetailSections = (item: Item) => [
    {
      title: 'Identity',
      fields: [
        { label: 'Code', value: item.code },
        { label: 'SKU', value: item.sku },
        { label: 'Barcode', value: item.barcode },
        { label: 'Name (EN)', value: item.name_en || item.name },
        { label: 'Name (AR)', value: item.name_ar },
        { label: 'Short Name', value: item.short_name },
        { label: 'Description', value: item.description || item.description_en },
        { label: 'Description (AR)', value: item.description_ar },
      ],
    },
    {
      title: 'Classification',
      fields: [
        { label: 'Item Type', value: item.item_type_name || item.item_type },
        { label: 'Item Group', value: item.item_group_name_en || item.item_group_name },
        { label: 'Grade', value: item.item_grade_name_en || item.item_grade_name },
        { label: 'Tracking Policy', value: item.tracking_policy_name || item.tracking_policy },
        { label: 'Stockable', value: item.is_stockable ? '\u2714 Yes' : '\u2716 No' },
        { label: 'Purchasable', value: item.is_purchasable ? '\u2714 Yes' : '\u2716 No' },
        { label: 'Sellable', value: item.is_sellable ? '\u2714 Yes' : '\u2716 No' },
      ],
    },
    {
      title: 'Units of Measure',
      fields: [
        { label: 'Base Unit', value: item.base_uom_code ? `${item.base_uom_name || ''} (${item.base_uom_code})` : item.base_uom_name },
        { label: 'Purchase Unit', value: item.purchase_uom_code ? `${item.purchase_uom_name || ''} (${item.purchase_uom_code})` : item.purchase_uom_name },
        { label: 'Sales Unit', value: item.sales_uom_code ? `${item.sales_uom_name || ''} (${item.sales_uom_code})` : item.sales_uom_name },
      ],
    },
    {
      title: 'Pricing & Costing',
      fields: [
        { label: 'Base Selling Price', value: fmtNum(item.base_selling_price) },
        { label: 'Min Selling Price', value: fmtNum(item.min_selling_price) },
        { label: 'Max Discount %', value: item.max_discount_percent != null ? `${item.max_discount_percent}%` : null },
        { label: 'Standard Cost', value: fmtNum(item.standard_cost) },
        { label: 'Last Purchase Cost', value: fmtNum(item.last_purchase_cost) },
        { label: 'Average Cost', value: fmtNum(item.average_cost) },
        { label: 'Valuation Method', value: item.valuation_method?.replace(/_/g, ' ').toUpperCase() },
        { label: 'Costing Method', value: item.costing_method?.replace(/_/g, ' ').toUpperCase() },
      ],
    },
    {
      title: 'Inventory Controls',
      fields: [
        { label: 'Track Inventory', value: item.track_inventory ? '\u2714 Yes' : '\u2716 No' },
        { label: 'Allow Negative', value: item.allow_negative_stock ? '\u26A0 Yes' : 'No' },
        { label: 'Min Stock Level', value: fmtNum(item.min_stock_level, 0) },
        { label: 'Max Stock Level', value: fmtNum(item.max_stock_level, 0) },
        { label: 'Reorder Level', value: fmtNum(item.reorder_level, 0) },
        { label: 'Reorder Qty', value: fmtNum(item.reorder_qty, 0) },
        { label: 'Lead Time (days)', value: item.lead_time_days != null && item.lead_time_days > 0 ? `${item.lead_time_days} days` : null },
      ],
    },
    {
      title: 'Physical & Trade',
      fields: [
        { label: 'Weight', value: item.weight ? String(item.weight) : null },
        { label: 'Volume', value: item.volume ? String(item.volume) : null },
        { label: 'HS Code', value: item.hs_code },
        { label: 'Country of Origin', value: item.country_of_origin },
        { label: 'Tax Category', value: item.tax_category },
        { label: 'Tax Inclusive', value: item.is_tax_inclusive ? '\u2714 Yes' : 'No' },
        { label: 'Shelf Life', value: item.shelf_life_days ? `${item.shelf_life_days} days` : null },
        { label: 'Expiry Alert', value: item.expiry_alert_days ? `${item.expiry_alert_days} days before` : null },
        { label: 'Manufacturer', value: item.manufacturer },
        { label: 'Part No.', value: item.manufacturer_part_no },
        { label: 'Warranty', value: item.warranty_months ? `${item.warranty_months} months` : null },
      ],
    },
    {
      title: 'Settings',
      fields: [
        { label: 'Active', value: item.is_active ? '\u2714 Active' : '\u2716 Inactive' },
        { label: 'Vendor', value: item.default_vendor_name },
        { label: 'Image', value: item.image_url },
      ],
    },
    {
      title: 'Metadata',
      fields: [
        { label: 'Created', value: item.created_at ? new Date(item.created_at).toLocaleString() : null },
        { label: 'Created By', value: item.created_by_name },
        { label: 'Updated', value: item.updated_at ? new Date(item.updated_at).toLocaleString() : null },
        { label: 'Updated By', value: item.updated_by_name },
      ],
    },
  ];

  //  RELATIONS (item_units sub-table) 

  const buildRelations = (item: Item) => {
    const relations: any[] = [];

    if (item.item_units && item.item_units.length > 0) {
      relations.push({
        key: 'item_units',
        title: 'Unit Conversions',
        titleKey: 'items.sections.unitConversions',
        columns: [
          { key: 'unit_code', label: 'Unit Code' },
          { key: 'unit_name', label: 'Unit Name' },
          { key: 'conversion_factor', label: 'Factor', render: (v: number) => v?.toLocaleString() },
          { key: 'is_base', label: 'Base', render: (v: boolean) => v ? '\u2605' : '' },
          { key: 'barcode', label: 'Barcode' },
          { key: 'purchase_price', label: 'Purchase Price', render: (v: any) => v ? Number(v).toFixed(2) : '\u2014' },
          { key: 'sales_price', label: 'Sales Price', render: (v: any) => v ? Number(v).toFixed(2) : '\u2014' },
          { key: 'is_active', label: 'Active', render: (v: boolean) => v ? 'Yes' : 'No' },
        ],
        data: item.item_units,
      });
    }

    return relations;
  };

  return (
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
    />
  );
}

export default withPermission(MenuPermissions.MasterData.Items.View, ItemsPage);
