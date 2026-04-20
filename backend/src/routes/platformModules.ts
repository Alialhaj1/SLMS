/**
 * ============================================================
 * Platform Module Management Routes — Architecture §5.1 #9
 * ============================================================
 *
 * Enable/disable modules at platform level and per-tenant.
 * Reads from `modules` + `tenant_modules` tables (migration 405/406).
 *
 * Access: platform.modules.read / platform.modules.update
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { platformGate } from '../middleware/platformGateway';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';
import { PermissionService } from '../services/permissionService';

const router = Router();

// ────────────────────────────────────────────
// GET / — List all modules with tenant enablement counts
// ────────────────────────────────────────────
router.get('/', authenticate, platformGate('platform.modules.read'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT m.*,
             COALESCE(tm.enabled_count, 0) as enabled_tenants,
             COALESCE(perm_count.cnt, 0)   as permission_count
      FROM modules m
      LEFT JOIN (
        SELECT module_code, COUNT(*) as enabled_count
        FROM tenant_modules WHERE is_enabled = true
        GROUP BY module_code
      ) tm ON tm.module_code = m.module_code
      LEFT JOIN (
        SELECT module_code, COUNT(*) as cnt
        FROM permissions WHERE module_code IS NOT NULL
        GROUP BY module_code
      ) perm_count ON perm_count.module_code = m.module_code
      ORDER BY m.sort_order, m.module_code
    `);

    sendSuccess(res, { data: result.rows, total: result.rowCount });
  } catch (err: any) {
    logger.error('Failed to list modules', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to list modules', 500);
  }
});

// ────────────────────────────────────────────
// GET /:moduleCode — Module detail with permissions and tenant list
// ────────────────────────────────────────────
router.get('/:moduleCode', authenticate, platformGate('platform.modules.read'), async (req: Request, res: Response) => {
  try {
    const { moduleCode } = req.params;

    const moduleResult = await pool.query(
      `SELECT * FROM modules WHERE module_code = $1`,
      [moduleCode]
    );
    if (moduleResult.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Module not found', 404);

    const [permissions, tenantStatus] = await Promise.all([
      pool.query(
        `SELECT permission_code, resource, action, description FROM permissions WHERE module_code = $1 ORDER BY permission_code`,
        [moduleCode]
      ),
      pool.query(
        `SELECT tm.tenant_id, t.name as tenant_name, t.company_code, tm.is_enabled, tm.created_at as enabled_at, tm.updated_at
         FROM tenant_modules tm
         JOIN tenants t ON t.id = tm.tenant_id
         WHERE tm.module_code = $1
         ORDER BY t.name`,
        [moduleCode]
      ),
    ]);

    sendSuccess(res, {
      module: moduleResult.rows[0],
      permissions: permissions.rows,
      tenants: tenantStatus.rows,
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch module details', 500);
  }
});

// ────────────────────────────────────────────
// PUT /:moduleCode — Update module (activate/deactivate globally)
// ────────────────────────────────────────────
router.put('/:moduleCode', authenticate, platformGate('platform.modules.update'), async (req: Request, res: Response) => {
  try {
    const { moduleCode } = req.params;
    const { is_active, description, name, name_ar, display_order } = req.body;

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (is_active !== undefined)    { sets.push(`is_active = $${idx++}`); params.push(is_active); }
    if (description !== undefined)  { sets.push(`description = $${idx++}`); params.push(description); }
    if (name !== undefined)         { sets.push(`module_name = $${idx++}`); params.push(name); }
    if (name_ar !== undefined)      { sets.push(`name_ar = $${idx++}`); params.push(name_ar); }
    if (display_order !== undefined) { sets.push(`sort_order = $${idx++}`); params.push(display_order); }
    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) return sendError(res, 'VALIDATION_ERROR', 'No fields to update', 400);

    params.push(moduleCode);
    const result = await pool.query(
      `UPDATE modules SET ${sets.join(', ')} WHERE module_code = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Module not found', 404);

    logger.info({ event: 'module_updated', moduleCode, updatedBy: (req as any).user?.id });
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to update module', 500);
  }
});

// ────────────────────────────────────────────
// POST /:moduleCode/tenant/:tenantId — Enable/disable module for a tenant
// ────────────────────────────────────────────
router.post('/:moduleCode/tenant/:tenantId', authenticate, platformGate('platform.modules.update'), async (req: Request, res: Response) => {
  try {
    const { moduleCode } = req.params;
    const tenantId = parseInt(req.params.tenantId);
    const { enabled } = req.body;

    if (isNaN(tenantId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);
    if (typeof enabled !== 'boolean') return sendError(res, 'VALIDATION_ERROR', 'enabled must be a boolean', 400);

    // Verify module exists
    const modCheck = await pool.query(`SELECT is_core FROM modules WHERE module_code = $1`, [moduleCode]);
    if (modCheck.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Module not found', 404);

    // Core modules cannot be disabled
    if (modCheck.rows[0].is_core && !enabled) {
      return sendError(res, 'VALIDATION_ERROR', 'Core modules cannot be disabled', 400);
    }

    // Verify tenant exists
    const tenantCheck = await pool.query(`SELECT id FROM tenants WHERE id = $1`, [tenantId]);
    if (tenantCheck.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);

    const result = await pool.query(
      `INSERT INTO tenant_modules (tenant_id, module_code, is_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (tenant_id, module_code)
       DO UPDATE SET
         is_enabled = $3,
         updated_at = NOW()
       RETURNING *`,
      [tenantId, moduleCode, enabled]
    );

    logger.info({
      event: enabled ? 'module_enabled_for_tenant' : 'module_disabled_for_tenant',
      moduleCode, tenantId, by: (req as any).user?.id,
    });

    // F04: Invalidate permission cache immediately when modules change
    PermissionService.clearAllCache();

    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to update tenant module', 500);
  }
});

export default router;
