/**
 * FINANCE CASH BOXES API
 * Cash box management for petty cash
 * Routes: GET /api/finance/cash-boxes
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * @route   GET /api/finance/cash-boxes
 * @desc    Get all cash boxes for company
 * @access  Private (cash_boxes:view)
 */
router.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { is_active } = req.query;

      let query = `
        SELECT 
          id,
          code,
          name,
          name_ar,
          currency_id,
          is_active,
          company_id
        FROM cash_boxes
        WHERE company_id = $1 AND deleted_at IS NULL
      `;
      const params: any[] = [companyId];
      let paramCount = 2;

      if (is_active !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        params.push(String(is_active) === 'true');
        paramCount++;
      }

      query += ` ORDER BY code ASC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Error fetching cash boxes:', error);
      return res.status(500).json({ error: 'Failed to fetch cash boxes' });
    }
  }
);

export default router;
