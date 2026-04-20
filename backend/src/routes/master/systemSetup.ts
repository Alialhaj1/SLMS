import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';

const router = Router();

// GET / - List system setup settings (stub — returns empty)
router.get('/', authenticate, async (req, res) => {
  sendSuccess(res, { data: [], total: 0 });
});

// PUT /:id - Update a setting (stub)
router.put('/:id', authenticate, async (req, res) => {
  sendSuccess(res, { message: 'System setup not yet implemented' });
});

export default router;
