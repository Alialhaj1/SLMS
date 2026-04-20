import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `SELECT * FROM transaction_defaults WHERE deleted_at IS NULL`;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (transaction_type ILIKE $${params.length} OR default_account_code ILIKE $${params.length})`;
    }

    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      params.push(tenantId);
      query += ` AND company_id = $${params.length}`;
    }
    
    query += ` ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM transaction_defaults WHERE deleted_at IS NULL`);
    
    sendSuccess(res, { 
      data: result.rows, 
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch transaction defaults', 500);
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { default_account_code, payment_terms, tax_code, warehouse } = req.body;
    const result = await pool.query(
      `UPDATE transaction_defaults SET default_account_code=$1, payment_terms=$2, tax_code=$3, warehouse=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 AND deleted_at IS NULL RETURNING *`,
      [default_account_code, payment_terms, tax_code, warehouse, req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Transaction default not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to update transaction default', 500);
  }
});

export default router;
