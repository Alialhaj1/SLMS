import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../db';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { TenantSchemaService } from '../services/tenantSchemaService';
import { UploadService } from '../services/uploadService';

const router = Router();

// ============================================================================
// POST /api/tenants — Create a new tenant (company + admin user)
// ============================================================================
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      company_name, company_name_ar, company_code, email, password,
      phone, country, plan, active_modules,
      max_users, start_date, notes,
      city, address, website, logo_url, currency,
      legal_name, tax_number, registration_number
    } = req.body;

    // Validation
    if (!company_name?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Company name is required', 400);
    if (!company_code?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Company code is required', 400);
    if (!email?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Email is required', 400);
    if (!password || password.length < 8) return sendError(res, 'VALIDATION_ERROR', 'Password must be at least 8 characters', 400);

    await client.query('BEGIN');

    // Check for duplicate company code (in both companies AND tenants tables)
    const existing = await client.query(
      'SELECT id FROM companies WHERE UPPER(code) = UPPER($1) AND deleted_at IS NULL',
      [company_code]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'DUPLICATE_CODE', 'Company code already exists / رمز الشركة موجود بالفعل', 409);
    }

    const existingTenant = await client.query(
      'SELECT id FROM tenants WHERE UPPER(company_code) = UPPER($1)',
      [company_code]
    );
    if (existingTenant.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'DUPLICATE_CODE', 'Company code already registered / رمز الشركة مسجل بالفعل', 409);
    }

    // Check for duplicate email
    const existingEmail = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL',
      [email]
    );
    if (existingEmail.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'DUPLICATE_EMAIL', 'Email already in use / البريد الإلكتروني مستخدم بالفعل', 409);
    }

    // Check for duplicate slug
    const slug = company_code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const domain = slug + '.slms.local';
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, name_ar, custom_domain, company_code, slug, plan, status, max_users, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, NOW(), NOW())
       RETURNING id`,
      [company_name, company_name_ar || null, domain, company_code.toUpperCase(), slug, plan || 'Starter', max_users || 5]
    );
    const tenantId = tenantResult.rows[0].id;

    // Step 2: Create the company - disable COA seed trigger (it doesn't set tenant_id properly)
    await client.query('ALTER TABLE companies DISABLE TRIGGER trg_company_seed_default_coa');
    const companyResult = await client.query(
      `INSERT INTO companies (
        code, name, name_ar, tenant_code, slug, phone, country, email, city, address, website, logo_url, currency,
        legal_name, tax_number, registration_number,
        status, subscription_plan, is_active, tenant_type, tenant_id,
        subscription_status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, 'standard', $19, 'active', $20, NOW(), NOW())
      RETURNING id, code, name, name_ar, tenant_code, status`,
      [
        company_code,
        company_name,
        company_name_ar || null,
        company_code.toUpperCase(),
        slug,
        phone || null,
        country || 'SAU',
        email,
        city || null,
        address || null,
        website || null,
        logo_url || null,
        currency || null,
        legal_name || null,
        tax_number || null,
        registration_number || null,
        'active',
        plan || 'Starter',
        tenantId,
        req.user?.id || null
      ]
    );

    const company = companyResult.rows[0];
    await client.query('ALTER TABLE companies ENABLE TRIGGER trg_company_seed_default_coa');

    // Step 3: Hash password and create admin user (tenant_id references tenants table)
    const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const userResult = await client.query(
      `INSERT INTO users (email, password, full_name, status, tenant_id, is_tenant_admin, created_at)
       VALUES ($1, $2, $3, 'active', $4, true, NOW())
       RETURNING id`,
      [email, hashedPassword, `Admin - ${company_name}`, tenantId]
    );

    const userId = userResult.rows[0].id;

    // Link user to company
    await client.query(
      `INSERT INTO user_companies (user_id, company_id, is_default, created_at)
       VALUES ($1, $2, true, NOW())`,
      [userId, company.id]
    );

    // Assign admin role if roles table has one
    const adminRole = await client.query(
      `SELECT id FROM roles WHERE LOWER(name) IN ('admin', 'company_admin', 'tenant_admin') LIMIT 1`
    );
    if (adminRole.rows.length > 0) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, company_id, assigned_at, assigned_by) VALUES ($1, $2, $3, NOW(), $4)
         ON CONFLICT DO NOTHING`,
        [userId, adminRole.rows[0].id, company.id, req.user?.id || null]
      );
    }

    // Step 5: Seed reference data for the new tenant (currencies, payment methods, tax types, etc.)
    try {
      const fnCheck = await client.query(
        `SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'provision_company_master_data') as exists`
      );
      if (fnCheck.rows[0].exists) {
        await client.query(
          `SELECT provision_company_master_data($1, $2, $3, $4)`,
          [company.id, tenantId, country || 'SAU', userId]
        );
        console.log(`[Tenant Provisioning] Seeded master data for tenant ${tenantId}, company ${company.id}`);
      } else {
        console.warn('[Tenant Provisioning] provision_company_master_data function not found — skipping seed');
      }
    } catch (seedErr: any) {
      // Log but don't fail tenant creation if seeding fails
      console.error('[Tenant Provisioning] Master data seeding error (non-fatal):', seedErr?.message);
    }

    // Step 6: Create a default branch for the company
    try {
      await client.query(
        `INSERT INTO branches (name, name_ar, code, company_id, tenant_id, is_main, is_active, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, true, $6, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [`${company_name} - Main Branch`, 'الفرع الرئيسي', 'HQ', company.id, tenantId, userId]
      );
      console.log(`[Tenant Provisioning] Created default branch for tenant ${tenantId}`);
    } catch (branchErr: any) {
      console.error('[Tenant Provisioning] Default branch creation error (non-fatal):', branchErr?.message);
    }

    // Step 7: Seed tenant-specific default roles with basic permissions
    try {
      const defaultRoles = [
        { name: 'manager', display_name: 'Manager', desc: 'Department manager with approval rights' },
        { name: 'user', display_name: 'Standard User', desc: 'Regular user with basic access' },
        { name: 'viewer', display_name: 'Viewer', desc: 'Read-only access to all modules' },
      ];
      for (const role of defaultRoles) {
        await client.query(
          `INSERT INTO roles (name, display_name, description, company_id, tenant_id, is_system, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [role.name, role.display_name, role.desc, company.id, tenantId, userId]
        );
      }
      console.log(`[Tenant Provisioning] Created default roles for tenant ${tenantId}`);
    } catch (rolesErr: any) {
      console.error('[Tenant Provisioning] Default roles creation error (non-fatal):', rolesErr?.message);
    }

    // Step 8: Save active modules to tenant_modules table
    if (Array.isArray(active_modules) && active_modules.length > 0) {
      try {
        for (const moduleCode of active_modules) {
          await client.query(
            `INSERT INTO tenant_modules (tenant_id, module_code, is_enabled, enabled_at, enabled_by)
             VALUES ($1, $2, true, NOW(), $3)
             ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_enabled = true, enabled_at = NOW(), enabled_by = $3`,
            [tenantId, moduleCode, req.user?.id || null]
          );
        }
        console.log(`[Tenant Provisioning] Saved ${active_modules.length} active modules for tenant ${tenantId}`);
      } catch (modErr: any) {
        console.error('[Tenant Provisioning] Module assignment error (non-fatal):', modErr?.message);
      }
    }

    await client.query('COMMIT');

    // ── Schema-per-Tenant Provisioning (Architecture §3) ──
    // Runs OUTSIDE the main transaction so failure doesn't rollback the tenant creation.
    // Fire-and-forget: provisioning creates 314 tables and can take 30+ seconds.
    TenantSchemaService.fullProvision(
      company_code,
      tenantId,
      company.id,
      country || 'SAU'
    ).then((provisionResult) => {
      console.log(
        `[Tenant Provisioning] Schema provisioned: ${provisionResult.provision.schema} ` +
        `(${provisionResult.provision.tables_created} tables)`
      );
    }).catch((schemaErr: any) => {
      // Non-fatal: tenant still works via public schema fallback
      console.error(
        '[Tenant Provisioning] Schema provisioning failed (non-fatal):',
        schemaErr?.message
      );
    });

    sendSuccess(res, {
      id: company.id,
      code: company.code,
      name: company.name,
      tenant_code: company.tenant_code,
      status: company.status,
      admin_email: email,
      admin_user_id: userId,
    }, 201);
  } catch (err: any) {
    try { await client.query('ALTER TABLE companies ENABLE TRIGGER trg_company_seed_default_coa'); } catch(_) {}
    await client.query('ROLLBACK');
    console.error('Error creating tenant:', err?.message || err, err?.detail || '', err?.hint || '');
    sendError(res, 'SERVER_ERROR', err?.message || 'Failed to create tenant', 500);
  } finally {
    client.release();
  }
});

