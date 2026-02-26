/**
 * Security Alert Service
 * Tracks failed login attempts and brute-force detection.
 * In-memory rate tracking with configurable thresholds.
 */

// In-memory store for tracking failed attempts per IP
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();
const WINDOW_MS = 15 * 60 * 1000; // 15-minute window
const ALERT_THRESHOLD = 10; // Alert after 10 failed attempts from same IP

/**
 * Track a failed login from a given IP address.
 * Logs a warning if the threshold is exceeded.
 */
export function trackFailedLogin(ipAddress: string): void {
  const now = Date.now();
  const record = failedAttempts.get(ipAddress);

  if (record && (now - record.firstAttempt) < WINDOW_MS) {
    record.count += 1;
    if (record.count >= ALERT_THRESHOLD) {
      console.warn(
        `[SECURITY ALERT] Brute-force suspected from IP ${ipAddress}: ${record.count} failed login attempts in ${Math.round(WINDOW_MS / 60000)} minutes`
      );
    }
  } else {
    failedAttempts.set(ipAddress, { count: 1, firstAttempt: now });
  }
}

/**
 * Get the failed attempt count for an IP (for monitoring/admin UIs).
 */
export function getFailedLoginCount(ipAddress: string): number {
  const record = failedAttempts.get(ipAddress);
  if (!record) return 0;
  if (Date.now() - record.firstAttempt > WINDOW_MS) {
    failedAttempts.delete(ipAddress);
    return 0;
  }
  return record.count;
}

/**
 * Reset tracking for an IP address (e.g., after successful login).
 */
export function resetFailedLogins(ipAddress: string): void {
  failedAttempts.delete(ipAddress);
}

/**
 * Cleanup old entries (call periodically).
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [ip, record] of failedAttempts.entries()) {
    if (now - record.firstAttempt > WINDOW_MS) {
      failedAttempts.delete(ip);
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000).unref();
