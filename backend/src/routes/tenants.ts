import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../db';

const router = Router();

// GET /api/tenants - List tenants
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 25, offset = 0, sort = 'created_at', order = 'desc' } = req.query;
    const result = await pool.query(
      `SELECT * FROM tenants WHERE deleted_at IS NULL ORDER BY ${sort === 'created_at' ? 'created_at' : 'id'} ${order === 'asc' ? 'ASC' : 'DESC'} LIMIT $1 OFFSET $2`,
      [Number(limit), Number(offset)]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL');
    sendSuccess(res, { data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch tenants', 500);
  }
});

// GET /api/tenants/stats - Tenant statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL');
    const active = await pool.query("SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL AND status = 'active'");
    sendSuccess(res, { 
      total: parseInt(total.rows[0].count), 
      active: parseInt(active.rows[0].count),
      suspended: 0,
      trial: 0
    });
  } catch (err) {
    sendSuccess(res, { total: 0, active: 0, suspended: 0, trial: 0 });
  }
});

export default router;
