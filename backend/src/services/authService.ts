/**
 * Authentication Service
 * Business logic for authentication, user status checks, and login history
 */

import pool from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { config } from '../config/env';
import { NotificationService } from './notificationService';
import { PasswordResetService } from './passwordResetService';
import { encryptPassword } from '../utils/passwordEncryption';
import { MFAService } from './mfaService';
import { trackFailedLogin } from './securityAlertService';
import { PolicyService } from './policyService';

const ACCESS_EXP: string | number = config.JWT_ACCESS_EXPIRATION;
const REFRESH_EXP_SECONDS_DEFAULT = 60 * 60 * 24 * 30; // 30 days fallback
const MAX_FAILED_ATTEMPTS_DEFAULT = parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5');
const LOCK_DURATION_MINUTES_DEFAULT = parseInt(process.env.LOCK_DURATION_MINUTES || '30');

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    roles: string[];
    permissions?: string[];
    tenant_id?: number | null;
    is_platform_admin?: boolean;
    is_platform_user?: boolean;
    enabled_modules?: string[];
    login_context?: 'platform' | 'tenant';
    default_company_id?: number | null;
    default_company_name?: string | null;
  };
  must_change_password?: boolean;
  redirect_to?: string;
  login_context?: 'platform' | 'tenant';
}

interface UserStatusCheck {
  isValid: boolean;
  status: 'active' | 'disabled' | 'locked';
  reason?: string;
  minutesRemaining?: number;
}

export class AuthService {
  /**
   * Sign JWT access token
   * NOTE: Permissions are NOT included in JWT to keep token size small.
   * Permissions are returned in login response and stored client-side,
   * and can be fetched via /api/me endpoint.
   */
  private static async signAccessToken(user: any, jti: string): Promise<string> {
    const payload: any = { 
      sub: user.id, 
      email: user.email, 
      roles: user.roles || [], 
      // permissions excluded to reduce JWT size - fetch from /api/me instead
      jti 
    };
    
    // Include tenant_id in JWT for multi-tenant scoping
    // null = platform admin, number = tenant user
    if (user.tenant_id !== undefined) {
      payload.tenant_id = user.tenant_id;
    }

    // Include login_context for dashboard routing
    if (user.login_context) {
      payload.login_context = user.login_context;
    }
    
    // Use session_timeout_minutes from system_policies (falls back to env/default)
    const sessionMinutes = await PolicyService.sessionTimeoutMinutes();
    const expiresIn = sessionMinutes > 0 ? `${sessionMinutes}m` : (ACCESS_EXP as string);
    
    const options: jwt.SignOptions = { 
      expiresIn: expiresIn as jwt.SignOptions['expiresIn']
    };
    return jwt.sign(payload, config.JWT_SECRET, options);
  }

  /**
   * Hash refresh token
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Check user status (disabled/locked)
   */
  static async checkUserStatus(user: any): Promise<UserStatusCheck> {
    // Check if disabled
    if (user.status === 'disabled') {
      return {
        isValid: false,
        status: 'disabled',
        reason: 'Account disabled. Contact administrator.'
      };
    }

    // Check if locked
    if (user.status === 'locked' && user.locked_until) {
      const now = new Date();
      const lockExpiry = new Date(user.locked_until);
      
      if (now < lockExpiry) {
        const minutesRemaining = Math.ceil((lockExpiry.getTime() - now.getTime()) / 60000);
        return {
          isValid: false,
          status: 'locked',
          reason: `Account locked due to multiple failed login attempts. Try again in ${minutesRemaining} minute(s).`,
          minutesRemaining
        };
      } else {
        // Lock expired - auto-unlock
        await pool.query(
          'UPDATE users SET status=$1, locked_until=NULL, failed_login_count=0, status_updated_at=CURRENT_TIMESTAMP WHERE id=$2',
          ['active', user.id]
        );
        return { isValid: true, status: 'active' };
      }
    }

    return { isValid: true, status: 'active' };
  }

