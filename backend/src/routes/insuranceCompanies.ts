/**
 * Insurance Companies API
 * Manages insurance companies for shipment insurance expenses
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// GET all insurance companies
router.get('/', authenticate, requirePermission('insurance_companies:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    
    const result = await pool.query(`
      SELECT id, code, name, name_ar, contact_person, phone, email, 
             address, is_active, created_at, updated_at
      FROM insurance_companies
      WHERE company_id = $1 AND deleted_at IS NULL
      ORDER BY name
    `, [companyId]);
    
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error: any) {
    console.error('Error fetching insurance companies:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET single insurance company
router.get('/:id', authenticate, requirePermission('insurance_companies:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.companyId || 1;
    
    const result = await pool.query(`
      SELECT * FROM insurance_companies
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Insurance company not found' } });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching insurance company:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// CREATE insurance company
router.post('/', authenticate, requirePermission('insurance_companies:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const userId = (req as any).user?.id;
    const { code, name, name_ar, contact_person, phone, email, address, is_active = true } = req.body;
    
    const result = await pool.query(`
      INSERT INTO insurance_companies (
        company_id, code, name, name_ar, contact_person, phone, email, address,
        is_active, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `, [companyId, code, name, name_ar, contact_person, phone, email, address, is_active, userId]);
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating insurance company:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// UPDATE insurance company
router.put('/:id', authenticate, requirePermission('insurance_companies:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.companyId || 1;
    const userId = (req as any).user?.id;
    const { code, name, name_ar, contact_person, phone, email, address, is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE insurance_companies SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        name_ar = COALESCE($3, name_ar),
        contact_person = $4,
        phone = $5,
        email = $6,
        address = $7,
        is_active = COALESCE($8, is_active),
        updated_by = $9,
        updated_at = NOW()
      WHERE id = $10 AND company_id = $11 AND deleted_at IS NULL
      RETURNING *
    `, [code, name, name_ar, contact_person, phone, email, address, is_active, userId, id, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Insurance company not found' } });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating insurance company:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// DELETE insurance company (soft delete)
router.delete('/:id', authenticate, requirePermission('insurance_companies:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.companyId || 1;
    const userId = (req as any).user?.id;
    
    await pool.query(`
      UPDATE insurance_companies SET deleted_at = NOW(), updated_by = $1
      WHERE id = $2 AND company_id = $3
    `, [userId, id, companyId]);
    
    res.json({ success: true, message: 'Insurance company deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting insurance company:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
