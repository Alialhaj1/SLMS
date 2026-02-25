/**
 * 🏢 BRANCHES API — Enterprise Edition
 * =======================================
 * Full enterprise CRUD with search, filters, pagination, sorting,
 * stats bar, hierarchical parent support, FK joins.
 *
 * Middlewares: ✅ Auth, ✅ RBAC, ✅ Audit, ✅ Tenant Isolation
 * Soft Delete: ✅ deleted_at
 *
 * DB Columns (post-migration 329):
 *   id, company_id, parent_branch_id, code, name, name_en, name_ar,
 *   type (headquarters|regional_office|branch|warehouse_only|sales_point),
 *   country_id→countries, city_id→cities, region_id→regions,
 *   currency_id→currencies, timezone_id→timezones, language_id→languages,
 *   address, postal_code, phone, email, manager_name,
 *   tax_number, cr_number, cost_center_code, profit_center_code,
 *   is_active, is_headquarters, is_default, latitude, longitude,
 *   created_by, updated_by, created_at, updated_at, deleted_at
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { getPaginationParams, sendPaginated } from '../utils/response';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const branchTypeEnum = z.enum([
  'headquarters', 'regional_office', 'branch', 'warehouse_only', 'sales_point'
]);

const createBranchSchema = z.object({
  company_id: z.number().int().positive(),
  parent_branch_id: z.number().int().positive().nullable().optional(),
  code: z.string().min(1).max(15),
  name: z.string().min(1).max(255),
  name_en: z.string().min(1).max(100).optional(),
  name_ar: z.string().max(100).optional(),
  type: branchTypeEnum.default('branch'),
  country_id: z.number().int().positive().nullable().optional(),
  city_id: z.number().int().positive().nullable().optional(),
  region_id: z.number().int().positive().nullable().optional(),
  address: z.string().optional(),
  postal_code: z.string().max(15).optional(),
  currency_id: z.number().int().positive().nullable().optional(),
  timezone_id: z.number().int().positive().nullable().optional(),
  language_id: z.number().int().positive().nullable().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional().or(z.literal('')),
  manager_name: z.string().max(255).optional(),
  tax_number: z.string().max(30).optional(),
  cr_number: z.string().max(30).optional(),
  cost_center_code: z.string().max(20).optional(),
  profit_center_code: z.string().max(20).optional(),
  is_active: z.boolean().default(true),
  is_headquarters: z.boolean().default(false),
  is_default: z.boolean().default(false),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

const updateBranchSchema = createBranchSchema.partial().omit({ company_id: true });

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
  };
}

// ─── Helper: Build SELECT with JOINs ────────────────────────────────────────

const BRANCH_SELECT = `
  SELECT b.*,
         c.name AS company_name,
         co.name AS country_name,
         co.code_2 AS country_code,
         co.flag_emoji AS country_flag,
         ci.name AS city_name,
         ci.name_ar AS city_name_ar,
         rg.name AS region_name,
         rg.name_ar AS region_name_ar,
         cur.code AS currency_code,
         cur.name AS currency_name,
         cur.symbol AS currency_symbol,
         tz.name AS timezone_name,
         COALESCE(tz.identifier, tz.code, tz.name) AS timezone_identifier,
         lg.name AS language_name,
         lg.native_name AS language_native_name,
         pb.name AS parent_branch_name,
         pb.code AS parent_branch_code,
         u1.full_name AS created_by_name,
         u2.full_name AS updated_by_name
  FROM branches b
  INNER JOIN companies c ON b.company_id = c.id
  LEFT JOIN countries co ON b.country_id = co.id
  LEFT JOIN cities ci ON b.city_id = ci.id
  LEFT JOIN regions rg ON b.region_id = rg.id
  LEFT JOIN currencies cur ON b.currency_id = cur.id
  LEFT JOIN timezones tz ON b.timezone_id = tz.id
  LEFT JOIN languages lg ON b.language_id = lg.id
  LEFT JOIN branches pb ON b.parent_branch_id = pb.id
  LEFT JOIN users u1 ON b.created_by = u1.id
  LEFT JOIN users u2 ON b.updated_by = u2.id
`;

// ────────────────────────────────────────
// GET /stats — Aggregate statistics for stats bar
// ────────────────────────────────────────
router.get(
  '/stats',
  authenticate,
  requirePermission('branches:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req);
      let tenantFilter = '';
      const params: any[] = [];

      if (tenantId !== null) {
        tenantFilter = `AND c.tenant_id = $1`;
        params.push(tenantId);
      }

      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE b.deleted_at IS NULL) AS total,
          COUNT(*) FILTER (WHERE b.deleted_at IS NULL AND b.is_active = true) AS active,
          COUNT(*) FILTER (WHERE b.deleted_at IS NULL AND b.is_active = false) AS inactive,
          COUNT(*) FILTER (WHERE b.deleted_at IS NULL AND b.type = 'headquarters') AS headquarters,
          COUNT(*) FILTER (WHERE b.deleted_at IS NULL AND b.type = 'regional_office') AS regional_offices,
          COUNT(*) FILTER (WHERE b.deleted_at IS NULL AND b.type = 'branch') AS branches,
          COUNT(*) FILTER (WHERE b.deleted_at IS NULL AND b.type = 'warehouse_only') AS warehouses,
          COUNT(*) FILTER (WHERE b.deleted_at IS NULL AND b.type = 'sales_point') AS sales_points,
          COUNT(*) FILTER (WHERE b.deleted_at IS NULL AND b.is_default = true) AS default_branches,
          COUNT(DISTINCT b.country_id) FILTER (WHERE b.deleted_at IS NULL) AS countries_count
        FROM branches b
        INNER JOIN companies c ON b.company_id = c.id
        WHERE c.deleted_at IS NULL ${tenantFilter}
      `, params);

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching branch stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

// ────────────────────────────────────────
// GET /filters — Distinct values for filter dropdowns
// ────────────────────────────────────────
router.get(
  '/filters',
  authenticate,
  requirePermission('branches:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req);
      let tenantFilter = '';
      const params: any[] = [];
      if (tenantId !== null) {
        tenantFilter = `AND c.tenant_id = $1`;
        params.push(tenantId);
      }

      const [typesResult, countriesResult, companiesResult] = await Promise.all([
        pool.query(`
          SELECT DISTINCT b.type FROM branches b
          INNER JOIN companies c ON b.company_id = c.id
          WHERE b.deleted_at IS NULL AND c.deleted_at IS NULL AND b.type IS NOT NULL ${tenantFilter}
          ORDER BY b.type
        `, params),
        pool.query(`
          SELECT DISTINCT co.id, co.name, co.code_2, co.flag_emoji FROM branches b
          INNER JOIN companies c ON b.company_id = c.id
          LEFT JOIN countries co ON b.country_id = co.id
          WHERE b.deleted_at IS NULL AND c.deleted_at IS NULL AND b.country_id IS NOT NULL ${tenantFilter}
          ORDER BY co.name
        `, params),
        pool.query(`
          SELECT DISTINCT c.id, c.name, c.code FROM branches b
          INNER JOIN companies c ON b.company_id = c.id
          WHERE b.deleted_at IS NULL AND c.deleted_at IS NULL ${tenantFilter}
          ORDER BY c.name
        `, params),
      ]);

      res.json({
        success: true,
        data: {
          types: typesResult.rows.map((r: any) => r.type),
          countries: countriesResult.rows,
          companies: companiesResult.rows,
        },
      });
    } catch (error: any) {
      console.error('Error fetching branch filters:', error);
      res.status(500).json({ error: 'Failed to fetch filters' });
    }
  }
);

// ────────────────────────────────────────
// GET /tree — Hierarchical tree structure
// ────────────────────────────────────────
router.get(
  '/tree',
  authenticate,
  requirePermission('branches:view'),
  async (req: Request, res: Response) => {
    try {
      const { company_id } = req.query;
      const tenantId = getIsolatedTenantId(req);
      const params: any[] = [];
      let paramIndex = 1;
      let filters = '';

      if (tenantId !== null) {
        filters += ` AND c.tenant_id = $${paramIndex}`;
        params.push(tenantId);
        paramIndex++;
      }

      if (company_id) {
        filters += ` AND b.company_id = $${paramIndex}`;
        params.push(company_id);
        paramIndex++;
      }

      const result = await pool.query(`
        SELECT b.id, b.code, b.name, b.name_en, b.name_ar, b.type,
               b.parent_branch_id, b.is_active, b.is_default, b.is_headquarters,
               co.name AS country_name, co.flag_emoji AS country_flag,
               ci.name AS city_name
        FROM branches b
        INNER JOIN companies c ON b.company_id = c.id
        LEFT JOIN countries co ON b.country_id = co.id
        LEFT JOIN cities ci ON b.city_id = ci.id
        WHERE b.deleted_at IS NULL AND c.deleted_at IS NULL ${filters}
        ORDER BY b.is_headquarters DESC, b.parent_branch_id NULLS FIRST, b.name ASC
      `, params);

      // Build tree structure
      const items = result.rows;
      const map = new Map<number, any>();
      const roots: any[] = [];

      items.forEach((item: any) => {
        map.set(item.id, { ...item, children: [] });
      });

      items.forEach((item: any) => {
        const node = map.get(item.id);
        if (item.parent_branch_id && map.has(item.parent_branch_id)) {
          map.get(item.parent_branch_id).children.push(node);
        } else {
          roots.push(node);
        }
      });

      res.json({ success: true, data: roots });
    } catch (error: any) {
      console.error('Error fetching branch tree:', error);
      res.status(500).json({ error: 'Failed to fetch branch tree' });
    }
  }
);

// ────────────────────────────────────────
// GET / — List all branches (paginated)
// ────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requirePermission('branches:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { company_id, search, is_active, type, country_id, city_id, parent_branch_id, is_default, sort_by, sort_order: sortDir } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      let query = `${BRANCH_SELECT}
        WHERE b.deleted_at IS NULL AND c.deleted_at IS NULL
      `;

      const params: any[] = [];
      let paramIndex = 1;

      // TENANT ISOLATION
      const tenantId = getIsolatedTenantId(req);
      if (tenantId !== null) {
        query += ` AND c.tenant_id = $${paramIndex}`;
        params.push(tenantId);
        paramIndex++;
      }

      // Filter by company
      if (company_id) {
        query += ` AND b.company_id = $${paramIndex}`;
        params.push(company_id);
        paramIndex++;
      }

      // Filter by search query
      if (search) {
        query += ` AND (
          b.name ILIKE $${paramIndex} OR b.name_en ILIKE $${paramIndex} OR b.name_ar ILIKE $${paramIndex}
          OR b.code ILIKE $${paramIndex}
          OR co.name ILIKE $${paramIndex}
          OR ci.name ILIKE $${paramIndex}
          OR b.tax_number ILIKE $${paramIndex}
          OR b.cr_number ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Filter by active status
      if (is_active !== undefined && is_active !== '') {
        query += ` AND b.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      // Filter by type
      if (type && type !== '') {
        query += ` AND b.type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      // Filter by country
      if (country_id && country_id !== '') {
        query += ` AND b.country_id = $${paramIndex}`;
        params.push(country_id);
        paramIndex++;
      }

      // Filter by city
      if (city_id && city_id !== '') {
        query += ` AND b.city_id = $${paramIndex}`;
        params.push(city_id);
        paramIndex++;
      }

      // Filter by parent_branch_id
      if (parent_branch_id !== undefined && parent_branch_id !== '') {
        if (parent_branch_id === 'null') {
          query += ` AND b.parent_branch_id IS NULL`;
        } else {
          query += ` AND b.parent_branch_id = $${paramIndex}`;
          params.push(parent_branch_id);
          paramIndex++;
        }
      }

      // Filter by is_default
      if (is_default !== undefined && is_default !== '') {
        query += ` AND b.is_default = $${paramIndex}`;
        params.push(is_default === 'true');
        paramIndex++;
      }

      // Get total count
      const countQuery = query
        .replace(/SELECT[\s\S]*?FROM branches b/m, 'SELECT COUNT(DISTINCT b.id) AS total FROM branches b')
        .replace(/ORDER BY[\s\S]*$/, '');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Sorting
      const allowedSortFields: Record<string, string> = {
        code: 'b.code',
        name: 'b.name',
        name_en: 'b.name_en',
        name_ar: 'b.name_ar',
        type: 'b.type',
        country_name: 'co.name',
        city_name: 'ci.name',
        company_name: 'c.name',
        is_active: 'b.is_active',
        is_default: 'b.is_default',
        created_at: 'b.created_at',
      };

      const sortField = allowedSortFields[sort_by as string] || 'b.is_headquarters DESC, b.name';
      const sortDirection = (sortDir as string)?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      if (sort_by && allowedSortFields[sort_by as string]) {
        query += ` ORDER BY ${sortField} ${sortDirection} NULLS LAST`;
      } else {
        query += ` ORDER BY b.is_headquarters DESC, b.is_default DESC, b.name ASC`;
      }

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Failed to fetch branches:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch branches' });
    }
  }
);

// ────────────────────────────────────────
// GET /:id — Single branch by ID
// ────────────────────────────────────────
router.get(
  '/:id',
  authenticate,
  requirePermission('branches:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = getIsolatedTenantId(req);
      let tenantFilter = '';
      const queryParams: any[] = [id];

      if (tenantId !== null) {
        tenantFilter = ' AND c.tenant_id = $2';
        queryParams.push(tenantId);
      }

      const result = await pool.query(
        `${BRANCH_SELECT}
         WHERE b.id = $1 AND b.deleted_at IS NULL${tenantFilter}`,
        queryParams
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Also fetch child branches count
      const childCount = await pool.query(
        'SELECT COUNT(*) AS count FROM branches WHERE parent_branch_id = $1 AND deleted_at IS NULL',
        [id]
      );

      const branch = {
        ...result.rows[0],
        child_branches_count: parseInt(childCount.rows[0].count),
      };

      res.json(branch);
    } catch (error: any) {
      console.error('Failed to fetch branch:', error);
      res.status(500).json({ error: 'Failed to fetch branch' });
    }
  }
);

// ────────────────────────────────────────
// POST / — Create new branch
// ────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requirePermission('branches:create'),
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = createBranchSchema.parse(req.body);

      // Verify company exists
      const tenantId = getIsolatedTenantId(req);
      let companyQuery = 'SELECT id, tenant_id FROM companies WHERE id = $1 AND deleted_at IS NULL';
      const companyParams: any[] = [validatedData.company_id];
      if (tenantId !== null) {
        companyQuery += ' AND tenant_id = $2';
        companyParams.push(tenantId);
      }
      const companyExists = await pool.query(companyQuery, companyParams);

      if (companyExists.rows.length === 0) {
        return res.status(400).json({ error: 'Company not found' });
      }

      // Check for duplicate code within company
      const duplicateCode = await pool.query(
        'SELECT id FROM branches WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [validatedData.company_id, validatedData.code]
      );

      if (duplicateCode.rows.length > 0) {
        return res.status(400).json({ error: 'Branch code already exists for this company' });
      }

      // Validate parent branch belongs to same company (if provided)
      if (validatedData.parent_branch_id) {
        const parentCheck = await pool.query(
          'SELECT id FROM branches WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [validatedData.parent_branch_id, validatedData.company_id]
        );
        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Parent branch not found or belongs to different company' });
        }
      }

      // If this is set as headquarters/default, unset others for this company
      if (validatedData.is_headquarters || validatedData.type === 'headquarters') {
        await pool.query(
          'UPDATE branches SET is_headquarters = false WHERE company_id = $1',
          [validatedData.company_id]
        );
      }

      if (validatedData.is_default) {
        await pool.query(
          'UPDATE branches SET is_default = false WHERE company_id = $1',
          [validatedData.company_id]
        );
      }

      // Sync is_headquarters with type
      const isHQ = validatedData.is_headquarters || validatedData.type === 'headquarters';

      const result = await pool.query(
        `INSERT INTO branches (
          company_id, parent_branch_id, code, name, name_en, name_ar, type,
          country_id, city_id, region_id, address, postal_code,
          currency_id, timezone_id, language_id,
          phone, email, manager_name,
          tax_number, cr_number, cost_center_code, profit_center_code,
          is_active, is_headquarters, is_default, latitude, longitude,
          created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21, $22,
          $23, $24, $25, $26, $27,
          $28, NOW(), NOW()
        )
        RETURNING *`,
        [
          validatedData.company_id,
          validatedData.parent_branch_id || null,
          validatedData.code,
          validatedData.name_en || validatedData.name,
          validatedData.name_en || validatedData.name,
          validatedData.name_ar || null,
          validatedData.type || 'branch',
          validatedData.country_id || null,
          validatedData.city_id || null,
          validatedData.region_id || null,
          validatedData.address || null,
          validatedData.postal_code || null,
          validatedData.currency_id || null,
          validatedData.timezone_id || null,
          validatedData.language_id || null,
          validatedData.phone || null,
          validatedData.email || null,
          validatedData.manager_name || null,
          validatedData.tax_number || null,
          validatedData.cr_number || null,
          validatedData.cost_center_code || null,
          validatedData.profit_center_code || null,
          validatedData.is_active,
          isHQ,
          validatedData.is_default,
          validatedData.latitude || null,
          validatedData.longitude || null,
          req.user!.id,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('Failed to create branch:', error);
      res.status(500).json({ error: 'Failed to create branch' });
    }
  }
);

// ────────────────────────────────────────
// PUT /:id — Update existing branch
// ────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  requirePermission('branches:edit'),
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Capture before state for audit
      await captureBeforeState(req as any, 'branches', parseInt(id));

      const validatedData = updateBranchSchema.parse(req.body);

      // Check if branch exists
      const tenantId = getIsolatedTenantId(req);
      let branchQuery = `SELECT b.* FROM branches b
                         INNER JOIN companies c ON b.company_id = c.id
                         WHERE b.id = $1 AND b.deleted_at IS NULL`;
      const branchParams: any[] = [id];
      if (tenantId !== null) {
        branchQuery += ' AND c.tenant_id = $2';
        branchParams.push(tenantId);
      }
      const existingBranch = await pool.query(branchQuery, branchParams);

      if (existingBranch.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      const companyId = existingBranch.rows[0].company_id;

      // Check for duplicate code (excluding current branch)
      if (validatedData.code) {
        const duplicateCode = await pool.query(
          'SELECT id FROM branches WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
          [companyId, validatedData.code, id]
        );

        if (duplicateCode.rows.length > 0) {
          return res.status(400).json({ error: 'Branch code already exists for this company' });
        }
      }

      // Validate parent branch (no self-reference, no circular, same company)
      if (validatedData.parent_branch_id !== undefined) {
        if (validatedData.parent_branch_id === parseInt(id)) {
          return res.status(400).json({ error: 'Branch cannot be its own parent' });
        }
        if (validatedData.parent_branch_id) {
          const parentCheck = await pool.query(
            'SELECT id FROM branches WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
            [validatedData.parent_branch_id, companyId]
          );
          if (parentCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Parent branch not found or belongs to different company' });
          }
        }
      }

      // If setting as headquarters/default, unset others
      if (validatedData.is_headquarters || validatedData.type === 'headquarters') {
        await pool.query(
          'UPDATE branches SET is_headquarters = false WHERE company_id = $1 AND id != $2',
          [companyId, id]
        );
      }

      if (validatedData.is_default) {
        await pool.query(
          'UPDATE branches SET is_default = false WHERE company_id = $1 AND id != $2',
          [companyId, id]
        );
      }

      // Sync name with name_en
      const dataToUpdate: Record<string, any> = { ...validatedData };
      if (dataToUpdate.name_en && !dataToUpdate.name) {
        dataToUpdate.name = dataToUpdate.name_en;
      }
      if (dataToUpdate.name && !dataToUpdate.name_en) {
        dataToUpdate.name_en = dataToUpdate.name;
      }

      // Sync is_headquarters with type
      if (dataToUpdate.type === 'headquarters') {
        dataToUpdate.is_headquarters = true;
      }

      // Build dynamic update query
      const fields = Object.keys(dataToUpdate);
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const setClause = fields
        .map((field, index) => `${field} = $${index + 2}`)
        .join(', ');

      const values = fields.map(field => {
        const val = dataToUpdate[field];
        return val === '' ? null : val ?? null;
      });

      const result = await pool.query(
        `UPDATE branches 
         SET ${setClause}, updated_by = $${fields.length + 2}, updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *`,
        [id, ...values, req.user!.id]
      );

      res.json(result.rows[0]);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('Failed to update branch:', error);
      res.status(500).json({ error: 'Failed to update branch' });
    }
  }
);

// ────────────────────────────────────────
// DELETE /:id — Soft delete branch
// ────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requirePermission('branches:delete'),
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await captureBeforeState(req as any, 'branches', parseInt(id));

      // Check if branch exists
      const tenantId = getIsolatedTenantId(req);
      let delQuery = `SELECT b.* FROM branches b
                      INNER JOIN companies c ON b.company_id = c.id
                      WHERE b.id = $1 AND b.deleted_at IS NULL`;
      const delParams: any[] = [id];
      if (tenantId !== null) {
        delQuery += ' AND c.tenant_id = $2';
        delParams.push(tenantId);
      }
      const existingBranch = await pool.query(delQuery, delParams);

      if (existingBranch.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Prevent deleting if it has child branches
      const childCount = await pool.query(
        'SELECT COUNT(*) AS count FROM branches WHERE parent_branch_id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (parseInt(childCount.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Cannot delete branch with child branches. Delete or reassign child branches first.'
        });
      }

      // Prevent deleting headquarters if it's the only branch
      if (existingBranch.rows[0].is_headquarters) {
        const branchCount = await pool.query(
          'SELECT COUNT(*) AS count FROM branches WHERE company_id = $1 AND deleted_at IS NULL',
          [existingBranch.rows[0].company_id]
        );

        if (parseInt(branchCount.rows[0].count) === 1) {
          return res.status(400).json({
            error: 'Cannot delete the only branch. Companies must have at least one branch.'
          });
        }
      }

      // Check for users assigned to this branch
      try {
        const usersCheck = await pool.query(
          'SELECT COUNT(*) AS count FROM users WHERE branch_id = $1 AND deleted_at IS NULL',
          [id]
        );
        if (parseInt(usersCheck.rows[0].count) > 0) {
          return res.status(400).json({
            error: `Cannot delete branch with ${usersCheck.rows[0].count} active users. Reassign users first.`
          });
        }
      } catch (_) {
        // branch_id column may not exist in users table yet — ignore
      }

      // Soft delete
      await pool.query(
        'UPDATE branches SET deleted_at = NOW(), updated_by = $2 WHERE id = $1',
        [id, req.user!.id]
      );

      res.json({ message: 'Branch deleted successfully' });
    } catch (error: any) {
      console.error('Failed to delete branch:', error);
      res.status(500).json({ error: 'Failed to delete branch' });
    }
  }
);

export default router;
