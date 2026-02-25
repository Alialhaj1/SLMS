/**
 * 🏙️ CITIES API — Enterprise Edition
 * =====================================
 * Full enterprise CRUD with search, filters, pagination, sorting,
 * stats bar, bulk operations, and proper cascading filters.
 *
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 *
 * DB Columns: id, country_id, code, name, name_ar, name_en,
 *   state_province, state_province_en, state_province_ar,
 *   postal_code_prefix, timezone, latitude, longitude,
 *   is_capital, is_major_city, has_customs_office, has_port,
 *   is_port_city, population, status, is_active,
 *   sort_order, company_id, created_by, updated_by,
 *   created_at, updated_at, deleted_at
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
applyEnhancedAudit(router, 'cities');

// ────────────────────────────────────────
// GET /stats — Aggregate statistics for stats bar
// ────────────────────────────────────────
router.get(
  '/stats',
  requirePermission('master:cities:view'),
  async (req: Request, res: Response) => {
    try {
      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'cities' AND table_schema = 'public'
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

      if (cols.has('is_capital')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_capital = true) AS capitals`);
      } else {
        parts.push(`0 AS capitals`);
      }

      if (cols.has('is_major_city')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_major_city = true) AS major_cities`);
      } else {
        parts.push(`0 AS major_cities`);
      }

      if (cols.has('has_port') || cols.has('is_port_city')) {
        const portCol = cols.has('has_port') ? 'has_port' : 'is_port_city';
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND ${portCol} = true) AS port_cities`);
      } else {
        parts.push(`0 AS port_cities`);
      }

      if (cols.has('has_customs_office')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND has_customs_office = true) AS customs_cities`);
      } else {
        parts.push(`0 AS customs_cities`);
      }

      parts.push(`COUNT(DISTINCT country_id) FILTER (WHERE deleted_at IS NULL) AS countries_count`);

      const result = await pool.query(`SELECT ${parts.join(', ')} FROM cities`);

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching city stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

// ────────────────────────────────────────
// GET /filters — Distinct values for filter dropdowns
// ────────────────────────────────────────
router.get(
  '/filters',
  requirePermission('master:cities:view'),
  async (req: Request, res: Response) => {
    try {
      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'cities' AND table_schema = 'public'
      `);
      const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

      const countriesQuery = await pool.query(`
        SELECT DISTINCT co.id, co.name, co.code_2, co.flag_emoji
        FROM countries co
        JOIN cities c ON c.country_id = co.id AND c.deleted_at IS NULL
        WHERE co.deleted_at IS NULL
        ORDER BY co.name
      `);

      const stateCol = cols.has('state_province_en') ? 'state_province_en' : 'state_province';
      const statesQuery = await pool.query(`
        SELECT DISTINCT ${stateCol} AS state_province
        FROM cities
        WHERE deleted_at IS NULL AND ${stateCol} IS NOT NULL AND ${stateCol} != ''
        ORDER BY ${stateCol}
      `);

      res.json({
        success: true,
        data: {
          countries: countriesQuery.rows.map(r => ({
            value: r.id,
            label: `${r.flag_emoji || ''} ${r.name}`.trim(),
            code: r.code_2,
          })),
          states: statesQuery.rows.map(r => r.state_province),
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
// GET / — List cities with search, filters, pagination, sorting
// ────────────────────────────────────────
router.get(
  '/',
  requirePermission('master:cities:view'),
  async (req: Request, res: Response) => {
    try {
      const {
        search, is_active, status, country_id,
        is_major_city, is_capital, has_port, has_customs_office,
        state_province,
        sort_by = 'sort_order', sort_order = 'asc',
        page = '1', limit = '50',
      } = req.query as Record<string, string>;

      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'cities' AND table_schema = 'public'
      `);
      const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

      const selectParts = ['c.id', 'c.country_id', 'c.code', 'c.name', 'c.name_ar',
        'c.is_active', 'c.created_at', 'c.updated_at', 'c.deleted_at',
        "co.code_2 AS country_code", "co.name AS country_name", "co.flag_emoji AS country_flag"];

      if (cols.has('name_en')) selectParts.push('c.name_en');
      if (cols.has('state_province')) selectParts.push('c.state_province');
      if (cols.has('state_province_en')) selectParts.push('c.state_province_en');
      if (cols.has('state_province_ar')) selectParts.push('c.state_province_ar');
      if (cols.has('postal_code_prefix')) selectParts.push('c.postal_code_prefix');
      if (cols.has('timezone')) selectParts.push('c.timezone');
      if (cols.has('latitude')) selectParts.push('c.latitude');
      if (cols.has('longitude')) selectParts.push('c.longitude');
      if (cols.has('is_capital')) selectParts.push('c.is_capital');
      if (cols.has('is_major_city')) selectParts.push('c.is_major_city');
      if (cols.has('has_customs_office')) selectParts.push('c.has_customs_office');
      if (cols.has('has_port')) selectParts.push('c.has_port');
      if (cols.has('is_port_city')) selectParts.push('c.is_port_city');
      if (cols.has('population')) selectParts.push('c.population');
      if (cols.has('status')) selectParts.push('c.status');
      if (cols.has('sort_order')) selectParts.push('c.sort_order');
      if (cols.has('created_by')) selectParts.push('c.created_by');
      if (cols.has('updated_by')) selectParts.push('c.updated_by');
      if (cols.has('company_id')) selectParts.push('c.company_id');
      if (cols.has('is_global')) selectParts.push('c.is_global');
      if (cols.has('is_system')) selectParts.push('c.is_system');

      const baseWhere = `c.deleted_at IS NULL`;
      let query = `SELECT ${selectParts.join(', ')}
        FROM cities c
        LEFT JOIN countries co ON c.country_id = co.id
        WHERE ${baseWhere}`;
      let countQuery = `SELECT COUNT(*) FROM cities c WHERE ${baseWhere}`;

      const params: any[] = [];
      const countParams: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        const searchFields = ['c.name', 'c.code'];
        if (cols.has('name_ar')) searchFields.push('c.name_ar');
        if (cols.has('name_en')) searchFields.push('c.name_en');
        if (cols.has('state_province')) searchFields.push('c.state_province');
        if (cols.has('state_province_en')) searchFields.push('c.state_province_en');
        if (cols.has('state_province_ar')) searchFields.push('c.state_province_ar');
        if (cols.has('postal_code_prefix')) searchFields.push('c.postal_code_prefix');

        const searchClause = ` AND (${searchFields.map(f => `${f} ILIKE $${paramCount}`).join(' OR ')})`;
        query += searchClause;
        countQuery += searchClause;
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
      }

      if (status && cols.has('status')) {
        paramCount++;
        const clause = ` AND c.status = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(status);
        countParams.push(status);
      } else if (is_active !== undefined) {
        paramCount++;
        const clause = ` AND c.is_active = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_active === 'true');
        countParams.push(is_active === 'true');
      }

      if (country_id) {
        paramCount++;
        const clause = ` AND c.country_id = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(parseInt(country_id));
        countParams.push(parseInt(country_id));
      }

      if (is_major_city !== undefined && cols.has('is_major_city')) {
        paramCount++;
        const clause = ` AND c.is_major_city = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_major_city === 'true');
        countParams.push(is_major_city === 'true');
      }

      if (is_capital !== undefined && cols.has('is_capital')) {
        paramCount++;
        const clause = ` AND c.is_capital = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_capital === 'true');
        countParams.push(is_capital === 'true');
      }

      if (has_port !== undefined) {
        paramCount++;
        const portCol = cols.has('has_port') ? 'c.has_port' : 'c.is_port_city';
        const clause = ` AND ${portCol} = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(has_port === 'true');
        countParams.push(has_port === 'true');
      }

      if (has_customs_office !== undefined && cols.has('has_customs_office')) {
        paramCount++;
        const clause = ` AND c.has_customs_office = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(has_customs_office === 'true');
        countParams.push(has_customs_office === 'true');
      }

      if (state_province) {
        paramCount++;
        const stateCol = cols.has('state_province_en') ? 'c.state_province_en' : 'c.state_province';
        const clause = ` AND ${stateCol} = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(state_province);
        countParams.push(state_province);
      }

      // Sorting
      const allowedSortColumns = [
        'name', 'name_ar', 'code', 'country_name', 'is_capital',
        'is_major_city', 'has_port', 'has_customs_office', 'population',
        'status', 'sort_order', 'created_at', 'updated_at',
        'state_province', 'state_province_en',
      ];
      let safeSortBy = allowedSortColumns.includes(sort_by) ? sort_by : 'sort_order';
      if (safeSortBy === 'country_name') {
        safeSortBy = 'co.name';
      } else if (!safeSortBy.includes('.')) {
        safeSortBy = `c.${safeSortBy}`;
      }
      const safeSortOrder = sort_order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      if (cols.has('is_major_city')) {
        query += ` ORDER BY c.is_major_city DESC NULLS LAST, ${safeSortBy} ${safeSortOrder} NULLS LAST, c.name ASC`;
      } else {
        query += ` ORDER BY ${safeSortBy} ${safeSortOrder} NULLS LAST, c.name ASC`;
      }

      // Pagination
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
        has_port: row.has_port ?? row.is_port_city ?? false,
        is_port: row.has_port ?? row.is_port_city ?? false,
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
      console.error('Error fetching cities:', error);
      res.status(500).json({ error: 'Failed to fetch cities' });
    }
  }
);

// ────────────────────────────────────────
// GET /:id — Get single city by ID
// ────────────────────────────────────────
router.get(
  '/:id',
  requirePermission('master:cities:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT c.*, co.code_2 AS country_code, co.name AS country_name, co.flag_emoji AS country_flag
         FROM cities c
         LEFT JOIN countries co ON c.country_id = co.id
         WHERE c.id = $1 AND c.deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'City not found' });
      }

      const row = result.rows[0];
      row.has_port = row.has_port ?? row.is_port_city ?? false;
      row.status = row.status || (row.is_active ? 'active' : 'inactive');

      res.json({ success: true, data: row });
    } catch (error: any) {
      console.error('Error fetching city:', error);
      res.status(500).json({ error: 'Failed to fetch city' });
    }
  }
);

// ────────────────────────────────────────
// POST / — Create a new city
// ────────────────────────────────────────
router.post(
  '/',
  requirePermission('master:cities:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const userId = (req as any).user?.id || null;
      const {
        code, name, name_ar, name_en, country_id,
        state_province, state_province_en, state_province_ar,
        postal_code_prefix, timezone, latitude, longitude,
        is_capital = false, is_major_city = false,
        has_customs_office = false, has_port = false,
        is_port,
        population,
        status: cityStatus = 'active',
        sort_order,
      } = req.body;

      if (!name || !country_id) {
        return res.status(400).json({ error: 'name and country_id are required' });
      }

      const countryCheck = await pool.query(
        'SELECT id, name, code_2 FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [country_id]
      );
      if (countryCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid country — country not found' });
      }

      const dupCheck = await pool.query(
        `SELECT id FROM cities
         WHERE country_id = $1 AND (LOWER(name) = LOWER($2) OR (name_ar IS NOT NULL AND name_ar = $3))
         AND deleted_at IS NULL`,
        [country_id, name, name_ar || null]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ error: 'A city with this name already exists in the selected country' });
      }

      if (code) {
        const codeDup = await pool.query(
          `SELECT id FROM cities WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
          [code]
        );
        if (codeDup.rows.length > 0) {
          return res.status(400).json({ error: 'City code already exists' });
        }
      }

      const resolvedHasPort = has_port || is_port || false;

      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'cities' AND table_schema = 'public'
      `);
      const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

      const insertCols: string[] = ['country_id', 'name', 'is_active'];
      const insertVals: any[] = [country_id, name, cityStatus === 'active'];
      let idx = 3;

      const addCol = (colName: string, value: any) => {
        if (cols.has(colName) && value !== undefined && value !== null) {
          idx++;
          insertCols.push(colName);
          insertVals.push(value);
        }
      };

      addCol('code', code?.toUpperCase() || null);
      addCol('name_ar', name_ar);
      addCol('name_en', name_en || name);
      addCol('state_province', state_province || state_province_en);
      addCol('state_province_en', state_province_en);
      addCol('state_province_ar', state_province_ar);
      addCol('postal_code_prefix', postal_code_prefix);
      addCol('timezone', timezone);
      addCol('latitude', latitude ? parseFloat(latitude) : null);
      addCol('longitude', longitude ? parseFloat(longitude) : null);
      addCol('is_capital', is_capital);
      addCol('is_major_city', is_major_city);
      addCol('has_customs_office', has_customs_office);
      addCol('has_port', resolvedHasPort);
      addCol('is_port_city', resolvedHasPort);
      addCol('population', population ? parseInt(population) : null);
      addCol('status', cityStatus);
      addCol('sort_order', sort_order ? parseInt(sort_order) : null);
      addCol('company_id', companyId);
      addCol('created_by', userId);
      addCol('updated_by', userId);

      const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');

      const result = await pool.query(
        `INSERT INTO cities (${insertCols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        insertVals
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'City created successfully' });
    } catch (error: any) {
      console.error('Error creating city:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'City already exists (duplicate name or code)' });
      }
      res.status(500).json({ error: 'Failed to create city' });
    }
  }
);

// ────────────────────────────────────────
// PUT /:id — Update an existing city
// ────────────────────────────────────────
router.put(
  '/:id',
  requirePermission('master:cities:edit'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || null;
      const {
        name, name_ar, name_en, country_id,
        state_province, state_province_en, state_province_ar,
        postal_code_prefix, timezone, latitude, longitude,
        is_capital, is_major_city,
        has_customs_office, has_port,
        is_port,
        population,
        status: cityStatus,
        sort_order,
      } = req.body;

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT * FROM cities WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'City not found' });
      }

      if (existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      if (country_id && country_id !== existing.rows[0].country_id) {
        const countryCheck = await client.query(
          'SELECT id FROM countries WHERE id = $1 AND deleted_at IS NULL',
          [country_id]
        );
        if (countryCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Invalid country' });
        }
      }

      const newStatus = cityStatus ?? existing.rows[0].status ?? (existing.rows[0].is_active ? 'active' : 'inactive');
      const newIsActive = newStatus === 'active';
      const resolvedHasPort = has_port ?? is_port;

      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'cities' AND table_schema = 'public'
      `);
      const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

      const setClauses: string[] = [
        'name = COALESCE($1, name)',
        'is_active = $2',
        'updated_at = CURRENT_TIMESTAMP',
      ];
      const updateVals: any[] = [name, newIsActive];
      let uidx = 2;

      const addSet = (colName: string, value: any) => {
        if (cols.has(colName)) {
          uidx++;
          setClauses.push(`${colName} = COALESCE($${uidx}, ${colName})`);
          updateVals.push(value !== undefined ? value : null);
        }
      };

      addSet('name_ar', name_ar);
      addSet('name_en', name_en);
      addSet('country_id', country_id);
      addSet('state_province', state_province ?? state_province_en);
      addSet('state_province_en', state_province_en);
      addSet('state_province_ar', state_province_ar);
      addSet('postal_code_prefix', postal_code_prefix);
      addSet('timezone', timezone);
      addSet('latitude', latitude !== undefined ? parseFloat(latitude) : undefined);
      addSet('longitude', longitude !== undefined ? parseFloat(longitude) : undefined);
      addSet('is_capital', is_capital);
      addSet('is_major_city', is_major_city);
      addSet('has_customs_office', has_customs_office);
      addSet('has_port', resolvedHasPort);
      addSet('is_port_city', resolvedHasPort);
      addSet('population', population !== undefined ? parseInt(population) : undefined);
      addSet('sort_order', sort_order !== undefined ? parseInt(sort_order) : undefined);
      addSet('updated_by', userId);

      if (cols.has('status')) {
        uidx++;
        setClauses.push(`status = $${uidx}`);
        updateVals.push(newStatus);
      }

      uidx++;
      updateVals.push(id);

      const result = await client.query(
        `UPDATE cities SET ${setClauses.join(', ')} WHERE id = $${uidx} AND deleted_at IS NULL RETURNING *`,
        updateVals
      );

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: 'City updated successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating city:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'City name or code already exists' });
      }
      res.status(500).json({ error: 'Failed to update city' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// PATCH /:id/status — Change city status
// ────────────────────────────────────────
router.patch(
  '/:id/status',
  requirePermission('master:cities:edit'),
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
        'SELECT * FROM cities WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'City not found' });
      }

      if (existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const userId = (req as any).user?.id || null;

      const result = await client.query(
        `UPDATE cities 
         SET status = $1, is_active = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND deleted_at IS NULL
         RETURNING *`,
        [newStatus, newStatus === 'active', userId, id]
      );

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: `City status changed to ${newStatus}` });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error changing city status:', error);
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
  requirePermission('master:cities:delete'),
  dynamicDeletionProtection('cities'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT * FROM cities WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'City not found' });
      }

      if (existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const userId = (req as any).user?.id || null;

      await client.query(
        `UPDATE cities SET deleted_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = $1`,
        [id, userId]
      );

      await client.query('COMMIT');

      res.json({ success: true, message: 'City deleted successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error deleting city:', error);
      res.status(500).json({ error: 'Failed to delete city' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// POST /:id/restore — Restore soft-deleted city
// ────────────────────────────────────────
router.post(
  '/:id/restore',
  requirePermission('master:cities:create'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || null;

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT is_global, is_system FROM cities WHERE id = $1 AND deleted_at IS NOT NULL',
        [id]
      );
      if (existing.rows.length > 0 && existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const result = await client.query(
        `UPDATE cities 
         SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP, updated_by = $2
         WHERE id = $1 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'City not found or already active' });
      }

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: 'City restored successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error restoring city:', error);
      res.status(500).json({ error: 'Failed to restore city' });
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
  requirePermission('master:cities:edit'),
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
        `UPDATE cities 
         SET status = $1, is_active = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($4) AND deleted_at IS NULL
         RETURNING id`,
        [newStatus, newStatus === 'active', userId, ids]
      );

      await client.query('COMMIT');

      res.json({ success: true, updated: result.rowCount, message: `${result.rowCount} cities updated` });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error bulk updating cities:', error);
      res.status(500).json({ error: 'Failed to bulk update' });
    } finally {
      client.release();
    }
  }
);

router.post(
  '/bulk/delete',
  requirePermission('master:cities:delete'),
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
        `UPDATE cities 
         SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
         WHERE id = ANY($2) AND deleted_at IS NULL
         RETURNING id`,
        [userId, ids]
      );

      await client.query('COMMIT');

      res.json({ success: true, deleted: result.rowCount, message: `${result.rowCount} cities deleted` });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error bulk deleting cities:', error);
      res.status(500).json({ error: 'Failed to bulk delete' });
    } finally {
      client.release();
    }
  }
);

export default router;
