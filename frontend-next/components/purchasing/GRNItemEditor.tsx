/**
 * 🎯 ENHANCED GRN ITEM EDITOR
 * ===========================
 * Professional line item editor with:
 * ✅ Warehouse bin selection
 * ✅ Quality control status (Accepted, Rejected, Hold)
 * ✅ Batch/Serial number tracking
 * ✅ Expiry date for perishables
 * ✅ PO item matching (ordered vs. received qty)
 * ✅ Cost center & project allocation
 * ✅ Item notes
 */

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ItemSelector from '../shared/ItemSelector';
import CostCenterDropdown from '../shared/CostCenterDropdown';
import ProjectDropdown from '../shared/ProjectDropdown';
import { useTranslation } from '../../hooks/useTranslation';
import clsx from 'clsx';

interface GRNItemData {
  id?: number;
  item_id?: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  uom_id?: number;
  uom_code?: string;
  uom_name?: string;

  // Quantities
  ordered_quantity?: number;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  
  // Quality Control
  qc_status: 'pending' | 'accepted' | 'rejected' | 'hold';
  qc_notes?: string;
  
  // Warehouse & Bin
  warehouse_id?: number;
  warehouse_bin_code?: string;
  warehouse_bin_location?: string;
  
  // Batch/Serial Tracking
  batch_number?: string;
  serial_number?: string;
  manufacturing_date?: string;
  expiry_date?: string;
  
  // Pricing
  unit_price: number;
  line_total: number;
  
  // Tracking
  cost_center_id?: number;
  project_id?: number;
  
  notes?: string;
}

interface GRNItemEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: GRNItemData) => void;
  initialData?: GRNItemData | null;
  companyId: number;
  warehouseId?: number;
  poItemId?: number; // For matching with PO
}

