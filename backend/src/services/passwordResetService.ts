/**
 * Password Reset Service
 * Purpose: Admin-controlled password reset system (no self-service)
 * Security: No user existence leakage, all responses identical
 */

import pool from '../db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// =============================================
// Types & Interfaces
// =============================================

export interface PasswordResetRequest {
  id: number;
  user_id: number;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  handled_by: number | null;
  handled_at: Date | null;
  admin_notes: string | null;
  temp_password_expires_at: Date | null;
  temp_password_used: boolean;
  requested_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PasswordResetRequestWithUser extends PasswordResetRequest {
  user_email: string;
  user_name: string;
  user_status: string;
  handler_email: string | null;
}

interface RequestResetMeta {
  ipAddress: string;
  userAgent: string;
  reason?: string;
}

interface ApproveRequestOptions {
  adminId: number;
  adminNotes?: string;
  expiresInHours?: number; // Default 24 hours
}

interface RejectRequestOptions {
  adminId: number;
  reason: string;
}

interface TempPassword {
  plainText: string;
  hash: string;
  expiresAt: Date;
}

// =============================================
// Password Reset Service
// =============================================

export class PasswordResetService {
  
  /**
   * Request password reset (Public endpoint)
   * Security: Never reveals if user exists or not
   * Creates notification for admins if user exists
   */
  static async requestReset(email: string, meta: RequestResetMeta): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user exists (but don't leak this info in response)
      const userResult = await client.query(
        'SELECT id, email, full_name, status FROM users WHERE email = $1 AND deleted_at IS NULL',
        [email]
      );
      
      // Log attempt regardless of user existence (security audit)
      await client.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, user_agent, before_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userResult.rows[0]?.id || null,
          'password_reset_requested',
          'password_reset_requests',
          null,
          meta.ipAddress,
          meta.userAgent,
          JSON.stringify({ 
            email, 
            user_exists: userResult.rowCount > 0,
            reason: meta.reason || null
          })
        ]
      );
      
