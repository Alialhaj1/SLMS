import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../db';

const router = Router();

// GET /api/user-assignments - List assignments for a user
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : null;

    if (!userId || !Number.isFinite(userId)) {
      return sendError(res, 'VALIDATION_ERROR', 'user_id query parameter is required', 400);
    }

    const result = await pool.query(
      `SELECT uc.id, uc.user_id, uc.company_id, c.name as company_name,
              uc.access_level, uc.is_default, uc.is_active, uc.created_at
       FROM user_companies uc
       JOIN companies c ON c.id = uc.company_id
       WHERE uc.user_id = $1
       ORDER BY uc.is_default DESC, c.name ASC`,
      [userId]
    );

    sendSuccess(res, result.rows);
  } catch (error: any) {
    console.error('Error fetching user assignments:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch user assignments', 500);
  }
});

// POST /api/user-assignments - Assign user to company
router.post('/', authenticate, requirePermission('users:edit'), async (req: any, res: any) => {
  try {
    const { user_id, company_id, access_level, is_default } = req.body || {};

    if (!user_id || !company_id) {
      return sendError(res, 'VALIDATION_ERROR', `user_id and company_id are required. Got body keys: [${Object.keys(req.body || {}).join(',')}] body: ${JSON.stringify(req.body).substring(0, 200)}`, 400);
    }

    // Check if assignment already exists
    const existing = await pool.query(
      'SELECT id FROM user_companies WHERE user_id = $1 AND company_id = $2',
      [user_id, company_id]
    );

    if (existing.rows.length > 0) {
      // Update existing assignment
      const result = await pool.query(
        `UPDATE user_companies 
         SET access_level = COALESCE($3, access_level),
             is_default = COALESCE($4, is_default),
             is_active = true
         WHERE user_id = $1 AND company_id = $2
         RETURNING *`,
        [user_id, company_id, access_level || 'standard', is_default || false]
      );
      return sendSuccess(res, result.rows[0], 200);
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query(
        'UPDATE user_companies SET is_default = false WHERE user_id = $1',
        [user_id]
      );
    }

    const result = await pool.query(
      `INSERT INTO user_companies (user_id, company_id, access_level, is_default, is_active, created_by)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [user_id, company_id, access_level || 'standard', is_default || false, req.user?.id]
    );

    sendSuccess(res, result.rows[0], 201);
  } catch (error: any) {
    console.error('Error creating user assignment:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to create user assignment', 500);
  }
});

// DELETE /api/user-assignments/:id - Remove assignment
router.delete('/:id', authenticate, requirePermission('users:edit'), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE user_companies SET is_active = false WHERE id = $1',
      [parseInt(id, 10)]
    );

    sendSuccess(res, { message: 'Assignment removed' });
  } catch (error: any) {
    console.error('Error removing user assignment:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to remove assignment', 500);
  }
});

export default router;
