/**
 * 👥 CUSTOMERS — Enterprise Route
 * ==================================
 *
 * Full CRUD + /stats + /filters for the enhanced customers master data.
 * Supports: customer_types, customer_categories, customer_statuses,
 *           delivery_terms, currencies, languages,
 *           countries, cities, and sub-tables (addresses, contacts, balances).
 *
 * Permissions: master:customers:view / create / edit / delete
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
applyEnhancedAudit(router, 'customers');

// ─── Shared SELECT fragment ────────────────────────────────────────────────

const CUSTOMER_SELECT = `
  SELECT
    c.*,
    cn.name   AS country_name,
    cn.code   AS country_code,
    cn.flag_emoji AS country_flag,
    ct.name   AS city_name,
    cur.code  AS currency_code,
    cur.name  AS currency_name,
    cur.symbol AS currency_symbol,
    lang.name_en AS language_name,
    lang.name_native AS language_native_name,
    ctype.name_en   AS customer_type_name,
    ctype.name_ar   AS customer_type_name_ar,
    ccat.name_en    AS customer_category_name,
    ccat.name_ar    AS customer_category_name_ar,
    cs.name_en      AS customer_status_name,
    cs.name_ar      AS customer_status_name_ar,
    cs.color        AS customer_status_color,
    delt.name_en    AS delivery_term_name,
    delt.incoterm_code AS delivery_term_incoterm,
    uc.email  AS created_by_name,
    uu.email  AS updated_by_name
  FROM customers c
  LEFT JOIN countries cn          ON c.country_id = cn.id
  LEFT JOIN cities ct             ON c.city_id = ct.id
  LEFT JOIN currencies cur        ON c.currency_id = cur.id
  LEFT JOIN system_languages lang ON c.language_id = lang.id
  LEFT JOIN customer_types ctype  ON c.customer_type_id = ctype.id
  LEFT JOIN customer_categories ccat ON c.customer_category_id = ccat.id
  LEFT JOIN customer_statuses cs  ON c.status_id = cs.id
  LEFT JOIN delivery_terms delt   ON c.delivery_term_id = delt.id
  LEFT JOIN users uc              ON c.created_by = uc.id
  LEFT JOIN users uu              ON c.updated_by = uu.id
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
  requirePermission('master:customers:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const hasIsActive = await columnExists('customers', 'is_active');
      const hasCustomerTypeId = await columnExists('customers', 'customer_type_id');
      const hasCreditLimit = await columnExists('customers', 'credit_limit');
      const hasCreditUsed = await columnExists('customers', 'credit_used');

      let statsQuery = `
        SELECT
          COUNT(*)::int AS total,
          ${hasIsActive ? `COUNT(*) FILTER (WHERE c.is_active = true)::int AS active,
          COUNT(*) FILTER (WHERE c.is_active = false)::int AS inactive,` : `
          COUNT(*)::int AS active, 0 AS inactive,`}
          ${hasCustomerTypeId ? `COUNT(DISTINCT c.customer_type_id)::int AS type_count,` : `0 AS type_count,`}
          COUNT(DISTINCT c.country_id)::int AS countries_count
          ${hasCreditLimit ? `, COALESCE(SUM(c.credit_limit), 0)::numeric AS total_credit_limit` : ``}
          ${hasCreditUsed ? `, COALESCE(SUM(c.credit_used), 0)::numeric AS total_credit_used` : ``}
        FROM customers c
        WHERE c.company_id = $1 AND c.deleted_at IS NULL
      `;

      const result = await pool.query(statsQuery, [companyId]);
      const stats = result.rows[0] || {};

      // Get by-type breakdown if customer_types table exists
      let byType: any[] = [];
      if (hasCustomerTypeId && await tableExists('customer_types')) {
        const typeRes = await pool.query(
          `SELECT ctype.name_en AS name, ctype.name_ar, COUNT(c.id)::int AS count
           FROM customers c
           JOIN customer_types ctype ON c.customer_type_id = ctype.id
           WHERE c.company_id = $1 AND c.deleted_at IS NULL
           GROUP BY ctype.name_en, ctype.name_ar ORDER BY count DESC`,
          [companyId]
        );
        byType = typeRes.rows;
      }

      res.json({ success: true, data: { ...stats, by_type: byType } });
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch stats' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  GET /filters — distinct values for filter dropdowns
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/filters',
  requirePermission('master:customers:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const filters: any = {};

      // Customer types
      if (await tableExists('customer_types')) {
        const r = await pool.query(
          `SELECT id, name_en AS name, name_ar FROM customer_types WHERE deleted_at IS NULL ORDER BY name_en`
        );
        filters.customer_types = r.rows;
      }

      // Customer categories
      if (await tableExists('customer_categories')) {
        const r = await pool.query(
          `SELECT id, name_en AS name, name_ar FROM customer_categories WHERE deleted_at IS NULL ORDER BY name_en`
        );
        filters.customer_categories = r.rows;
      }

      // Customer statuses
      if (await tableExists('customer_statuses')) {
        const r = await pool.query(
          `SELECT id, name_en AS name, name_ar, color FROM customer_statuses WHERE deleted_at IS NULL ORDER BY sort_order, name_en`
        );
        filters.customer_statuses = r.rows;
      }

      // Countries (used by customers)
      const countriesRes = await pool.query(
        `SELECT DISTINCT cn.id, cn.name, cn.code, cn.flag_emoji AS flag
         FROM customers c JOIN countries cn ON c.country_id = cn.id
         WHERE c.company_id = $1 AND c.deleted_at IS NULL
         ORDER BY cn.name`,
        [companyId]
      );
      filters.countries = countriesRes.rows;

      res.json({ success: true, data: filters });
    } catch (error) {
      console.error('Error fetching customer filters:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch filters' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  GET / — paginated list with full filters
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/',
  requirePermission('master:customers:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        search, is_active, customer_type, status, customer_type_id,
        customer_category_id, status_id, country_id, city_id,
        page = '1', limit = '25', sort = 'code', order = 'asc',
      } = req.query;

      const params: any[] = [companyId];
      let paramIdx = 2;
      const conditions: string[] = ['c.company_id = $1', 'c.deleted_at IS NULL'];

      // Search across code, name, name_en, name_ar, short_name, tax_number, email
      if (search) {
        conditions.push(`(
          c.code ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx} OR
          c.name_en ILIKE $${paramIdx} OR c.name_ar ILIKE $${paramIdx} OR
          c.short_name ILIKE $${paramIdx} OR c.tax_number ILIKE $${paramIdx} OR
          c.email ILIKE $${paramIdx}
        )`);
        params.push(`%${search}%`);
        paramIdx++;
      }

      // Active filter
      if (is_active !== undefined && is_active !== '') {
        const hasCol = await columnExists('customers', 'is_active');
        if (hasCol) {
          conditions.push(`c.is_active = $${paramIdx}`);
          params.push(is_active === 'true');
          paramIdx++;
        }
      }

      // Legacy customer_type / status text filters
      if (customer_type) {
        conditions.push(`c.customer_type = $${paramIdx}`);
        params.push(customer_type);
        paramIdx++;
      }
      if (status && !status_id) {
        conditions.push(`c.status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      // New FK filters
      if (customer_type_id) {
        conditions.push(`c.customer_type_id = $${paramIdx}`);
        params.push(Number(customer_type_id));
        paramIdx++;
      }
      if (customer_category_id) {
        conditions.push(`c.customer_category_id = $${paramIdx}`);
        params.push(Number(customer_category_id));
        paramIdx++;
      }
      if (status_id) {
        conditions.push(`c.status_id = $${paramIdx}`);
        params.push(Number(status_id));
        paramIdx++;
      }
      if (country_id) {
        conditions.push(`c.country_id = $${paramIdx}`);
        params.push(Number(country_id));
        paramIdx++;
      }
      if (city_id) {
        conditions.push(`c.city_id = $${paramIdx}`);
        params.push(Number(city_id));
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');

      // Sorting — whitelist allowed columns
      const sortableColumns: Record<string, string> = {
        code: 'c.code', name: 'c.name', name_en: 'c.name_en', name_ar: 'c.name_ar',
        country_name: 'cn.name', city_name: 'ct.name', currency_code: 'cur.code',
        customer_type_name: 'ctype.name_en', customer_category_name: 'ccat.name_en',
        customer_status_name: 'cs.name_en', payment_days: 'c.payment_days',
        credit_limit: 'c.credit_limit', credit_used: 'c.credit_used',
        created_at: 'c.created_at', updated_at: 'c.updated_at',
        is_active: 'c.is_active',
      };
      const sortCol = sortableColumns[sort as string] || 'c.code';
      const sortDir = order === 'desc' ? 'DESC' : 'ASC';

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM customers c
         LEFT JOIN countries cn ON c.country_id = cn.id
         LEFT JOIN customer_types ctype ON c.customer_type_id = ctype.id
         LEFT JOIN customer_categories ccat ON c.customer_category_id = ccat.id
         LEFT JOIN customer_statuses cs ON c.status_id = cs.id
         WHERE ${whereClause}`,
        params
      );
      const total = countResult.rows[0]?.total || 0;

      // Paginated data
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 25));
      const offset = (pageNum - 1) * pageSize;

      const dataResult = await pool.query(
        `${CUSTOMER_SELECT}
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
      console.error('Error fetching customers:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customers' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  GET /:id — single customer with sub-tables
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/:id',
  requirePermission('master:customers:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;

      const result = await pool.query(
        `${CUSTOMER_SELECT}
         WHERE c.id = $1 AND c.company_id = $2 AND c.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      }

      const customer = result.rows[0];

      // Load sub-tables (addresses, contacts, balances)
      if (await tableExists('customer_addresses')) {
        const addrRes = await pool.query(
          `SELECT ca.*, cn.name AS country_name, ct.name AS city_name
           FROM customer_addresses ca
           LEFT JOIN countries cn ON ca.country_id = cn.id
           LEFT JOIN cities ct ON ca.city_id = ct.id
           WHERE ca.customer_id = $1 ORDER BY ca.is_default DESC, ca.id`,
          [id]
        );
        customer.addresses = addrRes.rows;
      }

      if (await tableExists('customer_contacts')) {
        const contactRes = await pool.query(
          `SELECT * FROM customer_contacts WHERE customer_id = $1 ORDER BY is_primary DESC, id`,
          [id]
        );
        customer.contacts = contactRes.rows;
      }

      if (await tableExists('customer_balances')) {
        const balRes = await pool.query(
          `SELECT * FROM customer_balances WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10`,
          [id]
        );
        customer.balances = balRes.rows;
      }

      res.json({ success: true, data: customer });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customer' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  POST / — create customer
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/',
  requirePermission('master:customers:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        code, name: rawName, name_ar, name_en, short_name,
        customer_type, customer_group_id,
        customer_type_id, customer_category_id, status_id,
        country_id, city_id, address, postal_code,
        shipping_address, shipping_city_id, shipping_country_id,
        language_id, currency_id,
        delivery_term_id,
        tax_number, cr_number, cr_expiry_date, national_id,
        commercial_register,
        iban, swift_code,
        payment_days, credit_limit, credit_days, discount_pct,
        tax_treatment, allow_credit_sales,
        receivable_account_id, advance_account_id,
        payment_terms_id, price_list_id,
        sales_person_id, territory,
        bank_id, bank_account_name, bank_account_number, bank_iban,
        is_tax_exempt, status, notes,
        primary_contact_name, phone, mobile, email, website,
        logo_url, rating, credit_policy,
        is_active,
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
        'SELECT id FROM customers WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Customer code already exists' } });
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
        const exists = await columnExists('customers', col);
        if (!exists) return;
        cols.push(col);
        vals.push(val);
        placeholders.push(`$${idx}`);
        idx++;
      };

      // Basic fields
      await addCol('name_ar', name_ar);
      await addCol('name_en', name_en || name);
      await addCol('short_name', short_name);
      await addCol('customer_type', customer_type || 'company');
      await addCol('customer_group_id', customer_group_id);
      await addCol('status', status || 'active');
      await addCol('is_active', is_active !== false);

      // New FK columns
      await addCol('customer_type_id', customer_type_id);
      await addCol('customer_category_id', customer_category_id);
      await addCol('status_id', status_id);
      await addCol('country_id', country_id);
      await addCol('city_id', city_id);
      await addCol('address', address);
      await addCol('postal_code', postal_code);
      await addCol('shipping_address', shipping_address);
      await addCol('shipping_city_id', shipping_city_id);
      await addCol('shipping_country_id', shipping_country_id);
      await addCol('language_id', language_id);
      await addCol('currency_id', currency_id);
      await addCol('delivery_term_id', delivery_term_id);

      // Tax / Registration
      await addCol('tax_number', tax_number);
      await addCol('cr_number', cr_number || commercial_register);
      await addCol('cr_expiry_date', cr_expiry_date);
      await addCol('national_id', national_id);
      await addCol('is_tax_exempt', is_tax_exempt || false);
      await addCol('tax_treatment', tax_treatment);

      // Banking
      await addCol('iban', iban || bank_iban);
      await addCol('swift_code', swift_code);
      await addCol('bank_id', bank_id);
      await addCol('bank_account_name', bank_account_name);
      await addCol('bank_account_number', bank_account_number);
      await addCol('bank_iban', bank_iban);

      // Financial / Credit
      await addCol('payment_days', payment_days);
      await addCol('credit_days', credit_days || payment_days);
      await addCol('credit_limit', credit_limit || 0);
      await addCol('credit_used', 0);
      await addCol('discount_pct', discount_pct);
      await addCol('allow_credit_sales', allow_credit_sales);
      await addCol('credit_policy', credit_policy);
      await addCol('receivable_account_id', receivable_account_id);
      await addCol('advance_account_id', advance_account_id);

      // Legacy financial columns
      await addCol('payment_terms_id', payment_terms_id);
      await addCol('price_list_id', price_list_id);
      await addCol('sales_person_id', sales_person_id);
      await addCol('territory', territory);

      // Contact-level fields on customer table
      await addCol('primary_contact_name', primary_contact_name);
      await addCol('phone', phone);
      await addCol('mobile', mobile);
      await addCol('email', email);
      await addCol('website', website);

      // Misc
      await addCol('logo_url', logo_url);
      await addCol('rating', rating);
      await addCol('notes', notes);

      const insertQuery = `INSERT INTO customers (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const result = await pool.query(insertQuery, vals);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create customer' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  PUT /:id — update customer
// ═══════════════════════════════════════════════════════════════════════════

router.put(
  '/:id',
  requirePermission('master:customers:edit'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Check existence
      const existing = await pool.query(
        'SELECT id FROM customers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      }

      const {
        code, name: rawName, name_ar, name_en, short_name,
        customer_type, customer_group_id,
        customer_type_id, customer_category_id, status_id,
        country_id, city_id, address, postal_code,
        shipping_address, shipping_city_id, shipping_country_id,
        language_id, currency_id,
        delivery_term_id,
        tax_number, cr_number, cr_expiry_date, national_id,
        commercial_register,
        iban, swift_code,
        payment_days, credit_limit, credit_days, discount_pct,
        tax_treatment, allow_credit_sales,
        receivable_account_id, advance_account_id,
        payment_terms_id, price_list_id,
        sales_person_id, territory,
        bank_id, bank_account_name, bank_account_number, bank_iban,
        is_tax_exempt, status, notes,
        primary_contact_name, phone, mobile, email, website,
        logo_url, rating, credit_policy,
        is_active,
      } = req.body;

      // Resolve name: form may send name_en instead of name
      const name = rawName || name_en;

      // Validate required
      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Duplicate code check
      const dup = await pool.query(
        'SELECT id FROM customers WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
        [companyId, code, id]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Customer code already exists' } });
      }

      // Build dynamic SET
      const sets: string[] = ['updated_by = $1', 'updated_at = NOW()'];
      const vals: any[] = [userId];
      let idx = 2;

      const setCol = async (col: string, val: any) => {
        if (val === undefined) return;
        const exists = await columnExists('customers', col);
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
      await setCol('customer_type', customer_type);
      await setCol('customer_group_id', customer_group_id);
      await setCol('status', status);
      await setCol('is_active', is_active);
      await setCol('customer_type_id', customer_type_id);
      await setCol('customer_category_id', customer_category_id);
      await setCol('status_id', status_id);
      await setCol('country_id', country_id);
      await setCol('city_id', city_id);
      await setCol('address', address);
      await setCol('postal_code', postal_code);
      await setCol('shipping_address', shipping_address);
      await setCol('shipping_city_id', shipping_city_id);
      await setCol('shipping_country_id', shipping_country_id);
      await setCol('language_id', language_id);
      await setCol('currency_id', currency_id);
      await setCol('delivery_term_id', delivery_term_id);
      await setCol('tax_number', tax_number);
      await setCol('cr_number', cr_number || commercial_register);
      await setCol('cr_expiry_date', cr_expiry_date);
      await setCol('national_id', national_id);
      await setCol('is_tax_exempt', is_tax_exempt);
      await setCol('tax_treatment', tax_treatment);
      await setCol('iban', iban || bank_iban);
      await setCol('swift_code', swift_code);
      await setCol('bank_id', bank_id);
      await setCol('bank_account_name', bank_account_name);
      await setCol('bank_account_number', bank_account_number);
      await setCol('bank_iban', bank_iban);
      await setCol('payment_days', payment_days);
      await setCol('credit_days', credit_days);
      await setCol('credit_limit', credit_limit);
      await setCol('discount_pct', discount_pct);
      await setCol('allow_credit_sales', allow_credit_sales);
      await setCol('credit_policy', credit_policy);
      await setCol('receivable_account_id', receivable_account_id);
      await setCol('advance_account_id', advance_account_id);
      await setCol('payment_terms_id', payment_terms_id);
      await setCol('price_list_id', price_list_id);
      await setCol('sales_person_id', sales_person_id);
      await setCol('territory', territory);
      await setCol('primary_contact_name', primary_contact_name);
      await setCol('phone', phone);
      await setCol('mobile', mobile);
      await setCol('email', email);
      await setCol('website', website);
      await setCol('logo_url', logo_url);
      await setCol('rating', rating);
      await setCol('notes', notes);

      // WHERE clause params
      vals.push(id, companyId);
      const updateQuery = `UPDATE customers SET ${sets.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1} AND deleted_at IS NULL RETURNING *`;

      const result = await pool.query(updateQuery, vals);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update customer' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  DELETE /:id — soft delete
// ═══════════════════════════════════════════════════════════════════════════

router.delete(
  '/:id',
  requirePermission('master:customers:delete'),
  dynamicDeletionProtection('customers'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE customers SET deleted_at = NOW(), deleted_by = $1
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
         RETURNING id`,
        [userId, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      }

      res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete customer' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  POST /:id/restore — restore soft-deleted customer
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/restore',
  requirePermission('master:customers:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE customers SET deleted_at = NULL, deleted_by = NULL
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deleted customer not found' } });
      }

      res.json({ success: true, data: result.rows[0], message: 'Customer restored successfully' });
    } catch (error) {
      console.error('Error restoring customer:', error);
      res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message: 'Failed to restore customer' } });
    }
  }
);

export default router;
