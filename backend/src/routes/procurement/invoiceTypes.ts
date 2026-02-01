/**
 * INVOICE TYPES API
 * Master data for invoice types (local/import/service/expense)
 * Routes: GET /api/procurement/invoice-types
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * @route   GET /api/procurement/invoice-types
 * @desc    Get all invoice types for company
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
          description,
          description_ar,
          affects_inventory,
          requires_customs,
          requires_goods_receipt,
          allows_services,
          requires_warehouse,
          requires_approval,
          color,
          icon,
          is_active,
          is_default
        FROM invoice_types
        WHERE (company_id = $1 OR company_id IS NULL)
          AND deleted_at IS NULL
      `;
      const params: any[] = [companyId];

      if (is_active !== undefined) {
        query += ` AND is_active = $2`;
        params.push(String(is_active) === 'true');
      }

      query += ` ORDER BY sort_order ASC, name ASC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Error fetching invoice types:', error);
      return res.status(500).json({ error: 'Failed to fetch invoice types' });
    }
  }
);

export default router;
