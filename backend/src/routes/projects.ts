/**
 * PROJECTS API - Enhanced Hierarchical Project Management
 * ========================================================
 * Strict 3-level project hierarchy for procurement/landed cost accounting:
 * - Level 1 (group): Project Group - Accounting grouping only
 * - Level 2 (master): Master Project - One vendor per project
 * - Level 3 (sub): Sub Project - Actual cost-carrying (shipments/LCs)
 * 
 * Routes: /api/projects
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// =============================================
// SCHEMAS
// =============================================

const projectCreateSchema = z.object({
  code: z.string().optional(), // ignored in create, auto-generated
  name: z.string().min(1).max(255),
  name_ar: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  project_level: z.enum(['group', 'master', 'sub']),
  parent_project_id: z.number().optional().nullable(),
  vendor_id: z.number().optional().nullable(),
  project_type_id: z.number().optional().nullable(),
  manager_id: z.number().optional().nullable(),
  manager_name: z.string().optional().nullable(),
  cost_center_id: z.number().optional().nullable(),
  lc_number: z.string().optional().nullable(),
  contract_number: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget: z.number().optional(),
  budget_materials: z.number().optional(),
  budget_labor: z.number().optional(),
  budget_services: z.number().optional(),
  budget_miscellaneous: z.number().optional(),
  budget_allocated: z.number().optional(),
  risk_level: z.string().optional().nullable(),
  tags: z.any().optional().nullable(),
  status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled', 'active', 'draft']).default('active'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  progress_percent: z.number().optional(),
  is_active: z.boolean().default(true),
});

const projectUpdateSchema = projectCreateSchema.partial();

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Generate next project code based on level and parent
 * Numbering system:
 * - Group: 1, 2, 3, ... (simple sequential)
 * - Master: [groupCode]01, [groupCode]02, ... (e.g., group 1 → 101, 102; group 2 → 201, 202)
 * - Sub: [parent]001, [parent]002, ... (e.g., 101001, 101002, 102001)
 */
