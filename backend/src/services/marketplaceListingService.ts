/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  MARKETPLACE LISTING SERVICE                                              ║
 * ║  Product publishing: vendor items → marketplace catalog                  ║
 * ║  Handles: create, moderate, search, stock sync, category mapping        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export interface CreateListingInput {
  vendorId: number;
  itemId: number;
  variantId?: number;
  companyId: number;
  listingTitle: string;
  listingTitleAr?: string;
  listingDescription?: string;
  listingDescriptionAr?: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  currencyId?: number;
  priceListId?: number;
  stockSource?: 'warehouse' | 'manual';
  warehouseId?: number;
  manualStock?: number;
  lowStockThreshold?: number;
  marketplaceCategoryId?: number;
  metaTitle?: string;
  metaDescription?: string;
  images?: Array<{ url: string; thumbnailUrl?: string; altText?: string; sortOrder?: number; isPrimary?: boolean }>;
}

export interface ListingFilters {
  vendorId?: number;
  categoryId?: number;
  status?: string;
  isPublished?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'popular' | 'name';
  page?: number;
  limit?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// Create Listing
// ════════════════════════════════════════════════════════════════════════════

export async function createListing(input: CreateListingInput): Promise<any> {
  // Verify vendor owns this item
  const itemCheck = await pool.query(
    'SELECT id, name, name_ar, code FROM items WHERE id = $1 AND company_id = $2 AND is_active = true AND deleted_at IS NULL',
    [input.itemId, input.companyId]
  );
  if (itemCheck.rows.length === 0) {
    throw new Error('Item not found or does not belong to vendor');
  }

  // Check duplicate listing
  const dupCheck = await pool.query(
    'SELECT id FROM marketplace_listings WHERE vendor_id = $1 AND item_id = $2 AND COALESCE(variant_id, 0) = COALESCE($3, 0) AND deleted_at IS NULL',
    [input.vendorId, input.itemId, input.variantId || null]
  );
  if (dupCheck.rows.length > 0) {
    throw new Error('Listing already exists for this item/variant');
  }

  // Check slug uniqueness
  const slugCheck = await pool.query(
    'SELECT id FROM marketplace_listings WHERE slug = $1 AND deleted_at IS NULL',
    [input.slug]
  );
  if (slugCheck.rows.length > 0) {
    throw new Error('Listing slug already taken');
  }

  // Check marketplace config for auto-approve
  const config = await pool.query('SELECT auto_approve_listings FROM marketplace_config WHERE id = 1');
  const autoApprove = config.rows[0]?.auto_approve_listings || false;
  const status = autoApprove ? 'approved' : 'pending_review';

  const result = await pool.query(`
    INSERT INTO marketplace_listings (
      vendor_id, item_id, variant_id, company_id,
      listing_title, listing_title_ar, listing_description, listing_description_ar,
      slug, price, compare_at_price, currency_id, price_list_id,
      stock_source, warehouse_id, manual_stock, low_stock_threshold,
      marketplace_category_id,
      meta_title, meta_description,
      images, status,
      is_published, published_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23
    ) RETURNING *
  `, [
    input.vendorId, input.itemId, input.variantId || null, input.companyId,
    input.listingTitle, input.listingTitleAr || null,
    input.listingDescription || null, input.listingDescriptionAr || null,
    input.slug, input.price, input.compareAtPrice || null,
    input.currencyId || null, input.priceListId || null,
    input.stockSource || 'warehouse', input.warehouseId || null,
    input.manualStock || null, input.lowStockThreshold || 5,
    input.marketplaceCategoryId || null,
    input.metaTitle || null, input.metaDescription || null,
    JSON.stringify(input.images || []),
    status,
    autoApprove, autoApprove ? new Date() : null,
  ]);

  // Update vendor product count
  await pool.query(`
    UPDATE marketplace_vendors SET total_products = total_products + 1, updated_at = NOW()
    WHERE id = $1
  `, [input.vendorId]);

  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
// List/Search Listings (marketplace storefront)
// ════════════════════════════════════════════════════════════════════════════

export async function searchListings(filters: ListingFilters): Promise<{
  listings: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const offset = (page - 1) * limit;

  const conditions: string[] = ['l.deleted_at IS NULL'];
  const params: any[] = [];
  let paramIndex = 1;

  // Public storefront defaults: only published + approved + active vendor
  if (filters.isPublished !== false) {
    conditions.push("l.is_published = true AND l.status = 'approved'");
    conditions.push("v.status = 'active' AND v.deleted_at IS NULL");
  }

  if (filters.vendorId) {
    conditions.push(`l.vendor_id = $${paramIndex++}`);
    params.push(filters.vendorId);
  }

  if (filters.categoryId) {
    conditions.push(`l.marketplace_category_id = $${paramIndex++}`);
    params.push(filters.categoryId);
  }

  if (filters.status) {
    conditions.push(`l.status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.search) {
    conditions.push(`(l.listing_title ILIKE $${paramIndex} OR l.listing_title_ar ILIKE $${paramIndex} OR v.vendor_name ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.minPrice !== undefined) {
    conditions.push(`l.price >= $${paramIndex++}`);
    params.push(filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(`l.price <= $${paramIndex++}`);
    params.push(filters.maxPrice);
  }

  if (filters.isFeatured) {
    conditions.push('l.is_featured = true');
  }

  const whereClause = conditions.join(' AND ');

  let orderBy = 'l.created_at DESC';
  switch (filters.sortBy) {
    case 'price_asc': orderBy = 'l.price ASC'; break;
    case 'price_desc': orderBy = 'l.price DESC'; break;
    case 'rating': orderBy = 'l.avg_rating DESC NULLS LAST'; break;
    case 'popular': orderBy = 'l.order_count DESC'; break;
    case 'name': orderBy = 'l.listing_title ASC'; break;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM marketplace_listings l
     JOIN marketplace_vendors v ON v.id = l.vendor_id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await pool.query(`
    SELECT l.*,
           l.listing_title as title, l.listing_title_ar as title_ar,
           l.price as marketplace_price,
           l.status as moderation_status,
           v.vendor_name, v.vendor_name_ar, v.slug as vendor_slug,
           v.logo_url as vendor_logo, v.is_verified as vendor_verified,
           mc.name as category_name, mc.name_ar as category_name_ar,
           mc.slug as category_slug
    FROM marketplace_listings l
    JOIN marketplace_vendors v ON v.id = l.vendor_id
    LEFT JOIN marketplace_categories mc ON mc.id = l.marketplace_category_id
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, [...params, limit, offset]);

  // Enrich with stock info
  const listings = await Promise.all(result.rows.map(async (listing: any) => {
    let stockQuantity = 0;
    let inStock = false;

    if (listing.stock_source === 'manual') {
      stockQuantity = listing.manual_stock || 0;
      inStock = stockQuantity > 0;
    } else if (listing.warehouse_id) {
      const stock = await pool.query(`
        SELECT COALESCE(qty_on_hand - COALESCE(qty_reserved, 0), 0) as available
        FROM item_warehouse
        WHERE item_id = $1 AND warehouse_id = $2
      `, [listing.item_id, listing.warehouse_id]);
      stockQuantity = stock.rows[0] ? parseFloat(stock.rows[0].available) : 0;
      inStock = stockQuantity > 0;
    } else {
      // Sum across all warehouses for the vendor's company
      const stock = await pool.query(`
        SELECT COALESCE(SUM(qty_on_hand - COALESCE(qty_reserved, 0)), 0) as available
        FROM item_warehouse
        WHERE item_id = $1
      `, [listing.item_id]);
      stockQuantity = parseFloat(stock.rows[0].available) || 0;
      inStock = stockQuantity > 0;
    }

    return { ...listing, stockQuantity, inStock };
  }));

  // Filter by inStock if requested
  const finalListings = filters.inStock
    ? listings.filter((l: any) => l.inStock)
    : listings;

  return {
    listings: finalListings,
    total: filters.inStock ? finalListings.length : total,
    page,
    limit,
    totalPages: Math.ceil((filters.inStock ? finalListings.length : total) / limit),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Get Single Listing (public detail view)
// ════════════════════════════════════════════════════════════════════════════

export async function getListingBySlug(slug: string): Promise<any | null> {
  const result = await pool.query(`
    SELECT l.*,
           v.vendor_name, v.vendor_name_ar, v.slug as vendor_slug,
           v.logo_url as vendor_logo, v.is_verified as vendor_verified,
           v.avg_rating as vendor_rating, v.rating_count as vendor_rating_count,
           mc.name as category_name, mc.name_ar as category_name_ar,
           i.specifications, i.weight, i.length, i.width, i.height
    FROM marketplace_listings l
    JOIN marketplace_vendors v ON v.id = l.vendor_id
    LEFT JOIN marketplace_categories mc ON mc.id = l.marketplace_category_id
    LEFT JOIN items i ON i.id = l.item_id
    WHERE l.slug = $1 AND l.is_published = true AND l.status = 'approved'
      AND v.status = 'active' AND l.deleted_at IS NULL
  `, [slug]);

  if (result.rows.length === 0) return null;

  const listing = result.rows[0];

  // Increment view count (non-blocking)
  pool.query('UPDATE marketplace_listings SET view_count = view_count + 1 WHERE id = $1', [listing.id])
    .catch(() => {});

  // Get stock
  let stockQuantity = 0;
  if (listing.stock_source === 'manual') {
    stockQuantity = listing.manual_stock || 0;
  } else {
    const stock = await pool.query(`
      SELECT COALESCE(SUM(qty_on_hand - COALESCE(qty_reserved, 0)), 0) as available
      FROM item_warehouse WHERE item_id = $1
    `, [listing.item_id]);
    stockQuantity = parseFloat(stock.rows[0].available) || 0;
  }

  // Get variants if no specific variant
  let variants: any[] = [];
  if (!listing.variant_id) {
    const varResult = await pool.query(`
      SELECT iv.id, iv.variant_name, iv.variant_name_ar, iv.sku, iv.is_active
      FROM item_variants iv
      WHERE iv.item_id = $1 AND iv.is_active = true
    `, [listing.item_id]);
    variants = varResult.rows;
  }

  // Get reviews summary
  const reviews = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(AVG(rating), 0) as avg_rating,
           COUNT(*) FILTER (WHERE rating = 5) as five,
           COUNT(*) FILTER (WHERE rating = 4) as four,
           COUNT(*) FILTER (WHERE rating = 3) as three,
           COUNT(*) FILTER (WHERE rating = 2) as two,
           COUNT(*) FILTER (WHERE rating = 1) as one
    FROM store_reviews
    WHERE listing_id = $1 AND is_approved = true AND deleted_at IS NULL
  `, [listing.id]);

  return {
    ...listing,
    stockQuantity,
    inStock: stockQuantity > 0,
    variants,
    reviewSummary: reviews.rows[0],
  };
}

export async function getListingById(listingId: number): Promise<any | null> {
  const result = await pool.query(`
    SELECT l.*, v.vendor_name, v.slug as vendor_slug, v.company_id as vendor_company_id
    FROM marketplace_listings l
    JOIN marketplace_vendors v ON v.id = l.vendor_id
    WHERE l.id = $1 AND l.deleted_at IS NULL
  `, [listingId]);
  return result.rows[0] || null;
}

// ════════════════════════════════════════════════════════════════════════════
// Update Listing (vendor action)
// ════════════════════════════════════════════════════════════════════════════

export async function updateListing(
  listingId: number,
  vendorId: number,
  updates: Partial<CreateListingInput>
): Promise<any> {
  // Verify ownership
  const listing = await pool.query(
    'SELECT id FROM marketplace_listings WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL',
    [listingId, vendorId]
  );
  if (listing.rows.length === 0) {
    throw new Error('Listing not found or access denied');
  }

  const allowedFields: Record<string, string> = {
    listingTitle: 'listing_title',
    listingTitleAr: 'listing_title_ar',
    listingDescription: 'listing_description',
    listingDescriptionAr: 'listing_description_ar',
    price: 'price',
    compareAtPrice: 'compare_at_price',
    warehouseId: 'warehouse_id',
    manualStock: 'manual_stock',
    lowStockThreshold: 'low_stock_threshold',
    marketplaceCategoryId: 'marketplace_category_id',
    metaTitle: 'meta_title',
    metaDescription: 'meta_description',
    images: 'images',
  };

  const setClauses: string[] = ['updated_at = NOW()'];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, column] of Object.entries(allowedFields)) {
    if ((updates as any)[key] !== undefined) {
      const value = (updates as any)[key];
      setClauses.push(`${column} = $${paramIndex++}`);
      params.push(column === 'images' ? JSON.stringify(value) : value);
    }
  }

  if (setClauses.length === 1) {
    throw new Error('No valid fields to update');
  }

  params.push(listingId);
  const result = await pool.query(`
    UPDATE marketplace_listings
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
    RETURNING *
  `, params);

  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
// Moderate Listing (admin action)
// ════════════════════════════════════════════════════════════════════════════

export async function moderateListing(
  listingId: number,
  action: 'approve' | 'reject' | 'suspend',
  userId: number,
  reason?: string
): Promise<any> {
  let status: string;
  let isPublished = false;

  switch (action) {
    case 'approve':
      status = 'approved';
      isPublished = true;
      break;
    case 'reject':
      status = 'rejected';
      break;
    case 'suspend':
      status = 'suspended';
      break;
    default:
      throw new Error(`Invalid moderation action: ${action}`);
  }

  const result = await pool.query(`
    UPDATE marketplace_listings
    SET status = $1,
        is_published = $2,
        published_at = CASE WHEN $2 = true THEN NOW() ELSE published_at END,
        reviewed_by = $3,
        reviewed_at = NOW(),
        rejection_reason = $4,
        updated_at = NOW()
    WHERE id = $5 AND deleted_at IS NULL
    RETURNING *
  `, [status, isPublished, userId, reason || null, listingId]);

  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
// Publish / Unpublish (vendor action — only for approved listings)
// ════════════════════════════════════════════════════════════════════════════

export async function toggleListingPublish(
  listingId: number,
  vendorId: number,
  publish: boolean
): Promise<any> {
  const result = await pool.query(`
    UPDATE marketplace_listings
    SET is_published = $1,
        published_at = CASE WHEN $1 = true THEN NOW() ELSE published_at END,
        updated_at = NOW()
    WHERE id = $2 AND vendor_id = $3 AND status = 'approved' AND deleted_at IS NULL
    RETURNING *
  `, [publish, listingId, vendorId]);

  if (result.rows.length === 0) {
    throw new Error('Listing not found, not approved, or access denied');
  }
  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
// Categories
// ════════════════════════════════════════════════════════════════════════════

export async function listCategories(parentId?: number): Promise<any[]> {
  const result = await pool.query(`
    SELECT mc.*,
           (SELECT COUNT(*) FROM marketplace_listings l 
            WHERE l.marketplace_category_id = mc.id AND l.is_published = true AND l.deleted_at IS NULL
           ) as listing_count
    FROM marketplace_categories mc
    WHERE mc.deleted_at IS NULL AND mc.is_active = true
      AND ${parentId ? 'mc.parent_id = $1' : 'mc.parent_id IS NULL'}
    ORDER BY mc.sort_order ASC, mc.name ASC
  `, parentId ? [parentId] : []);

  return result.rows;
}

export async function createCategory(input: {
  parentId?: number;
  name: string;
  nameAr?: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  iconUrl?: string;
  imageUrl?: string;
  sortOrder?: number;
}): Promise<any> {
  const result = await pool.query(`
    INSERT INTO marketplace_categories (
      parent_id, name, name_ar, slug, description, description_ar,
      icon_url, image_url, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [
    input.parentId || null, input.name, input.nameAr || null, input.slug,
    input.description || null, input.descriptionAr || null,
    input.iconUrl || null, input.imageUrl || null, input.sortOrder || 0,
  ]);
  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
// Delete Listing (soft delete)
// ════════════════════════════════════════════════════════════════════════════

export async function deleteListing(listingId: number, vendorId: number): Promise<boolean> {
  const result = await pool.query(`
    UPDATE marketplace_listings
    SET deleted_at = NOW(), is_published = false, updated_at = NOW()
    WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL
    RETURNING id
  `, [listingId, vendorId]);

  if (result.rows.length > 0) {
    await pool.query(
      'UPDATE marketplace_vendors SET total_products = GREATEST(total_products - 1, 0), updated_at = NOW() WHERE id = $1',
      [vendorId]
    );
    return true;
  }
  return false;
}

export default {
  createListing,
  searchListings,
  getListingBySlug,
  getListingById,
  updateListing,
  moderateListing,
  toggleListingPublish,
  listCategories,
  createCategory,
  deleteListing,
};
