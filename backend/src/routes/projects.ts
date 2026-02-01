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
 * - Master: 101, 102, 103, ... (starting from 101)
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
    // Master level: 101, 102, 103, ...
    const result = await db.query(`
      SELECT COALESCE(MAX(CAST(code AS INTEGER)), 100) + 1 as next_seq
      FROM projects
      WHERE company_id = $1
        AND project_level = 'master'
        AND deleted_at IS NULL
        AND code ~ '^[0-9]+$'
        AND CAST(code AS INTEGER) >= 101
        AND CAST(code AS INTEGER) <= 999
    `, [companyId]);
    
    const nextSeq = result.rows[0]?.next_seq || 101;
    return String(nextSeq);
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
 * @desc    Update project
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
      // Only allow certain fields to be updated when locked
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

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      name_ar: 'name_ar',
      description: 'description',
      description_ar: 'description_ar',
      project_type_id: 'project_type_id',
      lc_number: 'lc_number',
      contract_number: 'contract_number',
      start_date: 'start_date',
      end_date: 'end_date',
      budget: 'budget',
      status: 'status',
      priority: 'priority',
      is_active: 'is_active'
    };

    Object.entries(validatedData).forEach(([key, value]) => {
      if (fieldMap[key] !== undefined) {
        updateFields.push(`${fieldMap[key]} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    });

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

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating project:', error);
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
 * @desc    Soft delete project (with validation)
 * @access  Private (projects:delete)
 */
router.delete('/:id', requirePermission('projects:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    const userId = (req as any).user?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'No company found' });
    }

    const { id } = req.params;
    const unlinkPayments = req.query.unlinkPayments === 'true';
    const unlinkChildren = req.query.unlinkChildren === 'true';

    // Check for children
    const childrenCheck = await pool.query(`
      SELECT COUNT(*) as count FROM projects
      WHERE parent_project_id = $1 AND deleted_at IS NULL
    `, [id]);

    const childrenCount = parseInt(childrenCheck.rows[0].count, 10);
    if (childrenCount > 0) {
      if (unlinkChildren) {
        // Unlink children by setting their parent_project_id to NULL
        await pool.query(`
          UPDATE projects 
          SET parent_project_id = NULL, updated_at = NOW()
          WHERE parent_project_id = $1 AND deleted_at IS NULL
        `, [id]);
        console.log(`Unlinked ${childrenCount} child projects from project ${id}`);
      } else {
        return res.status(400).json({ 
          error: 'Cannot delete project with child projects',
          childrenCount,
          hint: 'Add ?unlinkChildren=true to unlink children and delete'
        });
      }
    }

    // Note: shipments.project_id doesn't exist yet - skipping shipments check
    // TODO: Add shipments check when project_id column is added to shipments table

    // Check for payments
    const paymentsCheck = await pool.query(`
      SELECT COUNT(*) as count FROM vendor_payments
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [id]);

    const paymentsCount = parseInt(paymentsCheck.rows[0].count, 10);
    if (paymentsCount > 0) {
      if (unlinkPayments) {
        // Unlink payments by setting their project_id to NULL
        await pool.query(`
          UPDATE vendor_payments 
          SET project_id = NULL, updated_at = NOW(), updated_by = $2
          WHERE project_id = $1 AND deleted_at IS NULL
        `, [id, userId]);
        console.log(`Unlinked ${paymentsCount} payments from project ${id}`);
      } else {
        return res.status(400).json({ 
          error: 'Cannot delete project with linked payments',
          paymentsCount,
          hint: 'Add ?unlinkPayments=true to unlink payments and delete'
        });
      }
    }

    const result = await pool.query(`
      UPDATE projects 
      SET deleted_at = NOW(), 
          deleted_by = $3,
          is_deleted = true
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [id, companyId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({
      success: true,
      message: 'Project deleted successfully',
      unlinkedChildren: unlinkChildren ? childrenCount : 0,
      unlinkedPayments: unlinkPayments ? paymentsCount : 0
    });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
