/**
 * EXPENSE TYPES API
 * Master data for expense types (freight/customs/insurance)
 * Routes: GET /api/procurement/expense-types
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * @route   GET /api/procurement/expense-types
 * @desc    Get all expense types for company
 * @access  Private (authenticated users)
 * @query   is_active: boolean
 * @query   category: string (logistics/customs/insurance)
 */
router.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { is_active, category } = req.query;

      let query = `
        SELECT 
          id,
          code,
          name,
          name_ar,
          description,
          description_ar,
          distribution_base,
          affects_landed_cost,
          is_taxable,
          category,
          color,
          is_active
        FROM expense_types
        WHERE (company_id = $1 OR company_id IS NULL)
          AND deleted_at IS NULL
      `;
      const params: any[] = [companyId];
      let paramCount = 2;

      if (is_active !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        params.push(String(is_active) === 'true');
        paramCount++;
      }

      if (category) {
        query += ` AND category = $${paramCount}`;
        params.push(category);
        paramCount++;
      }

      query += ` ORDER BY sort_order ASC, name ASC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Error fetching expense types:', error);
      return res.status(500).json({ error: 'Failed to fetch expense types' });
    }
  }
);

export default router;
