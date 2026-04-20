/**
 * §14 — Development Roadmap Service
 *
 * Manages sprint planning/tracking and technology stack registry.
 * Provides CRUD for sprints, deliverables, dependencies, and tech stack entries.
 */

import pool from '../db';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Sprint {
  id: number;
  sprint_number: number;
  name: string;
  duration: string;
  focus_area: string;
  focus_area_en: string;
  deliverables: string;
  status: 'planned' | 'in_progress' | 'completed' | 'blocked';
  progress_pct: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SprintDeliverable {
  id: number;
  sprint_id: number;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechStackEntry {
  id: number;
  layer: string;
  category: string;
  name: string;
  purpose: string;
  alternative: string | null;
  is_primary: boolean;
  adoption_status: 'recommended' | 'adopted' | 'deprecated' | 'evaluating';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SprintDependency {
  id: number;
  sprint_id: number;
  depends_on_sprint_id: number;
  dependency_type: 'finish_to_start' | 'start_to_start';
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §14.1 — Sprint Service
// ═══════════════════════════════════════════════════════════════════════════════

export class SprintService {
  // ─── List all sprints ──────────────────────────────────────────────────
  static async list(params: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Sprint[]; total: number; page: number; per_page: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.status) {
      conditions.push(`status = $${idx}`);
      values.push(params.status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM development_sprints ${where} ORDER BY sprint_number ASC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM development_sprints ${where}`, values),
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      per_page: limit,
    };
  }

  // ─── Get single sprint with deliverables & dependencies ────────────────
  static async getById(sprintId: number): Promise<{
    sprint: Sprint;
    deliverables: SprintDeliverable[];
    dependencies: Array<SprintDependency & { depends_on_name: string }>;
  } | null> {
    const sprintResult = await pool.query(
      'SELECT * FROM development_sprints WHERE id = $1',
      [sprintId]
    );
    if (sprintResult.rows.length === 0) return null;

    const [deliverables, deps] = await Promise.all([
      pool.query(
        'SELECT * FROM sprint_deliverables WHERE sprint_id = $1 ORDER BY priority DESC, id ASC',
        [sprintId]
      ),
      pool.query(
        `SELECT sd.*, ds.name AS depends_on_name
         FROM sprint_dependencies sd
         JOIN development_sprints ds ON ds.id = sd.depends_on_sprint_id
         WHERE sd.sprint_id = $1
         ORDER BY ds.sprint_number ASC`,
        [sprintId]
      ),
    ]);

    return {
      sprint: sprintResult.rows[0],
      deliverables: deliverables.rows,
      dependencies: deps.rows,
    };
  }

  // ─── Create sprint ────────────────────────────────────────────────────
  static async create(data: {
    sprint_number: number;
    name: string;
    duration: string;
    focus_area: string;
    focus_area_en: string;
    deliverables: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    notes?: string;
  }): Promise<Sprint> {
    const result = await pool.query(
      `INSERT INTO development_sprints
         (sprint_number, name, duration, focus_area, focus_area_en, deliverables, status, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.sprint_number, data.name, data.duration,
        data.focus_area, data.focus_area_en, data.deliverables,
        data.status || 'planned', data.start_date || null,
        data.end_date || null, data.notes || null,
      ]
    );
    return result.rows[0];
  }

  // ─── Update sprint ────────────────────────────────────────────────────
  static async update(sprintId: number, data: Partial<{
    name: string;
    duration: string;
    focus_area: string;
    focus_area_en: string;
    deliverables: string;
    status: string;
    progress_pct: number;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
  }>): Promise<Sprint | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE development_sprints SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      [...values, sprintId]
    );
    return result.rows[0] || null;
  }

  // ─── Delete sprint ────────────────────────────────────────────────────
  static async delete(sprintId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM development_sprints WHERE id = $1 RETURNING id',
      [sprintId]
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Get roadmap overview (summary stats) ─────────────────────────────
  static async getOverview(): Promise<{
    total_sprints: number;
    by_status: Record<string, number>;
    overall_progress: number;
    current_sprint: Sprint | null;
    next_sprint: Sprint | null;
  }> {
    const [allSprints, statusCounts] = await Promise.all([
      pool.query('SELECT * FROM development_sprints ORDER BY sprint_number ASC'),
      pool.query(
        `SELECT status, COUNT(*) AS count FROM development_sprints GROUP BY status`
      ),
    ]);

    const sprints: Sprint[] = allSprints.rows;
    const byStatus: Record<string, number> = {};
    for (const row of statusCounts.rows) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    // Overall progress = avg of all sprint progress_pct
    const totalProgress = sprints.length > 0
      ? Math.round(sprints.reduce((sum, s) => sum + s.progress_pct, 0) / sprints.length)
      : 0;

    // Current = first in_progress sprint; Next = first planned sprint after current
    const current = sprints.find(s => s.status === 'in_progress') || null;
    const next = sprints.find(s => s.status === 'planned') || null;

    return {
      total_sprints: sprints.length,
      by_status: byStatus,
      overall_progress: totalProgress,
      current_sprint: current,
      next_sprint: next,
    };
  }

  // ─── Dependency management ────────────────────────────────────────────
  static async addDependency(sprintId: number, dependsOnId: number, type: string = 'finish_to_start'): Promise<SprintDependency> {
    const result = await pool.query(
      `INSERT INTO sprint_dependencies (sprint_id, depends_on_sprint_id, dependency_type)
       VALUES ($1, $2, $3) RETURNING *`,
      [sprintId, dependsOnId, type]
    );
    return result.rows[0];
  }

  static async removeDependency(sprintId: number, dependsOnId: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM sprint_dependencies WHERE sprint_id = $1 AND depends_on_sprint_id = $2 RETURNING id`,
      [sprintId, dependsOnId]
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Timeline (Gantt-ready data) ──────────────────────────────────────
  static async getTimeline(): Promise<Array<Sprint & { dependencies: number[] }>> {
    const [sprints, deps] = await Promise.all([
      pool.query('SELECT * FROM development_sprints ORDER BY sprint_number ASC'),
      pool.query('SELECT sprint_id, depends_on_sprint_id FROM sprint_dependencies'),
    ]);

    const depMap = new Map<number, number[]>();
    for (const d of deps.rows) {
      if (!depMap.has(d.sprint_id)) depMap.set(d.sprint_id, []);
      depMap.get(d.sprint_id)!.push(d.depends_on_sprint_id);
    }

    return sprints.rows.map((s: Sprint) => ({
      ...s,
      dependencies: depMap.get(s.id) || [],
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// §14.1 — Sprint Deliverables Service
// ═══════════════════════════════════════════════════════════════════════════════

export class DeliverableService {
  static async list(sprintId: number): Promise<SprintDeliverable[]> {
    const result = await pool.query(
      `SELECT * FROM sprint_deliverables WHERE sprint_id = $1 ORDER BY priority DESC, id ASC`,
      [sprintId]
    );
    return result.rows;
  }

  static async create(sprintId: number, data: {
    title: string;
    description?: string;
    priority?: string;
    assigned_to?: string;
  }): Promise<SprintDeliverable> {
    const result = await pool.query(
      `INSERT INTO sprint_deliverables (sprint_id, title, description, priority, assigned_to)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sprintId, data.title, data.description || null, data.priority || 'medium', data.assigned_to || null]
    );
    return result.rows[0];
  }

  static async update(deliverableId: number, data: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assigned_to: string | null;
  }>): Promise<SprintDeliverable | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return null;

    // Auto-set completed_at
    if (data.status === 'completed') {
      fields.push(`completed_at = NOW()`);
    } else if (data.status && data.status !== 'completed') {
      fields.push(`completed_at = NULL`);
    }

    fields.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE sprint_deliverables SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      [...values, deliverableId]
    );
    return result.rows[0] || null;
  }

  static async delete(deliverableId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM sprint_deliverables WHERE id = $1 RETURNING id',
      [deliverableId]
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Batch update status (e.g., bulk-complete all for a sprint) ────────
  static async batchUpdateStatus(deliverableIds: number[], status: string): Promise<number> {
    if (deliverableIds.length === 0) return 0;
    const completedAtClause = status === 'completed' ? ', completed_at = NOW()' : ', completed_at = NULL';
    const result = await pool.query(
      `UPDATE sprint_deliverables SET status = $1, updated_at = NOW() ${completedAtClause}
       WHERE id = ANY($2) RETURNING id`,
      [status, deliverableIds]
    );
    return result.rowCount || 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// §14.2 — Technology Stack Service
// ═══════════════════════════════════════════════════════════════════════════════

export class TechStackService {
  // ─── List all entries, optionally filter by layer/category/status ──────
  static async list(params: {
    layer?: string;
    category?: string;
    adoption_status?: string;
    is_primary?: boolean;
  } = {}): Promise<TechStackEntry[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.layer) {
      conditions.push(`layer = $${idx}`); values.push(params.layer); idx++;
    }
    if (params.category) {
      conditions.push(`category = $${idx}`); values.push(params.category); idx++;
    }
    if (params.adoption_status) {
      conditions.push(`adoption_status = $${idx}`); values.push(params.adoption_status); idx++;
    }
    if (params.is_primary !== undefined) {
      conditions.push(`is_primary = $${idx}`); values.push(params.is_primary); idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM technology_stack ${where} ORDER BY layer ASC, category ASC, name ASC`,
      values
    );
    return result.rows;
  }

  // ─── Get grouped by layer ─────────────────────────────────────────────
  static async getGroupedByLayer(): Promise<Record<string, TechStackEntry[]>> {
    const all = await this.list();
    const grouped: Record<string, TechStackEntry[]> = {};
    for (const entry of all) {
      if (!grouped[entry.layer]) grouped[entry.layer] = [];
      grouped[entry.layer].push(entry);
    }
    return grouped;
  }

  // ─── Get single entry ─────────────────────────────────────────────────
  static async getById(id: number): Promise<TechStackEntry | null> {
    const result = await pool.query('SELECT * FROM technology_stack WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  // ─── Create entry ─────────────────────────────────────────────────────
  static async create(data: {
    layer: string;
    category: string;
    name: string;
    purpose: string;
    alternative?: string;
    is_primary?: boolean;
    adoption_status?: string;
    notes?: string;
  }): Promise<TechStackEntry> {
    const result = await pool.query(
      `INSERT INTO technology_stack (layer, category, name, purpose, alternative, is_primary, adoption_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.layer, data.category, data.name, data.purpose,
        data.alternative || null, data.is_primary ?? true,
        data.adoption_status || 'recommended', data.notes || null,
      ]
    );
    return result.rows[0];
  }

  // ─── Update entry ─────────────────────────────────────────────────────
  static async update(id: number, data: Partial<{
    layer: string;
    category: string;
    name: string;
    purpose: string;
    alternative: string | null;
    is_primary: boolean;
    adoption_status: string;
    notes: string | null;
  }>): Promise<TechStackEntry | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE technology_stack SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      [...values, id]
    );
    return result.rows[0] || null;
  }

  // ─── Delete entry ─────────────────────────────────────────────────────
  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM technology_stack WHERE id = $1 RETURNING id',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Summary: counts by layer and adoption status ─────────────────────
  static async getSummary(): Promise<{
    total: number;
    by_layer: Record<string, number>;
    by_status: Record<string, number>;
    by_category: Record<string, number>;
  }> {
    const [total, byLayer, byStatus, byCat] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM technology_stack'),
      pool.query('SELECT layer, COUNT(*) AS count FROM technology_stack GROUP BY layer ORDER BY layer'),
      pool.query('SELECT adoption_status, COUNT(*) AS count FROM technology_stack GROUP BY adoption_status'),
      pool.query('SELECT category, COUNT(*) AS count FROM technology_stack GROUP BY category ORDER BY category'),
    ]);

    const toRecord = (rows: Array<{ [k: string]: string }>): Record<string, number> => {
      const r: Record<string, number> = {};
      for (const row of rows) {
        const keys = Object.keys(row);
        r[row[keys[0]]] = parseInt(row.count || row[keys[1]], 10);
      }
      return r;
    };

    return {
      total: parseInt(total.rows[0].count, 10),
      by_layer: toRecord(byLayer.rows),
      by_status: toRecord(byStatus.rows),
      by_category: toRecord(byCat.rows),
    };
  }
}
