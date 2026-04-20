/**
 * §13.1.2 — Anomaly Detection Service
 *
 * Detects suspicious login patterns:
 *  - New device (device fingerprint not seen before)
 *  - New country / unusual location
 *  - Unusual time of day (outside normal login hours)
 *  - Impossible travel (login from two distant locations in short time)
 *
 * Uses IP geolocation via ip-api.com (free tier) or configurable provider.
 */

import pool from '../db';
import { logger } from '../utils/logger';
import https from 'https';
import http from 'http';

// ─── Configuration ───────────────────────────────────────────────────────────
const GEO_API_URL = process.env.GEO_API_URL || 'http://ip-api.com/json';
const UNUSUAL_HOUR_START = 1;   // 1 AM
const UNUSUAL_HOUR_END = 5;     // 5 AM
const IMPOSSIBLE_TRAVEL_HOURS = 2; // 2 hours between logins
const IMPOSSIBLE_TRAVEL_KM = 500;  // 500 km apart

// ─── Types ───────────────────────────────────────────────────────────────────
interface GeoResult {
  country: string;
  countryCode: string;
  city: string;
  lat: number;
  lon: number;
  status: string;
}

interface AnomalyEvent {
  userId: number;
  tenantId: number | null;
  eventType: string;
  severity: string;
  ipAddress: string;
  countryCode?: string;
  city?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  details: Record<string, unknown>;
}

// ─── Geo Lookup (best effort) ────────────────────────────────────────────────