// ============================================================================
// Public Routes (No authentication required)
// ============================================================================

// GET /api/tenants/public - List public tenant information for login
router.get('/public', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, tenant_code, name, name_ar, slug, 
        logo_url, primary_color, secondary_color, status
      FROM companies 
      WHERE deleted_at IS NULL 
        AND status IN ('active', 'trial') 
        AND tenant_code IS NOT NULL
      ORDER BY name ASC
    `);
    
    sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error('Error fetching public tenants:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch tenants', 500);
  }
});

// GET /api/tenants/validate/:code - Validate tenant code (public)
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return sendError(res, 'VALIDATION_ERROR', 'Tenant code is required', 400);
    }

    const result = await pool.query(`
      SELECT 
        id, tenant_code, name, name_ar, slug, code,
        logo_url, primary_color, secondary_color, status
      FROM companies 
      WHERE (UPPER(tenant_code) = UPPER($1) OR UPPER(code) = UPPER($1))
        AND deleted_at IS NULL
    `, [code]);

    if (result.rows.length === 0) {
      return sendError(res, 'TENANT_NOT_FOUND', 'Company not found', 404);
    }

    const tenant = result.rows[0];

    // Check tenant status
    if (tenant.status === 'terminated') {
      return sendError(res, 'TENANT_TERMINATED', 'Company account has been terminated', 403);
    }

    if (tenant.status === 'locked') {
      return sendError(res, 'TENANT_LOCKED', 'Company account is locked', 403);
    }

    if (tenant.status === 'suspended') {
      return sendError(res, 'TENANT_SUSPENDED', 'Company account is suspended', 403);
    }

    sendSuccess(res, tenant);
  } catch (err: any) {
    console.error('Error validating tenant:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to validate tenant', 500);
  }
});

// GET /api/tenants/by-slug/:slug - Get tenant by slug (public)
router.get('/by-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return sendError(res, 'VALIDATION_ERROR', 'Slug is required', 400);
    }

    const result = await pool.query(`
      SELECT 
        id, tenant_code, name, name_ar, slug, code,
        logo_url, primary_color, secondary_color, status
      FROM companies 
      WHERE LOWER(slug) = LOWER($1) OR UPPER(tenant_code) = UPPER($1) OR UPPER(code) = UPPER($1)
        AND deleted_at IS NULL
    `, [slug]);

    if (result.rows.length === 0) {
      return sendError(res, 'TENANT_NOT_FOUND', 'Company not found', 404);
    }

    const tenant = result.rows[0];
    sendSuccess(res, tenant);
  } catch (err: any) {
    console.error('Error fetching tenant by slug:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch tenant', 500);
  }
});

// ============================================================================
// Authenticated Routes (Require authentication)
// ============================================================================

// GET /api/tenants - List tenants with user counts and filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      limit = 25, offset = 0, sort = 'created_at', order = 'desc',
      search, status: filterStatus, plan: filterPlan
    } = req.query;

    // Whitelist sortable columns
    const sortableColumns: Record<string, string> = {
      created_at: 'c.created_at', name: 'c.name', code: 'c.code',
      status: 'c.status', subscription_plan: 'c.subscription_plan'
    };
    const sortCol = sortableColumns[sort as string] || 'c.created_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    // Build WHERE conditions
    const conditions: string[] = ['c.deleted_at IS NULL'];
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(c.name ILIKE $${paramIdx} OR c.code ILIKE $${paramIdx} OR c.email ILIKE $${paramIdx} OR c.tenant_code ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (filterStatus) {
      conditions.push(`c.status = $${paramIdx}`);
      params.push(filterStatus);
      paramIdx++;
    }
    if (filterPlan) {
      conditions.push(`c.subscription_plan = $${paramIdx}`);
      params.push(filterPlan);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT 
         c.id, c.code, c.tenant_code, c.name, c.name_ar, c.slug,
         c.logo_url, c.primary_color, c.secondary_color,
         c.email, c.phone, c.country, c.city, c.address, c.website, c.currency,
         c.legal_name, c.tax_number, c.registration_number,
         c.status, c.tenant_type, c.subscription_plan, c.subscription_status,
         c.is_active, c.created_at, c.updated_at,
         COALESCE(uc.user_count, 0)::integer AS user_count,
         admin_u.full_name AS admin_name,
         COALESCE(tm_agg.active_modules, ARRAY[]::text[]) AS active_modules
       FROM companies c
       LEFT JOIN (
         SELECT company_id, COUNT(*)::integer AS user_count 
         FROM user_companies GROUP BY company_id
       ) uc ON uc.company_id = c.id
       LEFT JOIN LATERAL (
         SELECT u.full_name FROM users u
         JOIN user_companies uca ON u.id = uca.user_id
         WHERE uca.company_id = c.id AND u.deleted_at IS NULL
         ORDER BY u.id ASC LIMIT 1
       ) admin_u ON true
       LEFT JOIN LATERAL (
         SELECT ARRAY_AGG(tm.module_code) AS active_modules
         FROM tenant_modules tm
         JOIN tenants t ON t.id = tm.tenant_id
         WHERE t.id = c.tenant_id AND tm.is_enabled = true
       ) tm_agg ON true
       WHERE ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, Number(limit), Number(offset)]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM companies c WHERE ${whereClause}`,
      params
    );

    sendSuccess(res, result.rows, 200, { total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Error fetching tenants:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch tenants', 500);
  }
});

