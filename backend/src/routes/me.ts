import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import AuthorizationService from '../services/authorizationService';
import pool from '../db';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  
  try {
    const userId = user.sub || user.id;
    
    // Get complete user context (new governance system)
    const userContext = await AuthorizationService.getUserContext(userId);
    
    if (!userContext) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Fetch additional user details
    const userResult = await pool.query(
      `SELECT 
        preferred_language, 
        status, 
        must_change_password, 
        last_login_at, 
        profile_image, 
        cover_image 
       FROM users WHERE id = $1`,
      [userId]
    );
    const userDetails = userResult.rows[0] || {};
    
    // Return complete context with additional UI fields
    // Include login_context and effective tenant_id from JWT
    // This is critical: when a platform user logs into a tenant,
    // the DB has tenant_id=NULL but the JWT has the effective tenant_id
    const jwtTenantId = user.tenant_id ?? null;
    const loginContext = user.login_context || (jwtTenantId ? 'tenant' : 'platform');
    
    res.json({
      success: true,
      data: {
        ...userContext,
        // Override tenant_id with JWT's effective tenant_id for platform users in tenant context
        tenant_id: jwtTenantId !== null ? jwtTenantId : userContext.tenant_id,
        login_context: loginContext,
        preferred_language: userDetails.preferred_language || 'en',
        status: userDetails.status || 'active',
        must_change_password: userDetails.must_change_password || false,
        last_login_at: userDetails.last_login_at || null,
        profile_image: userDetails.profile_image || null,
        cover_image: userDetails.cover_image || null,
        jti: user.jti || null
      }
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      message: error.message
    });
  }
});

// ============================================================================
// GET /api/me/tenant - Get current user's tenant info
// ============================================================================
router.get('/tenant', authenticate, async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  
  try {
    const userId = user.sub || user.id;
    
    // Tenant column selection (matching actual DB schema)
    const tenantCols = `
      id, tenant_code, name, name_ar, slug, tenant_type, status,
      primary_email, phone, logo_url, primary_color, secondary_color,
      address_line1, city, country_code, tax_number, commercial_registration,
      default_currency, default_timezone, date_format, fiscal_year_start_month,
      default_language, created_at, updated_at
    `;

    // Get user's tenant information
    const result = await pool.query(`
      SELECT ${tenantCols}
      FROM tenants t
      JOIN users u ON u.tenant_id = t.id
      WHERE u.id = $1 AND t.deleted_at IS NULL
    `, [userId]);
    
    if (result.rows.length === 0) {
      // If no tenant found (e.g. super_admin with no tenant_id), return default ALHAJCO tenant
      const defaultTenant = await pool.query(`
        SELECT ${tenantCols}
        FROM tenants 
        WHERE tenant_code = 'ALHAJCO' AND deleted_at IS NULL
        LIMIT 1
      `);
      
      if (defaultTenant.rows.length > 0) {
        return res.json({ success: true, data: defaultTenant.rows[0] });
      }
      return res.status(404).json({ error: 'No tenant found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching tenant info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tenant info' });
  }
});

