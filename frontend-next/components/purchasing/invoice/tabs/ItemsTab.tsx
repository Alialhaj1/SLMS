/**
 * ITEMS TAB - Purchase Invoice
 * Purpose: Item lines with quantities, pricing, tax
 * Features: Add/Edit/Delete items, auto-calculations, warehouse assignment
 */

import React, { useState, useMemo } from 'react';
import { InvoiceFormData, InvoiceItem } from '../hooks/useInvoiceForm';
import { InvoiceMasterData, MasterItem, ItemUOM } from '../hooks/useInvoiceMasterData';
import { ItemSearchSelect } from '../components/ItemSearchSelect';
import { useTranslation } from '@/hooks/useTranslation';

interface ItemsTabProps {
  formData: InvoiceFormData;
  masterData: InvoiceMasterData;
  errors: Record<string, string | undefined>;
  canEdit: boolean;
  invoiceTypeRules: {
    requiresWarehouse: boolean;
    affectsInventory: boolean;
    allowsServices: boolean;
  };
  onAddItem: (item: InvoiceItem) => void;
  onUpdateItem: (index: number, updates: Partial<InvoiceItem>) => void;
  onRemoveItem: (index: number) => void;
}

interface ItemFormData {
  item_id: number | null;
  item_code: string;
  item_name: string;
  item_name_ar: string;
  item_type: 'stock' | 'service' | 'expense';
  quantity: number;
  bonus_quantity: number;
  uom_id: number | null;
  uom_code: string;
  uom_name: string;
  unit_price: number;
  discount_percent: number;
  tax_rate_id: number | null;
  tax_percent: number;
  warehouse_id: number | null;
  cost_center_id: number | null;
  project_id: number | null;
  notes: string;
}

