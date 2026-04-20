/**
 * 📦 PROFESSIONAL LINE ITEMS TABLE
 * ==================================
 * Enterprise-grade line items editor for Purchase Orders.
 *
 * Features:
 * ✅ Professional card-based layout with gradient accents
 * ✅ Inline editing with smart auto-calculation
 * ✅ Add / Delete / Clone / Reorder rows
 * ✅ Item search via SearchableSelect (supports all items)
 * ✅ Scoped UOM dropdown per item
 * ✅ Dual pricing: edit unit price OR line total
 * ✅ Expandable row for notes / HS Code / warehouse
 * ✅ Full RTL (Arabic) support
 * ✅ Professional summary footer with currency
 */

import { Fragment, useState, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';
import SearchableSelect from '../ui/SearchableSelect';
import clsx from 'clsx';

export interface LineItem {
  id?: number;
  temp_id?: string;
  line_number: number;
  item_id: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  uom_id: number;
  uom_code?: string;
  uom_name?: string;
  ordered_qty: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate_id?: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  pricing_mode?: 'unit' | 'total';
  hs_code?: string;
  warehouse_id?: number;
  notes?: string;
}

interface ItemOption {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  base_uom_id?: number;
  base_uom_code?: string;
  base_uom_name?: string;
  purchase_price?: number;
  tax_rate_id?: number;
  default_tax_rate?: number;
  uoms?: Array<{
    uom_id: number;
    uom_code?: string;
    uom_name?: string;
    code?: string;
    name?: string;
    name_ar?: string;
    conversion_factor?: number;
    is_base_uom?: boolean;
    is_active?: boolean;
  }>;
}

interface UomOption {
  id: number;
  code: string;
  name: string;
}

interface TaxRateOption {
  id: number;
  code: string;
  name: string;
  rate: number;
}

interface LineItemsTableProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  itemOptions: ItemOption[];
  uomOptions: UomOption[];
  taxRateOptions: TaxRateOption[];
  currencySymbol?: string;
  locale?: 'en' | 'ar';
  readOnly?: boolean;
  showHsCode?: boolean;
  showWarehouse?: boolean;
  showNotes?: boolean;
  errors?: Record<string, string>;
}

