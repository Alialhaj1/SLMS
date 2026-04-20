/**
 * PROJECT PHASES API
 * ==================
 * Manages project phase templates and project-specific phases.
 * Routes: /api/project-phases
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * Helper to get effective company ID
 */
async function getEffectiveCompanyId(req: Request): Promise<number | null> {
  const companyId = (req as any).companyContext?.companyId || (req as any).user?.company_id;
  if (companyId) return companyId;
  const result = await pool.query(`SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY id LIMIT 1`);
  return result.rows[0]?.id || null;
}

// =============================================
// TEMPLATES — Global phase templates
// =============================================

/**
 * @route   GET /api/project-phases/templates
 * @desc    Get all phase templates (global + company-specific)
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    const result = await pool.query(`
      SELECT id, code, name, name_ar, description, description_ar,
             phase_type, sort_order, duration_days, is_active, created_at
      FROM project_phases
      WHERE is_template = TRUE
        AND deleted_at IS NULL
        AND (company_id IS NULL OR company_id = $1)
      ORDER BY sort_order, name
    `, [companyId]);

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching phase templates:', error);
    return res.status(500).json({ error: 'Failed to fetch phase templates' });
  }
});

/**
 * @route   POST /api/project-phases/templates
 * @desc    Create a new phase template
 */
router.post('/templates', requireAnyPermission(['projects:phases:create', 'projects:create']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    if (!companyId) return res.status(400).json({ error: 'No company found' });

    const { code, name, name_ar, description, description_ar, phase_type, sort_order, duration_days } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await pool.query(`
      INSERT INTO project_phases (company_id, project_id, code, name, name_ar, description, description_ar,
        phase_type, sort_order, duration_days, is_template, is_active, created_by)
      VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE, $10)
      RETURNING *
    `, [companyId, code.toUpperCase(), name, name_ar || null, description || null, description_ar || null,
        phase_type || 'custom', sort_order || 0, duration_days || 0, userId]);

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Phase code already exists' });
    }
    console.error('Error creating phase template:', error);
    return res.status(500).json({ error: 'Failed to create phase template' });
  }
});

/**
 * @route   PATCH /api/project-phases/templates/:id
 * @desc    Update a phase template
 */
