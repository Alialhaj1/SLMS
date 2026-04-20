/**
 * ============================================================================
 * Company Settings Routes — §6.7 Account Settings
 * ============================================================================
 *
 * Manages company-level settings (key/value store):
 *   - Appearance (logo, colors, branding)
 *   - Locale (language, timezone, date format, currency)
 *   - Notifications (email digest, alert channels)
 *   - General preferences
 *
 * Uses the existing `company_settings` table (migration 101).
 * Tenant isolation via company_id → companies.tenant_id.
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireTenantUser } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';
import { auditLog } from '../middleware/auditLog';
import { sendSuccess, sendError } from '../utils/response';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { logger } from '../utils/logger';

const router = Router();

// ────────────────────────────────────────────
// Validation schemas
// ────────────────────────────────────────────
const settingSchema = z.object({
  config_key: z.string().min(1).max(100),
  config_value: z.string().max(5000).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  description_ar: z.string().max(500).optional().nullable(),
});

const bulkSettingsSchema = z.object({
  settings: z.array(settingSchema).min(1).max(50),
});

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
async function verifyCompanyOwnership(companyId: number, tenantId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM companies WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [companyId, tenantId]
  );
  return result.rows.length > 0;
}

function getCompanyId(req: Request): number | null {
  return (req as any).companyId || (req as any).user?.company_id || (req as any).user?.companyId || null;
}

// ────────────────────────────────────────────
// GET /api/company-settings
// Get all settings for current company
// ────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireTenantUser,
  requirePermission('company_settings:view'),
  loadCompanyContext,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const companyId = getCompanyId(req);
      if (!tenantId || !companyId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Tenant and company context required', 400);
      }

      // Verify company belongs to tenant
      if (!(await verifyCompanyOwnership(companyId, tenantId))) {
        return sendError(res, 'FORBIDDEN', 'Company does not belong to this tenant', 403);
      }

      const { category } = req.query;

      let query = `SELECT id, company_id, config_key, config_value, description, description_ar, created_at, updated_at
                    FROM company_settings
                    WHERE company_id = $1 AND deleted_at IS NULL`;
      const params: any[] = [companyId];

      if (category) {
        params.push(`${category}.%`);
        query += ` AND config_key LIKE $${params.length}`;
      }

      query += ' ORDER BY config_key ASC';

      const result = await pool.query(query, params);

      // Group settings by category (prefix before first dot)
      const grouped: Record<string, any[]> = {};
      for (const row of result.rows) {
        const cat = row.config_key.split('.')[0] || 'general';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
          id: row.id,
          key: row.config_key,
          value: row.config_value,
          description: row.description,
          descriptionAr: row.description_ar,
          updatedAt: row.updated_at,
        });
      }

      return sendSuccess(res, {
        companyId,
        settings: result.rows,
        grouped,
        total: result.rows.length,
      });
    } catch (error) {
      logger.error('Error fetching company settings:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch company settings', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/company-settings/:key
// Get single setting by key
// ────────────────────────────────────────────
router.get(
  '/:key',
  authenticate,
  requireTenantUser,
  requirePermission('company_settings:view'),
  loadCompanyContext,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const companyId = getCompanyId(req);
      if (!tenantId || !companyId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Tenant and company context required', 400);
      }

      if (!(await verifyCompanyOwnership(companyId, tenantId))) {
        return sendError(res, 'FORBIDDEN', 'Company does not belong to this tenant', 403);
      }

      const result = await pool.query(
        `SELECT id, company_id, config_key, config_value, description, description_ar, created_at, updated_at
         FROM company_settings
         WHERE company_id = $1 AND config_key = $2 AND deleted_at IS NULL`,
        [companyId, req.params.key]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'SETTING_NOT_FOUND', `Setting '${req.params.key}' not found`, 404);
      }

      return sendSuccess(res, result.rows[0]);
    } catch (error) {
      logger.error('Error fetching company setting:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch setting', 500);
    }
  }
);

// ────────────────────────────────────────────
// PUT /api/company-settings
// Bulk upsert settings
// ────────────────────────────────────────────
router.put(
  '/',
  authenticate,
  requireTenantUser,
  requirePermission('company_settings:edit'),
  loadCompanyContext,
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const companyId = getCompanyId(req);
      if (!tenantId || !companyId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Tenant and company context required', 400);
      }

      if (!(await verifyCompanyOwnership(companyId, tenantId))) {
        return sendError(res, 'FORBIDDEN', 'Company does not belong to this tenant', 403);
      }

      const parsed = bulkSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid settings data', 400, parsed.error.issues);
      }

      const { settings } = parsed.data;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const results: any[] = [];
        for (const setting of settings) {
          const result = await client.query(
            `INSERT INTO company_settings (company_id, config_key, config_value, description, description_ar, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (company_id, config_key) WHERE deleted_at IS NULL
             DO UPDATE SET
               config_value = EXCLUDED.config_value,
               description = COALESCE(EXCLUDED.description, company_settings.description),
               description_ar = COALESCE(EXCLUDED.description_ar, company_settings.description_ar),
               updated_at = NOW()
             RETURNING id, config_key, config_value`,
            [companyId, setting.config_key, setting.config_value, setting.description, setting.description_ar]
          );
          results.push(result.rows[0]);
        }

        await client.query('COMMIT');

        return sendSuccess(res, { updated: results.length, settings: results }, 200, undefined, 'Settings updated');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error updating company settings:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to update settings', 500);
    }
  }
);

// ────────────────────────────────────────────
// PUT /api/company-settings/:key
// Upsert single setting
// ────────────────────────────────────────────
router.put(
  '/:key',
  authenticate,
  requireTenantUser,
  requirePermission('company_settings:edit'),
  loadCompanyContext,
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const companyId = getCompanyId(req);
      if (!tenantId || !companyId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Tenant and company context required', 400);
      }

      if (!(await verifyCompanyOwnership(companyId, tenantId))) {
        return sendError(res, 'FORBIDDEN', 'Company does not belong to this tenant', 403);
      }

      const { value, description, description_ar } = req.body;
      if (value === undefined) {
        return sendError(res, 'VALIDATION_ERROR', 'value is required', 400);
      }

      const result = await pool.query(
        `INSERT INTO company_settings (company_id, config_key, config_value, description, description_ar, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (company_id, config_key) WHERE deleted_at IS NULL
         DO UPDATE SET
           config_value = EXCLUDED.config_value,
           description = COALESCE(EXCLUDED.description, company_settings.description),
           description_ar = COALESCE(EXCLUDED.description_ar, company_settings.description_ar),
           updated_at = NOW()
         RETURNING *`,
        [companyId, req.params.key, value, description, description_ar]
      );

      return sendSuccess(res, result.rows[0], 200, undefined, 'Setting updated');
    } catch (error) {
      logger.error('Error updating company setting:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to update setting', 500);
    }
  }
);

// ────────────────────────────────────────────
// DELETE /api/company-settings/:key
// Soft-delete (reset) a company setting
// ────────────────────────────────────────────
router.delete(
  '/:key',
  authenticate,
  requireTenantUser,
  requirePermission('company_settings:edit'),
  loadCompanyContext,
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const companyId = getCompanyId(req);
      if (!tenantId || !companyId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Tenant and company context required', 400);
      }

      if (!(await verifyCompanyOwnership(companyId, tenantId))) {
        return sendError(res, 'FORBIDDEN', 'Company does not belong to this tenant', 403);
      }

      const result = await pool.query(
        `UPDATE company_settings
         SET deleted_at = NOW()
         WHERE company_id = $1 AND config_key = $2 AND deleted_at IS NULL
         RETURNING id, config_key`,
        [companyId, req.params.key]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'SETTING_NOT_FOUND', `Setting '${req.params.key}' not found`, 404);
      }

      return sendSuccess(res, result.rows[0], 200, undefined, 'Setting deleted');
    } catch (error) {
      logger.error('Error deleting company setting:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to delete setting', 500);
    }
  }
);

export default router;
