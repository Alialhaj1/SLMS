import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();
router.use(authenticate);

// GET / — List all tax zones
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const { search, zone_type, is_active, page = '1', limit = '50' } = req.query;
    const params: any[] = [companyId];
    let where = 'WHERE tz.company_id = $1 AND tz.deleted_at IS NULL';
    let idx = 2;

    if (search) {
      where += ` AND (tz.code ILIKE $${idx} OR tz.name_en ILIKE $${idx} OR tz.name_ar ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (zone_type) {
      where += ` AND tz.zone_type = $${idx++}`;
      params.push(zone_type);
    }
    if (is_active !== undefined && is_active !== '') {
      where += ` AND tz.is_active = $${idx++}`;
      params.push(is_active === 'true');
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM tax_zones tz ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    const pg = parseInt(page as string, 10);
    const lim = Math.min(parseInt(limit as string, 10), 200);
    const offset = (pg - 1) * lim;

    const dataRes = await pool.query(
      `SELECT tz.* FROM tax_zones tz ${where} ORDER BY tz.code ASC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, lim, offset]
    );

    sendSuccess(res, dataRes.rows, 200, {
      page: pg,
      limit: lim,
      total,
      totalPages: Math.ceil(total / lim),
    });
  } catch (e: any) {
    sendError(res, e.message, 500);
  }
});

// GET /stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive,
        COUNT(*) FILTER (WHERE zone_type = 'domestic') as domestic,
        COUNT(*) FILTER (WHERE zone_type = 'economic_zone') as economic_zones,
        COUNT(*) FILTER (WHERE zone_type = 'free_zone') as free_zones,
        COUNT(*) FILTER (WHERE subject_to_zatca = true) as zatca_subject,
        ROUND(AVG(default_rate), 2) as avg_rate
      FROM tax_zones
      WHERE company_id = $1 AND deleted_at IS NULL
    `, [companyId]);
    sendSuccess(res, result.rows[0]);
  } catch (e: any) {
    sendError(res, e.message, 500);
  }
});

// GET /:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const result = await pool.query(
      'SELECT * FROM tax_zones WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [req.params.id, companyId]
    );
    if (!result.rows.length) return sendError(res, 'Tax zone not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (e: any) {
    sendError(res, e.message, 500);
  }
});

// POST /
router.post('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, zone_type, default_rate, subject_to_zatca, description, description_ar, is_active } = req.body;

    if (!code || !name_en) return sendError(res, 'code and name_en are required', 400);

    const result = await pool.query(
      `INSERT INTO tax_zones (company_id, code, name_en, name_ar, zone_type, default_rate, subject_to_zatca, description, description_ar, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [companyId, code, name_en, name_ar || '', zone_type || 'domestic', default_rate ?? 15, subject_to_zatca ?? true, description, description_ar, is_active ?? true, userId]
    );
    sendSuccess(res, result.rows[0], 201);
  } catch (e: any) {
    if (e.code === '23505') return sendError(res, 'Tax zone code already exists', 409);
    sendError(res, e.message, 500);
  }
});

// PUT /:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, zone_type, default_rate, subject_to_zatca, description, description_ar, is_active } = req.body;

    const result = await pool.query(
      `UPDATE tax_zones SET code=$1, name_en=$2, name_ar=$3, zone_type=$4, default_rate=$5, subject_to_zatca=$6,
       description=$7, description_ar=$8, is_active=$9, updated_by=$10, updated_at=NOW()
       WHERE id=$11 AND company_id=$12 AND deleted_at IS NULL RETURNING *`,
      [code, name_en, name_ar, zone_type, default_rate, subject_to_zatca, description, description_ar, is_active, userId, req.params.id, companyId]
    );
    if (!result.rows.length) return sendError(res, 'Tax zone not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (e: any) {
    if (e.code === '23505') return sendError(res, 'Tax zone code already exists', 409);
    sendError(res, e.message, 500);
  }
});

// DELETE /:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const result = await pool.query(
      `UPDATE tax_zones SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
      [req.params.id, companyId]
    );
    if (!result.rows.length) return sendError(res, 'Tax zone not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (e: any) {
    sendError(res, e.message, 500);
  }
});

export default router;
