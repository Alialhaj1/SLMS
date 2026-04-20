/**
 * §13.3.1 — Email Templates Route
 *
 * GET    /api/email-templates          — List templates
 * GET    /api/email-templates/:key     — Get by key
 * POST   /api/email-templates          — Create/update template
 * DELETE /api/email-templates/:id      — Delete template
 * POST   /api/email-templates/preview  — Preview rendered template
 * POST   /api/email-templates/send     — Send email using template
 * GET    /api/email-templates/log      — Get send log
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { EmailTemplateService } from '../services/emailTemplateService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/', authenticate, requirePermission('email_templates:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const locale = req.query.locale as string | undefined;
    const templates = await EmailTemplateService.list(tenantId, locale);
    sendSuccess(res, templates);
  } catch (err) {
    sendError(res, 'EMAIL_TEMPLATES_ERROR', 'Failed to list email templates', 500);
  }
});

router.get('/log', authenticate, requirePermission('email_templates:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await EmailTemplateService.getSendLog(tenantId, page, limit);
    sendSuccess(res, result.rows, 200, { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit), per_page: limit, total_pages: Math.ceil(result.total / limit) });
  } catch (err) {
    sendError(res, 'EMAIL_LOG_ERROR', 'Failed to get email send log', 500);
  }
});

router.get('/:key', authenticate, requirePermission('email_templates:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const locale = (req.query.locale as string) || 'en';
    const template = await EmailTemplateService.getByKey(req.params.key, locale, tenantId);
    if (!template) {
      return sendError(res, 'NOT_FOUND', 'Email template not found', 404);
    }
    sendSuccess(res, template);
  } catch (err) {
    sendError(res, 'EMAIL_TEMPLATES_ERROR', 'Failed to get email template', 500);
  }
});

router.post('/', authenticate, requirePermission('email_templates:create' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const { template_key, locale, subject, body_html, body_text, variables, description } = req.body;

    if (!template_key || !locale || !subject || !body_html) {
      return sendError(res, 'VALIDATION_ERROR', 'template_key, locale, subject, and body_html are required', 400);
    }

    const template = await EmailTemplateService.upsert({
      template_key,
      locale,
      subject,
      body_html,
      body_text,
      variables,
      description,
      tenant_id: tenantId,
    });

    sendSuccess(res, template, 201, undefined, 'Email template saved');
  } catch (err) {
    sendError(res, 'EMAIL_TEMPLATES_ERROR', 'Failed to save email template', 500);
  }
});

router.post('/preview', authenticate, requirePermission('email_templates:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const { template_key, variables, locale } = req.body;

    if (!template_key) {
      return sendError(res, 'VALIDATION_ERROR', 'template_key is required', 400);
    }

    const rendered = await EmailTemplateService.render(
      template_key,
      variables || {},
      locale || 'en',
      tenantId
    );

    if (!rendered) {
      return sendError(res, 'NOT_FOUND', 'Template not found', 404);
    }

    sendSuccess(res, rendered);
  } catch (err) {
    sendError(res, 'EMAIL_PREVIEW_ERROR', 'Failed to preview template', 500);
  }
});

router.post('/send', authenticate, requirePermission('email_templates:create' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const userId = (req as any).user.id;
    const { template_key, to, variables, locale } = req.body;

    if (!template_key || !to) {
      return sendError(res, 'VALIDATION_ERROR', 'template_key and to are required', 400);
    }

    const result = await EmailTemplateService.send({
      templateKey: template_key,
      to,
      variables: variables || {},
      locale,
      tenantId,
      userId,
    });

    if (!result.success) {
      return sendError(res, 'EMAIL_SEND_FAILED', result.error || 'Failed to send email', 400);
    }

    sendSuccess(res, { messageId: result.messageId }, 200, undefined, 'Email sent successfully');
  } catch (err) {
    sendError(res, 'EMAIL_SEND_ERROR', 'Failed to send email', 500);
  }
});

router.delete('/:id', authenticate, requirePermission('email_templates:delete' as any), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await EmailTemplateService.delete(id);
    if (!deleted) {
      return sendError(res, 'NOT_FOUND', 'Email template not found', 404);
    }
    sendSuccess(res, { deleted: true }, 200, undefined, 'Email template deleted');
  } catch (err) {
    sendError(res, 'EMAIL_TEMPLATES_ERROR', 'Failed to delete email template', 500);
  }
});

export default router;
