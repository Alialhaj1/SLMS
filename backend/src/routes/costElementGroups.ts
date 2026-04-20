import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { loadCompanyContext } from '../middleware/companyContext';
import pool from '../db';

const router = Router();

router.use(authenticate, loadCompanyContext);

router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT *, name_en AS name FROM cost_element_groups WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }

    if (companyId) {
      params.push(companyId);
      query += ` AND company_id = $${params.length}`;
    } else {
      return sendSuccess(res, { data: [], total: 0, page: Number(page), limit: Number(limit) });
    }
    
    query += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM cost_element_groups WHERE deleted_at IS NULL AND company_id = $1`,
      [companyId]
    );
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch cost element groups', 500);
  }
});

export default router;
