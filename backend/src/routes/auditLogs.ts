import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getPaginationParams, sendPaginated } from '../utils/response';

const router = Router();

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = str.replace(/\"/g, '""');
  return `"${escaped}"`;
}

/**
 * GET /api/audit-logs
 * List audit logs with filters and pagination
 */
router.get(
  '/',
  authenticate,
  requirePermission('audit_logs:view'),
  async (req: Request, res: Response) => {
    try {
      const { 
        user_id, 
        resource, 
        action,
        date_from,
        date_to,
      } = req.query;

      const { page, limit, offset } = getPaginationParams(req.query);

      let query = `
        SELECT 
          al.*,
          u.full_name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      // Filter by user
      if (user_id) {
        query += ` AND al.user_id = $${paramIndex}`;
        params.push(user_id);
        paramIndex++;
      }

      // Filter by resource
      if (resource) {
        query += ` AND al.resource = $${paramIndex}`;
        params.push(resource);
        paramIndex++;
      }

      // Filter by action
      if (action) {
        query += ` AND al.action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }

      // Filter by date range
      if (date_from) {
        query += ` AND al.created_at >= $${paramIndex}`;
        params.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        query += ` AND al.created_at <= $${paramIndex}`;
        params.push(date_to);
        paramIndex++;
      }

      // Count total records
      const countQuery = query.replace(
        'SELECT al.*, u.full_name as user_name, u.email as user_email',
        'SELECT COUNT(*) as total'
      );
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Add pagination
      query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch audit logs',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/audit-logs/export
 * Export audit logs as CSV (same filters as list)
 */
router.get(
  '/export',
  authenticate,
  requirePermission('audit_logs:export'),
  async (req: Request, res: Response) => {
    try {
      const {
        user_id,
        resource,
        action,
        date_from,
        date_to,
      } = req.query;

      let query = `
        SELECT 
          al.id,
          al.created_at,
          u.email as user_email,
          al.action,
          al.resource,
          al.resource_id,
          al.ip_address,
          al.user_agent,
          al.before_data,
          al.after_data
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (user_id) {
        query += ` AND al.user_id = $${paramIndex}`;
        params.push(user_id);
        paramIndex++;
      }
      if (resource) {
        query += ` AND al.resource = $${paramIndex}`;
        params.push(resource);
        paramIndex++;
      }
      if (action) {
        query += ` AND al.action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }
      if (date_from) {
        query += ` AND al.created_at >= $${paramIndex}`;
        params.push(date_from);
        paramIndex++;
      }
      if (date_to) {
        query += ` AND al.created_at <= $${paramIndex}`;
        params.push(date_to);
        paramIndex++;
      }

      query += ` ORDER BY al.created_at DESC`;

      const result = await pool.query(query, params);

      const headers = [
        'id',
        'created_at',
        'user_email',
        'action',
        'resource',
        'resource_id',
        'ip_address',
        'user_agent',
        'before_data',
        'after_data',
      ];

      const rows = result.rows.map((row) =>
        headers.map((h) => csvEscape((row as any)[h])).join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      return res.status(200).send(csv);
    } catch (error: any) {
      console.error('Failed to export audit logs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export audit logs',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/audit-logs/resources
 * Get list of unique resources (for filter dropdown)
 */
router.get(
  '/resources',
  authenticate,
  requirePermission('audit_logs:view'),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT DISTINCT resource FROM audit_logs ORDER BY resource'
      );

      res.json(result.rows.map(row => row.resource));
    } catch (error: any) {
      console.error('Failed to fetch resources:', error);
      res.status(500).json({ error: 'Failed to fetch resources' });
    }
  }
);

/**
 * GET /api/audit-logs/actions
 * Get list of unique actions (for filter dropdown)
 */
router.get(
  '/actions',
  authenticate,
  requirePermission('audit_logs:view'),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT DISTINCT action FROM audit_logs ORDER BY action'
      );

      res.json(result.rows.map(row => row.action));
    } catch (error: any) {
      console.error('Failed to fetch actions:', error);
      res.status(500).json({ error: 'Failed to fetch actions' });
    }
  }
);

/**
 * GET /api/audit-logs/:id
 * Get single audit log entry with full details
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('audit_logs:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          al.*,
          u.full_name as user_name,
          u.email as user_email
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE al.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Audit log not found' });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Failed to fetch audit log:', error);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  }
);

/**
 * GET /api/audit-logs/stats/summary
 * Get audit logs statistics
 */
router.get(
  '/stats/summary',
  authenticate,
  requirePermission('audit_logs:view'),
  async (req: Request, res: Response) => {
    try {
      const { date_from, date_to } = req.query;

      let whereClause = '1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (date_from) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(date_to);
        paramIndex++;
      }

      // Actions by type
      const actionStats = await pool.query(
        `SELECT action, COUNT(*) as count
         FROM audit_logs
         WHERE ${whereClause}
         GROUP BY action
         ORDER BY count DESC`,
        params
      );

      // Activity by resource
      const resourceStats = await pool.query(
        `SELECT resource, COUNT(*) as count
         FROM audit_logs
         WHERE ${whereClause}
         GROUP BY resource
         ORDER BY count DESC
         LIMIT 10`,
        params
      );

      // Top users
      const userStats = await pool.query(
        `SELECT 
           u.full_name,
           u.email,
           COUNT(*) as action_count
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE ${whereClause}
         GROUP BY u.id, u.full_name, u.email
         ORDER BY action_count DESC
         LIMIT 10`,
        params
      );

      res.json({
        actions: actionStats.rows,
        resources: resourceStats.rows,
        topUsers: userStats.rows,
      });
    } catch (error: any) {
      console.error('Failed to fetch audit stats:', error);
      res.status(500).json({ error: 'Failed to fetch audit stats' });
    }
  }
);

export default router;
