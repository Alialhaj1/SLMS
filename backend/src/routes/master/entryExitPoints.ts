import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();
router.use(authenticate);

// GET / — List all entry/exit points
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const { search, point_type, direction, operating_status, is_active, page = '1', limit = '50' } = req.query;
    const params: any[] = [companyId];
    let where = 'WHERE ep.company_id = $1 AND ep.deleted_at IS NULL';
    let idx = 2;

    if (search) {
      where += ` AND (ep.code ILIKE $${idx} OR ep.name_en ILIKE $${idx} OR ep.name_ar ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (point_type) { where += ` AND ep.point_type = $${idx++}`; params.push(point_type); }
    if (direction) { where += ` AND ep.direction = $${idx++}`; params.push(direction); }
    if (operating_status) { where += ` AND ep.operating_status = $${idx++}`; params.push(operating_status); }
    if (is_active !== undefined && is_active !== '') { where += ` AND ep.is_active = $${idx++}`; params.push(is_active === 'true'); }

    const countRes = await pool.query(`SELECT COUNT(*) FROM entry_exit_points ep ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    const pg = parseInt(page as string, 10);
    const lim = Math.min(parseInt(limit as string, 10), 200);
    const offset = (pg - 1) * lim;

    const dataRes = await pool.query(
      `SELECT ep.*, c.name_en as country_name_en, c.name_ar as country_name_ar
       FROM entry_exit_points ep
       LEFT JOIN countries c ON c.id = ep.country_id
       ${where} ORDER BY ep.code ASC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, lim, offset]
    );

    sendSuccess(res, dataRes.rows, 200, { page: pg, limit: lim, total, totalPages: Math.ceil(total / lim) });
  } catch (e: any) {
    sendError(res, e.message, 500);
  }
});

// GET /stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const result = await pool.query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active) as active,
        COUNT(*) FILTER (WHERE point_type='sea') as sea_points,
        COUNT(*) FILTER (WHERE point_type='air') as air_points,
        COUNT(*) FILTER (WHERE point_type='land') as land_points,
        COUNT(*) FILTER (WHERE operating_status='open') as open_points,
        COUNT(*) FILTER (WHERE operating_status='closed') as closed_points
      FROM entry_exit_points WHERE company_id = $1 AND deleted_at IS NULL
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
      `SELECT ep.*, c.name_en as country_name_en, c.name_ar as country_name_ar
       FROM entry_exit_points ep LEFT JOIN countries c ON c.id = ep.country_id
       WHERE ep.id = $1 AND ep.company_id = $2 AND ep.deleted_at IS NULL`,
      [req.params.id, companyId]
    );
    if (!result.rows.length) return sendError(res, 'Entry/exit point not found', 404);
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
    const { code, name_en, name_ar, point_type, direction, country_id, city, customs_office_id,
            latitude, longitude, operating_hours, operating_status, description, description_ar, is_active } = req.body;

    if (!code || !name_en) return sendError(res, 'code and name_en are required', 400);

    const result = await pool.query(
      `INSERT INTO entry_exit_points (company_id, code, name_en, name_ar, point_type, direction, country_id, city,
       customs_office_id, latitude, longitude, operating_hours, operating_status, description, description_ar, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [companyId, code, name_en, name_ar || '', point_type || 'sea', direction || 'both', country_id || null, city || null,
       customs_office_id || null, latitude || null, longitude || null, operating_hours || null, operating_status || 'open',
       description || null, description_ar || null, is_active ?? true, userId]
    );
    sendSuccess(res, result.rows[0], 201);
  } catch (e: any) {
    if (e.code === '23505') return sendError(res, 'Entry/exit point code already exists', 409);
    sendError(res, e.message, 500);
  }
});

// PUT /:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, point_type, direction, country_id, city, customs_office_id,
            latitude, longitude, operating_hours, operating_status, description, description_ar, is_active } = req.body;

    const result = await pool.query(
      `UPDATE entry_exit_points SET code=$1, name_en=$2, name_ar=$3, point_type=$4, direction=$5, country_id=$6,
       city=$7, customs_office_id=$8, latitude=$9, longitude=$10, operating_hours=$11, operating_status=$12,
       description=$13, description_ar=$14, is_active=$15, updated_by=$16, updated_at=NOW()
       WHERE id=$17 AND company_id=$18 AND deleted_at IS NULL RETURNING *`,
      [code, name_en, name_ar, point_type, direction, country_id || null, city, customs_office_id || null,
       latitude || null, longitude || null, operating_hours, operating_status, description, description_ar,
       is_active, userId, req.params.id, companyId]
    );
    if (!result.rows.length) return sendError(res, 'Entry/exit point not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (e: any) {
    if (e.code === '23505') return sendError(res, 'Entry/exit point code already exists', 409);
    sendError(res, e.message, 500);
  }
});

// DELETE /:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.tenant_id;
    const result = await pool.query(
      `UPDATE entry_exit_points SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
      [req.params.id, companyId]
    );
    if (!result.rows.length) return sendError(res, 'Entry/exit point not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (e: any) {
    sendError(res, e.message, 500);
  }
});

export default router;
