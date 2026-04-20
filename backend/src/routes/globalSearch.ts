/**
 * §13.2.1 — Global Search Route
 * GET /api/search?q=...&types=...&limit=...
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { GlobalSearchService } from '../services/globalSearchService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

/**
 * GET / — Unified search across multiple entity types
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const query = (req.query.q as string || '').trim();

    if (!query || query.length < 2) {
      return sendError(res, 'VALIDATION_ERROR', 'Search query must be at least 2 characters', 400);
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
    // Pass roles as permissions; super_admin bypass is handled inside the service
    const userPermissions: string[] = user.roles || [];

    const results = await GlobalSearchService.search(
      query,
      userPermissions,
      user.tenant_id ?? null,
      limit,
    );

    sendSuccess(res, results, 200, undefined, 'Search completed');
  } catch (err) {
    sendError(res, 'SEARCH_ERROR', 'Failed to perform search', 500);
  }
});

export default router;
