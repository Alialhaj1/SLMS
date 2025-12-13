import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  res.json({ id: user.sub || user.sub, email: user.email, roles: user.roles || [], jti: user.jti || null });
});

export default router;
