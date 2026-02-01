/**
 * Vendor Reference Data Routes
 * Handles vendor classifications, types, statuses, payment terms, etc.
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// VENDOR CATEGORIES (Classifications)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/vendor-categories', authenticate, requirePermission('procurement:vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(
      `SELECT * FROM vendor_categories WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name`,
      [companyId]
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error('Error fetching vendor categories:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/vendor-categories', authenticate, requirePermission('procurement:vendors:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const { code, name, name_ar, description, is_active, sort_order } = req.body;
    
    const result = await pool.query(
      `INSERT INTO vendor_categories (company_id, code, name, name_ar, description, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [companyId, code, name, name_ar || name, description, is_active !== false, sort_order || 0]
    );
    
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating vendor category:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/vendor-categories/:id', authenticate, requirePermission('procurement:vendors:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, name_ar, description, is_active, sort_order } = req.body;
    
    const result = await pool.query(
      `UPDATE vendor_categories 
       SET code = $1, name = $2, name_ar = $3, description = $4, 
           is_active = $5, sort_order = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND deleted_at IS NULL
       RETURNING *`,
      [code, name, name_ar || name, description, is_active, sort_order, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor category not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating vendor category:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/vendor-categories/:id', authenticate, requirePermission('procurement:vendors:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE vendor_categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor category not found' });
    }
    
    res.json({ message: 'Vendor category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting vendor category:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VENDOR TYPES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/vendor-types', authenticate, requirePermission('procurement:vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(
      `SELECT * FROM vendor_types WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name`,
      [companyId]
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error('Error fetching vendor types:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/vendor-types', authenticate, requirePermission('procurement:vendors:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const { code, name, name_ar, description, is_active, sort_order } = req.body;
    
    const result = await pool.query(
      `INSERT INTO vendor_types (company_id, code, name, name_ar, description, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [companyId, code, name, name_ar || name, description, is_active !== false, sort_order || 0]
    );
    
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating vendor type:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/vendor-types/:id', authenticate, requirePermission('procurement:vendors:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, name_ar, description, is_active, sort_order } = req.body;
    
    const result = await pool.query(
      `UPDATE vendor_types 
       SET code = $1, name = $2, name_ar = $3, description = $4, 
           is_active = $5, sort_order = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND deleted_at IS NULL
       RETURNING *`,
      [code, name, name_ar || name, description, is_active, sort_order, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor type not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating vendor type:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/vendor-types/:id', authenticate, requirePermission('procurement:vendors:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE vendor_types SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor type not found' });
    }
    
    res.json({ message: 'Vendor type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting vendor type:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VENDOR STATUSES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/vendor-statuses', authenticate, requirePermission('procurement:vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(
      `SELECT * FROM vendor_statuses WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name`,
      [companyId]
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error('Error fetching vendor statuses:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/vendor-statuses', authenticate, requirePermission('procurement:vendors:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const { code, name, name_ar, description, color, is_active, sort_order } = req.body;
    
    const result = await pool.query(
      `INSERT INTO vendor_statuses (company_id, code, name, name_ar, description, color, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [companyId, code, name, name_ar || name, description, color, is_active !== false, sort_order || 0]
    );
    
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating vendor status:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/vendor-statuses/:id', authenticate, requirePermission('procurement:vendors:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, name_ar, description, color, is_active, sort_order } = req.body;
    
    const result = await pool.query(
      `UPDATE vendor_statuses 
       SET code = $1, name = $2, name_ar = $3, description = $4, color = $5,
           is_active = $6, sort_order = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND deleted_at IS NULL
       RETURNING *`,
      [code, name, name_ar || name, description, color, is_active, sort_order, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor status not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating vendor status:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/vendor-statuses/:id', authenticate, requirePermission('procurement:vendors:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE vendor_statuses SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor status not found' });
    }
    
    res.json({ message: 'Vendor status deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting vendor status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VENDOR PAYMENT TERMS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/payment-terms', authenticate, requirePermission('procurement:vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(
      `SELECT * FROM vendor_payment_terms WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name`,
      [companyId]
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error('Error fetching payment terms:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/payment-terms', authenticate, requirePermission('procurement:vendors:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const { code, name, name_ar, description, due_days, discount_days, discount_percent, is_active, sort_order } = req.body;
    
    const result = await pool.query(
      `INSERT INTO vendor_payment_terms (company_id, code, name, name_ar, description, due_days, discount_days, discount_percent, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [companyId, code, name, name_ar || name, description, due_days || 0, discount_days || 0, discount_percent || 0, is_active !== false, sort_order || 0]
    );
    
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating payment term:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/payment-terms/:id', authenticate, requirePermission('procurement:vendors:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, name_ar, description, due_days, discount_days, discount_percent, is_active, sort_order } = req.body;
    
    const result = await pool.query(
      `UPDATE vendor_payment_terms 
       SET code = $1, name = $2, name_ar = $3, description = $4, due_days = $5,
           discount_days = $6, discount_percent = $7, is_active = $8, sort_order = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND deleted_at IS NULL
       RETURNING *`,
      [code, name, name_ar || name, description, due_days, discount_days, discount_percent, is_active, sort_order, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment term not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating payment term:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/payment-terms/:id', authenticate, requirePermission('procurement:vendors:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE vendor_payment_terms SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment term not found' });
    }
    
    res.json({ message: 'Payment term deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting payment term:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
