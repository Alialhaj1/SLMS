import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { getPaginationParams, sendPaginated } from '../utils/response';
import { buildTenantFilter, getIsolatedTenantId, getInsertTenantId } from '../middleware/tenantIsolation';
import { companyScopeGuard, buildCompanyScopeFilter, getRequestCompanyScope } from '../middleware/companyScopeGuard';
import { setupCompanyDefaults } from '../services/companySetup.service';

const router = Router();

// Validation schemas
const createCompanySchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_ar: z.string().max(255).optional(),
  legal_name: z.string().max(255).optional(),
  tax_number: z.string().max(100).optional(),
  registration_number: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal('')),
  currency: z.string().max(10).default('USD'),
  is_active: z.boolean().default(true),
});

const updateCompanySchema = createCompanySchema.partial();

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

/**
 * GET /api/companies
 * List all companies (soft-deleted excluded by default)
 */
router.get(
  '/',
  authenticate,
  requirePermission('companies:view'),
  companyScopeGuard,
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const { search, is_active, include_deleted, scope } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      let query = `
        SELECT c.*, 
               u1.full_name as created_by_name,
               u2.full_name as updated_by_name,
               (SELECT COUNT(*) FROM branches WHERE company_id = c.id AND deleted_at IS NULL) as branches_count
        FROM companies c
        LEFT JOIN users u1 ON c.created_by = u1.id
        LEFT JOIN users u2 ON c.updated_by = u2.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      // TENANT ISOLATION: Filter companies by tenant_id
      const tenantFilter = buildTenantFilter(req as any, 'c.tenant_id', paramIndex);
      if (tenantFilter.clause !== '1=1') {
        query += ` AND ${tenantFilter.clause}`;
        params.push(...tenantFilter.params);
        paramIndex = tenantFilter.nextIndex;
      }

      // COMPANY SCOPE: Filter by user's assigned companies
      // When scope=assigned (or for all tenant users by default), only show assigned companies
      const companyScope = buildCompanyScopeFilter(req as any, 'c.id', paramIndex);
      if (companyScope.clause !== '1=1') {
        query += ` AND ${companyScope.clause}`;
        params.push(...companyScope.params);
        paramIndex = companyScope.nextIndex;
      }

      // Exclude soft-deleted by default
      if (include_deleted !== 'true') {
        query += ` AND c.deleted_at IS NULL`;
      }

      // Filter by search query
      if (search) {
        query += ` AND (c.name ILIKE $${paramIndex} OR c.code ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ` AND c.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      // Get total count - build a separate count query with same filters
      let countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM companies c
        WHERE 1=1
      `;
      
      const countParams: any[] = [];
      let countParamIndex = 1;

      // TENANT ISOLATION: Apply same tenant filter to count
      const countTenantFilter = buildTenantFilter(req as any, 'c.tenant_id', countParamIndex);
      if (countTenantFilter.clause !== '1=1') {
        countQuery += ` AND ${countTenantFilter.clause}`;
        countParams.push(...countTenantFilter.params);
        countParamIndex = countTenantFilter.nextIndex;
      }

      // COMPANY SCOPE: Apply same company scope filter to count
      const countCompanyScope = buildCompanyScopeFilter(req as any, 'c.id', countParamIndex);
      if (countCompanyScope.clause !== '1=1') {
        countQuery += ` AND ${countCompanyScope.clause}`;
        countParams.push(...countCompanyScope.params);
        countParamIndex = countCompanyScope.nextIndex;
      }

      if (include_deleted !== 'true') {
        countQuery += ` AND c.deleted_at IS NULL`;
      }

      if (search) {
        countQuery += ` AND (c.name ILIKE $${countParamIndex} OR c.code ILIKE $${countParamIndex} OR c.email ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
        countParamIndex++;
      }

      if (is_active !== undefined) {
        countQuery += ` AND c.is_active = $${countParamIndex}`;
        countParams.push(is_active === 'true');
        countParamIndex++;
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      query += ` ORDER BY c.is_default DESC, c.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Failed to fetch companies:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch companies' });
    }
  }
);

