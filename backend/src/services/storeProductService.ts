/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE PRODUCT SERVICE                                                    ║
 * ║  Public-facing product queries for the store — reads from items table    ║
 * ║  with filters: is_sellable, is_active, has price, has stock             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';
import { cachedProducts, cachedProductDetail, cachedCategories } from './storeCacheService';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export interface StoreProductFilters {
  search?: string;
  categoryId?: number;
  groupId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'name' | 'rating';
  page?: number;
  limit?: number;
}

export interface StoreProduct {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  categoryName: string | null;
  categoryNameAr: string | null;
  brandName: string | null;
  price: number;
  compareAtPrice: number | null;
  currencyCode: string;
  inStock: boolean;
  stockQuantity: number;
  images: Array<{ url: string; thumbnailUrl: string | null; altText: string | null; isPrimary: boolean }>;
  rating: number | null;
  reviewCount: number;
  variants: Array<{
    id: number;
    name: string;
    sku: string | null;
    price: number | null;
    inStock: boolean;
  }>;
}

// ════════════════════════════════════════════════════════════════════════════
// List Products (Public)
// ════════════════════════════════════════════════════════════════════════════

export async function listStoreProducts(
  companyId: number,
  storeId: number,
  filters: StoreProductFilters
): Promise<{ data: any[]; total: number }> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);

  return cachedProducts(storeId, page, filters, async () => {
    return _listStoreProductsImpl(companyId, storeId, filters);
  });
}

