/**
 * FINANCE CURRENCIES API
 * Company-specific currency management
 * Routes: GET /api/finance/currencies
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * @route   GET /api/finance/currencies
 * @desc    Get all active currencies for company
 * @access  Private (currencies:view)
 */
router.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { is_active, is_base_currency } = req.query;

      let query = `
        SELECT 
          id,
          code,
          name,
          name_ar,
          symbol,
          decimal_places,
          is_active,
          is_base_currency,
          company_id
        FROM currencies
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

      if (is_base_currency !== undefined) {
        query += ` AND is_base_currency = $${paramCount}`;
        params.push(String(is_base_currency) === 'true');
        paramCount++;
      }

      query += ` ORDER BY is_base_currency DESC, code ASC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Error fetching currencies:', error);
      return res.status(500).json({ error: 'Failed to fetch currencies' });
    }
  }
);

export default router;
