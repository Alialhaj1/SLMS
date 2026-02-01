import { Request, Response, NextFunction } from 'express';
import pool from '../db';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
  };
  auditContext?: {
    action: string;
    resource: string;
    resourceId?: number;
    before?: any;
    after?: any;
  };
}

/**
 * Audit Log Middleware - Automatically logs all actions
 * Usage: Apply after authentication and RBAC checks
 */
export const auditLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  
  if (!user) {
    return next();
  }

  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Log the action after response is sent
    setImmediate(async () => {
      try {
        const action = getActionFromMethod(req.method);
        const resource = extractResourceFromPath(req.baseUrl || req.originalUrl || req.path);
        const resourceId = req.params.id ? parseInt(req.params.id) : null;

        await pool.query(
          `INSERT INTO audit_logs (
            user_id, 
            action, 
            resource, 
            resource_id, 
            before_data, 
            after_data, 
            ip_address,
            user_agent,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            user.id,
            action,
            resource,
            resourceId,
            req.auditContext?.before || null,
            req.auditContext?.after || body || null,
            req.ip,
            req.headers['user-agent'] || null,
          ]
        );
      } catch (error) {
        console.error('Failed to log audit entry:', error);
      }
    });

    return originalJson(body);
  };

  next();
};

/**
 * Helper to determine action from HTTP method
 */
function getActionFromMethod(method: string): string {
  switch (method) {
    case 'GET':
      return 'view';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return method.toLowerCase();
  }
}

/**
 * Extract resource name from API path
 * Supports full URLs (/api/companies/123) or Express mounted baseUrl (/api/companies)
 */
function extractResourceFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  // Remove 'api' prefix if exists
  const apiIndex = parts.indexOf('api');
  if (apiIndex !== -1 && apiIndex < parts.length - 1) {
    return parts[apiIndex + 1];
  }
  return parts[0] || 'unknown';
}

/**
 * Store "before" state for audit logging
 * Call this before updating/deleting records
 */
export const captureBeforeState = async (
  req: AuthRequest,
  resourceTable: string,
  resourceId: number
) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ${resourceTable} WHERE id = $1`,
      [resourceId]
    );

    if (result.rows.length > 0) {
      req.auditContext = {
        action: getActionFromMethod(req.method),
        resource: resourceTable,
        resourceId,
        before: result.rows[0],
      };
    }
  } catch (error) {
    console.error('Failed to capture before state:', error);
  }
};
