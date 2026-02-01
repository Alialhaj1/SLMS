import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { ErrorFactory } from '../../types/errors';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

async function validateCategoryForCompany(categoryId: number, companyId: number) {
  const result = await pool.query(
    'SELECT id FROM item_categories WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
    [categoryId, companyId]
  );
  return result.rows.length > 0;
}

async function getParentGroup(companyId: number, parentGroupId: number) {
  const result = await pool.query(
    'SELECT id, category_id FROM item_groups WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
    [parentGroupId, companyId]
  );
  return result.rows[0] as { id: number; category_id: number | null } | undefined;
}

// GET /api/item-groups - List groups
router.get('/', requirePermission('master:items:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, group_type, is_active } = req.query;
    const params: any[] = [companyId];
    let paramIndex = 2;

    let query = `
      WITH RECURSIVE group_tree AS (
        SELECT
          g0.id,
          g0.parent_group_id,
          g0.id AS main_id
        FROM item_groups g0
        WHERE g0.company_id = $1 AND g0.deleted_at IS NULL AND g0.group_type = 'main'

        UNION ALL

        SELECT
          g1.id,
          g1.parent_group_id,
          gt.main_id
        FROM item_groups g1
        INNER JOIN group_tree gt ON g1.parent_group_id = gt.id
        WHERE g1.company_id = $1 AND g1.deleted_at IS NULL
      ),
      main_totals AS (
        SELECT
          gt.main_id,
          COUNT(i.*)::int AS total_item_count
        FROM group_tree gt
        LEFT JOIN items i ON i.group_id = gt.id AND i.deleted_at IS NULL
        GROUP BY gt.main_id
      )
      SELECT
        g.id,
        g.code,
        COALESCE(g.name_en, g.name) AS name,
        g.name_ar,
        COALESCE(g.description_en, g.description) AS description,
        g.description_ar,
        g.parent_group_id,
        p.name AS parent_name,
        g.category_id,
        COALESCE(c.name_en, c.name) AS category_name,
        c.name_ar AS category_name_ar,
        g.group_type,
        (SELECT COUNT(*) FROM items i WHERE i.group_id = g.id AND i.deleted_at IS NULL) AS item_count,
        CASE
          WHEN g.group_type = 'main' THEN COALESCE(mt.total_item_count, 0)
          ELSE (SELECT COUNT(*)::int FROM items i2 WHERE i2.group_id = g.id AND i2.deleted_at IS NULL)
        END AS item_count_total,
        g.is_active,
        g.created_at
      FROM item_groups g
      LEFT JOIN item_groups p ON g.parent_group_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN item_categories c ON g.category_id = c.id AND c.company_id = g.company_id AND c.deleted_at IS NULL
      LEFT JOIN main_totals mt ON mt.main_id = g.id
      WHERE g.company_id = $1 AND g.deleted_at IS NULL
    `;

    if (search) {
      query += ` AND (g.code ILIKE $${paramIndex} OR g.name ILIKE $${paramIndex} OR g.name_en ILIKE $${paramIndex} OR g.name_ar ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (group_type) {
      query += ` AND g.group_type = $${paramIndex}`;
      params.push(group_type);
      paramIndex++;
    }

    if (is_active !== undefined) {
      query += ` AND g.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ` ORDER BY g.sort_order ASC, g.code ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, total: result.rowCount || 0 });
  } catch (error) {
    console.error('Error fetching item groups:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch item groups' } });
  }
});

// POST /api/item-groups - Create
router.post('/', requirePermission('master:items:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { code, name, name_ar, description, description_ar, parent_id, group_type, is_active = true, category_id } = req.body;

    if (!code || !name) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
    }

    const duplicate = await pool.query(
      'SELECT id FROM item_groups WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
      [companyId, code]
    );
    if (duplicate.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Group code already exists' } });
    }

    const parentGroupId = parent_id || null;
    const groupType = group_type || (parentGroupId ? 'sub' : 'main');

    if (groupType === 'sub' && !parentGroupId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Parent group is required for sub groups' },
      });
    }
    if (groupType === 'main' && parentGroupId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Main groups cannot have a parent group' },
      });
    }

    let resolvedCategoryId: number | null = category_id ?? null;
    if (parentGroupId) {
      const parent = await getParentGroup(companyId, parentGroupId);
      if (!parent) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Parent group not found' } });
      }

      if (!parent.category_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'PARENT_CATEGORY_REQUIRED', message: 'Parent group must have a category' },
        });
      }

      if (resolvedCategoryId && resolvedCategoryId !== parent.category_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'CATEGORY_INHERITED', message: 'Sub-group category is inherited from its parent group' },
        });
      }

      resolvedCategoryId = parent.category_id;
    }

    if (!resolvedCategoryId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category is required' } });
    }

    const categoryOk = await validateCategoryForCompany(resolvedCategoryId, companyId);
    if (!categoryOk) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid category for this company' } });
    }

    const result = await pool.query(
      `INSERT INTO item_groups (
        company_id,
        code,
        name,
        name_en,
        name_ar,
        description,
        description_en,
        description_ar,
        parent_group_id,
        category_id,
        group_type,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id, code, COALESCE(name_en, name) AS name, name_ar, COALESCE(description_en, description) AS description, description_ar, parent_group_id, category_id, group_type, is_active, created_at`,
      [
        companyId,
        code,
        name,
        name,
        name_ar || null,
        description || null,
        description || null,
        description_ar || null,
        parentGroupId,
        resolvedCategoryId,
        groupType,
        is_active,
        userId,
        userId,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating item group:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create item group' } });
  }
});

// PUT /api/item-groups/:id - Update
router.put('/:id', requirePermission('master:items:edit'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { code, name, name_ar, description, description_ar, parent_id, group_type, is_active, category_id } = req.body;

    if (!code || !name) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
    }

    const existing = await pool.query(
      'SELECT id, parent_group_id FROM item_groups WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found' } });
    }

    // 🔒 PHASE 2.3: HIERARCHICAL GROUPS VALIDATION
    // Prevent changing parent_id if group has items or is assigned to items
    const currentParentId = existing.rows[0].parent_group_id;
    const newParentId = parent_id || null;
    
    if (currentParentId !== newParentId) {
      // Check if group has items assigned via group_id (legacy)
      const legacyItemsCheck = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM items WHERE group_id = $1 AND deleted_at IS NULL',
        [id]
      );
      
      // Check if group has items assigned via item_group_assignments (new multi-group)
      const assignedItemsCheck = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM item_group_assignments WHERE group_id = $1 AND deleted_at IS NULL',
        [id]
      );

      const totalItems = (legacyItemsCheck.rows[0]?.cnt || 0) + (assignedItemsCheck.rows[0]?.cnt || 0);

      if (totalItems > 0) {
        const errorResponse = ErrorFactory.groupHasItems(Number(id), totalItems);
        return res.status(409).json(errorResponse);
      }
    }

    const duplicate = await pool.query(
      'SELECT id FROM item_groups WHERE company_id = $1 AND code = $2 AND id <> $3 AND deleted_at IS NULL',
      [companyId, code, id]
    );
    if (duplicate.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Group code already exists' } });
    }

    const parentGroupId = parent_id || null;
    const groupType = group_type || (parentGroupId ? 'sub' : 'main');

    if (groupType === 'sub' && !parentGroupId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Parent group is required for sub groups' },
      });
    }
    if (groupType === 'main' && parentGroupId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Main groups cannot have a parent group' },
      });
    }

    let resolvedCategoryId: number | null = category_id ?? null;
    if (parentGroupId) {
      const parent = await getParentGroup(companyId, parentGroupId);
      if (!parent) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Parent group not found' } });
      }

      if (!parent.category_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'PARENT_CATEGORY_REQUIRED', message: 'Parent group must have a category' },
        });
      }

      if (resolvedCategoryId && resolvedCategoryId !== parent.category_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'CATEGORY_INHERITED', message: 'Sub-group category is inherited from its parent group' },
        });
      }

      resolvedCategoryId = parent.category_id;
    }

    if (!resolvedCategoryId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category is required' } });
    }

    const categoryOk = await validateCategoryForCompany(resolvedCategoryId, companyId);
    if (!categoryOk) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid category for this company' } });
    }

    const result = await pool.query(
      `UPDATE item_groups
       SET code = $1,
           name = $2,
           name_en = $2,
           name_ar = $3,
           description = $4,
           description_en = $4,
           description_ar = $5,
           parent_group_id = $6,
           category_id = $7,
           group_type = $8,
           is_active = $9,
           updated_by = $10,
           updated_at = NOW()
       WHERE id = $11 AND company_id = $12 AND deleted_at IS NULL
       RETURNING id, code, COALESCE(name_en, name) AS name, name_ar, COALESCE(description_en, description) AS description, description_ar, parent_group_id, category_id, group_type, is_active, created_at`,
      [
        code,
        name,
        name_ar || null,
        description || null,
        description_ar || null,
        parentGroupId,
        resolvedCategoryId,
        groupType,
        is_active ?? true,
        userId,
        id,
        companyId,
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating item group:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update item group' } });
  }
});

// DELETE /api/item-groups/:id - Soft delete
router.delete('/:id', requirePermission('master:items:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const existing = await pool.query(
      'SELECT id FROM item_groups WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found' } });
    }

    const children = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM item_groups WHERE parent_group_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (children.rows[0]?.cnt > 0) {
      const errorResponse = ErrorFactory.groupHasChildren(
        Number(id),
        children.rows[0].cnt
      );
      return res.status(409).json(errorResponse);
    }

    // Check legacy group_id assignments
    const legacyItems = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM items WHERE group_id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    // Check new multi-group assignments
    const assignedItems = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM item_group_assignments WHERE group_id = $1 AND deleted_at IS NULL',
      [id]
    );

    const totalItems = (legacyItems.rows[0]?.cnt || 0) + (assignedItems.rows[0]?.cnt || 0);

    if (totalItems > 0) {
      const errorResponse = ErrorFactory.groupHasItems(Number(id), totalItems);
      return res.status(409).json(errorResponse);
    }

    await pool.query(
      'UPDATE item_groups SET deleted_at = NOW(), updated_by = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL',
      [userId, id, companyId]
    );

    res.json({ success: true, message: 'Item group deleted successfully' });
  } catch (error) {
    console.error('Error deleting item group:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete item group' } });
  }
});

export default router;
