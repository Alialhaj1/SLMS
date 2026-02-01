/**
 * Field Permissions API
 * Temporary stub: returns empty list until full implementation is added.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  res.json({ data: [] });
});

export default router;
