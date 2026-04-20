import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();

// GET / - List impersonation logs with pagination and filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = '1', limit = '25', from, to } = req.query as Record<string, string>;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));

    let whereClause = 'WHERE il.deleted_at IS NULL';
    const params: any[] = [];
    let idx = 1;

    if (from) {
      whereClause += ` AND il.started_at >= $${idx++}`;
      params.push(from);
    }
    if (to) {
      whereClause += ` AND il.started_at <= $${idx++}`;
      params.push(to);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM impersonation_logs il ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT il.id, il.reason,
              il.started_at as start_time, il.ended_at as end_time,
              il.ip_address, il.operations_count,
              EXTRACT(EPOCH FROM (COALESCE(il.ended_at, NOW()) - il.started_at))::int as duration_seconds,
              admin_u.full_name as admin_name, admin_u.email as admin_email,
              target_u.full_name as target_user_name, target_u.email as target_user_email,
              COALESCE(t.name, 'N/A') as target_tenant
       FROM impersonation_logs il
       LEFT JOIN users admin_u ON admin_u.id = il.super_admin_id
       LEFT JOIN users target_u ON target_u.id = il.target_user_id
       LEFT JOIN tenants t ON t.id = il.tenant_id
       ${whereClause}
       ORDER BY il.started_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, safeLimit, offset]
    );

    res.json({ success: true, data: result.rows, total });
  } catch (err: any) {
    console.error('Error fetching impersonation logs:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch impersonation logs' });
  }
});

export default router;
