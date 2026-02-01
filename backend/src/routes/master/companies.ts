import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/logos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const companyId = req.params.id;
    const ext = path.extname(file.originalname);
    cb(null, `company_${companyId}_${Date.now()}${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and SVG files are allowed'));
    }
  }
});

// Apply middleware to all routes
router.use(authenticate);

// Validation schemas
const createCompanySchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(1).max(255),
  name_ar: z.string().max(255).optional().nullable(),
  legal_name: z.string().max(255).optional().nullable(),
  tax_number: z.string().max(100).optional().nullable(),
  tax_id: z.string().max(100).optional().nullable(),
  registration_number: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country_id: z.number().int().positive().optional().nullable(),
  city_id: z.number().int().positive().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  website: z.string().url().optional().nullable().or(z.literal('')),
  currency: z.string().max(10).default('USD'),
  status: z.enum(['active', 'inactive']).default('active'),
  is_active: z.boolean().default(true),
});

const updateCompanySchema = createCompanySchema.partial();

// GET /api/master/companies - List all companies
router.get(
  '/',
  requirePermission('companies:view'),
  async (req: Request, res: Response) => {
    try {
      const { search, status, is_active, include_deleted } = req.query;
      const params: any[] = [];
      let paramIndex = 1;

      let query = `
        SELECT 
          c.*,
          co.name as country_name,
          co.code as country_code,
          ci.name as city_name,
          ci.code as city_code,
          (SELECT COUNT(*) FROM branches WHERE company_id = c.id AND deleted_at IS NULL) as branches_count,
          u1.full_name as created_by_name,
          u2.full_name as updated_by_name
        FROM companies c
        LEFT JOIN countries co ON c.country_id = co.id
        LEFT JOIN cities ci ON c.city_id = ci.id
        LEFT JOIN users u1 ON c.created_by = u1.id
        LEFT JOIN users u2 ON c.updated_by = u2.id
        WHERE 1=1
      `;

      // Exclude soft-deleted by default
      if (include_deleted !== 'true') {
        query += ` AND c.deleted_at IS NULL`;
      }

      if (search) {
        query += ` AND (c.name ILIKE $${paramIndex} OR c.code ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        const isActive = status === 'active';
        query += ` AND c.is_active = $${paramIndex}`;
        params.push(isActive);
        paramIndex++;
      }

      if (is_active !== undefined) {
        query += ` AND c.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      query += ` ORDER BY c.code`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows, total: result.rowCount || 0 });
    } catch (error) {
      console.error('Error fetching companies:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch companies' } });
    }
  }
);

// GET /api/master/companies/:id - Get single company
router.get(
  '/:id',
  requirePermission('companies:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          c.*,
          co.name as country_name,
          co.code as country_code,
          ci.name as city_name,
          ci.code as city_code,
          (SELECT COUNT(*) FROM branches WHERE company_id = c.id AND deleted_at IS NULL) as branches_count,
          u1.full_name as created_by_name,
          u2.full_name as updated_by_name
        FROM companies c
        LEFT JOIN countries co ON c.country_id = co.id
        LEFT JOIN cities ci ON c.city_id = ci.id
        LEFT JOIN users u1 ON c.created_by = u1.id
        LEFT JOIN users u2 ON c.updated_by = u2.id
        WHERE c.id = $1 AND c.deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching company:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch company' } });
    }
  }
);

// POST /api/master/companies - Create new company
router.post(
  '/',
  requirePermission('companies:create'),
  async (req: Request, res: Response) => {
    try {
      const validationResult = createCompanySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validationResult.error.errors }
        });
      }

      const data = validationResult.data;
      const userId = (req as any).user?.id;

      // Check for duplicate code
      const duplicateCheck = await pool.query(
        'SELECT id FROM companies WHERE code = $1 AND deleted_at IS NULL',
        [data.code]
      );
      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: 'A company with this code already exists' }
        });
      }

      const result = await pool.query(
        `INSERT INTO companies (
          code, name, name_ar, legal_name, tax_number, registration_number,
          country, city, country_id, city_id, address, phone, email, website, currency, is_active,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        RETURNING *`,
        [
          data.code,
          data.name,
          data.name_ar || null,
          data.legal_name || null,
          data.tax_number || data.tax_id || null,
          data.registration_number || null,
          data.country || null,
          data.city || null,
          data.country_id || null,
          data.city_id || null,
          data.address || null,
          data.phone || null,
          data.email || null,
          data.website || null,
          data.currency || 'USD',
          data.is_active ?? (data.status === 'active'),
          userId
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating company:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create company' } });
    }
  }
);

// PUT /api/master/companies/:id - Update company
router.put(
  '/:id',
  requirePermission('companies:update'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validationResult = updateCompanySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validationResult.error.errors }
        });
      }

      const data = validationResult.data;
      const userId = (req as any).user?.id;

      // Check if company exists
      const existingCheck = await pool.query(
        'SELECT id FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existingCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
      }

      // Check for duplicate code (excluding current record)
      if (data.code) {
        const duplicateCheck = await pool.query(
          'SELECT id FROM companies WHERE code = $1 AND id != $2 AND deleted_at IS NULL',
          [data.code, id]
        );
        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: { code: 'DUPLICATE_CODE', message: 'A company with this code already exists' }
          });
        }
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fieldMappings: Record<string, string> = {
        code: 'code',
        name: 'name',
        name_ar: 'name_ar',
        legal_name: 'legal_name',
        tax_number: 'tax_number',
        tax_id: 'tax_number',
        registration_number: 'registration_number',
        country: 'country',
        city: 'city',
        country_id: 'country_id',
        city_id: 'city_id',
        address: 'address',
        phone: 'phone',
        email: 'email',
        website: 'website',
        currency: 'currency',
        is_active: 'is_active',
      };

      for (const [key, dbField] of Object.entries(fieldMappings)) {
        if (data[key as keyof typeof data] !== undefined) {
          updates.push(`${dbField} = $${paramIndex}`);
          values.push(data[key as keyof typeof data]);
          paramIndex++;
        }
      }

      // Handle status -> is_active conversion (only if is_active wasn't already set)
      if (data.status !== undefined && data.is_active === undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(data.status === 'active');
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No fields to update' } });
      }

      updates.push(`updated_by = $${paramIndex}`);
      values.push(userId);
      paramIndex++;

      updates.push(`updated_at = NOW()`);

      values.push(id);

      const result = await pool.query(
        `UPDATE companies SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating company:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update company' } });
    }
  }
);

