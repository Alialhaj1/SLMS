import { Router } from 'express';
import { sendSuccess } from '../utils/response';
import pool from '../db';

const router = Router();

// GET /api/tenants/public - Public tenant list for login page
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, slug, logo_url FROM tenants WHERE deleted_at IS NULL AND status = 'active' ORDER BY name"
    );
    sendSuccess(res, { data: result.rows });
  } catch {
    sendSuccess(res, { data: [] });
  }
});

export default router;
