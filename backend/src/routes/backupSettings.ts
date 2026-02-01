import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { getPaginationParams, sendPaginated } from '../utils/response';
import { z } from 'zod';

const router = Router();

const backupSettingsSchema = z.object({
  storage_type: z.enum(['local', 's3', 'azure']).default('local'),
  storage_path: z.string().max(2000).optional().nullable(),
  schedule_cron: z.string().max(100).optional().nullable(),
  retention_days: z.number().int().min(1).max(3650).default(30),
  is_enabled: z.boolean().default(false),
});

/**
 * GET /api/backup-settings
 * List backup settings (per-company)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('backup_settings:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { page, limit, offset } = getPaginationParams(req.query);

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM backup_settings
         WHERE company_id = $1 AND deleted_at IS NULL`,
        [companyId]
      );
      const total = countResult.rows[0]?.total ?? 0;

      const result = await pool.query(
        `SELECT id, company_id, storage_type, storage_path, schedule_cron, retention_days,
                is_enabled, last_run_at, last_status, last_error,
                created_at, updated_at
         FROM backup_settings
         WHERE company_id = $1 AND deleted_at IS NULL
         ORDER BY updated_at DESC
         LIMIT $2 OFFSET $3`,
        [companyId, limit, offset]
      );

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Failed to fetch backup settings:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch backup settings' } });
    }
  }
);

/**
 * GET /api/backup-settings/:id
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('backup_settings:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const result = await pool.query(
        `SELECT id, company_id, storage_type, storage_path, schedule_cron, retention_days,
                is_enabled, last_run_at, last_status, last_error,
                created_at, updated_at
         FROM backup_settings
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Backup settings not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Failed to fetch backup settings:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch backup settings' } });
    }
  }
);

/**
 * POST /api/backup-settings
 * Uses backup_settings:edit for create
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('backup_settings:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const userId = req.user!.id;
      const payload = backupSettingsSchema.parse(req.body);

      const insert = await pool.query(
        `INSERT INTO backup_settings (
          company_id, storage_type, storage_path, schedule_cron, retention_days, is_enabled,
          created_by, updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id, company_id, storage_type, storage_path, schedule_cron, retention_days,
                  is_enabled, last_run_at, last_status, last_error, created_at, updated_at`,
        [
          companyId,
          payload.storage_type,
          payload.storage_path ?? null,
          payload.schedule_cron ?? null,
          payload.retention_days,
          payload.is_enabled,
          userId,
          userId,
        ]
      );

      (req as any).auditContext = {
        action: 'create',
        resource: 'backup_settings',
        resourceId: insert.rows[0].id,
        after: insert.rows[0],
      };

      return res.status(201).json({ success: true, data: insert.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      console.error('Failed to create backup settings:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create backup settings' } });
    }
  }
);

/**
 * PUT /api/backup-settings/:id
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('backup_settings:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const userId = req.user!.id;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'backup_settings', id);

      const payload = backupSettingsSchema.partial().parse(req.body);

      const result = await pool.query(
        `UPDATE backup_settings
         SET storage_type = COALESCE($1, storage_type),
             storage_path = COALESCE($2, storage_path),
             schedule_cron = COALESCE($3, schedule_cron),
             retention_days = COALESCE($4, retention_days),
             is_enabled = COALESCE($5, is_enabled),
             updated_by = $6,
             updated_at = NOW()
         WHERE id = $7 AND company_id = $8 AND deleted_at IS NULL
         RETURNING id, company_id, storage_type, storage_path, schedule_cron, retention_days,
                  is_enabled, last_run_at, last_status, last_error, created_at, updated_at`,
        [
          payload.storage_type,
          payload.storage_path,
          payload.schedule_cron,
          payload.retention_days,
          payload.is_enabled,
          userId,
          id,
          companyId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Backup settings not found' } });
      }

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: result.rows[0],
      };

      return res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      console.error('Failed to update backup settings:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update backup settings' } });
    }
  }
);

/**
 * DELETE /api/backup-settings/:id (soft delete)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('backup_settings:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const userId = req.user!.id;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'backup_settings', id);

      const result = await pool.query(
        `UPDATE backup_settings
         SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
         RETURNING id`,
        [userId, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Backup settings not found' } });
      }

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: { deleted: true },
      };

      return res.json({ success: true, message: 'Backup settings deleted' });
    } catch (error: any) {
      console.error('Failed to delete backup settings:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete backup settings' } });
    }
  }
);

/**
 * POST /api/backup-settings/:id/execute
 * Queues a backup run (persistent tracking)
 */
router.post(
  '/:id/execute',
  authenticate,
  loadCompanyContext,
  requirePermission('backup_settings:execute'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const userId = req.user!.id;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const existing = await pool.query(
        `SELECT id FROM backup_settings WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Backup settings not found' } });
      }

      const run = await pool.query(
        `INSERT INTO backup_runs (company_id, backup_settings_id, status, created_by)
         VALUES ($1, $2, 'queued', $3)
         RETURNING id, company_id, backup_settings_id, status, started_at, completed_at, error_message, created_at`,
        [companyId, id, userId]
      );

      await pool.query(
        `UPDATE backup_settings
         SET last_run_at = NOW(), last_status = 'queued', last_error = NULL, updated_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [userId, id]
      );

      (req as any).auditContext = {
        action: 'execute',
        resource: 'backup_settings',
        resourceId: id,
        after: run.rows[0],
      };

      return res.status(202).json({ success: true, data: run.rows[0] });
    } catch (error: any) {
      console.error('Failed to execute backup:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to execute backup' } });
    }
  }
);

/**
 * GET /api/backup-settings/:id/runs
 */
router.get(
  '/:id/runs',
  authenticate,
  loadCompanyContext,
  requirePermission('backup_settings:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const settingsId = parseInt(req.params.id, 10);
      if (Number.isNaN(settingsId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const { page, limit, offset } = getPaginationParams(req.query);

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM backup_runs
         WHERE company_id = $1 AND backup_settings_id = $2`,
        [companyId, settingsId]
      );
      const total = countResult.rows[0]?.total ?? 0;

      const result = await pool.query(
        `SELECT id, company_id, backup_settings_id, status, started_at, completed_at, error_message, created_at
         FROM backup_runs
         WHERE company_id = $1 AND backup_settings_id = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [companyId, settingsId, limit, offset]
      );

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Failed to fetch backup runs:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch backup runs' } });
    }
  }
);

export default router;