async function generateProjectCode(
  companyId: number, 
  projectLevel: string,
  parentId: number | null,
  client?: any
): Promise<string> {
  const db = client || pool;
  
  console.log(`[generateProjectCode] INPUT: companyId=${companyId}, projectLevel=${projectLevel}, parentId=${parentId}`);
  
  if (projectLevel === 'group') {
    // Group level: 1, 2, 3, ...
    const result = await db.query(`
      SELECT COALESCE(MAX(CAST(code AS INTEGER)), 0) + 1 as next_seq
      FROM projects
      WHERE company_id = $1
        AND project_level = 'group'
        AND deleted_at IS NULL
        AND code ~ '^[0-9]+$'
        AND CAST(code AS INTEGER) < 100
    `, [companyId]);
    
    const nextSeq = result.rows[0]?.next_seq || 1;
    return String(nextSeq);
  }
  
  if (projectLevel === 'master') {
    // Master level: per-group numbering [groupCode]01, [groupCode]02, ...
    // e.g., Group 1 → 101, 102, 103; Group 2 → 201, 202, 203
    if (!parentId) {
      throw new Error('Parent group is required for master projects');
    }
    
    // Get parent group's code
    const parentResult = await db.query(`
      SELECT code FROM projects WHERE id = $1 AND company_id = $2 AND project_level = 'group'
    `, [parentId, companyId]);
    
    if (parentResult.rows.length === 0) {
      throw new Error('Parent group not found');
    }
    
    const groupCode = parentResult.rows[0].code;
    const prefix = groupCode; // e.g., "1", "2", "3"
    const suffixLen = 2; // two-digit sequence: 01, 02, ...
    const likePattern = prefix + '__'; // exactly 2 more characters
    
    console.log(`[generateProjectCode] Master under group ${parentId}, groupCode=${groupCode}, pattern=${likePattern}`);
    
    const result = await db.query(`
      SELECT COALESCE(MAX(
        CAST(SUBSTRING(code FROM $3::integer) AS INTEGER)
      ), 0) + 1 as next_seq
      FROM projects
      WHERE company_id = $1
        AND parent_project_id = $2
        AND project_level = 'master'
        AND deleted_at IS NULL
        AND code LIKE $4
        AND LENGTH(code) = $5
    `, [companyId, parentId, prefix.length + 1, likePattern, prefix.length + suffixLen]);
    
    const nextSeq = result.rows[0]?.next_seq || 1;
    const generatedCode = prefix + String(nextSeq).padStart(suffixLen, '0');
    console.log(`[generateProjectCode] Master code: ${generatedCode}`);
    return generatedCode;
  }
  
  // Sub level: [parent]001, [parent]002, ...
  if (!parentId) {
    throw new Error('Parent project is required for sub projects');
  }
  
  // Get parent code
  const parentResult = await db.query(`
    SELECT code FROM projects WHERE id = $1 AND company_id = $2
  `, [parentId, companyId]);
  
  if (parentResult.rows.length === 0) {
    throw new Error('Parent project not found');
  }
  
  const parentCode = parentResult.rows[0].code;
  const prefixLength = parentCode.length;
  
  console.log(`[generateProjectCode] parentId=${parentId}, parentCode=${parentCode}, prefixLength=${prefixLength}`);
  
  // Get next sequence under this parent
  // Using LIKE with LENGTH check for more reliable pattern matching
  const likePattern = parentCode + '___'; // exactly 3 more characters
  console.log(`[generateProjectCode] LIKE pattern: ${likePattern}, expected length: ${prefixLength + 3}`);
  console.log(`[generateProjectCode] Query params: companyId=${companyId}, parentId=${parentId}, substringFrom=${prefixLength + 1}, likePattern=${likePattern}`);
  
  // First, let's see what records exist
  const debugResult = await db.query(`
    SELECT id, code, company_id, parent_project_id, deleted_at IS NULL as is_active
    FROM projects 
    WHERE company_id = $1 AND parent_project_id = $2
  `, [companyId, parentId]);
  console.log(`[generateProjectCode] DEBUG - All records under parent ${parentId}:`, JSON.stringify(debugResult.rows));
  
  // Use LIKE with underscore for each digit, and LENGTH check to ensure exact match
  // The LIKE pattern with underscores ensures each position is a single character
  // NOTE: SUBSTRING FROM requires integer, but parameterized queries pass as text
  // So we use CAST($3::integer) to ensure proper type conversion
  const queryParams = [companyId, parentId, prefixLength + 1, likePattern, prefixLength + 3];
  console.log(`[generateProjectCode] Query parameters:`, JSON.stringify(queryParams));
  
  const activeResult = await db.query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(code FROM $3::integer) AS INTEGER)
    ), 0) + 1 as next_seq
    FROM projects
    WHERE company_id = $1
      AND parent_project_id = $2
      AND deleted_at IS NULL
      AND code LIKE $4
      AND LENGTH(code) = $5
  `, queryParams);
  
  console.log(`[generateProjectCode] Query result:`, JSON.stringify(activeResult.rows));
  const nextSeq = activeResult.rows[0]?.next_seq || 1;
  const generatedCode = parentCode + String(nextSeq).padStart(3, '0');
  console.log(`[generateProjectCode] nextSeq=${nextSeq}, generatedCode=${generatedCode}`);
  
  return generatedCode;
}

/**
 * Validate project hierarchy rules
 */
async function validateHierarchy(
  companyId: number,
  projectLevel: string,
  parentId: number | null,
  vendorId: number | null,
  client?: any
): Promise<{ valid: boolean; error?: string; inheritedVendorId?: number; inheritedCurrencyId?: number; inheritedCurrencyCode?: string }> {
  const db = client || pool;
  
  // Root projects must be groups
  if (!parentId) {
    if (projectLevel !== 'group') {
      return { valid: false, error: 'Root level projects must be of type "group"' };
    }
    return { valid: true };
  }
  
  // Get parent info
  const parentResult = await db.query(`
    SELECT project_level, vendor_id, currency_id, currency_code
    FROM projects
    WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
  `, [parentId, companyId]);
  
  if (parentResult.rows.length === 0) {
    return { valid: false, error: 'Parent project not found' };
  }
  
  const parent = parentResult.rows[0];
  
  // Group can only have Master children
  if (parent.project_level === 'group' && projectLevel !== 'master') {
    return { valid: false, error: 'Group projects can only have Master projects as children' };
  }
  
  // Master can only have Sub children
  if (parent.project_level === 'master' && projectLevel !== 'sub') {
    return { valid: false, error: 'Master projects can only have Sub projects as children' };
  }
  
  // Sub cannot have children
  if (parent.project_level === 'sub') {
    return { valid: false, error: 'Sub projects cannot have children' };
  }
  
  // For sub projects, inherit vendor from master parent
  if (projectLevel === 'sub' && parent.vendor_id) {
    return { 
      valid: true, 
      inheritedVendorId: parent.vendor_id,
      inheritedCurrencyId: parent.currency_id,
      inheritedCurrencyCode: parent.currency_code
    };
  }
  
  return { valid: true };
}

/**
 * Get effective company ID (handles super_admin without company context)
 */
async function getEffectiveCompanyId(req: Request): Promise<number | null> {
  const companyId = (req as any).companyContext?.companyId || (req as any).user?.company_id;
  
  console.log('[getEffectiveCompanyId] companyContext:', (req as any).companyContext?.companyId, 'user.company_id:', (req as any).user?.company_id, 'result:', companyId);
  
  if (companyId) return companyId;
  
  // For super_admin without company context, get first company
  const defaultCompanyResult = await pool.query(`
    SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY id LIMIT 1
  `);
  
  return defaultCompanyResult.rows[0]?.id || null;
}

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/projects
 * @desc    Get all projects with hierarchy support
 * @access  Private (projects:view)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const effectiveCompanyId = await getEffectiveCompanyId(req);
    if (!effectiveCompanyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { 
      is_active, 
      status, 
      search, 
      project_level,
      parent_project_id,
      vendor_id,
      page = '1',
      limit = '100'
    } = req.query;

    let query = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.name_ar,
        p.description,
        p.description_ar,
        p.project_level,
        p.level,
        p.depth,
        p.path,
        p.parent_project_id,
        pp.code as parent_code,
        pp.name as parent_name,
        p.vendor_id,
        v.name as vendor_name,
        v.name_ar as vendor_name_ar,
        v.code as vendor_code,
        p.currency_id,
        p.currency_code,
        p.lc_number,
        p.contract_number,
        p.start_date,
        p.end_date,
        p.budget,
        p.total_expected_amount,
        p.total_actual_cost,
        p.total_paid_amount,
        p.balance_remaining,
        p.status,
        p.priority,
        p.progress_percent,
        p.is_locked,
        p.closed_at,
        p.is_active,
        p.created_at,
        p.updated_at,
        p.project_type_id,
        pt.code as project_type_code,
        pt.name as project_type_name,
        pt.name_ar as project_type_name_ar,
        pt.icon as project_type_icon,
        pt.color as project_type_color,
        (SELECT COUNT(*) FROM projects c WHERE c.parent_project_id = p.id AND c.deleted_at IS NULL) as children_count,
        (SELECT COUNT(*) FROM vendor_payments vp WHERE vp.project_id = p.id AND vp.deleted_at IS NULL) as payments_count
      FROM projects p
      LEFT JOIN projects pp ON p.parent_project_id = pp.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN project_types pt ON p.project_type_id = pt.id
      WHERE p.company_id = $1 AND p.deleted_at IS NULL
    `;
    const params: any[] = [effectiveCompanyId];
    let paramCount = 2;

    if (is_active !== undefined) {
      query += ` AND p.is_active = $${paramCount}`;
      params.push(String(is_active) === 'true');
      paramCount++;
    }

    if (status && status !== 'all') {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (project_level && project_level !== 'all') {
      query += ` AND p.project_level = $${paramCount}`;
      params.push(project_level);
      paramCount++;
    }

    if (parent_project_id) {
      if (parent_project_id === 'root') {
        query += ` AND p.parent_project_id IS NULL`;
      } else {
        query += ` AND p.parent_project_id = $${paramCount}`;
        params.push(parent_project_id);
        paramCount++;
      }
    }

    if (vendor_id) {
      query += ` AND p.vendor_id = $${paramCount}`;
      params.push(vendor_id);
      paramCount++;
    }

    if (search) {
      query += ` AND (p.code ILIKE $${paramCount} OR p.name ILIKE $${paramCount} OR p.name_ar ILIKE $${paramCount} OR v.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Order by path for proper tree display, then by code
    query += ` ORDER BY p.path, p.code ASC`;

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 100, 500);
    const offset = (pageNum - 1) * limitNum;

    // Get total count - use a simpler count query
    const countQuery = `
      SELECT COUNT(*) 
      FROM projects p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.company_id = $1 AND p.deleted_at IS NULL
      ${is_active !== undefined ? ` AND p.is_active = $${params.indexOf(String(is_active) === 'true') + 1 > 0 ? params.indexOf(String(is_active) === 'true') + 1 : ''}` : ''}
    `.replace(/\$\d*(?=\s|$)/g, (match) => match || '');
    
    // Simplified count - just count with base filters
    const baseCountQuery = `
      SELECT COUNT(*) 
      FROM projects p
      WHERE p.company_id = $1 AND p.deleted_at IS NULL
    `;
    const countResult = await pool.query(baseCountQuery, [effectiveCompanyId]);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Add pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitNum, offset);

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
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * @route   GET /api/projects/tree
 * @desc    Get projects as tree structure
 * @access  Private (projects:view)
 */
router.get('/tree', async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { vendor_id, status } = req.query;

    let query = `
      WITH RECURSIVE project_tree AS (
        -- Root level
        SELECT 
          p.id, p.code, p.name, p.name_ar, p.project_level, 
          p.parent_project_id, p.vendor_id, p.status, p.is_active,
          v.name as vendor_name, v.code as vendor_code,
          p.path, p.depth,
          1 as tree_level,
          ARRAY[p.id] as ancestors
        FROM projects p
        LEFT JOIN vendors v ON p.vendor_id = v.id
        WHERE p.company_id = $1 
          AND p.parent_project_id IS NULL 
          AND p.deleted_at IS NULL
        
        UNION ALL
        
        -- Children
        SELECT 
          p.id, p.code, p.name, p.name_ar, p.project_level,
          p.parent_project_id, p.vendor_id, p.status, p.is_active,
          v.name as vendor_name, v.code as vendor_code,
          p.path, p.depth,
          pt.tree_level + 1,
          pt.ancestors || p.id
        FROM projects p
        LEFT JOIN vendors v ON p.vendor_id = v.id
        INNER JOIN project_tree pt ON p.parent_project_id = pt.id
        WHERE p.company_id = $1 AND p.deleted_at IS NULL
      )
      SELECT * FROM project_tree ORDER BY path, code
    `;

    const params: any[] = [companyId];

    const result = await pool.query(query, params);

    // Build tree structure
    const projectMap = new Map<number, any>();
    const tree: any[] = [];

    result.rows.forEach(row => {
      projectMap.set(row.id, { ...row, children: [] });
    });

    result.rows.forEach(row => {
      const project = projectMap.get(row.id);
      if (row.parent_project_id && projectMap.has(row.parent_project_id)) {
        projectMap.get(row.parent_project_id).children.push(project);
      } else {
        tree.push(project);
      }
    });

    return res.json({
      success: true,
      data: tree
    });
  } catch (error: any) {
    console.error('Error fetching project tree:', error);
    return res.status(500).json({ error: 'Failed to fetch project tree' });
  }
});

/**
 * @route   GET /api/projects/stats
 * @desc    Get project statistics
 * @access  Private (projects:view)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE project_level = 'group') as total_groups,
        COUNT(*) FILTER (WHERE project_level = 'master') as total_masters,
        COUNT(*) FILTER (WHERE project_level = 'sub') as total_subs,
        COUNT(*) as total_projects,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(total_actual_cost), 0) as total_actual_cost,
        COALESCE(SUM(total_paid_amount), 0) as total_paid,
        COUNT(*) FILTER (WHERE status IN ('active', 'in_progress')) as active_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE is_locked = true) as locked_count
      FROM projects
      WHERE company_id = $1 AND deleted_at IS NULL
    `, [companyId]);

    // Get by status
    const byStatusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE company_id = $1 AND deleted_at IS NULL
      GROUP BY status
      ORDER BY count DESC
    `, [companyId]);

    // Get by type
    const byTypeResult = await pool.query(`
      SELECT 
        pt.id as type_id,
        pt.name as type_name,
        pt.name_ar as type_name_ar,
        pt.icon,
        pt.color,
        COUNT(p.id) as count,
        COALESCE(SUM(p.budget), 0) as budget
      FROM project_types pt
      LEFT JOIN projects p ON p.project_type_id = pt.id AND p.deleted_at IS NULL AND p.company_id = $1
      WHERE pt.company_id = $1 OR pt.company_id IS NULL
      GROUP BY pt.id, pt.name, pt.name_ar, pt.icon, pt.color
      ORDER BY count DESC
    `, [companyId]);

    const stats = result.rows[0];

    return res.json({
      success: true,
      data: {
        ...stats,
        budget_utilization_percent: stats.total_budget > 0 
          ? Math.round((stats.total_actual_cost / stats.total_budget) * 100) 
          : 0,
        by_status: byStatusResult.rows,
        by_type: byTypeResult.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching project stats:', error);
    return res.status(500).json({ error: 'Failed to fetch project statistics' });
  }
});

/**
 * @route   GET /api/projects/check-vendor-in-group
 * @desc    Check if a vendor already has master projects in a group
 * @access  Private (projects:create)
 */
router.get('/check-vendor-in-group', requirePermission('projects:create'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { group_id, vendor_id } = req.query;
    if (!group_id || !vendor_id) {
      return res.status(400).json({ error: 'group_id and vendor_id are required' });
    }

    const groupId = parseInt(group_id as string, 10);
    const vendorId = parseInt(vendor_id as string, 10);

    if (isNaN(groupId) || isNaN(vendorId)) {
      return res.status(400).json({ error: 'Invalid group_id or vendor_id' });
    }

    // Find existing master projects for this vendor in this group
    const result = await pool.query(`
      SELECT p.id, p.code, p.name, p.name_ar, p.status,
             (SELECT COUNT(*) FROM projects sub WHERE sub.parent_project_id = p.id AND sub.deleted_at IS NULL) as sub_count
      FROM projects p
      WHERE p.company_id = $1
        AND p.parent_project_id = $2
        AND p.vendor_id = $3
        AND p.project_level = 'master'
        AND p.deleted_at IS NULL
      ORDER BY p.code
    `, [companyId, groupId, vendorId]);

    return res.json({
      success: true,
      data: {
        has_existing: result.rows.length > 0,
        existing_projects: result.rows
      }
    });
  } catch (error: any) {
    console.error('Error checking vendor in group:', error);
    return res.status(500).json({ error: 'Failed to check vendor' });
  }
});

/**
 * @route   GET /api/projects/next-code
 * @desc    Get next auto-generated code for a project
 * @access  Private (projects:create)
 */
router.get('/next-code', requirePermission('projects:create'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { parent_id, project_level } = req.query;
    const parentId = parent_id ? parseInt(parent_id as string, 10) : null;
    const level = (project_level as string) || (parentId ? 'sub' : 'group');

    const nextCode = await generateProjectCode(companyId, level, parentId);

    return res.json({
      success: true,
      data: { code: nextCode }
    });
  } catch (error: any) {
    console.error('Error generating project code:', error);
    return res.status(500).json({ error: 'Failed to generate project code' });
  }
});

/**
 * @route   GET /api/projects/types
 * @desc    Get project types
 * @access  Private (projects:view)
 */
router.get('/types', async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const result = await pool.query(`
      SELECT id, code, name, name_ar, description, icon, color, is_system, sort_order
      FROM project_types
      WHERE (company_id = $1 OR company_id IS NULL) AND is_active = true
      ORDER BY sort_order, name
    `, [companyId]);

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching project types:', error);
    return res.status(500).json({ error: 'Failed to fetch project types' });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project with full details
 * @access  Private (projects:view)
 */
router.get('/:id', requirePermission('projects:view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        p.*,
        pp.code as parent_code,
        pp.name as parent_name,
        v.name as vendor_name,
        v.name_ar as vendor_name_ar,
        v.code as vendor_code,
        pt.code as project_type_code,
        pt.name as project_type_name,
        pt.name_ar as project_type_name_ar,
        pt.icon as project_type_icon,
        pt.color as project_type_color,
        u.full_name as manager_name,
        (SELECT COUNT(*) FROM projects c WHERE c.parent_project_id = p.id AND c.deleted_at IS NULL) as children_count,
        (SELECT COUNT(*) FROM vendor_payments vp WHERE vp.project_id = p.id AND vp.deleted_at IS NULL) as payments_count,
        (SELECT COALESCE(SUM(vp.payment_amount), 0) FROM vendor_payments vp WHERE vp.project_id = p.id AND vp.deleted_at IS NULL AND vp.status = 'posted') as total_payments
      FROM projects p
      LEFT JOIN projects pp ON p.parent_project_id = pp.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN project_types pt ON p.project_type_id = pt.id
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.id = $1 AND p.company_id = $2 AND p.deleted_at IS NULL
    `, [id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get children
    const childrenResult = await pool.query(`
      SELECT id, code, name, name_ar, project_level, status, is_active
      FROM projects
      WHERE parent_project_id = $1 AND deleted_at IS NULL
      ORDER BY code
    `, [id]);

    // Get breadcrumb (ancestors)
    const breadcrumbResult = await pool.query(`
      WITH RECURSIVE ancestors AS (
        SELECT id, code, name, name_ar, parent_project_id, 1 as level
        FROM projects
        WHERE id = $1
        
        UNION ALL
        
        SELECT p.id, p.code, p.name, p.name_ar, p.parent_project_id, a.level + 1
        FROM projects p
        INNER JOIN ancestors a ON p.id = a.parent_project_id
      )
      SELECT id, code, name, name_ar FROM ancestors ORDER BY level DESC
    `, [id]);

    return res.json({
      success: true,
      data: {
        ...result.rows[0],
        children: childrenResult.rows,
        breadcrumb: breadcrumbResult.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create new project with auto-generated code
 * @access  Private (projects:create)
 */
router.post('/', requirePermission('projects:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    console.log('Received req.body:', JSON.stringify(req.body, null, 2));
    const validatedData = projectCreateSchema.parse(req.body);
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));
    
    await client.query('BEGIN');

    // Check if user is super_admin (can override code)
    const userRoles = (req as any).user?.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin');
    console.log('isSuperAdmin:', isSuperAdmin, 'validatedData.code:', validatedData.code);

    // Validate hierarchy
    const validation = await validateHierarchy(
      companyId,
      validatedData.project_level,
      validatedData.parent_project_id || null,
      validatedData.vendor_id || null,
      client
    );

    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validation.error });
    }

    // Use provided code (if super_admin) or generate automatically
    let code: string;
    
    if (isSuperAdmin && validatedData.code && validatedData.code.trim()) {
      // Super admin provided a custom code - validate it
      code = validatedData.code.trim();
      
      // Check if code already exists
      const codeExists = await client.query(`
        SELECT id FROM projects 
        WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL
      `, [companyId, code]);
      
      if (codeExists.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Project code already exists' });
      }
    } else {
      // Generate code automatically based on level
      code = await generateProjectCode(
        companyId,
        validatedData.project_level,
        validatedData.parent_project_id || null,
        client
      );
    }

    // Get vendor currency if vendor is specified
    let currencyId = null;
    let currencyCode = null;
    
    if (validation.inheritedVendorId) {
      // Use inherited values for sub projects
      currencyId = validation.inheritedCurrencyId;
      currencyCode = validation.inheritedCurrencyCode;
      validatedData.vendor_id = validation.inheritedVendorId;
    } else if (validatedData.vendor_id) {
      const vendorResult = await client.query(`
        SELECT v.currency_id, c.code as currency_code 
        FROM vendors v
        LEFT JOIN currencies c ON v.currency_id = c.id
        WHERE v.id = $1
      `, [validatedData.vendor_id]);
      
      if (vendorResult.rows.length > 0) {
        currencyId = vendorResult.rows[0].currency_id;
        currencyCode = vendorResult.rows[0].currency_code;
      }
    }

    // Calculate level depth
    let level = 0;
    if (validatedData.project_level === 'master') level = 1;
    if (validatedData.project_level === 'sub') level = 2;

    const result = await client.query(`
      INSERT INTO projects (
        company_id, code, name, name_ar, description, description_ar,
        project_level, level, parent_project_id,
        vendor_id, currency_id, currency_code,
        project_type_id, manager_id, manager_name, cost_center_id,
        lc_number, contract_number,
        start_date, end_date, budget,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        status, priority, progress_percent, is_active,
        created_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18,
        $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27, $28, $29,
        $30, NOW()
      )
      RETURNING *
    `, [
      companyId,
      code,
      validatedData.name,
      validatedData.name_ar || null,
      validatedData.description || null,
      validatedData.description_ar || null,
      validatedData.project_level,
      level,
      validatedData.parent_project_id || null,
      validatedData.vendor_id || null,
      currencyId,
      currencyCode,
      validatedData.project_type_id || null,
      validatedData.manager_id || null,
      validatedData.manager_name || null,
      validatedData.cost_center_id || null,
      validatedData.lc_number || null,
      validatedData.contract_number || null,
      validatedData.start_date || null,
      validatedData.end_date || null,
      validatedData.budget || 0,
      validatedData.budget_materials || 0,
      validatedData.budget_labor || 0,
      validatedData.budget_services || 0,
      validatedData.budget_miscellaneous || 0,
      validatedData.status,
      validatedData.priority,
      validatedData.progress_percent || 0,
      validatedData.is_active,
      userId
    ]);

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Project created with code: ${code}`
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating project:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Project code already exists' });
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: error.message || 'Failed to create project' });
  } finally {
    client.release();
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project (with code uniqueness, vendor cascade, full field support)
 * @access  Private (projects:update)
 */
router.put('/:id', requirePermission('projects:update'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { id } = req.params;
    const validatedData = projectUpdateSchema.parse(req.body);
    const userId = (req as any).user?.id;

    await client.query('BEGIN');

    // Get existing project
    const existing = await client.query(`
      SELECT * FROM projects 
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = existing.rows[0];

    // Check if locked
    if (project.is_locked) {
      const allowedFields = ['name', 'name_ar', 'description', 'description_ar', 'status', 'priority', 'progress_percent'];
      const attemptedFields = Object.keys(validatedData);
      const blockedFields = attemptedFields.filter(f => !allowedFields.includes(f));
      
      if (blockedFields.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Project is locked. Cannot modify: ${blockedFields.join(', ')}` 
        });
      }
    }

    // ---- Code uniqueness check ----
    if (validatedData.code && validatedData.code !== project.code) {
      const codeExists = await client.query(`
        SELECT id FROM projects 
        WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL
      `, [companyId, validatedData.code.trim(), id]);
      
      if (codeExists.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Project code already exists' });
      }
    }

    // ---- Vendor change: resolve currency and cascade to sub-projects ----
    let vendorCurrencyId: number | null = null;
    let vendorCurrencyCode: string | null = null;
    const vendorChanged = validatedData.vendor_id !== undefined && validatedData.vendor_id !== project.vendor_id;

    if (vendorChanged && validatedData.vendor_id) {
      const vendorResult = await client.query(`
        SELECT v.currency_id, c.code as currency_code 
        FROM vendors v
        LEFT JOIN currencies c ON v.currency_id = c.id
        WHERE v.id = $1
      `, [validatedData.vendor_id]);
      
      if (vendorResult.rows.length > 0) {
        vendorCurrencyId = vendorResult.rows[0].currency_id;
        vendorCurrencyCode = vendorResult.rows[0].currency_code;
      }
    }

    // Build update query — full field map
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    const fieldMap: Record<string, string> = {
      code: 'code',
      name: 'name',
      name_ar: 'name_ar',
      description: 'description',
      description_ar: 'description_ar',
      project_type_id: 'project_type_id',
      vendor_id: 'vendor_id',
      cost_center_id: 'cost_center_id',
      manager_id: 'manager_id',
      manager_name: 'manager_name',
      lc_number: 'lc_number',
      contract_number: 'contract_number',
      start_date: 'start_date',
      end_date: 'end_date',
      budget: 'budget',
      budget_materials: 'budget_materials',
      budget_labor: 'budget_labor',
      budget_services: 'budget_services',
      budget_miscellaneous: 'budget_miscellaneous',
      budget_allocated: 'budget_allocated',
      progress_percent: 'progress_percent',
      risk_level: 'risk_level',
      tags: 'tags',
      parent_project_id: 'parent_project_id',
      status: 'status',
      priority: 'priority',
      is_active: 'is_active',
    };

    Object.entries(validatedData).forEach(([key, value]) => {
      if (fieldMap[key] !== undefined) {
        updateFields.push(`${fieldMap[key]} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    });

    // If vendor changed, also update currency fields
    if (vendorChanged && validatedData.vendor_id) {
      updateFields.push(`currency_id = $${paramCount}`);
      updateValues.push(vendorCurrencyId);
      paramCount++;
      updateFields.push(`currency_code = $${paramCount}`);
      updateValues.push(vendorCurrencyCode);
      paramCount++;
    } else if (vendorChanged && !validatedData.vendor_id) {
      // Vendor cleared
      updateFields.push(`currency_id = NULL`);
      updateFields.push(`currency_code = NULL`);
    }

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);

    const result = await client.query(`
      UPDATE projects 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
      RETURNING *
    `, [...updateValues, id, companyId]);

    // ---- Cascade vendor/currency to sub-projects (master → sub) ----
    if (vendorChanged && project.project_level === 'master') {
      const cascadeVendorId = validatedData.vendor_id || null;
      await client.query(`
        UPDATE projects 
        SET vendor_id = $1, currency_id = $2, currency_code = $3, updated_at = NOW()
        WHERE parent_project_id = $4 
          AND project_level = 'sub' 
          AND deleted_at IS NULL
      `, [cascadeVendorId, vendorCurrencyId, vendorCurrencyCode, id]);
      console.log(`[PUT /projects/${id}] Cascaded vendor change to sub-projects`);
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating project:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Project code already exists' });
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'Failed to update project' });
  } finally {
    client.release();
  }
});

