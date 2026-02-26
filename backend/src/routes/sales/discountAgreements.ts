/**
 * Sales Discount Agreements Route
 * CRUD for discount agreements with customers.
 */
import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';

const router = Router();

// GET /api/sales/discount-agreements
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM discount_agreements 
       WHERE company_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [companyId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM discount_agreements WHERE company_id = $1 AND deleted_at IS NULL',
      [companyId]
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error: any) {
    // Table may not exist yet
    if (error.code === '42P01') {
      return res.json({ success: true, data: [], total: 0, page: 1, limit: 25 });
    }
    console.error('Discount agreements list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch discount agreements' });
  }
});

// GET /api/sales/discount-agreements/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM discount_agreements WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '42P01') {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch discount agreement' });
  }
});

export default router;
