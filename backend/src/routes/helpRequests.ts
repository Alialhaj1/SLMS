import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schema
const helpRequestSchema = z.object({
  type: z.enum(['access_request', 'permission_request', 'general_support']),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(2000),
  requested_permission: z.string().optional(),
  requested_page: z.string().optional(),
});

// POST /api/help-requests - Create new help request
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = helpRequestSchema.parse(req.body);
    const { id: userId, email, companyId } = req.user!;

    const result = await pool.query(
      `INSERT INTO help_requests (
        user_id, company_id, type, subject, message, 
        requested_permission, requested_page, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [
        userId,
        companyId,
        validatedData.type,
        validatedData.subject,
        validatedData.message,
        validatedData.requested_permission || null,
        validatedData.requested_page || null,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Your request has been submitted successfully. An administrator will review it shortly.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation error', details: error.errors },
      });
    }
    console.error('Error creating help request:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to submit request' },
    });
  }
});

// GET /api/help-requests - List help requests (admin only)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        hr.*,
        u.email as user_email,
        u.full_name as user_name,
        c.name as company_name
      FROM help_requests hr
      LEFT JOIN users u ON hr.user_id = u.id
      LEFT JOIN companies c ON hr.company_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND hr.status = $${params.length}`;
    }

    // Count total
    const countResult = await pool.query(query.replace('SELECT hr.*, u.email as user_email, u.full_name as user_name, c.name as company_name', 'SELECT COUNT(*)'));
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    query += ` ORDER BY hr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching help requests:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch help requests' },
    });
  }
});

// PUT /api/help-requests/:id - Update help request status (admin only)
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid status. Must be one of: pending, approved, rejected, resolved' },
      });
    }

    const { id: adminId } = req.user!;

    // Update the help request
    // Use separate parameter for CASE to avoid type ambiguity
    const result = await pool.query(
      `UPDATE help_requests 
       SET status = $1, 
           admin_response = $2,
           resolved_by = $3,
           resolved_at = CASE WHEN $5 != 'pending' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, admin_response, adminId, id, status]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Help request not found' },
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `Request ${status} successfully`,
    });
  } catch (error: any) {
    console.error('Error updating help request:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update help request' },
    });
  }
});

export default router;