      // Only create request if user exists
      if (userResult.rowCount > 0) {
        const user = userResult.rows[0];
        
        // Check if user is already disabled/locked
        if (user.status === 'disabled') {
          // Log but still return success (don't leak user status)
          await client.query(
            `INSERT INTO audit_logs (user_id, action, table_name, ip_address, user_agent, before_data)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              user.id,
              'password_reset_blocked',
              'password_reset_requests',
              meta.ipAddress,
              meta.userAgent,
              JSON.stringify({ reason: 'user_disabled' })
            ]
          );
          await client.query('COMMIT');
          return; // Silent return - no error
        }
        
        // Create password reset request
        const requestResult = await client.query(
          `INSERT INTO password_reset_requests 
           (user_id, reason, ip_address, user_agent, status, requested_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING id`,
          [user.id, meta.reason || null, meta.ipAddress, meta.userAgent, 'pending']
        );
        
        const requestId = requestResult.rows[0].id;
        
        // Create notification for admins with password_requests:view permission
        // Get all roles that have this permission
        const rolesResult = await client.query(
          `SELECT DISTINCT r.id, r.name
           FROM roles r
           JOIN role_permissions rp ON r.id = rp.role_id
           JOIN permissions p ON rp.permission_id = p.id
           WHERE p.permission_code = 'password_requests:view'
             AND r.deleted_at IS NULL`
        );
        
        // Create notification for each role
        for (const role of rolesResult.rows) {
          await client.query(
            `INSERT INTO notifications 
             (type, category, priority, title_key, message_key, payload, target_role_id, 
              related_entity_type, related_entity_id, action_url, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
              'password_reset_request',
              'admin',
              'normal',
              'notifications.password_reset.title',
              'notifications.password_reset.message',
              JSON.stringify({
                user_email: user.email,
                user_name: user.full_name,
                request_id: requestId,
                reason: meta.reason || null
              }),
              role.id,
              'password_reset_request',
              requestId,
              `/admin/password-requests/${requestId}`
            ]
          );
        }
        
        // Log successful request creation
        await client.query(
          `INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, user_agent, after_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user.id,
            'password_reset_request_created',
            'password_reset_requests',
            requestId,
            meta.ipAddress,
            meta.userAgent,
            JSON.stringify({ request_id: requestId, status: 'pending' })
          ]
        );
      }
      
      await client.query('COMMIT');
      
      // Always return void - no information leaked
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get all password reset requests (Admin only)
   * Includes user details and handler information
   */
  static async getRequests(options?: {
    status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
    limit?: number;
    offset?: number;
  }): Promise<{ requests: PasswordResetRequestWithUser[]; total: number }> {
    const { status, limit = 20, offset = 0 } = options || {};
    
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      whereClause += ` AND prr.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Get requests with user details
    const query = `
      SELECT 
        prr.*,
        u.email AS user_email,
        u.full_name AS user_name,
        u.status AS user_status,
        handler.email AS handler_email
      FROM password_reset_requests prr
      JOIN users u ON prr.user_id = u.id
      LEFT JOIN users handler ON prr.handled_by = handler.id
      ${whereClause}
      ORDER BY prr.requested_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const [requestsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(
        `SELECT COUNT(*) FROM password_reset_requests prr ${whereClause}`,
        queryParams.slice(0, -2) // Remove limit and offset
      )
    ]);
    
    return {
      requests: requestsResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }
  
  /**
   * Get single password reset request by ID
   */
  static async getRequestById(requestId: number): Promise<PasswordResetRequestWithUser | null> {
    const result = await pool.query(
      `SELECT 
         prr.*,
         u.email AS user_email,
         u.full_name AS user_name,
         u.status AS user_status,
         handler.email AS handler_email
       FROM password_reset_requests prr
       JOIN users u ON prr.user_id = u.id
       LEFT JOIN users handler ON prr.handled_by = handler.id
       WHERE prr.id = $1`,
      [requestId]
    );
    
    return result.rows[0] || null;
  }
  
  /**
   * Approve password reset request
   * Generates temporary password and notifies user
   */
  static async approveRequest(
    requestId: number, 
    options: ApproveRequestOptions
  ): Promise<TempPassword> {
    const { adminId, adminNotes, expiresInHours = 24 } = options;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get request details
      const requestResult = await client.query(
        `SELECT prr.*, u.email, u.full_name
         FROM password_reset_requests prr
         JOIN users u ON prr.user_id = u.id
         WHERE prr.id = $1`,
        [requestId]
      );
      
      if (requestResult.rowCount === 0) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      
      const request = requestResult.rows[0];
      
      if (request.status !== 'pending') {
        throw new Error('REQUEST_ALREADY_HANDLED');
      }
      
      // Generate temporary password
      const tempPassword = this.generateTempPassword();
      const tempPasswordHash = await bcrypt.hash(tempPassword.plainText, 10);
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
      
      // Update request
      await client.query(
        `UPDATE password_reset_requests
         SET status = 'approved',
             handled_by = $1,
             handled_at = NOW(),
             admin_notes = $2,
             temp_password_hash = $3,
             temp_password_expires_at = $4
         WHERE id = $5`,
        [adminId, adminNotes || null, tempPasswordHash, expiresAt, requestId]
      );
      
      // Update user - set must_change_password flag
      await client.query(
        `UPDATE users
         SET must_change_password = true
         WHERE id = $1`,
        [request.user_id]
      );
      
      // Create notification for user
      await client.query(
        `INSERT INTO notifications
         (type, category, priority, title_key, message_key, payload, target_user_id,
          related_entity_type, related_entity_id, action_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          'password_reset_approved',
          'user',
          'high',
          'notifications.password_approved.title',
          'notifications.password_approved.message',
          JSON.stringify({
            expires_at: expiresAt.toISOString(),
            expires_hours: expiresInHours
          }),
          request.user_id,
          'password_reset_request',
          requestId,
          '/change-password'
        ]
      );
      
      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, user_agent, after_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          adminId,
          'password_reset_approved',
          'password_reset_requests',
          requestId,
          null,
          null,
          JSON.stringify({
            request_id: requestId,
            user_id: request.user_id,
            user_email: request.email,
            expires_at: expiresAt.toISOString(),
            admin_notes: adminNotes
          })
        ]
      );
      