const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function LineItemsTable({
  items,
  onChange,
  itemOptions,
  uomOptions,
  taxRateOptions,
  currencySymbol = 'SAR',
  locale = 'en',
  readOnly = false,
  showHsCode = false,
  showWarehouse = false,
  showNotes = false,
  errors,
}: LineItemsTableProps) {
  const isRtl = locale === 'ar';
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [rawInputs, setRawInputs] = useState<Record<string, Partial<Record<'ordered_qty' | 'unit_price' | 'discount_percent' | 'line_total', string>>>>({});

  const getRowKey = (item: LineItem, index: number) => String(item.id ?? item.temp_id ?? index);

  const setRaw = (key: string, field: 'ordered_qty' | 'unit_price' | 'discount_percent' | 'line_total', value: string) => {
    setRawInputs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  const clearRaw = (key: string, field: 'ordered_qty' | 'unit_price' | 'discount_percent' | 'line_total') => {
    setRawInputs((prev) => {
      const existing = prev[key];
      if (!existing || existing[field] == null) return prev;
      const nextRow = { ...existing };
      delete (nextRow as any)[field];
      const next = { ...prev };
      if (Object.keys(nextRow).length === 0) delete (next as any)[key];
      else (next as any)[key] = nextRow;
      return next;
    });
  };

  const parseDecimal = (raw: string): number | null => {
    const s0 = String(raw ?? '').trim();
    if (!s0) return null;

    // Normalize Arabic decimal/thousand separators:
    // - decimal: ? actually Arabic decimal separator is \u066B (٫)
    // - thousand: \u066C (٬)
    let normalized = s0
      .replace(/\s/g, '')
      .replace(/\u066C/g, '')
      .replace(/\u066B/g, '.')
      .replace(/,/g, '.');

    // Allow leading decimal like .5
    if (normalized.startsWith('.')) normalized = `0${normalized}`;
    if (normalized === '.' || normalized === '-' || normalized === '-.') return null;
    if (normalized.endsWith('.') && normalized.length > 1) {
      normalized = normalized.slice(0, -1);
    }

    // Keep only digits, dot, minus
    normalized = normalized.replace(/[^0-9.\-]/g, '');

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const itemSelectOptions = useMemo(
    () =>
      (itemOptions || []).map((opt) => ({
        value: opt.id,
        code: opt.code,
        label: opt.name,
        labelAr: opt.name_ar,
        searchText: [opt.code, opt.name, opt.name_ar].filter(Boolean).join(' '),
      })),
    [itemOptions]
  );

  const computeUnitPriceFromTotal = (params: {
    targetTotal: number;
    qty: number;
    discountPercent: number;
    taxRate: number;
  }) => {
    const { targetTotal, qty, discountPercent, taxRate } = params;
    if (!qty || qty <= 0) return 0;

    const discountFactor = 1 - (discountPercent || 0) / 100;
    const taxFactor = 1 + (taxRate || 0) / 100;
    const denom = qty * discountFactor * taxFactor;
    if (!denom || denom <= 0) return 0;
    return targetTotal / denom;
  };

  // Calculate line item
  const calculateLine = useCallback((item: Partial<LineItem>): LineItem => {
    const qty = Number(item.ordered_qty) || 0;
    const price = Number(item.unit_price) || 0;
    const discountPercent = Number(item.discount_percent) || 0;
    const taxRate = Number(item.tax_rate) || 0;

    const subtotal = qty * price;
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const lineTotal = afterDiscount + taxAmount;

    return {
      ...item,
      line_number: item.line_number || 1,
      item_id: item.item_id || 0,
      item_code: item.item_code || '',
      item_name: item.item_name || '',
      uom_id: item.uom_id || 0,
      ordered_qty: qty,
      unit_price: price,
      discount_percent: discountPercent,
      discount_amount: Math.round(discountAmount * 100) / 100,
      tax_rate: taxRate,
      tax_amount: Math.round(taxAmount * 100) / 100,
      line_total: Math.round(lineTotal * 100) / 100,
    } as LineItem;
  }, []);

  // Add new row
  const addRow = useCallback(() => {
    const newItem: LineItem = {
      temp_id: generateTempId(),
      line_number: items.length + 1,
      item_id: 0,
      item_code: '',
      item_name: '',
      uom_id: 0,
      ordered_qty: 1,
      unit_price: 0,
      discount_percent: 0,
      discount_amount: 0,
      tax_rate: 0,
      tax_amount: 0,
      line_total: 0,
    };
    onChange([...items, newItem]);
  }, [items, onChange]);

  // Delete row
  const deleteRow = useCallback((index: number) => {
    const newItems = items.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      line_number: i + 1,
    }));
    onChange(newItems);
  }, [items, onChange]);

  // Clone row
  const cloneRow = useCallback((index: number) => {
    const itemToClone = items[index];
    const clonedItem: LineItem = {
      ...itemToClone,
      id: undefined,
      temp_id: generateTempId(),
      line_number: items.length + 1,
    };
    onChange([...items, clonedItem]);
  }, [items, onChange]);

  // Move row up
  const moveRowUp = useCallback((index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(newItems.map((item, i) => ({ ...item, line_number: i + 1 })));
  }, [items, onChange]);

  // Move row down
  const moveRowDown = useCallback((index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(newItems.map((item, i) => ({ ...item, line_number: i + 1 })));
  }, [items, onChange]);

  // Update row
  const updateRow = useCallback((index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    let updatedItem = { ...newItems[index], [field]: value };
    // Smooth pricing: if user edits line_total, derive unit_price from it.
    if (field === 'line_total') {
      const targetTotal = Number(value) || 0;
      const qty = Number(updatedItem.ordered_qty) || 0;
      const discountPercent = Number(updatedItem.discount_percent) || 0;
      const taxRate = Number(updatedItem.tax_rate) || 0;
      const derivedUnitPrice = computeUnitPriceFromTotal({
        targetTotal,
        qty,
        discountPercent,
        taxRate,
      });
      updatedItem = {
        ...updatedItem,
        pricing_mode: 'total',
        unit_price: derivedUnitPrice,
      };
    }

    // If qty changes and we're in total mode, keep total approximately constant.
    if (field === 'ordered_qty' && updatedItem.pricing_mode === 'total') {
      const targetTotal = Number(updatedItem.line_total) || 0;
      const qty = Number(value) || 0;
      const discountPercent = Number(updatedItem.discount_percent) || 0;
      const taxRate = Number(updatedItem.tax_rate) || 0;
      const derivedUnitPrice = computeUnitPriceFromTotal({
        targetTotal,
        qty,
        discountPercent,
        taxRate,
      });
      updatedItem = {
        ...updatedItem,
        unit_price: derivedUnitPrice,
      };
    }

    if (field === 'unit_price') {
      updatedItem = { ...updatedItem, pricing_mode: 'unit' };
    }

    const getItemUoms = (selected?: ItemOption | undefined): UomOption[] => {
      const uoms = selected?.uoms || [];
      const mapped = uoms
        .filter((u) => (u.is_active ?? true) !== false)
        .map((u) => ({
          id: Number((u as any).uom_id ?? (u as any).id),
          code: String(u.uom_code ?? u.code ?? ''),
          name: String(u.uom_name ?? u.name ?? ''),
        }))
        .filter((u) => u.id && u.code);

      // Deduplicate by id
      const byId = new Map<number, UomOption>();
      for (const u of mapped) byId.set(u.id, u);
      return Array.from(byId.values());
    };

    // If item changed, populate defaults
    if (field === 'item_id' && value) {
      const selectedItem = itemOptions.find((i) => i.id === Number(value));
      if (selectedItem) {
        const scopedUoms = getItemUoms(selectedItem);
        const preferredUomId =
          selectedItem.base_uom_id ||
          scopedUoms[0]?.id ||
          updatedItem.uom_id;

        const preferredUom = scopedUoms.find((u) => u.id === Number(preferredUomId));

        updatedItem = {
          ...updatedItem,
          item_code: selectedItem.code,
          item_name: selectedItem.name,
          item_name_ar: selectedItem.name_ar,
          uom_id: Number(preferredUomId) || 0,
          uom_code: preferredUom?.code || selectedItem.base_uom_code || updatedItem.uom_code,
          uom_name: preferredUom?.name || selectedItem.base_uom_name || updatedItem.uom_name,
          unit_price: selectedItem.purchase_price || updatedItem.unit_price,
          tax_rate_id: selectedItem.tax_rate_id,
          tax_rate: selectedItem.default_tax_rate || 0,
        };
      }
    }

    // If tax rate changed
    if (field === 'tax_rate_id' && value) {
      const selectedTax = taxRateOptions.find((t) => t.id === Number(value));
      if (selectedTax) {
        updatedItem = { ...updatedItem, tax_rate: selectedTax.rate };
      }
    }

    // If UOM changed, keep uom_code in sync
    if (field === 'uom_id') {
      const selectedItem = updatedItem.item_id
        ? itemOptions.find((i) => i.id === Number(updatedItem.item_id))
        : undefined;
      const scopedUoms = getItemUoms(selectedItem);
      const selectedUom =
        scopedUoms.find((u) => u.id === Number(value)) ||
        uomOptions.find((u) => u.id === Number(value));

      if (selectedUom?.code) {
        updatedItem = { ...updatedItem, uom_code: selectedUom.code, uom_name: selectedUom.name };
      }
    }

    // Recalculate
    newItems[index] = calculateLine(updatedItem);
    onChange(newItems);
  }, [items, itemOptions, uomOptions, taxRateOptions, calculateLine, onChange]);

  // Toggle expanded row
  const toggleExpanded = useCallback((key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  }, [expandedRows]);

  // Calculate totals
  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + (item.ordered_qty * item.unit_price),
        discount: acc.discount + item.discount_amount,
        tax: acc.tax + item.tax_amount,
        total: acc.total + item.line_total,
        qty: acc.qty + item.ordered_qty,
      }),
      { subtotal: 0, discount: 0, tax: 0, total: 0, qty: 0 }
    );
  }, [items]);

  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: 4,
    }).format(num);
  };

  const t = {
    line: '#',
    item: isRtl ? 'الصنف' : 'Item',
    uom: isRtl ? 'الوحدة' : 'UOM',
    qty: isRtl ? 'الكمية' : 'Qty',
    price: isRtl ? 'سعر الوحدة' : 'Unit Price',
    discount: isRtl ? 'خصم %' : 'Disc %',
    tax: isRtl ? 'ضريبة' : 'Tax',
    total: isRtl ? 'الإجمالي' : 'Total',
    actions: '',
    addItem: isRtl ? 'إضافة صنف' : 'Add Item',
    subtotal: isRtl ? 'المجموع الفرعي' : 'Subtotal',
    discountTotal: isRtl ? 'إجمالي الخصم' : 'Total Discount',
    taxTotal: isRtl ? 'إجمالي الضريبة' : 'Total Tax',
    grandTotal: isRtl ? 'الإجمالي الكلي' : 'Grand Total',
    totalQty: isRtl ? 'إجمالي الكمية' : 'Total Qty',
    totalItems: isRtl ? 'عدد البنود' : 'Items',
    selectItem: isRtl ? 'بحث عن صنف بالاسم أو الكود...' : 'Search by item name or code...',
    noItems: isRtl ? 'لا توجد بنود — اضغط "إضافة صنف" للبدء' : 'No items yet — click "Add Item" to start',
    hsCode: isRtl ? 'رمز النظام المنسق' : 'HS Code',
    notes: isRtl ? 'ملاحظات' : 'Notes',
    moreDetails: isRtl ? 'تفاصيل إضافية' : 'More details',
  };

  /* ── Styled numeric input ─── */
  const NumInput = ({
    item,
    index,
    field,
    className = '',
    placeholder = '',
    title = '',
  }: {
    item: LineItem;
    index: number;
    field: 'ordered_qty' | 'unit_price' | 'discount_percent' | 'line_total';
    className?: string;
    placeholder?: string;
    title?: string;
  }) => {
    const key = getRowKey(item, index);
    return (
      <input
        type="text"
        inputMode="decimal"
        value={rawInputs[key]?.[field] ?? String((item as any)[field] ?? '')}
        onChange={(e) => {
          const raw = e.target.value;
          setRaw(key, field, raw);
          const parsed = parseDecimal(raw);
          if (parsed != null) updateRow(index, field, parsed);
        }}
        onBlur={() => {
          const raw = rawInputs[key]?.[field];
          if (raw == null) return;
          const parsed = parseDecimal(raw);
          updateRow(index, field, parsed ?? 0);
          clearRaw(key, field);
        }}
        placeholder={placeholder}
        title={title}
        className={clsx(
          'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm',
          'focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:ring-blue-400/30 dark:focus:border-blue-400',
          'transition-all duration-150 text-slate-800 dark:text-slate-200',
          className
        )}
      />
    );
  };

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Header bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <ShoppingCartIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t.totalItems}: <span className="text-blue-600 dark:text-blue-400">{items.length}</span>
          </span>
          {items.length > 0 && (
            <>
              <span className="text-xs text-slate-400 dark:text-slate-500 mx-2">|</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {t.totalQty}: <span className="font-medium text-slate-700 dark:text-slate-300">{formatNumber(totals.qty, 0)}</span>
              </span>
            </>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={addRow}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm',
              'hover:from-blue-700 hover:to-indigo-700 hover:shadow-md',
              'active:scale-[0.98]'
            )}
          >
            <PlusIcon className="h-4 w-4" />
            {t.addItem}
          </button>
        )}
      </div>

      {/* ── Error ─── */}
      {errors?.items && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          {errors.items}
        </div>
      )}

      {/* ── Empty state ─── */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 mb-4">
            <CubeIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.noItems}</p>
          {!readOnly && (
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              {t.addItem}
            </button>
          )}
        </div>
      ) : (
      /* ── Table ─── */
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full">
            {/* ── Header ─── */}
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/80">
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-12">
                  {t.line}
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-start min-w-[320px]">
                  {t.item}
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-[120px]">
                  {t.uom}
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-[130px]">
                  {t.qty}
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-[150px]">
                  {t.price}
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-[110px]">
                  {t.discount}
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-[110px]">
                  {t.tax}
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-end w-[160px]">
                  {t.total}
                </th>
                {!readOnly && (
                  <th className="px-2 py-3 w-[130px]" />
                )}
              </tr>
            </thead>
            {/* ── Body ─── */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {items.map((item, index) => {
                const rowKey = item.id?.toString() || item.temp_id || `row-${index}`;
                const isExpanded = expandedRows.has(rowKey);
                const isEven = index % 2 === 0;

                const selectedItem = item.item_id
                  ? itemOptions.find((i) => i.id === Number(item.item_id))
                  : undefined;

                const scopedUoms: UomOption[] = (selectedItem?.uoms || [])
                  .filter((u) => (u.is_active ?? true) !== false)
                  .map((u) => ({
                    id: Number((u as any).uom_id ?? (u as any).id),
                    code: String(u.uom_code ?? u.code ?? ''),
                    name: String(u.uom_name ?? u.name ?? ''),
                  }))
                  .filter((u) => u.id && u.code);

                const scopedUomMap = new Map<number, UomOption>();
                for (const u of scopedUoms) scopedUomMap.set(u.id, u);
                const rowUoms = scopedUomMap.size ? Array.from(scopedUomMap.values()) : uomOptions;

                return (
                  <Fragment key={rowKey}>
                    <tr
                      className={clsx(
                        'group transition-colors duration-100',
                        isEven
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-slate-50/50 dark:bg-slate-800/30',
                        'hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                      )}
                    >
                      {/* Line Number */}
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {item.line_number}
                        </span>
                      </td>

                      {/* Item Select */}
                      <td className="px-3 py-3">
                        {readOnly ? (
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                              {isRtl && item.item_name_ar ? item.item_name_ar : item.item_name}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">{item.item_code}</div>
                          </div>
                        ) : (
                          <SearchableSelect
                            options={itemSelectOptions}
                            value={item.item_id || ''}
                            onChange={(v) => updateRow(index, 'item_id', Number(v))}
                            placeholder={t.selectItem}
                            searchPlaceholder={isRtl ? 'بحث بالاسم أو الكود...' : 'Search name or code...'}
                            locale={locale}
                          />
                        )}
                      </td>

                      {/* UOM */}
                      <td className="px-3 py-3">
                        {readOnly ? (
                          <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                            {item.uom_code || item.uom_name || '—'}
                          </span>
                        ) : (
                          <select
                            value={item.uom_id || ''}
                            onChange={(e) => updateRow(index, 'uom_id', Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                          >
                            <option value="">—</option>
                            {rowUoms.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.code || opt.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-3">
                        {readOnly ? (
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 text-center block">{formatNumber(item.ordered_qty)}</span>
                        ) : (
                          <NumInput item={item} index={index} field="ordered_qty" className="text-center" />
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-3">
                        {readOnly ? (
                          <span className="text-sm text-slate-700 dark:text-slate-300 text-center block">{formatNumber(item.unit_price)}</span>
                        ) : (
                          <NumInput item={item} index={index} field="unit_price" className="text-center" />
                        )}
                      </td>

                      {/* Discount % */}
                      <td className="px-3 py-3">
                        {readOnly ? (
                          <span className="text-sm text-slate-500 dark:text-slate-400 text-center block">{item.discount_percent}%</span>
                        ) : (
                          <NumInput item={item} index={index} field="discount_percent" className="text-center" placeholder="0" />
                        )}
                      </td>

                      {/* Tax */}
                      <td className="px-3 py-3">
                        {readOnly ? (
                          <span className="text-sm text-slate-500 dark:text-slate-400 text-center block">{item.tax_rate}%</span>
                        ) : (
                          <select
                            value={item.tax_rate_id || ''}
                            onChange={(e) => updateRow(index, 'tax_rate_id', Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                          >
                            <option value="">0%</option>
                            {taxRateOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.rate}%
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Line Total */}
                      <td className="px-3 py-3">
                        {readOnly ? (
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 text-end block">
                            {formatNumber(item.line_total)}
                          </span>
                        ) : (
                          <NumInput
                            item={item}
                            index={index}
                            field="line_total"
                            className="text-end font-medium"
                            title={isRtl ? 'اكتب الإجمالي وسيتم حساب سعر الوحدة' : 'Enter total to auto-calc unit price'}
                          />
                        )}
                      </td>

                      {/* Actions */}
                      {!readOnly && (
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => toggleExpanded(rowKey)}
                              className={clsx('p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors', isExpanded && 'bg-slate-200 dark:bg-slate-700 text-blue-600 dark:text-blue-400')}
                              title={t.moreDetails}>
                              <ChevronRightIcon className={clsx('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')} />
                            </button>
                            <button type="button" onClick={() => moveRowUp(index)} disabled={index === 0}
                              className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-20 transition-colors"
                              title="Move Up">
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => moveRowDown(index)} disabled={index === items.length - 1}
                              className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-20 transition-colors"
                              title="Move Down">
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => cloneRow(index)}
                              className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Clone">
                              <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => deleteRow(index)}
                              className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete">
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr className={clsx(isEven ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-blue-50/40 dark:bg-blue-900/15')}>
                        <td colSpan={readOnly ? 8 : 9} className="px-4 py-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {showHsCode && (
                              <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t.hsCode}</label>
                                <input
                                  type="text"
                                  value={item.hs_code || ''}
                                  onChange={(e) => updateRow(index, 'hs_code', e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                  disabled={readOnly}
                                />
                              </div>
                            )}
                            {showNotes && (
                              <div className={clsx(showHsCode ? 'sm:col-span-2' : 'sm:col-span-3')}>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t.notes}</label>
                                <input
                                  type="text"
                                  value={item.notes || ''}
                                  onChange={(e) => updateRow(index, 'notes', e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                  disabled={readOnly}
                                  placeholder={isRtl ? 'أدخل ملاحظات لهذا البند...' : 'Enter notes for this line item...'}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>

            {/* ── Summary Footer ─── */}
            <tfoot>
              {/* Subtotal */}
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-600">
                <td colSpan={readOnly ? 5 : 6} className="px-4 py-2.5 text-end">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.subtotal}</span>
                </td>
                <td colSpan={readOnly ? 3 : 3} className="px-4 py-2.5 text-end">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {currencySymbol} {formatNumber(totals.subtotal)}
                  </span>
                </td>
              </tr>

              {/* Discount */}
              {totals.discount > 0 && (
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td colSpan={readOnly ? 5 : 6} className="px-4 py-2 text-end">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{t.discountTotal}</span>
                  </td>
                  <td colSpan={readOnly ? 3 : 3} className="px-4 py-2 text-end">
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      -{currencySymbol} {formatNumber(totals.discount)}
                    </span>
                  </td>
                </tr>
              )}

              {/* Tax */}
              {totals.tax > 0 && (
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td colSpan={readOnly ? 5 : 6} className="px-4 py-2 text-end">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{t.taxTotal}</span>
                  </td>
                  <td colSpan={readOnly ? 3 : 3} className="px-4 py-2 text-end">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {currencySymbol} {formatNumber(totals.tax)}
                    </span>
                  </td>
                </tr>
              )}

              {/* Grand Total */}
              <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-t-2 border-blue-200 dark:border-blue-700">
                <td colSpan={readOnly ? 5 : 6} className="px-4 py-3 text-end">
                  <span className="flex items-center justify-end gap-2">
                    <CalculatorIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{t.grandTotal}</span>
                  </span>
                </td>
                <td colSpan={readOnly ? 3 : 3} className="px-4 py-3 text-end">
                  <span className="text-base font-bold text-blue-700 dark:text-blue-300">
                    {currencySymbol} {formatNumber(totals.total)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}

      {/* ── Add button below table ─── */}
      {!readOnly && items.length > 0 && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t.addItem}
          </button>
        </div>
      )}
    </div>
  );
}
