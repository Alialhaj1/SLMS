/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  MARKETPLACE VENDOR SERVICE                                               ║
 * ║  Vendor onboarding, management, KYC review, and profile operations       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export interface CreateVendorInput {
  tenantId?: number;
  companyId: number;
  storeId?: number;
  vendorName: string;
  vendorNameAr?: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  descriptionAr?: string;
  contactEmail: string;
  contactPhone?: string;
  businessAddress?: string;
  cityId?: number;
  countryId?: number;
  businessType?: string;
  taxNumber?: string;
  commercialRegister?: string;
  bankName?: string;
  bankIban?: string;
  bankAccountName?: string;
  commissionRate?: number;
  createdBy?: number;
}

export interface VendorFilters {
  status?: string;
  search?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'name' | 'rating' | 'revenue';
}

export interface VendorListResult {
  vendors: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ════════════════════════════════════════════════════════════════════════════
// Vendor CRUD
// ════════════════════════════════════════════════════════════════════════════

/**
 * Register a new vendor (typically self-service from vendor portal)
 */
export async function createVendor(input: CreateVendorInput): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check for duplicate slug
    const slugCheck = await client.query(
      'SELECT id FROM marketplace_vendors WHERE slug = $1 AND deleted_at IS NULL',
      [input.slug]
    );
    if (slugCheck.rows.length > 0) {
      throw new Error('Vendor slug already taken');
    }

    // Check if company already has a vendor profile
    const companyCheck = await client.query(
      'SELECT id FROM marketplace_vendors WHERE company_id = $1 AND deleted_at IS NULL',
      [input.companyId]
    );
    if (companyCheck.rows.length > 0) {
      throw new Error('Company already has a vendor profile');
    }

    // Get marketplace config for auto-approve
    const config = await client.query('SELECT * FROM marketplace_config WHERE id = 1');
    const mpConfig = config.rows[0];
    const autoApprove = mpConfig?.auto_approve_vendors || false;

    const result = await client.query(`
      INSERT INTO marketplace_vendors (
        tenant_id, company_id, store_id,
        vendor_name, vendor_name_ar, slug,
        logo_url, banner_url, description, description_ar,
        contact_email, contact_phone, business_address,
        city_id, country_id,
        business_type, tax_number, commercial_register,
        bank_name, bank_iban, bank_account_name,
        commission_rate,
        status, approved_at,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25
      ) RETURNING *
    `, [
      input.tenantId || null, input.companyId, input.storeId || null,
      input.vendorName, input.vendorNameAr || null, input.slug,
      input.logoUrl || null, input.bannerUrl || null,
      input.description || null, input.descriptionAr || null,
      input.contactEmail, input.contactPhone || null,
      input.businessAddress || null,
      input.cityId || null, input.countryId || null,
      input.businessType || 'company',
      input.taxNumber || null, input.commercialRegister || null,
      input.bankName || null, input.bankIban || null, input.bankAccountName || null,
      input.commissionRate || null,
      autoApprove ? 'active' : 'pending',
      autoApprove ? new Date() : null,
      input.createdBy || null,
    ]);

    const vendor = result.rows[0];

    // Create vendor wallet
    await client.query(`
      INSERT INTO vendor_wallets (vendor_id)
      VALUES ($1)
    `, [vendor.id]);

    await client.query('COMMIT');
    return vendor;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * List vendors with filters (admin view)
 */
export async function listVendors(filters: VendorFilters): Promise<VendorListResult> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const offset = (page - 1) * limit;

  const conditions: string[] = ['v.deleted_at IS NULL'];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`v.status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.search) {
    conditions.push(`(v.vendor_name ILIKE $${paramIndex} OR v.vendor_name_ar ILIKE $${paramIndex} OR v.contact_email ILIKE $${paramIndex} OR v.slug ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.isFeatured !== undefined) {
    conditions.push(`v.is_featured = $${paramIndex++}`);
    params.push(filters.isFeatured);
  }

  if (filters.isVerified !== undefined) {
    conditions.push(`v.is_verified = $${paramIndex++}`);
    params.push(filters.isVerified);
  }

  const whereClause = conditions.join(' AND ');

  let orderBy = 'v.created_at DESC';
  switch (filters.sortBy) {
    case 'name': orderBy = 'v.vendor_name ASC'; break;
    case 'rating': orderBy = 'v.avg_rating DESC NULLS LAST'; break;
    case 'revenue': orderBy = 'v.total_revenue DESC'; break;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM marketplace_vendors v WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await pool.query(`
    SELECT v.*,
           w.available_balance,
           w.pending_balance,
           w.total_earned,
           w.total_commission
    FROM marketplace_vendors v
    LEFT JOIN vendor_wallets w ON w.vendor_id = v.id
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, [...params, limit, offset]);

  return {
    vendors: result.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get vendor by ID with full details
 */
export async function getVendorById(vendorId: number): Promise<any | null> {
  const result = await pool.query(`
    SELECT v.*,
           w.available_balance,
           w.pending_balance,
           w.total_earned,
           w.total_withdrawn,
           w.total_commission,
           c.name as company_name,
           mp.name as plan_name
    FROM marketplace_vendors v
    LEFT JOIN vendor_wallets w ON w.vendor_id = v.id
    LEFT JOIN companies c ON c.id = v.company_id
    LEFT JOIN marketplace_plans mp ON mp.id = v.plan_id
    WHERE v.id = $1 AND v.deleted_at IS NULL
  `, [vendorId]);

  if (result.rows.length === 0) return null;

  // Get documents
  const docs = await pool.query(
    'SELECT * FROM vendor_documents WHERE vendor_id = $1 ORDER BY created_at DESC',
    [vendorId]
  );

  return { ...result.rows[0], documents: docs.rows };
}

/**
 * Get vendor by slug (public storefront)
 */
export async function getVendorBySlug(slug: string): Promise<any | null> {
  const result = await pool.query(`
    SELECT v.id, v.vendor_name, v.vendor_name_ar, v.slug,
           v.logo_url, v.banner_url, v.description, v.description_ar,
           v.total_products, v.total_orders, v.avg_rating, v.rating_count,
           v.is_featured, v.is_verified, v.created_at
    FROM marketplace_vendors v
    WHERE v.slug = $1 AND v.status = 'active' AND v.deleted_at IS NULL
  `, [slug]);

  return result.rows[0] || null;
}

/**
 * Update vendor status (admin action)
 */
export async function updateVendorStatus(
  vendorId: number,
  status: string,
  userId: number,
  reason?: string
): Promise<any> {
  const validStatuses = ['pending', 'under_review', 'active', 'suspended', 'banned', 'closed'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid vendor status: ${status}`);
  }