/**
 * @route   POST /api/projects/:id/close
 * @desc    Close/complete a project
 * @access  Private (projects:close)
 */
router.post('/:id/close', requireAnyPermission(['projects:close', 'projects:update']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { id } = req.params;

    // Check for open children
    const childrenCheck = await pool.query(`
      SELECT COUNT(*) as count FROM projects
      WHERE parent_project_id = $1 
        AND deleted_at IS NULL 
        AND status NOT IN ('completed', 'cancelled')
    `, [id]);

    if (parseInt(childrenCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({ 
        error: 'Cannot close project with open child projects' 
      });
    }

    const result = await pool.query(`
      UPDATE projects 
      SET status = 'completed', 
          closed_at = NOW(), 
          closed_by = $3,
          is_locked = true,
          updated_at = NOW()
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [id, companyId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Project closed successfully'
    });
  } catch (error: any) {
    console.error('Error closing project:', error);
    return res.status(500).json({ error: 'Failed to close project' });
  }
});

/**
 * @route   POST /api/projects/:id/lock
 * @desc    Lock a project to prevent changes
 * @access  Private (projects:lock)
 */
router.post('/:id/lock', requireAnyPermission(['projects:lock', 'projects:update']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { id } = req.params;
    const { lock = true } = req.body;

    const result = await pool.query(`
      UPDATE projects 
      SET is_locked = $3, updated_at = NOW()
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [id, companyId, lock]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: lock ? 'Project locked successfully' : 'Project unlocked successfully'
    });
  } catch (error: any) {
    console.error('Error locking project:', error);
    return res.status(500).json({ error: 'Failed to lock project' });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Soft delete project (with comprehensive dependency validation)
 * @access  Private (projects:delete)
 */
router.delete('/:id', requirePermission('projects:delete'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { id } = req.params;
    const forceDelete = req.query.force === 'true';

    await client.query('BEGIN');

    // Verify project exists
    const projectCheck = await client.query(`
      SELECT id, code, name, project_level FROM projects
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);

    if (projectCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Project not found' });
    }

    // ---- Collect all dependencies ----
    const deps: { type: string; count: number; label: string; label_ar: string }[] = [];

    // 1. Children projects
    const childrenCheck = await client.query(`
      SELECT COUNT(*) as count FROM projects
      WHERE parent_project_id = $1 AND deleted_at IS NULL
    `, [id]);
    const childrenCount = parseInt(childrenCheck.rows[0].count, 10);
    if (childrenCount > 0) {
      deps.push({ type: 'children', count: childrenCount, label: 'Child projects', label_ar: 'مشاريع فرعية' });
    }

    // 2. Vendor payments
    const paymentsCheck = await client.query(`
      SELECT COUNT(*) as count FROM vendor_payments
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [id]);
    const paymentsCount = parseInt(paymentsCheck.rows[0].count, 10);
    if (paymentsCount > 0) {
      deps.push({ type: 'payments', count: paymentsCount, label: 'Vendor payments', label_ar: 'دفعات موردين' });
    }

    // 3. Project links (shipments, invoices, expenses)
    const linksCheck = await client.query(`
      SELECT link_type, COUNT(*) as count 
      FROM project_links
      WHERE project_id = $1 AND deleted_at IS NULL
      GROUP BY link_type
    `, [id]);
    for (const row of linksCheck.rows) {
      const linkLabels: Record<string, { en: string; ar: string }> = {
        shipment: { en: 'Linked shipments', ar: 'شحنات مرتبطة' },
        purchase_invoice: { en: 'Purchase invoices', ar: 'فواتير مشتريات' },
        sales_invoice: { en: 'Sales invoices', ar: 'فواتير مبيعات' },
        expense: { en: 'Expenses', ar: 'مصروفات' },
        payment: { en: 'Linked payments', ar: 'دفعات مرتبطة' },
      };
      const labels = linkLabels[row.link_type] || { en: row.link_type, ar: row.link_type };
      deps.push({ type: `link_${row.link_type}`, count: parseInt(row.count, 10), label: labels.en, label_ar: labels.ar });
    }

    // 4. Shipment expenses
    const expensesCheck = await client.query(`
      SELECT COUNT(*) as count FROM shipment_expenses
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [id]).catch(() => ({ rows: [{ count: '0' }] }));
    const expensesCount = parseInt(expensesCheck.rows[0].count, 10);
    if (expensesCount > 0) {
      deps.push({ type: 'shipment_expenses', count: expensesCount, label: 'Shipment expenses', label_ar: 'مصاريف شحنات' });
    }

    // 5. Project phases
    const phasesCheck = await client.query(`
      SELECT COUNT(*) as count FROM project_phases
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [id]).catch(() => ({ rows: [{ count: '0' }] }));
    const phasesCount = parseInt(phasesCheck.rows[0].count, 10);
    if (phasesCount > 0) {
      deps.push({ type: 'phases', count: phasesCount, label: 'Project phases', label_ar: 'مراحل المشروع' });
    }

    // If any dependencies exist and force is not set, block delete
    if (deps.length > 0 && !forceDelete) {
      await client.query('ROLLBACK');
      const totalDeps = deps.reduce((s, d) => s + d.count, 0);
      return res.status(400).json({
        error: 'Cannot delete project with linked records',
        error_ar: 'لا يمكن حذف مشروع مرتبط بسجلات أخرى',
        dependencies: deps,
        totalDependencies: totalDeps,
        hint: 'Remove or unlink all dependencies before deleting, or use ?force=true (admin only)',
      });
    }

    // Force delete: soft-delete cascading records
    if (forceDelete && deps.length > 0) {
      // Unlink children
      if (childrenCount > 0) {
        await client.query(`
          UPDATE projects SET parent_project_id = NULL, updated_at = NOW()
          WHERE parent_project_id = $1 AND deleted_at IS NULL
        `, [id]);
      }
      // Unlink payments
      if (paymentsCount > 0) {
        await client.query(`
          UPDATE vendor_payments SET project_id = NULL, updated_at = NOW(), updated_by = $2
          WHERE project_id = $1 AND deleted_at IS NULL
        `, [id, userId]);
      }
      // Soft-delete project links
      const totalLinks = linksCheck.rows.reduce((s: number, r: any) => s + parseInt(r.count, 10), 0);
      if (totalLinks > 0) {
        await client.query(`
          UPDATE project_links SET deleted_at = NOW()
          WHERE project_id = $1 AND deleted_at IS NULL
        `, [id]);
      }
      console.log(`[DELETE /projects/${id}] Force delete: unlinked ${childrenCount} children, ${paymentsCount} payments, ${totalLinks} links`);
    }

    // Soft delete the project
    await client.query(`
      UPDATE projects 
      SET deleted_at = NOW(), deleted_by = $3, is_deleted = true
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId, userId]);

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Project deleted successfully',
      dependencies_cleared: forceDelete ? deps : [],
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting project:', error);
    return res.status(500).json({ error: 'Failed to delete project' });
  } finally {
    client.release();
  }
});

// =============================================
// PROJECT LINKS — Link/Unlink transactions
// =============================================

/**
 * @route   GET /api/projects/:id/links
 * @desc    Get all linked transactions for a project
 */
router.get('/:id/links', requirePermission('projects:view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;
    const { link_type, cost_category } = req.query;

    let query = `
      SELECT pl.*, u.full_name as linked_by_name
      FROM project_links pl
      LEFT JOIN users u ON pl.linked_by = u.id
      WHERE pl.project_id = $1 AND pl.company_id = $2 AND pl.deleted_at IS NULL
    `;
    const params: any[] = [id, companyId];
    let idx = 3;

    if (link_type) {
      query += ` AND pl.link_type = $${idx}`; params.push(link_type); idx++;
    }
    if (cost_category) {
      query += ` AND pl.cost_category = $${idx}`; params.push(cost_category); idx++;
    }

    query += ` ORDER BY pl.linked_at DESC`;
    const result = await pool.query(query, params);

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching project links:', error);
    return res.status(500).json({ error: 'Failed to fetch project links' });
  }
});

/**
 * @route   GET /api/projects/:id/shipments
 * @desc    Get linked shipments only
 */
router.get('/:id/shipments', requirePermission('projects:view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    const result = await pool.query(`
      SELECT pl.*, u.full_name as linked_by_name
      FROM project_links pl
      LEFT JOIN users u ON pl.linked_by = u.id
      WHERE pl.project_id = $1 AND pl.company_id = $2 
        AND pl.link_type = 'shipment' AND pl.deleted_at IS NULL
      ORDER BY pl.linked_at DESC
    `, [id, companyId]);

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching project shipments:', error);
    return res.status(500).json({ error: 'Failed to fetch project shipments' });
  }
});

/**
 * @route   GET /api/projects/:id/payments
 * @desc    Get linked payments only
 */
router.get('/:id/payments', requirePermission('projects:view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    const result = await pool.query(`
      SELECT pl.*, u.full_name as linked_by_name
      FROM project_links pl
      LEFT JOIN users u ON pl.linked_by = u.id
      WHERE pl.project_id = $1 AND pl.company_id = $2
        AND pl.link_type = 'payment' AND pl.deleted_at IS NULL
      ORDER BY pl.linked_at DESC
    `, [id, companyId]);

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching project payments:', error);
    return res.status(500).json({ error: 'Failed to fetch project payments' });
  }
});

/**
 * @route   GET /api/projects/:id/expenses
 * @desc    Get linked expenses only
 */
router.get('/:id/expenses', requirePermission('projects:view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    const result = await pool.query(`
      SELECT pl.*, u.full_name as linked_by_name
      FROM project_links pl
      LEFT JOIN users u ON pl.linked_by = u.id
      WHERE pl.project_id = $1 AND pl.company_id = $2
        AND pl.link_type = 'expense' AND pl.deleted_at IS NULL
      ORDER BY pl.linked_at DESC
    `, [id, companyId]);

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching project expenses:', error);
    return res.status(500).json({ error: 'Failed to fetch project expenses' });
  }
});

/**
 * @route   GET /api/projects/:id/invoices
 * @desc    Get linked invoices only
 */
router.get('/:id/invoices', requirePermission('projects:view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    const result = await pool.query(`
      SELECT pl.*, u.full_name as linked_by_name
      FROM project_links pl
      LEFT JOIN users u ON pl.linked_by = u.id
      WHERE pl.project_id = $1 AND pl.company_id = $2
        AND pl.link_type IN ('purchase_invoice', 'sales_invoice') AND pl.deleted_at IS NULL
      ORDER BY pl.linked_at DESC
    `, [id, companyId]);

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching project invoices:', error);
    return res.status(500).json({ error: 'Failed to fetch project invoices' });
  }
});

/**
 * @route   POST /api/projects/:id/links
 * @desc    Link a transaction to a project
 */
router.post('/:id/links', requireAnyPermission(['projects:links:manage', 'projects:update']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    // Verify project exists and is not financially closed
    const projectCheck = await pool.query(`
      SELECT id, financial_status, currency_code FROM projects
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);

    if (projectCheck.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    if (projectCheck.rows[0].financial_status === 'closed') {
      return res.status(422).json({ error: 'Cannot link transactions to a financially closed project' });
    }

    const { link_type, linked_id, linked_reference, linked_date, linked_description,
            linked_status, amount, currency_code, amount_base, cost_category, notes, phase_id } = req.body;

    if (!link_type || !linked_id) {
      return res.status(400).json({ error: 'link_type and linked_id are required' });
    }

    const result = await pool.query(`
      INSERT INTO project_links (
        company_id, project_id, link_type, linked_id, linked_reference,
        linked_date, linked_description, linked_status,
        amount, currency_code, amount_base, cost_category, notes,
        phase_id, linked_by, linked_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *
    `, [companyId, id, link_type, linked_id, linked_reference || null,
        linked_date || null, linked_description || null, linked_status || null,
        amount || null, currency_code || null, amount_base || amount || null,
        cost_category || null, notes || null, phase_id || null, userId]);

    // Update budget_consumed on the project
    if (amount_base && cost_category !== 'revenue') {
      await pool.query(`
        UPDATE projects SET budget_consumed = COALESCE(budget_consumed, 0) + $2, updated_at = NOW()
        WHERE id = $1
      `, [id, Math.abs(parseFloat(amount_base || amount || '0'))]);
    }

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'This transaction is already linked to this project' });
    console.error('Error linking transaction:', error);
    return res.status(500).json({ error: 'Failed to link transaction' });
  }
});

