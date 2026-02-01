/**
 * INVENTORY WAREHOUSES API
 * Warehouse management
 * Routes: GET /api/inventory/warehouses
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * @route   GET /api/inventory/warehouses
 * @desc    Get all warehouses for company
 * @access  Private (authenticated users)
 */
router.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { is_active, warehouse_type_code } = req.query;

      let query = `
        SELECT 
          w.id,
          w.code,
          w.name,
          w.name_ar,
          w.address,
          w.warehouse_type,
          w.is_active,
          w.company_id
        FROM warehouses w
        WHERE w.company_id = $1 AND w.deleted_at IS NULL
      `;
      const params: any[] = [companyId];
      let paramCount = 2;

      if (is_active !== undefined) {
        query += ` AND w.is_active = $${paramCount}`;
        params.push(String(is_active) === 'true');
        paramCount++;
      }

      if (warehouse_type_code) {
        query += ` AND w.warehouse_type = $${paramCount}`;
        params.push(warehouse_type_code);
        paramCount++;
      }

      query += ` ORDER BY w.code ASC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      return res.status(500).json({ error: 'Failed to fetch warehouses' });
    }
  }
);

export default router;
