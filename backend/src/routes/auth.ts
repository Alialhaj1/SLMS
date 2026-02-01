import { Router, Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcryptjs';
import { authRateLimiter, settingsRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import { AuthService } from '../services/authService';
import { NotificationService } from '../services/notificationService';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();
const LOCK_DURATION_MINUTES = parseInt(process.env.LOCK_DURATION_MINUTES || '30');

// Extended Request type with user
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
  };
}

router.post('/register', async (req, res) => {
  const { email, password, full_name, role } = req.body;
  
  if (!email || !password) {
    return sendError(res, 'VALIDATION_ERROR', 'Email and password are required', 400);
  }
  
  const client = await pool.connect();
  try {
    const hashed = await bcrypt.hash(password, 10);
    await client.query('BEGIN');
    
    const r = await client.query(
      'INSERT INTO users(email,password,full_name) VALUES($1,$2,$3) RETURNING id,email', 
      [email, hashed, full_name]
    );
    const userId = r.rows[0].id;
    
    if (role) {
      const rm = await client.query('SELECT id FROM roles WHERE name=$1', [role]);
      if (rm.rowCount && rm.rowCount > 0) {
        await client.query('INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)', [userId, rm.rows[0].id]);
      }
    }
    
    await client.query('COMMIT');
    return sendSuccess(res, { id: userId, email }, 201);
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('User registration failed', error, { email });
    
    // Check for duplicate email
    if (error.code === '23505') { // Postgres unique violation
      return sendError(res, 'EMAIL_EXISTS', 'Email already registered', 409);
    }
    
    return sendError(res, 'SERVER_ERROR', 'Failed to create user', 500);
  } finally { 
    client.release(); 
  }
});

router.post('/login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return sendError(res, 'VALIDATION_ERROR', 'Email and password are required', 400);
  }

  try {
    const result = await AuthService.login(
      email, 
      password, 
      req.ip || 'unknown', 
      req.get('user-agent') || 'unknown'
    );

    // Check if user must change password before granting access
    if (result.must_change_password) {
      return sendSuccess(res, {
        must_change_password: true,
        message: 'You must change your password before accessing the system',
        redirect_to: '/auth/change-password',
        temp_token: result.accessToken // Limited token for password change only
      }, 200);
    }

    return sendSuccess(res, result, 200);
  } catch (error: any) {
    logger.error('Login failed', error, { email });

    // Handle specific errors
    if (error.message === 'INVALID_CREDENTIALS') {
      return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (error.message === 'ACCOUNT_DISABLED') {
      return sendError(res, 'ACCOUNT_DISABLED', 'Account disabled. Contact administrator.', 403);
    }

    if (error.message === 'ACCOUNT_LOCKED' || error.message === 'ACCOUNT_LOCKED_BY_FAILED_ATTEMPTS') {
      return sendError(res, 'ACCOUNT_LOCKED', `Account locked due to multiple failed login attempts. Try again in ${LOCK_DURATION_MINUTES} minutes.`, 403);
    }

    return sendError(res, 'SERVER_ERROR', 'Login failed', 500);
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return sendError(res, 'VALIDATION_ERROR', 'Refresh token is required', 400);
  }

  try {
    const result = await AuthService.refreshToken(
      refreshToken, 
      req.ip || 'unknown', 
      req.get('user-agent') || 'unknown'
    );

    return sendSuccess(res, result, 200);
  } catch (error: any) {
    logger.error('Token refresh failed', error);

    // Handle specific errors
    if (error.message === 'INVALID_REFRESH_TOKEN') {
      return sendError(res, 'INVALID_TOKEN', 'Invalid refresh token', 401);
    }

    if (error.message === 'REFRESH_TOKEN_REVOKED') {
      return sendError(res, 'TOKEN_REVOKED', 'Refresh token revoked', 401);
    }

    if (error.message === 'REFRESH_TOKEN_EXPIRED') {
      return sendError(res, 'TOKEN_EXPIRED', 'Refresh token expired', 401);
    }

    return sendError(res, 'SERVER_ERROR', 'Token refresh failed', 500);
  }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return sendError(res, 'VALIDATION_ERROR', 'Refresh token is required', 400);
  }

  try {
    await AuthService.logout(
      refreshToken, 
      req.ip || 'unknown', 
      req.get('user-agent') || 'unknown'
    );

    return sendSuccess(res, { message: 'Logged out successfully' }, 200);
  } catch (error: any) {
    logger.error('Logout failed', error);
    return sendError(res, 'SERVER_ERROR', 'Logout failed', 500);
  }
});

/**
 * POST /api/auth/change-password
 * Change password (both forced and voluntary)
 * Rate limited: 5 attempts per hour
 */
