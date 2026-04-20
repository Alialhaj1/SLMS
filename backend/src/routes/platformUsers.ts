import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { isProtectedSuperAdmin } from '../middleware/goldenRules';
import pool from '../db';

const router = Router();

// GET /api/platform/users - List all platform users
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = '1', limit = '20', search = '' } = req.query as Record<string, string>;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));

    let whereClause = 'WHERE u.deleted_at IS NULL';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const usersResult = await pool.query(
      `SELECT u.id, u.full_name as name, u.email, u.status,
              u.last_login_at as last_login, u.created_at, u.is_tenant_admin, u.is_system_account,
              u.tenant_id
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, safeLimit, offset]
    );

    // Attach role info
    const users = await Promise.all(usersResult.rows.map(async (u: any) => {
      const rolesRes = await pool.query(
        `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
        [u.id]
      );
      return {
        ...u,
        role: rolesRes.rows.map((r: any) => r.name).join(', ') || 'No role',
      };
    }));

    res.json({ success: true, data: users, total });
  } catch (err: any) {
    console.error('Error fetching platform users:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// ============================================================================
// POST /api/platform/users — Create a new platform user
// ============================================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password, phone, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
       RETURNING id, full_name as name, email, phone, status, created_at`,
      [name, email, hashedPassword, phone || null]
    );

    // Assign role if specified
    if (role) {
      const roleRow = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleRow.rows.length > 0) {
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [result.rows[0].id, roleRow.rows[0].id]
        );
      }
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('Error creating platform user:', err);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// ============================================================================
// PUT /api/platform/users/:id — Update an existing platform user
// ============================================================================
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const { name, email, phone, password, role } = req.body;

    // Build dynamic SET clause
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (name !== undefined)  { sets.push(`full_name = $${idx}`); params.push(name); idx++; }
    if (email !== undefined) { sets.push(`email = $${idx}`); params.push(email); idx++; }
    if (phone !== undefined) { sets.push(`phone = $${idx}`); params.push(phone || null); idx++; }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
      sets.push(`password = $${idx}`); params.push(hashedPassword); idx++;
    }
    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING id, full_name as name, email, phone, status, created_at`,
      params
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update role if specified
    if (role) {
      const roleRow = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleRow.rows.length > 0) {
        await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [userId, roleRow.rows[0].id]
        );
      }
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('Error updating platform user:', err);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// ============================================================================
// §17.1.5 — Super Admin Protection: Block deletion of protected accounts
// ============================================================================

/**
 * DELETE /api/platform/users/:id → 403 if target is super_admin
 * Prevents deletion of the protected super_admin account.
 */
router.delete('/:id', authenticate, async (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  if (!Number.isFinite(targetUserId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid user ID',
    });
  }

  const isProtected = await isProtectedSuperAdmin(targetUserId);
  if (isProtected) {
    return res.status(403).json({
      success: false,
      error: 'This account is protected and cannot be deleted',
      error_ar: 'هذا الحساب محمي ولا يمكن حذفه',
      code: 'PROTECTED_SUPER_ADMIN',
    });
  }

  // For non-super-admin users, soft delete
  try {
    const result = await pool.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [targetUserId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting platform user:', err);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

export default router;
