import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  
  try {
    const userId = user.sub || user.id;
    
    // Fetch permissions from database
    const permissionsResult = await pool.query(
      `
      SELECT DISTINCT permission_code
      FROM (
        SELECT p.permission_code
        FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        JOIN user_roles ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = $1

        UNION

        SELECT jsonb_array_elements_text(r.permissions) as permission_code
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
      ) t
      ORDER BY permission_code
      `,
      [userId]
    );
    const permissions = permissionsResult.rows.map((x: any) => x.permission_code);
    
    // Fetch user details
    const userResult = await pool.query(
      'SELECT id, email, full_name, preferred_language, status, must_change_password, last_login_at, profile_image, cover_image FROM users WHERE id = $1',
      [userId]
    );
    const userDetails = userResult.rows[0] || {};
    
    res.json({
      success: true,
      data: {
        id: userId,
        email: user.email,
        full_name: userDetails.full_name || '',
        roles: user.roles || [],
        permissions: permissions,
        preferred_language: userDetails.preferred_language || 'en',
        status: userDetails.status || 'active',
        must_change_password: userDetails.must_change_password || false,
        last_login_at: userDetails.last_login_at || null,
        profile_image: userDetails.profile_image || null,
        cover_image: userDetails.cover_image || null,
        jti: user.jti || null
      }
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      message: error.message
    });
  }
});

export default router;
