/**
 * Withholding Tax Rates — Full CRUD
 * /api/withholding-tax
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requireAnyPermission } from '../middleware/rbac';
import pool from '../db';

const router = Router();
router.use(authenticate, loadCompanyContext);

const perm = (action: string) => requireAnyPermission([
  `master:tax:${action}`, `withholding_tax:${action}`, `master:${action}`
]);

// GET /
router.get('/', perm('view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let where = 'WHERE w.deleted_at IS NULL';
    if (companyId) { params.push(companyId); where += ` AND w.company_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (w.name_en ILIKE $${params.length} OR w.name_ar ILIKE $${params.length} OR w.code ILIKE $${params.length})`; }

    const countQ = await pool.query(`SELECT COUNT(*) FROM withholding_tax_rates w ${where}`, params);
    params.push(Number(limit), offset);
    const dataQ = await pool.query(`
      SELECT w.*, c.name_en as country_name, c.name_ar as country_name_ar
      FROM withholding_tax_rates w
      LEFT JOIN countries c ON c.id = w.country_id
      ${where}
      ORDER BY w.code
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ success: true, data: dataQ.rows, total: parseInt(countQ.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// GET /:id
router.get('/:id', perm('view'), async (req: Request, res: Response) => {
  try {
    const r = await pool.query('SELECT * FROM withholding_tax_rates WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// POST /
router.post('/', perm('create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, rate_percent, resident_rate, non_resident_rate, treaty_rate, income_type, applies_to, country_id, zatca_code, effective_from, effective_to, min_amount, max_amount, gl_account_id } = req.body;
    if (!code || !name_en) return res.status(400).json({ success: false, error: { message: 'code and name_en required' } });

    const r = await pool.query(`
      INSERT INTO withholding_tax_rates (company_id, code, name_en, name_ar, description, rate_percent, resident_rate, non_resident_rate, treaty_rate, income_type, applies_to, country_id, zatca_code, effective_from, effective_to, min_amount, max_amount, gl_account_id, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *
    `, [companyId, code, name_en, name_ar, description, rate_percent||0, resident_rate||0, non_resident_rate||0, treaty_rate, income_type, applies_to||'both', country_id, zatca_code, effective_from, effective_to, min_amount||0, max_amount, gl_account_id, userId]);

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// PUT /:id
router.put('/:id', perm('edit'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, rate_percent, resident_rate, non_resident_rate, treaty_rate, income_type, applies_to, country_id, zatca_code, effective_from, effective_to, min_amount, max_amount, gl_account_id, is_active } = req.body;

    const r = await pool.query(`
      UPDATE withholding_tax_rates SET
        code=COALESCE($1,code), name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar),
        description=$4, rate_percent=COALESCE($5,rate_percent), resident_rate=COALESCE($6,resident_rate),
        non_resident_rate=COALESCE($7,non_resident_rate), treaty_rate=$8, income_type=$9,
        applies_to=COALESCE($10,applies_to), country_id=$11, zatca_code=$12,
        effective_from=$13, effective_to=$14, min_amount=$15, max_amount=$16,
        gl_account_id=$17, is_active=COALESCE($18,is_active), updated_by=$19, updated_at=NOW()
      WHERE id=$20 AND deleted_at IS NULL RETURNING *
    `, [code, name_en, name_ar, description, rate_percent, resident_rate, non_resident_rate, treaty_rate, income_type, applies_to, country_id, zatca_code, effective_from, effective_to, min_amount, max_amount, gl_account_id, is_active, userId, req.params.id]);

    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// DELETE /:id
router.delete('/:id', perm('delete'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const r = await pool.query('UPDATE withholding_tax_rates SET deleted_at=NOW(), updated_by=$1 WHERE id=$2 AND deleted_at IS NULL RETURNING id', [userId, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, message: 'Deleted' });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

export default router;
