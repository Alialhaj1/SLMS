/**
 * COUNTRIES API — Full ISO 3166-1 Support
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 * 
 * Fields: code (alpha-3), code_2 (alpha-2), code3 (alpha-3 alias), numeric_code,
 *   name, name_ar, nationality, nationality_ar, capital_en, capital_ar,
 *   phone_code, currency_code, flag_emoji, region, sub_region, tax_zone,
 *   is_eu_member, population, area_km2, status, is_active, is_favorite, sort_order
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

// Apply enhanced audit (captures before/after state + field-level diffs)
applyEnhancedAudit(router, 'countries');

// ────────────────────────────────────────
// GET /  — List countries with search, filters, pagination, sorting
// ────────────────────────────────────────
router.get(
  '/',
  requirePermission('master:countries:view'),
  async (req: Request, res: Response) => {
    try {
      const {
        search, is_active, status, region, tax_zone, is_eu_member, is_favorite,
        sort_by = 'sort_order', sort_order = 'asc',
        page = '1', limit = '50'
      } = req.query as Record<string, string>;

      let query = `SELECT * FROM countries WHERE deleted_at IS NULL`;
      let countQuery = `SELECT COUNT(*) FROM countries WHERE deleted_at IS NULL`;
      const params: any[] = [];
      const countParams: any[] = [];
      let paramCount = 0;

      // Text search across multiple fields
      if (search) {
        paramCount++;
        const searchClause = ` AND (
          name ILIKE $${paramCount} OR name_ar ILIKE $${paramCount} OR
          code ILIKE $${paramCount} OR code_2 ILIKE $${paramCount} OR code3 ILIKE $${paramCount} OR
          phone_code ILIKE $${paramCount} OR currency_code ILIKE $${paramCount} OR
          capital_en ILIKE $${paramCount} OR capital_ar ILIKE $${paramCount} OR
          sub_region ILIKE $${paramCount}
        )`;
        query += searchClause;
        countQuery += searchClause;
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
      }

      // Filter: is_active (legacy boolean)
      if (is_active !== undefined) {
        paramCount++;
        const clause = ` AND is_active = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_active === 'true');
        countParams.push(is_active === 'true');
      }

      // Filter: status (active / inactive / restricted)
      if (status) {
        paramCount++;
        const clause = ` AND status = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(status);
        countParams.push(status);
      }

      // Filter: region
      if (region) {
        paramCount++;
        const clause = ` AND region = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(region);
        countParams.push(region);
      }

      // Filter: tax_zone
      if (tax_zone) {
        paramCount++;
        const clause = ` AND tax_zone = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(tax_zone);
        countParams.push(tax_zone);
      }

      // Filter: EU membership
      if (is_eu_member !== undefined) {
        paramCount++;
        const clause = ` AND is_eu_member = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_eu_member === 'true');
        countParams.push(is_eu_member === 'true');
      }

      // Filter: favorites
      if (is_favorite !== undefined) {
        paramCount++;
        const clause = ` AND is_favorite = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_favorite === 'true');
        countParams.push(is_favorite === 'true');
      }

      // Sorting — whitelist allowed columns
      const allowedSortColumns = [
        'name', 'name_ar', 'code', 'code_2', 'phone_code', 'currency_code',
        'region', 'tax_zone', 'status', 'population', 'area_km2',
        'sort_order', 'created_at', 'updated_at', 'is_favorite'
      ];
      const safeSortBy = allowedSortColumns.includes(sort_by) ? sort_by : 'sort_order';
      const safeSortOrder = sort_order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Favorites first, then by selected sort
      query += ` ORDER BY is_favorite DESC NULLS LAST, ${safeSortBy} ${safeSortOrder} NULLS LAST, name ASC`;

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

      // Execute queries
      const [dataResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].count);

      res.json({
        success: true,
        data: dataResult.rows,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error: any) {
      console.error('Error fetching countries:', error);
      res.status(500).json({ error: 'Failed to fetch countries' });
    }
  }
);

// ────────────────────────────────────────
// GET /stats — Aggregate statistics for stats bar
// ────────────────────────────────────────
router.get(
  '/stats',
  requirePermission('master:countries:view'),
  async (req: Request, res: Response) => {
    try {
      // Check which columns exist to build a safe query
      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'countries' AND table_schema = 'public'
      `);
      const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

      const parts: string[] = [
        `COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total`,
      ];
      if (cols.has('status')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'active') AS active`);
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'inactive') AS inactive`);
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'restricted') AS restricted`);
      } else if (cols.has('is_active')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active = true) AS active`);
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active = false) AS inactive`);
        parts.push(`0 AS restricted`);
      }
      if (cols.has('is_favorite')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_favorite = true) AS favorites`);
      } else {
        parts.push(`0 AS favorites`);
      }
      if (cols.has('is_eu_member')) {
        parts.push(`COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_eu_member = true) AS eu_members`);
      } else {
        parts.push(`0 AS eu_members`);
      }
      if (cols.has('region')) {
        parts.push(`COUNT(DISTINCT region) FILTER (WHERE deleted_at IS NULL) AS regions`);
      } else {
        parts.push(`0 AS regions`);
      }
      if (cols.has('tax_zone')) {
        parts.push(`COUNT(DISTINCT tax_zone) FILTER (WHERE deleted_at IS NULL) AS tax_zones`);
      } else {
        parts.push(`0 AS tax_zones`);
      }

      const result = await pool.query(`SELECT ${parts.join(', ')} FROM countries`);

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching country stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

// ────────────────────────────────────────
// GET /filters — Distinct values for dropdowns
// ────────────────────────────────────────
router.get(
  '/filters',
  requirePermission('master:countries:view'),
  async (req: Request, res: Response) => {
    try {
      const [regions, taxZones] = await Promise.all([
        pool.query(`SELECT DISTINCT region FROM countries WHERE deleted_at IS NULL AND region IS NOT NULL ORDER BY region`),
        pool.query(`SELECT DISTINCT tax_zone FROM countries WHERE deleted_at IS NULL AND tax_zone IS NOT NULL ORDER BY tax_zone`)
      ]);

      res.json({
        success: true,
        data: {
          regions: regions.rows.map(r => r.region),
          taxZones: taxZones.rows.map(r => r.tax_zone),
          statuses: ['active', 'inactive', 'restricted']
        }
      });
    } catch (error: any) {
      console.error('Error fetching filter options:', error);
      res.status(500).json({ error: 'Failed to fetch filter options' });
    }
  }
);

// ────────────────────────────────────────
// GET /:id — Get single country by ID
// ────────────────────────────────────────
router.get(
  '/:id',
  requirePermission('master:countries:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Country not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching country:', error);
      res.status(500).json({ error: 'Failed to fetch country' });
    }
  }
);

// ────────────────────────────────────────
// POST / — Create a new country
// ────────────────────────────────────────
router.post(
  '/',
  requirePermission('master:countries:create'),
  async (req: Request, res: Response) => {
    try {
      const {
        code_2, code3, numeric_code,
        name, name_ar, nationality, nationality_ar,
        capital_en, capital_ar,
        phone_code, currency_code, flag_emoji,
        region, sub_region, tax_zone,
        is_eu_member = false,
        population, area_km2,
        status: countryStatus = 'active',
        is_favorite = false, sort_order
      } = req.body;

      // Validation
      if (!code_2 || !name || !name_ar) {
        return res.status(400).json({ error: 'code_2, name, and name_ar are required' });
      }

      if (code_2.length !== 2) {
        return res.status(400).json({ error: 'code_2 must be exactly 2 characters (ISO 3166-1 alpha-2)' });
      }

      if (code3 && code3.length !== 3) {
        return res.status(400).json({ error: 'code3 must be exactly 3 characters (ISO 3166-1 alpha-3)' });
      }

      if (!phone_code || !currency_code || !region || !tax_zone) {
        return res.status(400).json({ error: 'phone_code, currency_code, region, and tax_zone are required' });
      }

      // Check duplicates on code_2
      const dupCheck = await pool.query(
        'SELECT id FROM countries WHERE (code_2 = $1 OR (code3 = $2 AND $2 IS NOT NULL)) AND deleted_at IS NULL',
        [code_2.toUpperCase(), code3?.toUpperCase() || null]
      );

      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Country with this code already exists' });
      }

      // Compute flag_emoji from code_2 if not provided
      const computedFlag = flag_emoji || computeFlagEmoji(code_2.toUpperCase());

      const userId = (req as any).user?.id || null;

      const result = await pool.query(
        `INSERT INTO countries (
          code, code_2, code3, numeric_code,
          name, name_ar, nationality, nationality_ar,
          capital_en, capital_ar,
          phone_code, currency_code, flag_emoji,
          region, sub_region, tax_zone,
          is_eu_member, population, area_km2,
          status, is_active, is_favorite, sort_order,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10,
          $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19,
          $20, $21, $22, $23,
          $24, $24
        ) RETURNING *`,
        [
          (code3 || code_2).toUpperCase(),   // code (legacy alpha-3 column, fallback to alpha-2)
          code_2.toUpperCase(),               // code_2
          code3?.toUpperCase() || null,        // code3
          numeric_code || null,               // numeric_code
          name,                               // name
          name_ar,                            // name_ar
          nationality || null,                // nationality
          nationality_ar || null,             // nationality_ar
          capital_en || null,                 // capital_en
          capital_ar || null,                 // capital_ar
          phone_code,                         // phone_code
          currency_code.toUpperCase(),        // currency_code
          computedFlag,                       // flag_emoji
          region,                             // region
          sub_region || null,                 // sub_region
          tax_zone,                           // tax_zone
          is_eu_member,                       // is_eu_member
          population || null,                 // population
          area_km2 || null,                   // area_km2
          countryStatus,                      // status
          countryStatus === 'active',         // is_active
          is_favorite,                        // is_favorite
          sort_order || null,                 // sort_order
          userId                              // created_by, updated_by
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Country created successfully' });
    } catch (error: any) {
      console.error('Error creating country:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Country code already exists' });
      }
      res.status(500).json({ error: 'Failed to create country' });
    }
  }
);

// ────────────────────────────────────────
// PUT /:id — Update an existing country
// ────────────────────────────────────────
router.put(
  '/:id',
  requirePermission('master:countries:edit'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const {
        code_2, code3, numeric_code,
        name, name_ar, nationality, nationality_ar,
        capital_en, capital_ar,
        phone_code, currency_code, flag_emoji,
        region, sub_region, tax_zone,
        is_eu_member, population, area_km2,
        status: countryStatus,
        is_favorite, sort_order
      } = req.body;

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Country not found' });
      }

      // Bypass global master data protection trigger for admin operations
      if (existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      // Handle status → is_active sync
      const newStatus = countryStatus ?? existing.rows[0].status;
      const newIsActive = newStatus === 'active';

      const userId = (req as any).user?.id || null;

      const result = await client.query(
        `UPDATE countries SET
          code_2 = COALESCE($1, code_2),
          code3 = COALESCE($2, code3),
          code = COALESCE($2, code3, code),
          numeric_code = COALESCE($3, numeric_code),
          name = COALESCE($4, name),
          name_ar = COALESCE($5, name_ar),
          nationality = COALESCE($6, nationality),
          nationality_ar = COALESCE($7, nationality_ar),
          capital_en = COALESCE($8, capital_en),
          capital_ar = COALESCE($9, capital_ar),
          phone_code = COALESCE($10, phone_code),
          currency_code = COALESCE($11, currency_code),
          flag_emoji = COALESCE($12, flag_emoji),
          region = COALESCE($13, region),
          sub_region = COALESCE($14, sub_region),
          tax_zone = COALESCE($15, tax_zone),
          is_eu_member = COALESCE($16, is_eu_member),
          population = COALESCE($17, population),
          area_km2 = COALESCE($18, area_km2),
          status = $19,
          is_active = $20,
          is_favorite = COALESCE($21, is_favorite),
          sort_order = COALESCE($22, sort_order),
          updated_by = $23,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $24 AND deleted_at IS NULL
        RETURNING *`,
        [
          code_2?.toUpperCase(), code3?.toUpperCase(), numeric_code,
          name, name_ar, nationality, nationality_ar,
          capital_en, capital_ar,
          phone_code, currency_code?.toUpperCase(), flag_emoji,
          region, sub_region, tax_zone,
          is_eu_member, population, area_km2,
          newStatus, newIsActive,
          is_favorite, sort_order,
          userId, id
        ]
      );

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: 'Country updated successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating country:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Country code already exists' });
      }
      res.status(500).json({ error: 'Failed to update country' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// PATCH /:id/toggle-favorite — Toggle favorite status
// ────────────────────────────────────────
router.patch(
  '/:id/toggle-favorite',
  requirePermission('master:countries:edit'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      await client.query('BEGIN');

      // Check if record is global/system and bypass trigger if needed
      const existing = await client.query(
        'SELECT is_global, is_system FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Country not found' });
      }
      if (existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const result = await client.query(
        `UPDATE countries 
         SET is_favorite = NOT COALESCE(is_favorite, false), updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id, is_favorite`,
        [id]
      );

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error toggling favorite:', error);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// PATCH /:id/status — Change country status
// ────────────────────────────────────────
router.patch(
  '/:id/status',
  requirePermission('master:countries:edit'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { status: newStatus } = req.body;

      if (!['active', 'inactive', 'restricted'].includes(newStatus)) {
        return res.status(400).json({ error: 'Invalid status. Must be: active, inactive, or restricted' });
      }

      await client.query('BEGIN');

      // Check if record is global/system and bypass trigger if needed
      const existing = await client.query(
        'SELECT is_global, is_system FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Country not found' });
      }
      if (existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const userId = (req as any).user?.id || null;

      const result = await client.query(
        `UPDATE countries 
         SET status = $1, is_active = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND deleted_at IS NULL
         RETURNING *`,
        [newStatus, newStatus === 'active', userId, id]
      );

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: `Country status changed to ${newStatus}` });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error changing status:', error);
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
  requirePermission('master:countries:delete'),
  dynamicDeletionProtection('countries'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      await client.query('BEGIN');

      const existingCountry = await client.query(
        'SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existingCountry.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Country not found' });
      }

      // Bypass global master data protection trigger for admin operations
      if (existingCountry.rows[0].is_global && existingCountry.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const userId = (req as any).user?.id || null;

      await client.query(
        `UPDATE countries SET deleted_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = $1`,
        [id, userId]
      );

      await client.query('COMMIT');

      res.json({ success: true, message: 'Country deleted successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error deleting country:', error);
      res.status(500).json({ error: 'Failed to delete country' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// POST /:id/restore — Restore soft-deleted country
// ────────────────────────────────────────
router.post(
  '/:id/restore',
  requirePermission('master:countries:create'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || null;

      await client.query('BEGIN');

      // Check if record is global/system and bypass trigger if needed
      const existing = await client.query(
        'SELECT is_global, is_system FROM countries WHERE id = $1 AND deleted_at IS NOT NULL',
        [id]
      );
      if (existing.rows.length > 0 && existing.rows[0].is_global && existing.rows[0].is_system) {
        await client.query("SET LOCAL app.bypass_global_protection = 'true'");
      }

      const result = await client.query(
        `UPDATE countries 
         SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP, updated_by = $2
         WHERE id = $1 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Country not found or already active' });
      }

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: 'Country restored successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error restoring country:', error);
      res.status(500).json({ error: 'Failed to restore country' });
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
  requirePermission('master:countries:edit'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { ids, status: newStatus } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }
      if (!['active', 'inactive', 'restricted'].includes(newStatus)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      await client.query('BEGIN');
      // Bypass trigger for all bulk operations (may include global records)
      await client.query("SET LOCAL app.bypass_global_protection = 'true'");

      const userId = (req as any).user?.id || null;

      const result = await client.query(
        `UPDATE countries 
         SET status = $1, is_active = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($4) AND deleted_at IS NULL
         RETURNING id`,
        [newStatus, newStatus === 'active', userId, ids]
      );

      await client.query('COMMIT');

      res.json({ success: true, updated: result.rowCount, message: `${result.rowCount} countries updated` });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error bulk updating:', error);
      res.status(500).json({ error: 'Failed to bulk update' });
    } finally {
      client.release();
    }
  }
);

router.post(
  '/bulk/delete',
  requirePermission('master:countries:delete'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      await client.query('BEGIN');
      // Bypass trigger for all bulk operations (may include global records)
      await client.query("SET LOCAL app.bypass_global_protection = 'true'");

      const userId = (req as any).user?.id || null;

      const result = await client.query(
        `UPDATE countries 
         SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
         WHERE id = ANY($2) AND deleted_at IS NULL
         RETURNING id`,
        [userId, ids]
      );

      await client.query('COMMIT');

      res.json({ success: true, deleted: result.rowCount, message: `${result.rowCount} countries deleted` });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error bulk deleting:', error);
      res.status(500).json({ error: 'Failed to bulk delete' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// Helper: compute flag emoji from ISO alpha-2 code
// ────────────────────────────────────────
function computeFlagEmoji(code2: string): string {
  if (!code2 || code2.length !== 2) return '';
  const codePoints = [...code2.toUpperCase()].map(c => c.charCodeAt(0) + 127397);
  return String.fromCodePoint(...codePoints);
}

export default router;