/**
 * GET /api/companies/:id
 * Get single company by ID
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('companies:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // SECURITY: Validate ID is a safe integer
      const numericId = parseInt(id, 10);
      if (isNaN(numericId) || numericId <= 0) {
        return res.status(400).json({ error: 'Invalid company ID' });
      }

      // TENANT ISOLATION: Include tenant filter on single record fetch
      const tenantFilter = buildTenantFilter(req as any, 'c.tenant_id', 2);
      let nextIdx = tenantFilter.nextIndex;
      // COMPANY SCOPE: Include company scope filter
      const companyScope = buildCompanyScopeFilter(req as any, 'c.id', nextIdx);

      let whereExtra = '';
      const queryParams: any[] = [numericId];
      if (tenantFilter.clause !== '1=1') {
        whereExtra += ` AND ${tenantFilter.clause}`;
        queryParams.push(...tenantFilter.params);
      }
      if (companyScope.clause !== '1=1') {
        whereExtra += ` AND ${companyScope.clause}`;
        queryParams.push(...companyScope.params);
      }

      const result = await pool.query(
        `SELECT c.*, 
                u1.full_name as created_by_name,
                u2.full_name as updated_by_name
         FROM companies c
         LEFT JOIN users u1 ON c.created_by = u1.id
         LEFT JOIN users u2 ON c.updated_by = u2.id
         WHERE c.id = $1 AND c.deleted_at IS NULL${whereExtra}`,
        queryParams
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Failed to fetch company:', error);
      res.status(500).json({ error: 'Failed to fetch company' });
    }
  }
);

/**
 * POST /api/companies
 * Create new company
 */
router.post(
  '/',
  authenticate,
  requirePermission('companies:create'),
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      // Validate input
      const validatedData = createCompanySchema.parse(req.body);

      // Check for duplicate code
      const existingCompany = await pool.query(
        'SELECT id FROM companies WHERE code = $1 AND deleted_at IS NULL',
        [validatedData.code]
      );

      if (existingCompany.rows.length > 0) {
        return res.status(400).json({ error: 'Company code already exists' });
      }

      // If this is the first company, make it default
      const companyCount = await pool.query(
        'SELECT COUNT(*) as count FROM companies WHERE deleted_at IS NULL'
      );
      const isFirstCompany = parseInt(companyCount.rows[0].count) === 0;

      // TENANT ISOLATION: Get tenant_id for new company
      const tenantId = getInsertTenantId(req as any);

      // Check for duplicate code within the same tenant
      const existingCheck = tenantId 
        ? await pool.query('SELECT id FROM companies WHERE code = $1 AND tenant_id = $2 AND deleted_at IS NULL', [validatedData.code, tenantId])
        : existingCompany;
      // (existingCompany already checked above without tenant scope)

      // Insert company with tenant_id
      const result = await pool.query(
        `INSERT INTO companies (
          code, name, name_ar, legal_name, tax_number, registration_number,
          country, city, address, phone, email, website, currency, is_active,
          is_default, created_by, tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *`,
        [
          validatedData.code,
          validatedData.name,
          validatedData.name_ar || null,
          validatedData.legal_name || null,
          validatedData.tax_number || null,
          validatedData.registration_number || null,
          validatedData.country || null,
          validatedData.city || null,
          validatedData.address || null,
          validatedData.phone || null,
          validatedData.email || null,
          validatedData.website || null,
          validatedData.currency,
          validatedData.is_active,
          isFirstCompany, // First company is default
          req.user!.id,
          tenantId || null,
        ]
      );

      res.status(201).json(result.rows[0]);

      // Auto-setup company defaults (Chart of Accounts, Fiscal Year, Tax, etc.)
      // Fire-and-forget - don't block the response
      const newCompanyId = result.rows[0].id;
      setupCompanyDefaults(
        newCompanyId,
        tenantId || null,
        req.user!.id,
        validatedData.currency || 'SAR',
        validatedData.name
      ).then(setupResult => {
        if (setupResult.success) {
          console.log(`✅ Auto-setup completed for company ${newCompanyId}: ${setupResult.accounts_created} accounts created`);
        } else {
          console.error(`⚠️ Auto-setup partial failure for company ${newCompanyId}:`, setupResult.errors);
        }
      }).catch(err => {
        console.error(`❌ Auto-setup error for company ${newCompanyId}:`, err);
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      console.error('Failed to create company:', error);
      res.status(500).json({ error: 'Failed to create company' });
    }
  }
);

