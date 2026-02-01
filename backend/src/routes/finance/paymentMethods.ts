/**
 * FINANCE PAYMENT METHODS API
 * Payment method management (cash, check, bank transfer, etc.)
 * Routes: GET /api/finance/payment-methods
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * @route   GET /api/finance/payment-methods
 * @desc    Get all payment methods for company
 * @access  Private (payment_methods:view)
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
          description,
          description_ar,
          payment_type,
          requires_bank_account,
          requires_bank AS requires_cheque_details,
          is_active,
          company_id
        FROM payment_methods
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

      query += ` ORDER BY code ASC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      return res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  }
);

export default router;
