/**
 * Company Context Middleware
 * 
 * Critical Security Layer for Multi-Tenant ERP
 * - Enforces company_id isolation on all requests
 * - Prevents data leakage between companies
 * - Provides helper functions for secure queries
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';

// Extend Express Request to include company context and user
declare global {
  namespace Express {
    interface Request {
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
      companyId?: number;
      branchId?: number;
      company?: {
        id: number;
        name: string;
        code: string;
        currency_id: number;
        fiscal_year_id?: number;
        current_period_id?: number;
      };
      companyContext?: {
        id: number;
        companyId?: number;
        name: string;
        code: string;
        currency_id: number;
        fiscal_year_id?: number;
        current_period_id?: number;
      };
    }
  }
}

/**
 * Middleware to load and validate company context
 * Should be applied after authentication
 */
export const loadCompanyContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Company can come from:
    // 1. Request header (X-Company-Id)
    // 2. User's default company
    // 3. Query parameter (for specific operations)
    
    let companyId = req.headers['x-company-id'] as string;

    // Allow company id from JWT payload when available
    if (!companyId && req.user) {
      const fromToken = (req.user.companyId ?? req.user.company_id) as unknown;
      if (fromToken !== undefined && fromToken !== null && String(fromToken).trim() !== '') {
        companyId = String(fromToken);
      }
    }
    
    if (!companyId && req.user) {
      // Get user's default/assigned company
      const userCompany = await pool.query(
        `SELECT company_id FROM user_companies 
         WHERE user_id = $1 AND is_default = true
         LIMIT 1`,
        [req.user.id]
      );
      
      if (userCompany.rows.length > 0) {
        companyId = userCompany.rows[0].company_id;
      } else {
        // Fallback: get first company user has access to
        const anyCompany = await pool.query(
          `SELECT company_id FROM user_companies 
           WHERE user_id = $1 
           ORDER BY company_id LIMIT 1`,
          [req.user.id]
        );
        
        if (anyCompany.rows.length > 0) {
          companyId = anyCompany.rows[0].company_id;
        }
      }
    }

    // Last-resort fallback: super_admin sessions may not have user_companies rows.
    // Still enforce scoping by selecting a default company when none is provided.
    if (!companyId && req.user) {
      const SUPER_ADMIN_ROLES = ['super_admin', 'Super Admin', 'Admin', 'system_admin', 'System Admin'];
      const isSuperAdmin = req.user.roles?.some((role) => SUPER_ADMIN_ROLES.includes(role));
      if (isSuperAdmin) {
        const anyCompany = await pool.query(
          `SELECT id
           FROM companies
           WHERE deleted_at IS NULL
           ORDER BY id
           LIMIT 1`
        );
        if (anyCompany.rows.length > 0) {
          companyId = String(anyCompany.rows[0].id);
        }
      }
    }
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company context required',
        code: 'NO_COMPANY_CONTEXT'
      });
    }
    
    // Verify user has access to this company
    if (req.user) {
      // Super admin can access any company
      const SUPER_ADMIN_ROLES = ['super_admin', 'Super Admin', 'Admin', 'system_admin', 'System Admin'];
      const isSuperAdmin = req.user.roles?.some(role => SUPER_ADMIN_ROLES.includes(role));
      
      if (!isSuperAdmin) {
        const accessCheck = await pool.query(
          `SELECT 1 FROM user_companies 
           WHERE user_id = $1 AND company_id = $2`,
          [req.user.id, companyId]
        );
        
        if (accessCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this company',
            code: 'COMPANY_ACCESS_DENIED'
          });
        }
      }
    }
    
    // Load company context
    // Note: fiscal_years and accounting_periods joins are commented out until those tables are created
    const company = await pool.query(
      `SELECT 
        c.id, c.name, c.code, c.currency as currency_id,
        NULL::INTEGER as fiscal_year_id,
        NULL::INTEGER as current_period_id
       FROM companies c
       WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [companyId]
    );
    
    if (company.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND'
      });
    }
    
    req.companyId = parseInt(companyId, 10);
    // Backwards-compatible alias: some routes expect companyContext.companyId
    req.companyContext = { ...company.rows[0], companyId: company.rows[0].id };
    
    // Also check for branch context
    const branchId = req.headers['x-branch-id'] as string;
    if (branchId) {
      // Verify branch belongs to company
      const branchCheck = await pool.query(
        `SELECT id FROM branches 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [branchId, companyId]
      );
      
      if (branchCheck.rows.length > 0) {
        req.branchId = parseInt(branchId);
      }
    }
    
    next();
  } catch (error) {
    console.error('Company context error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load company context'
    });
  }
};

/**
 * Middleware to require company context
 * Use on routes that absolutely need a company
 */
export const requireCompany = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.companyId) {
    return res.status(400).json({
      success: false,
      error: 'Company context required for this operation',
      code: 'COMPANY_REQUIRED'
    });
  }
  next();
};

/**
 * Helper to build WHERE clause with company isolation
 */
export function withCompanyFilter(
  req: Request,
  alias: string = '',
  additionalConditions: string[] = []
): { where: string; params: any[] } {
  const prefix = alias ? `${alias}.` : '';
  const conditions = [`${prefix}company_id = $1`, ...additionalConditions];
  
  return {
    where: conditions.join(' AND '),
    params: [req.companyId]
  };
}

/**
 * Query builder helper for company-scoped queries
 */
export class CompanyQuery {
  private req: Request;
  private tableName: string;
  private alias: string;
  
  constructor(req: Request, tableName: string, alias: string = '') {
    this.req = req;
    this.tableName = tableName;
    this.alias = alias;
  }
  
  /**
   * Build SELECT query with automatic company filter
   */
  select(columns: string = '*'): { sql: string; baseParams: any[] } {
    const prefix = this.alias ? `${this.alias}.` : '';
    const from = this.alias ? `${this.tableName} ${this.alias}` : this.tableName;
    
    return {
      sql: `SELECT ${columns} FROM ${from} WHERE ${prefix}company_id = $1`,
      baseParams: [this.req.companyId]
    };
  }
  
  /**
   * Add company_id to INSERT data
   */
  insertData(data: Record<string, any>): Record<string, any> {
    return {
      ...data,
      company_id: this.req.companyId
    };
  }
  
  /**
   * Validate that a record belongs to current company
   */
  async validateOwnership(recordId: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM ${this.tableName} 
       WHERE id = $1 AND company_id = $2`,
      [recordId, this.req.companyId]
    );
    return result.rows.length > 0;
  }
}

export default { loadCompanyContext, requireCompany, withCompanyFilter, CompanyQuery };
