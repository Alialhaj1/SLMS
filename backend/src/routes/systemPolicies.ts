import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { getPaginationParams, sendPaginated } from '../utils/response';
import { z } from 'zod';

const router = Router();

// Validation schema (matches system_policies table)
const systemPolicySchema = z.object({
  policy_key: z.string().min(1).max(100),
  policy_value: z.string(),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  data_type: z.enum(['string', 'integer', 'float', 'number', 'boolean', 'json']).default('string'),
  category: z.string().max(50).optional(),
  default_value: z.string().optional(),
  validation_regex: z.string().optional(),
  is_system_policy: z.boolean().default(false),
  is_active: z.boolean().default(true),
  // super_admin only override; otherwise enforced by X-Company-Id
  company_id: z.number().int().optional(),
});

function isSuperAdmin(roles: string[] | undefined) {
  const SUPER_ADMIN_ROLES = ['super_admin', 'Super Admin', 'Admin', 'system_admin', 'System Admin'];
  return (roles || []).some((r) => SUPER_ADMIN_ROLES.includes(r));
}

// GET /api/system-policies - List system policies with filters and pagination
router.get('/', authenticate, loadCompanyContext, requirePermission('system_policies:view'), auditLog, async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { policy_key, is_system, category, search, keys } = req.query as any;
    const { page, limit, offset } = getPaginationParams(req.query);

    const where: string[] = ['deleted_at IS NULL', '(company_id = $1 OR company_id IS NULL)'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (policy_key) {
      where.push(`policy_key = $${paramIndex}`);
      params.push(String(policy_key));
      paramIndex++;
    }

    if (category) {
      where.push(`category = $${paramIndex}`);
      params.push(String(category));
      paramIndex++;
    }

    if (is_system !== undefined) {
      where.push(`is_system_policy = $${paramIndex}`);
      params.push(String(is_system) === 'true');
      paramIndex++;
    }

    if (keys) {
      const list = String(keys)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length > 0) {
        where.push(`policy_key = ANY($${paramIndex}::text[])`);
        params.push(list);
        paramIndex++;
      }
    }

    if (search) {
      where.push(`(
        policy_key ILIKE $${paramIndex}
        OR COALESCE(description_en, '') ILIKE $${paramIndex}
        OR COALESCE(description_ar, '') ILIKE $${paramIndex}
      )`);
      params.push(`%${String(search).trim()}%`);
      paramIndex++;
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM system_policies ${whereSql}`,
      params
    );
    const total = countResult.rows[0]?.total ?? 0;

    const result = await pool.query(
      `SELECT id, policy_key, policy_value, description_en, description_ar,
              data_type, category, default_value, validation_regex,
              is_system_policy, is_active, company_id,
              created_at, updated_at, created_by, updated_by
       FROM system_policies
       ${whereSql}
       ORDER BY category NULLS LAST, policy_key ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return sendPaginated(res, result.rows, page, limit, total);
  } catch (error: any) {
    console.error('Error fetching system policies:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch system policies' },
    });
  }
});

// GET /api/system-policies/:id - Get single system policy
router.get('/:id', authenticate, loadCompanyContext, requirePermission('system_policies:view'), auditLog, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;

    const result = await pool.query(
      `SELECT id, policy_key, policy_value, description_en, description_ar,
              data_type, category, default_value, validation_regex,
              is_system_policy, is_active,
              company_id, created_at, updated_at, created_by, updated_by
       FROM system_policies
       WHERE id = $1 AND deleted_at IS NULL AND (company_id = $2 OR company_id IS NULL)`,
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'System policy not found' },
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching system policy:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch system policy' },
    });
  }
});

// POST /api/system-policies - Create new system policy
router.post('/', authenticate, loadCompanyContext, requirePermission('system_policies:create'), auditLog, async (req: Request, res: Response) => {
  try {
    const validatedData = systemPolicySchema.parse(req.body);
    const userId = req.user!.id;
    const companyId = req.companyId;
    const allowCrossCompany = isSuperAdmin(req.user?.roles);
    const targetCompanyId = allowCrossCompany && validatedData.company_id ? validatedData.company_id : companyId;

    const result = await pool.query(
      `INSERT INTO system_policies (
        policy_key, policy_value, description_en, description_ar,
        data_type, category, default_value, validation_regex, is_system_policy, is_active,
        company_id, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        validatedData.policy_key,
        validatedData.policy_value,
        validatedData.description_en || null,
        validatedData.description_ar || null,
        validatedData.data_type,
        validatedData.category || null,
        validatedData.default_value || null,
        validatedData.validation_regex || null,
        validatedData.is_system_policy,
        validatedData.is_active,
        targetCompanyId,
        userId,
        userId,
      ]
    );

    (req as any).auditContext = {
      action: 'create',
      resource: 'system_policies',
      resourceId: result.rows[0].id,
      after: result.rows[0],
    };

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation error', details: error.errors },
      });
    }
    console.error('Error creating system policy:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create system policy' },
    });
  }
});

// PUT /api/system-policies/:id - Update system policy
router.put('/:id', authenticate, loadCompanyContext, requirePermission('system_policies:edit'), auditLog, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = systemPolicySchema.partial().parse(req.body);
    const userId = req.user!.id;
    const companyId = req.companyId;

    await captureBeforeState(req as any, 'system_policies', parseInt(id, 10));

    const existing = await pool.query(
      `SELECT id, company_id, is_system_policy
       FROM system_policies
       WHERE id = $1 AND deleted_at IS NULL AND (company_id = $2 OR company_id IS NULL)`,
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'System policy not found' },
      });
    }

    const existingRow = existing.rows[0];
    if (existingRow.company_id === null && !isSuperAdmin(req.user?.roles)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only super_admin can edit system-wide policies' },
      });
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (
        value !== undefined &&
        key !== 'company_id' &&
        key !== 'policy_key'
      ) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
      });
    }

    updateFields.push(`updated_by = $${paramCount}`);
    updateValues.push(userId);
    paramCount++;

    updateFields.push(`updated_at = NOW()`);

    updateValues.push(id);

    const result = await pool.query(
      `UPDATE system_policies SET ${updateFields.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    (req as any).auditContext = {
      ...(req as any).auditContext,
      after: result.rows[0],
    };

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation error', details: error.errors },
      });
    }
    console.error('Error updating system policy:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update system policy' },
    });
  }
});

// DELETE /api/system-policies/:id - Soft delete system policy
router.delete('/:id', authenticate, loadCompanyContext, requirePermission('system_policies:delete'), auditLog, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.companyId;

    await captureBeforeState(req as any, 'system_policies', parseInt(id, 10));

    const existing = await pool.query(
      `SELECT id, company_id, is_system_policy
       FROM system_policies
       WHERE id = $1 AND deleted_at IS NULL AND (company_id = $2 OR company_id IS NULL)`,
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'System policy not found' },
      });
    }

    const existingRow = existing.rows[0];
    if (existingRow.is_system_policy) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete system policy' },
      });
    }

    if (existingRow.company_id === null && !isSuperAdmin(req.user?.roles)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only super_admin can delete system-wide policies' },
      });
    }

    await pool.query(
      `UPDATE system_policies 
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, id]
    );

    (req as any).auditContext = {
      ...(req as any).auditContext,
      after: { deleted: true },
    };

    res.json({
      success: true,
      message: 'System policy deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting system policy:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete system policy' },
    });
  }
});

export default router;