async function _listStoreProductsImpl(
  companyId: number,
  storeId: number,
  filters: StoreProductFilters
): Promise<{ data: any[]; total: number }> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const offset = (page - 1) * limit;

  const params: any[] = [companyId];
  let whereClause = `
    i.company_id = $1
    AND i.is_sellable = true 
    AND i.is_active = true
    AND i.deleted_at IS NULL
  `;
  let paramIndex = 2;

  // Category filter
  if (filters.categoryId) {
    whereClause += ` AND i.category_id = $${paramIndex}`;
    params.push(filters.categoryId);
    paramIndex++;
  }

  // Group filter
  if (filters.groupId) {
    whereClause += ` AND i.group_id = $${paramIndex}`;
    params.push(filters.groupId);
    paramIndex++;
  }

  // Brand filter
  if (filters.brandId) {
    whereClause += ` AND i.brand_id = $${paramIndex}`;
    params.push(filters.brandId);
    paramIndex++;
  }

  // Search
  if (filters.search) {
    whereClause += ` AND (
      i.name ILIKE $${paramIndex} 
      OR i.name_ar ILIKE $${paramIndex}
      OR i.code ILIKE $${paramIndex}
      OR i.barcode ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Price range
  if (filters.minPrice !== undefined) {
    whereClause += ` AND i.base_selling_price >= $${paramIndex}`;
    params.push(filters.minPrice);
    paramIndex++;
  }
  if (filters.maxPrice !== undefined) {
    whereClause += ` AND i.base_selling_price <= $${paramIndex}`;
    params.push(filters.maxPrice);
    paramIndex++;
  }

  // In stock filter
  if (filters.inStock) {
    whereClause += ` AND EXISTS (
      SELECT 1 FROM item_warehouse iw 
      WHERE iw.item_id = i.id AND iw.qty_on_hand > 0
    )`;
  }

  // Sort
  let orderClause = 'i.created_at DESC';
  switch (filters.sortBy) {
    case 'price_asc': case 'price_low': orderClause = 'i.base_selling_price ASC NULLS LAST'; break;
    case 'price_desc': case 'price_high': orderClause = 'i.base_selling_price DESC NULLS LAST'; break;
    case 'newest': orderClause = 'i.created_at DESC'; break;
    case 'name': case 'name_asc': orderClause = 'i.name ASC'; break;
    case 'rating': case 'popular': orderClause = 'avg_rating DESC NULLS LAST'; break;
  }

  // Count query
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM items i WHERE ${whereClause}`,
    params
  );

  // Main query
  const query = `
    SELECT 
      i.id, i.code, i.name, i.name_ar, i.barcode,
      i.base_selling_price as price,
      i.standard_cost as compare_at_price,
      c.name as category_name, c.name_ar as category_name_ar,
      b.name as brand_name,
      ps.slug,
      ps.meta_title, ps.meta_description,
      COALESCE(
        (SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = i.id),
        0
      ) as stock_quantity,
      COALESCE(
        (SELECT AVG(sr.rating)::DECIMAL(3,1) FROM store_reviews sr 
         WHERE sr.item_id = i.id AND sr.is_approved = true AND sr.deleted_at IS NULL),
        0
      ) as avg_rating,
      COALESCE(
        (SELECT COUNT(*) FROM store_reviews sr 
         WHERE sr.item_id = i.id AND sr.is_approved = true AND sr.deleted_at IS NULL),
        0
      ) as review_count,
      (
        SELECT json_agg(json_build_object(
          'url', pi.url,
          'thumbnailUrl', pi.thumbnail_url,
          'altText', pi.alt_text,
          'isPrimary', pi.is_primary
        ) ORDER BY pi.sort_order ASC, pi.is_primary DESC)
        FROM product_images pi WHERE pi.item_id = i.id
      ) as images
    FROM items i
    LEFT JOIN item_categories c ON i.category_id = c.id
    LEFT JOIN brands b ON i.brand_id = b.id
    LEFT JOIN product_seo ps ON ps.item_id = i.id AND ps.company_id = i.company_id
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  const products = result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    nameAr: row.name_ar,
    slug: row.slug || row.code,
    price: parseFloat(row.price) || 0,
    compareAtPrice: row.compare_at_price ? parseFloat(row.compare_at_price) : null,
    categoryName: row.category_name,
    categoryNameAr: row.category_name_ar,
    brandName: row.brand_name,
    inStock: parseFloat(row.stock_quantity) > 0,
    stockQuantity: parseFloat(row.stock_quantity),
    rating: row.avg_rating ? parseFloat(row.avg_rating) : null,
    reviewCount: parseInt(row.review_count),
    images: row.images || [],
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
  }));

  return {
    data: products,
    total: parseInt(countResult.rows[0].total),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Get Single Product by Slug (Public)
// ════════════════════════════════════════════════════════════════════════════

export async function getStoreProductBySlug(
  companyId: number,
  slug: string,
  storeId?: number
): Promise<any | null> {
  return cachedProductDetail(storeId || 0, slug, async () => {
    return _getStoreProductBySlugImpl(companyId, slug);
  });
}

async function _getStoreProductBySlugImpl(
  companyId: number,
  slug: string
): Promise<any | null> {
  const result = await pool.query(`
    SELECT 
      i.id, i.code, i.name, i.name_ar, i.barcode,
      i.base_selling_price as price,
      i.standard_cost as compare_at_price,
      i.specifications,
      i.weight, i.weight as dimensions_weight,
      i.length, i.width, i.height,
      i.base_uom_id, i.sales_uom_id,
      u.name as uom_name, u.name_ar as uom_name_ar,
      c.id as category_id, c.name as category_name, c.name_ar as category_name_ar,
      b.id as brand_id, b.name as brand_name,
      ps.slug, ps.meta_title, ps.meta_title_ar,
      ps.meta_description, ps.meta_description_ar,
      ps.meta_keywords, ps.og_image_url,
      COALESCE(
        (SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = i.id),
        0
      ) as stock_quantity,
      COALESCE(
        (SELECT AVG(sr.rating)::DECIMAL(3,1) FROM store_reviews sr 
         WHERE sr.item_id = i.id AND sr.is_approved = true AND sr.deleted_at IS NULL),
        0
      ) as avg_rating,
      COALESCE(
        (SELECT COUNT(*) FROM store_reviews sr 
         WHERE sr.item_id = i.id AND sr.is_approved = true AND sr.deleted_at IS NULL),
        0
      ) as review_count
    FROM items i
    LEFT JOIN item_categories c ON i.category_id = c.id
    LEFT JOIN brands b ON i.brand_id = b.id
    LEFT JOIN units u ON i.sales_uom_id = u.id
    LEFT JOIN product_seo ps ON ps.item_id = i.id AND ps.company_id = i.company_id
    WHERE i.company_id = $1
      AND (ps.slug = $2 OR i.code = $2)
      AND i.is_sellable = true 
      AND i.is_active = true
      AND i.deleted_at IS NULL
    LIMIT 1
  `, [companyId, slug]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get images
  const imagesResult = await pool.query(`
    SELECT url, thumbnail_url, alt_text, alt_text_ar, is_primary, sort_order
    FROM product_images WHERE item_id = $1
    ORDER BY sort_order ASC, is_primary DESC
  `, [row.id]);

  // Get variants
  const variantsResult = await pool.query(`
    SELECT iv.id, iv.variant_name as name, iv.variant_code as sku,
      COALESCE(
        (SELECT iw.qty_on_hand FROM item_warehouse iw WHERE iw.item_id = $1 LIMIT 1),
        0
      ) as stock
    FROM item_variants iv
    WHERE iv.item_id = $1
    ORDER BY iv.id
  `, [row.id]);

  // Get reviews summary
  const reviewsResult = await pool.query(`
    SELECT rating, COUNT(*) as count
    FROM store_reviews
    WHERE item_id = $1 AND is_approved = true AND deleted_at IS NULL
    GROUP BY rating
    ORDER BY rating DESC
  `, [row.id]);

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameAr: row.name_ar,
    slug: row.slug || row.code,
    price: parseFloat(row.price) || 0,
    compareAtPrice: row.compare_at_price ? parseFloat(row.compare_at_price) : null,
    specifications: row.specifications,
    weight: row.weight,
    dimensions: { length: row.length, width: row.width, height: row.height },
    uom: { name: row.uom_name, nameAr: row.uom_name_ar },
    category: { id: row.category_id, name: row.category_name, nameAr: row.category_name_ar },
    brand: { id: row.brand_id, name: row.brand_name },
    seo: {
      metaTitle: row.meta_title,
      metaTitleAr: row.meta_title_ar,
      metaDescription: row.meta_description,
      metaDescriptionAr: row.meta_description_ar,
      metaKeywords: row.meta_keywords,
      ogImageUrl: row.og_image_url,
    },
    inStock: parseFloat(row.stock_quantity) > 0,
    stockQuantity: parseFloat(row.stock_quantity),
    rating: row.avg_rating ? parseFloat(row.avg_rating) : null,
    reviewCount: parseInt(row.review_count),
    images: imagesResult.rows.map((img) => ({
      url: img.url,
      thumbnailUrl: img.thumbnail_url,
      altText: img.alt_text,
      altTextAr: img.alt_text_ar,
      isPrimary: img.is_primary,
    })),
    variants: variantsResult.rows.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      inStock: parseFloat(v.stock) > 0,
    })),
    reviewsSummary: reviewsResult.rows.map((r) => ({
      rating: r.rating,
      count: parseInt(r.count),
    })),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Get Product Categories (Public)
// ════════════════════════════════════════════════════════════════════════════

export async function getStoreCategories(companyId: number, storeId?: number): Promise<any[]> {
  return cachedCategories(storeId || 0, async () => {
    return _getStoreCategoriesImpl(companyId);
  });
}

async function _getStoreCategoriesImpl(companyId: number): Promise<any[]> {
  const result = await pool.query(`
    SELECT c.id, c.name, c.name_ar, c.parent_id,
      COUNT(i.id) as product_count
    FROM item_categories c
    LEFT JOIN items i ON i.category_id = c.id 
      AND i.is_sellable = true 
      AND i.is_active = true 
      AND i.deleted_at IS NULL
    WHERE c.company_id = $1 AND c.is_active = true AND c.deleted_at IS NULL
    GROUP BY c.id, c.name, c.name_ar, c.parent_id
    HAVING COUNT(i.id) > 0
    ORDER BY c.name ASC
  `, [companyId]);

  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    nameAr: r.name_ar,
    parentId: r.parent_id,
    productCount: parseInt(r.product_count),
  }));
}

export default {
  listStoreProducts,
  getStoreProductBySlug,
  getStoreCategories,
};
