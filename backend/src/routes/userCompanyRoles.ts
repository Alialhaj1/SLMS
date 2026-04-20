import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import pool from '../db';

const router = Router();

// GET / — List all user-company-role assignments
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        uc.id,
        uc.user_id,
        u.email       AS user_email,
        u.full_name   AS user_name,
        uc.company_id,
        c.name        AS company_name,
        COALESCE(r.name, uc.access_level, 'user') AS role_name,
        uc.created_at AS assigned_at
      FROM user_companies uc
      JOIN users     u ON u.id = uc.user_id
      JOIN companies c ON c.id = uc.company_id
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      LEFT JOIN roles      r  ON r.id = ur.role_id
      WHERE u.deleted_at IS NULL
        AND c.deleted_at IS NULL
      ORDER BY uc.created_at DESC
    `);
    sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error('Error fetching user-company-roles:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
});

// POST / — Create a new assignment
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { user_id, company_id, role } = req.body;
  if (!user_id || !company_id) {
    return res.status(400).json({ success: false, error: 'user_id and company_id are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert user_companies
    await client.query(
      `INSERT INTO user_companies (user_id, company_id, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, company_id) DO NOTHING`,
      [user_id, company_id, (req as any).user?.id]
    );

    // If a role name was specified, resolve and assign it
    if (role) {
      const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].id;
        await client.query(
          `INSERT INTO user_roles (user_id, role_id, company_id, assigned_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [user_id, roleId, company_id, (req as any).user?.id]
        );
      }
    }

    await client.query('COMMIT');
    sendSuccess(res, { message: 'Assignment created' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error creating user-company-role:', err);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  } finally {
    client.release();
  }
});

// DELETE /:id — Remove assignment by user_companies id
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM user_companies WHERE id = $1', [id]);
    sendSuccess(res, { message: 'Assignment removed' });
  } catch (err: any) {
    console.error('Error removing assignment:', err);
    res.status(500).json({ success: false, error: 'Failed to remove assignment' });
  }
});

export default router;