/**
 * PUT /api/companies/:id
 * Update existing company
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('companies:edit'),
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // SECURITY: Validate ID is a safe integer
      const numericId = parseInt(id, 10);
      if (isNaN(numericId) || numericId <= 0) {
        return res.status(400).json({ error: 'Invalid company ID' });
      }

      // Capture before state for audit
      await captureBeforeState(req as any, 'companies', numericId);

      // Validate input
      const validatedData = updateCompanySchema.parse(req.body);

      // TENANT ISOLATION: Verify company belongs to user's tenant
      const tenantFilter = buildTenantFilter(req as any, 'c.tenant_id', 2);
      const companyScope = buildCompanyScopeFilter(req as any, 'c.id', tenantFilter.nextIndex);

      let updateWhereExtra = '';
      const updateCheckParams: any[] = [numericId];
      if (tenantFilter.clause !== '1=1') {
        updateWhereExtra += ` AND ${tenantFilter.clause}`;
        updateCheckParams.push(...tenantFilter.params);
      }
      if (companyScope.clause !== '1=1') {
        updateWhereExtra += ` AND ${companyScope.clause}`;
        updateCheckParams.push(...companyScope.params);
      }

      // Check if company exists AND belongs to user's tenant
      const existingCompany = await pool.query(
        `SELECT c.* FROM companies c WHERE c.id = $1 AND c.deleted_at IS NULL${updateWhereExtra}`,
        updateCheckParams
      );

      if (existingCompany.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Check for duplicate code (excluding current company)
      if (validatedData.code) {
        const duplicateCode = await pool.query(
          'SELECT id FROM companies WHERE code = $1 AND id != $2 AND deleted_at IS NULL',
          [validatedData.code, numericId]
        );

        if (duplicateCode.rows.length > 0) {
          return res.status(400).json({ error: 'Company code already exists' });
        }
      }

      // Build dynamic update query
      const fields = Object.keys(validatedData);
      const setClause = fields
        .map((field, index) => `${field} = $${index + 2}`)
        .join(', ');

      const values = fields.map(field => (validatedData as any)[field]);

      const result = await pool.query(
        `UPDATE companies 
         SET ${setClause}, updated_by = $${fields.length + 2}, updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *`,
        [numericId, ...values, req.user!.id]
      );

      res.json(result.rows[0]);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      console.error('Failed to update company:', error);
      res.status(500).json({ error: 'Failed to update company' });
    }
  }
);

/**
 * DELETE /api/companies/:id
 * Soft delete company (sets deleted_at timestamp)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('companies:delete'),
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // SECURITY: Validate ID is a safe integer
      const numericId = parseInt(id, 10);
      if (isNaN(numericId) || numericId <= 0) {
        return res.status(400).json({ error: 'Invalid company ID' });
      }

      // Capture before state for audit
      await captureBeforeState(req as any, 'companies', numericId);

      // TENANT ISOLATION: Verify company before delete
      const tenantFilter = buildTenantFilter(req as any, 'c.tenant_id', 2);
      const companyScope = buildCompanyScopeFilter(req as any, 'c.id', tenantFilter.nextIndex);

      let deleteWhereExtra = '';
      const deleteCheckParams: any[] = [numericId];
      if (tenantFilter.clause !== '1=1') {
        deleteWhereExtra += ` AND ${tenantFilter.clause}`;
        deleteCheckParams.push(...tenantFilter.params);
      }
      if (companyScope.clause !== '1=1') {
        deleteWhereExtra += ` AND ${companyScope.clause}`;
        deleteCheckParams.push(...companyScope.params);
      }

      // Check if company exists AND belongs to user's tenant
      const existingCompany = await pool.query(
        `SELECT c.* FROM companies c WHERE c.id = $1 AND c.deleted_at IS NULL${deleteWhereExtra}`,
        deleteCheckParams
      );

      if (existingCompany.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Prevent deleting default company
      if (existingCompany.rows[0].is_default) {
        return res.status(400).json({ 
          error: 'Cannot delete default company. Please set another company as default first.' 
        });
      }

      // Check for active branches
      const activeBranches = await pool.query(
        'SELECT COUNT(*) as count FROM branches WHERE company_id = $1 AND deleted_at IS NULL',
        [numericId]
      );

      if (parseInt(activeBranches.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete company with active branches. Please delete all branches first.' 
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE companies SET deleted_at = NOW() WHERE id = $1',
        [numericId]
      );

      res.json({ message: 'Company deleted successfully' });
    } catch (error: any) {
      console.error('Failed to delete company:', error);
      res.status(500).json({ error: 'Failed to delete company' });
    }
  }
);

export default router;
