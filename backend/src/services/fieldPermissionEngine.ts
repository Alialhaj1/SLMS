/**
 * Field Permission Engine
 * Controls field-level visibility and editability based on roles and company context.
 */
import pool from '../db';
import { logger } from '../utils/logger';

interface FieldPermission {
  field_name: string;
  visibility: 'visible' | 'hidden' | 'readonly';
  required_override: boolean | null;
}

interface FieldPermissionRule {
  id: number;
  resource: string;
  field_name: string;
  role_id: number;
  role_name?: string;
  visibility: string;
  required_override: boolean | null;
  company_id: number | null;
  created_at: string;
}

/**
 * Get resolved field permissions for a specific resource and user.
 * Merges role-based rules, falling back to defaults.
 */
export async function getFieldPermissionsForResource(
  resource: string,
  userId: number,
  companyId?: number
): Promise<FieldPermission[]> {
  try {
    // Get user's role IDs
    const rolesResult = await pool.query(
      `SELECT role_id FROM user_roles WHERE user_id = $1`,
      [userId]
    );
    const roleIds = rolesResult.rows.map((r: any) => r.role_id);

    if (roleIds.length === 0) return [];

    // Fetch field permission rules for this resource and user's roles
    const result = await pool.query(
      `SELECT field_name, visibility, required_override
       FROM field_permission_rules
       WHERE resource = $1
         AND role_id = ANY($2)
         AND (company_id IS NULL OR company_id = $3)
         AND deleted_at IS NULL
       ORDER BY company_id NULLS LAST`,
      [resource, roleIds, companyId || null]
    );

    // Deduplicate by field_name (company-specific rules take priority)
    const fieldMap = new Map<string, FieldPermission>();
    for (const row of result.rows) {
      if (!fieldMap.has(row.field_name)) {
        fieldMap.set(row.field_name, {
          field_name: row.field_name,
          visibility: row.visibility,
          required_override: row.required_override,
        });
      }
    }

    return Array.from(fieldMap.values());
  } catch (error: any) {
    // Table may not exist yet - return empty
    if (error.code === '42P01') return [];
    logger.error('getFieldPermissionsForResource error:', error);
    return [];
  }
}

/**
 * List all field permission rules (admin view).
 */
export async function listFieldPermissionRules(
  resource?: string,
  roleId?: number,
  companyId?: number
): Promise<FieldPermissionRule[]> {
  try {
    let query = `
      SELECT fpr.*, r.name as role_name
      FROM field_permission_rules fpr
      LEFT JOIN roles r ON r.id = fpr.role_id
      WHERE fpr.deleted_at IS NULL
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (resource) {
      query += ` AND fpr.resource = $${paramIdx++}`;
      params.push(resource);
    }
    if (roleId) {
      query += ` AND fpr.role_id = $${paramIdx++}`;
      params.push(roleId);
    }
    if (companyId) {
      query += ` AND (fpr.company_id IS NULL OR fpr.company_id = $${paramIdx++})`;
      params.push(companyId);
    }

    query += ' ORDER BY fpr.resource, fpr.field_name';

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error: any) {
    if (error.code === '42P01') return [];
    logger.error('listFieldPermissionRules error:', error);
    return [];
  }
}

/**
 * Create or update a field permission rule.
 */
export async function createFieldPermissionRule(rule: {
  resource: string;
  field_name: string;
  role_id: number;
  visibility: string;
  required_override?: boolean | null;
  company_id?: number | null;
}): Promise<FieldPermissionRule> {
  const result = await pool.query(
    `INSERT INTO field_permission_rules (resource, field_name, role_id, visibility, required_override, company_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (resource, field_name, role_id, COALESCE(company_id, 0))
     DO UPDATE SET visibility = EXCLUDED.visibility, required_override = EXCLUDED.required_override, updated_at = NOW()
     RETURNING *`,
    [rule.resource, rule.field_name, rule.role_id, rule.visibility, rule.required_override ?? null, rule.company_id ?? null]
  );
  return result.rows[0];
}

/**
 * Delete a field permission rule (soft delete).
 */
export async function deleteFieldPermissionRule(id: number): Promise<boolean> {
  const result = await pool.query(
    `UPDATE field_permission_rules SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
