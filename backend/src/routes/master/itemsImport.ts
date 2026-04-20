/**
 * Professional Items/Products Import
 * Handles Excel file upload with auto-creation of linked records:
 * - Units (الوحدات)
 * - Main Groups (المجموعات الرئيسية)
 * - Sub Groups (المجموعات الفرعية)
 * - Vendors/Suppliers (الموردين)
 * - Price Lists & Item Prices (التسعير متعدد المستويات)
 * - Packaging via UOM conversions (العبوة)
 * - Vendor-Item links (ربط المورد بالصنف)
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';
import { PoolClient } from 'pg';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for items
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are accepted'));
    }
  },
});

// ─── COLUMN MAPPING: Arabic Excel headers → DB fields ─────────────────────────
const HEADER_MAP: Record<string, string> = {
  // Arabic headers (exact match from user's Excel)
  'رقم الصنف': 'code',
  'كود الصنف': 'code',
  'باركود1': 'barcode',
  'باركود 1': 'barcode',
  'باركود': 'barcode',
  'الباركود': 'barcode',
  'باركود2': 'barcode2',
  'باركود 2': 'barcode2',
  'رقم المنتج': 'manufacturer_part_no',
  'اسم الصنف': 'name',
  'اسم المنتج': 'name',
  'الاسم': 'name',
  'الوحدة': 'unit_name',
  'وحدة القياس': 'unit_name',
  'المجموعة الرئيسية': 'main_group_name',
  'المجموعة الفرعية': 'sub_group_name',
  'العبوة': 'package_name',
  'التعبئة': 'package_name',
  'سعر التكلفة': 'standard_cost',
  'تكلفة': 'standard_cost',
  'اخر سعر توريد': 'last_purchase_cost',
  'آخر سعر توريد': 'last_purchase_cost',
  'سعر التوريد': 'last_purchase_cost',
  'الكمية': 'opening_qty',
  'كمية': 'opening_qty',
  'سعر1': 'price1',
  'سعر 1': 'price1',
  'السعر 1': 'price1',
  'سعر البيع': 'price1',
  'سعر2': 'price2',
  'سعر 2': 'price2',
  'السعر 2': 'price2',
  'سعر3': 'price3',
  'سعر 3': 'price3',
  'السعر 3': 'price3',
  'المورد': 'vendor_name',
  'اسم المورد': 'vendor_name',
  'مورد': 'vendor_name',
  // English aliases
  'item_code': 'code',
  'item code': 'code',
  'code': 'code',
  'barcode': 'barcode',
  'barcode1': 'barcode',
  'barcode 1': 'barcode',
  'barcode2': 'barcode2',
  'barcode 2': 'barcode2',
  'product_number': 'manufacturer_part_no',
  'product number': 'manufacturer_part_no',
  'item_name': 'name',
  'item name': 'name',
  'name': 'name',
  'unit': 'unit_name',
  'uom': 'unit_name',
  'main_group': 'main_group_name',
  'main group': 'main_group_name',
  'sub_group': 'sub_group_name',
  'sub group': 'sub_group_name',
  'package': 'package_name',
  'packaging': 'package_name',
  'cost_price': 'standard_cost',
  'cost price': 'standard_cost',
  'standard_cost': 'standard_cost',
  'last_supply_price': 'last_purchase_cost',
  'last supply price': 'last_purchase_cost',
  'last_purchase_cost': 'last_purchase_cost',
  'quantity': 'opening_qty',
  'qty': 'opening_qty',
  'opening_qty': 'opening_qty',
  'price1': 'price1',
  'price 1': 'price1',
  'selling_price': 'price1',
  'price2': 'price2',
  'price 2': 'price2',
  'price3': 'price3',
  'price 3': 'price3',
  'vendor': 'vendor_name',
  'supplier': 'vendor_name',
  'vendor_name': 'vendor_name',
  'supplier_name': 'vendor_name',
  'الاسم بالعربي': 'name_ar',
  'الاسم العربي': 'name_ar',
  'اسم عربي': 'name_ar',
  'name_ar': 'name_ar',
  'arabic_name': 'name_ar',
  'الاسم بالانجليزي': 'name_en',
  'name_en': 'name_en',
  'english_name': 'name_en',
  'الوصف': 'description',
  'description': 'description',
  'نوع الصنف': 'item_type',
  'item_type': 'item_type',
};

// All recognized internal field names
const KNOWN_FIELDS = [
  'code', 'barcode', 'barcode2', 'manufacturer_part_no', 'name', 'name_ar', 'name_en',
  'description', 'item_type',
  'unit_name', 'main_group_name', 'sub_group_name', 'package_name',
  'standard_cost', 'last_purchase_cost', 'opening_qty',
  'price1', 'price2', 'price3',
  'vendor_name',
];

// ─── HELPER: Find or create a unit by name ────────────────────────────────────
async function findOrCreateUnit(
  client: PoolClient, companyId: number, unitName: string, cache: Map<string, number>
): Promise<number> {
  const key = unitName.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  // Search in units_of_measure by name, name_ar, or code (case-insensitive)
  // Check both global (company_id IS NULL) and company-specific records
  const result = await client.query(
    `SELECT id FROM units_of_measure WHERE (company_id = $1 OR company_id IS NULL) AND (deleted_at IS NULL AND (is_deleted IS NULL OR is_deleted = false))
     AND (LOWER(name) = $2 OR LOWER(name_ar) = $2 OR LOWER(code) = $2)`,
    [companyId, key]
  );

  if (result.rows.length > 0) {
    cache.set(key, result.rows[0].id);
    return result.rows[0].id;
  }

  // Auto-create the unit in units_of_measure
  const codeBase = unitName.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const code = (codeBase || 'UOM') + '_' + Date.now().toString(36).toUpperCase().slice(-4);
  const isArabic = /[\u0600-\u06FF]/.test(unitName);
  const sp = `sp_unit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    const insert = await client.query(
      `INSERT INTO units_of_measure (company_id, code, name, name_ar, name_en, uom_type, unit_type, is_base, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, 'unit', 'other', false, true, NOW()) RETURNING id`,
      [companyId, code, unitName.trim(), isArabic ? unitName.trim() : null, isArabic ? null : unitName.trim()]
    );
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    cache.set(key, insert.rows[0].id);
    return insert.rows[0].id;
  } catch (err: any) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    if (err.code === '23505') {
      // Unit code conflict — try finding by broader search
      const fallback = await client.query(
        `SELECT id FROM units_of_measure WHERE (company_id = $1 OR company_id IS NULL) AND (deleted_at IS NULL AND (is_deleted IS NULL OR is_deleted = false))
         AND (LOWER(name) = $2 OR LOWER(name_ar) = $2 OR LOWER(code) = $2) LIMIT 1`,
        [companyId, key]
      );
      if (fallback.rows.length > 0) {
        cache.set(key, fallback.rows[0].id);
        return fallback.rows[0].id;
      }
    }
    throw err;
  }
}

// ─── HELPER: Find or create item group ────────────────────────────────────────
async function findOrCreateGroup(
  client: PoolClient, companyId: number, groupName: string, parentId: number | null, cache: Map<string, number>
): Promise<number> {
  const key = `${parentId || 'root'}:${groupName.trim().toLowerCase()}`;
  if (cache.has(key)) return cache.get(key)!;

  // Search by name, name_ar, name_en, or the unique index expression COALESCE(name_en, name)
  let query = `SELECT id FROM item_groups WHERE company_id = $1 AND deleted_at IS NULL
     AND (LOWER(name) = $2 OR LOWER(name_ar) = $2 OR LOWER(name_en) = $2 OR LOWER(COALESCE(name_en, name)) = $2)`;
  const params: any[] = [companyId, groupName.trim().toLowerCase()];

  if (parentId) {
    query += ` AND parent_id = $3`;
    params.push(parentId);
  } else {
    query += ` AND parent_id IS NULL`;
  }

  const result = await client.query(query, params);

  if (result.rows.length > 0) {
    cache.set(key, result.rows[0].id);
    return result.rows[0].id;
  }

  // Also check without parent constraint (in case parent_group_id is used instead)
  if (parentId) {
    const altResult = await client.query(
      `SELECT id FROM item_groups WHERE company_id = $1 AND deleted_at IS NULL
       AND (LOWER(name) = $2 OR LOWER(name_ar) = $2 OR LOWER(name_en) = $2 OR LOWER(COALESCE(name_en, name)) = $2)
       AND parent_group_id = $3`,
      [companyId, groupName.trim().toLowerCase(), parentId]
    );
    if (altResult.rows.length > 0) {
      cache.set(key, altResult.rows[0].id);
      return altResult.rows[0].id;
    }
  }

  // Auto-create the group
  const code = groupName.trim().replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_').toUpperCase().substring(0, 30);
  const isArabic = /[\u0600-\u06FF]/.test(groupName);
  const level = parentId ? 2 : 1;
  const trimmedName = groupName.trim();

  const sp = `sp_grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    const insert = await client.query(
      `INSERT INTO item_groups (company_id, code, name, name_en, name_ar, parent_id, level, is_active, is_leaf, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW()) RETURNING id`,
      [
        companyId, code,
        trimmedName,
        isArabic ? null : trimmedName,
        isArabic ? trimmedName : null,
        parentId, level,
        parentId ? true : false
      ]
    );
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    cache.set(key, insert.rows[0].id);

    // Update parent to non-leaf if needed
    if (parentId) {
      await client.query(`UPDATE item_groups SET is_leaf = false WHERE id = $1`, [parentId]);
    }

    return insert.rows[0].id;
  } catch (err: any) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    if (err.code === '23505') {
      // Unique constraint violation — group exists but with different parent or different field
      // Try broader search ignoring parent
      const fallback = await client.query(
        `SELECT id FROM item_groups WHERE company_id = $1 AND deleted_at IS NULL
         AND (LOWER(name) = $2 OR LOWER(name_ar) = $2 OR LOWER(name_en) = $2 OR LOWER(COALESCE(name_en, name)) = $2)
         LIMIT 1`,
        [companyId, groupName.trim().toLowerCase()]
      );
      if (fallback.rows.length > 0) {
        cache.set(key, fallback.rows[0].id);
        return fallback.rows[0].id;
      }
    }
    throw err;
  }
}

// ─── HELPER: Find or create vendor ────────────────────────────────────────────
async function findOrCreateVendor(
  client: PoolClient, companyId: number, vendorName: string, cache: Map<string, number>
): Promise<number> {
  const key = vendorName.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const result = await client.query(
    `SELECT id FROM vendors WHERE company_id = $1 AND deleted_at IS NULL
     AND (LOWER(name) = $2 OR LOWER(name_ar) = $2)`,
    [companyId, key]
  );

  if (result.rows.length > 0) {
    cache.set(key, result.rows[0].id);
    return result.rows[0].id;
  }

  // Auto-create the vendor
  const code = 'V' + Date.now().toString(36).toUpperCase().substring(0, 8) + Math.random().toString(36).substring(2, 5).toUpperCase();
  const isArabic = /[\u0600-\u06FF]/.test(vendorName);
  const sp = `sp_vnd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    const insert = await client.query(
      `INSERT INTO vendors (company_id, code, name, name_ar, status, is_external, created_at)
       VALUES ($1, $2, $3, $4, 'active', false, NOW()) RETURNING id`,
      [companyId, code, vendorName.trim(), isArabic ? vendorName.trim() : null]
    );
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    cache.set(key, insert.rows[0].id);
    return insert.rows[0].id;
  } catch (err: any) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    if (err.code === '23505') {
      const fallback = await client.query(
        `SELECT id FROM vendors WHERE company_id = $1 AND deleted_at IS NULL
         AND (LOWER(name) = $2 OR LOWER(name_ar) = $2) LIMIT 1`,
        [companyId, key]
      );
      if (fallback.rows.length > 0) {
        cache.set(key, fallback.rows[0].id);
        return fallback.rows[0].id;
      }
    }
    throw err;
  }
}

// ─── HELPER: Ensure price list exists ─────────────────────────────────────────
async function ensurePriceList(
  client: PoolClient, companyId: number, listCode: string, listName: string, nameAr: string, cache: Map<string, number>
): Promise<number> {
  if (cache.has(listCode)) return cache.get(listCode)!;

  const result = await client.query(
    `SELECT id FROM price_lists WHERE company_id = $1 AND code = $2 AND (deleted_at IS NULL)`,
    [companyId, listCode]
  );

  if (result.rows.length > 0) {
    cache.set(listCode, result.rows[0].id);
    return result.rows[0].id;
  }

  const sp = `sp_pl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    const insert = await client.query(
      `INSERT INTO price_lists (company_id, code, name, name_ar, price_type, is_active, is_default, created_at)
       VALUES ($1, $2, $3, $4, 'selling', true, $5, NOW()) RETURNING id`,
      [companyId, listCode, listName, nameAr, listCode === 'PRICE_1']
    );
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    cache.set(listCode, insert.rows[0].id);
    return insert.rows[0].id;
  } catch (err: any) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    if (err.code === '23505') {
      const fallback = await client.query(
        `SELECT id FROM price_lists WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
        [companyId, listCode]
      );
      if (fallback.rows.length > 0) {
        cache.set(listCode, fallback.rows[0].id);
        return fallback.rows[0].id;
      }
    }
    throw err;
  }
}

// ─── TEMPLATE DOWNLOAD ────────────────────────────────────────────────────────
router.get('/import/template', authenticate, (req: Request, res: Response) => {
  const wb = XLSX.utils.book_new();

  // Data sheet with Arabic headers
  const headers = [
    'رقم الصنف', 'باركود1', 'باركود 2', 'رقم المنتج', 'اسم الصنف',
    'الوحدة', 'المجموعة الرئيسية', 'المجموعة الفرعية', 'العبوة',
    'سعر التكلفة', 'اخر سعر توريد', 'الكمية',
    'سعر1', 'سعر2', 'سعر3', 'المورد',
  ];

  const sampleData = [
    ['ITM001', '6281000000001', '6281000000002', 'PRD-001', 'صنف تجريبي',
     'قطعة', 'مواد غذائية', 'مشروبات', 'كرتون',
     10.00, 9.50, 100,
     15.00, 13.50, 12.00, 'شركة التوريدات'],
    ['ITM002', '6281000000003', '', 'PRD-002', 'صنف آخر',
     'كيلو', 'مواد غذائية', 'أرز وحبوب', '',
     20.00, 18.00, 50,
     25.00, 23.00, '', 'مؤسسة الأمل'],
  ];

  const sheetData = [headers, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));

  // Instructions sheet
  const instrData = [
    ['تعليمات استيراد الأصناف / Items Import Instructions'],
    [''],
    ['العمود', 'مطلوب', 'الوصف'],
    ['رقم الصنف', 'نعم ✓', 'كود الصنف الفريد - يجب أن يكون فريداً لكل صنف'],
    ['باركود1', 'لا', 'الباركود الرئيسي للصنف'],
    ['باركود 2', 'لا', 'باركود إضافي للصنف'],
    ['رقم المنتج', 'لا', 'رقم المنتج من الشركة المصنعة'],
    ['اسم الصنف', 'نعم ✓', 'اسم الصنف - يفضل كتابته باللغة العربية'],
    ['الوحدة', 'نعم ✓', 'وحدة القياس - إذا لم تكن موجودة سيتم إنشاؤها تلقائياً'],
    ['المجموعة الرئيسية', 'لا', 'المجموعة الرئيسية - إذا لم تكن موجودة سيتم إنشاؤها تلقائياً'],
    ['المجموعة الفرعية', 'لا', 'المجموعة الفرعية - إذا لم تكن موجودة سيتم إنشاؤها تلقائياً تحت المجموعة الرئيسية'],
    ['العبوة', 'لا', 'وحدة التعبئة/التغليف - إذا لم تكن موجودة سيتم إنشاؤها كوحدة جديدة'],
    ['سعر التكلفة', 'لا', 'سعر التكلفة المعيارية'],
    ['اخر سعر توريد', 'لا', 'آخر سعر توريد/شراء للصنف'],
    ['الكمية', 'لا', 'الكمية المتوفرة حالياً (للاستفادة المستقبلية)'],
    ['سعر1', 'لا', 'سعر البيع الأول (الرئيسي)'],
    ['سعر2', 'لا', 'سعر البيع الثاني (الجملة مثلاً)'],
    ['سعر3', 'لا', 'سعر البيع الثالث (خاص)'],
    ['المورد', 'لا', 'اسم المورد الافتراضي - إذا لم يكن موجوداً سيتم إنشاؤه تلقائياً'],
    [''],
    ['ملاحظات هامة:'],
    ['- الأصناف المكررة (نفس رقم الصنف) سيتم تجاوزها أو تحديثها حسب وضع الاستيراد'],
    ['- البيانات المرتبطة (الوحدات، المجموعات، الموردين) سيتم إنشاؤها تلقائياً إذا لم تكن موجودة'],
    ['- الحد الأقصى 50000 صنف لكل عملية استيراد'],
    ['- يدعم الملفات بصيغة Excel (.xlsx, .xls) و CSV'],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 60 }];

  XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
  XLSX.utils.book_append_sheet(wb, wsInstr, 'التعليمات');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=items-import-template.xlsx');
  res.send(buffer);
});

// ─── IMPORT ENDPOINT ──────────────────────────────────────────────────────────
router.post('/import', authenticate, loadCompanyContext, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return sendError(res, 'VALIDATION_ERROR', 'File is required', 400);
  }

  const companyId = (req as any).companyId || (req as any).user?.company_id;
  const tenantId = (req as any).tenantId ?? companyId;
  const userId = (req as any).user?.id;

  if (!companyId) {
    return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
  }

  const importMode = (req.body?.mode || 'skip') as 'skip' | 'upsert' | 'update_only';
  if (!['skip', 'upsert', 'update_only'].includes(importMode)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid import mode. Use: skip, upsert, or update_only', 400);
  }

  try {
    // Parse Excel file
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return sendError(res, 'VALIDATION_ERROR', 'Excel file is empty', 400);
    }

    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

    if (rawRows.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'No data rows found in file', 400);
    }

    if (rawRows.length > 50000) {
      return sendError(res, 'VALIDATION_ERROR', 'Maximum 50,000 rows per import. Please split your data.', 400);
    }

    // ── Map Excel headers to internal field names ──
    const firstRow = rawRows[0];
    const excelHeaders = Object.keys(firstRow);
    const headerMap: Record<string, string> = {};

    for (const excelHeader of excelHeaders) {
      const trimmed = excelHeader.trim();
      const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');

      // Try exact Arabic/English alias
      if (HEADER_MAP[trimmed]) {
        headerMap[excelHeader] = HEADER_MAP[trimmed];
      } else if (HEADER_MAP[normalized]) {
        headerMap[excelHeader] = HEADER_MAP[normalized];
      } else {
        // Try underscore variant
        const underscored = normalized.replace(/\s+/g, '_');
        if (HEADER_MAP[underscored]) {
          headerMap[excelHeader] = HEADER_MAP[underscored];
        } else {
          // Direct field name match
          if (KNOWN_FIELDS.includes(underscored)) {
            headerMap[excelHeader] = underscored;
          }
        }
      }
    }

    // Remap rows
    const rows: Record<string, any>[] = rawRows.map(rawRow => {
      const mapped: Record<string, any> = {};
      for (const [excelKey, value] of Object.entries(rawRow)) {
        const field = headerMap[excelKey];
        if (field) {
          mapped[field] = typeof value === 'string' ? value.trim() : value;
        }
      }
      return mapped;
    });

    // Validate required columns exist
    const mappedFields = new Set(Object.values(headerMap));
    if (!mappedFields.has('code')) {
      return sendError(res, 'VALIDATION_ERROR',
        `Required column "رقم الصنف" (Item Code) not found. Found columns: ${excelHeaders.join(', ')}`,
        400);
    }
    if (!mappedFields.has('name')) {
      return sendError(res, 'VALIDATION_ERROR',
        `Required column "اسم الصنف" (Item Name) not found. Found columns: ${excelHeaders.join(', ')}`,
        400);
    }

    // ── Process rows ──
    const results = {
      total: rows.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; message: string; data?: Record<string, any> }[],
      autoCreated: {
        units: [] as string[],
        mainGroups: [] as string[],
        subGroups: [] as string[],
        vendors: [] as string[],
        priceLists: [] as string[],
      },
    };

    // Caches for auto-created records (avoid re-querying)
    const unitCache = new Map<string, number>();
    const groupCache = new Map<string, number>();
    const vendorCache = new Map<string, number>();
    const priceListCache = new Map<string, number>();

    // Track auto-created names for reporting
    const createdUnitNames = new Set<string>();
    const createdGroupNames = new Set<string>();
    const createdVendorNames = new Set<string>();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Pre-warm caches: load existing units_of_measure, groups, vendors
      const existingUnits = await client.query(
        `SELECT id, LOWER(name) as lname, LOWER(COALESCE(name_ar,'')) as lname_ar, LOWER(code) as lcode FROM units_of_measure WHERE (company_id = $1 OR company_id IS NULL) AND (deleted_at IS NULL AND (is_deleted IS NULL OR is_deleted = false))`,
        [companyId]
      );
      for (const u of existingUnits.rows) {
        if (u.lname) unitCache.set(u.lname, u.id);
        if (u.lname_ar) unitCache.set(u.lname_ar, u.id);
        if (u.lcode) unitCache.set(u.lcode, u.id);
      }

      const existingGroups = await client.query(
        `SELECT id, LOWER(name) as lname, LOWER(COALESCE(name_ar,'')) as lname_ar, parent_id FROM item_groups WHERE company_id = $1 AND deleted_at IS NULL`,
        [companyId]
      );
      for (const g of existingGroups.rows) {
        const prefix = g.parent_id ? `${g.parent_id}` : 'root';
        if (g.lname) groupCache.set(`${prefix}:${g.lname}`, g.id);
        if (g.lname_ar) groupCache.set(`${prefix}:${g.lname_ar}`, g.id);
      }

      const existingVendors = await client.query(
        `SELECT id, LOWER(name) as lname, LOWER(COALESCE(name_ar,'')) as lname_ar FROM vendors WHERE company_id = $1 AND deleted_at IS NULL`,
        [companyId]
      );
      for (const v of existingVendors.rows) {
        if (v.lname) vendorCache.set(v.lname, v.id);
        if (v.lname_ar) vendorCache.set(v.lname_ar, v.id);
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 for 1-indexed + header row

        // Validate required fields
        if (!row.code || String(row.code).trim() === '') {
          results.errors.push({ row: rowNum, message: 'Missing required field: رقم الصنف (Item Code)', data: row });
          results.skipped++;
          continue;
        }
        if (!row.name || String(row.name).trim() === '') {
          results.errors.push({ row: rowNum, message: 'Missing required field: اسم الصنف (Item Name)', data: row });
          results.skipped++;
          continue;
        }

        const code = String(row.code).trim();
        const name = String(row.name).trim();

        // ── Resolve linked records BEFORE savepoint (so they survive row rollbacks) ──
        let baseUomId: number | null = null;
        let mainGroupId: number | null = null;
        let subGroupId: number | null = null;
        let vendorId: number | null = null;
        let packageUomId: number | null = null;

        try {
          // ── Resolve unit (الوحدة) ──
          if (row.unit_name && String(row.unit_name).trim()) {
            const unitNameBefore = unitCache.size;
            baseUomId = await findOrCreateUnit(client, companyId, String(row.unit_name), unitCache);
            if (unitCache.size > unitNameBefore) {
              createdUnitNames.add(String(row.unit_name).trim());
            }
          }

          // If no unit provided, try to find a default or require it
          if (!baseUomId) {
            // Try to find a "piece" / "قطعة" unit as default
            const defaultUnit = await client.query(
              `SELECT id FROM units_of_measure WHERE (company_id = $1 OR company_id IS NULL) AND (deleted_at IS NULL AND (is_deleted IS NULL OR is_deleted = false))
               AND (LOWER(name) IN ('piece', 'pieces', 'pcs', 'each') OR LOWER(name_ar) IN ('قطعة', 'حبة'))
               LIMIT 1`,
              [companyId]
            );
            if (defaultUnit.rows.length > 0) {
              baseUomId = defaultUnit.rows[0].id;
            } else {
              // Create a default "قطعة" unit
              const unitNameBefore = unitCache.size;
              baseUomId = await findOrCreateUnit(client, companyId, 'قطعة', unitCache);
              if (unitCache.size > unitNameBefore) {
                createdUnitNames.add('قطعة');
              }
            }
          }

          // ── Resolve main group (المجموعة الرئيسية) ──
          if (row.main_group_name && String(row.main_group_name).trim()) {
            const sizeB = groupCache.size;
            mainGroupId = await findOrCreateGroup(client, companyId, String(row.main_group_name), null, groupCache);
            if (groupCache.size > sizeB) {
              createdGroupNames.add(String(row.main_group_name).trim());
            }
          }

          // ── Resolve sub group (المجموعة الفرعية) ──
          if (row.sub_group_name && String(row.sub_group_name).trim()) {
            // Sub-group needs a parent; if no main group found, create a "عام" default group
            if (!mainGroupId) {
              const sizeB = groupCache.size;
              mainGroupId = await findOrCreateGroup(client, companyId, 'عام', null, groupCache);
              if (groupCache.size > sizeB) {
                createdGroupNames.add('عام');
              }
            }
            const sizeB = groupCache.size;
            subGroupId = await findOrCreateGroup(client, companyId, String(row.sub_group_name), mainGroupId, groupCache);
            if (groupCache.size > sizeB) {
              createdGroupNames.add(String(row.sub_group_name).trim());
            }
          }

          // ── Resolve vendor (المورد) ──
          if (row.vendor_name && String(row.vendor_name).trim()) {
            const sizeB = vendorCache.size;
            vendorId = await findOrCreateVendor(client, companyId, String(row.vendor_name), vendorCache);
            if (vendorCache.size > sizeB) {
              createdVendorNames.add(String(row.vendor_name).trim());
            }
          }

          // ── Resolve package unit (العبوة) → purchase_uom_id ──
          if (row.package_name && String(row.package_name).trim()) {
            const sizeB = unitCache.size;
            packageUomId = await findOrCreateUnit(client, companyId, String(row.package_name), unitCache);
            if (unitCache.size > sizeB) {
              createdUnitNames.add(String(row.package_name).trim());
            }
          }
        } catch (linkErr: any) {
          // Failed to resolve linked records — skip this row
          results.errors.push({ row: rowNum, message: `Failed to resolve linked data: ${linkErr.message}`, data: row });
          results.skipped++;
          continue;
        }

        // The group_id on items is the most specific group (sub if exists, else main)
        const groupId = subGroupId || mainGroupId;

        // ── Parse numeric fields ──
        const standardCost = row.standard_cost ? Number(row.standard_cost) || 0 : 0;
        const lastPurchaseCost = row.last_purchase_cost ? Number(row.last_purchase_cost) || 0 : 0;
        const price1 = row.price1 ? Number(row.price1) || 0 : 0;
        const barcode = row.barcode ? String(row.barcode).trim() : null;
        const barcode2 = row.barcode2 ? String(row.barcode2).trim() : null;
        const mfgPartNo = row.manufacturer_part_no ? String(row.manufacturer_part_no).trim() : null;
        const nameAr = row.name_ar ? String(row.name_ar).trim() : (/[\u0600-\u06FF]/.test(name) ? name : null);
        const nameEn = row.name_en ? String(row.name_en).trim() : (!/[\u0600-\u06FF]/.test(name) ? name : null);
        const description = row.description ? String(row.description).trim() : null;
        const itemType = row.item_type ? String(row.item_type).trim() : 'trading_goods';

        try {
          // ── Now create savepoint for item-level operations ──
          await client.query(`SAVEPOINT row_${i}`);

          // ── Check for existing item ──
          let existingId: number | null = null;
          let softDeletedId: number | null = null;
          const dupCheck = await client.query(
            `SELECT id, deleted_at FROM items WHERE company_id = $1 AND code = $2`,
            [companyId, code]
          );
          for (const r of dupCheck.rows) {
            if (!r.deleted_at) existingId = r.id;
            else softDeletedId = r.id;
          }

          // ── Handle based on import mode ──
          if (existingId && importMode === 'skip') {
            await client.query(`RELEASE SAVEPOINT row_${i}`);
            results.errors.push({ row: rowNum, message: `Duplicate item code: ${code}`, data: row });
            results.skipped++;
            continue;
          }

          if (!existingId && !softDeletedId && importMode === 'update_only') {
            await client.query(`RELEASE SAVEPOINT row_${i}`);
            results.errors.push({ row: rowNum, message: `Item not found for update: ${code}`, data: row });
            results.skipped++;
            continue;
          }

          let itemId: number;

          if (existingId && (importMode === 'upsert' || importMode === 'update_only')) {
            // ── UPDATE existing item ──
            await client.query(
              `UPDATE items SET
                name = $1, name_ar = $2, name_en = $3, barcode = $4,
                base_uom_id = $5, group_id = $6, default_vendor_id = COALESCE($7, default_vendor_id),
                standard_cost = $8, last_purchase_cost = $9, base_selling_price = $10,
                purchase_uom_id = COALESCE($11, purchase_uom_id),
                manufacturer_part_no = COALESCE($12, manufacturer_part_no),
                description = COALESCE($13, description),
                item_type = $14,
                updated_by = $15, updated_at = NOW()
              WHERE id = $16`,
              [
                name, nameAr, nameEn, barcode,
                baseUomId, groupId, vendorId,
                standardCost, lastPurchaseCost, price1,
                packageUomId, mfgPartNo, description, itemType,
                userId, existingId,
              ]
            );
            itemId = existingId;
            results.updated++;
          } else if (!existingId && softDeletedId && (importMode === 'upsert' || importMode === 'update_only')) {
            // ── RESTORE soft-deleted item ──
            await client.query(
              `UPDATE items SET
                name = $1, name_ar = $2, name_en = $3, barcode = $4,
                base_uom_id = $5, group_id = $6, default_vendor_id = $7,
                standard_cost = $8, last_purchase_cost = $9, base_selling_price = $10,
                purchase_uom_id = $11, manufacturer_part_no = $12, description = $13, item_type = $14,
                deleted_at = NULL, is_active = true,
                updated_by = $15, updated_at = NOW()
              WHERE id = $16`,
              [
                name, nameAr, nameEn, barcode,
                baseUomId, groupId, vendorId,
                standardCost, lastPurchaseCost, price1,
                packageUomId, mfgPartNo, description, itemType,
                userId, softDeletedId,
              ]
            );
            itemId = softDeletedId;
            results.inserted++;
          } else {
            // ── INSERT new item ──
            const insertResult = await client.query(
              `INSERT INTO items (
                company_id, tenant_id, code, name, name_ar, name_en,
                barcode, base_uom_id, purchase_uom_id, group_id,
                default_vendor_id, standard_cost, last_purchase_cost, base_selling_price,
                manufacturer_part_no, description, item_type, is_active,
                created_by, created_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, $16, $17, true,
                $18, NOW()
              ) RETURNING id`,
              [
                companyId, tenantId, code, name, nameAr, nameEn,
                barcode, baseUomId, packageUomId, groupId,
                vendorId, standardCost, lastPurchaseCost, price1,
                mfgPartNo, description, itemType,
                userId,
              ]
            );
            itemId = insertResult.rows[0].id;
            results.inserted++;
          }

          // ── Store barcode2 as secondary barcode (in manufacturer_part_no if not used, or just update) ──
          // barcode2 is stored in a separate field if available; since there's no barcode2 column,
          // we use manufacturer_part_no if it's empty, or skip if already used
          if (barcode2 && !mfgPartNo) {
            await client.query(
              `UPDATE items SET manufacturer_part_no = $1 WHERE id = $2 AND manufacturer_part_no IS NULL`,
              [barcode2, itemId]
            );
          }

          // ── Create package UOM conversion if package differs from base unit ──
          if (packageUomId && packageUomId !== baseUomId) {
            const existingConv = await client.query(
              `SELECT id FROM item_uom_conversions WHERE item_id = $1 AND uom_id = $2 AND deleted_at IS NULL`,
              [itemId, packageUomId]
            );
            if (existingConv.rows.length === 0) {
              await client.query(
                `INSERT INTO item_uom_conversions (company_id, item_id, uom_id, conversion_factor, is_base, is_active, created_at)
                 VALUES ($1, $2, $3, 1, false, true, NOW())`,
                [companyId, itemId, packageUomId]
              );
            }
          }

          // ── Link vendor to item (vendor_items) ──
          if (vendorId) {
            const existingLink = await client.query(
              `SELECT id FROM vendor_items WHERE vendor_id = $1 AND item_id = $2`,
              [vendorId, itemId]
            );
            if (existingLink.rows.length === 0) {
              await client.query(
                `INSERT INTO vendor_items (vendor_id, item_id, unit_price, last_purchase_price, is_preferred, is_active, created_at)
                 VALUES ($1, $2, $3, $4, true, true, NOW())`,
                [vendorId, itemId, lastPurchaseCost, lastPurchaseCost]
              );
            } else {
              await client.query(
                `UPDATE vendor_items SET unit_price = $1, last_purchase_price = $2, updated_at = NOW()
                 WHERE vendor_id = $3 AND item_id = $4`,
                [lastPurchaseCost, lastPurchaseCost, vendorId, itemId]
              );
            }
          }

          // ── Create/update prices in price lists (سعر1، سعر2، سعر3) ──
          const prices = [
            { field: 'price1', code: 'PRICE_1', name: 'Price Level 1', nameAr: 'مستوى السعر 1' },
            { field: 'price2', code: 'PRICE_2', name: 'Price Level 2', nameAr: 'مستوى السعر 2' },
            { field: 'price3', code: 'PRICE_3', name: 'Price Level 3', nameAr: 'مستوى السعر 3' },
          ];

          for (const p of prices) {
            const priceVal = row[p.field] ? Number(row[p.field]) : 0;
            if (priceVal > 0) {
              const plSizeBefore = priceListCache.size;
              const priceListId = await ensurePriceList(client, companyId, p.code, p.name, p.nameAr, priceListCache);
              if (priceListCache.size > plSizeBefore) {
                results.autoCreated.priceLists.push(p.nameAr);
              }

              // Check if price entry exists
              const existingPrice = await client.query(
                `SELECT id FROM item_prices WHERE price_list_id = $1 AND item_id = $2`,
                [priceListId, itemId]
              );
              if (existingPrice.rows.length > 0) {
                await client.query(
                  `UPDATE item_prices SET price = $1, is_active = true, updated_at = NOW() WHERE id = $2`,
                  [priceVal, existingPrice.rows[0].id]
                );
              } else {
                await client.query(
                  `INSERT INTO item_prices (price_list_id, item_id, uom_id, price, min_qty, is_active, created_at)
                   VALUES ($1, $2, $3, $4, 1, true, NOW())`,
                  [priceListId, itemId, baseUomId, priceVal]
                );
              }
            }
          }

          // ── Assign item to group (item_group_assignments) ──
          if (groupId) {
            const existingAssignment = await client.query(
              `SELECT id FROM item_group_assignments WHERE item_id = $1 AND group_id = $2 AND deleted_at IS NULL`,
              [itemId, groupId]
            );
            if (existingAssignment.rows.length === 0) {
              await client.query(
                `INSERT INTO item_group_assignments (company_id, item_id, group_id, is_primary, created_at)
                 VALUES ($1, $2, $3, true, NOW())`,
                [companyId, itemId, groupId]
              );
            }
          }

          await client.query(`RELEASE SAVEPOINT row_${i}`);
        } catch (err: any) {
          try { await client.query(`ROLLBACK TO SAVEPOINT row_${i}`); } catch (_) { /* savepoint may not exist */ }

          if (err.code === '23505' && importMode === 'upsert') {
            // Unique violation in upsert mode — try to restore
            try {
              await client.query(`SAVEPOINT row_${i}_restore`);
              await client.query(
                `UPDATE items SET
                  name = $1, name_ar = $2, name_en = $3, barcode = $4,
                  deleted_at = NULL, is_active = true,
                  updated_by = $5, updated_at = NOW()
                WHERE company_id = $6 AND code = $7`,
                [name, nameAr, nameEn, barcode, userId, companyId, code]
              );
              await client.query(`RELEASE SAVEPOINT row_${i}_restore`);
              results.inserted++;
            } catch (restoreErr: any) {
              await client.query(`ROLLBACK TO SAVEPOINT row_${i}_restore`).catch(() => {});
              results.errors.push({ row: rowNum, message: `Duplicate: ${err.detail || code}`, data: row });
              results.skipped++;
            }
          } else if (err.code === '23505') {
            results.errors.push({ row: rowNum, message: `Duplicate item code: ${code}`, data: row });
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

    // Populate auto-created summary
    results.autoCreated.units = Array.from(createdUnitNames);
    results.autoCreated.mainGroups = Array.from(createdGroupNames);
    results.autoCreated.vendors = Array.from(createdVendorNames);

    const parts = [];
    if (results.inserted > 0) parts.push(`${results.inserted} inserted`);
    if (results.updated > 0) parts.push(`${results.updated} updated`);
    if (results.skipped > 0) parts.push(`${results.skipped} skipped`);

    const autoCreatedParts = [];
    if (results.autoCreated.units.length > 0) autoCreatedParts.push(`${results.autoCreated.units.length} units`);
    if (results.autoCreated.mainGroups.length > 0) autoCreatedParts.push(`${results.autoCreated.mainGroups.length} groups`);
    if (results.autoCreated.vendors.length > 0) autoCreatedParts.push(`${results.autoCreated.vendors.length} vendors`);
    if (results.autoCreated.priceLists.length > 0) autoCreatedParts.push(`${results.autoCreated.priceLists.length} price lists`);

    let message = parts.length > 0
      ? `Import complete: ${parts.join(', ')} (${results.total} total)`
      : 'No records were processed';

    if (autoCreatedParts.length > 0) {
      message += `. Auto-created: ${autoCreatedParts.join(', ')}`;
    }

    sendSuccess(res, results, 200, undefined, message);
  } catch (err: any) {
    console.error('Items import error:', err);
    sendError(res, 'SERVER_ERROR', `Import failed: ${err.message}`, 500);
  }
});

export default router;