  /**
   * Handle failed login attempt
   */
  private static async handleFailedLogin(userId: number, ipAddress: string, userAgent: string): Promise<{ locked: boolean; lockUntil?: Date }> {
    // Track for brute force detection alerting
    trackFailedLogin(ipAddress);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current failed count
      const userResult = await client.query(
        'SELECT failed_login_count FROM users WHERE id=$1',
        [userId]
      );
      
      const newFailedCount = (userResult.rows[0].failed_login_count || 0) + 1;

      // Update failed count
      await client.query(
        'UPDATE users SET failed_login_count=$1, last_failed_login_at=CURRENT_TIMESTAMP WHERE id=$2',
        [newFailedCount, userId]
      );

      // Check if should lock — use dynamic policy values
      const maxAttempts = await PolicyService.maxLoginAttempts() || MAX_FAILED_ATTEMPTS_DEFAULT;
      const lockMinutes = await PolicyService.lockoutDurationMinutes() || LOCK_DURATION_MINUTES_DEFAULT;
      if (newFailedCount >= maxAttempts) {
        const lockUntil = new Date(Date.now() + lockMinutes * 60000);
        
        await client.query(
          'UPDATE users SET status=$1, locked_until=$2, status_updated_at=CURRENT_TIMESTAMP WHERE id=$3',
          ['locked', lockUntil.toISOString(), userId]
        );

        // Log auto-lock event
        await client.query(
          'INSERT INTO audit_logs(user_id,action,resource,resource_id,after_data,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [
            userId, 
            'user_auto_locked', 
            'auth', 
            userId, 
            JSON.stringify({ 
              reason: 'max_failed_attempts', 
              failed_count: newFailedCount, 
              locked_until: lockUntil.toISOString() 
            }), 
            ipAddress, 
            userAgent
          ]
        );

        // Log to login_history (use login_failed for account lock event)
        await client.query(
          'INSERT INTO login_history(user_id,activity_type,ip_address,user_agent,failed_reason,created_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',
          [userId, 'login_failed', ipAddress, userAgent, 'account_locked_max_attempts']
        );

        await client.query('COMMIT');
        return { locked: true, lockUntil };
      }

      // Log failed attempt
      await client.query(
        'INSERT INTO login_history(user_id,activity_type,ip_address,user_agent,failed_reason,created_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',
        [userId, 'login_failed', ipAddress, userAgent, 'wrong_password']
      );