// GET /api/tenants/stats - Tenant statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    // ── Core tenant counts ──
    const total = await pool.query('SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL');
    const active = await pool.query("SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND status = 'active'");
    const trial = await pool.query("SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND status = 'trial'");
    const suspended = await pool.query("SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND status = 'suspended'");
    const new30d = await pool.query("SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '30 days'");

    // ── User counts (sum across all companies) ──
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL');
    const activeUsers = await pool.query("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status = 'active'");

    // ── Pending account requests ──
    let pendingRequests = 0;
    try {
      const pr = await pool.query("SELECT COUNT(*) FROM account_requests WHERE deleted_at IS NULL AND status = 'pending'");
      pendingRequests = parseInt(pr.rows[0].count);
    } catch { /* table may not exist */ }

    // ── Plan distribution (group by subscription_plan) ──
    let planDistribution: { plan: string; count: number }[] = [];
    try {
      const pd = await pool.query(
        `SELECT COALESCE(subscription_plan, 'none') AS plan, COUNT(*)::int AS count
         FROM companies WHERE deleted_at IS NULL
         GROUP BY COALESCE(subscription_plan, 'none')
         ORDER BY count DESC`
      );
      planDistribution = pd.rows;
    } catch { /* column may not exist */ }

    // ── Storage used (MB, from companies table if available) ──
    let totalStorageMb = 0;
    try {
      const st = await pool.query("SELECT COALESCE(SUM(storage_used_mb), 0)::int AS total FROM companies WHERE deleted_at IS NULL");
      totalStorageMb = st.rows[0].total;
    } catch { /* column may not exist */ }

    sendSuccess(res, {
      // Canonical names (backward-compatible)
      total: parseInt(total.rows[0].count),
      active: parseInt(active.rows[0].count),
      trial: parseInt(trial.rows[0].count),
      suspended: parseInt(suspended.rows[0].count),
      // Aliased names for frontend
      total_tenants: parseInt(total.rows[0].count),
      active_tenants: parseInt(active.rows[0].count),
      trial_tenants: parseInt(trial.rows[0].count),
      suspended_tenants: parseInt(suspended.rows[0].count),
      new_tenants_30d: parseInt(new30d.rows[0].count),
      total_users: parseInt(totalUsers.rows[0].count),
      active_users: parseInt(activeUsers.rows[0].count),
      total_storage_mb: totalStorageMb,
      pending_account_requests: pendingRequests,
      plan_distribution: planDistribution,
    });
  } catch (err) {
    console.error('Error fetching tenant stats:', err);
    sendSuccess(res, { total: 0, active: 0, suspended: 0, trial: 0, total_tenants: 0, active_tenants: 0, trial_tenants: 0, suspended_tenants: 0, new_tenants_30d: 0, total_users: 0, active_users: 0, total_storage_mb: 0, pending_account_requests: 0, plan_distribution: [] });
  }
});