// DELETE /api/master/companies/:id - Soft delete company
router.delete(
  '/:id',
  requirePermission('companies:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      // Check if company exists
      const existingCheck = await pool.query(
        'SELECT id, name FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existingCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
      }

      // Check if company has active branches
      const branchesCheck = await pool.query(
        'SELECT COUNT(*) as count FROM branches WHERE company_id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (parseInt(branchesCheck.rows[0].count) > 0) {
        return res.status(409).json({
          success: false,
          error: { code: 'HAS_BRANCHES', message: 'Cannot delete company with active branches' }
        });
      }

      // Soft delete
      await pool.query(
        'UPDATE companies SET deleted_at = NOW(), updated_by = $1, updated_at = NOW() WHERE id = $2',
        [userId, id]
      );

      res.json({ success: true, message: 'Company deleted successfully' });
    } catch (error) {
      console.error('Error deleting company:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete company' } });
    }
  }
);

// POST /api/master/companies/:id/logo - Upload company logo
router.post(
  '/:id/logo',
  requirePermission('companies:update'),
  logoUpload.single('logo'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!req.file) {
        return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No logo file provided' } });
      }

      // Check if company exists
      const existingCheck = await pool.query(
        'SELECT id, logo FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existingCheck.rows.length === 0) {
        // Delete uploaded file
        if (req.file.path) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
      }

      // Delete old logo if exists
      const oldLogo = existingCheck.rows[0].logo;
      if (oldLogo) {
        const oldLogoPath = path.join(__dirname, '../../../uploads/logos', path.basename(oldLogo));
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      // Store relative path for the logo
      const logoUrl = `/uploads/logos/${req.file.filename}`;

      // Update company with new logo
      const result = await pool.query(
        'UPDATE companies SET logo = $1, updated_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [logoUrl, userId, id]
      );

      res.json({ success: true, data: result.rows[0], logoUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ success: false, error: { code: 'UPLOAD_ERROR', message: 'Failed to upload logo' } });
    }
  }
);

// DELETE /api/master/companies/:id/logo - Remove company logo
router.delete(
  '/:id/logo',
  requirePermission('companies:update'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      // Check if company exists and has a logo
      const existingCheck = await pool.query(
        'SELECT id, logo FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existingCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
      }

      const currentLogo = existingCheck.rows[0].logo;
      if (currentLogo) {
        // Delete the file
        const logoPath = path.join(__dirname, '../../../uploads/logos', path.basename(currentLogo));
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }
      }

      // Update company to remove logo reference
      const result = await pool.query(
        'UPDATE companies SET logo = NULL, updated_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [userId, id]
      );

      res.json({ success: true, data: result.rows[0], message: 'Logo removed successfully' });
    } catch (error) {
      console.error('Error removing logo:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to remove logo' } });
    }
  }
);

export default router;
