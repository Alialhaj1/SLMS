/**
 * Projects API Routes
 * ====================
 * Comprehensive API for project management with hierarchy support,
 * cost tracking, and integration with other modules.
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { loadCompanyContext } from '../../middleware/companyContext';
import { auditLog } from '../../middleware/auditLog';
import { z } from 'zod';

const router = Router();

// =============================================
// VALIDATION SCHEMAS
// =============================================

const projectSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(150),
  name_ar: z.string().max(150).optional().nullable(),
  description: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  parent_project_id: z.number().int().positive().optional().nullable(),
  project_type_id: z.number().int().positive().optional().nullable(),
  customer_id: z.number().int().positive().optional().nullable(),
  manager_id: z.number().int().positive().optional().nullable(),
  manager_name: z.string().max(150).optional().nullable(),
  vendor_id: z.number().int().positive().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget: z.number().min(0).default(0),
  budget_materials: z.number().min(0).default(0),
  budget_labor: z.number().min(0).default(0),
  budget_services: z.number().min(0).default(0),
  budget_miscellaneous: z.number().min(0).default(0),
  status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).default('planned'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  cost_center_id: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().default(true),
});

const projectItemSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  description: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  parent_item_id: z.number().int().positive().optional().nullable(),
  item_type: z.enum(['task', 'milestone', 'deliverable', 'phase']).default('task'),
  assigned_to_id: z.number().int().positive().optional().nullable(),
  vendor_id: z.number().int().positive().optional().nullable(),
  planned_start_date: z.string().optional().nullable(),
  planned_end_date: z.string().optional().nullable(),
  estimated_cost: z.number().min(0).default(0),
  estimated_hours: z.number().min(0).default(0),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  is_active: z.boolean().default(true),
});

// =============================================
// GET /api/projects - List projects
// =============================================
router.get('/',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Company context required' } 
        });
      }

      const {
        search,
        status,
        priority,
        project_type_id,
        parent_project_id,
        manager_id,
        is_active,
        page = '1',
        limit = '20',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const params: any[] = [companyId];
      let paramIndex = 2;

      let whereClauses = ['p.company_id = $1', 'p.deleted_at IS NULL'];

      // Filters
      if (search) {
        whereClauses.push(`(p.code ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex} OR p.name_ar ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status && status !== 'all') {
        whereClauses.push(`p.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (priority && priority !== 'all') {
        whereClauses.push(`p.priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }

      if (project_type_id && project_type_id !== 'all') {
        whereClauses.push(`p.project_type_id = $${paramIndex}`);
        params.push(Number(project_type_id));
        paramIndex++;
      }

      if (parent_project_id === 'root') {
        whereClauses.push('p.parent_project_id IS NULL');
      } else if (parent_project_id && parent_project_id !== 'all') {
        whereClauses.push(`p.parent_project_id = $${paramIndex}`);
        params.push(Number(parent_project_id));
        paramIndex++;
      }

      if (manager_id && manager_id !== 'all') {
        whereClauses.push(`p.manager_id = $${paramIndex}`);
        params.push(Number(manager_id));
        paramIndex++;
      }

      if (is_active !== undefined && is_active !== '') {
        whereClauses.push(`p.is_active = $${paramIndex}`);
        params.push(String(is_active) === 'true');
        paramIndex++;
      }

      const whereClause = whereClauses.join(' AND ');

      // Sorting
      const allowedSorts = ['code', 'name', 'start_date', 'end_date', 'budget', 'progress_percent', 'status', 'created_at'];
      const sortField = allowedSorts.includes(String(sortBy)) ? `p.${sortBy}` : 'p.created_at';
      const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM projects p WHERE ${whereClause}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;

      // Pagination
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum);
      params.push(offset);

      // Main query with aggregates
      const query = `
        SELECT 
          p.*,
          pt.code AS project_type_code,
          pt.name AS project_type_name,
          pt.name_ar AS project_type_name_ar,
          pt.icon AS project_type_icon,
          pt.color AS project_type_color,
          parent.code AS parent_project_code,
          parent.name AS parent_project_name,
          COALESCE(m.full_name, p.manager_name) AS manager_display_name,
          cc.name AS cost_center_name,
          v.name AS vendor_name,
          v.name_ar AS vendor_name_ar,
          v.code AS vendor_code,
          COALESCE(children.cnt, 0)::int AS children_count,
          COALESCE(items.cnt, 0)::int AS items_count,
          COALESCE(costs.total, 0)::decimal AS total_actual_cost,
          COALESCE(links_shipment.cnt, 0)::int AS shipments_count,
          COALESCE(links_invoice.cnt, 0)::int AS invoices_count,
          COALESCE(links_expense.cnt, 0)::int AS expenses_count,
          COALESCE(links_payment.cnt, 0)::int AS payments_count
        FROM projects p
        LEFT JOIN project_types pt ON p.project_type_id = pt.id
        LEFT JOIN projects parent ON p.parent_project_id = parent.id
        LEFT JOIN users m ON p.manager_id = m.id
        LEFT JOIN cost_centers cc ON p.cost_center_id = cc.id
        LEFT JOIN vendors v ON p.vendor_id = v.id
        LEFT JOIN (
          SELECT parent_project_id, COUNT(*)::int AS cnt 
          FROM projects WHERE deleted_at IS NULL 
          GROUP BY parent_project_id
        ) children ON children.parent_project_id = p.id
        LEFT JOIN (
          SELECT project_id, COUNT(*)::int AS cnt 
          FROM project_items WHERE deleted_at IS NULL 
          GROUP BY project_id
        ) items ON items.project_id = p.id
        LEFT JOIN (
          SELECT project_id, SUM(actual_amount)::decimal AS total 
          FROM project_costs WHERE deleted_at IS NULL 
          GROUP BY project_id
        ) costs ON costs.project_id = p.id
        LEFT JOIN (
          SELECT project_id, COUNT(*)::int AS cnt 
          FROM project_links WHERE link_type = 'shipment' 
          GROUP BY project_id
        ) links_shipment ON links_shipment.project_id = p.id
        LEFT JOIN (
          SELECT project_id, COUNT(*)::int AS cnt 
          FROM project_links WHERE link_type IN ('purchase_invoice', 'sales_invoice') 
          GROUP BY project_id
        ) links_invoice ON links_invoice.project_id = p.id
        LEFT JOIN (
          SELECT project_id, COUNT(*)::int AS cnt 
          FROM project_links WHERE link_type = 'expense' 
          GROUP BY project_id
        ) links_expense ON links_expense.project_id = p.id
        LEFT JOIN (
          SELECT project_id, COUNT(*)::int AS cnt 
          FROM project_links WHERE link_type = 'payment' 
          GROUP BY project_id
        ) links_payment ON links_payment.project_id = p.id
        WHERE ${whereClause}
        ORDER BY ${sortField} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });

    } catch (error: any) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch projects' }
      });
    }
  }
);

// =============================================
// GET /api/projects/types - List project types
// =============================================
router.get('/types',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;

      const result = await pool.query(`
        SELECT * FROM project_types 
        WHERE (company_id = $1 OR company_id IS NULL)
          AND is_active = TRUE
        ORDER BY sort_order, name
      `, [companyId]);

      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching project types:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch project types' }
      });
    }
  }
);

// =============================================
// POST /api/projects/types - Create project type
// =============================================
router.post('/types',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Company context required' } 
        });
      }

      const { code, name, name_ar, description, description_ar, icon, color, sort_order, is_active } = req.body;

      if (!code || !name) {
        return res.status(400).json({
          success: false,
          error: { message: 'Code and name are required' }
        });
      }

      // Check for duplicate code
      const existing = await pool.query(
        'SELECT id FROM project_types WHERE code = $1 AND company_id = $2',
        [code, companyId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: { message: 'Project type code already exists' }
        });
      }

      const result = await pool.query(`
        INSERT INTO project_types (company_id, code, name, name_ar, description, description_ar, icon, color, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [companyId, code, name, name_ar || null, description || null, description_ar || null, icon || 'folder', color || '#6366f1', sort_order || 0, is_active !== false]);

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error creating project type:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to create project type' }
      });
    }
  }
);

// =============================================
// PUT /api/projects/types/:id - Update project type
// =============================================
router.put('/types/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const typeId = parseInt(req.params.id, 10);

      if (!companyId) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Company context required' } 
        });
      }

      // Check if exists
      const existing = await pool.query(
        'SELECT * FROM project_types WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)',
        [typeId, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Project type not found' }
        });
      }

      const { name, name_ar, description, description_ar, icon, color, sort_order, is_active } = req.body;

      const result = await pool.query(`
        UPDATE project_types SET
          name = COALESCE($1, name),
          name_ar = $2,
          description = $3,
          description_ar = $4,
          icon = COALESCE($5, icon),
          color = COALESCE($6, color),
          sort_order = COALESCE($7, sort_order),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `, [name, name_ar, description, description_ar, icon, color, sort_order, is_active, typeId]);

      return res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error updating project type:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to update project type' }
      });
    }
  }
);

// =============================================
// DELETE /api/projects/types/:id - Delete project type
// =============================================
router.delete('/types/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const typeId = parseInt(req.params.id, 10);

      if (!companyId) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Company context required' } 
        });
      }

      // Check if exists
      const existing = await pool.query(
        'SELECT * FROM project_types WHERE id = $1 AND company_id = $2',
        [typeId, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Project type not found' }
        });
      }

      // Check if in use
      const inUse = await pool.query(
        'SELECT id FROM projects WHERE project_type_id = $1 AND deleted_at IS NULL LIMIT 1',
        [typeId]
      );
      if (inUse.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: { message: 'Cannot delete project type that is in use' }
        });
      }

      await pool.query('DELETE FROM project_types WHERE id = $1', [typeId]);

      return res.json({
        success: true,
        message: 'Project type deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting project type:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete project type' }
      });
    }
  }
);

// =============================================
// GET /api/projects/hierarchy - Get project tree
// =============================================
router.get('/hierarchy',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Company context required' } 
        });
      }

      const result = await pool.query(`
        WITH RECURSIVE project_tree AS (
          SELECT 
            p.id, p.code, p.name, p.name_ar, p.parent_project_id,
            p.budget, p.status, p.progress_percent, p.level,
            ARRAY[p.id] AS path,
            p.code AS tree_path
          FROM projects p
          WHERE p.company_id = $1 
            AND p.deleted_at IS NULL 
            AND p.parent_project_id IS NULL
          
          UNION ALL
          
          SELECT 
            c.id, c.code, c.name, c.name_ar, c.parent_project_id,
            c.budget, c.status, c.progress_percent, c.level,
            pt.path || c.id,
            pt.tree_path || ' > ' || c.code
          FROM projects c
          INNER JOIN project_tree pt ON c.parent_project_id = pt.id
          WHERE c.company_id = $1 AND c.deleted_at IS NULL
        )
        SELECT * FROM project_tree ORDER BY tree_path
      `, [companyId]);

      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching project hierarchy:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch project hierarchy' }
      });
    }
  }
);

// =============================================
// GET /api/projects/stats - Dashboard statistics
// =============================================
router.get('/stats',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Company context required' } 
        });
      }

      // Get stats
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*)::int AS total_projects,
          SUM(budget)::decimal AS total_budget,
          SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END)::int AS planned_count,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)::int AS in_progress_count,
          SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END)::int AS on_hold_count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int AS completed_count,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)::int AS cancelled_count,
          SUM(CASE WHEN progress_percent >= 80 AND status = 'in_progress' THEN 1 ELSE 0 END)::int AS near_completion,
          SUM(CASE WHEN end_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END)::int AS overdue
        FROM projects 
        WHERE company_id = $1 AND deleted_at IS NULL
      `, [companyId]);

      // Get by type
      const byTypeResult = await pool.query(`
        SELECT 
          pt.id AS type_id,
          pt.name AS type_name,
          pt.name_ar AS type_name_ar,
          pt.icon,
          pt.color,
          COUNT(p.id)::int AS count,
          COALESCE(SUM(p.budget), 0)::decimal AS budget
        FROM project_types pt
        LEFT JOIN projects p ON p.project_type_id = pt.id 
          AND p.company_id = $1 AND p.deleted_at IS NULL
        WHERE pt.is_active = TRUE AND (pt.company_id = $1 OR pt.company_id IS NULL)
        GROUP BY pt.id, pt.name, pt.name_ar, pt.icon, pt.color
        ORDER BY count DESC
      `, [companyId]);

      // Get total costs
      const costsResult = await pool.query(`
        SELECT COALESCE(SUM(actual_amount), 0)::decimal AS total_actual_cost
        FROM project_costs pc
        INNER JOIN projects p ON pc.project_id = p.id
        WHERE p.company_id = $1 AND p.deleted_at IS NULL AND pc.deleted_at IS NULL
      `, [companyId]);

      const stats = statsResult.rows[0] || {};
      const totalBudget = Number(stats.total_budget) || 0;
      const totalActualCost = Number(costsResult.rows[0]?.total_actual_cost) || 0;

      return res.json({
        success: true,
        data: {
          total_projects: stats.total_projects || 0,
          total_budget: totalBudget,
          total_actual_cost: totalActualCost,
          budget_utilization_percent: totalBudget > 0 ? Math.round((totalActualCost / totalBudget) * 100) : 0,
          by_status: [
            { status: 'planned', count: stats.planned_count || 0 },
            { status: 'in_progress', count: stats.in_progress_count || 0 },
            { status: 'on_hold', count: stats.on_hold_count || 0 },
            { status: 'completed', count: stats.completed_count || 0 },
            { status: 'cancelled', count: stats.cancelled_count || 0 },
          ],
          by_type: byTypeResult.rows,
          projects_near_completion: stats.near_completion || 0,
          projects_overdue: stats.overdue || 0,
        }
      });
    } catch (error: any) {
      console.error('Error fetching project stats:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch project statistics' }
      });
    }
  }
);

// =============================================
// GET /api/projects/:id - Get project detail
// =============================================
router.get('/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const projectId = parseInt(req.params.id, 10);

      if (!companyId || isNaN(projectId)) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Invalid parameters' } 
        });
      }

      // Get project with all related data
      const projectResult = await pool.query(`
        SELECT 
          p.*,
          pt.code AS project_type_code,
          pt.name AS project_type_name,
          pt.name_ar AS project_type_name_ar,
          parent.code AS parent_project_code,
          parent.name AS parent_project_name,
          COALESCE(m.full_name, p.manager_name) AS manager_display_name,
          cc.name AS cost_center_name,
          v.name AS vendor_name,
          v.name_ar AS vendor_name_ar,
          v.code AS vendor_code
        FROM projects p
        LEFT JOIN project_types pt ON p.project_type_id = pt.id
        LEFT JOIN projects parent ON p.parent_project_id = parent.id
        LEFT JOIN users m ON p.manager_id = m.id
        LEFT JOIN cost_centers cc ON p.cost_center_id = cc.id
        LEFT JOIN vendors v ON p.vendor_id = v.id
        WHERE p.id = $1 AND p.company_id = $2 AND p.deleted_at IS NULL
      `, [projectId, companyId]);

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Project not found' }
        });
      }

      const project = projectResult.rows[0];

      // Get children
      const childrenResult = await pool.query(`
        SELECT id, code, name, name_ar, budget, status, progress_percent
        FROM projects
        WHERE parent_project_id = $1 AND deleted_at IS NULL
        ORDER BY code
      `, [projectId]);

      // Get items
      const itemsResult = await pool.query(`
        SELECT pi.*, 
          u.full_name AS assigned_to_name
        FROM project_items pi
        LEFT JOIN users u ON pi.assigned_to_id = u.id
        WHERE pi.project_id = $1 AND pi.deleted_at IS NULL
        ORDER BY pi.sort_order, pi.code
      `, [projectId]);

      // Get costs summary
      const costsResult = await pool.query(`
        SELECT 
          category,
          SUM(budgeted_amount)::decimal AS budgeted,
          SUM(actual_amount)::decimal AS actual
        FROM project_costs
        WHERE project_id = $1 AND deleted_at IS NULL
        GROUP BY category
      `, [projectId]);

      // Get links
      const linksResult = await pool.query(`
        SELECT * FROM project_links
        WHERE project_id = $1
        ORDER BY created_at DESC
      `, [projectId]);

      return res.json({
        success: true,
        data: {
          ...project,
          children: childrenResult.rows,
          items: itemsResult.rows,
          cost_summary: costsResult.rows,
          links: linksResult.rows,
        }
      });

    } catch (error: any) {
      console.error('Error fetching project:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch project' }
      });
    }
  }
);

// =============================================
// POST /api/projects - Create project
// =============================================
router.post('/',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = req.user?.id;

      if (!companyId) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Company context required' } 
        });
      }

      const validation = projectSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: validation.error.errors }
        });
      }

      const data = validation.data;

      // Check if code already exists (handling soft deletes)
      const existingResult = await pool.query(
        'SELECT id, deleted_at FROM projects WHERE company_id = $1 AND code = $2',
        [companyId, data.code]
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        if (!existing.deleted_at) {
          // Code exists and is NOT deleted - reject
          return res.status(400).json({
            success: false,
            error: { message: 'Project code already exists' }
          });
        }
        // Code exists but IS deleted - hard delete the old record to allow reuse
        await pool.query(
          'DELETE FROM projects WHERE id = $1',
          [existing.id]
        );
      }

      // Calculate level based on parent
      let level = 0;
      if (data.parent_project_id) {
        const parentResult = await pool.query(
          'SELECT level FROM projects WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [data.parent_project_id, companyId]
        );
        if (parentResult.rows.length > 0) {
          level = (parentResult.rows[0].level || 0) + 1;
        }
      }

      const result = await pool.query(`
        INSERT INTO projects (
          company_id, code, name, name_ar, description, description_ar,
          parent_project_id, level, project_type_id,
          customer_id, manager_id, manager_name, vendor_id,
          start_date, end_date,
          budget, budget_materials, budget_labor, budget_services, budget_miscellaneous,
          status, priority, cost_center_id, is_active, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) RETURNING *
      `, [
        companyId, data.code, data.name, data.name_ar, data.description, data.description_ar,
        data.parent_project_id, level, data.project_type_id,
        data.customer_id, data.manager_id, data.manager_name, data.vendor_id,
        data.start_date, data.end_date,
        data.budget, data.budget_materials, data.budget_labor, data.budget_services, data.budget_miscellaneous,
        data.status, data.priority, data.cost_center_id, data.is_active, userId
      ]);

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error creating project:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: { message: 'Project code already exists' }
        });
      }
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to create project' }
      });
    }
  }
);

// =============================================
// PUT /api/projects/:id - Update project
// =============================================
router.put('/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const projectId = parseInt(req.params.id, 10);

      if (!companyId || isNaN(projectId)) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Invalid parameters' } 
        });
      }

      const validation = projectSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: validation.error.errors }
        });
      }

      const data = validation.data;

      // Build dynamic update query
      const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const params: any[] = [];
      let paramIndex = 1;

      const fields = [
        'name', 'name_ar', 'description', 'description_ar',
        'parent_project_id', 'project_type_id',
        'customer_id', 'manager_id', 'manager_name', 'vendor_id',
        'start_date', 'end_date', 'actual_start_date', 'actual_end_date',
        'budget', 'budget_materials', 'budget_labor', 'budget_services', 'budget_miscellaneous',
        'status', 'priority', 'progress_percent', 'cost_center_id', 'is_active'
      ];

      for (const field of fields) {
        if ((data as any)[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push((data as any)[field]);
          paramIndex++;
        }
      }

      params.push(projectId);
      params.push(companyId);

      const result = await pool.query(`
        UPDATE projects SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1} AND deleted_at IS NULL
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Project not found' }
        });
      }

      return res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error updating project:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to update project' }
      });
    }
  }
);

// =============================================
// DELETE /api/projects/:id - Soft delete project
// =============================================
router.delete('/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const projectId = parseInt(req.params.id, 10);
      const userId = req.user?.id;

      if (!companyId || isNaN(projectId)) {
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Invalid parameters' } 
        });
      }

      // Check for children
      const childrenResult = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM projects WHERE parent_project_id = $1 AND deleted_at IS NULL',
        [projectId]
      );
      if (childrenResult.rows[0]?.cnt > 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot delete project with children. Delete children first.' }
        });
      }

      const result = await pool.query(`
        UPDATE projects 
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1, is_deleted = TRUE
        WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
        RETURNING id
      `, [userId, projectId, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Project not found' }
        });
      }

      return res.json({
        success: true,
        message: 'Project deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting project:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete project' }
      });
    }
  }
);

// =============================================
// PROJECT ITEMS ENDPOINTS
// =============================================

// GET /api/projects/:id/items
router.get('/:id/items',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const projectId = parseInt(req.params.id, 10);

      const result = await pool.query(`
        SELECT pi.*, 
          u.full_name AS assigned_to_name,
          parent.name AS parent_item_name
        FROM project_items pi
        LEFT JOIN users u ON pi.assigned_to_id = u.id
        LEFT JOIN project_items parent ON pi.parent_item_id = parent.id
        WHERE pi.project_id = $1 AND pi.company_id = $2 AND pi.deleted_at IS NULL
        ORDER BY pi.sort_order, pi.code
      `, [projectId, companyId]);

      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching project items:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch project items' }
      });
    }
  }
);

// POST /api/projects/:id/items
router.post('/:id/items',
  authenticate,
  loadCompanyContext,
  requirePermission('projects:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const projectId = parseInt(req.params.id, 10);
      const userId = req.user?.id;

      const validation = projectItemSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: validation.error.errors }
        });
      }

      const data = validation.data;

      // Calculate level
      let level = 0;
      if (data.parent_item_id) {
        const parentResult = await pool.query(
          'SELECT level FROM project_items WHERE id = $1',
          [data.parent_item_id]
        );
        if (parentResult.rows.length > 0) {
          level = (parentResult.rows[0].level || 0) + 1;
        }
      }

      const result = await pool.query(`
        INSERT INTO project_items (
          company_id, project_id, parent_item_id, code, name, name_ar,
          description, description_ar, item_type,
          assigned_to_id, vendor_id,
          planned_start_date, planned_end_date,
          estimated_cost, estimated_hours, priority, level, is_active, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *
      `, [
        companyId, projectId, data.parent_item_id, data.code, data.name, data.name_ar,
        data.description, data.description_ar, data.item_type,
        data.assigned_to_id, data.vendor_id,
        data.planned_start_date, data.planned_end_date,
        data.estimated_cost, data.estimated_hours, data.priority, level, data.is_active, userId
      ]);

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error creating project item:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to create project item' }
      });
    }
  }
);

export default router;
