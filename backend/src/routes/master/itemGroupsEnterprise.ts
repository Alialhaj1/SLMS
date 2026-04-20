import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// GET / - List item_groups (scoped by company)
router.get('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    
    let query = `SELECT * FROM item_groups WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (companyId) {
      params.push(companyId);
      query += ` AND company_id = $${params.length}`;
    }
    
    let countQuery = `SELECT COUNT(*) FROM item_groups WHERE deleted_at IS NULL`;
    const countParams: any[] = [];
    if (companyId) {
      countParams.push(companyId);
      countQuery += ` AND company_id = $${countParams.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
      countParams.push(`%${search}%`);
      countQuery += ` AND (name_en ILIKE $${countParams.length} OR name_ar ILIKE $${countParams.length} OR code ILIKE $${countParams.length})`;
    }
    
    query += ` ORDER BY sort_order ASC, name_en ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(countQuery, countParams);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch item group (enterprise)', 500);
  }
});

// GET /:id/inheritance - Get inheritance data for a parent group
router.get('/:id/inheritance', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const parent = await pool.query(
      `SELECT * FROM item_groups WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (parent.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Parent group not found', 404);
    }
    const p = parent.rows[0];
    const nextLevel = (p.level || 0) + 1;
    sendSuccess(res, {
      parent_id: p.id,
      parent_name: p.name_en || p.name,
      next_level_id: null,
      inherited_group_category_id: p.category_id || null,
      inherited_group_type_id: p.group_type || null,
      inherited_valuation_method: null,
      inherited_tax_category: null,
    });
  } catch (err: any) {
    console.error('Error fetching inheritance:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch inheritance data', 500);
  }
});

// GET /:id - Get single record
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM item_groups WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'item group (enterprise) not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch item group (enterprise)', 500);
  }
});

// POST / - Create
router.post('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { code, name_en, name, name_ar, description, description_en, description_ar, parent_group_id, group_type, sort_order, is_active = true } = req.body;
    const theName = name_en || name;
    if (!theName) return sendError(res, 'VALIDATION_ERROR', 'name_en is required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const finalCode = code || theName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
    const finalNameAr = name_ar || theName;
    const dup = await pool.query(`SELECT id FROM item_groups WHERE (code = $1 OR name_en = $3) AND company_id = $2 AND deleted_at IS NULL`, [finalCode, companyId, theName]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Item group with this code or name already exists', 400);
    const result = await pool.query(
      `INSERT INTO item_groups (company_id, code, name, name_en, name_ar, description, description_en, description_ar, parent_group_id, group_type, sort_order, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) RETURNING *`,
      [companyId, finalCode, theName, theName, finalNameAr, description||null, description_en||description||null, description_ar||null, parent_group_id||null, group_type||'main', sort_order||0, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Item group created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create item group', 500);
  }
});

// PUT /:id - Update
router.put('/:id', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name_en, name, name_ar, description, description_en, description_ar, parent_group_id, group_type, sort_order, is_active } = req.body;
    const existing = await pool.query(`SELECT * FROM item_groups WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Item group not found', 404);
    const companyId = (req as any).companyId || (req as any).user?.company_id || existing.rows[0].company_id;
    const theName = name_en || name;
    // Check for duplicates (exclude current record)
    if (code || theName) {
      const conditions: string[] = [];
      const dupParams: any[] = [companyId, id];
      if (code) { dupParams.push(code); conditions.push(`code = $${dupParams.length}`); }
      if (theName) { dupParams.push(theName); conditions.push(`name_en = $${dupParams.length}`); }
      const dupQuery = `SELECT id FROM item_groups WHERE company_id = $1 AND id != $2 AND (${conditions.join(' OR ')}) AND deleted_at IS NULL`;
      const dup = await pool.query(dupQuery, dupParams);
      if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Item group with this code or name already exists', 400);
    }
    const result = await pool.query(
      `UPDATE item_groups SET code=COALESCE($1,code), name=COALESCE($2,name), name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar),
       description=COALESCE($4,description), description_en=COALESCE($5,description_en), description_ar=COALESCE($6,description_ar),
       parent_group_id=$7, group_type=COALESCE($8,group_type), sort_order=COALESCE($9,sort_order),
       is_active=COALESCE($10,is_active), updated_at=NOW()
       WHERE id = $11 AND deleted_at IS NULL RETURNING *`,
      [code, theName, name_ar, description, description_en||description, description_ar, parent_group_id||null, group_type, sort_order, is_active, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'Item group updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update item group', 500);
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM item_groups WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Item group not found', 404);
    await pool.query(`UPDATE item_groups SET deleted_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Item group deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete item group', 500);
  }
});

export default router;
