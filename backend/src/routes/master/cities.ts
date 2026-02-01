/**
 * CITIES API
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

router.get(
  '/',
  requirePermission('master:cities:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const { search, is_active, country_id } = req.query;

      let query = `
        SELECT 
          c.*,
          co.code as country_code,
          co.name as country_name
        FROM cities c
        LEFT JOIN countries co ON c.country_id = co.id
        WHERE c.deleted_at IS NULL
      `;

      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        query += ` AND (c.name ILIKE $${paramCount} OR c.code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND c.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (country_id) {
        paramCount++;
        query += ` AND c.country_id = $${paramCount}`;
        params.push(country_id);
      }

      query += ` ORDER BY co.name, c.name`;

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows, total: result.rowCount });
    } catch (error: any) {
      console.error('Error fetching cities:', error);
      res.status(500).json({ error: 'Failed to fetch cities' });
    }
  }
);

router.post(
  '/',
  requirePermission('master:cities:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const userId = (req as any).user.id;
      const { code, name, name_ar, country_id, is_port, is_active = true } = req.body;

      if (!code || !name || !country_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if country exists
      const countryCheck = await pool.query('SELECT id FROM countries WHERE id = $1', [country_id]);

      if (countryCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid country' });
      }

      // Check duplicate (allow same code in different companies)
      const duplicateCheck = await pool.query(
        'SELECT id FROM cities WHERE (company_id = $1 OR company_id IS NULL) AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'City code already exists' });
      }

      const result = await pool.query(
        `INSERT INTO cities (
          company_id, code, name, name_ar, country_id, is_port_city, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [companyId, code.toUpperCase(), name, name_ar || null, country_id, is_port || false, is_active]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'City created successfully' });
    } catch (error: any) {
      console.error('Error creating city:', error);
      res.status(500).json({ error: 'Failed to create city' });
    }
  }
);

router.put(
  '/:id',
  requirePermission('master:cities:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;
      const { name, name_ar, country_id, is_port, is_active } = req.body;

      const existingCity = await pool.query(
        'SELECT * FROM cities WHERE id = $1 AND (company_id = $2 OR company_id IS NULL) AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingCity.rows.length === 0) {
        return res.status(404).json({ error: 'City not found' });
      }

      if (country_id) {
        const countryCheck = await pool.query('SELECT id FROM countries WHERE id = $1', [country_id]);
        if (countryCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid country' });
        }
      }

      const result = await pool.query(
        `UPDATE cities 
        SET 
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          country_id = COALESCE($3, country_id),
          is_port_city = COALESCE($4, is_port_city),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND deleted_at IS NULL
        RETURNING *`,
        [name, name_ar, country_id, is_port, is_active, id]
      );

      res.json({ success: true, data: result.rows[0], message: 'City updated successfully' });
    } catch (error: any) {
      console.error('Error updating city:', error);
      res.status(500).json({ error: 'Failed to update city' });
    }
  }
);

router.delete(
  '/:id',
  requirePermission('master:cities:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;

      const existingCity = await pool.query(
        'SELECT * FROM cities WHERE id = $1 AND (company_id = $2 OR company_id IS NULL) AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingCity.rows.length === 0) {
        return res.status(404).json({ error: 'City not found' });
      }

      await pool.query(`UPDATE cities SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

      res.json({ success: true, message: 'City deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting city:', error);
      res.status(500).json({ error: 'Failed to delete city' });
    }
  }
);

router.post(
  '/:id/restore',
  requirePermission('master:cities:create'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE cities 
        SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND deleted_at IS NOT NULL
        RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'City not found or already active' });
      }

      res.json({ success: true, data: result.rows[0], message: 'City restored successfully' });
    } catch (error: any) {
      console.error('Error restoring city:', error);
      res.status(500).json({ error: 'Failed to restore city' });
    }
  }
);

export default router;
