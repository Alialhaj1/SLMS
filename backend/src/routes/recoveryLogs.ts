import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();
router.use(authenticate, loadCompanyContext);

// GET /api/recovery-logs - List recovery/restore audit logs
// Derived from deleted_records where restored_at IS NOT NULL
router.get('/', requirePermission('deleted_records:read'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT dr.id,
             dr.restored_at AS timestamp,
             COALESCE(u.full_name, u.email, 'System') AS "adminName",
             dr.table_name AS "resourceType",
             dr.record_id AS "recordId",
             'restored' AS action
      FROM deleted_records dr
      LEFT JOIN users u ON u.id = dr.restored_by
      WHERE dr.restored_at IS NOT NULL
      ORDER BY dr.restored_at DESC
      LIMIT 200
    `);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching recovery logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recovery logs' });
  }
});

export default router;
