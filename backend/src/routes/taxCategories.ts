/**
 * Tax Categories — Full CRUD
 * /api/tax-categories
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requireAnyPermission } from '../middleware/rbac';
import pool from '../db';

const router = Router();
router.use(authenticate, loadCompanyContext);

const perm = (action: string) => requireAnyPermission([
  `master:tax:${action}`, `tax_categories:${action}`, `master:${action}`
]);

// GET /
router.get('/', perm('view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { search } = req.query;
    const params: any[] = [];
    let where = 'WHERE t.deleted_at IS NULL';
    if (companyId) { params.push(companyId); where += ` AND t.company_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (t.name_en ILIKE $${params.length} OR t.name_ar ILIKE $${params.length} OR t.code ILIKE $${params.length})`; }

    const r = await pool.query(`
      SELECT t.*, p.name_en as parent_name
      FROM tax_categories t LEFT JOIN tax_categories p ON p.id = t.parent_id
      ${where} ORDER BY t.display_order, t.code
    `, params);

    res.json({ success: true, data: r.rows });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// GET /:id
router.get('/:id', perm('view'), async (req: Request, res: Response) => {
  try {
    const r = await pool.query('SELECT * FROM tax_categories WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// POST /
router.post('/', perm('create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, category_type, parent_id, zatca_category, display_order } = req.body;
    if (!code || !name_en) return res.status(400).json({ success: false, error: { message: 'code and name_en required' } });

    const r = await pool.query(`
      INSERT INTO tax_categories (company_id, code, name_en, name_ar, description, category_type, parent_id, zatca_category, display_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [companyId, code, name_en, name_ar, description, category_type||'standard', parent_id, zatca_category, display_order||0, userId]);

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// PUT /:id
router.put('/:id', perm('edit'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, category_type, parent_id, zatca_category, display_order, is_active } = req.body;

    const r = await pool.query(`
      UPDATE tax_categories SET
        code=COALESCE($1,code), name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar),
        description=$4, category_type=COALESCE($5,category_type), parent_id=$6,
        zatca_category=$7, display_order=COALESCE($8,display_order), is_active=COALESCE($9,is_active),
        updated_by=$10, updated_at=NOW()
      WHERE id=$11 AND deleted_at IS NULL RETURNING *
    `, [code, name_en, name_ar, description, category_type, parent_id, zatca_category, display_order, is_active, userId, req.params.id]);

    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// DELETE /:id
router.delete('/:id', perm('delete'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const r = await pool.query('UPDATE tax_categories SET deleted_at=NOW(), updated_by=$1 WHERE id=$2 AND deleted_at IS NULL RETURNING id', [userId, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, message: 'Deleted' });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

export default router;
