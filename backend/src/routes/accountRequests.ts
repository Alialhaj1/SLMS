import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();

// GET /api/account-requests
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT id, company_name, company_name_ar, company_code, admin_name, admin_email,
              status, review_notes, rejection_reason,
              created_at, reviewed_at, reviewed_by
       FROM tenant_requests
       WHERE deleted_at IS NULL`;
    const params: any[] = [];
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error('Error fetching account requests:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch account requests' });
  }
});

// PUT /api/account-requests/:id/approve
router.put('/:id/approve', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    await pool.query(
      `UPDATE tenant_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`,
      [userId, id]
    );
    res.json({ success: true, message: 'Request approved' });
  } catch (err: any) {
    console.error('Error approving account request:', err);
    res.status(500).json({ success: false, error: 'Failed to approve request' });
  }
});

// PUT /api/account-requests/:id/reject
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { reason } = req.body || {};
    await pool.query(
      `UPDATE tenant_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW() WHERE id = $3 AND deleted_at IS NULL`,
      [userId, reason || null, id]
    );
    res.json({ success: true, message: 'Request rejected' });
  } catch (err: any) {
    console.error('Error rejecting account request:', err);
    res.status(500).json({ success: false, error: 'Failed to reject request' });
  }
});

export default router;