// ============================================================================
// PUT /api/me/tenant - Update current user's tenant settings (tenant admin only)
// ============================================================================
router.put('/tenant', authenticate, async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  
  try {
    const userId = user.sub || user.id;
    const {
      name,
      name_ar,
      primary_email,
      phone,
      logo_url,
      primary_color,
      secondary_color,
      address_line1,
      city,
      country_code,
      tax_number,
      commercial_registration,
      default_currency,
      default_timezone,
      date_format,
      fiscal_year_start_month,
      default_language
    } = req.body;
    
    // First, get the user's tenant and check if they have admin permission
    const userTenant = await pool.query(`
      SELECT t.id, ur.role_id
      FROM tenants t
      JOIN users u ON u.tenant_id = t.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = $1 AND t.deleted_at IS NULL
    `, [userId]);
    
    let tenantId: number;
    if (userTenant.rows.length === 0) {
      // Fallback for super_admin: get default tenant
      const defaultTenant = await pool.query(`SELECT id FROM tenants WHERE tenant_code = 'ALHAJCO' AND deleted_at IS NULL LIMIT 1`);
      if (defaultTenant.rows.length === 0) {
        return res.status(404).json({ error: 'No tenant found' });
      }
      tenantId = defaultTenant.rows[0].id;
    } else {
      tenantId = userTenant.rows[0].id;
    }
    
    // Update tenant (using actual column names)
    const result = await pool.query(`
      UPDATE tenants 
      SET 
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        primary_email = COALESCE($3, primary_email),
        phone = COALESCE($4, phone),
        logo_url = COALESCE($5, logo_url),
        primary_color = COALESCE($6, primary_color),
        secondary_color = COALESCE($7, secondary_color),
        address_line1 = COALESCE($8, address_line1),
        city = COALESCE($9, city),
        country_code = COALESCE($10, country_code),
        tax_number = COALESCE($11, tax_number),
        commercial_registration = COALESCE($12, commercial_registration),
        default_currency = COALESCE($13, default_currency),
        default_timezone = COALESCE($14, default_timezone),
        date_format = COALESCE($15, date_format),
        fiscal_year_start_month = COALESCE($16, fiscal_year_start_month),
        default_language = COALESCE($17, default_language),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING 
        id, tenant_code, name, name_ar, slug, tenant_type, status,
        primary_email, phone, logo_url, primary_color, secondary_color,
        address_line1, city, country_code, tax_number, commercial_registration,
        default_currency, default_timezone, date_format, fiscal_year_start_month,
        default_language, created_at, updated_at
    `, [name, name_ar, primary_email, phone, logo_url, primary_color, secondary_color, address_line1, city, country_code, tax_number, commercial_registration, default_currency, default_timezone, date_format, fiscal_year_start_month, default_language, tenantId]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
});

// ============================================================================
// GET /api/me/subscription - Get current user's subscription info
// ============================================================================
router.get('/subscription', authenticate, async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  
  try {
    const userId = user.sub || user.id;
    
    // Get user's tenant subscription information
    const result = await pool.query(`
      SELECT 
        t.id as tenant_id,
        t.tenant_code,
        t.name as tenant_name,
        t.subscription_status,
        t.trial_ends_at,
        t.subscription_starts_at,
        t.subscription_ends_at,
        t.current_users_count,
        t.current_storage_used_mb,
        sp.id as plan_id,
        sp.code as plan_code,
        sp.name as plan_name,
        sp.name_ar as plan_name_ar,
        sp.max_users,
        sp.max_companies,
        sp.max_branches_per_company,
        sp.max_storage_gb,
        sp.monthly_price,
        sp.annual_price,
        sp.currency,
        sp.features
      FROM tenants t
      JOIN users u ON u.tenant_id = t.id
      LEFT JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
      WHERE u.id = $1 AND t.deleted_at IS NULL
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    const subscription = result.rows[0];
    
    // Get recent invoices
    const invoices = await pool.query(`
      SELECT 
        id, invoice_number, period_start, period_end, 
        total_amount, currency, status, issued_at, due_date, paid_at
      FROM tenant_invoices
      WHERE tenant_id = $1
      ORDER BY issued_at DESC
      LIMIT 10
    `, [subscription.tenant_id]);
    
    // Calculate usage percentages
    const usageStats = {
      users: {
        used: subscription.current_users_count || 0,
        limit: subscription.max_users || 0,
        percentage: subscription.max_users > 0 
          ? Math.round((subscription.current_users_count / subscription.max_users) * 100) 
          : 0
      },
      storage: {
        used_mb: subscription.current_storage_used_mb || 0,
        limit_gb: subscription.max_storage_gb || 0,
        percentage: subscription.max_storage_gb > 0 
          ? Math.round((subscription.current_storage_used_mb / (subscription.max_storage_gb * 1024)) * 100) 
          : 0
      }
    };
    
    res.json({ 
      success: true, 
      data: {
        ...subscription,
        invoices: invoices.rows,
        usage: usageStats
      }
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription info' });
  }
});

export default router;
