/**
 * Store Cache Service
 * High-level caching for e-commerce store queries with automatic invalidation.
 * Uses Redis via cache-aside pattern. Falls back to DB if Redis unavailable.
 */

import { cacheGet, cacheInvalidate, cacheInvalidatePattern } from '../lib/redis';

// ════════════════════════════════════════════════════════════════════════════
// Cache Key Builders
// ════════════════════════════════════════════════════════════════════════════

const KEYS = {
  storeBySlug: (slug: string) => `store:slug:${slug}`,
  storeById: (id: number) => `store:id:${id}`,
  products: (storeId: number, page: number, filters: string) =>
    `store:${storeId}:products:${page}:${filters}`,
  product: (storeId: number, slug: string) =>
    `store:${storeId}:product:${slug}`,
  categories: (storeId: number) => `store:${storeId}:categories`,
  shippingRates: (storeId: number, zoneId?: number) =>
    `store:${storeId}:shipping:${zoneId || 'all'}`,
};

// ════════════════════════════════════════════════════════════════════════════
// TTL Configuration (seconds)
// ════════════════════════════════════════════════════════════════════════════

const TTL = {
  storeResolution: 600,    // 10 min — store slug → ID rarely changes
  productList: 120,        // 2 min — product catalog changes occasionally
  productDetail: 180,      // 3 min — single product detail
  categories: 600,         // 10 min — categories rarely change
  shippingRates: 300,      // 5 min — shipping rates change occasionally
};

// ════════════════════════════════════════════════════════════════════════════
// Cached Query Wrappers
// ════════════════════════════════════════════════════════════════════════════

export async function cachedStoreBySlug<T>(slug: string, computeFn: () => Promise<T>): Promise<T> {
  return cacheGet(KEYS.storeBySlug(slug), computeFn, TTL.storeResolution);
}

export async function cachedProducts<T>(
  storeId: number, page: number, filters: Record<string, any>,
  computeFn: () => Promise<T>
): Promise<T> {
  const filterHash = Object.entries(filters).sort().map(([k, v]) => `${k}=${v}`).join('&');
  return cacheGet(KEYS.products(storeId, page, filterHash), computeFn, TTL.productList);
}

export async function cachedProductDetail<T>(
  storeId: number, slug: string, computeFn: () => Promise<T>
): Promise<T> {
  return cacheGet(KEYS.product(storeId, slug), computeFn, TTL.productDetail);
}

export async function cachedCategories<T>(storeId: number, computeFn: () => Promise<T>): Promise<T> {
  return cacheGet(KEYS.categories(storeId), computeFn, TTL.categories);
}

export async function cachedShippingRates<T>(
  storeId: number, zoneId: number | undefined, computeFn: () => Promise<T>
): Promise<T> {
  return cacheGet(KEYS.shippingRates(storeId, zoneId), computeFn, TTL.shippingRates);
}

// ════════════════════════════════════════════════════════════════════════════
// Invalidation (call after admin writes)
// ════════════════════════════════════════════════════════════════════════════

export async function invalidateStoreCache(storeId: number): Promise<void> {
  await cacheInvalidatePattern(`store:${storeId}:*`);
}

export async function invalidateProductCache(storeId: number, slug?: string): Promise<void> {
  if (slug) {
    await cacheInvalidate(KEYS.product(storeId, slug));
  }
  // Always invalidate product lists when any product changes
  await cacheInvalidatePattern(`store:${storeId}:products:*`);
}

export async function invalidateCategoryCache(storeId: number): Promise<void> {
  await cacheInvalidate(KEYS.categories(storeId));
  // Product filters depend on categories
  await cacheInvalidatePattern(`store:${storeId}:products:*`);
}

export async function invalidateShippingCache(storeId: number): Promise<void> {
  await cacheInvalidatePattern(`store:${storeId}:shipping:*`);
}

export default {
  cachedStoreBySlug,
  cachedProducts,
  cachedProductDetail,
  cachedCategories,
  cachedShippingRates,
  invalidateStoreCache,
  invalidateProductCache,
  invalidateCategoryCache,
  invalidateShippingCache,
};