/**
 * @route   DELETE /api/projects/:id/links/:linkId
 * @desc    Unlink a transaction from a project
 */
router.delete('/:id/links/:linkId', requireAnyPermission(['projects:links:manage', 'projects:update']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id, linkId } = req.params;

    // Get link amount before deleting
    const linkResult = await pool.query(`
      SELECT amount_base, cost_category FROM project_links
      WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
    `, [linkId, id]);

    if (linkResult.rows.length === 0) return res.status(404).json({ error: 'Link not found' });

    // Soft-delete the link
    await pool.query(`
      UPDATE project_links SET deleted_at = NOW()
      WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
    `, [linkId, id]);

    // Decrease budget_consumed
    const link = linkResult.rows[0];
    if (link.amount_base && link.cost_category !== 'revenue') {
      await pool.query(`
        UPDATE projects SET budget_consumed = GREATEST(0, COALESCE(budget_consumed, 0) - $2), updated_at = NOW()
        WHERE id = $1
      `, [id, Math.abs(parseFloat(link.amount_base))]);
    }

    return res.json({ success: true, message: 'Transaction unlinked' });
  } catch (error: any) {
    console.error('Error unlinking transaction:', error);
    return res.status(500).json({ error: 'Failed to unlink transaction' });
  }
});

// =============================================
// COST BREAKDOWN
// =============================================

