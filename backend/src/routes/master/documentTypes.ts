import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List document_types
router.get('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '', category } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    
    let query = `SELECT *, name AS name_en FROM document_types WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (companyId) {
      params.push(companyId);
      query += ` AND (company_id = $${params.length} OR company_id IS NULL)`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    const countQuery = query.replace('SELECT *, name AS name_en', 'SELECT COUNT(*)');
    
    query += ` ORDER BY sort_order ASC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countParams = params.slice(0, -2);
    const countResult = await pool.query(countQuery, countParams);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch document types', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT *, name AS name_en FROM document_types WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Document type not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch document type', 500);
  }
});

// POST / - Create
router.post('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { code, name, name_en, name_ar, category, description, file_formats, max_file_size_mb,
      requires_approval, approval_levels, requires_expiry, default_validity_days,
      is_confidential, retention_period_years, numbering_prefix, auto_numbering,
      requires_version_control, requires_digital_signature, applicable_to,
      template_available, is_mandatory, is_active = true, sort_order } = req.body;
    const theName = name || name_en;
    if (!theName) return sendError(res, 'VALIDATION_ERROR', 'name is required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const finalCode = code || theName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || theName;
    const dup = await pool.query(`SELECT id FROM document_types WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [finalCode, companyId]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO document_types (company_id, code, name, name_en, name_ar, category, description, file_formats, max_file_size_mb,
        requires_approval, approval_levels, requires_expiry, default_validity_days,
        is_confidential, retention_period_years, numbering_prefix, auto_numbering,
        requires_version_control, requires_digital_signature, applicable_to,
        template_available, is_mandatory, is_active, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,NOW(),NOW())
       RETURNING *, name AS name_en`,
      [companyId, finalCode, theName, theName, finalNameAr, category||'other', description||null,
        file_formats||null, max_file_size_mb||10, requires_approval??false, approval_levels||1,
        requires_expiry??false, default_validity_days||null, is_confidential??false,
        retention_period_years||null, numbering_prefix||null, auto_numbering??false,
        requires_version_control??false, requires_digital_signature??false,
        applicable_to||'all', template_available??false, is_mandatory??false, is_active, sort_order||0]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Document type created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create document type', 500);
  }
});

// PUT /:id - Update
router.put('/:id', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, name_en, name_ar, category, description, file_formats, max_file_size_mb,
      requires_approval, approval_levels, requires_expiry, default_validity_days,
      is_confidential, retention_period_years, numbering_prefix, auto_numbering,
      requires_version_control, requires_digital_signature, applicable_to,
      template_available, is_mandatory, is_active, sort_order } = req.body;
    const existing = await pool.query(`SELECT * FROM document_types WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Document type not found', 404);
    const theName = name || name_en;
    const result = await pool.query(
      `UPDATE document_types SET code=COALESCE($1,code), name=COALESCE($2,name), name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar),
       category=COALESCE($4,category), description=$5, file_formats=COALESCE($6,file_formats),
       max_file_size_mb=COALESCE($7,max_file_size_mb), requires_approval=COALESCE($8,requires_approval),
       approval_levels=COALESCE($9,approval_levels), requires_expiry=COALESCE($10,requires_expiry),
       default_validity_days=$11, is_confidential=COALESCE($12,is_confidential),
       retention_period_years=$13, numbering_prefix=$14, auto_numbering=COALESCE($15,auto_numbering),
       requires_version_control=COALESCE($16,requires_version_control), requires_digital_signature=COALESCE($17,requires_digital_signature),
       applicable_to=COALESCE($18,applicable_to), template_available=COALESCE($19,template_available),
       is_mandatory=COALESCE($20,is_mandatory), is_active=COALESCE($21,is_active), sort_order=COALESCE($22,sort_order), updated_at=NOW()
       WHERE id = $23 AND deleted_at IS NULL RETURNING *, name AS name_en`,
      [code, theName, name_ar, category, description, file_formats, max_file_size_mb,
        requires_approval, approval_levels, requires_expiry, default_validity_days,
        is_confidential, retention_period_years, numbering_prefix, auto_numbering,
        requires_version_control, requires_digital_signature, applicable_to,
        template_available, is_mandatory, is_active, sort_order, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Document type updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update document type', 500);
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM document_types WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Document type not found', 404);
    await pool.query(`UPDATE document_types SET deleted_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Document type deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete document type', 500);
  }
});

export default router;
