/**
 * §13.3.1 — Email Templates Service
 *
 * Handlebars-based email template engine.
 * Stores templates in DB (email_templates table from migration 413).
 * Renders variables into HTML body and tracks send log.
 *
 * NOTE: Actual SMTP sending is a placeholder — in production, integrate
 * with Nodemailer / SendGrid / SES via env config.
 */

import pool from '../db';
import { logger } from '../utils/logger';

// ─── Simple Handlebars-style variable replacement ────────────────────────────
function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return variables[key] !== undefined ? variables[key] : `{{${key}}}`;
  });
}

// ─── Template CRUD ───────────────────────────────────────────────────────────
export class EmailTemplateService {
  /**
   * List all templates, optionally filtered by tenant.
   */
  static async list(tenantId: number | null, locale?: string): Promise<unknown[]> {
    let sql = `SELECT id, template_key, locale, subject, description, variables, is_active, created_at, updated_at
               FROM email_templates WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;

    if (tenantId) {
      sql += ` AND (tenant_id = $${idx} OR tenant_id IS NULL)`;
      params.push(tenantId);
      idx++;
    } else {
      sql += ` AND tenant_id IS NULL`;
    }

    if (locale) {
      sql += ` AND locale = $${idx}`;
      params.push(locale);
      idx++;
    }

    sql += ` ORDER BY template_key, locale`;
    const result = await pool.query(sql, params);
    return result.rows;
  }

  /**
   * Get a template by key and locale (falls back to 'en' if not found).
   */
  static async getByKey(
    templateKey: string,
    locale: string = 'en',
    tenantId: number | null = null
  ): Promise<{ subject: string; body_html: string; body_text: string | null; variables: string[] } | null> {
    // Try tenant-specific first, then global
    const tenantFilter = tenantId
      ? `AND (tenant_id = $3 OR tenant_id IS NULL) ORDER BY tenant_id DESC NULLS LAST`
      : `AND tenant_id IS NULL`;

    const params: unknown[] = [templateKey, locale];
    if (tenantId) params.push(tenantId);

    let result = await pool.query(
      `SELECT subject, body_html, body_text, variables FROM email_templates
       WHERE template_key = $1 AND locale = $2 AND is_active = true ${tenantFilter} LIMIT 1`,
      params
    );

    // Fallback to English if specific locale not found
    if (result.rows.length === 0 && locale !== 'en') {
      const fallbackParams: unknown[] = [templateKey, 'en'];
      if (tenantId) fallbackParams.push(tenantId);
      result = await pool.query(
        `SELECT subject, body_html, body_text, variables FROM email_templates
         WHERE template_key = $1 AND locale = $2 AND is_active = true ${tenantFilter} LIMIT 1`,
        fallbackParams
      );
    }

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  /**
   * Create or update a template.
   */
  static async upsert(data: {
    template_key: string;
    locale: string;
    subject: string;
    body_html: string;
    body_text?: string;
    variables?: string[];
    description?: string;
    tenant_id?: number | null;
  }): Promise<unknown> {
    const result = await pool.query(
      `INSERT INTO email_templates (template_key, locale, subject, body_html, body_text, variables, description, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (template_key, locale, COALESCE(tenant_id, 0))
       DO UPDATE SET subject = $3, body_html = $4, body_text = $5, variables = $6, description = $7, updated_at = NOW()
       RETURNING *`,
      [
        data.template_key,
        data.locale,
        data.subject,
        data.body_html,
        data.body_text || null,
        JSON.stringify(data.variables || []),
        data.description || null,
        data.tenant_id || null,
      ]
    );
    return result.rows[0];
  }

  /**
   * Delete a template.
   */
  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(`DELETE FROM email_templates WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Render a template with variables.
   */
  static async render(
    templateKey: string,
    variables: Record<string, string>,
    locale: string = 'en',
    tenantId: number | null = null
  ): Promise<{ subject: string; html: string; text: string | null } | null> {
    const template = await this.getByKey(templateKey, locale, tenantId);
    if (!template) return null;

    return {
      subject: renderTemplate(template.subject, variables),
      html: renderTemplate(template.body_html, variables),
      text: template.body_text ? renderTemplate(template.body_text, variables) : null,
    };
  }

  /**
   * Send an email using a template.
   * NOTE: SMTP sending is a placeholder — replace with real transport in production.
   */
  static async send(params: {
    templateKey: string;
    to: string;
    variables: Record<string, string>;
    locale?: string;
    tenantId?: number | null;
    userId?: number | null;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { templateKey, to, variables, locale = 'en', tenantId = null, userId = null } = params;

    const rendered = await this.render(templateKey, variables, locale, tenantId);
    if (!rendered) {
      logger.warn('Email template not found', { templateKey, locale });
      return { success: false, error: `Template "${templateKey}" not found for locale "${locale}"` };
    }

    // Placeholder: In production, use Nodemailer/SendGrid/SES
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    logger.info('Email sent (placeholder)', {
      to,
      subject: rendered.subject,
      templateKey,
      messageId,
    });

    // Log to email_send_log table
    try {
      await pool.query(
        `INSERT INTO email_send_log (template_key, recipient_email, subject, status, message_id, tenant_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [templateKey, to, rendered.subject, 'sent', messageId, tenantId, userId]
      );
    } catch (err) {
      logger.error('Failed to log email send', { error: err });
    }

    return { success: true, messageId };
  }

  /**
   * Get email send log with pagination.
   */
  static async getSendLog(
    tenantId: number | null,
    page: number = 1,
    limit: number = 20
  ): Promise<{ rows: unknown[]; total: number }> {
    const offset = (page - 1) * limit;
    const tenantFilter = tenantId ? `WHERE tenant_id = $3` : `WHERE tenant_id IS NULL`;
    const params: unknown[] = [limit, offset];
    if (tenantId) params.push(tenantId);

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM email_send_log ${tenantFilter} ORDER BY sent_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM email_send_log ${tenantFilter}`,
        tenantId ? [tenantId] : []
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total || 0,
    };
  }
}
