import { Router } from 'express';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// POST /api/auth/mfa/verify
router.post('/mfa/verify', async (req, res) => {
  sendError(res, 'MFA_NOT_ENABLED', 'MFA is not currently enabled', 400);
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', async (req, res) => {
  sendError(res, 'MFA_NOT_ENABLED', 'MFA is not currently enabled', 400);
});

export default router;