router.patch('/templates/:id', requireAnyPermission(['projects:phases:edit', 'projects:update']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, name_ar, description, description_ar, phase_type, sort_order, duration_days, is_active } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx}`); values.push(name); idx++; }
    if (name_ar !== undefined) { fields.push(`name_ar = $${idx}`); values.push(name_ar); idx++; }
    if (description !== undefined) { fields.push(`description = $${idx}`); values.push(description); idx++; }
    if (description_ar !== undefined) { fields.push(`description_ar = $${idx}`); values.push(description_ar); idx++; }
    if (phase_type !== undefined) { fields.push(`phase_type = $${idx}`); values.push(phase_type); idx++; }
    if (sort_order !== undefined) { fields.push(`sort_order = $${idx}`); values.push(sort_order); idx++; }
    if (duration_days !== undefined) { fields.push(`duration_days = $${idx}`); values.push(duration_days); idx++; }
    if (is_active !== undefined) { fields.push(`is_active = $${idx}`); values.push(is_active); idx++; }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(`
      UPDATE project_phases SET ${fields.join(', ')}
      WHERE id = $${idx} AND is_template = TRUE AND deleted_at IS NULL
      RETURNING *
    `, values);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Phase template not found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating phase template:', error);
    return res.status(500).json({ error: 'Failed to update phase template' });
  }
});

/**
 * @route   DELETE /api/project-phases/templates/:id
 * @desc    Soft-delete a phase template
 */
router.delete('/templates/:id', requireAnyPermission(['projects:phases:delete', 'projects:delete']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE project_phases SET deleted_at = NOW()
      WHERE id = $1 AND is_template = TRUE AND deleted_at IS NULL
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Phase template not found' });
    return res.json({ success: true, message: 'Phase template deleted' });
  } catch (error: any) {
    console.error('Error deleting phase template:', error);
    return res.status(500).json({ error: 'Failed to delete phase template' });
  }
});

// =============================================
// PROJECT-SPECIFIC PHASES
// =============================================

/**
 * @route   GET /api/project-phases/project/:projectId
 * @desc    Get phases for a specific project
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    const { projectId } = req.params;

    const result = await pool.query(`
      SELECT pp.*, u.full_name as created_by_name
      FROM project_phases pp
      LEFT JOIN users u ON pp.created_by = u.id
      WHERE pp.project_id = $1
        AND pp.deleted_at IS NULL
        AND (pp.company_id IS NULL OR pp.company_id = $2)
      ORDER BY pp.sort_order, pp.planned_start
    `, [projectId, companyId]);

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching project phases:', error);
    return res.status(500).json({ error: 'Failed to fetch project phases' });
  }
});

/**
 * @route   POST /api/project-phases/project/:projectId
 * @desc    Add a phase to a project
 */
router.post('/project/:projectId', requireAnyPermission(['projects:phases:create', 'projects:create']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    const { projectId } = req.params;
    if (!companyId) return res.status(400).json({ error: 'No company found' });

    // Verify project exists and is open
    const projectCheck = await pool.query(`
      SELECT id, financial_status FROM projects
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [projectId, companyId]);

    if (projectCheck.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    if (projectCheck.rows[0].financial_status === 'closed') {
      return res.status(422).json({ error: 'Cannot add phases to a financially closed project' });
    }

    const { code, name, name_ar, description, description_ar, phase_type,
            sort_order, planned_start, planned_end, budget } = req.body;

    if (!code || !name) return res.status(400).json({ error: 'Code and name are required' });

    // Calculate duration
    let durationDays = 0;
    if (planned_start && planned_end) {
      const start = new Date(planned_start);
      const end = new Date(planned_end);
      durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    const result = await pool.query(`
      INSERT INTO project_phases (company_id, project_id, code, name, name_ar, description, description_ar,
        phase_type, sort_order, planned_start, planned_end, duration_days, budget,
        is_template, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, TRUE, $14)
      RETURNING *
    `, [companyId, projectId, code.toUpperCase(), name, name_ar || null,
        description || null, description_ar || null,
        phase_type || 'custom', sort_order || 0,
        planned_start || null, planned_end || null, durationDays,
        budget || 0, userId]);

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'Phase code already exists for this project' });
    console.error('Error creating project phase:', error);
    return res.status(500).json({ error: 'Failed to create project phase' });
  }
});

/**
 * @route   PATCH /api/project-phases/project/:projectId/:phaseId
 * @desc    Update a project phase
 */
router.patch('/project/:projectId/:phaseId', requireAnyPermission(['projects:phases:edit', 'projects:update']), async (req: Request, res: Response) => {
  try {
    const { projectId, phaseId } = req.params;
    const body = req.body;

    const allowedFields: Record<string, string> = {
      name: 'name', name_ar: 'name_ar', description: 'description', description_ar: 'description_ar',
      phase_type: 'phase_type', sort_order: 'sort_order', planned_start: 'planned_start',
      planned_end: 'planned_end', actual_start: 'actual_start', actual_end: 'actual_end',
      duration_days: 'duration_days', budget: 'budget', actual_cost: 'actual_cost',
      completion_pct: 'completion_pct', status: 'status', is_active: 'is_active'
    };

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, col] of Object.entries(allowedFields)) {
      if (body[key] !== undefined) {
        fields.push(`${col} = $${idx}`);
        values.push(body[key]);
        idx++;
      }
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    fields.push(`updated_at = NOW()`);

    values.push(phaseId, projectId);

    const result = await pool.query(`
      UPDATE project_phases SET ${fields.join(', ')}
      WHERE id = $${idx} AND project_id = $${idx + 1} AND deleted_at IS NULL
      RETURNING *
    `, values);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Phase not found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating project phase:', error);
    return res.status(500).json({ error: 'Failed to update project phase' });
  }
});

