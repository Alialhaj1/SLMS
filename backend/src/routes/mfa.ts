/**
 * MFA Routes — Full Implementation
 * 
 * Architecture Spec §2.4: Two-Factor Authentication
 * 
 * Setup flow:
 *   POST /api/auth/mfa/setup      → Generate TOTP secret + QR data
 *   POST /api/auth/mfa/verify-setup → Verify code + enable MFA + return backup codes
 *   POST /api/auth/mfa/disable     → Disable MFA (requires password)
 * 
 * Login flow:
 *   POST /api/auth/mfa/verify      → Verify TOTP/backup code during login
 * 
 * Management:
 *   GET  /api/auth/mfa/status       → MFA status for current user
 *   POST /api/auth/mfa/backup-codes → Regenerate backup codes
 *   GET  /api/auth/mfa/devices      → List trusted devices
 *   DELETE /api/auth/mfa/devices/:id → Revoke a trusted device
 *   DELETE /api/auth/mfa/devices     → Revoke all trusted devices
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { MFAService } from '../services/mfaService';
import { AuthService } from '../services/authService';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import pool from '../db';
import bcrypt from 'bcryptjs';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// Setup Flow (Requires authentication)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/mfa/setup
 * Generate TOTP secret and QR code data for setup.
 */
router.post('/mfa/setup', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await MFAService.setupTOTP(userId);

    return sendSuccess(res, {
      secret: result.secret,
      otpauth_uri: result.otpauthUri,
      qr_data: result.qrData,
      message: 'Scan the QR code with your authenticator app, then verify with a code.',
    }, 200);
  } catch (error: any) {
    logger.error('MFA setup failed', error, { userId: (req as any).user?.id });

    if (error.message === 'USER_NOT_FOUND') {
      return sendError(res, 'NOT_FOUND', 'User not found', 404);
    }
    return sendError(res, 'SERVER_ERROR', 'Failed to initiate MFA setup', 500);
  }
});

/**
 * POST /api/auth/mfa/verify-setup
 * Verify TOTP code and enable MFA. Returns backup codes.
 */
router.post('/mfa/verify-setup', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return sendError(res, 'VALIDATION_ERROR', 'Verification code is required', 400);
    }

    const result = await MFAService.verifyAndEnableMFA(userId, code.replace(/\s/g, ''));

    return sendSuccess(res, {
      message: 'MFA enabled successfully. Save your backup codes — they will not be shown again.',
      backup_codes: result.backupCodes,
      mfa_enabled: true,
    }, 200);
  } catch (error: any) {
    logger.error('MFA verify-setup failed', error, { userId: (req as any).user?.id });

    if (error.message === 'INVALID_MFA_CODE') {
      return sendError(res, 'INVALID_MFA_CODE', 'Invalid verification code. Check your authenticator app and try again.', 400);
    }
    if (error.message === 'MFA_NOT_CONFIGURED') {
      return sendError(res, 'MFA_NOT_CONFIGURED', 'MFA has not been set up. Call /mfa/setup first.', 400);
    }
    if (error.message === 'MFA_ALREADY_ENABLED') {
      return sendError(res, 'MFA_ALREADY_ENABLED', 'MFA is already enabled for this account.', 409);
    }
    return sendError(res, 'SERVER_ERROR', 'Failed to enable MFA', 500);
  }
});

/**
 * POST /api/auth/mfa/disable
 * Disable MFA. Requires current password for security.
 */
