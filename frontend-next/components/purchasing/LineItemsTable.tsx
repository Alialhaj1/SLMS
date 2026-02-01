/**
 * 📦 PURCHASE ORDER LINE ITEMS TABLE
 * ===================================
 * Dynamic line items table with auto-calculations
 * 
 * Features:
 * ✅ Add/Edit/Delete/Clone rows
 * ✅ Auto calculate: Qty × Price = Amount
 * ✅ Auto subtotal/tax/total
 * ✅ Item search/select
 * ✅ RTL support
 */

import { Fragment, useState, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
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
        updatedItem = { ...updatedItem, uom_code: selectedUom.code };
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  };

  const t = {
    line: isRtl ? '#' : '#',
    item: isRtl ? 'الصنف' : 'Item',
    uom: isRtl ? 'الوحدة' : 'UOM',
    qty: isRtl ? 'الكمية' : 'Qty',
    price: isRtl ? 'السعر' : 'Price',
    discount: isRtl ? 'خصم %' : 'Disc %',
    tax: isRtl ? 'ضريبة' : 'Tax',
    total: isRtl ? 'الإجمالي' : 'Total',
    actions: isRtl ? 'إجراءات' : 'Actions',
    addItem: isRtl ? 'إضافة صنف' : 'Add Item',
    subtotal: isRtl ? 'المجموع الفرعي' : 'Subtotal',
    discountTotal: isRtl ? 'إجمالي الخصم' : 'Total Discount',
    taxTotal: isRtl ? 'إجمالي الضريبة' : 'Total Tax',
    grandTotal: isRtl ? 'الإجمالي العام' : 'Grand Total',
    totalQty: isRtl ? 'إجمالي الكمية' : 'Total Qty',
    selectItem: isRtl ? 'اختر صنف...' : 'Select item...',
    noItems: isRtl ? 'لا توجد بنود' : 'No items added',
    hsCode: isRtl ? 'رمز النظام المنسق' : 'HS Code',
    notes: isRtl ? 'ملاحظات' : 'Notes',
  };

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-12">
                {t.line}
              </th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-start min-w-[200px]">
                {t.item}
              </th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-24">
                {t.uom}
              </th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-32">
                {t.qty}
              </th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-36">
                {t.price}
              </th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-28">
                {t.discount}
              </th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-24">
                {t.tax}
              </th>
              <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-end w-32">
                {t.total}
              </th>
              {!readOnly && (
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-28">
                  {t.actions}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 8 : 9}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {t.noItems}
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const rowKey = item.id?.toString() || item.temp_id || `row-${index}`;
                const isExpanded = expandedRows.has(rowKey);

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
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      {/* Line Number */}
                      <td className="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                        {item.line_number}
                      </td>

                      {/* Item Select */}
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {isRtl && item.item_name_ar ? item.item_name_ar : item.item_name}
                            </div>
                            <div className="text-xs text-gray-500">{item.item_code}</div>
                          </div>
                        ) : (
                          <SearchableSelect
                            options={itemSelectOptions}
                            value={item.item_id || ''}
                            onChange={(v) => updateRow(index, 'item_id', Number(v))}
                            placeholder={t.selectItem}
                            searchPlaceholder={isRtl ? 'بحث...' : 'Search...'}
                            locale={locale}
                          />
                        )}
                      </td>

                      {/* UOM */}
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.uom_code}
                          </span>
                        ) : (
                          <select
                            value={item.uom_id || ''}
                            onChange={(e) => updateRow(index, 'uom_id', Number(e.target.value))}
                            className="input text-sm w-full"
                          >
                            <option value="">-</option>
                            {rowUoms.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.code}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="text-sm text-gray-900 dark:text-gray-100 text-center block">
                            {formatNumber(item.ordered_qty)}
                          </span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rawInputs[getRowKey(item, index)]?.ordered_qty ?? String(item.ordered_qty ?? '')}
                            onChange={(e) => {
                              const key = getRowKey(item, index);
                              const raw = e.target.value;
                              setRaw(key, 'ordered_qty', raw);
                              const parsed = parseDecimal(raw);
                              if (parsed != null) updateRow(index, 'ordered_qty', parsed);
                            }}
                            onBlur={() => {
                              const key = getRowKey(item, index);
                              const raw = rawInputs[key]?.ordered_qty;
                              if (raw == null) return;
                              const parsed = parseDecimal(raw);
                              updateRow(index, 'ordered_qty', parsed ?? 0);
                              clearRaw(key, 'ordered_qty');
                            }}
                            className="input text-sm w-full text-center min-w-[7.5rem]"
                          />
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="text-sm text-gray-900 dark:text-gray-100 text-center block">
                            {formatNumber(item.unit_price)}
                          </span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rawInputs[getRowKey(item, index)]?.unit_price ?? String(item.unit_price ?? '')}
                            onChange={(e) => {
                              const key = getRowKey(item, index);
                              const raw = e.target.value;
                              setRaw(key, 'unit_price', raw);
                              const parsed = parseDecimal(raw);
                              if (parsed != null) updateRow(index, 'unit_price', parsed);
                            }}
                            onBlur={() => {
                              const key = getRowKey(item, index);
                              const raw = rawInputs[key]?.unit_price;
                              if (raw == null) return;
                              const parsed = parseDecimal(raw);
                              updateRow(index, 'unit_price', parsed ?? 0);
                              clearRaw(key, 'unit_price');
                            }}
                            className="input text-sm w-full text-center min-w-[9rem]"
                          />
                        )}
                      </td>

                      {/* Discount % */}
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300 text-center block">
                            {item.discount_percent}%
                          </span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rawInputs[getRowKey(item, index)]?.discount_percent ?? String(item.discount_percent ?? '')}
                            onChange={(e) => {
                              const key = getRowKey(item, index);
                              const raw = e.target.value;
                              setRaw(key, 'discount_percent', raw);
                              const parsed = parseDecimal(raw);
                              if (parsed != null) updateRow(index, 'discount_percent', parsed);
                            }}
                            onBlur={() => {
                              const key = getRowKey(item, index);
                              const raw = rawInputs[key]?.discount_percent;
                              if (raw == null) return;
                              const parsed = parseDecimal(raw);
                              updateRow(index, 'discount_percent', parsed ?? 0);
                              clearRaw(key, 'discount_percent');
                            }}
                            className="input text-sm w-full text-center min-w-[6.5rem]"
                          />
                        )}
                      </td>

                      {/* Tax */}
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300 text-center block">
                            {item.tax_rate}%
                          </span>
                        ) : (
                          <select
                            value={item.tax_rate_id || ''}
                            onChange={(e) => updateRow(index, 'tax_rate_id', Number(e.target.value))}
                            className="input text-sm w-full"
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
                      <td className="px-3 py-2 text-end">
                        {readOnly ? (
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatNumber(item.line_total)}
                          </span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rawInputs[getRowKey(item, index)]?.line_total ?? String(item.line_total ?? '')}
                            onChange={(e) => {
                              const key = getRowKey(item, index);
                              const raw = e.target.value;
                              setRaw(key, 'line_total', raw);
                              const parsed = parseDecimal(raw);
                              if (parsed != null) updateRow(index, 'line_total', parsed);
                            }}
                            onBlur={() => {
                              const key = getRowKey(item, index);
                              const raw = rawInputs[key]?.line_total;
                              if (raw == null) return;
                              const parsed = parseDecimal(raw);
                              updateRow(index, 'line_total', parsed ?? 0);
                              clearRaw(key, 'line_total');
                            }}
                            className="input text-sm w-full text-end min-w-[9rem]"
                            title={isRtl ? 'اكتب الإجمالي وسيتم حساب سعر الوحدة' : 'Enter total to auto-calc unit price'}
                          />
                        )}
                      </td>

                      {/* Actions */}
                      {!readOnly && (
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveRowUp(index)}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move Up"
                            >
                              <ChevronUpIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRowDown(index)}
                              disabled={index === items.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move Down"
                            >
                              <ChevronDownIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => cloneRow(index)}
                              className="p-1 text-blue-500 hover:text-blue-700"
                              title="Clone"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRow(index)}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expanded row for additional fields */}
                    {isExpanded && (
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={readOnly ? 8 : 9} className="px-4 py-3">
                          <div className="grid grid-cols-3 gap-4">
                            {showHsCode && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  {t.hsCode}
                                </label>
                                <input
                                  type="text"
                                  value={item.hs_code || ''}
                                  onChange={(e) => updateRow(index, 'hs_code', e.target.value)}
                                  className="input text-sm w-full"
                                  disabled={readOnly}
                                />
                              </div>
                            )}
                            {showNotes && (
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  {t.notes}
                                </label>
                                <input
                                  type="text"
                                  value={item.notes || ''}
                                  onChange={(e) => updateRow(index, 'notes', e.target.value)}
                                  className="input text-sm w-full"
                                  disabled={readOnly}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>

          {/* Totals Footer */}
          <tfoot className="bg-gray-100 dark:bg-gray-800">
            <tr className="font-medium">
              <td colSpan={3} className="px-4 py-3 text-sm text-end text-gray-600 dark:text-gray-300">
                {t.totalQty}:
              </td>
              <td className="px-3 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                {formatNumber(totals.qty)}
              </td>
              <td colSpan={2} className="px-4 py-3 text-sm text-end text-gray-600 dark:text-gray-300">
                {t.subtotal}:
              </td>
              <td colSpan={readOnly ? 2 : 3} className="px-4 py-3 text-sm text-end text-gray-900 dark:text-gray-100">
                {currencySymbol} {formatNumber(totals.subtotal)}
              </td>
            </tr>
            {totals.discount > 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-2 text-sm text-end text-gray-600 dark:text-gray-300">
                  {t.discountTotal}:
                </td>
                <td colSpan={readOnly ? 2 : 3} className="px-4 py-2 text-sm text-end text-red-600 dark:text-red-400">
                  -{currencySymbol} {formatNumber(totals.discount)}
                </td>
              </tr>
            )}
            {totals.tax > 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-2 text-sm text-end text-gray-600 dark:text-gray-300">
                  {t.taxTotal}:
                </td>
                <td colSpan={readOnly ? 2 : 3} className="px-4 py-2 text-sm text-end text-gray-900 dark:text-gray-100">
                  {currencySymbol} {formatNumber(totals.tax)}
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-gray-300 dark:border-gray-600">
              <td colSpan={6} className="px-4 py-3 text-base font-bold text-end text-gray-900 dark:text-gray-100">
                {t.grandTotal}:
              </td>
              <td colSpan={readOnly ? 2 : 3} className="px-4 py-3 text-base font-bold text-end text-primary-600 dark:text-primary-400">
                {currencySymbol} {formatNumber(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add Item Button */}
      {!readOnly && (
        <div className="flex justify-start">
          <Button type="button" variant="secondary" size="sm" onClick={addRow}>
            <PlusIcon className="w-4 h-4 me-1" />
            {t.addItem}
          </Button>
        </div>
      )}

      {/* Error Display */}
      {errors?.items && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.items}</p>
      )}
    </div>
  );
}
