/**
 * Laboratories API
 * Manages laboratories for testing and certification expenses
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, requirePermission('laboratories:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(`
      SELECT id, code, name, name_ar, lab_type, accreditation_number, is_saber_certified,
             contact_person, phone, email, address, is_active, created_at
      FROM laboratories
      WHERE company_id = $1 AND deleted_at IS NULL
      ORDER BY name
    `, [companyId]);
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', authenticate, requirePermission('laboratories:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const userId = (req as any).user?.id;
    const { code, name, name_ar, lab_type, accreditation_number, is_saber_certified, contact_person, phone, email, address } = req.body;
    
    const result = await pool.query(`
      INSERT INTO laboratories (
        company_id, code, name, name_ar, lab_type, accreditation_number, is_saber_certified,
        contact_person, phone, email, address, is_active, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, NOW())
      RETURNING *
    `, [companyId, code, name, name_ar, lab_type, accreditation_number, is_saber_certified, contact_person, phone, email, address, userId]);
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/:id', authenticate, requirePermission('laboratories:update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.companyId || 1;
    const userId = (req as any).user?.id;
    const { code, name, name_ar, lab_type, accreditation_number, is_saber_certified, contact_person, phone, email, address, is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE laboratories SET
        code = COALESCE($1, code), name = COALESCE($2, name), name_ar = COALESCE($3, name_ar),
        lab_type = $4, accreditation_number = $5, is_saber_certified = $6,
        contact_person = $7, phone = $8, email = $9, address = $10,
        is_active = COALESCE($11, is_active), updated_by = $12, updated_at = NOW()
      WHERE id = $13 AND company_id = $14 AND deleted_at IS NULL
      RETURNING *
    `, [code, name, name_ar, lab_type, accreditation_number, is_saber_certified, contact_person, phone, email, address, is_active, userId, id, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Not found' } });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', authenticate, requirePermission('laboratories:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.companyId || 1;
    const userId = (req as any).user?.id;
    
    await pool.query(`
      UPDATE laboratories SET deleted_at = NOW(), updated_by = $1
      WHERE id = $2 AND company_id = $3
    `, [userId, id, companyId]);
    
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
