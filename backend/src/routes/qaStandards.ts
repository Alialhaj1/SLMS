/**
 * §15 — QA Standards Routes
 *
 * Dashboard:
 *   GET    /api/qa/summary                                — Full QA dashboard
 *
 * Testing Levels (§15.1):
 *   GET    /api/qa/testing-levels                         — List testing levels
 *   PUT    /api/qa/testing-levels/:type                   — Upsert testing level
 *   DELETE /api/qa/testing-levels/:type                   — Delete testing level
 *
 * Definition of Done (§15.2):
 *   GET    /api/qa/dod                                    — List DoD checklist items
 *   PUT    /api/qa/dod/:code                              — Upsert DoD item
 *   DELETE /api/qa/dod/:code                              — Delete DoD item
 *   GET    /api/qa/dod/compliance/:refType/:refId         — Get compliance for a feature/PR
 *   PUT    /api/qa/dod/compliance/:refType/:refId         — Set single compliance item
 *   POST   /api/qa/dod/compliance/:refType/:refId/batch   — Batch set compliance
 *   GET    /api/qa/dod/compliance/:refType/:refId/summary — Compliance summary
 *
 * Branch Policies (§15.3):
 *   GET    /api/qa/branch-policies                        — List branch policies
 *   PUT    /api/qa/branch-policies/:pattern               — Upsert branch policy
 *   DELETE /api/qa/branch-policies/:pattern               — Delete branch policy
 *
 * Test Runs:
 *   GET    /api/qa/test-runs                              — List test run results
 *   GET    /api/qa/test-runs/latest                       — Latest run per type
 *   GET    /api/qa/test-runs/branch/:branch               — Branch stats
 *   GET    /api/qa/test-runs/:id                          — Single test run
 *   POST   /api/qa/test-runs                              — Submit test run result
 *   POST   /api/qa/test-runs/:id/evaluate                 — Evaluate against quality gates
 *
 * Quality Gates:
 *   GET    /api/qa/quality-gates                          — List quality gates
 *   GET    /api/qa/quality-gates/:id                      — Single gate
 *   PUT    /api/qa/quality-gates                          — Upsert quality gate
 *   DELETE /api/qa/quality-gates/:id                      — Delete quality gate
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  TestingLevelService,
  DoDService,
  BranchPolicyService,
  TestRunService,
  QualityGateService,
  QADashboardService,
} from '../services/qaStandardsService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/summary', authenticate, requirePermission('qa_standards:view' as any), async (_req: Request, res: Response) => {
  try {
    const summary = await QADashboardService.getSummary();
    sendSuccess(res, summary);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to get QA summary', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// §15.1 — Testing Levels
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/testing-levels', authenticate, requirePermission('qa_standards:view' as any), async (_req: Request, res: Response) => {
  try {
    const levels = await TestingLevelService.list();
    sendSuccess(res, levels);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to list testing levels', 500);
  }
});

router.put('/testing-levels/:type', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const { tool_name, coverage_target, responsible_role, description, is_mandatory, run_frequency, sort_order } = req.body;
    if (!tool_name || !coverage_target || !responsible_role) {
      return sendError(res, 'VALIDATION_ERROR', 'tool_name, coverage_target, responsible_role are required', 400);
    }
    const level = await TestingLevelService.upsert({
      test_type: req.params.type,
      tool_name, coverage_target, responsible_role,
      description, is_mandatory, run_frequency, sort_order,
    });
    sendSuccess(res, level, 200, undefined, 'Testing level saved');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to save testing level', 500);
  }
});

router.delete('/testing-levels/:type', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const deleted = await TestingLevelService.delete(req.params.type);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Testing level not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Testing level deleted');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to delete testing level', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// §15.2 — Definition of Done
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dod', authenticate, requirePermission('qa_standards:view' as any), async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const items = await DoDService.listChecklist(category);
    sendSuccess(res, items);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to list DoD checklist', 500);
  }
});

router.put('/dod/:code', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const { title_ar, title_en, category, is_required, sort_order } = req.body;
    if (!title_ar || !title_en) {
      return sendError(res, 'VALIDATION_ERROR', 'title_ar and title_en are required', 400);
    }
    const item = await DoDService.upsertChecklistItem({
      code: req.params.code,
      title_ar, title_en, category, is_required, sort_order,
    });
    sendSuccess(res, item, 200, undefined, 'DoD checklist item saved');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to save DoD item', 500);
  }
});

router.delete('/dod/:code', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const deleted = await DoDService.deleteChecklistItem(req.params.code);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'DoD item not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'DoD item deleted');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to delete DoD item', 500);
  }
});

// ─── Compliance tracking ────────────────────────────────────────────────

router.get('/dod/compliance/:refType/:refId', authenticate, requirePermission('qa_standards:view' as any), async (req: Request, res: Response) => {
  try {
    const compliance = await DoDService.getCompliance(req.params.refType, req.params.refId);
    sendSuccess(res, compliance);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to get compliance', 500);
  }
});

router.put('/dod/compliance/:refType/:refId', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { checklist_id, is_met, notes } = req.body;
    if (checklist_id === undefined || is_met === undefined) {
      return sendError(res, 'VALIDATION_ERROR', 'checklist_id and is_met are required', 400);
    }
    const item = await DoDService.setCompliance({
      reference_type: req.params.refType,
      reference_id: req.params.refId,
      checklist_id, is_met, verified_by: userId, notes,
    });
    sendSuccess(res, item, 200, undefined, 'Compliance updated');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to set compliance', 500);
  }
});

router.post('/dod/compliance/:refType/:refId/batch', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'items array is required', 400);
    }
    const count = await DoDService.batchSetCompliance(
      req.params.refType, req.params.refId, items, userId
    );
    sendSuccess(res, { updated: count }, 200, undefined, 'Batch compliance updated');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to batch update compliance', 500);
  }
});

router.get('/dod/compliance/:refType/:refId/summary', authenticate, requirePermission('qa_standards:view' as any), async (req: Request, res: Response) => {
  try {
    const summary = await DoDService.getComplianceSummary(req.params.refType, req.params.refId);
    sendSuccess(res, summary);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to get compliance summary', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// §15.3 — Branch Policies
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/branch-policies', authenticate, requirePermission('qa_standards:view' as any), async (_req: Request, res: Response) => {
  try {
    const policies = await BranchPolicyService.list();
    sendSuccess(res, policies);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to list branch policies', 500);
  }
});

router.put('/branch-policies/:pattern', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const {
      purpose_ar, purpose_en, who_can_push, merge_condition_ar, merge_condition_en,
      is_protected, requires_review, min_reviewers, requires_ci_pass, auto_delete_on_merge, sort_order,
    } = req.body;
    if (!purpose_ar || !purpose_en || !who_can_push || !merge_condition_ar || !merge_condition_en) {
      return sendError(res, 'VALIDATION_ERROR', 'purpose_ar, purpose_en, who_can_push, merge_condition_ar, merge_condition_en are required', 400);
    }
    const policy = await BranchPolicyService.upsert({
      branch_pattern: decodeURIComponent(req.params.pattern),
      purpose_ar, purpose_en, who_can_push, merge_condition_ar, merge_condition_en,
      is_protected, requires_review, min_reviewers, requires_ci_pass, auto_delete_on_merge, sort_order,
    });
    sendSuccess(res, policy, 200, undefined, 'Branch policy saved');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to save branch policy', 500);
  }
});

router.delete('/branch-policies/:pattern', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const deleted = await BranchPolicyService.delete(decodeURIComponent(req.params.pattern));
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Branch policy not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Branch policy deleted');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to delete branch policy', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test Runs
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/test-runs', authenticate, requirePermission('qa_test_runs:view' as any), async (req: Request, res: Response) => {
  try {
    const test_type = req.query.test_type as string | undefined;
    const branch = req.query.branch as string | undefined;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await TestRunService.list({ test_type, branch, status, page, limit });
    sendSuccess(res, result.data, 200, { total: result.total, page: result.page, per_page: result.per_page });
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to list test runs', 500);
  }
});

router.get('/test-runs/latest', authenticate, requirePermission('qa_test_runs:view' as any), async (_req: Request, res: Response) => {
  try {
    const latest = await TestRunService.getLatestByType();
    sendSuccess(res, latest);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to get latest test runs', 500);
  }
});

router.get('/test-runs/branch/:branch', authenticate, requirePermission('qa_test_runs:view' as any), async (req: Request, res: Response) => {
  try {
    const stats = await TestRunService.getBranchStats(decodeURIComponent(req.params.branch));
    sendSuccess(res, stats);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to get branch stats', 500);
  }
});

router.get('/test-runs/:id', authenticate, requirePermission('qa_test_runs:view' as any), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid test run ID', 400);
    const run = await TestRunService.getById(id);
    if (!run) return sendError(res, 'NOT_FOUND', 'Test run not found', 404);
    sendSuccess(res, run);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to get test run', 500);
  }
});

router.post('/test-runs', authenticate, requirePermission('qa_test_runs:create' as any), async (req: Request, res: Response) => {
  try {
    const {
      test_type, run_source, branch, commit_hash,
      total_tests, passed, failed, skipped,
      coverage_pct, duration_ms, status, report_url, metadata,
    } = req.body;

    if (!test_type || total_tests === undefined || passed === undefined || failed === undefined) {
      return sendError(res, 'VALIDATION_ERROR', 'test_type, total_tests, passed, failed are required', 400);
    }

    const run = await TestRunService.create({
      test_type, run_source, branch, commit_hash,
      total_tests, passed, failed, skipped,
      coverage_pct, duration_ms, status, report_url, metadata,
    });
    sendSuccess(res, run, 201, undefined, 'Test run recorded');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to create test run', 500);
  }
});

router.post('/test-runs/:id/evaluate', authenticate, requirePermission('qa_test_runs:view' as any), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid test run ID', 400);

    const run = await TestRunService.getById(id);
    if (!run) return sendError(res, 'NOT_FOUND', 'Test run not found', 404);

    const results = await QualityGateService.evaluate(run);
    const allPassed = results.every(r => r.passed || !r.gate.is_blocking);

    sendSuccess(res, {
      test_run_id: id,
      overall_passed: allPassed,
      gates: results.map(r => ({
        gate_name: r.gate.name,
        metric: r.gate.metric,
        threshold: r.gate.threshold,
        operator: r.gate.operator,
        actual_value: r.actual_value,
        passed: r.passed,
        is_blocking: r.gate.is_blocking,
      })),
    });
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to evaluate test run', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Quality Gates
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/quality-gates', authenticate, requirePermission('qa_standards:view' as any), async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    const gates = await QualityGateService.list(activeOnly);
    sendSuccess(res, gates);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to list quality gates', 500);
  }
});

router.get('/quality-gates/:id', authenticate, requirePermission('qa_standards:view' as any), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid gate ID', 400);
    const gate = await QualityGateService.getById(id);
    if (!gate) return sendError(res, 'NOT_FOUND', 'Quality gate not found', 404);
    sendSuccess(res, gate);
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to get quality gate', 500);
  }
});

router.put('/quality-gates', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const { name, description, test_type, metric, operator, threshold, is_blocking, is_active } = req.body;
    if (!name || !test_type || !metric || threshold === undefined) {
      return sendError(res, 'VALIDATION_ERROR', 'name, test_type, metric, threshold are required', 400);
    }
    const gate = await QualityGateService.upsert({
      name, description, test_type, metric, operator, threshold, is_blocking, is_active,
    });
    sendSuccess(res, gate, 200, undefined, 'Quality gate saved');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to save quality gate', 500);
  }
});

router.delete('/quality-gates/:id', authenticate, requirePermission('qa_standards:manage' as any), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid gate ID', 400);
    const deleted = await QualityGateService.delete(id);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Quality gate not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Quality gate deleted');
  } catch (err) {
    sendError(res, 'QA_ERROR', 'Failed to delete quality gate', 500);
  }
});

export default router;
