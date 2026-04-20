/**
 * §13.1.3 — Password Strength Route
 *
 * POST /api/password-strength/check — Check password strength
 * POST /api/password-strength/validate — Validate against policy
 */

import { Router, Request, Response } from 'express';
import { evaluatePasswordStrength, validatePasswordPolicy } from '../utils/passwordStrength';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

/**
 * POST /check — Evaluate password strength (no auth required — used on registration/reset forms)
 */
router.post('/check', (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) return sendError(res, 'VALIDATION_ERROR', 'password is required', 400);
    const result = evaluatePasswordStrength(password);
    sendSuccess(res, result);
  } catch (err) {
    sendError(res, 'STRENGTH_ERROR', 'Failed to check password strength', 500);
  }
});

/**
 * POST /validate — Validate against password policy (no auth required)
 */
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { password, policy } = req.body;
    if (!password) return sendError(res, 'VALIDATION_ERROR', 'password is required', 400);
    const result = validatePasswordPolicy(password, policy || {});
    sendSuccess(res, result);
  } catch (err) {
    sendError(res, 'VALIDATION_ERROR', 'Failed to validate password', 500);
  }
});

export default router;
