/**
 * 🏭 VENDORS / SUPPLIERS — Enterprise Route
 * ============================================
 *
 * Full CRUD + /stats + /filters for the enhanced suppliers master data.
 * Supports: supplier_types, supplier_categories, supplier_statuses,
 *           supply_terms, delivery_terms, currencies, languages,
 *           countries, cities, and sub-tables (addresses, bank_accounts, documents).
 *
 * Permissions: master:vendors:view / create / edit / delete
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { applyEnhancedAudit } from '../../middleware/enhancedAuditLog';
import { dynamicDeletionProtection } from '../../services/referenceIntegrityEngine';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);
applyEnhancedAudit(router, 'vendors');

// ─── Shared SELECT fragment ────────────────────────────────────────────────

const VENDOR_SELECT = `
  SELECT
    v.*,
    cn.name   AS country_name,
    cn.code   AS country_code,
    cn.flag_emoji AS country_flag,
    ct.name   AS city_name,
    cur.code  AS currency_code,
    cur.name  AS currency_name,
    cur.symbol AS currency_symbol,
    lang.name_en AS language_name,
    lang.name_native AS language_native_name,
    st.name_en   AS supplier_type_name,
    st.name_ar AS supplier_type_name_ar,
    sc.name_en   AS supplier_category_name,
    sc.name_ar AS supplier_category_name_ar,
    ss.name_en   AS supplier_status_name,
    ss.name_ar AS supplier_status_name_ar,
    ss.color  AS supplier_status_color,
    supt.name_en AS supply_term_name,
    delt.name_en AS delivery_term_name,
    delt.incoterm_code AS delivery_term_incoterm,
    uc.email  AS created_by_name,
    uu.email  AS updated_by_name
  FROM vendors v
  LEFT JOIN countries cn          ON v.country_id = cn.id
  LEFT JOIN cities ct             ON v.city_id = ct.id
  LEFT JOIN currencies cur        ON v.currency_id = cur.id
  LEFT JOIN system_languages lang  ON v.language_id = lang.id
  LEFT JOIN supplier_types st     ON v.supplier_type_id = st.id
  LEFT JOIN supplier_categories sc ON v.supplier_category_id = sc.id
  LEFT JOIN supplier_statuses ss  ON v.status_id = ss.id
  LEFT JOIN supply_terms supt     ON v.supply_term_id = supt.id
  LEFT JOIN delivery_terms delt   ON v.delivery_term_id = delt.id
  LEFT JOIN users uc              ON v.created_by = uc.id
  LEFT JOIN users uu              ON v.updated_by = uu.id
`;

// ─── Helper: safe table exists check ────────────────────────────────────

async function tableExists(name: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1`,
    [name]
  );
  return r.rows.length > 0;
}

// ─── Helper: safe column exists check ───────────────────────────────────

async function columnExists(table: string, column: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column]
  );
  return r.rows.length > 0;
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET /stats — aggregate KPIs
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/stats',
  requirePermission('master:vendors:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const hasIsActive = await columnExists('vendors', 'is_active');
      const hasStatusId = await columnExists('vendors', 'status_id');
      const hasSupplierTypeId = await columnExists('vendors', 'supplier_type_id');
      const hasCreditLimit = await columnExists('vendors', 'credit_limit');
      const hasRating = await columnExists('vendors', 'rating');

      let statsQuery = `
        SELECT
          COUNT(*)::int AS total,
          ${hasIsActive ? `COUNT(*) FILTER (WHERE v.is_active = true)::int AS active,
          COUNT(*) FILTER (WHERE v.is_active = false)::int AS inactive,` : `
          COUNT(*)::int AS active, 0 AS inactive,`}
          ${hasSupplierTypeId ? `COUNT(DISTINCT v.supplier_type_id)::int AS type_count,` : `0 AS type_count,`}
          COUNT(DISTINCT v.country_id)::int AS countries_count
          ${hasCreditLimit ? `, COALESCE(SUM(v.credit_limit), 0)::numeric AS total_credit_limit` : ``}
          ${hasRating ? `, COALESCE(ROUND(AVG(v.rating), 1), 0)::numeric AS avg_rating` : ``}
        FROM vendors v
        WHERE v.company_id = $1 AND v.deleted_at IS NULL
      `;

      const result = await pool.query(statsQuery, [companyId]);
      const stats = result.rows[0] || {};

      // Get by-type breakdown if supplier_types table exists
      let byType: any[] = [];
      if (hasSupplierTypeId && await tableExists('supplier_types')) {
        const typeRes = await pool.query(
          `SELECT st.name_en AS name, st.name_ar, COUNT(v.id)::int AS count
           FROM vendors v
           JOIN supplier_types st ON v.supplier_type_id = st.id
           WHERE v.company_id = $1 AND v.deleted_at IS NULL
           GROUP BY st.name_en, st.name_ar ORDER BY count DESC`,
          [companyId]
        );
        byType = typeRes.rows;
      }

      res.json({ success: true, data: { ...stats, by_type: byType } });
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch stats' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  GET /filters — distinct values for filter dropdowns
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/filters',
  requirePermission('master:vendors:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const filters: any = {};

      // Supplier types
      if (await tableExists('supplier_types')) {
        const r = await pool.query(
          `SELECT id, name_en AS name, name_ar FROM supplier_types WHERE deleted_at IS NULL ORDER BY name_en`
        );
        filters.supplier_types = r.rows;
      }

      // Supplier categories
      if (await tableExists('supplier_categories')) {
        const r = await pool.query(
          `SELECT id, name_en AS name, name_ar FROM supplier_categories WHERE deleted_at IS NULL ORDER BY name_en`
        );
        filters.supplier_categories = r.rows;
      }

      // Supplier statuses
      if (await tableExists('supplier_statuses')) {
        const r = await pool.query(
          `SELECT id, name_en AS name, name_ar, color FROM supplier_statuses WHERE deleted_at IS NULL ORDER BY sort_order, name_en`
        );
        filters.supplier_statuses = r.rows;
      }

      // Countries (used by vendors)
      const countriesRes = await pool.query(
        `SELECT DISTINCT cn.id, cn.name, cn.code, cn.flag_emoji AS flag
         FROM vendors v JOIN countries cn ON v.country_id = cn.id
         WHERE v.company_id = $1 AND v.deleted_at IS NULL
         ORDER BY cn.name`,
        [companyId]
      );
      filters.countries = countriesRes.rows;

      res.json({ success: true, data: filters });
    } catch (error) {
      console.error('Error fetching vendor filters:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch filters' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  GET / — paginated list with full filters
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/',
  requirePermission('master:vendors:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        search, is_active, vendor_type, status, supplier_type_id,
        supplier_category_id, status_id, country_id, city_id,
        page = '1', limit = '25', sort = 'code', order = 'asc',
      } = req.query;

      const params: any[] = [companyId];
      let paramIdx = 2;
      const conditions: string[] = ['v.company_id = $1', 'v.deleted_at IS NULL'];

      // Search across code, name, name_en, name_ar, short_name, tax_number
      if (search) {
        conditions.push(`(
          v.code ILIKE $${paramIdx} OR v.name ILIKE $${paramIdx} OR
          v.name_en ILIKE $${paramIdx} OR v.name_ar ILIKE $${paramIdx} OR
          v.short_name ILIKE $${paramIdx} OR v.tax_number ILIKE $${paramIdx}
        )`);
        params.push(`%${search}%`);
        paramIdx++;
      }

      // Active filter
      if (is_active !== undefined && is_active !== '') {
        const hasCol = await columnExists('vendors', 'is_active');
        if (hasCol) {
          conditions.push(`v.is_active = $${paramIdx}`);
          params.push(is_active === 'true');
          paramIdx++;
        }
      }

      // Legacy vendor_type / status text filters
      if (vendor_type) {
        conditions.push(`v.vendor_type = $${paramIdx}`);
        params.push(vendor_type);
        paramIdx++;
      }
      if (status && !status_id) {
        conditions.push(`v.status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      // New FK filters
      if (supplier_type_id) {
        conditions.push(`v.supplier_type_id = $${paramIdx}`);
        params.push(Number(supplier_type_id));
        paramIdx++;
      }
      if (supplier_category_id) {
        conditions.push(`v.supplier_category_id = $${paramIdx}`);
        params.push(Number(supplier_category_id));
        paramIdx++;
      }
      if (status_id) {
        conditions.push(`v.status_id = $${paramIdx}`);
        params.push(Number(status_id));
        paramIdx++;
      }
      if (country_id) {
        conditions.push(`v.country_id = $${paramIdx}`);
        params.push(Number(country_id));
        paramIdx++;
      }
      if (city_id) {
        conditions.push(`v.city_id = $${paramIdx}`);
        params.push(Number(city_id));
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');

      // Sorting — whitelist allowed columns
      const sortableColumns: Record<string, string> = {
        code: 'v.code', name: 'v.name', name_en: 'v.name_en', name_ar: 'v.name_ar',
        country_name: 'cn.name', city_name: 'ct.name', currency_code: 'cur.code',
        supplier_type_name: 'st.name_en', supplier_category_name: 'sc.name_en',
        supplier_status_name: 'ss.name_en', payment_days: 'v.payment_days',
        credit_limit: 'v.credit_limit', rating: 'v.rating',
        created_at: 'v.created_at', updated_at: 'v.updated_at',
        is_active: 'v.is_active',
      };
      const sortCol = sortableColumns[sort as string] || 'v.code';
      const sortDir = order === 'desc' ? 'DESC' : 'ASC';

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM vendors v
         LEFT JOIN countries cn ON v.country_id = cn.id
         LEFT JOIN supplier_types st ON v.supplier_type_id = st.id
         LEFT JOIN supplier_categories sc ON v.supplier_category_id = sc.id
         LEFT JOIN supplier_statuses ss ON v.status_id = ss.id
         WHERE ${whereClause}`,
        params
      );
      const total = countResult.rows[0]?.total || 0;

      // Paginated data
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 25));
      const offset = (pageNum - 1) * pageSize;

      const dataResult = await pool.query(
        `${VENDOR_SELECT}
         WHERE ${whereClause}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, pageSize, offset]
      );

      res.json({
        success: true,
        data: dataResult.rows,
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendors' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  GET /:id — single vendor with sub-tables
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/:id',
  requirePermission('master:vendors:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;

      const result = await pool.query(
        `${VENDOR_SELECT}
         WHERE v.id = $1 AND v.company_id = $2 AND v.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      }

      const vendor = result.rows[0];

      // Load sub-tables (addresses, bank accounts, documents)
      if (await tableExists('supplier_addresses')) {
        const addrRes = await pool.query(
          `SELECT sa.*, cn.name AS country_name, ct.name AS city_name
           FROM supplier_addresses sa
           LEFT JOIN countries cn ON sa.country_id = cn.id
           LEFT JOIN cities ct ON sa.city_id = ct.id
           WHERE sa.vendor_id = $1 ORDER BY sa.is_default DESC, sa.id`,
          [id]
        );
        vendor.addresses = addrRes.rows;
      }

      if (await tableExists('supplier_bank_accounts')) {
        const bankRes = await pool.query(
          `SELECT sb.*, cur.code AS currency_code, cur.name AS currency_name
           FROM supplier_bank_accounts sb
           LEFT JOIN currencies cur ON sb.currency_id = cur.id
           WHERE sb.vendor_id = $1 ORDER BY sb.is_default DESC, sb.id`,
          [id]
        );
        vendor.bank_accounts = bankRes.rows;
      }

      if (await tableExists('supplier_documents')) {
        const docRes = await pool.query(
          `SELECT * FROM supplier_documents WHERE vendor_id = $1 ORDER BY created_at DESC`,
          [id]
        );
        vendor.documents = docRes.rows;
      }

      // Contact records from supplier_contacts (if exists)
      if (await tableExists('supplier_contacts')) {
        const contactRes = await pool.query(
          `SELECT * FROM supplier_contacts WHERE vendor_id = $1 ORDER BY is_primary DESC, id`,
          [id]
        );
        vendor.contacts = contactRes.rows;
      }

      res.json({ success: true, data: vendor });
    } catch (error) {
      console.error('Error fetching vendor:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendor' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  POST / — create vendor
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/',
  requirePermission('master:vendors:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        code, name: rawName, name_ar, name_en, short_name,
        vendor_type, vendor_group_id,
        supplier_type_id, supplier_category_id, status_id,
        country_id, city_id, address, postal_code,
        language_id, currency_id,
        supply_term_id, delivery_term_id,
        tax_number, cr_number, cr_expiry_date,
        iban, swift_code,
        payment_days, credit_limit, withholding_tax_pct,
        account_payable_id, prepayment_account_id,
        rating, logo_url, website, notes,
        phone, mobile, email,
        primary_contact_name, commercial_register,
        payment_terms_id, payable_account_id, expense_account_id,
        bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
        lead_time_days, min_order_amount, status,
        is_active, is_external,
      } = req.body;

      // Resolve name: form may send name_en instead of name
      const name = rawName || name_en;

      // Validate required
      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }
      if (code.length > 20) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code must not exceed 20 characters' } });
      }
      if (name.length > 150) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name must not exceed 150 characters' } });
      }

      // Duplicate check
      const dup = await pool.query(
        'SELECT id FROM vendors WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Vendor code already exists' } });
      }

      const tenantId = (req as any).companyContext?.tenant_id || null;

      // Build dynamic insert — only include columns that exist
      const cols: string[] = ['tenant_id', 'company_id', 'code', 'name', 'created_by', 'created_at'];
      const vals: any[] = [tenantId, companyId, code, name, userId];
      const placeholders: string[] = ['$1', '$2', '$3', '$4', '$5', 'NOW()'];
      let idx = 6;

      // Helper to add optional column
      const addCol = async (col: string, val: any) => {
        if (val === undefined || val === null) return;
        const exists = await columnExists('vendors', col);
        if (!exists) return;
        cols.push(col);
        vals.push(val);
        placeholders.push(`$${idx}`);
        idx++;
      };

      // Basic fields (always on vendors table)
      await addCol('name_ar', name_ar);
      await addCol('name_en', name_en || name);
      await addCol('short_name', short_name);
      await addCol('vendor_type', vendor_type || 'supplier');
      await addCol('vendor_group_id', vendor_group_id);
      await addCol('status', status || 'active');
      await addCol('is_active', is_active !== false);
      await addCol('is_external', is_external);

      // New FK columns
      await addCol('supplier_type_id', supplier_type_id);
      await addCol('supplier_category_id', supplier_category_id);
      await addCol('status_id', status_id);
      await addCol('country_id', country_id);
      await addCol('city_id', city_id);
      await addCol('address', address);
      await addCol('postal_code', postal_code);
      await addCol('language_id', language_id);
      await addCol('currency_id', currency_id);
      await addCol('supply_term_id', supply_term_id);
      await addCol('delivery_term_id', delivery_term_id);

      // Tax / Registration
      await addCol('tax_number', tax_number);
      await addCol('cr_number', cr_number || commercial_register);
      await addCol('cr_expiry_date', cr_expiry_date);

      // Banking
      await addCol('iban', iban || bank_iban);
      await addCol('swift_code', swift_code || bank_swift);

      // Financial
      await addCol('payment_days', payment_days);
      await addCol('credit_limit', credit_limit);
      await addCol('withholding_tax_pct', withholding_tax_pct);
      await addCol('account_payable_id', account_payable_id);
      await addCol('prepayment_account_id', prepayment_account_id);

      // Legacy payment/bank columns (if they still exist)
      await addCol('payment_terms_id', payment_terms_id);
      await addCol('payable_account_id', payable_account_id);
      await addCol('expense_account_id', expense_account_id);
      await addCol('bank_id', bank_id);
      await addCol('bank_account_name', bank_account_name);
      await addCol('bank_account_number', bank_account_number);
      await addCol('bank_iban', bank_iban);
      await addCol('bank_swift', bank_swift);

      // Contact-level fields on vendor table
      await addCol('primary_contact_name', primary_contact_name);
      await addCol('phone', phone);
      await addCol('mobile', mobile);
      await addCol('email', email);
      await addCol('website', website);

      // Misc
      await addCol('rating', rating);
      await addCol('logo_url', logo_url);
      await addCol('notes', notes);
      await addCol('lead_time_days', lead_time_days);
      await addCol('min_order_amount', min_order_amount);

      const insertQuery = `INSERT INTO vendors (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const result = await pool.query(insertQuery, vals);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create vendor' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  PUT /:id — update vendor
// ═══════════════════════════════════════════════════════════════════════════

router.put(
  '/:id',
  requirePermission('master:vendors:edit'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Check existence
      const existing = await pool.query(
        'SELECT id FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      }

      const {
        code, name: rawName, name_ar, name_en, short_name,
        vendor_type, vendor_group_id,
        supplier_type_id, supplier_category_id, status_id,
        country_id, city_id, address, postal_code,
        language_id, currency_id,
        supply_term_id, delivery_term_id,
        tax_number, cr_number, cr_expiry_date,
        iban, swift_code,
        payment_days, credit_limit, withholding_tax_pct,
        account_payable_id, prepayment_account_id,
        rating, logo_url, website, notes,
        phone, mobile, email,
        primary_contact_name, commercial_register,
        payment_terms_id, payable_account_id, expense_account_id,
        bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
        lead_time_days, min_order_amount, status,
        is_active, is_external,
      } = req.body;

      // Resolve name: form may send name_en instead of name
      const name = rawName || name_en;

      // Validate required
      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Duplicate code check
      const dup = await pool.query(
        'SELECT id FROM vendors WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
        [companyId, code, id]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Vendor code already exists' } });
      }

      // Build dynamic SET
      const sets: string[] = ['updated_by = $1', 'updated_at = NOW()'];
      const vals: any[] = [userId];
      let idx = 2;

      const setCol = async (col: string, val: any) => {
        if (val === undefined) return;
        const exists = await columnExists('vendors', col);
        if (!exists) return;
        sets.push(`${col} = $${idx}`);
        vals.push(val);
        idx++;
      };

      await setCol('code', code);
      await setCol('name', name);
      await setCol('name_ar', name_ar);
      await setCol('name_en', name_en);
      await setCol('short_name', short_name);
      await setCol('vendor_type', vendor_type);
      await setCol('vendor_group_id', vendor_group_id);
      await setCol('status', status);
      await setCol('is_active', is_active);
      await setCol('is_external', is_external);
      await setCol('supplier_type_id', supplier_type_id);
      await setCol('supplier_category_id', supplier_category_id);
      await setCol('status_id', status_id);
      await setCol('country_id', country_id);
      await setCol('city_id', city_id);
      await setCol('address', address);
      await setCol('postal_code', postal_code);
      await setCol('language_id', language_id);
      await setCol('currency_id', currency_id);
      await setCol('supply_term_id', supply_term_id);
      await setCol('delivery_term_id', delivery_term_id);
      await setCol('tax_number', tax_number);
      await setCol('cr_number', cr_number || commercial_register);
      await setCol('cr_expiry_date', cr_expiry_date);
      await setCol('iban', iban || bank_iban);
      await setCol('swift_code', swift_code || bank_swift);
      await setCol('payment_days', payment_days);
      await setCol('credit_limit', credit_limit);
      await setCol('withholding_tax_pct', withholding_tax_pct);
      await setCol('account_payable_id', account_payable_id);
      await setCol('prepayment_account_id', prepayment_account_id);
      await setCol('payment_terms_id', payment_terms_id);
      await setCol('payable_account_id', payable_account_id);
      await setCol('expense_account_id', expense_account_id);
      await setCol('bank_id', bank_id);
      await setCol('bank_account_name', bank_account_name);
      await setCol('bank_account_number', bank_account_number);
      await setCol('bank_iban', bank_iban);
      await setCol('bank_swift', bank_swift);
      await setCol('primary_contact_name', primary_contact_name);
      await setCol('phone', phone);
      await setCol('mobile', mobile);
      await setCol('email', email);
      await setCol('website', website);
      await setCol('rating', rating);
      await setCol('logo_url', logo_url);
      await setCol('notes', notes);
      await setCol('lead_time_days', lead_time_days);
      await setCol('min_order_amount', min_order_amount);

      // WHERE clause params
      vals.push(id, companyId);
      const updateQuery = `UPDATE vendors SET ${sets.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1} AND deleted_at IS NULL RETURNING *`;

      const result = await pool.query(updateQuery, vals);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating vendor:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update vendor' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  DELETE /:id — soft delete
// ═══════════════════════════════════════════════════════════════════════════

router.delete(
  '/:id',
  requirePermission('master:vendors:delete'),
  dynamicDeletionProtection('vendors'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE vendors SET deleted_at = NOW(), deleted_by = $1
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
         RETURNING id`,
        [userId, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      }

      res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (error) {
      console.error('Error deleting vendor:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete vendor' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  POST /:id/restore — restore soft-deleted vendor
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/restore',
  requirePermission('master:vendors:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE vendors SET deleted_at = NULL, deleted_by = NULL
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deleted vendor not found' } });
      }

      res.json({ success: true, data: result.rows[0], message: 'Vendor restored successfully' });
    } catch (error) {
      console.error('Error restoring vendor:', error);
      res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message: 'Failed to restore vendor' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  POST /:id/addresses — add address to vendor
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/addresses',
  requirePermission('master:vendors:edit'),
  async (req: Request, res: Response) => {
    try {
      if (!(await tableExists('supplier_addresses'))) {
        return res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Supplier addresses table not available' } });
      }

      const { id } = req.params;
      const { address_type_id, label, address_line_1, address_line_2, city_id, country_id, postal_code, is_default } = req.body;

      // If setting as default, unset existing defaults of same type
      if (is_default) {
        await pool.query(
          `UPDATE supplier_addresses SET is_default = false WHERE vendor_id = $1 AND address_type_id = $2`,
          [id, address_type_id]
        );
      }

      const result = await pool.query(
        `INSERT INTO supplier_addresses (vendor_id, address_type_id, label, address_line_1, address_line_2, city_id, country_id, postal_code, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [id, address_type_id, label, address_line_1, address_line_2, city_id, country_id, postal_code, is_default || false]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error adding vendor address:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to add address' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  POST /:id/bank-accounts — add bank account to vendor
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/bank-accounts',
  requirePermission('master:vendors:edit'),
  async (req: Request, res: Response) => {
    try {
      if (!(await tableExists('supplier_bank_accounts'))) {
        return res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Supplier bank accounts table not available' } });
      }

      const { id } = req.params;
      const { bank_name, account_name, account_number, iban, swift_code, currency_id, is_default } = req.body;

      if (is_default) {
        await pool.query(
          `UPDATE supplier_bank_accounts SET is_default = false WHERE vendor_id = $1`,
          [id]
        );
      }

      const result = await pool.query(
        `INSERT INTO supplier_bank_accounts (vendor_id, bank_name, account_name, account_number, iban, swift_code, currency_id, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [id, bank_name, account_name, account_number, iban, swift_code, currency_id, is_default || false]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error adding bank account:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to add bank account' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  POST /:id/documents — add document to vendor
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/documents',
  requirePermission('master:vendors:edit'),
  async (req: Request, res: Response) => {
    try {
      if (!(await tableExists('supplier_documents'))) {
        return res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Supplier documents table not available' } });
      }

      const { id } = req.params;
      const { document_type, document_number, issue_date, expiry_date, file_url, file_name, notes } = req.body;

      const result = await pool.query(
        `INSERT INTO supplier_documents (vendor_id, document_type, document_number, issue_date, expiry_date, file_url, file_name, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [id, document_type, document_number, issue_date, expiry_date, file_url, file_name, notes]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error adding document:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to add document' } });
    }
  }
);

export default router;