/**
 * @route   GET /api/projects/:id/cost-breakdown
 * @desc    Get full cost breakdown from v_project_cost_summary
 */
router.get('/:id/cost-breakdown', requirePermission('projects:view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM v_project_cost_summary WHERE id = $1 AND company_id = $2
    `, [id, companyId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    return res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching cost breakdown:', error);
    return res.status(500).json({ error: 'Failed to fetch cost breakdown' });
  }
});

// =============================================
// TIMELINE
// =============================================

/**
 * @route   GET /api/projects/:id/timeline
 * @desc    Get project timeline (phases + linked transactions chronologically)
 */
router.get('/:id/timeline', requirePermission('projects:view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    // Phases timeline
    const phasesResult = await pool.query(`
      SELECT id, code, name, name_ar, phase_type, status, completion_pct,
             planned_start, planned_end, actual_start, actual_end, duration_days,
             'phase' as entry_type
      FROM project_phases
      WHERE project_id = $1 AND deleted_at IS NULL
      ORDER BY sort_order, planned_start
    `, [id]);

    // Linked transactions timeline
    const linksResult = await pool.query(`
      SELECT id, link_type as entry_type, linked_reference as reference,
             linked_description as description, linked_date as date,
             amount_base as amount, cost_category, linked_status as status
      FROM project_links
      WHERE project_id = $1 AND deleted_at IS NULL
      ORDER BY linked_at DESC
      LIMIT 50
    `, [id]);

    return res.json({
      success: true,
      data: {
        phases: phasesResult.rows,
        transactions: linksResult.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching project timeline:', error);
    return res.status(500).json({ error: 'Failed to fetch project timeline' });
  }
});

// =============================================
// FINANCIAL CLOSE
// =============================================

/**
 * @route   PATCH /api/projects/:id/financial-close
 * @desc    Financially close a project (prevents new links)
 */
router.patch('/:id/financial-close', requireAnyPermission(['projects:financial:close', 'projects:close', 'projects:update']), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;

    // Check for open children
    const childrenCheck = await pool.query(`
      SELECT COUNT(*) as count FROM projects
      WHERE parent_project_id = $1 AND deleted_at IS NULL
        AND COALESCE(financial_status, 'open') NOT IN ('closed', 'archived')
    `, [id]);

    if (parseInt(childrenCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'Cannot close project with financially open child projects' });
    }

    const result = await pool.query(`
      UPDATE projects
      SET financial_status = 'closed', closed_at = NOW(), closed_by = $3, is_locked = TRUE, updated_at = NOW()
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [id, companyId, userId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    return res.json({ success: true, data: result.rows[0], message: 'Project financially closed' });
  } catch (error: any) {
    console.error('Error closing project financially:', error);
    return res.status(500).json({ error: 'Failed to close project financially' });
  }
});

