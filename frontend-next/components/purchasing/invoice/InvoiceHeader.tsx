/**
 * 📋 INVOICE HEADER TAB
 * =====================
 * General information tab for Purchase Invoice
 */

import React from 'react';
import Input from '../../ui/Input';
import CostCenterDropdown from '../../shared/CostCenterDropdown';
import ProjectDropdown from '../../shared/ProjectDropdown';
import WarehouseDropdown from '../../shared/WarehouseDropdown';
import { LinkIcon } from '@heroicons/react/24/outline';
import type { 
  InvoiceFormData, 
  VendorRef, 
  PurchaseOrderRef, 
  QuotationRef 
} from './types';

interface InvoiceHeaderProps {
  formData: InvoiceFormData;
  vendors: VendorRef[];
  vendorSearch: string;
  filteredVendors: VendorRef[];
  purchaseOrders: PurchaseOrderRef[];
  quotations: QuotationRef[];
  companyId: number;
  locale: string;
  onFormChange: (updates: Partial<InvoiceFormData>) => void;
  onVendorSearchChange: (search: string) => void;
  onLoadItemsFromPO?: (poId: number) => void;
}

export function InvoiceHeader({
  formData,
  vendors,
  vendorSearch,
  filteredVendors,
  purchaseOrders,
  quotations,
  companyId,
  locale,
  onFormChange,
  onVendorSearchChange,
  onLoadItemsFromPO
}: InvoiceHeaderProps) {
  const isArabic = locale === 'ar';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
      {/* Left Column */}
      <div className="space-y-4">
        {/* Vendor & Type Row */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              {isArabic ? 'المورد' : 'Vendor'} <span className="text-red-500">*</span>
            </label>
            
            {/* Searchable vendor input */}
            <input
              type="text"
              className="input w-full dark:bg-slate-700 dark:border-slate-600 mb-1"
              placeholder={isArabic ? '🔍 ابحث بالاسم أو الكود...' : '🔍 Search by name or code...'}
              value={vendorSearch}
              onChange={(e) => onVendorSearchChange(e.target.value)}
            />
            
            <select
              className="input w-full dark:bg-slate-700 dark:border-slate-600"
              value={formData.vendor_id}
              onChange={e => {
                onFormChange({ vendor_id: Number(e.target.value) || '' });
                onVendorSearchChange('');
              }}
              size={8}
              style={{ height: '180px', overflow: 'auto' }}
            >
              <option value="">{isArabic ? 'اختر المورد...' : 'Select Vendor...'}</option>
              {filteredVendors.length === 0 && !vendorSearch && (
                <option disabled>{isArabic ? 'جاري التحميل...' : 'Loading...'}</option>
              )}
              {filteredVendors.map(v => (
                <option key={v.id} value={v.id}>
                  {isArabic ? (v.name_ar || v.name) : v.name} ({v.code})
                </option>
              ))}
            </select>
            
            {filteredVendors.length === 0 && vendorSearch && (
              <p className="text-xs text-red-500 mt-1">
                {isArabic ? '❌ لم يتم العثور على موردين' : '❌ No vendors found'}
              </p>
            )}
          </div>
          
          <div className="w-1/3">
            <label className="block text-sm font-medium mb-1">
              {isArabic ? 'نوع الفاتورة' : 'Type'}
            </label>
            <select
              className="input w-full dark:bg-slate-700 dark:border-slate-600 bg-gray-50"
              value={formData.invoice_type}
              onChange={e => onFormChange({ invoice_type: e.target.value as 'local' | 'import' })}
            >
              <option value="local">{isArabic ? 'محلي' : 'Local'}</option>
              <option value="import">{isArabic ? 'استيراد' : 'Import'}</option>
            </select>
          </div>
        </div>

        {/* Invoice Numbers & Dates */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={isArabic ? 'رقم فاتورة المورد' : 'Vendor Invoice #'}
            value={formData.vendor_invoice_number}
            onChange={e => onFormChange({ vendor_invoice_number: e.target.value })}
            placeholder="INV-001"
          />
          <Input
            type="date"
            label={isArabic ? 'تاريخ الفاتورة' : 'Invoice Date'}
            value={formData.invoice_date}
            onChange={e => onFormChange({ invoice_date: e.target.value })}
          />
        </div>

        {/* Reference Documents */}
        {formData.vendor_id && (
          <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300">
              <LinkIcon className="w-4 h-4" />
              <span className="text-sm font-bold">
                {isArabic ? 'ربط مع مستندات' : 'Link references'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input text-sm py-1"
                value={formData.purchase_order_id || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  onFormChange({ purchase_order_id: id || null });
                  if (id && onLoadItemsFromPO) onLoadItemsFromPO(id);
                }}
              >
                <option value="">{isArabic ? 'اختر أمر شراء...' : 'Select PO...'}</option>
                {purchaseOrders.map(po => (
                  <option key={po.id} value={po.id}>{po.po_number}</option>
                ))}
              </select>
              <select
                className="input text-sm py-1"
                value={formData.quotation_id || ''}
                onChange={(e) => onFormChange({ quotation_id: Number(e.target.value) || null })}
              >
                <option value="">{isArabic ? 'اختر عرض سعر...' : 'Select Quote...'}</option>
                {quotations.map(q => (
                  <option key={q.id} value={q.id}>{q.number}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {isArabic ? 'البيان / الوصف' : 'Description / Statement'}
            <span className="text-gray-400 text-xs ml-2">(optional)</span>
          </label>
          <textarea
            className="input w-full dark:bg-slate-700 dark:border-slate-600"
            rows={2}
            value={formData.description || ''}
            onChange={e => onFormChange({ description: e.target.value })}
            placeholder={isArabic ? 'وصف الفاتورة أو البيان' : 'Invoice description or statement'}
          />
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label={isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}
            value={formData.due_date}
            onChange={e => onFormChange({ due_date: e.target.value })}
          />
          <CostCenterDropdown
            value={formData.cost_center_id}
            onChange={(val) => onFormChange({ cost_center_id: val })}
            label={isArabic ? 'مركز التكلفة' : 'Cost Center'}
            companyId={companyId}
          />
          <ProjectDropdown
            value={formData.project_id}
            onChange={(val) => onFormChange({ project_id: val })}
            label={isArabic ? 'المشروع' : 'Project'}
            companyId={companyId}
          />
        </div>

        {/* Default Warehouse */}
        <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium mb-2">
            {isArabic ? 'المخزن الافتراضي' : 'Default Warehouse'}
          </label>
          <WarehouseDropdown
            value={formData.default_warehouse_id}
            onChange={(val) => onFormChange({ default_warehouse_id: val })}
            companyId={companyId}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {isArabic ? 'ملاحظات' : 'Notes'}
          </label>
          <textarea
            className="input w-full dark:bg-slate-700 dark:border-slate-600"
            rows={2}
            value={formData.notes || ''}
            onChange={e => onFormChange({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export default InvoiceHeader;