export default function GRNItemEditor({
  isOpen,
  onClose,
  onSave,
  initialData,
  companyId,
  warehouseId,
  poItemId,
}: GRNItemEditorProps) {
  const { locale } = useTranslation();

  const [itemData, setItemData] = useState<GRNItemData>({
    item_code: '',
    item_name: '',
    uom_code: '',
    received_quantity: 0,
    accepted_quantity: 0,
    rejected_quantity: 0,
    qc_status: 'pending',
    unit_price: 0,
    line_total: 0,
  });

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setItemData(initialData);
    } else {
      setItemData({
        item_code: '',
        item_name: '',
        uom_code: '',
        received_quantity: 0,
        accepted_quantity: 0,
        rejected_quantity: 0,
        qc_status: 'pending',
        unit_price: 0,
        line_total: 0,
      });
    }
    setSelectedItem(null);
    setErrors({});
  }, [isOpen, initialData]);

  const handleItemSelect = (item: any) => {
    setSelectedItem(item);
    setItemData({
      ...itemData,
      item_id: item.id,
      item_code: item.code,
      item_name: item.name,
      item_name_ar: item.name_ar,
      uom_id: item.default_uom_id,
      uom_code: item.uom_code,
      uom_name: item.uom_name,
      unit_price: item.unit_price || 0,
    });
  };

  const calculateLineTotal = (quantity: number, price: number) => {
    return quantity * price;
  };

  const handleReceivedQtyChange = (qty: number) => {
    const lineTotal = calculateLineTotal(qty, itemData.unit_price);
    setItemData({
      ...itemData,
      received_quantity: qty,
      accepted_quantity: qty, // Default: all accepted
      rejected_quantity: 0,
      line_total: lineTotal,
    });
  };

  const handleAcceptedQtyChange = (qty: number) => {
    const maxQty = itemData.received_quantity;
    const accepted = Math.min(qty, maxQty);
    const rejected = maxQty - accepted;
    
    setItemData({
      ...itemData,
      accepted_quantity: accepted,
      rejected_quantity: rejected,
      qc_status: rejected > 0 ? (accepted > 0 ? 'hold' : 'rejected') : 'accepted',
    });
  };

  const handleRejectedQtyChange = (qty: number) => {
    const maxQty = itemData.received_quantity;
    const rejected = Math.min(qty, maxQty);
    const accepted = maxQty - rejected;
    
    setItemData({
      ...itemData,
      accepted_quantity: accepted,
      rejected_quantity: rejected,
      qc_status: rejected > 0 ? (accepted > 0 ? 'hold' : 'rejected') : 'accepted',
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!itemData.item_id) {
      newErrors.item_id = locale === 'ar' ? 'يرجى اختيار صنف' : 'Please select an item';
    }
    if (!itemData.received_quantity || itemData.received_quantity <= 0) {
      newErrors.received_quantity = locale === 'ar' ? 'الكمية المستلمة يجب أن تكون أكبر من صفر' : 'Received quantity must be greater than zero';
    }
    if (itemData.accepted_quantity + itemData.rejected_quantity !== itemData.received_quantity) {
      newErrors.qc = locale === 'ar' 
        ? 'مجموع الكميات المقبولة والمرفوضة يجب أن يساوي الكمية المستلمة'
        : 'Accepted + Rejected quantities must equal received quantity';
    }
    if (itemData.unit_price < 0) {
      newErrors.unit_price = locale === 'ar' ? 'السعر لا يمكن أن يكون سالباً' : 'Price cannot be negative';
    }
    if (itemData.expiry_date && itemData.manufacturing_date) {
      if (new Date(itemData.expiry_date) <= new Date(itemData.manufacturing_date)) {
        newErrors.expiry_date = locale === 'ar' ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ الإنتاج' : 'Expiry date must be after manufacturing date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const finalItem: GRNItemData = {
      ...itemData,
      line_total: calculateLineTotal(itemData.accepted_quantity, itemData.unit_price),
    };

    onSave(finalItem);
    onClose();
  };

  const qcStatusOptions = [
    { value: 'pending', label: { en: 'Pending QC', ar: 'قيد الفحص' }, color: 'gray' },
    { value: 'accepted', label: { en: 'Accepted', ar: 'مقبول' }, color: 'green' },
    { value: 'hold', label: { en: 'On Hold', ar: 'محجوز' }, color: 'yellow' },
    { value: 'rejected', label: { en: 'Rejected', ar: 'مرفوض' }, color: 'red' },
  ];

  const getQCStatusBadge = (status: string) => {
    const option = qcStatusOptions.find(o => o.value === status);
    if (!option) return null;
    
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };

    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', colors[option.color])}>
        {locale === 'ar' ? option.label.ar : option.label.en}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        initialData
          ? (locale === 'ar' ? 'تعديل الصنف' : 'Edit Item')
          : (locale === 'ar' ? 'إضافة صنف' : 'Add Item')
      }
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Section 1: Item Selection */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
            {locale === 'ar' ? 'معلومات الصنف' : 'Item Information'}
          </h4>
          
          <ItemSelector
            selectedItem={selectedItem}
            onSelect={handleItemSelect}
            companyId={companyId}
            label={locale === 'ar' ? 'الصنف' : 'Item'}
            required
            error={errors.item_id}
            disabled={!!initialData}
            warehouseId={warehouseId}
          />

          {selectedItem && itemData.ordered_quantity && (
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {locale === 'ar' ? 'الكمية المطلوبة في أمر الشراء:' : 'Ordered Quantity (PO):'}
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {itemData.ordered_quantity} {itemData.uom_name || itemData.uom_code}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Quantities & QC */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
            {locale === 'ar' ? 'الكميات ومراقبة الجودة' : 'Quantities & Quality Control'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الكمية المستلمة' : 'Received Quantity'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemData.received_quantity || ''}
                onChange={(e) => handleReceivedQtyChange(parseFloat(e.target.value) || 0)}
                className={clsx(
                  'w-full px-4 py-3 border rounded-lg',
                  'focus:ring-2 focus:ring-teal-500',
                  'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
                  errors.received_quantity ? 'border-red-500' : 'border-gray-300'
                )}
              />
              {errors.received_quantity && <p className="mt-1 text-sm text-red-600">{errors.received_quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الكمية المقبولة' : 'Accepted Quantity'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={itemData.received_quantity}
                value={itemData.accepted_quantity || ''}
                onChange={(e) => handleAcceptedQtyChange(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الكمية المرفوضة' : 'Rejected Quantity'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={itemData.received_quantity}
                value={itemData.rejected_quantity || ''}
                onChange={(e) => handleRejectedQtyChange(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {errors.qc && (
            <p className="mt-2 text-sm text-red-600">{errors.qc}</p>
          )}

          <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {locale === 'ar' ? 'حالة مراقبة الجودة:' : 'QC Status:'}
              </span>
              {getQCStatusBadge(itemData.qc_status)}
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'ملاحظات مراقبة الجودة' : 'QC Notes'}
            </label>
            <textarea
              value={itemData.qc_notes || ''}
              onChange={(e) => setItemData({ ...itemData, qc_notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder={locale === 'ar' ? 'أسباب الرفض أو الملاحظات...' : 'Rejection reasons or notes...'}
            />
          </div>
        </div>

        {/* Section 3: Warehouse & Bin */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
            {locale === 'ar' ? 'موقع التخزين' : 'Storage Location'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'رمز الموقع (Bin)' : 'Bin Code'}
              </label>
              <input
                type="text"
                value={itemData.warehouse_bin_code || ''}
                onChange={(e) => setItemData({ ...itemData, warehouse_bin_code: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={locale === 'ar' ? 'مثل: A-01-05' : 'e.g., A-01-05'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'وصف الموقع' : 'Bin Location'}
              </label>
              <input
                type="text"
                value={itemData.warehouse_bin_location || ''}
                onChange={(e) => setItemData({ ...itemData, warehouse_bin_location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={locale === 'ar' ? 'مثل: الرف A، الصف 1، العمود 5' : 'e.g., Aisle A, Row 1, Column 5'}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Batch & Serial Tracking */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
            {locale === 'ar' ? 'تتبع الدفعة والرقم التسلسلي' : 'Batch & Serial Tracking'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'رقم الدفعة' : 'Batch Number'}
              </label>
              <input
                type="text"
                value={itemData.batch_number || ''}
                onChange={(e) => setItemData({ ...itemData, batch_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={locale === 'ar' ? 'مثل: BATCH-2024-001' : 'e.g., BATCH-2024-001'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'}
              </label>
              <input
                type="text"
                value={itemData.serial_number || ''}
                onChange={(e) => setItemData({ ...itemData, serial_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={locale === 'ar' ? 'مثل: SN-12345678' : 'e.g., SN-12345678'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ الإنتاج' : 'Manufacturing Date'}
              </label>
              <input
                type="date"
                value={itemData.manufacturing_date || ''}
                onChange={(e) => setItemData({ ...itemData, manufacturing_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
              </label>
              <input
                type="date"
                value={itemData.expiry_date || ''}
                onChange={(e) => setItemData({ ...itemData, expiry_date: e.target.value })}
                className={clsx(
                  'w-full px-4 py-3 border rounded-lg',
                  'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                  errors.expiry_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {errors.expiry_date && <p className="mt-1 text-sm text-red-600">{errors.expiry_date}</p>}
            </div>
          </div>
        </div>

        {/* Section 5: Pricing & Allocation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
              {locale === 'ar' ? 'التسعير' : 'Pricing'}
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'سعر الوحدة' : 'Unit Price'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemData.unit_price || ''}
                onChange={(e) => {
                  const price = parseFloat(e.target.value) || 0;
                  setItemData({
                    ...itemData,
                    unit_price: price,
                    line_total: calculateLineTotal(itemData.accepted_quantity, price),
                  });
                }}
                className={clsx(
                  'w-full px-4 py-3 border rounded-lg',
                  'dark:bg-gray-800 dark:text-white',
                  errors.unit_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {errors.unit_price && <p className="mt-1 text-sm text-red-600">{errors.unit_price}</p>}
            </div>

            <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {locale === 'ar' ? 'إجمالي السطر:' : 'Line Total:'}
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {itemData.line_total.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { 
                    minimumFractionDigits: 2 
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
              {locale === 'ar' ? 'التخصيص المحاسبي' : 'Accounting Allocation'}
            </h4>

            <div className="space-y-3">
              <CostCenterDropdown
                value={itemData.cost_center_id}
                onChange={(ccId) => setItemData({ ...itemData, cost_center_id: ccId || undefined })}
                companyId={companyId}
                label={locale === 'ar' ? 'مركز التكلفة' : 'Cost Center'}
                allowNull
              />

              <ProjectDropdown
                value={itemData.project_id}
                onChange={(projId) => setItemData({ ...itemData, project_id: projId || undefined })}
                companyId={companyId}
                label={locale === 'ar' ? 'المشروع' : 'Project'}
                allowNull
              />
            </div>
          </div>
        </div>

        {/* Section 6: Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {locale === 'ar' ? 'ملاحظات' : 'Notes'}
          </label>
          <textarea
            value={itemData.notes || ''}
            onChange={(e) => setItemData({ ...itemData, notes: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder={locale === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="secondary" onClick={onClose}>
          {locale === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button onClick={handleSave}>
          {locale === 'ar' ? 'حفظ' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}
