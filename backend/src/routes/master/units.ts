/**
 * 📐 UNITS API — Enterprise Edition
 * ====================================
 * Full enterprise CRUD with search, filters, pagination, sorting,
 * stats bar, bulk operations, unit type hierarchy, conversion factors.
 *
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 *
 * DB Columns: id, company_id, code, name, name_en, name_ar, name_plural_ar,
 *   unit_type, unit_type_id, base_unit_id, conversion_factor, is_base_unit,
 *   symbol, is_purchase_unit, is_sales_unit, is_inventory_unit, decimal_places,
 *   is_active, status, sort_order, is_global, is_system, data_layer,
 *   created_by, updated_by, created_at, updated_at, deleted_at
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
applyEnhancedAudit(router, 'units');

// ────────────────────────────────────────
// GET /stats — Aggregate statistics for stats bar
// ────────────────────────────────────────
router.get(
  '/stats',
  requirePermission('master:units:view'),
  async (req: Request, res: Response) => {
    try {
      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'units' AND table_schema = 'public'
      `);
      const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

      const parts: string[] = [
        `COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total`,
      ];

      if (cols.has('status')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'active') AS active`);
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'inactive') AS inactive`);
      } else if (cols.has('is_active')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active = true) AS active`);
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active = false) AS inactive`);
      }

      if (cols.has('is_base_unit')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_base_unit = true) AS base_units`);
      } else {
        parts.push(`0 AS base_units`);
      }

      if (cols.has('is_purchase_unit')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_purchase_unit = true) AS purchase_units`);
      } else {
        parts.push(`0 AS purchase_units`);
      }

      if (cols.has('is_sales_unit')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_sales_unit = true) AS sales_units`);
      } else {
        parts.push(`0 AS sales_units`);
      }

      if (cols.has('is_inventory_unit')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_inventory_unit = true) AS inventory_units`);
      } else {
        parts.push(`0 AS inventory_units`);
      }

      if (cols.has('unit_type')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND unit_type = 'weight') AS type_weight`);
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND unit_type = 'volume') AS type_volume`);
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND unit_type = 'length') AS type_length`);
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND unit_type = 'piece') AS type_piece`);
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND unit_type = 'other') AS type_other`);
      }

      if (cols.has('unit_type_id')) {
        parts.push(`COUNT(DISTINCT unit_type_id) FILTER (WHERE deleted_at IS NULL) AS unit_types_count`);
      }

      const result = await pool.query(`SELECT ${parts.join(', ')} FROM units`);

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching unit stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

// ────────────────────────────────────────
// GET /filters — Distinct values for filter dropdowns
// ────────────────────────────────────────
router.get(
  '/filters',
  requirePermission('master:units:view'),
  async (req: Request, res: Response) => {
    try {
      const unitTypesQuery = await pool.query(`
        SELECT id, code, name_en, name_ar
        FROM unit_types
        WHERE deleted_at IS NULL
        ORDER BY sort_order, id
      `);

      const distinctTypes = await pool.query(`
        SELECT DISTINCT unit_type
        FROM units
        WHERE deleted_at IS NULL AND unit_type IS NOT NULL AND unit_type != ''
        ORDER BY unit_type
      `);

      const baseUnitsQuery = await pool.query(`
        SELECT id, code, name, name_en, name_ar, unit_type, symbol
        FROM units
        WHERE deleted_at IS NULL AND is_base_unit = true
        ORDER BY unit_type, sort_order, name
      `);

      res.json({
        success: true,
        data: {
          unit_types: unitTypesQuery.rows.map(r => ({
            value: r.id,
            label: `${r.name_en} (${r.name_ar || r.code})`,
            code: r.code,
          })),
          unit_type_codes: distinctTypes.rows.map(r => ({
            value: r.unit_type,
            label: r.unit_type.charAt(0).toUpperCase() + r.unit_type.slice(1),
          })),
          base_units: baseUnitsQuery.rows.map(r => ({
            value: r.id,
            label: `${r.name_en || r.name} (${r.symbol || r.code})`,
            code: r.code,
            unit_type: r.unit_type,
          })),
          statuses: ['active', 'inactive'],
        },
      });
    } catch (error: any) {
      console.error('Error fetching filter options:', error);
      res.status(500).json({ error: 'Failed to fetch filter options' });
    }
  }
);

// ────────────────────────────────────────
// GET / — List units with search, filters, pagination, sorting
// ────────────────────────────────────────
router.get(
  '/',
  requirePermission('master:units:view'),
  async (req: Request, res: Response) => {
    try {
      const {
        search, is_active, status, unit_type, unit_type_id,
        is_base_unit, is_purchase_unit, is_sales_unit, is_inventory_unit,
        base_unit_id,
        sort_by = 'sort_order', sort_order = 'asc',
        page = '1', limit = '50',
      } = req.query as Record<string, string>;

      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'units' AND table_schema = 'public'
      `);
      const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

      const selectParts = [
        'u.id', 'u.code', 'u.name', 'u.name_ar',
        'u.unit_type', 'u.base_unit_id', 'u.conversion_factor',
        'u.is_base_unit', 'u.is_active',
        'u.created_at', 'u.updated_at', 'u.deleted_at',
      ];

      if (cols.has('name_en')) selectParts.push('u.name_en');
      if (cols.has('name_plural_ar')) selectParts.push('u.name_plural_ar');
      if (cols.has('symbol')) selectParts.push('u.symbol');
      if (cols.has('unit_type_id')) selectParts.push('u.unit_type_id');
      if (cols.has('is_purchase_unit')) selectParts.push('u.is_purchase_unit');
      if (cols.has('is_sales_unit')) selectParts.push('u.is_sales_unit');
      if (cols.has('is_inventory_unit')) selectParts.push('u.is_inventory_unit');
      if (cols.has('decimal_places')) selectParts.push('u.decimal_places');
      if (cols.has('status')) selectParts.push('u.status');
      if (cols.has('sort_order')) selectParts.push('u.sort_order');
      if (cols.has('company_id')) selectParts.push('u.company_id');
      if (cols.has('is_global')) selectParts.push('u.is_global');
      if (cols.has('is_system')) selectParts.push('u.is_system');
      if (cols.has('created_by')) selectParts.push('u.created_by');
      if (cols.has('updated_by')) selectParts.push('u.updated_by');

      selectParts.push("bu.code AS base_unit_code");
      selectParts.push("bu.name AS base_unit_name");
      selectParts.push("bu.name_en AS base_unit_name_en");
      selectParts.push("bu.symbol AS base_unit_symbol");

      selectParts.push("ut.code AS unit_type_code");
      selectParts.push("ut.name_en AS unit_type_name");
      selectParts.push("ut.name_ar AS unit_type_name_ar");

      const baseWhere = `u.deleted_at IS NULL`;
      const fromClause = `FROM units u
        LEFT JOIN units bu ON u.base_unit_id = bu.id
        LEFT JOIN unit_types ut ON u.unit_type_id = ut.id`;

      let query = `SELECT ${selectParts.join(', ')} ${fromClause} WHERE ${baseWhere}`;
      let countQuery = `SELECT COUNT(*) FROM units u WHERE ${baseWhere}`;

      const params: any[] = [];
      const countParams: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        const searchFields = ['u.code', 'u.name', 'u.name_ar'];
        if (cols.has('name_en')) searchFields.push('u.name_en');
        if (cols.has('symbol')) searchFields.push('u.symbol');

        const searchClause = ` AND (${searchFields.map(f => `${f} ILIKE $${paramCount}`).join(' OR ')})`;
        query += searchClause;
        countQuery += searchClause;
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
      }

      if (status && cols.has('status')) {
        paramCount++;
        const clause = ` AND u.status = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(status);
        countParams.push(status);
      } else if (is_active !== undefined) {
        paramCount++;
        const clause = ` AND u.is_active = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_active === 'true');
        countParams.push(is_active === 'true');
      }

      if (unit_type && unit_type !== '') {
        paramCount++;
        const clause = ` AND u.unit_type = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(unit_type);
        countParams.push(unit_type);
      }

      if (unit_type_id && cols.has('unit_type_id')) {
        paramCount++;
        const clause = ` AND u.unit_type_id = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(parseInt(unit_type_id));
        countParams.push(parseInt(unit_type_id));
      }

      if (is_base_unit !== undefined) {
        paramCount++;
        const clause = ` AND u.is_base_unit = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_base_unit === 'true');
        countParams.push(is_base_unit === 'true');
      }

      if (is_purchase_unit !== undefined && cols.has('is_purchase_unit')) {
        paramCount++;
        const clause = ` AND u.is_purchase_unit = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_purchase_unit === 'true');
        countParams.push(is_purchase_unit === 'true');
      }

      if (is_sales_unit !== undefined && cols.has('is_sales_unit')) {
        paramCount++;
        const clause = ` AND u.is_sales_unit = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_sales_unit === 'true');
        countParams.push(is_sales_unit === 'true');
      }

      if (is_inventory_unit !== undefined && cols.has('is_inventory_unit')) {
        paramCount++;
        const clause = ` AND u.is_inventory_unit = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_inventory_unit === 'true');
        countParams.push(is_inventory_unit === 'true');
      }

      if (base_unit_id) {
        paramCount++;
        const clause = ` AND u.base_unit_id = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(parseInt(base_unit_id));
        countParams.push(parseInt(base_unit_id));
      }

      const allowedSortColumns = [
        'name', 'name_en', 'code', 'unit_type', 'conversion_factor',
        'is_base_unit', 'status', 'sort_order', 'created_at', 'updated_at',
        'symbol', 'decimal_places', 'unit_type_name',
      ];
      let safeSortBy = allowedSortColumns.includes(sort_by) ? sort_by : 'sort_order';
      if (safeSortBy === 'unit_type_name') {
        safeSortBy = 'ut.name_en';
      } else if (!safeSortBy.includes('.')) {
        safeSortBy = `u.${safeSortBy}`;
      }
      const safeSortOrder = sort_order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      query += ` ORDER BY ${safeSortBy} ${safeSortOrder} NULLS LAST, u.code ASC`;

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;

      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limitNum);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams),
      ]);

      const total = parseInt(countResult.rows[0].count);

      const rows = dataResult.rows.map((row: any) => ({
        ...row,
        name: row.name || row.name_en,
        name_en: row.name_en || row.name,
        status: row.status || (row.is_active ? 'active' : 'inactive'),
      }));

      res.json({
        success: true,
        data: rows,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error: any) {
      console.error('Error fetching units:', error);
      res.status(500).json({ error: 'Failed to fetch units' });
    }
  }
);

// ────────────────────────────────────────
// GET /:id — Get single unit by ID
// ────────────────────────────────────────
router.get(
  '/:id',
  requirePermission('master:units:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT u.*,
           bu.code AS base_unit_code, bu.name AS base_unit_name,
           bu.name_en AS base_unit_name_en, bu.symbol AS base_unit_symbol,
           ut.code AS unit_type_code, ut.name_en AS unit_type_name, ut.name_ar AS unit_type_name_ar
         FROM units u
         LEFT JOIN units bu ON u.base_unit_id = bu.id
         LEFT JOIN unit_types ut ON u.unit_type_id = ut.id
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Unit not found' });
      }

      const row = result.rows[0];
      row.name = row.name || row.name_en;
      row.name_en = row.name_en || row.name;
      row.status = row.status || (row.is_active ? 'active' : 'inactive');

      const derivedCount = await pool.query(
        'SELECT COUNT(*) FROM units WHERE base_unit_id = $1 AND deleted_at IS NULL',
        [id]
      );
      row.derived_units_count = parseInt(derivedCount.rows[0].count);

      res.json({ success: true, data: row });
    } catch (error: any) {
      console.error('Error fetching unit:', error);
      res.status(500).json({ error: 'Failed to fetch unit' });
    }
  }
);

// ────────────────────────────────────────
// POST / — Create a new unit
// ────────────────────────────────────────
router.post(
  '/',
  requirePermission('master:units:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId || 1;
      const userId = (req as any).user?.id || null;
      const {
        code, name, name_en, name_ar, name_plural_ar,
        unit_type, unit_type_id,
        base_unit_id, conversion_factor, is_base_unit = false,
        symbol, is_purchase_unit = false, is_sales_unit = false,
        is_inventory_unit = false, decimal_places = 2,
        status: unitStatus = 'active', sort_order,
      } = req.body;

      if ((!name && !name_en) || !unit_type) {
        return res.status(400).json({ error: 'name (or name_en) and unit_type are required' });
      }

      if (!code) {
        return res.status(400).json({ error: 'Unit code is required' });
      }

      const resolvedNameEn = name_en || name;
      const resolvedName = name || name_en;

      const dupCheck = await pool.query(
        `SELECT id FROM units WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
        [code]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ error: 'A unit with this code already exists' });
      }

      if (!is_base_unit && !base_unit_id) {
        return res.status(400).json({ error: 'Non-base units must specify a base unit' });
      }
      if (!is_base_unit && (conversion_factor === undefined || conversion_factor === null || conversion_factor <= 0)) {
        return res.status(400).json({ error: 'Non-base units must have a positive conversion factor' });
      }

      if (base_unit_id) {
        const baseCheck = await pool.query(
          'SELECT id, unit_type FROM units WHERE id = $1 AND deleted_at IS NULL',
          [base_unit_id]
        );
        if (baseCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid base unit — unit not found' });
        }
        if (baseCheck.rows[0].unit_type !== unit_type) {
          return res.status(400).json({ error: 'Base unit must be the same unit type' });
        }
      }

      if (unit_type_id) {
        const typeCheck = await pool.query(
          'SELECT id FROM unit_types WHERE id = $1 AND deleted_at IS NULL',
          [unit_type_id]
        );
        if (typeCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid unit type' });
        }
      }

      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'units' AND table_schema = 'public'
      `);
      const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

      const insertCols: string[] = [
        'company_id', 'code', 'name', 'name_ar', 'unit_type',
        'is_base_unit', 'is_active',
      ];
      const insertVals: any[] = [
        companyId, code.toUpperCase(), resolvedName, name_ar || resolvedNameEn,
        unit_type, is_base_unit, unitStatus === 'active',
      ];
      let idx = insertVals.length;

      const addCol = (colName: string, value: any) => {
        if (cols.has(colName) && value !== undefined && value !== null) {
          idx++;
          insertCols.push(colName);
          insertVals.push(value);
        }
      };

      addCol('name_en', resolvedNameEn);
      addCol('name_plural_ar', name_plural_ar);
      addCol('symbol', symbol);
      addCol('unit_type_id', unit_type_id ? parseInt(unit_type_id) : null);
      addCol('base_unit_id', base_unit_id ? parseInt(base_unit_id) : null);
      addCol('conversion_factor', is_base_unit ? null : parseFloat(conversion_factor));
      addCol('is_purchase_unit', is_purchase_unit);
      addCol('is_sales_unit', is_sales_unit);
      addCol('is_inventory_unit', is_inventory_unit);
      addCol('decimal_places', parseInt(decimal_places));
      addCol('status', unitStatus);
      addCol('sort_order', sort_order ? parseInt(sort_order) : null);
      addCol('created_by', userId);
      addCol('updated_by', userId);

      const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');

      const result = await pool.query(
        `INSERT INTO units (${insertCols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        insertVals
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Unit created successfully' });
    } catch (error: any) {
      console.error('Error creating unit:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Unit already exists (duplicate code)' });
      }
      res.status(500).json({ error: 'Failed to create unit' });
    }
  }
);

// ────────────────────────────────────────
// PUT /:id — Update an existing unit
// ────────────────────────────────────────
router.put(
  '/:id',
  requirePermission('master:units:edit'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || null;
      const {
        name, name_en, name_ar, name_plural_ar,
        unit_type, unit_type_id,
        base_unit_id, conversion_factor, is_base_unit,
        symbol, is_purchase_unit, is_sales_unit, is_inventory_unit,
        decimal_places, status: unitStatus, sort_order,
      } = req.body;

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT * FROM units WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Unit not found' });
      }

      if (existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const effectiveBaseUnitId = base_unit_id !== undefined ? base_unit_id : existing.rows[0].base_unit_id;
      const effectiveUnitType = unit_type || existing.rows[0].unit_type;

      if (effectiveBaseUnitId && parseInt(effectiveBaseUnitId) === parseInt(id)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'A unit cannot be its own base unit' });
      }

      if (effectiveBaseUnitId) {
        const baseCheck = await client.query(
          'SELECT id, unit_type FROM units WHERE id = $1 AND deleted_at IS NULL',
          [effectiveBaseUnitId]
        );
        if (baseCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Invalid base unit' });
        }
        if (baseCheck.rows[0].unit_type !== effectiveUnitType) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Base unit must be the same unit type' });
        }
      }

      const newStatus = unitStatus ?? existing.rows[0].status ?? (existing.rows[0].is_active ? 'active' : 'inactive');
      const newIsActive = newStatus === 'active';
      const resolvedNameEn = name_en || name;

      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'units' AND table_schema = 'public'
      `);
      const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

      const setClauses: string[] = [
        'name = COALESCE($1, name)',
        'is_active = $2',
        'updated_at = CURRENT_TIMESTAMP',
      ];
      const updateVals: any[] = [resolvedNameEn || existing.rows[0].name, newIsActive];
      let uidx = 2;

      const addSet = (colName: string, value: any) => {
        if (cols.has(colName)) {
          uidx++;
          setClauses.push(`${colName} = COALESCE($${uidx}, ${colName})`);
          updateVals.push(value !== undefined ? value : null);
        }
      };

      addSet('name_en', resolvedNameEn);
      addSet('name_ar', name_ar);
      addSet('name_plural_ar', name_plural_ar);
      addSet('symbol', symbol);
      addSet('unit_type', unit_type);
      addSet('decimal_places', decimal_places !== undefined ? parseInt(decimal_places) : undefined);
      addSet('sort_order', sort_order !== undefined ? parseInt(sort_order) : undefined);
      addSet('updated_by', userId);

      if (cols.has('unit_type_id') && unit_type_id !== undefined) {
        uidx++;
        setClauses.push(`unit_type_id = $${uidx}`);
        updateVals.push(unit_type_id ? parseInt(unit_type_id) : null);
      }

      if (base_unit_id !== undefined) {
        uidx++;
        setClauses.push(`base_unit_id = $${uidx}`);
        updateVals.push(base_unit_id ? parseInt(base_unit_id) : null);
      }

      if (conversion_factor !== undefined) {
        uidx++;
        setClauses.push(`conversion_factor = $${uidx}`);
        updateVals.push(conversion_factor ? parseFloat(conversion_factor) : null);
      }

      if (is_base_unit !== undefined) {
        uidx++;
        setClauses.push(`is_base_unit = $${uidx}`);
        updateVals.push(is_base_unit);
      }

      if (is_purchase_unit !== undefined && cols.has('is_purchase_unit')) {
        uidx++;
        setClauses.push(`is_purchase_unit = $${uidx}`);
        updateVals.push(is_purchase_unit);
      }
      if (is_sales_unit !== undefined && cols.has('is_sales_unit')) {
        uidx++;
        setClauses.push(`is_sales_unit = $${uidx}`);
        updateVals.push(is_sales_unit);
      }
      if (is_inventory_unit !== undefined && cols.has('is_inventory_unit')) {
        uidx++;
        setClauses.push(`is_inventory_unit = $${uidx}`);
        updateVals.push(is_inventory_unit);
      }

      if (cols.has('status')) {
        uidx++;
        setClauses.push(`status = $${uidx}`);
        updateVals.push(newStatus);
      }

      uidx++;
      updateVals.push(id);

      const result = await client.query(
        `UPDATE units SET ${setClauses.join(', ')} WHERE id = $${uidx} AND deleted_at IS NULL RETURNING *`,
        updateVals
      );

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: 'Unit updated successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating unit:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Unit code already exists' });
      }
      res.status(500).json({ error: 'Failed to update unit' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// PATCH /:id/status — Change unit status
// ────────────────────────────────────────
router.patch(
  '/:id/status',
  requirePermission('master:units:edit'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { status: newStatus } = req.body;

      if (!['active', 'inactive'].includes(newStatus)) {
        return res.status(400).json({ error: 'Invalid status. Must be: active or inactive' });
      }

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT * FROM units WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Unit not found' });
      }

      if (existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const userId = (req as any).user?.id || null;

      const result = await client.query(
        `UPDATE units 
         SET status = $1, is_active = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND deleted_at IS NULL
         RETURNING *`,
        [newStatus, newStatus === 'active', userId, id]
      );

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: `Unit status changed to ${newStatus}` });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error changing unit status:', error);
      res.status(500).json({ error: 'Failed to change status' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// DELETE /:id — Soft delete
// ────────────────────────────────────────
router.delete(
  '/:id',
  requirePermission('master:units:delete'),
  dynamicDeletionProtection('units'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT * FROM units WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Unit not found' });
      }

      const derivedCheck = await client.query(
        'SELECT COUNT(*) FROM units WHERE base_unit_id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (parseInt(derivedCheck.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Cannot delete unit with active derived units. Delete or reassign derived units first.',
        });
      }

      if (existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const userId = (req as any).user?.id || null;

      await client.query(
        `UPDATE units SET deleted_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = $1`,
        [id, userId]
      );

      await client.query('COMMIT');

      res.json({ success: true, message: 'Unit deleted successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error deleting unit:', error);
      res.status(500).json({ error: 'Failed to delete unit' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// POST /:id/restore — Restore soft-deleted unit
// ────────────────────────────────────────
router.post(
  '/:id/restore',
  requirePermission('master:units:create'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || null;

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT is_global, is_system FROM units WHERE id = $1 AND deleted_at IS NOT NULL',
        [id]
      );
      if (existing.rows.length > 0 && existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const result = await client.query(
        `UPDATE units 
         SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP, updated_by = $2
         WHERE id = $1 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Unit not found or already active' });
      }

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: 'Unit restored successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error restoring unit:', error);
      res.status(500).json({ error: 'Failed to restore unit' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// Bulk actions
// ────────────────────────────────────────
router.post(
  '/bulk/status',
  requirePermission('master:units:edit'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { ids, status: newStatus } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }
      if (!['active', 'inactive'].includes(newStatus)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      await client.query('BEGIN');
      await client.query("SET LOCAL app.bypass_global_protection = 'true'");

      const userId = (req as any).user?.id || null;

      const result = await client.query(
        `UPDATE units 
         SET status = $1, is_active = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($4) AND deleted_at IS NULL
         RETURNING id`,
        [newStatus, newStatus === 'active', userId, ids]
      );

      await client.query('COMMIT');

      res.json({ success: true, updated: result.rowCount, message: `${result.rowCount} units updated` });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error bulk updating units:', error);
      res.status(500).json({ error: 'Failed to bulk update' });
    } finally {
      client.release();
    }
  }
);

router.post(
  '/bulk/delete',
  requirePermission('master:units:delete'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      await client.query('BEGIN');
      await client.query("SET LOCAL app.bypass_global_protection = 'true'");

      const userId = (req as any).user?.id || null;

      const result = await client.query(
        `UPDATE units 
         SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
         WHERE id = ANY($2) AND deleted_at IS NULL
         RETURNING id`,
        [userId, ids]
      );

      await client.query('COMMIT');

      res.json({ success: true, deleted: result.rowCount, message: `${result.rowCount} units deleted` });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error bulk deleting units:', error);
      res.status(500).json({ error: 'Failed to bulk delete' });
    } finally {
      client.release();
    }
  }
);

export default router;
