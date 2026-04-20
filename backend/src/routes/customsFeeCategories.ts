/**
 * Customs Fee Categories — Full CRUD
 * /api/customs-fee-categories
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requireAnyPermission } from '../middleware/rbac';
import pool from '../db';

const router = Router();
router.use(authenticate, loadCompanyContext);

const perm = (action: string) => requireAnyPermission([
  `logistics:customs_tariffs:${action}`, `customs_fee_categories:${action}`, `master:${action}`
]);

// GET /
router.get('/', perm('view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { search } = req.query;
    const params: any[] = [];
    let where = 'WHERE deleted_at IS NULL';
    if (companyId) { params.push(companyId); where += ` AND company_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`; }

    const r = await pool.query(`SELECT * FROM customs_fee_categories ${where} ORDER BY display_order, code`, params);
    res.json({ success: true, data: r.rows });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// GET /:id
router.get('/:id', perm('view'), async (req: Request, res: Response) => {
  try {
    const r = await pool.query('SELECT * FROM customs_fee_categories WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// POST /
router.post('/', perm('create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, fee_type, rate_percent, fixed_amount, currency_code, calculation_base, min_fee, max_fee, applies_to, gl_account_id, display_order } = req.body;
    if (!code || !name_en) return res.status(400).json({ success: false, error: { message: 'code and name_en required' } });

    const r = await pool.query(`
      INSERT INTO customs_fee_categories (company_id, code, name_en, name_ar, description, fee_type, rate_percent, fixed_amount, currency_code, calculation_base, min_fee, max_fee, applies_to, gl_account_id, display_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *
    `, [companyId, code, name_en, name_ar, description, fee_type||'fixed', rate_percent, fixed_amount, currency_code||'SAR', calculation_base||'cif_value', min_fee, max_fee, applies_to||'all', gl_account_id, display_order||0, userId]);

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// PUT /:id
router.put('/:id', perm('edit'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, fee_type, rate_percent, fixed_amount, currency_code, calculation_base, min_fee, max_fee, applies_to, gl_account_id, display_order, is_active } = req.body;

    const r = await pool.query(`
      UPDATE customs_fee_categories SET
        code=COALESCE($1,code), name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar),
        description=$4, fee_type=COALESCE($5,fee_type), rate_percent=$6, fixed_amount=$7,
        currency_code=COALESCE($8,currency_code), calculation_base=COALESCE($9,calculation_base),
        min_fee=$10, max_fee=$11, applies_to=COALESCE($12,applies_to), gl_account_id=$13,
        display_order=COALESCE($14,display_order), is_active=COALESCE($15,is_active),
        updated_by=$16, updated_at=NOW()
      WHERE id=$17 AND deleted_at IS NULL RETURNING *
    `, [code, name_en, name_ar, description, fee_type, rate_percent, fixed_amount, currency_code, calculation_base, min_fee, max_fee, applies_to, gl_account_id, display_order, is_active, userId, req.params.id]);

    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// DELETE /:id
router.delete('/:id', perm('delete'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const r = await pool.query('UPDATE customs_fee_categories SET deleted_at=NOW(), updated_by=$1 WHERE id=$2 AND deleted_at IS NULL RETURNING id', [userId, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, message: 'Deleted' });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

export default router;