// ============================================================================
// GET /api/tenants/:id — Get tenant details by ID
// ============================================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);

    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM users u WHERE u.tenant_id = c.id AND u.deleted_at IS NULL) as user_count,
              (SELECT COUNT(*) FROM users u WHERE u.tenant_id = c.id AND u.deleted_at IS NULL AND u.status = 'active') as active_user_count,
              COALESCE((
                SELECT ARRAY_AGG(tm.module_code)
                FROM tenant_modules tm
                WHERE tm.tenant_id = c.tenant_id AND tm.is_enabled = true
              ), ARRAY[]::text[]) AS active_modules
       FROM companies c
       WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);
    }

    sendSuccess(res, result.rows[0]);
  } catch (err) {
    console.error('Error fetching tenant details:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch tenant details', 500);
  }
});

// ============================================================================
// PUT /api/tenants/:id — Update a tenant
// ============================================================================
router.put('/:id', authenticate, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);

    const {
      company_name, company_name_ar, company_code, email, phone, country,
      plan, subscription_plan, active_modules, start_date, end_date,
      logo_emoji, vat_number, tax_number, registration_number, legal_name,
      status, currency, city, address, website, logo_url, admin_name
    } = req.body;

    // Build SET clause dynamically
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (company_name !== undefined)        { sets.push(`name = $${idx}`); params.push(company_name); idx++; }
    if (company_name_ar !== undefined)     { sets.push(`name_ar = $${idx}`); params.push(company_name_ar); idx++; }
    if (company_code !== undefined)        { sets.push(`code = $${idx}`); params.push(company_code); idx++; }
    if (email !== undefined)               { sets.push(`email = $${idx}`); params.push(email); idx++; }
    if (phone !== undefined)               { sets.push(`phone = $${idx}`); params.push(phone); idx++; }
    if (country !== undefined)             { sets.push(`country = $${idx}`); params.push(country); idx++; }
    if (currency !== undefined)            { sets.push(`currency = $${idx}`); params.push(currency); idx++; }
    if (city !== undefined)                { sets.push(`city = $${idx}`); params.push(city); idx++; }
    if (address !== undefined)             { sets.push(`address = $${idx}`); params.push(address); idx++; }
    if (website !== undefined)             { sets.push(`website = $${idx}`); params.push(website); idx++; }
    if (logo_url !== undefined)            { sets.push(`logo_url = $${idx}`); params.push(logo_url); idx++; }
    if (legal_name !== undefined)          { sets.push(`legal_name = $${idx}`); params.push(legal_name); idx++; }
    if (tax_number !== undefined)          { sets.push(`tax_number = $${idx}`); params.push(tax_number); idx++; }
    if (vat_number !== undefined)          { sets.push(`tax_number = $${idx}`); params.push(vat_number); idx++; }
    if (registration_number !== undefined) { sets.push(`registration_number = $${idx}`); params.push(registration_number); idx++; }
    const planValue = subscription_plan || plan;
    if (planValue !== undefined)           { sets.push(`subscription_plan = $${idx}`); params.push(planValue); idx++; }
    if (status !== undefined)              { sets.push(`status = $${idx}`); params.push(status); idx++; }
    sets.push(`updated_at = NOW()`);

    const hasCompanyFields = sets.length > 1;
    const { password } = req.body;
    const hasUserFields = email !== undefined || password || admin_name !== undefined;

    if (!hasCompanyFields && !hasUserFields) return sendError(res, 'VALIDATION_ERROR', 'No fields to update', 400);

    let companyRow: any = null;
    if (hasCompanyFields) {
      params.push(tenantId);
      const result = await pool.query(
        `UPDATE companies SET ${sets.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL
         RETURNING id, code, name, name_ar, status, subscription_plan, email, phone, country, city, address, website, logo_url, currency, legal_name, tax_number, registration_number`,
        params
      );
      if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);
      companyRow = result.rows[0];
    } else {
      // Verify tenant exists
      const check = await pool.query('SELECT id FROM companies WHERE id = $1 AND deleted_at IS NULL', [tenantId]);
      if (check.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);
    }

    // Also update the admin user's email/password/name if changed
    if (hasUserFields) {
      // Find the primary admin user for this company (first user linked via user_companies)
      const adminUser = await pool.query(
        `SELECT u.id, u.email FROM users u
         JOIN user_companies uc ON u.id = uc.user_id
         WHERE uc.company_id = $1 AND u.deleted_at IS NULL
         ORDER BY u.id ASC LIMIT 1`,
        [tenantId]
      );
      if (adminUser.rows.length > 0) {
        const adminId = adminUser.rows[0].id;
        const userSets: string[] = [];
        const userParams: any[] = [];
        let uidx = 1;

        if (email !== undefined) {
          // Check email uniqueness before updating
          const emailCheck = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2 AND deleted_at IS NULL',
            [email, adminId]
          );
          if (emailCheck.rows.length === 0) {
            userSets.push(`email = $${uidx}`); userParams.push(email); uidx++;
          }
        }
        if (admin_name !== undefined && admin_name.trim()) {
          userSets.push(`full_name = $${uidx}`); userParams.push(admin_name.trim()); uidx++;
        }
        if (password && password.length >= 8) {
          const hashed = await bcrypt.hash(password, 10);
          userSets.push(`password = $${uidx}`); userParams.push(hashed); uidx++;
        }
        if (userSets.length > 0) {
          userSets.push(`updated_at = NOW()`);
          userParams.push(adminId);
          await pool.query(
            `UPDATE users SET ${userSets.join(', ')} WHERE id = $${uidx}`,
            userParams
          );
        }
      }
    }

    // Sync active_modules to tenant_modules table
    if (Array.isArray(active_modules)) {
      try {
        // Find the actual tenants.id for this company
        const tenantRow = await pool.query(
          `SELECT t.id FROM tenants t JOIN companies c ON c.tenant_id = t.id WHERE c.id = $1`,
          [tenantId]
        );
        const realTenantId = tenantRow.rows[0]?.id;
        if (realTenantId) {
          // Get all non-core modules
          const allMods = await pool.query(`SELECT module_code FROM modules WHERE is_core = false AND is_active = true`);
          const allModCodes = allMods.rows.map((r: any) => r.module_code);

          for (const moduleCode of allModCodes) {
            const shouldEnable = active_modules.includes(moduleCode);
            await pool.query(
              `INSERT INTO tenant_modules (tenant_id, module_code, is_enabled, enabled_at, enabled_by)
               VALUES ($1, $2, $3, NOW(), $4)
               ON CONFLICT (tenant_id, module_code) DO UPDATE SET
                 is_enabled = $3,
                 enabled_by = CASE WHEN $3 = true THEN $4 ELSE tenant_modules.enabled_by END,
                 enabled_at = CASE WHEN $3 = true THEN NOW() ELSE tenant_modules.enabled_at END,
                 disabled_by = CASE WHEN $3 = false THEN $4 ELSE tenant_modules.disabled_by END,
                 disabled_at = CASE WHEN $3 = false THEN NOW() ELSE tenant_modules.disabled_at END`,
              [realTenantId, moduleCode, shouldEnable, req.user?.id || null]
            );
          }
          console.log(`[Tenant Update] Synced ${active_modules.length} modules for tenant ${realTenantId}`);
        }
      } catch (modErr: any) {
        console.error('[Tenant Update] Module sync error (non-fatal):', modErr?.message);
      }
    }

    // Return updated company data
    if (companyRow) {
      sendSuccess(res, companyRow);
    } else {
      // Only user fields were updated, fetch current company data
      const fresh = await pool.query(
        `SELECT id, code, name, name_ar, status, subscription_plan, email, phone, country, city, address, website, logo_url, currency, legal_name, tax_number, registration_number
         FROM companies WHERE id = $1`, [tenantId]
      );
      sendSuccess(res, fresh.rows[0]);
    }
  } catch (err: any) {
    console.error('Error updating tenant:', err);
    sendError(res, 'SERVER_ERROR', err?.message || 'Failed to update tenant', 500);
  }
});

