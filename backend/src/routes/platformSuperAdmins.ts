/**
 * ============================================================
 * Platform Super Admins Routes — Architecture §5.1 #12
 * ============================================================
 *
 * Read-only list of super admin accounts.
 * No modifications allowed from this screen.
 *
 * Access: platform.super_admins.read
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { platformGate } from '../middleware/platformGateway';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// ────────────────────────────────────────────
// GET / — List super admin users (read-only)
// ────────────────────────────────────────────
router.get('/', authenticate, platformGate('platform.super_admins.read'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.status, u.last_login_at, u.created_at,
             COALESCE(
               (SELECT json_agg(r.name) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id),
               '[]'
             ) as roles
      FROM users u
      WHERE u.tenant_id IS NULL
        AND u.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM user_roles ur2
          JOIN roles r2 ON r2.id = ur2.role_id
          WHERE ur2.user_id = u.id AND LOWER(r2.name) = 'super_admin'
        )
      ORDER BY u.created_at ASC
    `);

    sendSuccess(res, {
      data: result.rows.map((u: any) => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        status: u.status,
        roles: u.roles,
        last_login: u.last_login_at,
        created_at: u.created_at,
      })),
      total: result.rowCount,
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to list super admins', 500);
  }
});

export default router;
