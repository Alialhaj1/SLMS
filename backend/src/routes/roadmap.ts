/**
 * §14 — Development Roadmap Routes
 *
 * Sprint management:
 *   GET    /api/roadmap/sprints                — List all sprints
 *   GET    /api/roadmap/sprints/overview       — Roadmap summary/KPIs
 *   GET    /api/roadmap/sprints/timeline       — Gantt-ready timeline data
 *   GET    /api/roadmap/sprints/:id            — Sprint detail + deliverables + deps
 *   POST   /api/roadmap/sprints                — Create sprint
 *   PUT    /api/roadmap/sprints/:id            — Update sprint
 *   DELETE /api/roadmap/sprints/:id            — Delete sprint
 *
 * Sprint deliverables:
 *   GET    /api/roadmap/sprints/:id/deliverables        — List deliverables
 *   POST   /api/roadmap/sprints/:id/deliverables        — Add deliverable
 *   PUT    /api/roadmap/deliverables/:id                — Update deliverable
 *   DELETE /api/roadmap/deliverables/:id                — Delete deliverable
 *   POST   /api/roadmap/deliverables/batch-status       — Batch update status
 *
 * Sprint dependencies:
 *   POST   /api/roadmap/sprints/:id/dependencies        — Add dependency
 *   DELETE /api/roadmap/sprints/:id/dependencies/:depId — Remove dependency
 *
 * Technology stack:
 *   GET    /api/roadmap/tech-stack                      — List tech stack
 *   GET    /api/roadmap/tech-stack/grouped              — Grouped by layer
 *   GET    /api/roadmap/tech-stack/summary              — Summary stats
 *   GET    /api/roadmap/tech-stack/:id                  — Get single entry
 *   POST   /api/roadmap/tech-stack                      — Create entry
 *   PUT    /api/roadmap/tech-stack/:id                  — Update entry
 *   DELETE /api/roadmap/tech-stack/:id                  — Delete entry
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { SprintService, DeliverableService, TechStackService } from '../services/roadmapService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint Routes
// ═══════════════════════════════════════════════════════════════════════════════

// GET /sprints — list all sprints
router.get('/sprints', authenticate, requirePermission('roadmap:view' as any), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await SprintService.list({ status, page, limit });
    sendSuccess(res, result.data, 200, { total: result.total, page: result.page, per_page: result.per_page });
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to list sprints', 500);
  }
});

// GET /sprints/overview — roadmap summary KPIs
router.get('/sprints/overview', authenticate, requirePermission('roadmap:view' as any), async (req: Request, res: Response) => {
  try {
    const overview = await SprintService.getOverview();
    sendSuccess(res, overview);
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to get roadmap overview', 500);
  }
});

// GET /sprints/timeline — Gantt-ready timeline
router.get('/sprints/timeline', authenticate, requirePermission('roadmap:view' as any), async (req: Request, res: Response) => {
  try {
    const timeline = await SprintService.getTimeline();
    sendSuccess(res, timeline);
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to get timeline', 500);
  }
});

// GET /sprints/:id — sprint detail
router.get('/sprints/:id', authenticate, requirePermission('roadmap:view' as any), async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.id);
    if (isNaN(sprintId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid sprint ID', 400);
    const detail = await SprintService.getById(sprintId);
    if (!detail) return sendError(res, 'NOT_FOUND', 'Sprint not found', 404);
    sendSuccess(res, detail);
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to get sprint', 500);
  }
});

// POST /sprints — create sprint
router.post('/sprints', authenticate, requirePermission('roadmap:manage' as any), async (req: Request, res: Response) => {
  try {
    const { sprint_number, name, duration, focus_area, focus_area_en, deliverables, status, start_date, end_date, notes } = req.body;

    if (sprint_number === undefined || !name || !duration || !focus_area || !focus_area_en || !deliverables) {
      return sendError(res, 'VALIDATION_ERROR', 'sprint_number, name, duration, focus_area, focus_area_en, deliverables are required', 400);
    }

    const sprint = await SprintService.create({
      sprint_number, name, duration, focus_area, focus_area_en,
      deliverables, status, start_date, end_date, notes,
    });
    sendSuccess(res, sprint, 201, undefined, 'Sprint created');
  } catch (err: any) {
    if (err?.code === '23505') {
      return sendError(res, 'DUPLICATE', 'Sprint number already exists', 409);
    }
    sendError(res, 'ROADMAP_ERROR', 'Failed to create sprint', 500);
  }
});

// PUT /sprints/:id — update sprint
router.put('/sprints/:id', authenticate, requirePermission('roadmap:manage' as any), async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.id);
    if (isNaN(sprintId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid sprint ID', 400);

    const updated = await SprintService.update(sprintId, req.body);
    if (!updated) return sendError(res, 'NOT_FOUND', 'Sprint not found or no changes', 404);
    sendSuccess(res, updated, 200, undefined, 'Sprint updated');
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to update sprint', 500);
  }
});

// DELETE /sprints/:id — delete sprint
router.delete('/sprints/:id', authenticate, requirePermission('roadmap:manage' as any), async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.id);
    if (isNaN(sprintId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid sprint ID', 400);

    const deleted = await SprintService.delete(sprintId);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Sprint not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Sprint deleted');
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to delete sprint', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint Deliverable Routes
// ═══════════════════════════════════════════════════════════════════════════════

// GET /sprints/:id/deliverables
router.get('/sprints/:id/deliverables', authenticate, requirePermission('roadmap:view' as any), async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.id);
    if (isNaN(sprintId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid sprint ID', 400);
    const items = await DeliverableService.list(sprintId);
    sendSuccess(res, items);
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to list deliverables', 500);
  }
});

// POST /sprints/:id/deliverables
router.post('/sprints/:id/deliverables', authenticate, requirePermission('roadmap:manage' as any), async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.id);
    if (isNaN(sprintId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid sprint ID', 400);

    const { title, description, priority, assigned_to } = req.body;
    if (!title) return sendError(res, 'VALIDATION_ERROR', 'title is required', 400);

    const item = await DeliverableService.create(sprintId, { title, description, priority, assigned_to });
    sendSuccess(res, item, 201, undefined, 'Deliverable added');
  } catch (err: any) {
    if (err?.code === '23503') {
      return sendError(res, 'NOT_FOUND', 'Sprint not found', 404);
    }
    sendError(res, 'ROADMAP_ERROR', 'Failed to create deliverable', 500);
  }
});

// PUT /deliverables/:id
router.put('/deliverables/:id', authenticate, requirePermission('roadmap:manage' as any), async (req: Request, res: Response) => {
  try {
    const deliverableId = parseInt(req.params.id);
    if (isNaN(deliverableId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid deliverable ID', 400);

    const updated = await DeliverableService.update(deliverableId, req.body);
    if (!updated) return sendError(res, 'NOT_FOUND', 'Deliverable not found or no changes', 404);
    sendSuccess(res, updated, 200, undefined, 'Deliverable updated');
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to update deliverable', 500);
  }
});

// DELETE /deliverables/:id
router.delete('/deliverables/:id', authenticate, requirePermission('roadmap:manage' as any), async (req: Request, res: Response) => {
  try {
    const deliverableId = parseInt(req.params.id);
    if (isNaN(deliverableId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid deliverable ID', 400);

    const deleted = await DeliverableService.delete(deliverableId);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Deliverable not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Deliverable deleted');
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to delete deliverable', 500);
  }
});

// POST /deliverables/batch-status — bulk update status
router.post('/deliverables/batch-status', authenticate, requirePermission('roadmap:manage' as any), async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return sendError(res, 'VALIDATION_ERROR', 'ids (number[]) and status are required', 400);
    }
    const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 'VALIDATION_ERROR', `status must be one of: ${validStatuses.join(', ')}`, 400);
    }
    const updated = await DeliverableService.batchUpdateStatus(ids, status);
    sendSuccess(res, { updated_count: updated }, 200, undefined, 'Batch status update applied');
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to batch update deliverables', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint Dependencies
// ═══════════════════════════════════════════════════════════════════════════════

// POST /sprints/:id/dependencies
router.post('/sprints/:id/dependencies', authenticate, requirePermission('roadmap:manage' as any), async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.id);
    if (isNaN(sprintId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid sprint ID', 400);

    const { depends_on_sprint_id, dependency_type } = req.body;
    if (!depends_on_sprint_id) return sendError(res, 'VALIDATION_ERROR', 'depends_on_sprint_id is required', 400);

    const dep = await SprintService.addDependency(sprintId, depends_on_sprint_id, dependency_type || 'finish_to_start');
    sendSuccess(res, dep, 201, undefined, 'Dependency added');
  } catch (err: any) {
    if (err?.code === '23505') {
      return sendError(res, 'DUPLICATE', 'Dependency already exists', 409);
    }
    if (err?.code === '23503') {
      return sendError(res, 'NOT_FOUND', 'Referenced sprint not found', 404);
    }
    if (err?.code === '23514') {
      return sendError(res, 'VALIDATION_ERROR', 'A sprint cannot depend on itself', 400);
    }
    sendError(res, 'ROADMAP_ERROR', 'Failed to add dependency', 500);
  }
});

// DELETE /sprints/:id/dependencies/:depId
router.delete('/sprints/:id/dependencies/:depId', authenticate, requirePermission('roadmap:manage' as any), async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.id);
    const depId = parseInt(req.params.depId);
    if (isNaN(sprintId) || isNaN(depId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid IDs', 400);

    const removed = await SprintService.removeDependency(sprintId, depId);
    if (!removed) return sendError(res, 'NOT_FOUND', 'Dependency not found', 404);
    sendSuccess(res, { removed: true }, 200, undefined, 'Dependency removed');
  } catch (err) {
    sendError(res, 'ROADMAP_ERROR', 'Failed to remove dependency', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Technology Stack Routes
// ═══════════════════════════════════════════════════════════════════════════════

// GET /tech-stack — list all
router.get('/tech-stack', authenticate, requirePermission('tech_stack:view' as any), async (req: Request, res: Response) => {
  try {
    const { layer, category, adoption_status, is_primary } = req.query;
    const result = await TechStackService.list({
      layer: layer as string | undefined,
      category: category as string | undefined,
      adoption_status: adoption_status as string | undefined,
      is_primary: is_primary !== undefined ? is_primary === 'true' : undefined,
    });
    sendSuccess(res, result);
  } catch (err) {
    sendError(res, 'TECH_STACK_ERROR', 'Failed to list technology stack', 500);
  }
});

// GET /tech-stack/grouped — grouped by layer
router.get('/tech-stack/grouped', authenticate, requirePermission('tech_stack:view' as any), async (req: Request, res: Response) => {
  try {
    const grouped = await TechStackService.getGroupedByLayer();
    sendSuccess(res, grouped);
  } catch (err) {
    sendError(res, 'TECH_STACK_ERROR', 'Failed to get grouped stack', 500);
  }
});

// GET /tech-stack/summary — summary stats
router.get('/tech-stack/summary', authenticate, requirePermission('tech_stack:view' as any), async (req: Request, res: Response) => {
  try {
    const summary = await TechStackService.getSummary();
    sendSuccess(res, summary);
  } catch (err) {
    sendError(res, 'TECH_STACK_ERROR', 'Failed to get summary', 500);
  }
});

// GET /tech-stack/:id — single entry
router.get('/tech-stack/:id', authenticate, requirePermission('tech_stack:view' as any), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid ID', 400);
    const entry = await TechStackService.getById(id);
    if (!entry) return sendError(res, 'NOT_FOUND', 'Tech stack entry not found', 404);
    sendSuccess(res, entry);
  } catch (err) {
    sendError(res, 'TECH_STACK_ERROR', 'Failed to get tech stack entry', 500);
  }
});

// POST /tech-stack — create
router.post('/tech-stack', authenticate, requirePermission('tech_stack:manage' as any), async (req: Request, res: Response) => {
  try {
    const { layer, category, name, purpose, alternative, is_primary, adoption_status, notes } = req.body;
    if (!layer || !category || !name || !purpose) {
      return sendError(res, 'VALIDATION_ERROR', 'layer, category, name, purpose are required', 400);
    }
    const entry = await TechStackService.create({
      layer, category, name, purpose, alternative, is_primary, adoption_status, notes,
    });
    sendSuccess(res, entry, 201, undefined, 'Tech stack entry created');
  } catch (err: any) {
    if (err?.code === '23505') {
      return sendError(res, 'DUPLICATE', 'Entry with same layer+name already exists', 409);
    }
    sendError(res, 'TECH_STACK_ERROR', 'Failed to create tech stack entry', 500);
  }
});

// PUT /tech-stack/:id — update
router.put('/tech-stack/:id', authenticate, requirePermission('tech_stack:manage' as any), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid ID', 400);
    const updated = await TechStackService.update(id, req.body);
    if (!updated) return sendError(res, 'NOT_FOUND', 'Entry not found or no changes', 404);
    sendSuccess(res, updated, 200, undefined, 'Tech stack entry updated');
  } catch (err) {
    sendError(res, 'TECH_STACK_ERROR', 'Failed to update tech stack entry', 500);
  }
});

// DELETE /tech-stack/:id — delete
router.delete('/tech-stack/:id', authenticate, requirePermission('tech_stack:manage' as any), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid ID', 400);
    const deleted = await TechStackService.delete(id);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Entry not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Tech stack entry deleted');
  } catch (err) {
    sendError(res, 'TECH_STACK_ERROR', 'Failed to delete tech stack entry', 500);
  }
});

export default router;
