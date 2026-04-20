/**
 * Generic Bulk Import Route for Master Data
 * Handles Excel/CSV file upload and bulk insert with validation.
 * 
 * POST /api/master/:resource/import
 * - Accepts multipart/form-data with a file field
 * - Parses Excel (.xlsx/.xls) or CSV files
 * - Validates each row against required fields
 * - Inserts valid rows, reports skipped/failed rows
 * - Respects company_id isolation
 * - Checks for duplicates
 * 
 * GET /api/master/:resource/import/template
 * - Downloads an Excel template with headers and sample data
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// Multer config - memory storage, max 5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are accepted'));
    }
  },
});

// ─── TABLE DEFINITIONS ────────────────────────────────────────────────────────
// Maps resource names to their table configs for safe import

interface TableConfig {
  table: string;
  requiredFields: string[];
  optionalFields: string[];
  uniqueFields: string[]; // Fields that form the uniqueness constraint (with company_id)
  hasCompanyId: boolean;
  codeAutoGen?: boolean; // Auto-generate code from name if missing
  hasUpdatedAt?: boolean; // defaults to true; set to false for tables without updated_at
  defaults?: Record<string, any>; // Default values for NOT NULL columns without DB defaults
  sampleData: Record<string, any>[];
}

const TABLE_CONFIGS: Record<string, TableConfig> = {
  'item-groups': {
    table: 'item_groups',
    requiredFields: ['name_en'],
    optionalFields: ['code', 'name', 'name_ar', 'description', 'description_en', 'description_ar', 'parent_group_id', 'group_type', 'sort_order', 'is_active'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'RAW_MAT', name_en: 'Raw Materials', name_ar: 'مواد خام', description: 'Raw materials group', is_active: true },
      { code: 'FIN_PROD', name_en: 'Finished Products', name_ar: 'منتجات نهائية', description: 'Finished goods', is_active: true },
    ],
  },
  'customer-types': {
    table: 'customer_types',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    hasUpdatedAt: false,
    sampleData: [
      { code: 'RETAIL', name: 'Retail Customer', name_ar: 'عميل تجزئة', is_active: true },
      { code: 'WHOLESALE', name: 'Wholesale Customer', name_ar: 'عميل جملة', is_active: true },
    ],
  },
  'customer-classifications': {
    table: 'customer_classifications',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'VIP', name: 'VIP Customer', name_ar: 'عميل مميز', is_active: true },
      { code: 'REGULAR', name: 'Regular Customer', name_ar: 'عميل عادي', is_active: true },
    ],
  },
  'customer-statuses': {
    table: 'customer_statuses',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order', 'color'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    hasUpdatedAt: false,
    sampleData: [
      { code: 'ACTIVE', name: 'Active', name_ar: 'نشط', color: '#22c55e', is_active: true },
      { code: 'INACTIVE', name: 'Inactive', name_ar: 'غير نشط', color: '#ef4444', is_active: true },
    ],
  },
  'customer-groups': {
    table: 'customer_groups',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order', 'discount_percentage'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'GRP_A', name: 'Group A', name_ar: 'المجموعة أ', discount_percentage: 5, is_active: true },
    ],
  },
  'supplier-types': {
    table: 'supplier_types',
    requiredFields: ['name_en'],
    optionalFields: ['code', 'name_ar', 'description_en', 'description_ar', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'LOCAL', name_en: 'Local Supplier', name_ar: 'مورد محلي', is_active: true },
      { code: 'INTL', name_en: 'International Supplier', name_ar: 'مورد دولي', is_active: true },
    ],
  },

  'vendor-types': {
    table: 'vendor_types',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'SERVICE', name: 'Service Provider', name_ar: 'مزود خدمات', is_active: true },
    ],
  },
  'units': {
    table: 'units',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'unit_type', 'base_unit_id', 'conversion_factor', 'is_base_unit', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    defaults: { unit_type: 'other', is_base_unit: true },
    sampleData: [
      { code: 'KG', name: 'Kilogram', name_ar: 'كيلوغرام', unit_type: 'weight', is_active: true },
      { code: 'PCS', name: 'Pieces', name_ar: 'قطعة', unit_type: 'piece', is_active: true },
    ],
  },
  'unit-types': {
    table: 'unit_types',
    requiredFields: ['name_en'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'WEIGHT', name_en: 'Weight', name_ar: 'وزن', is_active: true },
      { code: 'LENGTH', name_en: 'Length', name_ar: 'طول', is_active: true },
    ],
  },
  'address-types': {
    table: 'address_types',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: false,
    codeAutoGen: true,
    sampleData: [
      { code: 'BILLING', name: 'Billing Address', name_ar: 'عنوان الفوترة', is_active: true },
      { code: 'SHIPPING', name: 'Shipping Address', name_ar: 'عنوان الشحن', is_active: true },
    ],
  },
  'contact-types': {
    table: 'contact_types',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: false,
    codeAutoGen: true,
    sampleData: [
      { code: 'PHONE', name: 'Phone', name_ar: 'هاتف', is_active: true },
      { code: 'EMAIL', name: 'Email', name_ar: 'بريد إلكتروني', is_active: true },
    ],
  },
  'supply-terms': {
    table: 'supply_terms',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: false,
    codeAutoGen: true,
    sampleData: [
      { code: 'FOB', name: 'Free On Board', name_ar: 'تسليم على ظهر السفينة', is_active: true },
    ],
  },
  'delivery-terms': {
    table: 'delivery_terms',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: false,
    codeAutoGen: true,
    sampleData: [
      { code: 'DOOR', name: 'Door Delivery', name_ar: 'توصيل للباب', is_active: true },
    ],
  },
  'contract-statuses': {
    table: 'contract_statuses',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order', 'color'],
    uniqueFields: ['code'],
    hasCompanyId: false,
    codeAutoGen: true,
    sampleData: [
      { code: 'DRAFT', name: 'Draft', name_ar: 'مسودة', color: '#94a3b8', is_active: true },
      { code: 'ACTIVE', name: 'Active', name_ar: 'نشط', color: '#22c55e', is_active: true },
    ],
  },
  'payment-methods': {
    table: 'payment_methods',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_en', 'name_ar', 'description', 'description_en', 'description_ar', 'payment_type', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'CASH', name: 'Cash', name_ar: 'نقدي', is_active: true },
      { code: 'BANK', name: 'Bank Transfer', name_ar: 'تحويل بنكي', is_active: true },
    ],
  },
  'tax-types': {
    table: 'tax_types',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'tax_category', 'rate', 'is_active'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    defaults: { tax_category: 'vat', rate: 0 },
    sampleData: [
      { code: 'VAT', name: 'Value Added Tax', name_ar: 'ضريبة القيمة المضافة', tax_category: 'vat', rate: 15, is_active: true },
    ],
  },
  'group-categories': {
    table: 'group_categories',
    requiredFields: ['name_en'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'TRADE', name_en: 'Trading Items', name_ar: 'أصناف تجارية', is_active: true },
    ],
  },
  'warehouse-types': {
    table: 'warehouse_types',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'warehouse_category', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'MAIN', name: 'Main Warehouse', name_ar: 'مستودع رئيسي', is_active: true },
    ],
  },
  'shipment-types': {
    table: 'shipment_types',
    requiredFields: ['name_en'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'sort_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'SEA', name_en: 'Sea Freight', name_ar: 'شحن بحري', is_active: true },
      { code: 'AIR', name_en: 'Air Freight', name_ar: 'شحن جوي', is_active: true },
    ],
  },
  'lc-types': {
    table: 'lc_types',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'description', 'is_active', 'display_order'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    sampleData: [
      { code: 'SIGHT', name: 'Sight LC', name_ar: 'اعتماد بالاطلاع', is_active: true },
    ],
  },
  'vendors': {
    table: 'vendors',
    requiredFields: ['name'],
    optionalFields: ['code', 'name_ar', 'vendor_type', 'tax_number', 'commercial_register', 'primary_contact_name', 'phone', 'mobile', 'email', 'website', 'address', 'postal_code', 'bank_account_name', 'bank_account_number', 'bank_iban', 'bank_swift', 'lead_time_days', 'min_order_amount', 'status', 'notes', 'credit_limit', 'is_external', 'opening_balance', 'default_payment_method'],
    uniqueFields: ['code'],
    hasCompanyId: true,
    codeAutoGen: true,
    defaults: { is_external: false },
    sampleData: [
      { code: 'VEND001', name: 'Acme Supplies', name_ar: 'مؤسسة أكمي للتوريدات', phone: '+966501234567', email: 'info@acme.com' },
      { code: 'VEND002', name: 'Global Trading Co', name_ar: 'شركة التجارة العالمية', phone: '+966509876543', email: 'info@global.com' },
    ],
  },
};

// ─── RESOURCE NAME RESOLVER ───────────────────────────────────────────────────
// Frontend may send underscored names (customer_types) while TABLE_CONFIGS uses hyphens (customer-types)
function resolveConfig(resource: string): TableConfig | undefined {
  // Try exact match first
  if (TABLE_CONFIGS[resource]) return TABLE_CONFIGS[resource];
  // Try converting underscores to hyphens
  const hyphenated = resource.replace(/_/g, '-');
  if (TABLE_CONFIGS[hyphenated]) return TABLE_CONFIGS[hyphenated];
  // Try converting hyphens to underscores
  const underscored = resource.replace(/-/g, '_');
  if (TABLE_CONFIGS[underscored]) return TABLE_CONFIGS[underscored];
  return undefined;
}

// ─── TEMPLATE DOWNLOAD ────────────────────────────────────────────────────────

router.get('/:resource/import/template', authenticate, (req: Request, res: Response) => {
  const { resource } = req.params;
  const config = resolveConfig(resource);

  if (!config) {
    return sendError(res, 'NOT_FOUND', `Import not supported for: ${resource}`, 404);
  }

  // Build template workbook
  const wb = XLSX.utils.book_new();
  const allFields = [...config.requiredFields, ...config.optionalFields];
  
  // Create header row + sample data
  const sheetData = [
    allFields, // Headers
    ...config.sampleData.map(sample => allFields.map(f => sample[f] ?? '')),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Style headers: mark required fields
  ws['!cols'] = allFields.map(f => ({
    wch: Math.max(f.length + 4, 20),
  }));

  // Add instructions sheet
  const instrData = [
    ['Import Instructions / تعليمات الاستيراد'],
    [''],
    ['Field / الحقل', 'Required / مطلوب', 'Description / الوصف'],
    ...config.requiredFields.map(f => [f, 'Yes / نعم', `Required field`]),
    ...config.optionalFields.map(f => [f, 'No / لا', `Optional field`]),
    [''],
    ['Notes / ملاحظات:'],
    ['- code: If left empty, will be auto-generated from name / اذا تركت فارغة سيتم توليدها تلقائياً'],
    ['- is_active: Use true/false or 1/0 / استخدم true/false أو 1/0'],
    ['- Duplicate codes will be skipped / الأكواد المكررة سيتم تجاوزها'],
    ['- Maximum 1000 rows per import / أقصى عدد 1000 صف لكل استيراد'],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 50 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${resource}-import-template.xlsx`);
  res.send(buffer);
});

// ─── IMPORT ───────────────────────────────────────────────────────────────────

router.post('/:resource/import', authenticate, loadCompanyContext, upload.single('file'), async (req: Request, res: Response) => {
  const { resource } = req.params;
  const config = resolveConfig(resource);

  if (!config) {
    return sendError(res, 'NOT_FOUND', `Import not supported for: ${resource}`, 404);
  }

  if (!req.file) {
    return sendError(res, 'VALIDATION_ERROR', 'File is required', 400);
  }

  const companyId = (req as any).companyId || (req as any).user?.company_id;
  if (config.hasCompanyId && !companyId) {
    return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
  }

  // Import mode: 'skip' (default) = skip duplicates, 'upsert' = insert or update, 'update_only' = only update existing
  const importMode = (req.body?.mode || 'skip') as 'skip' | 'upsert' | 'update_only';
  if (!['skip', 'upsert', 'update_only'].includes(importMode)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid import mode. Use: skip, upsert, or update_only', 400);
  }

  try {
    // Parse file
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return sendError(res, 'VALIDATION_ERROR', 'Excel file is empty', 400);
    }

    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

    if (rawRows.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'No data rows found in file', 400);
    }

    if (rawRows.length > 1000) {
      return sendError(res, 'VALIDATION_ERROR', 'Maximum 1000 rows per import. Please split your data.', 400);
    }

    const allFields = [...config.requiredFields, ...config.optionalFields];

    // ── Header aliases: map common Arabic/English header labels to DB field names ──
    const HEADER_ALIASES: Record<string, string> = {
      // Arabic aliases
      'الاسم': 'name', 'اسم': 'name',
      'name (english)': 'name', 'name (en)': 'name', 'name_english': 'name', 'english_name': 'name', 'english name': 'name',
      'الاسم بالانجليزي': 'name_en', 'الاسم بالانجليزية': 'name_en', 'الاسم الانجليزي': 'name_en',
      'name english': 'name_en', 'name en': 'name_en',
      'الاسم بالعربي': 'name_ar', 'الاسم بالعربية': 'name_ar', 'الاسم العربي': 'name_ar',
      'اسم بالعربي': 'name_ar', 'اسم بالعربية': 'name_ar', 'اسم عربي': 'name_ar',
      'name (arabic)': 'name_ar', 'name (ar)': 'name_ar', 'name_arabic': 'name_ar', 'arabic_name': 'name_ar', 'arabic name': 'name_ar',
      'name arabic': 'name_ar', 'name ar': 'name_ar',
      'الكود': 'code', 'كود': 'code', 'رمز': 'code', 'الرمز': 'code',
      'الوصف': 'description', 'وصف': 'description',
      'الوصف بالعربي': 'description_ar', 'الوصف بالعربية': 'description_ar',
      'الوصف بالانجليزي': 'description_en', 'الوصف بالانجليزية': 'description_en',
      'نشط': 'is_active', 'فعال': 'is_active', 'الحالة': 'status', 'حالة': 'status',
      'الترتيب': 'sort_order', 'ترتيب': 'sort_order',
      'الهاتف': 'phone', 'هاتف': 'phone', 'رقم الهاتف': 'phone',
      'الجوال': 'mobile', 'جوال': 'mobile', 'رقم الجوال': 'mobile',
      'البريد الالكتروني': 'email', 'بريد الكتروني': 'email', 'ايميل': 'email', 'الايميل': 'email',
      'الموقع': 'website', 'موقع': 'website',
      'العنوان': 'address', 'عنوان': 'address',
      'الرقم الضريبي': 'tax_number', 'رقم ضريبي': 'tax_number',
      'السجل التجاري': 'commercial_register', 'سجل تجاري': 'commercial_register',
      'ملاحظات': 'notes', 'الملاحظات': 'notes',
      'نوع المورد': 'vendor_type', 'نوع': 'vendor_type',
      'الحد الائتماني': 'credit_limit', 'حد ائتماني': 'credit_limit',
    };

    // ── Normalize headers: map Excel headers (case-insensitive, trimmed) to expected field names ──
    const firstRow = rawRows[0];
    const excelHeaders = Object.keys(firstRow);
    const headerMap: Record<string, string> = {};
    for (const excelHeader of excelHeaders) {
      const normalized = excelHeader.trim().toLowerCase().replace(/\s+/g, '_');
      const matched = allFields.find(f => f.toLowerCase() === normalized);
      if (matched) {
        headerMap[excelHeader] = matched;
      } else {
        // Try alias lookup (with spaces preserved for Arabic phrases)
        const aliasKey = excelHeader.trim().toLowerCase().replace(/\s+/g, ' ');
        const aliasMatch = HEADER_ALIASES[aliasKey];
        if (aliasMatch && allFields.includes(aliasMatch)) {
          headerMap[excelHeader] = aliasMatch;
        } else {
          // Try partial match: strip parenthetical, common prefixes
          const stripped = normalized.replace(/[()]/g, '').replace(/^field_?/i, '');
          const partialMatch = allFields.find(f => f.toLowerCase() === stripped);
          if (partialMatch) headerMap[excelHeader] = partialMatch;
        }
      }
    }

    // Remap rows using normalized headers
    const rows: Record<string, any>[] = rawRows.map(rawRow => {
      const mapped: Record<string, any> = {};
      for (const [excelKey, value] of Object.entries(rawRow)) {
        const dbField = headerMap[excelKey];
        if (dbField) {
          mapped[dbField] = value;
        }
      }
      return mapped;
    });

    // Check if any required fields were not found in headers
    const mappedFields = new Set(Object.values(headerMap));
    const missingHeaders = config.requiredFields.filter(f => !mappedFields.has(f));
    if (missingHeaders.length > 0) {
      return sendError(res, 'VALIDATION_ERROR', 
        `Required columns not found in file: ${missingHeaders.join(', ')}. ` +
        `Found columns: ${excelHeaders.join(', ')}. ` + 
        `Please download the template for the correct format.`, 400);
    }

    const results = {
      total: rows.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; message: string; data?: Record<string, any> }[],
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 for 1-indexed + header row

        // Validate required fields
        const missingFields = config.requiredFields.filter(f => {
          const val = row[f];
          return val === undefined || val === null || String(val).trim() === '';
        });

        if (missingFields.length > 0) {
          results.errors.push({ row: rowNum, message: `Missing required fields: ${missingFields.join(', ')}`, data: row });
          results.skipped++;
          continue;
        }

        // Sanitize and build insert data
        const insertData: Record<string, any> = {};
        for (const field of allFields) {
          if (row[field] !== undefined && row[field] !== '') {
            let val = row[field];
            // Boolean conversion
            if (field.startsWith('is_')) {
              val = val === true || val === 'true' || val === '1' || val === 1 || val === 'yes' || val === 'Yes';
            }
            // Number conversion for sort_order, conversion_factor, etc.
            if (['sort_order', 'conversion_factor', 'discount_percentage', 'parent_group_id', 'base_unit_id', 'unit_type_id', 'rate', 'display_order'].includes(field)) {
              val = val === '' || val === null ? null : Number(val);
              if (isNaN(val as number)) val = null;
            }
            insertData[field] = val;
          }
        }

        // Auto-generate code if missing
        if (config.codeAutoGen && !insertData.code) {
          const nameField = config.requiredFields[0]; // First required field is typically the name
          const nameVal = String(insertData[nameField] || '');
          insertData.code = nameVal.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 30);
        }

        // Set defaults - only if the table has is_active column
        if (allFields.includes('is_active') && insertData.is_active === undefined) insertData.is_active = true;

        // Apply table-specific defaults for NOT NULL columns
        if (config.defaults) {
          for (const [key, defaultVal] of Object.entries(config.defaults)) {
            if (insertData[key] === undefined || insertData[key] === '') {
              insertData[key] = defaultVal;
            }
          }
        }

        // Auto-populate: if table has 'name' NOT NULL and name_en is provided but name is not, copy it
        if (!insertData.name && insertData.name_en) {
          insertData.name = insertData.name_en;
        }
        // Vice versa: if name is provided but name_en is not, and name_en is in the fields list
        if (!insertData.name_en && insertData.name && allFields.includes('name_en')) {
          insertData.name_en = insertData.name;
        }
        // Auto-populate name_ar: if name contains Arabic characters and name_ar is not set
        if (!insertData.name_ar && insertData.name && allFields.includes('name_ar')) {
          if (/[\u0600-\u06FF]/.test(String(insertData.name))) {
            insertData.name_ar = insertData.name;
          }
        }
        // Auto-populate name from name_ar if name is not set and name_ar is provided
        if (!insertData.name && insertData.name_ar && allFields.includes('name')) {
          insertData.name = insertData.name_ar;
        }

        // Check for duplicates (active records)
        let existingId: number | null = null;
        let softDeletedId: number | null = null;
        if (config.uniqueFields.length > 0 && insertData.code) {
          const dupConditions = config.uniqueFields.map((f, idx) => `${f} = $${idx + 1}`).join(' AND ');
          const dupParams = config.uniqueFields.map(f => insertData[f]);
          // Check active records first
          let dupQuery = `SELECT id, deleted_at FROM ${config.table} WHERE ${dupConditions}`;
          if (config.hasCompanyId) {
            dupParams.push(companyId);
            dupQuery += ` AND company_id = $${dupParams.length}`;
          }
          const dup = await client.query(dupQuery, dupParams);
          for (const r of dup.rows) {
            if (!r.deleted_at) {
              existingId = r.id;
            } else {
              softDeletedId = r.id;
            }
          }
        }

        // Handle based on import mode
        if (existingId && importMode === 'skip') {
          // Skip mode: report duplicate and continue
          results.errors.push({ row: rowNum, message: `Duplicate code: ${insertData.code}`, data: row });
          results.skipped++;
          continue;
        }

        if (!existingId && !softDeletedId && importMode === 'update_only') {
          // Update-only mode: skip rows that don't exist (even soft-deleted)
          results.errors.push({ row: rowNum, message: `Record not found for update: ${insertData.code || '(no code)'}`, data: row });
          results.skipped++;
          continue;
        }

        // Restore soft-deleted records: if no active record but a soft-deleted one exists, restore it
        if (!existingId && softDeletedId && (importMode === 'upsert' || importMode === 'update_only')) {
          const restoreFields = Object.keys(insertData).filter(f => !config.uniqueFields.includes(f));
          restoreFields.push('deleted_at');
          if (config.hasUpdatedAt !== false) restoreFields.push('updated_at');
          const setClauses = restoreFields.map((f, idx) => `${f} = $${idx + 1}`);
          const restoreValues: any[] = restoreFields.map(f => {
            if (f === 'deleted_at') return null;
            if (f === 'updated_at') return new Date();
            return insertData[f];
          });
          restoreValues.push(softDeletedId);
          const restoreQuery = `UPDATE ${config.table} SET ${setClauses.join(', ')} WHERE id = $${restoreValues.length}`;
          try {
            await client.query(`SAVEPOINT row_${i}`);
            await client.query(restoreQuery, restoreValues);
            await client.query(`RELEASE SAVEPOINT row_${i}`);
            results.inserted++;
          } catch (err: any) {
            await client.query(`ROLLBACK TO SAVEPOINT row_${i}`);
            results.errors.push({ row: rowNum, message: `Restore failed: ${err.message}`, data: row });
            results.skipped++;
          }
          continue;
        }

        if (existingId && (importMode === 'upsert' || importMode === 'update_only')) {
          // ── UPDATE existing record ──
          // Build SET clause: update all provided fields except uniqueFields and company_id
          const updateFields = Object.keys(insertData).filter(f => !config.uniqueFields.includes(f));
          if (config.hasUpdatedAt !== false) {
            updateFields.push('updated_at');
          }
          const setClauses = updateFields.map((f, idx) => `${f} = $${idx + 1}`);
          const updateValues: any[] = updateFields.map(f => {
            if (f === 'updated_at') return new Date();
            return insertData[f];
          });
          updateValues.push(existingId);

          const updateQuery = `UPDATE ${config.table} SET ${setClauses.join(', ')} WHERE id = $${updateValues.length}`;

          try {
            await client.query(`SAVEPOINT row_${i}`);
            await client.query(updateQuery, updateValues);
            await client.query(`RELEASE SAVEPOINT row_${i}`);
            results.updated++;
          } catch (err: any) {
            await client.query(`ROLLBACK TO SAVEPOINT row_${i}`);
            results.errors.push({ row: rowNum, message: `Update failed: ${err.message}`, data: row });
            results.skipped++;
          }
          continue;
        }

        // ── INSERT new record ──
        const fields = Object.keys(insertData);
        if (config.hasCompanyId) fields.push('company_id');
        fields.push('created_at');

        const values = Object.values(insertData);
        if (config.hasCompanyId) values.push(companyId);
        values.push(new Date());

        // Only add updated_at if the table has it
        if (config.hasUpdatedAt !== false) {
          fields.push('updated_at');
          values.push(new Date());
        }

        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
        const insertQuery = `INSERT INTO ${config.table} (${fields.join(', ')}) VALUES (${placeholders})`;

        // Use SAVEPOINT so a failed row doesn't abort the entire transaction
        try {
          await client.query(`SAVEPOINT row_${i}`);
          await client.query(insertQuery, values);
          await client.query(`RELEASE SAVEPOINT row_${i}`);
          results.inserted++;
        } catch (err: any) {
          await client.query(`ROLLBACK TO SAVEPOINT row_${i}`);
          if (err.code === '23505' && importMode === 'upsert') {
            // Unique violation in upsert mode — likely a soft-deleted record; try to restore it
            try {
              const restoreFields = Object.keys(insertData);
              restoreFields.push('deleted_at');
              if (config.hasUpdatedAt !== false) restoreFields.push('updated_at');
              const setClauses = restoreFields.map((f, idx) => `${f} = $${idx + 1}`);
              const restoreValues: any[] = restoreFields.map(f => {
                if (f === 'deleted_at') return null;
                if (f === 'updated_at') return new Date();
                return insertData[f];
              });
              // Find by unique fields
              const restoreCond = config.uniqueFields.map((f, idx) => `${f} = $${restoreValues.length + idx + 1}`).join(' AND ');
              const restoreCondValues = config.uniqueFields.map(f => insertData[f]);
              let restoreQ = `UPDATE ${config.table} SET ${setClauses.join(', ')} WHERE ${restoreCond}`;
              if (config.hasCompanyId) {
                restoreCondValues.push(companyId);
                restoreQ += ` AND company_id = $${restoreValues.length + restoreCondValues.length}`;
              }
              await client.query(`SAVEPOINT row_${i}_restore`);
              await client.query(restoreQ, [...restoreValues, ...restoreCondValues]);
              await client.query(`RELEASE SAVEPOINT row_${i}_restore`);
              results.inserted++;
            } catch (restoreErr: any) {
              await client.query(`ROLLBACK TO SAVEPOINT row_${i}_restore`).catch(() => {});
              results.errors.push({ row: rowNum, message: `Duplicate entry: ${err.detail || insertData.code}`, data: row });
              results.skipped++;
            }
          } else if (err.code === '23505') {
            results.errors.push({ row: rowNum, message: `Duplicate entry: ${err.detail || insertData.code}`, data: row });
            results.skipped++;
          } else if (err.code === '23503') {
            results.errors.push({ row: rowNum, message: `Invalid reference: ${err.detail}`, data: row });
            results.skipped++;
          } else {
            results.errors.push({ row: rowNum, message: err.message, data: row });
            results.skipped++;
          }
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const parts = [];
    if (results.inserted > 0) parts.push(`${results.inserted} inserted`);
    if (results.updated > 0) parts.push(`${results.updated} updated`);
    if (results.skipped > 0) parts.push(`${results.skipped} skipped`);
    const message = parts.length > 0 
      ? `Import complete: ${parts.join(', ')} (${results.total} total)`
      : 'No records were processed';

    sendSuccess(res, results, 200, undefined, message);

  } catch (err: any) {
    console.error('Import error:', err);
    sendError(res, 'SERVER_ERROR', `Import failed: ${err.message}`, 500);
  }
});

// ─── LIST AVAILABLE IMPORT RESOURCES ──────────────────────────────────────────

router.get('/import/resources', authenticate, (req: Request, res: Response) => {
  const resources = Object.entries(TABLE_CONFIGS).map(([key, cfg]) => ({
    resource: key,
    table: cfg.table,
    requiredFields: cfg.requiredFields,
    optionalFields: cfg.optionalFields,
    sampleCount: cfg.sampleData.length,
  }));
  sendSuccess(res, resources);
});

export default router;
export { TABLE_CONFIGS };