router.post('/mfa/disable', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { password } = req.body;

    if (!password) {
      return sendError(res, 'VALIDATION_ERROR', 'Password is required to disable MFA', 400);
    }

    // Verify password
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'User not found', 404);
    }

    const passwordValid = await bcrypt.compare(password, userResult.rows[0].password);
    if (!passwordValid) {
      return sendError(res, 'INVALID_PASSWORD', 'Incorrect password', 400);
    }

    await MFAService.disableMFA(userId);

    return sendSuccess(res, {
      message: 'MFA has been disabled.',
      mfa_enabled: false,
    }, 200);
  } catch (error: any) {
    logger.error('MFA disable failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to disable MFA', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Login MFA Verification (No JWT auth — uses pending MFA token)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/mfa/verify
 * Verify TOTP code or backup code during login flow.
 * 
 * Body: { mfa_token, code, type?: 'totp' | 'backup', remember_device?: boolean, device_fingerprint?: string }
 */
router.post('/mfa/verify', async (req: Request, res: Response) => {
  try {
    const { mfa_token, code, type = 'totp', remember_device, device_fingerprint } = req.body;

    if (!mfa_token) {
      return sendError(res, 'VALIDATION_ERROR', 'MFA token is required', 400);
    }
    if (!code) {
      return sendError(res, 'VALIDATION_ERROR', 'Verification code is required', 400);
    }

    // Validate the pending MFA token
    const pendingToken = await MFAService.verifyPendingToken(mfa_token);
    if (!pendingToken) {
      return sendError(res, 'INVALID_MFA_TOKEN', 'MFA token is invalid or expired. Please login again.', 401);
    }

    const { userId, tenantId, loginContext, ipAddress, userAgent } = pendingToken;
    let verified = false;

    if (type === 'backup') {
      // Verify backup code
      verified = await MFAService.verifyBackupCode(userId, code, ipAddress);
    } else {
      // Verify TOTP code
      verified = await MFAService.verifyCode(userId, code.replace(/\s/g, ''));
    }

    if (!verified) {
      return sendError(res, 'INVALID_MFA_CODE', 'Invalid verification code', 401);
    }

    // Consume the pending token (one-time use)
    await MFAService.consumePendingToken(mfa_token);

    // Complete login — generate full JWT tokens
    const loginResult = await AuthService.completeMFALogin(
      userId,
      tenantId,
      loginContext,
      ipAddress,
      userAgent
    );

    // Handle device remember
    let deviceToken: string | undefined;
    if (remember_device && device_fingerprint) {
      const deviceResult = await MFAService.rememberDevice(
        userId,
        device_fingerprint,
        ipAddress,
        userAgent
      );
      deviceToken = deviceResult.deviceToken;
    }

    const response: any = { ...loginResult };
    if (deviceToken) {
      response.device_token = deviceToken;
    }

    // Include remaining backup code count if backup code was used
    if (type === 'backup') {
      response.backup_codes_remaining = await MFAService.getRemainingBackupCodeCount(userId);
    }

    return sendSuccess(res, response, 200);
  } catch (error: any) {
    logger.error('MFA verify failed', error);

    if (error.message === 'USER_NOT_FOUND') {
      return sendError(res, 'NOT_FOUND', 'User not found', 404);
    }
    return sendError(res, 'SERVER_ERROR', 'MFA verification failed', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MFA Management (Requires authentication)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/auth/mfa/status
 * Get MFA status for current user.
 */
router.get('/mfa/status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const status = await MFAService.getMFAStatus(userId);
    return sendSuccess(res, status, 200);
  } catch (error: any) {
    logger.error('MFA status check failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to get MFA status', 500);
  }
});

/**
 * POST /api/auth/mfa/backup-codes
 * Regenerate backup codes (invalidates previous codes). Requires password.
 */
router.post('/mfa/backup-codes', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { password } = req.body;

    if (!password) {
      return sendError(res, 'VALIDATION_ERROR', 'Password is required to regenerate backup codes', 400);
    }

    // Verify password
    const userResult = await pool.query(
      'SELECT password, mfa_enabled FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'User not found', 404);
    }
    if (!userResult.rows[0].mfa_enabled) {
      return sendError(res, 'MFA_NOT_ENABLED', 'MFA is not enabled. Enable MFA first.', 400);
    }

    const passwordValid = await bcrypt.compare(password, userResult.rows[0].password);
    if (!passwordValid) {
      return sendError(res, 'INVALID_PASSWORD', 'Incorrect password', 400);
    }

    const codes = await MFAService.generateBackupCodes(userId);

    return sendSuccess(res, {
      backup_codes: codes,
      message: 'New backup codes generated. Previous codes are now invalid.',
    }, 200);
  } catch (error: any) {
    logger.error('Backup code regeneration failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to regenerate backup codes', 500);
  }
});

/**
 * GET /api/auth/mfa/devices
 * List trusted (remembered) devices.
 */
router.get('/mfa/devices', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const devices = await MFAService.listDevices(userId);
    return sendSuccess(res, { devices }, 200);
  } catch (error: any) {
    logger.error('List MFA devices failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to list trusted devices', 500);
  }
});

/**
 * DELETE /api/auth/mfa/devices/:id
 * Revoke a specific trusted device.
 */
router.delete('/mfa/devices/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const deviceId = parseInt(req.params.id, 10);

    if (isNaN(deviceId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid device ID', 400);
    }

    const revoked = await MFAService.revokeDevice(userId, deviceId);
    if (!revoked) {
      return sendError(res, 'NOT_FOUND', 'Device not found or already revoked', 404);
    }

    return sendSuccess(res, { message: 'Device trust revoked' }, 200);
  } catch (error: any) {
    logger.error('Revoke MFA device failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to revoke device', 500);
  }
});

/**
 * DELETE /api/auth/mfa/devices
 * Revoke ALL trusted devices.
 */
router.delete('/mfa/devices', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await MFAService.revokeAllDevices(userId);
    return sendSuccess(res, { message: `${count} device(s) revoked`, revoked_count: count }, 200);
  } catch (error: any) {
    logger.error('Revoke all MFA devices failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to revoke devices', 500);
  }
});

export default router;