/**
 * @route   DELETE /api/project-phases/project/:projectId/:phaseId
 * @desc    Soft-delete a project phase
 */
router.delete('/project/:projectId/:phaseId', requireAnyPermission(['projects:phases:delete', 'projects:delete']), async (req: Request, res: Response) => {
  try {
    const { projectId, phaseId } = req.params;
    const result = await pool.query(`
      UPDATE project_phases SET deleted_at = NOW()
      WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [phaseId, projectId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Phase not found' });
    return res.json({ success: true, message: 'Phase deleted' });
  } catch (error: any) {
    console.error('Error deleting project phase:', error);
    return res.status(500).json({ error: 'Failed to delete project phase' });
  }
});

/**
 * @route   POST /api/project-phases/project/:projectId/from-template
 * @desc    Apply phase templates to a project
 */
router.post('/project/:projectId/from-template', requireAnyPermission(['projects:phases:create', 'projects:create']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    const { projectId } = req.params;
    if (!companyId) return res.status(400).json({ error: 'No company found' });

    // Verify project
    const projectCheck = await client.query(`
      SELECT id, start_date, financial_status FROM projects
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [projectId, companyId]);

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (projectCheck.rows[0].financial_status === 'closed') {
      return res.status(422).json({ error: 'Cannot add phases to a financially closed project' });
    }

    const projectStartDate = projectCheck.rows[0].start_date;

    await client.query('BEGIN');

    // Get all templates
    const templates = await client.query(`
      SELECT code, name, name_ar, description, description_ar, phase_type, sort_order, duration_days
      FROM project_phases
      WHERE is_template = TRUE AND deleted_at IS NULL
        AND (company_id IS NULL OR company_id = $1)
      ORDER BY sort_order
    `, [companyId]);

    if (templates.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No phase templates found' });
    }

    const inserted: any[] = [];
    let currentStart = projectStartDate ? new Date(projectStartDate) : new Date();

    for (const tmpl of templates.rows) {
      const plannedStart = new Date(currentStart);
      const plannedEnd = new Date(currentStart);
      plannedEnd.setDate(plannedEnd.getDate() + (tmpl.duration_days || 0));

      const result = await client.query(`
        INSERT INTO project_phases (company_id, project_id, code, name, name_ar, description, description_ar,
          phase_type, sort_order, planned_start, planned_end, duration_days,
          is_template, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE, TRUE, $13)
        ON CONFLICT (company_id, project_id, code) DO NOTHING
        RETURNING *
      `, [companyId, projectId, tmpl.code, tmpl.name, tmpl.name_ar,
          tmpl.description, tmpl.description_ar, tmpl.phase_type, tmpl.sort_order,
          plannedStart.toISOString().split('T')[0],
          plannedEnd.toISOString().split('T')[0],
          tmpl.duration_days || 0, userId]);

      if (result.rows.length > 0) inserted.push(result.rows[0]);
      currentStart = new Date(plannedEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      data: inserted,
      message: `${inserted.length} phases applied from templates`
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error applying phase templates:', error);
    return res.status(500).json({ error: 'Failed to apply phase templates' });
  } finally {
    client.release();
  }
});

/**
 * @route   PATCH /api/project-phases/project/:projectId/reorder
 * @desc    Reorder phases within a project
 */
router.patch('/project/:projectId/reorder', requireAnyPermission(['projects:phases:edit', 'projects:update']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const { order } = req.body; // Array of { id, sort_order }

    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });

    await client.query('BEGIN');

    for (const item of order) {
      await client.query(`
        UPDATE project_phases SET sort_order = $1, updated_at = NOW()
        WHERE id = $2 AND project_id = $3 AND deleted_at IS NULL
      `, [item.sort_order, item.id, projectId]);
    }

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Phases reordered' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error reordering phases:', error);
    return res.status(500).json({ error: 'Failed to reorder phases' });
  } finally {
    client.release();
  }
});

export default router;
