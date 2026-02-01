/**
 * 📦 INVOICE ITEMS TAB
 * ====================
 * Line items management for Purchase Invoice
 */

import React from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import ItemSelector from '../../shared/ItemSelector';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { InvoiceFormData, InvoiceItem } from './types';

interface InvoiceItemsProps {
  formData: InvoiceFormData;
  newItem: Partial<InvoiceItem>;
  companyId: number;
  locale: string;
  onNewItemChange: (item: Partial<InvoiceItem>) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}

export function InvoiceItems({
  formData,
  newItem,
  companyId,
  locale,
  onNewItemChange,
  onAddItem,
  onRemoveItem
}: InvoiceItemsProps) {
  const isArabic = locale === 'ar';
  const isLocal = formData.invoice_type === 'local';

  return (
    <div className="space-y-4">
      {/* Add Item Form */}
      <Card className="p-3 bg-blue-50 dark:bg-slate-800 border-blue-100 dark:border-slate-700">
        <div className="grid grid-cols-12 gap-2 items-end">
          {/* Item Selector */}
          <div className="col-span-3">
            <label className="text-xs mb-1 block font-medium">
              {isArabic ? 'الصنف' : 'Item'}
            </label>
            <ItemSelector
              selectedItem={null}
              onSelect={(item) => {
                if (item) {
                  onNewItemChange({
                    ...newItem,
                    item_id: item.id,
                    item_code: item.code,
                    item_name: item.name,
                    uom_code: item.unit_name || 'PCS',
                    uom_id: item.unit_id || 1,
                    unit_price: item.unit_price || 0
                  });
                }
              }}
              companyId={companyId}
            />
          </div>

          {/* Quantity */}
          <div className="col-span-2">
            <Input
              label={isArabic ? 'الكمية' : 'Qty'}
              type="number"
              value={newItem.quantity}
              onChange={e => onNewItemChange({ ...newItem, quantity: Number(e.target.value) })}
              containerClassName="mb-0"
            />
          </div>

          {/* Bonus Quantity */}
          <div className="col-span-2">
            <Input
              label={isArabic ? 'بونص' : 'Bonus'}
              type="number"
              value={newItem.bonus_quantity}
              onChange={e => onNewItemChange({ ...newItem, bonus_quantity: Number(e.target.value) })}
              containerClassName="mb-0"
            />
          </div>

          {/* Unit Price */}
          <div className="col-span-2">
            <Input
              label={isArabic ? 'السعر' : 'Price'}
              type="number"
              value={newItem.unit_price}
              onChange={e => onNewItemChange({ ...newItem, unit_price: Number(e.target.value) })}
              containerClassName="mb-0"
            />
          </div>

          {/* Tax (only for local) */}
          {isLocal && (
            <div className="col-span-2">
              <Input
                label={isArabic ? 'الضريبة %' : 'Tax %'}
                type="number"
                value={newItem.tax_percent}
                onChange={e => onNewItemChange({ ...newItem, tax_percent: Number(e.target.value) })}
                containerClassName="mb-0"
              />
            </div>
          )}

          {/* Add Button */}
          <div className={isLocal ? "col-span-1" : "col-span-3"}>
            <Button
              size="sm"
              onClick={onAddItem}
              className="w-full h-10"
              disabled={!newItem.item_id}
            >
              {isArabic ? 'إضافة' : 'Add'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Items Table */}
      <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 dark:bg-slate-700 dark:text-gray-300">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">{isArabic ? 'الصنف' : 'Item'}</th>
              <th className="p-2 text-right">{isArabic ? 'الكمية' : 'Qty'}</th>
              <th className="p-2 text-center text-green-600">{isArabic ? 'بونص' : 'Bonus'}</th>
              <th className="p-2 text-right">{isArabic ? 'السعر' : 'Price'}</th>
              <th className="p-2 text-right">{isArabic ? 'الضريبة' : 'Tax'}</th>
              <th className="p-2 text-right">{isArabic ? 'الإجمالي' : 'Total'}</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {formData.items.map((item, idx) => (
              <tr key={item.temp_id || idx} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="p-2">{idx + 1}</td>
                <td className="p-2">
                  <div className="font-medium">{item.item_name}</div>
                  <div className="text-xs text-gray-500">{item.item_code}</div>
                </td>
                <td className="p-2 text-right">{item.quantity} {item.uom_code}</td>
                <td className="p-2 text-center font-bold text-green-600">
                  {item.bonus_quantity > 0 ? `+${item.bonus_quantity}` : '-'}
                </td>
                <td className="p-2 text-right">{Number(item.unit_price || 0).toFixed(2)}</td>
                <td className="p-2 text-right">{Number(item.tax_amount || 0).toFixed(2)}</td>
                <td className="p-2 text-right font-medium">{Number(item.line_total || 0).toFixed(2)}</td>
                <td className="p-2">
                  <button
                    onClick={() => onRemoveItem(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {formData.items.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {isArabic ? 'لم تتم إضافة أصناف' : 'No items added'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InvoiceItems;