// ============================================================================
// POST /api/tenants/:id/logo — Upload tenant logo (base64)
// ============================================================================
router.post('/:id/logo', authenticate, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);

    const { image } = req.body;
    if (!image) return sendError(res, 'VALIDATION_ERROR', 'No image data provided', 400);

    const result = await UploadService.saveBase64Image(image, 'logos', undefined, tenantId);
    if (!result.success) {
      return sendError(res, 'UPLOAD_ERROR', result.error || 'Failed to upload logo', 400);
    }

    await pool.query(
      'UPDATE companies SET logo_url = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL',
      [result.url, tenantId]
    );

    sendSuccess(res, { logo_url: result.url });
  } catch (err: any) {
    console.error('Error uploading tenant logo:', err);
    sendError(res, 'SERVER_ERROR', err?.message || 'Failed to upload logo', 500);
  }
});

// ============================================================================
// POST /api/tenants/:id/impersonate — Impersonate a tenant (super_admin only)
// ============================================================================
router.post('/:id/impersonate', authenticate, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);

    const { reason } = req.body;
    if (!reason?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Impersonation reason is required', 400);

    // Only super_admin can impersonate
    const userRoles: string[] = req.user?.roles || [];
    const isSuperAdmin = userRoles.some((r: string) => r.toLowerCase() === 'super_admin');
    if (!isSuperAdmin) return sendError(res, 'FORBIDDEN', 'Only super admins can impersonate tenants', 403);

    const tenant = await pool.query(
      'SELECT id, code, name, tenant_code, status FROM companies WHERE id = $1 AND deleted_at IS NULL',
      [tenantId]
    );
    if (tenant.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);
    if (tenant.rows[0].status === 'suspended') return sendError(res, 'FORBIDDEN', 'Cannot impersonate a suspended tenant', 403);

    // Log impersonation to impersonation_logs
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
      await pool.query(
        `INSERT INTO impersonation_logs (super_admin_id, tenant_id, reason, started_at, ip_address, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), $4, NOW(), NOW())`,
        [req.user?.id, tenantId, reason.trim(), typeof ip === 'string' ? ip : ip[0]]
      );
    } catch (logErr) {
      console.warn('Could not log impersonation (table may not exist):', logErr);
    }

    sendSuccess(res, {
      tenant: tenant.rows[0],
      message: `Now impersonating tenant: ${tenant.rows[0].name}`,
    });
  } catch (err: any) {
    console.error('Error impersonating tenant:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to impersonate tenant', 500);
  }
});

