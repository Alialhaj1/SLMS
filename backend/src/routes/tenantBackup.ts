/**
 * ============================================================================
 * Tenant Backup Routes — §6.7 Data Backup Management
 * ============================================================================
 *
 * Provides:
 *   - List backup history for tenant
 *   - Request a new backup
 *   - View backup status/details
 *   - Cancel a pending backup
 *
 * Uses the `tenant_backups` table (migration 407).
 * Actual backup execution is queued and handled by a background worker.
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireTenantUser } from '../middleware/rbac';
import { auditLog } from '../middleware/auditLog';
import { sendSuccess, sendError } from '../utils/response';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { logger } from '../utils/logger';

const router = Router();

// Maximum pending backups per tenant
const MAX_PENDING_BACKUPS = 3;

// ────────────────────────────────────────────
// GET /api/tenant-backup
// List backup history
// ────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_backup:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let whereClause = 'WHERE tb.tenant_id = $1';
      const params: any[] = [tenantId];

      if (status) {
        params.push(status);
        whereClause += ` AND tb.status = $${params.length}`;
      }

      const [countResult, dataResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS total FROM tenant_backups tb ${whereClause}`,
          params
        ),
        pool.query(
          `SELECT
             tb.id,
             tb.backup_type,
             tb.status,
             tb.file_size_bytes,
             tb.tables_included,
             tb.started_at,
             tb.completed_at,
             tb.expires_at,
             tb.error_message,
             tb.metadata,
             tb.created_at,
             u.full_name AS requested_by_name,
             u.email AS requested_by_email
           FROM tenant_backups tb
           LEFT JOIN users u ON u.id = tb.requested_by
           ${whereClause}
           ORDER BY tb.created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset]
        ),
      ]);

      const total = parseInt(countResult.rows[0]?.total || '0');

      return sendSuccess(res, dataResult.rows, 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      logger.error('Error fetching backup history:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch backup history', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant-backup/:id
// Get backup detail/status
// ────────────────────────────────────────────
router.get(
  '/:id',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_backup:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const backupId = parseInt(req.params.id);
      if (isNaN(backupId)) {
        return sendError(res, 'INVALID_ID', 'Invalid backup ID', 400);
      }

      const result = await pool.query(
        `SELECT
           tb.*,
           u.full_name AS requested_by_name,
           u.email AS requested_by_email
         FROM tenant_backups tb
         LEFT JOIN users u ON u.id = tb.requested_by
         WHERE tb.id = $1 AND tb.tenant_id = $2`,
        [backupId, tenantId]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'BACKUP_NOT_FOUND', 'Backup not found', 404);
      }

      return sendSuccess(res, result.rows[0]);
    } catch (error) {
      logger.error('Error fetching backup detail:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch backup', 500);
    }
  }
);

// ────────────────────────────────────────────
// POST /api/tenant-backup/request
// Request a new backup
// ────────────────────────────────────────────
router.post(
  '/request',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_backup:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      const userId = (req as any).user?.id;
      if (!tenantId || !userId) {
        return sendError(res, 'CONTEXT_REQUIRED', 'Authentication context required', 400);
      }

      // Check for too many pending backups
      const pendingCount = await pool.query(
        `SELECT COUNT(*) AS count FROM tenant_backups
         WHERE tenant_id = $1 AND status IN ('pending', 'in_progress')`,
        [tenantId]
      );

      if (parseInt(pendingCount.rows[0]?.count || '0') >= MAX_PENDING_BACKUPS) {
        return sendError(
          res,
          'BACKUP_LIMIT_REACHED',
          `Maximum ${MAX_PENDING_BACKUPS} pending backups allowed. Please wait for existing backups to complete.`,
          429
        );
      }

      const { backup_type = 'full', tables_included, metadata = {} } = req.body;

      // Validate backup_type
      if (!['full', 'partial', 'schema_only'].includes(backup_type)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid backup type', 400);
      }

      // If partial, tables_included is required
      if (backup_type === 'partial' && (!tables_included || !Array.isArray(tables_included) || tables_included.length === 0)) {
        return sendError(res, 'VALIDATION_ERROR', 'tables_included required for partial backup', 400);
      }

      // Set expiry to 30 days from now
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const result = await pool.query(
        `INSERT INTO tenant_backups (tenant_id, requested_by, backup_type, status, tables_included, expires_at, metadata)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6)
         RETURNING *`,
        [tenantId, userId, backup_type, tables_included || null, expiresAt, JSON.stringify(metadata)]
      );

      logger.info(`Backup requested: tenant=${tenantId}, type=${backup_type}, id=${result.rows[0].id}`);

      return sendSuccess(res, result.rows[0], 201, undefined, 'Backup request created. Processing will begin shortly.');
    } catch (error) {
      logger.error('Error creating backup request:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to create backup request', 500);
    }
  }
);

// ────────────────────────────────────────────
// DELETE /api/tenant-backup/:id
// Cancel a pending backup
// ────────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_backup:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const backupId = parseInt(req.params.id);
      if (isNaN(backupId)) {
        return sendError(res, 'INVALID_ID', 'Invalid backup ID', 400);
      }

      // Only pending backups can be cancelled
      const result = await pool.query(
        `UPDATE tenant_backups
         SET status = 'failed', error_message = 'Cancelled by user', updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
         RETURNING id, status`,
        [backupId, tenantId]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'CANNOT_CANCEL', 'Backup not found or cannot be cancelled (only pending backups can be cancelled)', 400);
      }

      return sendSuccess(res, result.rows[0], 200, undefined, 'Backup cancelled');
    } catch (error) {
      logger.error('Error cancelling backup:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to cancel backup', 500);
    }
  }
);

// ────────────────────────────────────────────
// GET /api/tenant-backup/stats
// Backup statistics
// ────────────────────────────────────────────
router.get(
  '/stats',
  authenticate,
  requireTenantUser,
  requirePermission('tenant_backup:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getIsolatedTenantId(req as any);
      if (!tenantId) {
        return sendError(res, 'TENANT_REQUIRED', 'Tenant context required', 400);
      }

      const result = await pool.query(
        `SELECT
           COUNT(*) AS total_backups,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed,
           COUNT(*) FILTER (WHERE status = 'pending') AS pending,
           COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
           COUNT(*) FILTER (WHERE status = 'failed') AS failed,
           SUM(file_size_bytes) FILTER (WHERE status = 'completed') AS total_size_bytes,
           MAX(completed_at) FILTER (WHERE status = 'completed') AS last_completed_at
         FROM tenant_backups
         WHERE tenant_id = $1`,
        [tenantId]
      );

      const stats = result.rows[0];

      return sendSuccess(res, {
        totalBackups: parseInt(stats?.total_backups || '0'),
        completed: parseInt(stats?.completed || '0'),
        pending: parseInt(stats?.pending || '0'),
        inProgress: parseInt(stats?.in_progress || '0'),
        failed: parseInt(stats?.failed || '0'),
        totalSizeBytes: parseInt(stats?.total_size_bytes || '0'),
        lastCompletedAt: stats?.last_completed_at,
      });
    } catch (error) {
      logger.error('Error fetching backup stats:', error);
      return sendError(res, 'INTERNAL_ERROR', 'Failed to fetch backup stats', 500);
    }
  }
);

export default router;