export const ItemsTab: React.FC<ItemsTabProps> = ({
  formData,
  masterData,
  errors,
  canEdit,
  invoiceTypeRules,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}) => {
  const { t, locale } = useTranslation();
  
  // =============================================
  // STATE - New Item Form
  // =============================================
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>({
    item_id: null,
    item_code: '',
    item_name: '',
    item_name_ar: '',
    item_type: 'stock',
    quantity: 1,
    bonus_quantity: 0,
    uom_id: null,
    uom_code: '',
    uom_name: '',
    unit_price: 0,
    discount_percent: 0,
    tax_rate_id: null,
    tax_percent: 0,
    warehouse_id: formData.default_warehouse_id,
    cost_center_id: formData.cost_center_id,
    project_id: formData.project_id,
    notes: '',
  });
  const [itemFormErrors, setItemFormErrors] = useState<Record<string, string>>({});

  // =============================================
  // CALCULATED VALUES
  // =============================================
  const calculateLineValues = (form: ItemFormData) => {
    const lineSubtotal = form.quantity * form.unit_price;
    const discountAmount = lineSubtotal * (form.discount_percent / 100);
    const afterDiscount = lineSubtotal - discountAmount;
    const taxAmount = afterDiscount * (form.tax_percent / 100);
    const lineTotal = afterDiscount + taxAmount;
    
    return {
      lineSubtotal,
      discountAmount,
      taxAmount,
      lineTotal,
    };
  };

  const currentLineValues = useMemo(() => 
    calculateLineValues(itemForm),
    [itemForm.quantity, itemForm.unit_price, itemForm.discount_percent, itemForm.tax_percent]
  );

  // =============================================
  // VALIDATION
  // =============================================
  const validateItemForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!itemForm.item_id) {
      newErrors.item_id = 'Item is required';
    }

    if (itemForm.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (itemForm.unit_price < 0) {
      newErrors.unit_price = 'Unit price cannot be negative';
    }

    if (itemForm.item_type === 'stock' && invoiceTypeRules.affectsInventory && !itemForm.warehouse_id) {
      newErrors.warehouse_id = 'Warehouse is required for stock items';
    }

    setItemFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================
  // HANDLERS - Item Selection
  // =============================================
  const handleItemSelect = (item: MasterItem | null, selectedUOM?: ItemUOM) => {
    if (item) {
      const defaultTax = masterData.getDefaultTax();
      
      // Use selected UOM or item's base UOM
      const uom = selectedUOM || {
        uom_id: item.base_uom_id,
        uom_code: item.base_uom_code,
        uom_name: item.base_uom_name,
        conversion_factor: 1,
        is_base_uom: true,
        is_purchase_uom: true,
      };
      
      // Get price - use selected UOM price or item purchase price
      const unitPrice = selectedUOM?.default_purchase_price || item.purchase_price || 0;
      
      setItemForm(prev => ({
        ...prev,
        item_id: item.id,
        item_code: item.code,
        item_name: item.name,
        item_name_ar: item.name_ar || '',
        item_type: item.item_type,
        uom_id: uom.uom_id,
        uom_code: uom.uom_code,
        uom_name: uom.uom_name,
        unit_price: unitPrice,
        tax_rate_id: item.tax_rate_id || defaultTax?.id || null,
        tax_percent: item.default_tax_rate || defaultTax?.vat_rate || 0,
      }));
    } else {
      // Clear item selection
      setItemForm(prev => ({
        ...prev,
        item_id: null,
        item_code: '',
        item_name: '',
        item_name_ar: '',
        uom_id: null,
        uom_code: '',
        uom_name: '',
        unit_price: 0,
      }));
    }
  };

  const handleTaxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const taxId = parseInt(e.target.value);
    const tax = masterData.taxes.find(t => t.id === taxId);
    
    setItemForm(prev => ({
      ...prev,
      tax_rate_id: taxId,
      tax_percent: tax?.vat_rate || 0,
    }));
  };

  // =============================================
  // HANDLERS - Add/Edit Item
  // =============================================
  const handleAddItem = () => {
    if (!validateItemForm()) return;
    
    const { discountAmount, taxAmount, lineTotal } = calculateLineValues(itemForm);
    
    const newItem: InvoiceItem = {
      temp_id: Math.random().toString(36).substr(2, 9),
      item_id: itemForm.item_id!,
      item_code: itemForm.item_code,
      item_name: itemForm.item_name,
      item_name_ar: itemForm.item_name_ar,
      item_type: itemForm.item_type,
      quantity: itemForm.quantity,
      bonus_quantity: itemForm.bonus_quantity,
      uom_id: itemForm.uom_id!,
      uom_code: itemForm.uom_code,
      uom_name: itemForm.uom_name,
      unit_price: itemForm.unit_price,
      discount_percent: itemForm.discount_percent,
      discount_amount: discountAmount,
      tax_rate_id: itemForm.tax_rate_id,
      tax_percent: itemForm.tax_percent,
      tax_amount: taxAmount,
      line_total: lineTotal,
      allocated_expenses: 0,
      landed_cost_per_unit: itemForm.unit_price,
      warehouse_id: itemForm.warehouse_id,
      cost_center_id: itemForm.cost_center_id,
      project_id: itemForm.project_id,
      notes: itemForm.notes,
    };
    
    onAddItem(newItem);
    resetItemForm();
    setIsAddingItem(false);
  };

  const handleEditItem = (index: number) => {
    const item = formData.items[index];
    
    setItemForm({
      item_id: item.item_id,
      item_code: item.item_code,
      item_name: item.item_name,
      item_name_ar: item.item_name_ar || '',
      item_type: item.item_type,
      quantity: item.quantity,
      bonus_quantity: item.bonus_quantity,
      uom_id: item.uom_id,
      uom_code: item.uom_code,
      uom_name: item.uom_name || '',
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      tax_rate_id: item.tax_rate_id || null,
      tax_percent: item.tax_percent,
      warehouse_id: item.warehouse_id || null,
      cost_center_id: item.cost_center_id || null,
      project_id: item.project_id || null,
      notes: item.notes || '',
    });
    
    setEditingIndex(index);
    setIsAddingItem(true);
  };

  const handleUpdateItem = () => {
    if (!validateItemForm() || editingIndex === null) return;
    
    const { discountAmount, taxAmount, lineTotal } = calculateLineValues(itemForm);
    
    onUpdateItem(editingIndex, {
      item_id: itemForm.item_id!,
      item_code: itemForm.item_code,
      item_name: itemForm.item_name,
      item_type: itemForm.item_type,
      quantity: itemForm.quantity,
      bonus_quantity: itemForm.bonus_quantity,
      unit_price: itemForm.unit_price,
      discount_percent: itemForm.discount_percent,
      discount_amount: discountAmount,
      tax_percent: itemForm.tax_percent,
      tax_amount: taxAmount,
      line_total: lineTotal,
      warehouse_id: itemForm.warehouse_id,
      cost_center_id: itemForm.cost_center_id,
      project_id: itemForm.project_id,
      notes: itemForm.notes,
    });
    
    resetItemForm();
    setEditingIndex(null);
    setIsAddingItem(false);
  };

  const resetItemForm = () => {
    setItemForm({
      item_id: null,
      item_code: '',
      item_name: '',
      item_name_ar: '',
      item_type: 'stock',
      quantity: 1,
      bonus_quantity: 0,
      uom_id: null,
      uom_code: '',
      uom_name: '',
      unit_price: 0,
      discount_percent: 0,
      tax_rate_id: null,
      tax_percent: 0,
      warehouse_id: formData.default_warehouse_id,
      cost_center_id: formData.cost_center_id,
      project_id: formData.project_id,
      notes: '',
    });
    setItemFormErrors({});
  };

  const handleCancelEdit = () => {
    resetItemForm();
    setEditingIndex(null);
    setIsAddingItem(false);
  };

  // =============================================
  // RENDER - Items Table
  // =============================================
  const renderItemsTable = () => {
    if (formData.items.length === 0) {
      return (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('invoiceItems.noItems', 'No items added yet')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('invoiceItems.addFirstItem', 'Click "Add Item" to start')}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">{t('invoiceItems.item', 'Item')}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">{t('common.type') || 'Type'}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">{t('invoiceItems.quantity', 'Qty')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">{t('invoiceItems.bonusQty', 'Bonus')}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">{t('invoiceItems.uom', 'UOM')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">{t('invoiceItems.unitPrice', 'Price')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">{t('invoiceItems.discount', 'Disc%')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">{t('invoiceItems.tax', 'Tax%')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">{t('invoiceItems.total', 'Total')}</th>
              {canEdit && <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">{t('invoiceItems.actions', 'Actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
            {formData.items.map((item, index) => (
              <tr key={item.temp_id || item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-3 py-2 text-sm">
                  <div className="font-medium text-slate-900 dark:text-white">{item.item_code}</div>
                  <div className="text-xs text-slate-500">{item.item_name}</div>
                  {item.warehouse_code && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">WH: {item.warehouse_code}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    item.item_type === 'stock' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    item.item_type === 'service' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}>
                    {item.item_type}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-right text-slate-900 dark:text-white">{item.quantity}</td>
                <td className="px-3 py-2 text-sm text-right text-slate-500">{item.bonus_quantity || '-'}</td>
                <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300">{item.uom_code}</td>
                <td className="px-3 py-2 text-sm text-right text-slate-900 dark:text-white">{item.unit_price.toFixed(2)}</td>
                <td className="px-3 py-2 text-sm text-right text-slate-700 dark:text-slate-300">{item.discount_percent}%</td>
                <td className="px-3 py-2 text-sm text-right text-slate-700 dark:text-slate-300">{item.tax_percent}%</td>
                <td className="px-3 py-2 text-sm text-right font-semibold text-slate-900 dark:text-white">{item.line_total.toFixed(2)}</td>
                {canEdit && (
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleEditItem(index)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mr-2"
                      title="Edit"
                    >
                      <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                      title="Delete"
                    >
                      <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // =============================================
  // RENDER - Item Form
  // =============================================
  const renderItemForm = () => {
    if (!isAddingItem) return null;

    return (
      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4 border border-slate-200 dark:border-slate-600">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          {editingIndex !== null ? (t('invoiceItems.editItem', 'Edit Item')) : (t('invoiceItems.addItem', 'Add New Item'))}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          {/* Item Selector */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('invoiceItems.item', 'Item')} <span className="text-red-500">*</span>
            </label>
            <ItemSearchSelect
              value={itemForm.item_id}
              items={masterData.items}
              loading={masterData.loading.items}
              disabled={editingIndex !== null}
              error={itemFormErrors.item_id}
              allowServices={invoiceTypeRules.allowsServices}
              onChange={(itemId) => {
                if (!itemId) {
                  handleItemSelect(null);
                }
              }}
              onItemSelect={(selection) => {
                if (selection) {
                  handleItemSelect(selection.item as MasterItem, selection.uom as ItemUOM);
                } else {
                  handleItemSelect(null);
                }
              }}
            />
            {itemFormErrors.item_id && <p className="text-xs text-red-500 mt-0.5">{itemFormErrors.item_id}</p>}
          </div>

          {/* Item Type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('common.type') || 'Type'}</label>
            <input
              type="text"
              value={itemForm.item_type === 'stock' ? (t('common.stock') || 'Stock') : itemForm.item_type === 'service' ? (t('common.service') || 'Service') : (t('common.expense') || 'Expense')}
              disabled
              className="w-full px-2 py-1.5 text-sm border rounded bg-slate-100 dark:bg-slate-600 dark:border-slate-600 dark:text-slate-400"
            />
          </div>

          {/* UOM */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('invoiceItems.uom', 'UOM')}</label>
            <input
              type="text"
              value={itemForm.uom_code}
              disabled
              className="w-full px-2 py-1.5 text-sm border rounded bg-slate-100 dark:bg-slate-600 dark:border-slate-600 dark:text-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('invoiceItems.quantity', 'Qty')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={itemForm.quantity}
              onChange={(e) => setItemForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                itemFormErrors.quantity ? 'border-red-500' : ''
              }`}
            />
          </div>

          {/* Bonus Qty */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('invoiceItems.bonusQty', 'Bonus')}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={itemForm.bonus_quantity}
              onChange={(e) => setItemForm(prev => ({ ...prev, bonus_quantity: parseFloat(e.target.value) || 0 }))}
              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>

          {/* Unit Price */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('invoiceItems.unitPrice', 'Price')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={itemForm.unit_price}
              onChange={(e) => setItemForm(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                itemFormErrors.unit_price ? 'border-red-500' : ''
              }`}
            />
          </div>

          {/* Discount % */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('invoiceItems.discount', 'Disc %')}</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={itemForm.discount_percent}
              onChange={(e) => setItemForm(prev => ({ ...prev, discount_percent: parseFloat(e.target.value) || 0 }))}
              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>

          {/* Tax */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('invoiceItems.tax', 'Tax')}</label>
            <select
              value={itemForm.tax_rate_id || ''}
              onChange={handleTaxChange}
              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="">{t('invoiceItems.noTax', 'No Tax')}</option>
              {masterData.taxes.map(tax => (
                <option key={tax.id} value={tax.id}>
                  {tax.name} ({tax.vat_rate}%)
                </option>
              ))}
            </select>
          </div>

          {/* Line Total (Calculated) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('invoiceItems.total', 'Total')}</label>
            <input
              type="text"
              value={currentLineValues.lineTotal.toFixed(2)}
              disabled
              className="w-full px-2 py-1.5 text-sm border rounded bg-blue-50 dark:bg-blue-900/20 dark:border-slate-600 font-semibold text-blue-900 dark:text-blue-300"
            />
          </div>
        </div>

        {/* Warehouse (if stock item and affects inventory) */}
        {itemForm.item_type === 'stock' && invoiceTypeRules.affectsInventory && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('invoiceItems.warehouse', 'Warehouse')} <span className="text-red-500">*</span>
              </label>
              <select
                value={itemForm.warehouse_id || ''}
                onChange={(e) => setItemForm(prev => ({ ...prev, warehouse_id: parseInt(e.target.value) }))}
                className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${
                  itemFormErrors.warehouse_id ? 'border-red-500' : ''
                }`}
              >
                <option value="">{t('invoiceItems.selectWarehouse', '-- Select Warehouse --')}</option>
                {masterData.warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
              {itemFormErrors.warehouse_id && <p className="text-xs text-red-500 mt-0.5">{itemFormErrors.warehouse_id}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('invoiceItems.costCenter', 'Cost Center')}</label>
              <select
                value={itemForm.cost_center_id || ''}
                onChange={(e) => setItemForm(prev => ({ ...prev, cost_center_id: parseInt(e.target.value) }))}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              >
                <option value="">-- Optional --</option>
                {masterData.costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.code}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('invoiceItems.project', 'Project')}</label>
              <select
                value={itemForm.project_id || ''}
                onChange={(e) => setItemForm(prev => ({ ...prev, project_id: parseInt(e.target.value) }))}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              >
                <option value="">{t('common.optional') || '-- Optional --'}</option>
                {masterData.projects.map(proj => (
                  <option key={proj.id} value={proj.id}>{proj.code}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('invoiceItems.notes', 'Notes')}</label>
          <input
            type="text"
            value={itemForm.notes}
            onChange={(e) => setItemForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder={t('common.optionalNotes') || 'Optional notes for this item'}
            className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
        </div>

        {/* Calculation Preview */}
        <div className="bg-white dark:bg-slate-800 rounded p-2 mb-3 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">{t('invoiceItems.subtotal', 'Subtotal')}:</span>
            <span className="text-slate-900 dark:text-white">{currentLineValues.lineSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">{t('invoiceItems.totalDiscount', 'Discount')}:</span>
            <span className="text-red-600">-{currentLineValues.discountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">{t('invoiceItems.tax', 'Tax')}:</span>
            <span className="text-slate-900 dark:text-white">+{currentLineValues.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 font-semibold">
            <span className="text-slate-900 dark:text-white">{t('invoiceItems.lineTotal', 'Line Total')}:</span>
            <span className="text-blue-600 dark:text-blue-400">{currentLineValues.lineTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {editingIndex !== null ? (
            <>
              <button
                onClick={handleUpdateItem}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                {t('invoiceItems.update', 'Update Item')}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-sm bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-400 dark:hover:bg-slate-500"
              >
                {t('invoiceItems.cancel', 'Cancel')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleAddItem}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                {t('invoiceItems.addItem', 'Add Item')}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-sm bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-400 dark:hover:bg-slate-500"
              >
                {t('invoiceItems.cancel', 'Cancel')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // =============================================
  // MAIN RENDER
  // =============================================
  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('invoiceItems.title', 'Invoice Items')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formData.items.length} {t('common.items') || 'item(s)'} • {t('invoiceItems.total', 'Total')}: {formData.subtotal.toFixed(2)}
          </p>
        </div>
        
        {canEdit && !isAddingItem && (
          <button
            onClick={() => setIsAddingItem(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('invoiceItems.addItem', 'Add Item')}
          </button>
        )}
      </div>

      {/* Item Form */}
      {renderItemForm()}

      {/* Items Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
        {renderItemsTable()}
      </div>

      {/* Validation Errors */}
      {errors.items && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.items}</p>
        </div>
      )}

    </div>
  );
};
