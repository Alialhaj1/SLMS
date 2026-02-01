/**
 * FINANCE BANK ACCOUNTS API
 * Bank account management
 * Routes: GET /api/finance/bank-accounts
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * @route   GET /api/finance/bank-accounts
 * @desc    Get all bank accounts for company
 * @access  Private (bank_accounts:view)
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
          ba.id,
          ba.account_number,
          ba.account_name,
          ba.bank_id,
          b.name AS bank_name,
          ba.currency_id,
          ba.is_active,
          ba.company_id
        FROM bank_accounts ba
        LEFT JOIN banks b ON ba.bank_id = b.id
        WHERE ba.company_id = $1 AND ba.deleted_at IS NULL
      `;
      const params: any[] = [companyId];
      let paramCount = 2;

      if (is_active !== undefined) {
        query += ` AND ba.is_active = $${paramCount}`;
        params.push(String(is_active) === 'true');
        paramCount++;
      }

      query += ` ORDER BY ba.account_number ASC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
  }
);

export default router;