async function geoLookup(ip: string): Promise<GeoResult | null> {
  // Skip private / loopback IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
    return null;
  }

  return new Promise((resolve) => {
    const url = `${GEO_API_URL}/${ip}?fields=status,country,countryCode,city,lat,lon`;
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success') {
            resolve(parsed as GeoResult);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ─── Haversine Distance ──────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AnomalyDetectionService {
  /**
   * Analyze a login event and create anomaly records if suspicious.
   * Called right after successful authentication.
   */
  static async analyzeLogin(params: {
    userId: number;
    tenantId: number | null;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
  }): Promise<AnomalyEvent[]> {
    const anomalies: AnomalyEvent[] = [];

    try {
      const [geo, previousLogins, knownDevices] = await Promise.all([
        geoLookup(params.ipAddress),
        this.getRecentLogins(params.userId, 30),
        this.getKnownDevices(params.userId),
      ]);

      // 1. New Device Detection
      if (params.deviceFingerprint && !knownDevices.includes(params.deviceFingerprint)) {
        anomalies.push({
          userId: params.userId,
          tenantId: params.tenantId,
          eventType: 'new_device',
          severity: 'medium',
          ipAddress: params.ipAddress,
          deviceFingerprint: params.deviceFingerprint,
          userAgent: params.userAgent,
          countryCode: geo?.countryCode,
          city: geo?.city,
          details: { message: 'Login from a new/unrecognized device' },
        });
      }

      // 2. New Country Detection
      if (geo?.countryCode) {
        const knownCountries = [...new Set(previousLogins.map(l => l.country_code).filter(Boolean))];
        if (knownCountries.length > 0 && !knownCountries.includes(geo.countryCode)) {
          anomalies.push({
            userId: params.userId,
            tenantId: params.tenantId,
            eventType: 'new_country',
            severity: 'high',
            ipAddress: params.ipAddress,
            countryCode: geo.countryCode,
            city: geo.city,
            userAgent: params.userAgent,
            deviceFingerprint: params.deviceFingerprint,
            details: {
              message: `Login from new country: ${geo.country}`,
              knownCountries,
            },
          });
        }
      }

      // 3. Unusual Time Detection
      const hour = new Date().getUTCHours();
      if (hour >= UNUSUAL_HOUR_START && hour <= UNUSUAL_HOUR_END) {
        anomalies.push({
          userId: params.userId,
          tenantId: params.tenantId,
          eventType: 'unusual_time',
          severity: 'low',
          ipAddress: params.ipAddress,
          countryCode: geo?.countryCode,
          city: geo?.city,
          userAgent: params.userAgent,
          deviceFingerprint: params.deviceFingerprint,
          details: { message: `Login at unusual hour (UTC ${hour}:00)`, hourUtc: hour },
        });
      }

      // 4. Impossible Travel Detection
      if (geo && previousLogins.length > 0) {
        const lastLogin = previousLogins[0]; // most recent
        if (lastLogin.lat && lastLogin.lon) {
          const dist = haversineKm(lastLogin.lat, lastLogin.lon, geo.lat, geo.lon);
          const hoursSinceLastLogin = (Date.now() - new Date(lastLogin.created_at).getTime()) / (1000 * 60 * 60);

          if (dist > IMPOSSIBLE_TRAVEL_KM && hoursSinceLastLogin < IMPOSSIBLE_TRAVEL_HOURS) {
            anomalies.push({
              userId: params.userId,
              tenantId: params.tenantId,
              eventType: 'impossible_travel',
              severity: 'critical',
              ipAddress: params.ipAddress,
              countryCode: geo.countryCode,
              city: geo.city,
              userAgent: params.userAgent,
              deviceFingerprint: params.deviceFingerprint,
              details: {
                message: `Impossible travel: ${Math.round(dist)} km in ${hoursSinceLastLogin.toFixed(1)} hours`,
                distanceKm: Math.round(dist),
                hoursSinceLastLogin: parseFloat(hoursSinceLastLogin.toFixed(1)),
                previousCity: lastLogin.city,
                previousCountry: lastLogin.country_code,
              },
            });
          }
        }
      }

      // Persist anomalies
      for (const anomaly of anomalies) {
        await this.recordAnomaly(anomaly);
      }

      // Record this login location for future analysis
      if (geo) {
        await this.recordLoginLocation(params.userId, params.ipAddress, geo);
      }

    } catch (err) {
      logger.error('Anomaly detection error (non-blocking)', { error: err });
    }

    return anomalies;
  }

  // ─── DB Helpers ──────────────────────────────────────────────────────────

  private static async getRecentLogins(userId: number, days: number) {
    const result = await pool.query(
      `SELECT ip_address, country_code, city, details->>'lat' as lat, details->>'lon' as lon, created_at
       FROM login_anomaly_events
       WHERE user_id = $1 AND event_type = 'login_location' AND created_at > NOW() - ($2 || ' days')::INTERVAL
       ORDER BY created_at DESC LIMIT 50`,
      [userId, days.toString()]
    );
    return result.rows.map(r => ({
      ...r,
      lat: r.lat ? parseFloat(r.lat) : null,
      lon: r.lon ? parseFloat(r.lon) : null,
    }));
  }

  private static async getKnownDevices(userId: number): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT device_fingerprint FROM tenant_sessions
       WHERE user_id = $1 AND device_fingerprint IS NOT NULL
       ORDER BY device_fingerprint`,
      [userId]
    );
    return result.rows.map(r => r.device_fingerprint);
  }

  private static async recordAnomaly(event: AnomalyEvent): Promise<void> {
    await pool.query(
      `INSERT INTO login_anomaly_events
         (user_id, tenant_id, event_type, severity, ip_address, country_code, city, device_fingerprint, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        event.userId, event.tenantId, event.eventType, event.severity,
        event.ipAddress, event.countryCode || null, event.city || null,
        event.deviceFingerprint || null, event.userAgent || null,
        JSON.stringify(event.details),
      ]
    );
    logger.warn('Login anomaly detected', {
      userId: event.userId,
      type: event.eventType,
      severity: event.severity,
    });
  }

  private static async recordLoginLocation(userId: number, ip: string, geo: GeoResult): Promise<void> {
    await pool.query(
      `INSERT INTO login_anomaly_events
         (user_id, event_type, severity, ip_address, country_code, city, details)
       VALUES ($1, 'login_location', 'info', $2, $3, $4, $5)`,
      [userId, ip, geo.countryCode, geo.city, JSON.stringify({ lat: geo.lat, lon: geo.lon })]
    );
  }

  // ─── Admin API Helpers ─────────────────────────────────────────────────

  static async listAnomalies(params: {
    tenantId?: number;
    userId?: number;
    eventType?: string;
    isReviewed?: boolean;
    page: number;
    limit: number;
  }) {
    const conditions: string[] = ["event_type != 'login_location'"];
    const values: unknown[] = [];
    let idx = 1;

    if (params.tenantId !== undefined) { conditions.push(`tenant_id = $${idx}`); values.push(params.tenantId); idx++; }
    if (params.userId !== undefined) { conditions.push(`user_id = $${idx}`); values.push(params.userId); idx++; }
    if (params.eventType) { conditions.push(`event_type = $${idx}`); values.push(params.eventType); idx++; }
    if (params.isReviewed !== undefined) { conditions.push(`is_reviewed = $${idx}`); values.push(params.isReviewed); idx++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (params.page - 1) * params.limit;

    const [dataResult, countResult] = await Promise.all([
      pool.query(`SELECT * FROM login_anomaly_events ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, params.limit, offset]),
      pool.query(`SELECT COUNT(*) FROM login_anomaly_events ${where}`, values),
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: params.page,
      per_page: params.limit,
    };
  }

  static async reviewAnomaly(anomalyId: number, reviewedBy: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE login_anomaly_events SET is_reviewed = TRUE, reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2 AND is_reviewed = FALSE RETURNING id`,
      [reviewedBy, anomalyId]
    );
    return (result.rowCount || 0) > 0;
  }
}
