import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { z } from 'zod';

const router = Router();

const referenceDataSchema = z.object({
  code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  description_en: z.string().max(1000).optional().nullable(),
  description_ar: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().default(true),
});

function parsePaging(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function normalizeType(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase();
}

/**
 * GET /api/reference-data/:type
 * List reference data entries for a given type.
 */
router.get(
  '/:type',
  authenticate,
  loadCompanyContext,
  requirePermission('master:reference_data:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const type = normalizeType(req.params.type);
      if (!type) {
        return res.status(400).json({ success: false, error: { message: 'Type is required' } });
      }

      const { page, limit, offset } = parsePaging(req.query);
      const { search, is_active, sortBy, sortOrder } = req.query as any;

      const params: any[] = [type];
      let paramIndex = 2;

      let whereSql = 'WHERE deleted_at IS NULL AND type = $1';

      // Multi-tenant filtering (company-specific + global)
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id ?? req.user?.companyId;
      if (companyId) {
        whereSql += ` AND (company_id = $${paramIndex} OR company_id IS NULL)`;
        params.push(companyId);
        paramIndex++;
      }

      if (is_active !== undefined && is_active !== '') {
        whereSql += ` AND is_active = $${paramIndex}`;
        params.push(String(is_active) === 'true');
        paramIndex++;
      }

      if (search) {
        whereSql += ` AND (code ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR name_ar ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const allowedSort = new Set(['code', 'name_en', 'name_ar', 'is_active', 'created_at']);
      const sortKey = allowedSort.has(String(sortBy)) ? String(sortBy) : 'name_en';
      const order = String(sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM reference_data ${whereSql}`, params);
      const total = totalResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      params.push(limit);
      params.push(offset);

      // Enhanced query with items count for item_types
      let listSql: string;
      if (type === 'item_types') {
        // Replace WHERE clause with qualified table names to avoid ambiguity
        // Both reference_data and items have: deleted_at, company_id, code, is_active
        const qualifiedWhereSql = whereSql
          .replace(/WHERE deleted_at/, 'WHERE rd.deleted_at')
          .replace(/AND type =/g, 'AND rd.type =')
          .replace(/company_id/g, 'rd.company_id')
          .replace(/AND is_active =/g, 'AND rd.is_active =')
          .replace(/code ILIKE/g, 'rd.code ILIKE')
          .replace(/name_en ILIKE/g, 'rd.name_en ILIKE')
          .replace(/name_ar ILIKE/g, 'rd.name_ar ILIKE');
        listSql = `
          SELECT 
            rd.*,
            COALESCE(COUNT(i.id), 0)::int AS items_count
          FROM reference_data rd
          LEFT JOIN items i ON i.item_type_id = rd.id AND i.deleted_at IS NULL
          ${qualifiedWhereSql}
          GROUP BY rd.id
          ORDER BY rd.${sortKey} ${order}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
      } else {
        listSql = `
          SELECT *
          FROM reference_data
          ${whereSql}
          ORDER BY ${sortKey} ${order}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
      }

      const result = await pool.query(listSql, params);

      return res.json({
        success: true,
        data: result.rows,
        meta: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error fetching reference data:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch reference data' } });
    }
  }
);

/**
 * GET /api/reference-data/:type/:id
 */
router.get(
  '/:type/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('master:reference_data:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const type = normalizeType(req.params.type);
      const id = parseInt(req.params.id, 10);
      if (!type || Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid type or id' } });
      }

      const companyId = (req as any).companyId ?? (req as any).companyContext?.id ?? req.user?.companyId;

      const params: any[] = [type, id];
      let sql = 'SELECT * FROM reference_data WHERE type = $1 AND id = $2 AND deleted_at IS NULL';

      if (companyId) {
        sql += ' AND (company_id = $3 OR company_id IS NULL)';
        params.push(companyId);
      }

      const result = await pool.query(sql, params);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching reference data item:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch reference data item' } });
    }
  }
);

/**
 * POST /api/reference-data/:type
 */
router.post(
  '/:type',
  authenticate,
  loadCompanyContext,
  requirePermission('master:reference_data:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const type = normalizeType(req.params.type);
      if (!type) {
        return res.status(400).json({ success: false, error: { message: 'Type is required' } });
      }

      const payload = referenceDataSchema.parse(req.body);
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id ?? req.user?.companyId ?? null;
      const userId = req.user?.id ?? null;

      const insert = await pool.query(
        `INSERT INTO reference_data (
          type, company_id, code, name_en, name_ar, description_en, description_ar, is_active, created_by, updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
        RETURNING *`,
        [
          type,
          companyId,
          payload.code,
          payload.name_en,
          payload.name_ar,
          payload.description_en ?? null,
          payload.description_ar ?? null,
          payload.is_active,
          userId,
        ]
      );

      return res.status(201).json({ success: true, data: insert.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Invalid payload', details: error.errors } });
      }
      // Unique constraint violation
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'Code already exists for this type' } });
      }

      console.error('Error creating reference data:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create reference data' } });
    }
  }
);

/**
 * PUT /api/reference-data/:type/:id
 */
router.put(
  '/:type/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('master:reference_data:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const type = normalizeType(req.params.type);
      const id = parseInt(req.params.id, 10);
      if (!type || Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid type or id' } });
      }

      await captureBeforeState(req as any, 'reference_data', id);

      const payload = referenceDataSchema.partial().parse(req.body);
      const userId = req.user?.id ?? null;

      const fields: string[] = [];
      const values: any[] = [type, id];
      let idx = 3;

      const setField = (column: string, value: any) => {
        fields.push(`${column} = $${idx}`);
        values.push(value);
        idx++;
      };

      if (payload.code !== undefined) setField('code', payload.code);
      if (payload.name_en !== undefined) setField('name_en', payload.name_en);
      if (payload.name_ar !== undefined) setField('name_ar', payload.name_ar);
      if (payload.description_en !== undefined) setField('description_en', payload.description_en ?? null);
      if (payload.description_ar !== undefined) setField('description_ar', payload.description_ar ?? null);
      if (payload.is_active !== undefined) setField('is_active', payload.is_active);

      setField('updated_by', userId);
      setField('updated_at', new Date());

      const sql = `
        UPDATE reference_data
        SET ${fields.join(', ')}
        WHERE type = $1 AND id = $2 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await pool.query(sql, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Invalid payload', details: error.errors } });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'Code already exists for this type' } });
      }

      console.error('Error updating reference data:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update reference data' } });
    }
  }
);

/**
 * DELETE /api/reference-data/:type/:id (soft delete)
 */
router.delete(
  '/:type/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('master:reference_data:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const type = normalizeType(req.params.type);
      const id = parseInt(req.params.id, 10);
      if (!type || Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid type or id' } });
      }

      await captureBeforeState(req as any, 'reference_data', id);

      const userId = req.user?.id ?? null;

      const result = await pool.query(
        `UPDATE reference_data
         SET deleted_at = NOW(), updated_at = NOW(), updated_by = $3
         WHERE type = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [type, id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Not found' } });
      }

      return res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      console.error('Error deleting reference data:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete reference data' } });
    }
  }
);

export default router;
