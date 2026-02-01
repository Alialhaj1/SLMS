/**
 * ===============================================
 * Bill Types Routes (أنواع البوليصات)
 * ===============================================
 * Reference data for shipping bill types (MBL, HBL, AWB, etc.)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// ============================================================================
// GET /api/bill-types - List all bill types (system + company-specific)
// ============================================================================
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('bill_types:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const { category, include_inactive } = req.query;

      const conditions: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];
      let paramIndex = 1;

      // System types (company_id IS NULL) + company-specific
      if (companyId) {
        conditions.push(`(company_id IS NULL OR company_id = $${paramIndex})`);
        params.push(companyId);
        paramIndex++;
      } else {
        conditions.push('company_id IS NULL');
      }

      if (category) {
        conditions.push(`category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      if (include_inactive !== 'true') {
        conditions.push('is_active = true');
      }

      const query = `
        SELECT 
          id, code, name, name_ar, description, description_ar,
          category, is_system, is_active, sort_order,
          company_id
        FROM bill_types
        WHERE ${conditions.join(' AND ')}
        ORDER BY sort_order, name
      `;

      const result = await pool.query(query, params);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error fetching bill types:', error);
      res.status(500).json({ error: 'Failed to fetch bill types' });
    }
  }
);

// ============================================================================
// GET /api/bill-types/:id - Get by ID
// ============================================================================
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('bill_types:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;

      const result = await pool.query(
        `SELECT * FROM bill_types 
         WHERE id = $1 
         AND (company_id IS NULL OR company_id = $2)
         AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Bill type not found' });
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching bill type:', error);
      res.status(500).json({ error: 'Failed to fetch bill type' });
    }
  }
);

// ============================================================================
// POST /api/bill-types - Create custom bill type
// ============================================================================
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('bill_types:manage'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const schema = z.object({
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(100),
        name_ar: z.string().max(100).optional().nullable(),
        description: z.string().optional().nullable(),
        description_ar: z.string().optional().nullable(),
        category: z.enum(['sea_master', 'sea_house', 'air', 'land', 'multimodal']),
        is_active: z.boolean().optional().default(true),
        sort_order: z.number().int().optional().default(0),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      }

      const data = parsed.data;

      // Check duplicate code for company
      const dupCheck = await pool.query(
        `SELECT id FROM bill_types 
         WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL`,
        [companyId, data.code]
      );

      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Bill type code already exists' });
      }

      const result = await pool.query(
        `INSERT INTO bill_types (
          company_id, code, name, name_ar, description, description_ar,
          category, is_system, is_active, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9)
        RETURNING id`,
        [
          companyId, data.code, data.name, data.name_ar || null,
          data.description || null, data.description_ar || null,
          data.category, data.is_active, data.sort_order || 0
        ]
      );

      res.status(201).json({ 
        message: 'Bill type created successfully',
        data: { id: result.rows[0].id }
      });
    } catch (error) {
      console.error('Error creating bill type:', error);
      res.status(500).json({ error: 'Failed to create bill type' });
    }
  }
);

// ============================================================================
// PUT /api/bill-types/:id - Update (only non-system types)
// ============================================================================
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('bill_types:manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      // Check if exists and is not system
      const existing = await pool.query(
        `SELECT id, is_system FROM bill_types 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Bill type not found or is system type' });
      }

      if (existing.rows[0].is_system) {
        return res.status(403).json({ error: 'Cannot modify system bill types' });
      }

      const schema = z.object({
        code: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(100).optional(),
        name_ar: z.string().max(100).optional().nullable(),
        description: z.string().optional().nullable(),
        description_ar: z.string().optional().nullable(),
        category: z.enum(['sea_master', 'sea_house', 'air', 'land', 'multimodal']).optional(),
        is_active: z.boolean().optional(),
        sort_order: z.number().int().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      }

      const data = parsed.data;

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.code !== undefined) {
        updates.push(`code = $${paramIndex++}`);
        values.push(data.code);
      }
      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.name_ar !== undefined) {
        updates.push(`name_ar = $${paramIndex++}`);
        values.push(data.name_ar);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.description_ar !== undefined) {
        updates.push(`description_ar = $${paramIndex++}`);
        values.push(data.description_ar);
      }
      if (data.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(data.category);
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(data.is_active);
      }
      if (data.sort_order !== undefined) {
        updates.push(`sort_order = $${paramIndex++}`);
        values.push(data.sort_order);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id, companyId);

      const result = await pool.query(
        `UPDATE bill_types SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1} AND deleted_at IS NULL
         RETURNING id`,
        values
      );

      res.json({ 
        message: 'Bill type updated successfully',
        data: { id: result.rows[0].id }
      });
    } catch (error) {
      console.error('Error updating bill type:', error);
      res.status(500).json({ error: 'Failed to update bill type' });
    }
  }
);

// ============================================================================
// DELETE /api/bill-types/:id - Delete (only non-system types)
// ============================================================================
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('bill_types:manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      // Check if system type
      const existing = await pool.query(
        `SELECT is_system FROM bill_types WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Bill type not found' });
      }

      if (existing.rows[0].is_system) {
        return res.status(403).json({ error: 'Cannot delete system bill types' });
      }

      // Check if in use
      const inUse = await pool.query(
        `SELECT COUNT(*) FROM shipping_bills 
         WHERE bill_type_id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (parseInt(inUse.rows[0].count) > 0) {
        return res.status(409).json({ error: 'Bill type is in use and cannot be deleted' });
      }

      await pool.query(
        `UPDATE bill_types SET deleted_at = NOW() 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      res.json({ message: 'Bill type deleted successfully' });
    } catch (error) {
      console.error('Error deleting bill type:', error);
      res.status(500).json({ error: 'Failed to delete bill type' });
    }
  }
);

export default router;