// =============================================
// DUPLICATE PROJECT
// =============================================

/**
 * @route   POST /api/projects/:id/duplicate
 * @desc    Duplicate a project (without transactions)
 */
router.post('/:id/duplicate', requirePermission('projects:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    if (!companyId) return res.status(400).json({ error: 'No company found' });
    const { id } = req.params;
    const { new_name, new_name_ar } = req.body;

    const original = await client.query(`
      SELECT * FROM projects WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);

    if (original.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    const proj = original.rows[0];

    await client.query('BEGIN');

    // Generate new code
    const newCode = await generateProjectCode(companyId, proj.project_level, proj.parent_project_id, client);

    const result = await client.query(`
      INSERT INTO projects (
        company_id, code, name, name_ar, description, description_ar,
        project_level, level, parent_project_id, vendor_id, currency_id, currency_code,
        project_type_id, manager_id, cost_center_id,
        start_date, end_date, budget, budget_allocated,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        status, priority, risk_level, tags, is_active, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, 'planned', $24, 'low', $25, TRUE, $26
      )
      RETURNING *
    `, [
      companyId, newCode,
      new_name || proj.name + ' (Copy)',
      new_name_ar || (proj.name_ar ? proj.name_ar + ' (نسخة)' : null),
      proj.description, proj.description_ar,
      proj.project_level, proj.level, proj.parent_project_id,
      proj.vendor_id, proj.currency_id, proj.currency_code,
      proj.project_type_id, proj.manager_id, proj.cost_center_id,
      proj.start_date, proj.end_date, proj.budget, proj.budget_allocated,
      proj.budget_materials, proj.budget_labor, proj.budget_services, proj.budget_miscellaneous,
      proj.priority, proj.tags || '{}', userId
    ]);

    // Copy phases if they exist
    await client.query(`
      INSERT INTO project_phases (company_id, project_id, code, name, name_ar, description, description_ar,
        phase_type, sort_order, duration_days, budget, is_template, is_active, created_by)
      SELECT company_id, $2, code, name, name_ar, description, description_ar,
        phase_type, sort_order, duration_days, budget, FALSE, TRUE, $3
      FROM project_phases
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [id, result.rows[0].id, userId]);

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Project duplicated with code: ${newCode}`
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error duplicating project:', error);
    return res.status(500).json({ error: 'Failed to duplicate project' });
  } finally {
    client.release();
  }
});

export default router;
