/**
 * UNITS API ROUTES
 * ==================================================
 * Manages units of measure with conversion factors
 * 
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

/**
 * GET /api/master/units
 */
router.get(
  '/',
  requirePermission('master:units:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const { search, is_active, unit_type } = req.query;

      let query = `
        SELECT 
          u.*,
          slms_format_sequence(u.numbering_series_id, u.sequence_no) as sequence_display,
          bu.code as base_unit_code,
          bu.name as base_unit_name
        FROM units u
        LEFT JOIN units bu ON u.base_unit_id = bu.id
        WHERE u.company_id = $1 AND u.deleted_at IS NULL
      `;

      const params: any[] = [companyId];
      let paramCount = 1;

      if (search) {
        paramCount++;
        query += ` AND (u.name ILIKE $${paramCount} OR u.code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND u.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (unit_type) {
        paramCount++;
        query += ` AND u.unit_type = $${paramCount}`;
        params.push(unit_type);
      }

      query += ` ORDER BY u.unit_type, u.code`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rowCount,
      });
    } catch (error: any) {
      console.error('Error fetching units:', error);
      res.status(500).json({ error: 'Failed to fetch units' });
    }
  }
);

/**
 * POST /api/master/units
 */
router.post(
  '/',
  requirePermission('master:units:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const userId = (req as any).user.id;
      const {
        code,
        name,
        name_ar,
        unit_type,
        base_unit_id,
        conversion_factor,
        is_base_unit = false,
        is_active = true,
      } = req.body;

      if (!code || !name || !unit_type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!is_base_unit && (!base_unit_id || !conversion_factor)) {
        return res.status(400).json({ error: 'Non-base units require base_unit_id and conversion_factor' });
      }

      if (conversion_factor && conversion_factor <= 0) {
        return res.status(400).json({ error: 'Conversion factor must be positive' });
      }

      // Check duplicate
      const duplicateCheck = await pool.query(
        'SELECT id FROM units WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Unit code already exists' });
      }

      const result = await pool.query(
        `INSERT INTO units (
          company_id, code, name, name_ar, unit_type,
          base_unit_id, conversion_factor, is_base_unit, is_active,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          companyId,
          code.toUpperCase(),
          name,
          name_ar || null,
          unit_type,
          base_unit_id || null,
          conversion_factor || null,
          is_base_unit,
          is_active,
          userId,
          userId,
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Unit created successfully',
      });
    } catch (error: any) {
      console.error('Error creating unit:', error);
      res.status(500).json({ error: 'Failed to create unit' });
    }
  }
);

/**
 * PUT /api/master/units/:id
 */
router.put(
  '/:id',
  requirePermission('master:units:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;
      const userId = (req as any).user.id;
      const {
        name,
        name_ar,
        unit_type,
        base_unit_id,
        conversion_factor,
        is_base_unit,
        is_active,
      } = req.body;

      const existingUnit = await pool.query(
        'SELECT * FROM units WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingUnit.rows.length === 0) {
        return res.status(404).json({ error: 'Unit not found' });
      }

      if (conversion_factor !== undefined && conversion_factor <= 0) {
        return res.status(400).json({ error: 'Conversion factor must be positive' });
      }

      const result = await pool.query(
        `UPDATE units 
        SET 
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          unit_type = COALESCE($3, unit_type),
          base_unit_id = COALESCE($4, base_unit_id),
          conversion_factor = COALESCE($5, conversion_factor),
          is_base_unit = COALESCE($6, is_base_unit),
          is_active = COALESCE($7, is_active),
          updated_by = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 AND company_id = $10 AND deleted_at IS NULL
        RETURNING *`,
        [
          name,
          name_ar,
          unit_type,
          base_unit_id,
          conversion_factor,
          is_base_unit,
          is_active,
          userId,
          id,
          companyId,
        ]
      );

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Unit updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating unit:', error);
      res.status(500).json({ error: 'Failed to update unit' });
    }
  }
);

/**
 * DELETE /api/master/units/:id
 */
router.delete(
  '/:id',
  requirePermission('master:units:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;
      const userId = (req as any).user.id;

      const existingUnit = await pool.query(
        'SELECT * FROM units WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingUnit.rows.length === 0) {
        return res.status(404).json({ error: 'Unit not found' });
      }

      await pool.query(
        `UPDATE units 
        SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1 
        WHERE id = $2 AND company_id = $3`,
        [userId, id, companyId]
      );

      res.json({
        success: true,
        message: 'Unit deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting unit:', error);
      res.status(500).json({ error: 'Failed to delete unit' });
    }
  }
);

/**
 * POST /api/master/units/:id/restore
 */
router.post(
  '/:id/restore',
  requirePermission('master:units:create'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;
      const userId = (req as any).user.id;

      const result = await pool.query(
        `UPDATE units 
        SET deleted_at = NULL, updated_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND company_id = $3 AND deleted_at IS NOT NULL
        RETURNING *`,
        [userId, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Unit not found or already active' });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Unit restored successfully',
      });
    } catch (error: any) {
      console.error('Error restoring unit:', error);
      res.status(500).json({ error: 'Failed to restore unit' });
    }
  }
);

export default router;
