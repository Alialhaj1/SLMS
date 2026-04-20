/**
 * API Key Authentication Service
 * 
 * Manages API keys for external integrations (Architecture Spec §2.1 — API Access Portal).
 * 
 * Key format: slms_{keyId}_{secret}
 * Storage: key_hash (SHA-256 of full key) in api_keys table
 * Auth: X-API-Key header or Authorization: ApiKey {key}
 */

import pool from '../db';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const KEY_PREFIX = 'slms_';
const KEY_ID_LENGTH = 12;
const KEY_SECRET_LENGTH = 32;

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export interface ApiKeyRecord {
  id: number;
  keyId: string;
  name: string;
  description: string | null;
  userId: number;
  tenantId: number | null;
  scopes: string[];
  rateLimitPerMinute: number;
  ipWhitelist: string[] | null;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export class ApiKeyService {

  /**
   * Create a new API key. Returns the full key (shown once only).
   */
  static async createKey(params: {
    name: string;
    description?: string;
    userId: number;
    tenantId?: number | null;
    scopes?: string[];
    rateLimitPerMinute?: number;
    ipWhitelist?: string[];
    expiresInDays?: number;
  }): Promise<{
    key: string;        // Full API key (shown once: slms_xxxx_yyyy)
    keyId: string;      // Public identifier
    record: ApiKeyRecord;
  }> {
    const keyId = KEY_PREFIX + crypto.randomBytes(KEY_ID_LENGTH / 2).toString('hex');
    const secret = crypto.randomBytes(KEY_SECRET_LENGTH).toString('hex');
    const fullKey = `${keyId}_${secret}`;
    const keyHash = sha256(fullKey);

    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await pool.query(
      `INSERT INTO api_keys (key_id, key_hash, name, description, user_id, tenant_id, scopes, rate_limit_per_minute, ip_whitelist, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, key_id, name, description, user_id, tenant_id, scopes, rate_limit_per_minute, ip_whitelist, is_active, last_used_at, expires_at, created_at`,
      [
        keyId,
        keyHash,
        params.name,
        params.description || null,
        params.userId,
        params.tenantId || null,
        params.scopes || [],
        params.rateLimitPerMinute || 60,
        params.ipWhitelist || null,
        expiresAt?.toISOString() || null,
      ]
    );

    const row = result.rows[0];
    logger.info('API key created', { keyId, userId: params.userId, name: params.name });

    return {
      key: fullKey,
      keyId,
      record: this.mapRow(row),
    };
  }

  /**
   * Authenticate an API key. Returns the key record if valid.
   * Also updates last_used_at and last_used_ip.
   */
  static async authenticate(apiKey: string, ipAddress: string): Promise<ApiKeyRecord | null> {
    const keyHash = sha256(apiKey);

    const result = await pool.query(
      `SELECT id, key_id, name, description, user_id, tenant_id, scopes, rate_limit_per_minute, 
              ip_whitelist, is_active, last_used_at, expires_at, created_at, revoked_at
       FROM api_keys
       WHERE key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];

    // Check if active
    if (!row.is_active || row.revoked_at) return null;

    // Check expiry
    if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

    // Check IP whitelist
    if (row.ip_whitelist && row.ip_whitelist.length > 0) {
      if (!row.ip_whitelist.includes(ipAddress)) {
        logger.warn('API key IP whitelist violation', { keyId: row.key_id, ip: ipAddress });
        return null;
      }
    }

    // Update last_used tracking (async, don't block response)
    setImmediate(() => {
      pool.query(
        'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP, last_used_ip = $1 WHERE id = $2',
        [ipAddress, row.id]
      ).catch(err => logger.error('Failed to update API key last_used', err));
    });

    return this.mapRow(row);
  }

  /**
   * List API keys for a user (without revealing the secret).
   */
  static async listByUser(userId: number, tenantId?: number | null): Promise<ApiKeyRecord[]> {
    let query = `SELECT id, key_id, name, description, user_id, tenant_id, scopes, rate_limit_per_minute,
                        ip_whitelist, is_active, last_used_at, expires_at, created_at
                 FROM api_keys
                 WHERE user_id = $1 AND revoked_at IS NULL`;
    const params: any[] = [userId];

    if (tenantId !== undefined && tenantId !== null) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    return result.rows.map(this.mapRow);
  }

  /**
   * Revoke (soft-delete) an API key.
   */
  static async revokeKey(keyId: string, revokedBy: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE api_keys 
       SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP, revoked_by = $1
       WHERE key_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [revokedBy, keyId]
    );

    if ((result.rowCount || 0) > 0) {
      logger.info('API key revoked', { keyId, revokedBy });
      return true;
    }
    return false;
  }

  /**
   * Get a single API key record (for admin view).
   */
  static async getByKeyId(keyId: string): Promise<ApiKeyRecord | null> {
    const result = await pool.query(
      `SELECT id, key_id, name, description, user_id, tenant_id, scopes, rate_limit_per_minute,
              ip_whitelist, is_active, last_used_at, expires_at, created_at
       FROM api_keys
       WHERE key_id = $1`,
      [keyId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Check if an API key has a specific scope.
   */
  static hasScope(record: ApiKeyRecord, requiredScope: string): boolean {
    // Wildcard scope grants all access
    if (record.scopes.includes('*')) return true;
    // Direct match
    if (record.scopes.includes(requiredScope)) return true;
    // Resource-level wildcard (e.g., 'shipments:*')
    const [resource] = requiredScope.split(':');
    if (record.scopes.includes(`${resource}:*`)) return true;
    return false;
  }

  private static mapRow(row: any): ApiKeyRecord {
    return {
      id: row.id,
      keyId: row.key_id,
      name: row.name,
      description: row.description,
      userId: row.user_id,
      tenantId: row.tenant_id,
      scopes: row.scopes || [],
      rateLimitPerMinute: row.rate_limit_per_minute,
      ipWhitelist: row.ip_whitelist,
      isActive: row.is_active,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }
}