      await client.query('COMMIT');
      
      return {
        plainText: tempPassword.plainText,
        hash: tempPasswordHash,
        expiresAt
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Reject password reset request
   * Notifies user (optional) and logs action
   */
  static async rejectRequest(
    requestId: number,
    options: RejectRequestOptions
  ): Promise<void> {
    const { adminId, reason } = options;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get request details
      const requestResult = await client.query(
        `SELECT prr.*, u.email, u.full_name
         FROM password_reset_requests prr
         JOIN users u ON prr.user_id = u.id
         WHERE prr.id = $1`,
        [requestId]
      );
      
      if (requestResult.rowCount === 0) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      
      const request = requestResult.rows[0];
      
      if (request.status !== 'pending') {
        throw new Error('REQUEST_ALREADY_HANDLED');
      }
      
      // Update request
      await client.query(
        `UPDATE password_reset_requests
         SET status = 'rejected',
             handled_by = $1,
             handled_at = NOW(),
             admin_notes = $2
         WHERE id = $3`,
        [adminId, reason, requestId]
      );
      
      // Optional: Create notification for user (disabled by default for security)
      // Uncomment if you want to notify users about rejection
      /*
      await client.query(
        `INSERT INTO notifications
         (type, category, priority, title_key, message_key, target_user_id,
          related_entity_type, related_entity_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          'password_reset_rejected',
          'user',
          'low',
          'notifications.password_rejected.title',
          'notifications.password_rejected.message',
          request.user_id,
          'password_reset_request',
          requestId
        ]
      );
      */
      
      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          adminId,
          'password_reset_rejected',
          'password_reset_requests',
          requestId,
          JSON.stringify({
            request_id: requestId,
            user_id: request.user_id,
            user_email: request.email,
            reason
          })
        ]
      );
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Generate secure temporary password
   * Requirements: 12 chars, uppercase, lowercase, numbers, symbols
   */
  private static generateTempPassword(): { plainText: string } {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    
    // Generate 12-character password
    let password = '';
    
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill remaining with random chars
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    return { plainText: password };
  }
  
  /**
   * Mark temporary password as used
   * Called after user successfully logs in with temp password
   */
  static async markTempPasswordUsed(userId: number): Promise<void> {
    await pool.query(
      `UPDATE password_reset_requests
       SET temp_password_used = true
       WHERE user_id = $1 
         AND status = 'approved' 
         AND temp_password_used = false`,
      [userId]
    );
  }
  
  /**
   * Check if user has valid temporary password
   * Returns request ID if valid, null otherwise
   */
  static async hasValidTempPassword(userId: number): Promise<{
    hasTemp: boolean;
    requestId?: number;
    expiresAt?: Date;
  }> {
    const result = await pool.query(
      `SELECT id, temp_password_expires_at
       FROM password_reset_requests
       WHERE user_id = $1
         AND status = 'approved'
         AND temp_password_used = false
         AND temp_password_expires_at > NOW()
       ORDER BY temp_password_expires_at DESC
       LIMIT 1`,
      [userId]
    );
    
    if (result.rowCount === 0) {
      return { hasTemp: false };
    }
    
    return {
      hasTemp: true,
      requestId: result.rows[0].id,
      expiresAt: result.rows[0].temp_password_expires_at
    };
  }
  
  /**
   * Cancel own password reset request (User action)
   */
  static async cancelRequest(requestId: number, userId: number): Promise<void> {
    const result = await pool.query(
      `UPDATE password_reset_requests
       SET status = 'cancelled'
       WHERE id = $1 
         AND user_id = $2 
         AND status = 'pending'
       RETURNING id`,
      [requestId, userId]
    );
    
    if (result.rowCount === 0) {
      throw new Error('REQUEST_NOT_FOUND_OR_ALREADY_HANDLED');
    }
    
    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'password_reset_cancelled', 'password_reset_requests', requestId]
    );
  }
}
