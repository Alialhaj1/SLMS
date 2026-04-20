/**
 * ============================================================
 * Platform Audit Routes — Architecture §5.1 #8
 * ============================================================
 *
 * Read-only access to the audit log tables:
 *   - audit_logs (legacy)
 *   - audit.platform_logs (platform actions)
 *   - audit.tenant_logs (cross-tenant visibility)
 *
 * Protected from deletion — no DELETE endpoints.
 *
 * Access: platform.audit.read
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { platformGate } from '../middleware/platformGateway';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// ────────────────────────────────────────────
// GET / — List audit logs (paginated, filterable)
// ────────────────────────────────────────────
router.get('/', authenticate, platformGate('platform.audit.read'), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', action, entity_type, user_id, from, to, search } = req.query as Record<string, string>;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(200, Math.max(1, parseInt(limit)));

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (action) { conditions.push(`al.action = $${idx++}`); params.push(action); }
    if (entity_type) { conditions.push(`al.entity = $${idx++}`); params.push(entity_type); }
    if (user_id) { conditions.push(`al.user_id = $${idx++}`); params.push(parseInt(user_id)); }
    if (from) { conditions.push(`al.created_at >= $${idx++}`); params.push(from); }
    if (to) { conditions.push(`al.created_at <= $${idx++}`); params.push(to); }
    if (search) {
      conditions.push(`(al.action ILIKE $${idx} OR al.entity ILIKE $${idx} OR COALESCE(al.after_data, al.before_data)::text ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT al.id, al.user_id, al.action, al.entity, al.entity_id,
              al.before_data, al.after_data, al.ip_address, al.created_at,
              u.full_name as user_name, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, safeLimit, offset]
    );

    sendSuccess(res, { data: result.rows, total, page: parseInt(page), limit: safeLimit });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch audit logs', 500);
  }
});

// ────────────────────────────────────────────
// GET /stats — Audit log summary statistics
// ────────────────────────────────────────────
router.get('/stats', authenticate, platformGate('platform.audit.read'), async (_req: Request, res: Response) => {
  try {
    const [actionStats, entityStats, recentCount] = await Promise.all([
      pool.query(`SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 20`),
      pool.query(`SELECT entity, COUNT(*) as count FROM audit_logs GROUP BY entity ORDER BY count DESC LIMIT 20`),
      pool.query(`SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours'`),
    ]);

    sendSuccess(res, {
      by_action: actionStats.rows,
      by_entity: entityStats.rows,
      last_24h: parseInt(recentCount.rows[0].count, 10),
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch audit stats', 500);
  }
});

// ────────────────────────────────────────────
// GET /platform — Platform-specific logs (audit.platform_logs)
// ────────────────────────────────────────────
router.get('/platform', authenticate, platformGate('platform.audit.read'), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query as Record<string, string>;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(200, Math.max(1, parseInt(limit)));

    // Try audit.platform_logs, fall back gracefully
    try {
      const countResult = await pool.query(`SELECT COUNT(*) FROM audit.platform_logs`);
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await pool.query(
        `SELECT * FROM audit.platform_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [safeLimit, offset]
      );

      sendSuccess(res, { data: result.rows, total });
    } catch {
      // Table may not exist yet
      sendSuccess(res, { data: [], total: 0, note: 'Platform logs table not yet initialized' });
    }
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch platform logs', 500);
  }
});

export default router;