// ============================================================================
// GET /api/tenants/:id/modules — Get tenant's enabled modules
// ============================================================================
router.get('/:id/modules', authenticate, async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    if (isNaN(companyId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);

    // Find tenants.id from companies
    const tenantRow = await pool.query(
      `SELECT t.id FROM tenants t JOIN companies c ON c.tenant_id = t.id WHERE c.id = $1`,
      [companyId]
    );
    const realTenantId = tenantRow.rows[0]?.id;
    if (!realTenantId) return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);

    const result = await pool.query(
      `SELECT m.module_code, m.module_name, m.name_ar, m.category, m.is_core, m.sort_order,
              COALESCE(tm.is_enabled, false) AS is_enabled
       FROM modules m
       LEFT JOIN tenant_modules tm ON m.module_code = tm.module_code AND tm.tenant_id = $1
       WHERE m.is_active = true
       ORDER BY m.sort_order, m.module_code`,
      [realTenantId]
    );

    const enabledModules = result.rows
      .filter((r: any) => r.is_enabled || r.is_core)
      .map((r: any) => r.module_code);

    sendSuccess(res, { modules: result.rows, enabled: enabledModules });
  } catch (err: any) {
    console.error('Error fetching tenant modules:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch tenant modules', 500);
  }
});

// ============================================================================
// PUT /api/tenants/:id/modules — Update tenant's enabled modules
// ============================================================================
router.put('/:id/modules', authenticate, async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    if (isNaN(companyId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);

    const { active_modules } = req.body;
    if (!Array.isArray(active_modules)) return sendError(res, 'VALIDATION_ERROR', 'active_modules must be an array', 400);

    // Find tenants.id from companies
    const tenantRow = await pool.query(
      `SELECT t.id FROM tenants t JOIN companies c ON c.tenant_id = t.id WHERE c.id = $1`,
      [companyId]
    );
    const realTenantId = tenantRow.rows[0]?.id;
    if (!realTenantId) return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);

    // Get all non-core modules
    const allMods = await pool.query(`SELECT module_code FROM modules WHERE is_core = false AND is_active = true`);
    const allModCodes = allMods.rows.map((r: any) => r.module_code);

    for (const moduleCode of allModCodes) {
      const shouldEnable = active_modules.includes(moduleCode);
      await pool.query(
        `INSERT INTO tenant_modules (tenant_id, module_code, is_enabled, enabled_at, enabled_by)
         VALUES ($1, $2, $3, NOW(), $4)
         ON CONFLICT (tenant_id, module_code) DO UPDATE SET
           is_enabled = $3,
           enabled_by = CASE WHEN $3 = true THEN $4 ELSE tenant_modules.enabled_by END,
           enabled_at = CASE WHEN $3 = true THEN NOW() ELSE tenant_modules.enabled_at END,
           disabled_by = CASE WHEN $3 = false THEN $4 ELSE tenant_modules.disabled_by END,
           disabled_at = CASE WHEN $3 = false THEN NOW() ELSE tenant_modules.disabled_at END`,
        [realTenantId, moduleCode, shouldEnable, req.user?.id || null]
      );
    }

    // Return updated enabled list
    const enabledResult = await pool.query(
      `SELECT module_code FROM tenant_modules WHERE tenant_id = $1 AND is_enabled = true`,
      [realTenantId]
    );
    const enabled = enabledResult.rows.map((r: any) => r.module_code);

    // Also add core modules
    const coreMods = await pool.query(`SELECT module_code FROM modules WHERE is_core = true AND is_active = true`);
    const coreModCodes = coreMods.rows.map((r: any) => r.module_code);

    sendSuccess(res, { enabled: [...new Set([...coreModCodes, ...enabled])] });
  } catch (err: any) {
    console.error('Error updating tenant modules:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to update tenant modules', 500);
  }
});