router.post('/change-password', authenticate, settingsRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    const userId = req.user!.id;

    // Validation
    if (!current_password || !new_password || !confirm_password) {
      return sendError(res, 'VALIDATION_ERROR', 'All fields are required', 400);
    }

    if (new_password !== confirm_password) {
      return sendError(res, 'VALIDATION_ERROR', 'New passwords do not match', 400);
    }

    if (new_password.length < 8) {
      return sendError(res, 'VALIDATION_ERROR', 'New password must be at least 8 characters', 400);
    }

    // Password strength check (basic)
    const hasUpperCase = /[A-Z]/.test(new_password);
    const hasLowerCase = /[a-z]/.test(new_password);
    const hasNumber = /[0-9]/.test(new_password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return sendError(res, 'VALIDATION_ERROR', 'Password must contain uppercase, lowercase, and numbers', 400);
    }

    // Change password
    await AuthService.changePassword(
      userId,
      current_password,
      new_password,
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    );

    return sendSuccess(res, {
      message: 'Password changed successfully. Please login again.'
    }, 200);

  } catch (error: any) {
    logger.error('Change password failed', error, { userId: req.user?.id });

    if (error.message === 'USER_NOT_FOUND') {
      return sendError(res, 'NOT_FOUND', 'User not found', 404);
    }

    if (error.message === 'INVALID_CURRENT_PASSWORD') {
      return sendError(res, 'INVALID_PASSWORD', 'Current password is incorrect', 400);
    }

    return sendError(res, 'SERVER_ERROR', 'Failed to change password', 500);
  }
});

/**
 * GET /api/auth/me
 * Get authenticated user details
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const userDetails = await AuthService.getUserDetails(userId);

    if (!userDetails) {
      return sendError(res, 'NOT_FOUND', 'User not found', 404);
    }

    return sendSuccess(res, userDetails, 200);

  } catch (error: any) {
    logger.error('Get user details failed', error, { userId: req.user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch user details', 500);
  }
});

/**
 * PATCH /api/auth/me/language
 * Update user language preference
 */
router.patch('/me/language', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { language } = req.body;
    const userId = req.user!.id;

    // Validation
    if (!language) {
      return sendError(res, 'VALIDATION_ERROR', 'Language is required', 400);
    }

    if (!['ar', 'en'].includes(language)) {
      return sendError(res, 'VALIDATION_ERROR', 'Language must be either "ar" or "en"', 400);
    }

    await AuthService.updateLanguage(userId, language);

    return sendSuccess(res, {
      message: 'Language updated successfully',
      language
    }, 200);

  } catch (error: any) {
    logger.error('Update language failed', error, { userId: req.user?.id, language: req.body?.language });
    return sendError(res, 'SERVER_ERROR', 'Failed to update language', 500);
  }
});

/**
 * POST /api/auth/request-password-reset
 * Request password reset - sends notification to admins
 * Public endpoint (no authentication required)
 * Only allows registered emails to request password reset
 * Rate limited to prevent abuse
 */
router.post('/request-password-reset', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, reason } = req.body;

    // Validation
    if (!email) {
      return sendError(res, 'VALIDATION_ERROR', 'Email is required', 400);
    }

    // Check if user exists - reject if email not registered
    const userResult = await pool.query(
      'SELECT id, email, full_name FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      // Reject unregistered emails
      return sendError(res, 'NOT_FOUND', 'This email is not registered in the system', 404);
    }

    const user = userResult.rows[0];

    // Check if there's already a pending request (within last 24 hours)
    const existingRequest = await pool.query(
      `SELECT id FROM notifications 
       WHERE type = 'password_reset_request' 
       AND payload->>'requester_email' = $1 
       AND dismissed_at IS NULL 
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [email.toLowerCase().trim()]
    );

    if (existingRequest.rows.length > 0) {
      return sendSuccess(res, {
        message: 'A password reset request has already been submitted. Please wait for administrator response.'
      }, 200);
    }

    // Get super_admin role ID
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = 'super_admin'"
    );

    if (roleResult.rows.length === 0) {
      logger.error('super_admin role not found');
      return sendError(res, 'SERVER_ERROR', 'System configuration error', 500);
    }

    const superAdminRoleId = roleResult.rows[0].id;

    // Create notification for admins
    await NotificationService.create({
      type: 'password_reset_request',
      category: 'admin',
      priority: 'high',
      titleKey: 'notifications.passwordResetRequest.title',
      messageKey: 'notifications.passwordResetRequest.message',
      payload: {
        requester_id: user.id,
        requester_email: user.email,
        requester_name: user.full_name || user.email,
        reason: reason || 'User forgot password',
        requested_at: new Date().toISOString(),
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown'
      },
      targetRoleId: superAdminRoleId,
      actionUrl: `/admin/users/${user.id}/edit`,
      relatedEntityType: 'user',
      relatedEntityId: user.id
    });

    // Log the request
    logger.info('Password reset request submitted', { 
      email: user.email, 
      userId: user.id,
      ip: req.ip 
    });

    return sendSuccess(res, {
      message: 'Password reset request has been sent to the administrator. You will be contacted shortly.'
    }, 200);

  } catch (error: any) {
    logger.error('Password reset request failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to submit password reset request', 500);
  }
});

export default router;
