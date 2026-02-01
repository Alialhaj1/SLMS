/**
 * PAYMENT TERMS API
 * Master data for payment terms (Net 30, Due on Receipt, etc.)
 * Routes: GET /api/finance/payment-terms
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * @route   GET /api/finance/payment-terms
 * @desc    Get all payment terms for company
 * @access  Private (authenticated users)
 * @query   is_active: boolean
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
          days AS due_days,
          discount_days,
          discount_percent,
          description,
          description_ar,
          is_active,
          is_default
        FROM payment_terms
        WHERE (company_id = $1 OR company_id IS NULL)
          AND deleted_at IS NULL
      `;
      const params: any[] = [companyId];

      if (is_active !== undefined) {
        query += ` AND is_active = $2`;
        params.push(String(is_active) === 'true');
      }

      query += ` ORDER BY due_days ASC, name ASC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Error fetching payment terms:', error);
      return res.status(500).json({ error: 'Failed to fetch payment terms' });
    }
  }
);

export default router;