// ============================================================================
// POST /api/tenants/:id/:action — Perform action on tenant (suspend/activate/delete)
// ============================================================================
router.post('/:id/:action', authenticate, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id);
    const action = req.params.action;
    if (isNaN(tenantId)) return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);

    const validActions = ['suspend', 'activate', 'delete', 'reset_password'];
    if (!validActions.includes(action)) {
      return sendError(res, 'VALIDATION_ERROR', `Invalid action. Must be one of: ${validActions.join(', ')}`, 400);
    }

    const tenant = await pool.query(
      'SELECT id, code, name, status FROM companies WHERE id = $1 AND deleted_at IS NULL',
      [tenantId]
    );
    if (tenant.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);

    let result;
    switch (action) {
      case 'suspend':
        result = await pool.query(
          `UPDATE companies SET status = 'suspended', updated_at = NOW() WHERE id = $1 RETURNING id, code, name, status`,
          [tenantId]
        );
        // Also update tenants table if linked
        await pool.query(
          `UPDATE tenants SET status = 'suspended', updated_at = NOW() WHERE id = (SELECT tenant_id FROM companies WHERE id = $1)`,
          [tenantId]
        ).catch(() => {});
        break;
      case 'activate':
        result = await pool.query(
          `UPDATE companies SET status = 'active', is_active = true, updated_at = NOW() WHERE id = $1 RETURNING id, code, name, status`,
          [tenantId]
        );
        // Also update tenants table if linked
        await pool.query(
          `UPDATE tenants SET status = 'active', updated_at = NOW() WHERE id = (SELECT tenant_id FROM companies WHERE id = $1)`,
          [tenantId]
        ).catch(() => {});
        break;
      case 'delete':
        result = await pool.query(
          `UPDATE companies SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, code, name, status`,
          [tenantId]
        );
        break;
      case 'reset_password':
        // Reset the tenant admin's password to a temp password
        const tenantAdmin = await pool.query(
          `SELECT u.id, u.email FROM users u WHERE u.company_id = $1 AND u.is_tenant_admin = true AND u.deleted_at IS NULL LIMIT 1`,
          [tenantId]
        );
        if (tenantAdmin.rows.length === 0) {
          return sendError(res, 'NOT_FOUND', 'No admin user found for this tenant', 404);
        }
        const tempPassword = 'Admin@' + Math.random().toString(36).slice(2, 8);
        const hashed = await bcrypt.hash(tempPassword, config.BCRYPT_ROUNDS);
        await pool.query(
          `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
          [hashed, tenantAdmin.rows[0].id]
        );
        return sendSuccess(res, {
          tenant: tenant.rows[0],
          action,
          admin_email: tenantAdmin.rows[0].email,
          temp_password: tempPassword,
          message: `Password reset for ${tenantAdmin.rows[0].email}. Temporary password: ${tempPassword}`,
        });
    }

    sendSuccess(res, {
      tenant: result?.rows[0],
      action,
      message: `Tenant ${action === 'activate' ? 'activated' : action === 'suspend' ? 'suspended' : action + 'd'} successfully`,
    });
  } catch (err: any) {
    console.error(`Error performing ${req.params.action} on tenant:`, err);
    sendError(res, 'SERVER_ERROR', `Failed to ${req.params.action} tenant`, 500);
  }
});

export default router;