      await client.query('COMMIT');
      return { locked: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Log successful login and detect suspicious activity
   */
  private static async logSuccessfulLogin(userId: number, ipAddress: string, userAgent: string): Promise<boolean> {
    try {
      // Detect suspicious login before updating
      let isSuspicious = false;
      try {
        const suspiciousResult = await pool.query(
          'SELECT detect_suspicious_login($1, $2) as is_suspicious',
          [userId, ipAddress]
        );
        isSuspicious = suspiciousResult.rows[0]?.is_suspicious?.suspicious_ip || 
                       suspiciousResult.rows[0]?.is_suspicious?.multiple_ips || 
                       suspiciousResult.rows[0]?.is_suspicious?.new_device || 
                       false;
      } catch (err) {
        // Function might not exist - ignore
      }

      // Reset security counters
      await pool.query(
        `UPDATE users 
         SET failed_login_count = 0,
             last_failed_login_at = NULL,
             last_login_at = CURRENT_TIMESTAMP,
             last_login_ip = $1,
             last_login_user_agent = $2,
             status_updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [ipAddress, userAgent, userId]
      );

      // Log to audit_logs
      await pool.query(
        'INSERT INTO audit_logs(user_id,action,resource,after_data,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6)',
        [userId, 'login', 'auth', JSON.stringify({ success: true, ip: ipAddress }), ipAddress, userAgent]
      );

      // Log to login_history
      await pool.query(
        'INSERT INTO login_history(user_id,activity_type,ip_address,user_agent,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',
        [userId, 'login_success', ipAddress, userAgent]
      );

      // Create security alert if suspicious
      if (isSuspicious) {
        // Get user email for notification payload
        const userResult = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        // Create security alert notification for admins
        NotificationService.createSecurityAlert(
          'suspicious_login',
          'notifications.suspicious_login.title',
          'notifications.suspicious_login.message',
          {
            user_email: user.email,
            user_name: user.full_name,
            ip_address: ipAddress,
            user_agent: userAgent
          },
          {
            relatedEntityType: 'login_history',
            relatedEntityId: userId,
            actionUrl: `/admin/security/login-history?user_id=${userId}`
          }
        ).catch(err => console.error('Failed to create security alert:', err));
      }

      return isSuspicious;
    } catch (error) {
      console.error('Error logging successful login:', error);
      // Don't throw - login should succeed even if logging fails
      return false;
    }
  }

  /**
   * Login user
   * @param tenantId Optional tenant ID for tenant-scoped login
   */
  static async login(
    email: string, 
    password: string, 
    ipAddress: string, 
    userAgent: string,
    tenantId?: number
  ): Promise<LoginResult> {
    const client = await pool.connect();

    try {
      // Fetch user with tenant info (exclude soft-deleted users)
      const userResult = await client.query(
        'SELECT id,email,password,full_name,status,failed_login_count,locked_until,tenant_id,encrypted_password FROM users WHERE email=$1 AND deleted_at IS NULL',
        [email]
      );

      if (userResult.rowCount === 0) {
        // Log failed attempt - user not found (without user_id for security)
        setImmediate(() => {
          pool.query(
            'INSERT INTO audit_logs(action,resource,after_data,ip_address,user_agent) VALUES($1,$2,$3,$4,$5)',
            ['login_failed', 'auth', JSON.stringify({ email, reason: 'user_not_found' }), ipAddress, userAgent]
          ).catch(err => console.error('Audit log error:', err));
        });
        
        throw new Error('INVALID_CREDENTIALS');
      }

      const user = userResult.rows[0];

      // Tenant validation logic:
      // 1. If tenantId is provided (tenant login):
      //    a. Tenant user: must belong to that specific tenant
      //    b. Platform user (tenant_id=NULL):
      //       - Super admins: can access ANY tenant (bypass)
      //       - Other platform users: must have grant in platform_user_tenants
      // 2. If tenantId is NOT provided (platform login):
      //    - User must be a platform user (tenant_id = NULL)
      
      if (tenantId) {
        // Tenant login requested
        if (user.tenant_id !== null && user.tenant_id !== tenantId) {
          // Tenant user belongs to a different tenant
          setImmediate(() => {
            pool.query(
              'INSERT INTO audit_logs(user_id,action,resource,after_data,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6)',
              [user.id, 'login_failed', 'auth', JSON.stringify({ email, reason: 'tenant_mismatch', requested_tenant: tenantId, user_tenant: user.tenant_id }), ipAddress, userAgent]
            ).catch(err => console.error('Audit log error:', err));
          });
          throw new Error('INVALID_CREDENTIALS');
        }
        
        // Platform user accessing a tenant — enforce platform_user_tenants access grant
        if (user.tenant_id === null) {
          // Check if super_admin (bypasses tenant access check)
          const superAdminCheck = await client.query(
            'SELECT id FROM super_admins WHERE user_id = $1',
            [user.id]
          );
          const isSuperAdmin = superAdminCheck.rowCount > 0;
          
          if (!isSuperAdmin) {
            // Non-super-admin platform user: must have explicit grant in platform_user_tenants
            const accessCheck = await client.query(
              'SELECT id FROM platform_user_tenants WHERE user_id = $1 AND tenant_id = $2 AND is_active = true',
              [user.id, tenantId]
            );
            
            if (accessCheck.rowCount === 0) {
              setImmediate(() => {
                pool.query(
                  'INSERT INTO audit_logs(user_id,action,resource,after_data,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6)',
                  [user.id, 'login_failed', 'auth', JSON.stringify({ email, reason: 'tenant_access_denied', requested_tenant: tenantId }), ipAddress, userAgent]
                ).catch(err => console.error('Audit log error:', err));
              });
              throw new Error('TENANT_ACCESS_DENIED');
            }
          }
        }
      } else {
        // Platform admin login (no tenant specified)
        if (user.tenant_id !== null) {
          // User belongs to a tenant but trying to login as platform admin
          setImmediate(() => {
            pool.query(
              'INSERT INTO audit_logs(user_id,action,resource,after_data,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6)',
              [user.id, 'login_failed', 'auth', JSON.stringify({ email, reason: 'platform_login_denied', user_tenant: user.tenant_id }), ipAddress, userAgent]
            ).catch(err => console.error('Audit log error:', err));
          });
          throw new Error('TENANT_LOGIN_REQUIRED');
        }
      }

      // Check user status (disabled/locked)
      const statusCheck = await this.checkUserStatus(user);
      if (!statusCheck.isValid) {
        // Log blocked attempt
        await pool.query(
          'INSERT INTO audit_logs(user_id,action,resource,after_data,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6)',
          [user.id, 'login_blocked', 'auth', JSON.stringify({ email, reason: statusCheck.status }), ipAddress, userAgent]
        );

        throw new Error(statusCheck.status === 'disabled' ? 'ACCOUNT_DISABLED' : 'ACCOUNT_LOCKED');
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);

      if (!passwordValid) {
        // Handle failed login
        const failResult = await this.handleFailedLogin(user.id, ipAddress, userAgent);
        
        if (failResult.locked) {
          throw new Error('ACCOUNT_LOCKED_BY_FAILED_ATTEMPTS');
        }
        
        throw new Error('INVALID_CREDENTIALS');
      }

      // ======================================================================
      // MFA Check - if user has MFA enabled, return pending token instead
      // ======================================================================
      const effectiveTenantIdForMFA = user.tenant_id !== null ? user.tenant_id : (tenantId || null);
      const loginContextForMFA: 'platform' | 'tenant' = tenantId ? 'tenant' : 'platform';

      const mfaRequired = await MFAService.isMFARequired(user.id);
      const mfaNeedsSetup = await MFAService.needsMFASetup(user.id);

      if (mfaRequired && !mfaNeedsSetup) {
        // MFA is enabled - create pending token, require MFA code
        const mfaToken = await MFAService.createPendingToken(
          user.id,
          effectiveTenantIdForMFA,
          loginContextForMFA,
          ipAddress,
          userAgent
        );

        // Log successful password verification (but login not complete)
        setImmediate(() => {
          pool.query(
            'INSERT INTO audit_logs(user_id,action,resource,after_data,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6)',
            [user.id, 'login_mfa_pending', 'auth', JSON.stringify({ email: user.email, mfa_required: true }), ipAddress, userAgent]
          ).catch(err => console.error('Audit log error:', err));
        });

        throw Object.assign(new Error('MFA_REQUIRED'), {
          mfa_token: mfaToken,
          mfa_setup_required: false,
          user_id: user.id
        });
      }

      if (mfaNeedsSetup) {
        // MFA is enforced but not yet set up - create pending token and tell frontend
        const mfaToken = await MFAService.createPendingToken(
          user.id,
          effectiveTenantIdForMFA,
          loginContextForMFA,
          ipAddress,
          userAgent
        );

        throw Object.assign(new Error('MFA_SETUP_REQUIRED'), {
          mfa_token: mfaToken,
          mfa_setup_required: true,
          user_id: user.id
        });
      }
      // ======================================================================

      // Get user roles
      const rolesResult = await client.query(
        'SELECT roles.name FROM roles JOIN user_roles ur ON ur.role_id=roles.id WHERE ur.user_id=$1',
        [user.id]
      );
      const roles = rolesResult.rows.map((x: any) => x.name);

      // Get user permissions
      // Source of truth is role_permissions -> permissions, but we also union legacy roles.permissions JSONB
      // to avoid breaking environments that haven't fully migrated.
      const permissionsResult = await client.query(
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
        [user.id]
      );
      const permissions = permissionsResult.rows.map((x: any) => x.permission_code);

      // Determine effective tenant_id for the session
      // - For super_admin (user.tenant_id = null): use requested tenantId or null (platform mode)
      // - For tenant user: use their tenant_id
      const effectiveTenantId = user.tenant_id !== null ? user.tenant_id : (tenantId || null);

      // Determine login context: 'tenant' if logging in with a tenant code, 'platform' otherwise
      const loginContext: 'platform' | 'tenant' = tenantId ? 'tenant' : 'platform';

      // Update last_login_context on user record
      await client.query(
        'UPDATE users SET last_login_context = $1 WHERE id = $2',
        [loginContext, user.id]
      );

      // Store encrypted password for admin visibility (if not already stored)
      if (!user.encrypted_password) {
        try {
          const encPwd = encryptPassword(password);
          await client.query(
            'UPDATE users SET encrypted_password = $1 WHERE id = $2',
            [encPwd, user.id]
          );
        } catch (e) {
          // Non-critical, don't fail login
          console.error('Failed to store encrypted password:', e);
        }
      }

      // Generate tokens
      const jti = uuidv4();
      const accessToken = await this.signAccessToken({ 
        id: user.id, 
        email: user.email, 
        roles, 
        permissions,
        tenant_id: effectiveTenantId,
        login_context: loginContext 
      }, jti);
      const refreshToken = uuidv4();
      const tokenHash = this.hashToken(refreshToken);
      const refreshExpDays = await PolicyService.refreshTokenExpiryDays() || 30;
      const expiresAt = new Date(Date.now() + refreshExpDays * 86400 * 1000);

      // Store refresh token
      await client.query(
        'INSERT INTO refresh_tokens(token_hash,user_id,jti,expires_at) VALUES($1,$2,$3,$4)',
        [tokenHash, user.id, jti, expiresAt.toISOString()]
      );

      // Log successful login (async)
      setImmediate(() => {
        this.logSuccessfulLogin(user.id, ipAddress, userAgent);
      });

      // Check if user must change password
      const userDetailsResult = await client.query(
        'SELECT must_change_password, preferred_language FROM users WHERE id = $1',
        [user.id]
      );
      const userDetails = userDetailsResult.rows[0];
      const mustChangePassword = userDetails.must_change_password || false;

      // Check if user has valid temporary password
      const tempPasswordCheck = await PasswordResetService.hasValidTempPassword(user.id);
      if (tempPasswordCheck.hasTemp && !mustChangePassword) {
        // Set flag if not already set
        await client.query(
          'UPDATE users SET must_change_password = true WHERE id = $1',
          [user.id]
        );
      }

      // Get enabled modules for this user (for immediate menu rendering)
      let enabledModules: string[] = [];
      if (effectiveTenantId) {
        const modResult = await client.query(
          `SELECT DISTINCT m.module_code FROM modules m
           LEFT JOIN tenant_modules tm ON m.module_code = tm.module_code AND tm.tenant_id = $1
           WHERE m.is_active = true AND (m.is_core = true OR tm.is_enabled = true)`,
          [effectiveTenantId]
        );
        enabledModules = modResult.rows.map((m: any) => m.module_code);
      } else {
        const modResult = await client.query(`SELECT module_code FROM modules WHERE is_active = true`);
        enabledModules = modResult.rows.map((m: any) => m.module_code);
      }

      // Get user's default company
      let defaultCompanyId: number | null = null;
      let defaultCompanyName: string | null = null;
      if (effectiveTenantId) {
        const companyResult = await client.query(
          `SELECT uc.company_id, c.name as company_name
           FROM user_companies uc
           JOIN companies c ON uc.company_id = c.id AND c.deleted_at IS NULL
           WHERE uc.user_id = $1 AND uc.is_active = true
           ORDER BY uc.is_default DESC, uc.created_at ASC
           LIMIT 1`,
          [user.id]
        );
        if (companyResult.rows.length > 0) {
          defaultCompanyId = companyResult.rows[0].company_id;
          defaultCompanyName = companyResult.rows[0].company_name;
        }
      }

      const result: LoginResult = {
        accessToken,
        refreshToken,
        expiresAt: expiresAt.toISOString(),
        login_context: loginContext,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          roles,
          permissions,
          tenant_id: effectiveTenantId,
          is_platform_admin: user.tenant_id === null,
          is_platform_user: user.tenant_id === null,
          enabled_modules: enabledModules,
          login_context: loginContext,
          default_company_id: defaultCompanyId,
          default_company_name: defaultCompanyName,
        }
      };

      // Add must_change_password flag if needed
      if (mustChangePassword || tempPasswordCheck.hasTemp) {
        result.must_change_password = true;
        result.redirect_to = '/change-password';
      }

      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(
    refreshToken: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<LoginResult> {
    const client = await pool.connect();

    try {
      const tokenHash = this.hashToken(refreshToken);
      
      // Validate refresh token
      const tokenResult = await client.query(
        'SELECT token_hash,user_id,jti,expires_at,revoked_at FROM refresh_tokens WHERE token_hash=$1',
        [tokenHash]
      );

      if (tokenResult.rowCount === 0) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      const tokenRow = tokenResult.rows[0];

      if (tokenRow.revoked_at) {
        throw new Error('REFRESH_TOKEN_REVOKED');
      }

      if (new Date(tokenRow.expires_at) < new Date()) {
        await client.query('DELETE FROM refresh_tokens WHERE token_hash=$1', [tokenHash]);
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }

      // Get user data
      const userResult = await client.query(
        'SELECT id,email,full_name,tenant_id FROM users WHERE id=$1',
        [tokenRow.user_id]
      );
      const user = userResult.rows[0];

      // Get roles
      const rolesResult = await client.query(
        'SELECT roles.name FROM roles JOIN user_roles ur ON ur.role_id=roles.id WHERE ur.user_id=$1',
        [user.id]
      );
      const roles = rolesResult.rows.map((x: any) => x.name);

      // Get permissions (see login() for rationale)
      const permissionsResult = await client.query(
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
        [user.id]
      );
      const permissions = permissionsResult.rows.map((x: any) => x.permission_code);

      // Rotate tokens
      const newRefreshToken = uuidv4();
      const newTokenHash = this.hashToken(newRefreshToken);
      const newJti = uuidv4();
      const refreshExpDays2 = await PolicyService.refreshTokenExpiryDays() || 30;
      const expiresAt = new Date(Date.now() + refreshExpDays2 * 86400 * 1000);

      await client.query('BEGIN');

      // Revoke old token
      await client.query(
        'UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1',
        [tokenHash]
      );

      // Insert new token
      await client.query(
        'INSERT INTO refresh_tokens(token_hash,user_id,jti,expires_at) VALUES($1,$2,$3,$4)',
        [newTokenHash, user.id, newJti, expiresAt.toISOString()]
      );

      // Log token refresh
      await client.query(
        'INSERT INTO login_history(user_id,activity_type,ip_address,user_agent,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',
        [user.id, 'token_refresh', ipAddress, userAgent]
      );

      await client.query('COMMIT');

      const accessToken = await this.signAccessToken({ 
        id: user.id, 
        email: user.email, 
        roles, 
        permissions,
        tenant_id: user.tenant_id 
      }, newJti);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          roles,
          permissions,
          tenant_id: user.tenant_id,
          is_platform_admin: user.tenant_id === null
        }
      };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (e) {}
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Logout user
   */
  static async logout(
    refreshToken: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<void> {
    const client = await pool.connect();

    try {
      const tokenHash = this.hashToken(refreshToken);

      // Get user_id before revoking token
      const tokenResult = await client.query(
        'SELECT user_id FROM refresh_tokens WHERE token_hash=$1',
        [tokenHash]
      );

      // Revoke token
      await client.query(
        'UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1',
        [tokenHash]
      );

      // Log logout
      if (tokenResult.rowCount > 0) {
        const userId = tokenResult.rows[0].user_id;
        await pool.query(
          'INSERT INTO login_history(user_id,activity_type,ip_address,user_agent,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',
          [userId, 'logout', ipAddress, userAgent]
        );
      }
    } finally {
      client.release();
    }
  }

  /**
   * Change password
   * Used for both forced password change and voluntary change
   */
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get user
      const userResult = await client.query(
        'SELECT id, email, password, must_change_password FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rowCount === 0) {
        throw new Error('USER_NOT_FOUND');
      }

      const user = userResult.rows[0];

      // Verify current password
      const passwordValid = await bcrypt.compare(currentPassword, user.password);
      if (!passwordValid) {
        throw new Error('INVALID_CURRENT_PASSWORD');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update user
      await client.query(
        `UPDATE users 
         SET password = $1,
             must_change_password = false,
             password_changed_at = NOW()
         WHERE id = $2`,
        [newPasswordHash, userId]
      );

      // Mark temporary password as used (if exists)
      await PasswordResetService.markTempPasswordUsed(userId);

      // Revoke all refresh tokens (force re-login)
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
      );

      // Log password change
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, after_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          'password_changed',
          'users',
          JSON.stringify({ 
            changed_at: new Date().toISOString(),
            was_forced: user.must_change_password 
          }),
          ipAddress,
          userAgent
        ]
      );

      // Create notification for user (optional - password changed successfully)
      await NotificationService.notifyUser(
        userId,
        'password_changed',
        'user',
        'notifications.password_changed.title',
        'notifications.password_changed.message',
        { changed_at: new Date().toISOString() },
        {
          priority: 'normal'
        }
      ).catch(err => console.error('Failed to create password change notification:', err));

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user authentication details
   * Used by GET /api/auth/me endpoint
   */
  static async getUserDetails(userId: number): Promise<{
    id: number;
    email: string;
    full_name: string;
    preferred_language: string;
    must_change_password: boolean;
    roles: string[];
    permissions: string[];
  } | null> {
    const userResult = await pool.query(
      `SELECT id, email, full_name, preferred_language, must_change_password
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return null;
    }

    const user = userResult.rows[0];

    // Get roles
    const rolesResult = await pool.query(
      'SELECT roles.name FROM roles JOIN user_roles ur ON ur.role_id=roles.id WHERE ur.user_id=$1',
      [userId]
    );
    const roles = rolesResult.rows.map((x: any) => x.name);

    // Get permissions
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

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      preferred_language: user.preferred_language || 'ar',
      must_change_password: user.must_change_password || false,
      roles,
      permissions
    };
  }

  /**
   * Complete login after MFA verification
   * This generates the final access/refresh tokens
   */
  static async completeMFALogin(
    userId: number,
    tenantId: number | null,
    loginContext: string,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    const client = await pool.connect();

    try {
      // Get user
      const userResult = await client.query(
        'SELECT id, email, full_name, tenant_id, must_change_password, encrypted_password FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );

      if (userResult.rows.length === 0) throw new Error('USER_NOT_FOUND');
      const user = userResult.rows[0];

      // Get roles
      const rolesResult = await client.query(
        'SELECT roles.name FROM roles JOIN user_roles ur ON ur.role_id=roles.id WHERE ur.user_id=$1',
        [userId]
      );
      const roles = rolesResult.rows.map((x: any) => x.name);

      // Get permissions
      const permissionsResult = await client.query(
        `SELECT DISTINCT permission_code FROM (
          SELECT p.permission_code FROM permissions p
          JOIN role_permissions rp ON rp.permission_id = p.id
          JOIN user_roles ur ON ur.role_id = rp.role_id
          WHERE ur.user_id = $1
          UNION
          SELECT jsonb_array_elements_text(r.permissions) as permission_code
          FROM roles r JOIN user_roles ur ON r.id = ur.role_id
          WHERE ur.user_id = $1
        ) t ORDER BY permission_code`,
        [userId]
      );
      const permissions = permissionsResult.rows.map((x: any) => x.permission_code);

      const effectiveTenantId = tenantId;
      const effectiveLoginContext = (loginContext || 'platform') as 'platform' | 'tenant';

      // Update last_login_context
      await client.query(
        'UPDATE users SET last_login_context = $1 WHERE id = $2',
        [effectiveLoginContext, userId]
      );

      // Generate tokens
      const jti = uuidv4();
      const accessToken = await this.signAccessToken({
        id: userId,
        email: user.email,
        roles,
        permissions,
        tenant_id: effectiveTenantId,
        login_context: effectiveLoginContext
      }, jti);

      const refreshToken = uuidv4();
      const tokenHash = this.hashToken(refreshToken);
      const refreshExpDays3 = await PolicyService.refreshTokenExpiryDays() || 30;
      const expiresAt = new Date(Date.now() + refreshExpDays3 * 86400 * 1000);

      await client.query(
        'INSERT INTO refresh_tokens(token_hash,user_id,jti,expires_at) VALUES($1,$2,$3,$4)',
        [tokenHash, userId, jti, expiresAt.toISOString()]
      );

      // Log successful login
      setImmediate(() => {
        this.logSuccessfulLogin(userId, ipAddress, userAgent);
      });

      // Get enabled modules
      let enabledModules: string[] = [];
      if (effectiveTenantId) {
        const modResult = await client.query(
          `SELECT DISTINCT m.module_code FROM modules m
           LEFT JOIN tenant_modules tm ON m.module_code = tm.module_code AND tm.tenant_id = $1
           WHERE m.is_active = true AND (m.is_core = true OR tm.is_enabled = true)`,
          [effectiveTenantId]
        );
        enabledModules = modResult.rows.map((m: any) => m.module_code);
      } else {
        const modResult = await client.query('SELECT module_code FROM modules WHERE is_active = true');
        enabledModules = modResult.rows.map((m: any) => m.module_code);
      }

      // Get default company
      let defaultCompanyId: number | null = null;
      let defaultCompanyName: string | null = null;
      if (effectiveTenantId) {
        const companyResult = await client.query(
          `SELECT uc.company_id, c.name as company_name
           FROM user_companies uc
           JOIN companies c ON uc.company_id = c.id AND c.deleted_at IS NULL
           WHERE uc.user_id = $1 AND uc.is_active = true
           ORDER BY uc.is_default DESC, uc.created_at ASC LIMIT 1`,
          [userId]
        );
        if (companyResult.rows.length > 0) {
          defaultCompanyId = companyResult.rows[0].company_id;
          defaultCompanyName = companyResult.rows[0].company_name;
        }
      }

      // Check must_change_password
      const mustChangePassword = user.must_change_password || false;
      const tempPasswordCheck = await PasswordResetService.hasValidTempPassword(userId);

      const result: LoginResult = {
        accessToken,
        refreshToken,
        expiresAt: expiresAt.toISOString(),
        login_context: effectiveLoginContext,
        user: {
          id: userId,
          email: user.email,
          full_name: user.full_name,
          roles,
          permissions,
          tenant_id: effectiveTenantId,
          is_platform_admin: user.tenant_id === null,
          is_platform_user: user.tenant_id === null,
          enabled_modules: enabledModules,
          login_context: effectiveLoginContext,
          default_company_id: defaultCompanyId,
          default_company_name: defaultCompanyName,
        }
      };

      if (mustChangePassword || tempPasswordCheck.hasTemp) {
        result.must_change_password = true;
        result.redirect_to = '/change-password';
      }

      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Update user language preference
   */
  static async updateLanguage(userId: number, language: 'ar' | 'en'): Promise<void> {
    await pool.query(
      'UPDATE users SET preferred_language = $1 WHERE id = $2',
      [language, userId]
    );
  }
}

