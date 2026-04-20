/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE AUTH MIDDLEWARE                                                    ║
 * ║  Handles authentication for store customers (separate from ERP users)    ║
 * ║  Supports: public access, customer auth, and store context resolution    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import pool from '../db';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export interface StoreCustomerPayload {
  sub: number;           // store_customer_id
  email: string;
  storeId: number;
  companyId: number;
  firstName: string;
  type: 'store_customer';
}

export interface StoreContext {
  store: {
    id: number;
    companyId: number;
    slug: string;
    storeName: string;
    defaultCurrencyId: number | null;
    defaultLanguage: string;
    taxIncluded: boolean;
    isActive: boolean;
  };
  customer?: StoreCustomerPayload;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      storeContext?: StoreContext;
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Store Resolver — Resolves store from slug/domain in URL
// ════════════════════════════════════════════════════════════════════════════

const storeCache = new Map<string, { store: StoreContext['store']; cachedAt: number }>();
const STORE_CACHE_TTL = 60_000; // 60 seconds

async function resolveStore(storeSlug: string): Promise<StoreContext['store'] | null> {
  // Check cache
  const cached = storeCache.get(storeSlug);
  if (cached && Date.now() - cached.cachedAt < STORE_CACHE_TTL) {
    return cached.store;
  }

  const result = await pool.query(`
    SELECT s.id, s.company_id, s.slug, s.store_name, 
           s.default_currency_id, s.default_language, 
           s.tax_included, s.is_active
    FROM stores s
    WHERE s.slug = $1 AND s.deleted_at IS NULL AND s.is_published = true
    LIMIT 1
  `, [storeSlug]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const store: StoreContext['store'] = {
    id: row.id,
    companyId: row.company_id,
    slug: row.slug,
    storeName: row.store_name,
    defaultCurrencyId: row.default_currency_id,
    defaultLanguage: row.default_language,
    taxIncluded: row.tax_included,
    isActive: row.is_active,
  };

  storeCache.set(storeSlug, { store, cachedAt: Date.now() });
  return store;
}

// ════════════════════════════════════════════════════════════════════════════
// Middleware: resolveStoreContext
// Resolves store from :storeSlug param or X-Store-Slug header
// ════════════════════════════════════════════════════════════════════════════

export function resolveStoreContext(req: Request, res: Response, next: NextFunction) {
  const storeSlug = req.params.storeSlug || req.headers['x-store-slug'] as string;

  if (!storeSlug) {
    return res.status(400).json({ error: 'Store identifier required' });
  }

  resolveStore(storeSlug)
    .then((store) => {
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }
      if (!store.isActive) {
        return res.status(503).json({ error: 'Store is currently unavailable' });
      }
      req.storeContext = { store };
      next();
    })
    .catch((err) => {
      console.error('Store resolution error:', err);
      res.status(500).json({ error: 'Failed to resolve store' });
    });
}

// ════════════════════════════════════════════════════════════════════════════
// Middleware: storeCustomerAuth (optional — for routes that work with/without auth)
// ════════════════════════════════════════════════════════════════════════════

export function storeCustomerAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return next(); // Allow unauthenticated (public browsing)

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return next();

  try {
    const payload = jwt.verify(parts[1], config.JWT_SECRET, { algorithms: ['HS256'] }) as any;
    if (payload.type !== 'store_customer') return next();

    req.storeContext = {
      ...req.storeContext!,
      customer: {
        sub: payload.sub,
        email: payload.email,
        storeId: payload.storeId,
        companyId: payload.companyId,
        firstName: payload.firstName,
        type: 'store_customer',
      },
    };
  } catch {
    // Invalid token — continue as guest
  }

  next();
}

// ════════════════════════════════════════════════════════════════════════════
// Middleware: requireStoreCustomer (mandatory auth — for cart, checkout, orders)
// ════════════════════════════════════════════════════════════════════════════

export function requireStoreCustomer(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  try {
    const payload = jwt.verify(parts[1], config.JWT_SECRET, { algorithms: ['HS256'] }) as any;
    
    if (payload.type !== 'store_customer') {
      return res.status(403).json({ error: 'Store customer authentication required' });
    }

    req.storeContext = {
      ...req.storeContext!,
      customer: {
        sub: payload.sub,
        email: payload.email,
        storeId: payload.storeId,
        companyId: payload.companyId,
        firstName: payload.firstName,
        type: 'store_customer',
      },
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Helper: Generate store customer JWT
// ════════════════════════════════════════════════════════════════════════════

export function generateStoreCustomerToken(customer: {
  id: number;
  email: string;
  storeId: number;
  companyId: number;
  firstName: string;
}): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    {
      sub: customer.id,
      email: customer.email,
      storeId: customer.storeId,
      companyId: customer.companyId,
      firstName: customer.firstName,
      type: 'store_customer',
    },
    config.JWT_SECRET,
    { expiresIn: '2h', algorithm: 'HS256' }
  );

  const refreshToken = jwt.sign(
    {
      sub: customer.id,
      type: 'store_customer_refresh',
    },
    config.JWT_SECRET,
    { expiresIn: '30d', algorithm: 'HS256' }
  );

  return { accessToken, refreshToken };
}

// ════════════════════════════════════════════════════════════════════════════
// Helper: Hash / Verify password
// ════════════════════════════════════════════════════════════════════════════

export async function hashStoreCustomerPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyStoreCustomerPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ════════════════════════════════════════════════════════════════════════════
// Helper: Invalidate store cache (call when store settings change)
// ════════════════════════════════════════════════════════════════════════════

export function invalidateStoreCache(slug: string): void {
  storeCache.delete(slug);
}
