/**
 * Tax Exemptions — Full CRUD
 * /api/tax-exemptions
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requireAnyPermission } from '../middleware/rbac';
import pool from '../db';

const router = Router();
router.use(authenticate, loadCompanyContext);

const perm = (action: string) => requireAnyPermission([
  `master:tax:${action}`, `tax_exemptions:${action}`, `master:${action}`
]);

// GET /
router.get('/', perm('view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { search } = req.query;
    const params: any[] = [];
    let where = 'WHERE e.deleted_at IS NULL';
    if (companyId) { params.push(companyId); where += ` AND e.company_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (e.name_en ILIKE $${params.length} OR e.name_ar ILIKE $${params.length} OR e.code ILIKE $${params.length})`; }

    const r = await pool.query(`
      SELECT e.*, tt.name as tax_type_name
      FROM tax_exemptions e LEFT JOIN tax_types tt ON tt.id = e.tax_type_id
      ${where} ORDER BY e.code
    `, params);

    res.json({ success: true, data: r.rows });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// GET /:id
router.get('/:id', perm('view'), async (req: Request, res: Response) => {
  try {
    const r = await pool.query('SELECT * FROM tax_exemptions WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// POST /
router.post('/', perm('create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, exemption_type, tax_type_id, exemption_rate, authority, legal_reference, certificate_number, effective_from, effective_to, conditions, applicable_items, zatca_exemption_code } = req.body;
    if (!code || !name_en) return res.status(400).json({ success: false, error: { message: 'code and name_en required' } });

    const r = await pool.query(`
      INSERT INTO tax_exemptions (company_id, code, name_en, name_ar, description, exemption_type, tax_type_id, exemption_rate, authority, legal_reference, certificate_number, effective_from, effective_to, conditions, applicable_items, zatca_exemption_code, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *
    `, [companyId, code, name_en, name_ar, description, exemption_type||'full', tax_type_id, exemption_rate||100, authority, legal_reference, certificate_number, effective_from, effective_to, conditions, applicable_items, zatca_exemption_code, userId]);

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// PUT /:id
router.put('/:id', perm('edit'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { code, name_en, name_ar, description, exemption_type, tax_type_id, exemption_rate, authority, legal_reference, certificate_number, effective_from, effective_to, conditions, applicable_items, zatca_exemption_code, is_active } = req.body;

    const r = await pool.query(`
      UPDATE tax_exemptions SET
        code=COALESCE($1,code), name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar),
        description=$4, exemption_type=COALESCE($5,exemption_type), tax_type_id=$6,
        exemption_rate=COALESCE($7,exemption_rate), authority=$8, legal_reference=$9,
        certificate_number=$10, effective_from=$11, effective_to=$12, conditions=$13,
        applicable_items=$14, zatca_exemption_code=$15, is_active=COALESCE($16,is_active),
        updated_by=$17, updated_at=NOW()
      WHERE id=$18 AND deleted_at IS NULL RETURNING *
    `, [code, name_en, name_ar, description, exemption_type, tax_type_id, exemption_rate, authority, legal_reference, certificate_number, effective_from, effective_to, conditions, applicable_items, zatca_exemption_code, is_active, userId, req.params.id]);

    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// DELETE /:id
router.delete('/:id', perm('delete'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const r = await pool.query('UPDATE tax_exemptions SET deleted_at=NOW(), updated_by=$1 WHERE id=$2 AND deleted_at IS NULL RETURNING id', [userId, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, message: 'Deleted' });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

export default router;
