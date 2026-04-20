import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();
router.use(authenticate, loadCompanyContext);

// GET /api/deleted-records - List soft-deleted records
router.get('/', requirePermission('deleted_records:read'), async (req: Request, res: Response) => {
  try {
    const { resourceType } = req.query;
    let query = `
      SELECT dr.id, dr.table_name AS "resourceType", dr.record_id AS "recordId",
             COALESCE(dr.reason, dr.table_name || ' #' || dr.record_id) AS name,
             COALESCE(u.full_name, u.email, 'Unknown') AS "deletedBy",
             dr.deleted_at AS "deletedAt"
      FROM deleted_records dr
      LEFT JOIN users u ON u.id = dr.deleted_by
      WHERE dr.restored_at IS NULL
    `;
    const params: any[] = [];

    if (resourceType && resourceType !== 'All') {
      params.push(resourceType);
      query += ` AND dr.table_name = $${params.length}`;
    }

    query += ' ORDER BY dr.deleted_at DESC LIMIT 200';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching deleted records:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch deleted records' });
  }
});

// POST /api/deleted-records/:id/restore - Restore a soft-deleted record
router.post('/:id/restore', requirePermission('deleted_records:restore'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const record = await pool.query(
      'SELECT * FROM deleted_records WHERE id = $1 AND restored_at IS NULL',
      [id]
    );

    if (record.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Deleted record not found or already restored' });
    }

    await pool.query(
      'UPDATE deleted_records SET restored_at = NOW(), restored_by = $1 WHERE id = $2',
      [userId, id]
    );

    res.json({ success: true, message: 'Record restored successfully' });
  } catch (error: any) {
    console.error('Error restoring record:', error);
    res.status(500).json({ success: false, message: 'Failed to restore record' });
  }
});

export default router;
