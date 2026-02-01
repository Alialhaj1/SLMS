import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(loadCompanyContext);

// GET /api/item-categories - List all item categories
router.get(
  '/',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { search, is_active } = req.query;
      const params: any[] = [companyId];
      let paramIndex = 2;

      let query = `
        SELECT 
          ic.id,
          ic.code,
          ic.name,
          ic.name_ar,
          ic.name_en,
          ic.description_en,
          ic.description_ar,
          ic.parent_id,
          p.name AS parent_name,
          ic.level,
          ic.is_active,
          ic.created_at,
          ic.updated_at,
          (SELECT COUNT(*) FROM items i WHERE i.category_id = ic.id AND i.deleted_at IS NULL) as item_count
        FROM item_categories ic
        LEFT JOIN item_categories p ON ic.parent_id = p.id AND p.deleted_at IS NULL
        WHERE ic.company_id = $1 AND ic.deleted_at IS NULL
      `;

      if (search) {
        query += ` AND (ic.code ILIKE $${paramIndex} OR ic.name ILIKE $${paramIndex} OR ic.name_ar ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (is_active !== undefined) {
        query += ` AND ic.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      query += ` ORDER BY ic.code`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows, total: result.rowCount || 0 });
    } catch (error) {
      console.error('Error fetching item categories:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch item categories' } });
    }
  }
);

// GET /api/item-categories/:id - Get single category
router.get(
  '/:id',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const result = await pool.query(
        `SELECT 
          ic.id,
          ic.code,
          ic.name,
          ic.name_ar,
          ic.name_en,
          ic.description_en,
          ic.description_ar,
          ic.parent_id,
          p.name AS parent_name,
          ic.level,
          ic.is_active,
          ic.created_at,
          ic.updated_at,
          (SELECT COUNT(*) FROM items i WHERE i.category_id = ic.id AND i.deleted_at IS NULL) as item_count
        FROM item_categories ic
        LEFT JOIN item_categories p ON ic.parent_id = p.id AND p.deleted_at IS NULL
        WHERE ic.id = $1 AND ic.company_id = $2 AND ic.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item category not found' } });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching item category:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch item category' } });
    }
  }
);

// POST /api/item-categories - Create new category
router.post(
  '/',
  requirePermission('master:items:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        code,
        name,
        name_ar,
        name_en,
        description_en,
        description_ar,
        parent_id,
        is_active = true,
      } = req.body;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Check for duplicate code
      const existing = await pool.query(
        'SELECT id FROM item_categories WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL',
        [code, companyId]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Category code already exists' } });
      }

      const result = await pool.query(
        `INSERT INTO item_categories (
          company_id,
          parent_id,
          code,
          name,
          name_ar,
          name_en,
          description_en,
          description_ar,
          is_active,
          created_by,
          updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id, code, name, name_ar, name_en, description_en, description_ar, parent_id, is_active, created_at, updated_at`,
        [
          companyId,
          parent_id ?? null,
          code,
          name,
          name_ar || null,
          name_en || name,
          description_en || null,
          description_ar || null,
          is_active,
          userId,
          userId,
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating item category:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create item category' } });
    }
  }
);

// PUT /api/item-categories/:id - Update category
router.put(
  '/:id',
  requirePermission('master:items:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        code,
        name,
        name_ar,
        name_en,
        description_en,
        description_ar,
        parent_id,
        is_active,
      } = req.body;

      // Check if category exists
      const existing = await pool.query(
        'SELECT id FROM item_categories WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item category not found' } });
      }

      // Check for duplicate code (excluding current)
      if (code) {
        const duplicate = await pool.query(
          'SELECT id FROM item_categories WHERE code = $1 AND company_id = $2 AND id != $3 AND deleted_at IS NULL',
          [code, companyId, id]
        );

        if (duplicate.rows.length > 0) {
          return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Category code already exists' } });
        }
      }

      const result = await pool.query(
        `UPDATE item_categories 
         SET code = COALESCE($1, code),
             name = COALESCE($2, name),
             name_ar = COALESCE($3, name_ar),
             name_en = COALESCE($4, name_en),
             description_en = COALESCE($5, description_en),
             description_ar = COALESCE($6, description_ar),
             parent_id = COALESCE($7, parent_id),
             is_active = COALESCE($8, is_active),
             updated_at = NOW(),
             updated_by = $9
         WHERE id = $10 AND company_id = $11 AND deleted_at IS NULL
         RETURNING id, code, name, name_ar, name_en, description_en, description_ar, parent_id, is_active, created_at, updated_at`,
        [
          code,
          name,
          name_ar,
          name_en,
          description_en,
          description_ar,
          parent_id,
          is_active,
          userId,
          id,
          companyId,
        ]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating item category:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update item category' } });
    }
  }
);

// DELETE /api/item-categories/:id - Soft delete category
router.delete(
  '/:id',
  requirePermission('master:items:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      // Check if category exists
      const existing = await pool.query(
        'SELECT id FROM item_categories WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item category not found' } });
      }

      // Check if category has items
      const items = await pool.query(
        'SELECT COUNT(*) FROM items WHERE category_id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (parseInt(items.rows[0].count) > 0) {
        return res.status(400).json({ 
          success: false, 
          error: { 
            code: 'HAS_ITEMS', 
            message: 'Cannot delete category with associated items. Please reassign or delete items first.' 
          } 
        });
      }

      // Soft delete
      await pool.query(
        `UPDATE item_categories 
         SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL`,
        [userId, id, companyId]
      );

      res.json({ success: true, message: 'Item category deleted successfully' });
    } catch (error) {
      console.error('Error deleting item category:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete item category' } });
    }
  }
);

export default router;