  const updates: string[] = ['status = $1', 'updated_by = $2', 'updated_at = NOW()'];
  const params: any[] = [status, userId];
  let paramIndex = 3;

  if (status === 'active') {
    updates.push(`approved_at = NOW()`, `approved_by = $${paramIndex++}`);
    params.push(userId);
  }

  if (status === 'suspended' || status === 'banned') {
    updates.push(`suspended_at = NOW()`, `suspended_reason = $${paramIndex++}`);
    params.push(reason || null);
  }

  params.push(vendorId);
  const result = await pool.query(`
    UPDATE marketplace_vendors
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
    RETURNING *
  `, params);

  return result.rows[0];
}

/**
 * Update vendor profile (vendor self-service)
 */
export async function updateVendorProfile(
  vendorId: number,
  updates: Partial<CreateVendorInput>
): Promise<any> {
  const allowedFields: Record<string, string> = {
    vendorName: 'vendor_name',
    vendorNameAr: 'vendor_name_ar',
    logoUrl: 'logo_url',
    bannerUrl: 'banner_url',
    description: 'description',
    descriptionAr: 'description_ar',
    contactEmail: 'contact_email',
    contactPhone: 'contact_phone',
    businessAddress: 'business_address',
    bankName: 'bank_name',
    bankIban: 'bank_iban',
    bankAccountName: 'bank_account_name',
  };

  const setClauses: string[] = ['updated_at = NOW()'];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, column] of Object.entries(allowedFields)) {
    if ((updates as any)[key] !== undefined) {
      setClauses.push(`${column} = $${paramIndex++}`);
      params.push((updates as any)[key]);
    }
  }

  if (setClauses.length === 1) {
    throw new Error('No valid fields to update');
  }

  params.push(vendorId);
  const result = await pool.query(`
    UPDATE marketplace_vendors
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
    RETURNING *
  `, params);

  return result.rows[0];
}

/**
 * Get vendor by company_id (for vendor portal — checks if current company is a vendor)
 */
export async function getVendorByCompanyId(companyId: number): Promise<any | null> {
  const result = await pool.query(`
    SELECT v.*, w.available_balance, w.pending_balance, w.total_earned
    FROM marketplace_vendors v
    LEFT JOIN vendor_wallets w ON w.vendor_id = v.id
    WHERE v.company_id = $1 AND v.deleted_at IS NULL
  `, [companyId]);
  return result.rows[0] || null;
}

/**
 * Get vendor statistics
 */
export async function getVendorStats(vendorId: number): Promise<any> {
  const [orders, listings, revenue, recentOrders] = await Promise.all([
    pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders
      FROM marketplace_order_vendors
      WHERE vendor_id = $1
    `, [vendorId]),

    pool.query(`
      SELECT 
        COUNT(*) as total_listings,
        COUNT(*) FILTER (WHERE is_published = true) as active_listings,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_listings
      FROM marketplace_listings
      WHERE vendor_id = $1 AND deleted_at IS NULL
    `, [vendorId]),

    pool.query(`
      SELECT 
        COALESCE(SUM(vendor_payout), 0) as total_revenue,
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE(SUM(vendor_payout) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0) as revenue_30d,
        COALESCE(SUM(vendor_payout) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0) as revenue_7d
      FROM marketplace_order_vendors
      WHERE vendor_id = $1 AND status NOT IN ('cancelled', 'refunded')
    `, [vendorId]),

    pool.query(`
      SELECT mov.id, mov.sub_order_number, mov.total, mov.status, mov.created_at,
             mo.order_number as master_order_number
      FROM marketplace_order_vendors mov
      JOIN marketplace_orders mo ON mo.id = mov.marketplace_order_id
      WHERE mov.vendor_id = $1
      ORDER BY mov.created_at DESC
      LIMIT 5
    `, [vendorId]),
  ]);

  return {
    orders: orders.rows[0],
    listings: listings.rows[0],
    revenue: revenue.rows[0],
    recentOrders: recentOrders.rows,
  };
}

export default {
  createVendor,
  listVendors,
  getVendorById,
  getVendorBySlug,
  updateVendorStatus,
  updateVendorProfile,
  getVendorByCompanyId,
  getVendorStats,
};
