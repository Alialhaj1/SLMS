/**
 * COUNTRIES API
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
  requirePermission('master:countries:view'),
  async (req: Request, res: Response) => {
    try {
      const { search, is_active } = req.query;

      let query = `SELECT * FROM countries WHERE deleted_at IS NULL`;
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      query += ` ORDER BY name`;

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows, total: result.rowCount });
    } catch (error: any) {
      console.error('Error fetching countries:', error);
      res.status(500).json({ error: 'Failed to fetch countries' });
    }
  }
);

router.get(
  '/:id',
  requirePermission('master:countries:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Country not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching country:', error);
      res.status(500).json({ error: 'Failed to fetch country' });
    }
  }
);

router.post(
  '/',
  requirePermission('master:countries:create'),
  async (req: Request, res: Response) => {
    try {
      const { code, name, name_ar, phone_code, is_active = true } = req.body;

      if (!code || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const duplicateCheck = await pool.query(
        'SELECT id FROM countries WHERE code = $1 AND deleted_at IS NULL',
        [code]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Country code already exists' });
      }

      const result = await pool.query(
        `INSERT INTO countries (code, name, name_ar, phone_code, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [code.toUpperCase(), name, name_ar || null, phone_code || null, is_active]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Country created successfully' });
    } catch (error: any) {
      console.error('Error creating country:', error);
      res.status(500).json({ error: 'Failed to create country' });
    }
  }
);

router.put(
  '/:id',
  requirePermission('master:countries:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, name_ar, phone_code, is_active } = req.body;

      const existingCountry = await pool.query(
        'SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existingCountry.rows.length === 0) {
        return res.status(404).json({ error: 'Country not found' });
      }

      const result = await pool.query(
        `UPDATE countries 
         SET 
           name = COALESCE($1, name),
           name_ar = COALESCE($2, name_ar),
           phone_code = COALESCE($3, phone_code),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND deleted_at IS NULL
         RETURNING *`,
        [name, name_ar, phone_code, is_active, id]
      );

      res.json({ success: true, data: result.rows[0], message: 'Country updated successfully' });
    } catch (error: any) {
      console.error('Error updating country:', error);
      res.status(500).json({ error: 'Failed to update country' });
    }
  }
);

router.delete(
  '/:id',
  requirePermission('master:countries:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingCountry = await pool.query(
        'SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existingCountry.rows.length === 0) {
        return res.status(404).json({ error: 'Country not found' });
      }

      await pool.query(
        `UPDATE countries SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      res.json({ success: true, message: 'Country deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting country:', error);
      res.status(500).json({ error: 'Failed to delete country' });
    }
  }
);

router.post(
  '/:id/restore',
  requirePermission('master:countries:create'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE countries 
         SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Country not found or already active' });
      }

      res.json({ success: true, data: result.rows[0], message: 'Country restored successfully' });
    } catch (error: any) {
      console.error('Error restoring country:', error);
      res.status(500).json({ error: 'Failed to restore country' });
    }
  }
);

export default router;
