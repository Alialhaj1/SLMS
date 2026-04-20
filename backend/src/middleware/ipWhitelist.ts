/**
 * §13.1.5 — IP Whitelist Middleware per Tenant
 *
 * When enabled via feature flag, restricts tenant user login to whitelisted IP/CIDR ranges.
 * Platform admins (tenant_id = null) bypass this check.
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { logger } from '../utils/logger';

// ─── CIDR Matching ───────────────────────────────────────────────────────────

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function cidrContains(cidr: string, ip: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = bits ? (~0 << (32 - parseInt(bits, 10))) >>> 0 : 0xFFFFFFFF;
  return (ipToNumber(range) & mask) === (ipToNumber(ip) & mask);
}

// ─── Cache ───────────────────────────────────────────────────────────────────

interface WhitelistCache {
  cidrs: string[];
  fetchedAt: number;
}

const cache = new Map<number, WhitelistCache>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getTenantWhitelist(tenantId: number): Promise<string[]> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.cidrs;
  }

  const result = await pool.query(
    `SELECT ip_cidr FROM tenant_ip_whitelists WHERE tenant_id = $1 AND is_active = TRUE`,
    [tenantId]
  );
  const cidrs = result.rows.map(r => r.ip_cidr);
  cache.set(tenantId, { cidrs, fetchedAt: Date.now() });
  return cidrs;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

/**
 * Enforce IP whitelist for tenant users.
 * Place AFTER authenticate middleware.
 * Only blocks if tenant has active whitelist entries.
 */
export const ipWhitelistGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user?.tenant_id) {
      // Platform admin or unauthenticated — skip
      return next();
    }

    const whitelist = await getTenantWhitelist(user.tenant_id);
    if (whitelist.length === 0) {
      // No whitelist configured — allow all
      return next();
    }

    const clientIp = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');

    const allowed = whitelist.some(cidr => {
      try {
        return cidrContains(cidr, clientIp);
      } catch {
        return false;
      }
    });

    if (!allowed) {
      logger.warn('IP whitelist blocked request', {
        userId: user.id,
        tenantId: user.tenant_id,
        clientIp,
        whitelistCount: whitelist.length,
      });
      res.status(403).json({
        success: false,
        code: 'IP_NOT_WHITELISTED',
        error: 'Access denied: your IP address is not in the allowed list for this organization.',
      });
      return;
    }

    next();
  } catch (err) {
    // Non-blocking — allow on error to avoid lockouts
    logger.error('IP whitelist check error (allowing)', { error: err });
    next();
  }
};

// ─── CRUD Helpers ────────────────────────────────────────────────────────────

export class IpWhitelistService {
  static async list(tenantId: number) {
    const result = await pool.query(
      `SELECT id, ip_cidr, label, is_active, created_at FROM tenant_ip_whitelists
       WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows;
  }

  static async add(tenantId: number, ipCidr: string, label: string | null, createdBy: number) {
    const result = await pool.query(
      `INSERT INTO tenant_ip_whitelists (tenant_id, ip_cidr, label, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, ip_cidr) DO UPDATE SET is_active = TRUE, label = EXCLUDED.label, updated_at = NOW()
       RETURNING *`,
      [tenantId, ipCidr, label, createdBy]
    );
    cache.delete(tenantId); // Invalidate cache
    return result.rows[0];
  }

  static async remove(tenantId: number, whitelistId: number) {
    const result = await pool.query(
      `DELETE FROM tenant_ip_whitelists WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [whitelistId, tenantId]
    );
    cache.delete(tenantId);
    return (result.rowCount || 0) > 0;
  }

  static async toggle(tenantId: number, whitelistId: number, isActive: boolean) {
    const result = await pool.query(
      `UPDATE tenant_ip_whitelists SET is_active = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [whitelistId, tenantId, isActive]
    );
    cache.delete(tenantId);
    return result.rows[0] || null;
  }

  /** Test if a specific IP would be allowed for a tenant */
  static async testIp(tenantId: number, testIp: string): Promise<{ allowed: boolean; matchedRule?: string }> {
    const whitelist = await getTenantWhitelist(tenantId);
    if (whitelist.length === 0) return { allowed: true };
    for (const cidr of whitelist) {
      try {
        if (cidrContains(cidr, testIp)) return { allowed: true, matchedRule: cidr };
      } catch { /* skip invalid */ }
    }
    return { allowed: false };
  }
}
