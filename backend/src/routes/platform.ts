import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  sendSuccess(res, { message: 'platform endpoint - coming soon' });
});

export default router;
