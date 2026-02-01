/**
 * Password Reset Routes
 * Purpose: Admin-controlled password reset system
 * Security: Public request endpoint (rate-limited), admin-only approval/rejection
 */

import { Router, Request, Response } from 'express';
import { PasswordResetService } from '../services/passwordResetService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { passwordResetRateLimiter } from '../middleware/rateLimiter';
import { sendSuccess, sendError } from '../utils/response';
import { getPaginationParams, sendPaginated } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

// =============================================
// Types
// =============================================

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

// =============================================
// Public Endpoints
// =============================================

/**
 * POST /api/password-reset/request
 * Request password reset (Public endpoint)
 * Rate limited: 3 requests per hour per IP
 * Security: Never reveals if user exists
 */
router.post('/request', passwordResetRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, reason } = req.body;

    // Basic validation
    if (!email) {
      return sendError(res, 'VALIDATION_ERROR', 'Email is required', 400);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid email format', 400);
    }

    // Get client info
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // Request reset (always returns void - no info leaked)
    await PasswordResetService.requestReset(email, {
      ipAddress,
      userAgent,
      reason: reason || undefined
    });

    // Always return success - never reveal if user exists
    return sendSuccess(res, {
      message: 'Request submitted. If your account exists, an administrator will review your request.'
    }, 200);

  } catch (error: any) {
    const { email } = req.body;
    logger.error('Password reset request failed', error, { email });
    return sendError(res, 'SERVER_ERROR', 'Failed to process request', 500);
  }
});

// =============================================
// Admin Endpoints (Authentication Required)
// =============================================

/**
 * GET /api/password-reset/requests
 * Get all password reset requests
 * Permission: password_requests:view
 */
router.get('/requests', authenticate, requirePermission('password_requests:view'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { status } = req.query;

    // Validate status if provided
    const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
    if (status && !validStatuses.includes(status as string)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid status. Must be one of: pending, approved, rejected, cancelled', 400);
    }

    // Get requests
    const { requests, total } = await PasswordResetService.getRequests({
      status: status as any,
      limit,
      offset
    });

    return sendPaginated(res, requests, page, limit, total);

  } catch (error: any) {
    logger.error('Get password reset requests failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch requests', 500);
  }
});

/**
 * GET /api/password-reset/requests/:id
 * Get single password reset request
 * Permission: password_requests:view
 */
router.get('/requests/:id', authenticate, requirePermission('password_requests:view'), async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);

    if (isNaN(requestId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid request ID', 400);
    }

    const request = await PasswordResetService.getRequestById(requestId);

    if (!request) {
      return sendError(res, 'NOT_FOUND', 'Request not found', 404);
    }

    return sendSuccess(res, request);

  } catch (error: any) {
    const requestId = parseInt(req.params.id);
    logger.error('Get password reset request failed', error, { requestId });
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch request', 500);
  }
});

/**
 * POST /api/password-reset/requests/:id/approve
 * Approve password reset request and generate temporary password
 * Permission: password_requests:approve
 */
router.post('/requests/:id/approve', authenticate, requirePermission('password_requests:approve'), async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const { admin_notes, expires_in_hours } = req.body;

    if (isNaN(requestId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid request ID', 400);
    }

    // Validate expires_in_hours if provided
    if (expires_in_hours !== undefined) {
      const hours = parseInt(expires_in_hours);
      if (isNaN(hours) || hours < 1 || hours > 168) { // Max 7 days
        return sendError(res, 'VALIDATION_ERROR', 'expires_in_hours must be between 1 and 168 (7 days)', 400);
      }
    }

    const adminId = req.user!.id;

    // Approve request
    const tempPassword = await PasswordResetService.approveRequest(requestId, {
      adminId,
      adminNotes: admin_notes,
      expiresInHours: expires_in_hours ? parseInt(expires_in_hours) : 24
    });

    return sendSuccess(res, {
      message: 'Request approved successfully',
      temp_password: tempPassword.plainText,
      expires_at: tempPassword.expiresAt,
      warning: 'This password will only be shown once. Please copy it and share securely with the user.'
    }, 200);

  } catch (error: any) {
    const requestId = parseInt(req.params.id);
    logger.error('Approve password reset failed', error, { requestId, adminId: req.user!.id });

    if (error.message === 'REQUEST_NOT_FOUND') {
      return sendError(res, 'NOT_FOUND', 'Request not found', 404);
    }

    if (error.message === 'REQUEST_ALREADY_HANDLED') {
      return sendError(res, 'INVALID_STATE', 'Request has already been handled', 400);
    }

    return sendError(res, 'SERVER_ERROR', 'Failed to approve request', 500);
  }
});

/**
 * POST /api/password-reset/requests/:id/reject
 * Reject password reset request
 * Permission: password_requests:reject
 */
router.post('/requests/:id/reject', authenticate, requirePermission('password_requests:reject'), async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const { reason } = req.body;

    if (isNaN(requestId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid request ID', 400);
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Rejection reason is required', 400);
    }

    if (reason.length > 500) {
      return sendError(res, 'VALIDATION_ERROR', 'Reason must be less than 500 characters', 400);
    }

    const adminId = req.user!.id;

    // Reject request
    await PasswordResetService.rejectRequest(requestId, {
      adminId,
      reason
    });

    return sendSuccess(res, {
      message: 'Request rejected successfully'
    }, 200);

  } catch (error: any) {
    const requestId = parseInt(req.params.id);
    logger.error('Reject password reset failed', error, { requestId, adminId: req.user!.id });

    if (error.message === 'REQUEST_NOT_FOUND') {
      return sendError(res, 'NOT_FOUND', 'Request not found', 404);
    }

    if (error.message === 'REQUEST_ALREADY_HANDLED') {
      return sendError(res, 'INVALID_STATE', 'Request has already been handled', 400);
    }

    return sendError(res, 'SERVER_ERROR', 'Failed to reject request', 500);
  }
});

/**
 * POST /api/password-reset/requests/:id/cancel
 * Cancel own password reset request
 * Permission: password_requests:cancel (or own request)
 */
router.post('/requests/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);

    if (isNaN(requestId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid request ID', 400);
    }

    const userId = req.user!.id;

    // Cancel request (service checks ownership)
    await PasswordResetService.cancelRequest(requestId, userId);

    return sendSuccess(res, {
      message: 'Request cancelled successfully'
    }, 200);

  } catch (error: any) {
    const requestId = parseInt(req.params.id);
    const userId = req.user!.id;
    logger.error('Cancel password reset failed', error, { requestId, userId });

    if (error.message === 'REQUEST_NOT_FOUND_OR_ALREADY_HANDLED') {
      return sendError(res, 'NOT_FOUND', 'Request not found or already handled', 404);
    }

    return sendError(res, 'SERVER_ERROR', 'Failed to cancel request', 500);
  }
});

export default router;
