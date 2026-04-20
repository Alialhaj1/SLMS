/**
 * §15 — QA Standards Service
 *
 * Manages testing levels, Definition-of-Done checklists, branch policies,
 * test run results, quality gates, and DoD compliance tracking.
 */

import pool from '../db';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface TestingLevel {
  id: number;
  test_type: string;
  tool_name: string;
  coverage_target: string;
  responsible_role: string;
  description: string | null;
  is_mandatory: boolean;
  run_frequency: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DoDItem {
  id: number;
  code: string;
  title_ar: string;
  title_en: string;
  category: string;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DoDCompliance {
  id: number;
  reference_type: string;
  reference_id: string;
  checklist_id: number;
  is_met: boolean;
  verified_by: number | null;
  verified_at: string | null;
  notes: string | null;
  tenant_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface BranchPolicy {
  id: number;
  branch_pattern: string;
  purpose_ar: string;
  purpose_en: string;
  who_can_push: string;
  merge_condition_ar: string;
  merge_condition_en: string;
  is_protected: boolean;
  requires_review: boolean;
  min_reviewers: number;
  requires_ci_pass: boolean;
  auto_delete_on_merge: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TestRun {
  id: number;
  test_type: string;
  run_source: string | null;
  branch: string | null;
  commit_hash: string | null;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage_pct: number | null;
  duration_ms: number | null;
  status: string;
  report_url: string | null;
  metadata: Record<string, unknown>;
  tenant_id: number | null;
  created_at: string;
}

export interface QualityGate {
  id: number;
  name: string;
  description: string | null;
  test_type: string;
  metric: string;
  operator: string;
  threshold: number;
  is_blocking: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §15.1 — Testing Levels Service
// ═══════════════════════════════════════════════════════════════════════════════

export class TestingLevelService {
  static async list(): Promise<TestingLevel[]> {
    const result = await pool.query(
      'SELECT * FROM qa_testing_levels ORDER BY sort_order ASC'
    );
    return result.rows;
  }

  static async getByType(testType: string): Promise<TestingLevel | null> {
    const result = await pool.query(
      'SELECT * FROM qa_testing_levels WHERE test_type = $1',
      [testType]
    );
    return result.rows[0] || null;
  }

  static async upsert(data: {
    test_type: string;
    tool_name: string;
    coverage_target: string;
    responsible_role: string;
    description?: string;
    is_mandatory?: boolean;
    run_frequency?: string;
    sort_order?: number;
  }): Promise<TestingLevel> {
    const result = await pool.query(
      `INSERT INTO qa_testing_levels (test_type, tool_name, coverage_target, responsible_role, description, is_mandatory, run_frequency, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (test_type) DO UPDATE SET
         tool_name = EXCLUDED.tool_name,
         coverage_target = EXCLUDED.coverage_target,
         responsible_role = EXCLUDED.responsible_role,
         description = EXCLUDED.description,
         is_mandatory = EXCLUDED.is_mandatory,
         run_frequency = EXCLUDED.run_frequency,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING *`,
      [
        data.test_type, data.tool_name, data.coverage_target,
        data.responsible_role, data.description || null,
        data.is_mandatory ?? true, data.run_frequency || 'per_commit',
        data.sort_order ?? 0,
      ]
    );
    return result.rows[0];
  }

  static async delete(testType: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM qa_testing_levels WHERE test_type = $1 RETURNING id',
      [testType]
    );
    return (result.rowCount || 0) > 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// §15.2 — Definition of Done Service
// ═══════════════════════════════════════════════════════════════════════════════

export class DoDService {
  // ─── Checklist Management ──────────────────────────────────────────────

  static async listChecklist(category?: string): Promise<DoDItem[]> {
    let query = 'SELECT * FROM qa_dod_checklist';
    const params: unknown[] = [];
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    query += ' ORDER BY sort_order ASC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async upsertChecklistItem(data: {
    code: string;
    title_ar: string;
    title_en: string;
    category?: string;
    is_required?: boolean;
    sort_order?: number;
  }): Promise<DoDItem> {
    const result = await pool.query(
      `INSERT INTO qa_dod_checklist (code, title_ar, title_en, category, is_required, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO UPDATE SET
         title_ar = EXCLUDED.title_ar,
         title_en = EXCLUDED.title_en,
         category = EXCLUDED.category,
         is_required = EXCLUDED.is_required,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING *`,
      [
        data.code, data.title_ar, data.title_en,
        data.category || 'general', data.is_required ?? true,
        data.sort_order ?? 0,
      ]
    );
    return result.rows[0];
  }

  static async deleteChecklistItem(code: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM qa_dod_checklist WHERE code = $1 RETURNING id',
      [code]
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Compliance Tracking ───────────────────────────────────────────────

  static async getCompliance(referenceType: string, referenceId: string): Promise<Array<DoDCompliance & {
    code: string; title_ar: string; title_en: string; category: string; is_required: boolean;
  }>> {
    const result = await pool.query(
      `SELECT c.*, d.code, d.title_ar, d.title_en, d.category, d.is_required
       FROM qa_dod_checklist d
       LEFT JOIN qa_dod_compliance c
         ON c.checklist_id = d.id AND c.reference_type = $1 AND c.reference_id = $2
       ORDER BY d.sort_order ASC`,
      [referenceType, referenceId]
    );
    return result.rows;
  }

  static async setCompliance(data: {
    reference_type: string;
    reference_id: string;
    checklist_id: number;
    is_met: boolean;
    verified_by?: number;
    notes?: string;
    tenant_id?: number;
  }): Promise<DoDCompliance> {
    const result = await pool.query(
      `INSERT INTO qa_dod_compliance (reference_type, reference_id, checklist_id, is_met, verified_by, verified_at, notes, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (reference_type, reference_id, checklist_id) DO UPDATE SET
         is_met = EXCLUDED.is_met,
         verified_by = EXCLUDED.verified_by,
         verified_at = EXCLUDED.verified_at,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [
        data.reference_type, data.reference_id, data.checklist_id,
        data.is_met,
        data.verified_by || null,
        data.is_met ? new Date().toISOString() : null,
        data.notes || null,
        data.tenant_id || null,
      ]
    );
    return result.rows[0];
  }

  static async batchSetCompliance(
    referenceType: string,
    referenceId: string,
    items: Array<{ checklist_id: number; is_met: boolean; notes?: string }>,
    verifiedBy: number,
    tenantId?: number,
  ): Promise<number> {
    let updated = 0;
    for (const item of items) {
      await this.setCompliance({
        reference_type: referenceType,
        reference_id: referenceId,
        checklist_id: item.checklist_id,
        is_met: item.is_met,
        verified_by: verifiedBy,
        notes: item.notes,
        tenant_id: tenantId,
      });
      updated++;
    }
    return updated;
  }

  static async getComplianceSummary(referenceType: string, referenceId: string): Promise<{
    total: number;
    met: number;
    not_met: number;
    pending: number;
    required_total: number;
    required_met: number;
    is_complete: boolean;
  }> {
    const rows = await this.getCompliance(referenceType, referenceId);
    const total = rows.length;
    const met = rows.filter(r => r.is_met).length;
    const notMet = rows.filter(r => r.is_met === false && r.id !== null).length;
    const pending = total - met - notMet;
    const requiredItems = rows.filter(r => r.is_required);
    const requiredMet = requiredItems.filter(r => r.is_met).length;

    return {
      total,
      met,
      not_met: notMet,
      pending,
      required_total: requiredItems.length,
      required_met: requiredMet,
      is_complete: requiredMet === requiredItems.length,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// §15.3 — Branch Policies Service
// ═══════════════════════════════════════════════════════════════════════════════

export class BranchPolicyService {
  static async list(): Promise<BranchPolicy[]> {
    const result = await pool.query(
      'SELECT * FROM qa_branch_policies ORDER BY sort_order ASC'
    );
    return result.rows;
  }

  static async getByPattern(pattern: string): Promise<BranchPolicy | null> {
    const result = await pool.query(
      'SELECT * FROM qa_branch_policies WHERE branch_pattern = $1',
      [pattern]
    );
    return result.rows[0] || null;
  }

  static async upsert(data: {
    branch_pattern: string;
    purpose_ar: string;
    purpose_en: string;
    who_can_push: string;
    merge_condition_ar: string;
    merge_condition_en: string;
    is_protected?: boolean;
    requires_review?: boolean;
    min_reviewers?: number;
    requires_ci_pass?: boolean;
    auto_delete_on_merge?: boolean;
    sort_order?: number;
  }): Promise<BranchPolicy> {
    const result = await pool.query(
      `INSERT INTO qa_branch_policies
         (branch_pattern, purpose_ar, purpose_en, who_can_push, merge_condition_ar, merge_condition_en,
          is_protected, requires_review, min_reviewers, requires_ci_pass, auto_delete_on_merge, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (branch_pattern) DO UPDATE SET
         purpose_ar = EXCLUDED.purpose_ar,
         purpose_en = EXCLUDED.purpose_en,
         who_can_push = EXCLUDED.who_can_push,
         merge_condition_ar = EXCLUDED.merge_condition_ar,
         merge_condition_en = EXCLUDED.merge_condition_en,
         is_protected = EXCLUDED.is_protected,
         requires_review = EXCLUDED.requires_review,
         min_reviewers = EXCLUDED.min_reviewers,
         requires_ci_pass = EXCLUDED.requires_ci_pass,
         auto_delete_on_merge = EXCLUDED.auto_delete_on_merge,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING *`,
      [
        data.branch_pattern, data.purpose_ar, data.purpose_en,
        data.who_can_push, data.merge_condition_ar, data.merge_condition_en,
        data.is_protected ?? false, data.requires_review ?? true,
        data.min_reviewers ?? 1, data.requires_ci_pass ?? true,
        data.auto_delete_on_merge ?? false, data.sort_order ?? 0,
      ]
    );
    return result.rows[0];
  }

  static async delete(pattern: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM qa_branch_policies WHERE branch_pattern = $1 RETURNING id',
      [pattern]
    );
    return (result.rowCount || 0) > 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Run Results Service
// ═══════════════════════════════════════════════════════════════════════════════

export class TestRunService {
  static async list(params: {
    test_type?: string;
    branch?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: TestRun[]; total: number; page: number; per_page: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.test_type) { conditions.push(`test_type = $${idx}`); values.push(params.test_type); idx++; }
    if (params.branch) { conditions.push(`branch = $${idx}`); values.push(params.branch); idx++; }
    if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM qa_test_runs ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM qa_test_runs ${where}`, values),
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      per_page: limit,
    };
  }

  static async getById(id: number): Promise<TestRun | null> {
    const result = await pool.query('SELECT * FROM qa_test_runs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(data: {
    test_type: string;
    run_source?: string;
    branch?: string;
    commit_hash?: string;
    total_tests: number;
    passed: number;
    failed: number;
    skipped?: number;
    coverage_pct?: number;
    duration_ms?: number;
    status?: string;
    report_url?: string;
    metadata?: Record<string, unknown>;
    tenant_id?: number;
  }): Promise<TestRun> {
    const result = await pool.query(
      `INSERT INTO qa_test_runs
         (test_type, run_source, branch, commit_hash, total_tests, passed, failed, skipped,
          coverage_pct, duration_ms, status, report_url, metadata, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        data.test_type, data.run_source || null, data.branch || null,
        data.commit_hash || null, data.total_tests, data.passed, data.failed,
        data.skipped || 0, data.coverage_pct ?? null, data.duration_ms ?? null,
        data.status || 'completed', data.report_url || null,
        JSON.stringify(data.metadata || {}), data.tenant_id || null,
      ]
    );
    return result.rows[0];
  }

  /** Get latest run per test type (dashboard widget) */
  static async getLatestByType(): Promise<TestRun[]> {
    const result = await pool.query(
      `SELECT DISTINCT ON (test_type) *
       FROM qa_test_runs
       WHERE status = 'completed'
       ORDER BY test_type, created_at DESC`
    );
    return result.rows;
  }

  /** Aggregate stats for a branch */
  static async getBranchStats(branch: string): Promise<{
    total_runs: number;
    by_type: Record<string, { runs: number; avg_coverage: number | null; avg_pass_rate: number }>;
  }> {
    const result = await pool.query(
      `SELECT test_type,
              COUNT(*) AS runs,
              ROUND(AVG(coverage_pct), 2) AS avg_coverage,
              ROUND(AVG(CASE WHEN total_tests > 0 THEN (passed::numeric / total_tests) * 100 ELSE 0 END), 2) AS avg_pass_rate
       FROM qa_test_runs
       WHERE branch = $1 AND status = 'completed'
       GROUP BY test_type`,
      [branch]
    );

    const byType: Record<string, { runs: number; avg_coverage: number | null; avg_pass_rate: number }> = {};
    let totalRuns = 0;
    for (const row of result.rows) {
      byType[row.test_type] = {
        runs: parseInt(row.runs, 10),
        avg_coverage: row.avg_coverage ? parseFloat(row.avg_coverage) : null,
        avg_pass_rate: parseFloat(row.avg_pass_rate),
      };
      totalRuns += parseInt(row.runs, 10);
    }

    return { total_runs: totalRuns, by_type: byType };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Quality Gates Service
// ═══════════════════════════════════════════════════════════════════════════════

export class QualityGateService {
  static async list(activeOnly: boolean = false): Promise<QualityGate[]> {
    const where = activeOnly ? 'WHERE is_active = TRUE' : '';
    const result = await pool.query(
      `SELECT * FROM qa_quality_gates ${where} ORDER BY test_type, name`
    );
    return result.rows;
  }

  static async getById(id: number): Promise<QualityGate | null> {
    const result = await pool.query('SELECT * FROM qa_quality_gates WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async upsert(data: {
    name: string;
    description?: string;
    test_type: string;
    metric: string;
    operator?: string;
    threshold: number;
    is_blocking?: boolean;
    is_active?: boolean;
  }): Promise<QualityGate> {
    const result = await pool.query(
      `INSERT INTO qa_quality_gates (name, description, test_type, metric, operator, threshold, is_blocking, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO UPDATE SET
         description = EXCLUDED.description,
         test_type = EXCLUDED.test_type,
         metric = EXCLUDED.metric,
         operator = EXCLUDED.operator,
         threshold = EXCLUDED.threshold,
         is_blocking = EXCLUDED.is_blocking,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [
        data.name, data.description || null, data.test_type,
        data.metric, data.operator || '>=', data.threshold,
        data.is_blocking ?? true, data.is_active ?? true,
      ]
    );
    return result.rows[0];
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM qa_quality_gates WHERE id = $1 RETURNING id',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  /** Evaluate a test run against all active gates for its type */
  static async evaluate(testRun: TestRun): Promise<Array<{
    gate: QualityGate;
    actual_value: number;
    passed: boolean;
  }>> {
    const gates = await pool.query(
      'SELECT * FROM qa_quality_gates WHERE test_type = $1 AND is_active = TRUE',
      [testRun.test_type]
    );

    return gates.rows.map((gate: QualityGate) => {
      let actualValue = 0;

      // Derive metric value from test run
      switch (gate.metric) {
        case 'coverage_pct':
          actualValue = testRun.coverage_pct ?? 0;
          break;
        case 'pass_rate':
          actualValue = testRun.total_tests > 0
            ? (testRun.passed / testRun.total_tests) * 100
            : 0;
          break;
        case 'lighthouse_score':
          actualValue = (testRun.metadata as any)?.lighthouse_score ?? 0;
          break;
        case 'p95_latency':
          actualValue = (testRun.metadata as any)?.p95_latency ?? 9999;
          break;
        default:
          actualValue = 0;
      }

      let passed = false;
      switch (gate.operator) {
        case '>=': passed = actualValue >= gate.threshold; break;
        case '<=': passed = actualValue <= gate.threshold; break;
        case '>':  passed = actualValue > gate.threshold;  break;
        case '<':  passed = actualValue < gate.threshold;  break;
        case '==': passed = actualValue === gate.threshold; break;
        default:   passed = actualValue >= gate.threshold;
      }

      return { gate, actual_value: actualValue, passed };
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QA Dashboard Summary
// ═══════════════════════════════════════════════════════════════════════════════

export class QADashboardService {
  static async getSummary(): Promise<{
    testing_levels: TestingLevel[];
    dod_checklist: DoDItem[];
    branch_policies: BranchPolicy[];
    quality_gates: QualityGate[];
    latest_test_runs: TestRun[];
    total_test_runs: number;
  }> {
    const [levels, dod, policies, gates, latestRuns, runCount] = await Promise.all([
      TestingLevelService.list(),
      DoDService.listChecklist(),
      BranchPolicyService.list(),
      QualityGateService.list(true),
      TestRunService.getLatestByType(),
      pool.query('SELECT COUNT(*) FROM qa_test_runs'),
    ]);

    return {
      testing_levels: levels,
      dod_checklist: dod,
      branch_policies: policies,
      quality_gates: gates,
      latest_test_runs: latestRuns,
      total_test_runs: parseInt(runCount.rows[0].count, 10),
    };
  }
}
