/**
 * Items Master Data — Page Configuration
 * ═══════════════════════════════════════
 * Professional ERP Items/Products management with full field mapping.
 * Covers: identity, classification, units, pricing, inventory,
 *         vendor, agriculture, physical, media, trade, and settings.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Item {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  short_name?: string;
  description?: string;
  description_ar?: string;
  barcode?: string;
  sku?: string;
  // Classification
  item_type: string;
  item_type_id?: number;
  group_id?: number;
  category_id?: number;
  brand_id?: number;
  item_grade_id?: number;
  // Units
  base_uom_id?: number;
  purchase_uom_id?: number;
  sales_uom_id?: number;
  // Pricing
  standard_cost?: number;
  last_purchase_cost?: number;
  average_cost?: number;
  base_selling_price?: number;
  min_selling_price?: number;
  max_discount_percent?: number;
  costing_method?: string;
  valuation_method?: string;
  // Inventory
  is_stockable?: boolean;
  is_purchasable?: boolean;
  is_sellable?: boolean;
  track_inventory?: boolean;
  allow_negative_stock?: boolean;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_level?: number;
  reorder_qty?: number;
  lead_time_days?: number;
  tracking_policy?: string;
  // Vendor / Manufacturing
  default_vendor_id?: number;
  manufacturer?: string;
  manufacturer_part_no?: string;
  warranty_months?: number;
  min_order_qty?: number;
  // Agriculture
  harvest_schedule_id?: number;
  expected_harvest_date?: string;
  shelf_life_days?: number;
  expiry_alert_days?: number;
  // Physical / Trade
  weight?: number;
  volume?: number;
  hs_code?: string;
  country_of_origin?: number;
  tax_type_id?: number;
  is_tax_inclusive?: boolean;
  // Media
  image_url?: string;
  // Status
  is_active: boolean;
  is_blocked?: boolean;
  blocked_reason?: string;
  // Joined fields (from API)
  base_uom_name?: string;
  base_uom_name_ar?: string;
  base_uom_code?: string;
  purchase_uom_name?: string;
  sales_uom_name?: string;
  group_name?: string;
  group_name_ar?: string;
  item_type_name?: string;
  item_type_name_ar?: string;
  default_vendor_name?: string;
  default_vendor_name_ar?: string;
  country_name?: string;
  has_movement?: boolean;
  // Allow flexible property access for detail panel / extra DB columns
  [key: string]: any;
}

export type { Item as ItemType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Item>[] = [
  { key: 'code',                  label: 'Code',          labelAr: 'الكود',        sortable: true,  width: 100 },
  { key: 'name',                  label: 'Name',          labelAr: 'اسم الصنف',     sortable: true               },
  { key: 'barcode',               label: 'Barcode',       labelAr: 'الباركود',      sortable: true,  width: 120  },
  { key: 'base_uom_name',         label: 'Unit',          labelAr: 'الوحدة',       sortable: false, width: 100  },
  { key: 'group_name',            label: 'Group',         labelAr: 'المجموعة',      sortable: true,  width: 130  },
  { key: 'standard_cost',         label: 'Cost',          labelAr: 'التكلفة',      sortable: true,  width: 105, align: 'right', format: 'currency' },
  { key: 'base_selling_price',    label: 'Sell Price',    labelAr: 'سعر البيع',     sortable: true,  width: 105, align: 'right', format: 'currency' },
  { key: 'default_vendor_name',   label: 'Vendor',        labelAr: 'المورد',       sortable: false, width: 140  },
  { key: 'is_active',             label: 'Active',        labelAr: 'نشط',         sortable: true,  width: 75,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  // ── 1. Identity ──
  {
    key: 'identity',
    label: 'Item Identity',
    labelAr: 'بيانات الصنف',
    icon: 'IdentificationIcon',
    fields: [
      { key: 'code',        label: 'Item Code',        labelAr: 'رقم الصنف',         type: 'code',     required: 'required',    placeholder: 'ITM-001',  autoUppercase: true, immutableAfterCreate: true, colSpan: 3 },
      { key: 'barcode',     label: 'Barcode',           labelAr: 'الباركود',          type: 'text',     required: 'optional',    placeholder: 'EAN / UPC',  colSpan: 3 },
      { key: 'sku',         label: 'SKU',               labelAr: 'رمز المخزون',       type: 'text',     required: 'optional',    placeholder: 'SKU',        colSpan: 3 },
      { key: 'name',        label: 'Item Name',         labelAr: 'اسم الصنف',         type: 'text',     required: 'required',    placeholder: 'Item name',  colSpan: 6 },
      { key: 'name_ar',     label: 'Name (Arabic)',     labelAr: 'الاسم بالعربي',      type: 'text',     required: 'recommended', placeholder: 'اسم الصنف بالعربية', colSpan: 6 },
      { key: 'description', label: 'Description',       labelAr: 'الوصف',             type: 'textarea', required: 'optional',    placeholder: 'Item description',    colSpan: 'full' as any },
    ],
  },
  // ── 2. Classification (overridden by items.tsx for cascading groups) ──
  {
    key: 'classification',
    label: 'Classification',
    labelAr: 'التصنيف',
    icon: 'TagIcon',
    fields: [
      {
        key: 'item_type_id', label: 'Item Type', labelAr: 'نوع الصنف',
        type: 'searchable-select', required: 'optional', placeholder: 'Select item type',
        dataSource: { type: 'api', endpoint: '/api/master/item-types', valueField: 'id', labelField: 'name_en', labelArField: 'name_ar' },
      },
      {
        key: 'group_id', label: 'Item Group', labelAr: 'مجموعة الصنف',
        type: 'searchable-select', required: 'optional', placeholder: 'Select item group',
        dataSource: { type: 'api', endpoint: '/api/master/item-groups', valueField: 'id', labelField: 'name_en', labelArField: 'name_ar' },
      },
      {
        key: 'default_vendor_id', label: 'Default Vendor', labelAr: 'المورد الافتراضي',
        type: 'searchable-select', required: 'optional', placeholder: 'Select vendor',
        dataSource: { type: 'api', endpoint: '/api/master/vendors', valueField: 'id', labelField: 'name', labelArField: 'name_ar' },
      },
    ],
  },
  // ── 3. Units of Measure ──
  {
    key: 'units',
    label: 'Units of Measure',
    labelAr: 'وحدات القياس',
    icon: 'ScaleIcon',
    fields: [
      {
        key: 'base_uom_id', label: 'Base Unit (factor = 1)', labelAr: 'الوحدة الأساسية (المعامل = 1)',
        type: 'searchable-select', required: 'required', placeholder: 'Select base UOM',
        dataSource: { type: 'api', endpoint: '/api/master/items/filters', valueField: 'id', labelField: 'name_en', labelArField: 'name_ar', dataPath: 'units' },
        helperText: 'The smallest measuring unit for this item (e.g. 1 kg, 1 piece)',
        helperTextAr: 'أصغر وحدة قياس للصنف (مثال: 1 كجم، 1 حبة)',
      },
      {
        key: 'purchase_uom_id', label: 'Purchase Unit', labelAr: 'وحدة الشراء',
        type: 'searchable-select', required: 'optional', placeholder: 'Same as base if empty',
        dataSource: { type: 'api', endpoint: '/api/master/items/filters', valueField: 'id', labelField: 'name_en', labelArField: 'name_ar', dataPath: 'units' },
      },
      {
        key: 'sales_uom_id', label: 'Sales Unit', labelAr: 'وحدة البيع',
        type: 'searchable-select', required: 'optional', placeholder: 'Same as base if empty',
        dataSource: { type: 'api', endpoint: '/api/master/items/filters', valueField: 'id', labelField: 'name_en', labelArField: 'name_ar', dataPath: 'units' },
      },
    ],
  },
  // ── 4. Pricing ──
  {
    key: 'pricing',
    label: 'Pricing & Costing',
    labelAr: 'التسعير والتكلفة',
    icon: 'CurrencyDollarIcon',
    fields: [
      { key: 'standard_cost',       label: 'Cost Price',        labelAr: 'سعر التكلفة',         type: 'currency', required: 'optional', placeholder: '0.00', colSpan: 4 },
      { key: 'base_selling_price',  label: 'Selling Price',     labelAr: 'سعر البيع',           type: 'currency', required: 'optional', placeholder: '0.00', colSpan: 4 },
      { key: 'last_purchase_cost',  label: 'Last Purchase',     labelAr: 'آخر سعر شراء',        type: 'currency', required: 'optional', placeholder: '0.00', colSpan: 4 },
      { key: 'min_selling_price',   label: 'Min Sell Price',    labelAr: 'أقل سعر بيع',         type: 'currency', required: 'optional', placeholder: '0.00', colSpan: 4 },
      { key: 'max_discount_percent',label: 'Max Discount %',    labelAr: 'أقصى خصم %',          type: 'number',   required: 'optional', placeholder: '0',    colSpan: 4 },
      {
        key: 'valuation_method', label: 'Valuation Method', labelAr: 'طريقة التقييم',
        type: 'select', required: 'optional', placeholder: 'Select valuation method', colSpan: 4,
        options: [
          { value: 'fifo',             label: 'FIFO',             labelAr: 'الوارد أولاً' },
          { value: 'lifo',             label: 'LIFO',             labelAr: 'الوارد أخيراً' },
          { value: 'weighted_average', label: 'Weighted Average', labelAr: 'المتوسط المرجح' },
          { value: 'standard_cost',    label: 'Standard Cost',    labelAr: 'التكلفة المعيارية' },
        ],
      },
    ],
  },
  // ── 5. Vendor & Manufacturing ──
  {
    key: 'vendor',
    label: 'Vendor & Manufacturing',
    labelAr: 'المورد والتصنيع',
    icon: 'TruckIcon',
    collapsible: true,
    fields: [
      {
        key: 'default_vendor_id', label: 'Default Vendor', labelAr: 'المورد الافتراضي',
        type: 'searchable-select', required: 'optional', placeholder: 'Select vendor',
        dataSource: { type: 'api', endpoint: '/api/master/vendors', valueField: 'id', labelField: 'name', labelArField: 'name_ar' },
        colSpan: 6,
      },
      { key: 'manufacturer',          label: 'Manufacturer',      labelAr: 'الشركة المصنعة',     type: 'text',   required: 'optional', placeholder: 'Manufacturer name', colSpan: 6 },
      { key: 'manufacturer_part_no',   label: 'Mfg Part No.',      labelAr: 'رقم القطعة',         type: 'text',   required: 'optional', placeholder: 'Part number',        colSpan: 4 },
      { key: 'min_order_qty',          label: 'Min Order Qty',     labelAr: 'أقل كمية طلب',       type: 'number', required: 'optional', placeholder: '0',                  colSpan: 4 },
      { key: 'warranty_months',        label: 'Warranty (months)', labelAr: 'الضمان (أشهر)',       type: 'number', required: 'optional', placeholder: '0',                  colSpan: 4 },
    ],
  },
  // ── 6. Inventory Settings ──
  {
    key: 'inventory',
    label: 'Inventory Settings',
    labelAr: 'إعدادات المخزون',
    icon: 'ArchiveBoxIcon',
    collapsible: true,
    fields: [
      { key: 'is_stockable',        label: 'Stockable',           labelAr: 'قابل للتخزين',      type: 'toggle', required: 'optional', defaultValue: true,  colSpan: 4 },
      { key: 'is_purchasable',      label: 'Purchasable',         labelAr: 'قابل للشراء',       type: 'toggle', required: 'optional', defaultValue: true,  colSpan: 4 },
      { key: 'is_sellable',         label: 'Sellable',            labelAr: 'قابل للبيع',        type: 'toggle', required: 'optional', defaultValue: true,  colSpan: 4 },
      { key: 'track_inventory',     label: 'Track Inventory',     labelAr: 'تتبع المخزون',      type: 'toggle', required: 'optional', defaultValue: true,  colSpan: 4 },
      { key: 'allow_negative_stock',label: 'Allow Negative',      labelAr: 'سماح بالسالب',      type: 'toggle', required: 'optional', defaultValue: false, colSpan: 4 },
      { key: 'min_stock_level',  label: 'Min Stock',     labelAr: 'أقل مخزون',         type: 'number', required: 'optional', placeholder: '0', colSpan: 4 },
      { key: 'max_stock_level',  label: 'Max Stock',     labelAr: 'أعلى مخزون',        type: 'number', required: 'optional', placeholder: '0', colSpan: 4 },
      { key: 'reorder_level',   label: 'Reorder Level', labelAr: 'حد إعادة الطلب',     type: 'number', required: 'optional', placeholder: '0', colSpan: 4 },
      { key: 'reorder_qty',     label: 'Reorder Qty',   labelAr: 'كمية إعادة الطلب',   type: 'number', required: 'optional', placeholder: '0', colSpan: 4 },
      { key: 'lead_time_days',  label: 'Lead Time (days)', labelAr: 'مهلة التوريد (أيام)', type: 'number', required: 'optional', placeholder: '0', colSpan: 4 },
      {
        key: 'tracking_policy', label: 'Tracking Policy', labelAr: 'سياسة التتبع',
        type: 'select', required: 'optional', placeholder: 'Select tracking policy', colSpan: 4,
        helperText: 'Locked after first transaction',
        helperTextAr: 'مقفل بعد أول حركة',
        options: [
          { value: 'none',          label: 'None',           labelAr: 'بدون' },
          { value: 'batch',         label: 'Batch',          labelAr: 'دفعة' },
          { value: 'serial',        label: 'Serial',         labelAr: 'تسلسلي' },
          { value: 'batch_expiry',  label: 'Batch + Expiry', labelAr: 'دفعة + صلاحية' },
          { value: 'serial_expiry', label: 'Serial + Expiry',labelAr: 'تسلسلي + صلاحية' },
        ],
      },
    ],
  },
  // ── 7. Agriculture / Shelf Life ──
  {
    key: 'agriculture',
    label: 'Harvest & Shelf Life',
    labelAr: 'الحصاد والصلاحية',
    icon: 'CalendarDaysIcon',
    collapsible: true,
    fields: [
      { key: 'expected_harvest_date', label: 'Expected Harvest Date', labelAr: 'موعد الحصاد المتوقع', type: 'date',   required: 'optional', colSpan: 4 },
      { key: 'shelf_life_days',       label: 'Shelf Life (days)',     labelAr: 'مدة الصلاحية (أيام)',  type: 'number', required: 'optional', placeholder: '0', colSpan: 4 },
      { key: 'expiry_alert_days',     label: 'Expiry Alert (days)',   labelAr: 'تنبيه قبل (أيام)',     type: 'number', required: 'optional', placeholder: '0', colSpan: 4 },
    ],
  },
  // ── 8. Physical & Trade ──
  {
    key: 'physical',
    label: 'Physical & Trade',
    labelAr: 'الفيزيائية والتجارية',
    icon: 'CubeIcon',
    collapsible: true,
    fields: [
      { key: 'weight',             label: 'Weight (kg)',      labelAr: 'الوزن (كجم)',   type: 'decimal', required: 'optional', placeholder: '0.000', decimalPrecision: 3, colSpan: 4 },
      { key: 'volume',             label: 'Volume',           labelAr: 'الحجم',        type: 'decimal', required: 'optional', placeholder: '0.000', decimalPrecision: 3, colSpan: 4 },
      { key: 'hs_code',            label: 'HS Code',          labelAr: 'الرمز الجمركي', type: 'text', required: 'optional', placeholder: 'HS tariff code', colSpan: 4 },
      {
        key: 'country_of_origin', label: 'Country of Origin', labelAr: 'بلد المنشأ',
        type: 'searchable-select', required: 'optional', placeholder: 'Select country',
        dataSource: { type: 'api', endpoint: '/api/master/countries', valueField: 'id', labelField: 'name_en', labelArField: 'name_ar' },
        colSpan: 6,
      },
      { key: 'is_tax_inclusive', label: 'Tax Inclusive', labelAr: 'شامل الضريبة', type: 'toggle', required: 'optional', defaultValue: false, colSpan: 6 },
    ],
  },
  // ── 9. Media ──
  {
    key: 'media',
    label: 'Product Image',
    labelAr: 'صورة المنتج',
    icon: 'PhotoIcon',
    collapsible: true,
    fields: [
      { key: 'image_url', label: 'Image URL', labelAr: 'رابط الصورة', type: 'text', required: 'optional', placeholder: 'https://... or upload', colSpan: 'full' as any },
    ],
  },
  // ── 10. Settings ──
  {
    key: 'settings',
    label: 'Settings',
    labelAr: 'الإعدادات',
    icon: 'Cog6ToothIcon',
    fields: [
      { key: 'is_active', label: 'Active', labelAr: 'نشط', type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'master:items:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:items:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'master:items:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:items:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const itemsConfig: PageConfig<Item> = {
  title: 'Items',
  titleKey: 'pages.master.items.title',
  subtitle: 'Manage inventory items, pricing, and stock settings',
  subtitleAr: 'إدارة الأصناف والتسعير وإعدادات المخزون',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Items' },
  ],
  apiEndpoint: '/api/master/items',
  resourceName: 'items',
  permissionPrefix: 'master:items',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'items',
  defaultSortField: 'code',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
  importEndpoint: '/api/master/items-import/import',
  detailPanelEnabled: true,
};
