/**
 * §13.4.3 — Background Jobs Service
 *
 * DB-backed job queue using `background_jobs` table (migration 413).
 * Lightweight alternative to BullMQ — no Redis dependency.
 *
 * Jobs are polled from DB, processed sequentially, with retry logic.
 *
 * Usage:
 *   await BackgroundJobService.enqueue('send_email', { to: '...', template: '...' });
 *   // In startup: BackgroundJobService.startWorker();
 */

import pool from '../db';
import { logger } from '../utils/logger';

type JobHandler = (payload: unknown) => Promise<void>;
const handlers = new Map<string, JobHandler>();

export class BackgroundJobService {
  /**
   * Register a job handler for a job type.
   */
  static registerHandler(jobType: string, handler: JobHandler): void {
    handlers.set(jobType, handler);
    logger.debug('Background job handler registered', { jobType });
  }

  /**
   * Enqueue a new job.
   */
  static async enqueue(
    jobType: string,
    payload: unknown,
    options: {
      priority?: number;    // Higher = processed first (default: 0)
      scheduledAt?: Date;   // Schedule for later execution
      maxRetries?: number;  // Default: 3
      tenantId?: number | null;
    } = {}
  ): Promise<number> {
    const result = await pool.query(
      `INSERT INTO background_jobs (job_type, payload, priority, scheduled_at, max_retries, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        jobType,
        JSON.stringify(payload),
        options.priority ?? 0,
        options.scheduledAt || null,
        options.maxRetries ?? 3,
        options.tenantId ?? null,
      ]
    );
    const jobId = result.rows[0].id;
    logger.debug('Background job enqueued', { jobId, jobType });
    return jobId;
  }

  /**
   * Get the next pending job (dequeue with advisory lock).
   */
  static async dequeue(): Promise<{
    id: number;
    job_type: string;
    payload: unknown;
    attempts: number;
    max_retries: number;
  } | null> {
    // Atomic dequeue: select + update in one query
    const result = await pool.query(
      `UPDATE background_jobs
       SET status = 'running', started_at = NOW(), attempts = attempts + 1
       WHERE id = (
         SELECT id FROM background_jobs
         WHERE status = 'pending'
           AND (scheduled_at IS NULL OR scheduled_at <= NOW())
         ORDER BY priority DESC, created_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, job_type, payload, attempts, max_retries`
    );
    return result.rows[0] || null;
  }

  /**
   * Mark a job as completed.
   */
  static async markCompleted(jobId: number, result?: unknown): Promise<void> {
    await pool.query(
      `UPDATE background_jobs SET status = 'completed', completed_at = NOW(), result = $2 WHERE id = $1`,
      [jobId, result ? JSON.stringify(result) : null]
    );
  }

  /**
   * Mark a job as failed.
   */
  static async markFailed(jobId: number, error: string): Promise<void> {
    // Check if we should retry
    const job = await pool.query(
      `SELECT attempts, max_retries FROM background_jobs WHERE id = $1`,
      [jobId]
    );
    const row = job.rows[0];
    if (row && row.attempts < row.max_retries) {
      // Back to pending for retry (exponential backoff)
      const backoffMs = Math.min(1000 * Math.pow(2, row.attempts), 300_000); // max 5 min
      await pool.query(
        `UPDATE background_jobs SET status = 'pending', error = $2,
         scheduled_at = NOW() + INTERVAL '1 millisecond' * $3 WHERE id = $1`,
        [jobId, error, backoffMs]
      );
      logger.warn('Background job will retry', { jobId, attempt: row.attempts, nextRetryMs: backoffMs });
    } else {
      await pool.query(
        `UPDATE background_jobs SET status = 'failed', completed_at = NOW(), error = $2 WHERE id = $1`,
        [jobId, error]
      );
      logger.error('Background job permanently failed', { jobId, error });
    }
  }

  /**
   * Process one job from the queue.
   */
  static async processOne(): Promise<boolean> {
    const job = await this.dequeue();
    if (!job) return false;

    const handler = handlers.get(job.job_type);
    if (!handler) {
      await this.markFailed(job.id, `No handler registered for job type: ${job.job_type}`);
      return true;
    }

    try {
      await handler(job.payload);
      await this.markCompleted(job.id);
      logger.info('Background job completed', { jobId: job.id, jobType: job.job_type });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.markFailed(job.id, errorMsg);
    }

    return true;
  }

  /**
   * Start a polling worker (call once at app startup).
   */
  static startWorker(intervalMs: number = 5000): NodeJS.Timeout {
    logger.info('Background job worker started', { intervalMs });

    const timer = setInterval(async () => {
      try {
        // Process up to 10 jobs per interval
        let processed = 0;
        while (processed < 10) {
          const didWork = await this.processOne();
          if (!didWork) break;
          processed++;
        }
      } catch (err) {
        logger.error('Background job worker error', { error: err });
      }
    }, intervalMs);

    return timer;
  }

  /**
   * Get job queue stats (for monitoring).
   */
  static async getStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    const result = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM background_jobs
       GROUP BY status`
    );

    const stats = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const row of result.rows) {
      if (row.status in stats) {
        (stats as Record<string, number>)[row.status] = row.count;
      }
    }
    return stats;
  }

  /**
   * List jobs with pagination (admin view).
   */
  static async list(
    options: { status?: string; jobType?: string; page?: number; limit?: number } = {}
  ): Promise<{ rows: unknown[]; total: number }> {
    const { status, jobType, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (jobType) { conditions.push(`job_type = $${idx++}`); params.push(jobType); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(`SELECT * FROM background_jobs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`, params),
      pool.query(`SELECT COUNT(*)::int AS total FROM background_jobs ${where}`, params.slice(0, -2)),
    ]);

    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  /**
   * Clean up old completed/failed jobs.
   */
  static async purge(olderThanDays: number = 30): Promise<number> {
    const result = await pool.query(
      `DELETE FROM background_jobs
       WHERE status IN ('completed', 'failed')
         AND completed_at < NOW() - INTERVAL '1 day' * $1`,
      [olderThanDays]
    );
    return result.rowCount ?? 0;
  }
}
