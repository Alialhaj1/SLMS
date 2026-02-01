/**
 * 📦 LINE ITEM EDITOR MODAL
 * =========================
 * Modal for adding/editing individual line items in purchase invoices
 * with full warehouse, cost center, project, and tax integration
 */

import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ItemSelector from '../../components/shared/ItemSelector';
import WarehouseDropdown from '../../components/shared/WarehouseDropdown';
import CostCenterDropdown from '../../components/shared/CostCenterDropdown';
import ProjectDropdown from '../../components/shared/ProjectDropdown';

interface LineItemEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: any) => void;
  initialData: any;
  locale: string;
  companyId: number;
  defaultWarehouseId?: number;
  defaultTaxRate?: number;
}

const LineItemEditor: React.FC<LineItemEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  locale,
  companyId,
  defaultWarehouseId,
  defaultTaxRate,
}) => {
  const [itemData, setItemData] = useState<any>({
    item_id: 0,
    item_code: '',
    item_name: '',
    warehouse_id: defaultWarehouseId || 0,
    uom_id: 0,
    uom_code: '',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    tax_percent: defaultTaxRate || 0,
    customs_duty_amount: 0,
    cost_center_id: null,
    project_id: null,
    notes: '',
  });

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setItemData(initialData);
      if (initialData.item_id) {
        setSelectedItem({
          id: initialData.item_id,
          code: initialData.item_code,
          name: initialData.item_name,
          name_ar: initialData.item_name_ar,
          unit_id: initialData.uom_id,
          unit_code: initialData.uom_code,
        });
      }
    } else {
      // Reset for new item
      setItemData({
        item_id: 0,
        item_code: '',
        item_name: '',
        warehouse_id: defaultWarehouseId || 0,
        uom_id: 0,
        uom_code: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_percent: defaultTaxRate || 0,
        customs_duty_amount: 0,
        cost_center_id: null,
        project_id: null,
        notes: '',
      });
      setSelectedItem(null);
    }
    setErrors({});
  }, [initialData, isOpen, defaultWarehouseId, defaultTaxRate]);

  const handleItemSelect = (item: any) => {
    if (item) {
      setSelectedItem(item);
      setItemData({
        ...itemData,
        item_id: item.id,
        item_code: item.code,
        item_name: item.name,
        item_name_ar: item.name_ar,
        uom_id: item.unit_id,
        uom_code: item.unit_code,
        unit_price: item.unit_price || 0,
      });
    } else {
      setSelectedItem(null);
      setItemData({
        ...itemData,
        item_id: 0,
        item_code: '',
        item_name: '',
        uom_id: 0,
        uom_code: '',
      });
    }
  };

  const calculateTotals = () => {
    const subtotal = itemData.quantity * itemData.unit_price;
    const discountAmount = subtotal * (itemData.discount_percent / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (itemData.tax_percent / 100);
    const lineTotal = afterDiscount + taxAmount + itemData.customs_duty_amount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      lineTotal,
    };
  };

  const totals = calculateTotals();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!itemData.item_id) {
      newErrors.item = locale === 'ar' ? 'يرجى اختيار صنف' : 'Please select an item';
    }
    if (!itemData.warehouse_id) {
      newErrors.warehouse = locale === 'ar' ? 'يرجى اختيار مخزن' : 'Please select a warehouse';
    }
    if (!itemData.quantity || itemData.quantity <= 0) {
      newErrors.quantity = locale === 'ar' ? 'الكمية يجب أن تكون أكبر من صفر' : 'Quantity must be greater than zero';
    }
    if (itemData.unit_price < 0) {
      newErrors.unit_price = locale === 'ar' ? 'السعر لا يمكن أن يكون سالباً' : 'Price cannot be negative';
    }
    if (itemData.discount_percent < 0 || itemData.discount_percent > 100) {
      newErrors.discount_percent = locale === 'ar' ? 'الخصم يجب أن يكون بين 0 و 100' : 'Discount must be between 0 and 100';
    }
    if (itemData.tax_percent < 0 || itemData.tax_percent > 100) {
      newErrors.tax_percent = locale === 'ar' ? 'الضريبة يجب أن تكون بين 0 و 100' : 'Tax must be between 0 and 100';
    }
    if (itemData.customs_duty_amount < 0) {
      newErrors.customs_duty = locale === 'ar' ? 'الجمارك لا يمكن أن تكون سالبة' : 'Customs duty cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const finalItem = {
      ...itemData,
      discount_amount: totals.discountAmount,
      tax_amount: totals.taxAmount,
      line_total: totals.lineTotal,
    };

    onSave(finalItem);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.item_id 
        ? (locale === 'ar' ? 'تعديل صنف' : 'Edit Item')
        : (locale === 'ar' ? 'إضافة صنف جديد' : 'Add New Item')
      }
      size="lg"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {/* Item Selection */}
        <ItemSelector
          selectedItem={selectedItem}
          onSelect={handleItemSelect}
          companyId={companyId}
          label={locale === 'ar' ? 'الصنف' : 'Item'}
          required
          error={errors.item}
          warehouseId={itemData.warehouse_id}
        />

        {/* Warehouse & UOM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WarehouseDropdown
            value={itemData.warehouse_id}
            onChange={(id) => setItemData({ ...itemData, warehouse_id: id })}
            companyId={companyId}
            label={locale === 'ar' ? 'المخزن' : 'Warehouse'}
            required
            error={errors.warehouse}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'وحدة القياس' : 'Unit of Measure'}
            </label>
            <input
              type="text"
              value={itemData.uom_code || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              placeholder={locale === 'ar' ? 'يتم تعبئتها تلقائياً' : 'Auto-filled'}
            />
          </div>
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="number"
            label={locale === 'ar' ? 'الكمية' : 'Quantity'}
            value={itemData.quantity}
            onChange={(e) => setItemData({ ...itemData, quantity: parseFloat(e.target.value) || 0 })}
            required
            error={errors.quantity}
            min="0"
            step="0.01"
          />

          <Input
            type="number"
            label={locale === 'ar' ? 'سعر الوحدة' : 'Unit Price'}
            value={itemData.unit_price}
            onChange={(e) => setItemData({ ...itemData, unit_price: parseFloat(e.target.value) || 0 })}
            required
            error={errors.unit_price}
            min="0"
            step="0.01"
          />
        </div>

        {/* Discounts & Tax */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="number"
            label={locale === 'ar' ? 'نسبة الخصم (%)' : 'Discount (%)'}
            value={itemData.discount_percent}
            onChange={(e) => setItemData({ ...itemData, discount_percent: parseFloat(e.target.value) || 0 })}
            error={errors.discount_percent}
            min="0"
            max="100"
            step="0.01"
          />

          <Input
            type="number"
            label={locale === 'ar' ? 'نسبة الضريبة (%)' : 'Tax (%)'}
            value={itemData.tax_percent}
            onChange={(e) => setItemData({ ...itemData, tax_percent: parseFloat(e.target.value) || 0 })}
            error={errors.tax_percent}
            min="0"
            max="100"
            step="0.01"
          />

          <Input
            type="number"
            label={locale === 'ar' ? 'رسوم الجمارك' : 'Customs Duty'}
            value={itemData.customs_duty_amount}
            onChange={(e) => setItemData({ ...itemData, customs_duty_amount: parseFloat(e.target.value) || 0 })}
            error={errors.customs_duty}
            min="0"
            step="0.01"
          />
        </div>

        {/* Cost Center & Project (Optional) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CostCenterDropdown
            value={itemData.cost_center_id || ''}
            onChange={(id) => setItemData({ ...itemData, cost_center_id: id })}
            companyId={companyId}
            label={locale === 'ar' ? 'مركز التكلفة (اختياري)' : 'Cost Center (Optional)'}
            allowNull
          />

          <ProjectDropdown
            value={itemData.project_id || ''}
            onChange={(id) => setItemData({ ...itemData, project_id: id })}
            companyId={companyId}
            label={locale === 'ar' ? 'المشروع (اختياري)' : 'Project (Optional)'}
            allowNull
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {locale === 'ar' ? 'ملاحظات' : 'Notes'}
          </label>
          <textarea
            value={itemData.notes || ''}
            onChange={(e) => setItemData({ ...itemData, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
            placeholder={locale === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
          />
        </div>

        {/* Calculation Summary */}
        <div className="bg-blue-50 dark:bg-slate-900/50 rounded-lg p-4 border border-blue-200 dark:border-slate-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
            {locale === 'ar' ? '📊 ملخص الحساب' : '📊 Calculation Summary'}
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}:
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>{locale === 'ar' ? 'الخصم' : 'Discount'}:</span>
                <span className="font-medium">- {formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
            {itemData.customs_duty_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{locale === 'ar' ? 'الجمارك' : 'Customs'}:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  + {formatCurrency(itemData.customs_duty_amount)}
                </span>
              </div>
            )}
            {totals.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{locale === 'ar' ? 'الضريبة' : 'Tax'}:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  + {formatCurrency(totals.taxAmount)}
                </span>
              </div>
            )}
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between font-bold text-base">
              <span className="text-gray-900 dark:text-white">{locale === 'ar' ? 'الإجمالي' : 'Total'}:</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(totals.lineTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>
            {locale === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave}>
            {locale === 'ar' ? 'حفظ الصنف' : 'Save Item'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LineItemEditor;
