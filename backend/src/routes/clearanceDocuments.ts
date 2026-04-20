/**
 * Clearance Documents — Full CRUD
 * /api/clearance-documents
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requireAnyPermission } from '../middleware/rbac';
import pool from '../db';

const router = Router();
router.use(authenticate, loadCompanyContext);

const perm = (action: string) => requireAnyPermission([
  `customs_declarations:${action}`, `clearance_documents:${action}`, `master:${action}`
]);

// GET /
router.get('/', perm('view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { search, declaration_id, status, document_type, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let where = 'WHERE d.deleted_at IS NULL';
    if (companyId) { params.push(companyId); where += ` AND d.company_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (d.title ILIKE $${params.length} OR d.document_number ILIKE $${params.length} OR d.reference_number ILIKE $${params.length})`; }
    if (declaration_id) { params.push(declaration_id); where += ` AND d.declaration_id = $${params.length}`; }
    if (status) { params.push(status); where += ` AND d.status = $${params.length}`; }
    if (document_type) { params.push(document_type); where += ` AND d.document_type = $${params.length}`; }

    const countQ = await pool.query(`SELECT COUNT(*) FROM clearance_documents d ${where}`, params);
    params.push(Number(limit), offset);
    const dataQ = await pool.query(`
      SELECT d.*, cd.declaration_number
      FROM clearance_documents d
      LEFT JOIN customs_declarations cd ON cd.id = d.declaration_id
      ${where}
      ORDER BY d.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ success: true, data: dataQ.rows, total: parseInt(countQ.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// GET /:id
router.get('/:id', perm('view'), async (req: Request, res: Response) => {
  try {
    const r = await pool.query(`
      SELECT d.*, cd.declaration_number
      FROM clearance_documents d
      LEFT JOIN customs_declarations cd ON cd.id = d.declaration_id
      WHERE d.id=$1 AND d.deleted_at IS NULL
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// POST /
router.post('/', perm('create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { document_number, document_type, declaration_id, shipment_id, reference_number, title, title_ar, issuing_authority, issue_date, expiry_date, status, notes, is_required } = req.body;
    if (!document_type) return res.status(400).json({ success: false, error: { message: 'document_type required' } });

    const r = await pool.query(`
      INSERT INTO clearance_documents (company_id, document_number, document_type, declaration_id, shipment_id, reference_number, title, title_ar, issuing_authority, issue_date, expiry_date, status, notes, is_required, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
    `, [companyId, document_number, document_type, declaration_id, shipment_id, reference_number, title, title_ar, issuing_authority, issue_date, expiry_date, status||'pending', notes, is_required!==false, userId]);

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// PUT /:id
router.put('/:id', perm('edit'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { document_number, document_type, declaration_id, shipment_id, reference_number, title, title_ar, issuing_authority, issue_date, expiry_date, status, notes, is_required, is_active } = req.body;

    const r = await pool.query(`
      UPDATE clearance_documents SET
        document_number=$1, document_type=COALESCE($2,document_type), declaration_id=$3,
        shipment_id=$4, reference_number=$5, title=$6, title_ar=$7, issuing_authority=$8,
        issue_date=$9, expiry_date=$10, status=COALESCE($11,status), notes=$12,
        is_required=COALESCE($13,is_required), is_active=COALESCE($14,is_active),
        updated_by=$15, updated_at=NOW()
      WHERE id=$16 AND deleted_at IS NULL RETURNING *
    `, [document_number, document_type, declaration_id, shipment_id, reference_number, title, title_ar, issuing_authority, issue_date, expiry_date, status, notes, is_required, is_active, userId, req.params.id]);

    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// DELETE /:id
router.delete('/:id', perm('delete'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const r = await pool.query('UPDATE clearance_documents SET deleted_at=NOW(), updated_by=$1 WHERE id=$2 AND deleted_at IS NULL RETURNING id', [userId, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, message: 'Deleted' });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

export default router;
