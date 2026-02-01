import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { loadCompanyContext } from '../../middleware/companyContext';
import { auditLog, captureBeforeState } from '../../middleware/auditLog';
import { z } from 'zod';

const router = Router();

const harvestScheduleSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  season: z.enum(['spring', 'summer', 'fall', 'winter', 'year_round']).optional().nullable(),
  start_month: z.number().int().min(1).max(12).optional().nullable(),
  end_month: z.number().int().min(1).max(12).optional().nullable(),
  harvest_duration_days: z.number().int().positive().optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  country_id: z.number().int().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().default(true),
});

function parsePaging(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * GET /api/master/harvest-schedules
 * List harvest schedules
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('master:harvest_schedules:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company context required' });
      }

      const { page, limit, offset } = parsePaging(req.query);
      const { search, is_active, season, sortBy, sortOrder } = req.query as any;

      const params: any[] = [companyId];
      let paramIndex = 2;

      let whereSql = 'WHERE hs.deleted_at IS NULL AND hs.company_id = $1';

      if (is_active !== undefined && is_active !== '') {
        whereSql += ` AND hs.is_active = $${paramIndex}`;
        params.push(String(is_active) === 'true');
        paramIndex++;
      }

      if (season) {
        whereSql += ` AND hs.season = $${paramIndex}`;
        params.push(season);
        paramIndex++;
      }

      if (search) {
        whereSql += ` AND (hs.code ILIKE $${paramIndex} OR hs.name ILIKE $${paramIndex} OR hs.name_ar ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const allowedSort = new Set(['code', 'name', 'season', 'start_month', 'is_active', 'created_at']);
      const sortKey = allowedSort.has(String(sortBy)) ? String(sortBy) : 'name';
      const order = String(sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      const totalResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM harvest_schedules hs ${whereSql}`,
        params
      );
      const total = totalResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      params.push(limit);
      params.push(offset);

      const listSql = `
        SELECT 
          hs.*,
          COALESCE(c.name_en, c.name) AS country_name,
          c.name_ar AS country_name_ar
        FROM harvest_schedules hs
        LEFT JOIN countries c ON hs.country_id = c.id
        ${whereSql}
        ORDER BY hs.${sortKey} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await pool.query(listSql, params);

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error fetching harvest schedules:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch harvest schedules' });
    }
  }
);

/**
 * GET /api/master/harvest-schedules/:id
 * Get single harvest schedule
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('master:harvest_schedules:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company context required' });
      }

      const result = await pool.query(
        `SELECT 
          hs.*,
          COALESCE(c.name_en, c.name) AS country_name,
          c.name_ar AS country_name_ar
        FROM harvest_schedules hs
        LEFT JOIN countries c ON hs.country_id = c.id
        WHERE hs.id = $1 AND hs.company_id = $2 AND hs.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Harvest schedule not found' });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching harvest schedule:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch harvest schedule' });
    }
  }
);

/**
 * POST /api/master/harvest-schedules
 * Create harvest schedule
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('master:harvest_schedules:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const userId = req.user?.id;

      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company context required' });
      }

      const parsed = harvestScheduleSchema.parse(req.body);

      // Check for duplicate code
      const existing = await pool.query(
        'SELECT id FROM harvest_schedules WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, parsed.code]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Harvest schedule code already exists' });
      }

      const result = await pool.query(
        `INSERT INTO harvest_schedules (
          company_id, code, name, name_ar, description, season, 
          start_month, end_month, harvest_duration_days, region, country_id, 
          notes, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
        RETURNING *`,
        [
          companyId,
          parsed.code,
          parsed.name,
          parsed.name_ar,
          parsed.description,
          parsed.season,
          parsed.start_month,
          parsed.end_month,
          parsed.harvest_duration_days,
          parsed.region,
          parsed.country_id,
          parsed.notes,
          parsed.is_active,
          userId,
        ]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors });
      }
      console.error('Error creating harvest schedule:', error);
      return res.status(500).json({ success: false, error: 'Failed to create harvest schedule' });
    }
  }
);

/**
 * PUT /api/master/harvest-schedules/:id
 * Update harvest schedule
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('master:harvest_schedules:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const userId = req.user?.id;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company context required' });
      }

      // Capture before state for audit
      await captureBeforeState(req as any, 'harvest_schedules', parseInt(id, 10));

      const parsed = harvestScheduleSchema.partial().parse(req.body);

      // Check exists
      const existing = await pool.query(
        'SELECT id FROM harvest_schedules WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Harvest schedule not found' });
      }

      // Build dynamic update
      const updates: string[] = ['updated_at = CURRENT_TIMESTAMP', 'updated_by = $3'];
      const params: any[] = [id, companyId, userId];
      let paramIndex = 4;

      const fields = [
        'code', 'name', 'name_ar', 'description', 'season', 'start_month',
        'end_month', 'harvest_duration_days', 'region', 'country_id', 'notes', 'is_active'
      ];

      for (const field of fields) {
        if (parsed[field as keyof typeof parsed] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(parsed[field as keyof typeof parsed]);
          paramIndex++;
        }
      }

      const result = await pool.query(
        `UPDATE harvest_schedules SET ${updates.join(', ')} 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL 
         RETURNING *`,
        params
      );

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors });
      }
      console.error('Error updating harvest schedule:', error);
      return res.status(500).json({ success: false, error: 'Failed to update harvest schedule' });
    }
  }
);

/**
 * DELETE /api/master/harvest-schedules/:id
 * Soft delete harvest schedule
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('master:harvest_schedules:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const userId = req.user?.id;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company context required' });
      }

      // Capture before state for audit
      await captureBeforeState(req as any, 'harvest_schedules', parseInt(id, 10));

      // Check if used by any items
      const usageCheck = await pool.query(
        'SELECT COUNT(*)::int AS count FROM items WHERE harvest_schedule_id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (usageCheck.rows[0].count > 0) {
        return res.status(409).json({
          success: false,
          error: `Cannot delete: ${usageCheck.rows[0].count} item(s) are using this harvest schedule`,
        });
      }

      const result = await pool.query(
        `UPDATE harvest_schedules 
         SET deleted_at = CURRENT_TIMESTAMP, updated_by = $3 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL 
         RETURNING id`,
        [id, companyId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Harvest schedule not found' });
      }

      return res.json({ success: true, message: 'Harvest schedule deleted successfully' });
    } catch (error) {
      console.error('Error deleting harvest schedule:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete harvest schedule' });
    }
  }
);

export default router;
