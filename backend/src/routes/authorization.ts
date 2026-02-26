import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';

const router = Router();

// GET /api/auth/context - Returns user's authorization context
router.get('/context', authenticate, async (req, res) => {
  const user = (req as any).user;
  sendSuccess(res, {
    user_id: user?.id,
    roles: user?.roles || [],
    permissions: user?.permissions || [],
    tenant_id: user?.tenant_id || null,
    company_id: user?.companyId || null,
  });
});

// GET /api/auth/modules - Returns available modules
router.get('/modules', authenticate, async (req, res) => {
  sendSuccess(res, { modules: [] });
});

// GET /api/auth/menu - Returns menu structure
router.get('/menu', authenticate, async (req, res) => {
  sendSuccess(res, { menu: [] });
});

export default router;
