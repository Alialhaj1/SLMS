import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';

const router = Router();

// GET / - List password reset requests (empty — feature not yet implemented)
router.get('/', authenticate, async (req, res) => {
  sendSuccess(res, { data: [], total: 0 });
});

// POST /:id/approve - Approve a request (stub)
router.post('/:id/approve', authenticate, async (req, res) => {
  sendSuccess(res, { message: 'Not yet implemented' });
});

// POST /:id/deny - Deny a request (stub)
router.post('/:id/deny', authenticate, async (req, res) => {
  sendSuccess(res, { message: 'Not yet implemented' });
});

export default router;
